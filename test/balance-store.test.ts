import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Balance } from "../src/balance.ts";
import { BalanceStore, REFRESH_MS } from "../src/balance-store.ts";

const ok = (amount: string): Balance => ({ kind: "ok", amount, currency: "USD", available: true });

/** A fake fetch whose requests stay pending until the test resolves them. */
function pendingFetch(): { fetch: (apiKey: string) => Promise<Balance>; requests: { apiKey: string; resolve: (b: Balance) => void }[] } {
	const requests: { apiKey: string; resolve: (b: Balance) => void }[] = [];
	const fetch = (apiKey: string): Promise<Balance> => new Promise((resolve) => requests.push({ apiKey, resolve }));
	return { fetch, requests };
}

describe("BalanceStore", () => {
	it("is loading until the API key has been read", () => {
		const store = new BalanceStore(() => {}, pendingFetch().fetch);
		assert.deepEqual(store.view, { kind: "loading" });
	});

	it("asks for an API key when none is set, without fetching", async () => {
		const { fetch, requests } = pendingFetch();
		const store = new BalanceStore(() => {}, fetch);
		for (const key of [undefined, "", "   "]) {
			await store.setApiKey(key);
			assert.deepEqual(store.view, { kind: "no-key" });
		}
		await store.refresh();
		assert.equal(requests.length, 0);
	});

	it("fetches when a key is set, trimmed, and shows the result", async () => {
		const { fetch, requests } = pendingFetch();
		let changes = 0;
		const store = new BalanceStore(() => changes++, fetch);
		const done = store.setApiKey("  sk-a \n");
		assert.deepEqual(store.view, { kind: "loading" });
		assert.equal(requests[0].apiKey, "sk-a");
		requests[0].resolve(ok("1.00"));
		await done;
		assert.deepEqual(store.view, ok("1.00"));
		assert.equal(changes, 2);
	});

	it("shares one request between overlapping refreshes", async () => {
		const { fetch, requests } = pendingFetch();
		const store = new BalanceStore(() => {}, fetch);
		const first = store.setApiKey("sk-a");
		const presses = [store.refresh(), store.refresh(), store.refreshIfStale()];
		assert.equal(requests.length, 1);
		requests[0].resolve(ok("1.00"));
		await Promise.all([first, ...presses]);
		void store.refresh();
		assert.equal(requests.length, 2, "a refresh after completion makes a new request");
	});

	it("drops a result for a key that has since been replaced", async () => {
		const { fetch, requests } = pendingFetch();
		const store = new BalanceStore(() => {}, fetch);
		const oldKey = store.setApiKey("sk-old");
		const newKey = store.setApiKey("sk-new");
		assert.deepEqual(
			requests.map((r) => r.apiKey),
			["sk-old", "sk-new"],
		);
		requests[1].resolve(ok("2.00"));
		requests[0].resolve({ kind: "invalid-key" });
		await Promise.all([oldKey, newKey]);
		assert.deepEqual(store.view, ok("2.00"));
	});

	it("does nothing when the same key is set again", async () => {
		const { fetch, requests } = pendingFetch();
		const store = new BalanceStore(() => {}, fetch);
		const done = store.setApiKey("sk-a");
		requests[0].resolve(ok("1.00"));
		await done;
		await store.setApiKey("sk-a");
		assert.equal(requests.length, 1);
		assert.deepEqual(store.view, ok("1.00"));
	});

	it("refreshes only when the balance is older than the refresh interval, including after failures", async () => {
		let now = 1_000_000;
		let calls = 0;
		const store = new BalanceStore(
			() => {},
			async () => (calls++, { kind: "timeout" }),
			() => now,
		);
		await store.setApiKey("sk-a");
		assert.equal(calls, 1);
		now += REFRESH_MS - 1;
		await store.refreshIfStale();
		assert.equal(calls, 1);
		now += 1;
		await store.refreshIfStale();
		assert.equal(calls, 2);
		assert.deepEqual(store.view, { kind: "timeout" });
	});
});
