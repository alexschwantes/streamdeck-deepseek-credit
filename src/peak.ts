/**
 * DeepSeek's peak / off-peak pricing schedule, in UTC.
 *
 * Source: https://api-docs.deepseek.com/quick_start/pricing/ (checked 2026-09-17):
 * "Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC,
 * Monday through Friday (all other hours are off-peak)."
 *
 * To update: edit the days and windows below. Times are minutes after midnight UTC, start inclusive,
 * end exclusive.
 *
 * Invariant: every window must end at or before 16:00 UTC. DeepSeek's Chinese docs state the same rule in
 * Beijing time (UTC+8), and the two agree on which weekday it is only below 16:00 UTC. A window past that
 * would make the Monday-to-Friday check wrong for the hours that fall on the next Beijing day. `peak.test.ts`
 * asserts this, so an edit that breaks it fails the tests rather than misreporting prices.
 */
const PEAK_DAYS: readonly number[] = [1, 2, 3, 4, 5]; // Date.getUTCDay(): 0 = Sunday … 6 = Saturday
const PEAK_WINDOWS: readonly { start: number; end: number }[] = [
	{ start: 1 * 60, end: 4 * 60 }, // 01:00–04:00
	{ start: 6 * 60, end: 10 * 60 }, // 06:00–10:00
];

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export type PeakStatus = {
	/** `true` while peak rates apply. */
	peak: boolean;
	/** When the state next flips between peak and off-peak. */
	nextChange: Date;
};

/**
 * Whether peak rates apply at the given moment.
 */
export function isPeak(at: Date): boolean {
	const minutes = at.getUTCHours() * 60 + at.getUTCMinutes();
	return PEAK_DAYS.includes(at.getUTCDay()) && PEAK_WINDOWS.some((w) => minutes >= w.start && minutes < w.end);
}

/**
 * The peak state at the given moment and when it next changes.
 */
export function peakStatus(now: Date): PeakStatus {
	const t = now.getTime();
	const peak = isPeak(now);
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

	// Every window edge from today through a week ahead, in time order; the first one that flips the state wins.
	const edges: number[] = [];
	for (let day = 0; day <= 7; day++) {
		for (const w of PEAK_WINDOWS) {
			edges.push(today + day * DAY + w.start * MINUTE, today + day * DAY + w.end * MINUTE);
		}
	}
	const next = edges.sort((a, b) => a - b).find((edge) => edge > t && isPeak(new Date(edge)) !== peak);
	if (next === undefined) {
		throw new Error("Peak schedule never changes state");
	}
	return { peak, nextChange: new Date(next) };
}

/**
 * Formats a duration compactly for a key: "45m", "2h 14m", "2d 15h". Rounds up to the whole minute, so the
 * display never shows "0m" before the change happens.
 */
export function formatCountdown(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / MINUTE));
	const days = Math.floor(total / (24 * 60));
	const hours = Math.floor(total / 60) % 24;
	const minutes = total % 60;
	if (days > 0) {
		return `${days}d ${hours}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}
