# T-Break Application Architecture

Status: minimal deterministic v1 architecture  
Version: 0.2.0  
Authoritative source: `sources/TBREAK_PROJECT_CONTEXT.md`, version 2026-09-02  
Companion specification: `CALCULATOR_SPEC.md`

## 1. Architecture objective

Build a mobile-first, local-first PWA whose useful v1 behaviour is deterministic and offline-capable. The architecture prevents UI, persistence, or future AI code from inventing scientific outputs.

```text
branching questionnaire
  -> validation and normalisation
  -> deterministic Tolerance Engine and/or qualitative Detection Engine
  -> immutable structured result
  -> deterministic result and plan views
  -> local persistence
```

Runtime AI, numeric detection rules, jurisdiction packs, telemetry, and export/import are not v1 components.

## 2. V1 component boundary

### Build in v1

- shared schemas, provenance, validation, and normalisation;
- versioned static tolerance policy and pure Tolerance Engine;
- versioned static qualitative detection policy and pure Detection Engine;
- nominal flower THC calculator;
- branching questionnaire;
- deterministic result, withdrawal, break-plan, check-in, history, and post-break views;
- IndexedDB persistence and complete local deletion; and
- PWA shell/offline support.

### Defer beyond v1

- quantitative Detection Packs and pack-loader/plugin machinery;
- cutoff, analyte, laboratory, device, or jurisdiction schemas;
- Ireland-specific rules;
- runtime DeepSeek integration;
- telemetry;
- export/import and cloud sync; and
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
Static versioned policies
  tolerance-policy-v1 | detection-copy-policy-v1

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
  application/
    progress/
    settings/
    shell/
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

There is no v1 `deepseek`, `telemetry`, `import-export`, `evidence-registry`, or detection-pack directory.

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

The tolerance policy contains only:

- the accepted 30-day use-frequency boundaries;
- the single frequent-use intensity rule;
- preferred-target selection;
- uniform v1 confidence values and uncertainty code;
- withdrawal anchors;
- history-inference predicates; and
- driver/limitation message codes.

Every non-source threshold is labelled `product_heuristic`. A policy change creates a new version and new golden fixtures. Historical records retain the version used.

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
  |     -> use days -> authoritative last use
  |        (sessions, products and routes only when use days are 16-30)
  |
  |-- reduction
  |     -> explicit breakRequested
  |     -> if true: tolerance path (identical to tolerance reset)
  |     -> if false: use days -> reduction planning, no last use collected
  |
  |-- abstinence
  |     -> authoritative last use only (no use days, sessions, products
  |        or routes; none of them change the abstinence output)
  |     -> withdrawal/abstinence planning
  |     -> postBreakMode fixed to continue_abstinence
  |
  |-- detection information
        -> matrix -> general/workplace/roadside context
        -> qualitative result only
```

The single `UseProfile.lastUseAt` feeds tolerance, withdrawal, and active break timing. Detection v1 does not need it because it emits no numeric elapsed-time interpretation; if the screen shows elapsed time for general orientation, it references the same profile field and does not copy it into `DetectionRequest`.

V1 MUST NOT ask for cutoff, lab baseline, creatinine, device, planned test date, jurisdiction, employer identity, pattern duration, health, medication, age, sex, BMI, hydration, exercise, or perceived metabolism.

Flower grams and potency appear only when the user opens the nominal THC calculator. Check-in notes remain optional, local, unparsed, and user-visible.

## 7. Calculation orchestration

The coordinator performs these steps:

1. capture the raw branch answers and explicit calculation timestamp;
2. validate field provenance, cross-field consistency, and both directions of the 30-day rule;
3. normalise timestamps and domain values;
4. call only the engine required by the explicit goal and `breakRequested` value;
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

## 9. Local persistence

Use IndexedDB behind repository interfaces for durable records (profiles,
calculations, break attempts, check-ins, previous breaks, post-break plans,
settings). The v1 **transient questionnaire draft** is a single versioned JSON
string and is stored through the Web Storage-shaped `StorageAdapter`
(`localStorage` in the browser, in-memory in tests). IndexedDB is not used for
that draft.

Minimal logical stores (IndexedDB, later slice) are:

```text
profiles
calculationRecords
breakAttempts
checkins
previousBreaks
postBreakPlans
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

Schema migrations are forward-only, tested, and non-destructive. A failed migration must leave the existing database recoverable.

## 10. UI contracts

### 10.1 Tolerance result

The primary card renders the range and target from `ToleranceResult`, followed by drivers and one uncertainty sentence. It does not display two confidence badges in v1 even though the structured fields remain separate.

Example shape:

```text
Recommended T-Break: 21–28 days
Strong planning target: 28 days
Limited certainty: this is a broad product heuristic, and individual response varies.
Why: frequent use + multiple sessions/high-potency concentrate route
```

The card MUST NOT say reset complete, 100% reset, detoxed, or safe to resume the previous exposure.

### 10.2 Withdrawal and progress

The timeline renders engine-supplied `upcoming/current/past` states and `breakDay`. Progress measures plan time and completed check-ins only. It never depicts receptor recovery or detox percentage.

### 10.3 Detection result

Every v1 detection card is explicitly qualitative. It shows matrix-specific principles and uncertainty, not a likely X–Y range, confidence badge, pass/fail label, or clean date. Workplace context adds that cutoff/policy details are unknown; roadside context adds the verified-jurisdiction-rules warning. Context is collected only because it changes this copy.

### 10.4 Post-break plan

Post-break modes remain user-chosen and qualitative. The system records limits the user chooses; it does not calculate a safe dose or hidden repeated-exceedance threshold. Abstinence users do not see return-to-use planning unless they change goal.

## 11. Offline, privacy, and failure behaviour

The PWA shell, static policies, message templates, and local flows are available offline after installation.

V1 makes no scientific network request and includes no AI or remote telemetry. Failure behaviour:

- invalid input -> field-level correction, no result;
- invalid core result -> safe calculation error, no range;
- invalid optional history block -> omit only that block;
- storage unavailable -> allow an in-memory calculation and clearly state it cannot be saved;
- corrupt record -> isolate it without deleting unrelated history; and
- timezone change -> preserve UTC instants and update display formatting only.

Before public release, security/privacy review must cover content security policy, dependency/network allow-list, local deletion, logs without notes/use histories, storage claims, and service-worker update behaviour.

## 12. Future DeepSeek boundary

DeepSeek V4 Flash Thinking remains the preferred future optional interpretation layer from the source context, with standard/medium reasoning as the default. It is not a v1 dependency and its eventual `modelId` is configurable.

Before runtime AI is enabled, a separate design and legal/privacy review must approve:

- explicit consent and data minimisation;
- provider retention and transfer terms;
- a stateless credential proxy where required;
- a response schema with no scientific numeric output fields;
- deterministic fact references for ranges and anchors;
- literal-number allow-listing from enumerated structured fields only, never free text; and
- complete deterministic fallback.

AI output is interpretation only and can never be promoted into a policy or overwrite a deterministic result.

## 13. Testing strategy

### Unit and boundary tests

Test schema/provenance validation, inverse 30-day consistency, goal routing, every tolerance boundary, the one frequency/intensity override, uniform confidence, nominal THC math, history predicates, elapsed withdrawal status, and interruption mechanics.

### Golden domain fixtures

Fixtures freeze input, `calculatedAt`, schema version, and policy version. Compare structural domain values rather than byte serialization. Any scientific or product-rule change requires a new policy version and reviewed fixture changes.

### Invariant tests

Generate profiles to prove that prohibited inputs cannot affect ranges, tolerance and detection remain separate, targets stay inside ranges, qualitative detection emits no numbers, hair emits no clear date, and no output contains fake percentages or guarantees.

### Persistence, offline, and accessibility tests

Test migrations, local deletion, unavailable storage, offline calculation, policy-version history preservation, keyboard/screen-reader flow, color contrast, touch targets, narrow viewports, reduced motion, and error recovery. Uncertainty must not rely on color alone.

AI contract tests, pack conflict tests, controlled device vocabularies, telemetry tests, and import/export tests are added only when those deferred features enter scope.

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
- strict v1 input minimisation;
- qualitative-only detection;
- minimal local-only architecture; and
- Vite + Preact PWA shell with Web Storage for the transient draft.

### Blocks public release, not domain implementation

- reviewed safety/escalation and dependency-support content;
- legal/medical disclaimer and launch-jurisdiction review;
- local privacy/security review; and
- completed accessibility/offline verification.

### Safely deferred

- numeric detection and its rule infrastructure;
- Ireland jurisdiction rules;
- runtime DeepSeek and its legal/privacy approval;
- telemetry, export/import, cloud sync, formal evidence registry, and confidence recalibration.
