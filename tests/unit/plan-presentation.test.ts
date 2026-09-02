import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { abstinenceDayAt } from '../../src/domain/breaks/break-time.ts';
import { MILLIS_PER_DAY, MILLIS_PER_HOUR, toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import { activeBreakView, currentSegmentAnchor, plannedBreakView, trackingDayView } from '../../src/application/presentation/plan-presentation.ts';
import { phaseFocusCopy, phaseKeyForDay } from '../../src/application/presentation/result-presentation.ts';
import type { BreakAttempt } from '../../src/domain/breaks/break-attempt.ts';
import { createBreakAttempt, plannedTargetDate } from '../../src/domain/breaks/break-attempt.ts';
import { createAbstinenceTrack } from '../../src/domain/breaks/abstinence-track.ts';

const C0: Instant = toInstant(1787184000000);
const ANCHOR: Instant = toInstant(C0 - 3 * MILLIS_PER_DAY);

function activeAttempt(): BreakAttempt {
  const planned = createBreakAttempt({
    id: 'attempt-1',
    calculationRecordId: 'calc-1',
    targetDurationDays: 21,
    postBreakMode: 'occasional',
    startedAt: C0,
  });
  return {
    ...planned,
    status: 'active',
    segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
  };
}

describe('abstinence day counter (spec 7.8)', () => {
  it('counts day 1 on the anchor day and N+1 after N full days', () => {
    assert.equal(abstinenceDayAt(C0, C0), 1);
    assert.equal(abstinenceDayAt(toInstant(ANCHOR + 3 * MILLIS_PER_DAY), ANCHOR), 4);
    assert.equal(abstinenceDayAt(toInstant(ANCHOR + 3 * MILLIS_PER_DAY + MILLIS_PER_HOUR), ANCHOR), 4);
    assert.equal(abstinenceDayAt(toInstant(ANCHOR + 4 * MILLIS_PER_DAY), ANCHOR), 5);
  });
});

describe('plan presentation', () => {
  it('derives day-of-target and target date from the anchor, not from UI math', () => {
    const view = activeBreakView(activeAttempt(), C0);
    assert.ok(view !== null);
    assert.equal(view?.dayOfLabel, 'Day 4 of 21');
    assert.equal(view?.targetDate, plannedTargetDate(ANCHOR, 21));
    assert.equal(view?.atOrPastTargetDate, C0 >= plannedTargetDate(ANCHOR, 21));
  });

  it('selects the phase deterministically from breakDay', () => {
    assert.equal(phaseKeyForDay(1), 'days_1_6');
    assert.equal(phaseKeyForDay(6), 'days_1_6');
    assert.equal(phaseKeyForDay(7), 'days_7_14');
    assert.equal(phaseKeyForDay(14), 'days_7_14');
    assert.equal(phaseKeyForDay(15), 'days_15_28');
    assert.equal(phaseKeyForDay(60), 'days_15_28');
    assert.ok(phaseFocusCopy(4).length > 0);
  });

  it('presents a withdrawal strip from the anchor with day statuses', () => {
    const view = activeBreakView(activeAttempt(), C0);
    assert.equal(view?.withdrawal?.breakDay, 4);
    assert.ok(view?.withdrawal?.stops.length === 4);
  });

  it('reads the anchor of the open segment only', () => {
    const attempt = activeAttempt();
    const anchor = currentSegmentAnchor(attempt.segments);
    assert.equal(anchor, ANCHOR);
    assert.equal(currentSegmentAnchor([]), null);
  });

  it('shows completion eligibility only at/after the target date', () => {
    const before = activeBreakView(activeAttempt(), toInstant(plannedTargetDate(ANCHOR, 21) - MILLIS_PER_DAY));
    assert.equal(before?.atOrPastTargetDate, false);
    const on = activeBreakView(activeAttempt(), plannedTargetDate(ANCHOR, 21));
    assert.equal(on?.atOrPastTargetDate, true);
  });

  it('presents a scheduled plan without a live day count', () => {
    const planned = createBreakAttempt({
      id: 'attempt-2',
      calculationRecordId: 'calc-2',
      targetDurationDays: 14,
      postBreakMode: 'undecided',
      startedAt: toInstant(C0 + MILLIS_PER_DAY),
    });
    const view = plannedBreakView(planned, ANCHOR);
    assert.equal(view.status, 'planned');
    assert.equal(view.startDate, toInstant(C0 + MILLIS_PER_DAY));
    assert.equal(view.targetDate, plannedTargetDate(ANCHOR, 14));
  });

  it('tracks open-ended days with no target or completion', () => {
    const track = createAbstinenceTrack({ id: 'track-1', calculationRecordId: null, startedAt: C0, anchor: ANCHOR });
    const view = trackingDayView(track, C0);
    assert.equal(view?.day, 4);
    assert.equal('targetDate' in (view ?? {}), false);
  });
});
