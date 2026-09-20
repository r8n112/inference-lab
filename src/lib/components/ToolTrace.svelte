<script lang="ts">
	import type { ToolTraceItem } from '$lib/chat/view';

	let { items }: { items: ToolTraceItem[] } = $props();
</script>

<div class="flex flex-wrap gap-2">
	{#each items as item (item.name + (item.result ?? '').slice(0, 16))}
		<span
			class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs {item.ok ===
			false
				? 'border-red-500/40 bg-red-500/10 text-red-200'
				: item.ok
					? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
					: 'border-ink-600 bg-ink-800 text-slate-300'}"
			title={item.result ? item.result.slice(0, 300) : undefined}
		>
			<span aria-hidden="true">{item.ok === false ? '⚠' : '🔧'}</span>
			{item.name}
			{#if item.ok === undefined}<span class="animate-pulse">…</span>{/if}
		</span>
	{/each}
</div>
