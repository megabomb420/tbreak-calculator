# T-Break Calculator

Mobile-first, local-first PWA for THC tolerance-break planning. Deterministic
engines own every scientific/numeric output. No account, no network science,
no runtime AI in v1.

Version **0.5.0** — evidence-guided T-break companion: stage-appropriate
withdrawal expectations, practical actions, overlapping scientific roadmap,
optional trigger/if-then planning, honest Then → Now check-in comparisons,
detox-claim evidence, CB1/tolerance education, and stronger post-break
guidance. History, IndexedDB, Interval, and the iOS 26 viewport-fill contract
from 0.4.2 are unchanged. Scientific engines, bands, and the day formula are
unchanged.

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

## Capabilities (0.5.0)

- Questionnaire (goals, branching, resume) and deterministic result screens
  with the §14 template layer, nominal-THC sheet, detection-only flow.
- **Reduction plan:** user-defined weekly limits persist on device and show on
  Today. "See your break range" stays a secondary cross-sell, not the only action.
- **Break start sheet**: Start now or pick a date (today + 14 days) and a
  post-break mode; creates a real `planned`/`active` break attempt anchored to
  the authoritative last use (`targetDurationDays` = the result's
  `preferredTargetDays`).
- **Today** driven by real attempt/tracking state: active break (Day N of
  target, target date, current scientific window, what you may notice, what
  can help today, what commonly comes next), interrupted (timing
  paused, Confirm when), completed break card with post-break plan, open-ended
  abstinence tracking, scheduled future plan, and per-goal saved-result cards.
  Open-ended tracking uses the same stage guidance, with a companion overlay
  for the overlapping roadmap, optional triggers, and detox notes — and no
  finish at day 28.
- **Plan detail**: plan-progress ring, overlapping break roadmap, current-stage
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
  silently recalculated.
- **Previous breaks** are added from the tolerance result or History. They can
  add a history insight only after **Recalculate with history** — they never
  change the recommended range.
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
| IndexedDB `reductionPlans` | cutting-down limits (never fed to an engine) |
| `tbreak.questionnaire-progress.v1` | unfinished draft (Web Storage) |
| `tbreak.result-view.v1` | result overlay `open` / `acknowledged` (Web Storage) |

Corrupt envelopes are dropped and treated as absent; an invalid row is
isolated from the rows/records that still validate. Duplicate ids keep the
newest row. Impossible segment timing and overflowing target durations are
dropped rather than rendered. A use-profile snapshot missing required fields
is treated as absent, not passed to an engine.

**Delete everything** removes only T-Break IndexedDB databases/stores and
`tbreak.*` Web Storage keys so a shared origin (GitHub Pages) is not wiped
wholesale.

## Layout

- `src/domain` — pure engines, schemas, validation, break + open-ended
  tracking state machines, versioned policies
- `src/application` — Today router, questionnaire engine, calculation
  coordinator, break-session services, deterministic plan presentation,
  History model, IndexedDB-backed durable repositories
- `src/infrastructure` — clock, Web Storage adapter, IndexedDB durable store
- `src/ui` — Preact PWA: shell, Today, History, plan detail, break start,
  check-in, interruption, previous-break sheet, questionnaire, result
  screens, settings

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
