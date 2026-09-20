<script lang="ts">
	import { base } from '$app/paths';
	import { listModels, tokenFingerprint } from '$lib/inference/client';
	import { DEFAULT_BASE_URL, DEFAULT_MODEL, settings } from '$lib/settings.svelte';
	import type { Model } from '$lib/inference/types';

	let token = $state(settings.value.token);
	let baseUrl = $state(settings.value.baseUrl);
	let model = $state(settings.value.model);
	let temperature = $state(settings.value.temperature);
	let maxTokens = $state(settings.value.maxTokens);
	let toolMode = $state(settings.value.toolMode);

	const resolvedBase = $derived((baseUrl.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ''));

	let showToken = $state(false);
	let advanced = $state(settings.isCustomEndpoint);
	let saved = $state(false);
	let testing = $state(false);
	let testError = $state('');
	let models = $state<Model[]>([]);

	function save() {
		settings.update({
			token: token.trim(),
			baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
			model: model.trim() || DEFAULT_MODEL,
			temperature,
			maxTokens,
			toolMode
		});
		saved = true;
		setTimeout(() => (saved = false), 1500);
	}

	async function test() {
		// Persist first so a successful test also configures the chat.
		save();
		testing = true;
		testError = '';
		models = [];
		try {
			models = await listModels(baseUrl.trim() || DEFAULT_BASE_URL, token.trim());
			if (models.length && !models.some((m) => m.id === model)) {
				settings.update({ model });
			}
		} catch (error) {
			testError = (error as Error).message;
		} finally {
			testing = false;
		}
	}
</script>

<div class="mx-auto max-w-2xl">
	<h1 class="text-2xl font-semibold tracking-tight text-white">Settings</h1>
	<p class="mt-2 text-sm text-slate-400">
		Everything is stored in this browser only. The app has no backend; your token is sent only to
		the inference API you configure below.
	</p>

	<form
		class="mt-8 flex flex-col gap-6"
		onsubmit={(event) => {
			event.preventDefault();
			save();
		}}
	>
		<label class="flex flex-col gap-1.5 text-sm">
			<span class="font-medium text-slate-300">Access token</span>
			<div class="flex gap-2">
				<input
					type={showToken ? 'text' : 'password'}
					bind:value={token}
					autocomplete="off"
					spellcheck="false"
					placeholder="Paste your Hetzner Experiments inference token"
					class="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
				/>
				<button
					type="button"
					onclick={() => (showToken = !showToken)}
					class="shrink-0 rounded-lg border border-ink-600 px-3 text-xs text-slate-400 hover:text-slate-200"
					>{showToken ? 'hide' : 'show'}</button
				>
			</div>
			<span class="text-xs text-slate-500">
				Create one at <a
					class="text-slate-300 underline decoration-accent/60 underline-offset-2 hover:text-white"
					href="https://experiments.hetzner.com/inference"
					rel="noopener noreferrer"
					target="_blank">experiments.hetzner.com/inference</a
				>. Paste the token value, not its name.
			</span>
			<span class="text-xs text-slate-600">
				token: {tokenFingerprint(token)} · endpoint: {resolvedBase}
			</span>
		</label>

		<label class="flex flex-col gap-1.5 text-sm">
			<span class="font-medium text-slate-300">Model</span>
			{#if models.length}
				<select
					bind:value={model}
					class="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-slate-100 outline-none focus:border-accent"
				>
					{#each models as option (option.id)}
						<option value={option.id}>{option.id}</option>
					{/each}
				</select>
			{:else}
				<input
					type="text"
					bind:value={model}
					spellcheck="false"
					class="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-accent"
				/>
			{/if}
			<span class="text-xs text-slate-500">Test the connection to list available models.</span>
		</label>

		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				onclick={test}
				disabled={testing || !token.trim()}
				class="rounded-lg border border-ink-600 px-4 py-2 text-sm text-slate-200 hover:border-ink-600 hover:bg-ink-800 disabled:opacity-40"
				>{testing ? 'Testing…' : 'Test connection'}</button
			>
			<button
				type="submit"
				class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-soft"
				>Save</button
			>
			{#if saved}<span class="text-xs text-emerald-300">saved</span>{/if}
		</div>

		{#if testError}
			<div class="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
				{testError}
			</div>
		{:else if models.length}
			<div
				class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"
			>
				Connected. {models.length} model{models.length === 1 ? '' : 's'} available.
			</div>
		{/if}

		<details bind:open={advanced} class="rounded-lg border border-ink-700 p-4 text-sm">
			<summary class="cursor-pointer text-slate-300">Advanced</summary>
			<div class="mt-4 flex flex-col gap-4">
				<label class="flex flex-col gap-1.5">
					<span class="text-slate-300">Base URL</span>
					<input
						type="text"
						bind:value={baseUrl}
						spellcheck="false"
						class="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-accent"
					/>
					<span class="text-xs text-slate-500"
						>Any OpenAI-compatible endpoint. Default: {DEFAULT_BASE_URL}</span
					>
					<span class="font-mono text-xs text-slate-600">
						GET {resolvedBase}/models · POST {resolvedBase}/chat/completions
					</span>
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-slate-300">Temperature: {temperature.toFixed(1)}</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.1"
						bind:value={temperature}
						class="accent-[var(--color-accent)]"
					/>
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-slate-300">Max output tokens: {maxTokens}</span>
					<input
						type="range"
						min="256"
						max="8192"
						step="256"
						bind:value={maxTokens}
						class="accent-[var(--color-accent)]"
					/>
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-slate-300">Chat tool calling</span>
					<select
						bind:value={toolMode}
						class="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-slate-100 outline-none focus:border-accent"
					>
						<option value="prompt">Prompt protocol (works everywhere, default)</option>
						<option value="native">Native function calling (OpenAI tools)</option>
					</select>
					<span class="text-xs text-slate-500"
						>How the chat asks the model to use the site’s tools. Switch to native if your endpoint
						supports OpenAI <code class="font-mono">tools</code>.</span
					>
				</label>
			</div>
		</details>
	</form>

	<div class="mt-8 flex items-center justify-between border-t border-ink-700 pt-4 text-sm">
		<a href={`${base}/tools`} class="text-slate-400 hover:text-slate-200">← Back to tools</a>
		<button
			type="button"
			onclick={() => {
				settings.reset();
				token = '';
				baseUrl = DEFAULT_BASE_URL;
				model = DEFAULT_MODEL;
				temperature = settings.value.temperature;
				maxTokens = settings.value.maxTokens;
				toolMode = settings.value.toolMode;
			}}
			class="text-slate-500 hover:text-red-300">Reset all settings</button
		>
	</div>
</div>
