# T-Break Calculator

Mobile-first, local-first PWA for THC tolerance-break planning. Deterministic
engines own every scientific/numeric output. No account, no network science,
no runtime AI in v1.

## Run

```bash
npm install
npm run dev
```

Then open the printed local URL. Production:

```bash
npm run build
npm run preview
```

## Check

```bash
npm test
npm run typecheck
```

`npm test` runs the Node domain/application suite and the UI component tests.

## Layout

- `src/domain` — pure engines, schemas, validation, versioned policies
- `src/application` — Today router, questionnaire engine, calculation coordinator, §14 presentation, Web Storage progress
- `src/infrastructure` — clock, storage adapters (`localStorage` in the browser)
- `src/ui` — Preact PWA: shell, Today, questionnaire, result screens, settings

Specs: `CALCULATOR_SPEC.md`, `UX_SPEC.md`, `ARCHITECTURE.md`.  
Next-session notes: `HANDOFF.md`.
