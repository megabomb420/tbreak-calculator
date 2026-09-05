# Evidence content specification

App version: **0.17.0**
Content models: `evidence-guidance-v1`, `break-outlook-v2`, `tolerance-recovery-outlook-v2` (numeric rules unchanged).
Research basis: the original project PDF and synced project source documents. Numeric engines remain governed by CALCULATOR_SPEC.md.

Current communication contract: UI ranges are **planning ranges** and the secondary result mode is **Recovery outlook**. Estimates are not clinically validated personal timelines. Direct human CB1 imaging findings do not establish subjective tolerance recovery, and preclinical evidence cannot validate extra human recovery days. The dedicated Science screen links Hirvonen, D’Souza and Budney primary studies; the core experience uses short caveats and expandable detail. Copy clarifications do not change stored results or numeric policies.

## 1. Role

`EvidenceGuidanceV1` is a deterministic, versioned, local, offline content layer. It is the only place research-derived companion copy lives. UI selects and renders. There is no runtime generative AI, no network science, and no numeric engine read of this layer.

Module: `src/domain/guidance/evidence-guidance-v1.ts`  
Outlook: `src/domain/guidance/break-outlook.ts` (`break-outlook-v2`; BreakOutlookV1 architecture unchanged)  
Recovery outlook (0.9.2): `src/domain/recovery/recovery-outlook.ts` (`tolerance-recovery-outlook-v2`; section 13); user copy `src/ui/recovery-copy.ts`
Presentation: `src/application/presentation/break-guidance.ts`, `break-outlook.ts`, `checkin-comparison.ts`; recovery check-in facts `src/application/presentation/recovery-checkin-facts.ts` over `src/domain/checkins/checkin-summary.ts`  
Version strings: `evidence-guidance-v1`, `break-outlook-v2`, `tolerance-recovery-outlook-v2`

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

Generated plan copy labels the selected input without speaking as the user:

> Triggers: [selected triggers].
>
> Plan: When an urge shows up, use “[user-written replacement]” first, then reassess.
>
> Fallback: If the first move is not possible, [user-written fallback].

First person is reserved for text the user actually wrote or an implementation intention they deliberately authored. No duration is claimed as medically required. Editing after start is allowed. Interruption/restart preserves the plan.

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
| heavier | intensity signals apply at ≥ 4 use-days (sessions ≥ 2, concentrates, or dabbing), or ≥16 use-days with a long-established pattern (2–5 years / 5+ years), or ≥26 use-days |
| lighter | 1–3 use-days, no concentrate/dabbing, and short or missing duration |
| typical | everything else, including long-established infrequent use |

Result, Today, and Plan Detail MUST reuse this module. Result shows the full span. Today shows the current day only. Plan Detail shows the running journey. Since 0.7.2 the roadmap presented by Result and Plan Detail groups consecutive days with equivalent guidance into labelled ranges (`Days N–M`); the exact per-day content behind that grouping is unchanged and the grouping itself is a presentation transform with no effect on any day's content, windows, milestones, or tone.

Current-pattern duration may change outlook wording, the personalisation note, Why-this-result copy, and — under the tolerance-v3 rules — the planning target inside the recommended range, plus the recommended range itself only in the single bounded case (a frequent 16–25 use-days pattern established for 2–5 / 5+ years moves one band to 21–28). The research PDF treats duration as meaningful exposure context. It does **not** supply a duration-to-days formula, so none is implemented anywhere. The personalisation note distinguishes a recently established high-frequency pattern (stronger withdrawal may be more plausible at that intensity; the note does not call a recent pattern long-established) from a long-established one.

## 13. Recovery outlook content (0.9.2)

Content version: `tolerance-recovery-outlook-v2`. “Predicted reset” remains the compact navigation label; its lead defines the construct as a **likely tolerance recovery window**: a product estimate of when tolerance may approach a near-maximal reduction relative to the stored current pattern. It is not a full-reset claim, receptor percentage, detox estimate, drug-test prediction, or clinical endpoint. The unchanged tolerance-v3 plan, the predicted window, and the Day-28 human biological reference render as distinct concepts.

### Fresh evidence table and classification

| Class | Source / year | Human / animal; N and population | Exposure / abstinence | Endpoint and numerical result | Directness / limitation | Supports; does not support |
|---|---|---|---|---|---|---|
| B | Hirvonen et al., 2012 | Human; 30 male chronic daily users vs 28 controls; 14 rescanned | Mean heavy daily exposure; 13–32 monitored abstinence days for follow-up | PET [18F]FMPEP-d2; about 20% lower cortical CB1 availability at baseline, increased toward control values after ~4 weeks; hippocampus exception | Biological mechanism, not subjective tolerance; small male chronic-use sample | Day 28 as a strong population CB1 reference; not complete or universal reset |
| B | D’Souza et al., 2016 | Human; 11 cannabis-dependent men vs 19 controls; 10/8 users at Day 2/28 | Moderate daily dependence; monitored Day 2 and Day 28 | PET [11C]OMAR; about 15% lower baseline availability; group difference no longer significant at Day 2 or 28; within-user increases continued, did not clearly reach control levels | Small/attriting male sample; no tolerance challenge; lack of significance is not a plateau | Rapid onset and continued four-week biological change; post-four-week trajectory remains unknown |
| B | Ceccarini et al., 2014 | Human; 10 women with cannabis use disorder vs 17 controls | Scanned after about 4 ± 1.7 abstinence days; no long follow-up | PET [18F]MK-9470; global availability lower by about 11.7%, with regional differences | Cross-sectional early-abstinence scan; tracer/method limitations; no subjective tolerance | Corroborates altered CB1 availability; does not set a recovery duration |
| A | Colizzi & Bhattacharyya, 2018 systematic review | Human studies; 36 included studies across regular and non-regular users | Acute THC/cannabis responses across exposure histories; not a controlled abstinence-duration series | Regular users generally show reduced acute effects, with domain-specific/partial tolerance | Heterogeneous products, doses, designs; sparse direct abstinence re-challenge evidence | Tolerance is real and selective; does not establish a 35/42-day human reset window |
| A | Ramaekers et al., 2016; Mason et al., 2021 | Human acute challenge; N=122 across infrequent-to-daily use, and 12 occasional + 12 chronic users | 300 μg/kg THC challenge; comparisons by use history, not abstinence duration | Ramaekers found broadly similar impairment across use-history groups; Mason found blunted subjective/reward-circuit and attention effects in chronic users | Mixed endpoint-specific findings; neither follows tolerance recovery during abstinence | Confirms tolerance is selective/heterogeneous; does not supply a recovery-day mapping |
| C | Lee et al., 2014 | Human; 29 chronic frequent users, residential abstinence | Up to 4 weeks | Withdrawal symptoms generally peaked in the first days; some sleep/dream effects persisted | Withdrawal is not tolerance | Uneven recovery context; does not set tolerance timing |
| C | Bosker et al., 2013 | Human; 19 chronic daily users vs 30 controls, attrition to 12 users | Tests through about 3 weeks abstinence | Psychomotor performance improved but some differences remained | Cognition/psychomotor ≠ tolerance; confounding and attrition | Recovery can be endpoint-specific; no >28 tolerance prediction |
| C | Pope et al., 2001; Krzyzanowski & Purdon, 2020 | Human cohorts / meta-analysis | Monitored abstinence up to 28 days; verbal learning synthesis | Many average cognitive differences attenuated within 7–28 days | Indirect endpoint and heterogeneous samples | Guards against using cognition to inflate long windows; not a tolerance endpoint |
| C | Ricci et al., 2026 systematic review | Human; 26 heterogeneous studies | Abstinence from ≥72 hours to months/years | Narrative synthesis reports CB1 imaging normalization within four weeks, early cognitive improvement, and endpoint/profile variability | Neurocognitive review, not an abstinence re-challenge study; narrative synthesis | Current context for heterogeneous recovery; does not validate a post-28 tolerance window |
| D | Dudok et al., 2015 | Mouse; small animal counts with many sampled boutons | High-dose THC twice daily for 6.5 days; recovery at 11.5 days and 6 weeks | Hippocampal CB1-positive bouton signal: marked downregulation; partial restoration at 11.5 days and restoration by 6 weeks | Preclinical, regional, high-dose injection; animal time does not convert directly to human time | Only an indirect outer-uncertainty anchor near six weeks; not proof humans reset at Day 42 |
| D | Hoffman et al., 2023 review | Preclinical mechanistic synthesis plus human PET context | Varying rodent chronic-THC paradigms | Regional desensitisation/downregulation and recovery occur on different schedules | Review of heterogeneous animal models | Biological plausibility for uneven multi-week recovery; no validated personal human duration |
| E | Recovery Outlook v2 | Product rule, not a study | Existing frequency, intensity and duration inputs only | Coarse 2–7 through 28–42 windows under §7.11 | Not clinically validated; post-28 segment depends mainly on B uncertainty + D mechanism | Conservative decision support; not a biological/full-reset endpoint |

Reviewed sources: Hirvonen et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3223558/)); D’Souza et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4742341/)); Ceccarini et al. ([PubMed](https://pubmed.ncbi.nlm.nih.gov/24373053/)); Colizzi & Bhattacharyya ([PubMed](https://pubmed.ncbi.nlm.nih.gov/30056176/)); Ramaekers et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4881034/)); Mason et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7757162/)); Lee et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3986824/)); Bosker et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3534640/)); Pope et al. ([PubMed](https://pubmed.ncbi.nlm.nih.gov/11576028/)); Krzyzanowski & Purdon ([PubMed](https://pubmed.ncbi.nlm.nih.gov/31886689/)); Ricci et al. ([PubMed](https://pubmed.ncbi.nlm.nih.gov/41872072/)); Dudok et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4281300/)); Hoffman et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10528043/)).

The evidence for **recovery continuing beyond 28 days** is not direct human tolerance evidence. Human PET work leaves incomplete regional recovery and an unobserved post-Day-28 trajectory; human sleep/withdrawal/cognitive findings are contextual only; animal CB1 recovery supplies the main multi-week mechanistic support. Therefore any post-28 bound MUST be labelled lower-directness product heuristic.

### Required disclosure and provenance separation

The disclosure renders **Direct human reference**, **Extended recovery evidence**, and **What this does not mean** separately. It MUST state that the outer day is not scientifically proven as complete reset, CB1 availability is not subjective tolerance, persistent sleep/withdrawal/cognitive endpoints are not automatically tolerance, and animal timelines do not translate directly to humans. Personal 0–10 history and check-in facts remain in their own blocks; v2 history is descriptive and never changes the predicted window.

Reference: `src/domain/recovery/recovery-outlook.ts` (`tolerance-recovery-outlook-v2`); user copy `src/ui/recovery-copy.ts`. Preserved v1 rendering applies to old records without a stored outlook version.

## 14. Change control

Copy or window-bound changes increment `evidence-guidance-v1` / `break-outlook-v2` / `tolerance-recovery-outlook-v2` (or replace with a later version) and update tests. They must not edit tolerance/detection golden fixtures.
