import type { CreditView } from "./balance-store.ts";
import { formatCountdown, type PeakStatus } from "./peak.ts";

// Key faces are 144×144 SVG strings, passed straight to KeyAction.setImage().

const FONT = "Segoe UI, Arial, sans-serif";
const PEAK_COLOUR = "#E5484D";
const OFF_PEAK_COLOUR = "#30A46C";
const MUTED = "#9BA1A6";
const WARNING = "#FFB224";

/** The credit key: currency, amount (flagged when insufficient) and a peak / off-peak bar. */
export function creditImage(view: CreditView, peak: PeakStatus): string {
	let body: string;
	if (view.kind === "ok") {
		const colour = view.available ? "#FFFFFF" : PEAK_COLOUR;
		body =
			text(72, 34, 22, MUTED, view.currency) +
			text(72, 82, amountSize(view.amount), colour, view.amount, true) +
			(view.available ? "" : text(72, 106, 15, PEAK_COLOUR, "INSUFFICIENT", true));
	} else {
		const [first, second] = creditMessage(view);
		const colour = view.kind === "loading" || view.kind === "no-key" ? "#FFFFFF" : WARNING;
		body = text(72, 58, 20, colour, first, true) + text(72, 84, 20, colour, second, true);
	}
	const bar = peak.peak ? PEAK_COLOUR : OFF_PEAK_COLOUR;
	return svg(
		body +
			`<rect x="0" y="116" width="144" height="28" fill="${bar}"/>` +
			text(72, 136, 17, "#FFFFFF", peak.peak ? "PEAK" : "OFF-PEAK", true),
	);
}

/** The peak key: current state, countdown to the next change, and what comes next. */
export function peakImage(peak: PeakStatus, now: Date): string {
	const colour = peak.peak ? PEAK_COLOUR : OFF_PEAK_COLOUR;
	return svg(
		`<rect x="0" y="0" width="144" height="40" fill="${colour}"/>` +
			text(72, 29, 22, "#FFFFFF", peak.peak ? "PEAK" : "OFF-PEAK", true) +
			text(72, 90, 32, "#FFFFFF", formatCountdown(peak.nextChange.getTime() - now.getTime()), true) +
			text(72, 122, 17, MUTED, peak.peak ? "until off-peak" : "until peak"),
	);
}

/** Two short lines for every credit state other than a balance. */
export function creditMessage(view: Exclude<CreditView, { kind: "ok" }>): [string, string] {
	switch (view.kind) {
		case "loading":
			return ["Loading", "…"];
		case "no-key":
			return ["Set", "API key"];
		case "invalid-key":
			return ["Invalid", "API key"];
		case "http-error":
			return ["HTTP", `error ${view.status}`];
		case "timeout":
			return ["Timed", "out"];
		case "network":
			return ["Network", "error"];
		case "bad-response":
			return ["Unexpected", "response"];
	}
}

function amountSize(amount: string): number {
	return amount.length <= 5 ? 40 : amount.length <= 7 ? 32 : amount.length <= 9 ? 26 : 20;
}

function svg(content: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" fill="#000000"/>${content}</svg>`;
}

function text(x: number, y: number, size: number, fill: string, value: string, bold = false): string {
	const weight = bold ? ` font-weight="bold"` : "";
	return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"${weight} fill="${fill}" text-anchor="middle">${escape(value)}</text>`;
}

function escape(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
