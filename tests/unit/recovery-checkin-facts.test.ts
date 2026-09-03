// Personal check-in facts mapping for the live recovery outlook (0.9.0).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import type { DailyCheckin } from '../../src/domain/schemas/profile.ts';
import type { StoredAttempt } from '../../src/application/progress/break-attempt-record.ts';
import { checkinRowsForBreakContext } from '../../src/application/presentation/recovery-checkin-facts.ts';
import { highestCravingObservation, hasMeaningfulCheckinData, sleepFirstToLaterChange } from '../../src/domain/checkins/checkin-summary.ts';

const DAY = 24 * 60 * 60 * 1000;
const ANCHOR = toInstant(Date.parse('2026-05-01T12:00:00.000Z'));
const COMPLETED_AT = toInstant(Date.parse('2026-05-15T12:00:00.000Z'));
const NOW = toInstant(Date.parse('2026-05-20T12:00:00.000Z'));

function iso(at: Instant): string {
  return new Date(at).toISOString();
}

function checkin(daysAfterAnchor: number, overrides: Partial<DailyCheckin> = {}): DailyCheckin {
  return {
    recordedAt: iso(toInstant(ANCHOR + daysAfterAnchor * DAY)),
    craving: null,
    sleep: null,
    irritability: null,
    anxiety: null,
    appetite: null,
    usedThc: false,
    usedAt: null,
    note: null,
    ...overrides,
  };
}

function completedAttempt(overrides: Partial<StoredAttempt> = {}): StoredAttempt {
  return {
    id: 'attempt-1',
    status: 'completed',
    calculationRecordId: 'calc-1',
    targetDurationDays: 14,
    postBreakMode: 'occasional',
    startedAt: ANCHOR,
    segments: [{ startedFromLastUseAt: ANCHOR, endedAt: COMPLETED_AT, endReason: 'completed' }],
    postBreakPlan: null,
    preparation: null,
    completionAcknowledged: true,
    createdAt: ANCHOR,
    updatedAt: COMPLETED_AT,
    ...overrides,
  };
}

describe('checkin rows for the live break context', () => {
  it('maps no-use check-ins inside the single-segment window to break days', () => {
    const rows = checkinRowsForBreakContext({
      checkins: [
        checkin(2, { craving: 4 }),
        checkin(6, { craving: 8, sleep: 5 }),
        checkin(10, { sleep: 7 }),
      ],
      attempts: [completedAttempt()],
      now: NOW,
    });
    assert.ok(rows !== null);
    assert.equal(rows.length, 3);
    // Two days after the anchor => Day 3; six days => Day 7; ten days => Day 11.
    assert.deepEqual(rows.map((row) => row.breakDay), [3, 7, 11]);
    assert.deepEqual(rows.map((row) => row.craving), [4, 8, null]);
    assert.deepEqual(rows.map((row) => row.sleep), [null, 5, 7]);
  });

  it('never includes a used-THC check-in in the abstinence rows', () => {
    const rows = checkinRowsForBreakContext({
      checkins: [checkin(3, { craving: 6 }), checkin(4, { usedThc: true })],
      attempts: [completedAttempt()],
      now: NOW,
    });
    assert.ok(rows !== null);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.craving, 6);
  });

  it('omits check-ins outside the attempt window (before it started / after it ended)', () => {
    const rows = checkinRowsForBreakContext({
      checkins: [checkin(-5, { craving: 2 }), checkin(40, { craving: 9 })],
      attempts: [completedAttempt()],
      now: NOW,
    });
    assert.equal(rows, null);
  });

  it('returns null when the attempt context is not cleanly derivable', () => {
    const multiSegment = completedAttempt({
      segments: [
        { startedFromLastUseAt: ANCHOR, endedAt: toInstant(ANCHOR + 3 * DAY), endReason: 'used_thc' },
        { startedFromLastUseAt: toInstant(ANCHOR + 3 * DAY), endedAt: COMPLETED_AT, endReason: 'completed' },
      ],
    });
    assert.equal(
      checkinRowsForBreakContext({ checkins: [checkin(2, { craving: 4 })], attempts: [multiSegment], now: NOW }),
      null,
    );
    assert.equal(checkinRowsForBreakContext({ checkins: [checkin(2)], attempts: [], now: NOW }), null);
    const activeAttempt = completedAttempt({
      status: 'active',
      segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
      updatedAt: NOW,
    });
    const activeRows = checkinRowsForBreakContext({ checkins: [checkin(2, { craving: 4 })], attempts: [activeAttempt], now: NOW });
    assert.ok(activeRows !== null);
    assert.equal(activeRows[0]?.breakDay, 3);
  });

  it('leaves meaningful-fact decisions to the domain summary helpers', () => {
    const rows = checkinRowsForBreakContext({
      checkins: [checkin(1, { craving: 3 }), checkin(2, { craving: 3 }), checkin(3, { sleep: 6 }), checkin(4, { sleep: 8 })],
      attempts: [completedAttempt()],
      now: NOW,
    });
    assert.ok(rows !== null);
    assert.equal(hasMeaningfulCheckinData(rows), true);
    assert.deepEqual(highestCravingObservation(rows), { day: 2, craving: 3 });
    assert.deepEqual(sleepFirstToLaterChange(rows), { firstDay: 4, firstValue: 6, laterDay: 5, laterValue: 8 });
  });
});
