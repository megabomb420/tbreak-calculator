# Handoff — T-Break Calculator 0.21.0

Repository: https://github.com/megabomb420/tbreak-calculator · branch `main`
Live app: https://megabomb420.github.io/tbreak-calculator/

## Current product decisions

The three permanent destinations are Today, Calculator and History. Science is a separate reading screen accessible from the header and Settings. Calculator remains available during an active break, so changing goals or reading about tests never requires abandoning a plan. Recalculate starts at the goal with saved answers available; editing a specific answer still opens its specific step.

The break is presented as one journey. One shared vertical path (Start → evidence phases → Target) is rendered by the Calculator result (preview: every leg upcoming) and by the Today active-break card (live: Day X of Y, past legs carry per-day check-in markers, the current leg marks "You are here", and future legs stay expectations). Phases are the overlapping evidence windows from EvidenceGuidanceV1 — ranges and tendencies, never per-day symptom predictions. There is no separate plan-detail screen: the active-break Today card is the whole plan surface — hero head (phase eyebrow, Day X of Y, target date), the live journey with each leg's expectations behind its disclosure, the compact "what matters today" guidance, one full-width Check in action (Mark complete appears from the target date), and quiet footer actions (Edit support / Personalise your plan, End break early). The scheduled-break card owns Cancel plan, the completion card shows the post-break plan read-only, and everything else lives in History.

Date entry has one shared editor for intake and interruption. Native input/change events, reopening an answer, clearing a value, and switching between shortcuts and a picked date keep the visible selection and submitted value aligned. Invalid dates clear the answer and explain the problem. Start-date bounds use local calendar days, including across daylight-saving changes. The visible default of one session is accepted by Continue.

Saved calculation numbers are immutable. `saved-result.ts` advances only withdrawal/day guidance, rather than revalidating an old month's use against today's month. A live or scheduled break uses the profile from its owning calculation even after a detection query or another profile is saved. A plan reaches its target only after the full target duration has elapsed; the ring, message and completion action agree.

One shared dialog coordinator owns focus, background isolation, Escape and browser Back. Only the top dialog closes. References return to their parent; closed disclosures do not receive keyboard focus; destructive confirmations initially focus Cancel. Previous-break edits retain outcome linkage and Save & add another resets the form.

Today leads with the journey and check-in. Practical guidance and trigger plans are shown once in the main reading path. Optional support preferences affect companion copy only, including abstinence detail; they never alter scientific calculations.

## Evidence decisions

The original research PDF and synced source documents were reviewed before changes. The public explainer links the human PET and withdrawal studies. The UI calls calculator ranges planning rules and labels the secondary view Recovery outlook. It explicitly identifies estimates beyond four weeks as unvalidated for direct human tolerance outcomes; animal findings do not establish human timing. No new biological numbers, numeric detection estimates, or detox/reset percentages were introduced. Numeric policies and historical results are unchanged.

This is an educational planning product. There is no clinical diagnosis, medical endpoint, jurisdiction-specific legal advice or guarantee of a negative test. Formal clinical validation of the product estimates is not claimed.

## Release 0.18.0 — completed scope (2026-09-06)

- Cut-down plans and their use logs now appear in History. Individual mistaken sessions can be removed with confirmation, without rewriting saved calculations. Historical calculation screens no longer invent unsaved default limits.
- Reduction limits use one existing suggestion policy across result, Today and start sheet. Explicitly edited limits survive starting the plan. The minimum is consistently one use day; strategy checkboxes are accessible.
- Starting a break, abstinence tracker or cut-down plan returns to Today. An existing cut-down plan prevents starting a second hidden break/tracker. Abstinence check-in is prominent and Roadmap & triggers opens its detail screen.
- History details share browser Back/Escape handling and return focus to their list row while keeping main navigation available. Short-screen form sheets keep their actions visible and scroll their body.
- Rolling reduction windows count local calendar dates once. Negative UTC offsets no longer include an eighth or thirty-first day.

## Release 0.19.0 — completed scope

- Calculator and Today are redesigned around one shared visual concept: the break is a journey. A single vertical path component (`break-journey.tsx` over `presentBreakJourney`, a pure transform of the existing BreakOutlookView) renders Start → evidence phases → Target for every break length, not only 28 days.
- The Calculator tolerance result leads with the recommended number of days and shows the journey directly underneath; the range band, the per-day outlook strip and the redundant plan-essentials grid are removed from the result. Start/schedule actions, Why-this-plan drivers, history, answers and the CB1/detection references stay, as secondary disclosures. The abstinence result uses the same journey with an open end (no finish line).
- Today active break shows Day X of Y above the same journey: past legs carry per-day check-in markers, the current leg marks "You are here" with the check-in action and today's guidance, future legs show evidence-based expectations ("Expectation, not a guarantee."), and the target node carries Mark complete once reached. Beyond-target plans keep the extended note and the check-in below the target.
- No engine, policy, or evidence-content changes: phase copy is the existing EvidenceGuidanceV1 window content; no per-day symptom predictions were introduced.

Validation: targeted unit tests for the journey presenter (span coverage for 7/28-day and open-ended paths, preview forcing, past/current/future positioning, check-in day markers) plus the affected UI suites (results, recovery-result, today-phases, break-loop, app, product-regressions, personalisation, interaction-polish, copy-safety) — 105 targeted tests passed; typecheck and production build passed. The full suite was intentionally not run for this release. Manual browser check at 390px: questionnaire → result journey preview → start break → Today live journey with saved check-in marker and target node.

## Release 0.21.0 — completed scope (2026-09-06)

- **Choose my break length** is a new Calculator option for users who do not want the app to calculate their duration. It skips the tolerance questionnaire entirely: the user picks a whole-number break of 3–28 days with a simple −/＋ stepper, confirms a lightweight "Your break / N days / Chosen duration" step, then starts through the normal break-start sheet. No calculation record is created and nothing is labelled recommended, calculated, optimal or a reset estimate. The chosen duration becomes the plan target; shorter targets clip the shared journey at the chosen day without rewriting evidence windows (a 5-day target ends the "days 2–6" leg at day 5; no later leg appears).
- **Data model:** break attempts carry explicit `targetSource: 'calculated' | 'chosen'` metadata (absent on legacy rows = calculated). A chosen-duration attempt stores `calculationRecordId: null` and anchors its day counter to the chosen plan start — immediate "Now", or the picked start date for a scheduled plan. Existing stored plans are untouched and load unchanged.
- **Today:** a chosen-duration break is a normal active break — Day X of Y, journey, guidance, full-width Check in, target-reached state, and the same persistence/check-in/completion/end-early/history behaviour as calculated plans. Reaching the chosen target is a milestone, never an automatic end: check-ins and the journey stay live indefinitely past it, and the reached/beyond notes use chosen-worded copy that never implies a tolerance reset. The Today router now surfaces a scheduled (planned) chosen break on its Today card even when no saved profile exists, so Cancel plan stays reachable before activation. The 0.20.0 visual continuity (orbit hero + dedicated Check in action) applies to chosen breaks automatically because they share the active-break surface.
- **Research context:** the active-break Today card carries one quiet "Worth knowing" line selected from a small curated dataset keyed to the current abstinence day (onset → days 2–6 peak → first two weeks → sleep persisting → CB1 reversal around weeks 3–4 → the four-week research anchor past day 28). Each entry is factual, neutral, non-coaching and links (new tab) to the same PubMed references the Science screen already uses — Budney et al. withdrawal time course, D'Souza et al. CB1 changes, Hirvonen et al. human PET. No new science-content system, no runtime fetching, no claims beyond the existing evidence base.
- Version metadata and README/HANDOFF are bumped to 0.21.0. No engine, policy, evidence, detection, recovery-outlook or calculator-recommendation logic changed.

Validation: typecheck and the production build passed. New tests: `chosen-break` UI suite (5: arbitrary 10-day flow incl. persistence and not-labelled-recommended, 3/28 bounds + whole days, scheduled chosen start anchored to the start date, chosen target reached/extended continues past target with check-ins and updating research context, calculated-vs-chosen coexistence), chosen-duration record round-trips (legacy/absent source stays calculated, unknown source rejected), and short-target journey clipping (3- and 5-day targets). The full UI suite (151 tests, 18 files) and the full unit/golden suite (555 tests) pass, plus typecheck and the production build. A headless-browser pass at 390px exercised the full chosen flow (option → picker → "Chosen duration" confirm → break-start sheet → active Today) and confirmed the Today orbit/Check-in polish, the "Worth knowing" research line with its PubMed source link, journey legs clipped at the 10-day target (no later legs), and no horizontal overflow; rendering was verified from the DOM and computed styles because this environment cannot eyeball screenshots.

## Release 0.20.0 — completed scope (2026-09-06)

- The active-break Today card is aligned with the result panel: one card surface with a hero head (phase eyebrow, Day X of Y, target date), the shared live journey, the compact "what matters today" guidance, then a deliberate full-width Check in action zone and quiet footer links. Check in is no longer embedded in the journey's current leg.
- Plan Detail is removed entirely. End break early (active) and Cancel plan (scheduled) are quiet actions on their Today cards with the same confirmations; the post-break return mode stays as chosen at break start and is shown read-only on the completion card. Break-start copy no longer promises mid-plan changes. Plan-detail-only styles and the unused plan-ring component were deleted; domain logic and break behaviour are unchanged.
- The active-break Today hero now continues the result-lens visual identity: the live card reuses the ResultLensHero orbit artwork (subtle concentric rings in the upper right, painted strictly behind the hero head) on top of the shared 0.12.0 lens surface, so Today reads as the live continuation of Your plan → Recovery outlook → Start break → Today. Presentation only — no component reuse beyond the existing orbit primitive, no new surfaces, no height change.
- The active-Today Check in action gets a dedicated treatment in the same material language as the polished Your plan / Recovery outlook mode control (restrained accent surface, hairline inset highlight, controlled shadow, refined radius, hover/focus states) while remaining the card's one full-width, thumb-height primary action. Behaviour, test ids and the check-in flow are unchanged.
- Version and documentation drift from the 0.20.0 baseline is corrected: `package.json` and `APP_VERSION` are 0.20.0; README and HANDOFF are current; statements describing Plan Detail as a current surface are removed from HANDOFF and from the directly conflicting UX_SPEC passages. No broad documentation rewrite.

Validation: typecheck and the production build passed; 58 targeted UI tests (today-phases, break-loop, app, product-regressions, copy-safety) and 28 journey-presenter/outlook unit tests passed. A headless-browser pass at 390px compared Your plan / Recovery outlook / active-break Today: all three carry the same orbit artwork; on the live card the orbit is clipped inside the card and paints behind the hero head, Day X of Y stays the dominant display line, Check in is one full-width primary action in the mode-control material family (not the generic button, not a third tab), the card structure is unchanged, and the document/app/main panes show no horizontal overflow. This environment could not eyeball screenshots, so rendering was verified from the DOM, computed CSS and sampled pixels rather than by eye.

## Pause / resume point

The owner requested another scoped release before their usage limit runs out. Ship 0.18.0 and resume the broader whole-product review after reset. This release does not claim that the original whole-product review is finished. Resume current main; do not repeat the initial repository/research audit. The prior shipped baseline was 0.17.0 (`1695a40109e130842ec99db2df2b0cc4d4c6acdc`).

Final local validation: **542 domain/golden tests + 153 UI tests (695 total)**, TypeScript checks and production PWA build passed. Added regressions cover rolling calendar windows across offsets/month boundaries, preserving edited reduction limits, accessible strategy inputs, reduction history/session correction and frozen calculations, History focus restoration, and starting abstinence tracking from Calculator.

Manual browser checks in this pass: isolated fresh cut-down intake/result/start, edit limits, log use, end plan, reduction history and browser Back/focus return; 320px form layout and 844×390 landscape; abstinence intake/start, check-in save, stop confirmation and retained history. Prior 0.17 checks covered 390px, Pick a date → Continue, active-break interruption, nested dialogs and production startup. Runtime dependency audit at that baseline had zero advisories; this release changes no dependencies.

Remaining manual pass: 430px and desktop, physical iOS Safari, production offline restart, broader scheduled-break and zero-use journeys. Physical iOS has not been tested. Consider simplifying the large App coordinator only where it improves a concrete flow. Review whether completed-break outcome duration should record actual elapsed time rather than the original target before changing that behavior; it has not been changed in this release. Keep scientific policies and historical results intact.

Release procedure: push the release commit to main, verify its Pages workflow, then confirm live Settings shows 0.21.0. The deploying commit and workflow are the release identifiers; no SHA is embedded here to avoid a self-referencing commit.

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
