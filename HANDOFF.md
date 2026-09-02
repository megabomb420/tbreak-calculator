# Handoff — T-Break Calculator

For the next implementer. Specs win over this file.

- Repo: https://github.com/megabomb420/tbreak-calculator (public)
- Branch: `main`
- Live PWA: https://megabomb420.github.io/tbreak-calculator/
- Last product commit: `df39525` — `fix: add vape product option and iOS first-paint bottom layout`. This file sits on `main` after that.

Authoritative docs:

- `UX_SPEC.md` (v1 UX; §16 is the implementation sequence)
- `CALCULATOR_SPEC.md` (domain / engines)
- `ARCHITECTURE.md`
- `README.md` (how to run and deploy)

Do not invent scientific numbers, reset/detox percentages, detection windows, or medical/legal copy. Do not change engine coefficients, bands, or thresholds to make UI easier. Do not commit untracked `GROK_UX_REVIEW.md`.

---

## What is already on main

UX_SPEC §16 steps **1–3** plus deploy and two follow-up fixes:

| Step | Status | Commit (short) |
|---|---|---|
| 1. Shell + Today router + draft persistence | done | `08be6b7` |
| 2. Declarative questionnaire engine + §5.1 flow | done | `3e6229e` |
| 3. Result screens + §14 template layer | done | `46e3df4` |
| GitHub Pages deploy (`/tbreak-calculator/`) | done | `cc44d0a` |
| Vape product + iOS first-paint bottom layout | done | `df39525` |
| 4. Break loop (§8, §10) | **not started** | — |
| 5. History + contextual flows + IndexedDB | **not started** | — |

Working product behaviour:

1. First launch / no-profile Today → **Get started** or goal chips.
2. Questionnaire overlay (Q1…Q5 / detection Q2D–Q3D), persist after each answered step, Close → Today resume, Resume / Start over.
3. Completing the questionnaire runs existing engines and opens a **result overlay** (not a fake Today card).
4. Save / Done / Close on a result acknowledges it. Today becomes `profile-no-break` or `detection-only`. **View result** reopens it.
5. Reload with an open snapshot restores the result screen.
6. Q5 product chips include **Vape (cart / pod / disposable)** (`ProductKind = vape`), distinct from the **Vaping** route.
7. App shell tab bar is in-flow inside a `100svh` column (not `position: fixed`), so iOS Safari / standalone PWA first paint is not waiting on a scroll recalc.

Pipeline (do not bypass):

```text
questionnaire answers
  → typed raw snapshot (localStorage)
  → validateAndNormalize / existing engines
  → §14 presentation layer
  → Preact result UI
```

UI components must not recompute ranges, `breakDay`, detection windows, or driver lists.

---

## Layout (current)

```text
src/domain/            pure engines, schemas, validation, versioned policies
src/application/
  questionnaire/       declarative step engine, date chips, raw snapshot
  calculation/         snapshot → engine → presentation
  presentation/        §14 message templates + result view-models
  progress/            draft v2, snapshot v1, result-view v1 (Web Storage)
  shell/               tab reducer, Today router
src/infrastructure/    clock, StorageAdapter (localStorage / memory)
src/ui/                Preact PWA: shell, Today, questionnaire, results, settings
tests/unit|golden|ui
.github/workflows/pages.yml
```

Persistence is **Web Storage only**. IndexedDB is still reserved for durable profile / attempt / check-in / history stores (ARCHITECTURE §9). Do not introduce it unless the slice you are implementing requires it.

Keys:

- `tbreak.questionnaire-progress.v1` — unfinished draft (`questionnaire-draft-v2`)
- `tbreak.questionnaire-snapshot.v1` — completed raw answers
- `tbreak.result-view.v1` — `open` | `acknowledged`

Corrupt JSON is wiped and treated as absent.

---

## ProductKind / Route (do not collapse)

`CALCULATOR_SPEC.md` §4.1:

```text
ProductKind = flower | concentrate | vape | edible | oil | other
Route       = smoking | vaping | dabbing | oral | sublingual | other
```

- Canonical product order: `flower, concentrate, vape, edible, oil, other`.
- Q5 label for `vape`: **Vape (cart / pod / disposable)**.
- `vape` is a product form (cart / pod / disposable). **Vaping** remains a route.
- V1 does **not** assign vape a potency, dose, or PK model.
- Intensity override (`heuristic_frequency_intensity_v1`) still triggers only on `ProductKind = concentrate` or `Route = dabbing` (plus sessions ≥ 2) at ≥ 16 use-days. Do not add `vape` / `vaping` to that rule.

---

## iOS / PWA layout (already fixed — do not regress)

Root cause of the iPhone 17 Pro first-paint bottom bug: `position: fixed; bottom: 0` was laid out against Safari’s **large layout viewport**. A tiny scroll recalculated it.

Current contract in `src/ui/styles.css`:

- `html` / `body` / `#app` height `100svh`, `#app` `position: relative`, overflow clipped on the root chain.
- `.tab-bar` in document flow (`flex: none`), not `position: fixed`.
- `.app-main` is the scrolling pane (`flex: 1; min-height: 0; overflow: auto`).
- Questionnaire overlay and settings `modal-root` are `position: absolute; inset: 0` inside `#app`.
- `env(safe-area-inset-*)` with `0px` fallback; `viewport-fit=cover` already in `index.html`.

Do not reintroduce `position: fixed` bottom chrome or `100dvh`/`100vh` as the shell height. Do not add visualViewport / scroll-to-fix JavaScript.

---

## Deploy

GitHub Pages via `.github/workflows/pages.yml` on push to `main`.

- Production Vite `base` is `/tbreak-calculator/` **only** in `mode === 'production'`. Local `vite` stays `/`.
- Manifest `start_url` / `scope` / `id` and SW registration use that production base.
- `public/.nojekyll` is required.
- After a green Actions run the site is at https://megabomb420.github.io/tbreak-calculator/

Installed PWAs / Safari may keep an old service worker until the next launch. That is expected; do not “fix” it with skipWaiting mid-flow.

---

## What the result CTAs actually do

| Control | Current behaviour |
|---|---|
| **Start this break** | Acknowledges the result (same as Save). Does **not** open the break-start sheet. |
| **Save without starting** / **Done** / result Close | Acknowledge → Today |
| **View result** | Re-opens the result overlay from the snapshot |
| **Start tracking** / **Keep tracking** | Acknowledge only. Real tracking is blocked by **D4**. |
| **Check another test type** | Re-enters questionnaire at Q2D |
| **See your break range** | Re-enters at Q2R with answers preloaded |
| **Edit** on an answer row | Re-enters the questionnaire at that step |
| Nominal THC footer | Sheet using the existing nominal-THC engine |
| `safety_first_launch` | Slot on first launch; reviewed copy **not** written |

Today `profile-no-break` / `detection-only` / break shells are still **deferred structural cards** (no hero range or day counter on Today). That is intentional until the break loop / history slices.

---

## Domain leftovers (UX_SPEC §15.2)

- **D1–D3** — already in validation (intake scoping).
- **D4** — abstinence tracking without `targetDurationDays` / without `completed`. Blocks §9.8.
- **D5** — nullable check-in symptom fields. Blocks §10.2.

Do not fake D4 by stuffing abstinence into `BreakAttempt`.

---

## Exact next slice

**UX_SPEC §16 step 4 — Break loop (§8, §10).**

Implement, against current `main`:

- break-start sheet (plan start date + post-break mode from §8)
- wire **Start this break** to that sheet
- plan detail (day ring labelled **plan progress**, withdrawal strip, phase focus from `breakDay`)
- use-first daily check-in (§10.2) — symptom nulls need **D5** before shipping that screen honestly
- interruption confirm-when (§10.3) using the existing `src/domain/breaks/break-attempt.ts` machine
- Today `active-break` / `interrupted` / `completed-break` from real attempt state, not invented UI math

The domain already has:

- `src/domain/breaks/break-attempt.ts` + `tests/unit/break-attempt.test.ts`
- withdrawal display on tolerance / abstinence results
- `preferredTargetDays` on `tolerance_result`

Out of scope for step 4 unless the current spec says otherwise: History tab contents, previous-break add (§7), IndexedDB, D4 open-ended tracking, runtime AI, new science, redesign, extra product kinds.

---

## How to run

Node `>=24`.

```bash
npm install
npm run dev          # Vite + Preact at /
npm test             # node:test unit+golden, then vitest UI
npm run typecheck
npm run build        # production base /tbreak-calculator/
npm run preview      # http://localhost:4173/tbreak-calculator/
```

Golden fixtures freeze engine output. Do not edit them to match a UI change; if science changes, that is a new policy version.

---

## Constraints for the next agent

1. Sync `main` and treat the repo as source of truth.
2. Read `UX_SPEC.md` §8, §10, §16 and `CALCULATOR_SPEC.md` before coding.
3. UI reads `breakDay` / target date from the engine / break machine. No parallel day math in components.
4. Keep questionnaire routing in `src/application/questionnaire`. Keep message copy in `src/application/presentation/message-templates.ts`.
5. Preserve product vs route; do not map `vape` onto concentrate intensity.
6. Do not regress the in-flow tab bar / `100svh` shell.
7. Commit and push only what the slice asked for.

Do not start §16 step 5 from this handoff.
