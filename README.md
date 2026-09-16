# DeepSeek Credit — Stream Deck plugin

A Windows Stream Deck plugin that shows, at a glance, how much DeepSeek API credit you have left and whether
DeepSeek is charging **peak** or **off-peak** rates right now. Off-peak rates are half the peak rates, so the
key tells you both *how much* you can spend and whether now is a *cheap time* to spend it.

## What the keys show

Add the **DeepSeek Credit** action to a key, then choose what it shows in its settings:

- **Credit balance**: the currency and total balance DeepSeek reports, with a PEAK / OFF-PEAK bar underneath.
  If DeepSeek says the balance is not enough for API calls, the amount turns red and says INSUFFICIENT.
- **Peak / off-peak**: the current state and a countdown to the next change, for example `2h 14m` or `2d 15h`.

The balance refreshes every 5 minutes, when you change the API key, and when you press the key. Several keys
share one request. The peak state and countdown update every minute and never call the API.

If the balance can't be shown, the key says why: `Set API key`, `Invalid API key`, `HTTP error <status>`,
`Timed out`, `Network error` or `Unexpected response`. It never shows a made-up amount.

## Setting your API key

1. Create an API key at <https://platform.deepseek.com/api_keys>.
2. In the Stream Deck app, select a DeepSeek Credit key and paste the key into **API key**.

You only enter it once: it applies to every DeepSeek Credit key and takes effect straight away.

**Where it's stored:** in Stream Deck's plugin settings on this PC (the plugin's *global settings*), not in
Windows Credential Manager or another keychain. The plugin never writes the key to its log files.

## Peak hours

From DeepSeek's [pricing page](https://api-docs.deepseek.com/quick_start/pricing/) (checked 2026-09-17):
peak hours are **01:00–04:00 and 06:00–10:00 UTC, Monday to Friday**. All other times, including weekends,
are off-peak. The plugin works this out from the PC's clock, so your time zone doesn't matter.

DeepSeek has changed its pricing before. If the hours change, edit the schedule at the top of
[`src/peak.ts`](src/peak.ts) and rebuild.

## Installing

Build the package (see below), then double-click `dist/com.example.deepseek-credit.streamDeckPlugin` on the
Windows PC to install it into Stream Deck.

## Development

Requires Node.js 22.18 or later (the tests run TypeScript directly with `node --test`).

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies |
| `npm run build` | Build `src/` into `com.example.deepseek-credit.sdPlugin/bin/` |
| `npm run watch` | Rebuild on change and restart the plugin in Stream Deck |
| `npm run typecheck` | Type-check source and tests (the build does not fail on type errors) |
| `npm test` | Run the automated tests (no Stream Deck or network needed) |
| `npm run validate` | Build, then validate the plugin with the Stream Deck CLI |
| `npm run pack` | Build, then package to `dist/com.example.deepseek-credit.streamDeckPlugin` |

To run it from source in Stream Deck on Windows: `npm run build`, then
`npx streamdeck link com.example.deepseek-credit.sdPlugin`.

| File | Purpose |
|------|---------|
| `src/peak.ts` | Peak schedule, peak state, next change, countdown text |
| `src/balance.ts` | Calls DeepSeek's balance API and classifies the result |
| `src/balance-store.ts` | Shared API key, cached balance and refresh rules |
| `src/render.ts` | Key faces (SVG) |
| `src/actions/deepseek-credit.ts` | The Stream Deck action: events, per-minute redraw |
| `com.example.deepseek-credit.sdPlugin/` | Manifest, settings panel (`ui/`) and images |

`com.example.deepseek-credit` is a placeholder plugin UUID for local use. Pick a real one before any
Marketplace release, because it can't change afterwards.
