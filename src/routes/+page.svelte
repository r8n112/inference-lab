<script lang="ts">
	import { base } from '$app/paths';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import Composer from '$lib/components/Composer.svelte';
	import { buildSystemPrompt, runAgent, type ModelCall, type ToolMode } from '$lib/chat/agent';
	import { chat as chatStore } from '$lib/chat/store.svelte';
	import { CHAT_TOOL_MAP } from '$lib/chat/tools';
	import { chat as callModel, InferenceError } from '$lib/inference/client';
	import type { ChatMessage as Message, ContentPart } from '$lib/inference/types';
	import { settings } from '$lib/settings.svelte';
	import { messagesFor } from '$lib/tools/types';

	let busy = $state(false);
	let error = $state('');
	let streaming = $state('');
	let chips = $state<Array<{ name: string; ok: boolean | undefined; result?: string }>>([]);
	let controller: AbortController | undefined;
	let scroller: HTMLDivElement;

	const toolMode = $derived(settings.value.toolMode as ToolMode);

	const suggestions = [
		'Summarize this into a few bullets:',
		'Turn this diff into a commit message:',
		'Extract the names and dates from this as JSON:'
	];

	const history = $derived(chatStore.messages);
	const streamingMessage = $derived<Message | undefined>(
		busy && streaming ? { role: 'assistant', content: streaming } : undefined
	);

	$effect(() => {
		// Keep the newest content in view.
		void history.length;
		void streaming;
		void chips.length;
		queueMicrotask(() => scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }));
	});

	async function send(text: string, attached?: string) {
		error = '';
		streaming = '';
		chips = [];

		const parts: ContentPart[] = [{ type: 'text', text }];
		if (attached) parts.push({ type: 'image_url', image_url: { url: attached } });
		const userMessage: Message = { role: 'user', content: parts };

		busy = true;
		controller = new AbortController();
		const baseUrl = settings.value.baseUrl;
		const token = settings.value.token;
		const model = settings.value.model;

		const call: ModelCall = async (messages, options) => {
			const result = await callModel({
				baseUrl,
				token,
				model,
				messages,
				tools: options.tools,
				tool_choice: options.tools ? 'auto' : undefined,
				temperature: settings.value.temperature,
				max_tokens: settings.value.maxTokens,
				signal: options.signal,
				onDelta: options.onDelta
			});
			return { text: result.text, toolCalls: result.toolCalls, usage: result.usage };
		};

		const execute = async (name: string, args: Record<string, unknown>, signal?: AbortSignal) => {
			const entry = CHAT_TOOL_MAP.get(name);
			if (!entry) return `Error: unknown tool "${name}".`;
			const values = Object.fromEntries(
				Object.entries(args ?? {}).map(([key, value]) => [key, String(value ?? '')])
			);
			const result = await callModel({
				baseUrl,
				token,
				model,
				messages: messagesFor(entry.tool, { values }),
				temperature: entry.tool.temperature ?? settings.value.temperature,
				max_tokens: settings.value.maxTokens,
				signal
			});
			return entry.tool.postProcess ? entry.tool.postProcess(result.text) : result.text;
		};

		try {
			const messages = await runAgent({
				history: [...chatStore.messages, userMessage],
				call,
				execute,
				toolMode,
				system: buildSystemPrompt(toolMode),
				signal: controller.signal,
				onEvent: (event) => {
					if (event.type === 'delta') streaming += event.text;
					else if (event.type === 'tool_start') {
						streaming = '';
						chips = [...chips, { name: event.call.name, ok: undefined }];
					} else if (event.type === 'tool_result') {
						chips = chips.map((chip, index) =>
							index === chips.length - 1
								? { ...chip, ok: !event.result.startsWith('Error'), result: event.result }
								: chip
						);
					}
				}
			});
			chatStore.set(messages);
		} catch (caught) {
			if ((caught as Error).name !== 'AbortError') {
				error = caught instanceof InferenceError ? caught.message : (caught as Error).message;
			}
		} finally {
			busy = false;
			streaming = '';
			controller = undefined;
		}
	}

	function stop() {
		controller?.abort();
	}
</script>

<div class="mx-auto flex h-[calc(100vh-9rem)] max-w-3xl flex-col">
	{#if history.length || streaming}
		<div class="mb-3 flex items-center justify-between text-xs text-slate-500">
			<span>{toolMode === 'prompt' ? 'assistant · prompt tools' : 'assistant · native tools'}</span>
			<button onclick={() => chatStore.clear()} class="hover:text-slate-300"
				>new conversation</button
			>
		</div>
	{/if}

	<div bind:this={scroller} class="flex-1 space-y-4 overflow-y-auto pb-4">
		{#if chatStore.isEmpty && !busy}
			<div class="grid h-full place-items-center">
				<div class="max-w-md text-center">
					<div
						class="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent text-lg font-bold text-white"
					>
						iL
					</div>
					<h1 class="mt-4 text-xl font-semibold text-white">How can I help?</h1>
					<p class="mt-2 text-sm text-slate-400">
						One assistant, with the tools of this site behind it. It decides when to summarize,
						translate, extract, explain code and more.
					</p>
					<div class="mt-5 flex flex-col gap-2">
						{#each suggestions as suggestion (suggestion)}
							<button
								onclick={() => send(suggestion)}
								disabled={!settings.hasToken}
								class="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-left text-sm text-slate-300 hover:border-ink-600 hover:text-white disabled:opacity-50"
								>{suggestion}</button
							>
						{/each}
					</div>
					{#if !settings.hasToken}
						<a href={`${base}/settings`} class="mt-4 inline-block text-sm text-amber-300 underline"
							>Add a token to start</a
						>
					{/if}
				</div>
			</div>
		{/if}

		{#each history as message, index (index)}
			{#if message.role !== 'tool' && !message.tool_calls?.length}
				<ChatMessage {message} />
			{/if}
		{/each}

		{#if streamingMessage}
			<ChatMessage message={streamingMessage} />
		{/if}
	</div>

	{#if chips.length}
		<div class="mb-2 flex flex-wrap gap-2">
			{#each chips as chip (chip.name + chip.ok)}
				<span
					class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs {chip.ok ===
					false
						? 'border-red-500/40 bg-red-500/10 text-red-200'
						: chip.ok
							? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
							: 'border-ink-600 bg-ink-800 text-slate-300'}"
				>
					<span aria-hidden="true">{chip.ok === false ? '⚠' : '🔧'}</span>
					{chip.name}
					{#if chip.ok === undefined}<span class="animate-pulse">…</span>{/if}
				</span>
			{/each}
		</div>
	{/if}

	{#if error}
		<div class="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
			{error}
		</div>
	{/if}

	<Composer onSend={send} onStop={stop} {busy} disabled={!settings.hasToken} />
</div>
