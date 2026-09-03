import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupOutlookDays,
  outlookDaysEquivalent,
  outlookRangeLabel,
  presentBreakOutlook,
  segmentContainsDay,
  segmentForDay,
  type OutlookDayView,
} from '../../src/application/presentation/break-outlook.ts';
import type { ExposureContext } from '../../src/domain/guidance/break-outlook.ts';

function exposure(overrides: Partial<ExposureContext> = {}): ExposureContext {
  return {
    useDaysLast30: null,
    sessionsPerUseDay: null,
    products: [],
    routes: [],
    currentPatternDuration: null,
    ...overrides,
  };
}

function outlookOf(input: {
  targetDays?: number | null;
  openEnded?: boolean;
  currentDay?: number | null;
}) {
  return presentBreakOutlook({
    targetDays: input.targetDays ?? 28,
    openEnded: input.openEnded ?? false,
    currentDay: input.currentDay ?? null,
    exposure: exposure(),
  });
}

function day(overrides: Partial<OutlookDayView> & { readonly day: number }): OutlookDayView {
  return {
    status: 'preview',
    primaryWindowId: 'days_7_14',
    windowIds: ['days_7_14'],
    stageLabel: 'Days 7–14',
    headline: 'Acute symptoms commonly ease',
    mayNotice: ['Sleep can still be disrupted'],
    canHelp: ['Keep regular sleep and meal timing'],
    whatMatters: 'Acute symptoms commonly ease here.',
    comesNext: 'Later days shift toward habits.',
    milestoneTitle: null,
    milestoneBody: null,
    checkin: null,
    tone: 'typical',
    ...overrides,
  };
}

describe('break outlook grouping (presentation only; exact days preserved)', () => {
  it('merges only consecutive days with equivalent guidance on a 28-day journey', () => {
    const view = outlookOf({ targetDays: 28 });
    assert.deepEqual(
      view.segments.map((segment) => segment.label),
      [
        'Day 1',
        'Days 2–3',
        'Days 4–6',
        'Day 7',
        'Days 8–13',
        'Day 14',
        'Days 15–20',
        'Day 21',
        'Days 22–27',
        'Day 28',
      ],
    );
  });

  it('keeps milestone days (7/14/21/28) as single-day segments', () => {
    const view = outlookOf({ targetDays: 28 });
    for (const milestone of [7, 14, 21, 28]) {
      const segment = segmentForDay(view.segments, milestone);
      assert.ok(segment !== null && segment.startDay === milestone && segment.endDay === milestone, `day ${milestone}`);
    }
  });

  it('does not lose, duplicate, or skip any day and covers the whole finite target', () => {
    for (const target of [7, 14, 21, 28]) {
      const view = outlookOf({ targetDays: target });
      const members = view.segments.flatMap((segment) => segment.members);
      assert.equal(members.length, view.days.length, `target ${target}`);
      assert.equal(members.length, target, `target ${target}`);
      assert.deepEqual(
        members.map((member) => member.day),
        view.days.map((day) => day.day),
        `target ${target}`,
      );
      assert.equal(view.segments[0]?.startDay, 1, `target ${target}`);
      assert.equal(view.segments[view.segments.length - 1]?.endDay, target, `target ${target}`);
      for (let i = 1; i < view.segments.length; i += 1) {
        const prev = view.segments[i - 1];
        const next = view.segments[i];
        if (prev === undefined || next === undefined) continue;
        assert.equal(next.startDay, prev.endDay + 1, `target ${target}`);
      }
    }
  });

  it('terminates correctly for every finite target and never invents days beyond it', () => {
    for (const target of [7, 14, 21, 28]) {
      const view = outlookOf({ targetDays: target });
      assert.equal(view.targetDays, target);
      assert.equal(view.segments[view.segments.length - 1]?.endDay, target);
    }
    assert.equal(outlookOf({ openEnded: true }).segments[0]?.startDay, 1);
    assert.equal(outlookOf({ openEnded: true }).segments.at(-1)?.endDay, 28);
    assert.equal(outlookOf({ openEnded: true }).openEnded, true);
  });

  it('maps an exact breakDay into its correct grouped segment', () => {
    const view = outlookOf({ targetDays: 28 });
    const seg5 = segmentForDay(view.segments, 5);
    assert.equal(seg5?.startDay, 4);
    assert.equal(seg5?.endDay, 6);
    const seg15 = segmentForDay(view.segments, 15);
    assert.equal(seg15?.startDay, 15);
    assert.equal(seg15?.endDay, 20);
    const seg28 = segmentForDay(view.segments, 28);
    assert.equal(seg28?.startDay, 28);
    assert.equal(seg28?.endDay, 28);
  });

  it('marks a multi-day segment current when it contains the exact current day', () => {
    const view = outlookOf({ targetDays: 21, currentDay: 5 });
    const seg = segmentForDay(view.segments, 5);
    assert.equal(seg?.status, 'current');
    assert.equal(seg?.startDay, 4);
    assert.equal(seg?.endDay, 6);
    assert.equal(segmentContainsDay(seg!, 5), true);
    // The exact per-day model still knows the real day.
    const exactDay = view.days.find((row) => row.day === 5);
    assert.equal(exactDay?.status, 'current');
  });

  it('keeps a day with its own check-in outside a merge', () => {
    const withCheckin = day({
      day: 6,
      checkin: {
        craving: 3,
        sleep: null,
        irritability: null,
        anxiety: null,
        appetite: null,
        hasAnyRating: true,
      },
    });
    const plain = day({ day: 5 });
    assert.equal(outlookDaysEquivalent(plain, withCheckin), false);
    const grouped = groupOutlookDays([
      day({ day: 4 }),
      day({ day: 5 }),
      withCheckin,
      day({ day: 7 }),
    ]);
    assert.deepEqual(grouped.map((segment) => segment.label), ['Days 4–5', 'Day 6', 'Day 7']);
  });

  it('considers day number and past/current status irrelevant to equivalence', () => {
    const a = day({ day: 4, status: 'past' });
    const b = day({ day: 5, status: 'future' });
    assert.equal(outlookDaysEquivalent(a, b), true);
  });

  it('never merges days whose meaningful content differs or that are not consecutive', () => {
    const changed = day({ day: 6, headline: 'Different headline' });
    const grouped = groupOutlookDays([day({ day: 5 }), changed, day({ day: 8, ...{} })]);
    // content change prevents merge; non-consecutive equal-looking days never merge.
    assert.deepEqual(grouped.map((segment) => segment.label), ['Day 5', 'Day 6', 'Day 8']);
  });

  it('labels single days and ranges with the human format', () => {
    assert.equal(outlookRangeLabel(1, 1), 'Day 1');
    assert.equal(outlookRangeLabel(4, 6), 'Days 4–6');
  });

  it('cannot change recommendation or target (grouping is a view transform)', () => {
    const view = outlookOf({ targetDays: 21, currentDay: 9 });
    assert.equal(view.targetDays, 21);
    assert.equal(view.days.length, 21);
    assert.equal(view.segments.length <= view.days.length, true);
    // Segment statuses never overwrite exact day statuses.
    const current = view.days.find((row) => row.status === 'current');
    assert.equal(current?.day, 9);
  });
});
