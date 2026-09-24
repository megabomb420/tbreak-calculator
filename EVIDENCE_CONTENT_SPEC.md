# Evidence content specification

App version: **0.38.0**
Content models: `evidence-guidance-v1`, `break-outlook-v2`, `daily-support-v5` (numeric rules unchanged).
Research basis: the original project PDF and synced project source documents. Numeric engines remain governed by CALCULATOR_SPEC.md.

Current communication contract: UI ranges are **planning ranges**, and the result screen carries a research section instead of a second, competing estimate. Estimates are not clinically validated personal timelines. Direct human CB1 imaging findings do not establish subjective tolerance recovery, and preclinical evidence cannot validate extra human recovery days. The dedicated Science screen links Hirvonen, D’Souza and Budney primary studies; the core experience uses short caveats and expandable detail. Copy clarifications do not change stored results or numeric policies.

## 1. Role

`EvidenceGuidanceV1` is a deterministic, versioned, local, offline content layer. It is the only place research-derived companion copy lives. UI selects and renders. There is no runtime generative AI, no network science, and no numeric engine read of this layer.

Module: `src/domain/guidance/evidence-guidance-v1.ts`  
Outlook: `src/domain/guidance/break-outlook.ts` (`break-outlook-v2`; BreakOutlookV1 architecture unchanged)  
Retired outlook layer (0.9.2, retired 0.38.0): `src/domain/recovery/recovery-outlook.ts` (version constants only; section 13); research copy `src/ui/research-copy.ts`, rendering `src/ui/research-context.tsx`
Presentation: `src/application/presentation/break-guidance.ts`, `break-outlook.ts`, `checkin-comparison.ts`; result research section `src/ui/research-context.tsx` over `src/ui/research-copy.ts`  
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

Ratings exist only in check-ins stored before 0.35.0: the current check-in records the day and writes no symptom values, so a fresh break produces no comparison. A day without ratings is not a zero and never fills one in.

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

Result and Today MUST reuse this module. Result shows the full span; Today shows the current day plus the running journey. Since 0.7.2 the roadmap presented by Result and Today groups consecutive days with equivalent guidance into labelled ranges (`Days N–M`); the exact per-day content behind that grouping is unchanged and the grouping itself is a presentation transform with no effect on any day's content, windows, milestones, or tone.

Current-pattern duration may change outlook wording, the personalisation note, Why-this-result copy, and — under the tolerance-v3 rules — the planning target inside the recommended range, plus the recommended range itself only in the single bounded case (a frequent 16–25 use-days pattern established for 2–5 / 5+ years moves one band to 21–28). The research PDF treats duration as meaningful exposure context. It does **not** supply a duration-to-days formula, so none is implemented anywhere. The personalisation note distinguishes a recently established high-frequency pattern (stronger withdrawal may be more plausible at that intensity; the note does not call a recent pattern long-established) from a long-established one.

## 13. Retired outlook layer and the research section (0.38.0)

**The personalised predicted recovery window is retired.** Until 0.37.x the app rendered a `tolerance-recovery-outlook-v2` interpretation beside the plan, headed by a large estimated window (for example “About 4–6 weeks”) that the code itself classified as a product heuristic, with the segment beyond Day 28 resting mainly on indirect, preclinical support. A headline figure of that size reads as a personal prediction, and no disclaimer underneath it undoes that.

What is presented instead, in the result screen's research section (`src/ui/research-copy.ts`, `src/ui/research-context.tsx`):

- the four-week human CB1 PET reference as a **population research reference**, with the published studies linked;
- an explicit **what this does not mean** list: reaching a planning target is not proof of full reset, CB1 availability is not subjective tolerance, and withdrawal, tolerance, impairment and detectability stay separate questions;
- one honest line for a saved result that was calculated while the window was still shown.

The app estimates no personal recovery date, window, percentage or endpoint anywhere. `src/domain/recovery/recovery-outlook.ts` retains only the stored version constants, `BIOLOGICAL_REFERENCE_DAYS = 28` and `hadRecoveryOutlook()`; new calculation records no longer write `recoveryOutlookVersion`, and a stored value is read only to explain an older saved result. Stored results are never rewritten or recomputed.

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
| E | Retired outlook window (v1/v2, ≤0.37.x) | Product rule, not a study | Existing frequency, intensity and duration inputs only | Coarse 2–7 through 28–42 windows | Not clinically validated; the post-28 segment depended mainly on B uncertainty + D mechanism | **Retired in 0.38.0**: the app no longer estimates a personal window; the four-week reference is shown as research context |

Reviewed sources: Hirvonen et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3223558/)); D’Souza et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4742341/)); Ceccarini et al. ([PubMed](https://pubmed.ncbi.nlm.nih.gov/24373053/)); Colizzi & Bhattacharyya ([PubMed](https://pubmed.ncbi.nlm.nih.gov/30056176/)); Ramaekers et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4881034/)); Mason et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7757162/)); Lee et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3986824/)); Bosker et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3534640/)); Pope et al. ([PubMed](https://pubmed.ncbi.nlm.nih.gov/11576028/)); Krzyzanowski & Purdon ([PubMed](https://pubmed.ncbi.nlm.nih.gov/31886689/)); Ricci et al. ([PubMed](https://pubmed.ncbi.nlm.nih.gov/41872072/)); Dudok et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4281300/)); Hoffman et al. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10528043/)).

The evidence for **recovery continuing beyond 28 days** is not direct human tolerance evidence. Human PET work leaves incomplete regional recovery and an unobserved post-Day-28 trajectory; human sleep/withdrawal/cognitive findings are contextual only; animal CB1 recovery supplies the main multi-week mechanistic support. Because that support cannot carry a personal duration, the app no longer converts it into a displayed window at all.

### Required disclosure content

The research section MUST keep the four-week reference, the linked human studies and the **what this does not mean** points, and MUST NOT reintroduce a personal recovery window, date, percentage or reset score. A stored `recoveryOutlookVersion` is used only to show the legacy line; it never reproduces the old numbers.

Reference: `src/domain/recovery/recovery-outlook.ts` (version constants only); user copy `src/ui/research-copy.ts`; rendering `src/ui/research-context.tsx`.

## 14. Change control

Copy or window-bound changes increment `evidence-guidance-v1` / `break-outlook-v2` / `daily-support-v5` (or replace with a later version) and update tests. They must not edit tolerance/detection golden fixtures.


## 15. Daily support (daily-support-v5)

`src/application/presentation/daily-support.ts` selects **educational advice**, independently of tolerance, recovery and detection engines. `src/ui/daily-support.tsx` is shared by active finite breaks and open-ended tracking; it shows the stage summary headline, the day's practical action and the topic guides. Evidence phase context still comes from `EvidenceGuidanceV1` without changing its numeric windows.

The practical layer contains eleven symptom/habit guides — each with an explanation, five to eight practical steps, what tends to make it worse, when to get advice and its reviewed sources — plus 28 original daily activity prompts and a maintenance rotation. Under **Help with**, the action line and **Why this helps** are always visible; the remaining steps, the avoid line, the advice line and the sources sit behind one closed row (**What else can help**), because a five-to-eight-step guide open by default would bury the day's action. These activities are scheduled editorial choices, not a model of daily withdrawal or CB1 recovery. At the planning target the prompt asks the user to review the next step, without automatically completing the plan or implying a reset.

**Current input: the check-in records the day.** The one-tap check-in writes `usedThc`, `usedAt` and an optional note; its symptom fields are always null, so a fresh break has no rating-driven topic. **Help with** exposes all eleven topics as one native selection, and the user's choice is per view: it stores nothing, and no stored preference takes part in selection.

**Primary action precedence.** The day's own practice action is the default topic. A legacy stored rating (below) raises its own topic ahead of that default, and the user's saved urge plan leads wherever it covers a routine, an urge or an empty evening — its replacement action as the line, with the flagged trigger labels and the fallback plan beneath it. The guide beneath always shows **Why this helps**, **What else can help** (every step the action line does not already cover), **What to avoid** and **When to get advice**. Copy shape only: none of this reaches the tolerance, recovery or detection engines.

**Legacy input: stored ratings are still honoured.** For a device with check-ins written before 0.35.0, selection reads the latest non-null field rating from a no-use check-in recorded within the last 48 hours and within the current abstinence segment, up to the injected current instant. Lower sleep/appetite ratings mean greater difficulty; higher craving/anxiety/irritability ratings mean greater difficulty. An oriented score of 4 is a display-priority rule only, and the five rating fields bound the list at five. Missing values remain unknown, and a later unrated check-in does not erase an earlier rating. A rating only names the topic and its own reading ("Sleep quality 2/10 in your check-in"); a comfortable rating is never presented as a problem. Nothing in this app writes symptom ratings any more, so this path fires only for a stored legacy report.

### Community experiences

The carousel is drawn from **44 curated paraphrase cards across 39 r/Petioles discussions**; the content version is `daily-support-v5`. Each card carries a `windows[]` stage tag and is eligible only when the current primary evidence window matches:

| `windows[]` tag | Stage |
|---|---|
| `days_1_3` | opening days |
| `days_2_6` | days 2–6 |
| `days_7_14` | week 2 |
| `days_14_21` | week 3 |
| `days_21_28` | week 4 |
| `beyond_28` | beyond day 28 |

The first batch (17 cards) was checked on 2026-09-20 and the second (27 cards) on 2026-09-24. Threads whose opening post had been deleted, and threads built around supplements, detox claims or dosing, were excluded.

The experiences follow the topic currently on screen: the cards tagged with that topic lead, then the rest of the stage's cards, capped at eight (the position dots stay tappable). Within each group the rotation is day to day, and a stored legacy rating still lifts its own topic first. The window tag only decides when a card is contextually useful; it does not turn the reported day into a prediction.

Source roles (checked 2026-09-20):

- [NSW Health, Management of Withdrawal from Alcohol and Other Drugs, section 6](https://www.health.nsw.gov.au/aod/professionals/Publications/clinical-guidance-withdrawal-alcohol-and-other-drugs.pdf#page=34): withdrawal context and supportive care. No medication protocols are reproduced.
- [NHS insomnia](https://www.nhs.uk/conditions/insomnia/), [nausea](https://www.nhs.uk/symptoms/feeling-sick-nausea/), [headaches](https://www.nhs.uk/symptoms/headaches/): general self-care and relevant escalation signs, not THC-specific efficacy trials.
- [Lee et al., 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3986824/): sleep/dream variability during abstinence; no personal sleep-resolution date.
- [UVM practical break guide](https://www.uvm.edu/health/t-break-week-1): routines, alternatives and coping examples. Its claims about a universal break length/THC clearance are not used.
- [NSW Health, do-it-yourself guide to quitting cannabis](https://yourroom.health.nsw.gov.au/publicationdocuments/do-it-yourself-guide-to-quitting.pdf) and [Turning Point, Getting through cannabis withdrawal](https://turning-point-website-prod.s3.ap-southeast-2.amazonaws.com/drupal-s3fs/s3fs-public/2020-04/TP_Getting%20Through%20Cannabis%20Withdrawal.pdf): the urge-management sequence (delay, distract, breathe, drink water), sleep timing, and the low-risk activities used for empty time. Medication advice in both documents is not reproduced.
- [CAMH, getting through cannabis withdrawal](https://camh.ca/-/media/professionals-files/treating-conditions-and-disorders/getting-through-cannabis-withdrawal-camh-pdf.pdf): removing cannabis and paraphernalia, building structure into the day, and the point that mood commonly takes a week or two — or longer — to return to its usual level. Its sleep-aid and melatonin advice is not reproduced.
- [NHS Every Mind Matters, sleep](https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better), [healthdirect, relaxation techniques](https://www.healthdirect.gov.au/relaxation-techniques-for-stress-relief), [NHS, 5 steps to mental wellbeing](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/): general self-care used for sleep timing, breathing and relaxation steps, and activity ideas. Not THC-specific evidence.
- [NIDA, cannabis](https://nida.nih.gov/research-topics/cannabis-marijuana): the withdrawal symptom list used to describe vivid or unsettling dreams as commonly reported. No prevalence figure or medication content is reproduced.
No source read offers a management technique specific to vivid dreams during withdrawal; the app therefore describes them and points back to sleep care rather than inventing a method.

Reviewed r/Petioles discussions behind the cards (first batch; the second batch's threads are listed in the shipped `COMMUNITY_TIPS` array with their own URLs, titles and stages):

| Discussion | Cards drawn from it |
|---|---|
| [Even a 14-day break seems impossible](https://www.reddit.com/r/Petioles/comments/17syg5o/even_a_14day_tolerance_break_seems_impossible_for/) | `day-one-mental`, `days-one-four-sleep` |
| [A 30-day break, day by day](https://www.reddit.com/r/Petioles/comments/v2hl1r/i_took_a_break_for_30_days_ended_on_saturday_and/) | `days-one-four-rough`, `later-energy-routine` |
| [Current break symptoms on day 7](https://www.reddit.com/r/Petioles/comments/1ggxlf3/my_current_t_break_symptoms_and_my_thoughts_on/) | `days-two-four-appetite` |
| [Sleeping on a T-break](https://www.reddit.com/r/Petioles/comments/15z1nlx/sleeping_on_a_t_break_advice/) | `quiet-wind-down` |
| [Getting through the first week](https://www.reddit.com/r/Petioles/comments/153a0dk/what_are_some_methods_that_helped_you_guys_get/) | `paper-puzzle` |
| [Day 7 still feels difficult](https://www.reddit.com/r/Petioles/comments/1comaqo/i_am_on_day_7_of_a_30_day_tbreak_and_it_doesnt/) | `day-seven-still-hard`, `day-seven-fatigue`, `days-ten-fourteen-lift`, `week-three-sleep` |
| [Withdrawal symptoms on day 3](https://www.reddit.com/r/Petioles/comments/u2cmku/withdrawal_symptoms_on_day_3_of_my_tolerance_break/) | `day-ten-dreams` |
| [A strong craving on day 14](https://www.reddit.com/r/Petioles/comments/1blbe76/day_14_the_cravings_are_craaazy/) | `day-fourteen-craving-spike` |
| [Readers’ practical T-break tips](https://www.reddit.com/r/Petioles/comments/1dvgefb/help_hit_me_with_your_best_tbreak_tips/) | `different-ritual` |
| [When a short break changes the plan](https://www.reddit.com/r/Petioles/comments/pnyhex/has_anyone_taken_a_tolerance_break_for_a_week_or/) | `day-twenty-two-rethink` |
| [Returning after a 30+ day break](https://www.reddit.com/r/Petioles/comments/s0dwms/to_those_who_have_completed_a_successful_30_day/) | `after-month-perspective` |
| [A difficult day after 90 days](https://www.reddit.com/r/Petioles/comments/159owf8/weird_day_after_90_days/) | `beyond-ninety-variable` |

Card coverage by topic after the second batch: routine 18, craving 16, sleep 13, boredom 9, low mood 8, appetite 8, dreams 7, anxiety 6, irritability 5, nausea 4, headaches 3 — the thin topics from the first batch (nausea, headaches, irritability) were the priority for the additions. No source read offered a technique specific to vivid dreams, so dream cards stay descriptive.

Reddit content is labelled individual experience and is distinct from clinical/self-care guidance; each card states that it is not a prediction of the user's own break. Only the named idea is endorsed for inclusion; other comments, supplement regimens, detox claims and guaranteed timelines are excluded. Curated paraphrases are bundled locally, with source links that navigate externally. No live feed, scraping at runtime or user-data transmission is added.
