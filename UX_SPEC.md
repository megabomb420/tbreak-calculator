# T-Break UX specification

Version: **0.38.0**

Current revision (1.0.0): the recovery outlook is retired as a user-facing concept and mode. The result screen is one body, in this order: plan target with planning range and uncertainty → the break journey ("what to expect") → **Why this plan** → an always-visible research section, **What the research can and cannot say** (the four-week human CB1 PET reference, the "what this does not mean" list, and links to Hirvonen, D'Souza and Budney) → history → answers. The app no longer estimates a personal recovery window or date; a saved result that still carries an outlook version is explained by one line in that research section and never recomputed. Navigation is Today and History; starting a plan is a sheet opened from Today, with **Support topics** beside it in the footer and a one-time ask after a break calculation finishes (see §17). Today keeps the day itself on the page — **This stage**, the topic action with **Why this helps**, and Experiences — while the long material sits behind one row each: **What you may notice** in the stage, **What else can help** in the guide (the remaining steps, **What to avoid**, **When to get advice** and sources), **Your break timeline**, and **Manage break**. Every one of the eleven guides carries an explanation, practical steps, **What to avoid** and its sources, plus **When to get advice** where one applies, and Experiences follow the selected topic, capped at eight. **Help with** is a native select containing today's suggestion and all eleven guides; switching topics replaces the block in place and writes nothing. **Manage break → Update last use** confirms a new anchor while preserving earlier segments; cancel changes nothing. History rows carry local dates and distinguish elapsed complete days from day position. Deleted recommendations are not regenerated from leftover snapshots. Browser zoom is supported. Numeric policies and historical calculation meanings are unchanged. Release history lives in HANDOFF.md and Git history.

## 1. Product framing and design principles

### 1.1 What this app is

A mobile-first, installable, local-first PWA for THC users. It serves four goals:

- reset tolerance / feel THC strongly again (`tolerance_reset`);
- reduce use (`reduction`);
- continue abstinence (`abstinence`);
- drug-test detection information (`detection_information`).

It is a focused utility, not a wellness platform, not a medical intake, not a marketing site.

### 1.2 Design principles

1. **Fast to an answer.** Cut down takes two inputs after choosing the goal; the longest tolerance path is six steps including the goal. A daily user reaches a recommended range in under a minute. `currentPatternDuration` is the first substantive use-profile question on every route that uses it, so the planner target is known before frequency details are collected. Nothing else is asked after the calculation.
2. **One decision per screen.** One question, or one very small logical group, per step. No long scrolling forms anywhere.
3. **Buttons over keyboards.** Sliders, steppers, chips, and date wheels by default. Free text exists in exactly one place: the optional check-in note.
4. **Ask only what can change the output.** If an answer cannot affect the deterministic result, the plan, local history, or the contextual explanation shown for that result, the question is not in the flow. `currentPatternDuration` is allowed because it changes the planning target inside the recommended range (tolerance-v3 anchor rule), Why-this-plan copy, and break-outlook wording — and, in the single bounded tolerance-v3 case (a frequent 16–25 use-days pattern established for 2–5 / 5+ years), the recommended range itself by one band; it is never a days-added formula.
5. **Honest by construction.** No reset percentage, detox percentage, guaranteed clean date, exact universal reset date, or numeric detection window — these outputs do not exist in the engines and MUST NOT be simulated visually (no fake "receptor recovery" rings).
6. **Tolerance ≠ detection ≠ impairment.** Separate goals, separate flows, separate result cards, visually and verbally separated.
7. **Estimates are first-class.** Users remember "about two weeks ago," not ISO timestamps. Every date question offers coarse, human answers; the UI converts them to the required timestamp shape.
8. **Offline is the default.** Every v1 feature is deterministic and local. The app never blocks on network state.
9. **No account in v1.** No login, signup, email, or cloud prompt anywhere.
10. **Plain language.** Engine identifiers (`heuristic_frequency_intensity_v3`, `SourcedValue`, `breakDay`) never appear to users. Message codes map to human copy in one template layer (§14).
11. **Defer life-admin questions.** Anything not needed for the *initial* result (previous-break history, post-break intentions) moves to the contextual moment where it becomes useful.

### 1.3 Terminology shown to users

| Internal term | User-facing term |
|---|---|
| tolerance break / T-break | "break" or "T-break" |
| `thcUseDaysLast30` | "days you used THC in the last 30 days" |
| `sessionsPerUseDay` | "sessions on a typical use day" |
| `currentPatternDuration` | "how long this current pattern has been typical" |
| `lastUseAt` | "when you last used" |
| `recommendedRangeDays` | "recommended break" |
| `preferredTargetDays` | "planning target" |
| `nominal THC` | "nominal THC" (exact label mandated by spec §6) |
| `DetectionMatrix` | "test type" |
| `BreakAttempt` | "your break" / "current break" |
| `interrupted_time_needed` | "break paused — confirm when you used" |
| `toleranceReductionScore` | "how much it helped (0–10)" |

---

## 2. Time and clock semantics (read first — everything depends on this)

V1 has exactly three time concepts. These definitions are binding for every screen:

1. **`lastUseAt` — the anchor.** The user's estimated last-use instant. It is the single authoritative timestamp for the engines, the withdrawal timeline, day counters, and break segments. It is always a `user_estimate`; it is never presented as exact.
2. **Break day — the abstinence clock.** `breakDay = floor((now − lastUseAt) / 24 h) + 1`, computed by the engine. It runs from the anchor **whether or not a plan exists**. Day counters, withdrawal position, and plan progress all read `breakDay`; the UI MUST NOT compute its own day math.
3. **Plan start — the commitment marker.** The date the user commits to not using (chosen at break start; default "now"). It does **not** move the anchor and does **not** restart the clock. If the user last used 3 days ago and starts the plan today, the plan begins at "Day 4 of 28". This is intentional: the plan target is anchored to abstinence time, not to when the user tapped a button. The plan-start screen states this plainly: "Your clock is already at day 4 — your target date counts from your last use."

Completion is available only at or after the target instant. Day 1 represents zero complete elapsed days. The progress ring uses completed days divided by target days; reaching the target and completing the plan use the same boundary. The first full day after the target is the reached state, followed by beyond-plan guidance.

Target date = current segment's anchor + `targetDurationDays` × 24 h, recomputed by the engine after an interruption. The UI renders, never recomputes.

Interruption semantics: a confirmed `usedAt` becomes the new anchor; the previous segment closes and a new one begins; the target duration is unchanged; the target date moves. Copy: "Plan restarted from your latest use" — never "your progress reset to zero".

Timezone changes reformat displays only; stored instants are UTC.

---

## 3. App structure and navigation

### 3.1 Shell model — two permanent destinations

```text
┌─────────────────────────────┐
│  Screen title           ⚙   │  <- gear opens Settings (modal)
│                             │
│  Screen content (one job)   │
│                             │
│  ┌───────────────────────┐  │
│  │ Primary action        │  │  <- thumb zone
│  └───────────────────────┘  │
├─────────────────────────────┤
│   Today      │   History   │  <- permanent destinations
└─────────────────────────────┘
```

- **Tabs (2):** `Today`, `History`. Starting a plan is an action, not a destination: a quiet **Start a new calculation** link on Today (labelled **Pick my own break length** on first launch) opens the new-calculation sheet — the four goals, **Choose my break length**, an unfinished calculation and **View saved plan**. Opening it does not end a live break, and nothing about a running plan is something to navigate away from.
- **Tab bar layout:** one equal column per destination (`grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr)`), never a fixed column count — the bar must stay even whatever the destination list is.
- **Settings:** gear icon, top-right of every tab header, opens a modal screen. Settings is a rare destination; a permanent tab for it is wasted chrome.
- **Science:** a source-linked reading screen opened from the header or Settings. Closing it returns to its origin.
- **Break plan:** not a tab and not a separate screen. The active-break card on `Today` *is* the plan: hero head (Day X of Y, target date), the full-width **Check in** action, **This stage**, the day's advice with its reason, Experiences for that topic, the always-open break timeline, and break management behind one summary. Users think "how is my break going," which is a Today question.
- **Transient full-screen flows** (slide over the shell, own close/back, never in nav):
  - the questionnaire;
  - the new-calculation sheet (four goals, a chosen break length, an unfinished draft, the saved plan);
  - the support-topics sheet (what the app should help with), opened after a break calculation finishes and from Today's footer;
  - the delay timer (**Ride it out**), opened from the day's advice card and resumed from the same place while it runs;
  - the result view reached from the questionnaire (a result opened from History is a normal pushed screen);
  - the nominal THC calculator sheet;
  - interruption confirmation ("confirm when you used");
  - add/edit previous break;
  - break-start sheet (start date + post-break mode).
- **Rule of thumb:** deciding or entering = flow; looking = tab or pushed screen.

### 3.2 `Today` states

Exactly one primary state at a time:

| State | Condition | Content |
|---|---|---|
| `first-launch` | no data at all | Welcome (§3.3), CTA **Get started** |
| `no-profile` | returning, never finished a questionnaire | Goal chips (same four options as Q1), each launching the questionnaire pre-selected |
| `profile-no-break` | result saved, no active attempt | Saved result card. For a tolerance result the card reuses the shared Your-plan result lens (§9): the planning target leads (`28 DAYS`), the evidence range + RangeBand sit beneath it, and **Start this break** is the primary action with **Recalculate** / **View result** secondary. Other result kinds use the matching compact summary card. |
| `active-break` | attempt `active` | Day/target hero, recorded-check-in count, direct check-in with Undo, stage headline and one practical action. **This stage**, **Help with** (today's suggestion or any of the eleven guides: the action and **Why this helps** on the page, the remaining steps, **What to avoid**, **When to get advice** and sources one tap away) and **Experiences** for the selected topic stay open; **Your break timeline** and **Manage break** are disclosures, the latter offering last-use correction and ending early; **Mark complete** appears from the target instant. No session logger or rating sheet. |
| `interrupted` | legacy attempt `interrupted_time_needed` | Upgrade-safe recovery surface for an older pending use report. Timing is suspended; **Confirm when** or dismiss the unconfirmed report. New releases do not create this state from active-break Today. |
| `completed-break` | attempt `completed`, unacknowledged | Completion card ("Break complete — 28 days"), post-break plan summary; acknowledging once flips to `profile-no-break` |
| `abstinence-tracking` | ongoing abstinence tracking, no active attempt | "Day N since your last use", check-in CTA, no target date, no completion state |
| `reduction-active` | live (non-ended) active reduction plan, no break/tracking state | Reduction card: two meters for distinct use days in the rolling seven-day window and sessions today; **Log a session**, **Edit plan**, **Pause**, **End plan**. Two breach days prompt **Adjust limits** and **Pause plan**. No tolerance recalculation occurs from logs. |
| `detection-only` | user has only run detection | Last detection summary card, CTA **Get a break recommendation** |

**Precedence:** `interrupted` > `active-break` > `completed-break` (until acknowledged) > `abstinence-tracking` > `reduction-active` > `profile-no-break` > `no-profile` > `first-launch`. The `detection-only` state applies only when no profile or tracking exists at all; once any calculation or tracking exists, those states win and detection history lives in `History`.

**Questionnaire resume:** drafts persist after substantive answers, not goal selection alone. The resume card offers **Resume** and **Discard**. A live break or cut-down plan stays primary; the draft is secondary. Resuming retains the saved answers; discarding never removes a saved calculation or live plan.

### 3.3 First launch

One screen, no carousel:

- Title: **A little space from THC.**
- Promise: "Taking a t-break, cutting back, or stopping? Keep your days, check-ins and practical tips in one place."
- Three reassurance lines (icon + one line): works offline · stored only on this device · no account needed.
- Safety/eligibility block: slot `safety_first_launch` — ships in place as the following lines, in this order. **For adults.** is a visible paragraph; the four lines after it sit in a closed **Before you start** disclosure inside the same slot, so the CTA is not pushed below five paragraphs:
  - For adults.
  - Planning guidance only — not medical advice or a guaranteed drug-test result.
  - Qualitative information only — this app doesn't estimate detection windows or test outcomes. This is not a flush protocol and not advice for influencing a drug test.
  - Get help if withdrawal feels unmanageable, or if you are worried about harming yourself or someone else — a clinician or drug support service can help you make a workable plan.
  - Chest pain, fainting or serious breathing difficulty need urgent assessment. If you might act on thoughts of self-harm, seek emergency help now.

  Every line but the first is wording the app already publishes (`result-presentation.ts`, `evidence-guidance-v1.ts`, `daily-support.ts`); nothing here is newly written safety copy. **Still owed by a clinical reviewer before release** (`CALCULATOR_SPEC.md` §14): health warnings for pregnancy, medication interactions and existing conditions, and a jurisdiction-specific urgent-help route (a service or number — none exists in this repository, so none is shown).
- CTA: **Get started** → questionnaire Q1.

No install gate, no notification prompt, no sign-in. Install is offered from Settings and as a passive banner after the first completed calculation.

---

## 4. Questionnaire — global behaviour

### 4.1 Step anatomy

```text
┌─────────────────────────────┐
│  ✕        ▓▓▓░░░░░░░        │  <- close + slim progress bar
│                             │
│  Step title (the question)  │
│  Optional one-line helper   │
│                             │
│  [ Answer control ]         │
│                             │
│  ┌───────────────────────┐  │
│  │ Continue              │  │  <- sticky bottom, above safe area
│  └───────────────────────┘  │
│  Back (text button)         │
└─────────────────────────────┘
```

- **Progress:** slim determinate bar, not "Step 3 of 12" (branching makes counts dishonest). It fills along the resolved path and never moves backward when a branch removes steps.
- **Back/edit:** `Back` returns to the previous *shown* step. Changing an answer re-runs branching from that step; still-valid answers are kept, invalidated ones dropped silently. No separate review page; the result screen's "Your answers" rows provide per-row edit (§9.1).
- **Continue gating:** disabled until the step's required answer exists. Per-step validation is immediate; cross-field rules are prevented by control constraints (§4.4).
- **Close (✕):** persists answers, returns to `Today` (resume card per §3.2).
- **Motion:** horizontal slide, 250 ms ease-out; instant swap under `prefers-reduced-motion`.

### 4.2 Control inventory

| Control | Used for | Notes |
|---|---|---|
| Large single-select cards | goal, matrix, context | full-width, min 56 pt, one tap selects **and** advances |
| Multi-select chips | products, routes | toggling does not advance; `Continue` required |
| Slider with live readout | use-days (0–30), previous-break score (0–10) | min 44 pt thumb, value label above thumb |
| Stepper (− value +) | sessions, previous-break duration, flower grams, user plan limits | tap-hold repeats; tapping the value opens a numeric pad escape hatch |
| Date wheel + day-part chips | last use, previous-break end, interruption `usedAt` | §4.3 |
| Direct action | one-tap no-use check-in; THC-session logging only inside an active cut-down plan (§10.2) | explicit Undo for check-in |
| Text fields | optional trigger, replacement and fallback at break start | private, stored on this device |

### 4.3 Date/time entry (maps to `SourcedValue<timestamp>`)

All date questions use one composite control:

1. **Quick chips:** `Today`, `Yesterday`, `2–3 days ago`, `About a week ago`, `About 2 weeks ago`, `About a month ago`, `Pick a date`.
2. **Pick a date** opens a date wheel **constrained to the valid window for that step** (see per-step windows in §5 — constraints make contradictions impossible by construction).
3. **Day-part chips** on the same screen: `Morning` / `Afternoon` / `Evening` / `Night` → fixed local hours 09:00 / 13:00 / 18:00 / 23:00. For `Today`, the value is the current time (validation rejects only future instants). Ranges like `2–3 days ago` map to the midpoint at the chosen day-part.

The UI submits an ISO-8601 string with the device UTC offset; provenance is always `user_estimate`. Helper on every date step: "A rough answer is fine — the calculator works in whole days."

Day-part mapping can shift the true instant by up to ~12 h. Acceptable: every downstream display is day-granular, and a minute picker would be fake precision. (Flagged §15, R3.)

### 4.4 Validation strategy

- Sliders/steppers/date wheels are constrained by construction and cannot emit invalid values.
- The two-way 30-day contradiction rules (`lastUseAt` vs `thcUseDaysLast30`) are **designed out of the flow**: use-days is asked first; the last-use date wheel's window is then derived from the use-days answer (§5). A fresh path cannot produce a contradiction.
- Edits: changing use-days re-constrains the last-use step; if the stored last-use instant falls outside the new window, that step is re-shown with: "That date doesn't fit your updated answer — pick a date within the last 30 days." The app never silently rewrites an answer.
- Defense in depth: if a `validation_error` still reaches the coordinator, the flow routes to the first contradictory field with the same treatment. A `validation_error` is never rendered as a result screen.

### 4.5 Terminal states

Every path ends in exactly one of:

1. **Tolerance result** (`tolerance_result`) — §9.1.
2. **Abstinence planning** (`planning_only`) — §9.3.
3. **Reduction (cut-down) planning** (`planning_only`, goal = reduction) — §9.4.
4. **Baseline-low** (`not_applicable`) — §9.5.
5. **Detection result** (`qualitative_only`) — §9.6.

---

## 5. Questionnaire flows (exact order, branching, copy)

### 5.1 Master branching map

```text
Q1 goal
 ├─ tolerance_reset
 │    Q6 current-pattern duration → Q2 use days
 │      ├─ 0     → Q3-opt last use (optional, >30 days ago only) → TERMINAL baseline-low
 │      ├─ 1–3   → Q3 last use (≤30 days) → TERMINAL tolerance result
 │      └─ 4–30  → Q3 last use (≤30 days) → Q4 sessions → Q5 products & routes → TERMINAL tolerance result
 ├─ reduction
 │    Q2 use days
 │      ├─ 0     → TERMINAL baseline-low
 │      └─ 1–30  → Q4 typical sessions → TERMINAL reduction planning
 ├─ abstinence
 │    Q6 current-pattern duration → Q2A last use (any past date, or "I still use — today") → TERMINAL abstinence planning
 └─ detection_information
      Q2D test type → Q3D situation → TERMINAL detection result (no Q6)
```

Post-break mode and previous-break history are deliberately **not** in the initial questionnaire — see §7 and §8 for their contextual flows.

Field mapping:

| Step | Schema field | Shown when |
|---|---|---|
| Q1 | `goal` | always |
| Q6 | `currentPatternDuration` (`user_estimate`) | first use-profile question after Q1 on tolerance-reset and abstinence; skipped on reduction and detection |
| Q2 | `thcUseDaysLast30` (`user_estimate`) | tolerance-reset after Q6; immediately after Q1 on reduction |
| Q2A / Q3 / Q3-opt | `lastUseAt` (`user_estimate`) | abstinence; use-days 1–30; optional when use-days = 0 |
| Q4 | `sessionsPerUseDay` (`user_estimate`) | tolerance-reset at 4–30 use-days; reduction at 1–30 use-days |
| Q5 | `products[]`, `routes[]` | range-requested routes, use-days 4–30 only |
| Q2D | `DetectionRequest.matrix` | detection goal |
| Q3D | `DetectionRequest.context` | detection goal |

Q4/Q5 are asked on range-requested routes from **4 use-days up** because the tolerance-v3 classification reads intensity signals at that boundary (`tolerance-policy-v3`: sessions ≥ 2, concentrates, or dabbing can move a 4–15 use-day profile one adjacent band to 14–21, and a 16–25 use-day profile to 21–28). Asking a 1–3 use-day user about concentrates cannot change their 2–7 result, so those fields are optional there and never required at 0. Q6 is the first use-profile question because duration is exposure context for Why-this-plan, outlook wording, and — under tolerance-v3 — the planning-target anchor inside the range, with one bounded range move for an already-frequent (16–25 use-days) long-established pattern; it is never a days-added formula. Zero use-days is only discovered after Q6, so a 0-day tolerance_reset completion carries a stored duration band that the baseline-low result ignores. A 4–15 use-day profile that also involves concentrate or multi-session use IS routed to Q4/Q5 and classified one adjacent band up; the rationale explains that intensity moved the band.

### 5.2 Step-by-step copy deck

**Q1 — Goal** (single-select cards, tap advances)

> **What do you want to do?**
>
> - **Reset my tolerance** — feel THC strongly again
> - **Cut down** — reduce how much I use
> - **Stay off THC** — I'm quitting or already have
> - **Drug test info** — understand detection basics

`Q2R` remains a parseable legacy step id so an old saved draft can migrate safely, but no current route renders it. **Plan a T-break instead** changes the goal to tolerance-reset and enters that questionnaire directly.

**Q2 — Use days** (slider 0–30, large readout; quick presets under the slider: `Rarely (1–3)`, `Weekends (≈8)`, `Most days (25)`, `Daily (30)`)

> **In the last 30 days, on how many days did you use THC?**
>
> Helper: "Count any day you used, even once. A rough number is all the calculator uses."

Presets set the slider (which can then be fine-tuned). No "I don't know" — the engine requires this integer; the preset chips make a rough answer effortless.

**Q3 — Last use** (date control §4.3; wheel constrained to the last 30×24 h)

> **When did you last use THC?**
>
> Helper: "A rough answer is fine — the calculator works in whole days."

**Q3-opt — Last use, optional** (use-days = 0 only; wheel constrained to *older than* 30×24 h; **Skip** button)

> **When was your last use?** *(optional)*
>
> Helper: "Adds a 'days since' counter to your result. Skip if you don't remember."

**Q2A — Last use (abstinence)** (date control, unbounded past; extra chip `I still use — today is day 1`)

> **When did you last use THC?**
>
> Helper: "If you're quitting now, pick today — your timeline starts from here."

**Q6 — Current-pattern duration** (single-select cards, tap advances; product UX bands, not medical cut-points)

> **How long has this level of THC use been typical for you?**
>
> - **Less than 1 month** — This level is still new
> - **1–6 months** — A few months at this level
> - **6–24 months** — About 1–2 years at this level
> - **2–5 years** — A few years at this level
> - **5+ years** — This has been typical for a long time
>
> Helper: "Not how long you have ever used — how long this current pattern has been your usual level."

This is **not** lifetime cannabis use. The answer selects the planning target inside the recommended range (a recently established pattern — under 1 month / 1–6 months — targets the lower end; a pattern established for 6+ months, or a legacy profile with no answer, targets the upper end), plus Why-this-plan copy and break-outlook wording. It MUST NOT add, subtract, or multiply days as a formula. Under tolerance-v3 it may move the recommended range itself in exactly one bounded case — a frequent (16–25 use-days) pattern established for 2–5 / 5+ years is classified into the adjacent 21–28 band; every other duration answer leaves the range unchanged.

**Q4 — Sessions** (chips `1` `2` `3+`; stepper escape hatch up to 9)

> **On a day you used, how many separate sessions?**
>
> Helper: "One session = one sitting. Morning plus evening is 2."

`3+` sets 3. Values above 2 behave identically in the engine; the cap avoids implying precision that doesn't matter.

**Q5 — Products & routes** (one screen, two small chip groups — the only grouped step)

> **What have you been using, and how?**
>
> *Products* (multi-select): **Flower (bud)** · **Concentrates** (wax, shatter, resin) · **Vape (cart / pod / disposable)** · **Edibles** · **Oils / tinctures** · **Something else**
>
> *How you take it* (multi-select): **Smoking** · **Vaping** · **Dabbing** · **Eating or drinking** · **Under the tongue** · **Other way**
>
> Helper: "Pick all that apply."
>
> Subtle link under products, visible only when **Flower** is selected: "Know your flower's strength? Estimate its nominal THC →" (opens the §6 sheet; purely optional).

`Continue` disabled until ≥1 product and ≥1 route.

**Vape (cart / pod / disposable)** is a product form (`ProductKind = vape`). **Vaping** remains a route. V1 does not map vapes onto concentrate intensity, potency, dose, or PK.

**Q2D — Test type** (single-select cards)

> **Which kind of test are you asking about?**
>
> - **Urine**
> - **Blood**
> - **Saliva (oral fluid)**
> - **Hair**

Helper: "Not sure? Pick one to see its basics — you can check the others after."

**Q3D — Situation** (single-select cards)

> **What's the situation?**
>
> - **Just curious / general**
> - **Workplace testing**
> - **Roadside / driving**

Helper: "This only changes which notes we show you — it never changes the science."

### 5.3 Skip conditions (consolidated)

- Q6 (current-pattern duration) is the first use-profile question after Q1 on `tolerance_reset` and abstinence. It is skipped on reduction and detection. Zero use-days is only discovered after Q6 on the tolerance route; the stored duration band is then ignored by the baseline-low result.
- Q2 (use days) follows Q6 on the tolerance route and follows Q1 directly on reduction. Q3 (last use) appears only on tolerance when use-days ∈ 1–30; it is replaced by optional Q3-opt when tolerance use-days = 0.
- Q4/Q5 appear on tolerance when use-days ∈ 4–30 because intensity can change that classification. Reduction asks Q4 alone for every positive use-day answer because session frequency sets the behavioural plan baseline; it never asks Q5. Neither route asks Q4 at 0.
- Abstinence asks no use-days, sessions, products, or routes: none of them change the abstinence numeric output. Q6 is asked because duration still personalises the break-outlook wording.
- Reduction asks no last use, duration, product or route: the tracker needs only frequency and typical sessions. The engine attaches no withdrawal display and no target on this route.
- Detection is exactly 2 questions and collects no use profile (per `ARCHITECTURE.md` §6).
- Previous breaks and post-break mode never appear in the initial questionnaire (§7, §8).

### 5.4 Step counts per goal (final)

| Goal | Min steps | Typical | Max |
|---|---|---|---|
| tolerance_reset | 3 (use-days 0, Q3-opt skipped) | 4 (use-days 1–3) or 6 (use-days 4–30) | 6 (use-days 4–30) |
| reduction | 2 (use-days 0) | 3 (use-days 1–30) | 3 |
| abstinence | 3 | 3 | 3 |
| detection_information | 3 | 3 | 3 |

Duration (Q6) is counted only on the tolerance and abstinence routes that use it. Q4/Q5 are counted on tolerance from 4 use-days up; reduction uses only Q4 after a positive frequency answer. A 0-day tolerance-reset path remains 3 steps when optional Q3-opt is skipped and 4 when answered.

---

## 6. Nominal flower THC calculator

A modal sheet reachable from (a) Q5 when Flower is selected, (b) the result screen tools row. Never required, never blocking.

> **Nominal THC in your flower**
> This estimates the THC contained in the plant material itself.
>
> - **Amount of flower** — stepper, 0.1 g steps; quick chips `0.25 g` `0.5 g` `1 g` `3.5 g`.
> - **THC strength (%)** — stepper 1–40 %; provenance toggle directly beneath: **From the label** (`label_derived`) / **My estimate** (`user_estimate`). Helper: "Check the packaging if you have it. An estimate is fine."
>
> [ Calculate ]

Result card (same sheet):

> **0.5 g × 20 % = 100 mg nominal THC**
>
> This is the THC in the plant material — not the amount your body absorbs. How much you actually take in depends on how you consume it, and this app doesn't estimate that.

Rules: the label **nominal THC** is verbatim; never "dose", "absorbed", or "effective". The result never enters the use profile and never feeds the Tolerance Engine. `Calculate` stays disabled until both inputs exist. Amount/potency are asked **nowhere else** — no enabled v1 rule consumes them outside this calculator.

Not asked anywhere in v1: BMI, sex, age, hydration, exercise, metabolism, medications, pattern duration, amounts or potency in the main questionnaire, cutoffs, test dates, lab results.

---

## 7. Previous-break history (contextual, not intake)

Previous breaks are personalisation data: they produce a history insight **only against an existing tolerance result** and never change the range. Under tolerance-v3 a clean, directional, fully in-range history may additionally raise the planning target to the user's own observed anchor inside the range (a bounded product heuristic — never a new range and never above 28 days). They therefore do not belong in the initial questionnaire.

Entry points:

1. **Result screen prompt card** (below "Why this result", tolerance results only): "Taken a tolerance break before? Add it — next time, your result can include what your own history suggests." → add flow.
2. **History tab → Past breaks → Add.**

Add flow (single modal screen):

> **Add a past break**
> - **How long did it last?** — stepper, days, min 1. Chips: `1 week` `2 weeks` `3 weeks` `1 month`.
> - **How much did it reduce your tolerance afterwards?** — slider 0–10, anchors `Not at all` … `Completely`, plus **Not sure** chip (stores `null` score).
> - **When did it end?** — optional date wheel, **Skip** allowed (`endedAt: null`).
>
> [ Save ]  [ Save & add another ]

Each entry maps to one `PreviousBreak` (app-generated `id`, `createdAt = now`).

Rules:

- Records with `null` score are stored and listed but never contribute to an insight (engine rule).
- After adding history, a tolerance result screen offers **Recalculate with history** (explicit user action → new calculation record; the earlier record is preserved). The insight card then renders per §9.2.
- History copy is verbatim from §14; the UI never averages, interpolates, or renders an "optimal break".
- Deletion: per record, with confirm.

---

## 8. Post-break mode (collected at break start, not intake)

`postBreakMode` shapes the plan the user lives with after the break — it is irrelevant until the user actually starts one. It is therefore asked in the **break-start sheet**, together with the start date:

> **Start your break**
> - **Start:** `Now` / `Pick a date` (wheel, today forward 14 days)
> - **After this break, what's your plan?** (single-select cards)
>   - **Stay off THC**
>   - **Occasional use** — weekends or special occasions
>   - **Regular use, but less than before**
>   - **Not sure yet**
>
> Helper: "Nothing is locked in — you can change this in the plan later."
> Clock note, shown when `breakDay > 1` at start: "Your clock is already at day N — your target date counts from your last use."
>
> [ Start break ]

Creates a `planned` (future date) or `active` (now) attempt with `targetDurationDays = preferredTargetDays`. The mode is chosen at break start; once the break is running it stays as chosen and is shown read-only on the completion card. Abstinence users never see this — their mode is fixed to `continue_abstinence` and no finite break is created.

Post-break plan presentation (after completion, and from History), by mode:

| Mode | UX |
|---|---|
| `continue_abstinence` | Progress/history only; no return-to-use controls |
| `occasional` | One setting: **max use days per week** (stepper 1–7) |
| `reduced_regular_use` | Four user-defined settings: max use days/week, max sessions/use day, potency strategy (`Lower` / `Same` / `Mixed`), quantity strategy (`Smaller` / `Same`) |
| `undecided` | Qualitative options list; nothing to set |

Every post-break screen leads with two direct messages (spec §10): "Tolerance may be lower after the break" and "Do not treat your previous amount as a restart amount." No numeric dose anywhere. Guidance chips: prefer lower potency, go slow with concentrates, edibles hit later. Manual review/pause only — no automatic exceedance threshold, no nag states.

---

## 9. Result information architecture

### 9.1 Tolerance result screen (`tolerance_result`)

The result screen is one body: one scroll from the plan target to the answers, with no second mode to switch into. The app does not estimate a personal recovery window or date anywhere. In scroll order:

1. **Primary card — plan target first, evidence range beneath:**

   > **Your plan**
   > Plan for **28 days**
   > Planning range: 21–28 days
   > Limited certainty: this is a broad planning heuristic, and individual response varies.

   The hero element is the actionable planning target (large “N days” numeral, accessible label “Plan for N days”), because that is what the user acts on. The broad evidence range is the supporting meta line directly beneath it (“Planning range: min–max days”), and the range-band rail marks the target's position inside those bounds, so the two are never conflated: the target is a planning choice inside the evidence range, not a second, tighter claim. The target stays position-aware in the Why-this-plan rationale: at the lower anchor of the range (a recently established pattern) it reads “the planner selects 21 days — the lower end of the same 21–28 day evidence range”; at the upper anchor “…the upper end…”. An interior target raised by a clean in-range history observation is described as the user's own observed anchor (history never widens or narrows the evidence range). The uncertainty sentence is exactly one plain line — no badges, no meters (spec §7.6). A short **planning-context** meta line (spec §7.6) may follow it, e.g. "Planning context: use frequency, how long the current pattern has lasted, sessions, products, and routes. Fuller exposure context shapes the recommendation inside the evidence bounds — it does not raise scientific certainty." Never a percentage.

2. **The break journey — "what to expect"** — full Day 1 → planning-target roadmap from BreakOutlookV1 (§9.7). A 2 / 7 / 14 / 21 / 28 day anchor target shows exactly those days; an interior target raised by a clean in-range history observation runs exactly Days 1 → that observed day. Every planned day is inspectable before **Start this break**. Not 28 giant cards: a compact day-chip strip plus one inspector, plus overlapping evidence windows.

3. **Why this plan** — driver list mapped via §14, e.g. for a long-established daily user:
   > - You use THC daily or nearly daily
   > - Multiple sessions per day
   > - This current pattern has been typical for many years
   > - This current pattern has been established for a while, so the planner selects 28 days — the upper end of the same 21–28 day evidence range. That is a planning choice inside the range, not a predicted reset date.

   And for a recently established daily user (same 21–28 range, lower target):
   > - This current pattern is recent — weeks rather than years
   > - Your current pattern is recent, so the planner selects 21 days — the lower end of the same 21–28 day evidence range. That is a planning choice inside the range, not a predicted reset date.

   Duration drivers and target-rationale lines are presentation-layer only. They MUST NOT appear as Tolerance Engine driver codes. A frozen pre-0.7.0 record whose stored target is the top of the range keeps the historical contextual line ("How long this pattern has lasted is useful context. It does not change the recommended day range.") and never claims a lower-end choice.

4. **Research section — "What the research can and cannot say"** — always visible, never behind a disclosure, and never a second mode. Static reviewed copy (`src/ui/research-copy.ts`, with the CB1 concept note from EvidenceGuidanceV1 via `src/ui/research-context.tsx`) carries: the four-week human CB1 PET population reference and what it is not; the "what this does not mean" list (reaching the planning target does not prove a full reset; CB1 receptor availability is not subjective tolerance; withdrawal easing, tolerance, impairment and drug-test detectability are four separate questions; animal findings do not establish a human timetable); and direct links to Hirvonen et al., D'Souza et al. and Budney et al. It contains no window, percentage or personal date. A stored record carrying `recoveryOutlookVersion` (a result saved before 0.38.0) adds exactly one line — `legacyOutlookNote` — stating that the app then also showed an estimated recovery window, that it was a product heuristic rather than a validated human timeline, and that the stored target and range below are unchanged. Nothing is recomputed for such a record.

5. **History prompt card** (§7) or, when records exist and were included, the **history insight card** (§9.2).

6. **Your answers** — collapsible rows for the answers that drove this result (use days; last use; current-pattern duration when asked; plus sessions/products/routes when asked). Each row: **Edit** → re-enters the questionnaire at that step, preloaded, re-branching from there. Editing triggers an explicit recalculation — the existing record is never silently overwritten.

7. **Actions (sticky bottom):** **Start this break** → break-start sheet (§8). **Save without starting** → persists the record, `Today` (`profile-no-break`).

8. **Footer links:** "Separate topic: **drug-test detection basics →**" and "Estimate nominal THC in flower →".

Prohibited here: "reset complete", "100 %", "detoxed", any recovery percentage ring, any safe-restart dose, any detection statement.

### 9.2 History insight card

Present only when the engine returns a non-null `HistoryInsight`. Copy per §14, including the outside-range sentence when `outsideRecommendedRange` is true. When the tolerance-v3 in-range override fired (limitation code `heuristic_history_target_within_range_v3`), the card appends the observed-anchor sentence instead: "Your {long}-day observation sits inside the current {min}–{max} day range, so the planner used that observed anchor as the planning target. History never widens or narrows the evidence range." In every other case the card ends with: "Your history never changes the recommended range."

### 9.3 Abstinence planning screen (`planning_only`, goal = abstinence)

- Header: "Staying off THC — your plan." No range, no target date, no completion state.
- Full break journey (§9.7) as an open-ended 1–28 inspectable reference, anchored to last use (Q2A always collects it). After-28 remains available; there is no finish line.
- Phase-based plan content (§10.1) by `breakDay`.
- **Start tracking** CTA → opens ongoing abstinence tracking (§9.8).
- No return-to-use controls anywhere on this path.

### 9.4 Reduction (cut-down) planning screen (`planning_only`, goal = reduction)

- Header: **Build a cut-down plan you can actually track.**
- Body explains the two behavioural caps and that only sessions are logged; days off need no entry.
- A compact baseline shows estimated current use-days/week and reported sessions/use-day, followed by the three tracker rules. Limits are not edited on the result itself.
- Primary **Set up cut-down plan** opens the one limit sheet. It compares the recent pattern with the live editable plan cap, then offers optional guardrails behind disclosure. Suggested limits are one deliberate step below the reported pattern, bounded to at least one day/session; they are editable user commitments, not prescribed doses.
- Secondary **Plan a T-break instead** changes the goal to tolerance-reset and resumes at the first missing tolerance answer with applicable frequency/session answers retained.
- No withdrawal timeline (the engine attaches none on this route; the UI MUST NOT fabricate one).
- Starting the plan returns to Today. Session logs never generate or refresh a tolerance calculation.

### 9.5 Baseline-low screen (`not_applicable`, use-days = 0)

> **Your baseline tolerance is likely already low.**
> You haven't used THC in the last 30 days, so there's no break to recommend — a break only makes sense with recent use to reset from.

- If Q3-opt was answered: "N days since your last use."
- Actions: **Keep tracking** (optional abstinence-style tracking, §9.8), links to detection basics and the nominal THC tool, **Done**.
- A calm dead end, not an error. No red styling.

### 9.6 Detection result screen (`qualitative_only`)

1. **Banner (always):** "Qualitative information only — this app doesn't estimate detection windows or test outcomes."
2. **Matrix card** — copy mapped from `interpretationCodes` + `uncertaintyCodes` (§14):
   - **Urine:** frequency/duration of use, elapsed time, and the lab's cutoff all matter; without validated numeric rules, no window or baseline interpretation is possible.
   - **Blood:** no universal clearance window; very low levels can persist with sensitive methods; trace presence is not impairment.
   - **Saliva:** generally shorter timescale than urine, but heavily cutoff- and technology-dependent; unknown test details prevent any estimate.
   - **Hair:** a historical record of exposure, not a day-by-day clock; never a "clear by" date.
3. **Context note** (workplace/roadside only) — §14 copy.
4. **What actually helps:** "Time plus abstinence is the fundamental mechanism. Normal hydration and routine exercise support wellbeing; no detox product, flush, sauna, fasting, or niacin has a supported clearance effect."
5. **No personal elapsed-time line.** V1 detection is qualitative; showing "days since your last use" on this screen would visually imply elapsed time predicts a negative test. The orientation line from UX_SPEC 0.1.0 is removed. (The general principle "time matters" remains in the matrix copy, where it carries no personal number.)
6. **Actions:** **Check another test type** (loops to Q2D), **Done**.
7. **Footer divider:** "Tolerance is a separate topic → get a break recommendation" (enters Q1 pre-selected). Divider + wording keep the concepts separate.

Prohibited: X–Y windows, pass/fail, "clean date", cutoff numbers, jurisdiction claims (incl. any Irish threshold), confidence badges, personal countdowns.

### 9.7 Break outlook (BreakOutlookV1)

Shared by the result screen and the Today active-break card. One deterministic derivation from EvidenceGuidanceV1 overlapping windows plus optional exposure context. UI MUST NOT invent a second science-copy implementation. The name is the derivation's, not a user-facing mode: the result renders it as the break journey ("what to expect") and Today as **Your break timeline**.

- Finite planning target: exactly Days 1–`preferredTargetDays` — usually one of the anchor targets 2 / 7 / 14 / 21 / 28, or an interior observed in-range history anchor under the tolerance-v3 override. No duplicates, no gaps, no extra days.
- Open-ended tracking: Days 1–28 inspectable plus the After-28 window. No finish percentage at day 28.
- Mobile-first: horizontal day-chip strip + one inspector (stage, may notice, can help, what matters, what usually comes next) + overlapping window roadmap. Not a wall of cards.
- **Grouped roadmap (0.7.2):** the chip strip is a presentation transform that collapses consecutive days whose meaningful user-facing guidance is equivalent (same evidence windows, stage, may-notice, can-help, what-matters, next-stage, milestone, tone, and any stored check-in). Labels read `Day 1` / `Days 2–3` / `Days 4–6`. Milestone days and check-in days with unique content always keep their own entry. The exact per-day model (`days`) stays authoritative; grouping is derived (`segments`) and cannot change a recommendation, target, or day count.
- When a multi-day segment contains the exact current day, the segment is marked current and the inspector shows a "Today: Day N" line. The exact `breakDay` is never replaced by a coarse range.
- Result previews the whole journey before Start this break. Each leg's **What to expect** carries *You may notice*, *What can help* and — only in the result preview, where no **This stage** block exists — the window's own sentence; on Today that sentence stays in **This stage** so the page never says it twice. Today renders the same journey live: past legs carry per-day check-in markers, the current leg is marked "You are here", and future legs stay expectations. The leg marked "You are here" opens its **What to expect** detail by default — the one leg someone is living through is the one whose detail should not need a tap — while every other leg and the result preview stay folded (owner's call, 1.0.0).
- A day may sit in more than one evidence window. Overlaps MUST stay visible.
- Lighter / infrequent / recently established copy MUST NOT present severe withdrawal as expected. Frequent / multiple-session / concentrate / long-established copy MAY say stronger withdrawal or longer sleep disturbance may be more plausible. Always: may / can / commonly / more plausible.
- Duration may change the planning target inside the range (tolerance-v3 anchor rule), the outlook tone, and — only for an already-frequent (16–25 use-days) long-established pattern — the recommended range by one bounded band to 21–28. It is never a days-added formula.
- Check-in observations are factual stored ratings. Null ≠ 0. Missing days are skipped. No recovery score.
- Historical calculation records stay frozen. Outlook is derived at display from the stored profile and stored target.

The exclusive engine withdrawal strip (onset 1–3 / peak 2–6 / easing 4–14 / sleep open-ended) remains engine output and MUST NOT be recomputed by the UI. Result no longer uses that strip as the primary “first weeks” block.

### 9.8 Abstinence / open-ended tracking state

Abstinence has no finite break, so it MUST NOT be modelled as a `BreakAttempt` with a target. It is a tracking record without `targetDurationDays` and without `completed`:

- `Today` shows "Day N since your last use" (from `breakDay`), a check-in CTA, and the current phase focus line.
- Check-ins are optional and open-ended; no streak-guilt copy.
- The user can **Stop tracking** at any time (overflow menu, confirm) — a neutral end, no failure framing, history preserved.
- If the user reports use in a check-in, the same interruption mechanics apply (new anchor, honest restart copy) minus any target-date recomputation (there is none).

---

## 10. Break plan, check-ins, interruption

### 10.1 Active-break plan on `Today` (no separate detail screen)

The active-break card *is* the running plan; there is no pushed plan-detail screen.

- Hero head: phase eyebrow, "Day X of Y" (labelled **plan progress** — never biological progress), target date beneath. Past the planning target the label reads "Day N · M-day plan" instead of a broken fraction.
- Practical daily advice is one support card before the timeline, headed **Help with**. The action and **Why this helps** are visible; the guide's **What else can help**, **What to avoid**, **When to get advice** and sources sit behind that one row, so a five-to-eight-step guide cannot bury the day. See §17.
- **Your break timeline** is an open section: Start → evidence phases → Target, past-day check-in markers and the current leg marked "You are here". Each leg's **What to expect** detail is a disclosure inside it, opened by default on the current leg.
- No section of the card is a recovery-outlook panel, and no unrelated saved result is ever borrowed. A saved result that predates 0.38.0 is explained only by the legacy line in the result screen's research section (§9.1), never on Today.
- Action zone: full-width **Check in**; **Mark complete** appears on/after the target date (never silent auto-complete).
- **Manage break** contains **Update last use** and **End break early**. The latter requires confirmation and has a neutral resulting state.
- Post-break return mode (§8) is chosen at break start and shown read-only on the completion card; break-start copy does not promise mid-plan changes.

### 10.2 Daily check-in — one direct action

**Check in** records a no-use entry immediately. Before saving, the helper says "Records no THC for this break day. You can undo it." The receipt reads **Checked in today** and **Saved · No THC reported**, with **Undo**. This is a report, not proof that a complete 24 hours has elapsed. Repeat taps cannot duplicate the current abstinence day's entry.

**Undo** remains next to the receipt, including after reload. It removes exactly the latest no-use entry in the current abstinence day and segment. Earlier entries, symptom ratings on other entries, and prior days remain. If multiple legacy entries exist, each Undo removes one; the checked state stays until no entry remains for that day.

The optional ratings and note-entry sheet were removed in 0.35.0. Existing reports remain readable in History and can still inform advice under the preserved freshness rules. Nothing in the current UI writes symptom ratings.

Legacy storage semantics remain: craving, sleep quality, irritability, anxiety and appetite accept `integer 0..10 or null`; 10 means more of the named thing (including better sleep and stronger appetite). Missing remains unknown, never zero. Private notes are not analysed.

Older `interrupted_time_needed` records remain dismissible or confirmable. Current **Update last use** does not persist an intermediate paused state; canceling leaves timing and data unchanged.

- Skipping days is normal; no punitive states, no streak pressure.

### 10.3 Updating last use

Entry: **Today → Manage break → Update last use** for a finite break; **Update last use** below guidance for open-ended tracking. This is a clock correction after THC use, not a session-counting feature.

1. Sheet: **"When did you use?"** — date control §4.3, constrained to after the current segment start (and not in the future). Required. Opening or canceling this form does not change persisted state. On confirmation, the application performs the existing suspend/confirm lifecycle transitions together and persists only the confirmed result. Older saved `interrupted_time_needed` states remain supported and offer **I didn’t use THC — undo report**, which restores the original open segment without fabricating use.
2. On confirm — mandated phrasing (spec §7.9.7):

   > **Plan restarted from your latest use.**
   > Day counters now run from the new date. Your earlier check-ins and progress stay in your history. This restarts the plan clock — it doesn't claim your body's recovery went back to zero.

3. Target duration unchanged; target date recomputed by the engine from the new anchor.
4. Secondary action: "Your use pattern may have changed — **recalculate**" (explicit, preloaded questionnaire). Never automatic.

### 10.4 Completing and ending

- On/after the target date, `Today` shows **Mark complete** (never silent auto-complete). Completion → restrained completion card → post-break plan (§8).
- **End break early**: inside **Manage break**, with confirmation. Neutral state, no failure language.

---

## 11. Mobile interaction details

- **Touch targets:** min 44×44 pt; primary CTAs min 56 pt, full-width minus 16 pt gutters.
- **Bottom action placement:** primary actions sticky above `env(safe-area-inset-bottom)`; flows without tab bar place CTAs at the same thumb-zone height.
- **Keyboard:** only the check-in note raises it; `inputmode="decimal"` on numeric escape hatches; CTA bar lifts above the keyboard.
- **Haptics:** light tick on slider snap and chip select; warning haptic on validation error; respects OS settings.
- **Validation:** inline, on-step, never toast-only; errors announced via `aria-live="polite"`.
- **Progressive disclosure:** the nominal THC link, previous-break add, **Why this plan**, **What to expect** on the journey legs other than the one someone is on, the "Your answers" rows, and **Manage break**. Nothing mandatory hides behind an expander; the guide's remaining steps and the break-management actions do, while the stage, the day's action, the symptoms of the current leg and the experiences stay on the page. Nothing mandatory hides behind an expander: the check-in, the stage, the topic's action and reason, and the experiences stay on the page.
- **No long forms:** max one logical group per step (Q5's two chip groups is the ceiling); anything taller than ~1.5 viewport heights is split.
- **Accessibility:** WCAG 2.2 AA contrast on the §12 palette; full screen-reader pass on questionnaire, check-in, interruption; status never by colour alone; dynamic type to 130 % without breakage; focus order = visual order; every icon button labelled.
- **Standalone/PWA:** manifest `display: standalone`; theme-color matches `bg/base` for seamless launch; iOS apple-touch-icon; no reliance on `beforeinstallprompt` (Settings shows per-platform manual install steps); service-worker updates apply on next launch via passive "Update ready" snackbar, never mid-flow.
- **Gestures:** iOS edge swipe = flow Back; horizontal swipe disabled on tab content (slider conflicts).

---

## 12. Visual direction

### 12.1 Feel

Dark, premium, calm, slightly editorial. Dusk-navy surfaces with warm parchment type — a pause/interval tool, not a clinic, not a dispensary, not a generic form. No frosted-glass stacks, no neon gradients, no glow blobs, no hero photography, no medical clichés, no cannabis-leaf / smoke / Rastafarian clichés.

### 12.2 Palette (tokens)

Implemented in `src/ui/styles.css`. Identity is dusk navy + warm sand, not weed-green on black.

| Token | Value | Use |
|---|---|---|
| `bg/base` | `#0A0D12` | app background (ink navy) |
| `bg/mist` | `#10151C` | atmospheric layer, tab bar |
| `bg/card` | `#151B24` | raised surfaces, sheets |
| `bg/raised` | `#1D2530` | chips, pressed, tracks |
| `accent/primary` | `#8FA9B8` | progress, icons, selected rings |
| `accent/strong` | `#D7C4A8` | hero numbers, selected marks, brand mark |
| `accent/fg` | `#10141A` | text on the paper primary CTA |
| `accent/soft` | `#1A2830` | selected fills |
| `text/primary` | `#F0EDE6` | warm parchment |
| `text/secondary` | `#A7B0BD` | helpers, meta |
| `text/faint` | `#959EAC` | micro-labels, disabled |
| `state/warn` | `#D4A574` | uncertainty / validation warnings |
| `state/error` | `#C97A72` | validation / delete only |
| `state/ok` | `#829EB0` | past/complete marks only — the same muted blue family, never green branding |

Primary CTAs are parchment-on-ink (`text/primary` fill, `accent/fg` label), not accent-green buttons. Colour never carries meaning alone — always icon + text.

### 12.3 Typography roles

- Display: Fraunces (self-hosted) with `ui-serif` fallback. First-launch title, question titles, result ranges, screen titles.
- Body: Figtree (self-hosted) with `ui-sans-serif` / SF Pro fallback.
- Result range: ~2.4–3.4 rem display, tabular-nums, unit in 11–12 pt uppercase tracking.
- Step questions: ~1.5–1.85 rem display.
- Body 16/24, meta 13/18, micro-label 11 pt uppercase wide tracking.
- Slider readout: 64 px display, tabular-nums.

### 12.4 Cards, spacing, progress graphics

- Not everything is a card. Heroes, driver lists, and timelines sit on the page; cards/sheets are for grouped controls and answers.
- Surfaces use hairline rings (transparent mix of `--fg`) rather than heavy drop shadows. Radius is concentric: tiles 20, nested chips 999, sheets 24.
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48; card padding 20; gutters 20.
- One hero per screen: the range on results, the interval mark + title on first launch.
- Progress graphics that are honest to the engines: slim questionnaire bar; recommended-break range band on a 0–28-day rail (v1 policy ceiling) with min/max labels and a plan marker at `preferredTargetDays`. Withdrawal is a status track (icon + text), not a chart; sleep stays undated. History is a list, not a graph. The break loop is built (§10); the old plan day ring was removed in 0.20.0, and the active-break card reports plan progress through the **Day X of Y** label and the recorded-check-in line instead.

---

---

## 13. Offline / local-first behaviour

### 13.1 What works offline

Everything in v1: questionnaire, both engines, nominal THC, results, plans, check-ins, history, settings, deletion. Zero scientific network calls in v1 (`ARCHITECTURE.md` §11).

### 13.2 Network-state UX

- No offline banners, no reconnect toasts — nothing v1 does needs a network.
- One neutral Settings line: "Fully offline-capable · all data on this device".
- Service worker caches shell + static policies/templates at install; updates download passively and apply on next launch, never mid-flow.
- Runtime generative AI is intentionally out of scope: result explanations, the research section's reference copy, evidence summaries, and personal-history insights are deterministic and local. There is no "enhanced explanation" card placeholder and no runtime inference dependency.

### 13.3 Storage failure modes

| Condition | UX |
|---|---|
| Storage unavailable | Calculation runs in memory; slim persistent banner: "This session can't be saved — results will vanish when you close the app." No blocking. |
| Corrupt record | "Unavailable" placeholder row in History; unrelated records untouched; deletion of the corrupt item offered. |
| Delete data | Settings: per-item deletion (check-in, past break, attempt) with confirm; **Delete everything** via 3-second hold confirm → empty first-launch state. No encryption claims anywhere in copy. |
| Timezone change | UTC instants stored; displays reformat silently. |

---

## 14. Message-code → copy mapping (template layer)

One template module maps engine codes to the copy quoted here. Components MUST NOT write scientific sentences inline.

| Code | User-facing copy |
|---|---|
| `very_infrequent_use` | You use THC only occasionally |
| `regular_nondaily_use` | You use THC regularly, but not daily |
| `frequent_use` | You use THC most days |
| `near_daily_or_daily_use` | You use THC daily or nearly daily |
| `multiple_sessions_per_day` | Multiple sessions per day |
| `concentrate_product_use` | Concentrates in the mix |
| `dabbing_route_use` | Dabbing in the mix |
| `current_pattern_under_1_month` | This current pattern is recent — weeks rather than years |
| `current_pattern_1_to_6_months` | This current pattern has been typical for a few months |
| `current_pattern_6_to_24_months` | This current pattern has been typical for about 1–2 years |
| `current_pattern_2_to_5_years` | This current pattern has been typical for a few years |
| `current_pattern_5_plus_years` | This current pattern has been typical for many years |
| `preferred_target_recent_lower_end` | Your current pattern is recent, so the planner selects {target} days — the lower end of the same {min}–{max} day evidence range. That is a planning choice inside the range, not a predicted reset date. |
| `preferred_target_established_upper_end` | This current pattern has been established for a while, so the planner selects {target} days — the upper end of the same {min}–{max} day evidence range. That is a planning choice inside the range, not a predicted reset date. |
| `pattern_duration_context_only` | How long this pattern has lasted is useful context. It does not change the recommended day range. |
| `baseline_tolerance_likely_low` | Your baseline tolerance is likely already low |
| `broad_heuristic_individual_response_varies` | Limited certainty: this is a broad planning heuristic, and individual response varies. |
| `history_directional_observation` | In your previous breaks, you reported a higher tolerance reduction at {long} days than at {short} days. |
| `history_outside_population_range` (appended) | That observation sits outside today's broad heuristic range and does not change the calculator target. |
| `history_target_override_tail` (appended when the v3 in-range override fired) | Your {long}-day observation sits inside the current {min}–{max} day range, so the planner used that observed anchor as the planning target. History never widens or narrows the evidence range. |
| `history_no_additional_benefit_observed` | Across your previous breaks, longer breaks didn't report a bigger benefit. |
| `history_mixed_no_directional_claim` | Your previous breaks point in different directions, so there's no clear personal pattern to draw on. |
| `urine_frequency_chronicity_elapsed_and_cutoff_relevant` | For urine tests, how often and how long you've used, time since last use, and the lab's cutoff all matter. |
| `urine_no_numeric_window_or_baseline_without_enabled_rules` | Without validated numeric rules, this app can't estimate a detection window or interpret a lab baseline. |
| `blood_no_universal_clearance_window` | Blood has no universal clearance window. |
| `blood_trace_presence_not_impairment` | A trace amount in blood is not proof of impairment. |
| `blood_very_low_detectable_persists_with_sensitive_methods` | Very low levels can remain detectable with sensitive methods. |
| `oral_fluid_shorter_scale_than_urine_cutoff_technology_dependent` | Saliva tests generally cover a shorter timescale than urine, but it depends heavily on the test's cutoff and technology. |
| `oral_fluid_unknown_test_characteristics_prevent_numeric_estimate` | Unknown test details prevent any numeric estimate. |
| `hair_retrospective_exposure_matrix` | Hair testing is a historical record of exposure, not a day-by-day clock. |
| `hair_never_a_day_level_clearance_date` | There is never a "clear by" date for hair. |
| `workplace_cutoff_and_policy_unknown` | Workplace cutoffs and policies vary and are unknown to this app. |
| `roadside_requires_verified_jurisdiction_rules` | Roadside rules depend on your jurisdiction's verified regulations, which this app does not include. |

A code missing from this table renders nothing and is logged locally — never freestyle copy.

The result screen's research section is static reviewed copy, not engine codes: `src/ui/research-copy.ts` holds the section title, the reference note, the "what this does not mean" list, the three study links, and the single `legacyOutlookNote` line shown for a saved result that carries `recoveryOutlookVersion` (a result calculated before 0.38.0, when the app still showed an estimated recovery window). It renders no window, percentage or personal date. See `EVIDENCE_CONTENT_SPEC.md` for the underlying reference content. Codes absent from the template module render nothing.

---

## 15. Issues register — resolved / landed / deferred

### 15.1 Resolved in UX (no domain change needed)

- **R1 — Last-use-first vs 30-day window (was a blocker).** Resolved by reordering: use-days is asked first, and the last-use wheel's valid window is derived from that answer (≤30 days when use-days 1–30; >30 days when 0). Both contradiction directions are impossible on a fresh path and handled by re-constrained re-entry after edits (§4.4).
- **R2 — Reduction "not now" / last-use contradiction (was a blocker).** Resolved by removal: the cut-down route no longer collects `lastUseAt` at all (the engine attaches no withdrawal display on this route, so the timestamp was unused). D3 landed.
- **R3 — Clock semantics (was a blocker).** Pinned in §2: anchor (`lastUseAt`), abstinence clock (`breakDay`), commitment marker (plan start, which never moves the clock). All day displays read `breakDay`; target dates are engine-computed.
- **R4 — Today state precedence incl. resume and detection-only (was a blocker).** Pinned in §3.2 with explicit precedence and resume-card placement rules.
- **R5 — Result hierarchy.** Resolved: the actionable planning target leads as the hero, with the evidence range as the supporting meta line beneath it; single uncertainty sentence (§9.1).
- **R6 — Detection elapsed-time implication.** Resolved: the personal "days since last use" line is removed from detection results (§9.6).
- **R7 — Intake burden.** Resolved: previous-break questions → contextual flow (§7); post-break mode → break-start sheet (§8). Initial questionnaire is 2–6 steps (§5.4); Q4/Q5 are asked from 4 use-days under tolerance-v3.
- **R8 — Timestamp precision vs human memory.** Mitigated by day-part chips (§4.3); documented as a known, accepted ±12 h modelling error because all displays are day-granular. No change required, but the domain spec SHOULD acknowledge that UI-submitted instants are modelled points with `user_estimate` provenance, not measurements.
- **R9 — "The duration question feels pointless" (0.7.0).** Resolved by the tolerance-v2 target rule (`CALCULATOR_SPEC.md` §7.3): duration now selects the planning target anchor inside the unchanged evidence range — recently established (`under_1_month`, `1_to_6_months`) → lower anchor; established (≥ 6 months) or legacy-missing → upper anchor. The range never moves and no duration-to-days formula exists. UX wiring: position-aware "Plan for N days" line, duration + target-rationale driver bullets, and a deterministic planning-context note (never a percentage). Q6 routing is unchanged.
- **R10 — Predicted recovery window retired (0.38.0).** Resolved by removal. The result-mode switch, the personalised predicted recovery window, the check-in-facts presenter and the separate outlook copy module are gone: the app cannot defend a personal recovery window from the evidence, and a large "estimated recovery window" read as exactly the prediction the product forbids. The result is one body whose research section carries the four-week human CB1 population reference openly; a stored record that still carries an outlook version renders unchanged with one honest legacy line and never a window (`CALCULATOR_SPEC.md` §7.11). Today has no outlook panel at all. Numeric policies are untouched.

### 15.2 Domain/spec changes (all landed; retained as the decision record)

- **D1 — Restrict sessions/products/routes requirement to the band that uses them.** `CALCULATOR_SPEC.md` §5 rule 7 currently requires `sessionsPerUseDay`, ≥1 product, and ≥1 route for *any* positive use-days; the intensity rule reads them only at ≥16. Change: require them only when `thcUseDaysLast30 ≥ 16`; keep the zero-day prohibition. Blocks Q4/Q5 conditional flow (§5.1). *(Formerly F1.)* **Superseded by tolerance-v3 (0.8.0):** the v3 classification reads intensity signals from 4 use-days up, so rule 7 now requires these fields when `thcUseDaysLast30 ≥ 4` on range-requested routes; they stay optional at 1–3 and are never required at 0.
- **D2 — Drop the use-days requirement for abstinence.** `GOALS_REQUIRING_USE_DAYS` includes `abstinence`, but no abstinence output reads `thcUseDaysLast30`; asking it also re-imports the 30-day contradiction rules onto the quitting-today user. Change: abstinence requires only `lastUseAt`; rules 4–6 apply only when use-days is present. Blocks the 2-step abstinence flow (§5.1). *(New.)*
- **D3 — Don't require `lastUseAt` for the cut-down route.** Rule 6 required `lastUseAt` whenever use-days > 0, regardless of goal; the reduction planning route consumes no timestamp. Change: rule 6 applies only on routes whose outputs use `lastUseAt` (tolerance_reset, abstinence, and legacy reduction-with-a-break input). **Landed:** the shipped reduction route collects no `lastUseAt`, and no route asks `breakRequested` — one cut-down flow. *(New.)*
- **D4 — Abstinence tracking without a finite target.** `BreakAttempt` requires `targetDurationDays` and its terminal states assume completion; abstinence tracking is open-ended with no completion milestone. Change: nullable `targetDurationDays` (or a distinct open-ended tracking record type), with the interruption mechanics unchanged. Blocks §9.8. *(New.)*
- **D5 — Nullable check-in symptom fields.** `DailyCheckin` requires all five 0–10 integers; the use-first check-in stores untouched sliders as `null`. Change: `craving | sleep | irritability | anxiety | appetite` become `integer 0..10 or null`, and the spec documents each field's anchor semantics (10 = more of the named thing). Blocks §10.2. *(Formerly F2, now a concrete change.)*

### 15.3 Safely deferred (no v1 action)

- **Band-level use-days input** (accept 1–3 / 4–15 / 16–25 / 26–30 instead of an integer) — presets mitigate the burden; revisit if testing shows recall friction. *(Formerly F4.)*
- **Withdrawal display on the cut-down route** — engine attaches none; a reducer quitting from daily use may want it. Product decision, post-v1. *(Formerly F5.)*
- **Multi-matrix detection compare view** for "not sure which test" users. *(Formerly F6.)*
- **Check-in trend chart** in History (v1.x candidate, §12.4).
- **All-past withdrawal timeline display rule** for long-abstinent users — handled by copy in §9.3; formal display rule deferred. *(Formerly F7.)*

---

## 16. Implementation guidance

Domain prerequisites from §15.2 landed with the earlier slices (D1–D5 validation/schema edits). The slice sequence was:

1. **Shell + state router** (§3): two tabs, gear-modal settings, transient-flow scaffolding, `Today` state machine with precedence and resume, local persistence of questionnaire progress.
2. **Questionnaire engine** (§4–5): declarative steps from the §5.1 map; controls §4.2; date control §4.3; branch/re-branch; validation wiring.
3. **Result screens** (§9) from real engine output + the §14 template layer.
4. **Break loop** (§8, §10): break-start sheet, use-first check-in, interruption — wired to the break state machine.
5. **History + contextual flows** (§7), settings, deletion, offline hardening (§13).
6. **(Cancelled) Runtime AI / DeepSeek** — intentionally not part of the product architecture. No runtime generative AI step exists; explanations and companion copy stay deterministic and local.

Acceptance: every path in §5.1 reachable with the stated step counts; every terminal state renders from real engine output; no prohibited string (§9.1, §9.6) appears; all flows complete offline; all flows complete with a screen reader; resume works across restarts; no screen asks a question that cannot change a v1 output, plan, history record, or result-explanation.


## 17. Practical daily support (0.22.0; guide contract 0.38.0; support topics 1.0.0)

Today prioritises a brief daily visit: where you are, what this stage can bring, and one useful next action. **This stage** is an always-open section and keeps exactly one job — the window label, its headline and one sentence of what the stage means; it deliberately carries **no** symptom list, because that list belongs to the leg someone is living through (**You are here** → **What to expect** → *You may notice* / *What can help*, §9.7). The day's activity is an editorial schedule, not an exact-day biological prediction. One job per section, and nothing printed twice: **This stage** frames the moment, **Help with** says what to do today, the journey leg says what to expect, **Experiences** says how others went through it.

The native **Help with** select exposes today's suggestion and all eleven topic guides without horizontal scrolling. The block keeps the day's depth in one place: the topic heading, the line to act on and **Why this helps** are always visible, and the rest of the topic — **What else can help** (every step not already shown as the action, so the guide's first step does appear there when the day's own activity or a saved plan supplies the action), **What to avoid**, **When to get advice** and the sources — sits behind that single row, closed by default. A five-to-eight-step guide must never bury the day's action, and the first screen is measured against that rule (at 390×844 the check-in, this stage, the topic picker and the action line all sit above the fold). Each of the eleven guides carries an explanation, five to eight practical steps, an avoid line, and sources drawn from the reviewed `SUPPORT_SOURCES` set (NSW Health's clinical withdrawal guidance and do-it-yourself quitting guide, Turning Point, CAMH, NHS sleep advice and Every Mind Matters, healthdirect relaxation, NHS 5 steps to wellbeing, NIDA, and the project's other reviewed links; the **When to get advice** line is present on nine guides and omitted on the two where none is warranted). A manual choice replaces the block in place and writes nothing; selecting today's suggestion restores it. The choice resets on a new break day. A fresh break defaults to its existing day-specific practical activity. Preserved recent ratings from earlier releases can raise their own topic, with a dated reason. A saved replacement plan takes precedence on routine, cravings and boredom topics, where the plan's own action, trigger and fallback lines lead the block in place of the guide's first-step action.

**Support topics.** Support topics are the areas this person wants help with **during this break**. A sheet asks **What would you like help with?** after a break calculation finishes (never after a drug-test question), and it opens for review — over the result, or from Today — whenever the stored list belongs to an earlier break; Today's footer keeps it one tap away on the right, opposite **Start a new calculation**, showing how many topics this break is being helped with. It offers the same eleven topics in four groups, multi-select, and writes nothing until **Save topics**; the close action leaves the previous choice exactly as it was.

The topics belong to one break, and nothing about that is left to inference. Topics chosen while no break is in hand are meant for the break that starts next and are bound to it the moment it starts; a list already bound to an earlier break is **not** inherited. A later break meets that list as an offer in **Help with** — *Last break's topics: …, Use these, Change* — and one tap binds it, so reuse is a decision the person makes rather than a default the app applies. Until then the break runs on the day's own practice, and the footer shows no count.

The stored set is written in the taxonomy's own order (§4.5 area list), so the order the cards were tapped in means nothing. The confirmed topics take turns one break day at a time, anchored to the day the set was confirmed, so the same set puts the same topic on the same day, editing the set never reshuffles days already lived through, and the day the person edits it starts on the first topic of the new set rather than on an arbitrary one. The day's precedence is the topic picked by hand today → the confirmed topics (rotating) → the target-day review on its own day → a rating a legacy build stored → the day's own practice. When a chosen topic leads the card, the day's own task appears inside that topic's depth as **Today's own task**, so a stored preference can never make the day's activity disappear.

**Help with** says where today's topic came from — *Your pick today*, *Your topic* or *Today's suggestion* — above the topic's title, and its picker keeps this break's topics in a **Your topics** group above every other guide in **All topics**, with the first option naming the topic the app would show by itself (*Today's suggestion: Sleep*). The block also states the turn (*Your topics take turns, one each day.*) or, when this break has none of its own, asks for them in one line (*No topics chosen for this break. Choose topics*) or offers the last break's list back (*Last break's topics: …. Use these / Change*).

A topic picked by hand is a decision about **one break day**: it replaces the block in place, is stored with the break and the day it was picked on, survives a reload, and stops applying when either moves on — the next break day starts on the turn again, and choosing **Today's suggestion** in the picker clears it. The set is stored in `tbreak.companion-personalisation.v3` (backup family: support topics, which reads the device-wide v2 list and the v1 focus forward), never reaches the tolerance or detection engines, and never invents a symptom: choosing a topic only decides which guide leads.

No symptom ratings are collected. Existing ratings and notes retain their stored meaning, freshness rules and History access: a rating recorded by an earlier build still opens its own topic with its dated reading when that topic is on screen, and it still leads the day when the person has confirmed no topics of their own. It never outranks a topic the person chose, and no-use-only saves do not erase earlier ratings; ratings never change scientific calculations.

**Experiences** is the open section beneath the guide: "What other people reported around this topic and this stage of a break." A manually controlled carousel draws from 44 reviewed paraphrases across 12 r/Petioles discussions. Stage windows decide which accounts are eligible; the accounts that speak to the selected topic lead, followed by the rest of the stage's accounts, and the carousel is capped at eight cards. Each identifies an individual experience, not a prediction, and links its source. No medical claim is sourced to Reddit. Curated text works offline; external links require a connection.


## 17a. The day's tools (1.0.0)

**The delay timer.** The one tool for the moment an urge arrives, and the only place in the app that acts in real time. It is opened from the day's advice card — **Ride it out**, always visible there, and labelled with the time left while a timer runs — and it asks one question first: how long will you wait before deciding anything (5, 10 or 15 minutes). The countdown is computed from the stored start instant, not from a running interval, so closing the app, freezing the tab or locking the phone never loses or invents time. Closing the sheet keeps the timer running; reopening resumes it. When the countdown reaches zero the sheet asks how it is now (**Easier** / **Still there**), and either answer only records how the last few minutes went — the sheet says so, and nothing anywhere turns that answer into a claim about tolerance, withdrawal or self-control. **Stop the timer** deletes the row: a stopped timer leaves no trace in History or in the count, and a timer nobody finished is forgotten two hours after its own end, so no half-finished session can inflate a later count. The running timer shows the person's own replacement action from their plan, and three of the craving guide's existing delay/distract/breathe steps in the guide's own words; no new claims are written for this screen. Finished sittings appear in History under **Urges you sat with**, dated like every other record, and can be deleted from their detail.

**The check-in reminder.** One local time, off by default, set in Settings (**Check-in reminder**): a switch and a time, written immediately. When the chosen time has passed and the running break day has no check-in yet, Today shows one quiet line naming the time, right above the state card, next to the check-in it is about; it disappears by itself once a check-in exists and never needs dismissing. The check is the same one the check-in card uses — "today" is the current abstinence day, not the calendar day — so the reminder and the card can never disagree. What the app can honestly do is stated on the setting: it reminds inside the app, and while it is open or running in the background it can also raise one local notification if notifications are allowed. There is no server and no push subscription, so a closed app cannot be woken; the wording says exactly that, and a blocked or unavailable notification permission is reported as such instead of leaving the reminder silently inert.

**The later weeks.** The 28-day practice sequence is followed by two of its own sets — days 29–56 and day 57 onward — written for a longer abstinence instead of repeating week one. Each keeps the same shape (a topic, a title and one action), stays inside the sources already reviewed for the guides, and adds no timeline, percentage, product or dose. A 90-day break therefore has a practice and an evidence window on every day of it.

## 18. PWA interaction polish (0.23.0)

The Reddit carousel supports native horizontal touch scrolling with scroll snapping, previous/next buttons, position controls and arrow keys. It never auto-advances while the user reads. Only the visible slide has interactive links; position is announced and preserved when resizing. The visible card is tracked by its identity, so a re-ranked list (a check-in save or a topic change) never swaps the card under the reader, and the arrows move the card immediately rather than waiting for a scroll event. Content and labels remain available offline, with external sources opening only on request.

Notifications are local only: no push subscription, no service-worker background schedule and no server. The app may raise a reminder notification while it is open or running in the background, and never claims more than that. Touch feedback is brief and never delays persistence or navigation: pressed states, a check-mark confirmation, and short sheet/guide transitions. `prefers-reduced-motion` disables decorative motion and smooth scrolling. Existing safe-area, keyboard, dialog Back/Escape and offline storage contracts stay in place. The helper that finds today's latest check-in excludes future, invalid and pre-segment entries and uses the established abstinence-day boundaries.


## 19. Touch scale and visual tone (0.25.0)

Browser pinch zoom is **locked** (owner's call, 0.38.0) by two layers that fail differently: the viewport meta carries `maximum-scale=1, user-scalable=no` (honoured by Chrome/Android, ignored by Safari since iOS 10) and `html, body` declare `touch-action: pan-x pan-y` (honoured by Safari 13+ and Blink). Because the browser intersects `touch-action` from the touched element up to the document, the wider `manipulation` value the controls declare cannot re-enable pinch. No JavaScript gesture blocker is installed. Consequences that are accepted: one-finger panning, carousel swiping, sliders and keyboard handling are unchanged; double-tap zoom is off; the app's own type scale is the only size control, so inputs stay at ≥16px and this voluntarily gives up WCAG 1.4.4 resize-by-zoom in Chrome/Android; and an iOS Safari browser-level pinch is still possible because the platform refuses the meta lock, which is where magnification survives. Viewport fill accepts outer-screen height only when both dimensions match the device screen, avoiding desktop-window oversizing. Physical iOS testing remains outstanding.

The visual system is deliberately discreet: ink navy, slate blue and warm sand; no weed green, cannabis leaf, smoke or dispensary signalling. The installed icon stays a neutral pause/interval mark. Soft gradients, hairlines, small press states, sheet entrance and carousel movement provide app-like depth without becoming flashy. `prefers-reduced-motion` removes decorative movement. Clinical and source material is presented where it belongs on the page: the result's research section sits open beneath the plan, and the daily surface speaks in direct everyday language.

## 20. Local backup (0.26.0)

Settings gains a **Your data** section between About and Delete everything, with **Save a backup file** and **Restore from a backup file**; its helper states that the file is not encrypted.

- **Save a backup file** downloads `tbreak-backup-YYYY-MM-DD.json` (the UTC export date): pretty-printed JSON with the envelope `{ format: 'tbreak-backup', formatVersion: 1, appVersion, exportedAt, data }`. `data` carries the stored record families — saved answers, saved results, break attempts, tracking runs, check-ins, past breaks, cutting-down plans, saved limits, break ratings, support areas — each exactly as the app stores it. The unfinished questionnaire draft and the transient result-overlay flag are not in the file. A failed save shows a short error line.
- **Restore from a backup file** opens the file picker and validates every record family before anything is written: a file that is not a T-Break backup, was written by another format version, or holds an unreadable family is refused with a "nothing was changed" line, and the device is untouched. A valid file opens a danger-styled confirmation that names the file, lists the record count per family, and states that the current data cannot be brought back. Confirming replaces everything on the device (families the file omits end up empty), closes any open flow and refreshes the displayed data; cancelling, or closing Settings with the confirmation pending, changes nothing and discards the chosen file.

The outcome line under the actions names the file that was saved or restored, or the refusal reason.
