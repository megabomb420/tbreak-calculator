# T-Break Calculator

Mobile-first, local-first PWA for THC tolerance-break planning. Deterministic
engines own every scientific/numeric output. No account, no network science,
no runtime AI in v1.

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

## Capabilities (0.8.0)

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
