/**
 * User settings: API base URL, personal access token, default model and
 * generation knobs. Everything lives in `localStorage` only — the app has no
 * backend and never sends the token anywhere except the inference API itself.
 */

const STORAGE_KEY = 'inference-lab.settings.v1';

/** The public, documented base URL of the Hetzner Experiments Inference API. */
export const DEFAULT_BASE_URL = 'https://inference.hetzner.com/api/v1';

/** The model this toolstack is tuned for: a fast MoE with vision and 262k ctx. */
export const DEFAULT_MODEL = 'Qwen/Qwen3.6-35B-A3B-FP8';

/**
 * How the chat asks the model to use tools:
 * - `prompt`: a strict JSON protocol in the system prompt (works on any
 *   OpenAI-compatible endpoint) — the default, for reliability.
 * - `native`: OpenAI-style `tools` / `tool_calls` function calling.
 */
export type ToolMode = 'prompt' | 'native';

export interface Settings {
	baseUrl: string;
	token: string;
	model: string;
	temperature: number;
	maxTokens: number;
	toolMode: ToolMode;
}

export const DEFAULT_SETTINGS: Settings = {
	baseUrl: DEFAULT_BASE_URL,
	token: '',
	model: DEFAULT_MODEL,
	temperature: 0.2,
	maxTokens: 2048,
	toolMode: 'prompt'
};

function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function load(): Settings {
	if (!isBrowser()) return { ...DEFAULT_SETTINGS };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_SETTINGS };
		const parsed = JSON.parse(raw) as Partial<Settings>;
		return {
			...DEFAULT_SETTINGS,
			...parsed,
			// Never let a stale/empty base URL break the app.
			baseUrl: parsed.baseUrl?.trim() || DEFAULT_BASE_URL,
			model: parsed.model?.trim() || DEFAULT_MODEL
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

class SettingsStore {
	#value = $state<Settings>(load());

	get value(): Settings {
		return this.#value;
	}

	/** True once a token has been provided. */
	get hasToken(): boolean {
		return this.#value.token.trim().length > 0;
	}

	/** True when the base URL has been changed away from the default host. */
	get isCustomEndpoint(): boolean {
		return this.#value.baseUrl.trim() !== DEFAULT_BASE_URL;
	}

	update(patch: Partial<Settings>): void {
		this.#value = { ...this.#value, ...patch };
		this.#persist();
	}

	reset(): void {
		this.#value = { ...DEFAULT_SETTINGS };
		this.#persist();
	}

	clearToken(): void {
		this.update({ token: '' });
	}

	#persist(): void {
		if (!isBrowser()) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#value));
		} catch {
			// Quota or private-mode failures must not break the app.
		}
	}
}

export const settings = new SettingsStore();
