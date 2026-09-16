import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { creditImage, peakImage } from "../src/render.ts";

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
		assert.deepEqual(texts(svg), ["CNY", "110.00", "PEAK"]);
		assert.match(svg, /^<svg [^>]*width="144" height="144"/);
	});

	it("still shows the amount when the balance is not sufficient, flagged", () => {
		const svg = creditImage({ kind: "ok", amount: "0.00", currency: "USD", available: false }, offPeak);
		assert.deepEqual(texts(svg), ["USD", "0.00", "INSUFFICIENT", "OFF-PEAK"]);
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

	it("escapes text from the API", () => {
		const svg = creditImage({ kind: "ok", amount: "1.00", currency: `<b>&"`, available: true }, peak);
		assert.ok(svg.includes(">&lt;b&gt;&amp;&quot;</text>"));
	});
});

describe("peakImage", () => {
	it("shows the state and the countdown to the next change", () => {
		assert.deepEqual(texts(peakImage(peak, now)), ["PEAK", "2h 15m", "until off-peak"]);
		assert.deepEqual(texts(peakImage(offPeak, new Date("2026-09-15T05:59:00Z"))), ["OFF-PEAK", "1m", "until peak"]);
	});
});
