// Pure nominal flower THC calculator (CALCULATOR_SPEC section 6).
//
// Deterministic: equal input and policy produce structurally equal results.
// For flower only, when both supported inputs are present:
//
//   nominal_thc_mg = flower_grams * 1000 * (thc_potency_percent / 100)
//
// The result is THC contained in plant material. It is labelled nominal_thc
// and is never represented as an absorbed, delivered or bioavailable dose.
// V1 infers no inhalation efficiency, bioavailability, puff size, combustion
// loss, route equivalence or absorbed exposure from this value.

import type { FieldProvenance } from '../schemas/enums.ts';
import { FIELD_PROVENANCES } from '../schemas/enums.ts';
import type { NominalFlowerInput } from '../schemas/profile.ts';
import type { NominalThcPolicyV1 } from '../policies/nominal-thc-policy-v1.ts';
import type { NominalThcResult } from '../schemas/result.ts';
import { sourcedValueInvariantError, type SourcedValue, type SourcedValueInvariantErrorCode } from '../schemas/sourced-value.ts';

export type NominalThcValidationErrorCode =
  | 'malformed_sourced_value'
  | 'invalid_provenance_value'
  | 'invalid_provenance_for_field'
  | SourcedValueInvariantErrorCode
  | 'flower_grams_required'
  | 'flower_grams_must_be_positive_number'
  | 'potency_percent_required'
  | 'potency_percent_out_of_range';

/** Provenance accepted on nominal flower inputs (user-supplied or from a label). */
const NOMINAL_FIELD_PROVENANCES: readonly FieldProvenance[] = ['missing', 'user_estimate', 'label_derived'];

const MESSAGES: Record<NominalThcValidationErrorCode, string> = {
  malformed_sourced_value: 'Expected a SourcedValue with value and provenance fields.',
  invalid_provenance_value: 'Provenance must be one of: missing, user_estimate, label_derived, laboratory_derived, derived.',
  invalid_provenance_for_field: 'Only missing, user_estimate or label_derived provenance is accepted for nominal flower inputs.',
  value_present_with_missing_provenance: 'A non-null value cannot use missing provenance.',
  null_value_with_non_missing_provenance: 'A null value requires missing provenance.',
  derived_provenance_without_source_fields: 'Derived provenance requires a non-empty derivedFrom source list.',
  source_fields_without_derived_provenance: 'derivedFrom is only allowed with derived provenance.',
  flower_grams_required: 'flowerGrams is required for the nominal flower calculation.',
  flower_grams_must_be_positive_number: 'flowerGrams must be a positive number.',
  potency_percent_required: 'thcPotencyPercent is required for the nominal flower calculation.',
  potency_percent_out_of_range: 'thcPotencyPercent must be a number greater than 0 and at most 100.',
};

export interface NominalThcValidationError {
  readonly code: NominalThcValidationErrorCode;
  readonly path: string;
  readonly message: string;
}

export type NominalThcValidationOutcome =
  | { readonly ok: true; readonly flowerGrams: number; readonly thcPotencyPercent: number }
  | { readonly ok: false; readonly errors: readonly NominalThcValidationError[] };

interface NominalFieldRead {
  readonly clean: boolean;
  readonly present: boolean;
}

function error(code: NominalThcValidationErrorCode, path: string): NominalThcValidationError {
  return { code, path, message: MESSAGES[code] };
}

function readNominalField(
  errors: NominalThcValidationError[],
  path: string,
  raw: unknown,
): NominalFieldRead {
  if (typeof raw !== 'object' || raw === null || !('value' in raw) || !('provenance' in raw)) {
    errors.push(error('malformed_sourced_value', path));
    return { clean: false, present: false };
  }
  const value = (raw as { value: unknown }).value;
  const provenance = (raw as { provenance: unknown }).provenance;
  if (typeof provenance !== 'string' || !(FIELD_PROVENANCES as readonly unknown[]).includes(provenance)) {
    errors.push(error('invalid_provenance_value', path));
    return { clean: false, present: false };
  }
  if (!NOMINAL_FIELD_PROVENANCES.includes(provenance as FieldProvenance)) {
    errors.push(error('invalid_provenance_for_field', path));
    return { clean: false, present: false };
  }
  const invariant = sourcedValueInvariantError(raw as SourcedValue<unknown>);
  if (invariant !== null) {
    errors.push(error(invariant, path));
    return { clean: false, present: false };
  }
  return { clean: true, present: value !== null };
}

/** Validates the nominal flower inputs against schema/provenance rules and
 * the spec ranges: grams > 0, potency in (0, 100]. */
export function validateNominalFlowerInput(input: NominalFlowerInput): NominalThcValidationOutcome {
  const errors: NominalThcValidationError[] = [];

  const gramsField = readNominalField(errors, 'flowerGrams', input.flowerGrams);
  let flowerGrams: number | null = null;
  if (gramsField.clean && gramsField.present) {
    const value = input.flowerGrams.value;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      errors.push(error('flower_grams_must_be_positive_number', 'flowerGrams'));
    } else {
      flowerGrams = value;
    }
  } else if (gramsField.clean) {
    errors.push(error('flower_grams_required', 'flowerGrams'));
  }

  const potencyField = readNominalField(errors, 'thcPotencyPercent', input.thcPotencyPercent);
  let thcPotencyPercent: number | null = null;
  if (potencyField.clean && potencyField.present) {
    const value = input.thcPotencyPercent.value;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 100) {
      errors.push(error('potency_percent_out_of_range', 'thcPotencyPercent'));
    } else {
      thcPotencyPercent = value;
    }
  } else if (potencyField.clean) {
    errors.push(error('potency_percent_required', 'thcPotencyPercent'));
  }

  if (errors.length > 0) {
    const sorted = [...errors].sort((a, b) => {
      if (a.path !== b.path) return a.path < b.path ? -1 : 1;
      return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
    });
    return { ok: false, errors: sorted };
  }

  return { ok: true, flowerGrams: flowerGrams!, thcPotencyPercent: thcPotencyPercent! };
}

/** Calculates nominal THC content for flower, or returns a validation_error
 * result when either supported input is missing or invalid. */
export function calculateNominalFlowerThc(
  input: NominalFlowerInput,
  policy: NominalThcPolicyV1,
): NominalThcResult {
  const outcome = validateNominalFlowerInput(input);
  if (!outcome.ok) {
    return { kind: 'validation_error', label: null, nominalThcMg: null, policyVersion: policy.id };
  }
  const nominalThcMg =
    outcome.flowerGrams * policy.milligramsPerGram * (outcome.thcPotencyPercent / policy.percentToFractionDivisor);
  return { kind: 'nominal_thc', label: policy.label, nominalThcMg, policyVersion: policy.id };
}
