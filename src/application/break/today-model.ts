// Today facts from persisted records (UX_SPEC 3.2).
//
// Builds the router's `TodayFacts` from the questionnaire snapshot facts, the
// stored attempts/tracking/reduction records, and the draft. The router stays
// pure over these facts; the UI reads the live records directly for card
// content.

import type { QuestionnaireProgressRecord } from '../progress/questionnaire-progress.ts';
import type { TodayFacts } from '../shell/today-state.ts';
import type { StoredAttempt } from '../progress/break-attempt-record.ts';
import type { StoredTrack } from '../progress/tracking-record.ts';
import type { ReductionPlan } from '../../domain/reduction/reduction-engine.ts';
import { currentLiveAttempt, currentLiveTracking } from './break-session.ts';

export interface TodayFactInputs {
  /** hasAnyData / hasProfile / detectionOnly derived from the snapshot. */
  readonly snapshotFacts: Partial<Pick<TodayFacts, 'hasAnyData' | 'hasProfile' | 'detectionOnly'>>;
  readonly attempts: readonly StoredAttempt[];
  readonly tracking: readonly StoredTrack[];
  /** Active-reduction plans, newest first. The live plan is the first whose
   * status is not `ended`. */
  readonly reductionPlans: readonly ReductionPlan[];
  readonly draft: QuestionnaireProgressRecord | null;
}

/** First non-ended reduction plan, or null. */
export function currentLiveReductionPlan(
  plans: readonly ReductionPlan[],
): ReductionPlan | null {
  return plans.find((plan) => plan.status !== 'ended') ?? null;
}

export function buildTodayFacts(input: TodayFactInputs): TodayFacts {
  const attempt = currentLiveAttempt(input.attempts);
  const tracking = currentLiveTracking(input.tracking);
  const livePlan = currentLiveReductionPlan(input.reductionPlans);
  const reduction =
    livePlan === null
      ? null
      : { status: livePlan.status === 'paused' ? ('paused' as const) : livePlan.status === 'review_recommended' ? ('review_recommended' as const) : ('active' as const) };
  return {
    hasAnyData: input.snapshotFacts.hasAnyData ?? false,
    attempt: attempt === null ? null : { status: attempt.status },
    tracking: tracking === null ? null : { status: tracking.status },
    reduction,
    hasProfile: input.snapshotFacts.hasProfile ?? false,
    detectionOnly: input.snapshotFacts.detectionOnly ?? false,
    draft: input.draft,
  };
}
