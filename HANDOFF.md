# Handoff — T-Break Calculator

For the next implementer. Specs win over this file.

- Repo: https://github.com/megabomb420/tbreak-calculator (public)
- Branch: `main`
- Live PWA: https://megabomb420.github.io/tbreak-calculator/
- App version: **0.5.0** (evidence-guided T-break companion on the 0.4.2 shell)
- This file sits on `main` (the header intentionally carries no self-referential SHA).

Authoritative docs:

- `UX_SPEC.md` (v1 UX; §12 is the current visual system; §16 is the implementation sequence)
- `CALCULATOR_SPEC.md` (domain / engines; §4.4/4.7 amended for D5/D4)
- `EVIDENCE_CONTENT_SPEC.md` (EvidenceGuidanceV1; research PDF interpretation)
- `ARCHITECTURE.md`
- `README.md` (how to run and deploy)

Do not invent scientific numbers, reset/detox percentages, detection windows,
or medical/legal copy. Do not change engine coefficients, bands, or thresholds
to make UI easier. Do not commit untracked review files.

---

## What is on main

UX_SPEC §16 steps **1–5** plus deploy, iOS layout, vape product, the
Interval visual redesign, the **0.3.1–0.4.2** patches, and the **0.5.0
evidence-guided companion**:

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
| 0.3.3 fail-closed persistence | done |
| 5. History + contextual flows + IndexedDB | done (0.4.0) |
| 0.4.1 dynamic viewport fill (`100dvh`) | superseded by 0.4.2 |
| 0.4.2 iOS 26 Liquid Glass viewport fill | **done** |
| 0.5.0 evidence-guided T-break companion | **done** |

Working product behaviour (unchanged from earlier steps):

1. First launch / no-profile Today → **Get started** or goal chips.
2. Questionnaire overlay, persist after each answered step, Close → Today resume.
3. Completing the questionnaire opens the **result overlay**.
4. App shell tab bar is in-flow inside a large-viewport column (`100lvh` / `100vh`; not `position: fixed`). Overlay chrome is padded with `--chrome-bleed`.
5. Product vs route distinction preserved (`vape` product ≠ `vaping` route).

## What 0.5.0 added (evidence-guided companion)

Research source: *THC Tolerance Break Calculator — projekt naukowo ugruntowanego PWA*.
Content version: `evidence-guidance-v1`. Spec: `EVIDENCE_CONTENT_SPEC.md`.

Scientific engines, bands, coefficients, golden fixtures, the `breakDay`
formula, History/IndexedDB, and the 0.4.2 viewport contract are unchanged.

- **Today** during an active break or open-ended tracking shows the current
  scientific window (what you may notice, what can help today, context, what
  commonly comes next) from `breakDay`. Days 2–6 are the common peak window.
- **Plan detail** is a roadmap of overlapping windows (Days 1–3 with 2–6, and
  overlaps at 14 and 21). Past/current/future are visual states; future copy is
  an expectation, not a guarantee. No biological recovery percentage.
- **Optional preparation** (triggers, replacement, fallback, if-then lines)
  lives on the attempt/tracking record. v0.4.x rows without the field remain
  valid (`preparation: null`).
- **Then → Now** from real check-ins in week two: null is not zero; no
  interpolation; no recovery score; no causal claim.
- **Detox claims** panel from Plan detail (not a tab): wellbeing vs elimination,
  app-specific A–D scale labelled as not GRADE. Niacin is not recommended; no
  doses; hydration/exercise/sauna/fasting are not proven flushes.
- **CB1 education** and concept distinctions (withdrawal ≠ tolerance ≠
  detectability). Approximately four weeks is a biological reference, not a
  personal reset day.
- **Post-break:** previous exposure ≠ restart exposure. Abstinence mode shows
  no return-to-use guidance. Return modes show conservative lower-exposure
  principles and still no safe restart dose.
- **Unplanned use** keeps “Plan restarted from your latest use” and adds
  trigger/replacement recovery copy. No shame, no punitive streaks.
- **Open-ended tracking** uses the same guidance with no finish at day 28.
  Tracking Today opens a companion overlay (roadmap, triggers, detox, CB1)
  without post-break return-to-use or a completion CTA.
- **Detection:** qualitative educational notes only. No numeric window.

The engine withdrawal strip on plan detail still uses the exclusive
CALCULATOR_SPEC anchors (1–6 / 7–14 / 15–28). The companion roadmap uses the
PDF's overlapping windows. That discrepancy is intentional in this slice:
engine coefficients were not rewritten to match the PDF.

## What 0.4.2 fixed (iOS 26 Liquid Glass)

Patch on 0.4.1. No new product slice. UX_SPEC §16 step 6 was **not** started.

`100dvh` was a no-op on iOS 26 Safari: both `svh` and `dvh` end *above* the
new Liquid Glass bottom toolbar, so the in-flow tab bar still sat over a
blank strip (the overlay region) on a real iPhone 17 Pro. iOS 26 also made
`100vh` equal `window.outerHeight`, which paints *behind* that overlay.

New contract:

- `--app-height` is `100vh`, then `100lvh` inside `@supports` (minifier-safe).
- On narrow or standalone viewports, `src/ui/viewport.ts` writes pixel
  `--app-height` (the fill height) and `--chrome-bleed` (`fill − visible`)
  so tab-bar / overlay footers stay tappable above the glass.
- Keyboard shrinks `visualViewport` far below `innerHeight` and is ignored
  (not treated as chrome).
- Desktop ≥720px leaves the CSS units alone. No UA sniffing, no per-device
  pixel tables, no `position: fixed` tab bar.

## What 0.4.1 tried (superseded)

`--app-height: 100dvh` with a `100vh` fallback. Correct for iOS 15–18 chrome
show/hide; insufficient on iOS 26 Liquid Glass, where `dvh` still stops
above the overlay.

Intentionally **not** changed in 0.4.2: History/IndexedDB/step-5 behaviour,
Interval tokens, overlay focus traps, engines.

## What 0.4.0 added (UX_SPEC §16 step 5)


History, IndexedDB durable records, previous-break personalisation, per-item
deletion, storage/PWA banners, and overlay focus traps. Scientific engines,
bands, coefficients, golden fixtures, and the `breakDay` formula are unchanged.

- **History tab:** past breaks (add/edit/delete), monthly activity of frozen
  calculations, attempts (with segments), tracking runs, and check-ins.
  Historical calculations render the stored engine output and never re-run.
  Opening a calculation from History is a pushed screen (tab bar stays).
- **Previous-break flow (§7):** from the tolerance result prompt and from
  History → Past breaks → Add. Stepper + chips, 0–10 slider + Not sure, optional
  ended date. **Recalculate with history** creates a new calculation record;
  the earlier record is preserved. Insight copy is verbatim from §14 and always
  ends with "Your history never changes the recommended range."
- **IndexedDB:** per-record stores behind `DurablePersistence`. v0.3.x Web
  Storage envelopes migrate once, idempotently, and stay in place if a family
  fails. Draft + result-view overlay remain on Web Storage. Deleting a History
  calculation never rematerializes it from the live snapshot.
- **Deletion:** per-item confirm (including past breaks from the edit sheet);
  corrupt rows render as Unavailable; Delete-everything still hold-to-confirm
  and still never calls `storage.clear()`.
- **Offline/a11y:** storage-unavailable banner, PWA update snackbar
  (`registerType: 'prompt'`), passive install hint after the first saved
  calculation, overlay focus trap + Escape, shell `inert` while a dialog is
  open. First-launch safety slot remains the reviewed-copy placeholder
  (still not invented).
- Session mutations still re-read durable stores immediately before write
  (0.3.3). IndexedDB writes are queued; attempt/track + check-in + snapshot
  `lastUseAt` are not yet one transaction.

## What 0.3.3 fixed (persistence / state-corruption pass)

Patch on 0.3.2. Landed before step 5. Scientific engines, bands, coefficients,
golden fixtures, and the `breakDay` formula are unchanged.

High:

- A stored use-profile snapshot that only had `goal` + `breakRequested`
  passed the decoder and crashed render (`profile.lastUseAt.value`,
  `products.length` in the engine). Snapshots now require the full
  `UseProfileInput` shape; incomplete records are wiped as absent. The
  engine also fails closed on missing arrays instead of throwing.
- Two individually-valid live attempts (e.g. a newer `planned` row plus an
  older `active` row) made Today follow array order and hide the live
  clock. Live selection now uses Today precedence (interrupted > active >
  completed-unack > planned; interrupted tracking > tracking).
  `activateDuePlans` activates only the current planned attempt so a
  second live timeline cannot be created from injected siblings.
- Segment `endedAt` before `startedFromLastUseAt`, overlapping segments,
  duplicate ids, and target durations that overflow Date/safe-integer math
  were accepted and could throw in `plannedTargetDate`. Invalid rows drop
  in isolation; duplicate ids keep the newest.

Medium:

- Check-in `usedAt` after `recordedAt` was stored. Those rows now fail
  closed. Decode also normalises missing `usedAt`/`note` to `null`.
- `localStorage` throws after a successful probe (quota) crashed writes.
  The Web Storage adapter swallows get/set/remove failures; mutations
  re-read stores immediately before write so a stale tab cannot silently
  revert a newer timeline. Concurrent last-write-wins is still possible
  (no live sync — not required).

Low:

- Instants outside the JS Date range are rejected at decode.

## What 0.3.2 fixed (UX / product pass)

Patch on 0.3.1. No new product slice. UX_SPEC §16 step 5 was **not** started.
Scientific engines, bands, coefficients, golden fixtures, and the
`breakDay` formula are unchanged.

High:

- Reduction limits lived in component state only, so they reset on close and
  Today showed none of the plan the user just set. Limits now persist in
  `tbreak.reduction-plan.v1` (included in delete-everything) and render on
  the Today cutting-down card. **See your break range** is a text link, not
  the only button. Result **Done** is the primary CTA.
- Abstinence Today leaked designer notes: "No range, no target date, no
  completion state." Replaced with human copy: there's no end date to chase.

Medium:

- Day N of M with N > M (spec-correct elapsed time) looked like a broken
  counter. Past-target labels are now `Day N · M-day plan`; the plan ring
  says "past target". The formula is unchanged.
- Break-start **Now** said "Your plan starts immediately" next to the clock
  note that the target counts from last use. Now-helper copy when the clock
  already runs: "Commit now — the day count still runs from your last use."
  Clock note when already past the target explains they can mark complete
  as soon as they start.
- Post-break mode/limits were discarded on Back unless Save was tapped.
  Changes now persist as they are made.
- First check-in helpers talked about a last check-in that never happened.
  Helpers are now "I haven't used" / "I used THC". The mandated question is
  unchanged.
- **Start over** beside a live break sounded like it would wipe the plan.
  Secondary resume cards explain it only discards the unfinished calculation.
- "Add how you're feeling" could log a no-use check-in without answering
  No/Yes. Opening symptoms now selects No.
- History prompt on the tolerance result sent people to an empty History tab.
  Copy no longer names History (add-past-break remains step 5).
- Q2 had no honest way to pick 0 days from a parked slider. **None (0)** chip
  plus a first-touch commit of 0.

Low:

- Resume grammar: "1 answers saved" → "1 answer saved".

Intentionally **not** changed:

- Accidental-Yes undo (not in current specs).
- History contents, IndexedDB, per-item delete, storage banner, PWA snackbar,
  first-launch safety copy, focus trap — all step 5.
- Day formula, planned-activation anchoring, Q5 flower THC deep-link.

## What 0.3.1 fixed (QA pass)

Patch on 0.3.0. No new product slice. UX_SPEC §16 step 5 was **not** started.
Scientific engines, bands, coefficients, and golden fixtures are unchanged.

High:

- Resume **Start over** wiped a live plan/profile. Today resume now only
  abandons the unfinished draft (`abandonDraft`). Failed-calculation recovery
  still clears the snapshot + result view but keeps any live plan.
- **Delete everything** called `adapter.clear()`, which on GitHub Pages shares
  an origin with other project sites. It now removes only `LOCAL_DATA_KEYS`.
- Stop-tracking confirm lived inside scrolling `.app-main` and clipped under
  the in-flow tab bar. The dialog portals to `#app`.

Medium:

- Double-tap **Yes** after interruption called `setFlow(null)` and dropped the
  confirm-when sheet. Already-interrupted check-ins reopen confirm-use.
- Double-tap **Start break** could create a second live timeline. Session
  create + UI guards refuse overlapping live plans/tracking; the sheet also
  latches `submitted`.
- Future `usedAt` was accepted. Application confirm ops reject
  `used_at_in_the_future`; DateControl now clears a previous valid ISO when a
  later pick is out of window.
- Break-start relied on HTML `min`/`max` only. Picked dates are validated in
  JS against today..+14 local days.
- Completing a plan before the target date was possible through the session
  API. `completeBreakPlan` now requires `now >= plannedTargetDate`.
- Tracking decode allowed an open segment that was not last. Invalid rows
  drop in isolation.
- Stacked result + break-start overlays. Result unmounts while any `flow` is
  open; Start this break stays hidden while a live timeline exists.
- Confirm-use showed the restart copy even when confirm failed.
- A completed-unacknowledged card plus a draft hid acknowledgement behind
  the resume card. Resume stays secondary so the completion gate remains.
- Planned-activation `useEffect` depended on a fresh `sessionState` object
  every render; it now depends on the stored records.

Low / visual:

- Q2 use-days readout showed `0` when unset; it now shows `—`.
- Parked symptom sliders needed a sync arm (`armedRef` + pointer/mouse down)
  so the first touch stores a value and untouched fields stay `null`.
- Check-in Yes/Save/symptoms double-taps; symptoms wrapped in a form with
  `enterKeyHint="done"` on the note.
- Reduction limits used native `type=number`; they are steppers (nominal-THC
  decimals stay numeric).
- Stepper wrapped in `<label>` decremented on label tap; label is a `div`.
- Break-start choice cards left an empty 44px icon column; `.compact` grid.
- Q5 Vape tile overflow on 402×874; `overflow-wrap: anywhere`.
- Self-hosted Fraunces/Figtree `.woff`/`.woff2` were missing from the
  workbox `globPatterns`.
- Desktop (≥720px) settings/confirm sheets spanned the full `#app` while the
  shell is 430px; `.modal-root` is now column-constrained too.

Intentionally **not** changed:

- Day formula (`floor((now−lastUseAt)/24h)+1`) — Day 22 of 21 after the
  target is spec-correct.
- Planned activation still anchors to the authoritative `lastUseAt`.
- Q5 flower THC deep-link (`data-testid="nominal-thc-deferred"`) stays copy
  until step 5/settings.
- Accidental-Yes undo is a new feature, not a defect.
- Service-worker update semantics (`skipWaiting: false`, prompt register).

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
  guidance/          evidence-guidance-v1.ts (versioned companion content)
  breaks/            break-attempt.ts, abstinence-track.ts, break-time.ts
  validation/        profile-validation.ts, checkin-validation.ts (D5)
src/application/
  break/             break-session.ts (pure plan/tracking/check-in ops),
                     post-break-plan.ts, today-model.ts (facts from records)
  presentation/      result-presentation.ts, plan-presentation.ts,
                     break-guidance.ts, checkin-comparison.ts
  break/             break-session.ts, post-break-plan.ts, preparation.ts,
  progress/          questionnaire stores + break-attempt-record.ts,
                     tracking-record.ts, checkin-store.ts, record-codec.ts
src/ui/              app.tsx (flow router), today-screen.tsx, break-start-sheet,
                     checkin-flow, confirm-use, plan-detail, tracking-detail,
                     today-guidance, break-roadmap, preparation-card,
                     detox-evidence, plan-ring, post-break-summary, break-copy.ts
tests/unit|golden|ui
.github/workflows/pages.yml
```

## Persistence

The questionnaire draft and result-view overlay stay on Web Storage. Durable
records hydrate from IndexedDB (`tbreak-calculator`, version 1) through
`DurablePersistence`. Keys still used on Web Storage:

- `tbreak.questionnaire-progress.v1` — unfinished draft
- `tbreak.result-view.v1` — `open` | `acknowledged`
- `tbreak.durable-migration.v1` — migration marker (envelopes already copied)

v0.3.x envelopes (`tbreak.break-attempts.v1`, `tracking-records`, `checkins`,
`questionnaire-snapshot`, `reduction-plan`) are copied into IndexedDB then
removed only after a successful flush. A failed family leaves its envelope.

Corrupt envelopes are wiped and treated as absent; an invalid row inside an
envelope is dropped in isolation (valid rows/records survive). Duplicate ids
keep the newest row. Impossible segment timing and overflowing target
durations are invalid rows, not rendered. A use-profile snapshot missing
required sourced fields / product-route arrays is an invalid envelope.
Check-in `usedAt` cannot be after `recordedAt`. Storage unavailable — or a
later adapter throw — degrades without crashing (banner in 0.4.0).

Session mutations re-read durable stores immediately before applying the
operation. That is not cross-tab live sync: a stale tab that writes later can
still last-write-wins, but it will not rebuild the operation from a stale
in-memory timeline.

Corrupt calculation / previous-break / IndexedDB rows become History
"Unavailable" items; unrelated records stay. Delete-everything removes only
`LOCAL_DATA_KEYS` plus the IndexedDB database contents (not `storage.clear()`).

## Known notes after step 5

- `planned` future attempts activate when the app loads/refreshes after their
  start instant; they are not activated mid-session without an interaction or
  the 60 s clock tick (both refresh state).
- Check-in symptom direction semantics (10 = more of the named thing) live in
  the UI copy + D5 schema note; no engine consumes ratings.
- Result overlay **Start this break** is hidden while a live plan/tracking
  exists; plan detail **Recalculate profile** keeps the current plan intact.
- A picked start date equal to today activates immediately (start instant ≤
  now), matching §8 semantics.
- Reviewed first-launch safety copy is still the pending placeholder
  (`safety_first_launch`). Do not invent medical/eligibility wording.
- Web-storage fallback still drops invalid attempt/tracking/check-in rows
  rather than listing them as Unavailable (IndexedDB lists them).
- Deleting a History calculation does not wipe the live Today profile; the
  snapshot stays. The deleted frozen record is not rematerialized.
- Multi-tab live synchronization is not built. Mutations re-read before
  write; last-write-wins remains for overlapping concurrent saves.
- `persistBreakSession` writes attempts, tracking, and check-ins as three
  sequential durable writes (IndexedDB queues them). Confirm-use then updates
  the snapshot `lastUseAt` as a fourth write. There is no single transaction.

## Exact next slice

0.5.0 is done. Do **not** start UX_SPEC §16 step 6 or runtime AI from this
handoff. Remaining follow-ups if a later slice is commissioned:

- Commissioned/reviewed first-launch safety copy in `safety_first_launch`.
- Accidental-Yes undo (not in current specs).
- Check-in trend chart (explicitly deferred, §15.3).
- One IndexedDB transaction for attempt/track + check-in + snapshot `lastUseAt`.
- Quantitative Detection Engine (own science-policy slice; not hidden in companion copy).
- Formal GRADE-style evidence review (the A–D scale is app-specific).
- Dedicated science-policy review of engine withdrawal anchors (exclusive 1–6 /
  7–14 / 15–28) vs the PDF overlapping windows (1–3 / 2–6 / 7–14 / 14–21 /
  21–28). Current product shows both; do not silently change golden fixtures.

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

- `--app-height`: `100vh`, then `100lvh` via `@supports`; `html` / `body` /
  `#app` / `.boot-shell` use `height: 100%` then `var(--app-height)`.
  `#app` is `position: relative`, overflow clipped; `.app-main` is the
  scrolling pane (`flex: 1; min-height: 0; overflow: auto`).
- In-flow tab bar; overlays `position: absolute; inset: 0` inside `#app`.
- `--chrome-bleed` starts as `env(safe-area-inset-bottom, 0px)` and is
  measured on narrow/standalone viewports (`src/ui/viewport.ts`) so iOS 26
  Liquid Glass does not cover the tab buttons.
- `viewport-fit=cover` unchanged.
- No `position: fixed` bottom chrome; no `100svh` / `100dvh` shell sizing;
  no scroll-to-fix JS; no per-device pixel tables; no UA sniffing.

## Resolved spec/HANDOFF conflicts

- **D4 contradiction resolved.** The previous handoff listed D4 as out of
  scope for step 4 while UX_SPEC §15.2/§9.8 require it before abstinence
  tracking ships. Current specs win: D4 (open-ended tracking) and D5
  (nullable check-in symptoms) are implemented, tested, and enabled where the
  current specs surface them (abstinence/baseline results → Start/Keep
  tracking; Today `abstinence-tracking`; check-ins store nulls).

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
2. Do not start §16 step 6 or runtime AI from this handoff.
3. Keep the Interval visual tokens; extend them; no second palette.
4. UI never computes `breakDay`, target dates, withdrawal statuses, phase
   boundaries, or restart anchors — read them from domain/application
   presentation (`plan-presentation.ts`, `break-session.ts`).
5. Keep questionnaire routing in `src/application/questionnaire`; keep message
   copy in the presentation template layer / `src/ui/break-copy.ts`.
6. Preserve product vs route; do not map `vape` onto concentrate intensity.
7. Do not regress the in-flow tab bar / `--app-height` (`100lvh` via `@supports`, `100vh` fallback) plus `--chrome-bleed` shell.
8. Commit and push only what the slice asked for.

Do not start §16 step 6 or any later step from this handoff.

