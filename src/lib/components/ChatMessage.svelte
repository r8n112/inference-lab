<script lang="ts">
	import { markdown } from '$lib/chat/markdown';
	import type { ChatMessage } from '$lib/inference/types';

	let { message }: { message: ChatMessage } = $props();

	const text = $derived(
		typeof message.content === 'string'
			? message.content
			: message.content.map((part) => (part.type === 'text' ? part.text : '[image]')).join(' ')
	);
	const images = $derived(
		Array.isArray(message.content)
			? message.content.filter((part) => part.type === 'image_url')
			: []
	);
	const isUser = $derived(message.role === 'user');
</script>

<div class="flex gap-3 {isUser ? 'flex-row-reverse' : ''}">
	<div
		class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-semibold {isUser
			? 'bg-ink-700 text-slate-200'
			: 'bg-accent text-white'}"
		aria-hidden="true"
	>
		{isUser ? 'You' : 'iL'}
	</div>

	<div
		class="min-w-0 max-w-full flex-1 rounded-xl border px-4 py-3 text-sm {isUser
			? 'border-ink-700 bg-ink-800/70'
			: 'border-ink-700 bg-ink-900/60'}"
	>
		{#if images.length}
			<div class="mb-2 flex flex-wrap gap-2">
				{#each images as image (image.image_url.url.slice(0, 32))}
					<img
						src={image.image_url.url}
						alt="Attached"
						class="max-h-40 rounded-lg border border-ink-600"
					/>
				{/each}
			</div>
		{/if}
		{#if isUser || message.role === 'system'}
			<div class="whitespace-pre-wrap break-words text-slate-100">{text}</div>
		{:else if text}
			<div
				class="prose-invert max-w-none break-words text-slate-100 [&_a]:text-accent-soft [&_a]:underline [&_code]:rounded [&_code]:bg-ink-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_h1]:mt-3 [&_h2]:mt-3 [&_h2]:text-base [&_h3]:mt-2 [&_h3]:text-sm [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-ink-700 [&_pre]:bg-ink-950 [&_pre]:p-3 [&_table]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
				use:markdown={text}
			></div>
		{:else}
			<span class="inline-flex gap-1 text-slate-500" aria-label="Thinking"
				><span class="animate-pulse">●</span><span class="animate-pulse [animation-delay:200ms]"
					>●</span
				><span class="animate-pulse [animation-delay:400ms]">●</span></span
			>
		{/if}
	</div>
</div>
