<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { conversations } from '$lib/chat/conversations.svelte';
	import { relativeTime } from '$lib/chat/conversations';
	import { settings } from '$lib/settings.svelte';

	let { onNavigate }: { onNavigate?: () => void } = $props();

	const links = [
		{ href: `${base}/tools`, label: 'Tools', icon: '🧰' },
		{ href: `${base}/settings`, label: 'Settings', icon: '⚙️' },
		{ href: `${base}/about`, label: 'About', icon: 'ℹ️' }
	];

	const isActive = (href: string) => page.url.pathname.startsWith(href);

	function newChat() {
		conversations.create();
		onNavigate?.();
	}

	function open(id: string) {
		conversations.select(id);
		onNavigate?.();
	}
</script>

<aside class="flex h-full w-72 shrink-0 flex-col border-r border-ink-700 bg-ink-950">
	<div class="flex items-center gap-2 px-3 py-3">
		<a
			href={`${base}/`}
			class="flex items-center gap-2 font-semibold tracking-tight"
			onclick={onNavigate}
		>
			<span
				class="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm font-bold text-white shadow-sm"
				aria-hidden="true">iL</span
			>
			<span class="text-slate-100">Inference Lab</span>
		</a>
	</div>

	<div class="px-3">
		<button
			onclick={newChat}
			class="flex w-full items-center gap-2 rounded-lg border border-ink-600 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-ink-800"
		>
			<span aria-hidden="true">＋</span> New chat
		</button>
	</div>

	<nav class="mt-4 min-h-0 flex-1 overflow-y-auto px-2">
		<p class="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">Recent</p>
		{#if conversations.list.length === 0}
			<p class="px-2 py-2 text-xs text-slate-600">No conversations yet.</p>
		{/if}
		<ul class="space-y-0.5">
			{#each conversations.list as conversation (conversation.id)}
				<li class="group relative">
					<button
						onclick={() => open(conversation.id)}
						class="flex w-full items-center gap-2 rounded-lg px-2 py-2 pr-8 text-left text-sm transition-colors {conversation.id ===
						conversations.activeId
							? 'bg-ink-700 text-white'
							: 'text-slate-300 hover:bg-ink-800'}"
					>
						<span class="truncate">{conversation.title}</span>
					</button>
					<span
						class="absolute right-2 top-1/2 hidden -translate-y-1/2 text-[10px] text-slate-500 group-hover:inline"
					>
						{relativeTime(conversation.updatedAt, Date.now())}
					</span>
					<button
						onclick={() => conversations.remove(conversation.id)}
						title="Delete conversation"
						aria-label="Delete conversation"
						class="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-1 text-slate-500 hover:text-red-300 group-hover:block"
						>🗑</button
					>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="border-t border-ink-700 p-2">
		{#each links as link (link.href)}
			<a
				href={link.href}
				onclick={onNavigate}
				class="flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors {isActive(
					link.href
				)
					? 'bg-ink-800 text-white'
					: 'text-slate-400 hover:bg-ink-800 hover:text-slate-100'}"
			>
				<span aria-hidden="true">{link.icon}</span>
				{link.label}
			</a>
		{/each}

		<div class="mt-1 px-2 pb-1 pt-2">
			{#if settings.hasToken}
				<span class="inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
					<span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> token set
				</span>
			{:else}
				<a
					href={`${base}/settings`}
					onclick={onNavigate}
					class="inline-flex items-center gap-1.5 text-[11px] text-amber-300 hover:text-amber-200"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span> add a token
				</a>
			{/if}
		</div>
		<p class="px-2 pb-1 text-[10px] leading-4 text-slate-600">
			Unofficial; not affiliated with Hetzner. Built on the free
			<a
				class="underline decoration-accent/50 underline-offset-2 hover:text-slate-400"
				href="https://experiments.hetzner.com/docs/inference"
				rel="noopener noreferrer"
				target="_blank">Experiments Inference API</a
			>.
		</p>
	</div>
</aside>
