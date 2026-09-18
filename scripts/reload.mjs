/**
 * Prepares the Stream Deck side of the dev loop, then reloads the plugin after a build.
 *
 * Three Stream Deck quirks shape this (all seen on Stream Deck 7.4.1, Windows). Each one fails *silently*, so
 * each is checked up front and reported rather than left to look like "my code did nothing":
 *
 * - Developer mode gates everything. `streamdeck restart` only opens the URL
 *   `streamdeck://plugins/restart/<uuid>`, which Stream Deck ignores unless developer mode is on — and the CLI
 *   still reports success, because opening the URL worked. Linked plugins are not loaded either.
 * - `streamdeck link` creates the junction immediately, but Stream Deck only scans for plugins at startup, so
 *   the app must be restarted once before a newly linked plugin runs.
 * - Even with developer mode on, restarting a plugin is more reliable by killing its node process; Stream Deck
 *   relaunches it within a few seconds.
 */
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import path from "node:path";

const UUID = "io.github.alexschwantes.deepseek-credit";
const SOURCE = path.resolve(`${UUID}.sdPlugin`);
const DEV_MODE_KEY = "HKCU\\Software\\Elgato Systems GmbH\\StreamDeck";

if (process.platform !== "win32" || !process.env.APPDATA) {
	throw new Error("reload.mjs expects Windows; the manifest declares no other platform.");
}

/** Reads Stream Deck's `developer_mode` flag. `reg query` exits non-zero when the key or value is missing. */
function developerModeEnabled() {
	try {
		const out = execFileSync("reg", ["query", DEV_MODE_KEY, "/v", "developer_mode"], { stdio: ["ignore", "pipe", "ignore"] });
		return /0x1\b/.test(out.toString());
	} catch {
		return false;
	}
}

function restartStreamDeck(why) {
	console.log(`\n${why}\nQuit Stream Deck from the system tray, reopen it, then run this again.`);
	process.exit(0);
}

if (!developerModeEnabled()) {
	execFileSync("npx", ["streamdeck", "dev"], { shell: true, stdio: "inherit" });
	restartStreamDeck("Developer mode was off, so Stream Deck was ignoring every reload. Now enabled (undo: npx streamdeck dev -d).");
}

const target = path.join(process.env.APPDATA, "Elgato", "StreamDeck", "Plugins", `${UUID}.sdPlugin`);

if (!existsSync(target)) {
	execFileSync("npx", ["streamdeck", "link", SOURCE], { shell: true, stdio: "inherit" });
	restartStreamDeck("Linked the repo into Stream Deck.");
}

// A copied install keeps running its own stale bin/plugin.js while builds land in the repo, so the reload would
// appear to work and change nothing. Refuse rather than reload the wrong code.
const linkedTo = lstatSync(target).isSymbolicLink() ? realpathSync(target) : undefined;
if (linkedTo !== SOURCE) {
	throw new Error(
		`${target}\nis a copied install, not a link to\n${SOURCE}\n\n` +
			`Uninstall it (npx streamdeck unlink ${UUID} --delete), then run this again to link the repo.`,
	);
}

// Matched on the plugin folder in the command line, so only this plugin's process is stopped.
const killed = execFileSync("powershell", [
	"-NoProfile",
	"-Command",
	`$p = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*${UUID}.sdPlugin*' }); $p | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; $p.Count`,
])
	.toString()
	.trim();

console.log(killed === "0" ? `${UUID} was not running; Stream Deck will start it.` : `Reloaded ${UUID}.`);
