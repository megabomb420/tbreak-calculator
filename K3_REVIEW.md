# T-Break Adversarial Spec Review (K3)

Status: review findings, pre-implementation
Date: 2026-09-02
Scope: adversarial review of `CALCULATOR_SPEC.md` v0.1.0 and `ARCHITECTURE.md` v0.1.0
Purpose: allow another model to independently resolve each finding. No code is implemented and no spec is rewritten by this document.

Important context: the authoritative source both documents cite — `TBREAK_PROJECT_CONTEXT.md`, version 2026-09-02 — is NOT present in the project mirror (`sources/` is empty). This is itself finding A1 below.

Resolution classes used throughout:
- evidence-backed
- conservative product heuristic
- architecture/product decision
- requires external verification

---

## A. Documentation integrity

### A1 — Missing authoritative source · blocker

- File/section: both files, header ("Authoritative source: `TBREAK_PROJECT_CONTEXT.md`")
- Problem: Every claim of the form "the source supplies these bands" (CALCULATOR_SPEC §6.2) and "the source does not define the thresholds" (§6.3, §13.1) is unverifiable. The `sources/` mirror is empty.
- Why it matters: If the source actually does define band mappings, lab strata, or detection ranges, the spec's "deliberately limited interim mapping" could be contradicting real evidence — or conversely, the 2–7/7–14/14–21/21–28 bands could be mistranscribed. A coding agent building from these specs cannot tell which rules are evidence-derived and which are placeholders.
- Resolution: Locate `TBREAK_PROJECT_CONTEXT.md` v2026-09-02, add it to the mirror, and audit every "the source supplies / does not define" statement against it. No implementation of numeric rules until done.
- Resolution class: requires external verification (retrieving the file).

### A2 — Safety escalation is a self-declared release blocker · blocker

- File/section: CALCULATOR_SPEC §13 item 15; §12 last paragraph; ARCHITECTURE §18
- Problem: Medical red flags, age gating, pregnancy, medication interactions, dependency-support and emergency wording are unspecified. The spec itself flags this as a release blocker for a consumer substance-use product.
- Why it matters: This is not a calculator-math issue but a duty-of-care and legal exposure issue; it also blocks UI copy finalization.
- Resolution: Commission the safety/escalation content and jurisdiction scope as a parallel workstream before any release; it does not block building the pure engine scaffolding.
- Resolution class: requires external verification (clinical/legal review).

## B. Scientific correctness & fake precision

### B1 — Evidence-confidence discontinuity at a provisional boundary · high

- File/section: CALCULATOR_SPEC §6.5 step 3 vs §6.7; §13 item 1
- Problem: The 26–30 band emits `moderate` evidence confidence because it rests on the "broad daily/chronic 21–28-day biological anchor," while 16–25 emits `low`. But the 25/26 boundary itself is an admitted provisional product cut point (§13.1). A user crossing from 25 to 26 use-days jumps from `low` to `moderate` confidence purely because of a product-chosen line.
- Why it matters: This is exactly the fake-precision pattern the spec prohibits elsewhere: a qualitative confidence label that changes discontinuously on an unvalidated threshold conflates (a) evidence for the band with (b) uncertainty in mapping the user to the band.
- Resolution: Emit `low` for all v1 bands (uniform "heuristic" honesty), or split confidence into `bandEvidence` (moderate for the 21–28 anchor) and `mappingConfidence` (low for all v1 classifications). Cheapest honest option: all `low` in v1.
- Resolution class: conservative product heuristic.

### B2 — Intensity override contradicts the source table's unconditional row · high

- File/section: CALCULATOR_SPEC §6.2 (row "Multiple daily sessions / heavy concentrates → ~28 days") vs §6.3/§6.5 (`>= 16 use days` guard)
- Problem: The §6.2 row is unconditional: multiple daily sessions or heavy concentrates anchor at ~28 days. The interim mapping (§6.5 step 4) only fires the override when `thcUseDaysLast30 >= 16`. A user with 8 use-days of multi-session dabbing gets 7–14 days under the interim rule but ~28 under the source row the spec claims to operationalize.
- Why it matters: Two normative statements disagree; a coding agent must guess which wins. The guard silently rewrites a source-supplied anchor.
- Resolution: Make the conflict explicit: either state that §6.2's last row is conditional on frequency (product decision, mark `heuristic`), or implement the row unconditionally. This is §13 item 2 — it must be resolved before the override ships, not just "listed."
- Resolution class: architecture/product decision (the conservative guard is defensible, but it must own the contradiction openly).

### B3 — Contradiction validation covers only one direction · high

- File/section: CALCULATOR_SPEC §4 rule 4
- Problem: `thcUseDaysLast30 = 0` with recent `lastUseAt` is flagged as contradictory. The inverse — `thcUseDaysLast30 > 0` with `lastUseAt` more than 30 elapsed days ago — is logically impossible (no use in the last 30 days) but is not covered by any validation rule.
- Why it matters: A stale `lastUseAt` with a nonzero use-days answer passes validation and silently produces a band. An implementer will code exactly what rule 4 says and miss the inverse.
- Resolution: Add the inverse rule ("`lastUseAt` older than 30 elapsed days requires `thcUseDaysLast30 = 0`; otherwise request correction").
- Resolution class: conservative product heuristic (purely logical, no science needed).

### B4 — Withdrawal timeline has no anchoring rule relative to elapsed time · medium

- File/section: CALCULATOR_SPEC §6.10; §6.5 procedure (steps 1–9 never use `daysSinceLastUse`)
- Problem: Withdrawal anchors ("onset days 1–3, peak days 2–6…") are implicitly relative to break start, but the decision procedure never consumes elapsed time. Nothing states how the timeline is presented to a user whose last use was, e.g., 10 days ago — show stages as past? current position?
- Why it matters: A deterministic engine that ignores the one time-varying input it holds will either mislead ("onset: days 1–3" shown as upcoming to someone on day 10) or force the UI to improvise, breaking the "UI does not calculate" rule (ARCHITECTURE §1).
- Resolution: Add an explicit display rule: the engine emits the fixed anchor table plus the current elapsed position; UI renders position without altering anchors.
- Resolution class: architecture/product decision.

### B5 — History insights can contradict the recommended range · medium

- File/section: CALCULATOR_SPEC §6.9
- Problem: Insights are derived independently and cannot mutate the range (good). But nothing handles the conflict case: a user banded to 2–7 days whose history shows "benefit higher at 21 than at 14 days" receives two adjacent messages pulling in opposite directions. "Observations conflict" (step 6) is also undefined for 3+ observations (partially monotonic sets, ties).
- Why it matters: Contradictory adjacent copy erodes trust in a product whose whole premise is calibrated honesty.
- Resolution: Add a reconciliation rule: suppress or soften history insights that point outside the returned range, or explicitly present them as "your history suggests more benefit beyond this range — ranges are population heuristics." Define "conflict" as any inversion among observed duration/score pairs.
- Resolution class: architecture/product decision.

### B6 — Dual confidence labels are near-constant in v1 and read as jargon · medium

- File/section: CALCULATOR_SPEC §6.7–6.8; ARCHITECTURE §12 rendering contract
- Problem: In v1, `evidenceConfidence` is a pure function of the band and `personalisationConfidence` is effectively "moderate unless optional data is messy." Two qualitative labels, one nearly constant, shown verbatim to end users ("Personalisation confidence: Moderate").
- Why it matters: Two uncalibrated ordinal labels create an impression of measured confidence the product does not have — fake precision at the UX layer — and users will not know what action follows from "Low."
- Resolution: Collapse to one user-facing label plus a plain-language "why this is uncertain" line; keep both fields in the API for future calibration.
- Resolution class: conservative product heuristic.

### B7 — "Materially incomplete" and "still useful" are undefined predicates · medium

- File/section: CALCULATOR_SPEC §6.5 step 6 / §6.8 ("materially qualified by missing or uncalibrated optional input"); §7.3 step 6 ("when matrix-level interpretation is still useful")
- Problem: Both downgrade/branch decisions rest on undefined tests. Different implementers will code different thresholds.
- Why it matters: These are deterministic outputs (confidence label, result kind) produced by non-deterministic prose — exactly what the spec's golden fixtures cannot pin down.
- Resolution: Define both as checklists: e.g., personalisation = `low` iff (any product exposure lacks amount) OR (any flower exposure lacks potency) OR (any exposure `isUserEstimate` on all numeric fields). For §7.3 step 6, enumerate per-matrix when qualitative copy is defined (always for urine/blood/oral fluid/hair in v1) so the predicate disappears.
- Resolution class: conservative product heuristic.

## C. Determinism, rule packs & engine separation

### C1 — Pack overlap validation misses partial overlaps · high

- File/section: ARCHITECTURE §6.3 ("overlapping rules with identical selection dimensions") vs CALCULATOR_SPEC §7.3 step 7 (`rule_conflict`)
- Problem: Build-time validation only rejects rules with *identical* selection dimensions. Two urine rules with use-history strata 1–10 and 5–15 days are not identical but both match a 7-day user. Runtime then returns `rule_conflict` — correct fail-closed behavior, but every user in the overlap permanently gets `unsupported_rule`.
- Why it matters: The safety net becomes the product experience. The failure is detected but not prevented.
- Resolution: Strengthen pack validation to reject any two active rules whose selection-dimension ranges intersect (matrix × analyte × cutoff class × stratum), treating `rule_conflict` as unreachable-in-practice defense in depth.
- Resolution class: architecture/product decision.

### C2 — Method/device matching on free strings is fragile · medium

- File/section: CALCULATOR_SPEC §3.3 (`Cutoff.methodOrDevice: string or null`), §7.2 (`methodOrDevice constraints`)
- Problem: Exact rule matching against free-text device names ("Dräger DrugTest 5000" vs "Draeger 5000") will silently fail to match and fall through to `unsupported_rule` — or worse, an implementer adds fuzzy matching, violating §7.2's exactness rule.
- Resolution: Define controlled vocabularies (enum or registry IDs) for analytes, units, and known devices before the first numeric Detection Pack is authored. Deferred until packs exist, but must be settled in the pack schema, not per-pack.
- Resolution class: architecture/product decision.

### C3 — `rangeStartBasis: last_use` over-constrains future packs · low

- File/section: CALCULATOR_SPEC §7.1
- Problem: The literal `rangeStartBasis: last_use` is hardwired into the output contract. Future quantitative-baseline rules might anchor ranges to the baseline collection date instead.
- Resolution: Make it an enum field populated by the matched rule (`last_use | baseline_collection`), with `last_use` the only v1 value.
- Resolution class: architecture/product decision.

### C4 — Byte-equivalence invariant is untestable as written · low

- File/section: CALCULATOR_SPEC §11 item 1; ARCHITECTURE §5.1
- Problem: "Byte-equivalent scientific output" requires a canonical serialization (key order, float formatting) and a fixed `calculationTime` in fixtures; neither is specified. Outputs embedding timestamps can never be byte-equal across runs otherwise.
- Resolution: Specify canonical JSON (sorted keys, fixed number formatting) and state that golden fixtures freeze `calculationTime`.
- Resolution class: architecture/product decision.

### C5 — Model name pinned in normative docs · low

- File/section: CALCULATOR_SPEC §1, §10; ARCHITECTURE §9.1
- Problem: "DeepSeek V4 Flash Thinking with standard/medium reasoning" is written into the spec as a constant. Model availability and naming change; ARCHITECTURE §16 already versions "AI response schema/prompt" independently, so the pin is inconsistent with its own versioning policy. The existence of a model by this exact name could not be verified at review time.
- Resolution: Replace the literal model name with a configurable `modelId` plus capability requirements (structured output, reasoning tier); record the chosen model in config/changelog, not the spec.
- Resolution class: requires external verification (provider model catalog) + architecture decision.

## D. Privacy

### D1 — v1 collects inputs that provably cannot affect any output · high

- File/section: CALCULATOR_SPEC §3.3 (`quantitativeBaselines`, `cutoff`, `methodOrDevice`), §7.1 (base v1 returns no numeric detection results); ARCHITECTURE §7 ("a question is shown only when its answer can affect an authorised result")
- Problem: Because the base v1 ships no numeric Detection Packs (§7.1), laboratory baselines (including creatinine values — health data), cutoffs, and device strings can never select a rule or change any output in v1. The architecture's own questionnaire principle forbids collecting them. Similarly `withdrawalNotes` free text affects no deterministic output and is excluded from AI requests by default. And `TestContextKind = workplace | general_curiosity | other` all produce identical v1 behavior (only `roadside` gates anything).
- Why it matters: This is data minimisation failure by design — the most sensitive fields in the schema (lab results, employer-testing context) are collected, persisted in IndexedDB, and exported, while contributing nothing. If breached or subpoenaed, that data exists for zero user benefit.
- Resolution: Gate these questions behind the presence of an installed, active Detection Pack that declares a matching stratum; until then, do not render the inputs at all. Mark `workplace` context as copy-affecting only, or drop it in v1. Give `withdrawalNotes` an explicit purpose (check-in trends display) or remove it.
- Resolution class: architecture/product decision (the minimisation principle already exists; this is enforcing it).

### D2 — Third-party AI transfer of substance-use data · high (before AI ships, not before v1 core)

- File/section: ARCHITECTURE §9, §13; §18 ("AI proxy/provider data-retention terms")
- Problem: DeepSeek is an external provider; use patterns, break history, and check-ins are health-adjacent data, and the project's roadside jurisdiction is Ireland (GDPR special-category territory). The architecture has good mitigations (opt-in, minimisation, stateless proxy, fact tokens) but the legal basis, provider retention terms, DPIA, and whether consent-as-designed is sufficient are all unresolved.
- Why it matters: A consent toggle does not settle GDPR special-category processing or cross-border transfer. Getting this wrong is existential for the product, not a bug.
- Resolution: Obtain legal review of the AI data flow before enabling the feature; ship v1 with AI fully absent (not just off-by-default). The deterministic-only design already supports this.
- Resolution class: requires external verification (legal).

### D3 — AI numeric validator has a request-content loophole · medium

- File/section: ARCHITECTURE §9.3 ("validator may allow … values already present in the request") vs §14.4 (prompt-injection-in-notes tests)
- Problem: Numbers smuggled into consented free-text notes are "already present in the request," so the validator would permit the model to repeat them — a prompt-injection path for fake scientific numbers that passes validation, contradicting the adversarial test goal in §14.4.
- Resolution: Whitelist only enumerated user-authored numeric fields (e.g., user-defined post-break limits) as allowable literals; never treat free text as a source of permitted numbers. Default note-exclusion already helps but the rule must not depend on it.
- Resolution class: architecture/product decision.

## E. Ambiguity for coding agents

### E1 — "Explicitly requested break" has no schema field · high

- File/section: CALCULATOR_SPEC §6.4 (`reduction`) and §6.5 step 2
- Problem: Goal routing depends on whether a reduction/abstinence user "explicitly asks for a break," but `UseProfile` (§3.2) contains no such field. An implementer must invent one.
- Resolution: Add `breakRequested: boolean` (or a sub-goal enum) to the schema and to the questionnaire routing in ARCHITECTURE §7.
- Resolution class: architecture/product decision.

### E2 — Post-break modes `occasional` / `reduced_regular_use` are undeclared types · medium

- File/section: CALCULATOR_SPEC §9 vs §3.1 (Goal enum has neither); ARCHITECTURE §7 routing shows "post-break mode" for all of tolerance/reduction/abstinence
- Problem: Two enum values appear with no type declaration, and the routing diagram sends abstinence-goal users to return-to-use planning — a product contradiction (planning a relapse mode for someone whose stated goal is quitting).
- Resolution: Declare a `PostBreakMode` type in §3.1, and route `abstinence` away from post-break return planning (offer it only on explicit goal change).
- Resolution class: architecture/product decision.

### E3 — Duplicate `lastUseAt` with no precedence rule · medium

- File/section: CALCULATOR_SPEC §3.2 (`UseProfile.lastUseAt`) vs §3.3 (`TestContext.lastUseAt`)
- Problem: The same fact lives in two inputs to two engines; if they diverge (editing one, not the other), tolerance and detection silently compute from different timelines — an inconsistency the separation principle was meant to prevent.
- Resolution: Single source of truth in `UseProfile`; `TestContext` references it (or carries an explicit override with a validation cross-check).
- Resolution class: architecture/product decision.

### E4 — Provenance requirement exceeds the schema · medium

- File/section: CALCULATOR_SPEC §3.2 ("MUST preserve whether a value is missing, user-estimated, label-derived, or laboratory-derived") vs the single per-exposure `isUserEstimate: boolean`
- Problem: One boolean cannot express four provenance states, and it is per-exposure while provenance is per-field (potency may be label-derived while amount is user-estimated).
- Resolution: Per-field provenance enum: `missing | user_estimate | label_derived | lab_derived` on amount, potency, and labelled mg.
- Resolution class: architecture/product decision.

### E5 — Break-interruption recompute rule undefined · medium

- File/section: CALCULATOR_SPEC §6.10 (interruption) and §13 item 9
- Problem: After an interruption and confirmed `lastUseAt` update, nothing states whether the target date recomputes deterministically (elapsed-time reset against the same band) or the plan enters a manual state. The spec correctly refuses a scientific claim, but the *mechanical* behavior still needs a rule.
- Resolution: Product rule, no science needed: on confirmed interruption, recompute the plan from the unchanged band and new `lastUseAt`, and display a "plan restarted" state rather than implying tolerance reset.
- Resolution class: conservative product heuristic.

### E6 — Minor: `plannedTestAt` comparison and qualitative confidence emission · low

- File/section: CALCULATOR_SPEC §7.3 step 9, §7.4 (oral fluid "lower personalisation confidence") vs §7.1 contract
- Problem: In v1 (no numeric range) step 9 is dead code, and §7.4 implies `qualitative_only` results still emit personalisation confidence while §7.1/§6.7-style rules imply null for unsupported outcomes. State explicitly which result kinds carry confidence.
- Resolution class: architecture/product decision.

---

## F. Requested cross-checks

- Tolerance vs Detection separation: Structurally good — distinct types, no shared output semantics, invariant tests (§11 item 3) enforce it. Remaining leaks are E3 (shared input fact with no precedence) and the dead `plannedTestAt` comparison (E6). Verdict: sound, needs the E3 fix.
- Deterministic vs DeepSeek responsibilities: The boundary is one of the strongest parts of the design (no numeric fields, fact tokens, immutable result, deterministic fallback). Two weaknesses: the validator loophole (D3) and model pinning (C5).
- Fail-closed behavior: Consistently applied (unsupported_rule, rule_conflict, invariant failure → safe error, AI failure → deterministic UI). One gap: build-time overlap validation (C1) means the fail-closed path can become the *normal* path for overlapping packs. Also note the all-or-nothing invariant failure (§6.5 step 9) means a bug in a cosmetic field (e.g., a history insight) blanks the entire result — defensibly conservative, but consider scoping invariant failure to the affected output block.
- Confidence logic: The main fake-precision risk in the documents (B1, B6). The "never high in v1" and no-probability rules are right; the moderate/low discontinuity is not.
- Previous-break personalisation: Correctly non-numeric (insights only, cannot mutate range). Gaps: undefined "conflict" for 3+ observations and no reconciliation with the returned range (B5).
- Detection-pack design: Fail-closed and data-driven — good. Needs intersection-overlap validation (C1), controlled vocabularies (C2), and a less rigid `rangeStartBasis` (C3). The "qualitative_only in base v1" stance is exactly right and should be preserved.
- Inputs collected without affecting output: Yes, several — the full list is D1 (lab baselines, cutoff, device, withdrawalNotes, non-roadside test contexts). This is the single clearest violation of the documents' own stated principles.
- Overengineering for v1: Partially. The Detection Pack loader, pack startup validation, evidence registry, export/import adapter, telemetry adapter, and the entire DeepSeek stack are all built for features that produce no v1 output. The pure-function/domain-isolation discipline and fail-closed scaffolding are NOT overengineering — they are the cheap part that makes everything else safe. The expensive machinery (pack plugin system with conflict detection, registry runtime, AI validator) should be built only when the first real pack or AI feature is approved.

---

## 1. Blockers before implementation

1. A1 — retrieve and audit `TBREAK_PROJECT_CONTEXT.md` v2026-09-02. Every "source supplies / source does not define" claim, and therefore the entire §6.2 band table, is unverifiable until then. This blocks numeric rule implementation, though not schema scaffolding (consistent with ARCHITECTURE §18's own carve-out).
2. B2 — resolve the intensity-override contradiction (§6.2 unconditional row vs §6.5 guard) as an explicit product decision, not a listed ambiguity.
3. E1 — add the `breakRequested` field; goal routing is uncompilable without it.
4. B1 — decide the confidence model (uniform `low` vs split labels) before golden fixtures are written, since fixtures freeze confidence values.
5. A2/D2 — safety/escalation content and AI-transfer legal review block *release*, not engine scaffolding; start them in parallel now because they have the longest external lead time.

The remaining §13 items (1, 3, 4, 5, 6, 7, 8) need explicit *acceptance* decisions — the spec's "resolve or explicitly accept" framing is correct — but they do not block coding once accepted as provisional.

## 2. Decisions that can safely be deferred

- §13 items 10–13 (numeric detection rules, lab strata, device thresholds, Ireland pack): the fail-closed design makes these safely deferrable by construction — base v1 returns `qualitative_only`/`unsupported_rule` either way. Also defer C1/C2/C3 (pack validation rigor, vocabularies, rangeStartBasis) until the first pack is actually authored.
- §13 items 3–4 (amount/potency/chronicity numeric effects): v1 already prohibits numeric effects; only schema/UX wording is needed now.
- §13 item 14 (repeated-exceedance threshold): the "user-confirmed repeated pattern" rule in §9 is adequate for v1.
- Local encryption (ARCHITECTURE §10.2): decide before release, not before scaffolding — as long as the UI makes no encryption claims meanwhile.
- Export/import, telemetry, evidence registry runtime, DeepSeek integration: all deferrable post-v1.
- Confidence recalibration (§13 items 6–7): revisit when the evidence corpus exists.

## 3. Recommended minimal v1 scope

Build:

1. Shared schemas + validation + normalisation (with B3, E1, E2, E3, E4 fixed first).
2. Tolerance Rule Pack + pure Tolerance Engine + golden fixtures at the stated boundaries (0/1, 3/4, 15/16, 25/26, override).
3. STATIC per-matrix qualitative detection copy (urine/blood/oral fluid/hair), including the Ireland roadside disclaimer — no pack loader, no pack validation machinery.
4. Nominal THC (flower-only) calculation with the `nominal THC` labeling rules.
5. Branching questionnaire that collects only fields the v1 engines actually consume (per D1: no baselines, cutoff, or device questions until packs exist).
6. Deterministic result views + required limitation copy (§12).
7. Break plan, check-ins, interruption flow (E5 rule), IndexedDB history, deletion.

Explicitly exclude from v1: DeepSeek and all AI plumbing, Detection Pack machinery, quantitative baselines, export/import, telemetry, post-break `occasional`/`reduced_regular_use` limit-setting (keep the qualitative post-break guidance).

This keeps every scientific promise in the documents while cutting roughly a third of the architecture to what produces user-visible, verifiable behavior.
