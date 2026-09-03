// Reduction-plan lifecycle operations (pure, deterministic).
//
// Mutations keep the plan's stored status in sync with its events via the
// rolling review rule; every mutation returns a fresh plan with `updatedAt`
// set to the supplied `now`. Event rows are appended in event order and
// deleted by id (correction); the caller owns id generation so ids are unique
// across the app.

import {
  derivePlanState,
  statusAfterEvents,
  type ReductionBaseline,
  type ReductionLimits,
  type ReductionOrigin,
  type ReductionPlan,
  type ReductionPlanStatus,
  type ThcStrategy,
  type UseEvent,
} from './reduction-engine.ts';
import type { Instant } from '../schemas/time.ts';

export interface StartReductionPlanInput {
  readonly id: string;
  readonly origin: ReductionOrigin;
  readonly limits: ReductionLimits;
  readonly strategy: ThcStrategy;
  readonly baseline: ReductionBaseline;
  readonly now: Instant;
  readonly utcOffsetMinutes: number;
}

export function startReductionPlan(input: StartReductionPlanInput): ReductionPlan {
  const plan: ReductionPlan = {
    id: input.id,
    origin: input.origin,
    status: 'active',
    startedAt: input.now,
    updatedAt: input.now,
    limits: input.limits,
    strategy: input.strategy,
    baseline: input.baseline,
    events: [],
  };
  return plan;
}

export interface LogUseEventInput {
  readonly plan: ReductionPlan;
  readonly event: UseEvent;
  readonly now: Instant;
  readonly utcOffsetMinutes: number;
}

export function logUseEvent(input: LogUseEventInput): ReductionPlan {
  const plan = input.plan;
  const events = [...plan.events, input.event].sort((a, b) =>
    a.usedAt !== b.usedAt ? a.usedAt - b.usedAt : a.createdAt - b.createdAt,
  );
  return withStatus(plan, events, input.now, input.utcOffsetMinutes);
}

export interface DeleteUseEventInput {
  readonly plan: ReductionPlan;
  readonly eventId: string;
  readonly now: Instant;
  readonly utcOffsetMinutes: number;
}

export function deleteUseEvent(input: DeleteUseEventInput): ReductionPlan {
  const events = input.plan.events.filter((event) => event.id !== input.eventId);
  return withStatus(input.plan, events, input.now, input.utcOffsetMinutes);
}

export interface ChangePlanControlsInput {
  readonly plan: ReductionPlan;
  readonly limits: ReductionLimits;
  readonly strategy: ThcStrategy;
  readonly now: Instant;
  readonly utcOffsetMinutes: number;
}

/** Edit limits/strategy (a recommit). If the user recommits while the plan is
 * only in review_recommended because of breaches, the fresh commit returns it
 * to active; ended plans cannot recommit (start a new plan instead). */
export function recommitPlan(input: ChangePlanControlsInput): ReductionPlan {
  if (input.plan.status === 'ended') {
    throw new RangeError('an ended reduction plan cannot be recommitted');
  }
  const base: ReductionPlan = {
    ...input.plan,
    limits: input.limits,
    strategy: input.strategy,
  };
  return withStatus(base, input.plan.events, input.now, input.utcOffsetMinutes);
}

export function pausePlan(plan: ReductionPlan, now: Instant): ReductionPlan {
  if (plan.status === 'ended') throw new RangeError('an ended reduction plan cannot be paused');
  return { ...plan, status: 'paused', updatedAt: now };
}

export function resumePlan(
  plan: ReductionPlan,
  now: Instant,
  utcOffsetMinutes: number,
): ReductionPlan {
  if (plan.status === 'ended') throw new RangeError('an ended reduction plan cannot be resumed');
  // Resuming re-evaluates the review rule against current events.
  return withStatus({ ...plan, status: 'active' }, plan.events, now, utcOffsetMinutes);
}

export function endPlan(plan: ReductionPlan, now: Instant): ReductionPlan {
  return { ...plan, status: 'ended', updatedAt: now };
}

/** Applies the derived review rule to the stored status. */
function withStatus(
  plan: ReductionPlan,
  events: readonly UseEvent[],
  now: Instant,
  utcOffsetMinutes: number,
): ReductionPlan {
  const state = derivePlanState(events, plan.limits, plan.strategy, now, utcOffsetMinutes);
  return {
    ...plan,
    events,
    status: statusAfterEvents(plan.status, state),
    updatedAt: now,
  };
}
