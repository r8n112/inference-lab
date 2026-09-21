/**
 * A small cache of the models the endpoint reports, shared by the model picker
 * (in the chat header) and the settings page.
 */

import { listModels } from '$lib/inference/client';

class ModelList {
	#fetched = $state<string[]>([]);
	#loading = $state(false);
	#error = $state('');
	#done = false;

	/** Model ids reported by the endpoint (may be empty before a fetch). */
	get fetched(): string[] {
		return this.#fetched;
	}

	get loading(): boolean {
		return this.#loading;
	}

	get error(): string {
		return this.#error;
	}

	/** Fetch the model list, replacing any cached result. */
	async refresh(token: string, baseUrl: string): Promise<void> {
		if (!token) return;
		this.#loading = true;
		this.#error = '';
		try {
			const models = await listModels(baseUrl, token);
			this.#fetched = models.map((model) => model.id);
			this.#done = true;
		} catch (error) {
			this.#error = (error as Error).message;
		} finally {
			this.#loading = false;
		}
	}

	/** Fetch once (used on mount); no-op if already loaded or in flight. */
	async ensure(token: string, baseUrl: string): Promise<void> {
		if (this.#done || this.#loading || !token) return;
		await this.refresh(token, baseUrl);
	}
}

export const models = new ModelList();
