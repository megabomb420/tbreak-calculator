# T-Break Calculator — UX Specification (PWA)

Status: implementation-ready v1 UX design, revised after adversarial UX review
Version: 0.2.0 (supersedes 0.1.0)
Companion documents: `CALCULATOR_SPEC.md` (0.2.0), `ARCHITECTURE.md` (0.6.0)
Scope: questionnaire flow, result flow, app shell, break tracking, check-ins, history, settings, offline behaviour, visual direction. No science, no engine rule changes. Where a better UX requires a small schema/validation change, the change is flagged explicitly in §15 and MUST be made in the domain spec before the affected flow is implemented — it is never worked around silently.

Normative language: **MUST**, **MUST NOT**, **SHOULD**, **MAY** follow `CALCULATOR_SPEC.md`.

Revision note (0.7.2): PWA polish. (a) Settings → About shows live PWA update state from the same service-worker updater that drives the snackbar — "Up to date" only after a completed check found nothing newer, "Update available" with an Update-now action, "Checking for updates…", or an honest offline/unavailable state. The version display is unchanged. (b) The gear icon uses a corrected, fully symmetric 8-tooth path. (c) The Break Outlook roadmap groups consecutive days whose user-facing guidance is equivalent into labelled ranges (Day N / Days N–M); the exact per-day model is preserved and grouping is a presentation-only transform.

Revision note (0.8.1): interaction polish — app-like touch/selection contract, no visual redesign and no science change. App controls (buttons, chips, tiles, steppers, tab buttons, choice cards, summaries, labels, hold-delete) and chrome text (headings, eyebrows, micro-labels, hero/slider/progress readouts) are `user-select: none` with `-webkit-touch-callout: none`, so taps and long-presses never select UI text or raise iOS web callouts. Editable fields (`input`, `textarea`, `select`, `[contenteditable]`) and long educational/evidence copy (`.body`, `.meta`, `.banner`, `.driver-item`, evidence panels) remain selectable. `-webkit-tap-highlight-color` is transparent (pressed / `:focus-visible` / selected states preserved), tappables use `touch-action: manipulation` (no accidental double-tap zoom; scrolling, sliders and form fields unaffected), scroll panes use `overscroll-behavior-y: contain` and the outlook strip `overscroll-behavior-x: contain`, and icons/SVG/images are not draggable. The iOS 26 viewport contract (`--app-height`, `--chrome-bleed`, `viewport-fit=cover`, `viewport.ts`, in-flow tab bar) is unchanged; no UA sniffing, no fixed chrome.

Revision note (0.8.0): calculator tolerance-v3 + active reduction tracking. (a) The tolerance result hero leads with the actionable planning target ("Plan for N days") and states the evidence range beneath it ("Evidence range: min–max days"); the rail keeps the plan marker at the target inside the evidence bounds. (b) The questionnaire asks sessions + products/routes from 4 use-days up (not only ≥ 16) on range-requested routes — see the §5.1 map, §5.3 and §5.4. (c) `Today` gains a `reduction-active` state with a reduction card for the active reduction tracker (`reduction-records-v2`): rolling-7 use-day count, today's sessions, limits/breach state, a review banner ("consider a 3–7 day pause and review"), **Log THC use**, **Edit plan**, and a recalculation/refresh path. New transient flows: a quick **Log THC use** sheet (product/route, "Use again" fast path), the reduction plan start/edit sheet, and the reduction refresh sheet. (d) The Today router precedence now places `reduction-active` between `abstinence-tracking` and `profile-no-break` (§3.2). No Interval or visual redesign, and no iOS viewport-contract change.

Revision note (0.7.1): questionnaire order — `currentPatternDuration` (Q6) is now the **first substantive use-profile question** on every route that uses it (after Q1 goal, and after Q2R when a reduction requests a break; on abstinence before the last-use anchor). Use-days, sessions, products/routes follow. It is still never asked on reduction-no-break or detection. The Q6 option rows are also a compact two-column layout: full-width cards, title on top and helper directly below, normal wrapping, whole row tappable. No science, engine, history, outlook, or target-selection change.

Revision note (0.7.0): `currentPatternDuration` (Q6) is no longer contextual only. Under the tolerance-v2 target rule it selects the **planning target** inside the unchanged evidence range — a recently established pattern (less than 1 month / 1–6 months) targets the lower anchor of the range, an established pattern (6–24 months / 2–5 years / 5+ years) or a missing legacy duration targets the upper anchor. The recommended range never moves, and duration is still never a days-added formula. “Why this result” explains the target choice; the outlook and the planning-context note follow. In 0.7.0 Q6 was still asked after last use; 0.7.1 moves it first (see above).

Revision note (0.6.0): added `currentPatternDuration` (Q6) as exposure context only — it never changes recommended ranges — and replaced the shallow “first weeks” result block with a full Day 1 → planning-target break outlook reused by Result, Today, and Plan Detail. Q4/Q5 remain restricted to use-days ≥ 16.

Revision note (0.1.0 → 0.2.0): reordered the questionnaire to ask use frequency before last use; removed previous-break and post-break questions from the initial calculation; restricted sessions/products/routes to the band where they can change the result; simplified the result hierarchy to one hero range; collapsed the shell to two tabs; redesigned the check-in around the THC-use question first; removed the elapsed-time line from detection results; pinned down clock semantics and the abstinence tracking state.

Every question maps to a field an enabled v1 engine, plan, history feature, or result-explanation consumes. No question collects data for a deferred feature.

---

## 1. Product framing and design principles

### 1.1 What this app is

A mobile-first, installable, local-first PWA for THC users. It serves four goals:

- reset tolerance / feel THC strongly again (`tolerance_reset`);
- reduce use (`reduction`);
- continue abstinence (`abstinence`);
- drug-test detection information (`detection_information`).

It is a focused utility, not a wellness platform, not a medical intake, not a marketing site.

### 1.2 Design principles

1. **Fast to an answer.** The shortest useful path is 3 questions; the longest is 7. A daily user reaches a recommended range in under a minute. `currentPatternDuration` is the first substantive use-profile question on every route that uses it, so the planner target is known before frequency details are collected.
2. **One decision per screen.** One question, or one very small logical group, per step. No long scrolling forms anywhere.
3. **Buttons over keyboards.** Sliders, steppers, chips, and date wheels by default. Free text exists in exactly one place: the optional check-in note.
4. **Ask only what can change the output.** If an answer cannot affect the deterministic result, the plan, local history, or the contextual explanation shown for that result, the question is not in the flow. `currentPatternDuration` is allowed because it changes the planning target inside the recommended range (tolerance-v3 anchor rule), Why-this-result copy, and break-outlook wording — and, in the single bounded tolerance-v3 case (a frequent 16–25 use-days pattern established for 2–5 / 5+ years), the recommended range itself by one band; it is never a days-added formula.
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

Target date = current segment's anchor + `targetDurationDays` × 24 h, recomputed by the engine after an interruption. The UI renders, never recomputes.

Interruption semantics: a confirmed `usedAt` becomes the new anchor; the previous segment closes and a new one begins; the target duration is unchanged; the target date moves. Copy: "Plan restarted from your latest use" — never "your progress reset to zero".

Timezone changes reformat displays only; stored instants are UTC.

---

## 3. App structure and navigation

### 3.1 Shell model — two tabs, no wasted chrome

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
│      Today    │   History   │  <- the only two tabs
└─────────────────────────────┘
```

- **Tabs (2):** `Today` and `History`. Nothing else earns permanent navigation.
- **Settings:** gear icon, top-right of both tab headers, opens a modal screen. Settings is a rare destination; a permanent tab for it is wasted chrome.
- **Break plan:** not a tab. The active-break card on `Today` *is* the plan summary; tapping it pushes a full plan detail screen (phases, focus blocks, target date, post-break settings). Users think "how is my break going," which is a Today question.
- **Transient full-screen flows** (slide over the shell, own close/back, never in nav):
  - the questionnaire;
  - the daily check-in;
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
| `profile-no-break` | result saved, no active attempt | Result summary card (range + target), CTAs: **Start this break**, **Recalculate**; secondary links: detection info, nominal THC |
| `active-break` | attempt `active` | Day counter ("Day 12 of 28"), target date, current-day outlook from BreakOutlookV1 (not the full day strip), primary CTA **Check in**; tap card → plan detail |
| `interrupted` | attempt `interrupted_time_needed` | Timing suspended; card: "You marked that you used THC. Confirm when, so your plan can restart." CTA **Confirm when** |
| `completed-break` | attempt `completed`, unacknowledged | Completion card ("Break complete — 28 days"), post-break plan summary; acknowledging once flips to `profile-no-break` |
| `abstinence-tracking` | ongoing abstinence tracking, no active attempt | "Day N since your last use", check-in CTA, no target date, no completion state |
| `reduction-active` | live (non-ended) active reduction plan, no break/tracking state | Reduction card: rolling 7-day use-day count vs the plan limit, today's sessions, limits/breach state, **Log THC use**, **Edit plan**, recalculation/refresh CTA |
| `detection-only` | user has only run detection | Last detection summary card, CTA **Get a break recommendation** |

**Precedence:** `interrupted` > `active-break` > `completed-break` (until acknowledged) > `abstinence-tracking` > `reduction-active` > `profile-no-break` > `no-profile` > `first-launch`. The `detection-only` state applies only when no profile or tracking exists at all; once any calculation or tracking exists, those states win and detection history lives in `History`.

**Questionnaire resume:** an unfinished questionnaire persists after every answered step. If no active or interrupted break exists — and no active reduction plan owns Today — the resume card ("Finish your calculation — 3 answers saved", **Resume** / **Start over**) *replaces* the primary state card. If a break is active or interrupted, or a live reduction plan owns Today, the state card stays primary and the resume card renders as a secondary card beneath it. Relaunching mid-flow never loses answers.

### 3.3 First launch

One screen, no carousel:

- Title: **T-Break Calculator**
- Promise: "A private, on-device planner for tolerance breaks, cutting down, staying off, and drug-test basics."
- Three reassurance lines (icon + one line): works offline · stored only on this device · no account needed.
- Safety/eligibility block: slot `safety_first_launch` — final wording is a release blocker per `CALCULATOR_SPEC.md` §14 (age eligibility, health warnings, urgent-help pointer, disclaimer). The block ships in place; content comes from reviewed safety copy, never invented here.
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
| Large single-select cards | goal, break-yes/no, matrix, context | full-width, min 56 pt, one tap selects **and** advances |
| Multi-select chips | products, routes | toggling does not advance; `Continue` required |
| Slider with live readout | use-days (0–30), previous-break score (0–10) | min 44 pt thumb, value label above thumb |
| Stepper (− value +) | sessions, previous-break duration, flower grams, user plan limits | tap-hold repeats; tapping the value opens a numeric pad escape hatch |
| Date wheel + day-part chips | last use, previous-break end, interruption `usedAt` | §4.3 |
| Toggle / two-card choice | check-in THC-use question | |
| Single-line text | check-in note (optional) | the only keyboard in v1 |

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
3. **Reduction planning** (`planning_only`, no break) — §9.4.
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
 │    Q2R break wanted?
 │      ├─ Yes → Q6 current-pattern duration → identical to the tolerance_reset path from Q2
 │      └─ Not now → Q2 use days → TERMINAL reduction planning (no Q6)
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
| Q2R | `breakRequested` | reduction only (fixed by rule for other goals) |
| Q6 | `currentPatternDuration` (`user_estimate`) | first use-profile question after Q1 (tolerance_reset), after Q2R = Yes (reduction with a break), and on abstinence; skipped on reduction-no-break and detection |
| Q2 | `thcUseDaysLast30` (`user_estimate`) | tolerance_reset, reduction (after Q6 when a break is requested) |
| Q2A / Q3 / Q3-opt | `lastUseAt` (`user_estimate`) | abstinence; use-days 1–30; optional when use-days = 0 |
| Q4 | `sessionsPerUseDay` (`user_estimate`) | range-requested routes, use-days 4–30 only |
| Q5 | `products[]`, `routes[]` | range-requested routes, use-days 4–30 only |
| Q2D | `DetectionRequest.matrix` | detection goal |
| Q3D | `DetectionRequest.context` | detection goal |

Q4/Q5 are asked on range-requested routes from **4 use-days up** because the tolerance-v3 classification reads intensity signals at that boundary (`tolerance-policy-v3`: sessions ≥ 2, concentrates, or dabbing can move a 4–15 use-day profile one adjacent band to 14–21, and a 16–25 use-day profile to 21–28). Asking a 1–3 use-day user about concentrates cannot change their 2–7 result, so those fields are optional there and never required at 0. Q6 is the first use-profile question because duration is exposure context for Why-this-result, outlook wording, and — under tolerance-v3 — the planning-target anchor inside the range, with one bounded range move for an already-frequent (16–25 use-days) long-established pattern; it is never a days-added formula. Zero use-days is only discovered after Q6, so a 0-day tolerance_reset completion carries a stored duration band that the baseline-low result ignores. A 4–15 use-day profile that also involves concentrate or multi-session use IS routed to Q4/Q5 and classified one adjacent band up; the rationale explains that intensity moved the band.

### 5.2 Step-by-step copy deck

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

This is **not** lifetime cannabis use. The answer selects the planning target inside the recommended range (a recently established pattern — under 1 month / 1–6 months — targets the lower end; a pattern established for 6+ months, or a legacy profile with no answer, targets the upper end), plus Why-this-result copy and break-outlook wording. It MUST NOT add, subtract, or multiply days as a formula. Under tolerance-v3 it may move the recommended range itself in exactly one bounded case — a frequent (16–25 use-days) pattern established for 2–5 / 5+ years is classified into the adjacent 21–28 band; every other duration answer leaves the range unchanged.

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

- Q2R only for `reduction`.
- Q6 (current-pattern duration) is the first use-profile question after Q1 on `tolerance_reset`, after Q2R = Yes on reduction-with-a-break, and after Q1 on abstinence. Skipped on reduction-no-break and detection. Zero use-days is only discovered after Q6 on the tolerance route; the stored duration band is then ignored by the baseline-low result.
- Q2 (use days) after Q6 on the tolerance route; Q3 (last use) only when use-days ∈ 1–30; replaced by optional Q3-opt when use-days = 0.
- Q4/Q5 only on range-requested routes when use-days ∈ 4–30 (intensity can change the classification from 4 up); optional when present at 1–3, never asked at 0.
- Abstinence asks no use-days, sessions, products, or routes: none of them change the abstinence numeric output. Q6 is asked because duration still personalises outlook wording. **Depends on validation change D2 (§15).**
- Reduction-no-break asks no last use and no duration: the engine attaches no withdrawal display and no target on this route, so those answers would be harvested and unused. **Depends on validation change D3 (§15).**
- Detection is exactly 2 questions and collects no use profile (per `ARCHITECTURE.md` §6).
- Previous breaks and post-break mode never appear in the initial questionnaire (§7, §8).

### 5.4 Step counts per goal (final)

| Goal | Min steps | Typical | Max |
|---|---|---|---|
| tolerance_reset | 3 (use-days 0, Q3-opt skipped) | 4 (use-days 1–3) or 6 (use-days 4–30) | 6 (use-days 4–30) |
| reduction (break) | 4 | 5 (use-days 1–3) or 7 (use-days 4–30) | 7 (use-days 4–30) |
| reduction (no break) | 3 | 3 | 3 |
| abstinence | 3 | 3 | 3 |
| detection_information | 3 | 3 | 3 |

Duration (Q6) is counted in every consuming min/typical/max: it is the first use-profile question, before use-days. Q4/Q5 are counted on range-requested routes from 4 use-days up (a 0-day tolerance_reset path is 3 steps when the optional last-use Q3-opt is skipped, 4 when answered; 1–3 use-days is 4 steps).

---

## 6. Nominal flower THC calculator

A modal sheet reachable from (a) Q5 when Flower is selected, (b) the result screen tools row, (c) the plan detail screen tools row. Never required, never blocking.

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

Creates a `planned` (future date) or `active` (now) attempt with `targetDurationDays = preferredTargetDays`. The mode is editable later from the plan detail screen. Abstinence users never see this — their mode is fixed to `continue_abstinence` and no finite break is created.

Post-break plan presentation (after completion, and from History), by mode:

| Mode | UX |
|---|---|
| `continue_abstinence` | Progress/history only; no return-to-use controls |
| `occasional` | One setting: **max use days per week** (stepper 1–7) |
| `reduced_regular_use` | Four user-defined settings: max use days/week, max sessions/use day, potency strategy (`Lower` / `Same` / `Mixed`), quantity strategy (`Smaller` / `Same`) |
| `undecided` | Qualitative options list; nothing to set |

Every post-break screen leads with the two mandated messages (spec §10): "Your tolerance may be lower than before the break" and "Your previous amount is not a safe restart amount." No numeric dose anywhere. Guidance chips: prefer lower potency, go slow with concentrates, edibles hit later. Manual review/pause only — no automatic exceedance threshold, no nag states.

---

## 9. Result information architecture

### 9.1 Tolerance result screen (`tolerance_result`)

Single reading screen, cards in scroll order:

1. **Primary card — plan target first, evidence range beneath:**

   > **Your plan**
   > Plan for **28 days**
   > Evidence range: 21–28 days
   > Limited certainty: this is a broad planning heuristic, and individual response varies.

   The hero element is the actionable planning target (large “N days” numeral, accessible label “Plan for N days”), because that is what the user acts on. The broad evidence range is the supporting meta line directly beneath it (“Evidence range: min–max days”), and the range-band rail marks the target's position inside those bounds, so the two are never conflated: the target is a planning choice inside the evidence range, not a second, tighter claim. The target stays position-aware in the Why-this-result rationale: at the lower anchor of the range (a recently established pattern) it reads “the planner selects 21 days — the lower end of the same 21–28 day evidence range”; at the upper anchor “…the upper end…”. An interior target raised by a clean in-range history observation is described as the user's own observed anchor (history never widens or narrows the evidence range). The uncertainty sentence is exactly one plain line — no badges, no meters (spec §7.6). A short **planning-context** meta line (spec §7.6) may follow it, e.g. "Planning context: use frequency, how long the current pattern has lasted, sessions, products, and routes. Fuller exposure context shapes the recommendation inside the evidence bounds — it does not raise scientific certainty." Never a percentage.

2. **Why this result** — driver list mapped via §14, e.g. for a long-established daily user:
   > - You use THC daily or nearly daily
   > - Multiple sessions per day
   > - This current pattern has been typical for many years
   > - This current pattern has been established for a while, so the planner selects 28 days — the upper end of the same 21–28 day evidence range. That is a planning choice inside the range, not a predicted reset date.

   And for a recently established daily user (same 21–28 range, lower target):
   > - This current pattern is recent — weeks rather than years
   > - Your current pattern is recent, so the planner selects 21 days — the lower end of the same 21–28 day evidence range. That is a planning choice inside the range, not a predicted reset date.

   Duration drivers and target-rationale lines are presentation-layer only. They MUST NOT appear as Tolerance Engine driver codes. A frozen pre-0.7.0 record whose stored target is the top of the range keeps the historical contextual line ("How long this pattern has lasted is useful context. It does not change the recommended day range.") and never claims a lower-end choice.

3. **Your break outlook** — full Day 1 → planning-target roadmap from BreakOutlookV1 (§9.7). A 2 / 7 / 14 / 21 / 28 day anchor target shows exactly those days; an interior target raised by a clean in-range history observation runs exactly Days 1 → that observed day. Every planned day is inspectable before **Start this break**. Not 28 giant cards: a compact day-chip strip plus one inspector, plus overlapping evidence windows.

4. **Useful withdrawal / tolerance context** — expandable CB1 / concept note from EvidenceGuidanceV1. Approximately four weeks is a research reference in chronic users, not a personal reset day.

5. **History prompt card** (§7) or, when records exist and were included, the **history insight card** (§9.2).

6. **Your answers** — collapsible rows for the answers that drove this result (use days; last use; current-pattern duration when asked; plus sessions/products/routes when asked). Each row: **Edit** → re-enters the questionnaire at that step, preloaded, re-branching from there. Editing triggers an explicit recalculation — the existing record is never silently overwritten.

7. **Actions (sticky bottom):** **Start this break** → break-start sheet (§8). **Save without starting** → persists the record, `Today` (`profile-no-break`).

8. **Footer links:** "Separate topic: **drug-test detection basics →**" and "Estimate nominal THC in flower →".

Prohibited here: "reset complete", "100 %", "detoxed", any recovery percentage ring, any safe-restart dose, any detection statement.

### 9.2 History insight card

Present only when the engine returns a non-null `HistoryInsight`. Copy per §14, including the outside-range sentence when `outsideRecommendedRange` is true. When the tolerance-v3 in-range override fired (limitation code `heuristic_history_target_within_range_v3`), the card appends the observed-anchor sentence instead: "Your {long}-day observation sits inside the current {min}–{max} day range, so the planner used that observed anchor as the planning target. History never widens or narrows the evidence range." In every other case the card ends with: "Your history never changes the recommended range."

### 9.3 Abstinence planning screen (`planning_only`, goal = abstinence)

- Header: "Staying off THC — your plan." No range, no target date, no completion state.
- Full break outlook (§9.7) as an open-ended 1–28 inspectable reference, anchored to last use (Q2A always collects it). After-28 remains available; there is no finish line.
- Phase-based plan content (§10.1) by `breakDay`.
- **Start tracking** CTA → opens ongoing abstinence tracking (§9.8).
- No return-to-use controls anywhere on this path.

### 9.4 Reduction planning screen (`planning_only`, goal = reduction, no break)

- Header: "Cutting down — without a full break."
- Body: qualitative guidance only (no invented numbers): set your own weekly limit, favour lower potency, avoid rapid repeat dosing, remember edibles' delayed onset.
- Interactive: user-defined limits (max use days/week stepper; optional max sessions/use day stepper) — stored as the user's plan, never fed to an engine.
- Soft card: "A full break resets tolerance faster than cutting down — **see your break range**" → re-enters the questionnaire at Q2R with answers preloaded.
- No withdrawal timeline (the engine attaches none on this route; the UI MUST NOT fabricate one).

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

Shared by Result, Today, and Plan Detail. One deterministic derivation from EvidenceGuidanceV1 overlapping windows plus optional exposure context. UI MUST NOT invent a second science-copy implementation.

- Finite planning target: exactly Days 1–`preferredTargetDays` — usually one of the anchor targets 2 / 7 / 14 / 21 / 28, or an interior observed in-range history anchor under the tolerance-v3 override. No duplicates, no gaps, no extra days.
- Open-ended tracking: Days 1–28 inspectable plus the After-28 window. No finish percentage at day 28.
- Mobile-first: horizontal day-chip strip + one inspector (stage, may notice, can help, what matters, what usually comes next) + overlapping window roadmap. Not a wall of cards.
- **Grouped roadmap (0.7.2):** the chip strip is a presentation transform that collapses consecutive days whose meaningful user-facing guidance is equivalent (same evidence windows, stage, may-notice, can-help, what-matters, next-stage, milestone, tone, and any stored check-in). Labels read `Day 1` / `Days 2–3` / `Days 4–6`. Milestone days and check-in days with unique content always keep their own entry. The exact per-day model (`days`) stays authoritative; grouping is derived (`segments`) and cannot change a recommendation, target, or day count.
- When a multi-day segment contains the exact current day, the segment is marked current and the inspector shows a "Today: Day N" line. The exact `breakDay` is never replaced by a coarse range.
- Result previews the whole journey before Start this break. Today shows only the current day. Plan Detail shows past / current / future grouped segments, overlapping windows, milestones, and stored check-in ratings on the days they belong to.
- A day may sit in more than one evidence window. Overlaps MUST stay visible.
- Lighter / infrequent / recently established copy MUST NOT present severe withdrawal as expected. Frequent / multiple-session / concentrate / long-established copy MAY say stronger withdrawal or longer sleep disturbance may be more plausible. Always: may / can / commonly / more plausible.
- Duration may change the planning target inside the range (tolerance-v3 anchor rule), the outlook tone, and — only for an already-frequent (16–25 use-days) long-established pattern — the recommended range by one bounded band to 21–28. It is never a days-added formula.
- Check-in observations are factual stored ratings. Null ≠ 0. Missing days are skipped. No recovery score.
- Historical calculation records stay frozen. Outlook is derived at display from the stored profile and stored target.

The exclusive engine withdrawal strip (onset 1–3 / peak 2–6 / easing 4–14 / sleep open-ended) remains engine output and MUST NOT be recomputed by the UI. Result no longer uses that strip as the primary “first weeks” block.

### 9.8 Abstinence / open-ended tracking state

Abstinence has no finite break, so it MUST NOT be modelled as a `BreakAttempt` with a target. **Depends on domain change D4 (§15)** — a tracking record without `targetDurationDays` and without `completed`:

- `Today` shows "Day N since your last use" (from `breakDay`), a check-in CTA, and the current phase focus line.
- Check-ins are optional and open-ended; no streak-guilt copy.
- The user can **Stop tracking** at any time (overflow menu, confirm) — a neutral end, no failure framing, history preserved.
- If the user reports use in a check-in, the same interruption mechanics apply (new anchor, honest restart copy) minus any target-date recomputation (there is none).

---

## 10. Break plan, check-ins, interruption

### 10.1 Plan detail screen (pushed from `Today`)

- Day ring: "Day 12 of 28", labelled **plan progress** — never biological progress. Target date beneath.
- Compact current-day guidance at the top: current stage, what you may notice, what can help today, one next-stage expectation, Then → Now when enough check-ins exist.
- Full break outlook (§9.7) with past / current / future days, overlapping evidence windows, milestones, and check-in observations on the days they were recorded. Result already previewed this journey; Plan Detail is the running version.
- Optional trigger/if-then plan (Preparation).
- Detox-claims panel from Plan detail (not a tab): wellbeing vs elimination, app-specific A–D scale (not GRADE).
- Post-break settings (mode + limits, §8), editable.
- Overflow: **End break early** (confirm dialog; neutral resulting state), **Recalculate profile**.

### 10.2 Daily check-in — use-first design

The check-in exists primarily to catch the one event that changes the plan: THC use. Symptom ratings are secondary and optional.

**Screen 1 (the whole required flow):**

> **Check-in — Day 12**
>
> **Any THC since your last check-in?**
> - **No** 
> - **Yes**
>
> [ Save ]   [ Add how you're feeling → ]

- **No → Save:** done. Two taps total. This is the daily fast path.
- **Yes:** immediately opens the interruption sheet (§10.3); symptom entry is not offered on a use day (the plan event dominates; ratings on a use day add noise).
- **Add how you're feeling →** opens the optional symptom screen.

**Screen 2 (optional symptoms):**

> **How are you feeling?** *(optional — skip any)*
>
> Five sliders (0–10), parked-thumb pattern (each starts unset; an accidental swipe must not record zeros):
>
> | Field | 0 anchor | 10 anchor |
> |---|---|---|
> | Craving | None | Overwhelming |
> | Sleep quality | Terrible | Great |
> | Irritability | Calm | Very irritable |
> | Anxiety | None | Severe |
> | Appetite | None | Normal/strong |
>
> - **Note (optional)** — one line, 500 chars. Helper: "Private, stored only on this device, never analysed."
>
> [ Save ]

- 10 always means "more of the named thing" (stronger craving, better sleep quality, stronger appetite). This pins the direction the domain schema leaves undefined (§15, R2).
- Untouched sliders are stored as `null`. **Depends on domain change D5 (§15)** — `DailyCheckin` currently requires all five integers.
- Skipping days is normal; no punitive states, no streak pressure.

### 10.3 Interruption ("I used") flow

1. Sheet: **"When did you use?"** — date control §4.3, constrained to after the current segment start (and not in the future). Required. Until confirmed, the attempt is `interrupted_time_needed`: every day counter and target date everywhere shows a "paused" badge instead of a number.
2. On confirm — mandated phrasing (spec §7.9.7):

   > **Plan restarted from your latest use.**
   > Day counters now run from the new date. Your earlier check-ins and progress stay in your history. This restarts the plan clock — it doesn't claim your body's recovery went back to zero.

3. Target duration unchanged; target date recomputed by the engine from the new anchor.
4. Secondary action: "Your use pattern may have changed — **recalculate**" (explicit, preloaded questionnaire). Never automatic.

### 10.4 Completing and ending

- On/after the target date, `Today` shows **Mark complete** (never silent auto-complete). Completion → restrained completion card → post-break plan (§8).
- **End break early**: overflow + confirm. Neutral state, no failure language.

---

## 11. Mobile interaction details

- **Touch targets:** min 44×44 pt; primary CTAs min 56 pt, full-width minus 16 pt gutters.
- **Bottom action placement:** primary actions sticky above `env(safe-area-inset-bottom)`; flows without tab bar place CTAs at the same thumb-zone height.
- **Keyboard:** only the check-in note raises it; `inputmode="decimal"` on numeric escape hatches; CTA bar lifts above the keyboard.
- **Haptics:** light tick on slider snap and chip select; warning haptic on validation error; respects OS settings.
- **Validation:** inline, on-step, never toast-only; errors announced via `aria-live="polite"`.
- **Progressive disclosure:** nominal THC link, previous-break add, symptom screen, "Your answers" rows. Nothing mandatory hides behind an expander.
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
| `text/faint` | `#6E7785` | micro-labels, disabled |
| `state/warn` | `#D4A574` | uncertainty / validation warnings |
| `state/error` | `#C97A72` | validation / delete only |
| `state/ok` | `#7D9A8A` | past/complete marks only — not brand |

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
- Progress graphics that are honest to the engines: slim questionnaire bar; recommended-break range band on a 0–28-day rail (v1 policy ceiling) with min/max labels and a plan marker at `preferredTargetDays`. Withdrawal is a status track (icon + text), not a chart; sleep stays undated. History is a list, not a graph. The plan day ring (labelled "plan progress") remains the graphic for the unbuilt break loop (§16 step 4).

---

---

## 13. Offline / local-first behaviour

### 13.1 What works offline

Everything in v1: questionnaire, both engines, nominal THC, results, plans, check-ins, history, settings, deletion. Zero scientific network calls in v1 (`ARCHITECTURE.md` §11).

### 13.2 Network-state UX

- No offline banners, no reconnect toasts — nothing v1 does needs a network.
- One neutral Settings line: "Fully offline-capable · all data on this device".
- Service worker caches shell + static policies/templates at install; updates download passively and apply on next launch, never mid-flow.
- A future AI interpretation layer degrades as an absent optional card ("Enhanced explanation unavailable offline") with the deterministic result untouched. Its placeholder MUST NOT be built in v1.

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

---

## 15. Issues register — resolved / requires domain change / deferred

### 15.1 Resolved in UX (no domain change needed)

- **R1 — Last-use-first vs 30-day window (was a blocker).** Resolved by reordering: use-days is asked first, and the last-use wheel's valid window is derived from that answer (≤30 days when use-days 1–30; >30 days when 0). Both contradiction directions are impossible on a fresh path and handled by re-constrained re-entry after edits (§4.4).
- **R2 — Reduction "not now" / last-use contradiction (was a blocker).** Resolved by removal: the reduction-no-break path no longer collects `lastUseAt` at all (the engine attaches no withdrawal display on this route, so the timestamp was unused). Requires D3 to pass validation.
- **R3 — Clock semantics (was a blocker).** Pinned in §2: anchor (`lastUseAt`), abstinence clock (`breakDay`), commitment marker (plan start, which never moves the clock). All day displays read `breakDay`; target dates are engine-computed.
- **R4 — Today state precedence incl. resume and detection-only (was a blocker).** Pinned in §3.2 with explicit precedence and resume-card placement rules.
- **R5 — Result hierarchy.** Resolved: one hero range; planning target demoted to a supporting meta line; single uncertainty sentence (§9.1).
- **R6 — Detection elapsed-time implication.** Resolved: the personal "days since last use" line is removed from detection results (§9.6).
- **R7 — Intake burden.** Resolved: previous-break questions → contextual flow (§7); post-break mode → break-start sheet (§8). Initial questionnaire is 2–7 steps. Q6 is the only added contextual question; Q4/Q5 stay at ≥16.
- **R8 — Timestamp precision vs human memory.** Mitigated by day-part chips (§4.3); documented as a known, accepted ±12 h modelling error because all displays are day-granular. No change required, but the domain spec SHOULD acknowledge that UI-submitted instants are modelled points with `user_estimate` provenance, not measurements.
- **R9 — "The duration question feels pointless" (0.7.0).** Resolved by the tolerance-v2 target rule (`CALCULATOR_SPEC.md` §7.3): duration now selects the planning target anchor inside the unchanged evidence range — recently established (`under_1_month`, `1_to_6_months`) → lower anchor; established (≥ 6 months) or legacy-missing → upper anchor. The range never moves and no duration-to-days formula exists. UX wiring: position-aware "Plan for N days" line, duration + target-rationale driver bullets, and a deterministic planning-context note (never a percentage). Q6 routing is unchanged.

### 15.2 Requires domain/spec change (small, explicit — must land before the affected UI ships)

- **D1 — Restrict sessions/products/routes requirement to the band that uses them.** `CALCULATOR_SPEC.md` §5 rule 7 currently requires `sessionsPerUseDay`, ≥1 product, and ≥1 route for *any* positive use-days; the intensity rule reads them only at ≥16. Change: require them only when `thcUseDaysLast30 ≥ 16`; keep the zero-day prohibition. Blocks Q4/Q5 conditional flow (§5.1). *(Formerly F1.)* **Superseded by tolerance-v3 (0.8.0):** the v3 classification reads intensity signals from 4 use-days up, so rule 7 now requires these fields when `thcUseDaysLast30 ≥ 4` on range-requested routes; they stay optional at 1–3 and are never required at 0.
- **D2 — Drop the use-days requirement for abstinence.** `GOALS_REQUIRING_USE_DAYS` includes `abstinence`, but no abstinence output reads `thcUseDaysLast30`; asking it also re-imports the 30-day contradiction rules onto the quitting-today user. Change: abstinence requires only `lastUseAt`; rules 4–6 apply only when use-days is present. Blocks the 2-step abstinence flow (§5.1). *(New.)*
- **D3 — Don't require `lastUseAt` for reduction-no-break.** Rule 6 requires `lastUseAt` whenever use-days > 0, regardless of goal; the reduction planning route consumes no timestamp. Change: rule 6 applies only on routes whose outputs use `lastUseAt` (tolerance_reset, reduction+break, abstinence). Blocks the 3-step reduction-no-break flow. *(New.)*
- **D4 — Abstinence tracking without a finite target.** `BreakAttempt` requires `targetDurationDays` and its terminal states assume completion; abstinence tracking is open-ended with no completion milestone. Change: nullable `targetDurationDays` (or a distinct open-ended tracking record type), with the interruption mechanics unchanged. Blocks §9.8. *(New.)*
- **D5 — Nullable check-in symptom fields.** `DailyCheckin` requires all five 0–10 integers; the use-first check-in stores untouched sliders as `null`. Change: `craving | sleep | irritability | anxiety | appetite` become `integer 0..10 or null`, and the spec documents each field's anchor semantics (10 = more of the named thing). Blocks §10.2. *(Formerly F2, now a concrete change.)*

### 15.3 Safely deferred (no v1 action)

- **Band-level use-days input** (accept 1–3 / 4–15 / 16–25 / 26–30 instead of an integer) — presets mitigate the burden; revisit if testing shows recall friction. *(Formerly F4.)*
- **Withdrawal display on the reduction-no-break route** — engine attaches none; a reducer quitting from daily use may want it. Product decision, post-v1. *(Formerly F5.)*
- **Multi-matrix detection compare view** for "not sure which test" users. *(Formerly F6.)*
- **Check-in trend chart** in History (v1.x candidate, §12.4).
- **All-past withdrawal timeline display rule** for long-abstinent users — handled by copy in §9.3; formal display rule deferred. *(Formerly F7.)*

---

## 16. Implementation guidance

Domain prerequisites from §15.2 must land first (D1–D5 are small validation/schema edits with test updates). Then:

1. **Shell + state router** (§3): two tabs, gear-modal settings, transient-flow scaffolding, `Today` state machine with precedence and resume, local persistence of questionnaire progress.
2. **Questionnaire engine** (§4–5): declarative steps from the §5.1 map; controls §4.2; date control §4.3; branch/re-branch; validation wiring.
3. **Result screens** (§9) from real engine output + the §14 template layer.
4. **Break loop** (§8, §10): break-start sheet, plan detail, use-first check-in, interruption — wired to the break state machine.
5. **History + contextual flows** (§7), settings, deletion, offline hardening (§13).
6. **Runtime AI / DeepSeek** — not started. Companion copy stays deterministic local EvidenceGuidanceV1 + BreakOutlookV1.

Acceptance: every path in §5.1 reachable with the stated step counts; every terminal state renders from real engine output; no prohibited string (§9.1, §9.6) appears; all flows complete offline; all flows complete with a screen reader; resume works across restarts; no screen asks a question that cannot change a v1 output, plan, history record, or result-explanation.
