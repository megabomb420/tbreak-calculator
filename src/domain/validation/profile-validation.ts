// Input validation and normalisation for the core use profile
// (CALCULATOR_SPEC section 5 and section 4.2 provenance rules).
//
// Validation happens before calculation. The function is pure: it takes an
// explicit reference time (`calculationTime`) and never reads a clock. It
// returns the canonical validated profile or a sorted, deterministic list of
// field-level validation errors.

import {
  CURRENT_PATTERN_DURATION_BANDS,
  FIELD_PROVENANCES,
  GOALS,
  POST_BREAK_MODES,
  PRODUCT_KIND_ORDER,
  PRODUCT_KINDS,
  ROUTE_ORDER,
  ROUTES,
  type CurrentPatternDurationBand,
  type FieldProvenance,
  type Goal,
  type ProductKind,
  type Route,
} from '../schemas/enums.ts';
import type { PreviousBreakInput, UseProfileInput, ValidatedPreviousBreak, ValidatedUseProfile } from '../schemas/profile.ts';
import { missingValue, sourcedValueInvariantError, type SourcedValue } from '../schemas/sourced-value.ts';
import { parseSubmittedTimestamp, THIRTY_DAY_WINDOW_MS, toInstant, type Instant } from '../schemas/time.ts';

// Goals whose questionnaire collects THC-use days and whose tolerance path
// requires them. Abstinence deliberately collects no use days (UX_SPEC D2);
// detection information collects no use profile at all.
export const GOALS_REQUIRING_USE_DAYS: readonly Goal[] = ['tolerance_reset', 'reduction'];

/** Provenance values accepted on v1 core profile fields. */
const CORE_FIELD_PROVENANCES: readonly FieldProvenance[] = ['missing', 'user_estimate'];

export type ValidationErrorCode =
  | 'malformed_sourced_value'
  | 'invalid_provenance_value'
  | 'invalid_provenance_for_field'
  | 'value_present_with_missing_provenance'
  | 'null_value_with_non_missing_provenance'
  | 'derived_provenance_without_source_fields'
  | 'source_fields_without_derived_provenance'
  | 'invalid_goal'
  | 'invalid_break_requested'
  | 'invalid_post_break_mode'
  | 'thc_use_days_required'
  | 'thc_use_days_must_be_integer_0_to_30'
  | 'sessions_required'
  | 'sessions_must_be_positive_number'
  | 'sessions_forbidden_when_zero_use_days'
  | 'products_required'
  | 'routes_required'
  | 'invalid_product'
  | 'invalid_route'
  | 'invalid_timestamp'
  | 'last_use_required_when_use_days_positive'
  | 'last_use_required_for_abstinence'
  | 'last_use_in_future'
  | 'last_use_must_be_within_30_days_when_use_days_positive'
  | 'last_use_must_not_be_within_30_days_when_zero_use_days'
  | 'tolerance_reset_requires_break_requested_true'
  | 'abstinence_requires_break_requested_false'
  | 'abstinence_requires_post_break_mode_continue_abstinence'
  | 'detection_information_requires_break_requested_false'
  | 'detection_information_requires_no_post_break_mode'
  | 'previous_break_invalid_id'
  | 'previous_break_duration_days_must_be_positive_integer'
  | 'previous_break_score_must_be_integer_0_to_10_or_null'
  | 'previous_break_invalid_ended_at'
  | 'previous_break_invalid_created_at'
  | 'invalid_current_pattern_duration';

const MESSAGES: Record<ValidationErrorCode, string> = {
  malformed_sourced_value: 'Expected a SourcedValue with value and provenance fields.',
  invalid_provenance_value: 'Provenance must be one of: missing, user_estimate, label_derived, laboratory_derived, derived.',
  invalid_provenance_for_field: 'Only missing or user_estimate provenance is accepted for v1 core profile fields.',
  value_present_with_missing_provenance: 'A non-null value cannot use missing provenance.',
  null_value_with_non_missing_provenance: 'A null value requires missing provenance.',
  derived_provenance_without_source_fields: 'Derived provenance requires a non-empty derivedFrom source list.',
  source_fields_without_derived_provenance: 'derivedFrom is only allowed with derived provenance.',
  invalid_goal: 'Goal must be one of: tolerance_reset, reduction, abstinence, detection_information.',
  invalid_break_requested: 'breakRequested must be a boolean.',
  invalid_post_break_mode: 'postBreakMode must be null or one of: continue_abstinence, occasional, reduced_regular_use, undecided.',
  thc_use_days_required: 'THC-use days in the last 30 is required for this goal.',
  thc_use_days_must_be_integer_0_to_30: 'thcUseDaysLast30 must be an integer between 0 and 30.',
  sessions_required: 'sessionsPerUseDay is required when thcUseDaysLast30 is 4 or more and a tolerance range is requested.',
  sessions_must_be_positive_number: 'sessionsPerUseDay must be a positive number.',
  sessions_forbidden_when_zero_use_days: 'sessionsPerUseDay must be missing when thcUseDaysLast30 is 0.',
  products_required: 'At least one product is required when thcUseDaysLast30 is 4 or more and a tolerance range is requested.',
  routes_required: 'At least one route is required when thcUseDaysLast30 is 4 or more and a tolerance range is requested.',
  invalid_product: 'Unknown product kind.',
  invalid_route: 'Unknown route.',
  invalid_timestamp: 'Timestamp must be an ISO-8601 string with an explicit timezone (Z or +HH:MM).',
  last_use_required_when_use_days_positive:
    'lastUseAt is required when thcUseDaysLast30 is positive on a route that consumes it.',
  last_use_required_for_abstinence: 'goal abstinence requires the authoritative lastUseAt.',
  last_use_in_future: 'lastUseAt must not be in the future.',
  last_use_must_be_within_30_days_when_use_days_positive:
    'lastUseAt must be within the last 30 x 24 hours when thcUseDaysLast30 is positive on a route that consumes it.',
  last_use_must_not_be_within_30_days_when_zero_use_days:
    'lastUseAt within the last 30 x 24 hours contradicts thcUseDaysLast30 = 0.',
  tolerance_reset_requires_break_requested_true: 'goal tolerance_reset requires breakRequested = true.',
  abstinence_requires_break_requested_false: 'goal abstinence requires breakRequested = false.',
  abstinence_requires_post_break_mode_continue_abstinence:
    'goal abstinence sets postBreakMode to continue_abstinence; no other mode is valid.',
  detection_information_requires_break_requested_false: 'goal detection_information requires breakRequested = false.',
  detection_information_requires_no_post_break_mode: 'goal detection_information requires postBreakMode to be missing.',
  previous_break_invalid_id: 'Previous break id must be a string.',
  previous_break_duration_days_must_be_positive_integer: 'Previous break durationDays must be an integer >= 1.',
  previous_break_score_must_be_integer_0_to_10_or_null:
    'Previous break toleranceReductionScore must be an integer between 0 and 10, or null.',
  previous_break_invalid_ended_at: 'Previous break endedAt must be null or an ISO-8601 timestamp with timezone.',
  previous_break_invalid_created_at: 'Previous break createdAt must be an ISO-8601 timestamp with timezone.',
  invalid_current_pattern_duration:
    'currentPatternDuration must be missing or one of: under_1_month, 1_to_6_months, 6_to_24_months, 2_to_5_years, 5_plus_years.',
};

export interface ValidationError {
  readonly code: ValidationErrorCode;
  readonly path: string;
  readonly message: string;
}

export type ValidationOutcome =
  | { readonly ok: true; readonly profile: ValidatedUseProfile }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

function error(code: ValidationErrorCode, path: string): ValidationError {
  return { code, path, message: MESSAGES[code] };
}

interface SourcedFieldRead {
  /** True when the wrapper is well-formed and provenance is valid for a core field. */
  readonly clean: boolean;
  /** True when a non-null value is present. */
  readonly present: boolean;
}

/** Shape, provenance-membership, allowed-provenance and invariant checks for a
 * core SourcedValue field. Emits at most one error per field and returns
 * clean = false after the first violation so downstream value checks do not
 * run against inconsistent input. */
function readCoreSourcedField(errors: ValidationError[], path: string, raw: unknown): SourcedFieldRead {
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
  if (!CORE_FIELD_PROVENANCES.includes(provenance as FieldProvenance)) {
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

/** Deduplicates `items`, retaining only known members, in canonical order. */
function canonicalOrder<T extends string>(items: readonly T[], order: readonly T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const candidate of order) {
    for (const item of items) {
      if (item === candidate && !seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
  }
  return result;
}

export function validateAndNormalizeProfile(
  input: UseProfileInput,
  calculationTime: Instant,
): ValidationOutcome {
  const errors: ValidationError[] = [];

  const goalKnown = GOALS.includes(input.goal);
  if (!goalKnown) {
    errors.push(error('invalid_goal', 'goal'));
  }
  const goal: Goal | undefined = goalKnown ? input.goal : undefined;
  const breakRequestedKnown = typeof input.breakRequested === 'boolean';
  if (!breakRequestedKnown) {
    errors.push(error('invalid_break_requested', 'breakRequested'));
  }
  const postBreakModeKnown =
    input.postBreakMode === null || POST_BREAK_MODES.includes(input.postBreakMode);
  if (!postBreakModeKnown) {
    errors.push(error('invalid_post_break_mode', 'postBreakMode'));
  }

  // Route flags. `rangeRequested` routes run the Tolerance Engine's band
  // selection (which alone reads sessions/products/routes and lastUseAt);
  // `consumesLastUseAt` routes anchor withdrawal/abstinence timing to the
  // authoritative last-use instant. Reduction without a requested break and
  // detection information consume neither intensity fields nor a timestamp
  // (UX_SPEC D1/D2/D3).
  const breakRequestedTrue = breakRequestedKnown && input.breakRequested === true;
  const rangeRequested = goal === 'tolerance_reset' || (goal === 'reduction' && breakRequestedTrue);
  const consumesLastUseAt = rangeRequested || goal === 'abstinence';

  // --- thcUseDaysLast30 ----------------------------------------------------
  const useDaysField = readCoreSourcedField(errors, 'thcUseDaysLast30', input.thcUseDaysLast30);
  let useDays: number | null = null; // set only when present and valid
  if (useDaysField.clean && useDaysField.present) {
    const value = input.thcUseDaysLast30.value;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 30) {
      errors.push(error('thc_use_days_must_be_integer_0_to_30', 'thcUseDaysLast30'));
    } else {
      useDays = value;
    }
  } else if (useDaysField.clean && goal !== undefined && GOALS_REQUIRING_USE_DAYS.includes(goal)) {
    errors.push(error('thc_use_days_required', 'thcUseDaysLast30'));
  }
  const useDaysPositive = useDays !== null && useDays > 0;
  const useDaysZero = useDays === 0;
  // Tolerance-v3 exposure classification reads sessions/products/routes from 4
  // use-days upward (an intensity signal can move a regular non-daily profile
  // one adjacent evidence tier). Only the 1-3 very-infrequent band never
  // consumes them, so only it may omit them on range-requested routes
  // (spec 5.7).
  const useDaysIntensityBand = useDays !== null && useDays >= 4;

  // --- sessionsPerUseDay ---------------------------------------------------
  const sessionsField = readCoreSourcedField(errors, 'sessionsPerUseDay', input.sessionsPerUseDay);
  if (sessionsField.clean && sessionsField.present) {
    const value = input.sessionsPerUseDay.value;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      errors.push(error('sessions_must_be_positive_number', 'sessionsPerUseDay'));
    } else if (useDaysZero) {
      errors.push(error('sessions_forbidden_when_zero_use_days', 'sessionsPerUseDay'));
    }
  } else if (sessionsField.clean && rangeRequested && useDaysIntensityBand) {
    errors.push(error('sessions_required', 'sessionsPerUseDay'));
  }

  // --- products and routes --------------------------------------------------
  if (!Array.isArray(input.products)) {
    errors.push(error('invalid_product', 'products'));
  } else {
    for (let i = 0; i < input.products.length; i += 1) {
      if (!(PRODUCT_KINDS as readonly unknown[]).includes(input.products[i])) {
        errors.push(error('invalid_product', `products[${i}]`));
      }
    }
    if (rangeRequested && useDaysIntensityBand && input.products.length === 0) {
      errors.push(error('products_required', 'products'));
    }
  }
  if (!Array.isArray(input.routes)) {
    errors.push(error('invalid_route', 'routes'));
  } else {
    for (let i = 0; i < input.routes.length; i += 1) {
      if (!(ROUTES as readonly unknown[]).includes(input.routes[i])) {
        errors.push(error('invalid_route', `routes[${i}]`));
      }
    }
    if (rangeRequested && useDaysIntensityBand && input.routes.length === 0) {
      errors.push(error('routes_required', 'routes'));
    }
  }

  // --- lastUseAt -------------------------------------------------------------
  const lastUseField = readCoreSourcedField(errors, 'lastUseAt', input.lastUseAt);
  let lastUseInstant: Instant | null = null;
  if (lastUseField.clean && lastUseField.present) {
    const value = input.lastUseAt.value;
    if (typeof value !== 'string') {
      errors.push(error('invalid_timestamp', 'lastUseAt'));
    } else {
      const instant = parseSubmittedTimestamp(value);
      if (instant === null) {
        errors.push(error('invalid_timestamp', 'lastUseAt'));
      } else {
        lastUseInstant = instant;
        const elapsed = calculationTime - instant;
        if (elapsed < 0) {
          errors.push(error('last_use_in_future', 'lastUseAt'));
        } else if (useDaysZero && elapsed <= THIRTY_DAY_WINDOW_MS) {
          // Spec 5.5: contradictory whenever both fields are present.
          errors.push(error('last_use_must_not_be_within_30_days_when_zero_use_days', 'lastUseAt'));
        } else if (useDaysPositive && consumesLastUseAt && elapsed > THIRTY_DAY_WINDOW_MS) {
          // Spec 5.6: window-consistency applies only where the timestamp is consumed.
          errors.push(error('last_use_must_be_within_30_days_when_use_days_positive', 'lastUseAt'));
        }
      }
    }
  } else if (lastUseField.clean) {
    if (goal === 'abstinence') {
      // Spec 5.17 (UX_SPEC D2): abstinence requires the authoritative last use.
      errors.push(error('last_use_required_for_abstinence', 'lastUseAt'));
    } else if (rangeRequested && useDaysPositive) {
      errors.push(error('last_use_required_when_use_days_positive', 'lastUseAt'));
    }
  }

  // --- currentPatternDuration (optional; missing is valid for legacy) ------
  const rawDuration = input.currentPatternDuration;
  let durationValue: CurrentPatternDurationBand | null = null;
  let durationProvenance: FieldProvenance = 'missing';
  if (rawDuration !== undefined) {
    const durationField = readCoreSourcedField(errors, 'currentPatternDuration', rawDuration);
    if (durationField.clean && durationField.present) {
      const value = rawDuration.value;
      if (
        typeof value !== 'string' ||
        !(CURRENT_PATTERN_DURATION_BANDS as readonly string[]).includes(value)
      ) {
        errors.push(error('invalid_current_pattern_duration', 'currentPatternDuration'));
      } else {
        durationValue = value as CurrentPatternDurationBand;
        durationProvenance = rawDuration.provenance as FieldProvenance;
      }
    }
  }

  // --- goal / breakRequested / postBreakMode rules (spec 5.9-5.14) ----------
  if (goalKnown && breakRequestedKnown && postBreakModeKnown) {
    switch (goal) {
      case 'tolerance_reset': {
        if (input.breakRequested !== true) {
          errors.push(error('tolerance_reset_requires_break_requested_true', 'breakRequested'));
        }
        break;
      }
      case 'reduction':
        break;
      case 'abstinence': {
        if (input.breakRequested !== false) {
          errors.push(error('abstinence_requires_break_requested_false', 'breakRequested'));
        }
        if (input.postBreakMode !== null && input.postBreakMode !== 'continue_abstinence') {
          errors.push(error('abstinence_requires_post_break_mode_continue_abstinence', 'postBreakMode'));
        }
        break;
      }
      case 'detection_information': {
        if (input.breakRequested !== false) {
          errors.push(error('detection_information_requires_break_requested_false', 'breakRequested'));
        }
        if (input.postBreakMode !== null) {
          errors.push(error('detection_information_requires_no_post_break_mode', 'postBreakMode'));
        }
        break;
      }
    }
  }

  // --- previousBreaks (schema shape only; inference is a later slice) -------
  if (!Array.isArray(input.previousBreaks)) {
    errors.push(error('previous_break_invalid_id', 'previousBreaks'));
  } else {
    let previousBreakIndex = 0;
    for (const previousBreak of input.previousBreaks) {
      const prefix = `previousBreaks[${previousBreakIndex}]`;
      if (previousBreak === null || typeof previousBreak !== 'object') {
        errors.push(error('previous_break_invalid_id', `${prefix}.id`));
        previousBreakIndex += 1;
        continue;
      }
      if (typeof previousBreak.id !== 'string') {
        errors.push(error('previous_break_invalid_id', `${prefix}.id`));
      }
      const { durationDays, toleranceReductionScore, endedAt, createdAt } = previousBreak;
      if (typeof durationDays !== 'number' || !Number.isInteger(durationDays) || durationDays < 1) {
        errors.push(error('previous_break_duration_days_must_be_positive_integer', `${prefix}.durationDays`));
      }
      if (
        toleranceReductionScore !== null &&
        (typeof toleranceReductionScore !== 'number' ||
          !Number.isInteger(toleranceReductionScore) ||
          toleranceReductionScore < 0 ||
          toleranceReductionScore > 10)
      ) {
        errors.push(error('previous_break_score_must_be_integer_0_to_10_or_null', `${prefix}.toleranceReductionScore`));
      }
      if (endedAt !== null && (typeof endedAt !== 'string' || parseSubmittedTimestamp(endedAt) === null)) {
        errors.push(error('previous_break_invalid_ended_at', `${prefix}.endedAt`));
      }
      if (typeof createdAt !== 'string' || parseSubmittedTimestamp(createdAt) === null) {
        errors.push(error('previous_break_invalid_created_at', `${prefix}.createdAt`));
      }
      previousBreakIndex += 1;
    }
  }

  if (errors.length > 0) {
    const sorted = [...errors].sort((a, b) => {
      if (a.path !== b.path) return a.path < b.path ? -1 : 1;
      return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
    });
    return { ok: false, errors: sorted };
  }

  // --- normalisation ---------------------------------------------------------
  const normalisedPreviousBreaks: ValidatedPreviousBreak[] = input.previousBreaks.map((previousBreak) => ({
    id: previousBreak.id,
    durationDays: previousBreak.durationDays,
    toleranceReductionScore: previousBreak.toleranceReductionScore,
    endedAt: previousBreak.endedAt === null ? null : toInstant(parseSubmittedTimestamp(previousBreak.endedAt)!),
    createdAt: toInstant(parseSubmittedTimestamp(previousBreak.createdAt)!),
  }));

  let postBreakMode = input.postBreakMode;
  if (goal === 'abstinence') {
    postBreakMode = 'continue_abstinence';
  } else if (goal === 'detection_information') {
    postBreakMode = null;
  }

  const profile: ValidatedUseProfile = {
    goal: goal!,
    breakRequested: input.breakRequested,
    postBreakMode,
    thcUseDaysLast30:
      useDaysField.present && input.thcUseDaysLast30.value !== null
        ? { value: input.thcUseDaysLast30.value, provenance: input.thcUseDaysLast30.provenance }
        : missingValue(),
    sessionsPerUseDay:
      sessionsField.present && input.sessionsPerUseDay.value !== null
        ? { value: input.sessionsPerUseDay.value, provenance: input.sessionsPerUseDay.provenance }
        : missingValue(),
    products: canonicalOrder(input.products as readonly ProductKind[], PRODUCT_KIND_ORDER),
    routes: canonicalOrder(input.routes as readonly Route[], ROUTE_ORDER),
    lastUseAt:
      lastUseInstant !== null
        ? { value: lastUseInstant, provenance: input.lastUseAt.provenance as FieldProvenance }
        : missingValue(),
    currentPatternDuration:
      durationValue === null
        ? missingValue()
        : { value: durationValue, provenance: durationProvenance },
    previousBreaks: normalisedPreviousBreaks,
  };

  return { ok: true, profile };
}
