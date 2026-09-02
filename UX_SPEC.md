# T-Break Calculator — UX Specification (PWA)

Status: implementation-ready v1 UX design
Version: 0.1.0
Companion documents: `CALCULATOR_SPEC.md` (0.2.0), `ARCHITECTURE.md` (0.2.0)
Scope: questionnaire flow, result flow, app shell, break tracking, check-ins, history, settings, offline behaviour, visual direction. No science, no engine changes, no new inputs.

Normative language: **MUST**, **MUST NOT**, **SHOULD**, **MAY** follow the same conventions as `CALCULATOR_SPEC.md`.

Every question in this specification maps to a field that an enabled v1 engine, plan, or local history feature actually consumes. No question collects data for a deferred feature. Field-to-schema mapping is given per step so implementers never invent an input.

---

## 1. Product framing and design principles

### 1.1 What this app is

A mobile-first, installable, local-first PWA for THC users. It answers four concrete goals:

- reset tolerance / feel THC strongly again (`tolerance_reset`);
- reduce use (`reduction`);
- continue abstinence (`abstinence`);
- get drug-test detection information (`detection_information`).

It is a focused utility, not a wellness platform, not a medical intake, not a marketing site.

### 1.2 Design principles

1. **Fast to a number.** A daily user should reach a recommended break range in under 90 seconds. Maximum 7 interactive steps on the longest path; most paths are 4–6.
2. **One decision per screen.** One question, or one very small logical group, per step. No long scrolling forms anywhere.
3. **Buttons over keyboards.** Sliders, steppers, chips, and date wheels are default. Free text exists in exactly one place: the optional check-in note.
4. **Honest by construction.** The UI never shows a reset percentage, detox percentage, guaranteed clean date, exact universal reset date, or numeric detection window — these outputs do not exist in the engines and MUST NOT be simulated visually (no fake progress rings of "receptor recovery").
5. **Tolerance ≠ detection.** These are separate goals, separate flows, separate result cards, visually and verbally separated. A tolerance result screen MAY link to detection information, but never merges the two.
6. **Estimates are first-class.** Users remember "about two weeks ago," not ISO timestamps. Every date/time question offers coarse, human answers; the UI converts them to the required timestamp shape.
7. **Offline is the default, not an error.** Every v1 feature is deterministic and local. The app never blocks on network state and never shows offline "warnings" for things that work fine offline.
8. **No account, ever, in v1.** No login, signup, email, or cloud prompt anywhere in the core flow.
9. **Branch aggressively.** Users only see questions the current goal and earlier answers make necessary. Skipped questions are invisible, not greyed out.
10. **Plain language.** Engine identifiers (`heuristic_frequency_intensity_v1`, `SourcedValue`, `breakDay`) never appear. Message codes are mapped to human copy in a single template layer (§14).

### 1.3 Terminology shown to users

| Internal term | User-facing term |
|---|---|
| tolerance break / T-break | "break" or "T-break" |
| `thcUseDaysLast30` | "days you used THC in the last 30 days" |
| `sessionsPerUseDay` | "sessions on a typical use day" |
| `lastUseAt` | "when you last used" |
| `recommendedRangeDays` | "recommended break" |
| `preferredTargetDays` | "strong planning target" |
| `nominal THC` | "nominal THC" (exact label mandated by spec §6) |
| `DetectionMatrix` | "test type" |
| `BreakAttempt` | "your break" / "current break" |
| `interrupted_time_needed` | "break paused — confirm when you used" |
| `toleranceReductionScore` | "how much it helped (0–10)" |

---

## 2. App structure and navigation

### 2.1 Shell model

Single-page PWA with a persistent shell and full-screen transient flows:

```text
┌─────────────────────────────┐
│  Screen content (one job)   │
│                             │
│                             │
│                             │
│  ┌───────────────────────┐  │
│  │ Primary action (if    │  │  <- thumb zone, above nav
│  │  any) sits here       │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│ Today │ Plan │ History │ ⚙  │  <- bottom navigation
└─────────────────────────────┘
```

- **Bottom navigation (4 tabs):** `Today`, `Plan`, `History`, `Settings`. These are the only persistent destinations.
- **Transient full-screen flows** (slide in over the shell, have their own close/back affordance, never appear in bottom nav):
  - the questionnaire;
  - the daily check-in;
  - the result view reached from the questionnaire (a result reached from History is a normal screen, not a flow);
  - the nominal THC calculator sheet;
  - interruption confirmation ("confirm when you used");
  - add/edit previous break.
- **Rule of thumb:** if the user is *deciding or entering* something, it is a flow. If the user is *looking at* something, it is a tab screen.

### 2.2 Home (`Today`) states

`Today` is state-driven. Exactly one primary state renders at a time:

| State | Condition | Content |
|---|---|---|
| `first-launch` | no profile, no data | Welcome card (§2.3), one CTA: **"Get started"** |
| `no-profile` | returning, no completed questionnaire | Hero card: "What do you want from this app?" goal chips (same four options as Q1) launching the questionnaire pre-selected |
| `profile-no-break` | profile exists, no active attempt | Summary card of last result (range + target), CTAs: **Start this break**, **Recalculate**, secondary: detection info, nominal THC |
| `active-break` | attempt `active` | Day counter ("Day 12 of 28"), target date, withdrawal position strip, primary CTA **Check in**, secondary: view plan |
| `interrupted` | attempt `interrupted_time_needed` | Timing displays suspended. Card: "You marked that you used THC. Confirm when, so your plan can restart." Primary CTA **Confirm when** |
| `completed-break` | attempt `completed`, no newer active attempt | Completion card ("Break complete — 28 days"), post-break plan card, history insight if eligible, CTA to start a new calculation |
| `ended-break` | attempt `ended` (user ended early) | Neutral card, no celebratory styling. CTAs: start new calculation, view history |
| `detection-only` | user only ever used detection flow | Last detection result summary card, CTA to run the calculator |

State precedence when several could apply: `interrupted` > `active-break` > `completed-break` (until dismissed/acknowledged once) > `profile-no-break` > `no-profile` > `first-launch`.

### 2.3 First launch

One screen, no carousel:

- Title: **T-Break Calculator**
- One-line promise: "A private, on-device planner for tolerance breaks, cutting down, staying off, and drug-test basics."
- Three bullet reassurances (icons + one line each): works offline · stored only on this device · no account needed.
- Safety/eligibility block: placeholder slot `safety_first_launch` — final wording is a release blocker per `CALCULATOR_SPEC.md` §14 (age eligibility, health warnings, urgent-help pointer, disclaimer). The screen ships with this block present; content is supplied by the reviewed safety copy, not invented here.
- CTA: **Get started** → questionnaire Q1.

First launch MUST NOT include an install prompt gate, notification permission request, or sign-in. Install is offered from Settings and as a passive banner after the first completed calculation.

### 2.4 Resuming where the user left off

- An unfinished questionnaire persists locally after every answered step. Relaunching the app shows a resume card on `Today`: "Finish your calculation — 3 answers saved" with **Resume** (returns to the first unanswered step) and **Start over**.
- An active or interrupted break always surfaces on `Today` without navigation.
- Resume state is device-local; closing the app mid-flow never loses answers.

---

## 3. Questionnaire — global behaviour

### 3.1 Step anatomy

Every questionnaire step uses the same anatomy:

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

- **Progress treatment:** a slim determinate bar at top, not "Step 3 of 12". Branching makes a step count dishonest; the bar fills by position along the resolved path for the current goal and nudges forward on each advance. It never moves backward when a branch removes steps.
- **Back/edit:** a `Back` control on every step returns to the previous *shown* step (not the previous step in the master list). Changing an earlier answer re-runs branching from that point; answers that remain valid under the new branch are kept, answers made irrelevant are dropped silently. There is no separate "review all answers" page in v1; the result screen lists the answers that drove the result (§8.2) with per-row edit.
- **Continue gating:** `Continue` is disabled until the step's required answer exists. Validation is per-step and immediate (§3.4); cross-field rules are checked before calculation and reported on the step that must change (§3.5).
- **Close (✕):** closes the flow, persists answers, returns to `Today` (resume card appears).
- **Motion:** steps slide horizontally (forward = from right). 250 ms ease-out. Disabled under `prefers-reduced-motion` (instant swap).

### 3.2 Control inventory (mobile-first)

| Control | Used for | Notes |
|---|---|---|
| Large single-select cards/chips | goal, break-yes/no, matrix, context, post-break mode, day-part | full-width, min 56 pt tall, one tap selects **and** advances |
| Multi-select chips | products, routes | toggling does not advance; `Continue` required |
| Slider with live numeric readout | use-days (0–30), previous-break score (0–10) | large thumb (min 44 pt), value label above thumb |
| Stepper (− value +) | sessions, previous-break duration, flower grams | tap-hold to repeat; direct tap on value opens numeric pad as escape hatch |
| Date wheel + day-part chips | last use, previous-break end, interruption `usedAt` | see §3.3 |
| Toggle | usedThc in check-in | |
| Single-line text | check-in note (optional) | the only keyboard in v1 |

One-tap-select-and-advance applies only to single-select questions. Everything else needs an explicit `Continue`.

### 3.3 Date/time entry (maps to `SourcedValue<timestamp>`)

The engines require an ISO-8601 timestamp with timezone, but users think in days. All date questions use the same composite control:

1. **Quick chips:** `Today`, `Yesterday`, `2–3 days ago`, `About a week ago`, `About 2 weeks ago`, `About a month ago`, `Pick a date`.
2. **`Pick a date`** opens a native-style date wheel constrained to the valid window for that question (last use: today back 30×24 h when use-days > 0; unbounded past otherwise).
3. **Day-part chips** (asked on the same screen, under the date): `Morning` / `Afternoon` / `Evening` / `Night` — mapped to fixed local hours 09:00 / 13:00 / 18:00 / 23:00. For `Today`, the default is the current time minus one hour (never a future timestamp). Ranges such as `2–3 days ago` map to the midpoint (2.5 days) at the selected day-part.

The UI then submits an ISO string with the device's current UTC offset. Every such answer is stored with `provenance: user_estimate`. Helper copy on every date step: "A rough answer is fine — the calculator works in whole days."

Design note: day-part mapping can shift the true instant by up to ~12 hours. This is acceptable because every downstream display (break day, withdrawal position, target date) is day-granular, and the alternative (fake precision like a minute picker) is worse UX. Flagged in §13, F3.

### 3.4 Per-step validation

- Sliders/steppers are constrained by construction (0–30, 0–10, ≥1) and cannot produce invalid values.
- Date wheels are window-constrained; a future last-use date is impossible to pick.
- Numeric entry escape hatches clamp and show inline error text on the step: red-tinted helper line + haptic; the step never advances with an invalid value.
- Free-text note is length-capped (500 chars) with a live counter.

### 3.5 Cross-field consistency (30-day rule)

The validation layer enforces two contradiction rules (`lastUseAt` vs `thcUseDaysLast30`, both directions). The questionnaire is ordered so a well-behaved path can never produce them (see §4.1: last use is asked first, and a last-use older than 30 days auto-sets use-days to 0 and skips the question). Residual cases arise only from **editing** an earlier answer:

- If an edit creates a contradiction, the affected later step is re-shown with an inline explanation: "You said your last use was within the last 30 days, so '0 days' doesn't fit. Update your answer." The user fixes that step; the app never silently rewrites an answer.
- If contradiction errors still reach the coordinator (defense in depth), the flow routes back to the first contradictory field with the same treatment. A `validation_error` result is never rendered as a result screen.

### 3.6 Terminal states of the questionnaire

Every path ends in exactly one of:

1. **Tolerance result screen** (`tolerance_result`) — §8.1.
2. **Planning screen, no range** (`planning_only`) — abstinence (§8.4) or reduction-without-break (§8.5).
3. **Baseline-low screen** (`not_applicable`, use-days = 0) — §8.6.
4. **Detection result screen** (`qualitative_only`) — §8.7.

From each terminal screen: **Save & continue** (persists snapshot + result + policy version) is implicit — results persist when the user saves or starts a plan per `ARCHITECTURE.md` §7; the terminal screen offers the goal-appropriate next action (start break / view plan / done).

---

## 4. Questionnaire flows (exact order, branching, copy)

### 4.1 Master branching map

```text
Q1 goal
 ├─ tolerance_reset
 │    Q2 last use ──(>30 days ago)──> use-days auto = 0 → skip Q3–Q5 → Q6 prev breaks → Q7 post-break → TERMINAL (baseline-low)
 │        └─(≤30 days)──> Q3 use days ──(= 0)──> contradiction guard: re-ask Q3 (cannot happen from fresh path; edit-only)
 │                        └─(1–30)──> Q4 sessions → Q5 products & routes → Q6 prev breaks → Q7 post-break → TERMINAL (tolerance result)
 ├─ reduction
 │    Q2R break wanted?
 │        ├─ Yes → same as tolerance_reset path (Q2…Q7)
 │        └─ Not now → Q3 use days → Q4 sessions → Q5 products & routes → TERMINAL (reduction planning)
 ├─ abstinence
 │    Q2 last use ──(>30 days ago)──> use-days auto = 0 → skip Q3–Q5 → TERMINAL (abstinence planning)
 │        └─(≤30 days)──> Q3 use days ──(1–30)──> Q4 sessions → Q5 products & routes → TERMINAL (abstinence planning)
 └─ detection_information
      Q2D test type → Q3D situation → TERMINAL (detection result)
```

Field mapping summary:

| Step | Schema field | Required when |
|---|---|---|
| Q1 | `goal` | always |
| Q2R | `breakRequested` | reduction only (other goals: fixed by rule) |
| Q2 | `lastUseAt` (`user_estimate`) | use-days > 0, or abstinence orientation |
| Q3 | `thcUseDaysLast30` (`user_estimate`) | all non-detection goals |
| Q4 | `sessionsPerUseDay` (`user_estimate`) | use-days 1–30 |
| Q5 | `products[]`, `routes[]` | use-days 1–30 |
| Q6 | `previousBreaks[]` | optional, tolerance paths only |
| Q7 | `postBreakMode` | tolerance_reset, reduction+break |
| Q2D | `DetectionRequest.matrix` | detection goal |
| Q3D | `DetectionRequest.context` | detection goal |

### 4.2 Step-by-step copy deck

**Q1 — Goal** (single-select cards, tap advances)

> **What do you want to do?**
>
> - **Reset my tolerance** — feel THC strongly again
> - **Cut down** — reduce how much I use
> - **Stay off THC** — I'm quitting or already have
> - **Drug test info** — understand detection basics

**Q2R — Break wanted** (reduction only; two cards)

> **Do you want to take a full break as part of cutting down?**
>
> - **Yes** — plan a complete break
> - **Not now** — I just want to reduce

Helper: "You can change this later."

**Q2 — Last use** (date control §3.3)

> **When did you last use THC?**
>
> Helper: "A rough answer is fine — the calculator works in whole days."

Skip/constraint logic: none (always shown on tolerance/reduction+break/abstinence paths). If the answer is older than 30×24 h, use-days is set to 0 internally and Q3–Q5 are skipped.

**Q3 — Use days** (slider 0–30, big numeric readout, quick presets under slider: `Rarely (1–3)`, `Weekends (≈8)`, `Most days (20+)`, `Daily (30)`)

> **In the last 30 days, on how many days did you use THC?**
>
> Helper: "Count any day you used, even once. Your best estimate is fine — there is no 'I don't know' needed here because a rough number is all the calculator uses."

Presets set the slider (8 → 8, 20+ → 25); the user can fine-tune. (Constraint: the engine requires this integer, so an estimate is mandatory — flagged §13, F5.)

**Q4 — Sessions** (stepper, 1–9, plus chips `1` `2` `3+`)

> **On a day you used, how many separate sessions?**
>
> Helper: "One session = one sitting. Waking and baking plus an evening joint is 2."

`3+` sets the value to 3; the stepper allows up to 9. (Values above 2 behave identically in the engine; the cap avoids implying precision that doesn't matter.)

**Q5 — Products & routes** (one screen, two small groups — the only grouped step)

> **What have you been using, and how?**
>
> *Products* (multi-select): **Flower (bud)** · **Concentrates** (wax, shatter, resin) · **Edibles** · **Oils / tinctures** · **Something else**
>
> *How you take it* (multi-select): **Smoking** · **Vaping** · **Dabbing** · **Eating or drinking** · **Under the tongue** · **Other way**
>
> Helper: "Pick all that apply."
>
> Subtle link under the products group, visible only when **Flower** is selected: "Know your flower's strength? Estimate its nominal THC →" (opens the nominal THC sheet §5; purely optional, never required).

Validation: `Continue` disabled until ≥1 product and ≥1 route.

**Q6 — Previous breaks** (tolerance paths only; two cards + expandable entry)

> **Have you taken a tolerance break before?**
>
> - **Yes** — it helps personalise your history insights
> - **No / skip**

On **Yes**, an inline add-form (same screen, expands — not a new step):

> **Previous break 1**
> - **How long did it last?** — stepper, days, min 1. Quick chips: `1 week` `2 weeks` `3 weeks` `1 month`.
> - **How much did it reduce your tolerance afterwards?** — slider 0–10, labels `Not at all` … `Completely`, plus a **Not sure** chip (stores `null` score).
> - **When did it end?** — optional date wheel, **Skip** allowed (stores `endedAt: null`).
>
> [ + Add another break ] [ Done ]

No upper cap in UI beyond practicality; each entry maps to one `PreviousBreak` with app-generated `id` and `createdAt = now`.

**Q7 — After the break** (single-select cards)

> **After this break, what's your plan?**
>
> - **Stay off THC**
> - **Occasional use** — weekends or special occasions
> - **Regular use, but less than before**
> - **Not sure yet**

Helper: "This shapes your post-break plan. Nothing is locked in."

**Q2D — Test type** (detection only; single-select cards)

> **Which kind of test are you asking about?**
>
> - **Urine**
> - **Blood**
> - **Saliva (oral fluid)**
> - **Hair**

Helper: "Not sure? Pick one to see its basics — you can check the others after."

**Q3D — Situation** (detection only; single-select cards)

> **What's the situation?**
>
> - **Just curious / general**
> - **Workplace testing**
> - **Roadside / driving**

Helper: "This only changes which notes we show you — it never changes the science."

### 4.3 Skip conditions (consolidated)

- Q2R shown only for `reduction`.
- Q3–Q5 skipped when last use > 30×24 h ago (use-days auto-0).
- Q4, Q5 shown only when use-days ∈ 1–30.
- Q6 shown only on tolerance paths (`tolerance_reset`, `reduction`+break). Abstinence and reduction-no-break never ask history (the engine only compares history against a tolerance range; collecting it elsewhere would harvest unused data).
- Q7 shown only when the path ends in a tolerance result with a break (`tolerance_reset`, `reduction`+break). Abstinence fixes `postBreakMode = continue_abstinence`; detection must have none; reduction-no-break gets qualitative reduction guidance instead.
- Detection path is exactly 2 questions and collects nothing else — no use profile, no last use (per `ARCHITECTURE.md` §6).

---

## 5. Product / exposure input UX

### 5.1 Principle

V1 uses products and routes as **category chips only** (Q5). Amount and numeric potency are never asked in the main questionnaire — no enabled tolerance rule consumes them (`CALCULATOR_SPEC.md` §4.3). They exist in exactly one place: the optional nominal flower THC calculator.

### 5.2 Nominal flower THC calculator

A modal sheet, reachable from (a) Q5 when Flower is selected, (b) the result screen's tools row, (c) `Plan` tab tools section. Never required, never blocking.

Screen copy:

> **Nominal THC in your flower**
> This estimates the THC contained in the plant material itself.
>
> - **Amount of flower** — stepper in grams, 0.1 g steps, quick chips `0.25 g` `0.5 g` `1 g` `3.5 g`.
> - **THC strength (%)** — stepper 1–40 %, with a provenance toggle directly under it: **From the label** (`label_derived`) / **My estimate** (`user_estimate`). Helper: "Check the packaging if you have it. An estimate is fine."
>
> [ Calculate ]

Result card (same sheet):

> **0.5 g × 20 % = 100 mg nominal THC**
>
> This is the THC in the plant material — not the amount your body absorbs. How much you actually take in depends on how you consume it, and this app doesn't estimate that.

Mandated behaviour:

- The label **nominal THC** is verbatim and unchangeable; never "dose," "absorbed," or "effective" THC.
- The result is never written into the use profile, never feeds the Tolerance Engine, and never persists unless the user is mid-questionnaire (where it survives as scratch until the flow closes).
- If either input is missing, `Calculate` stays disabled — the engine treats missing as a validation error, and the UX pre-empts it by construction.

### 5.3 What is deliberately not asked

BMI, sex, age, hydration, exercise, "fast/slow metabolism", medications, pattern duration ("how many years"), monthly spend, per-session amounts, concentrate potency, cutoff levels, test dates, lab results. None appear anywhere — including settings or "advanced" sections — because no v1 rule consumes them.

---

## 6. Previous T-break / history UX

Beyond the Q6 intake (§4.2), history lives in two places:

1. **History tab → "Past breaks" list.** Each previous break renders as a card: duration, score (or "not rated"), end date if known. Swipe/overflow → delete (with confirm). Completed *current-app* attempts also appear here automatically (from `breakAttempts`), visually distinguished from self-reported history.
2. **Result screen history card (§8.2).** Only when the engine emits a `HistoryInsight`.

Rules:

- History copy is verbatim from the message-template mapping (§14); the UI never interpolates, averages, or renders an "optimal break" from history.
- A previous break with `score = null` ("Not sure") is stored and listed but never contributes to an insight (engine rule).
- The insight card always ends with: "Your history never changes the recommended range."

---

## 7. The four goal flows, end to end

### 7.1 Tolerance reset (`tolerance_reset`)

Q1 → Q2 (last use) → Q3 (use days) → Q4 (sessions) → Q5 (products & routes) → Q6 (previous breaks, optional) → Q7 (post-break mode) → tolerance result screen (§8.1) → start break or save. Fastest path with last use > 30 days ago: 2 answered steps → baseline-low screen (§8.6). `breakRequested` is fixed `true`; never asked.

### 7.2 Reduction (`reduction`)

Q1 → Q2R (break wanted?). **Yes** → identical to 7.1. **Not now** → Q2 → Q3 → Q4 → Q5 → reduction planning screen (§8.5) with user-defined weekly limits and no timeline, no range, no post-break question. One-tap upgrade path back into a full break keeps the door open without pressure.

### 7.3 Abstinence (`abstinence`)

Q1 → Q2 (last use) → [Q3–Q5 if use within 30 days] → abstinence planning screen (§8.4): withdrawal timeline, phase-based plan content, ongoing tracking with no end date and no completion milestone. `breakRequested = false` and `postBreakMode = continue_abstinence` are set silently; return-to-use planning never appears unless the user later changes goal (which requires a fresh calculation).

### 7.4 Detection (`detection_information`)

Q1 → Q2D (test type) → Q3D (situation) → detection result (§8.7). Two questions, qualitative-only result, context note for workplace/roadside, loop to check other matrices. No use data collected; if a profile already exists locally, an elapsed-since-use orientation line may render (never persisted into the `DetectionRequest`).

## 8. Result information architecture

### 8.1 Tolerance result screen (`tolerance_result`)

Scroll order (single screen, cards — this is a *reading* screen, so vertical stacking is correct here):

1. **Primary card**
   > **Recommended break: 21–28 days**
   > **Strong planning target: 28 days**
   > Limited certainty: this is a broad planning heuristic, and individual response varies.

   The range is the visual hero (largest type). The uncertainty line is one plain sentence — exactly one, no badges, no confidence meters (spec §7.6).

2. **Why this result** — plain-language driver list mapped from `drivers`, e.g.:
   > - You use THC most days
   > - Multiple sessions per day
   > - Concentrates in the mix

   (Only drivers actually returned by the engine render; no padding.)

3. **What your past breaks suggest** — present only when `historyInsight` is non-null. Copy per §14 mapping, including the outside-range sentence when `outsideRecommendedRange` is true.

4. **What the first weeks can feel like** — withdrawal timeline (§8.3) anchored to the authoritative last-use.

5. **Your answers** — collapsible row list of the answers that drove the result (use days, sessions, products, routes, last use). Each row has **Edit**, which jumps back into the questionnaire at that step with answers preloaded and re-branches from there.

6. **Actions (sticky bottom bar):**
   - **Start this break** → start-date choice (`Start now` / `Pick a start date`) → creates a `planned` attempt with `targetDurationDays = preferredTargetDays`, then the Plan tab.
   - **Save without starting** → persists the calculation record, returns to `Today` (`profile-no-break` state).

7. **Footer link row:** "Separate topic: **drug-test detection basics →**" (opens detection flow) and "Estimate nominal THC in flower →".

Prohibited on this screen (hard rules): "reset complete", "100 %", "detoxed", "you'll feel it like the first time", any percentage ring of recovery, any safe-to-resume dose, any detection statement.

### 8.2 Driver and insight copy mapping

Full mapping lives in §14. Example (spec §7.7):

> "In your previous breaks, you reported a higher tolerance reduction at 21 days than at 14 days. That observation sits outside today's broad heuristic range and does not change the calculator target."

### 8.3 Withdrawal timeline component

Shared by result screens and the `Plan` tab. Renders the engine-supplied `WithdrawalDisplay` verbatim — the UI MUST NOT recompute statuses:

- A horizontal 4-stop track in fixed order: onset (≈ days 1–3) → common peak (≈ days 2–6) → most acute symptoms ease (≈ days 4–14) → sleep (open-ended).
- Each stop is labelled upcoming / happening now / passed from `status`; overlapping "happening now" states are normal and both render.
- The sleep stop carries no status chip; its copy: "Sleep can take longer to normalise for heavier users — there's no fixed end date."
- Header line: "Typical patterns across people — not a personal prediction." Day position ("You're around day 6") comes from `breakDay` only.
- Status is communicated with icon + text, never colour alone.

### 8.4 Abstinence planning screen (`planning_only`, goal = abstinence)

- No range, no target date, no end state — abstinence has no "completion" by design.
- Header: "Staying off THC — your plan."
- Withdrawal timeline (§8.3) when last use is known (it always is on this path unless > 30 days ago — then the timeline renders all-past or the elapsed-since card: "42 days since your last use").
- Abstinence plan content (deterministic sections, §10.1 days 1–6 / 7–14 / 14–28 copy blocks rendered by phase).
- **Start tracking** CTA → creates an ongoing tracking attempt (no target duration; the attempt uses the same check-in machinery with the completion action hidden).
- No return-to-use planning anywhere on this path (spec §10).

### 8.5 Reduction planning screen (`planning_only`, goal = reduction, no break)

- Header: "Cutting down — without a full break."
- Body: qualitative reduction guidance (no invented numbers): define your own weekly limit (§10.2), favour lower potency, avoid rapid repeat dosing, note edible delayed onset.
- Interactive element: the user sets their own limits (days/week stepper; optional sessions/day stepper) — stored as their plan, never fed to an engine.
- Soft upsell card: "A full break resets tolerance faster than cutting down — want to see your break range?" → re-enters questionnaire at Q2R with prior answers preloaded.
- No withdrawal timeline (engine does not attach one on this route; the UI MUST NOT fabricate it).

### 8.6 Baseline-low screen (`not_applicable`, use-days = 0)

> **Your baseline tolerance is likely already low.**
> You haven't used THC in the last 30 days, so there's no break to recommend — a break only makes sense with recent use to reset from.

- If last use is known: "X days since your last use."
- Actions: **Keep tracking** (optional check-ins), links to detection basics and the nominal THC tool, **Done**.
- This is a calm dead end, not an error. No red styling.

### 8.7 Detection result screen (`qualitative_only`)

Structure:

1. **Banner (always):** "Qualitative information only — this app doesn't estimate detection windows or test outcomes."
2. **Matrix card** — one of four, copy mapped from `interpretationCodes` + `uncertaintyCodes` (§14). Content summary per matrix (source: `detection-copy-policy-v1`):
   - **Urine:** how often and how long you've used, time since last use, and the lab's cutoff all matter; without validated numeric rules, no window or baseline interpretation is possible.
   - **Blood:** no universal clearance window; very low levels can persist with sensitive methods; trace presence is not impairment.
   - **Saliva:** generally a shorter timescale than urine, but heavily dependent on the test's cutoff and technology; unknown test details prevent any estimate.
   - **Hair:** a historical record of exposure, not a day-by-day clock; there is never a "clear by" date.
3. **Context note** (workplace or roadside only): workplace → "Workplace cutoffs and policies vary and are unknown to this app." Roadside → "Roadside rules depend on your jurisdiction's verified regulations, which this app does not include."
4. **What actually helps** — the only allowed framing: "Time plus abstinence is the fundamental mechanism. Normal hydration and routine exercise support wellbeing; no detox product, flush, sauna, fasting, or niacin has a supported clearance effect."
5. **Orientation (only if a local profile exists):** "Days since your last recorded use: N" — references the profile's `lastUseAt`, is never stored in the `DetectionRequest`, and is labelled as general orientation.
6. **Actions:** **Check another test type** (loops to Q2D), **Done**.
7. **Footer divider:** "Tolerance is a separate topic → see your break recommendation" (enters Q1 with tolerance pre-selected). The visual divider and wording keep the concepts separate.

Prohibited: X–Y day windows, pass/fail, "clean date", cutoff numbers, jurisdiction claims (including any Irish threshold), confidence badges.

---

## 9. Break plan, check-ins, interruption

### 9.1 Plan tab

- **No attempt:** explainer card + CTA to run the calculator.
- **Planned attempt:** start date, target duration, **Start now** / change date.
- **Active attempt:** day ring ("Day 12 of 28" — plan progress only, labelled "plan progress", never biological progress), target date, current withdrawal phase strip, this-week focus block (§10.1 phase copy), check-in streak ("4 check-ins this week").
- **Interrupted:** see §9.3.

### 9.2 Daily check-in (transient flow, one screen)

> **Quick check-in — Day 12**
>
> Five sliders (0–10), each with word anchors at both ends:
>
> | Field | 0 anchor | 10 anchor |
> |---|---|---|
> | Craving | No craving | Overwhelming |
> | Sleep | Terrible | Great |
> | Irritability | Calm | Very irritable |
> | Anxiety | None | Severe |
> | Appetite | No appetite | Normal/strong |
>
> - **Did you use THC since your last check-in?** — toggle No/Yes.
> - **Note (optional)** — one line, 500 chars. Helper: "Private, stored only on this device, never analysed."
>
> [ Save check-in ]

- All five sliders default to null-position (thumb parked, no value) and must each be touched once — a single accidental swipe must not record five zeros. Alternatively per-slider "tap to set" then drag; the parked-thumb pattern is REQUIRED.
- Higher always means "more of the named thing" (more craving, better sleep because the thing is *sleep quality*... see §13, F2 — scale direction is pinned by this spec for the UI but should be pinned in the domain spec too).
- Skipping days is normal; no streak-guilt copy, no punitive states.

### 9.3 Interruption ("I used") flow

When `usedThc = Yes` on save:

1. Immediate sheet: **"When did you use?"** — same date/day-part control as §3.3, constrained to after the current segment start. Required; the attempt enters `interrupted_time_needed` and all day counters/target dates everywhere are replaced by a "paused" badge until confirmed.
2. On confirm: the plan restarts. Copy (mandated phrasing per spec §7.9.7):

   > **Plan restarted from your latest use.**
   > Day counters now run from the new date. Your earlier check-ins and progress stay in your history. This is a plan restart — it doesn't claim your body's recovery went back to zero.

3. The target duration stays identical; only the target calendar date moves.
4. Secondary action on the confirmation screen: "Your use pattern may have changed — **recalculate**" (explicit, user-initiated; enters the questionnaire preloaded). Never automatic.

### 9.4 Completing and ending

- On the target date, `Plan` shows **Mark complete** (never auto-completes silently; a banner also appears on `Today`). Completion → celebratory-but-restrained card → post-break plan (§10).
- **End break early** lives behind an overflow menu with a confirm dialog. Resulting state is neutral, no failure language.

---

## 10. Post-break plan UX

Shown after completion (and from History for past attempts), shaped by `postBreakMode`:

| Mode | UX |
|---|---|
| `continue_abstinence` | Progress/history only. No return-to-use controls at all. |
| `occasional` | One setting: **max use days per week** (stepper 1–7). |
| `reduced_regular_use` | Four settings, all user-defined: max use days/week, max sessions/use day, potency strategy (chips: `Lower potency` / `Same` / `Mixed`), quantity strategy (chips: `Smaller amounts` / `Same`). |
| `undecided` | Qualitative options list, nothing to set. |

Every post-break screen leads with the two mandated messages (spec §10): "Your tolerance may be lower than before the break" and "Your previous amount is not a safe restart amount." No numeric dose anywhere. Secondary guidance chips: prefer lower potency, go slow with concentrates, remember edibles hit later. The user can review or pause their plan at any time; there is no automatic "you exceeded" threshold or nag state.

### 10.1 Break-phase copy blocks (deterministic, keyed off `breakDay`)

- **Days 1–6:** routine, regular sleep times, normal food and hydration, avoiding triggers, one replacement activity, short daily check-in.
- **Days 7–14:** distinguish "acute symptoms easing" from "tolerance goal" — feeling better is not the finish line.
- **Days 15–28:** shift to habits and trigger management; explicitly *not* "detox" framing.

These are static versioned copy blocks selected by phase; the UI reads the phase from the engine's `breakDay` and MUST NOT invent additional phases.

---

## 11. Mobile interaction details

- **Touch targets:** min 44×44 pt; primary CTAs min 56 pt tall, full-width minus 16 pt gutters.
- **Bottom action placement:** all primary actions sticky above the bottom safe-area inset (`env(safe-area-inset-bottom)`); flows without bottom nav place the CTA at the same thumb-zone height for muscle-memory consistency.
- **Keyboard:** only the check-in note raises it; `inputmode="decimal"` on numeric escape hatches; the CTA bar lifts above the keyboard.
- **Haptics:** light tick on slider snap and chip select; warning haptic on validation error. Disabled under reduced-motion/OS haptics-off.
- **Validation:** inline, on-step, never toast-only; errors announced to screen readers via `aria-live="polite"`.
- **Optional-detail expansion:** progressive disclosure only (nominal THC link, previous-break add-form, "Your answers" edit rows). Nothing mandatory hides behind an expander.
- **No long forms:** max one logical group per step (Q5's two chip groups is the deliberate ceiling); any screen taller than ~1.5 viewport heights must be split.
- **Accessibility:** WCAG 2.2 AA contrast on the dark palette (§12.4); full VoiceOver/TalkBack pass on questionnaire, check-in, and interruption flows; status never conveyed by colour alone; dynamic type up to 130 % without layout breakage; focus order follows visual order; every icon button has an accessible label.
- **Standalone/PWA behaviour:** installed mode hides browser chrome (manifest `display: standalone`); theme-color matches the dark background so launch is seamless; iOS: apple-touch-icon set, no reliance on `beforeinstallprompt` (Settings shows manual install instructions per platform); service worker updates apply on next launch with a passive "Update ready" snackbar, never mid-flow.
- **Gestures:** swipe-back (iOS edge swipe) maps to the flow's Back; horizontal swipe on tab content is disabled to avoid slider conflicts.

---

## 12. Visual direction

### 12.1 Feel

Dark, premium, calm, tool-like. Think "native sleep-tracker quality," not "AI glass dashboard." No frosted-glass stacks, no neon gradients, no glow blobs, no marketing hero imagery.

### 12.2 Palette (tokens)

| Token | Value | Use |
|---|---|---|
| `bg/base` | `#0E100E` | app background (near-black, green-biased) |
| `bg/card` | `#171B17` | cards, sheets |
| `bg/raised` | `#1F241F` | chips, pressed states |
| `accent/primary` | `#7FB069` | primary CTA, active states, progress |
| `accent/soft` | `#2A3527` | accent-tinted fills (selected chips) |
| `text/primary` | `#F2F4F0` | |
| `text/secondary` | `#A8AFA6` | helpers, meta |
| `text/faint` | `#6B7268` | disabled, placeholders |
| `state/warn` | `#E0B458` | uncertainty/paused badges |
| `state/error` | `#D96C5F` | validation only |
| `state/ok` | `#7FB069` | (shared with accent) |

Colour never carries meaning alone — always paired with icon/text.

### 12.3 Typography roles

System stack (`-apple-system, Segoe UI, Roboto, Inter`). Roles: `display` 34/40 bold (result range only), `title` 22/28 semibold (step questions), `body` 16/24 regular, `meta` 13/18 (helpers), `numeric` 28/34 tabular-nums (day counters, readouts). All-caps allowed only for 11 pt tracking-wide micro-labels on card headers.

### 12.4 Cards, spacing, hierarchy

- Cards: 16 pt radius, 1 pt `bg/raised` border, no shadows (dark UIs read elevation through tint, not shadow).
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Card padding 20. Screen gutters 16.
- One hero element per screen. On result screens the range is the hero; on `Today` the day counter is the hero.
- Progress visualization: the slim questionnaire bar; the plan day ring (labelled "plan progress"). Both are the ONLY progress graphics in v1. Withdrawal is a status track (§8.3), not a chart. No charts anywhere else in v1 — history is a list, not a graph (a check-in trend chart is a deliberate v1.x candidate, not v1).

---

## 13. Offline / local-first behaviour

### 13.1 What works offline

Everything in v1: the full questionnaire, both engines, nominal THC, results, break plans, check-ins, history, settings, deletion. There are zero scientific network calls in v1 (`ARCHITECTURE.md` §11).

### 13.2 Network-state UX

- No offline banners, no "reconnect" toasts — nothing v1 does needs a network.
- A single neutral indicator in Settings ("App is fully offline-capable · all data on this device").
- The service worker caches the shell and all static policies/templates at install; version updates download passively and apply on next launch (never mid-questionnaire or mid-check-in).
- If a future AI interpretation layer ships, it degrades as an absent optional card ("Enhanced explanation unavailable offline") with the full deterministic result untouched. Its placeholder MUST NOT be built in v1.

### 13.3 Storage failure modes (from `ARCHITECTURE.md` §11, UX treatment)

| Condition | UX |
|---|---|
| Storage unavailable (private mode etc.) | Calculation still runs in memory; a persistent slim banner: "This session can't be saved — results will vanish when you close the app." No blocking. |
| Corrupt record | That record shows an "unavailable" placeholder row in History; everything else works; deletion of the corrupt item offered. |
| Delete data | Settings → per-item deletion (check-in, previous break, attempt) with confirm; **Delete everything** requires a typed `DELETE` or 3-second hold confirm, then shows an empty first-launch state. The app makes no encryption claims anywhere in copy. |
| Timezone change | Timestamps are stored as UTC instants; displays reformat silently. No user action, no warning. |

---

## 14. Message-code → copy mapping (template layer ownership)

The UI owns a single template module mapping engine codes to the copy quoted in this document. Implementers MUST NOT write new scientific sentences inline in components.

| Code | User-facing copy |
|---|---|
| `very_infrequent_use` | You use THC only occasionally |
| `regular_nondaily_use` | You use THC regularly, but not daily |
| `frequent_use` | You use THC most days |
| `near_daily_or_daily_use` | You use THC daily or nearly daily |
| `multiple_sessions_per_day` | Multiple sessions per day |
| `concentrate_product_use` | Concentrates in the mix |
| `dabbing_route_use` | Dabbing in the mix |
| `baseline_tolerance_likely_low` | Your baseline tolerance is likely already low |
| `broad_heuristic_individual_response_varies` | Limited certainty: this is a broad planning heuristic, and individual response varies. |
| `history_directional_observation` | In your previous breaks, you reported a higher tolerance reduction at {long} days than at {short} days. |
| `history_outside_population_range` (appended) | That observation sits outside today's broad heuristic range and does not change the calculator target. |
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

Any code missing from this table renders nothing and is logged locally — the UI never freestyles.

---

## 15. Flagged schema / engine decisions that create UX friction

These are **not worked around silently**. Each is designed-around above at the UX layer but should be resolved in the domain spec where marked.

- **F1 — Products/routes/sessions are mandatory for all use-days 1–30, but only matter at ≥ 16.** Validation rule 7 (`CALCULATOR_SPEC.md` §5) requires `sessionsPerUseDay`, ≥1 product, and ≥1 route for any positive use-days, yet the intensity rule only reads them when use-days ≥ 16. A weekends-only user (4–15 days) must answer three questions that cannot change their result. **UX mitigation:** Q4/Q5 are cheap chip/stepper screens with "rough is fine" framing. **Recommended spec change:** make these required only when `thcUseDaysLast30 ≥ 16` (or accept empty arrays below it). This is the single biggest avoidable-friction item.
- **F2 — Check-in scale direction is undefined in the domain spec.** `DailyCheckin` stores five 0–10 integers with no semantic direction. Is `sleep = 10` great sleep or terrible sleep? This spec pins the UI (§9.2: 10 = more of the named thing — better sleep, stronger appetite, worse craving), but mixed-direction scales make history views and any future analysis error-prone. **Recommended spec change:** document anchor semantics per field in `CALCULATOR_SPEC.md` §4.4.
- **F3 — `lastUseAt` requires timestamp precision humans don't have.** The schema requires an exact ISO instant with timezone; users know "about two weeks ago, at night." §3.3 maps coarse answers to fixed day-part hours, injecting up to ±12 h error into elapsed-day and withdrawal positioning. Acceptable at day granularity, but the "exact UTC instant" framing in the spec should acknowledge that provenance is always `user_estimate` in practice and that UI-generated instants are modelled points, not measurements.
- **F4 — `thcUseDaysLast30` has no "I don't know" path.** It's mandatory for all non-detection goals, so the UX must demand an integer estimate from users who genuinely can't recall. Mitigated with presets and "rough is fine" copy; a coarser input mode (bands: 1–3 / 4–15 / 16–25 / 26–30, which is all the engine actually reads) would be more honest and faster. **Recommended spec change:** accept band-level input and map to a canonical integer internally, or explicitly document why integer-only was chosen.
- **F5 — Reduction-without-break gets no withdrawal display.** `planning_only` attaches withdrawal only for abstinence. A reducer who is cutting down from daily use will experience the same early symptoms and will ask where the timeline went. UX honours the engine (no fabricated timeline, §8.5); flagging as a product-completeness gap worth an explicit spec decision.
- **F6 — Detection matrix has no "I don't know" option.** Users often don't know what test they'll face. Validation requires one of four matrices, so Q2D forces a pick. Mitigated with "check each type" looping; a future multi-matrix comparison view would serve this need without schema change.
- **F7 — Abstinence with last use > 30 days ago renders an all-past withdrawal timeline.** Technically correct per engine rules, visually odd ("everything passed"). §8.4 substitutes an elapsed-since card; the spec could formalise this display rule.

---

## 16. Implementation guidance for the coding agent

Build order for the UI layer (after domain steps 1–4, which already exist):

1. **Shell + navigation + state router** (§2): tabs, transient-flow scaffolding, `Today` state machine, local resume persistence.
2. **Questionnaire engine** (§3–4): declarative step definitions from the §4.1 map; controls from §3.2; date control §3.3; branching + edit-rebranch; validation wiring to `validateAndNormalizeProfile`.
3. **Result screens** (§8) consuming real engine output + the §14 template layer.
4. **Break loop** (§9–10): plan tab, check-in flow, interruption flow wired to `break-attempt.ts` transitions.
5. **History + settings + offline hardening** (§6, §13) including deletion flows and service worker.

Acceptance: every questionnaire path in §4.1 reachable; every terminal state renders from real engine output; no string from the prohibited list (§8.1, §8.7) appears anywhere; all flows complete with network disabled; all flows complete with screen reader; resume works across app restarts.
