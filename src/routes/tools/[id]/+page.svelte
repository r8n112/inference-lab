<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import ToolRunner from '$lib/components/ToolRunner.svelte';
	import { getTool } from '$lib/tools';

	const tool = $derived(getTool(page.params.id ?? ''));
</script>

<div class="h-full overflow-y-auto">
	<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
		{#if tool}
			<nav class="mb-6 text-sm text-slate-500">
				<a href={`${base}/tools`} class="hover:text-slate-300">Tools</a>
				<span class="mx-1.5">/</span>
				<span class="text-slate-400">{tool.name}</span>
			</nav>

			<header class="mb-6 max-w-3xl">
				<div class="flex items-center gap-3">
					<span class="text-2xl" aria-hidden="true">{tool.icon}</span>
					<h1 class="text-2xl font-semibold tracking-tight text-white">{tool.name}</h1>
				</div>
				<p class="mt-2 text-slate-400">{tool.description}</p>
			</header>

			<ToolRunner {tool} />
		{:else}
			<div class="py-20 text-center">
				<p class="text-lg text-slate-300">That tool doesn’t exist.</p>
				<a
					href={`${base}/tools`}
					class="mt-3 inline-block text-sm text-accent-soft hover:text-white">← Back to all tools</a
				>
			</div>
		{/if}
	</div>
</div>
