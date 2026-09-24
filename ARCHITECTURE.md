# T-Break Application Architecture

Version: **0.38.0**
Research basis: `sources/TBREAK_PROJECT_CONTEXT.md` and `references/tbreak-science-project.pdf`. Numeric contracts: `CALCULATOR_SPEC.md`.

Current implementation additions:

- `application/calculation/saved-result.ts` separates immutable calculation output from live elapsed-time presentation and resolves the owning profile for ongoing plans.
- `ui/date-control.tsx` owns shared intake/interruption date entry; pure calendar validation/bounds stay in `application/questionnaire/date-answers.ts`.
- `ui/focus-trap.ts` coordinates the topmost dialog, keyboard focus, inert background, focus restoration and one browser-history entry per open flow stack. Transitions do not accumulate obsolete steps.
- Shell destinations are Today and History. Science, the new-calculation sheet (goals, chosen length, draft resume, saved plan) and the questionnaire/result/detail screens all use the shared overlay contract; a new calculation therefore never requires leaving a running plan.
- `companion-personalisation-v2` remains independent of use-profile calculations: it selects and orders daily advice only, and is never passed to tolerance-v3 or the outlook constants. The support sheet writes it (`supportAreas[]`, in the person's order), Today reads it, and it stays migratable on load and part of the backup format.
- Numeric version remains tolerance-v3. The `tolerance-recovery-outlook-v1` / `-v2` version markers are retained for stored-record validation only: no window is built, so `domain/recovery/recovery-outlook.ts` keeps just the two constants, `BIOLOGICAL_REFERENCE_DAYS = 28` and `hadRecoveryOutlook()`. New calculation records do not set `recoveryOutlookVersion`; stored records that carry it stay valid and are explained by one legacy line in the result's research section.
- `daily-support-v6` renders the editorial practice by default, with legacy-rated topic, saved support-topic and personal-plan precedence. Manual topics are local UI state, reset by break day; no ratings are collected. The support sheet (`companion-personalisation-v2`) stores the topics the person asked to be helped with, and they take turns by break day when no rating outranks them; the day's own task then stays inside the leading topic's depth. All eleven guides keep the action and its explanation on the page, with the remaining steps, "What to avoid", sources and, where one applies, "When to get advice" behind one collapsed row; the Experiences carousel is matched to the selected topic and capped at eight.
- Today's stage, advice and experiences are open sections; the break timeline, the symptom list, the guide's remaining steps and `Manage break` are single-row disclosures. `Manage break` reuses atomic suspend/confirm orchestration; opening/canceling never persists a paused intermediate state.
- History dates use shared local formatting; complete elapsed days are separate from abstinence-day position. Deleting a calculation invalidates its display snapshot rather than re-running an engine.
- Corrupt IndexedDB rows carry their source store in the hydrated model; deletion must not infer that store from a display category or delete a valid same-ID row in another family.
- Web Storage fallback propagates refused durable writes to the existing failure channel; transient drafts remain best-effort. Synchronous form-save failures keep forms open. Browser zoom is enabled, and viewport sizing checks both screen dimensions.

## 1. Architecture objective

Build a mobile-first, local-first PWA whose useful v1 behaviour is deterministic and offline-capable. The architecture prevents UI, persistence, or any non-reviewed code from inventing scientific outputs.

```text
branching questionnaire
  -> validation and normalisation
  -> deterministic Tolerance Engine and/or qualitative Detection Engine
  -> immutable structured result
  -> deterministic result and plan views
  -> local persistence
```

Runtime generative AI is intentionally not part of the product architecture (see §12). Numeric detection rules, jurisdiction packs, telemetry, and cloud sync are not v1 components.

## 2. V1 component boundary

### Build in v1

- shared schemas, provenance, validation, and normalisation;
- versioned static tolerance policy and pure Tolerance Engine;
- versioned static qualitative detection policy and pure Detection Engine;
- nominal flower THC calculator;
- branching questionnaire;
- deterministic result, withdrawal, break-plan, check-in, history, and post-break views;
- versioned EvidenceGuidanceV1 companion content (withdrawal windows, detox claims, trigger/precommitment copy);
- BreakOutlookV1 day-by-day presentation over those windows (Result / Today), including the 0.7.2 grouped-roadmap presentation transform (consecutive equivalent days collapse into `Days N–M` labels; the exact per-day model stays authoritative);
- the result screen's static research section (`ui/research-context.tsx` over `ui/research-copy.ts` plus the CB1 concept note): the four-week human CB1 PET population reference, the "what this does not mean" list, direct study links, and the one-line explanation for a stored record that predates 0.38.0 — deterministic, local, offline, and containing no window, percentage or personal date;
- post-break outcome marks (`break-outcome-marks-v1`), offered once per completed break after a real return to THC;
- IndexedDB persistence and complete local deletion;
- local backup export/restore of the stored records through Settings, with validated replace semantics (§9); and
- PWA shell/offline support, with the single service-worker update state (snackbar + Settings About) driven from `registerSW` in `src/ui/main.tsx`;

### Defer beyond v1

- quantitative Detection Packs and pack-loader/plugin machinery;
- cutoff, analyte, laboratory, device, or jurisdiction schemas;
- Ireland-specific rules;
- telemetry;
- cloud sync; and
- a runtime evidence registry.

The deferred features receive clean interfaces only when implementation begins. V1 MUST NOT collect or persist placeholder data for them.

## 3. Dependency structure

```text
UI (Preact)
  shell | today | history | settings
       |
Application services
  shell controller | Today state router | questionnaire-progress store
       |
Domain core
  schemas | validation | tolerance | qualitative detection | nominal THC
       |
Static versioned policies / domain rules
  tolerance-policy-v3 | reduction (reduction-engine, reduction-plan-lifecycle) | detection-copy-policy-v1

Infrastructure adapters
  Web Storage (transient draft) | explicit clock | service worker
```

Dependencies point toward the domain core. The domain core has no UI, browser storage, network, model SDK, analytics, or implicit clock imports.

**Frontend toolchain (resolved):** Vite + Preact.

- The domain and application layers stay framework-independent TypeScript modules.
- Preact is a small, mature component runtime so questionnaire and result screens can land as ordinary components later without a second migration.
- Vite provides the development server, production build, and (via `vite-plugin-pwa`) the installable offline app shell.
- There is no extra client state library: the UI dispatches `shellReducer` actions and renders `resolveTodayState` output. It does not reimplement Today precedence.
- The transient questionnaire draft uses Web Storage (`localStorage`) through `StorageAdapter`. IndexedDB is reserved for the durable record stores in section 9 and is not introduced for a single JSON draft.

Suggested source layout:

```text
src/
  domain/
    schemas/
    validation/
    tolerance/
    detection/
    nominal-thc/
    policies/
    guidance/          evidence-guidance-v1, break-outlook-v2
  application/
    progress/
    settings/
    shell/
    presentation/      plan, result, break-guidance, break-outlook, check-in comparison
    break/             session ops, post-break plan, optional preparation
  infrastructure/
    storage/
    clock.ts
  ui/
    shell, today, history, settings
tests/
  unit/
  golden/
  ui/
```

There is no v1 `telemetry`, `evidence-registry`, or detection-pack directory. The local backup is the application-layer `application/backup/backup.ts` module (no browser APIs) plus the browser plumbing in `ui/backup-file.ts`.

## 4. Domain interfaces

Conceptual pure interfaces:

```text
validateAndNormalize(rawAnswers, calculationTime) -> ValidatedInput | ValidationError[]

calculateTolerance(validatedProfile, tolerancePolicy, calculationTime)
  -> ToleranceResult

explainDetection(detectionRequest, qualitativeDetectionPolicy)
  -> DetectionResult

calculateNominalFlowerThc(validatedNominalInput)
  -> NominalThcResult
```

The functions MUST have:

- explicit inputs and calculation time;
- no storage or network access;
- no random values;
- no locale-dependent date arithmetic;
- no mutation of inputs or policies; and
- structurally equal output for equal normalised inputs, policy versions, and calculation time.

Tolerance and detection use separate result types. There is no shared `daysUntilClear`, detox progress, receptor progress, or biological percentage.

## 5. Static policy design

V1 uses small, reviewable, versioned policy modules rather than a general pack platform.

### 5.1 Tolerance policy

The tolerance policy (`tolerance-policy-v3.ts`, version `tolerance-v3`) contains only:

- the accepted 30-day use-frequency boundaries and their base tiers;
- the bounded exposure classification over frequency + intensity + chronicity (a tier moves at most one adjacent evidence tier; the 2–7 / 7–14 / 14–21 / 21–28 ranges are the outer bounds, never above 28), labelled `heuristic_frequency_intensity_v3` / `heuristic_chronicity_range_v3`;
- the within-range preferred-target anchor rule (recently established pattern → lower anchor; medium/long-established or missing duration → upper anchor) labelled `heuristic_duration_target_within_range_v3`;
- the bounded in-range previous-break planning-target override labelled `heuristic_history_target_within_range_v3`;
- uniform v3 confidence values and uncertainty code;
- withdrawal anchors;
- history-inference predicates; and
- driver/limitation message codes.

Every non-source threshold is labelled `product_heuristic`. The broad ranges are unchanged from tolerance-v1/v2; v3 replaces the single-variable frequency lookup with the multi-factor bounded classification above. A policy change creates a new version and new golden fixtures. Historical records retain the version used.

### 5.2 Qualitative detection policy

The detection policy is static copy/message codes for urine, blood, oral fluid, and hair, plus the roadside jurisdiction warning. It contains no day range, cutoff, analyte, test device, laboratory stratum, or jurisdiction threshold.

### 5.3 Future numeric detection extension point

The future numeric Detection Engine must be a separate extension, not an edit to the qualitative copy module. Before it is implemented, a new reviewed specification must define:

- controlled identifiers for analytes, units, and devices;
- exact cutoff and method matching;
- non-overlapping use/laboratory strata;
- range anchor basis;
- provenance and evidence grading;
- build-time rejection of any intersecting active rule domains; and
- runtime fail-closed behaviour as defense in depth.

No loader or plugin framework is justified until the first evidence-backed numeric rule set exists.

## 6. Questionnaire and data minimisation

The questionnaire is declarative and branches only to fields that affect an enabled result, plan, or local user-facing history.

```text
goal
  |-- tolerance reset
  |     -> current-pattern duration (first use-profile question)
  |     -> use days -> authoritative last use
  |        (sessions, products and routes only when use days are 4-30)
  |
  |-- reduction
  |     -> use days -> optional sessions
  |     -> 0 use days: baseline-low; otherwise reduction (cut-down) planning,
  |        no duration/last use collected
  |        (`Q2R` survives only as a parseable legacy step id)
  |
  |-- abstinence
  |     -> current-pattern duration (first use-profile question)
  |     -> authoritative last use
  |     -> no use days, sessions, products, or routes
  |     -> withdrawal/abstinence planning
  |     -> postBreakMode fixed to continue_abstinence
  |
  |-- detection information
        -> matrix -> general/workplace/roadside context
        -> qualitative result only (no duration)
```

The single `UseProfile.lastUseAt` feeds tolerance, withdrawal, and active break timing. Detection v1 does not need it because it emits no numeric elapsed-time interpretation; if the screen shows elapsed time for general orientation, it references the same profile field and does not copy it into `DetectionRequest`.

`currentPatternDuration` is collected as exposure context and is the first use-profile question on the routes that use it (tolerance reset and abstinence; the shipped reduction route collects no duration). Under tolerance-v3 it selects the deterministic *planning target* inside the final range (lower anchor for a recently established pattern; upper anchor for a medium/long-established or missing duration) and may move the recommended range itself only in the single bounded case of a frequent (16–25 use-days) long-established pattern (one band to 21–28). There is no duration-to-days formula. Legacy profiles without the field remain valid.

V1 MUST NOT ask for cutoff, lab baseline, creatinine, device, planned test date, jurisdiction, employer identity, health, medication, age, sex, BMI, hydration, exercise, or perceived metabolism. Lifetime cannabis-use duration is not asked; only how long the *current* pattern has been typical.

Flower grams and potency appear only when the user opens the nominal THC calculator. Check-in notes remain optional, local, unparsed, and user-visible.

Companion personalisation is a stored record with no editing flow and no reader. Its `supportAreas[]` is migrated forward on load and carried by the backup so a legacy device keeps its data, but it selects nothing. The calculation coordinator never receives this record. Check-ins continue to store only the user's current-day experience.

## 7. Calculation orchestration

The coordinator performs these steps:

1. capture the raw branch answers and explicit calculation timestamp;
2. validate field provenance, cross-field consistency, and both directions of the 30-day rule;
3. normalise timestamps and domain values;
4. call only the engine required by the explicit goal (the snapshot derives `breakRequested` from the goal; no questionnaire route asks it);
5. validate the core output and optional blocks separately;
6. freeze the structured result;
7. render it with deterministic message templates; and
8. persist the minimal validated snapshot, result, and policy version locally when the user saves or starts a plan.

A failed core range invariant prevents range display. A malformed optional history insight is omitted without blanking a valid core range. No coordinator branch substitutes a fallback scientific value.

## 8. Withdrawal and break state

The domain engine, not the UI, calculates elapsed hours, `breakDay`, anchor status, and target date.

```text
BreakAttempt
  id
  status: planned | active | interrupted_time_needed | completed | ended
  calculationRecordId
  targetDurationDays
  segments[]
  startedAt
  postBreakMode

BreakSegment
  startedFromLastUseAt
  endedAt or null
  endReason: used_thc | completed | user_ended | null
```

When a check-in records THC use:

- the coordinator requires confirmation of `usedAt`;
- timing is suspended until confirmed;
- the authoritative last-use timestamp is updated once;
- the previous segment is preserved and a new segment begins;
- the same target duration is re-anchored to the new timestamp; and
- a full profile recalculation occurs only by explicit user action.

This is a plan restart, not a claim that biological recovery returned to zero.

Open-ended abstinence tracking uses the same segment shape through a
separate open-ended record (CALCULATOR_SPEC 4.7): no `targetDurationDays`,
no `completed`, and the interruption mechanics apply minus any target-date
recomputation.

Active reduction (cut-down) plans are a separate pure domain
(`src/domain/reduction/reduction-engine.ts` + `reduction-plan-lifecycle.ts`)
persisted under the `reduction-records-v2` application store
(`src/application/progress/reduction-record.ts`; see CALCULATOR_SPEC §10.1).
Their events are sessions recorded as UTC instants, each carrying the UTC
offset it was logged at, grouped by the local calendar day; a row written
before 0.29.0 has no offset of its own and is grouped with the current one, and
breach days are counted over day keys so no past session is re-interpreted
under a later daylight-saving offset. Logging use in reduction mode never
interrupts, restarts, or re-anchors a break attempt, and tracked use never
generates or rewrites a calculation record. Frozen calculation records stay
immutable.

## 9. Local persistence

Use IndexedDB behind repository interfaces for durable records (profiles,
calculations, break attempts, check-ins, previous breaks, post-break plans,
settings). The v1 **transient questionnaire draft** is a single versioned JSON
string and is stored through the Web Storage-shaped `StorageAdapter`
(`localStorage` in the browser, in-memory in tests). IndexedDB is not used for
that draft.

**Current slice note (0.4.0):** durable records persist through IndexedDB
per-record stores (`calculations`, `breakAttempts`, `trackingRecords`,
`checkins`, `previousBreaks`, `postBreakPlans`, `profiles`, `reductionPlans`,
`reductionRecords`, `breakOutcomes`). `reductionPlans` holds legacy reduction-plan-v1 limit
rows (still readable; copied into a plan baseline and cleared when a
`reduction-records-v2` plan starts from one); `reductionRecords` holds the v2
active-reduction tracker plans; `breakOutcomes` (0.9.0) holds outcome marks for
the `break-outcome-marks-v1` envelope (`tbreak.break-outcome-marks.v1`),
exactly one `captured | skipped` mark per attempt. Previous-break rows may
carry an optional `sourceAttemptId` linking a captured outcome to the attempt
that produced it; hand-entered and legacy rows omit it and stay valid. The
questionnaire draft and result-overlay
flag remain on Web Storage. v0.3.x envelopes are migrated once,
idempotently, and left in place if a family fails. The repository interface
and record shapes are the boundary.

**Storage honesty (0.28.0).** The durable facade reports its own failures
instead of assuming they did not happen: `writeFailed` plus an
`onWriteFailure` subscription fire on the transition into and out of a failed
envelope write, so the app can stop claiming that a change was saved. A
blocked or failed IndexedDB open no longer presents the emptied Web Storage
envelopes as a successful store either — the facade reports itself
not-persistent there, which is what the storage banner and Settings read.

Minimal logical stores (IndexedDB, later slice) are:

```text
profiles
calculationRecords
breakAttempts
checkins
previousBreaks
postBreakPlans
reductionRecords
breakOutcomes
settings
```

`CalculationRecord` stores:

- the minimal validated input snapshot;
- immutable deterministic output;
- calculation timestamp;
- schema and policy versions; and
- limitation/message codes.

Historical records are never silently recalculated after a policy update. An explicit recalculation creates a new record and preserves the earlier result.

The app MUST support deletion of individual check-ins/breaks and deletion of all local data. It MUST not claim encryption beyond browser/platform storage unless a verified encryption design is later implemented.

**Local backup (0.26.0):** Settings → **Your data** writes a `tbreak-backup-YYYY-MM-DD.json` file and restores from a chosen one. The file is pretty-printed JSON with the envelope `{ format: 'tbreak-backup', formatVersion: 1, appVersion, exportedAt, data }`, owned by the application-layer `src/application/backup/backup.ts` (no browser APIs); `src/ui/backup-file.ts` holds only the browser plumbing (download anchor, file picker mounted inside the open dialog). `data` carries one registry entry per record family — `snapshot`, `calculations`, `attempts`, `tracking`, `checkins`, `previousBreaks`, `reductionRecords`, `reductionPlan`, `outcomeMarks`, `companionPersonalisation` — each payload exactly what that store's `load()` returns. Excluded by design: the questionnaire draft, the transient result-overlay flag, the derived `post-break-plans` mirror, the one-off migration marker, and already-corrupt rows.

Import parses every payload with the store's own load-time parser before writing anything, so a rejected file changes nothing; a missing store key means empty. A confirmed restore replaces all local data through the same wipe path as delete-everything, so families the file omits end up empty; the wipe runs before the writes, so an I/O failure mid-restore is the one non-atomic case. A unit test requires every `LOCAL_DATA_KEYS` entry and every `DurableSnapshot` field to be claimed by a backup store or named in `BACKUP_EXCLUDED_KEYS` / `BACKUP_EXCLUDED_SNAPSHOT_FIELDS`, so a new store must declare its backup status.

Schema migrations are forward-only, tested, and non-destructive. A failed migration must leave the existing database recoverable.

## 10. UI contracts

### 10.1 Tolerance result

The primary card renders the planning target from `ToleranceResult` as the hero, with the broad evidence range as the meta line beneath it, followed by drivers and one uncertainty sentence. It does not display two confidence badges in v1 even though the structured fields remain separate.

Example shape:

```text
Plan for 21 days (hero)
Evidence range: 21–28 days
Limited certainty: this is a broad product heuristic, and individual response varies.
Why: frequent use + multiple sessions/high-potency concentrate route
```

The card MUST NOT say reset complete, 100% reset, detoxed, or safe to resume the previous exposure. The recommended range stays the only evidence-claiming number; the planning target is a labelled heuristic choice inside it.

The tolerance result is a single body: plan hero (planning target) with the evidence range and one uncertainty line beneath it, the BreakOutlookV1 journey ("what to expect"), **Why this plan**, the always-visible research section, history, then the answer rows. There is no second mode, no segmented control and no predicted recovery window: the app does not estimate a personal recovery window or date. Day 28 is presented only as the four-week human CB1 population reference inside the research section (`ui/research-context.tsx`), which is derived from stored record data and static reviewed copy and never re-runs an engine or changes the stored result. A stored record that carries `recoveryOutlookVersion` is a result calculated before 0.38.0: it renders unchanged, with one legacy line (`research-copy.ts` `legacyOutlookNote`) explaining why no window is shown for it. The record-level outlook version is read only for that explanation and never causes a v1 History entry to adopt later semantics.

### 10.2 Withdrawal and progress

The timeline renders engine-supplied `upcoming/current/past` states and `breakDay`. Progress measures plan time and completed check-ins only. It never depicts receptor recovery or detox percentage.

### 10.3 Detection result

Every v1 detection card is explicitly qualitative. It shows matrix-specific principles and uncertainty, not a likely X–Y range, confidence badge, pass/fail label, or clean date. Workplace context adds that cutoff/policy details are unknown; roadside context adds the verified-jurisdiction-rules warning. Context is collected only because it changes this copy.

### 10.4 Post-break plan

Post-break modes remain user-chosen and qualitative. The system records limits the user chooses; it does not calculate a safe dose or hidden repeated-exceedance threshold. Abstinence users do not see return-to-use planning unless they change goal.

## 11. Offline, privacy, and failure behaviour

The PWA shell, static policies, message templates, and local flows are available offline after installation.

V1 makes no scientific network request and includes no runtime generative AI and no remote telemetry. Failure behaviour:

- invalid input -> field-level correction, no result;
- invalid core result -> safe calculation error, no range;
- invalid optional history block -> omit only that block;
- storage unavailable -> allow an in-memory calculation and clearly state it cannot be saved;
- corrupt record -> isolate it without deleting unrelated history; and
- timezone change -> preserve UTC instants and update display formatting only.

Before public release, security/privacy review must cover content security policy, dependency/network allow-list, local deletion, logs without notes/use histories, storage claims, and service-worker update behaviour.

## 12. Runtime generative AI decision

Runtime generative AI is intentionally out of scope. The shipped PWA contains
no LLM, no model configuration, no provider inference layer, no AI consent
flow, no response-schema validation, and no runtime prompt infrastructure.

User-facing explanations, the research section's reference copy, evidence summaries, and
personal-history insights are deterministic and derived from reviewed
structured data that is stored or computed locally. No extension point is
retained "just in case"; if the product direction ever changes, that decision
is revisited explicitly, not assumed through leftover scaffolding.

## 13. Testing strategy

### Unit and boundary tests

Test schema/provenance validation, inverse 30-day consistency, goal routing, every tolerance boundary, the bounded v3 exposure classification (intensity/chronicity moves at most one adjacent tier, never above 28), uniform confidence, nominal THC math, history predicates, elapsed withdrawal status, and interruption mechanics.

### Golden domain fixtures

Fixtures freeze input, `calculatedAt`, schema version, and policy version. Compare structural domain values rather than byte serialization. Any scientific or product-rule change requires a new policy version and reviewed fixture changes.

### Invariant tests

Generate profiles to prove that prohibited inputs cannot affect ranges, tolerance and detection remain separate, targets stay inside ranges, qualitative detection emits no numbers, hair emits no clear date, and no output contains fake percentages or guarantees.

### Persistence, offline, and accessibility tests

Test migrations, local deletion, backup export/restore validation and replace semantics, unavailable storage, offline calculation, policy-version history preservation, keyboard/screen-reader flow, color contrast, touch targets, narrow viewports, reduced motion, and error recovery. Uncertainty must not rely on color alone.

Pack conflict tests, controlled device vocabularies, and telemetry tests are added only when those deferred features enter scope. Runtime generative AI has no contract tests because it is not part of the product architecture (section 12).

## 14. Versioning and change control

V1 independently versions:

- application build;
- persisted schema;
- Tolerance Engine/policy;
- qualitative Detection Engine/policy; and
- nominal THC calculator.

A tolerance numeric change requires a policy version change, rationale distinguishing source evidence from product heuristic, golden-fixture review, and a human-readable changelog. Existing results retain their original version.

Future numeric detection rules and AI schemas receive separate version lines when implemented. AI configuration can never change a deterministic scientific version.

## 15. Implementation sequence

1. schemas, `SourcedValue<T>`, validation, normalisation, and explicit clock;
2. static v1 tolerance policy plus pure Tolerance Engine and golden tests;
3. elapsed withdrawal display, previous-history inference, and interruption state tests;
4. qualitative Detection Engine and nominal flower THC calculator;
5. branching questionnaire and deterministic result views;
6. break plan, check-ins, post-break plan, and IndexedDB history;
7. PWA offline, deletion, accessibility, privacy, and safety hardening.

The recommended first implementation slice is steps 1–2 limited to domain code and tests. It builds no screens and no deferred infrastructure.

UX_SPEC §16 then sequences the UI as: (1) shell + Today router + draft persistence, (2) questionnaire engine, (3) result screens, (4) break loop, (5) history and offline hardening. The browser/PWA shell in `src/ui` is step 1 of that sequence.

## 16. Decision status

### Resolved for implementation

- authoritative source audit;
- v1 use-day thresholds and frequent intensity precedence;
- uniform confidence and single user-facing uncertainty line;
- `breakRequested`, `PostBreakMode`, single `lastUseAt`, and per-field provenance;
- inverse 30-day validation;
- elapsed withdrawal and interruption restart mechanics;
- outside-range/mixed previous-history behaviour;
- tolerance-v3 multi-factor bounded exposure classification and the in-range history target override;
- active reduction tracking (`reduction-records-v2`) with the derived two-breach-day review rule; the tracker never generates or rewrites a calculation record;
- the result presentation boundary: one body with static reviewed research copy (`ui/research-context.tsx`, `ui/research-copy.ts`) and no personalised recovery window — the retired `tolerance-recovery-outlook-v1` / `-v2` markers are kept only to validate and honestly explain stored records; post-break outcome capture (`break-outcome-marks-v1`, offered once per completed break after a real return to THC, never for continued abstinence);
- strict v1 input minimisation;
- qualitative-only detection;
- minimal local-only architecture; and
- Vite + Preact PWA shell with Web Storage for the transient draft.

### Release review boundaries

Release checks cover source-grounded uncertainty, the nonmedical disclaimer, local privacy/deletion, dependency advisories, keyboard/modal behavior, responsive layouts, persistence and the production build. The app provides no jurisdiction-specific legal guidance. Clinical validation and formal medical-device or jurisdictional certification are not claimed. See HANDOFF.md for the current verification scope.

### Safely deferred

- numeric detection and its rule infrastructure;
- Ireland jurisdiction rules;
- telemetry, cloud sync, formal evidence registry, and confidence recalibration.
