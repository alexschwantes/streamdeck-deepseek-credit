import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fetchBalance } from "../src/balance.ts";

type Call = { url: string; init: RequestInit | undefined };

/** A fake `fetch` that records its calls and answers with the given response or error. */
function fakeFetch(answer: Response | Error): { fetch: typeof globalThis.fetch; calls: Call[] } {
	const calls: Call[] = [];
	const fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
		calls.push({ url: String(url), init });
		if (answer instanceof Error) {
			throw answer;
		}
		return answer;
	};
	return { fetch, calls };
}

function json(body: unknown, status = 200): Response {
	return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

function withTotal(total: unknown, extra: Record<string, unknown> = {}): unknown {
	return {
		is_available: true,
		balance_infos: [{ currency: "CNY", total_balance: total, granted_balance: "0.00", topped_up_balance: "0.00" }],
		...extra,
	};
}

describe("fetchBalance", () => {
	it("requests the balance endpoint with the key as a Bearer token", async () => {
		const { fetch, calls } = fakeFetch(json(withTotal("110.00")));
		await fetchBalance("sk-test", { fetch });
		assert.equal(calls.length, 1);
		assert.equal(calls[0].url, "https://api.deepseek.com/user/balance");
		assert.equal(new Headers(calls[0].init?.headers).get("Authorization"), "Bearer sk-test");
		assert.ok(calls[0].init?.signal instanceof AbortSignal);
	});

	it("returns the amount and currency as reported", async () => {
		const { fetch } = fakeFetch(
			json({
				is_available: true,
				balance_infos: [{ currency: "USD", total_balance: "15.40", granted_balance: "0.00", topped_up_balance: "15.40" }],
			}),
		);
		assert.deepEqual(await fetchBalance("k", { fetch }), { kind: "ok", amount: "15.40", currency: "USD", available: true });
	});

	it("still returns the amount when the balance is not sufficient", async () => {
		const { fetch } = fakeFetch(json(withTotal("0.00", { is_available: false })));
		assert.deepEqual(await fetchBalance("k", { fetch }), { kind: "ok", amount: "0.00", currency: "CNY", available: false });
	});

	it("reports 401 as an invalid key", async () => {
		const { fetch } = fakeFetch(json({ error: { message: "Authentication Fails" } }, 401));
		assert.deepEqual(await fetchBalance("k", { fetch }), { kind: "invalid-key" });
	});

	it("reports other HTTP errors with their status", async () => {
		for (const status of [402, 429, 500, 503]) {
			const { fetch } = fakeFetch(json("", status));
			assert.deepEqual(await fetchBalance("k", { fetch }), { kind: "http-error", status });
		}
	});

	it("reports a rejected request as a network failure", async () => {
		const { fetch } = fakeFetch(new TypeError("fetch failed"));
		assert.deepEqual(await fetchBalance("k", { fetch }), { kind: "network" });
	});

	it("reports a request that outlives the timeout as a timeout", async () => {
		const fetch = (_url: string | URL | Request, init?: RequestInit): Promise<Response> =>
			new Promise((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
			});
		// AbortSignal.timeout uses an unref'd timer; keep the event loop alive until it fires.
		const keepAlive = setInterval(() => {}, 1000);
		try {
			assert.deepEqual(await fetchBalance("k", { fetch, timeoutMs: 10 }), { kind: "timeout" });
		} finally {
			clearInterval(keepAlive);
		}
	});

	it("never turns a missing or malformed amount into a number", async () => {
		for (const total of ["", " ", null, undefined, "abc", "Infinity", "1e3", "0x10", 12.5]) {
			const { fetch } = fakeFetch(json(withTotal(total)));
			assert.deepEqual(await fetchBalance("k", { fetch }), { kind: "bad-response" }, `total_balance ${JSON.stringify(total)}`);
		}
	});

	it("rejects unexpected response shapes", async () => {
		const bodies = [
			"not json",
			"null",
			{},
			{ is_available: true, balance_infos: [] },
			{ is_available: true, balance_infos: "CNY 10" },
			{ balance_infos: [{ currency: "CNY", total_balance: "1.00" }] },
			{ is_available: true, balance_infos: [{ total_balance: "1.00" }] },
		];
		for (const body of bodies) {
			const { fetch } = fakeFetch(json(body));
			assert.deepEqual(await fetchBalance("k", { fetch }), { kind: "bad-response" }, JSON.stringify(body));
		}
	});
});
