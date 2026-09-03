# Handoff — T-Break Calculator

For the next implementer. Specs win over this file.

- Repo: https://github.com/megabomb420/tbreak-calculator (public)
- Branch: `main`
- Live PWA: https://megabomb420.github.io/tbreak-calculator/
- App version: **0.6.0** (current-pattern duration + full Day 1 → target break outlook)
- This file sits on `main` (the header intentionally carries no self-referential SHA).

Authoritative docs:

- `UX_SPEC.md` (v1 UX; §12 is the current visual system; §16 is the implementation sequence; 0.6.0 revision note covers Q6 + outlook)
- `CALCULATOR_SPEC.md` (domain / engines; `currentPatternDuration` is contextual only — §4.3, §5.19, §7.3, §7.10)
- `EVIDENCE_CONTENT_SPEC.md` (EvidenceGuidanceV1 + BreakOutlookV1)
- `ARCHITECTURE.md`
- `README.md` (how to run and deploy)

Do not invent scientific numbers, reset/detox percentages, detection windows,
or medical/legal copy. Do not change engine coefficients, bands, or thresholds
to make UI easier. Do not commit untracked review files.

---

## What is on main

UX_SPEC §16 steps **1–5** plus deploy, iOS layout, vape product, the
Interval visual redesign, the **0.3.1–0.5.0** patches, and **0.6.0
current-pattern duration + full break outlook**.

| Step | Status |
|---|---|
| 1. Shell + Today router + draft persistence | done |
| 2. Declarative questionnaire engine + §5.1 flow | done (Q6 added in 0.6.0) |
| 3. Result screens + §14 template layer | done (outlook replaces “First weeks”) |
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
| 0.6.0 current-pattern duration + full break outlook | **done** |
| 6. Runtime AI / DeepSeek | **not started** |

Working product behaviour:

1. First launch / no-profile Today → **Get started** or goal chips.
2. Questionnaire overlay, persist after each answered step, Close → Today resume.
3. Completing the questionnaire opens the **result overlay**, including the full Day 1 → target outlook before Start this break.
4. App shell tab bar is in-flow inside a large-viewport column (`100lvh` / `100vh`; not `position: fixed`). Overlay chrome is padded with `--chrome-bleed`.
5. Product vs route distinction preserved (`vape` product ≠ `vaping` route).

## What 0.6.0 added

Research source: *THC Tolerance Break Calculator — projekt naukowo ugruntowanego PWA*.
Content versions: `evidence-guidance-v1`, `break-outlook-v1`.

Scientific engines, bands, coefficients, golden fixtures, the `breakDay`
formula, History/IndexedDB, and the 0.4.2 viewport contract are unchanged.
Policy version stays `tolerance-v1`. Duration is **not** a duration-to-days
formula.

### Current-pattern duration (`currentPatternDuration`)

Five **product UX bands**, not medical cut-points:

`under_1_month` | `1_to_6_months` | `6_to_24_months` | `2_to_5_years` | `5_plus_years`

Question meaning: how long *this current level* has been typical — not lifetime use.

Routing (kept after a review against the PDF):

- Ask Q6 after last use when use-days ≥ 1 on range-requested routes, and after Q2A on abstinence.
- Skip for 0 days, reduction-no-break, and detection.
- Keep Q4/Q5 at ≥16. Sessions/products/routes only change the numeric intensity heuristic there. Extra questions on the 1–15 path are not justified.

Effects:

- Why-this-result driver copy (`current_pattern_*` + `current_pattern_duration_contextual_only`).
- Break-outlook tone / personalisation note.
- Uncertainty remains the existing broad-heuristic line.

Non-effects (tests prove this):

- `recommendedRangeDays`
- `preferredTargetDays`
- Tolerance Engine `drivers`
- golden fixtures

Legacy profiles without the field remain valid (`missing`). Historical
calculation records stay frozen; outlook is derived at display from the stored
profile + stored target.

### Break outlook (BreakOutlookV1)

One deterministic module reused by Result, Today, and Plan Detail:

- `src/domain/guidance/break-outlook.ts`
- `src/application/presentation/break-outlook.ts`
- `src/ui/break-outlook.tsx`

Finite target 7 / 14 / 21 / 28 → exactly Days 1–N. Open-ended → Days 1–28
inspectable + After-28 window. Overlapping evidence windows preserved.
Mobile: day-chip strip + one inspector + window roadmap. Not 28 giant cards.

Today shows only the current day (via `presentTodayGuidance` reading the same
day outlook). Plan Detail shows the full running journey plus current-day
guidance.

Exposure tone is copy-only (`lighter` / `typical` / `heavier`).

### Questionnaire step counts

| Goal | Min | Typical | Max |
|---|---|---|---|
| tolerance_reset | 2 | 4 | 6 |
| reduction (break) | 3 | 5 | 7 |
| reduction (no break) | 3 | 3 | 3 |
| abstinence | 3 | 3 | 3 |
| detection | 3 | 3 | 3 |

## What 0.5.0 added (evidence-guided companion)

- Today during an active break / open-ended tracking shows the current scientific window.
- Plan detail overlapping windows; optional preparation; Then → Now; detox claims; CB1 education; post-break previous-exposure ≠ restart-exposure.
- Open-ended tracking has no finish at day 28.
- Detection remains qualitative.

The engine withdrawal strip still uses exclusive CALCULATOR_SPEC anchors
(1–6 / 7–14 / 15–28). Companion outlook uses the PDF’s overlapping windows.
That discrepancy is intentional: engine coefficients were not rewritten.

## What 0.4.2 fixed (iOS 26 Liquid Glass)

`--app-height` is `100vh`, then `100lvh` inside `@supports`. On narrow or
standalone viewports, `src/ui/viewport.ts` writes pixel `--app-height` and
`--chrome-bleed`. Keyboard is ignored. Desktop ≥720px leaves CSS units alone.
Do not restore `100svh` / `100dvh`.

## Invariants that still apply

- UI never computes `breakDay`. `abstinenceDayAt` is the only clock.
- Interval visual system.
- In-flow tab bar.
- Auth / database OFF. Local-first IndexedDB + Web Storage draft.
- No invented science, percentages, safe doses, or numeric detection.
- Golden fixtures frozen.
- Product vs route (`vape` ≠ concentrate, `vape` ≠ `vaping`).

## What not to do next

- Do not start UX_SPEC §16 step 6 / runtime AI unless explicitly asked.
- Do not add age, sex, BMI, hydration, exercise, liver/kidney, medications, or “fast metabolism”.
- Do not invent a duration × days formula.
- Do not convert the app to TanStack Start.
- Do not rewrite engines to match PDF overlapping windows.

## How to run

```bash
npm install
npm run dev      # 0.0.0.0:8080
npm test
npm run typecheck
npm run build
```

Dev currently runs on Node 22 in this sandbox (`engines` says `>=24`; that is
a warning only).
