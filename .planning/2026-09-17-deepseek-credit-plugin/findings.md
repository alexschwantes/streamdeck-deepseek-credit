# Findings & Decisions

## Intent
A glanceable Stream Deck key for a DeepSeek API user on Windows: "How much credit do I have left, and is now
a cheap (off-peak) or expensive (peak) time to run jobs?" Off-peak rates are half of peak rates, so the peak
indicator helps decide *when* to spend, and the balance shows *how much* is left to spend.

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Show the account's remaining DeepSeek API credit (total balance) with its currency. |
| FR-2 | Show whether DeepSeek pricing is currently **peak** or **off-peak**. |
| FR-3 | Each key can be set to show either the credit balance or the peak status; the credit view also includes a small peak/off-peak indicator. |
| FR-4 | Peak/off-peak is computed locally from DeepSeek's published schedule, with no API call. |
| FR-5 | Show a countdown to the next peak/off-peak change (e.g. "2h 14m", "2d 15h"), accurate to the minute. |
| FR-6 | The user enters their DeepSeek API key once, in the plugin's settings panel. It applies to all keys and takes effect immediately. With no key set, the key says so ("Set API key"). |
| FR-7 | Failures are visible and distinct on the key: invalid key, other HTTP error (with status), timeout, network failure, unexpected response. A failure never displays as a fake balance. If DeepSeek reports the balance as insufficient, the amount is still shown, visually flagged. |
| FR-8 | The balance refreshes automatically on a fixed interval (about every 5 minutes), at start-up, when the API key changes, and immediately when the key is pressed. |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Runs on Windows 10+ with a current Stream Deck app. English only. |
| NFR-2 | Built with Elgato's official Stream Deck SDK, CLI and scaffold, in TypeScript. |
| NFR-3 | The peak logic and balance handling have automated tests that need no Stream Deck and no network. Peak results must not depend on the PC's time zone. |
| NFR-4 | The peak schedule lives in one clearly commented place, linking to DeepSeek's docs, so a schedule change is a trivial edit. |
| NFR-5 | Minimal: few files, no runtime dependencies beyond the SDK, build output not committed. |
| NFR-6 | Light on the API: several keys on the deck share one balance request; the countdown/indicator redraw without network calls. |
| NFR-7 | The API key is never written to logs. The README states plainly that it is kept in Stream Deck's settings, not an OS keychain. |

## Out of Scope (v1)
Low-credit thresholds/colours · currency picker · usage history, charts or spend-rate estimates ·
dial/encoder support · multiple accounts · localisation · showing the clock time of the next change ·
configurable refresh interval · Marketplace publication.

---

## Domain Facts (primary sources — re-check before implementing)

### Balance endpoint
- `GET https://api.deepseek.com/user/balance`, authenticated with the API key as a Bearer token.
- Response contains `is_available` (whether balance is sufficient for API calls) and a `balance_infos` **array**;
  each entry has `currency` (`CNY` or `USD`) and balance amounts as **strings**. `total_balance` is the figure to show.
- Undocumented: rate limits, error body shapes, and what an unfunded account returns. Treat anything
  unexpected as an error state rather than guessing.
- Source: https://api-docs.deepseek.com/api/get-user-balance

### Peak / off-peak schedule
- DeepSeek pricing page: *"Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and
  06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak)."*
- So: peak = Mon–Fri 01:00–04:00 and 06:00–10:00 **UTC**; all other times, including weekends, are off-peak.
  The Chinese page states the same rule in Beijing time (09:00–12:00, 14:00–18:00).
- Pricing has changed twice recently (2026-08-16 and 2026-09-10 per DeepSeek news), so the schedule may
  change again; past schedules have used half-hour boundaries.
- Source: https://api-docs.deepseek.com/quick_start/pricing/

### Peak boundary cases (for tests; start inclusive, end exclusive, all UTC)
| Moment | State | Next change |
|---|---|---|
| Tue 00:30 | off-peak | Tue 01:00 |
| Tue 01:00 | peak | Tue 04:00 |
| Tue 03:59:59.999 | peak | Tue 04:00 |
| Tue 04:00 | off-peak | Tue 06:00 |
| Tue 10:00 | off-peak | Wed 01:00 |
| Fri 10:00 | off-peak | Mon 01:00 (≈ "2d 15h") |
| Sat / Sun any time | off-peak | Mon 01:00 |
| 2026-12-31 23:30 (Thu) | off-peak | 2027-01-01 01:00 |

---

## Manual Checklist (Phase 6, real Stream Deck on Windows)
- [ ] Plugin loads with no errors in its log
- [ ] API key entered in settings survives a Stream Deck restart
- [ ] No API key → "Set API key"; invalid key → a clear invalid-key message
- [ ] Network unplugged → an error/timeout message, not a frozen number
- [ ] Several keys on the deck → one balance request per refresh interval
- [ ] Pressing a key refreshes immediately
- [ ] Peak state and countdown match the real clock, including flipping at a boundary
- [ ] The API key appears nowhere in the plugin's log files
- [ ] Key text is legible and well-aligned on the hardware

---

## Notes Carried Over (hints, not requirements — verify against current docs)
The previous planning session prototyped outside this repo. These observations may save time:
- Elgato's scaffold enables trace-level logging, which can record settings (including the API key). Turn it off.
- The CLI's validate step needs a build first on a fresh checkout.
- The TypeScript build may succeed despite type errors; run a separate typecheck.
- Converting balance strings with a plain number conversion turns blank/null into 0 — validate explicitly.
- Stream Deck can accept an SVG image directly for a key face.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| See `task_plan.md` → Decisions Made | Single source for decisions |

## Issues Encountered
| Issue | Resolution |
|-------|------------|

## Resources
- DeepSeek balance API: https://api-docs.deepseek.com/api/get-user-balance
- DeepSeek pricing & peak hours: https://api-docs.deepseek.com/quick_start/pricing/
- Stream Deck SDK docs: https://docs.elgato.com/streamdeck/sdk/introduction/getting-started/
- Stream Deck settings guide (API keys in global settings): https://docs.elgato.com/streamdeck/sdk/guides/settings
- Stream Deck CLI: https://docs.elgato.com/streamdeck/cli/
- Previous (superseded, detailed) planning: root `task_plan.md`, `findings.md`, `progress.md`, `review-opus.md`
