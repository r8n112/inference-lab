<script lang="ts">
	let {
		onSend,
		onStop,
		busy = false,
		disabled = false
	}: {
		onSend: (text: string, image?: string) => void;
		onStop: () => void;
		busy?: boolean;
		disabled?: boolean;
	} = $props();

	let text = $state('');
	let image = $state('');
	let textarea: HTMLTextAreaElement;

	export function focus() {
		textarea?.focus();
	}

	function submit() {
		const value = text.trim();
		if ((!value && !image) || busy || disabled) return;
		onSend(value || 'Describe this image.', image || undefined);
		text = '';
		image = '';
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
		textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
	}

	function onImage(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => (image = String(reader.result));
		reader.readAsDataURL(file);
	}
</script>

<div class="rounded-xl border border-ink-700 bg-ink-900/70 p-2">
	{#if image}
		<div class="mb-2 flex items-center gap-2 px-1">
			<img src={image} alt="Attachment preview" class="h-14 rounded-lg border border-ink-600" />
			<button
				type="button"
				onclick={() => (image = '')}
				class="text-xs text-slate-400 hover:text-red-300">remove</button
			>
		</div>
	{/if}

	<div class="flex items-end gap-2">
		<textarea
			bind:this={textarea}
			bind:value={text}
			oninput={autoGrow}
			onkeydown={onKeydown}
			rows="1"
			placeholder="Ask anything — the assistant picks the right tool…"
			class="max-h-[200px] min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
		></textarea>

		<label
			class="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-ink-600 text-slate-400 hover:text-slate-200"
			title="Attach an image"
		>
			<input type="file" accept="image/*" class="hidden" onchange={onImage} />
			<span aria-hidden="true">🖼️</span>
		</label>

		{#if busy}
			<button
				type="button"
				onclick={onStop}
				class="h-9 rounded-lg bg-ink-700 px-3 text-sm text-slate-100 hover:bg-ink-600">Stop</button
			>
		{:else}
			<button
				type="button"
				onclick={submit}
				disabled={disabled || (!text.trim() && !image)}
				class="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
				>Send</button
			>
		{/if}
	</div>
</div>
