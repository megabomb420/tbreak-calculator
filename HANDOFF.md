# Handoff — T-Break Calculator 0.18.0

Repository: https://github.com/megabomb420/tbreak-calculator · branch `main`
Live app: https://megabomb420.github.io/tbreak-calculator/

## Current product decisions

The three permanent destinations are Today, Calculator and History. Science is a separate reading screen accessible from the header and Settings. Calculator remains available during an active break, so changing goals or reading about tests never requires abandoning a plan. Recalculate starts at the goal with saved answers available; editing a specific answer still opens its specific step.

Date entry has one shared editor for intake and interruption. Native input/change events, reopening an answer, clearing a value, and switching between shortcuts and a picked date keep the visible selection and submitted value aligned. Invalid dates clear the answer and explain the problem. Start-date bounds use local calendar days, including across daylight-saving changes. The visible default of one session is accepted by Continue.

Saved calculation numbers are immutable. `saved-result.ts` advances only withdrawal/day guidance, rather than revalidating an old month's use against today's month. A live or scheduled break uses the profile from its owning calculation even after a detection query or another profile is saved. A plan reaches its target only after the full target duration has elapsed; the ring, message and completion action agree.

One shared dialog coordinator owns focus, background isolation, Escape and browser Back. Only the top dialog closes. References return to their parent; closed disclosures do not receive keyboard focus; destructive confirmations initially focus Cancel. Previous-break edits retain outcome linkage and Save & add another resets the form.

Today leads with progress and check-in. Result and detail screens put the longer timeline behind a disclosure. Practical guidance and trigger plans are shown once in the main reading path. Optional support preferences affect companion copy only, including abstinence detail; they never alter scientific calculations.

## Evidence decisions

The original research PDF and synced source documents were reviewed before changes. The public explainer links the human PET and withdrawal studies. The UI calls calculator ranges planning rules and labels the secondary view Recovery outlook. It explicitly identifies estimates beyond four weeks as unvalidated for direct human tolerance outcomes; animal findings do not establish human timing. No new biological numbers, numeric detection estimates, or detox/reset percentages were introduced. Numeric policies and historical results are unchanged.

This is an educational planning product. There is no clinical diagnosis, medical endpoint, jurisdiction-specific legal advice or guarantee of a negative test. Formal clinical validation of the product estimates is not claimed.

## Release 0.18.0 — completed scope (2026-09-06)

- Cut-down plans and their use logs now appear in History. Individual mistaken sessions can be removed with confirmation, without rewriting saved calculations. Historical calculation screens no longer invent unsaved default limits.
- Reduction limits use one existing suggestion policy across result, Today and start sheet. Explicitly edited limits survive starting the plan. The minimum is consistently one use day; strategy checkboxes are accessible.
- Starting a break, abstinence tracker or cut-down plan returns to Today. An existing cut-down plan prevents starting a second hidden break/tracker. Abstinence check-in is prominent and Roadmap & triggers opens its detail screen.
- History details share browser Back/Escape handling and return focus to their list row while keeping main navigation available. Short-screen form sheets keep their actions visible and scroll their body.
- Rolling reduction windows count local calendar dates once. Negative UTC offsets no longer include an eighth or thirty-first day.

## Pause / resume point

The owner requested another scoped release before their usage limit runs out. Ship 0.18.0 and resume the broader whole-product review after reset. This release does not claim that the original whole-product review is finished. Resume current main; do not repeat the initial repository/research audit. The prior shipped baseline was 0.17.0 (`1695a40109e130842ec99db2df2b0cc4d4c6acdc`).

Final local validation: **542 domain/golden tests + 153 UI tests (695 total)**, TypeScript checks and production PWA build passed. Added regressions cover rolling calendar windows across offsets/month boundaries, preserving edited reduction limits, accessible strategy inputs, reduction history/session correction and frozen calculations, History focus restoration, and starting abstinence tracking from Calculator.

Manual browser checks in this pass: isolated fresh cut-down intake/result/start, edit limits, log use, end plan, reduction history and browser Back/focus return; 320px form layout and 844×390 landscape; abstinence intake/start, check-in save, stop confirmation and retained history. Prior 0.17 checks covered 390px, Pick a date → Continue, active-break interruption, nested dialogs and production startup. Runtime dependency audit at that baseline had zero advisories; this release changes no dependencies.

Remaining manual pass: 430px and desktop, physical iOS Safari, production offline restart, broader scheduled-break and zero-use journeys. Physical iOS has not been tested. Consider simplifying the large App coordinator only where it improves a concrete flow. Review whether completed-break outcome duration should record actual elapsed time rather than the original target before changing that behavior; it has not been changed in this release. Keep scientific policies and historical results intact.

Release procedure: push this commit to main, verify its Pages workflow, then confirm live Settings shows 0.18.0. The deploying commit and workflow are the release identifiers; no SHA is embedded here to avoid a self-referencing commit.

## Validation and release

Run `npm test`, `npm run typecheck`, and `npm run build` before pushing. CI repeats all checks before deploying. Regression coverage includes date clearing/native change/restoration, the session default, retained saved plans after 45 days, scheduled-plan ownership after detection, target-time boundaries, navigation, nested modal focus, invalid previous-break dates, persistence and the established break/reduction/history flows.

Manual release smoke checklist:

1. Fresh tolerance questionnaire: Pick a date → Continue → result → start now or schedule → reload.
2. Active break: check-in without use, symptoms, report use, confirm time, reopen plan, edit support, return from nested references with Back/Escape.
3. Calculator during a break: detection result names the selected sample; saving another result preserves the active plan.
4. Abstinence and reduction: valid start actions, log use, edit limits, end tracking; zero-use route remains reachable.
5. History: open frozen result, edit an answer, previous-break save/add/edit, completed-target boundary and outcome linkage tests.
6. Mobile 320/390/430 widths, landscape and desktop: footer actions and navigation remain reachable; selected dates and errors are visible; no horizontal page overflow.
7. Production: Settings version, service-worker update, reload/persistence, cached app operation, and successful Pages deployment.

Runtime dependency audit reported no published vulnerabilities during this release review. No accounts, telemetry, third-party scripts or remote fonts are added. Research links navigate to external sites; the app does not transmit questionnaire data.

## Maintenance

Read AGENTS.md, the current code and the relevant specs. `sources/` remains read-only. Keep domain policies pure and explicitly version any numeric changes. Preserve the existing storage/viewport contracts and historical record semantics. Use the shared date control and modal coordinator instead of introducing local variants. Earlier implementation notes remain available in Git history; this file describes the current product.
