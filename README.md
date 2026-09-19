# Inference Lab

A small, static web app of **focused, well-implemented tools** for open-weight
models served by the free [Hetzner Experiments Inference API](https://experiments.hetzner.com/docs/inference).

> **Unofficial.** Not affiliated with, sponsored by, or endorsed by Hetzner.
> This is an independent homage built on their generous experiments platform.
> No Hetzner logos or trademarks are used.

- **Static & offline-capable.** No backend, no build server, no telemetry. It is
  an installable PWA whose shell is cached; only inference needs the network.
- **Your token, your browser.** Bring your own free API token. It is stored in
  `localStorage` and sent only to the endpoint you configure.
- **Tuned for one model.** [`Qwen/Qwen3.6-35B-A3B-FP8`](https://inference.hetzner.com/api/v1/models)
  — a fast MoE with vision and a 262k-token context window — with
  `Qwen3.8-27B` selectable and any OpenAI-compatible endpoint supported.

## Tools

| Tool                  | What it does                                                  |
| --------------------- | ------------------------------------------------------------- |
| **Summarize**         | Condense long documents, leaning on the 262k context window.  |
| **Extract to JSON**   | Pull structured data from messy text into a shape you define. |
| **Rewrite**           | Change tone and length while preserving meaning.              |
| **Translate**         | Translate while keeping Markdown, code and links intact.      |
| **Commit message**    | Turn a `git diff` into a Conventional Commit.                 |
| **Explain code**      | Explain a snippet at the depth you need.                      |
| **Classify & tag**    | Sort text into your own labels, as strict JSON.               |
| **Describe an image** | Alt text, UI steps or a full description (vision input).      |

Each tool is a small data definition: a short system prompt, a handful of
options, and (where needed) a post-processor. No hidden cleverness, no agentic
loops — just reliable single-shot tasks that a fast model does well.

## Quick start

```sh
npm install
npm run dev
```

Open the app, go to **Settings**, and paste a token from
<https://experiments.hetzner.com/inference>. Then pick a tool and press **Run**.

## Development

```sh
npm run dev        # dev server
npm run build      # static build → build/
npm run preview    # preview the production build
npm run check      # svelte-check (0 errors target)
npm test           # vitest unit tests
npm run format     # prettier
```

Unit tests cover the prompt builders, the JSON post-processing, and the SSE
client. Everything else is plain Svelte + Tailwind.

## Deploy

The build is a pure static bundle in `build/`, so it runs anywhere.

**GitHub Pages** — the included `.github/workflows/deploy.yml` builds with
`BASE_PATH=/<repo>` and publishes. Enable _Settings → Pages → Source: GitHub
Actions_ once.

**Cloudflare Pages** — build command `npm run build`, output directory `build`,
no `BASE_PATH` (served from the root).

## Architecture

```
src/
  app.html, app.css          shell + design tokens
  lib/
    inference/
      client.ts              OpenAI-compatible client (fetch + SSE), typed errors
      types.ts               minimal wire types
    tools/
      index.ts               the eight tools (data) + JSON helpers
      types.ts               Tool/field model + message builder
    settings.svelte.ts       token, base URL, model (localStorage)
    components/ToolRunner.svelte
  routes/
    +layout.svelte           shell, nav, unofficial notice
    +page.svelte             tool grid
    t/[id]/+page.svelte      generic tool page
    settings/, about/
```

## Adding a tool

Add an entry to `src/lib/tools/index.ts`; the UI, routing, streaming, copy and
download all come for free. Keep the system prompt short and explicit — small
models reward clarity — and prefer `temperature: 0` with a `postProcess` for
structured output.

## Privacy

No analytics, no cookies, no backend. Input is sent directly from your browser
to the configured inference API. See the in-app **About** page.

## License

MIT OR Apache-2.0.
