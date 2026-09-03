// Presentation of BreakOutlookV1. Clock math stays in domain abstinenceDayAt.
// UI renders; it does not invent days, windows, or recovery scores.

import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import { parseSubmittedTimestamp } from '../../domain/schemas/time.ts';
import { abstinenceDayAt } from '../../domain/breaks/break-time.ts';
import {
  deriveBreakOutlook,
  deriveDayOutlook,
  exposureFromProfile,
  exposureTone,
  windowIdsOverlappingSpan,
  type BreakOutlook,
  type DayOutlook,
  type ExposureContext,
  type ExposureTone,
} from '../../domain/guidance/break-outlook.ts';
import {
  WITHDRAWAL_WINDOWS_V1,
  primaryWindowIdForDay,
  windowById,
  windowsContainingDay,
  type WithdrawalWindowId,
} from '../../domain/guidance/evidence-guidance-v1.ts';
import type { UseProfileInput } from '../../domain/schemas/profile.ts';
import type { RoadmapStageStatus, RoadmapStageView } from './break-guidance.ts';

export type OutlookDayStatus = 'past' | 'current' | 'future' | 'preview';

export interface CheckinDayNote {
  readonly craving: number | null;
  readonly sleep: number | null;
  readonly irritability: number | null;
  readonly anxiety: number | null;
  readonly appetite: number | null;
  readonly hasAnyRating: boolean;
}

export interface OutlookDayView {
  readonly day: number;
  readonly status: OutlookDayStatus;
  readonly primaryWindowId: WithdrawalWindowId;
  readonly windowIds: readonly WithdrawalWindowId[];
  readonly stageLabel: string;
  readonly headline: string;
  readonly mayNotice: readonly string[];
  readonly canHelp: readonly string[];
  readonly whatMatters: string;
  readonly comesNext: string | null;
  readonly milestoneTitle: string | null;
  readonly milestoneBody: string | null;
  readonly checkin: CheckinDayNote | null;
  readonly tone: ExposureTone;
}

export interface BreakOutlookView {
  readonly version: BreakOutlook['version'];
  readonly targetDays: number | null;
  readonly openEnded: boolean;
  readonly currentDay: number | null;
  readonly tone: ExposureTone;
  readonly personalisationNote: string | null;
  readonly populationNote: string;
  readonly days: readonly OutlookDayView[];
  readonly windows: readonly RoadmapStageView[];
}

export const POPULATION_OUTLOOK_NOTE =
  'Typical patterns across people — not a personal prediction. A day can sit in more than one evidence window.';

export function presentBreakOutlook(input: {
  readonly targetDays: number | null;
  readonly openEnded: boolean;
  readonly currentDay: number | null;
  readonly planned?: boolean;
  readonly exposure: ExposureContext;
  readonly checkins?: readonly DailyCheckin[];
  readonly lastUseAt?: Instant | null;
  readonly preview?: boolean;
}): BreakOutlookView {
  const outlook = deriveBreakOutlook({
    targetDays: input.targetDays,
    openEnded: input.openEnded,
    exposure: input.exposure,
  });
  const planned = input.planned === true || input.currentDay === null;
  const preview = input.preview === true;
  const currentDay = planned ? null : input.currentDay;
  const days = outlook.days.map((day) =>
    presentOutlookDay(day, {
      currentDay,
      preview,
      checkin: checkinForDay(input.checkins ?? [], input.lastUseAt ?? null, day.day),
    }),
  );
  const spanEnd = outlook.days.length;
  const windowIds = windowIdsOverlappingSpan(1, spanEnd, { openEnded: input.openEnded });
  const windows = presentOutlookWindows({
    windowIds,
    currentDay,
    planned,
    targetDays: input.openEnded ? null : input.targetDays,
  });
  return {
    version: outlook.version,
    targetDays: outlook.targetDays,
    openEnded: outlook.openEnded,
    currentDay,
    tone: outlook.tone,
    personalisationNote: outlook.personalisationNote,
    populationNote: POPULATION_OUTLOOK_NOTE,
    days,
    windows,
  };
}

export function presentOutlookForProfile(input: {
  readonly profile: UseProfileInput;
  readonly targetDays: number | null;
  readonly openEnded: boolean;
  readonly currentDay: number | null;
  readonly preview?: boolean;
  readonly planned?: boolean;
  readonly checkins?: readonly DailyCheckin[];
  readonly lastUseAt?: Instant | null;
}): BreakOutlookView {
  return presentBreakOutlook({
    targetDays: input.targetDays,
    openEnded: input.openEnded,
    currentDay: input.currentDay,
    planned: input.planned,
    preview: input.preview,
    exposure: exposureFromProfile(input.profile),
    checkins: input.checkins,
    lastUseAt: input.lastUseAt,
  });
}

export function presentCurrentDayOutlook(input: {
  readonly breakDay: number;
  readonly exposure: ExposureContext;
}): DayOutlook {
  return deriveDayOutlook(input.breakDay, exposureTone(input.exposure));
}

export { exposureFromProfile, exposureTone };

function presentOutlookDay(
  day: DayOutlook,
  input: {
    readonly currentDay: number | null;
    readonly preview: boolean;
    readonly checkin: CheckinDayNote | null;
  },
): OutlookDayView {
  let status: OutlookDayStatus = 'preview';
  if (!input.preview && input.currentDay !== null) {
    if (day.day === input.currentDay) status = 'current';
    else if (day.day < input.currentDay) status = 'past';
    else status = 'future';
  } else if (input.preview && input.currentDay !== null) {
    if (day.day === input.currentDay) status = 'current';
    else if (day.day < input.currentDay) status = 'past';
    else status = 'future';
  }
  return {
    day: day.day,
    status,
    primaryWindowId: day.primaryWindowId,
    windowIds: day.windowIds,
    stageLabel: day.stageLabel,
    headline: day.headline,
    mayNotice: day.mayNotice,
    canHelp: day.canHelp,
    whatMatters: day.whatMatters,
    comesNext: day.comesNext,
    milestoneTitle: day.milestone?.title ?? null,
    milestoneBody: day.milestone?.body ?? null,
    checkin: input.checkin,
    tone: day.tone,
  };
}

function presentOutlookWindows(input: {
  readonly windowIds: readonly WithdrawalWindowId[];
  readonly currentDay: number | null;
  readonly planned: boolean;
  readonly targetDays: number | null;
}): readonly RoadmapStageView[] {
  const primary =
    input.planned || input.currentDay === null ? null : primaryWindowIdForDay(input.currentDay);
  const containing =
    input.planned || input.currentDay === null
      ? new Set<WithdrawalWindowId>()
      : new Set(windowsContainingDay(input.currentDay).map((window) => window.id));
  const orderIndex = (id: WithdrawalWindowId) => WITHDRAWAL_WINDOWS_V1.findIndex((window) => window.id === id);
  const primaryIndex = primary === null ? -1 : orderIndex(primary);
  return input.windowIds.map((id) => {
    const window = windowById(id);
    const index = orderIndex(id);
    let status: RoadmapStageStatus;
    if (primary !== null && id === primary) status = 'current';
    else if (containing.has(id)) status = 'current-overlap';
    else if (primaryIndex >= 0 && index < primaryIndex) status = 'past';
    else status = 'future';
    const overlapIds = overlappingLabels(window.id, input.windowIds);
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

function overlappingLabels(id: WithdrawalWindowId, visible: readonly WithdrawalWindowId[]): readonly string[] {
  const window = windowById(id);
  const start = window.dayStart;
  if (start === null) return [];
  return visible
    .filter((otherId) => {
      if (otherId === id) return false;
      const other = windowById(otherId);
      if (other.dayStart === null) return false;
      const aEnd = window.dayEnd ?? Number.POSITIVE_INFINITY;
      const bEnd = other.dayEnd ?? Number.POSITIVE_INFINITY;
      return start <= bEnd && other.dayStart <= aEnd;
    })
    .map((otherId) => windowById(otherId).label);
}

function checkinForDay(
  checkins: readonly DailyCheckin[],
  lastUseAt: Instant | null,
  day: number,
): CheckinDayNote | null {
  if (lastUseAt === null) return null;
  const match = checkins.find((row) => {
    if (row.usedThc) return false;
    const recorded = parseSubmittedTimestamp(row.recordedAt);
    if (recorded === null) return false;
    return abstinenceDayAt(recorded, lastUseAt) === day;
  });
  if (match === undefined) return null;
  const hasAnyRating =
    match.craving !== null ||
    match.sleep !== null ||
    match.irritability !== null ||
    match.anxiety !== null ||
    match.appetite !== null;
  return {
    craving: match.craving,
    sleep: match.sleep,
    irritability: match.irritability,
    anxiety: match.anxiety,
    appetite: match.appetite,
    hasAnyRating,
  };
}
