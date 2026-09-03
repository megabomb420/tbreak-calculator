# Handoff — T-Break Calculator

For the next implementer. Specs win over this file.

- Repo: https://github.com/megabomb420/tbreak-calculator (public)
- Branch: `main`
- Live PWA: https://megabomb420.github.io/tbreak-calculator/
- App version: **0.7.1** (questionnaire order: duration first on consuming routes; compact Q6 option rows — on top of 0.7.0's duration-aware planning target under tolerance policy `tolerance-v2`)
- This file sits on `main` (the header intentionally carries no self-referential SHA).

Authoritative docs:

- `UX_SPEC.md` (v1 UX; §16 is the implementation sequence; 0.7.1 revision note covers the Q6-first reorder + compact duration rows; 0.7.0 note covers the duration-aware planning target; 0.6.0 note covers Q6 + outlook)
- `CALCULATOR_SPEC.md` (domain / engines; tolerance-v2 target rule in §4.3, §7.3, §7.5, §7.6; Q6 routing/order in §4.3)
- `EVIDENCE_CONTENT_SPEC.md` (EvidenceGuidanceV1 + BreakOutlookV1 architecture, outlook content version `break-outlook-v2`)
- `ARCHITECTURE.md`
- `README.md` (how to run and deploy)

Do not invent scientific numbers, reset/detox percentages, detection windows,
or medical/legal copy. Do not change engine coefficients, bands, or thresholds
to make UI easier. Do not commit untracked review files.

---

## What is on main

UX_SPEC §16 steps **1–5** plus deploy, iOS layout, vape product, the Interval
visual redesign, the **0.3.1–0.6.1** patches, and the **0.7.0–0.7.1**
calculator/questionnaire revisions.

| Step | Status |
|---|---|
| 1. Shell + Today router + draft persistence | done |
| 2. Declarative questionnaire engine + §5.1 flow | done (Q6 added in 0.6.0; moved first in 0.7.1) |
| 3. Result screens + §14 template layer | done (outlook replaces “First weeks”) |
| 4. Break loop (§8, §10): break start, Today states, plan detail, use-first check-in, interruption, completion | done |
| 5. History + contextual flows + IndexedDB | done (0.4.0) |
| 0.4.2 iOS 26 Liquid Glass viewport fill | done |
| 0.5.0 evidence-guided T-break companion | done |
| 0.6.0 current-pattern duration + full break outlook | done |
| 0.7.0 duration-aware planning target (tolerance-v2) | done |
| 0.7.1 duration asked first on consuming routes + compact Q6 rows | **done** |
| 6. Runtime AI / DeepSeek | **not started** |

Working product behaviour: questionnaire overlay with per-step persistence,
result overlay with the full Day 1 → target outlook before Start this break,
in-flow tab bar, product-vs-route distinction.

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

Kept descriptive. Section 7.7 still forbids any numeric effect of history on
range **or** target; there was no defensible way to use individual
self-reported observations to shift the population-derived planning target
under the current evidence rules, so history continues to produce insight copy
only. This decision is recorded in `CALCULATOR_SPEC.md` §7.7 and §13/§14.

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

## Invariants that still apply

- UI never computes `breakDay`. `abstinenceDayAt` is the only clock.
- Recommended ranges are evidence-conservative and unchanged by duration;
  duration only picks the target anchor inside the range.
- Interval visual system; in-flow tab bar; no accidental UI redesign in 0.7.0.
- Auth / database OFF. Local-first IndexedDB + Web Storage draft.
- No invented science, percentages, safe doses, numeric detection, or
  duration-to-days equations.
- Golden fixtures are regenerated deliberately, never blindly; old frozen
  calculations are immutable.
- Product vs route (`vape` ≠ concentrate, `vape` ≠ `vaping`).

## What not to do next

- Do not start UX_SPEC §16 step 6 / runtime AI unless explicitly asked.
- Do not add age, sex, BMI, hydration, exercise, liver/kidney, medications, or
  “fast metabolism”.
- Do not reintroduce a duration × days formula or let duration move the range.
- Do not give previous-break history any numeric effect on range or target.
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
