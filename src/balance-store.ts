import { type Balance, fetchBalance } from "./balance.ts";

/** How often the balance is re-fetched while keys are visible. */
export const REFRESH_MS = 5 * 60_000;

/** What the credit key should show. */
export type CreditView = { kind: "loading" } | { kind: "no-key" } | Balance;

/**
 * Holds the API key and the last fetched balance, shared by every key on the deck, so several keys cost one
 * request. Concurrent refreshes for the same key share one request, and a result for a key that has since been
 * replaced is dropped.
 */
export class BalanceStore {
	#apiKey: string | undefined; // undefined until global settings have been read
	#balance: Balance | undefined;
	#fetchedAt = 0;
	#inflight: { apiKey: string; promise: Promise<void> } | undefined;
	readonly #onChange: () => void;
	readonly #fetch: (apiKey: string) => Promise<Balance>;
	readonly #now: () => number;

	/**
	 * @param onChange Called whenever {@link BalanceStore.view} changes.
	 */
	constructor(onChange: () => void, fetch: (apiKey: string) => Promise<Balance> = fetchBalance, now: () => number = Date.now) {
		this.#onChange = onChange;
		this.#fetch = fetch;
		this.#now = now;
	}

	get view(): CreditView {
		if (this.#apiKey === undefined) {
			return { kind: "loading" };
		}
		if (this.#apiKey === "") {
			return { kind: "no-key" };
		}
		return this.#balance ?? { kind: "loading" };
	}

	/** Sets the API key; a changed key discards the old balance and fetches a new one. */
	setApiKey(apiKey: string | undefined): Promise<void> {
		const key = apiKey?.trim() ?? "";
		if (key === this.#apiKey) {
			return Promise.resolve();
		}
		this.#apiKey = key;
		this.#balance = undefined;
		this.#fetchedAt = 0;
		this.#onChange();
		return this.refresh();
	}

	/** Fetches the balance now, unless a request for the same key is already under way. */
	refresh(): Promise<void> {
		const apiKey = this.#apiKey;
		if (!apiKey) {
			return Promise.resolve();
		}
		if (this.#inflight?.apiKey === apiKey) {
			return this.#inflight.promise;
		}
		const promise = this.#fetch(apiKey)
			.then((result) => {
				if (apiKey === this.#apiKey) {
					this.#balance = result;
					this.#fetchedAt = this.#now();
					this.#onChange();
				}
			})
			.finally(() => {
				if (this.#inflight?.promise === promise) {
					this.#inflight = undefined;
				}
			});
		this.#inflight = { apiKey, promise };
		return promise;
	}

	/** Fetches the balance if the last fetch is older than {@link REFRESH_MS}. */
	refreshIfStale(): Promise<void> {
		return this.#now() - this.#fetchedAt >= REFRESH_MS ? this.refresh() : Promise.resolve();
	}
}
