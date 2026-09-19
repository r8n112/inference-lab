<script lang="ts">
	import { base } from '$app/paths';
	import { chat, InferenceError } from '$lib/inference/client';
	import type { TokenUsage } from '$lib/inference/types';
	import { settings } from '$lib/settings.svelte';
	import { messagesFor, type Tool, type ToolField } from '$lib/tools/types';

	let { tool }: { tool: Tool } = $props();

	function defaults(fields: ToolField[]): Record<string, string> {
		const values: Record<string, string> = {};
		for (const field of fields) {
			if ('default' in field && field.default) values[field.name] = field.default;
		}
		return values;
	}

	// ToolRunner is remounted per tool route, so reading the prop once here is
	// intentional and safe.
	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, string>>(defaults(tool.fields));
	let output = $state('');
	let error = $state('');
	let running = $state(false);
	let elapsed = $state(0);
	let usage = $state<TokenUsage | undefined>(undefined);
	let copied = $state(false);
	let controller: AbortController | undefined;

	const missing = $derived(
		tool.fields.some(
			(field) => 'required' in field && field.required && !values[field.name]?.trim()
		)
	);
	const canRun = $derived(!running && !missing && settings.hasToken);

	async function run() {
		error = '';
		output = '';
		usage = undefined;
		copied = false;
		running = true;
		const started = performance.now();
		controller = new AbortController();
		try {
			const result = await chat({
				baseUrl: settings.value.baseUrl,
				token: settings.value.token,
				model: settings.value.model,
				messages: messagesFor(tool, { values }),
				temperature: tool.temperature ?? settings.value.temperature,
				max_tokens: settings.value.maxTokens,
				signal: controller.signal,
				onDelta: (delta) => {
					output += delta;
				}
			});
			usage = result.usage;
			if (tool.postProcess) output = tool.postProcess(output);
		} catch (caught) {
			if ((caught as Error).name !== 'AbortError') {
				error = caught instanceof InferenceError ? caught.message : (caught as Error).message;
			}
		} finally {
			running = false;
			elapsed = performance.now() - started;
			controller = undefined;
		}
	}

	function stop() {
		controller?.abort();
	}

	async function copy() {
		await navigator.clipboard.writeText(output);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function download() {
		const blob = new Blob([output], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `${tool.id}-${Date.now()}.txt`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function clearAll() {
		values = defaults(tool.fields);
		output = '';
		error = '';
		usage = undefined;
	}

	async function onImage(field: string, event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => (values[field] = String(reader.result));
		reader.readAsDataURL(file);
	}
</script>

<div class="grid gap-6 lg:grid-cols-2">
	<!-- Input -->
	<form
		class="flex flex-col gap-4"
		onsubmit={(event) => {
			event.preventDefault();
			if (canRun) run();
		}}
	>
		{#each tool.fields as field (field.name)}
			<label class="flex flex-col gap-1.5 text-sm">
				<span class="font-medium text-slate-300">{field.label}</span>

				{#if field.kind === 'textarea'}
					<textarea
						bind:value={values[field.name]}
						rows={field.rows ?? 8}
						placeholder={field.placeholder}
						class="w-full resize-y rounded-lg border border-ink-600 bg-ink-900 p-3 font-mono text-[13px] leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
					></textarea>
				{:else if field.kind === 'text'}
					<input
						type="text"
						bind:value={values[field.name]}
						placeholder={field.placeholder}
						class="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
					/>
				{:else if field.kind === 'select'}
					<select
						bind:value={values[field.name]}
						class="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-slate-100 outline-none focus:border-accent"
					>
						{#each field.options as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				{:else if field.kind === 'image'}
					<div class="flex flex-col gap-2">
						<input
							type="file"
							accept="image/*"
							onchange={(event) => onImage(field.name, event)}
							class="text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-slate-200 hover:file:bg-ink-600"
						/>
						{#if values[field.name]}
							<img
								src={values[field.name]}
								alt="Selected preview"
								class="max-h-48 self-start rounded-lg border border-ink-600"
							/>
						{/if}
						{#if field.help}
							<span class="text-xs text-slate-500">{field.help}</span>
						{/if}
					</div>
				{/if}
			</label>
		{/each}

		<div class="flex flex-wrap items-center gap-3">
			{#if running}
				<button
					type="button"
					onclick={stop}
					class="rounded-lg bg-ink-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-ink-600"
					>Stop</button
				>
			{:else}
				<button
					type="submit"
					disabled={!canRun}
					class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
					>Run</button
				>
			{/if}
			<button
				type="button"
				onclick={clearAll}
				class="rounded-lg border border-ink-600 px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
				>Clear</button
			>

			{#if !settings.hasToken}
				<span class="text-xs text-amber-300">
					<a href={`${base}/settings`} class="underline">Add a token</a> to run tools.
				</span>
			{:else if missing}
				<span class="text-xs text-slate-500">Fill the required fields.</span>
			{/if}
		</div>

		{#if tool.note}
			<p class="text-xs text-slate-500">{tool.note}</p>
		{/if}
	</form>

	<!-- Output -->
	<div class="flex min-h-64 flex-col gap-2">
		<div class="flex items-center justify-between text-xs text-slate-500">
			<span class="inline-flex items-center gap-2">
				{#if running}
					<span class="h-2 w-2 animate-pulse rounded-full bg-accent-soft"></span> generating…
				{:else if output}
					<span class="text-slate-400"
						>{elapsed < 1000
							? `${Math.round(elapsed)} ms`
							: `${(elapsed / 1000).toFixed(1)} s`}</span
					>
					{#if usage?.completion_tokens}
						<span>· {usage.completion_tokens} tokens</span>
					{/if}
				{/if}
			</span>
			{#if output}
				<span class="flex items-center gap-3">
					<button onclick={copy} class="hover:text-slate-300">{copied ? 'copied' : 'copy'}</button>
					<button onclick={download} class="hover:text-slate-300">download</button>
				</span>
			{/if}
		</div>

		{#if error}
			<div class="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
				{error}
				{#if settings.hasToken}
					<button onclick={run} class="ml-2 underline hover:text-white">retry</button>
				{/if}
			</div>
		{:else}
			<pre
				class="min-h-64 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-ink-700 bg-ink-900 p-4 font-mono text-[13px] leading-relaxed text-slate-100">{output ||
					'Output will appear here.'}</pre>
		{/if}
	</div>
</div>
