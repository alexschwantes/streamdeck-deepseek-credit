/**
 * Regenerates the marketplace / README images in `docs/marketplace/`.
 *
 * The key faces are drawn by `src/render.ts` itself rather than redrawn here, so the promo art cannot drift
 * from what the plugin actually puts on a key: change a colour or a font size in render.ts, re-run this, and
 * the images follow. Node runs the TypeScript directly by stripping types, so there is nothing to build first.
 *
 * SVG is turned into PNG by screenshotting it in headless Chrome or Edge, which every Windows machine already
 * has. That avoids adding an SVG rasteriser (and its native binaries) as a dependency just to make artwork.
 *
 * The instants below are fixed rather than `new Date()`, so re-running produces identical files instead of a
 * fresh diff every time.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { bothImage, creditImage, peakImage } from "../src/render.ts";

const OUT_DIR = path.resolve("docs/marketplace");
const WIDTH = 1920;
const HEIGHT = 960;

// Matches the 2:1 format Elgato marketplace listings use; the same file works as a README banner.
const BACKGROUND = "#0E1013";
const ACCENT = "#30A46C"; // render.ts OFF_PEAK_COLOUR, so the captions match the pills
const MUTED = "#9BA1A6";

const BROWSERS = [
	process.env.PROMO_BROWSER,
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
	"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];

const OFF_PEAK = { peak: false, nextChange: new Date("2026-09-21T01:00:00Z") };
const PEAK = { peak: true, nextChange: new Date("2026-09-18T10:00:00Z") };
const BALANCE = { kind: "ok", amount: "42.75", currency: "USD", available: true };
const DURING_OFF_PEAK = new Date("2026-09-18T11:47:00Z");
const DURING_PEAK = new Date("2026-09-18T08:13:00Z");

/** Each image: the headline text, and the key faces to show under it at `keyPx` wide. */
const SCENES = [
	{
		slug: "hero",
		eyebrow: "DeepSeek Credit",
		title: "Your API balance, on a key",
		caption: "Live balance, peak / off-peak state and a countdown to the next change.",
		keyPx: 270,
		gapPx: 60,
		faces: [
			creditImage(BALANCE, OFF_PEAK),
			bothImage(BALANCE, OFF_PEAK, DURING_OFF_PEAK),
			peakImage(OFF_PEAK, DURING_OFF_PEAK),
		],
	},
	{
		slug: "peak",
		eyebrow: "Half price, half the day",
		title: "Know when off-peak starts",
		caption: "DeepSeek off-peak rates are <b>half</b> of peak. The key counts down to the switch.",
		keyPx: 310,
		gapPx: 90,
		faces: [peakImage(PEAK, DURING_PEAK), peakImage(OFF_PEAK, DURING_OFF_PEAK)],
	},
];

function findBrowser() {
	const found = BROWSERS.find((p) => p && existsSync(p));
	if (!found) {
		throw new Error(
			"No Chrome or Edge found to render the images.\n" +
				"Set PROMO_BROWSER to a Chromium browser's .exe and run this again.",
		);
	}
	return found;
}

/** Segoe UI is used because it is what render.ts asks for, so headline and key faces share one typeface. */
function page({ eyebrow, title, caption, faces, keyPx, gapPx }) {
	return `<!doctype html><meta charset="utf-8">
<style>
	* { margin:0; padding:0; box-sizing:border-box; }
	html, body { width:${WIDTH}px; height:${HEIGHT}px; background:${BACKGROUND}; overflow:hidden; }
	body {
		font-family:"Segoe UI", system-ui, sans-serif;
		display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;
	}
	.eyebrow { color:${ACCENT}; font-size:26px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; }
	h1 { color:#fff; font-size:76px; font-weight:700; letter-spacing:-.015em; margin-top:22px; }
	.keys { display:flex; gap:${gapPx}px; margin-top:76px; align-items:center; }
	.keys svg { width:${keyPx}px; height:${keyPx}px; display:block; filter:drop-shadow(0 24px 60px rgba(0,0,0,.55)); }
	.cap { color:${MUTED}; font-size:30px; margin-top:76px; }
	.cap b { color:#C9CED2; font-weight:600; }
</style>
<div class="eyebrow">${eyebrow}</div>
<h1>${title}</h1>
<div class="keys">${faces.join("")}</div>
<div class="cap">${caption}</div>
`;
}

const browser = findBrowser();
mkdirSync(OUT_DIR, { recursive: true });

for (const scene of SCENES) {
	const html = path.join(os.tmpdir(), `promo-${scene.slug}.html`);
	const png = path.join(OUT_DIR, `${scene.slug}.png`);
	writeFileSync(html, page(scene), "utf8");
	execFileSync(
		browser,
		[
			"--headless=new",
			"--disable-gpu",
			"--hide-scrollbars",
			`--screenshot=${png}`,
			`--window-size=${WIDTH},${HEIGHT}`,
			`file:///${html.replaceAll("\\", "/")}`,
		],
		{ stdio: ["ignore", "ignore", "pipe"] },
	);
	if (!existsSync(png)) {
		throw new Error(`${browser}\nran but wrote no image for "${scene.slug}". Try PROMO_BROWSER with another browser.`);
	}
	console.log(`${path.relative(process.cwd(), png)}  ${WIDTH}x${HEIGHT}`);
}
