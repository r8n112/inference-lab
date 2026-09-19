<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { settings } from '$lib/settings.svelte';

	let { children } = $props();

	const nav = [
		{ href: `${base}/`, label: 'Tools' },
		{ href: `${base}/about`, label: 'About' },
		{ href: `${base}/settings`, label: 'Settings' }
	];

	const isActive = (href: string) =>
		href === `${base}/` ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

<div class="flex min-h-full flex-col">
	<header class="sticky top-0 z-20 border-b border-ink-700 bg-ink-950/80 backdrop-blur">
		<div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
			<a href={`${base}/`} class="group flex items-center gap-2 font-semibold tracking-tight">
				<span
					class="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm font-bold text-white shadow-sm"
					aria-hidden="true">iL</span
				>
				<span class="text-slate-100 group-hover:text-white">Inference Lab</span>
			</a>

			<nav class="ml-2 flex items-center gap-1 text-sm">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="rounded-md px-3 py-1.5 transition-colors {isActive(item.href)
							? 'bg-ink-700 text-white'
							: 'text-slate-400 hover:bg-ink-800 hover:text-slate-100'}">{item.label}</a
					>
				{/each}
			</nav>

			<div class="ml-auto flex items-center gap-2 text-xs">
				{#if settings.hasToken}
					<span class="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300">token set</span>
				{:else}
					<a
						href={`${base}/settings`}
						class="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300 hover:bg-amber-500/20"
						>add a token →</a
					>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
		{@render children()}
	</main>

	<footer class="border-t border-ink-700 px-4 py-6 text-xs text-slate-500">
		<div
			class="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
		>
			<p>
				<span class="text-slate-400">Unofficial.</span> Not affiliated with or endorsed by Hetzner.
				An homage, built on the free
				<a
					class="text-slate-300 underline decoration-accent/60 underline-offset-2 hover:text-white"
					href="https://experiments.hetzner.com/docs/inference"
					rel="noopener noreferrer"
					target="_blank">Hetzner Experiments Inference API</a
				>.
			</p>
			<p class="shrink-0">
				MIT OR Apache-2.0 · <a
					class="hover:text-slate-300"
					href="https://github.com/r8n112/inference-lab"
					rel="noopener noreferrer"
					target="_blank">source</a
				>
			</p>
		</div>
	</footer>
</div>
