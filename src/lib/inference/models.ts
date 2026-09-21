/**
 * Pure helpers for the model list. Kept separate from the reactive store so the
 * merge logic can be unit-tested in a plain Node environment.
 */

/** Models the site is known to work with, used before/without a live fetch. */
export const FALLBACK_MODELS = ['Qwen/Qwen3.6-35B-A3B-FP8', 'Qwen3.8-27B'];

/**
 * The list shown in the picker: the current model first, then models fetched
 * from the endpoint, then the known fallbacks, without duplicates.
 */
export function mergeModels(current: string, fetched: string[]): string[] {
	const set = new Set<string>();
	if (current) set.add(current);
	for (const id of fetched) if (id) set.add(id);
	for (const id of FALLBACK_MODELS) set.add(id);
	return [...set];
}
