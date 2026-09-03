# Handoff — T-Break Calculator

For the next implementer. Specs win over this file.

- Repo: https://github.com/megabomb420/tbreak-calculator (public)
- Branch: `main`
- Live PWA: https://megabomb420.github.io/tbreak-calculator/
- App version: **0.10.0** (unified Interval result experience + support-focus guidance; tolerance-v3 and Recovery Outlook v2 numeric behaviour unchanged)
- This file sits on `main` (the header intentionally carries no self-referential SHA).

Authoritative docs:

- `UX_SPEC.md` (v1 UX; §16 is the implementation sequence; 0.9.1 note covers the deterministic-only decision; 0.9.0 note covers the plan|predicted-reset result modes, frozen-history outlook, outcome capture, and the reduction trajectory; 0.8.1 note covers the interaction/touch contract; 0.8.0 note covers the tolerance-v3 result hero and the reduction-active flow; 0.7.2 note covers update state, gear icon, outlook grouping; 0.7.1 note covers the Q6-first reorder + compact duration rows; 0.7.0 note covers the duration-aware planning target; 0.6.0 note covers Q6 + outlook)
- `CALCULATOR_SPEC.md` (domain / engines; tolerance-v3 classification in §7.3, procedure in §7.5, history override in §7.7, confidence in §7.6, reduction tracker in §10.1, recovery outlook in §7.11; `sourceAttemptId` in §4.4; Q6 routing/order in §4.3)
- `EVIDENCE_CONTENT_SPEC.md` (EvidenceGuidanceV1 + BreakOutlookV1 architecture, outlook content version `break-outlook-v2`; current recovery-outlook content version `tolerance-recovery-outlook-v2` in §13; v1 retained for historical records)
- `ARCHITECTURE.md`
- `README.md` (how to run and deploy)

Do not invent scientific numbers, reset/detox percentages, detection windows,
or medical/legal copy. Do not change engine coefficients, bands, or thresholds
to make UI easier. Do not commit untracked review files.

---

## What is on main

UX_SPEC §16 steps **1–5** plus deploy, iOS layout, vape product, the Interval
visual redesign, the **0.3.1–0.6.1** patches, the **0.7.0–0.7.2**
calculator/questionnaire/PWA-polish revisions, the **0.8.0**
tolerance-v3 + active-reduction revision, the **0.9.0** Recovery Intelligence revision, the **0.9.1**
deterministic-only architecture cleanup, the **0.9.2** Recovery Outlook v2 revision, and the **0.10.0** product-experience release.

| Step | Status |
|---|---|
| 1. Shell + Today router + draft persistence | done |
| 2. Declarative questionnaire engine + §5.1 flow | done (Q6 added in 0.6.0; moved first in 0.7.1; Q4/Q5 asked from 4 use-days in 0.8.0) |
| 3. Result screens + §14 template layer | done (outlook replaces “First weeks”; grouped roadmap in 0.7.2; hero leads with the plan target in 0.8.0) |
| 4. Break loop (§8, §10): break start, Today states, plan detail, use-first check-in, interruption, completion | done |
| 5. History + contextual flows + IndexedDB | done (0.4.0) |
| 0.4.2 iOS 26 Liquid Glass viewport fill | done |
| 0.5.0 evidence-guided T-break companion | done |
| 0.6.0 current-pattern duration + full break outlook | done |
| 0.7.0 duration-aware planning target (tolerance-v2) | done |
| 0.7.1 duration asked first on consuming routes + compact Q6 rows | done |
| 0.7.2 Settings update state + gear icon + grouped Break Outlook | **done** |
| 0.8.0 tolerance-v3 exposure classification + active reduction tracking (reduction-records-v2) | done |
| 0.8.1 interaction polish (selection/touch/callout/tap/overscroll) | **done** |
| 0.9.0 Recovery Intelligence: plan/predicted-reset result, frozen-history outlook, outcome capture, reduction trajectory | done |
| 0.9.1 deterministic-only architecture cleanup (runtime generative AI intentionally out of scope) | **done** |
| 0.9.2 Recovery Outlook v2 profile-sensitive recovery windows | **done** |
| 0.10.0 unified results, actionable plan, phase-aware Today, support focus | **done** |

Working product behaviour: questionnaire overlay with per-step persistence,
result overlay with the full Day 1 → target outlook before Start this break,
in-flow tab bar, product-vs-route distinction.

## What 0.10.0 added

- A shared `ResultLensHero` / `ResultInsight` system gives Your Plan and Predicted Reset the same duration typography, atmospheric geometry, spacing, and hierarchy.
- Your Plan leads with one personal priority and provides preparation, what-to-watch, and target-day actions through progressive disclosure before the existing detailed outlook.
- Today uses an existing-state-derived visual phase, CSS-only ambience, a compact day mark, one primary action, and a stronger check-in hierarchy. Reduced motion is static.
- Q7 asks one companion answer: sleep, cravings, routine, mood, appetite, or not sure. It is stored as `companion-personalisation-v1` beside the raw use-profile snapshot and only chooses deterministic UI copy. It is never passed into the tolerance or recovery builders.
- The reading shell expands on wider screens, while 320px spacing/typography and result/footer fit are tightened. The established iOS viewport contract remains unchanged.
- All 532 domain/golden tests and 135 UI tests pass. `sources/` is unchanged.

## What 0.9.2 added (Recovery Outlook v2)

- `tolerance-recovery-outlook-v2` adds `predictedRecoveryWindow` beside the unchanged frozen tolerance-v3 plan and separate Day-28 human CB1 reference.
- Base v2 windows mirror the stored plan range: 2–7, 7–14, 14–21, or 21–28. Daily 26–30 use-days plus either intensity or long duration produces 28–35; frequent 16–25 plus both intensity and long duration also produces 28–35; daily plus both produces 28–42. Intensity is sessions ≥2, concentrate, or dabbing; long means 2–5 or 5+ years. Missing fields never count as extension signals. Maximum is 42.
- The post-28 segment is lower-directness product heuristic, grounded in uncertainty after the four-week human PET reference plus indirect regional/preclinical CB1 recovery evidence. It is not a validated human tolerance endpoint or complete-reset day.
- Personal 0–10 history stays descriptive in v2 and cannot move the predicted window.
- New tolerance calculation records freeze `recoveryOutlookVersion: tolerance-recovery-outlook-v2`. Records from 0.9.0/0.9.1 without the field use the retained v1 builder and historical-context UI.
- UI hierarchy: likely recovery window → Your plan → Human CB1 reference → conditional Extended recovery → time-only timeline → optional check-ins/history → direct-vs-extended evidence disclosure and limitations. No progress percentage or curve.
- Tolerance-v3 policy, engine and golden fixtures are unchanged.

## What 0.9.0 added (“Recovery Intelligence”)

Deterministic presentation and capture over frozen data; no engine change and
no new tolerance policy version — tolerance-v3 numeric behaviour is unchanged.

- **Recovery outlook model** (`src/domain/recovery/recovery-outlook.ts`,
  version string `tolerance-recovery-outlook-v1`).
  `buildToleranceRecoveryOutlook({ profile, result, previousBreaks? })` is a
  pure, non-engine interpretation of a frozen `tolerance_result` (returns null
  for non-tolerance results). It mirrors the plan target and evidence range
  (never altering them), the biological reference (approximately Day 28 /
  four weeks, `biologicalReferenceDays = 28`), wording keys
  `light_or_regular | heavy_target_below_reference | heavy_reaches_reference`,
  TIME milestones (day 0 last use, day 2 early-recovery reference, plan target,
  top of the evidence range, day 28 four-week reference; deduplicated by day —
  markers, never recovery percentages), a personal-history cap of three factual
  scored observations shown separately from research, `historyRaisedTarget`
  mirroring the v3 `heuristic_history_target_within_range_v3` limitation, and
  evidence ids `pet_dsouza` + `pet_hirvonen`. No percentages, no exact or
  guaranteed reset date, nothing invented after day 28.
- **Result UI.** Tolerance results show an accessible two-option segmented
  control **“Your plan” | “Predicted reset”** (default “Your plan”; tablist
  semantics in `src/ui/result-screen.tsx`). “Predicted reset”
  (`src/ui/predicted-reset.tsx`) renders, in one hierarchy: disclaimer
  (“evidence-informed estimate, not a guaranteed day of complete tolerance
  reset”) → planning target → evidence range → biological reference (“around
  four weeks (Day 28)”) → profile wording by wording key → TIME timeline with a
  “not a percentage of recovery” caption → optional recorded check-in facts →
  optional personal history (separate from research) → “Why four weeks?”
  evidence disclosure (D’Souza/Hirvonen points + “What this does NOT mean”).
  User copy: `src/ui/recovery-copy.ts`.
- **Frozen history.** History opens the same frozen result plus an outlook
  derived from the record’s data only (no engine re-run). Legacy tolerance-v1/v2
  records show a “Predicted reset (historical context)” label and are never
  reinterpreted as v3.
- **Post-break outcome capture.** After a completed break and an actual
  return-to-THC event — never for continued abstinence — the app offers ONE
  0–10 subjective tolerance-reduction score (anchors 0 = no noticeable
  reduction / 10 = very large reduction; never “100% reset”), saved or skipped.
  Eligibility/domain: `src/domain/recovery/outcome-capture.ts` +
  `src/application/progress/break-outcome.ts`; UI `src/ui/outcome-capture.tsx`.
  Exactly one mark per attempt (`captured | skipped`) via the durable
  `break-outcome-marks-v1` family (`breakOutcomes`; key
  `tbreak.break-outcome-marks.v1`). A captured score is stored on the linked
  PreviousBreak via a new optional `sourceAttemptId` and stays editable later
  through the existing PreviousBreak history edit. Hand-entered records lack
  `sourceAttemptId`; old records stay valid.
- **Check-in facts** (`src/domain/checkins/checkin-summary.ts` →
  `src/application/presentation/recovery-checkin-facts.ts`): pure factual facts
  only — highest-craving day; sleep first→later. Null is never zero; sparse
  data omits the block.
- **Reduction trajectory.** The active-reduction card may show a deterministic
  “Your tracked pattern has moved.” line (baseline vs current use-days, plan
  target, and range from actual frozen records) or a neutral “same planning
  band” line — only when full-coverage adaptive recalculation produced a newer
  frozen tolerance record (`src/application/presentation/reduction-trajectory.ts`).
  Never fabricated.
- **Today stays focused** — no science dashboard.

## What 0.8.0 added
## What 0.8.1 added (interaction polish; no science/engine change)

App-like touch and selection behaviour lives in one appended block at the end
of `src/ui/styles.css` ("Native-feel interaction polish (0.8.1)"). The contract:

- **Selection:** app controls (buttons, `[role=button]`, summaries, labels,
  chips, tiles, steppers, tab buttons, choice cards, hold-delete, text-back)
  and chrome text (headings, eyebrows, micro-labels, hero/slider/progress
  readouts) are `user-select: none`. Editable fields (`input`, `textarea`,
  `select`, `[contenteditable]`) and long educational/evidence paragraphs
  (`.body`, `.meta`, `.banner`, `.driver-item`, evidence panels) remain fully
  selectable — no blanket lock on body text.
- **Touch:** `-webkit-touch-callout: none` on controls (no iOS long-press web
  callouts), `-webkit-tap-highlight-color: transparent` (flash removed while
  pressed / `:focus-visible` / selected states stay), and
  `touch-action: manipulation` on tappables (no accidental double-tap zoom).
- **Overscroll:** scroll panes (`.app-main`, `.questionnaire-body`,
  `.modal-sheet`) use `overscroll-behavior-y: contain`; the outlook strip uses
  `overscroll-behavior-x: contain`. Vertical scrolling inside every pane is
  untouched; no scroll traps, no `position: fixed` chrome.
- **Drag:** icons/`svg`/`img` get `-webkit-user-drag: none`.
- **Accessibility kept:** strong `:focus-visible`, pressed/selected states and
  the `prefers-reduced-motion` block are untouched; the iOS 26 viewport
  contract (`--app-height`, `--chrome-bleed`, `viewport-fit=cover`,
  `viewport.ts`) is unchanged; no UA sniffing or device pixel tables.
- Regression guards: `tests/ui/interaction-polish.test.tsx` asserts the CSS
  contract (controls non-selectable, exceptions selectable, no blanket lock,
  feedback states present) plus a shell smoke test.


Versions: tolerance policy **`tolerance-v3`** (engine for all new
calculations); reduction tracker schema **`reduction-records-v2`** (legacy
`reduction-plan-v1` still readable). Two changes:

### Tolerance policy `tolerance-v3` (`src/domain/policies/tolerance-policy-v3.ts`)

1. **Multi-factor exposure classification** replaces the single-variable
   frequency lookup. Frequency (use days in 30) selects the base tier;
   intensity (sessions per use day ≥ 2, concentrate product, dabbing route)
   and chronicity (how long the current pattern has been typical) may move
   the classification at most ONE adjacent evidence tier. Tier 1 (1–3 use
   days) never moves; tier 2 (4–15) moves to 14–21 only when intensity is
   high; tier 3 (16–25) moves to 21–28 when intensity is high or the pattern
   is long-established (2–5 / 5+ years); tier 4 (26–30) stays 21–28. Missing
   duration never counts as long-established. The broad evidence ranges
   2–7 / 7–14 / 14–21 / 21–28 are unchanged outer bounds; nothing exceeds 28.
   Classification moves are labelled `heuristic_frequency_intensity_v3` /
   `heuristic_chronicity_range_v3`.
2. **Questionnaire routing:** sessions/products/routes are asked on
   range-requested routes from **4 use-days up** (previously ≥ 16); optional
   at 1–3; never required at 0.
3. **Planning target inside the final range:** recent (`under_1_month`,
   `1_to_6_months`) → lower anchor; medium/long/missing → upper anchor
   (`heuristic_duration_target_within_range_v3`).
4. **Bounded previous-break override** (`heuristic_history_target_within_range_v3`):
   only a clean directional in-range history (no inversions; shortest AND
   longest compared durations both inside the current range; longest scored
   higher) may RAISE the planning target to that observed duration; never the
   range, never interpolation/regression/extrapolation, never above 28.
   Out-of-range or mixed history stays descriptive.
5. **Result hero:** the headline is the actionable planning target (“Plan for
   N days”) with the evidence range beneath it (“Evidence range: min–max
   days”); the rail marks the target inside the evidence bounds.

### Active reduction (cut-down) tracking (`reduction-records-v2`)

- A real tracker with user limits (max use-days in a rolling 7-day window, max
  sessions per use day) and an optional `ThcStrategy`; exact THC-use event
  logging (UTC instants grouped by the local calendar day; an event = one
  session); derived plan state (rolling use-days, today's sessions, breach
  days); a quick **Log THC use** flow with product/route and a **Use again**
  fast path; Today's `reduction-active` state; post-break takeover when an
  `occasional`/`reduced_regular_use` break completes; and adaptive tolerance
  recalculation.
- Domain: `src/domain/reduction/reduction-engine.ts` +
  `reduction-plan-lifecycle.ts`; store: `src/application/progress/reduction-record.ts`
  (envelope `tbreak.reduction-records.v2`); durable family `reductionRecords`
  in the web + IndexedDB backends; UI: `src/ui/log-use.tsx`,
  `reduction-start-sheet.tsx`, `reduction-refresh-sheet.tsx`; Today state
  `reduction-active` between `abstinence-tracking` and `profile-no-break`.
- **Review rule:** two DISTINCT breach days inside the rolling 7-day window
  put the plan in `review_recommended` with “consider a 3–7 day pause and
  review” — a transparent product rule, never a biological reset claim.
  Breach days age out of the window and the plan returns to `active`
  automatically. `paused` / `ended` are user-controlled.
- Logging use in reduction mode is **not** a T-break interruption.
- Adaptive recalculation (`src/application/calculation/adaptive-recalc.ts`)
  re-runs tolerance-v3 on the observed profile and **freezes a NEW
  `CalculationRecord`** — old records remain immutable. With less than 30
  days of tracked coverage the app asks for a minimal refresh instead of
  fabricating a 30-day profile.
- Frozen calculation records stay immutable under tolerance-v3 display.
  Legacy `reduction-plan-v1` limit-only records migrate into a new plan's
  baseline when a v2 plan starts from one and remain readable otherwise.

## What 0.7.2 added (PWA polish; no science change)

1. **Settings → About update state.** `src/ui/main.tsx` keeps the single
   `registerSW` updater that drives the snackbar and now also tracks honest
   freshness: `checking` → after a completed `registration.update()` with no
   newer worker → `current` (“Up to date”); an update found (own `updatefound`
   or the plugin's `onNeedRefresh`) → `available`; offline → `offline`;
   no service-worker context / register error / dev-server no-op timeout →
   `unavailable`. Settings renders the state compactly under the unchanged
   version line and, when available, an “Update now” button that calls the same
   `updateServiceWorker` reload used by the snackbar. “Up to date” is never
   shown just because no event fired.
2. **Gear icon fix.** The old gear path rendered with uneven teeth; replaced
   with a fully symmetric 8-tooth path (tips at radius 9.4, roots at 6.8, hub
   circle r 2.4) generated to stay proportional inside the 24 viewBox, plus CSS
   hardening on `.icon-button` (`flex: 0 0 auto`, `line-height: 0`,
   `aspect-ratio: 1`, `display: block` on the svg) so no axis can squash.
3. **Grouped Break Outlook roadmap.** Presentation transform only:
   `groupOutlookDays` (in `src/application/presentation/break-outlook.ts`)
   collapses consecutive days whose full user-facing presentation is identical
   (windows, stage, headline, may-notice, can-help, what-matters, next-stage,
   milestone, tone, check-in) into segments labelled `Day N` / `Days N–M`.
   `BreakOutlookView.segments` is derived from the exact `days` array, which
   remains authoritative; milestone/check-in days stay individual. The strip in
   Result / Plan Detail / Tracking renders segments; a segment containing the
   exact current day is marked current and the inspector shows a
   “Today: Day N” line. A 28-day typical journey renders as Day 1 / Days 2–3 /
   Days 4–6 / Day 7 / Days 8–13 / Day 14 / Days 15–20 / Day 21 / Days 22–27 /
   Day 28.

## What 0.7.1 added (flow + layout only)

No science, engine, target policy, evidence rule, History, BreakOutlook, or
viewport change. Two changes:

1. **Q6 (current-pattern duration) is the first use-profile question.** After
   Q1 goal (and Q2R when a reduction requests a break) the flow asks duration
   before use-days, last use, sessions, and products/routes. Abstinence asks
   duration before the last-use anchor. Zero use-days is only discovered after
   Q6, so a 0-day tolerance completion may store a duration band that the
   baseline-low result ignores. Q6 is still never asked on reduction-no-break
   or detection.
2. **Compact Q6 option rows.** The rows previously rendered inside the generic
   `.choice-card` three-column grid (`44px 1fr auto`) with no leading icon, so
   auto-placement squeezed the label/helper text into the 44px column
   (one-word-per-line). The rows now use the two-column compact grid
   (`1fr auto`, `choice-card compact duration-option`): full-width tappable
   card, title on top, helper directly below, normal wrapping, selected state
   preserved.

Step counts shift: tolerance_reset min 3 / typical 4 / max 6; reduction-break
min 4 / typical 5 / max 7; abstinence, reduction-no-break and detection stay 3.
(Superseded for the range-requested routes in 0.8.0, where Q4/Q5 are asked
from 4 use-days up — see `UX_SPEC.md` §5.4.)
Engine `resolvedPath`/`startSession`/`restoreStep`/`previousStep` and draft
resume reflect the new order; old saved drafts restore at Q6 when Q6 is the
first incomplete step.

## What 0.7.0 added

Research source: *THC Tolerance Break Calculator — projekt naukowo ugruntowanego PWA*.
Content/policy versions: `evidence-guidance-v1`, `break-outlook-v2`, tolerance policy **`tolerance-v2`**.

This is the calculator/science-policy revision: `currentPatternDuration` is no
longer a decorative question. It now selects the deterministic **planning
target inside the unchanged evidence range**. The revision stays conservative:
the broad ranges (2–7 / 7–14 / 14–21 / 21–28), the frequency/intensity
override, the `breakDay` formula, History/IndexedDB, and the 0.4.2 viewport
contract are unchanged. There is still **no duration-to-days formula**.

### Tolerance policy `tolerance-v2` (`src/domain/policies/tolerance-policy-v2.ts`)

`recommendedRangeDays` = broad evidence-supported planning interval (unchanged).
`preferredTargetDays` = a planning choice inside that interval. Deterministic
target rule (product heuristic, limitation code
`heuristic_duration_target_within_range_v2`):

- `under_1_month` or `1_to_6_months` (recently established) → **lower anchor** (`range.min`);
- `6_to_24_months`, `2_to_5_years`, `5_plus_years` → **upper anchor** (`range.max`);
- **missing** (legacy profile) → upper anchor — exactly the tolerance-v1 default, nothing invented.

Examples (otherwise identical heavy profiles, 27/30 use-days, multiple
sessions):

- under 1 month → same broad **21–28 days**, target **21** (lower anchor);
- 5+ years → same broad **21–28 days**, target **28** (upper anchor).

Rationale copy is honest: recent patterns get “the planner selects a lower
point inside the same broad evidence range”; established ones get the upper
part. Frozen pre-0.7.0 records (duration stored, target at range max) keep
their stored numbers and show the historical contextual-only sentence — the
presentation never invents a lower-end claim for a stored upper target.

`tolerance-policy-v1.ts` was removed; the engine, presentation coordinator and
`freezeCalculation` now use `TOLERANCE_POLICY_V2`. `LimitationCode` gained
`heuristic_duration_target_within_range_v2`; the intensity rule keeps
`heuristic_frequency_intensity_v1`.

### Questionnaire

Ordering is defined in `UX_SPEC.md` §5.1/§5.3 and `CALCULATOR_SPEC.md` §4.3.
Since **0.7.1** the flow asks duration (Q6) first on consuming routes:

- Q6 is the first use-profile question after Q1 (tolerance_reset, abstinence)
  and after Q2R = Yes (reduction with a break) — before use-days, last use,
  sessions, and products/routes. Zero use-days is discovered only after Q6; a
  0-day tolerance completion may store a duration band that the baseline-low
  result ignores.
- Q6 is still never asked on reduction-no-break or detection.
- Q4/Q5 stay at use-days ≥ 16 only. Below 16 use-days sessions/products/routes
  change neither the range rule nor the target heuristic, so they are not
  collected — including for a 4–15 use-day multi-session concentrate profile,
  which stays in its frequency band (7–14 for 4–15 use-days) by the same
  conservative boundary. This is written into `CALCULATOR_SPEC.md` §4.3.
  (0.7.0 statement; superseded in 0.8.0 — tolerance-v3 asks sessions/
  products/routes from 4 use-days up on range-requested routes because
  intensity can move the classification there.)

No new personal data is asked (no age, sex, BMI, hydration, exercise,
metabolism, health, or medications). Step counts per goal are updated in
`UX_SPEC.md` §5.4 for the new order.

### Result rationale and personalisation

- Position-aware “Plan for N days” line: upper anchor keeps “…— the top of your
  range.”; lower anchor reads “…— the lower end of your range.”.
- “Why this result” now ends with a target-rationale line when duration is
  stored (lower-end vs upper-end of the same {min}–{max} range), plus the
  existing band line. Templates: `preferred_target_recent_lower_end`,
  `preferred_target_established_upper_end`, `pattern_duration_context_only`
  (the last only on frozen pre-0.7.0 records).
- Deterministic planning-context note (presentation only): frequency;
  frequency + duration; or frequency + duration + sessions/products/routes.
  It never converts to a numeric confidence and never raises the structured
  low/low labels.

### Break outlook

`BreakOutlookV1` architecture and UI unchanged; content version bumped to
`break-outlook-v2` because the personalisation note now distinguishes a
recently established high-frequency pattern (intensity-based wording, no
“long-established” claim) from a long-established one. Outlook can now also
target 2 days (lower anchor of the very-infrequent band) → exactly Days 1–2.
Docs updated wherever “7 / 14 / 21 / 28 targets” was listed.

### Previous-break history

Kept descriptive at 0.7.0: Section 7.7 then forbade any numeric effect of
history on range **or** target, and history produced insight copy only.
(Superseded in 0.8.0 by the bounded tolerance-v3 override: a clean,
directional history whose shortest and longest compared durations both sit
inside the current range may now raise the planning target to the observed
anchor; history still never moves the range. See `CALCULATOR_SPEC.md` §7.7.)

### Golden fixtures and tests

- Golden fixtures now carry `policyVersion: "tolerance-v2"`; four new golden
  cases prove recent-vs-established target anchors, the interaction with the
  intensity override, and the legacy missing-duration default.
- Golden invariant changed: target is an anchor inside the selected range
  (not always the max), never above 28.
- `pattern-duration.test.ts` rewritten around the new matrix (infrequent /
  regular / daily × recent / long-established, sessions/concentrate/dabbing,
  duration-only differences, legacy missing duration, history descriptiveness,
  frozen tolerance-v1 record immutability, rationale/outlook assertions).
- UI tests updated only where the deliberate policy changes them
  (`results.test.tsx` lower/upper anchors; `break-loop.test.tsx` helper now
  uses a long-established band so break mechanics expectations stay intact).

(0.8.0 update: golden fixtures now carry `policyVersion: "tolerance-v3"` and
cover the bounded classification moves, the interior in-range history target
override, and the legacy missing-duration default.)

## What 0.6.0 added (context)

- Q6 `currentPatternDuration` (five product UX bands) and the full Day 1 →
  target BreakOutlookV1 reused by Result, Today, Plan Detail.
- In 0.6.0 duration was contextual only (never changed range or target); the
  0.7.0 revision described above is what made it affect the planning target.

## What 0.5.0 added (evidence-guided companion)

Today during an active break shows the current scientific window; plan detail
overlapping windows; open-ended tracking has no finish at day 28; detection
stays qualitative. The engine withdrawal strip still uses the exclusive
CALCULATOR_SPEC anchors (1–6 / 7–14 / 15–28); the companion outlook uses the
PDF’s overlapping windows. That discrepancy is intentional.

## What 0.9.1 added (deterministic-only architecture cleanup)

No feature work. Runtime generative AI is intentionally out of scope and was
removed as an unfinished next step:

- ARCHITECTURE §12 is now the positive decision ("Runtime generative AI
  decision") instead of a "Future DeepSeek boundary"; the obsolete provider
  inference / consent / response-schema / allow-list / fallback extension
  points were deleted, and no extension point is retained "just in case".
- CALCULATOR_SPEC §11 is the same decision in calculator terms; the deferred
  lists no longer name runtime DeepSeek. §1's coding-agent scientific-number
  restriction remains (it governs development tooling).
- UX_SPEC §16 step 6 is marked cancelled; the §13.2 "future AI explanation
  card" placeholder is gone (explanations are deterministic and local).
- README describes the shipped product as deterministic, local-first,
  offline-capable, private/on-device and not dependent on runtime generative
  AI, without anti-AI marketing.
- App version is 0.9.1. No tolerance-v3, Recovery Outlook, Reduction,
  Detection, science, persistence/schema, UI, CSS or viewport behaviour
  changed. `sources/` untouched.

Future implementers must treat runtime generative AI as intentionally not part
of the product architecture and must not resurrect it from stale source,
review, or history text.

## Invariants that still apply

- UI never computes `breakDay`. `abstinenceDayAt` is the only clock.
- Recommended ranges are evidence-conservative. Duration may move the range
  only in the single bounded tolerance-v3 case (frequent 16–25 use-days +
  long-established → 21–28); otherwise duration only picks the target anchor
  inside the range and never acts as a days-added formula.
- Previous-break history never moves the range. The only numeric history
  effect is the tolerance-v3 in-range planning-target override: clean,
  directional history with both compared durations inside the current range,
  raise-only, never above 28, no interpolation/regression.
- Recovery outlook (`tolerance-recovery-outlook-v1`) is a non-engine
  presentation layer over frozen records: engine numbers unchanged; milestones
  are TIME markers; no reset/detox percentages, no exact reset date, no
  invented reset percentage after day 28; population research and the user's
  own history stay separate (personal observations are factual — never blended
  into research, never converted to a percentage).
- Post-break outcome capture is offered at most once per completed break
  (`break-outcome-marks-v1` marks `captured | skipped`) and only after an actual
  return to THC, never for continued abstinence; scores stay 0–10 subjective on
  the linked PreviousBreak (`sourceAttemptId`), never a percentage.
- Interval visual system; in-flow tab bar; no accidental UI redesign in 0.7.0.
- Auth / database OFF. Local-first IndexedDB + Web Storage draft.
- No invented science, percentages, safe doses, numeric detection, or
  duration-to-days equations.
- Golden fixtures are regenerated deliberately, never blindly; old frozen
  calculations are immutable.
- Product vs route (`vape` ≠ concentrate, `vape` ≠ `vaping`).
- Runtime generative AI is intentionally out of scope; user-facing explanations, Recovery Intelligence, evidence summaries, and personal-history insights are deterministic and local.

## What not to do next

- Runtime generative AI is intentionally not part of the product architecture (UX_SPEC §16 step 6 is cancelled). Do not resurrect a runtime AI / DeepSeek step from stale source, spec, review, or handoff text.
- Do not turn the recovery outlook into a numeric engine: no reset/detox
  percentages, no exact reset date, no personalised biological reset day, and
  no invented reset percentage after day 28 — it stays a deterministic
  presentation layer (`tolerance-recovery-outlook-v1`).
- Do not add a numeric Detection Engine. Runtime AI stays out of scope by
  decision, not by deferral: no model layer, no provider inference, no
  “enhanced explanation” card.
- Do not add age, sex, BMI, hydration, exercise, liver/kidney, medications, or
  “fast metabolism”.
- Do not reintroduce a duration × days formula, a “one dab/vape = +N days”
  penalty, or a duration range effect beyond the single bounded v3 case
  (16–25 use-days + long-established → 21–28).
- Do not give previous-break history any range effect or any unbounded target
  effect — keep the v3 in-range override raise-only and bounded by 28.
- Do not convert the app to TanStack Start.
- Do not rewrite engines to match PDF overlapping windows.

## How to run

```bash
npm install
npm run dev      # 0.0.0.0:8080
npm test
npm run typecheck
npm run build
```

Dev currently runs on Node 22 in this sandbox (`engines` says `>=24`; that is
a warning only). On Windows checkouts with `core.autocrlf=true`,
`tests/ui/viewport-contract.test.tsx` fails on the CRLF checkout of
`src/ui/styles.css` (it reads the file text and expects LF markers); the file
is unchanged by this revision and the suite is green under LF.
