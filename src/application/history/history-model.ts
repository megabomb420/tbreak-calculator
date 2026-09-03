// History timeline model (UX_SPEC §16 step 5). Groups durable records into
// a chronological, user-facing feed. No scientific inference lives here.

import { MILLIS_PER_DAY, parseSubmittedTimestamp, type Instant } from '../../domain/schemas/time.ts';
import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import type { BreakSegment } from '../../domain/breaks/break-attempt.ts';
import type { StoredAttempt } from '../progress/break-attempt-record.ts';
import type { StoredTrack } from '../progress/tracking-record.ts';
import type { CalculationRecord } from '../persistence/calculation-record.ts';
import type { StoredPreviousBreak } from '../persistence/previous-break-store.ts';
import type { CorruptHistoryRow, DurableSnapshot } from '../persistence/durable.ts';
import { checkinRecordId } from '../persistence/ids.ts';
import { presentCalculationRecord } from './present-calculation.ts';

export type HistoryEntryKind =
  | 'calculation'
  | 'attempt'
  | 'tracking'
  | 'checkin'
  | 'previous-break'
  | 'corrupt';

export interface HistoryEntry {
  readonly kind: HistoryEntryKind;
  readonly id: string;
  readonly at: Instant;
  readonly title: string;
  readonly subtitle: string;
  readonly interrupted: boolean;
}

export interface HistoryGroup {
  readonly label: string;
  readonly entries: readonly HistoryEntry[];
}

export interface HistoryModel {
  readonly previousBreaks: readonly HistoryEntry[];
  readonly groups: readonly HistoryGroup[];
  readonly empty: boolean;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function buildHistoryModel(snapshot: DurableSnapshot, now: Instant): HistoryModel {
  const previousBreaks = snapshot.previousBreaks
    .map(previousBreakEntry)
    .slice()
    .sort((a, b) => b.at - a.at);
  const feed: HistoryEntry[] = [
    ...snapshot.calculations.map(calculationEntry),
    ...snapshot.attempts.map((attempt) => attemptEntry(attempt, now)),
    ...snapshot.tracking.map((track) => trackingEntry(track, now)),
    ...snapshot.checkins.map(checkinEntry),
    ...snapshot.corrupt.map(corruptEntry),
  ];
  feed.sort((a, b) => b.at - a.at);
  const groups = groupByMonth(feed);
  return {
    previousBreaks,
    groups,
    empty: previousBreaks.length === 0 && feed.length === 0,
  };
}

function calculationEntry(record: CalculationRecord): HistoryEntry {
  const view = presentCalculationRecord(record);
  let title = 'Calculation';
  let subtitle = 'Saved result';
  switch (view.kind) {
    case 'tolerance_result':
      title = `Recommended break ${view.rangeDays.min}–${view.rangeDays.max} days`;
      subtitle = `Plan for ${view.preferredTargetDays} days`;
      break;
    case 'abstinence_planning':
      title = 'Staying off THC';
      subtitle = 'Open-ended plan';
      break;
    case 'reduction_planning':
      title = 'Cutting down';
      subtitle = 'No full break';
      break;
    case 'baseline_low':
      title = 'Baseline';
      subtitle = 'No break to recommend';
      break;
    case 'detection':
      title = 'Detection basics';
      subtitle = 'Qualitative information only';
      break;
    case 'unavailable':
      title = 'Calculation';
      subtitle = 'Unavailable';
      break;
  }
  return { kind: 'calculation', id: record.id, at: record.calculatedAt, title, subtitle, interrupted: false };
}

function attemptEntry(attempt: StoredAttempt, now: Instant): HistoryEntry {
  const interrupted = attempt.segments.some((segment) => segment.endReason === 'used_thc');
  const lasted = lastedDays(attempt.segments, now);
  const status = attemptStatusLabel(attempt.status);
  const subtitleParts = [status];
  if (lasted !== null) subtitleParts.push(lasted === 1 ? '1 day' : `${lasted} days`);
  if (interrupted) subtitleParts.push('interrupted');
  return {
    kind: 'attempt',
    id: attempt.id,
    at: attemptAnchor(attempt),
    title: `${attempt.targetDurationDays}-day break`,
    subtitle: subtitleParts.join(' · '),
    interrupted,
  };
}

function trackingEntry(track: StoredTrack, now: Instant): HistoryEntry {
  const interrupted = track.segments.some((segment) => segment.endReason === 'used_thc');
  const lasted = lastedDays(track.segments, now);
  const status = track.status === 'ended' ? 'Ended' : track.status === 'interrupted_time_needed' ? 'Paused' : 'Tracking';
  const subtitleParts = [status];
  if (lasted !== null) subtitleParts.push(lasted === 1 ? '1 day' : `${lasted} days`);
  return {
    kind: 'tracking',
    id: track.id,
    at: track.startedAt,
    title: 'Abstinence tracking',
    subtitle: subtitleParts.join(' · '),
    interrupted,
  };
}

function checkinEntry(checkin: DailyCheckin): HistoryEntry {
  const at = parseSubmittedTimestamp(checkin.recordedAt) ?? (0 as Instant);
  const symptoms = [checkin.craving, checkin.sleep, checkin.irritability, checkin.anxiety, checkin.appetite].some(
    (value) => value !== null,
  );
  return {
    kind: 'checkin',
    id: checkinRecordId(checkin.recordedAt),
    at,
    title: 'Check-in',
    subtitle: checkin.usedThc ? 'Used THC' : symptoms ? 'No THC · symptoms logged' : 'No THC',
    interrupted: checkin.usedThc,
  };
}

function previousBreakEntry(record: StoredPreviousBreak): HistoryEntry {
  const at = parseSubmittedTimestamp(record.createdAt) ?? record.updatedAt;
  const score =
    record.toleranceReductionScore === null ? 'Not sure how much it helped' : `Reduction ${record.toleranceReductionScore}/10`;
  return {
    kind: 'previous-break',
    id: record.id,
    at,
    title: record.durationDays === 1 ? 'Past break · 1 day' : `Past break · ${record.durationDays} days`,
    subtitle: score,
    interrupted: false,
  };
}

function corruptEntry(row: CorruptHistoryRow): HistoryEntry {
  return {
    kind: 'corrupt',
    id: row.id,
    at: 0 as Instant,
    title: 'Unavailable',
    subtitle: 'This record could not be read',
    interrupted: false,
  };
}

export function attemptStatusLabel(status: StoredAttempt['status']): string {
  switch (status) {
    case 'planned':
      return 'Scheduled';
    case 'active':
      return 'In progress';
    case 'interrupted_time_needed':
      return 'Paused';
    case 'completed':
      return 'Completed';
    case 'ended':
      return 'Ended early';
  }
}

function attemptAnchor(attempt: StoredAttempt): Instant {
  if (attempt.status === 'completed' || attempt.status === 'ended') return attempt.updatedAt;
  return attempt.startedAt;
}

export function lastedDays(
  segments: readonly { readonly startedFromLastUseAt: Instant; readonly endedAt: Instant | null }[],
  now: Instant,
): number | null {
  if (segments.length === 0) return null;
  let ms = 0;
  for (const segment of segments) {
    const end = segment.endedAt ?? now;
    if (end > segment.startedFromLastUseAt) ms += end - segment.startedFromLastUseAt;
  }
  if (ms <= 0) return 0;
  return Math.max(1, Math.floor(ms / MILLIS_PER_DAY));
}

function groupByMonth(entries: readonly HistoryEntry[]): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  for (const entry of entries) {
    const label = monthLabel(entry.at);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.label === label) {
      groups[groups.length - 1] = { label, entries: [...last.entries, entry] };
    } else {
      groups.push({ label, entries: [entry] });
    }
  }
  return groups;
}

function monthLabel(at: Instant): string {
  if (at === 0) return 'Unavailable';
  const date = new Date(at);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function findCalculation(snapshot: DurableSnapshot, id: string): CalculationRecord | null {
  return snapshot.calculations.find((item) => item.id === id) ?? null;
}

export function findAttempt(snapshot: DurableSnapshot, id: string): StoredAttempt | null {
  return snapshot.attempts.find((item) => item.id === id) ?? null;
}

export function findTracking(snapshot: DurableSnapshot, id: string): StoredTrack | null {
  return snapshot.tracking.find((item) => item.id === id) ?? null;
}

export function findPreviousBreak(snapshot: DurableSnapshot, id: string): StoredPreviousBreak | null {
  return snapshot.previousBreaks.find((item) => item.id === id) ?? null;
}

export function findCheckin(snapshot: DurableSnapshot, id: string): DailyCheckin | null {
  return snapshot.checkins.find((item) => checkinRecordId(item.recordedAt) === id) ?? null;
}

export function findCorrupt(snapshot: DurableSnapshot, id: string): CorruptHistoryRow | null {
  return snapshot.corrupt.find((item) => item.id === id) ?? null;
}

export function checkinsInWindow(
  checkins: readonly DailyCheckin[],
  start: Instant,
  end: Instant,
): readonly DailyCheckin[] {
  return checkins.filter((checkin) => {
    const at = parseSubmittedTimestamp(checkin.recordedAt);
    if (at === null) return false;
    return at >= start && at <= end;
  });
}

export function checkinsForAttempt(snapshot: DurableSnapshot, attempt: StoredAttempt, now: Instant): readonly DailyCheckin[] {
  const end = attempt.status === 'active' || attempt.status === 'interrupted_time_needed' ? now : attempt.updatedAt;
  return checkinsInWindow(snapshot.checkins, attempt.createdAt, end);
}

export function checkinsForTracking(snapshot: DurableSnapshot, track: StoredTrack, now: Instant): readonly DailyCheckin[] {
  const end = track.status === 'ended' ? track.updatedAt : now;
  return checkinsInWindow(snapshot.checkins, track.createdAt, end);
}

export function segmentLabel(segment: BreakSegment): string {
  if (segment.endReason === 'used_thc') return 'Interrupted · used THC';
  if (segment.endReason === 'completed') return 'Completed';
  if (segment.endReason === 'user_ended') return 'Ended';
  return 'Open';
}
