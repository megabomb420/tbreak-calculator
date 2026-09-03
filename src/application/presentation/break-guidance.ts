// Deterministic break-companion views. Clock math stays in domain
// `abstinenceDayAt`; this module only selects versioned evidence content.

import type { BreakPreparation } from '../break/preparation.ts';
import { implementationIntentions, triggerLabel } from '../break/preparation.ts';
import {
  CB1_EDUCATION_V1,
  CONCEPT_DISTINCTIONS_V1,
  DETOX_FRAMING,
  DETOX_METHODS_V1,
  EVIDENCE_GUIDANCE_VERSION,
  EVIDENCE_SCALE,
  EVIDENCE_SCALE_DISCLAIMER,
  EVIDENCE_SOURCE,
  MILESTONES_V1,
  POST_BREAK_CORE_V1,
  POST_BREAK_RETURN_PRINCIPLES_V1,
  UNPLANNED_USE_RECOVERY_V1,
  WITHDRAWAL_WINDOWS_V1,
  milestonesForDay,
  primaryWindowForDay,
  primaryWindowIdForDay,
  windowById,
  windowsContainingDay,
  type DetoxMethodContent,
  type MilestoneContent,
  type WithdrawalWindowContent,
  type WithdrawalWindowId,
} from '../../domain/guidance/evidence-guidance-v1.ts';
import type { CheckinComparisonView } from './checkin-comparison.ts';
import { compareCheckins } from './checkin-comparison.ts';
import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import type { PostBreakPlan } from '../break/post-break-plan.ts';
import {
  deriveDayOutlook,
  exposureTone,
  LAST_PLANNED_DAY_NEXT,
  type ExposureContext,
} from '../../domain/guidance/break-outlook.ts';

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

export interface TodayGuidanceView {
  readonly version: typeof EVIDENCE_GUIDANCE_VERSION;
  readonly breakDay: number | null;
  readonly windowId: WithdrawalWindowId;
  readonly headline: string;
  readonly mayNotice: readonly string[];
  readonly canHelp: readonly string[];
  readonly context: string;
  readonly comesNext: string | null;
  readonly whyThisMatters: string | null;
  readonly milestone: MilestoneContent | null;
  readonly intentions: readonly string[];
  readonly comparison: CheckinComparisonView | null;
  readonly openEnded: boolean;
}

export interface BreakGuidanceBundle {
  readonly today: TodayGuidanceView;
  readonly roadmap: readonly RoadmapStageView[];
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

export function presentTodayGuidance(input: {
  readonly breakDay: number | null;
  readonly targetDays: number | null;
  readonly openEnded: boolean;
  readonly planned: boolean;
  readonly preparation: BreakPreparation | null;
  readonly checkins: readonly DailyCheckin[];
  readonly exposure?: ExposureContext | null;
}): TodayGuidanceView {
  if (input.planned || input.breakDay === null) {
    const window = windowById('preparation');
    return assemble(window, {
      breakDay: input.breakDay,
      openEnded: input.openEnded,
      preparation: input.preparation,
      checkins: [],
      includeComparison: false,
    });
  }
  const window = primaryWindowForDay(input.breakDay);
  const includeComparison = input.breakDay >= 7;
  const view = assemble(window, {
    breakDay: input.breakDay,
    openEnded: input.openEnded,
    preparation: input.preparation,
    checkins: input.checkins,
    includeComparison,
  });
  const lastPlannedDay =
    input.targetDays !== null && !input.openEnded && input.breakDay === input.targetDays;
  if (input.exposure === undefined || input.exposure === null) {
    return lastPlannedDay ? { ...view, comesNext: LAST_PLANNED_DAY_NEXT } : view;
  }
  const day = deriveDayOutlook(input.breakDay, exposureTone(input.exposure));
  return {
    ...view,
    headline: day.headline,
    mayNotice: personalizeHelp(day.mayNotice, input.preparation),
    canHelp: personalizeHelp(day.canHelp, input.preparation),
    comesNext: lastPlannedDay ? LAST_PLANNED_DAY_NEXT : day.comesNext,
    whyThisMatters: day.whatMatters,
  };
}

export function presentRoadmap(input: {
  readonly breakDay: number | null;
  readonly planned: boolean;
  readonly targetDays: number | null;
}): readonly RoadmapStageView[] {
  const primary = input.planned || input.breakDay === null ? 'preparation' : primaryWindowIdForDay(input.breakDay);
  const containing =
    input.planned || input.breakDay === null
      ? (['preparation'] as const)
      : windowsContainingDay(input.breakDay).map((window) => window.id);
  const containingSet = new Set<WithdrawalWindowId>(containing);
  const orderIndex = (id: WithdrawalWindowId) => WITHDRAWAL_WINDOWS_V1.findIndex((window) => window.id === id);
  const primaryIndex = orderIndex(primary);
  return WITHDRAWAL_WINDOWS_V1.map((window) => {
    const index = orderIndex(window.id);
    let status: RoadmapStageStatus;
    if (window.id === primary) status = 'current';
    else if (containingSet.has(window.id)) status = 'current-overlap';
    else if (index < primaryIndex) status = 'past';
    else status = 'future';
    const overlapIds = overlappingLabels(window);
    const beyondPlanTarget =
      input.targetDays !== null && window.dayStart !== null && window.dayStart > input.targetDays;
    return {
      id: window.id,
      label: window.label,
      headline: window.headline,
      status,
      kind: window.kind,
      overlapNote: overlapIds.length > 0 ? `Overlaps ${overlapIds.join(' and ')}` : null,
      beyondPlanTarget,
    };
  });
}

export function presentBreakGuidance(input: {
  readonly breakDay: number | null;
  readonly targetDays: number | null;
  readonly openEnded: boolean;
  readonly planned: boolean;
  readonly preparation: BreakPreparation | null;
  readonly checkins: readonly DailyCheckin[];
  readonly exposure?: ExposureContext | null;
}): BreakGuidanceBundle {
  return {
    today: presentTodayGuidance(input),
    roadmap: presentRoadmap({
      breakDay: input.breakDay,
      planned: input.planned,
      targetDays: input.targetDays,
    }),
  };
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

export function presentConceptDistinctions(): readonly string[] {
  return CONCEPT_DISTINCTIONS_V1;
}

export function presentUnplannedUseRecovery(): typeof UNPLANNED_USE_RECOVERY_V1 {
  return UNPLANNED_USE_RECOVERY_V1;
}

export function presentMilestones(): readonly MilestoneContent[] {
  return MILESTONES_V1;
}

export function evidenceMeta(): { readonly version: string; readonly source: typeof EVIDENCE_SOURCE } {
  return { version: EVIDENCE_GUIDANCE_VERSION, source: EVIDENCE_SOURCE };
}

function assemble(
  window: WithdrawalWindowContent,
  input: {
    readonly breakDay: number | null;
    readonly openEnded: boolean;
    readonly preparation: BreakPreparation | null | undefined;
    readonly checkins: readonly DailyCheckin[];
    readonly includeComparison: boolean;
  },
): TodayGuidanceView {
  const milestone =
    input.breakDay === null ? null : (milestonesForDay(input.breakDay)[0] ?? null);
  const comparison = input.includeComparison
    ? compareCheckins(input.checkins, { breakDay: input.breakDay ?? 0 })
    : null;
  return {
    version: EVIDENCE_GUIDANCE_VERSION,
    breakDay: input.breakDay,
    windowId: window.id,
    headline: window.headline,
    mayNotice: window.mayNotice,
    canHelp: personalizeHelp(window.canHelp, input.preparation),
    context: window.context,
    comesNext: window.comesNext,
    whyThisMatters: window.whyThisMatters,
    milestone,
    intentions: implementationIntentions(input.preparation),
    comparison,
    openEnded: input.openEnded,
  };
}

function personalizeHelp(base: readonly string[], preparation: BreakPreparation | null | undefined): readonly string[] {
  if (preparation == null) return base;
  const extra: string[] = [];
  if (preparation.replacementAction !== null) {
    extra.push(`Use “${preparation.replacementAction}” at the time you would normally use THC.`);
  }
  if (preparation.triggerIds.length > 0) {
    const labels = preparation.triggerIds.map(triggerLabel).join(', ');
    extra.push(`Where practical, avoid: ${labels}.`);
  }
  if (extra.length === 0) return base;
  const withoutGeneric = base.filter(
    (line) =>
      !line.toLowerCase().includes('replacement activity') &&
      !line.toLowerCase().includes('strongest'),
  );
  return [...extra, ...withoutGeneric];
}

function overlappingLabels(window: WithdrawalWindowContent): readonly string[] {
  if (window.dayStart === null) return [];
  return WITHDRAWAL_WINDOWS_V1.filter((other) => {
    if (other.id === window.id || other.dayStart === null) return false;
    const aStart = window.dayStart ?? 0;
    const aEnd = window.dayEnd ?? Number.POSITIVE_INFINITY;
    const bStart = other.dayStart ?? 0;
    const bEnd = other.dayEnd ?? Number.POSITIVE_INFINITY;
    return aStart <= bEnd && bStart <= aEnd;
  }).map((other) => other.label);
}
