# T-Break Calculator Specification

Status: implementation-ready core specification; release requirements remain in section 14  
Version: 0.2.0 (spec); Tolerance policy line: **tolerance-v3** (app 0.9.0)  
Policy revision note (0.7.0): `currentPatternDuration` now selects the *planning target* inside the unchanged evidence range (section 7.3 target rule). It still never moves the range itself, and there is still no duration-to-days formula.  
Flow revision note (0.7.1): questionnaire ordering only — Q6 is asked first on the routes that use duration (see section 4.3); no engine, range, target, or evidence change.  
Release note (0.8.0): two changes land on main. (1) **tolerance-v3** replaces tolerance-v2 as the engine for new calculations: exposure classification is no longer a single-variable frequency lookup. Frequency (use days in 30) picks the base tier; intensity (sessions per use day ≥ 2, concentrates, dabbing) and chronicity (how long the current pattern has been typical) may move the classification at most ONE adjacent evidence tier; the broad evidence ranges 2–7 / 7–14 / 14–21 / 21–28 are unchanged and remain the outer bounds (never above 28). Sessions/products/routes are collected from 4 use-days up (not only ≥ 16), and clean in-range previous-break history may raise the planning target to the user's own best observed anchor — never the range. The result hero leads with the planning target and states the evidence range beneath it. (2) **Active reduction (cut-down) tracking** (`reduction-records-v2`) records exact THC-use events, derives plan state (rolling use-days, sessions, breach days, review rule), and replaces manual-only review with the transparent “two breach days in a rolling 7-day window → consider a 3–7 day pause and review” product rule. Details: sections 7.3, 7.5, 7.7 and 10.  
Release note (0.9.0): Recovery Intelligence adds a deterministic, **non-engine recovery-outlook interpretation layer** (`tolerance-recovery-outlook-v1`, section 7.11) derived from frozen tolerance results, the stored profile, previous-break observations, and recorded check-in facts. It never re-runs an engine and never changes numeric output. **tolerance-v3 numeric behaviour is UNCHANGED** — there is no new tolerance policy version, no reset/detox percentages, and no exact or guaranteed reset dates anywhere in the new feature.  
Release note (0.9.2): Recovery Outlook v2 adds an explicit, profile-sensitive **predicted tolerance recovery window** beside the unchanged tolerance-v3 plan and the separate Day-28 human CB1 reference. The highest-burden class may reach a 28–42-day product estimate; any part beyond Day 28 is lower-directness, indirect/preclinical-supported product heuristic, not a validated human endpoint. New records freeze the outlook version; records without it retain v1 display semantics.
Release note (0.13.0): companion personalisation moved out of the questionnaire into the separately persisted multi-select `companion-personalisation-v2` preference layer. It may only select/reorder deterministic plan and Today copy and MUST NOT be supplied to tolerance-v3, Recovery Outlook v2, validation, classification, target selection, or history rules. All numeric behaviour is unchanged.
Release note (0.14.0): presentation-only taxonomy refinement of `supportAreas[]` (grouped mind & mood / sleep / cravings & habits / body, with explicit nausea and headaches). It MUST NOT be supplied to tolerance-v3, Recovery Outlook v2, validation, classification, target selection, or history rules. No numeric or engine behaviour changes.
Authoritative source: `sources/TBREAK_PROJECT_CONTEXT.md`, version 2026-09-02  
Scope: deterministic v3 Tolerance Engine, active reduction (cut-down) tracking, qualitative v1 Detection Engine, nominal THC calculation, validation, break mechanics, a versioned non-engine recovery-outlook interpretation (`tolerance-recovery-outlook-v2`, section 7.11), and future scientific extension boundaries — runtime AI stays excluded (unchanged)

## 1. Authority and normative language

This specification translates the project context into implementable product rules without claiming clinical validation. The project context is authoritative if another document conflicts with it. The K3 review is an adversarial audit, not a source of scientific values.

**MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative. A rule labelled **product heuristic** is deterministic product behaviour chosen where the source supplies a broad anchor but no validated mapping. It MUST NOT be described as a scientific cut point.

No coding agent may add a scientific number, cutoff, multiplier, threshold, or range that is absent from this specification or a later reviewed evidence rule.

## 2. Scientific boundaries

The application MUST keep these concepts separate:

- CB1 receptor recovery;
- subjective THC tolerance;
- THC or metabolite detectability;
- intoxication; and
- psychomotor impairment.

The following are prohibited:

- a percentage “detoxed,” “clean,” “reset,” or “recovered”;
- an exact or guaranteed negative-test date;
- an exact universal “100% tolerance reset” date;
- an individual half-life inferred from BMI or other user characteristics;
- a metabolism or alleged-detox multiplier;
- a numerical probability or invented statistical confidence interval;
- translating detectable THC into impairment; and
- translating feeling sober into a negative-test prediction; and
- a “one dab/vape = +N break days” penalty — tolerance-plan adjustments after logged use come only from re-running the full engine on an updated profile.
- a “100% reset” or “fully reset” claim, and any reset/detox percentage anywhere in the recovery-outlook feature (section 7.11) — that layer emits time markers and research wording, never a percentage.

Tolerance output MUST NOT change detection output, and detection output MUST NOT change tolerance output.

## 3. V1 scope

V1 includes:

- deterministic tolerance-break ranges and targets;
- elapsed-time withdrawal anchors;
- qualitative matrix-specific detection information;
- nominal THC calculation for flower;
- branching intake;
- break planning, check-ins, history, and qualitative post-break planning; and
- local persistence.

V1 does not include numeric detection windows, cutoff or laboratory interpretation, jurisdiction rules, runtime generative AI (section 11), telemetry, or export/import. Only the deferred non-AI items receive future extension boundaries; none of their machinery is built now.

## 4. Types and provenance

### 4.1 Enumerations

```text
Goal = tolerance_reset | reduction | abstinence | detection_information

PostBreakMode = continue_abstinence | occasional | reduced_regular_use | undecided

ProductKind = flower | concentrate | vape | edible | oil | other
Route = smoking | vaping | dabbing | oral | sublingual | other

DetectionMatrix = urine | blood | oral_fluid | hair
DetectionContext = general | workplace | roadside

Confidence = low | moderate | high

CurrentPatternDurationBand = under_1_month | 1_to_6_months | 6_to_24_months | 2_to_5_years | 5_plus_years

ReductionPlanStatus = active | review_recommended | paused | ended
ReductionOrigin = direct | post_break

ThcStrategy
  avoidConcentrates: boolean
  lowerPotency: boolean
  lowerAmount: boolean

FieldProvenance = missing | user_estimate | label_derived | laboratory_derived | derived
```

`laboratory_derived` is reserved for future schemas. V1 does not ask for laboratory data.

`CurrentPatternDurationBand` values are **product UX categories**, not scientifically validated medical cut-points. They describe how long the *current* use pattern has been typical, not lifetime cannabis use.

`ReductionPlanStatus`, `ReductionOrigin`, and the `ThcStrategy` flags are product precommitment categories used by the active reduction tracker (section 10), not medical states. `review_recommended` is a deterministic product-rule status derived from two distinct breach days inside the rolling 7-day window; it is a pause-and-review signal, never a biological reset claim.

`vape` is a product form covering cartridges, pods, and disposables. It is distinct from `Route = vaping`. V1 does not assign vape a potency, dose, or pharmacokinetic model, and the section 7.3 intensity heuristic does not treat vape as concentrate.

### 4.2 Per-field provenance

Every collected scientific or quantity field uses this wrapper:

```text
SourcedValue<T>
  value: T or null
  provenance: FieldProvenance
```

Rules:

- `value = null` requires `provenance = missing`;
- a non-null value cannot use `missing`;
- provenance is stored per field, never once for an entire exposure;
- derived values identify their source fields; and
- missing values remain missing and are never replaced with population averages.

### 4.3 Core profile

```text
UseProfile
  goal: Goal
  breakRequested: boolean
  postBreakMode: PostBreakMode or missing
  thcUseDaysLast30: SourcedValue<integer 0..30>
  sessionsPerUseDay: SourcedValue<number > 0> or missing
  products: ProductKind[]
  routes: Route[]
  lastUseAt: SourcedValue<timestamp with timezone>
  currentPatternDuration: SourcedValue<CurrentPatternDurationBand> or missing
  previousBreaks: PreviousBreak[]
```

`UseProfile.lastUseAt` is the single authoritative last-use timestamp for every engine, timeline, and active break plan. Detection and break objects MUST reference it; they MUST NOT store an independent competing value.

`currentPatternDuration` is optional on input. Legacy profiles without the field remain valid and MUST normalise it to `missing`. When present it MUST be one of the five product bands. It describes how long the *current* use pattern has been typical, never lifetime use. It is collected as exposure context for Why-this-result copy, break-outlook wording, for the deterministic **preferred-target anchor selection** inside the already-selected evidence range (section 7.3), and — for an already-frequent (`16–25` use days) pattern that is long-established (`2_to_5_years` or `5_plus_years`) — for the one bounded v3 range move to 21–28 (section 7.3). It MUST NOT add, subtract, or multiply recommended days as a formula, and outside that single bounded v3 case it MUST NOT move `recommendedRangeDays` (the broad evidence range). Product amount and numeric potency remain outside core intake and are collected only in the optional nominal-flower branch in section 6.

Routing (product, not a numeric rule): Q6 is the first use-profile question after the goal/route choice — after Q1 on `tolerance_reset` and abstinence, and after Q2R = Yes on reduction-with-a-break. Use-days (Q2), sessions (Q4), and products/routes (Q5) follow it in flow order. Companion preferences are not questionnaire or domain input. Q6 is skipped on reduction-no-break and detection. Zero use-days is only discovered after Q6, so a 0-day tolerance_reset completion may store a duration band that the baseline-low result ignores. New calculations on those collecting routes SHOULD store a band; missing remains valid. Sessions/products/routes are REQUIRED on range-requested routes from `thcUseDaysLast30 >= 4` (validation rule 7), because the v3 classification reads intensity signals at that boundary and they can change the classification: a 4–15 use-day profile that also involves multiple sessions per use day, concentrates, or dabbing moves exactly one adjacent tier, from 7–14 to 14–21 (section 7.3), and a 16–25 use-day profile can move to 21–28. They are optional at 1–3 use-days (when present they must still be valid) and MUST NOT be required at 0 use-days (sessions are forbidden at 0, rule 8).

### 4.4 Previous break and check-in

```text
PreviousBreak
  id: string
  durationDays: integer >= 1
  toleranceReductionScore: integer 0..10 or null
  endedAt: timestamp or null
  createdAt: timestamp
  sourceAttemptId: string or null (optional)
```

`sourceAttemptId` (0.9.0) optionally links a PreviousBreak to the break attempt it was captured from (post-break outcome capture). Hand-entered records omit it; old records without it stay valid. Capture stores the existing `toleranceReductionScore` field as a 0–10 subjective magnitude — anchors 0 = no noticeable reduction / 10 = very large reduction — never a percentage-reset score. Capture eligibility is deterministic and per-attempt: exactly one `captured | skipped` mark per completed break, offered only after an actual return-to-THC event (never for continued abstinence), persisted in the durable `break-outcome-marks-v1` envelope.

```text
DailyCheckin
  recordedAt: timestamp
  craving: integer 0..10 or null
  sleep: integer 0..10 or null
  irritability: integer 0..10 or null
  anxiety: integer 0..10 or null
  appetite: integer 0..10 or null
  usedThc: boolean
  usedAt: SourcedValue<timestamp with timezone> or missing
  note: string or null
```

The note is an optional private journal entry shown back to the user in local history. It is not parsed, classified, or used by a deterministic result.

**Amendment (UX_SPEC 15.2 D5, implemented in 0.3.0):** the five symptom fields
are `integer 0..10 or null`; an untouched slider is stored as `null` and is
never prefilled or silently stored as 0. Anchors follow UX_SPEC 10.2 — 10
always means more of the named thing (stronger craving, better sleep quality,
stronger appetite). A use-day check-in (`usedThc = true`) requires a
confirmed `usedAt`; symptom entry is not offered on a use-day check-in.

### 4.5 Detection request

```text
DetectionRequest
  matrix: DetectionMatrix
  context: DetectionContext
```

V1 MUST NOT ask for or persist cutoff, analyte, test device, planned test date, quantitative baseline, creatinine, jurisdiction, employer, demographic, medication, or health fields. None can change an enabled v1 rule.

### 4.6 Nominal flower input

```text
NominalFlowerInput
  flowerGrams: SourcedValue<number > 0>
  thcPotencyPercent: SourcedValue<number in (0, 100]>
```

This branch is optional and shown only when the user asks to calculate nominal flower THC.

### 4.7 Open-ended abstinence tracking record (D4)

Abstinence is open-ended and MUST NOT be modelled as a `BreakAttempt` with a
fake finite target: it has no `targetDurationDays`, no completion milestone,
and no planned target date (UX_SPEC 9.8, 15.2 D4).

```text
AbstinenceTrack
  id: string
  calculationRecordId: string or null
  status: tracking | interrupted_time_needed | ended
  startedAt: timestamp
  segments: BreakSegment[]   (same shape as a break attempt)
```

`BreakSegment` (ARCHITECTURE section 8) anchors each open segment to the
authoritative `UseProfile.lastUseAt`. The interruption mechanics of section
7.9 apply unchanged minus any target-date recomputation: a reported use
suspends timing until its instant is confirmed, then closes the open segment
at that instant and opens a new one. `ended` is a neutral user stop; the
record never acquires a target or a completed state.

## 5. Validation and normalisation

Validation occurs before calculation.

1. Timestamps are normalised to UTC while retaining the submitted timezone for display.
2. Elapsed time uses exact UTC instants and 24-hour periods, not calendar-date subtraction.
3. A future `lastUseAt` is invalid.
4. The 30-day window includes elapsed ages from zero through exactly 30 × 24 hours.
5. If `thcUseDaysLast30 = 0` and `lastUseAt` is within that window, input is contradictory. This applies whenever both fields are present, regardless of goal.
6. When `thcUseDaysLast30 > 0` on a route that consumes `lastUseAt` (`tolerance_reset`, `reduction` with `breakRequested = true`, or `abstinence` reporting use days), `lastUseAt` is required and MUST be within that window. A timestamp older than 30 × 24 hours is contradictory on those routes. Routes that do not consume the timestamp never require it.
7. When `thcUseDaysLast30 >= 4` and a tolerance range is requested (`tolerance_reset`, or `reduction` with `breakRequested = true`), `sessionsPerUseDay`, at least one product, and at least one route are required, because the v3 exposure classification reads intensity signals at that boundary and they can change the classification (sections 7.3 and 4.3). For `thcUseDaysLast30` in 1–3 these fields are optional; when present they must still be valid. At 0 they are never required (rule 8).
8. If `thcUseDaysLast30 = 0`, `sessionsPerUseDay` MUST be missing. Products and routes MAY be omitted because they cannot affect the current recommendation.
9. `goal = tolerance_reset` requires `breakRequested = true`.
10. `goal = detection_information` requires `breakRequested = false`.
11. `goal = abstinence` requires `breakRequested = false`; abstinence is not represented as a finite tolerance break.
12. For `goal = reduction`, the user explicitly chooses `breakRequested`.
13. `goal = abstinence` sets `postBreakMode = continue_abstinence`. Return-to-use modes are not offered unless the user later changes goal.
14. `goal = detection_information` requires `postBreakMode` to be missing. Other goals collect it only when it affects an enabled plan; `undecided` is a valid explicit answer.
15. Free text MUST NOT be parsed into scientific numeric fields.
16. Invalid or contradictory core input returns `validation_error` and no recommendation.
17. `goal = abstinence` requires the authoritative `lastUseAt`. `thcUseDaysLast30` is not required for abstinence; the 30-day consistency rules (5–6) apply to abstinence only when use days are present.
18. `goal = reduction` without a requested break neither requires nor collects `lastUseAt`; rule 6 does not apply to that route.
19. `currentPatternDuration` is never required. An absent field, or a SourcedValue with `missing` provenance, is valid. An unknown band is `invalid_current_pattern_duration`. Validation MUST NOT invent a default band.

Raw questionnaire state MAY be retained transiently for error correction. Persistent calculation records store only the validated fields needed to reproduce or explain the result.

## 6. Nominal THC calculation

For flower only, when both supported inputs are present:

```text
nominal_thc_mg = flower_grams * 1000 * (thc_potency_percent / 100)
```

Example: `0.5 g × 1000 × 20% = 100 mg nominal THC`.

This value is THC contained in plant material. It MUST be labelled `nominal THC`, never `dose`, `absorbed dose`, or `bioavailable THC`.

V1 MUST NOT infer inhalation efficiency, bioavailability, puff size, combustion loss, route equivalence, absorbed exposure, monthly exposure from incomplete records, or tolerance days from nominal THC.

## 7. Tolerance Engine

### 7.1 Output contract

```text
ToleranceResult
  kind: tolerance_result | planning_only | not_applicable | validation_error
  recommendedRangeDays: { min: integer, max: integer } or null
  preferredTargetDays: integer or null
  recommendationStatus: heuristic or null
  evidenceConfidence: Confidence or null
  personalisationConfidence: Confidence or null
  uncertaintySummaryCode: string or null
  withdrawal: WithdrawalDisplay or null
  drivers: DriverCode[]
  historyInsight: HistoryInsight or null
  limitations: LimitationCode[]
  policyVersion: string
  calculatedAt: timestamp
```

The range is a planning heuristic. `preferredTargetDays` is a planning target inside that range, never a biological completion date.

Under tolerance-v3 `limitations` may carry: `heuristic_frequency_intensity_v3` (intensity moved the tier), `heuristic_chronicity_range_v3` (a long-established pattern moved the tier), `heuristic_duration_target_within_range_v3` (the target anchor sits below the range maximum), and `heuristic_history_target_within_range_v3` (clean in-range history raised the planning target).

### 7.2 Source anchors

The source supplies these broad product heuristics:

| Source profile | Starting range or target |
|---|---:|
| Very infrequent | 2–7 days |
| Regular, non-daily | 7–14 days |
| Frequent | 14–21 days |
| Daily/heavy/high-potency | 21–28 days |
| Multiple daily sessions / heavy concentrates | approximately 28 days as a default strong target |

The source does not define use-day boundaries, a heavy-concentrate quantity, or precedence when profile descriptions overlap.

### 7.3 Resolved v3 classification policy

The following is an explicit **product heuristic**, not a validated clinical equation. The broad evidence ranges are unchanged from tolerance-v1/v2:

| THC-use days in last 30 | Base profile | Base range |
|---:|---|---:|
| 0 | baseline tolerance likely already low | no break range |
| 1–3 | very infrequent | 2–7 days |
| 4–15 | regular, non-daily | 7–14 days |
| 16–25 | frequent | 14–21 days |
| 26–30 | near-daily/daily | 21–28 days |

The source table contains profile anchors, not executable precedence rules. V3 classifies exposure over the three planning drivers the source lists — frequency (use days in the last 30), intensity (sessions per use day ≥ 2, concentrates, dabbing), and chronicity (how long the current pattern has been typical). Frequency selects the base tier; intensity and chronicity may move the classification at most ONE adjacent evidence tier above the base, and never above 21–28:

- **Tier 1 — very infrequent (1–3 use days, base 2–7) never moves.** Isolated concentrate/dabbing use at this frequency is not treated as a heavy pattern.
- **Tier 2 — regular non-daily (4–15 use days, base 7–14) moves to tier 3 (14–21) only when intensity is high** (`sessionsPerUseDay >= 2`, `ProductKind = concentrate`, or `Route = dabbing`).
- **Tier 3 — frequent (16–25 use days, base 14–21) moves to tier 4 (21–28) when intensity is high OR the pattern is long-established** (`2_to_5_years` or `5_plus_years`). Chronicity moves the range in this one bounded case only: a long-established duration never moves any other band.
- **Tier 4 — near-daily/daily (26–30 use days, base 21–28) stays 21–28.** The strongest broad anchor is never exceeded because use has lasted years.

Movement is at most one adjacent evidence tier and never above 28 days. Missing duration never counts as long-established. When intensity moved the tier, the result MUST be labelled `heuristic_frequency_intensity_v3`; when a long-established pattern moved it, `heuristic_chronicity_range_v3`. The classification rules are labelled product choices; they guarantee one unambiguous 21–28 result for qualifying frequent/heavy profiles and keep every recommendation inside one of the four unchanged broad evidence ranges.

**Inputs that affect the broad range (v3):** only the `thcUseDaysLast30` frequency band and the bounded intensity/chronicity classification above. Amount, numeric potency, demographics, hydration, exercise, perceived metabolism, and previous-break history MUST NOT move `recommendedRangeDays`.

#### Preferred-target selection (tolerance-v3 product heuristic)

`recommendedRangeDays` is the broad evidence-supported planning interval. `preferredTargetDays` is a more personalised **planning choice inside that interval**. The deterministic target procedure is:

1. After the final range is selected (steps 5–6 of section 7.5), read the chronicity class of `currentPatternDuration`: `recent` = `under_1_month`, `1_to_6_months`; `medium` = `6_to_24_months`; `long` = `2_to_5_years`, `5_plus_years`; missing duration = no class.
2. A **recently established** pattern (`recent`) selects the range's **lower anchor** (`range.min`).
3. A **medium or long-established** pattern, or a **missing** duration (legacy profile), selects the range's **upper anchor** (`range.max`) — the tolerance-v1/v2 default, so nothing is invented for a missing field and a legacy recalculation is unchanged.
4. The anchor choice MUST be labelled `heuristic_duration_target_within_range_v3` in result metadata whenever the target sits below the range maximum.

#### Bounded previous-break override (tolerance-v3)

A clean, directional, fully in-range previous-break history may **raise** the planning target to the user's own best observed anchor — never the range. The override (section 7.7, limitation code `heuristic_history_target_within_range_v3`) applies only when the directional comparison has no inversion, the shortest AND the longest compared durations are BOTH inside the current `recommendedRangeDays`, and the longest observation scored higher; the target is then raised to that observed duration when it exceeds the anchor selected above. The override never moves the range, never lowers the target, never interpolates, regresses, or extrapolates, and never exceeds 28 days.

The five duration bands are product UX tiers used to choose between the two evidence anchors; they are not medical cut-points. None of this is a duration-to-days equation. The calculator MUST NOT implement rules such as “20 years = +7 days”, “duration × 1.2”, “concentrate = +N days”, a BMI/metabolism multiplier, a weighted pseudo-scientific score, or a recovery percentage. Duration MAY change driver copy, the target rationale, uncertainty explanation, and break-outlook tone. Tests MUST prove that two profiles that differ only in `currentPatternDuration` emit the same `recommendedRangeDays` except for the single bounded v3 case (16–25 use days + long-established → 21–28), MAY emit a different `preferredTargetDays` only as one of the two anchors of that same range or as an interior observed in-range history value under the override, and never exceed the range or 28 days because of a long duration.

### 7.4 Goal routing

- `tolerance_reset`: calculate a range.
- `reduction` with `breakRequested = true`: calculate a range as a user-requested break plan.
- `reduction` with `breakRequested = false`: return `planning_only`; do not invent a break duration.
- `abstinence`: return `planning_only` with withdrawal and abstinence planning; no end date or “completion” milestone.
- `detection_information`: return `not_applicable`; do not run the Tolerance Engine.

### 7.5 Exact decision procedure

```text
1. Validate input. On failure -> validation_error.
2. Apply goal routing from section 7.4.
3. If no tolerance range is requested, attach withdrawal display when relevant and stop.
4. If thcUseDaysLast30 = 0 -> not_applicable with low-baseline-tolerance explanation.
5. Select the base frequency tier and its base range from section 7.3.
6. Apply the bounded v3 classification from section 7.3: intensity and/or a
   long-established pattern may move the tier at most one adjacent step; read
   the final recommendedRangeDays from the resolved tier.
7. Select the anchor planning target inside the final range by the section 7.3
   target procedure (lower anchor for a recently established pattern; upper
   anchor for a medium/long-established or missing duration), then apply the
   bounded previous-break override (a clean directional in-range history may
   raise the target to the longest observed in-range duration). Add limitation
   codes heuristic_duration_target_within_range_v3 and
   heuristic_history_target_within_range_v3 when they apply.
8. Set evidenceConfidence = low and personalisationConfidence = low.
9. Set uncertaintySummaryCode = broad_heuristic_individual_response_varies.
10. Add deterministic drivers and limitations.
11. Derive the descriptive history insight from section 7.7; it never changes
    the range, and its only numeric effect is the step-7 in-range target override.
12. Attach withdrawal display anchored to the authoritative lastUseAt.
13. Validate each output block. A failed optional history block is omitted and logged
    locally; a failed core range block invalidates the result.
```

No scoring, weighting, multiplier, interpolation, regression, extrapolation, or unlisted override is allowed. The only numeric effect of previous-break history is the step-7 bounded in-range target override of section 7.3.

### 7.6 Confidence and user-facing uncertainty

All v3 tolerance ranges emit `low` for both evidence and personalisation confidence. This is deliberately uniform because the range mapping is provisional and not individually calibrated. No questionnaire boundary changes a confidence label.

The v3 UI MUST NOT show two confidence badges. It shows one plain-language line derived from `uncertaintySummaryCode`, for example:

> Limited certainty: this is a broad product heuristic, and individual response varies.

The two structured fields remain separate for future evidence work because the source distinguishes evidence strength from personal fit. V3 does not pretend either has been calibrated.

Profile completeness is a different axis and MUST NOT be converted into a numeric confidence. The result may show a deterministic plain-language **planning-context** note describing which profile fields were collected (frequency; frequency + duration; or frequency + duration + sessions/products/routes). Fuller exposure context shapes the recommendation inside the evidence bounds — it may move the classification within the bounded v3 rules and choose the planning target inside the range — but it never raises the structured confidence labels or implies statistical certainty.

The source’s example card uses `Moderate`, but it supplies no grading rubric that would justify when that label changes. V3 therefore preserves the source’s qualitative confidence concept while deliberately choosing the more cautious uniform `low` policy.

### 7.7 Previous-break history

History insight is descriptive, and history MUST NOT change the numeric range. Under the v3 rule a clean, directional, fully in-range history MAY additionally **raise the planning target** to the user's own best observed anchor inside the range (section 7.3); out-of-range or mixed history stays descriptive and never moves the range or the target.

Deterministic v3 rule:

1. Eligible records have both an integer duration and a 0–10 tolerance-reduction score.
2. If multiple records share a duration, use the most recent by `endedAt`; if absent, use `createdAt`.
3. Fewer than two distinct eligible durations produces no directional insight.
4. Compare every pair with distinct durations.
5. An **inversion** exists when the longer break has a lower reported score than the shorter break.
6. If any inversion exists, emit only `history_mixed_no_directional_claim`.
7. If no inversion exists and all scores are equal, emit `history_no_additional_benefit_observed`.
8. If no inversion exists and at least one longer duration has a higher score, compare the shortest eligible duration with the longest eligible duration. Report those two exact observations only. Do not say the benefit occurred continuously “between” them.
9. If either duration in that selected comparison falls outside the current recommended range, add `history_outside_population_range` and state that the personal observation sits outside the current broad heuristic. Do not suppress it; the history stays descriptive and never moves the range or the target.
10. Do not interpolate, average an optimum, regress, extrapolate, or attach probability.

**In-range planning-target override (v3, limitation code `heuristic_history_target_within_range_v3`):** when the insight is `history_directional_observation` (rule 8) AND both compared durations sit inside the current `recommendedRangeDays` (no `history_outside_population_range`), the longest observed duration becomes a candidate planning target. It RAISES the target only when it exceeds the anchor selected by the duration rule (section 7.3), which can place the target at an interior point of the range — the user's own best observed break. The override never moves the range, never lowers a target, never interpolates, regresses, or extrapolates an “ideal” value, and never exceeds 28 days.

Directional history insight is generated only for a `tolerance_result` with a current range. Other goal routes may show the saved history records but do not compare them with a recommendation.

Allowed (out-of-range or mixed history, descriptive only): “In your previous breaks, you reported a higher tolerance reduction at 21 days than at 14 days. That observation sits outside today’s broad heuristic range and does not change the calculator target.”

Allowed (clean in-range history, target override): “In your previous breaks, you reported a higher tolerance reduction at 10 days than at 7 days. Your 10-day observation sits inside the current 7–14 day range, so the planner used that observed anchor as the planning target. History never widens or narrows the evidence range.”

Prohibited: “Your ideal break is 18.7 days with 84% confidence.”

### 7.8 Withdrawal display

The fixed source anchors are:

```text
onset: roughly days 1–3
common peak: roughly days 2–6
most acute symptoms improve substantially: roughly days 4–14
sleep-related symptoms may last longer in heavier users; no numeric end date
```

They are typical population patterns, not personal predictions.

The engine calculates:

```text
elapsedHours = calculatedAtUTC - lastUseAtUTC
breakDay = floor(elapsedHours / 24) + 1
```

For each closed anchor `[startDay, endDay]`, status is:

- `upcoming` when `breakDay < startDay`;
- `current` when `startDay <= breakDay <= endDay`; and
- `past` when `breakDay > endDay`.

Overlapping anchors may both be `current`. The sleep statement has no calculated end status. The UI renders the engine-supplied position and MUST NOT recalculate it.

### 7.9 Interruption and restart mechanics

When `usedThc = true` during an active break:

1. `usedAt` is required before a new timeline or target date is displayed.
2. Until confirmed, the attempt is `interrupted_time_needed`; elapsed-day and target-date displays are suspended.
3. After confirmation, the authoritative `UseProfile.lastUseAt` becomes `usedAt`.
4. The current attempt segment closes at `usedAt`; earlier check-ins and segments remain in history.
5. A new attempt segment starts from the updated `lastUseAt`.
6. The existing recommended range and target duration remain unchanged, and the target calendar date is recomputed from the new `lastUseAt`.
7. The UI says “plan restarted from your latest use,” never “your biological progress reset to zero.”
8. If the user wants the use pattern reassessed, that is a separate explicit recalculation with updated 30-day inputs and a new calculation record.

### 7.10 Break outlook (BreakOutlookV1)

The numeric engine does not emit a day-by-day plan. Companion guidance does.

`BreakOutlookV1` is a deterministic derivation from EvidenceGuidanceV1 windows plus optional exposure context. Result, Today, and Plan Detail MUST reuse this one source. UI MUST NOT invent a second science-copy implementation.

```text
outlookDayCount = openEnded ? 28 : preferredTargetDays
days = [1, 2, …, outlookDayCount]
```

Rules:

- A 2 / 7 / 14 / 21 / 28 day planning target produces exactly Days 1–2 / 1–7 / 1–14 / 1–21 / 1–28. No duplicates, no gaps, no extra days.
- Open-ended tracking uses Days 1–28 as the inspectable reference and keeps the After-28 window available. It has no finish line at day 28.
- Each day may belong to more than one evidence window. Overlaps MUST be preserved (1–3 with 2–6; 7–14 with 14–21 at day 14; 14–21 with 21–28 at day 21).
- Copy uses may / can / commonly / more plausible. It MUST NOT guarantee an individual course.
- A lighter/infrequent + recently established pattern MUST NOT be shown severe withdrawal as if it is expected.
- A frequent / multiple-session / concentrate / long-established pattern MAY be told that stronger withdrawal or longer sleep disturbance may be more plausible.
- After day 28 there is no extra reset percentage.
- Check-in observations, when shown on a past day, are factual stored ratings only. Null is not zero. Missing days are not interpolated. There is no recovery score.

Frozen historical calculation records MUST NOT be rewritten. Outlook is presentation derived from the stored profile and the stored target; the stored range, target, drivers, and policy version stay immutable.

Driver codes `current_pattern_*`, `preferred_target_*`, and `pattern_duration_context_only` are presentation-layer codes. They MUST NOT be emitted by the Tolerance Engine and MUST NOT appear in golden fixtures. The engine-level metadata for target selection is the v3 limitation-code set of section 7.1 — `heuristic_frequency_intensity_v3`, `heuristic_chronicity_range_v3`, `heuristic_duration_target_within_range_v3`, and `heuristic_history_target_within_range_v3` — which MAY appear in result metadata and golden fixtures.

Frozen tolerance-v1/v2 records (stored range and target verbatim; duration stored but contextual, or anchor-only under v2) keep their stored numeric output when displayed under tolerance-v3. Their duration copy remains the historical contextual sentence; the presentation never invents a recent→lower-target claim for a stored upper target and never recomputes a stored range.

### 7.11 Recovery outlook (non-engine) — tolerance-recovery-outlook-v2

The recovery outlook is a deterministic, versioned **interpretation layer over frozen data**, not a second tolerance engine and not a new tolerance policy version. V2 defines a predicted tolerance recovery window: an evidence-informed **product estimate** of the period during abstinence in which tolerance may approach a near-maximal reduction relative to the stored current pattern. It is not a guaranteed full reset, receptor percentage, detox estimate, drug-test prediction, or medical endpoint. The builder consumes only the frozen `tolerance_result`, stored profile, and optional clean history; it never changes `recommendedRangeDays` or `preferredTargetDays`, and never calls a network or runtime AI.

Three values MUST remain distinct: (1) the tolerance-v3 practical plan target/range, capped at 28; (2) the v2 predicted recovery window, which may exceed 28; and (3) Day 28, the strongest direct human CB1 PET population reference used by the app. The predicted upper bound MUST NOT be described as a proven biological reset.

V2 product-heuristic policy, after tolerance-v3 has produced its unchanged range:

| Stored profile rule | Predicted recovery window |
|---|---:|
| Any profile whose tolerance-v3 range ends before Day 28 | Same coarse window as the stored range (2–7, 7–14, or 14–21) |
| 21–28 range with no extension rule | 21–28 days |
| Daily/near-daily (26–30 use-days) plus either intensity OR long duration | 28–35 days |
| Frequent (16–25 use-days) plus intensity AND long duration | 28–35 days |
| Daily/near-daily plus intensity AND long duration | 28–42 days |

Intensity means an existing explicit v3 signal: sessions per use day ≥2, concentrate product, or dabbing route. Long duration means 2–5 years or 5+ years. Missing values count as missing, never as an extension signal. Very infrequent use remains in 2–7 even with an isolated intensity signal or long duration. Forty-two days is the maximum. The 28–35 intermediate band is one coarse weekly uncertainty step beyond the direct human reference; 28–42 is reserved for the conjunction of the strongest existing profile signals. Both are category-E product heuristics; their post-28 portion is supported only indirectly (EVIDENCE_CONTENT_SPEC §13), not by a validated human tolerance-duration study.

Rules:

- no reset/detox percentages anywhere, and no invented further reset percentage after day 28;
- wording keys remain `light_or_regular | heavy_target_below_reference | heavy_reaches_reference`; a light user is never told Day 28 or 42 is their target;
- personal history is factual scored observations (duration days + 0–10 score), capped at three, shown separate from population research; `8/10` is never rendered as `80%`;
- recorded check-in facts are factual only — null is never zero, and sparse data omits the block rather than padding it (`src/domain/checkins/checkin-summary.ts`);
- v2 history remains descriptive and MUST NOT move or fit the predicted window; when tolerance-v3 raised the stored plan target from clean in-range history, the outlook may explain that plan-only fact;
- new tolerance records store `recoveryOutlookVersion: tolerance-recovery-outlook-v2`; records lacking the field or explicitly carrying v1 use the preserved v1 builder and fixed-reference presentation. History never upgrades an old outlook silently.

## 8. Qualitative Detection Engine

### 8.1 V1 output

```text
DetectionResult
  kind: qualitative_only | validation_error
  matrix: DetectionMatrix
  context: DetectionContext
  numericEstimateAvailable: false
  interpretationCodes: string[]
  uncertaintyCodes: string[]
  evidenceConfidence: null
  personalisationConfidence: null
  policyVersion: string
```

The authoritative source supplies no numeric matrix-by-cutoff rules. V1 therefore emits no likely range, cutoff interpretation, planned-test comparison, pass/fail statement, or confidence category.

### 8.2 Exact v1 procedure

```text
1. Validate matrix and context.
2. Select the static qualitative rule for urine, blood, oral fluid, or hair.
3. If context = workplace, append workplace_cutoff_and_policy_unknown.
4. If context = roadside, append roadside_requires_verified_jurisdiction_rules.
5. Return qualitative_only with numericEstimateAvailable = false.
```

Qualitative copy exists for all four matrices; there is no vague “still useful” predicate.

### 8.3 Matrix rules

- **Urine:** frequency/chronicity, elapsed time, cutoff, and suitable laboratory baselines matter. Without enabled numeric rules, v1 does not estimate a window or interpret a baseline.
- **Blood:** no universal clearance window; very low measurable THC can persist longer with sensitive methods; trace presence is not impairment.
- **Oral fluid:** generally shorter-scale than urine but highly cutoff- and technology-dependent. Unknown test characteristics prevent a numeric estimate.
- **Hair:** retrospective exposure matrix, not a day-level clearance clock; never calculate a clear date.

For roadside context, generic oral-fluid thresholds MUST NOT be presented as jurisdiction practice. No Irish threshold or rule is enabled in v1.

### 8.4 Future numeric extension

Numeric detection requires separately reviewed evidence rules. Before that feature is implemented, its schema must define controlled analyte/unit/device identifiers, non-overlapping strata, range anchor basis, exact selection behaviour, provenance, and evidence grading. No v1 questionnaire or persistence structure is built in anticipation of those fields.

## 9. Detox and wellbeing rules

| Method | Allowed interpretation | Numeric effect |
|---|---|---:|
| Time plus abstinence | fundamental mechanism for reducing residual cannabinoid burden | elapsed time only |
| Normal hydration | useful for wellbeing; may alter urine concentration | none |
| Excessive water | may dilute urine; not faster elimination | none; never recommended as detox |
| Exercise | reasonable for routine and wellbeing | none |
| Sauna/sweating | no supported clearance bonus | none |
| Fasting | no supported clearance bonus | none |
| Cranberry, lemon water, vinegar, detox tea | no supported clearance bonus | none |
| Niacin | no proven detox benefit; high-dose use not recommended to alter tests | none |
| Diuretics | not recommended as THC-flush tools | none |

These behaviours are not calculator inputs.

## 10. Break and post-break plan

Before starting, the user may choose a start date, target duration from the engine result, primary goal, post-break mode, triggers, and fallback plan.

During days 1–6 the deterministic plan prioritises routine, sleep schedule, normal eating/hydration, trigger avoidance, replacement activity, and a short check-in. During days 7–14 it distinguishes symptom improvement from the tolerance goal. During days 14–28 it focuses increasingly on habits rather than “detox.” These sections use `breakDay` from section 7.8.

Post-break guidance remains in v1 because the source defines it as core. It MUST say that previous exposure is not a restart exposure and that tolerance may be lower. It gives no numeric dose.

- `continue_abstinence`: maintain progress/history; no return-to-use controls.
- `occasional`: the user defines their own maximum use days per week.
- `reduced_regular_use`: the user defines their own maximum use days per week, sessions per use day, potency strategy, and quantity strategy.
- `undecided`: show qualitative options without choosing limits.

The product MUST favour lower-potency return where practical, discourage immediate concentrate return and rapid repeat dosing, and distinguish delayed-onset oral THC.

### 10.1 Active reduction (cut-down) tracking

Active reduction tracking is a behavioural precommitment product, not a medical protocol and not a biological claim. Persisted schema: `reduction-records-v2`; pure domain rules live in `src/domain/reduction/`; see `ARCHITECTURE.md` sections 5 and 9 for the policy/durable placement. Semantics:

- **User limits.** A reduction plan stores `ReductionLimits` — a maximum number of THC-use days in a rolling 7-day window and a maximum number of sessions per use day — plus optional `ThcStrategy` flags (`avoidConcentrates`, `lowerPotency`, `lowerAmount`). They are the user's own precommitments, never engine science. If the app suggests starting limits, the suggestion is a **labelled product heuristic** derived from the user's current pattern (roughly half the current weekly use-day rate, clamped to 1–7 days, never harsher than the user's own pattern without consent), always editable, and MUST NOT be described as a “safe THC amount”.
- **Events equal sessions.** Each logged THC-use event stores a UTC instant plus one product and one route. Events are grouped by the user's **local calendar day** (UTC instant plus the user's current UTC offset, so instants never duplicate or disappear across a timezone change). Several events on one day raise that day's session count but never the use-day count; a new local day with at least one event raises the use-day count.
- **Derived plan state.** From events, limits, the current UTC offset, and `now`, the engine derives: rolling use-days over the last 7 local calendar days ending today, today's sessions, whether each limit is exceeded, the strategy-exceeded flag (concentrate logged while the plan says avoid concentrates), and the set of breach days. Same events + same clock ⇒ same state.
- **Review rule (explicit product rule, never a biological reset claim).** A day whose sessions exceed the session cap, or that pushes the rolling use-day count over the weekly cap, is one breach day. Two **distinct** breach days inside the rolling 7-day window set the plan to `review_recommended` and trigger the copy: “consider a 3–7 day pause and review”. The state is derived and reversible: when breach days age out of the window the plan returns to `active` automatically. `paused` and `ended` are user-controlled.
- **Logging use in reduction mode is NOT a T-break interruption.** It updates the reduction tracker only; it does not suspend timing, re-anchor, or restart a break attempt (section 7.9 does not apply).
- **Post-break occasional/reduced modes use the same tracker.** When an `occasional` or `reduced_regular_use` post-break plan is active after a break completes, the tracker starts with `origin = post_break`; a direct cut-down plan uses `origin = direct`. Both use the same `reduction-records-v2` semantics.
- **Adaptive tolerance recalculation.** The tracker never converts “one dab/vape = +N break days”. When real logged use changes the exposure pattern, the app re-runs the full tolerance-v3 engine on an observed profile and **freezes a NEW `CalculationRecord`**; the previous record stays immutable in History. If tracked history does not yet span 30 days, the observed 30-day use-day count is only a lower bound, so the app asks the user for a minimal prefilled refresh instead of fabricating a 30-day profile. Zero observed use days with full 30-day coverage yields the baseline-low outcome.

Break attempts themselves retain manual review and pause at any time: they have no automatic repeated-exceedance threshold — the automatic review rule above lives in reduction tracking only.

## 11. Runtime generative AI decision

Runtime generative AI is intentionally out of scope. This specification defines no runtime model, no model identifier, no provider inference layer, no AI consent or retention requirements, no AI response schema, and no runtime prompt infrastructure. User-facing explanations, Recovery Intelligence, evidence summaries, and personal-history insights are deterministic and derived from reviewed structured data stored or computed locally.

The deterministic application is complete without any runtime interpretation layer. The coding-agent restriction in section 1 (no coding agent may add a scientific number absent from this specification or a later reviewed evidence rule) remains in force: it governs development tooling, not product runtime.

## 12. Required invariants and tests

Automated tests MUST prove:

1. identical normalised input, calculation timestamp, and policy version produce structurally equal domain output;
2. both directions of 30-day consistency validation reject contradictions;
3. age, sex, BMI, hydration, exercise, sauna, fasting, perceived metabolism, amount, and unsupported potency cannot change a tolerance range or a planning target;
4. boundaries 0/1, 3/4, 15/16, 25/26, and 30 produce the specified base bands;
5. the bounded v3 classification produces one unambiguous 21–28 result for qualifying frequent/heavy users, moves a tier at most one adjacent step (4–15 use days + intensity → 14–21; 16–25 use days + intensity or long-established → 21–28), and never exceeds 28 days;
6. every v3 tolerance result uses low/low structured confidence and the same uncertainty summary;
7. the preferred target is a deterministic anchor inside the selected range — lower anchor only for a recently established pattern, upper anchor otherwise (including missing duration) — and may be raised to an interior observed in-range history value under the section 7.3/7.7 override; it never exceeds 28 days;
8. two profiles differing only in `currentPatternDuration` emit the same `recommendedRangeDays` except for the single bounded v3 case (16–25 use days + long-established pattern → 21–28); they MAY emit a different `preferredTargetDays`, and no duration band ever acts as a “days added” formula or widens a range beyond that one case;
9. history cannot move the range; a clean directional in-range history may raise the planning target under the section 7.3/7.7 override, and inversion/outside-range cases stay descriptive;
10. withdrawal status follows elapsed time and permits overlapping current anchors;
11. interruption suspends timing until `usedAt` is confirmed, then restarts the plan without deleting history;
12. detection always emits qualitative-only, null confidence, and no numeric range;
13. roadside context emits the jurisdiction warning and no Irish rule;
14. hair never emits a clear date;
15. nominal THC is labelled nominal and never absorbed;
16. no result contains reset/detox percentages, individual half-lives, alleged-detox bonuses, or guaranteed dates; and
17. a frozen historical record (tolerance-v1/v2) renders its stored range and target verbatim and is never recomputed under tolerance-v3.

Golden fixtures freeze `calculatedAt`; equality is domain-structural rather than byte-serialization equality.

## 13. Resolved pre-implementation decisions

- **Source audit — resolved:** the synced source is present and the heuristic bands match it.
- **Tolerance thresholds — resolved for v3:** 1–3 / 4–15 / 16–25 / 26–30 are accepted as versioned product heuristics, not scientific cut points; the base bands are unchanged from tolerance-v1/v2.
- **Exposure classification — resolved for tolerance-v3:** classification is bounded over frequency + intensity + chronicity (section 7.3). Tier 1 (1–3 use days) never moves; tier 2 (4–15) moves to 14–21 only when intensity is high; tier 3 (16–25) moves to 21–28 when intensity is high or the pattern is long-established; tier 4 (26–30) stays 21–28. Movement is at most one adjacent tier, labelled `heuristic_frequency_intensity_v3` or `heuristic_chronicity_range_v3`, and never exceeds 28 days.
- **Target selection — resolved for tolerance-v3:** the preferred target is an anchor inside the selected evidence range. Recently established patterns (`under_1_month`, `1_to_6_months`) choose the lower anchor; medium/long-established (`6_to_24_months`, `2_to_5_years`, `5_plus_years`) and missing durations choose the upper anchor. It is a product heuristic (`heuristic_duration_target_within_range_v3`), not a duration-to-days formula or a biological reset claim.
- **Questionnaire routing — resolved for 0.8.0:** Q6 stays on all range-requested routes and abstinence. Q4/Q5 move from `thcUseDaysLast30 >= 16` to `>= 4` on range-requested routes because the v3 classification reads intensity at that boundary; they are optional at 1–3 use-days and never required at 0. A 4–15 use-day concentrate/multi-session profile is now classified one adjacent band up (14–21), and the rationale says intensity moved the band.
- **Confidence — resolved for v3:** both structured confidence fields are uniformly low; UI shows one plain-language uncertainty statement plus a deterministic planning-context note (never a numeric confidence).
- **Goal semantics — resolved:** `breakRequested` controls reduction routing; abstinence has no finite break range.
- **Post-break type — resolved:** `PostBreakMode` is defined and abstinence does not route to return-to-use planning.
- **Last use — resolved:** one authoritative `UseProfile.lastUseAt`.
- **Provenance — resolved:** per-field `SourcedValue<T>`.
- **Pattern duration — resolved for tolerance-v3:** collected on range-requested routes; drives target-anchor selection and rationale; moves the range only in the single bounded v3 case (16–25 use days + long-established → 21–28); missing stays valid and maps to the upper anchor. Amount and potency — resolved for v3:** still not collected for tolerance; flower amount/potency appear only in the nominal calculator.
- **Previous history — resolved for tolerance-v3:** explicit pairwise/inversion/outside-range rules stay descriptive; a clean directional in-range history additionally raises the planning target to the observed anchor under `heuristic_history_target_within_range_v3`; history never moves the range.
- **Withdrawal and interruption — resolved:** elapsed-time positioning and plan-restart mechanics are explicit.
- **Detection input minimisation — resolved:** v1 collects only matrix and copy-affecting context.
- **Repeated plan exceedance — resolved for 0.8.0:** active reduction tracking derives `review_recommended` from two distinct breach days inside the rolling 7-day window and shows the “consider a 3–7 day pause and review” product rule (section 10.1); the state auto-returns to `active` when the breach days age out. Break attempts themselves keep manual review only.
- **Reduction records — resolved for 0.8.0:** `reduction-records-v2` is the persisted envelope for active reduction plans (statuses `active` / `review_recommended` / `paused` / `ended`, origins `direct` / `post_break`). Legacy `reduction-plan-v1` limit rows stay readable and migrate into a new plan's baseline when a v2 plan starts from them.
- **Adaptive recalculation — resolved for 0.8.0:** logged use never adds “+N days”. The app re-runs the full tolerance-v3 engine on an observed profile and freezes a NEW `CalculationRecord` (old records immutable); with under 30 days of tracked coverage it asks for a minimal refresh instead of fabricating a 30-day profile.
- **Architecture scope — resolved:** numeric detection packs, telemetry, and export/import are deferred; runtime generative AI is intentionally removed from scope (section 11) rather than postponed.

## 14. Remaining blockers and deferred features

### Release blockers for the deterministic consumer v1

- reviewed safety/escalation content, including urgent help, dependency support, age eligibility, and applicable health warnings;
- legal review and final medical/legal disclaimer wording for the intended launch jurisdictions;
- a privacy/security review of local substance-use data, deletion behaviour, and platform storage claims; and
- accessibility and offline verification of the implemented PWA.

These do not block implementation of schemas and pure deterministic engines.

### Safely deferred beyond deterministic v1

- numeric Detection Engine evidence rules, cutoffs, laboratory strata, controlled test vocabularies, and non-overlap validation;
- Ireland or any other jurisdiction pack;
- formal evidence-grading recalibration;
- cloud sync, telemetry, and export/import;
- any range or target effect from amount or numeric potency;
- any range effect from previous-break history beyond the bounded in-range planning-target override of sections 7.3/7.7; and
- any range effect from current-pattern duration beyond the single bounded v3 case of section 7.3 (16–25 use days + long-established pattern → 21–28); the duration role otherwise stays limited to the preferred-target anchor heuristic of section 7.3.

Numeric detection is required before the product can claim to estimate broad X–Y detection windows. Until then the feature MUST be described as qualitative detection information.
