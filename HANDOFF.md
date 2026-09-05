# Handoff — T-Break Calculator 0.17.0

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

## Pause / resume point

The owner requested shipping the current improvements before their usage limit resets. This is the scoped 0.17.0 release, not a claim that every possible whole-product refinement is finished. Resume from current main; do not repeat the initial repository/research audit.

Verified locally: 540 domain/golden tests and 150 UI tests, TypeScript checks, production PWA build, runtime dependency audit (0 advisories), 390px visual review, native Pick a date → Continue, all three navigation destinations, active-break check-in/interruption, abstinence result, nested browser Back/focus restoration, Settings → Science return, and production startup/version/service-worker status without console errors.

Useful next pass after the reset: finish the broader manual smoke checklist below (especially 320/430px, landscape, physical iOS Safari, offline restart, and production reduction/end-tracking journeys). Automated coverage already exercises those domain flows, but these manual checks should not be described as completed. Consider further consolidating the large App coordinator and older spec sections; preserve the regression coverage and policy boundaries.

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
