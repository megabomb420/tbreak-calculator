# Handoff — T-Break Calculator 0.25.1

Repository: https://github.com/megabomb420/tbreak-calculator · branch `main`
Live app: https://megabomb420.github.io/tbreak-calculator/

## Current product decisions

The three permanent destinations are Today, Calculator and History. Science is a separate reading screen accessible from the header and Settings. Calculator remains available during an active break, so changing goals or reading about tests never requires abandoning a plan. Recalculate starts at the goal with saved answers available; editing a specific answer still opens its specific step.

Today is the practical daily companion. The active card shows the day/target hero, the one-tap check-in with Undo, optional symptom ratings, expandable phase context, two relevant advice topics, one practical activity and a manually controlled carousel of stage-matched Reddit experiences. THC-session logging exists only inside an active cut-down plan. The shared journey remains under **Your break timeline** with its existing phase windows and check-in markers. Calculator still shows the same journey as a preview. No per-day biological symptom predictions are introduced. Mark complete remains available only from the target instant. Quiet footer actions are **Choose advice topics** and **End break early**. Scheduled cancellation, completed-break return plans and History keep their existing roles.

Date entry has one shared editor for intake and interruption. Native input/change events, reopening an answer, clearing a value, and switching between shortcuts and a picked date keep the visible selection and submitted value aligned. Invalid dates clear the answer and explain the problem. Start-date bounds use local calendar days, including across daylight-saving changes. The visible default of one session is accepted by Continue.

Saved calculation numbers are immutable. `saved-result.ts` advances only withdrawal/day guidance, rather than revalidating an old month's use against today's month. A live or scheduled break uses the profile from its owning calculation even after a detection query or another profile is saved. A plan reaches its target only after the full target duration has elapsed; the ring, message and completion action agree.

One shared dialog coordinator owns focus, background isolation, Escape and browser Back. Only the top dialog closes. References return to their parent; closed disclosures do not receive keyboard focus; destructive confirmations initially focus Cancel. Previous-break edits retain outcome linkage and Save & add another resets the form.

Today leads with the check-in and practical advice. Fresh symptom ratings take priority; selected advice topics participate across days. A manual topic browser gives access to all eleven guides. Preferences and ratings select educational content only and never alter scientific calculations.

## Evidence decisions

The original research PDF and synced source documents were reviewed before changes. The public explainer links the human PET and withdrawal studies. The UI calls calculator ranges planning rules and labels the secondary view Recovery outlook. It explicitly identifies estimates beyond four weeks as unvalidated for direct human tolerance outcomes; animal findings do not establish human timing. No new biological numbers, numeric detection estimates, or detox/reset percentages were introduced. Numeric policies and historical results are unchanged.

This is an educational planning product. There is no clinical diagnosis, medical endpoint, jurisdiction-specific legal advice or guarantee of a negative test. Formal clinical validation of the product estimates is not claimed.

## Release 0.25.1 — consistency pass (closes the 0.25.0 round)

No screen, flow, engine number or stored contract changed. This release retires the adaptive-recalculation path that 0.25.0 had already disconnected, and brings documentation, tests and styles back in line with the shipped app.

- **Adaptive recalculation is retired in code as well as in behaviour.** The 0.25.0 round removed its only caller (the cut-down refresh sheet, the in-card tolerance comparison and `runAdaptiveRecalc`), which left `src/application/calculation/adaptive-recalc.ts`, `src/application/presentation/reduction-trajectory.ts`, the domain helpers behind them (`observedPattern`, `observedDiffersFromBaseline`, `rangeWithinEvidenceBounds` and their constants) and their unit suites orphaned and green. All are deleted. Logging a session in a cut-down plan never generates, refreshes or rewrites a calculation record; frozen records stay immutable.
- **Legacy compatibility is preserved deliberately.** `Q2R` remains a parseable step id so a saved draft from the pre-0.25.0 cut-down flow still loads; `resolvedPath` never contains it and `restoreStep` drops off-path steps, so the questionnaire can no longer route there. The retained rendering branch and its copy are now labelled legacy-only in the code instead of looking like dead weight.
- **Documentation matches the app.** ARCHITECTURE.md and CALCULATOR_SPEC.md no longer describe adaptive recalculation, the retired `breakRequested` questionnaire branching or Plan Detail as live behaviour; EVIDENCE_CONTENT_SPEC.md §15 inventories the shipped 17 community cards from 12 r/Petioles discussions with their `windows[]` stage tags; UX_SPEC.md's stale claims (questionnaire step count, tab count, the removed plan-day ring, landed prerequisite annotations, a duplicated section number) are corrected. All four spec version stamps are current.
- **One rule, one implementation.** The reported weekly use-day rate is a single `weeklyUseDayRate` helper shared by the starting-limit suggestion and the tracker's pattern line, replacing three copies that disagreed at zero use days. Copy: the cut-down result and Today use one label for the same action ("Plan a T-break instead"), the advice-basis line names the control it points at, and `suggestedReductionLimits` documents the shipped one-step-below policy instead of the old halving wording.
- **Hygiene.** Dead stylesheet rules orphaned across 0.22.0–0.25.0 (`today-guidance`, `two-choice`, `stepper-field`, `today-note`, `checkin-secondary-actions`) are removed; the shared advice surface carries the `daily-support` test id that matches its component; `DAILY_SUPPORT_VERSION` is `daily-support-v2`, reflecting the 0.25.0 card inventory change; five unused imports are gone.
- **New regressions.** The community carousel (stage filtering, one-card arrow steps, end behaviour, inert inactive slides, no autoplay), the two-breach-day review banner offering both **Adjust limits** and **Pause plan** and returning the plan to `active` after an edit, and recovery of a legacy `interrupted_time_needed` **tracking** record (the break-attempt variant was already covered).

Validation: the full suite passes — **553 unit/domain/golden tests and 167 UI tests (720 total)** — plus typecheck and the production build. The three new UI cases were mutation-checked on throwaway copies of the source (removing `inert`, wrapping the carousel instead of stopping, adding an auto-advance, disabling the window filter, and stranding a recommit in `review_recommended` each fail their case).

## Release 0.25.0 — discreet identity, stage-matched experiences and usable cut down

- Replaced the explicit botanical/green identity with the documented ink-navy, slate and warm-sand system. The cannabis leaf is removed; the installed icon remains the neutral pause mark. Subtle depth, press feedback, sheet entry and carousel motion remain, with reduced-motion support. The fixed-scale PWA gesture contract from 0.24.0 is retained.
- Cut down is now a short independent flow: recent use days, then typical sessions. It no longer asks whether the user also wants a T-break, last-use timing, pattern duration, products or routes. The result explains the tracker and opens one setup sheet; limits are not edited twice.
- Starting limits are a manageable first step below the reported weekly pattern rather than an automatic halving. The live card shows two glanceable meters — distinct use days in the rolling seven-day window and sessions today — with direct edit, pause and end controls. Crossing limits on two days offers both **Adjust limits** and **Pause plan**.
- **Log a session** exists only on an active cut-down plan. Time defaults to Now, the last/baseline product and route are prefilled, product detail is optional, and one save adds exactly one session. Logging does not create, refresh or rewrite a tolerance calculation.
- Standard T-break and open-ended abstinence Today cards no longer expose **Log THC use**. **Check in** still records the current no-use day immediately and **Undo** corrects an accidental tap. Legacy `interrupted_time_needed` records remain recoverable, so upgrading does not strand older data.
- The Reddit carousel now contains 17 reviewed paraphrased experience cards from 12 r/Petioles discussions. Cards are tagged to the current withdrawal window (opening days, days 2–6, week 2, weeks 3–4 and beyond day 28); current sleep/craving/appetite/etc. topics rank matching accounts first. Up to five relevant cards rotate without autoplay, and each remains labelled as an individual experience rather than a prediction.

Validation for 0.25.0: 566 unit/domain/golden tests and 163 UI tests pass, plus typecheck and the production build. New regression coverage fixes the cut-down route and setup contract, prevents session logging from generating tolerance records, verifies THC logging is absent from T-break/tracking, and checks that every displayed Reddit card belongs to the current stage.

## Release 0.24.0 — botanical visual identity and stable touch scale

- Warm forest/olive surfaces, cream typography, lime actions and an original local vector cannabis mark replace the cold navy presentation. Daily tips are grouped into soft cards. Welcome, advice-basis and saved check-in copy use everyday language; scientific content and help-seeking guidance remain intact.
- Requested mobile zoom lock: viewport scale limits, `pan-x pan-y` on scrolling surfaces, non-passive guards for multi-touch and Safari gesture events. One-finger scrolling, carousel swiping, sliders, editable text and desktop keyboard zoom are preserved. Text-entry controls use at least 16px to avoid focus zoom. System/browser accessibility overrides may still take precedence; physical iOS testing remains outstanding.
- No dependencies, schema or calculation changes. Existing PWA icons remain unchanged; the new mark is inside the app. The manifest and browser theme match the forest background.

Validation for 0.24.0: all 727 tests, typecheck and production build passed. Chromium mobile smoke verified check-in, actual pinch keeping scale 1, cancelable Safari gesture guards, unaffected single-touch events, carousel touch swipe and 320/390px layouts. The Today screenshot was visually reviewed.

## Release 0.23.0 — direct check-in and PWA interaction (2026-09-20)

- Today records a no-use check-in with one tap; no Yes/No or Save screen. The action explains its meaning before saving, shows a saved receipt afterward, and prevents duplicate taps in the current abstinence day. The same controls serve finite breaks and open-ended tracking.
- Persistent **Undo** removes only the latest no-use record in the current day/segment; earlier entries and other days survive. It works after reload and offline. **How are you feeling?** opens the optional ratings directly; **Log THC use** opens date confirmation directly.
- Opening/canceling a use form no longer suspends the plan. Suspend and confirm use execute together on the existing pure session state, and only the confirmed result is persisted. Existing legacy pending interruptions can be dismissed as mistaken reports without inventing a use event or changing the segment anchor.
- Reddit experiences are a native swipe/scroll-snap carousel with arrows, position controls and keyboard support. No automatic advance. Inactive slides are inert; resize preserves position. The same three reviewed sources and personal-experience labels remain.
- General phase information moves behind **What to expect**, keeping practical advice higher on Today. Restrained press feedback, check-mark animation and sheet/guide transitions reinforce actions without delaying them. Reduced-motion preferences are respected. Existing PWA shell/safe-area/offline contracts remain.

Validation: 564 unit/domain/golden tests and 163 UI tests pass; typecheck and production build pass. Production-bundle Chromium smoke covered one-tap save, reload, persistent undo, cancelable use entry, symptom advice, carousel arrows, keyboard navigation, an actual touch swipe, position retention after resize, 320/390/720px without horizontal overflow, reduced motion, and offline reload/undo. Today and carousel screenshots were visually inspected. No browser exceptions. Physical iOS Safari remains untested.

## Release 0.22.0 — practical daily support (2026-09-20)

- Replaced the old compact `TodayGuidance` UI with `DailySupport` across active calculated/chosen breaks, open-ended tracking and its detail view. Advice is visible ahead of the collapsed full timeline, with two actionable topics and a day-specific practical activity.
- Added `daily-support-v1`: eleven guides explaining the problem, three concrete steps, common pitfalls, proportionate help-seeking guidance and direct references. The 28-day activity sequence and subsequent maintenance rotation are editorial planning, not exact-day biological predictions. The existing overlapping evidence windows, numeric engines, plan targets and immutable historical results are untouched.
- Advice uses the latest non-null rating per field within 48 hours, bounded by the current segment anchor and the injected clock. Future, invalid, pre-segment and THC-use records are ignored. Sleep/appetite scales are correctly inverted for ordering; missing stays unknown; a later no-use-only entry does not erase rated symptoms. Equal-timestamp entries favour the later saved rating. The severity threshold (4 on the oriented scale), freshness limit and two-topic cap are product rules, not clinical thresholds.
- All selected preferences participate through daily rotation after current symptom needs. Comfortably rated topics are not surfaced as current problems. **Choose advice topics** explains the selection; **Help with something else** opens any guide without changing saved preferences. No questionnaire re-entry or recalculation is required.
- Check-in preserves the five existing scales/storage schema, adds clear descriptions and a past-24-hours/last-main-sleep frame, permits explicit zero and skipping a rating, and retains draft symptoms/notes when moving Back inside the flow. Private free-text notes remain unanalysed.
- Three curated Reddit experiences (quiet wind-down, paper sudoku, replacing the preparation ritual) are labelled **Personal experience**, paraphrased and linked to the reviewed r/Petioles discussions. They do not supply medical claims or efficacy evidence. No live Reddit fetching, AI service or data transmission is added; all advice works offline.
- Clinical/self-care sources are linked inside guides and in Science: NSW Health withdrawal guidance, NHS sleep/nausea/headaches, Lee et al. sustained-abstinence study, and UVM for practical habit ideas only. UVM's clearance/reset explanation and Reddit supplement/detox claims were not adopted.

Validation: the full unit/domain/golden suite (564 tests) and full UI suite (159 tests, 19 files) pass; typecheck and the production build pass. Headless Chromium exercised the production bundle through chosen-duration setup → active Today → sleep 0/craving 8 check-in → immediately relevant advice → reload → manual nausea guide → saved topic selection → reload. The cached app restored the saved check-in and advice after an offline reload. Screenshots of Today, check-in and the detailed guide were visually inspected; 320/390/720px viewports had no horizontal overflow and the flow produced no browser exceptions. Physical iOS Safari has not been tested.

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

## Release 0.21.2 — completed scope (2026-09-06)

- After today's check-in is recorded, the active-break Today card now reflects it immediately in the action zone: the primary action reads "Checked in today" with a check glyph (still tappable, so a later use can be reported or symptoms added the same day) and a quiet progress line beneath it shows days recorded so far ("N of Y days recorded"; plain "N days recorded" once past the target). The journey day marker already turned checked; this makes the completion state visible where the user just tapped. Presentation-only change on the shared active-break surface; the check-in flow, engine and lifecycle are untouched.

Validation: full UI suite (156 tests, incl. a new reflection test: marker `data-checkin`, "Checked in today" state and progress line after No + Save, and re-opening the flow from the checked action) and the full unit/golden suite (556 tests) pass, plus typecheck and the production build.

## Release 0.21.1 — completed scope (2026-09-06)

- Fix: a finished or ended chosen-duration break (which never creates a profile or calculation snapshot) now keeps Today in the returning state instead of collapsing back to the first-launch welcome. Today facts count any stored attempt/tracking/reduction record as data, so acknowledging a completed profile-less chosen break or ending one early lands on the no-profile surface with the attempt preserved in History.
- Regression coverage added: chosen-break UI (complete + acknowledge without a profile; end early without a profile) and a today-model unit case (stored attempts count as data). Full UI suite (153 tests) and full unit/golden suite pass, plus typecheck and the production build.
- Multi-viewport headless sweep (320/390/430/720/1024px) over the chosen-duration flow: no console or page errors and no horizontal overflow at any width; the orbit/Check-in polish and the "Worth knowing" line render on the active card everywhere. Version metadata 0.21.1.

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

## Resume point

Resume current main after 0.25.1. This release closes the 0.25.0 round — it retires the dead adaptive-recalculation code, reconciles the specs with the app and adds the regressions that were missing — and it does not claim the earlier whole-product review is complete. Physical iOS Safari has not been tested.

The next open product question is unchanged and still needs an owner decision before any code moves: whether a completed break's outcome should record actual elapsed time rather than the original target. It remains unchanged.

Two known 0.25.0 presentation behaviours are recorded here rather than changed in this release. The community carousel holds its position by index, so saving a check-in that re-orders the card list can change which account is on screen under the user; and its arrows move the track by scrolling, so their effect depends on a laid-out track width (in a zero-width or hidden track the counter and `inert` state would not follow the buttons, which stay enabled).

Release procedure: push to main, verify its Pages workflow and confirm live Settings shows 0.25.1. The deploying commit and workflow identify the release.

## Validation and release

Run `npm test`, `npm run typecheck`, and `npm run build` before pushing. CI repeats all checks before deploying. Regression coverage includes date clearing/native change/restoration, the session default, retained saved plans after 45 days, scheduled-plan ownership after detection, target-time boundaries, navigation, nested modal focus, invalid previous-break dates, persistence and the established break/reduction/history flows.

Manual release smoke checklist:

1. Fresh tolerance questionnaire: Pick a date → Continue → result → start now or schedule → reload.
2. Active break: one-tap check-in, Undo, symptoms, no THC-use log, reopen plan, edit support, stage-matched Reddit carousel, return from nested references with Back/Escape.
3. Calculator during a break: detection result names the selected sample; saving another result preserves the active plan.
4. Abstinence and reduction: abstinence has no THC-use log; cut down has direct session logging, edit/pause/end controls, rolling-day counting and the zero-use route remains reachable.
5. History: open frozen result, edit an answer, previous-break save/add/edit, completed-target boundary and outcome linkage tests.
6. Mobile 320/390/430 widths, landscape and desktop: footer actions and navigation remain reachable; selected dates and errors are visible; no horizontal page overflow.
7. Production: Settings version, service-worker update, reload/persistence, cached app operation, and successful Pages deployment.

Runtime dependency audit reported no published vulnerabilities during this release review. No accounts, telemetry, third-party scripts or remote fonts are added. Research links navigate to external sites; the app does not transmit questionnaire data.

## Maintenance

Read AGENTS.md, the current code and the relevant specs. `sources/` remains read-only. Keep domain policies pure and explicitly version any numeric changes. Preserve the existing storage/viewport contracts and historical record semantics. Use the shared date control and modal coordinator instead of introducing local variants. Earlier implementation notes remain available in Git history; this file describes the current product.
