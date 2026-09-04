# T-Break Calculator

Mobile-first, local-first PWA for THC tolerance-break planning. Deterministic
engines own every scientific/numeric output. No account, no network science,
and no runtime generative AI: every explanation, Recovery Outlook and personal
summary is deterministic and computed on-device.

Version **0.14.1** — the "Your break" plan screen is recomposed as one calm
editorial document: a single reading column with hairline section rhythm, a
progress-ring hero with quiet fact rows, an inline support-area line, scannable
dot-marked guidance, and clearly secondary controls. Presentation only — no
science, taxonomy, routing, or persistence change.

Version **0.14.0** — support areas now use a grouped real-problem taxonomy:
**mind & mood** (anxiety, irritability, low mood), **sleep** (sleep, vivid
dreams), **cravings & habits** (cravings, routine, boredom), and **body**
(appetite, nausea, headaches). The first selected area leads Your Plan and
Today guidance; every selected area stays visible. Editing remains a separate
flow outside the scientific questionnaire, and check-ins stay independent. No
numeric science changed.

Version **0.13.0** — companion personalisation is now an optional multi-select
preference flow outside the scientific questionnaire. `supportAreas[]` are
stored independently, can be edited without recalculation, and only select or
reorder deterministic guidance. Legacy single-focus preferences migrate
without rewriting scientific profiles or history. Check-ins remain separate;
no numeric science changed.

Version **0.12.0** — visual unification. The Predicted Reset result language
is now the shared surface contract across the app: one card surface (hairline
border, quiet accent wash), one hairline disclosure pattern with Fraunces
summaries, open editorial sections instead of nested boxes, one left-rule
callout for notices, hairline-divided check-in rows and History list.
Presentation only — no science, tolerance-v3, Recovery Outlook, Reduction,
History, persistence, tabs or viewport change.

Version **0.11.1** — Today visual polish. The decorative orbit/interval
wallpaper behind Today is gone, so every Today state reads on the clean
product surface. Today guidance is de-carded: milestones are editorial lines,
"what matters today" is a restrained left-rule callout, the compact headline
steps below the day/target hero, completed-break's return plan is open text,
and open-ended tracking matches the active-break rhythm. Presentation only —
no science, tolerance-v3, Recovery Outlook, Reduction, History, persistence,
tabs or viewport change.

Version **0.11.0** — product-experience completion. The finite break on Today
now distinguishes the **target-reached** day from **beyond the plan**, with a
phase-aware eyebrow (first days → common peak → settling in → past the peak →
nearing the target → reached → beyond), a calm state note at each of those two
moments, and matching ambience; the compact Today guidance leads with the
milestone, what matters today, and what comes next. Interrupted and completed
states state plainly that nothing is lost, Plan Detail shows the day-counter
anchor and the same reached/beyond note, and the check-in symptom sheet
surfaces the support-focus line and leads with its matching slider. All
presentation-only: tolerance-v3, Recovery Outlook, Reduction, History,
persistence, tabs and the viewport contract are unchanged.

Version **0.10.1** — Today consistency patch. The saved tolerance result on
Today (`profile-no-break`) now reuses the same shared result lens as the live
**Your plan** screen: it leads with the actionable planning target (e.g.
`28 DAYS`), shows the broad evidence range and rail beneath it, and keeps the
planning-heuristic caveat. **Start this break** remains the primary action,
with **Recalculate** / **View result** secondary. No science, tolerance-v3,
Recovery Outlook, Reduction, History, persistence, or viewport change.

Version **0.10.0** — one coherent Interval experience. **Your plan** and
**Predicted reset** now share the same result lens, duration typography and
supporting-insight system. Your Plan leads with a personal priority, practical
preparation, what to watch, and a clear target-day action before deeper
explanation. Today adds a restrained phase-aware ambient field and a stronger
Day N → what matters now → check-in hierarchy. One optional companion answer,
`supportFocus`, personalises plan and daily guidance but is stored outside the
scientific use profile and cannot change tolerance-v3 or Recovery Outlook v2
numbers. Narrow-phone spacing and wider layouts are tightened; motion respects
`prefers-reduced-motion`.

Version **0.9.2** — Recovery Outlook v2. **Your plan** remains the unchanged
tolerance-v3 practical recommendation (maximum 28 days), while **Predicted
reset** now leads with a separate profile-sensitive tolerance-recovery window.
The highest-burden daily + intensity + long-duration class can show about 4–6
weeks; the post-four-week portion is explicitly a lower-directness product
heuristic, not a validated complete-reset endpoint. Day 28 remains the separate
human CB1 PET reference. New records freeze the outlook version and old v1
History stays historical. No runtime AI, network prediction, or percentage
model was added.

Version **0.9.1** — deterministic-only architecture cleanup. Runtime generative
AI is intentionally out of scope and was removed from the product roadmap:
no LLM, no provider inference layer, no AI consent flow, no runtime prompt
infrastructure, and no "enhanced explanation" card. Explanations, Recovery
Intelligence, evidence summaries and personal-history insights remain
deterministic, local, offline and derived from reviewed structured data. No
scientific values, engine behaviour, persistence or UI changed.

Version **0.9.0** — Recovery Intelligence. Tolerance results now separate **your plan** from an evidence-informed **“Predicted reset”** view: a segmented control keeps the plan-first reading screen and adds a deterministic, non-engine recovery outlook (`tolerance-recovery-outlook-v1`) built on the four-week biological reference from PET studies — explicitly “not a 100% reset” — with TIME milestones, your own scored break history kept separate from research, optional recorded check-in facts, and a “Why four weeks?” evidence disclosure. A completed break can be scored once after you actually return to THC (0–10 tolerance reduction, never a reset percentage), and the active-reduction card can show a deterministic “Your tracked pattern has moved.” trajectory when a newer frozen result exists. No engine numbers changed; no percentages or exact reset dates were added.

Version **0.8.1** — interaction polish: app-like touch and selection behaviour (controls and chrome text are not accidentally selectable and suppress iOS long-press callouts, tap flash is removed, tappables use `touch-action: manipulation`, scroll panes contain overscroll, icons are not draggable) while editable fields and long evidence copy stay selectable and keyboard focus-visible states are preserved. The iOS 26 viewport-fill contract and the iOS 26 / Liquid Glass layout are unchanged; no visual redesign.

Version **0.8.0** — tolerance policy v3 + active reduction tracking. The calculator is no longer a single-variable frequency lookup: exposure is classified over frequency (use days in 30) plus intensity (sessions ≥ 2, concentrates, dabbing) and chronicity, bounded to at most one adjacent evidence tier inside the unchanged 2–7 / 7–14 / 14–21 / 21–28 ranges (never above 28). The planning target is chosen inside the final range, and a clean, directional, fully in-range previous-break history can raise that target to the user's own best observed anchor — never the range. A new active reduction tracker logs THC-use events against user-set limits (max use-days in a rolling 7-day window, max sessions per use day, optional strategy), derives the rolling plan state, and flags two distinct breach days in the window with the transparent product rule "consider a 3–7 day pause and review". Old historical results stay frozen; recalculation from tracked use re-runs the engine and freezes a new result.

Version **0.7.2** — PWA polish. Settings → About now shows live PWA update state from the existing service-worker updater (Up to date / Update available with Update-now / Checking / offline-unavailable), the header gear icon uses a corrected symmetric 8-tooth path, and the Break Outlook roadmap groups consecutive days with equivalent guidance into readable ranges (`Days 4–6` instead of three identical chips) while keeping the exact per-day model. No science, engine, target policy, history, persistence, or viewport change.

Version **0.7.1** — questionnaire order + Q6 layout. `currentPatternDuration` is now the **first use-profile question** (before use-days, sessions, products/routes) on every route that uses it, and the Q6 option rows are compact full-width cards (title on top, helper below). No science, engine bands, target policy, history, outlook, or viewport change beyond 0.7.0.

Version **0.7.0** — `currentPatternDuration` is no longer decorative. Under the tolerance-v2 target rule it selects the **planning target** inside the unchanged, evidence-supported recommended range (recently established patterns target the lower end; established or missing ones the upper end). Recommended ranges, engines' bands, History/IndexedDB, Interval, and the iOS 26 viewport-fill contract are unchanged; there is still no duration-to-days formula. Old historical results stay frozen.

Live PWA: https://megabomb420.github.io/tbreak-calculator/

## Run

```bash
npm install
npm run dev
```

Then open the printed local URL (dev is served at `/` on port 8080). Production:

```bash
npm run build
npm run preview
```

The production build uses base `/tbreak-calculator/` for GitHub Pages. Preview is at `http://localhost:4173/tbreak-calculator/`.

## Deploy

GitHub Pages via Actions on `main`:

https://megabomb420.github.io/tbreak-calculator/

## Check

```bash
npm test
npm run typecheck
```

`npm test` runs the Node domain/application suite (incl. golden fixtures) and
the UI component tests.

## Capabilities (0.10.0)

- Questionnaire (goals, branching, resume) and deterministic result screens
  with the §14 template layer, nominal-THC sheet, detection-only flow.
- **Q6 current-pattern duration:** “How long has this level of THC use been
  typical for you?” — five product UX bands, asked as the **first
  use-profile question** after the goal/route choice (before use-days) on
  tolerance reset, reduction with a break, and abstinence. Skipped on
  reduction-no-break and detection. Compact full-width option rows. Q4/Q5
  appear on range-requested routes from 4 use-days up, because tolerance-v3
  reads intensity signals (sessions ≥ 2, concentrates, dabbing) from that
  boundary; they are optional at 1–3 use-days and never required at 0.
- **Multi-factor planning (tolerance-v3):** exposure is classified over
  frequency + intensity + chronicity, bounded to one adjacent evidence tier
  inside the unchanged 2–7 / 7–14 / 14–21 / 21–28 ranges (never above 28).
  Duration picks the planning target anchor — recently established (under
  1 month / 1–6 months) → the lower end of the range (e.g. 21 days of 21–28);
  medium/long-established (6+ months) or missing legacy duration → the upper
  end (28 days). Duration moves the range itself only in the one bounded case
  (a frequent 16–25 use-day pattern established for 2–5 / 5+ years → 21–28)
  and is never a days-added formula. A clean, directional, fully in-range
  previous-break history can raise the target to the user's own best observed
  anchor inside the range. All of this is labelled product heuristic, not a
  reset prediction.
- **Result hero leads with the plan target:** the headline is the actionable
  “Plan for N days” with “Evidence range: min–max days” as the meta line
  beneath it and the rail marking the target inside the evidence bounds — the
  target is a planning choice inside the range, never a second, tighter range.
- **“Your plan” | “Predicted reset” (0.9.2):** an accessible segmented control
  on tolerance results defaults to the plan-first screen and adds the versioned
  recovery outlook (`tolerance-recovery-outlook-v2`): likely profile-sensitive
  recovery window → separate practical plan → separate Day-28 human CB1
  reference → conditional extended-recovery explanation → time-only timeline →
  optional check-in facts and descriptive history → evidence disclosure that
  separates direct human PET from lower-directness extension evidence. Coarse
  windows span 2–7 through 28–42 days under explicit reviewed rules; only the
  highest-burden class reaches six weeks. Frozen v1 history uses the retained
  historical model rather than adopting v2 semantics.
- **Post-break outcome capture (0.9.0):** after a completed break ends with a
  real return to THC, you can rate the tolerance reduction 0–10 (anchors 0 = no
  noticeable reduction / 10 = very large reduction) or skip — never after
  continued abstinence, never twice for the same break. The score is stored on
  the linked past-break record (`sourceAttemptId`) and stays editable in
  History.
- **Reduction trajectory (0.9.0):** when full-coverage adaptive recalculation
  from tracked use froze a newer tolerance result, the reduction card can show
  “Your tracked pattern has moved.” (baseline vs current use-days / plan target)
  or a neutral “same planning band” line — always from actual frozen records,
  never fabricated.
- **Why this result** names frequency, sessions, concentrate/dabbing, how
  long the current pattern has been typical, and — when duration or history
  moved the target — which anchor the planner chose and why. A short
  planning-context note says which answers shaped the target without claiming
  higher scientific certainty.
- **Your break outlook:** every planned day from Day 1 through the planning
  target (typically an anchor 2 / 7 / 14 / 21 / 28, or an interior observed
  in-range history anchor) is inspectable before Start this break (grouped
  chip strip + inspector, not 28 giant cards). Overlapping evidence windows are
  preserved. Consecutive days with equivalent guidance collapse into labelled
  ranges (`Days 4–6`); milestone and check-in days stay individual and the
  exact per-day model is untouched. Result previews the journey; Today shows
  only now; Plan Detail shows the running journey. Same BreakOutlookV1 source
  (content break-outlook-v2).
- **Settings → About update state**: live PWA freshness from the same
  service-worker updater that drives the snackbar — “Up to date” only after a
  completed check found nothing newer, “Update available” with an Update-now
  action, “Checking for updates…”, or an honest offline/unavailable line. The
  displayed app version is unchanged.
- **Active reduction tracker (0.8.0):** a real cut-down tracker
  (`reduction-records-v2`). Set limits (max use-days in a rolling 7-day
  window, max sessions per use day, optional strategy), log THC-use events
  from Today via the **Log THC use** sheet (product + route, with a **Use
  again** fast path), and see the derived state: rolling use-days, today's
  sessions, breach days, and — after two distinct breach days in the rolling
  7-day window — the review banner "consider a 3–7 day pause and review". The
  plan starts/edits through the reduction start/edit sheet; the refresh sheet
  covers recalculating from tracked use. "See your break range" stays a
  secondary cross-sell, not the only action.
- **Break start sheet**: Start now or pick a date (today + 14 days) and a
  post-break mode; creates a real `planned`/`active` break attempt anchored to
  the authoritative last use (`targetDurationDays` = the result's
  `preferredTargetDays`).
- **Today** driven by real attempt/tracking state: active break (Day N of
  target, target date, current scientific window, what you may notice, what
  can help today, what commonly comes next), interrupted (timing
  paused, Confirm when), completed break card with post-break plan, open-ended
  abstinence tracking, an active-reduction card (`reduction-active`) with
  rolling use-days, today's sessions and **Log THC use**, scheduled future
  plan, and per-goal saved-result cards.
  Open-ended tracking uses the same stage guidance, with a companion overlay
  for the overlapping roadmap, optional triggers, and detox notes — and no
  finish at day 28.
- **Adaptive recalculation from tracked use:** when real logged use changes
  the exposure pattern, the engine is re-run on the observed profile and a
  NEW frozen result is created — old results never change, and one logged
  event never adds "+N break days". With under 30 days of tracked history the
  app asks for a minimal profile refresh instead of inventing a 30-day
  profile.
- **Plan detail**: plan-progress ring, full Day 1 → target outlook, current-stage
  guidance, optional trigger/if-then plan, Then → Now from real check-ins,
  detox-claims panel, editable post-break mode/limits, End break early,
  Recalculate.
- **Daily check-in** (§10.2 use-first): No → instant save; optional symptom
  screen with five parked 0–10 sliders stored as `null` until touched
  (craving, sleep quality, irritability, anxiety, appetite) and a 500-char
  private note; Yes → interruption confirmation.
- **Interruption/restart** through the domain state machines: timing suspends,
  `usedAt` is confirmed inside the segment window, the previous segment closes,
  a new segment anchors at the confirmed use, the finite target duration is
  unchanged, and the target date is recomputed. Open-ended tracking restarts
  without any target. Copy is the mandated "plan restarted from your latest
  use" phrasing — never a biological-reset claim.
- Completion is explicit (**Mark complete** once the target date is reached);
  ending early is a neutral state; history segments and check-ins are
  preserved on device.
- **History** lists frozen calculations, break attempts (with segments),
  tracking runs, check-ins, and past breaks. Historical results are never
  silently recalculated. Outlook is derived at display from the stored
  profile and stored target; numeric results stay immutable.
- **Previous breaks** are added from the tolerance result or History. They can
  add a history insight only after **Recalculate with history** — they never
  change the recommended range; under tolerance-v3 a clean, directional,
  fully in-range history may raise the planning target inside it (bounded,
  never above 28).
- Per-item deletion with confirm; corrupt rows render as **Unavailable**.
  **Delete everything** still requires a 3-second hold.
- A storage-unavailable banner, a PWA update snackbar, and a one-time install
  hint after the first saved calculation. Overlays trap focus; the shell is
  `inert` while a dialog is open.

## Storage

Durable records live in **IndexedDB** (`tbreak-calculator`, per-record stores)
after a one-time, idempotent migration from the v0.3.x Web Storage envelopes.
The unfinished questionnaire draft and the result-overlay flag stay on Web
Storage. When IndexedDB is missing, the same repository interface falls back
to the versioned envelopes. When no storage works, the session is in-memory
and a persistent banner says it cannot be saved.

| Store / key | Contents |
|---|---|
| IndexedDB `calculations` | Frozen engine outputs (never silently recalculated) |
| IndexedDB `breakAttempts` | stored break attempts (segments, post-break plan, optional preparation, ack) |
| IndexedDB `trackingRecords` | stored open-ended tracking records (optional preparation) |
| IndexedDB `checkins` | stored daily check-ins |
| IndexedDB `previousBreaks` | past-break personalisation (§7) |
| IndexedDB `postBreakPlans` | per-attempt plan mirror |
| IndexedDB `profiles` | latest completed questionnaire snapshot |
| IndexedDB `reductionPlans` | legacy reduction-plan-v1 cutting-down limits (never fed to an engine; readable, migrate into a v2 plan baseline when one starts) |
| IndexedDB `reductionRecords` | active reduction tracker (`reduction-records-v2`): limits, strategy, baseline, THC-use events, status |
| IndexedDB `breakOutcomes` | post-break outcome marks (`break-outcome-marks-v1`): `captured`/`skipped`, once per completed break after a real return to THC |
| `tbreak.questionnaire-progress.v1` | unfinished draft (Web Storage) |
| `tbreak.result-view.v1` | result overlay `open` / `acknowledged` (Web Storage) |

Corrupt envelopes are dropped and treated as absent; an invalid row is
isolated from the rows/records that still validate. Duplicate ids keep the
newest row. Impossible segment timing and overflowing target durations are
dropped rather than rendered. A use-profile snapshot missing required fields
is treated as absent, not passed to an engine. Legacy profiles without
`currentPatternDuration` remain valid (`missing`).

**Delete everything** removes only T-Break IndexedDB databases/stores and
`tbreak.*` Web Storage keys so a shared origin (GitHub Pages) is not wiped
wholesale.

## Layout

- `src/domain` — pure engines, schemas, validation, break + open-ended
  tracking state machines, active reduction domain (`reduction/`),
  versioned policies (incl. `tolerance-policy-v3`), EvidenceGuidanceV1,
  BreakOutlookV1
- `src/application` — Today router (incl. `reduction-active`), questionnaire
  engine, calculation coordinator + adaptive recalculation, reduction
  records (`reduction-records-v2`), break-session services, deterministic
  plan / outlook presentation, History model, IndexedDB-backed durable
  repositories
- `src/infrastructure` — clock, Web Storage adapter, IndexedDB durable store
- `src/ui` — Preact PWA: shell, Today, History, plan detail, break start,
  check-in, interruption, previous-break sheet, reduction sheets (log use,
  start/edit, refresh), questionnaire, result screens, settings

The root shell fills the large viewport (`--app-height`: `100vh`, upgraded
to `100lvh` inside `@supports` so minifiers keep the fallback). On phones,
`--chrome-bleed` pads the in-flow tab bar above iOS 26 Safari’s overlay
toolbar. `.app-main` is the only normal scrolling pane.
`viewport-fit=cover` plus `env(safe-area-inset-*)` pad the notch / home
indicator. Do not lock the shell to `100svh` or `100dvh` (on iOS 26 both
stop above the Liquid Glass toolbar).

Specs: `CALCULATOR_SPEC.md`, `UX_SPEC.md`, `ARCHITECTURE.md`,
`EVIDENCE_CONTENT_SPEC.md`.
Next-session notes: `HANDOFF.md`.
