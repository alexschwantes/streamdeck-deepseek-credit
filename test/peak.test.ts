import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatCountdown, isPeak, peakStatus } from "../src/peak.ts";

// 2026-09-15 is a Tuesday. Boundary cases from findings.md; all times UTC.
const cases: { at: string; peak: boolean; next: string }[] = [
	{ at: "2026-09-15T00:30:00Z", peak: false, next: "2026-09-15T01:00:00Z" },
	{ at: "2026-09-15T00:59:59.999Z", peak: false, next: "2026-09-15T01:00:00Z" },
	{ at: "2026-09-15T01:00:00Z", peak: true, next: "2026-09-15T04:00:00Z" },
	{ at: "2026-09-15T03:59:59.999Z", peak: true, next: "2026-09-15T04:00:00Z" },
	{ at: "2026-09-15T04:00:00Z", peak: false, next: "2026-09-15T06:00:00Z" },
	{ at: "2026-09-15T06:00:00Z", peak: true, next: "2026-09-15T10:00:00Z" },
	{ at: "2026-09-15T09:59:59.999Z", peak: true, next: "2026-09-15T10:00:00Z" },
	{ at: "2026-09-15T10:00:00Z", peak: false, next: "2026-09-16T01:00:00Z" },
	{ at: "2026-09-15T23:59:59.999Z", peak: false, next: "2026-09-16T01:00:00Z" },
	{ at: "2026-09-14T00:00:00Z", peak: false, next: "2026-09-14T01:00:00Z" }, // Monday midnight
	{ at: "2026-09-18T10:00:00Z", peak: false, next: "2026-09-21T01:00:00Z" }, // Friday after peak
	{ at: "2026-09-19T02:00:00Z", peak: false, next: "2026-09-21T01:00:00Z" }, // Saturday, inside a weekday window
	{ at: "2026-09-20T08:00:00Z", peak: false, next: "2026-09-21T01:00:00Z" }, // Sunday
	{ at: "2026-09-20T23:59:59.999Z", peak: false, next: "2026-09-21T01:00:00Z" },
	{ at: "2026-12-31T23:30:00Z", peak: false, next: "2027-01-01T01:00:00Z" }, // Thursday → Friday, year-end
	{ at: "2027-01-01T09:00:00Z", peak: true, next: "2027-01-01T10:00:00Z" }, // New Year's Day is a Friday
	{ at: "2028-02-29T02:00:00Z", peak: true, next: "2028-02-29T04:00:00Z" }, // leap day, Tuesday
];

function checkCases(): void {
	for (const c of cases) {
		const status = peakStatus(new Date(c.at));
		assert.equal(status.peak, c.peak, `peak at ${c.at}`);
		assert.equal(status.nextChange.toISOString(), new Date(c.next).toISOString(), `next change after ${c.at}`);
	}
}

describe("peakStatus", () => {
	it("matches the published schedule at window edges, weekends and year-end", () => {
		checkCases();
	});

	it("does not depend on the PC's time zone", () => {
		const original = process.env.TZ;
		try {
			for (const tz of ["Pacific/Kiritimati", "America/Los_Angeles", "Asia/Shanghai", "Australia/Lord_Howe"]) {
				process.env.TZ = tz;
				checkCases();
			}
		} finally {
			if (original === undefined) {
				delete process.env.TZ;
			} else {
				process.env.TZ = original;
			}
		}
	});

	it("reports the first change, checked minute by minute across a week", () => {
		// Walk two weeks backwards, remembering the most recent minute at which the state flipped.
		const start = Date.parse("2026-09-14T00:00:00Z");
		const week = 7 * 24 * 60;
		let nextFlip: number | undefined;
		for (let m = 2 * week; m >= 0; m--) {
			const t = start + m * 60_000;
			if (isPeak(new Date(t)) !== isPeak(new Date(t + 60_000))) {
				nextFlip = t + 60_000;
			}
			if (m < week) {
				assert.equal(peakStatus(new Date(t)).nextChange.getTime(), nextFlip, `next change after ${new Date(t).toISOString()}`);
				assert.equal(peakStatus(new Date(t + 30_000)).nextChange.getTime(), nextFlip);
			}
		}
	});

	// Guards the invariant documented in peak.ts: a window reaching past 16:00 UTC falls on the next Beijing
	// day, where DeepSeek's Monday-to-Friday rule no longer means the same thing in both time zones.
	it("has no peak minute at or after 16:00 UTC", () => {
		const start = Date.parse("2026-09-14T00:00:00Z"); // a Monday
		for (let m = 0; m < 7 * 24 * 60; m++) {
			const at = new Date(start + m * 60_000);
			if (isPeak(at)) {
				assert.ok(at.getUTCHours() < 16, `peak at ${at.toISOString()} is past 16:00 UTC`);
			}
		}
	});
});

describe("formatCountdown", () => {
	it("formats minutes, hours and days", () => {
		assert.equal(formatCountdown(45 * 60_000), "45m");
		assert.equal(formatCountdown(60 * 60_000), "1h 0m");
		assert.equal(formatCountdown((2 * 60 + 14) * 60_000), "2h 14m");
		assert.equal(formatCountdown((23 * 60 + 59) * 60_000), "23h 59m");
		assert.equal(formatCountdown(24 * 60 * 60_000), "1d 0h");
		assert.equal(formatCountdown(63 * 60 * 60_000), "2d 15h"); // Friday 10:00 → Monday 01:00
	});

	it("rounds up to the whole minute", () => {
		assert.equal(formatCountdown(1), "1m");
		assert.equal(formatCountdown(59_999), "1m");
		assert.equal(formatCountdown(60_001), "2m");
		assert.equal(formatCountdown(59 * 60_000 + 1), "1h 0m");
	});

	it("never goes negative", () => {
		assert.equal(formatCountdown(0), "0m");
		assert.equal(formatCountdown(-5000), "0m");
	});
});
