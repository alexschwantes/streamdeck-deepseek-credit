import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bothImage, creditImage, peakImage, toDataUri } from "../src/render.ts";

const now = new Date("2026-09-15T01:45:30Z");
const peak = { peak: true, nextChange: new Date("2026-09-15T04:00:00Z") };
const offPeak = { peak: false, nextChange: new Date("2026-09-15T06:00:00Z") };

/** The text content of an SVG, in document order. */
function texts(svg: string): string[] {
	return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
}

describe("creditImage", () => {
	it("shows currency, amount and the peak state", () => {
		const svg = creditImage({ kind: "ok", amount: "110.00", currency: "CNY", available: true }, peak);
		assert.deepEqual(texts(svg), ["CNY", "¥110.00", "PEAK"]);
		assert.match(svg, /^<svg [^>]*width="144" height="144"/);
	});

	it("still shows the amount when the balance is not sufficient, flagged", () => {
		const svg = creditImage({ kind: "ok", amount: "0.00", currency: "USD", available: false }, offPeak);
		assert.deepEqual(texts(svg), ["USD", "$0.00", "INSUFFICIENT", "OFF-PEAK"]);
	});

	it("shows a distinct message for each state without a balance", () => {
		const cases = [
			[{ kind: "loading" }, ["Loading", "…"]],
			[{ kind: "no-key" }, ["Set", "API key"]],
			[{ kind: "invalid-key" }, ["Invalid", "API key"]],
			[{ kind: "http-error", status: 429 }, ["HTTP", "error 429"]],
			[{ kind: "timeout" }, ["Timed", "out"]],
			[{ kind: "network" }, ["Network", "error"]],
			[{ kind: "bad-response" }, ["Unexpected", "response"]],
		] as const;
		for (const [view, message] of cases) {
			assert.deepEqual(texts(creditImage(view, offPeak)), [...message, "OFF-PEAK"]);
		}
	});

	it("falls back to the bare amount when the API sends a currency Intl cannot format", () => {
		const svg = creditImage({ kind: "ok", amount: "1.00", currency: "NOT-A-CODE", available: true }, offPeak);
		assert.deepEqual(texts(svg), ["NOT-A-CODE", "1.00", "OFF-PEAK"]);
	});

	it("escapes text from the API", () => {
		const svg = creditImage({ kind: "ok", amount: "1.00", currency: `<b>&"`, available: true }, peak);
		assert.ok(svg.includes(">&lt;b&gt;&amp;&quot;</text>"));
	});
});

describe("bothImage", () => {
	it("shows the amount, the peak state and the countdown, without the currency code", () => {
		const svg = bothImage({ kind: "ok", amount: "0.58", currency: "USD", available: true }, peak, now);
		assert.deepEqual(texts(svg), ["$0.58", "PEAK", "2h 15m"]);
	});

	it("keeps the insufficient flag and the countdown together", () => {
		const svg = bothImage({ kind: "ok", amount: "0.00", currency: "USD", available: false }, offPeak, now);
		assert.deepEqual(texts(svg), ["$0.00", "INSUFFICIENT", "OFF-PEAK", "4h 15m"]);
	});

	it("shows the countdown even when there is no balance to show", () => {
		assert.deepEqual(texts(bothImage({ kind: "no-key" }, offPeak, now)), ["Set", "API key", "OFF-PEAK", "4h 15m"]);
	});
});

describe("peakImage", () => {
	it("shows the state and the countdown to the next change", () => {
		assert.deepEqual(texts(peakImage(peak, now)), ["PEAK", "2h 15m", "until off-peak"]);
		assert.deepEqual(texts(peakImage(offPeak, new Date("2026-09-15T05:59:00Z"))), ["OFF-PEAK", "1m", "until peak"]);
	});
});

describe("toDataUri", () => {
	it("encodes the SVG as the data URI Stream Deck requires", () => {
		const uri = toDataUri(creditImage({ kind: "ok", amount: "0.58", currency: "USD", available: true }, offPeak));
		const [prefix, base64] = uri.split(",");
		assert.equal(prefix, "data:image/svg+xml;base64");
		assert.match(Buffer.from(base64, "base64").toString("utf8"), /^<svg /);
	});
});
