// Post-break plan (UX_SPEC section 8, 10.1).
//
// The mode is chosen at break start and editable later from plan detail. Each
// return-to-use mode carries user-defined limits (never fed to an engine);
// abstinence and undecided modes carry nothing to set. These settings are
// stored on the attempt record so the post-break presentation after
// completion has the mode + limits the user chose.

import { POST_BREAK_MODES, type PostBreakMode } from '../../domain/schemas/enums.ts';

export const POTENCY_STRATEGIES = ['lower', 'same', 'mixed'] as const;
export type PotencyStrategy = (typeof POTENCY_STRATEGIES)[number];

export const QUANTITY_STRATEGIES = ['smaller', 'same'] as const;
export type QuantityStrategy = (typeof QUANTITY_STRATEGIES)[number];

export const MIN_USE_DAYS_PER_WEEK = 1;
export const MAX_USE_DAYS_PER_WEEK = 7;
export const MIN_SESSIONS_PER_USE_DAY = 1;
export const MAX_SESSIONS_PER_USE_DAY = 9;

export type PostBreakPlan =
  | { readonly mode: 'continue_abstinence' }
  | { readonly mode: 'occasional'; readonly maxUseDaysPerWeek: number }
  | {
      readonly mode: 'reduced_regular_use';
      readonly maxUseDaysPerWeek: number;
      readonly maxSessionsPerUseDay: number;
      readonly potencyStrategy: PotencyStrategy;
      readonly quantityStrategy: QuantityStrategy;
    }
  | { readonly mode: 'undecided' };

/** Fresh plan for a chosen mode. Defaults are starting values only — the
 * user defines the limits; nothing here is a recommendation. */
export function defaultPostBreakPlan(mode: PostBreakMode): PostBreakPlan {
  switch (mode) {
    case 'continue_abstinence':
      return { mode };
    case 'occasional':
      return { mode, maxUseDaysPerWeek: 2 };
    case 'reduced_regular_use':
      return {
        mode,
        maxUseDaysPerWeek: 2,
        maxSessionsPerUseDay: 1,
        potencyStrategy: 'lower',
        quantityStrategy: 'smaller',
      };
    case 'undecided':
      return { mode };
  }
}

export function isValidPostBreakMode(value: unknown): value is PostBreakMode {
  return typeof value === 'string' && (POST_BREAK_MODES as readonly string[]).includes(value);
}

export function isValidPostBreakPlan(value: unknown): value is PostBreakPlan {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  switch (body.mode) {
    case 'continue_abstinence':
      return true;
    case 'undecided':
      return true;
    case 'occasional':
      return isIntInRange(body.maxUseDaysPerWeek, MIN_USE_DAYS_PER_WEEK, MAX_USE_DAYS_PER_WEEK);
    case 'reduced_regular_use':
      return (
        isIntInRange(body.maxUseDaysPerWeek, MIN_USE_DAYS_PER_WEEK, MAX_USE_DAYS_PER_WEEK) &&
        isIntInRange(body.maxSessionsPerUseDay, MIN_SESSIONS_PER_USE_DAY, MAX_SESSIONS_PER_USE_DAY) &&
        (POTENCY_STRATEGIES as readonly string[]).includes(body.potencyStrategy as string) &&
        (QUANTITY_STRATEGIES as readonly string[]).includes(body.quantityStrategy as string)
      );
    default:
      return false;
  }
}

/** True when the plan's mode matches the attempt's post-break mode. */
export function postBreakPlanMatchesMode(plan: PostBreakPlan, mode: PostBreakMode | null): boolean {
  return mode !== null && plan.mode === mode;
}

export function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
