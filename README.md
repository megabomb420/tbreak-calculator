# T-Break Calculator

Mobile-first, local-first PWA for THC tolerance-break planning. Deterministic
engines own every scientific/numeric output. No account, no network science,
no runtime AI in v1.

Version **0.3.1** — QA hardening on top of the 0.3.0 break loop (§8/§10):
real break plans, open-ended abstinence tracking, use-first daily check-ins,
and interruption/restart on the Interval visual system (dusk navy, parchment
type).

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

## Capabilities (0.3.1)

- Questionnaire (goals, branching, resume) and deterministic result screens
  with the §14 template layer, nominal-THC sheet, detection-only flow.
- **Break start sheet**: Start now or pick a date (today + 14 days) and a
  post-break mode; creates a real `planned`/`active` break attempt anchored to
  the authoritative last use (`targetDurationDays` = the result's
  `preferredTargetDays`).
- **Today** driven by real attempt/tracking state: active break (Day N of
  target, target date, withdrawal position, phase focus), interrupted (timing
  paused, Confirm when), completed break card with post-break plan, open-ended
  abstinence tracking, scheduled future plan, and per-goal saved-result cards.
- **Plan detail**: plan-progress ring, target date, withdrawal strip, phase
  focus, editable post-break mode/limits, End break early, Recalculate.
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

## Storage

Persistence is **Web Storage only**, through versioned, validated records:

| Key | Contents |
|---|---|
| `tbreak.questionnaire-progress.v1` | unfinished draft |
| `tbreak.questionnaire-snapshot.v1` | completed raw answers (+ optional `runId`) |
| `tbreak.result-view.v1` | result overlay `open` / `acknowledged` |
| `tbreak.break-attempts.v1` | stored break attempts (segments, post-break plan, ack) |
| `tbreak.tracking-records.v1` | stored open-ended tracking records |
| `tbreak.checkins.v1` | stored daily check-ins (chronological) |

Corrupt envelopes are dropped and treated as absent; an invalid row is
isolated from the rows/records that still validate. When Web Storage is
unavailable the app runs in memory (degraded, not persistent). **Delete
everything** removes only these `tbreak.*` keys so a shared origin (GitHub
Pages) is not wiped wholesale. IndexedDB remains reserved for the durable
record stores of the History slice.

## Layout

- `src/domain` — pure engines, schemas, validation, break + open-ended
  tracking state machines, versioned policies
- `src/application` — Today router, questionnaire engine, calculation
  coordinator, break-session services, deterministic plan presentation,
  versioned record stores
- `src/infrastructure` — clock, storage adapters (`localStorage` in the
  browser)
- `src/ui` — Preact PWA: shell, Today, plan detail, break start, check-in,
  interruption, questionnaire, result screens, settings

Specs: `CALCULATOR_SPEC.md`, `UX_SPEC.md`, `ARCHITECTURE.md`.
Next-session notes: `HANDOFF.md`.
