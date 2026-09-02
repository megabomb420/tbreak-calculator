// SourcedValue<T>: per-field provenance wrapper (CALCULATOR_SPEC section 4.2).
//
// Invariants enforced at validation time:
// - value = null requires provenance = "missing";
// - a non-null value cannot use provenance = "missing";
// - provenance = "derived" requires a non-empty derivedFrom source list, and
//   derivedFrom is only present for derived values.

import type { FieldProvenance } from './enums.ts';

export interface SourcedValue<T> {
  readonly value: T | null;
  readonly provenance: FieldProvenance;
  readonly derivedFrom?: readonly string[];
}

/** Constructs the canonical representation of an absent field value. */
export function missingValue<T>(): SourcedValue<T> {
  return { value: null, provenance: 'missing' };
}

export type SourcedValueInvariantErrorCode =
  | 'value_present_with_missing_provenance'
  | 'null_value_with_non_missing_provenance'
  | 'derived_provenance_without_source_fields'
  | 'source_fields_without_derived_provenance';

/**
 * Pure invariant check for a single SourcedValue. Returns the violated
 * invariant code or null when the wrapper is internally consistent.
 */
export function sourcedValueInvariantError(sourced: SourcedValue<unknown>): SourcedValueInvariantErrorCode | null {
  const { value, provenance, derivedFrom } = sourced;
  if (value === null && provenance !== 'missing') return 'null_value_with_non_missing_provenance';
  if (value !== null && provenance === 'missing') return 'value_present_with_missing_provenance';
  if (provenance === 'derived' && (derivedFrom === undefined || derivedFrom.length === 0)) {
    return 'derived_provenance_without_source_fields';
  }
  if (provenance !== 'derived' && derivedFrom !== undefined && derivedFrom.length > 0) {
    return 'source_fields_without_derived_provenance';
  }
  return null;
}
