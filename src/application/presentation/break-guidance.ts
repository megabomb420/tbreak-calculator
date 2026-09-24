// Deterministic break-companion views. Clock math stays in domain
// `abstinenceDayAt`; this module only selects versioned evidence content.
//
// The stage/day-by-day companion views are presented by `break-outlook.ts`
// (`presentBreakOutlook`) and `daily-support.ts`. `RoadmapStageView` stays
// here because both those presenters and `ui/break-roadmap.tsx` render it.

import {
  CB1_EDUCATION_V1,
  DETOX_FRAMING,
  DETOX_METHODS_V1,
  EVIDENCE_SCALE,
  EVIDENCE_SCALE_DISCLAIMER,
  POST_BREAK_CORE_V1,
  POST_BREAK_RETURN_PRINCIPLES_V1,
  UNPLANNED_USE_RECOVERY_V1,
  type DetoxMethodContent,
  type WithdrawalWindowContent,
  type WithdrawalWindowId,
} from '../../domain/guidance/evidence-guidance-v1.ts';
import type { PostBreakPlan } from '../break/post-break-plan.ts';

export type RoadmapStageStatus = 'past' | 'current' | 'current-overlap' | 'future';

export interface RoadmapStageView {
  readonly id: WithdrawalWindowId;
  readonly label: string;
  readonly headline: string;
  readonly status: RoadmapStageStatus;
  readonly kind: WithdrawalWindowContent['kind'];
  readonly overlapNote: string | null;
  readonly beyondPlanTarget: boolean;
}

export interface DetoxEvidenceView {
  readonly title: string;
  readonly lead: string;
  readonly primary: string;
  readonly notAProtocol: string;
  readonly scaleDisclaimer: string;
  readonly scale: typeof EVIDENCE_SCALE;
  readonly methods: readonly DetoxMethodContent[];
}

export interface PostBreakGuidanceView {
  readonly mode: PostBreakPlan['mode'];
  readonly showReturnGuidance: boolean;
  readonly lead: string;
  readonly principles: readonly string[];
  readonly noSafeDose: string;
}

export function presentDetoxEvidence(): DetoxEvidenceView {
  return {
    title: DETOX_FRAMING.title,
    lead: DETOX_FRAMING.lead,
    primary: DETOX_FRAMING.primary,
    notAProtocol: DETOX_FRAMING.notAProtocol,
    scaleDisclaimer: EVIDENCE_SCALE_DISCLAIMER,
    scale: EVIDENCE_SCALE,
    methods: DETOX_METHODS_V1,
  };
}

export function presentPostBreakGuidance(plan: PostBreakPlan): PostBreakGuidanceView {
  if (plan.mode === 'continue_abstinence') {
    return {
      mode: plan.mode,
      showReturnGuidance: false,
      lead: POST_BREAK_CORE_V1.abstinenceOnly,
      principles: [],
      noSafeDose: POST_BREAK_CORE_V1.noSafeDose,
    };
  }
  const principles = POST_BREAK_RETURN_PRINCIPLES_V1
    .filter((row) => {
      if (row.id === 'session_limit') return plan.mode === 'reduced_regular_use';
      if (row.id === 'frequency_limit') return plan.mode === 'occasional' || plan.mode === 'reduced_regular_use';
      return true;
    })
    .map((row) => row.text);
  return {
    mode: plan.mode,
    showReturnGuidance: true,
    lead: POST_BREAK_CORE_V1.previousIsNotRestart,
    principles,
    noSafeDose: POST_BREAK_CORE_V1.noSafeDose,
  };
}

export function presentCb1Education(): typeof CB1_EDUCATION_V1 {
  return CB1_EDUCATION_V1;
}

export function presentUnplannedUseRecovery(): typeof UNPLANNED_USE_RECOVERY_V1 {
  return UNPLANNED_USE_RECOVERY_V1;
}
