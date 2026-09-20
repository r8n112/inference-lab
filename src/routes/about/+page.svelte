<script lang="ts">
	import { base } from '$app/paths';
</script>

<div class="h-full overflow-y-auto">
	<div class="mx-auto max-w-2xl space-y-6 px-4 py-8 text-slate-300 sm:px-6">
		<h1 class="text-2xl font-semibold tracking-tight text-white">About</h1>

		<section class="space-y-3">
			<h2 class="font-medium text-slate-100">What this is</h2>
			<p>
				Inference Lab is a small, static web app that demonstrates what a fast open-weight model can
				do well. The home screen is a chat assistant; behind it are a handful of deliberately narrow
				tools — one clear job each, a short prompt, deterministic settings, and no hidden
				cleverness. The assistant decides when to call a tool, and every tool is also usable on its
				own from the
				<strong class="text-slate-100">Tools</strong> tab.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="font-medium text-slate-100">Unofficial, and grateful</h2>
			<p>
				This project is <strong class="text-slate-100"
					>not affiliated with, sponsored by, or endorsed by Hetzner</strong
				>. It is an independent homage to their
				<a
					class="text-slate-200 underline decoration-accent/60 underline-offset-2 hover:text-white"
					href="https://experiments.hetzner.com"
					rel="noopener noreferrer"
					target="_blank">Experiments platform</a
				>, which offers free inference on open models to anyone. The red accent is a nod to their
				mark; no Hetzner logos or trademarks are used.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="font-medium text-slate-100">Privacy</h2>
			<p>
				There is no backend and no telemetry. Your token and settings live in this browser's
				<code class="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-xs">localStorage</code>. When
				you press Run, your input is sent directly from your browser to the inference API. This site
				collects nothing.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="font-medium text-slate-100">Offline behaviour</h2>
			<p>
				The app is an installable PWA and its shell is cached, so the interface loads without a
				network. Inference itself needs the network — no model runs on your device.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="font-medium text-slate-100">Open source</h2>
			<p>
				MIT OR Apache-2.0. Source, issues and contributions:
				<a
					class="text-slate-200 underline decoration-accent/60 underline-offset-2 hover:text-white"
					href="https://github.com/r8n112/inference-lab"
					rel="noopener noreferrer"
					target="_blank">github.com/r8n112/inference-lab</a
				>.
			</p>
		</section>

		<a href={`${base}/`} class="inline-block text-sm text-accent-soft hover:text-white"
			>← Back to tools</a
		>
	</div>
</div>
