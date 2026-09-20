<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();

	let drawerOpen = $state(false);

	// Close the mobile drawer whenever the route changes.
	$effect(() => {
		void page.url.pathname;
		drawerOpen = false;
	});
</script>

<div class="flex h-dvh overflow-hidden bg-ink-950 text-slate-200">
	<!-- Desktop sidebar -->
	<div class="hidden md:flex">
		<Sidebar />
	</div>

	<!-- Mobile drawer -->
	{#if drawerOpen}
		<div class="fixed inset-0 z-40 md:hidden">
			<button
				aria-label="Close menu"
				class="absolute inset-0 bg-black/60"
				onclick={() => (drawerOpen = false)}
			></button>
			<div class="absolute inset-y-0 left-0">
				<Sidebar onNavigate={() => (drawerOpen = false)} />
			</div>
		</div>
	{/if}

	<div class="flex min-w-0 flex-1 flex-col">
		<header class="flex items-center gap-2 border-b border-ink-700 px-3 py-2 md:hidden">
			<button
				onclick={() => (drawerOpen = true)}
				aria-label="Open menu"
				class="rounded-lg border border-ink-600 px-2.5 py-1.5 text-slate-300">☰</button
			>
			<a href={`${base}/`} class="flex items-center gap-2 font-semibold text-slate-100">
				<span class="grid h-6 w-6 place-items-center rounded bg-accent text-xs font-bold text-white"
					>iL</span
				>
				Inference Lab
			</a>
		</header>

		<main class="min-h-0 flex-1">
			{@render children()}
		</main>
	</div>
</div>
