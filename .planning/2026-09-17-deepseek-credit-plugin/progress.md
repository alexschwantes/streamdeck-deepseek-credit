# Progress Log

## Session: 2026-09-17 — Re-plan from previous session

### Current Status
- **Phase:** 1 complete; next is Phase 2 (Project foundation)
- **Started:** 2026-09-17

### Actions Taken
- Read the previous root-level planning files (`task_plan.md`, `findings.md`, `progress.md`, `review-opus.md`).
  They were left unchanged, as requested.
- Distilled them into intent, functional/non-functional requirements, scope, domain facts and open questions.
- Dropped code-level detail (file layouts, function signatures, line counts, build-tool tweaks) and any
  reliance on the example community plugins.
- Created this plan under `.planning/2026-09-17-deepseek-credit-plugin/` (set as the active plan).
- No code written.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|

### Errors
| Error | Resolution |
|-------|------------|

## Session: 2026-09-17 — Phase 2 (Project foundation)

### Actions Taken
- `streamdeck create` fails on Linux (user note), so fetched `packages/cli/template` from
  `github.com/elgatosf/streamdeck` (commit 55be043, CLI 1.9.0) and rendered it by hand the way `create.ts` does:
  `_.gitignore` → `.gitignore`, `.ejs` variables filled, `isPreBuild` block dropped (as `finalize()` does),
  `npm.cli` = `^1.9.0`, `npm.streamDeck` = `^2.0.0` (CLI defaults).
- Stripped the counter sample: one action `com.example.deepseek-credit.status` with placeholder title, no PI,
  Windows-only `OS`, logger `info`. Kept template images (renamed `counter` → `status`) and `.vscode/`.
- Added `typecheck`, `test`, `validate`, `pack` scripts; README lists the developer commands.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `npm install` (Linux, Node 22.23.2) | installs | 115 packages, 0 vulnerabilities | Pass |
| `npm run typecheck` | no errors | no output | Pass |
| `npm test` (no test files yet) | exit 0 | 0 tests, exit 0 | Pass |
| `npm run validate` | builds and validates | "Validation successful" | Pass |
| `npm run pack` | package in `dist/` | `dist/com.example.deepseek-credit.streamDeckPlugin`, 11 files | Pass |
| Loads in Stream Deck on Windows | appears | not possible on Linux | Deferred to Phase 6 |
- Fresh clone of the Phase 2 commit: `npm ci` + `npm run validate` + `npm run pack` pass.

## Session: 2026-09-17 — Phase 3 (Peak / off-peak logic)

### Actions Taken
- Re-checked DeepSeek pricing page: schedule unchanged (01:00–04:00 and 06:00–10:00 UTC, Mon–Fri).
- `src/peak.ts`: schedule constants (documented, with source link), `isPeak`, `peakStatus`, `formatCountdown`.
- `test/peak.test.ts`: all findings.md boundary cases plus extras (last ms before a window, Monday midnight,
  Saturday inside a weekday window, New Year's Day Friday, leap day); same cases under 4 other `TZ` values;
  minute-by-minute check of `nextChange` across a week (and at :30 s) against an independent backward walk.
- Tests are now type-checked (`tsconfig` includes `test/`).

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `npm test` | all pass | 6 tests (2 suites), 0 fail | Pass |
| Mutation: `getUTCDay` → `getDay`, run with `TZ=UTC` | time-zone test fails | "does not depend on the PC's time zone" failed | Pass (test is effective) |
| `npm run typecheck` | no errors, includes tests | no errors; `test/peak.test.ts` listed | Pass |
| `npm run validate` | pass, no rollup warnings | pass (after TS5096 fix) | Pass |

### Errors
| Error | Resolution |
|-------|------------|
| rollup TS5096 with `allowImportingTsExtensions` | `rewriteRelativeImportExtensions` |

## Session: 2026-09-17 — Phase 4 (Credit balance retrieval)

### Actions Taken
- Re-checked the balance API and error-code docs (unchanged; findings.md updated).
- `src/balance.ts`: `fetchBalance(apiKey, { fetch, timeoutMs })` → tagged `Balance` result; strict parsing.
- `test/balance.test.ts`: request shape, ok (USD, CNY), insufficient balance, 401, 402/429/500/503, network,
  timeout, malformed amounts, unexpected shapes. All with a fake `fetch`, no network.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `npm test` | all pass | 15 tests, 0 fail, 0 cancelled | Pass |
| `npm run typecheck` | no errors | no errors | Pass |
| Real `fetch` vs local server: no response / stalled body / ok / refused (manual script) | timeout / timeout / ok / network | as expected | Pass |
| Live `GET /user/balance` with a bogus key | 401 → `invalid-key` | 401 → `invalid-key` | Pass |

## Session: 2026-09-17 — Phase 5 (The key on the deck)

### Actions Taken
- Checked SDK 2.1.2 typings/source: `settings.getGlobalSettings`, `onDidReceiveGlobalSettings(ev.settings)`,
  `useExperimentalMessageIdentifiers` (needs 7.1; `getSettings` then served from cache), `SingletonAction.actions`
  (`Enumerable` with `map`/`length`), `KeyAction.setImage` accepts SVG strings. Elgato settings guide: user API keys
  belong in global settings. sdpi-components v4: `sdpi-password` extends `sdpi-textfield` (`global`, `placeholder`).
- Added `src/balance-store.ts`, `src/render.ts`; rewrote `src/actions/deepseek-credit.ts` and `src/plugin.ts`
  (top-level `await connect()` then `start()`); added `ui/deepseek-credit.html`; manifest gains
  `PropertyInspectorPath` and `UserTitleEnabled: false`.
- Tests: `test/balance-store.test.ts`, `test/render.test.ts`.
- Smoke test on Linux: a scratch fake Stream Deck host (WebSocket server using the `ws` dev dependency) launched
  the built `bin/plugin.js` with Stream Deck's command-line arguments. Not committed.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `npm test` | all pass | 27 tests, 0 fail, 0 cancelled | Pass |
| `npm run typecheck` | no errors | no errors | Pass |
| `npm run validate` | pass | "Validation successful" | Pass |
| Fake host: 3 keys appear, no API key in global settings | "Loading" then "Set API key"; peak key shows countdown | as expected | Pass |
| Fake host: PI sets bogus key | one request for all keys → "Invalid API key" on both credit keys | one `Balance: invalid-key` log line, both keys updated | Pass |
| Fake host: keyDown | immediate refresh | new request, keys redrawn | Pass |
| Fake host: PI switches a key to peak | that key redraws as peak | as expected | Pass |
| Fake host: PI clears key | "Set API key" | as expected | Pass |
| Fake host: 65 s run across a minute boundary | redraw on the whole minute, no request | redraw at the boundary, countdown 9h 23m → 9h 22m, no fetch log | Pass |
| Plugin log contains API key? | no | log has only `Balance: <kind>` lines | Pass |

### Errors
| Error | Resolution |
|-------|------------|
| Heredoc into `ui/` failed: directory didn't exist (template `ui/` not copied in Phase 2) | Created the directory |
| Store tests cancelled: a test awaited a fake request it never resolved | Don't await that refresh |
