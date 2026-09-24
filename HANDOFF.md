# Handoff — T-Break Calculator 0.37.0

Repository: https://github.com/megabomb420/tbreak-calculator · branch `main`
Live app: https://megabomb420.github.io/tbreak-calculator/ · mirror: https://tbreak-calculator.pages.dev/ (Cloudflare Pages, `BASE_PATH=/`; the two origins do not share device data)

## Current product decisions

Today, Calculator and History remain the three destinations; Science is separate. The existing discreet ink/slate/sand visual system, local-first storage, shared date editor and dialog coordinator remain.

Today leads with the day and target, a check-in that explains its no-THC meaning, a visible stage headline and one useful action. No primary recovery-mode switch: the calculated break's own outlook is a lower disclosure that never removes the day's action. The default action now actually uses the existing day-specific practice sequence, instead of hiding it under stage detail and showing a generic topic step in its place.

**Help with** is a native select for today's suggestion and all eleven topics. It replaces the action in place, writes nothing and resets on the next break day. Stored recent ratings still select relevant topics; a saved personal replacement still leads on routine/craving/boredom topics. **More ideas & sources** retains every guide step not already shown, including the first generic step when a different action leads.

One-tap check-ins and persistent Undo remain. The receipt says **No THC reported** rather than implying a complete day has elapsed. Ratings and the urge-plan editor stay removed; their stored data is preserved. **Manage break → Update last use** restores a necessary correction path after THC use, without bringing back a session logger. Opening or cancelling changes nothing; confirmation reuses the existing atomic suspend/confirm transitions, preserves earlier segments and check-ins, and moves only the live anchor and target date. Cut-down session logging stays separate.

History is grouped into Check-ins, Recommendations, Breaks (attempts/tracking) and Cutting down, with manually entered past breaks above and unreadable records in their own section. Rows carry local dates; manually entered breaks label the save date. Complete elapsed days are not confused with day position. A deleted recommendation never reappears as a newly derived plan. Historical result links open the goal they name instead of silently restarting the old questionnaire.

Browser zoom is enabled: the previous fixed-scale lock is deliberately retired for accessibility. Viewport sizing checks width as well as height before trusting the outer screen box, so a tall desktop window cannot inflate the root column, hide the header or add document scroll. Safe-area and mobile-toolbar behaviour is otherwise unchanged.

Numeric versions remain `tolerance-v3`, `detection-copy-v1` and `tolerance-recovery-outlook-v2`; historical records keep their original values and outlook versions. Daily-support presentation is `daily-support-v4`, built only from the reviewed guides and practices. No new medical claims, recovery percentages, detection windows or dosing advice were introduced.

## Release 0.37.0 — a practical daily companion

- Rebalanced Today around a short daily visit: day/target, explained check-in, visible stage headline, one action. Research outlook, experiences and timeline are optional depth.
- Replaced the sideways topic row with an accessible **Help with** select that also carries today's suggestion; guide depth moved under **More ideas & sources** without losing any step.
- Added cancelable last-use correction through existing deterministic transitions (finite breaks and open-ended tracking), with regression coverage.
- Dated History rows, corrected first-day elapsed wording, stopped deleted recommendations being re-derived from orphaned snapshots, and pointed historical result links at the goal they name.
- Fixed corrupt-record deletion: the row's source store, not its display category, decides what is deleted. A valid same-ID row in another family survives, and a corrupt outcome/check-in row no longer reappears after reload.
- Fixed the Web Storage fallback swallowing refused saves before the durable failure channel, and kept synchronous form saves from claiming success: a refused save shows the storage banner and leaves the form and its input intact.
- Removed superseded guidance presenters, the unused concepts panel, the zoom blocker and obsolete source/DOM-shape tests; kept legacy-data consumers and live behavioural coverage.
- A saved result names its own local day in the detail header, and the result screen's plan/outlook control carries its one-line legend again (Today no longer owns a mode control, so the legend moved to the surface that still switches).
- The backup export test asserts the file records the app's own `APP_VERSION` rather than a fixture string, so release metadata cannot drift unnoticed.
- Aligned package, lockfile, About, README, UX/architecture/calculator/evidence specs at 0.37.0, and made Science describe the advice inputs the app actually has.

### Validation (0.37.0)

- `npm test`: **619 unit/domain/golden tests** and **192 UI tests** pass, 3 timezone-gated UI cases skipped.
- `npm run test:tz`: both `America/Los_Angeles` and `Europe/Berlin` passes complete the same suite with no failures.
- `npm run typecheck`: all three TS projects clean.
- `npm run build`: production build succeeds (384 KB JS / 111 KB gzip; 40 precached entries).
- Browser pass at 390×844 against the dev server: questionnaire → result → break start → Today; check-in, Undo and reload persistence; topic selection and reset to the daily suggestion; cancelable last-use correction with the restart copy; History dates; `Manage break`; no console errors. Document height now matches the viewport (844), so the header no longer scrolls off.
- Not covered: physical iOS/Safari and assistive-technology review; pinch-zoom was verified through the DOM contract (no `maximum-scale`/`user-scalable`, no gesture blocker) rather than a synthetic multi-touch gesture, which timed out in headless Chromium.

## Evidence decisions

Existing research and versioned deterministic policies remain authoritative. Population withdrawal patterns, tolerance planning, impairment and detectability stay separate. The recovery outlook remains an explicitly unvalidated product estimate, with lower-directness evidence beyond four weeks. No negative-test guarantee, detox protocol, biological completion state or medical endpoint is introduced.

Clinical review of health exclusions and location-appropriate urgent-help routing remains outstanding; this release does not invent them. Backup restore retains its documented non-atomic I/O-failure case. Reference material under `sources/` stays read-only.

## Release 0.31.0 → 0.36.0 — one topic at a time, nothing hiding, one banner
