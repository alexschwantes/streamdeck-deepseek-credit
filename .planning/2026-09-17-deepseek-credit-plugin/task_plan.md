# Task Plan: DeepSeek Credit — Stream Deck Plugin

## Goal
A small Windows Stream Deck plugin that shows, at a glance, how much DeepSeek API credit is left and
whether DeepSeek is currently charging peak or off-peak rates (and how long until that changes).

## Next Step
Owner: on Windows, run `npm install && npm run pack`, install `dist/com.example.deepseek-credit.streamDeckPlugin`,
and walk the manual checklist in `findings.md` with a real Stream Deck. Record results in `progress.md`.

## Current Phase
Phase 6

## Guiding Principles
- **Requirements first, code second.** This plan says *what* and *why*; implementation details are decided
  while building, against the official docs at that time.
- **Keep it small.** As little code and as few dependencies as the job needs. No feature that isn't in the
  requirements below.
- **Official conventions, not examples.** Follow Elgato's SDK/CLI documentation. Other community plugins are
  not templates for this one.
- **Trust primary sources.** DeepSeek's own docs define the balance API and the peak hours.

Functional requirements (FR-x) and non-functional requirements (NFR-x) live in `findings.md`.

---

## Phases

### Phase 1: Distill intent & requirements
- [x] Review the previous root-level planning files for intent (left untouched)
- [x] Write functional and non-functional requirements, scope boundaries and open questions to `findings.md`
- [x] Define outcome-based phases with acceptance criteria
- **Status:** complete

### Phase 2: Project foundation
- [x] Create the plugin from the official Stream Deck scaffold template (TypeScript) — copied from
      `elgatosf/streamdeck` `packages/cli/template` because `streamdeck create` fails on Linux
- [x] Remove the sample content; one action, Windows-only, English-only, placeholder UUID
- [x] Provide simple commands to build, test, validate and package
- [x] Build output and dependencies are not committed
- [ ] Plugin appears in Stream Deck on Windows — cannot be checked on Linux; deferred to Phase 6 checklist
- **Acceptance:** a fresh checkout builds, validates and packages with documented commands; the empty plugin
  appears in Stream Deck on Windows. (NFR-1, NFR-2, NFR-5)
- **Status:** complete (Windows load check deferred to Phase 6)

### Phase 3: Peak / off-peak logic
- [x] Determine peak vs off-peak for any moment, from DeepSeek's published schedule (FR-4)
- [x] Determine the next change of state, including across weekends and year-end (FR-5)
- [x] Format the time remaining in a compact, human-readable form (FR-5)
- [x] Keep the schedule in one clearly documented place so it's easy to update (NFR-4)
- [x] Automated tests cover window edges, weekends, and the result not depending on the PC's time zone
- **Acceptance:** tests pass and cover the boundary cases in `findings.md`. (FR-4, FR-5, NFR-3)
- **Status:** complete

### Phase 4: Credit balance retrieval
- [x] Fetch the balance from DeepSeek's official balance endpoint using the user's API key (FR-1)
- [x] Distinguish success, invalid key, other HTTP errors, timeout, network failure and malformed responses (FR-7)
- [x] Never show a made-up number (e.g. 0.00) when the response is missing or malformed (FR-7)
- [x] Automated tests with a simulated API; no real network calls
- **Acceptance:** tests pass for each outcome above. (FR-1, FR-7, NFR-3)
- **Status:** complete

### Phase 5: The key on the deck
- [x] User enters the API key once in the action's settings panel; it applies to every key and takes effect
      immediately (FR-6)
- [x] Each key can show credit or peak status; the credit view also carries a peak/off-peak indicator (FR-2, FR-3)
- [x] Peak state and countdown stay accurate to the minute without extra API calls (FR-5, NFR-6)
- [x] Balance refreshes on a fixed, modest interval, on start-up, when the key changes, and on key press;
      multiple keys share one request (FR-8, NFR-6)
- [x] Clear on-key messages for "no API key", errors, and "balance not sufficient" (FR-6, FR-7)
- [x] The API key never appears in logs (NFR-7)
- **Acceptance:** typecheck, tests and validation pass; behaviour confirmed on a real deck in Phase 6.
- **Status:** complete (hardware behaviour checked in Phase 6)

### Phase 6: Verify on hardware, package, document
- [ ] **(owner, needs Windows + Stream Deck)** Walk the manual checklist in `findings.md` on Windows with a real Stream Deck; record results in `progress.md`
- [x] Produce the installable plugin package (`npm run pack`; built on Linux, not committed)
- [x] README: what it does, how to get and enter an API key (and where it's stored), the peak schedule source,
      and the developer commands
- **Acceptance:** every checklist item observed; the package installs and works on a clean Stream Deck.
- **Status:** in_progress — everything except the hardware checklist is done

---

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Previous root planning files left as-is; this plan replaces them as the working plan | User request: they were too code-heavy and leaned on an example plugin |
| Plan captures requirements and outcomes, not file layouts or code | Keeps the plan stable while implementation details are chosen against current docs |
| Windows only, English only, placeholder UUID | Owner decisions carried over from the previous session |
| Peak schedule taken from DeepSeek's official pricing page, computed locally | Primary source; costs no API calls |
| One fixed refresh interval (~5 min), not a user setting | Owner decision; balance changes slowly |
| Countdown only, no clock time of the next change | Owner decision; avoids time-zone display entirely |
| API key stored in Stream Deck global settings | Elgato's guidance for secrets; entered once for all keys |
| Show the currency the API returns; no currency picker | The response already states it |
| Low balance ("not sufficient") still shows the number, with a visual flag | The user still wants to see the amount |
| Scaffold = files copied from `elgatosf/streamdeck` `packages/cli/template` (commit 55be043), rendered by hand as `streamdeck create` would | `streamdeck create` fails on Linux (user note); same output, no wizard |
| UUID `com.example.deepseek-credit`, action `com.example.deepseek-credit.status`, class `DeepSeekCredit` | Placeholder carried over from previous session |
| Logger level `info`, not the template's `trace` | Trace logs every message, including settings holding the API key (NFR-7) |
| No Property Inspector yet; the template's sample PI was removed | Added in Phase 5 when there is a setting to edit |
| Tests: bare `node --test`, TypeScript run directly; `engines.node >= 22.18` | No test dependency (NFR-5); type stripping is on by default from Node 22.18 |
| `validate` and `pack` scripts build first; `pack` writes to ignored `dist/` | Validate needs `bin/` to exist on a fresh checkout |
| Peak schedule as day list + minute windows in `src/peak.ts`; next change = first window edge (≤ 1 week ahead) that flips the state | Data-only edit when DeepSeek changes hours (NFR-4); handles half-hour boundaries and adjacent windows |
| Countdown rounds **up** to the minute; ≥ 1 day shows `Nd Hh`, else `Hh Mm`, else `Mm` | Never shows "0m" before the flip; value changes exactly on whole minutes |
| Balance result is a tagged union: `ok` / `invalid-key` (401) / `http-error` / `timeout` / `network` / `bad-response`; `fetchBalance` never throws | FR-7 distinct states; UI maps kind → text |
| Amount kept as the API's string, accepted only if it matches `-?digits(.digits)?`; `is_available` must be boolean | No fake 0.00 from `Number("")`; rejects `Infinity`, `1e3`, non-strings |
| Use the first `balance_infos` entry | Docs show one entry per account; see Open Questions |
| 10 s request timeout via `AbortSignal.timeout`, covering headers and body | Stalled body reported as timeout, not a hang |
| `BalanceStore` (no SDK import) owns API key, cached balance, in-flight dedupe and staleness; the action only wires events and draws | Refresh coordination is testable with `node --test` (decorators aren't erasable, so the action file can't run under type stripping) |
| Source uses erasable TypeScript only outside the action (no parameter properties, enums) | Node type stripping in tests |
| One per-minute `setTimeout` aligned to the whole minute redraws all visible keys from cache and refreshes if ≥ 5 min stale | Countdown/peak accurate to the minute with no network (FR-5, NFR-6) |
| `useExperimentalMessageIdentifiers = true` | `getGlobalSettings`/`getSettings` no longer echo as did-receive events; `getSettings` served from SDK cache |
| A result for a replaced API key is dropped; a changed key resets to "Loading" | Stale results never show against the new key |
| Key faces are 144×144 SVG strings via `setImage`; `UserTitleEnabled: false` | Colour and layout `setTitle` can't do; a user title would overlap |
| Credit face: currency, amount (red + "INSUFFICIENT" when `is_available` false), PEAK/OFF-PEAK bar. Peak face: state, countdown, "until …" | FR-2, FR-3, FR-7 |
| Property Inspector: `sdpi-select` "show" (per key) + `sdpi-password setting="apiKey" global` | Elgato's guide: user API keys in global settings; no PI ↔ plugin code needed |
| Countdown drawn at 27 px instead of 32 px when longer than 6 characters (e.g. `23h 59m`) | Preview render showed 7 characters crowd a 144 px key |
| Log only the balance outcome kind (and HTTP status) | NFR-7; DeepSeek's 401 body echoes part of the key |
| Tests import `../src/x.ts`; tsconfig `rewriteRelativeImportExtensions` + tests in `include` | Node type stripping needs `.ts` specifiers; `allowImportingTsExtensions` breaks the rollup build (TS5096) |

## Open Questions
| Question | Default until decided |
|----------|-----------------------|
| Final plugin UUID? (cannot change once published) | Placeholder for local use; decide before any Marketplace release |
| Custom icons or scaffold placeholders? | Placeholders for v1 |
| Are both a credit key and a dedicated peak key needed, or is the indicator on the credit key enough? | Offer both; drop one if unused |
| Keep manifest `Nodejs.Debug: "enabled"` (template default) in the packaged plugin? | Kept for development; revisit in Phase 6 |
| Manifest `Author` | `highland-hamish` (git user name) |
| If an account ever returns several `balance_infos` (CNY and USD), which to show? | First entry |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| TS5096 from rollup: `allowImportingTsExtensions` needs `noEmit` | 1 | Used `rewriteRelativeImportExtensions` instead |
