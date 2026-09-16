/**
 * DeepSeek account balance. API: https://api-docs.deepseek.com/api/get-user-balance
 */
const BALANCE_URL = "https://api.deepseek.com/user/balance";

export type Balance =
	/** `available` is DeepSeek's `is_available`: whether the balance is sufficient for API calls. */
	| { kind: "ok"; amount: string; currency: string; available: boolean }
	| { kind: "invalid-key" }
	| { kind: "http-error"; status: number }
	| { kind: "timeout" }
	| { kind: "network" }
	| { kind: "bad-response" };

export type FetchBalanceOptions = {
	fetch?: typeof globalThis.fetch;
	timeoutMs?: number;
};

/**
 * Fetches the account balance. Never throws: every failure is a distinct {@link Balance} kind, and a missing or
 * malformed amount is `bad-response`, never a made-up number.
 */
export async function fetchBalance(
	apiKey: string,
	{ fetch = globalThis.fetch, timeoutMs = 10_000 }: FetchBalanceOptions = {},
): Promise<Balance> {
	let body: unknown;
	try {
		const res = await fetch(BALANCE_URL, {
			headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
			signal: AbortSignal.timeout(timeoutMs),
		});
		if (res.status === 401) {
			return { kind: "invalid-key" };
		}
		if (!res.ok) {
			return { kind: "http-error", status: res.status };
		}
		try {
			body = await res.json();
		} catch (err) {
			return isTimeout(err) ? { kind: "timeout" } : { kind: "bad-response" };
		}
	} catch (err) {
		return isTimeout(err) ? { kind: "timeout" } : { kind: "network" };
	}
	return parseBalance(body);
}

/**
 * Reads the first `balance_infos` entry. Amounts arrive as strings; only plain decimals are accepted, because
 * `Number()` would turn "", " " or null into 0.
 */
function parseBalance(body: unknown): Balance {
	const b = body as { is_available?: unknown; balance_infos?: unknown } | null;
	const info = Array.isArray(b?.balance_infos) ? (b.balance_infos[0] as Record<string, unknown> | undefined) : undefined;
	const amount = info?.total_balance;
	const currency = info?.currency;
	if (
		typeof b?.is_available !== "boolean" ||
		typeof amount !== "string" ||
		!/^-?\d+(\.\d+)?$/.test(amount) ||
		typeof currency !== "string" ||
		currency === ""
	) {
		return { kind: "bad-response" };
	}
	return { kind: "ok", amount, currency, available: b.is_available };
}

function isTimeout(err: unknown): boolean {
	return err instanceof Error && err.name === "TimeoutError";
}
