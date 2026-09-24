# T-Break Calculator

A private, mobile-first planner for tolerance breaks, cutting down, staying off THC, and understanding drug-test basics.

**Version 1.0.0** · [Open the app](https://megabomb420.github.io/tbreak-calculator/) · [Cloudflare Pages mirror](https://tbreak-calculator.pages.dev/)

The same build is published on two origins: GitHub Pages under the repository subpath and Cloudflare Pages at the domain root. They do not share device data — records, drafts and the service worker belong to the origin you open, so install and check in on one of them.

## Product

- **Today:** the break day, an explained one-tap check-in, the stage you are in, one practical action with its full guide open, others' experiences matched to that topic, and your break timeline. **Manage break** updates last use without discarding earlier days.
- **Ride it out:** a delay timer for the moment an urge arrives — pick 5, 10 or 15 minutes, let it run (closing the sheet keeps it running), then record only how those minutes went. Finished sittings are listed in History under **Urges you sat with**. Stopping records nothing.
- **Check-in reminder:** one local time, off until you set it, shown on Today once the time has passed with no check-in yet. It can also raise a local notification while the app is open or running in the background; there is no server, so a closed app cannot be woken.
- **Support topics:** what you want help with during this break — asked after a break calculation, kept for the break they belong to, offered back rather than inherited by a later break, and changeable from Today's footer. Your topics take turns one day at a time, the topic you pick by hand holds for that day, and the day's own task stays inside the topic's depth.
- **New calculation:** opened from Today, so all four goals, a chosen break length and unfinished answers stay reachable while a plan is running, without leaving the day you are on.
- **History:** dated immutable calculation results (a saved result keeps its stored numbers), check-ins, previous breaks and cut-down logs; elapsed time is distinct from day position. Explicit corrections and deletion never regenerate a deleted recommendation.
- **Science:** a separate, source-linked explainer available from every main screen and Settings. The result screen shows one planning target plus a research section on what the four-week human reference does and does not mean; the app estimates no personal recovery window.

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

Numeric policies remain `tolerance-v3` and `detection-copy-v1`. Stored results retain their original numbers and policy versions; the retired outlook version marker is read only to explain an older saved result. Only live elapsed-time guidance advances; a new calculation creates a new record.

## Deploy

Push to `main` runs `.github/workflows/pages.yml`: clean install, domain/golden/UI tests, type checks, production build, then GitHub Pages deployment. A failed validation prevents deployment. Vite uses the repository subpath `/tbreak-calculator/` in production unless `BASE_PATH` overrides it.

Cloudflare Pages serves the same build at the domain root with `BASE_PATH=/ npm run build`, then `npx wrangler pages deploy dist --project-name tbreak-calculator --branch main`. There is no push-triggered Cloudflare workflow: the deploy is a local, deliberate step, so a failed test run cannot publish.

After a deliberate deployment, verify Settings → About matches the release being deployed. This working-tree release is **1.0.0**; a version bump alone does not publish it. Existing PWA users receive an update prompt once a replacement service worker is ready.
