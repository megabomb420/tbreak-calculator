# Evidence content specification

Status: **evidence-guidance-v1** + **break-outlook-v2**  
App version: 0.7.0  
Revision note (0.7.0): the tolerance-v2 target rule lives in the Tolerance Engine, not this layer (see `CALCULATOR_SPEC.md` §7.3). This file's outlook content version moved to `break-outlook-v2` because the exposure-tone personalisation note now distinguishes recently established heavy patterns from long-established ones. Window copy, tone tiers, and the day roadmap are otherwise unchanged.  
Authoritative research source: *THC Tolerance Break Calculator — projekt naukowo ugruntowanego PWA* (project research PDF).  
Numeric engines remain governed by `CALCULATOR_SPEC.md`. This file governs companion **guidance copy and product interpretation**, not bands, coefficients, or day formulae.

## 1. Role

`EvidenceGuidanceV1` is a deterministic, versioned, local, offline content layer. It is the only place research-derived companion copy lives. UI selects and renders. There is no runtime LLM, no network science, and no numeric engine read of this layer.

Module: `src/domain/guidance/evidence-guidance-v1.ts`  
Outlook: `src/domain/guidance/break-outlook.ts` (`break-outlook-v2`; BreakOutlookV1 architecture unchanged)  
Presentation: `src/application/presentation/break-guidance.ts`, `break-outlook.ts`, `checkin-comparison.ts`  
Version strings: `evidence-guidance-v1`, `break-outlook-v2`

## 2. Source distinctions (preserved)

Every content block is labelled:

| Kind | Meaning |
|---|---|
| `study_evidence` | Timing or claims grounded in the cited human clinical / imaging literature |
| `biological_reference` | A population biological landmark (especially ~four-week CB1 PET) that is **not** a personal reset day |
| `product_heuristic` | App staging / primary-window choice / habit-shift emphasis, labelled as such |
| `unsupported_folklore` | Marketed detox methods without credible efficacy in the source |

The PDF's study evidence, biological reference points, product heuristics, and unsupported detox folklore must not be collapsed.

## 3. Withdrawal timing anchors

From the research source (population patterns, not personal predictions):

- Onset commonly **24–72 hours** after last use (Days 1–3).
- Greatest intensity commonly observed around **Days 2–6**.
- Most acute symptoms commonly improve substantially across about the **first two weeks**.
- Sleep disruption can last **three to four weeks**.
- **Days 1–3 and Days 2–6 overlap.** The product does not invent mutually exclusive phases to hide that.
- Days 7–14 and 14–21 overlap at day 14. Days 14–21 and 21–28 overlap at day 21.

Clock: the existing `breakDay` / `abstinenceDayAt` formula is the only time base. This layer does not compute a second clock.

### Primary window (product heuristic)

Used only so Today has one current stage. Overlaps remain visible on the roadmap.

| `breakDay` | Primary window |
|---|---|
| planned / unknown | Preparation |
| 1 | Days 1–3 |
| 2–6 | Days 2–6 |
| 7–14 | Days 7–14 |
| 15–20 | Days 14–21 |
| 21–28 | Days 21–28 |
| ≥ 29 | After 28 days |

### Window emphasis

- **Preparation:** optional trigger, replacement, fallback, if-then plan. Not a large intake.
- **Days 1–3:** withdrawal may begin; possible craving, irritability, anxiety/tension, sleep difficulty, reduced appetite. Wording is may / can / commonly / some people.
- **Days 2–6:** commonly harder. An increase in craving or discomfort does not mean the break is failing.
- **Days 7–14:** acute symptoms commonly ease. Feeling better is not completing a tolerance goal. If the planning target is longer, continuing can still make sense.
- **Days 14–21:** habits, cues, automatic thoughts, evening/weekend routines. Not “detox”.
- **Days 21–28:** approximately four weeks is an important human CB1 PET reference in chronic/heavy users. Not a personal reset day; not fully restored CB1; subjective tolerance ≠ receptor availability. Adaptation can begin reversing earlier than four weeks.
- **After 28:** no continuing biological reset percentage. Further days can serve habit, abstinence, or personal goals. Open-ended tracking has no finish line.

## 4. Concepts that stay separate

Withdrawal, tolerance, CB1 adaptation, detectability, intoxication, and impairment are different questions. The product must never imply:

- withdrawal ending means tolerance has fully reset;
- CB1 normalisation guarantees subjective response;
- metabolite detectability measures tolerance;
- trace THC means current impairment;
- feeling normal means a drug test will be negative.

Forbidden product metrics: recovery / clean / detox / receptor / reset percentages, clearance bonuses, guaranteed negative dates, safe restart doses.

## 5. Detox evidence semantics

Helpful for wellbeing ≠ proven to speed THC elimination.

| Method | Wellbeing | Speeds elimination | Grade | Notes |
|---|---|---|---|---|
| Abstinence + time | helpful | no (not a flush) | A | Primary reliable basis for declining burden |
| Normal hydration | helpful | no | A | Drink to thirst; may change urine concentration |
| Water loading | harmful risk | no | D | Dilution ≠ elimination; no test-manipulation instructions |
| Exercise | helpful | no | B | Routine/health; not a reliable THC flush |
| Sauna / sweating | neutral | no | D | No convincing controlled human evidence |
| Fasting | not recommended | no | D | No established clearance advantage |
| Niacin | harmful risk | no | D | Not recommended; documented toxicity; no doses |
| Cranberry / lemon water / vinegar / detox teas | neutral | no | D | No credible controlled evidence |
| Diuretics | not recommended | no | D | More urine ≠ faster tissue clearance |

## 6. Evidence scale

App-specific A/B/C/D. Copy must state: **“This is an app-specific evidence scale, not formal GRADE.”**

- A — strong/direct human evidence or well-established mechanism
- B — limited direct human evidence
- C — indirect, limited, or conflicting evidence
- D — no credible efficacy evidence and/or poor evidence-to-risk balance

## 7. Trigger / precommitment model

Optional fields on stored attempts and tracking records (`preparation`, absent ≡ null on v0.4.x rows):

- `triggerIds` from a versioned catalog (evening after work, gaming, sleep difficulty, weekend, alcohol, boredom, stress, social)
- optional custom trigger
- replacement action
- fallback plan

Generated implementation intention:

> If [trigger], I will first [replacement] and then reassess the craving.

No duration is claimed as medically required. Editing after start is allowed. Interruption/restart preserves the plan.

## 8. Check-in comparison

From week two (`breakDay ≥ 7`), if two different check-ins have a non-null rating for a field:

- earliest available vs latest
- null is not zero
- no interpolation
- no fabricated baseline
- no global recovery score
- no causal claim that the break caused the change

## 9. Post-break principles

Previous exposure ≠ restart exposure. Return modes show conservative lower-exposure principles. Continued abstinence shows none of that guidance. No personalised safe restart dose, milligram prescription, or inhalation count.

## 10. Detection (this slice)

Qualitative education only. Cutoff matters; matrices differ; urine can fluctuate including later positives; trace blood THC is not impairment; hair is historical. No numeric personalised window, guaranteed negative date, or clean countdown. A future quantitative Detection Engine needs its own science-policy slice.

## 11. Open-ended abstinence

Same withdrawal guidance. No finite target, completion percentage, return-to-use encouragement, or automatic finish at day 28. Later guidance shifts to habits, triggers, and maintenance.

## 12. Break outlook (break-outlook-v2)

`BreakOutlookV1` (architecture) is a presentation layer over EvidenceGuidanceV1. It does not replace the Tolerance Engine.

For every inspectable day from Day 1 through the planning target (or Days 1–28 when open-ended), derive:

- primary window + overlapping window ids;
- stage label / headline;
- what the person may notice;
- what may help;
- what matters today;
- what usually comes next;
- optional milestone;
- exposure tone (`lighter` | `typical` | `heavier`).

Tone is copy-only. It MUST NOT change `recommendedRangeDays` or `preferredTargetDays`.

| Tone | When |
|---|---|
| heavier | intensity heuristic applies, or ≥16 use-days with a long-established pattern (2–5 years / 5+ years), or ≥26 use-days |
| lighter | 1–3 use-days, no concentrate/dabbing, and short or missing duration |
| typical | everything else, including long-established infrequent use |

Result, Today, and Plan Detail MUST reuse this module. Result shows the full span. Today shows the current day only. Plan Detail shows the running journey.

Current-pattern duration may change outlook wording, the personalisation note, Why-this-result copy, and — under the tolerance-v2 target rule — the planning target inside the unchanged recommended range. The research PDF treats duration as meaningful exposure context. It does **not** supply a duration-to-days formula, so none is implemented anywhere. The personalisation note distinguishes a recently established high-frequency pattern (stronger withdrawal may be more plausible at that intensity; the note does not call a recent pattern long-established) from a long-established one.

## 13. Change control

Copy or window-bound changes increment `evidence-guidance-v1` / `break-outlook-v2` (or replace with a later version) and update tests. They must not edit tolerance/detection golden fixtures.
