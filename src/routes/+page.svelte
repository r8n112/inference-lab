<script lang="ts">
	import { base } from '$app/paths';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import Composer from '$lib/components/Composer.svelte';
	import ToolTrace from '$lib/components/ToolTrace.svelte';
	import { buildSystemPrompt, runAgent, type ModelCall, type ToolMode } from '$lib/chat/agent';
	import { buildUserContent, MAX_FILES, readFile, type Attachment } from '$lib/chat/attachments';
	import { conversations } from '$lib/chat/conversations.svelte';
	import { CHAT_TOOL_MAP } from '$lib/chat/tools';
	import { toView, type ToolTraceItem } from '$lib/chat/view';
	import { chat as callModel, InferenceError } from '$lib/inference/client';
	import type { ChatMessage as Message } from '$lib/inference/types';
	import { settings } from '$lib/settings.svelte';
	import { messagesFor } from '$lib/tools/types';

	interface Turn {
		/** Conversation this turn belongs to. */
		id: string;
		streaming: string;
		items: ToolTraceItem[];
	}

	let turn = $state<Turn | null>(null);
	let error = $state('');
	let attachments = $state<Attachment[]>([]);
	let notice = $state('');
	let dragging = $state(false);
	let controller: AbortController | undefined;
	let scroller: HTMLDivElement;

	const toolMode = $derived(settings.value.toolMode as ToolMode);
	const active = $derived(conversations.active);
	const messages = $derived(active?.messages ?? []);
	const views = $derived(toView(messages));
	const busy = $derived(turn !== null);

	const suggestions = [
		'Explain the difference between TCP and UDP, with one real-world example each.',
		'Write a Python function that retries a request with exponential backoff.',
		'Draft a polite reminder email for an overdue invoice.'
	];

	$effect(() => {
		// Keep the newest content in view as it streams in.
		void views.length;
		void turn?.streaming;
		void turn?.items.length;
		queueMicrotask(() => scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }));
	});

	// Clear a stale error when switching or creating a conversation.
	let lastConversationId = $state<string | undefined>(undefined);
	$effect(() => {
		const id = active?.id;
		if (id !== lastConversationId) {
			lastConversationId = id;
			error = '';
		}
	});

	/** Run one assistant turn over `history`; appends nothing itself. */
	async function run(conversationId: string, history: Message[]) {
		error = '';
		turn = { id: conversationId, streaming: '', items: [] };
		controller = new AbortController();
		const baseUrl = settings.value.baseUrl;
		const token = settings.value.token;
		const model = settings.value.model;

		const call: ModelCall = async (msgs, options) => {
			const result = await callModel({
				baseUrl,
				token,
				model,
				messages: msgs,
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
			const result = await runAgent({
				history,
				call,
				execute,
				toolMode,
				system: buildSystemPrompt(toolMode),
				signal: controller.signal,
				onEvent: (event) => {
					if (!turn) return;
					if (event.type === 'delta') turn.streaming += event.text;
					else if (event.type === 'tool_start') {
						turn.streaming = '';
						turn.items = [...turn.items, { name: event.call.name, ok: undefined }];
					} else if (event.type === 'tool_result') {
						turn.items = turn.items.map((item, index) =>
							index === turn!.items.length - 1
								? { ...item, ok: !event.result.startsWith('Error'), result: event.result }
								: item
						);
					}
				}
			});
			conversations.setMessages(conversationId, result);
		} catch (caught) {
			if ((caught as Error).name !== 'AbortError') {
				error = caught instanceof InferenceError ? caught.message : (caught as Error).message;
			}
		} finally {
			turn = null;
			controller = undefined;
		}
	}

	async function addFiles(files: File[]) {
		notice = '';
		const room = MAX_FILES - attachments.length;
		if (room <= 0) {
			notice = `Up to ${MAX_FILES} files per message.`;
			return;
		}
		const accepted: Attachment[] = [];
		const rejected: string[] = [];
		for (const file of files.slice(0, room)) {
			const result = await readFile(file);
			if ('attachment' in result) accepted.push(result.attachment);
			else rejected.push(result.error);
		}
		if (files.length > room) rejected.push(`only the first ${room} files were added`);
		if (accepted.length) attachments = [...attachments, ...accepted];
		notice = rejected.join(' · ');
	}

	function removeAttachment(id: string) {
		attachments = attachments.filter((attachment) => attachment.id !== id);
	}

	async function send(text: string, files: Attachment[] = []) {
		if (busy) return;
		error = '';
		if (!text.trim() && files.length === 0) return;
		const conversation = conversations.active ?? conversations.create();

		const userMessage: Message = {
			role: 'user',
			content: buildUserContent(text, files)
		};

		// Show the user's message immediately, before any request is made.
		conversations.appendMessage(conversation.id, userMessage);
		attachments = [];
		notice = '';
		const history = conversations.active?.messages ?? [userMessage];
		await run(conversation.id, history);
	}

	/** Re-run the last turn (its user message is already in the transcript). */
	async function retry() {
		const conversation = conversations.active;
		if (!conversation || busy) return;
		await run(conversation.id, conversation.messages);
	}

	function stop() {
		controller?.abort();
	}

	// Drag-and-drop over the whole chat area (depth-counted so child elements
	// do not flicker the overlay).
	let dragDepth = 0;
	function onDragEnter(event: DragEvent) {
		if (!event.dataTransfer?.types.includes('Files')) return;
		event.preventDefault();
		dragDepth += 1;
		dragging = true;
	}
	function onDragOver(event: DragEvent) {
		if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
	}
	function onDragLeave() {
		dragDepth = Math.max(0, dragDepth - 1);
		if (dragDepth === 0) dragging = false;
	}
	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragDepth = 0;
		dragging = false;
		const files = [...(event.dataTransfer?.files ?? [])];
		if (files.length) addFiles(files);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative flex h-full flex-col"
	ondragenter={onDragEnter}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
>
	{#if dragging}
		<div
			class="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-ink-950/70 backdrop-blur-sm"
		>
			<div
				class="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-accent px-10 py-8 text-center"
			>
				<span class="text-3xl" aria-hidden="true">📎</span>
				<p class="text-sm font-medium text-slate-100">Drop files to attach</p>
				<p class="text-xs text-slate-400">Images are sent to the model; text files are read in.</p>
			</div>
		</div>
	{/if}

	<!-- Conversation header -->
	<div class="flex items-center gap-3 border-b border-ink-700 px-4 py-2.5">
		<h1 class="truncate text-sm font-medium text-slate-300">
			{active?.title ?? 'New chat'}
		</h1>
		<span class="ml-auto hidden shrink-0 items-center gap-2 text-[11px] text-slate-500 sm:flex">
			<span class="rounded-full border border-ink-600 px-2 py-0.5">{settings.value.model}</span>
			<span class="rounded-full border border-ink-600 px-2 py-0.5"
				>{toolMode === 'prompt' ? 'prompt tools' : 'native tools'}</span
			>
		</span>
	</div>

	<div bind:this={scroller} class="min-h-0 flex-1 overflow-y-auto">
		<div class="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
			{#if !active || (messages.length === 0 && !busy)}
				<div class="grid min-h-[55vh] place-items-center">
					<div class="max-w-md text-center">
						<div
							class="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent text-lg font-bold text-white"
						>
							iL
						</div>
						<h2 class="mt-4 text-xl font-semibold text-white">How can I help?</h2>
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
							<a
								href={`${base}/settings`}
								class="mt-4 inline-block text-sm text-amber-300 underline">Add a token to start</a
							>
						{/if}
					</div>
				</div>
			{/if}

			{#each views as view, index (index)}
				{#if view.kind === 'tools'}
					<ToolTrace items={view.items} />
				{:else}
					<ChatMessage message={view.message} />
				{/if}
			{/each}

			<!-- Live turn: tool traces and the streaming answer (with a thinking state). -->
			{#if turn && active?.id === turn.id}
				{@const current = turn}
				{#if current.items.length}
					<ToolTrace items={current.items} />
				{/if}
				<ChatMessage message={{ role: 'assistant', content: current.streaming }} />
			{/if}

			{#if error}
				<div class="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
					{error}
					{#if !busy}
						<button onclick={retry} class="ml-2 underline hover:text-white">retry</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div class="border-t border-ink-700 bg-ink-950/80 px-4 py-3 backdrop-blur">
		<div class="mx-auto max-w-3xl">
			<Composer
				onSend={send}
				onStop={stop}
				{busy}
				disabled={!settings.hasToken}
				{attachments}
				onAddFiles={addFiles}
				onRemoveAttachment={removeAttachment}
			/>
			{#if notice}
				<p class="mt-2 text-center text-[11px] text-amber-300">{notice}</p>
			{/if}
			<p class="mt-2 text-center text-[11px] text-slate-600">
				Attach images or text files · the assistant can use this site’s tools · output can be wrong
				— verify important details.
			</p>
		</div>
	</div>
</div>
