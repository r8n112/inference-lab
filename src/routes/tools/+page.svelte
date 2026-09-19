<script lang="ts">
	import { base } from '$app/paths';
	import { settings } from '$lib/settings.svelte';
	import { TOOLS } from '$lib/tools';
</script>

<section class="mb-10 max-w-3xl">
	<h1 class="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
		Small tools for open models
	</h1>
	<p class="mt-3 text-slate-400">
		Focused, well-implemented tools powered by the free
		<a
			class="text-slate-200 underline decoration-accent/60 underline-offset-2 hover:text-white"
			href="https://experiments.hetzner.com/docs/inference"
			rel="noopener noreferrer"
			target="_blank">Hetzner Experiments Inference API</a
		>. Each one is a single, reliable job — or ask the
		<a
			class="text-slate-200 underline decoration-accent/60 underline-offset-2 hover:text-white"
			href={`${base}/`}>assistant</a
		> to pick the right tool for you.
	</p>
	<div class="mt-4 flex flex-wrap items-center gap-3 text-sm">
		<span class="rounded-full border border-ink-600 px-3 py-1 text-slate-300"
			>tuned for {settings.value.model}</span
		>
		{#if !settings.hasToken}
			<a
				href={`${base}/settings`}
				class="rounded-full bg-accent px-3 py-1 font-medium text-white hover:bg-accent-soft"
				>Get started: add your token</a
			>
		{/if}
	</div>
</section>

<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each TOOLS as tool (tool.id)}
		<li>
			<a
				href={`${base}/tools/${tool.id}`}
				class="group flex h-full flex-col gap-3 rounded-xl border border-ink-700 bg-ink-900/60 p-5 transition-colors hover:border-ink-600 hover:bg-ink-800"
			>
				<div class="flex items-center gap-3">
					<span class="text-2xl" aria-hidden="true">{tool.icon}</span>
					<span
						class="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400"
						>{tool.category}</span
					>
				</div>
				<h2 class="font-medium text-slate-100 group-hover:text-white">{tool.name}</h2>
				<p class="text-sm text-slate-400">{tool.tagline}</p>
				{#if tool.highlight}
					<p class="mt-auto text-xs text-accent-soft">{tool.highlight}</p>
				{/if}
			</a>
		</li>
	{/each}
</ul>

<section class="mt-12 rounded-xl border border-ink-700 bg-ink-900/40 p-5 text-sm text-slate-400">
	<h2 class="mb-2 font-medium text-slate-200">Honest about the trade-offs</h2>
	<ul class="list-inside list-disc space-y-1">
		<li>
			The <strong class="text-slate-300">shell works offline</strong> (installable PWA); inference needs
			the network by definition.
		</li>
		<li>
			This is an <strong class="text-slate-300">experiment</strong>: the API and models can change.
			Settings let you point at a different OpenAI-compatible endpoint.
		</li>
		<li>
			<strong class="text-slate-300">Unofficial</strong> and not affiliated with Hetzner — a homage to
			their open, generous spirit.
		</li>
	</ul>
</section>
