import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MILLIS_PER_DAY, toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import { emptyDurableSnapshot, type DurableSnapshot } from '../../src/application/persistence/durable.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import {
  buildHistoryModel,
  completeDaysLived,
  lastedDays,
  type HistoryEntry,
  type HistoryModel,
} from '../../src/application/history/history-model.ts';
import { formatLocalDay } from '../../src/application/presentation/format.ts';
import type { StoredPreviousBreak } from '../../src/application/persistence/previous-break-store.ts';
import type { StoredAttempt } from '../../src/application/progress/break-attempt-record.ts';
import { sampleProfile } from '../helpers.ts';

/** 2026-08-20T00:00:00Z. */
const AT = toInstant(1787184000000);
const HOUR = 3_600_000;

function storedAttempt(overrides: Partial<StoredAttempt> & Pick<StoredAttempt, 'id' | 'status' | 'segments'>): StoredAttempt {
  return {
    calculationRecordId: null,
    targetDurationDays: 21,
    postBreakMode: null,
    startedAt: AT,
    postBreakPlan: null,
    preparation: null,
    completionAcknowledged: false,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

function previousBreak(createdAt: string): StoredPreviousBreak {
  return {
    id: 'pb-1',
    durationDays: 14,
    toleranceReductionScore: 8,
    endedAt: null,
    createdAt,
    updatedAt: AT,
  };
}

function entries(model: HistoryModel): readonly HistoryEntry[] {
  return model.groups.flatMap((group) => group.entries);
}

describe('history model', () => {
  it('groups activity into sections by record family, with past breaks listed exactly once', () => {
    const frozen = freezeCalculation('calc-1', { kind: 'use_profile', profile: sampleProfile() }, AT);
    const model = buildHistoryModel(
      {
        ...emptyDurableSnapshot(),
        calculations: [frozen],
        previousBreaks: [previousBreak('2026-08-01T00:00:00Z')],
        attempts: [
          storedAttempt({
            id: 'attempt-1',
            status: 'completed',
            calculationRecordId: 'calc-1',
            segments: [{ startedFromLastUseAt: AT, endedAt: AT, endReason: 'completed' }],
          }),
        ],
        corrupt: [{ id: 'bad', kind: 'calculation', reason: 'invalid-record' }],
      },
      AT,
    );
    assert.equal(model.empty, false);
    assert.equal(model.previousBreaks.length, 1);
    assert.equal(model.previousBreaks[0]?.kind, 'previous-break');
    // One section per record family, in reading order, and a break's own row
    // states its plan length and the elapsed run as separate numbers.
    assert.deepEqual(model.groups.map((group) => group.label), ['Recommendations', 'Breaks', 'Unavailable records']);
    const kinds = entries(model).map((entry) => entry.kind);
    assert.ok(kinds.includes('calculation'));
    assert.ok(kinds.includes('attempt'));
    assert.ok(kinds.includes('corrupt'));
    // Past breaks are their own list: the "Breaks" section carries no copy of
    // them, so a past break is never rendered twice.
    assert.ok(!kinds.includes('previous-break'));
    const breakEntry = model.groups.find((group) => group.label === 'Breaks')!.entries[0]!;
    assert.match(breakEntry.title, /^21 days/);
    assert.match(breakEntry.subtitle, /^Completed/);
  });

  it('dates every readable row with the shared local-day formatter, newest first', () => {
    const frozen = freezeCalculation('calc-1', { kind: 'use_profile', profile: sampleProfile() }, AT);
    const yesterday = new Date(AT - MILLIS_PER_DAY).toISOString();
    const model = buildHistoryModel(
      {
        ...emptyDurableSnapshot(),
        calculations: [frozen],
        checkins: [
          {
            recordedAt: yesterday,
            craving: null,
            sleep: null,
            irritability: null,
            anxiety: null,
            appetite: null,
            usedThc: false,
            usedAt: null,
            note: null,
          },
          {
            recordedAt: new Date(AT).toISOString(),
            craving: null,
            sleep: null,
            irritability: null,
            anxiety: null,
            appetite: null,
            usedThc: true,
            usedAt: null,
            note: null,
          },
        ],
        attempts: [
          storedAttempt({
            id: 'attempt-1',
            status: 'active',
            targetDurationDays: 21,
            segments: [{ startedFromLastUseAt: AT, endedAt: null, endReason: null }],
          }),
        ],
        previousBreaks: [previousBreak('2026-08-18T09:00:00Z')],
      },
      toInstant(AT + 2 * HOUR),
    );

    for (const entry of [...model.previousBreaks, ...entries(model)]) {
      assert.ok(
        entry.dateLabel !== null && entry.dateLabel.endsWith(formatLocalDay(entry.at)),
        `${entry.kind}:${entry.id} date follows its instant`,
      );
    }
    const checkinRows = model.groups.find((group) => group.label === 'Check-ins')!.entries;
    assert.equal(checkinRows.length, 2);
    // Two check-ins a day apart are distinguishable by their row date.
    assert.notEqual(checkinRows[0]!.dateLabel, checkinRows[1]!.dateLabel);
    assert.ok(checkinRows[0]!.at > checkinRows[1]!.at, 'newest first inside the section');
    // A past break is ordered by when it was recorded, so its date says so
    // instead of reading as the day of the break.
    assert.equal(model.previousBreaks[0]!.dateLabel, `Saved ${formatLocalDay(toInstant(Date.parse('2026-08-18T09:00:00Z')))}`);
  });

  it('counts complete days lived, never the day a run has merely entered', () => {
    const open = [{ startedFromLastUseAt: AT, endedAt: null, endReason: null }];
    assert.equal(completeDaysLived(open, toInstant(AT + 5 * 60_000)), 0, 'five minutes is not a day');
    assert.equal(completeDaysLived(open, toInstant(AT + 23 * HOUR)), 0, '23 hours is not a day');
    assert.equal(completeDaysLived(open, toInstant(AT + MILLIS_PER_DAY)), 1);
    assert.equal(completeDaysLived(open, toInstant(AT + 49 * HOUR)), 2, 'complete days only, floor');
    assert.equal(completeDaysLived([], AT), null, 'nothing lived yet');

    // The stored-observation count is a different contract: a recorded past
    // break is a whole-day number, so any real run floors at one day.
    assert.equal(lastedDays(open, toInstant(AT + 5 * 60_000)), 1);
    assert.equal(lastedDays(open, toInstant(AT + 49 * HOUR)), 2);
    assert.equal(lastedDays([], AT), null);

    const live = storedAttempt({ id: 'attempt-live', status: 'active', segments: open });
    const done = storedAttempt({
      id: 'attempt-done',
      status: 'completed',
      segments: [{ startedFromLastUseAt: AT, endedAt: toInstant(AT + 3 * MILLIS_PER_DAY), endReason: 'completed' }],
    });
    const model = buildHistoryModel({ ...emptyDurableSnapshot(), attempts: [live, done] }, toInstant(AT + 5 * 60_000));
    const rows = model.groups.find((group) => group.label === 'Breaks')!.entries;
    const liveRow = rows.find((row) => row.id === 'attempt-live')!;
    // The stored target is untouched and still stated as the plan length, and
    // the elapsed figure never claims a full day that has not been lived.
    assert.match(liveRow.title, /^21 days/, 'the stored target stays the plan length');
    assert.doesNotMatch(liveRow.subtitle, /\d+ days?\b/, 'no day figure before a day is lived');
    assert.match(liveRow.subtitle, /less than a day/i);
    const doneRow = rows.find((row) => row.id === 'attempt-done')!;
    assert.match(doneRow.subtitle, /\b3 days\b/);
    assert.doesNotMatch(doneRow.subtitle, /so far/, 'a finished run is not still counting');
  });

  it('keeps unreadable and malformed rows in place, undated, without touching stored values', () => {
    const snapshot: DurableSnapshot = {
      ...emptyDurableSnapshot(),
      checkins: [
        {
          recordedAt: 'not-a-timestamp',
          craving: null,
          sleep: null,
          irritability: null,
          anxiety: null,
          appetite: null,
          usedThc: false,
          usedAt: null,
          note: null,
        },
      ],
      corrupt: [{ id: 'bad', kind: 'calculation', reason: 'invalid-record' }],
    };
    const before = structuredClone(snapshot);
    const model = buildHistoryModel(snapshot, AT);

    const checkinRow = model.groups.find((group) => group.label === 'Check-ins')!.entries[0]!;
    assert.equal(checkinRow.dateLabel, null, 'no readable stamp, no date');
    assert.equal(checkinRow.at, 0 as Instant, 'undated rows keep the ordering sentinel');
    const corruptRow = model.groups.find((group) => group.label === 'Unavailable records')!.entries[0]!;
    assert.equal(corruptRow.dateLabel, null);
    assert.deepEqual(snapshot, before, 'the projection never rewrites stored records');
  });
});
