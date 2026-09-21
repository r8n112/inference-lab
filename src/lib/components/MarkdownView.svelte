<script lang="ts">
	import { markdown } from '$lib/chat/markdown';

	let { text }: { text: string } = $props();
</script>

<div class="markdown text-slate-100" use:markdown={text}></div>
