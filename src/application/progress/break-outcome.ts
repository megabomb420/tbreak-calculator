// Post-break outcome capture markers (0.9.0).
//
// After a finite break completes and the user has actually returned to THC,
// the app may offer ONE lightweight 0-10 subjective tolerance-reduction score
// per completed break. The score itself is stored on the linked
// PreviousBreak (sourceAttemptId); this envelope only records whether the
// prompt was answered or explicitly skipped so the app never nags repeatedly.

import type { Instant } from '../../domain/schemas/time.ts';
import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import { isInstantNumber, isRecord } from './record-codec.ts';

export const BREAK_OUTCOME_SCHEMA_VERSION = 'break-outcome-marks-v1' as const;
export const BREAK_OUTCOME_KEY = 'tbreak.break-outcome-marks.v1';

export type OutcomeMarkStatus = 'captured' | 'skipped';

export interface OutcomeMark {
  readonly attemptId: string;
  readonly status: OutcomeMarkStatus;
  readonly updatedAt: Instant;
}

export interface BreakOutcomeEnvelope {
  readonly schemaVersion: typeof BREAK_OUTCOME_SCHEMA_VERSION;
  /** Newest first. */
  readonly marks: readonly OutcomeMark[];
}

export interface BreakOutcomeStore {
  readonly load: () => BreakOutcomeEnvelope;
  readonly save: (envelope: BreakOutcomeEnvelope) => void;
  readonly clear: () => void;
}

export function emptyBreakOutcomeEnvelope(): BreakOutcomeEnvelope {
  return { schemaVersion: BREAK_OUTCOME_SCHEMA_VERSION, marks: [] };
}

export function createBreakOutcomeStore(
  adapter: StorageAdapter,
  key: string = BREAK_OUTCOME_KEY,
): BreakOutcomeStore {
  return {
    load: () => readEnvelope(adapter, key),
    save: (record) => writeEnvelope(adapter, key, record),
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

function readEnvelope(adapter: StorageAdapter, key: string): BreakOutcomeEnvelope {
  const raw = adapter.getItem(key);
  if (raw === null) return emptyBreakOutcomeEnvelope();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyBreakOutcomeEnvelope();
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== BREAK_OUTCOME_SCHEMA_VERSION || !Array.isArray(parsed.marks)) {
    return emptyBreakOutcomeEnvelope();
  }
  const seen = new Set<string>();
  const marks: OutcomeMark[] = [];
  for (const row of parsed.marks) {
    if (!isValidOutcomeMark(row)) continue;
    if (seen.has(row.attemptId)) continue;
    seen.add(row.attemptId);
    marks.push(row);
  }
  return { schemaVersion: BREAK_OUTCOME_SCHEMA_VERSION, marks };
}

function writeEnvelope(adapter: StorageAdapter, key: string, envelope: BreakOutcomeEnvelope): void {
  if (envelope.schemaVersion !== BREAK_OUTCOME_SCHEMA_VERSION) {
    throw new RangeError('invalid break-outcome envelope');
  }
  if (!envelope.marks.every(isValidOutcomeMark)) {
    throw new RangeError('invalid outcome mark in envelope');
  }
  adapter.setItem(key, JSON.stringify(envelope));
}

export function isValidOutcomeMark(value: unknown): value is OutcomeMark {
  if (!isRecord(value)) return false;
  return (
    typeof value.attemptId === 'string' &&
    value.attemptId !== '' &&
    (value.status === 'captured' || value.status === 'skipped') &&
    isInstantNumber(value.updatedAt)
  );
}
