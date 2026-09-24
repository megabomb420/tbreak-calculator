# Handoff — T-Break Calculator 0.38.0

Repository: https://github.com/megabomb420/tbreak-calculator · branch `main`
Live app: https://megabomb420.github.io/tbreak-calculator/ · mirror: https://tbreak-calculator.pages.dev/ (Cloudflare Pages; the two origins do not share device data)

## Current product decisions

Today and History are the two destinations. Starting a plan is a flow opened from Today rather than a browsable tab, so the four goals, a chosen break length, an unfinished draft and the saved plan stay reachable without navigating away from a running break. Local-first storage, the shared date editor, the dialog coordinator and the discreet ink/slate/sand identity are unchanged.

**The result screen has one body and one number that matters.** The planning target leads, with the planning range and the uncertainty line directly beneath it, then the break journey (**what may happen across the break**), **Why this plan**, a **research section**, your history and your answers. There is no second estimate competing with the target, and no mode switch.

**The research section replaced the recovery-outlook mode.** It states the four-week human CB1 PET reference as a population research reference, links the published studies (Hirvonen, D'Souza, Budney), and lists what the reference does not mean: a reached target is not proof of reset, CB1 availability is not subjective tolerance, and withdrawal, tolerance, impairment and detectability stay separate questions. The app estimates **no** personal recovery window, date, percentage or endpoint. A saved result that was calculated while the window was still shown carries one honest line explaining that the estimate was a product heuristic and is no longer part of the result.

**Today is a daily read, not a set of drawers.** Every section is open: the day and target, the explained one-tap check-in, **This stage** (window label, headline, context, what people commonly notice), **Help with** (a native topic selector with the day's suggestion first) whose full guide is always visible — *Why this helps*, *What else can help*, *What to avoid*, *When to get advice*, sources — then **Experiences** and **Your break timeline**. Only **Manage break** (last-use correction, ending early) stays collapsed; the recovery-outlook disclosure is gone.

**The advice is deeper and source-grounded.** Eleven topics, each with 5–8 practical steps drawn from reviewed sources: the NSW Health quitting guide and Turning Point for urge management (delay, distract, breathe, drink water) and sleep timing, CAMH for removing paraphernalia, structure and the realistic mood timeline, NHS Every Mind Matters for sleep hygiene, healthdirect for breathing and relaxation, NHS 5 steps for activity and connection, NIDA for the symptom list. Medication, dosing, supplement and detox-product content in those sources is deliberately not reproduced. No source read offers a technique specific to vivid dreams, so the app describes them and points back to sleep care rather than inventing one.

**Experiences follow the topic on screen.** The cards tagged with the selected topic lead, then the rest of the stage's cards, capped at eight so the position dots stay tappable; the rotation is day to day and a stored legacy rating still lifts its own topic first.

One-tap check-ins with persistent Undo, **Manage break → Update last use**, the cut-down tracker and its session log, History's dated groups, the backup/restore contract, browser zoom and the viewport sizing rule are unchanged from 0.37.0.

## Release 0.38.0 — the honest result, and advice worth reading

- **The predicted recovery window is retired.** `tolerance-recovery-outlook-v2`'s displayed window (and v1's fixed-reference panel) is gone from the result screen and from Today, together with the `Your plan | Recovery outlook` switch, the check-in-facts presenter and the panel components. The headline figure could not be defended: the code itself classified the days beyond the four-week human reference as a product heuristic resting mainly on preclinical support, and a large "estimated recovery window" reads as a personal prediction that no disclaimer underneath it can undo.
- **What replaces it.** A research section that answers the question the old panel was trying to answer — what the research says, what stays uncertain, and whether reaching the target means a reset — using the reviewed CB1 paragraphs that already existed, the study links, and a new "what this does not mean" list.
- **The Calculator tab is gone (navigation is Today and History).** The four goals, **Choose my break length**, a draft and the saved plan moved into a sheet opened by one quiet link on Today; Today and History are the whole navigation now.
- **Today keeps the day open and the depth one row away.** Visible: the day and target, the check-in with its meaning, **This stage** (window, headline, one sentence), the topic picker with the day's action and **Why this helps**, the topic-matched experiences and **Your break timeline** (open on the owner's call). Behind one row each: **What you may notice**, the guide's **What else can help** (remaining steps, **What to avoid**, **When to get advice**, sources) and **Manage break**, whose **Update last use** is a compact left-aligned button with small top/bottom margins rather than a full-width CTA. Section headings moved to the display face with uppercase kickers; measured at 390×844 the card went from 3605px to 1869px and the day's action now sits at 694px against a 720px first screen, so a five-to-eight-step guide cannot bury it.
- **Richer, source-grounded advice**: eleven guides rewritten with 5–8 steps each, verified sources added to `SUPPORT_SOURCES`, `daily-support-v4` → `daily-support-v5`.
- **Experiences are topic-matched** and the pool was raised from five to eight cards per view; the card library grew from 17 cards across 12 r/Petioles discussions to 44 cards across 39, prioritising the thinly covered topics (nausea, headaches, irritability) and adding late-break and return-to-use accounts.
- Retired the dead machinery: `predicted-reset.tsx`, `result-mode-control.tsx`, `recovery-copy.ts`, `recovery-checkin-facts.ts` and their tests are deleted; `recovery-outlook.ts` keeps only the stored version constants, `BIOLOGICAL_REFERENCE_DAYS` and `hadRecoveryOutlook()`.

### Compatibility

New calculation records no longer write `recoveryOutlookVersion`. Records that already carry it (`tolerance-recovery-outlook-v1`/`v2`) remain valid, are never rewritten or recomputed, and keep their stored planning target and range exactly as calculated — the only addition is the legacy line in the research section. `isValidCalculationRecord` still accepts both version strings, so a restored backup from an older release loads unchanged.

### Validation (0.38.0)

- `npm test`, `npm run test:tz`, `npm run typecheck` and `npm run build` are green on the final tree (counts recorded in the release output below).
- Browser pass at 390×844 on the dev server: result screen (plan hero, journey, why-this-plan, research section with the three study links, no mode switch, no estimate), Today (all sections open, topic selector, topic-matched experiences, timeline), History (dated rows, saved result with its day), `Manage break` flows.
- Not covered: physical iOS/Safari and assistive-technology review.

### Deployment (0.38.0)

Shipped to `main` as `e7c4904` and published by `.github/workflows/pages.yml`, which re-ran `npm ci`, `npm test`, `npm run test:tz`, `npm run typecheck` and `npm run build` on Node 24 before `actions/deploy-pages`; both jobs succeeded (run 36020388972). The Cloudflare mirror was redeployed from the same tree with `BASE_PATH=/ npm run build && npx wrangler pages deploy dist --project-name tbreak-calculator --branch main`.

Live verification on the deployed build at 390×844, with the service worker bypassed so a cached 0.37 shell could not mask the release:

- Settings → About reads **0.38.0** on both origins; the served bundle hash and the viewport meta (`width=device-width, initial-scale=1, viewport-fit=cover`, no `maximum-scale`) match the release.
- Today shows the day and target, the check-in with its meaning, **This stage** (window, headline, one sentence), the topic picker with the day's action and **Why this helps** at the fold (694px against a 720px content band once the one-off install banner is dismissed), and the topic-matched experiences. **What you may notice**, **What else can help**, **Your break timeline** and **Manage break** are each closed.
- Choosing **Nausea** swaps the topic, keeps the action in the same place and leads the experiences with the nausea accounts (1 / 8).
- A saved result opens with no mode switch, the research section with all three study links and no displayed window; the only "estimated recovery window" text on the page is the honest legacy note on that pre-0.38 record.
- The card measures 1869px collapsed (was 3605px with every section open) with no console errors.

## Evidence decisions

The research section and the guides use only material already reviewed in this repository plus the pages listed in the sources above. Nothing new was invented; the four-week CB1 figure stays a population reference, never a personal finish line, and no window, percentage or reset score is produced anywhere. The excluded content from those sources — medication protocols, sleep aids and melatonin, nicotine replacement, multivitamins, detox products, taper percentages — is documented in `EVIDENCE_CONTENT_SPEC.md` §15 and is not shipped.

## Release 0.37.0 — a practical daily companion

- Rebalanced Today around a short daily visit: day/target, explained check-in, visible stage headline, one action. Research outlook, experiences and timeline are optional depth.
- Replaced the sideways topic row with an accessible **Help with** select that also carries today's suggestion; guide depth moved under **More ideas & sources** without losing any step.
- Added cancelable last-use correction through existing deterministic transitions (finite breaks and open-ended tracking), with regression coverage.
- Dated History rows, corrected first-day elapsed wording, stopped deleted recommendations being re-derived from orphaned snapshots, and pointed historical result links at the goal they name.
- Fixed corrupt-record deletion: the row's source store, not its display category, decides what is deleted. A valid same-ID row in another family survives, and a corrupt outcome/check-in row no longer reappears after reload.
- Fixed the Web Storage fallback swallowing refused saves before the durable failure channel, and kept synchronous form saves from claiming success: a refused save shows the storage banner and leaves the form and its input intact.
- Removed superseded guidance presenters, the unused concepts panel, the zoom blocker and obsolete source/DOM-shape tests; kept legacy-data consumers and live behavioural coverage.
- A saved result names its own local day in the detail header, and the result screen's plan/outlook control carries its one-line legend again (Today no longer owns a mode control, so the legend moved to the surface that still switches).
- The backup export test asserts the file records the app's own `APP_VERSION` rather than a fixture string, so release metadata cannot drift unnoticed.
- Removed the last copy that implied symptom check-ins are still collected (the result screen's "Advice during your break" line, plus the Science data note), which 0.35.0's removal of ratings had left describing a capability the app no longer has.
- Aligned package, lockfile, About, README, UX/architecture/calculator/evidence specs at 0.37.0, and made Science describe the advice inputs the app actually has.

### Validation (0.37.0)

- `npm test`: **619 unit/domain/golden tests** and **192 UI tests** pass, 3 timezone-gated UI cases skipped.
- `npm run test:tz`: both `America/Los_Angeles` and `Europe/Berlin` passes complete the same suite with no failures.
- `npm run typecheck`: all three TS projects clean.
- `npm run build`: production build succeeds (384 KB JS / 111 KB gzip; 40 precached entries).
- Browser pass at 390×844 against the dev server: questionnaire → result → break start → Today; check-in, Undo and reload persistence; topic selection and reset to the daily suggestion; cancelable last-use correction with the restart copy; History dates; `Manage break`; no console errors. Document height now matches the viewport (844), so the header no longer scrolls off.
- Not covered: physical iOS/Safari and assistive-technology review; pinch-zoom was verified through the DOM contract (no `maximum-scale`/`user-scalable`, no gesture blocker) rather than a synthetic multi-touch gesture, which timed out in headless Chromium.

### Deployment (0.37.0)

Shipped to `main` as `7c04171` (feature) and `6c3b724` (the copy fix above) and published by `.github/workflows/pages.yml`, which re-ran `npm ci`, `npm test`, `npm run test:tz`, `npm run typecheck` and `npm run build` on Node 24 before `actions/deploy-pages`; both the build and deploy jobs completed successfully.

Live verification on the deployed build at 390×844 (GitHub Pages, service worker bypassed so a cached 0.36 shell could not mask the release): Settings → About reads **0.37.0**; the served `index.html` carries `width=device-width, initial-scale=1, viewport-fit=cover` with no `maximum-scale`; `--app-height` is 844px with no document overscroll; Today shows the day/target, the explained check-in (**Saved · No THC reported**), the stage headline and the day's own practical activity, with **Help with**, **Experiences**, **Your break timeline**, **Recovery outlook** and **Manage break**; a topic switch plus **More ideas & sources** render that guide's remaining steps and its sources; **Manage break → Update last use** changes nothing on cancel and shows the restart copy on confirm with earlier check-ins intact; History lists dated check-ins, the dated recommendation and the break run (**Less than a day so far**); and a saved result reads **Saved result · 24 Sep 2026** with the restored plan/outlook legend and the corrected advice line.

The Cloudflare Pages mirror was **not** redeployed in this session, so it still serves the previous release until that deliberate local step is run.

### Evidence decisions (0.37.0)

Existing research and versioned deterministic policies remain authoritative. Population withdrawal patterns, tolerance planning, impairment and detectability stay separate. No negative-test guarantee, detox protocol, biological completion state or medical endpoint is introduced.

Clinical review of health exclusions and location-appropriate urgent-help routing remains outstanding; this release does not invent them. Backup restore retains its documented non-atomic I/O-failure case. Reference material under `sources/` stays read-only.

## Release 0.31.0 → 0.36.0 — one topic at a time, nothing hiding, one banner

## Release 0.31.0 → 0.36.0 — one topic at a time, nothing hiding, one banner

Six releases shipped on top of 0.30.0; the details are in Git history, and the summary is: **0.31.0** removed the decorative orbit artwork, moved the mode switch out of the scrolling body and put the notices into normal flow; **0.32.0** reopened the journeys and guidelines that 0.31.0 had closed and gave the active card its `Your plan` / `Recovery outlook` switch; **0.33.0** made the urge plan a controlled editor that writes only on save; **0.34.0** reordered the day card to the order the day happens; **0.35.0** removed the 0–10 symptom ratings and the urge-plan block from Today and settled on one advice topic at a time; **0.36.0** compacted the card until the day's action fitted the first screen at 390×844, flattened the topic picker into one row, added the install-hint dismissal, grouped History by record family and gated the questionnaire draft behind a real answer.
