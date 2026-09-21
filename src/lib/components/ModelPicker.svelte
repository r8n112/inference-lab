<script lang="ts">
	import { mergeModels } from '$lib/inference/models';
	import { models as modelList } from '$lib/inference/models.svelte';
	import { settings } from '$lib/settings.svelte';

	let open = $state(false);
	let root: HTMLDivElement;

	const current = $derived(settings.value.model);
	const ids = $derived(mergeModels(current, modelList.fetched));

	$effect(() => {
		if (settings.hasToken) modelList.ensure(settings.value.token, settings.value.baseUrl);
	});

	function choose(id: string) {
		settings.update({ model: id });
		open = false;
	}

	function onWindowClick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window
	onclick={onWindowClick}
	onkeydown={(event) => event.key === 'Escape' && (open = false)}
/>

<div bind:this={root} class="relative">
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-haspopup="listbox"
		aria-expanded={open}
		class="flex max-w-[11rem] items-center gap-1.5 rounded-lg border border-ink-600 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-ink-800 sm:max-w-[18rem]"
	>
		<span class="truncate font-mono">{current}</span>
		<span class="shrink-0 text-slate-500" aria-hidden="true">▾</span>
	</button>

	{#if open}
		<div
			class="absolute right-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border border-ink-600 bg-ink-900 shadow-xl"
		>
			<div
				class="flex items-center justify-between border-b border-ink-700 px-3 py-2 text-[11px] text-slate-500"
			>
				<span>Model</span>
				<button
					type="button"
					onclick={() => modelList.refresh(settings.value.token, settings.value.baseUrl)}
					disabled={!settings.hasToken || modelList.loading}
					class="hover:text-slate-300 disabled:opacity-40"
					>{modelList.loading ? 'loading…' : 'refresh'}</button
				>
			</div>
			<ul class="max-h-64 overflow-y-auto p-1" role="listbox" aria-label="Model">
				{#each ids as id (id)}
					<li>
						<button
							type="button"
							role="option"
							aria-selected={id === current}
							onclick={() => choose(id)}
							class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-xs {id ===
							current
								? 'bg-ink-700 text-white'
								: 'text-slate-300 hover:bg-ink-800'}"
						>
							<span class="truncate">{id}</span>
							{#if id === current}<span class="ml-auto shrink-0">✓</span>{/if}
						</button>
					</li>
				{/each}
			</ul>
			{#if modelList.error}
				<p class="border-t border-ink-700 px-3 py-2 text-[11px] text-amber-300">
					{modelList.error}
				</p>
			{:else if !settings.hasToken}
				<p class="border-t border-ink-700 px-3 py-2 text-[11px] text-slate-500">
					Add a token in Settings to load the endpoint’s model list.
				</p>
			{/if}
		</div>
	{/if}
</div>
