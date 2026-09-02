# T-Break Calculator Specification

Status: implementation-ready core specification; release requirements remain in section 14  
Version: 0.2.0  
Authoritative source: `sources/TBREAK_PROJECT_CONTEXT.md`, version 2026-09-02  
Scope: deterministic v1 Tolerance Engine, qualitative v1 Detection Engine, nominal THC calculation, validation, break mechanics, and future scientific extension boundaries

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
- translating feeling sober into a negative-test prediction.

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

V1 does not include numeric detection windows, cutoff or laboratory interpretation, jurisdiction rules, runtime AI, telemetry, or export/import. Their future extension boundaries are defined without building their machinery now.

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

FieldProvenance = missing | user_estimate | label_derived | laboratory_derived | derived
```

`laboratory_derived` is reserved for future schemas. V1 does not ask for laboratory data.

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
  previousBreaks: PreviousBreak[]
```

`UseProfile.lastUseAt` is the single authoritative last-use timestamp for every engine, timeline, and active break plan. Detection and break objects MUST reference it; they MUST NOT store an independent competing value.

`currentPatternDuration`, product amount, and numeric potency are not core v1 intake fields because no enabled v1 tolerance rule uses them. Product amount and potency are collected only in the optional nominal-flower calculation branch described in section 6.

### 4.4 Previous break and check-in

```text
PreviousBreak
  id: string
  durationDays: integer >= 1
  toleranceReductionScore: integer 0..10 or null
  endedAt: timestamp or null
  createdAt: timestamp
```

```text
DailyCheckin
  recordedAt: timestamp
  craving: integer 0..10
  sleep: integer 0..10
  irritability: integer 0..10
  anxiety: integer 0..10
  appetite: integer 0..10
  usedThc: boolean
  usedAt: SourcedValue<timestamp with timezone> or missing
  note: string or null
```

The note is an optional private journal entry shown back to the user in local history. It is not parsed, classified, or used by a deterministic result.

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

## 5. Validation and normalisation

Validation occurs before calculation.

1. Timestamps are normalised to UTC while retaining the submitted timezone for display.
2. Elapsed time uses exact UTC instants and 24-hour periods, not calendar-date subtraction.
3. A future `lastUseAt` is invalid.
4. The 30-day window includes elapsed ages from zero through exactly 30 × 24 hours.
5. If `thcUseDaysLast30 = 0` and `lastUseAt` is within that window, input is contradictory. This applies whenever both fields are present, regardless of goal.
6. When `thcUseDaysLast30 > 0` on a route that consumes `lastUseAt` (`tolerance_reset`, `reduction` with `breakRequested = true`, or `abstinence` reporting use days), `lastUseAt` is required and MUST be within that window. A timestamp older than 30 × 24 hours is contradictory on those routes. Routes that do not consume the timestamp never require it.
7. When `thcUseDaysLast30 >= 16` and a tolerance range is requested (`tolerance_reset`, or `reduction` with `breakRequested = true`), `sessionsPerUseDay`, at least one product, and at least one route are required, because only that band can trigger the v1 frequency/intensity rule. For `thcUseDaysLast30` in 1–15 these fields are optional; when present they must still be valid.
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

### 7.3 Resolved v1 classification policy

The following is an explicit **product heuristic**, not a validated clinical equation:

| THC-use days in last 30 | Base profile | Base range |
|---:|---|---:|
| 0 | baseline tolerance likely already low | no break range |
| 1–3 | very infrequent | 2–7 days |
| 4–15 | regular, non-daily | 7–14 days |
| 16–25 | frequent | 14–21 days |
| 26–30 | near-daily/daily | 21–28 days |

The source table contains profile anchors, not executable precedence rules. V1 resolves the overlap as follows:

- the 1–3-day very-infrequent band always remains 2–7 days; isolated concentrate use is not treated as a heavy pattern;
- when `thcUseDaysLast30 >= 16` and either `sessionsPerUseDay >= 2`, `ProductKind = concentrate`, or `Route = dabbing`, the result is 21–28 days with a preferred target of 28 days; and
- otherwise the base range applies.

The `>= 16` boundary and treating any reported concentrate/dabbing in that frequent-use group as a conservative proxy for high-potency exposure are product choices. They ensure frequent multi-session or concentrate use cannot receive both 14–21 and 21–28 recommendations. The rule MUST be labelled `heuristic_frequency_intensity_v1` in result metadata.

Current-pattern duration, amount, numeric potency, demographics, hydration, exercise, perceived metabolism, and previous history MUST NOT add or subtract days in v1.

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
5. Select the base range from section 7.3.
6. Apply the single frequency/intensity rule from section 7.3.
7. Set preferredTargetDays = recommendedRangeDays.max.
8. Set evidenceConfidence = low and personalisationConfidence = low.
9. Set uncertaintySummaryCode = broad_heuristic_individual_response_varies.
10. Add deterministic drivers and limitations.
11. Derive the history insight without changing the range or target.
12. Attach withdrawal display anchored to the authoritative lastUseAt.
13. Validate each output block. A failed optional history block is omitted and logged
    locally; a failed core range block invalidates the result.
```

No scoring, weighting, multiplier, interpolation, or unlisted override is allowed.

### 7.6 Confidence and user-facing uncertainty

All v1 tolerance ranges emit `low` for both evidence and personalisation confidence. This is deliberately uniform because the range mapping is provisional and not individually calibrated. No questionnaire boundary changes a confidence label.

The v1 UI MUST NOT show two confidence badges. It shows one plain-language line derived from `uncertaintySummaryCode`, for example:

> Limited certainty: this is a broad product heuristic, and individual response varies.

The two structured fields remain separate for future evidence work because the source distinguishes evidence strength from personal fit. V1 does not pretend either has been calibrated.

The source’s example card uses `Moderate`, but it supplies no grading rubric that would justify when that label changes. V1 therefore preserves the source’s qualitative confidence concept while deliberately choosing the more cautious uniform `low` policy.

### 7.7 Previous-break history

History is descriptive and MUST NOT change the numeric range or target.

Deterministic v1 rule:

1. Eligible records have both an integer duration and a 0–10 tolerance-reduction score.
2. If multiple records share a duration, use the most recent by `endedAt`; if absent, use `createdAt`.
3. Fewer than two distinct eligible durations produces no directional insight.
4. Compare every pair with distinct durations.
5. An **inversion** exists when the longer break has a lower reported score than the shorter break.
6. If any inversion exists, emit only `history_mixed_no_directional_claim`.
7. If no inversion exists and all scores are equal, emit `history_no_additional_benefit_observed`.
8. If no inversion exists and at least one longer duration has a higher score, compare the shortest eligible duration with the longest eligible duration. Report those two exact observations only. Do not say the benefit occurred continuously “between” them.
9. If either duration in that selected comparison falls outside the current recommended range, add `history_outside_population_range` and state that the personal observation sits outside the current broad heuristic. Do not suppress it and do not alter the target.
10. Do not interpolate, average an optimum, regress, extrapolate, or attach probability.

Directional history insight is generated only for a `tolerance_result` with a current range. Other goal routes may show the saved history records but do not compare them with a recommendation.

Allowed: “In your previous breaks, you reported a higher tolerance reduction at 21 days than at 14 days. That observation sits outside today’s broad heuristic range and does not change the calculator target.”

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

The product MUST favour lower-potency return where practical, discourage immediate concentrate return and rapid repeat dosing, and distinguish delayed-onset oral THC. V1 has no automatic “repeatedly exceeded” threshold. The user may manually review or pause the plan at any time.

## 11. Future DeepSeek interpretation boundary

Runtime AI is deferred beyond v1. DeepSeek V4 Flash Thinking remains the source-preferred future interpretation model, using standard/medium reasoning by default, but the eventual model identifier MUST be configurable rather than embedded in scientific logic.

If implemented later, AI may explain deterministic results, prioritise a break plan, interpret relevant history/check-ins, suggest implementation intentions, and explain uncertainty. It MUST NOT invent or change ranges, targets, withdrawal anchors, cutoffs, grades, confidence, half-lives, multipliers, reset percentages, or negative-test dates.

The future feature requires explicit consent, data minimisation, legal/privacy review, and a schema that has no scientific numeric output fields. Only enumerated structured user fields—not numbers found in free text—may be whitelisted for literal repetition. The deterministic application remains complete without AI.

## 12. Required invariants and tests

Automated tests MUST prove:

1. identical normalised input, calculation timestamp, and policy version produce structurally equal domain output;
2. both directions of 30-day consistency validation reject contradictions;
3. age, sex, BMI, hydration, exercise, sauna, fasting, perceived metabolism, amount, and unsupported potency cannot change a tolerance range;
4. boundaries 0/1, 3/4, 15/16, 25/26, and 30 produce the specified base bands;
5. the frequency/intensity rule produces one unambiguous 21–28 result for qualifying frequent users;
6. every v1 tolerance result uses low/low structured confidence and the same uncertainty summary;
7. preferred target equals the selected range maximum and never exceeds 28 days;
8. history cannot mutate the range, and inversion/outside-range cases follow section 7.7;
9. withdrawal status follows elapsed time and permits overlapping current anchors;
10. interruption suspends timing until `usedAt` is confirmed, then restarts the plan without deleting history;
11. detection always emits qualitative-only, null confidence, and no numeric range;
12. roadside context emits the jurisdiction warning and no Irish rule;
13. hair never emits a clear date;
14. nominal THC is labelled nominal and never absorbed; and
15. no result contains reset/detox percentages, individual half-lives, alleged-detox bonuses, or guaranteed dates.

Golden fixtures freeze `calculatedAt`; equality is domain-structural rather than byte-serialization equality.

## 13. Resolved pre-implementation decisions

- **Source audit — resolved:** the synced source is present and the heuristic bands match it.
- **Tolerance thresholds — resolved for v1:** 1–3 / 4–15 / 16–25 / 26–30 are accepted as versioned product heuristics, not scientific cut points.
- **Intensity overlap — resolved for v1:** the explicit frequent-use rule in section 7.3 is the only override; it yields 21–28 with target 28.
- **Confidence — resolved for v1:** both structured confidence fields are uniformly low; UI shows one plain-language uncertainty statement.
- **Goal semantics — resolved:** `breakRequested` controls reduction routing; abstinence has no finite break range.
- **Post-break type — resolved:** `PostBreakMode` is defined and abstinence does not route to return-to-use planning.
- **Last use — resolved:** one authoritative `UseProfile.lastUseAt`.
- **Provenance — resolved:** per-field `SourcedValue<T>`.
- **Pattern duration, amount, and potency — resolved for v1:** not collected for tolerance because they have no numeric rule; flower amount/potency appear only in the nominal calculator.
- **Previous history — resolved for v1:** explicit pairwise/inversion/outside-range rules; no numeric mutation.
- **Withdrawal and interruption — resolved:** elapsed-time positioning and plan-restart mechanics are explicit.
- **Detection input minimisation — resolved:** v1 collects only matrix and copy-affecting context.
- **Repeated plan exceedance — resolved for v1:** no automatic threshold; manual review only.
- **Architecture scope — resolved:** numeric packs, AI runtime, telemetry, and export/import are deferred.

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
- runtime DeepSeek integration and its legal/privacy review;
- formal evidence-grading recalibration;
- cloud sync, telemetry, and export/import; and
- any numeric effect from pattern duration, amount, potency, or previous breaks.

Numeric detection is required before the product can claim to estimate broad X–Y detection windows. Until then the feature MUST be described as qualitative detection information.
