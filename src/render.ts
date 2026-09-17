import type { CreditView } from "./balance-store.ts";
import { formatCountdown, type PeakStatus } from "./peak.ts";

// Key faces are 144×144 SVG strings. Stream Deck only accepts them as a data URI, so the action encodes them
// with toDataUri() before calling KeyAction.setImage().

const FONT = "Segoe UI, Arial, sans-serif";
const PEAK_COLOUR = "#E5484D";
const OFF_PEAK_COLOUR = "#30A46C";
const BACKGROUND = "#17191C";
const MUTED = "#9BA1A6";
const WARNING = "#FFB224";

/** Wraps an SVG string as the base64 data URI that Stream Deck's `setImage` expects. */
export function toDataUri(svg: string): string {
	return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/** The credit key: currency, amount (flagged when insufficient) and a peak / off-peak pill. */
export function creditImage(view: CreditView, peak: PeakStatus): string {
	const accent = peak.peak ? PEAK_COLOUR : OFF_PEAK_COLOUR;
	let body: string;
	if (view.kind === "ok") {
		const colour = view.available ? "#FFFFFF" : PEAK_COLOUR;
		body =
			text(72, 32, 16, MUTED, view.currency, true) +
			rule(accent) +
			text(72, 86, amountSize(view.amount), colour, view.amount, true) +
			(view.available ? "" : text(72, 104, 13, PEAK_COLOUR, "INSUFFICIENT", true));
	} else {
		const [first, second] = creditMessage(view);
		const colour = view.kind === "loading" || view.kind === "no-key" ? "#FFFFFF" : WARNING;
		body = text(72, 58, 20, colour, first, true) + text(72, 84, 20, colour, second, true);
	}
	return svg(body + pill(112, accent, peak.peak ? "PEAK" : "OFF-PEAK"));
}

/** The peak key: current state, countdown to the next change, and what comes next. */
export function peakImage(peak: PeakStatus, now: Date): string {
	const colour = peak.peak ? PEAK_COLOUR : OFF_PEAK_COLOUR;
	const countdown = formatCountdown(peak.nextChange.getTime() - now.getTime());
	return svg(
		pill(12, colour, peak.peak ? "PEAK" : "OFF-PEAK") +
			text(72, 92, countdown.length <= 6 ? 34 : 27, "#FFFFFF", countdown, true) +
			text(72, 120, 14, MUTED, peak.peak ? "until off-peak" : "until peak"),
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
	return amount.length <= 5 ? 44 : amount.length <= 7 ? 36 : amount.length <= 9 ? 28 : 21;
}

/** A short accent rule under the top label. */
function rule(colour: string): string {
	return `<rect x="57" y="42" width="30" height="3" rx="1.5" fill="${colour}"/>`;
}

/** A filled, rounded label band 24px tall, with its text centred inside. */
function pill(y: number, colour: string, label: string): string {
	return (
		`<rect x="12" y="${y}" width="120" height="24" rx="12" fill="${colour}"/>` +
		text(72, y + 17, label.length > 6 ? 14 : 16, "#FFFFFF", label, true)
	);
}

function svg(content: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="${BACKGROUND}"/>${content}</svg>`;
}

function text(x: number, y: number, size: number, fill: string, value: string, bold = false): string {
	const weight = bold ? ` font-weight="bold"` : "";
	return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"${weight} fill="${fill}" text-anchor="middle">${escape(value)}</text>`;
}

function escape(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
