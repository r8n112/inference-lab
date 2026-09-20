# Inference Lab

A small, static web app of **focused, well-implemented tools** for open-weight
models served by the free [Hetzner Experiments Inference API](https://experiments.hetzner.com/docs/inference).

> **Unofficial.** Not affiliated with, sponsored by, or endorsed by Hetzner.
> This is an independent homage built on their generous experiments platform.
> No Hetzner logos or trademarks are used.

- **Chat first.** The home screen is a Claude-style assistant that decides when to
  use the site's tools behind the scenes. Each tool is also available on its own.
- **Static & offline-capable.** No backend, no build server, no telemetry. It is
  an installable PWA whose shell is cached; only inference needs the network.
- **Your token, your browser.** Bring your own free API token. It is stored in
  `localStorage` and sent only to the endpoint you configure.
- **Tuned for one model.** [`Qwen/Qwen3.6-35B-A3B-FP8`](https://inference.hetzner.com/api/v1/models)
  — a fast MoE with vision and a 262k-token context window — with
  `Qwen3.8-27B` selectable and any OpenAI-compatible endpoint supported.

## Chat

The home route is a Claude-style assistant with a left sidebar of conversations.
It uses **tool calling** so the model can invoke a tool, see the result, and
continue:

- **Prompt protocol (default).** A strict, fenced `tool` directive in the system
  prompt. It works on any OpenAI-compatible completion endpoint, including ones
  without native function calling.
- **Native function calling.** OpenAI-style `tools` / `tool_calls`, selectable in
  Settings for endpoints that support it.

The transcript is always stored in the native shape, so the UI is identical in
both modes. Tool calls are shown inline as compact traces. The user's message
appears immediately (before the request), and a thinking indicator is shown while
the model or a tool is working. Conversations are stored in `localStorage`; images
can be attached directly and go to the vision-capable model rather than a tool.

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
options, and (where needed) a post-processor. The chat exposes the non-vision
tools as callable functions **derived from those same definitions**, so adding a
tool makes it available to the assistant automatically. No agentic loops beyond a
bounded tool-use cycle.

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

Unit tests cover the prompt builders, the chat agent loop (both tool modes), the
JSON post-processing, and the SSE client. Everything else is plain Svelte +
Tailwind.

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
      client.ts              OpenAI-compatible client (fetch + SSE, tool calls), typed errors
      types.ts               minimal wire types
    chat/
      agent.ts               the tool-use loop (native + prompt modes)
      tools.ts               tool schemas + the fallback protocol + parser
      conversations.ts       pure conversation helpers (title, time)
      conversations.svelte.ts reactive multi-conversation store
      view.ts                transcript → render list (collapses tool traces)
      markdown.ts            marked + DOMPurify + highlight.js
    tools/
      index.ts               the eight tools (data) + JSON helpers
      types.ts               Tool/field model + message builder
    settings.svelte.ts       token, base URL, model, tool mode (localStorage)
    components/              Sidebar, ChatMessage, Composer, ToolTrace, ToolRunner
  routes/
    +layout.svelte           app shell (sidebar + mobile drawer)
    +page.svelte             chat (home)
    tools/+page.svelte       tool grid
    tools/[id]/+page.svelte  generic tool page
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
