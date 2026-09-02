// Daily check-in validation and safe decode (UX_SPEC 10.2 / 15.2 D5).
//
// The five symptom fields are integer 0..10 or `null` for an untouched
// slider — never prefilled and never silently stored as 0. `usedThc = true`
// records a use that has been confirmed, so a persisted use-day check-in
// always carries `usedAt`; `usedThc = false` never does. The optional note is
// capped at 500 characters and is never parsed.

import type { DailyCheckin } from '../schemas/profile.ts';
import { FIELD_PROVENANCES, type FieldProvenance } from '../schemas/enums.ts';
import { parseSubmittedTimestamp } from '../schemas/time.ts';

export const CHECKIN_SYMPTOM_FIELDS = ['craving', 'sleep', 'irritability', 'anxiety', 'appetite'] as const;
export type CheckinSymptomField = (typeof CHECKIN_SYMPTOM_FIELDS)[number];

export const CHECKIN_NOTE_MAX_CHARS = 500;

export type CheckinValidationErrorCode =
  | 'malformed_checkin'
  | 'invalid_recorded_at'
  | 'invalid_used_thc'
  | 'symptom_not_integer_0_to_10'
  | 'used_at_present_without_use'
  | 'used_at_missing_after_use'
  | 'invalid_used_at'
  | 'note_too_long';

export interface CheckinValidationError {
  readonly code: CheckinValidationErrorCode;
  readonly path: string;
  readonly message: string;
}

export type CheckinValidationOutcome =
  | { readonly ok: true; readonly checkin: DailyCheckin }
  | { readonly ok: false; readonly errors: readonly CheckinValidationError[] };

/** Validates a decoded check-in value. Used by the persistence layer so a
 * malformed stored row is dropped rather than trusted. */
export function validateDailyCheckin(value: unknown): CheckinValidationOutcome {
  const errors: CheckinValidationError[] = [];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, errors: [{ code: 'malformed_checkin', path: '', message: 'Expected a check-in object.' }] };
  }
  const body = value as Record<string, unknown>;

  if (typeof body.recordedAt !== 'string' || parseSubmittedTimestamp(body.recordedAt) === null) {
    errors.push({ code: 'invalid_recorded_at', path: 'recordedAt', message: 'recordedAt must be a timestamp.' });
  }
  if (typeof body.usedThc !== 'boolean') {
    errors.push({ code: 'invalid_used_thc', path: 'usedThc', message: 'usedThc must be a boolean.' });
  }

  for (const field of CHECKIN_SYMPTOM_FIELDS) {
    const raw = body[field];
    if (raw !== null && (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > 10)) {
      errors.push({
        code: 'symptom_not_integer_0_to_10',
        path: field,
        message: `${field} must be an integer 0..10 or null.`,
      });
    }
  }

  const usedThc = body.usedThc === true;
  const usedAt = body.usedAt;
  if (usedThc) {
    if (!isPresentSourcedTimestamp(usedAt)) {
      errors.push({
        code: usedAt === null || usedAt === undefined ? 'used_at_missing_after_use' : 'invalid_used_at',
        path: 'usedAt',
        message: 'A use-day check-in requires a confirmed usedAt.',
      });
    }
  } else if (usedAt !== null && usedAt !== undefined) {
    errors.push({ code: 'used_at_present_without_use', path: 'usedAt', message: 'usedAt is only stored after a use.' });
  }

  if (body.note !== null && body.note !== undefined && typeof body.note !== 'string') {
    errors.push({ code: 'note_too_long', path: 'note', message: 'Note must be a string or null.' });
  } else if (
    typeof body.note === 'string' &&
    [...body.note].length > CHECKIN_NOTE_MAX_CHARS
  ) {
    errors.push({
      code: 'note_too_long',
      path: 'note',
      message: `Note must be at most ${CHECKIN_NOTE_MAX_CHARS} characters.`,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, checkin: body as unknown as DailyCheckin };
}

/** True when a symptom field holds a real rating (never a stored zero for an
 * untouched slider — untouched values stay null). */
export function isTouchedSymptom(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10;
}

function isPresentSourcedTimestamp(value: unknown): value is { value: string; provenance: FieldProvenance } {
  if (typeof value !== 'object' || value === null) return false;
  const wrapper = value as { value?: unknown; provenance?: unknown };
  if (typeof wrapper.value !== 'string' || parseSubmittedTimestamp(wrapper.value) === null) return false;
  return (
    typeof wrapper.provenance === 'string' &&
    FIELD_PROVENANCES.includes(wrapper.provenance as FieldProvenance) &&
    wrapper.provenance !== 'missing'
  );
}
