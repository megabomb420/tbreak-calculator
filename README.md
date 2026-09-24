# T-Break Calculator

A private, mobile-first planner for tolerance breaks, cutting down, staying off THC, and understanding drug-test basics.

**Version 0.31.0** · [Open the app](https://megabomb420.github.io/tbreak-calculator/) · [Cloudflare Pages mirror](https://tbreak-calculator.pages.dev/)

The same build is published on two origins: GitHub Pages under the repository subpath and Cloudflare Pages at the domain root. They do not share device data — records, drafts and the service worker belong to the origin you open, so install and check in on one of them.

## Product

- **Today:** one current break or tracking state, check-ins, progress, and practical support.
- **Calculator:** all four goals remain reachable while a plan is running; unfinished answers can be resumed.
- **History:** immutable calculation results, check-ins, previous breaks and cut-down use logs, with explicit corrections and deletion.
- **Science:** a separate, source-linked explainer available from every main screen and Settings.

Calculations are deterministic and work on the device. There is no account, runtime AI, analytics, or cloud sync. Durable records use IndexedDB with a local-storage fallback; drafts use local storage. Browser data clearing removes saved records; Settings → **Your data** saves everything stored on the device to a backup file and restores from one. The installed PWA works offline after its first successful load.

The ranges and recovery outlook are **product estimates**, not clinically validated personal reset predictions. Withdrawal, tolerance, impairment, and detectability remain separate. The app never provides a negative-test date or detox percentage.

## Development

Requires Node.js 24 or newer.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run preview
```

The development server uses port 8080. Preview serves the production build on port 4173. On Windows, use `npm.cmd` if a shell shim interferes. In a restricted workspace, point `TEMP` and `TMP` at a writable scratch directory for Vitest.

`npm test` runs in the host timezone. `npm run test:tz` re-runs both runners under `America/Los_Angeles` and `Europe/Berlin` so local-calendar behaviour is asserted rather than assumed; the zones come from the two `.tz-*.env` files through `--env-file`, because a shell-assigned `TZ` is ignored on Windows. CI runs that pass as well.

## Architecture and evidence

- [ARCHITECTURE.md](ARCHITECTURE.md): boundaries, storage and current implementation.
- [UX_SPEC.md](UX_SPEC.md): interaction, navigation and clock contracts.
- [CALCULATOR_SPEC.md](CALCULATOR_SPEC.md): versioned deterministic policies.
- [EVIDENCE_CONTENT_SPEC.md](EVIDENCE_CONTENT_SPEC.md): evidence and interpretation limits.
- [HANDOFF.md](HANDOFF.md): current decisions and release validation.
- [Research PDF](references/tbreak-science-project.pdf) and `sources/TBREAK_PROJECT_CONTEXT.md`: research basis. All `sources/` files are read-only synced references.

Numeric policies remain `tolerance-v3`, `detection-copy-v1`, and `tolerance-recovery-outlook-v2`. Stored results retain their original numbers and policy versions. Only live elapsed-time guidance advances; a new calculation creates a new record.

## Deploy

Push to `main` runs `.github/workflows/pages.yml`: clean install, domain/golden/UI tests, type checks, production build, then GitHub Pages deployment. A failed validation prevents deployment. Vite uses the repository subpath `/tbreak-calculator/` in production unless `BASE_PATH` overrides it.

Cloudflare Pages serves the same build at the domain root with `BASE_PATH=/ npm run build`, then `npx wrangler pages deploy dist --project-name tbreak-calculator --branch main`. There is no push-triggered Cloudflare workflow: the deploy is a local, deliberate step, so a failed test run cannot publish.

Verify the deployment you care about, then open the live app and check Settings → About for **0.31.0**. Existing PWA users receive an update prompt once the replacement service worker is ready. Historical release details are retained in Git history.
