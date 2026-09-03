// Immutable calculation records (ARCHITECTURE §9, UX_SPEC §16 step 5).
//
// A calculation is frozen at the moment it is produced. History renders the
// stored engine output and never re-runs the Tolerance/Detection engines
// against a later policy or clock. An explicit recalculation creates a new
// record and leaves this one untouched.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import type { DetectionResult, ToleranceResult } from '../../domain/schemas/result.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import { DETECTION_POLICY_VERSION } from '../../domain/policies/detection-copy-policy-v1.ts';
import {
  TOLERANCE_POLICY_VERSION,
  TOLERANCE_POLICY_V3,
} from '../../domain/policies/tolerance-policy-v3.ts';
import { PROFILE_SCHEMA_VERSION } from '../../domain/schemas/profile.ts';
import { explainDetection } from '../../domain/detection/detection-engine.ts';
import { DETECTION_COPY_POLICY_V1 } from '../../domain/policies/detection-copy-policy-v1.ts';
import { calculateTolerance } from '../../domain/tolerance/tolerance-engine.ts';
import { computeWithdrawalDisplay } from '../../domain/tolerance/withdrawal.ts';
import { parseSubmittedTimestamp } from '../../domain/schemas/time.ts';
import type { RawAnswerSnapshot } from '../questionnaire/snapshot.ts';
import type { PreviousBreakInput } from '../../domain/schemas/profile.ts';
import {
  toPreviousBreakInput,
  type StoredPreviousBreak,
} from './previous-break-store.ts';
import { isInstantNumber, isRecord } from '../progress/record-codec.ts';
import {
  RECOVERY_OUTLOOK_VERSION,
  RECOVERY_OUTLOOK_V1_VERSION,
  type RecoveryOutlookVersion,
} from '../../domain/recovery/recovery-outlook.ts';

export const CALCULATION_RECORDS_SCHEMA_VERSION = 'calculation-records-v1' as const;
export const CALCULATION_RECORDS_KEY = 'tbreak.calculations.v1';
export const CALCULATION_RECORD_VERSION = 'calculation-record-v1' as const;

export type FrozenEngineResult =
  | { readonly type: 'tolerance'; readonly value: ToleranceResult }
  | { readonly type: 'detection'; readonly value: DetectionResult };

export interface CalculationRecord {
  readonly id: string;
  readonly schemaVersion: typeof CALCULATION_RECORD_VERSION;
  readonly calculatedAt: Instant;
  readonly inputSchemaVersion: string;
  readonly policyVersion: string;
  /** Absent on pre-0.9.2 records, which retain recovery-outlook-v1 semantics. */
  readonly recoveryOutlookVersion?: RecoveryOutlookVersion;
  readonly snapshot: RawAnswerSnapshot;
  readonly result: FrozenEngineResult;
}

export interface CalculationRecordsEnvelope {
  readonly schemaVersion: typeof CALCULATION_RECORDS_SCHEMA_VERSION;
  /** Newest first. */
  readonly records: readonly CalculationRecord[];
  /** Rows that failed decode; listed as Unavailable in History. */
  readonly corrupt: readonly CorruptCalculationRow[];
}

export interface CorruptCalculationRow {
  readonly id: string;
  readonly reason: string;
}

export interface CalculationRecordsStore {
  readonly load: () => CalculationRecordsEnvelope;
  readonly save: (record: CalculationRecordsEnvelope) => void;
  readonly clear: () => void;
}

export function emptyCalculationRecords(): CalculationRecordsEnvelope {
  return { schemaVersion: CALCULATION_RECORDS_SCHEMA_VERSION, records: [], corrupt: [] };
}

export function createCalculationRecordsStore(
  adapter: StorageAdapter,
  key: string = CALCULATION_RECORDS_KEY,
): CalculationRecordsStore {
  return {
    load: () => readEnvelope(adapter, key),
    save: (record) => writeEnvelope(adapter, key, record),
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

function readEnvelope(adapter: StorageAdapter, key: string): CalculationRecordsEnvelope {
  const raw = adapter.getItem(key);
  if (raw === null) return emptyCalculationRecords();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      schemaVersion: CALCULATION_RECORDS_SCHEMA_VERSION,
      records: [],
      corrupt: [{ id: 'envelope', reason: 'unreadable' }],
    };
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== CALCULATION_RECORDS_SCHEMA_VERSION || !Array.isArray(parsed.records)) {
    return {
      schemaVersion: CALCULATION_RECORDS_SCHEMA_VERSION,
      records: [],
      corrupt: [{ id: 'envelope', reason: 'unreadable' }],
    };
  }
  const records: CalculationRecord[] = [];
  const corrupt: CorruptCalculationRow[] = [];
  parsed.records.forEach((row, index) => {
    if (isValidCalculationRecord(row)) {
      records.push(row);
      return;
    }
    const id = isRecord(row) && typeof row.id === 'string' && row.id !== '' ? row.id : `corrupt-${index}`;
    corrupt.push({ id, reason: 'invalid-record' });
  });
  const extraCorrupt = Array.isArray(parsed.corrupt)
    ? parsed.corrupt.filter(isCorruptRow)
    : [];
  return { schemaVersion: CALCULATION_RECORDS_SCHEMA_VERSION, records, corrupt: [...corrupt, ...extraCorrupt] };
}

function writeEnvelope(adapter: StorageAdapter, key: string, envelope: CalculationRecordsEnvelope): void {
  if (envelope.schemaVersion !== CALCULATION_RECORDS_SCHEMA_VERSION) {
    throw new RangeError('invalid calculation records envelope');
  }
  if (!envelope.records.every(isValidCalculationRecord)) {
    throw new RangeError('invalid calculation record in envelope');
  }
  adapter.setItem(key, JSON.stringify(envelope));
}

function isCorruptRow(value: unknown): value is CorruptCalculationRow {
  return isRecord(value) && typeof value.id === 'string' && value.id !== '' && typeof value.reason === 'string';
}

export function isValidCalculationRecord(value: unknown): value is CalculationRecord {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== CALCULATION_RECORD_VERSION) return false;
  if (typeof value.id !== 'string' || value.id === '') return false;
  if (!isInstantNumber(value.calculatedAt)) return false;
  if (typeof value.inputSchemaVersion !== 'string' || value.inputSchemaVersion === '') return false;
  if (typeof value.policyVersion !== 'string' || value.policyVersion === '') return false;
  if (
    value.recoveryOutlookVersion !== undefined &&
    value.recoveryOutlookVersion !== RECOVERY_OUTLOOK_V1_VERSION &&
    value.recoveryOutlookVersion !== RECOVERY_OUTLOOK_VERSION
  ) return false;
  if (!isValidSnapshot(value.snapshot)) return false;
  return isValidFrozenResult(value.result);
}

function isValidSnapshot(value: unknown): value is RawAnswerSnapshot {
  if (!isRecord(value)) return false;
  if (value.kind === 'detection') {
    return isRecord(value.request) && typeof value.request.matrix === 'string' && typeof value.request.context === 'string';
  }
  if (value.kind !== 'use_profile') return false;
  return isRecord(value.profile) && typeof value.profile.goal === 'string';
}

function isValidFrozenResult(value: unknown): value is FrozenEngineResult {
  if (!isRecord(value) || (value.type !== 'tolerance' && value.type !== 'detection')) return false;
  if (!isRecord(value.value)) return false;
  if (value.type === 'tolerance') {
    const kind = value.value.kind;
    return (
      kind === 'tolerance_result' ||
      kind === 'planning_only' ||
      kind === 'not_applicable' ||
      kind === 'validation_error'
    );
  }
  return value.value.kind === 'qualitative_only' || value.value.kind === 'validation_error';
}

/** Merge previous-break personalisation into a snapshot copy. Does not mutate. */
export function withPreviousBreaks(
  snapshot: RawAnswerSnapshot,
  previousBreaks: readonly PreviousBreakInput[],
): RawAnswerSnapshot {
  if (snapshot.kind !== 'use_profile') return snapshot;
  return { kind: 'use_profile', profile: { ...snapshot.profile, previousBreaks: [...previousBreaks] } };
}

/**
 * Freeze the deterministic engine output for a snapshot at `calculatedAt`.
 * Uses the current v1 policies — callers must only do this for a *new*
 * calculation or to materialize a v0.3.x snapshot that never stored a result.
 * Historical records are never passed through this function again.
 */
export function freezeCalculation(
  id: string,
  snapshot: RawAnswerSnapshot,
  calculatedAt: Instant,
): CalculationRecord {
  if (snapshot.kind === 'detection') {
    const value = explainDetection(snapshot.request, DETECTION_COPY_POLICY_V1);
    return {
      id,
      schemaVersion: CALCULATION_RECORD_VERSION,
      calculatedAt,
      inputSchemaVersion: 'detection-request-v1',
      policyVersion: DETECTION_POLICY_VERSION,
      snapshot,
      result: { type: 'detection', value },
    };
  }
  let value = calculateTolerance(snapshot.profile, TOLERANCE_POLICY_V3, calculatedAt);
  if (value.kind === 'not_applicable' && value.withdrawal === null) {
    const lastUse = snapshot.profile.lastUseAt.value;
    const instant = lastUse === null ? null : parseSubmittedTimestamp(lastUse);
    if (instant !== null) {
      value = {
        ...value,
        withdrawal: computeWithdrawalDisplay(instant, calculatedAt, TOLERANCE_POLICY_V3.withdrawalAnchors),
      };
    }
  }
  return {
    id,
    schemaVersion: CALCULATION_RECORD_VERSION,
    calculatedAt,
    inputSchemaVersion: PROFILE_SCHEMA_VERSION,
    policyVersion: TOLERANCE_POLICY_VERSION,
    recoveryOutlookVersion: RECOVERY_OUTLOOK_VERSION,
    snapshot,
    result: { type: 'tolerance', value },
  };
}

/** Freeze a new calculation, merging current previous-break records into the
 * snapshot copy. Historical records are never passed through this helper. */
export function recordNewCalculation(
  put: (record: CalculationRecord) => void,
  id: string,
  snapshot: RawAnswerSnapshot,
  calculatedAt: Instant,
  previousBreaks: readonly StoredPreviousBreak[],
): CalculationRecord {
  const merged = withPreviousBreaks(snapshot, previousBreaks.map(toPreviousBreakInput));
  const frozen = freezeCalculation(id, merged, calculatedAt);
  put(frozen);
  return frozen;
}
