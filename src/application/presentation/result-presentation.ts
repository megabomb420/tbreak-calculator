// Typed deterministic presentation of engine results (UX_SPEC §9 + §14).
//
// Numbers, statuses and codes come from engine output. This module maps
// them onto approved copy structure. It does not select bands, compute
// elapsed days, or invent detection windows.

import type { CurrentPatternDurationBand } from '../../domain/schemas/enums.ts';
import type { UseProfileInput } from '../../domain/schemas/profile.ts';
// Presentation-only structural copy (UX_SPEC 9.5–9.6). Not engine output.
import type {
  DetectionResult,
  HistoryInsight,
  RecommendedRangeDays,
  ToleranceResult,
  WithdrawalAnchorCode,
  WithdrawalAnchorStatus,
  WithdrawalDisplay,
} from '../../domain/schemas/result.ts';
import type { QuestionnaireStepId } from '../questionnaire/engine.ts';
import { renderMessageCode } from './message-templates.ts';
import { primaryWindowForDay, primaryWindowIdForDay, type WithdrawalWindowId } from '../../domain/guidance/evidence-guidance-v1.ts';
import {
  presentOutlookForProfile,
  type BreakOutlookView,
} from './break-outlook.ts';

export type ResultViewKind =
  | 'tolerance_result'
  | 'abstinence_planning'
  | 'reduction_planning'
  | 'baseline_low'
  | 'detection'
  | 'unavailable';

export interface WithdrawalStopView {
  readonly anchor: WithdrawalAnchorCode;
  readonly status: WithdrawalAnchorStatus | null;
  readonly statusLabel: 'upcoming' | 'happening now' | 'passed' | null;
}

export interface WithdrawalView {
  readonly breakDay: number;
  readonly stops: readonly WithdrawalStopView[];
}

export type AnswerRowId = 'useDays' | 'lastUse' | 'sessions' | 'productsRoutes' | 'patternDuration';

export interface AnswerRow {
  readonly id: AnswerRowId;
  readonly label: string;
  readonly value: string;
  readonly step: QuestionnaireStepId;
}

export interface ToleranceResultView {
  readonly kind: 'tolerance_result';
  readonly rangeDays: RecommendedRangeDays;
  readonly preferredTargetDays: number;
  readonly uncertainty: string;
  readonly drivers: readonly string[];
  readonly history: string | null;
  readonly withdrawal: WithdrawalView | null;
  readonly outlook: BreakOutlookView | null;
  readonly answers: readonly AnswerRow[];
}

export interface AbstinencePlanningView {
  readonly kind: 'abstinence_planning';
  readonly rangeDays: null;
  readonly withdrawal: WithdrawalView | null;
  readonly phaseCopy: string;
  readonly outlook: BreakOutlookView | null;
  readonly answers: readonly AnswerRow[];
}

export interface ReductionPlanningView {
  readonly kind: 'reduction_planning';
  readonly rangeDays: null;
  readonly withdrawal: null;
  readonly answers: readonly AnswerRow[];
}

export interface BaselineLowView {
  readonly kind: 'baseline_low';
  readonly title: string;
  readonly body: string;
  readonly daysSinceLastUse: number | null;
}

export interface DetectionView {
  readonly kind: 'detection';
  readonly banner: string;
  readonly matrixCopy: readonly string[];
  readonly contextNote: string | null;
  readonly whatHelps: string;
  readonly numericEstimateAvailable: false;
  readonly daysSinceLastUse?: undefined;
}

export interface UnavailableView {
  readonly kind: 'unavailable';
}

export type ResultView =
  | ToleranceResultView
  | AbstinencePlanningView
  | ReductionPlanningView
  | BaselineLowView
  | DetectionView
  | UnavailableView;

export const DETECTION_BANNER =
  "Qualitative information only — this app doesn't estimate detection windows or test outcomes.";

export const DETECTION_WHAT_HELPS =
  'Time plus abstinence is the fundamental mechanism. Normal hydration and routine exercise support wellbeing; no detox product, flush, sauna, fasting, or niacin has a supported clearance effect.';

const BASELINE_TITLE = 'Your baseline tolerance is likely already low.';
const BASELINE_BODY =
  "You haven't used THC in the last 30 days, so there's no break to recommend — a break only makes sense with recent use to reset from.";

export type PlanPhaseKey = WithdrawalWindowId;

// Current-stage copy from EvidenceGuidanceV1. The three exclusive 1–6 / 7–14 /
// 15–28 buckets are superseded by overlapping scientific windows. UI still
// selects by abstinence day and never invents copy.
export function phaseKeyForDay(breakDay: number): PlanPhaseKey {
  return primaryWindowIdForDay(breakDay);
}

export function phaseFocusCopy(breakDay: number): string {
  return primaryWindowForDay(breakDay).context;
}

export function presentToleranceResult(result: ToleranceResult, profile: UseProfileInput): ResultView {
  if (result.kind === 'validation_error') return { kind: 'unavailable' };
  if (result.kind === 'not_applicable') {
    return {
      kind: 'baseline_low',
      title: BASELINE_TITLE,
      body: BASELINE_BODY,
      daysSinceLastUse: result.withdrawal?.breakDay ?? null,
    };
  }
  if (result.kind === 'planning_only') {
    if (profile.goal === 'abstinence') {
      return {
        kind: 'abstinence_planning',
        rangeDays: null,
        withdrawal: presentWithdrawal(result.withdrawal),
        phaseCopy: phaseFocusCopy(result.withdrawal?.breakDay ?? 1),
        outlook: presentOutlookForProfile({
          profile,
          targetDays: 28,
          openEnded: true,
          currentDay: result.withdrawal?.breakDay ?? null,
          preview: true,
        }),
        answers: answerRows(profile),
      };
    }
    return {
      kind: 'reduction_planning',
      rangeDays: null,
      withdrawal: null,
      answers: answerRows(profile),
    };
  }
  if (result.recommendedRangeDays === null || result.preferredTargetDays === null) {
    return { kind: 'unavailable' };
  }
  return {
    kind: 'tolerance_result',
    rangeDays: result.recommendedRangeDays,
    preferredTargetDays: result.preferredTargetDays,
    uncertainty: renderMessageCode(result.uncertaintySummaryCode ?? '') ?? '',
    drivers: presentDrivers(result.drivers, profile),
    history: presentHistory(result.historyInsight),
    withdrawal: presentWithdrawal(result.withdrawal),
    outlook: presentOutlookForProfile({
      profile,
      targetDays: result.preferredTargetDays,
      openEnded: false,
      currentDay: result.withdrawal?.breakDay ?? null,
      preview: true,
    }),
    answers: answerRows(profile),
  };
}

export function presentDetectionResult(result: DetectionResult): ResultView {
  if (result.kind !== 'qualitative_only') return { kind: 'unavailable' };
  const matrixCopy = [...result.interpretationCodes, ...result.uncertaintyCodes]
    .map((code) => renderMessageCode(code))
    .filter((line): line is string => line !== null);
  const contextCodes = result.uncertaintyCodes.filter(
    (code) => code === 'workplace_cutoff_and_policy_unknown' || code === 'roadside_requires_verified_jurisdiction_rules',
  );
  const contextNote = contextCodes.length > 0 ? renderMessageCode(contextCodes[0] ?? '') : null;
  const matrixOnly = matrixCopy.filter(
    (line) => line !== contextNote,
  );
  return {
    kind: 'detection',
    banner: DETECTION_BANNER,
    matrixCopy: matrixOnly,
    contextNote,
    whatHelps: DETECTION_WHAT_HELPS,
    numericEstimateAvailable: false,
  };
}

export function presentWithdrawal(display: WithdrawalDisplay | null): WithdrawalView | null {
  if (display === null) return null;
  return {
    breakDay: display.breakDay,
    stops: display.anchors.map((anchor) => ({
      anchor: anchor.anchor,
      status: anchor.status,
      statusLabel: statusLabel(anchor.status),
    })),
  };
}

function statusLabel(status: WithdrawalAnchorStatus | null): WithdrawalStopView['statusLabel'] {
  if (status === 'upcoming') return 'upcoming';
  if (status === 'current') return 'happening now';
  if (status === 'past') return 'passed';
  return null;
}

function presentDrivers(engineDrivers: readonly string[], profile: UseProfileInput): readonly string[] {
  const fromEngine = engineDrivers
    .map((code) => renderMessageCode(code))
    .filter((line): line is string => line !== null);
  const durationCodes = durationDriverCodes(profile);
  const fromDuration = durationCodes
    .map((code) => renderMessageCode(code))
    .filter((line): line is string => line !== null);
  return [...fromEngine, ...fromDuration];
}

function durationDriverCodes(profile: UseProfileInput): readonly string[] {
  const band = profile.currentPatternDuration?.value;
  if (band === null || band === undefined) return [];
  return [`current_pattern_${band}`, 'current_pattern_duration_contextual_only'];
}

function presentHistory(insight: HistoryInsight | null): string | null {
  if (insight === null) return null;
  const vars =
    insight.observations === null
      ? {}
      : { short: insight.observations[0].durationDays, long: insight.observations[1].durationDays };
  const primary = renderMessageCode(insight.code, vars);
  if (primary === null) return null;
  if (!insight.outsideRecommendedRange) return `${primary} Your history never changes the recommended range.`;
  const extra = renderMessageCode('history_outside_population_range');
  return extra === null
    ? `${primary} Your history never changes the recommended range.`
    : `${primary} ${extra} Your history never changes the recommended range.`;
}

function answerRows(profile: UseProfileInput): AnswerRow[] {
  const rows: AnswerRow[] = [];
  if (profile.thcUseDaysLast30.value !== null) {
    rows.push({
      id: 'useDays',
      label: 'Days you used THC in the last 30 days',
      value: String(profile.thcUseDaysLast30.value),
      step: 'Q2',
    });
  }
  if (profile.lastUseAt.value !== null) {
    rows.push({
      id: 'lastUse',
      label: 'When you last used',
      value: profile.lastUseAt.value.slice(0, 10),
      step: profile.goal === 'abstinence' ? 'Q2A' : profile.thcUseDaysLast30.value === 0 ? 'Q3-opt' : 'Q3',
    });
  }
  if (profile.sessionsPerUseDay.value !== null) {
    rows.push({
      id: 'sessions',
      label: 'Sessions on a typical use day',
      value: String(profile.sessionsPerUseDay.value),
      step: 'Q4',
    });
  }
  if (profile.products.length > 0 || profile.routes.length > 0) {
    rows.push({
      id: 'productsRoutes',
      label: 'What you have been using, and how',
      value: [...profile.products, ...profile.routes].join(', '),
      step: 'Q5',
    });
  }
  if (profile.currentPatternDuration?.value) {
    rows.push({
      id: 'patternDuration',
      label: 'How long this current pattern has been typical',
      value: durationLabel(profile.currentPatternDuration.value),
      step: 'Q6',
    });
  }
  return rows;
}

function durationLabel(band: CurrentPatternDurationBand): string {
  switch (band) {
    case 'under_1_month':
      return 'Less than 1 month';
    case '1_to_6_months':
      return '1–6 months';
    case '6_to_24_months':
      return '6–24 months';
    case '2_to_5_years':
      return '2–5 years';
    case '5_plus_years':
      return '5+ years';
    default:
      return '';
  }
}
