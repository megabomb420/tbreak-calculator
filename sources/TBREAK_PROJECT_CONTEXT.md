# T-BREAK CALCULATOR — PROJECT CONTEXT

Version: 2026-09-02  
Purpose: primary working context for ChatGPT Work and coding agents.

## Product goal

Build a mobile-first, local-first PWA for THC users who want to:

1. lower tolerance so THC feels substantially stronger again after a break;
2. reduce or stop THC use;
3. understand the expected withdrawal timeline;
4. estimate broad residual-detectability windows for drug testing;
5. understand which alleged detox/flush methods are unsupported;
6. plan a controlled return after a break without immediately rebuilding tolerance.

The app should be concrete and useful, but must not pretend science can predict an exact personal “100% tolerance reset” date or a guaranteed negative drug-test date.

Leefii Tolerance Break Calculator is a UX reference only. Do not copy its scientific logic or false precision.

---

## Core rule

Tolerance, detectability and impairment are separate concepts.

Never merge:

- CB1 receptor recovery;
- subjective THC tolerance;
- THC/metabolite detectability;
- intoxication;
- psychomotor impairment.

Never display invented values such as:

- “87% detoxed”;
- “82% receptors reset”;
- an exact guaranteed “clean date”;
- individual THC half-lives inferred from BMI;
- fake statistical confidence intervals;
- arbitrary metabolism multipliers.

---

## Architecture

Preferred v1 pipeline:

Questionnaire  
→ validation / normalisation  
→ deterministic engines  
→ evidence rules  
→ structured result  
→ optional DeepSeek V4 Flash Thinking interpretation  
→ UI

There are two separate calculation engines.

### Tolerance Engine

Owns:

- recommended break interval;
- preferred target duration;
- evidence confidence;
- personalisation confidence;
- withdrawal timing anchors;
- explanation of major drivers;
- conservative use of previous personal break history.

### Detection Engine

Owns:

- matrix-specific detection interpretation;
- cutoff-aware estimates when cutoff is known;
- uncertainty;
- long-tail warnings;
- laboratory-stratum logic only where justified.

Matrices:

- urine;
- blood;
- oral fluid;
- hair.

Future extension:

- jurisdiction-specific Detection Packs;
- Ireland should be the first jurisdiction pack;
- do not invent or hardcode Irish roadside rules until separately verified.

---

## Deterministic layer vs AI

Scientific numeric outputs are deterministic.

The calculation/evidence layer owns:

- T-break ranges;
- target duration;
- detection ranges;
- cutoff logic;
- withdrawal timing anchors;
- evidence grades;
- confidence categories.

DeepSeek V4 Flash Thinking is optional and acts only as an interpretation layer.

DeepSeek may generate:

- personalised explanation;
- prioritised break plan;
- interpretation of prior break/check-in history;
- likely difficult stages;
- post-break strategy;
- trigger / implementation-intention plan;
- explanation of uncertainty.

DeepSeek must NOT independently invent or change:

- scientific numeric ranges;
- individual half-lives;
- pharmacokinetic multipliers;
- test cutoffs;
- evidence grades;
- reset percentages;
- guaranteed negative-test dates.

The app must remain fully useful if the AI API is unavailable.

---

## DeepSeek runtime design

Preferred model:

DeepSeek V4 Flash Thinking.

Default reasoning:

standard / medium.

Escalate only for unusually complex longitudinal user history.

Send only the minimum required data:

- validated use profile;
- deterministic calculator result;
- relevant previous-break history;
- relevant recent check-ins;
- compact evidence anchors if required.

Do not send the full research corpus on every request.

Suggested short runtime instruction:

> Interpret the supplied deterministic T-Break result. Do not recalculate or modify evidence-derived numeric ranges. Do not invent pharmacokinetic parameters. Personalise the explanation, break plan, likely difficult stages, post-break strategy and interpretation of prior break history. Clearly distinguish evidence from inference. Return the supplied JSON schema only.

---

## Tolerance Engine — v1

Available human evidence supports the following broad product anchors:

- recovery begins during the first days of abstinence;
- several days can produce a noticeable reduction in tolerance;
- around four weeks is the strongest broad biological reference point for chronic/daily users;
- four weeks must NOT be presented as an exact universal “100% reset”.

Initial product heuristic:

| Use profile | Recommended starting range |
|---|---:|
| Very infrequent use | 2–7 days |
| Regular, non-daily use | 7–14 days |
| Frequent use | 14–21 days |
| Daily/heavy/high-potency use | 21–28 days |
| Multiple daily sessions / heavy concentrates | ~28 days as default strong target |

These are product heuristics, not validated clinical equations.

For very infrequent users the app may instead say that baseline tolerance is likely already low and that a long break may have diminishing returns.

Primary drivers:

- THC-use days in the last 30 days;
- sessions per use day;
- duration of current pattern;
- approximate quantity;
- potency;
- concentrates / high-potency products;
- previous T-break response;
- user goal.

Do not create direct numerical multipliers from:

- sex;
- age;
- BMI;
- hydration;
- exercise;
- self-rated fast/slow metabolism.

If such information is retained at all, it should mainly affect uncertainty rather than multiply days.

---

## Withdrawal timeline

Default evidence-informed anchors:

- onset: roughly days 1–3;
- common peak: roughly days 2–6;
- most acute symptoms improve substantially within roughly days 4–14;
- sleep-related symptoms may last longer in heavier users.

The app should explain this as a typical population pattern, not a guaranteed individual schedule.

Daily check-in should stay short:

- craving 0–10;
- sleep 0–10;
- irritability 0–10;
- anxiety 0–10;
- appetite 0–10;
- used THC: yes/no;
- optional note.

Do not turn check-ins into a fake medical monitoring dashboard.

---

## Detection Engine

Detection must be treated separately from tolerance.

Core principles:

- detectable THC/metabolites do not automatically imply current impairment;
- feeling sober does not guarantee a negative test;
- detection depends heavily on matrix, cutoff, method and use history;
- no exact guaranteed negative date.

### Urine

Most useful variables:

- frequency and chronicity of use;
- cutoff;
- days since last use;
- if available, quantitative THCCOOH plus creatinine-normalised result.

Without laboratory baseline data, return broad ranges with lower confidence.

The result should look like:

> Likely range: X–Y days  
> Longer residual detection remains plausible.  
> Confidence: Low / Moderate  
> Main uncertainty: no baseline creatinine-normalised THCCOOH.

Never:

> You will be clean on 17 September.

### Blood

Do not provide one universal blood-clearance window.

Very low measurable THC can persist much longer in chronic users when highly sensitive analytical methods are used.

Presence of trace THC must never be translated directly into impairment.

### Oral fluid

Detection is highly cutoff-dependent and generally operates on a much shorter time scale than urine.

If cutoff/test technology is unknown:

- widen the estimate;
- lower confidence;
- say explicitly that test characteristics are a major uncertainty.

### Hair

Do not calculate a precise “clear date”.

Hair should be described as a retrospective exposure matrix rather than a day-level clearance clock.

---

## Drivers / workplace testing

The app should eventually support different contexts:

- workplace testing;
- roadside testing;
- general curiosity.

Roadside testing must become jurisdiction-specific.

Ireland should be the first verified jurisdiction pack.

Do not assume that generic oral-fluid thresholds equal Irish Garda roadside practice.

---

## Detox / flush methods

The app should clearly separate wellbeing advice from claims of faster THC clearance.

### Time + abstinence

Only reliable fundamental mechanism for reducing residual cannabinoid burden.

### Normal hydration

Useful for wellbeing.

May alter urine concentration.

Must NOT subtract days from detection estimates.

### Excessive water

May dilute urine.

Dilution is not faster THC elimination.

Never recommend it as a detox method.

### Exercise

Reasonable for general health, routine and wellbeing.

Do not assign a “days saved” value.

Do not claim it reliably flushes THC.

### Sauna / sweating

No clearance bonus.

### Fasting

No clearance bonus.

### Cranberry juice / lemon water / vinegar / detox tea

No clearance bonus.

### Niacin

No proven detox benefit.

Do not recommend high-dose niacin for attempting to alter drug-test results.

### Diuretics

Do not recommend as THC-flush tools.

Absolutely do not implement logic like:

exercise = true → days × 0.85  
3 L water → days × 0.90  
fast metabolism → days × 0.80

---

## Questionnaire

Use branching rather than showing all questions to everyone.

Minimum core intake should focus on inputs that can materially change output.

Likely core questions:

1. Main goal:
   - tolerance reset;
   - reduction;
   - abstinence;
   - detection information.

2. THC-use days in the last 30 days.

3. Sessions per use day.

4. How long the current pattern has lasted.

5. Products:
   - flower;
   - concentrate;
   - edible;
   - oil;
   - other.

6. Approximate amount.

7. Typical THC potency if known.

8. Route:
   - smoking;
   - vaping;
   - dabbing;
   - oral;
   - sublingual;
   - other.

9. Date/time of last THC use.

10. Previous T-break:
    - duration;
    - subjective tolerance reduction;
    - notable withdrawal pattern.

11. Current withdrawal / dependence symptoms only when relevant.

12. Test context only when Detection is selected:
    - matrix;
    - cutoff if known;
    - planned test date if relevant;
    - quantitative baseline result if available.

13. Post-break goal:
    - continue abstinence;
    - occasional controlled use;
    - reduced regular use.

Age, sex, BMI, medications and health details should NOT automatically appear in the core intake.

Only collect additional sensitive information if it materially changes a supported output.

---

## Nominal THC exposure

The app may calculate nominal THC content:

flower grams × 1000 × THC fraction.

Example:

0.5 g × 1000 × 20% = 100 mg nominal THC in the plant material.

Do NOT label this as absorbed THC.

Actual delivered/absorbed dose varies heavily by route and behaviour.

Keep:

`nominal_thc_mg`

separate from any future exposure estimate.

---

## Personalisation from previous breaks

Longitudinal user history is potentially more valuable than demographic guesses.

Example:

Break 1: 14 days → reported tolerance reduction 6/10  
Break 2: 21 days → 9/10  
Break 3: 18 days → 8/10

The app may then say:

> In your previous breaks, most of the reported benefit appeared between days 14 and 21.

This is personal historical inference, not a validated population prediction.

Never turn it into fake statistical precision.

Useful long-term metrics:

- THC-use days / 30;
- sessions / use day;
- nominal monthly THC exposure;
- craving trend;
- sleep trend;
- unplanned-use episodes;
- time between breaks;
- subjective tolerance score;
- previous break duration and outcome.

---

## Break plan

Before starting:

- choose start date;
- target duration;
- primary goal;
- post-break mode;
- common triggers;
- fallback plan.

Typical triggers:

- evenings;
- gaming;
- sleep;
- weekends;
- alcohol;
- boredom;
- stress;
- specific social contexts.

Support simple implementation intentions:

> If X happens, I will do Y before deciding whether to use THC.

During days 1–6, prioritise:

- routine;
- sleep schedule;
- normal eating;
- normal hydration;
- avoiding known triggers;
- simple replacement activity;
- short daily check-in.

During days 7–14:

- compare symptoms with baseline;
- show progress;
- distinguish withdrawal improvement from tolerance-reset goal.

During days 14–28:

- focus progressively more on habit and behavioural patterns rather than “detox”.

---

## Post-break return

This is a core product feature.

Do not allow the message:

> Tolerance reset complete, return to your old dose.

Principle:

previous exposure ≠ restart exposure.

If the user returns to THC:

- assume tolerance may be lower;
- start substantially below previous exposure;
- favour lower-potency products where practical;
- avoid immediately returning to concentrates;
- avoid rapid repeat dosing;
- treat oral THC separately because onset is delayed;
- set frequency and quantity limits in advance;
- identify escalation triggers.

Post-break modes:

### Continue abstinence

Maintain progress and history.

### Occasional

User defines a maximum number of THC-use days per week.

### Reduced regular use

User defines:
- max use days/week;
- max sessions/use day;
- potency strategy;
- quantity strategy.

Possible product-rule example:

If the user exceeds their own planned limit repeatedly, trigger a review/pause recommendation.

Clearly label such rules as product behaviour, not clinical laws.

---

## Local-first persistence

Suggested objects:

- UserProfile;
- UsePattern;
- ProductExposure[];
- BreakSession;
- DailyCheckin[];
- TestContext[];
- PreviousBreak[];
- PostBreakPlan.

Keep history local by default, preferably IndexedDB.

AI requests should contain only the minimum relevant subset.

---

## Confidence model

Use qualitative confidence only:

- Low;
- Moderate;
- High.

Keep two concepts separate where useful:

### Evidence confidence

How strong is the evidence behind the general rule?

### Personalisation confidence

How well can this particular user's result be estimated from available inputs?

Do not invent numerical probability or statistical CI values.

---

## UX principles

The app should feel like a practical THC tool, not a medical intake form.

Desired characteristics:

- fast;
- mobile-first;
- branching questionnaire;
- one question / small group at a time;
- dark premium visual style;
- concise explanations;
- useful timelines;
- obvious uncertainty without walls of disclaimers.

Primary result card example:

> Recommended T-Break: 21–28 days  
> Strong target: 28 days  
> Evidence confidence: Moderate  
> Personalisation confidence: Moderate

Then show WHY:

- 27/30 THC-use days;
- multiple daily sessions;
- high-potency concentrate use;
- previous-break response.

Do not show fake detox percentages.

---

## Development workflow / model routing

For every coding or design task:

1. choose the lightest model likely to succeed;
2. choose the lowest sensible reasoning/effort;
3. then write the prompt.

Prompts should be lean:

- goal;
- only necessary context;
- constraints;
- definition of done.

Do not paste the full project context when the agent can read repo files.

For continuation in an existing coding session, prompts should be even shorter.

Preferred rough roles:

### GPT-5.6 Sol

Architecture, scientific/calculator logic, difficult bugs, final arbitration.

Use High for major architecture/spec work.
Do not default to Max.

### GPT-5.6 Terra

Medium-difficulty engineering tasks requiring repo understanding.

### GPT-5.6 Luna

Small scoped implementation, tests, cleanup and straightforward fixes.

### Kimi K2.6

Research support, summarisation, organising source material.

### Kimi K2.7 Code

Coding workhorse for clearly specified multi-file tasks.

### Kimi K3

Long-context review, frontend/UX, second-opinion architecture.

### DeepSeek V4 Flash

Cheap implementation workhorse.

Also the preferred optional runtime AI interpretation model.

### DeepSeek V4 Pro

Engineering review, harder bugs, escalation above Flash.

### Grok 4.6

Alternative UI/product concepts, interactive UX review and exploratory user-perspective testing.

Avoid having several models independently edit the same problem without a controlled review step.

Preferred pattern:

strong model plans/reviews  
→ cheaper model implements  
→ independent reviewer checks  
→ small fixes by cheaper model.

---

## Current next step

Do NOT immediately start building screens.

First produce authoritative project specifications from this context:

- `CALCULATOR_SPEC.md`
- `ARCHITECTURE.md`

The specs must make the scientific/product rules explicit enough that a coding agent cannot silently invent missing logic.

After that:

1. adversarial review of the specs using a different model;
2. resolve contradictions;
3. break implementation into small slices;
4. build deterministic engines first;
5. build questionnaire/results UI;
6. add persistence/history;
7. add optional DeepSeek V4 Flash Thinking interpretation;
8. verify Ireland-specific detection rules separately before enabling that jurisdiction pack.

---

## Definition of product success

The v1 succeeds if:

- it gives useful T-break ranges without fake precision;
- it clearly distinguishes tolerance from detectability;
- it remains useful with AI disabled;
- it uses personal history conservatively;
- it explains uncertainty instead of hiding it;
- it does not reward detox folklore with fake numerical bonuses;
- it gives users a concrete break and post-break plan;
- another coding agent can work from the specs without inventing the scientific logic.
