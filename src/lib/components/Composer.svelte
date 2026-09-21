<script lang="ts">
	import { formatBytes, MAX_FILES, type Attachment } from '$lib/chat/attachments';

	let {
		onSend,
		onStop,
		busy = false,
		disabled = false,
		attachments = [],
		onAddFiles,
		onRemoveAttachment
	}: {
		onSend: (text: string, attachments: Attachment[]) => void;
		onStop: () => void;
		busy?: boolean;
		disabled?: boolean;
		attachments?: Attachment[];
		onAddFiles: (files: File[]) => void;
		onRemoveAttachment: (id: string) => void;
	} = $props();

	let text = $state('');
	let textarea: HTMLTextAreaElement;
	let dragging = $state(false);

	function submit() {
		const value = text.trim();
		if ((!value && attachments.length === 0) || busy || disabled) return;
		onSend(value, attachments);
		text = '';
		if (textarea) textarea.style.height = 'auto';
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	}

	function autoGrow() {
		if (!textarea) return;
		textarea.style.height = 'auto';
		textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
	}

	function onPaste(event: ClipboardEvent) {
		const files = [...(event.clipboardData?.files ?? [])];
		if (files.length) {
			event.preventDefault();
			onAddFiles(files);
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const files = [...(event.dataTransfer?.files ?? [])];
		if (files.length) onAddFiles(files);
	}

	function onPick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		if (files.length) onAddFiles(files);
		input.value = '';
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="rounded-2xl border bg-ink-900/80 shadow-sm transition-colors {dragging
		? 'border-accent bg-ink-800'
		: 'border-ink-600 focus-within:border-ink-600'}"
	ondragover={(event) => {
		event.preventDefault();
		dragging = true;
	}}
	ondragleave={() => (dragging = false)}
	ondrop={onDrop}
>
	{#if attachments.length}
		<div class="flex flex-wrap gap-2 border-b border-ink-700 p-2.5">
			{#each attachments as attachment (attachment.id)}
				<div
					class="group relative flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 py-1 pl-1 pr-2"
				>
					{#if attachment.kind === 'image' && attachment.dataUrl}
						<img
							src={attachment.dataUrl}
							alt={attachment.name}
							class="h-9 w-9 rounded object-cover"
						/>
					{:else}
						<span
							class="grid h-9 w-9 place-items-center rounded bg-ink-700 text-base"
							aria-hidden="true">📄</span
						>
					{/if}
					<span class="max-w-[10rem]">
						<span class="block truncate text-xs text-slate-200">{attachment.name}</span>
						<span class="block text-[10px] text-slate-500">
							{formatBytes(attachment.size)}{attachment.truncated ? ' · truncated' : ''}
						</span>
					</span>
					<button
						type="button"
						onclick={() => onRemoveAttachment(attachment.id)}
						aria-label="Remove {attachment.name}"
						class="ml-1 grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-ink-600 hover:text-red-300"
						>×</button
					>
				</div>
			{/each}
		</div>
	{/if}

	<div class="flex items-end gap-2 p-2">
		<textarea
			bind:this={textarea}
			bind:value={text}
			oninput={autoGrow}
			onkeydown={onKeydown}
			onpaste={onPaste}
			rows="1"
			placeholder="Message Inference Lab…"
			class="max-h-[240px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[0.9375rem] text-slate-100 outline-none placeholder:text-slate-600"
		></textarea>

		<label
			class="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-ink-600 text-slate-400 transition-colors hover:bg-ink-800 hover:text-slate-200 {attachments.length >=
			MAX_FILES
				? 'pointer-events-none opacity-40'
				: ''}"
			title={`Attach files or images (max ${MAX_FILES})`}
		>
			<input type="file" multiple class="hidden" onchange={onPick} />
			<span aria-hidden="true">📎</span>
		</label>

		{#if busy}
			<button
				type="button"
				onclick={onStop}
				class="h-9 shrink-0 rounded-lg bg-ink-700 px-3 text-sm text-slate-100 hover:bg-ink-600"
				>Stop</button
			>
		{:else}
			<button
				type="button"
				onclick={submit}
				disabled={disabled || (!text.trim() && attachments.length === 0)}
				aria-label="Send"
				class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
				>↑</button
			>
		{/if}
	</div>
</div>
