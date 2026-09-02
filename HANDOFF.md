# Handoff — T-Break Calculator

For the next implementer. Specs win over this file.

- Repo: https://github.com/megabomb420/tbreak-calculator (public)
- Branch: `main`
- Live PWA: https://megabomb420.github.io/tbreak-calculator/
- App version: **0.3.0** (Interval visual system; break loop shipped)
- This file sits on `main` at the commit that landed the break loop (the
  header intentionally carries no self-referential SHA).

Authoritative docs:

- `UX_SPEC.md` (v1 UX; §12 is the current visual system; §16 is the implementation sequence)
- `CALCULATOR_SPEC.md` (domain / engines; §4.4/4.7 amended for D5/D4)
- `ARCHITECTURE.md`
- `README.md` (how to run and deploy)

Do not invent scientific numbers, reset/detox percentages, detection windows,
or medical/legal copy. Do not change engine coefficients, bands, or thresholds
to make UI easier. Do not commit untracked review files.

---

## What is on main

UX_SPEC §16 steps **1–4** plus deploy, iOS layout, vape product, and the
Interval visual redesign:

| Step | Status |
|---|---|
| 1. Shell + Today router + draft persistence | done |
| 2. Declarative questionnaire engine + §5.1 flow | done |
| 3. Result screens + §14 template layer | done |
| 4. Break loop (§8, §10): break start, Today states, plan detail, use-first check-in, interruption, completion | done |
| GitHub Pages deploy (`/tbreak-calculator/`) | done |
| Vape product + iOS first-paint bottom layout | done |
| Interval visual redesign | done |
| Domain prerequisites D4 + D5 (see below) | done |
| 5. History + contextual flows + IndexedDB | **not started** |

Working product behaviour (unchanged from earlier steps):

1. First launch / no-profile Today → **Get started** or goal chips.
2. Questionnaire overlay, persist after each answered step, Close → Today resume.
3. Completing the questionnaire opens the **result overlay**.
4. App shell tab bar is in-flow inside a `100svh` column (not `position: fixed`).
5. Product vs route distinction preserved (`vape` product ≠ `vaping` route).

## What step 4 added

- **Break-start sheet** (§8): Start **Now** / **Pick a date** (today → +14
  days) and post-break mode (stay off / occasional / reduced regular / not
  sure). **Start this break** (result overlay and Today profile card) opens it.
  A now-start creates an `active` attempt; a future start creates a `planned`
  attempt that activates on load once its start instant has arrived. The
  attempt anchors to the authoritative `lastUseAt` (never a new last-use
  time); `targetDurationDays = preferredTargetDays`; the clock note shows when
  `breakDay > 1`.
- **Today from real state** (§3.2): active break card (Day N of target, target
  date, withdrawal position, phase focus, Check in), interrupted (timing
  paused, Confirm when), completed-break card until acknowledged (post-break
  plan summary by mode), open-ended tracking card (Day N since last use, Check
  in, Stop tracking), scheduled-plan card for `planned` attempts, and per-goal
  saved-result cards (tolerance range+target, abstinence plan, baseline,
  reduction). The router precedence is unchanged and still authoritative.
- **Plan detail** (§10.1): plan-progress ring (labelled **plan progress**,
  never biological progress), Day N of target, target date, withdrawal strip,
  phase focus (static versioned copy keyed to `breakDay`), editable post-break
  mode + limits, overflow: **End break early** (confirm, neutral) and
  **Recalculate profile** (preloaded questionnaire); planned attempts can be
  cancelled from detail.
- **Daily check-in** (§10.2): use-first — **Any THC since your last
  check-in?** No → instant Save; optional symptom screen with five parked 0–10
  sliders stored as `null` until touched + optional note (500 chars); **Yes**
  moves straight into interruption confirmation (no symptom entry on a use day).
- **Interruption/restart** (§10.3): on Yes the machine suspends timing
  (`interrupted_time_needed`); the confirm-when sheet constrains `usedAt` to
  the open segment window; confirming closes the previous segment, opens a new
  one at `usedAt`, records the use-day check-in, and updates the authoritative
  profile `lastUseAt`. Target duration unchanged; target date recomputed from
  the new anchor. Copy: "Plan restarted from your latest use" — never a
  biological-reset claim. Open-ended tracking restarts the same way with no
  target at all.
- **Completion** (§10.4): **Mark complete** is offered at/after the target
  date (Today card + plan detail), never automatic. Completion card →
  acknowledge once → profile-no-break. **End break early** is a neutral end.
- **D4 (open-ended tracking)** and **D5 (nullable check-in symptoms)** are
  implemented in the domain; see the persistence/layout notes below.

## Visual system

Codename **Interval** — dusk navy, warm parchment type, pause-bar mark.

- Tokens live in `src/ui/styles.css`; palette/type roles in `UX_SPEC.md` §12.
- Display font Fraunces, body Figtree, self-hosted via `@fontsource/*`.
- Icons: inline SVG in `src/ui/icons.tsx`.
- Do not revert to weed-green; do not reintroduce `position: fixed` bottom chrome.

New step-4 surfaces (break-start sheet, plan detail, check-in, interruption,
Today cards, plan ring) are styled on the same tokens — extend them, don't
introduce a second palette.

## Layout

```text
src/domain/
  breaks/            break-attempt.ts (finite machine), abstinence-track.ts (D4),
                     break-time.ts (single day-counter formula)
  validation/        profile-validation.ts, checkin-validation.ts (D5)
src/application/
  break/             break-session.ts (pure plan/tracking/check-in ops),
                     post-break-plan.ts, today-model.ts (facts from records)
  presentation/      result-presentation.ts, plan-presentation.ts (day/target/
                     phase/withdrawal views — no UI math)
  progress/          questionnaire stores + break-attempt-record.ts,
                     tracking-record.ts, checkin-store.ts, record-codec.ts
src/ui/              app.tsx (flow router), today-screen.tsx, break-start-sheet,
                     checkin-flow, confirm-use, plan-detail, plan-ring,
                     post-break-summary, break-copy.ts
tests/unit|golden|ui
.github/workflows/pages.yml
```

## Persistence

Persistence is **Web Storage only**, behind the same `StorageAdapter` used for
the draft. Keys (all versioned envelopes with strict decode validation):

- `tbreak.questionnaire-progress.v1` — unfinished draft
- `tbreak.questionnaire-snapshot.v1` — completed raw answers (+ optional `runId`)
- `tbreak.result-view.v1` — `open` | `acknowledged`
- `tbreak.break-attempts.v1` — stored attempts (status, segments, post-break
  plan, completion acknowledgement, timestamps)
- `tbreak.tracking-records.v1` — stored open-ended tracking records
- `tbreak.checkins.v1` — stored daily check-ins (chronological)

Corrupt envelopes are wiped and treated as absent; an invalid row inside an
envelope is dropped in isolation (valid rows/records survive). Storage
unavailable → in-memory adapter (degraded, nothing persists). Delete-everything
clears all keys including the new records.

**IndexedDB is still reserved** (ARCHITECTURE §9) for the durable per-record
stores in the History slice. The step-4 record envelopes are the migration
boundary: repository interfaces mirror the planned `breakAttempts` / tracking /
`checkins` stores.

## Today facts model (changed in 0.3.0)

- `TodayFacts.attempt` is `{ status } | null` for the current attempt
  (planned/active/interrupted/completed-unacknowledged).
- `TodayFacts.tracking` is `{ status } | null` (tracking/interrupted/ended) —
  this replaced the old `abstinenceTracking: boolean` so paused tracking can
  surface `interrupted`.
- `TodayFacts.completedBreakAcknowledged` was removed: the acknowledgement now
  lives per attempt on the stored record (`completionAcknowledged`).
- Router precedence and resume placement are unchanged in spirit; live
  tracking (tracking or paused) also keeps the resume card secondary.

## ProductKind / Route (do not collapse)

`ProductKind = flower | concentrate | vape | edible | oil | other`;
`Route = smoking | vaping | dabbing | oral | sublingual | other`.
Vape is not mapped onto concentrate intensity (intensity fires only on
`concentrate`/`dabbing` at ≥16 use-days).

## iOS / PWA layout (do not regress)

- `html` / `body` / `#app` height `100svh`; `#app` `position: relative`,
  overflow clipped; `.app-main` is the scrolling pane.
- In-flow tab bar; overlays `position: absolute; inset: 0` inside `#app`.
- `env(safe-area-inset-*)` with `0px` fallback; `viewport-fit=cover`.
- No `position: fixed` bottom chrome; no `100vh`/`100dvh` shell sizing;
  no visualViewport hacks; no scroll-to-fix JS.

## Resolved spec/HANDOFF conflicts

- **D4 contradiction resolved.** The previous handoff listed D4 as out of
  scope for step 4 while UX_SPEC §15.2/§9.8 require it before abstinence
  tracking ships. Current specs win: D4 (open-ended tracking) and D5
  (nullable check-in symptoms) are implemented, tested, and enabled where the
  current specs surface them (abstinence/baseline results → Start/Keep
  tracking; Today `abstinence-tracking`; check-ins store nulls).

## Known notes for step 5

- The History tab is still the empty placeholder; per-item deletion is not
  built (delete-everything covers all keys).
- `planned` future attempts activate when the app loads/refreshes after their
  start instant; they are not activated mid-session without an interaction or
  the 60 s clock tick (both refresh state).
- Post-break limits are stored on the attempt record (`postBreakPlan`);
  ARCHITECTURE's separate `postBreakPlans` store can be split out in step 5.
- Check-in symptom direction semantics (10 = more of the named thing) live in
  the UI copy + D5 schema note; no engine consumes ratings.
- Result overlay **Start this break** is hidden while a live plan/tracking
  exists (a second plan over an active one is undefined by the spec); plan
  detail **Recalculate profile** keeps the current plan intact.
- A picked start date equal to today activates immediately (start instant ≤
  now), matching §8 semantics.

## Exact next slice

**UX_SPEC §16 step 5 — History + contextual flows (§7), settings, deletion,
offline hardening (§13).** Against current `main`:

- History tab contents: past calculations/results, attempts (segments), open
  tracking runs, check-ins; previous-break add/edit (§7) with history insight.
- Move the step-4 attempt/tracking/check-in envelopes onto IndexedDB
  per-record stores behind the documented repository interfaces
  (ARCHITECTURE §9); keep the interfaces and record shapes as the boundary.
- Per-item deletion with confirm; corrupt-row "Unavailable" handling in
  History (§13.3).
- Settings completion, PWA/offline hardening, accessibility verification.

Out of scope for step 5: runtime AI (see below), new science, another visual
redesign, numeric detection.

## Future AI note (do NOT implement now)

Future optional conversational guidance may explain deterministic results and
provide practical advice. It must use a strongly locked, versioned product
persona/system prompt, remain subordinate to deterministic engines, never
invent/modify scientific numeric outputs, and never be required for core app
functionality.

## How to run

Node `>=24` (repo engine). Dev also runs on Node 22.

```bash
npm install
npm run dev          # Vite + Preact at / :8080
npm test             # node:test unit+golden, then vitest UI
npm run typecheck
npm run build        # production base /tbreak-calculator/
npm run preview      # http://localhost:4173/tbreak-calculator/
```

Golden fixtures freeze engine output. Do not edit them to match a UI change.

## Constraints for the next agent

1. Sync `main` and treat the repo as source of truth.
2. Read `UX_SPEC.md` §7, §9, §13, §16 and `ARCHITECTURE.md` §9 before the
   History slice.
3. Keep the Interval visual tokens; extend them; no second palette.
4. UI never computes `breakDay`, target dates, withdrawal statuses, phase
   boundaries, or restart anchors — read them from domain/application
   presentation (`plan-presentation.ts`, `break-session.ts`).
5. Keep questionnaire routing in `src/application/questionnaire`; keep message
   copy in the presentation template layer / `src/ui/break-copy.ts`.
6. Preserve product vs route; do not map `vape` onto concentrate intensity.
7. Do not regress the in-flow tab bar / `100svh` shell.
8. Commit and push only what the slice asked for.

Do not start §16 step 6 or any later step from this handoff.
