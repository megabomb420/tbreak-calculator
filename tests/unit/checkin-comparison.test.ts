import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareCheckins } from '../../src/application/presentation/checkin-comparison.ts';
import type { DailyCheckin } from '../../src/domain/schemas/profile.ts';

function checkin(overrides: Partial<DailyCheckin> & { readonly recordedAt: string }): DailyCheckin {
  return {
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

describe('check-in Then → Now', () => {
  it('treats null as missing, not zero', () => {
    const view = compareCheckins(
      [
        checkin({ recordedAt: '2026-08-01T00:00:00.000Z', craving: null, sleep: 2 }),
        checkin({ recordedAt: '2026-08-10T00:00:00.000Z', craving: 0, sleep: 6 }),
      ],
      { breakDay: 10 },
    );
    const craving = view.comparisons.find((row) => row.field === 'craving');
    const sleep = view.comparisons.find((row) => row.field === 'sleep');
    assert.equal(craving, undefined);
    assert.equal(sleep?.earliestValue, 2);
    assert.equal(sleep?.latestValue, 6);
    assert.equal(sleep?.direction, 'higher');
  });

  it('requires two distinct rated check-ins and does not interpolate', () => {
    const insufficient = compareCheckins(
      [checkin({ recordedAt: '2026-08-01T00:00:00.000Z', craving: 8 })],
      { breakDay: 14 },
    );
    assert.equal(insufficient.available, false);

    const gap = compareCheckins(
      [
        checkin({ recordedAt: '2026-08-01T00:00:00.000Z', craving: 8 }),
        checkin({ recordedAt: '2026-08-03T00:00:00.000Z' }),
        checkin({ recordedAt: '2026-08-12T00:00:00.000Z', craving: 3 }),
      ],
      { breakDay: 14 },
    );
    const craving = gap.comparisons.find((row) => row.field === 'craving');
    assert.equal(craving?.earliestValue, 8);
    assert.equal(craving?.latestValue, 3);
    assert.equal(craving?.direction, 'lower');
  });

  it('does not invent a comparison before the second week or a global score', () => {
    const early = compareCheckins(
      [
        checkin({ recordedAt: '2026-08-01T00:00:00.000Z', craving: 8, irritability: 7 }),
        checkin({ recordedAt: '2026-08-04T00:00:00.000Z', craving: 3, irritability: 2 }),
      ],
      { breakDay: 4 },
    );
    assert.equal(early.available, false);
    const later = compareCheckins(
      [
        checkin({ recordedAt: '2026-08-01T00:00:00.000Z', craving: 8, irritability: 7 }),
        checkin({ recordedAt: '2026-08-10T00:00:00.000Z', craving: 3, irritability: 2 }),
      ],
      { breakDay: 10 },
    );
    assert.equal(later.available, true);
    assert.equal('score' in later, false);
    assert.ok(later.comparisons.every((row) => row.field !== undefined));
  });
});
