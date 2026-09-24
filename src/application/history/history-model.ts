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
import { formatLocalDay } from '../presentation/format.ts';
import type { ReductionPlan } from '../../domain/reduction/reduction-engine.ts';

export type HistoryEntryKind =
  | 'calculation'
  | 'attempt'
  | 'tracking'
  | 'reduction'
  | 'checkin'
  | 'previous-break'
  | 'corrupt';

export interface HistoryEntry {
  readonly kind: HistoryEntryKind;
  readonly id: string;
  /** Ordering instant: the record's own moment (started / calculated / recorded). */
  readonly at: Instant;
  /** Row date line: the local day of `at`, e.g. "17 Sep 2026", so entries in
   * one section stay distinguishable after grouping. Labelled when the day is
   * not the record's own event (a past break reads "Saved 17 Sep 2026",
   * because it is ordered by when it was recorded). Null when the record has
   * no usable timestamp (the 0 sentinel of unreadable and malformed rows). */
  readonly dateLabel: string | null;
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

export function buildHistoryModel(snapshot: DurableSnapshot, now: Instant): HistoryModel {
  // Past breaks are listed exactly once, in their own top section: they are
  // deliberately kept out of the grouped feed so a past break can never appear
  // twice (the "Breaks" section holds attempts and tracking runs only).
  const previousBreaks = snapshot.previousBreaks
    .map(previousBreakEntry)
    .slice()
    .sort((a, b) => b.at - a.at);
  const feed: HistoryEntry[] = [
    ...snapshot.calculations.map(calculationEntry),
    ...snapshot.attempts.map((attempt) => attemptEntry(attempt, now)),
    ...snapshot.tracking.map((track) => trackingEntry(track, now)),
    ...snapshot.reductionRecords.map(reductionEntry),
    ...snapshot.checkins.map(checkinEntry),
    ...snapshot.corrupt.map(corruptEntry),
  ];
  feed.sort((a, b) => b.at - a.at);
  const groups = groupBySection(feed);
  return {
    previousBreaks,
    groups,
    empty: previousBreaks.length === 0 && feed.length === 0,
  };
}

export function reductionStatusLabel(plan: ReductionPlan): string {
  return plan.status === 'ended' ? 'Ended' : plan.status === 'paused' ? 'Paused' : 'In progress';
}

/** Local calendar day for a row, or null when the record carries no readable
 * timestamp (ordering falls back to the 0 sentinel for those rows). */
function localDay(at: Instant): string | null {
  return at > 0 ? formatLocalDay(at) : null;
}

function reductionEntry(plan: ReductionPlan): HistoryEntry {
  const count = plan.events.length;
  const at = plan.status === 'ended' ? plan.updatedAt : plan.startedAt;
  return {
    kind: 'reduction', id: plan.id,
    at,
    dateLabel: localDay(at),
    title: 'Cut-down plan',
    subtitle: `${reductionStatusLabel(plan)} · ${count} ${count === 1 ? 'session' : 'sessions'} logged`,
    interrupted: false,
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
  return { kind: 'calculation', id: record.id, at: record.calculatedAt, dateLabel: localDay(record.calculatedAt), title, subtitle, interrupted: false };
}

function attemptEntry(attempt: StoredAttempt, now: Instant): HistoryEntry {
  const interrupted = attempt.segments.some((segment) => segment.endReason === 'used_thc');
  const status = attemptStatusLabel(attempt.status);
  // Two honest numbers, each labelled: the plan's length and the elapsed run.
  const subtitleParts = [status];
  const lived = elapsedPhrase(attempt.segments, now, attempt.status === 'active' || attempt.status === 'interrupted_time_needed');
  if (lived !== null) subtitleParts.push(lived);
  if (interrupted) subtitleParts.push('interrupted');
  const at = attemptAnchor(attempt);
  return {
    kind: 'attempt',
    id: attempt.id,
    at,
    dateLabel: localDay(at),
    title: `${durationLabel(attempt.targetDurationDays)} planned`,
    subtitle: subtitleParts.join(' · '),
    interrupted,
  };
}

function trackingEntry(track: StoredTrack, now: Instant): HistoryEntry {
  const interrupted = track.segments.some((segment) => segment.endReason === 'used_thc');
  const status = track.status === 'ended' ? 'Ended' : track.status === 'interrupted_time_needed' ? 'Paused' : 'Tracking';
  const subtitleParts = [status];
  const lived = elapsedPhrase(track.segments, now, track.status !== 'ended');
  if (lived !== null) subtitleParts.push(lived);
  return {
    kind: 'tracking',
    id: track.id,
    at: track.startedAt,
    dateLabel: localDay(track.startedAt),
    title: 'Abstinence tracking',
    subtitle: subtitleParts.join(' · '),
    interrupted,
  };
}

function checkinEntry(checkin: DailyCheckin): HistoryEntry {
  // A malformed stamp keeps the 0 ordering sentinel and shows no date; other
  // rows sort and read by the moment the check-in was recorded.
  const recorded = parseSubmittedTimestamp(checkin.recordedAt);
  const at = recorded ?? (0 as Instant);
  const symptoms = [checkin.craving, checkin.sleep, checkin.irritability, checkin.anxiety, checkin.appetite].some(
    (value) => value !== null,
  );
  return {
    kind: 'checkin',
    id: checkinRecordId(checkin.recordedAt),
    at,
    dateLabel: localDay(at),
    title: 'Check-in',
    subtitle: checkin.usedThc ? 'Used THC' : symptoms ? 'No THC · symptoms logged' : 'No THC',
    interrupted: checkin.usedThc,
  };
}

function previousBreakEntry(record: StoredPreviousBreak): HistoryEntry {
  // Ordered and dated by when the observation was saved — the break's own end
  // date is optional and lives in the edit sheet — so the row says which day
  // its date is instead of letting it read as the day of the break.
  const at = parseSubmittedTimestamp(record.createdAt) ?? record.updatedAt;
  const day = at > 0 ? formatLocalDay(at) : null;
  const score =
    record.toleranceReductionScore === null ? 'Not sure how much it helped' : `Reduction ${record.toleranceReductionScore}/10`;
  return {
    kind: 'previous-break',
    id: record.id,
    at,
    dateLabel: day === null ? null : `Saved ${day}`,
    title: `Past break · ${durationLabel(record.durationDays)}`,
    subtitle: score,
    interrupted: false,
  };
}

function corruptEntry(row: CorruptHistoryRow): HistoryEntry {
  return {
    kind: 'corrupt',
    id: row.id,
    at: 0 as Instant,
    dateLabel: null,
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

/** Milliseconds lived across a record's segments: every closed segment plus the
 * open one measured up to `now`. */
function livedMilliseconds(
  segments: readonly { readonly startedFromLastUseAt: Instant; readonly endedAt: Instant | null }[],
  now: Instant,
): number {
  let ms = 0;
  for (const segment of segments) {
    const end = segment.endedAt ?? now;
    if (end > segment.startedFromLastUseAt) ms += end - segment.startedFromLastUseAt;
  }
  return ms;
}

/**
 * Complete 24-hour periods lived, for the row labels: 0 while the first day is
 * still running, so a row never claims a day it has not lived. Day *position*
 * ("Day 1") is a different number, rendered by the day labels, not by this
 * count. Null when there is no segment to measure.
 */
export function completeDaysLived(
  segments: readonly { readonly startedFromLastUseAt: Instant; readonly endedAt: Instant | null }[],
  now: Instant,
): number | null {
  if (segments.length === 0) return null;
  return Math.floor(livedMilliseconds(segments, now) / MILLIS_PER_DAY);
}

/**
 * Whole days to record for a run that was lived: once any time has elapsed the
 * count floors at one day, because a stored previous-break observation is a
 * whole-day number (`durationDays >= 1`) — never "0 days". Null when there is
 * no segment at all, which lets the caller keep the plan's target instead.
 */
export function lastedDays(
  segments: readonly { readonly startedFromLastUseAt: Instant; readonly endedAt: Instant | null }[],
  now: Instant,
): number | null {
  if (segments.length === 0) return null;
  const ms = livedMilliseconds(segments, now);
  return ms <= 0 ? 0 : Math.max(1, Math.floor(ms / MILLIS_PER_DAY));
}

/**
 * The elapsed part of a row's subtitle: complete days only, and "so far" only
 * while the run is still open — a finished run states what it lasted instead
 * of implying the clock is still counting. Null before anything has started.
 */
function elapsedPhrase(
  segments: readonly { readonly startedFromLastUseAt: Instant; readonly endedAt: Instant | null }[],
  now: Instant,
  running: boolean,
): string | null {
  const days = completeDaysLived(segments, now);
  if (days === null) return null;
  const lived = days === 0 ? 'Less than a day' : durationLabel(days);
  return running ? `${lived} so far` : lived;
}

/**
 * Sections by record family, newest first inside each: what you logged, what
 * the app recommended, the breaks you ran, and your cut-down plans. Records
 * that cannot be read still appear so nothing is hidden by silence.
 *
 * The "Breaks" label is shared by attempts, tracking runs and past breaks, but
 * only attempts and tracking runs reach the feed: past breaks render once, in
 * their own list above the sections (`buildHistoryModel` keeps them out).
 */
const SECTION_ORDER: readonly { readonly kind: HistoryEntryKind; readonly label: string }[] = [
  { kind: 'checkin', label: 'Check-ins' },
  { kind: 'calculation', label: 'Recommendations' },
  { kind: 'attempt', label: 'Breaks' },
  { kind: 'tracking', label: 'Breaks' },
  { kind: 'previous-break', label: 'Breaks' },
  { kind: 'reduction', label: 'Cutting down' },
  { kind: 'corrupt', label: 'Unavailable records' },
];

function groupBySection(entries: readonly HistoryEntry[]): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  const seen = new Set<string>();
  for (const section of SECTION_ORDER) {
    if (seen.has(section.label)) continue;
    seen.add(section.label);
    const rows = entries.filter((entry) => SECTION_ORDER.find((item) => item.kind === entry.kind)?.label === section.label);
    if (rows.length > 0) groups.push({ label: section.label, entries: rows });
  }
  return groups;
}

/** One wording for a duration: "1 day" / "14 days". */
export function durationLabel(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
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
