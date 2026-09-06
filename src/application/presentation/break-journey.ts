// BreakJourney presentation — one shared vertical path (Start → phases →
// Target) rendered by both the Calculator result and Today. This module is a
// pure transform over BreakOutlookView: phases, labels and expectations come
// from EvidenceGuidanceV1 via the outlook; it never invents days, windows, or
// symptom predictions.

import {
  windowById,
  type WithdrawalWindowId,
} from '../../domain/guidance/evidence-guidance-v1.ts';
import type {
  BreakOutlookView,
  OutlookDayStatus,
  OutlookDayView,
} from './break-outlook.ts';

export type JourneyLegStatus = 'past' | 'current' | 'future' | 'preview';

export interface JourneyDayView {
  readonly day: number;
  readonly status: OutlookDayStatus;
  /** A saved check-in exists for this day (ratings optional). */
  readonly hasCheckin: boolean;
}

export interface JourneyLegView {
  readonly id: WithdrawalWindowId;
  /** Evidence range label, e.g. "Days 2–6". */
  readonly label: string;
  readonly headline: string;
  readonly context: string;
  readonly mayNotice: readonly string[];
  readonly canHelp: readonly string[];
  readonly status: JourneyLegStatus;
  /** Exact days this leg hosts on the path (the leg's label stays the
   * evidence range; windows overlap, days do not). */
  readonly fromDay: number;
  readonly toDay: number;
  readonly days: readonly JourneyDayView[];
}

export interface BreakJourneyView {
  readonly targetDays: number | null;
  readonly openEnded: boolean;
  readonly currentDay: number | null;
  /** Preview = no live position (Calculator result, planned break). */
  readonly preview: boolean;
  readonly legs: readonly JourneyLegView[];
  readonly populationNote: string;
}

export function presentBreakJourney(
  view: BreakOutlookView,
  options: { readonly preview?: boolean } = {},
): BreakJourneyView {
  const preview = options.preview === true || view.currentDay === null;
  const currentDay = preview ? null : view.currentDay;
  const legs: JourneyLegView[] = [];
  for (const day of view.days) {
    const last = legs[legs.length - 1];
    if (last !== undefined && last.id === day.primaryWindowId) {
      legs[legs.length - 1] = {
        ...last,
        toDay: day.day,
        days: [...last.days, toJourneyDay(day)],
      };
    } else {
      legs.push({
        id: day.primaryWindowId,
        label: windowById(day.primaryWindowId).label,
        headline: day.headline,
        context: windowById(day.primaryWindowId).context,
        mayNotice: day.mayNotice,
        canHelp: day.canHelp,
        status: 'future',
        fromDay: day.day,
        toDay: day.day,
        days: [toJourneyDay(day)],
      });
    }
  }
  return {
    targetDays: view.targetDays,
    openEnded: view.openEnded,
    currentDay,
    preview,
    legs: legs.map((leg) => ({ ...leg, status: legStatus(leg, currentDay, preview) })),
    populationNote: view.populationNote,
  };
}

function toJourneyDay(day: OutlookDayView): JourneyDayView {
  return {
    day: day.day,
    status: day.status,
    hasCheckin: day.checkin !== null,
  };
}

function legStatus(
  leg: JourneyLegView,
  currentDay: number | null,
  preview: boolean,
): JourneyLegStatus {
  if (preview || currentDay === null) return 'preview';
  if (currentDay >= leg.fromDay && currentDay <= leg.toDay) return 'current';
  if (leg.toDay < currentDay) return 'past';
  return 'future';
}
