<script lang="ts">
	import MarkdownView from '$lib/components/MarkdownView.svelte';
	import type { ChatMessage } from '$lib/inference/types';

	let { message }: { message: ChatMessage } = $props();

	const text = $derived(
		typeof message.content === 'string'
			? message.content
			: message.content
					.map((part) => (part.type === 'text' ? part.text : ''))
					.filter(Boolean)
					.join('\n\n')
	);
	const images = $derived(
		Array.isArray(message.content)
			? message.content.filter((part) => part.type === 'image_url')
			: []
	);
	const isUser = $derived(message.role === 'user');
	const thinking = $derived(!isUser && !text && images.length === 0);
</script>

<div class="flex flex-col gap-2 {isUser ? 'items-end' : 'items-stretch'}">
	{#if images.length}
		<div class="flex flex-wrap gap-2 {isUser ? 'justify-end' : ''}">
			{#each images as image (image.image_url.url.slice(-40))}
				<a
					href={image.image_url.url}
					target="_blank"
					rel="noopener noreferrer"
					class="overflow-hidden rounded-lg border border-ink-600"
				>
					<img
						src={image.image_url.url}
						alt="Attached"
						class="max-h-48 max-w-[16rem] object-cover"
					/>
				</a>
			{/each}
		</div>
	{/if}

	{#if isUser}
		{#if text}
			<div
				class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-ink-600 bg-ink-800 px-4 py-2.5 text-[0.9375rem] leading-relaxed text-slate-100"
			>
				{text}
			</div>
		{/if}
	{:else}
		<div class="flex gap-3">
			<span
				class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-xs font-semibold text-white"
				aria-hidden="true">iL</span
			>
			<div class="min-w-0 flex-1">
				{#if thinking}
					<div class="flex items-center gap-2 py-1" aria-label="Thinking">
						<span class="flex gap-1">
							<span class="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]"
							></span>
							<span class="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]"
							></span>
							<span class="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]"
							></span>
						</span>
						<span class="text-xs text-slate-500">thinking…</span>
					</div>
				{:else}
					<MarkdownView {text} />
				{/if}
			</div>
		</div>
	{/if}
</div>
