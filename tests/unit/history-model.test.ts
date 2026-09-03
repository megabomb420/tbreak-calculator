import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toInstant } from '../../src/domain/schemas/time.ts';
import { emptyDurableSnapshot } from '../../src/application/persistence/durable.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import { buildHistoryModel } from '../../src/application/history/history-model.ts';
import { sampleProfile } from '../helpers.ts';

const AT = toInstant(1787184000000);

describe('history model', () => {
  it('groups activity by month and keeps past breaks in their own list', () => {
    const frozen = freezeCalculation('calc-1', { kind: 'use_profile', profile: sampleProfile() }, AT);
    const model = buildHistoryModel(
      {
        ...emptyDurableSnapshot(),
        calculations: [frozen],
        previousBreaks: [
          {
            id: 'pb-1',
            durationDays: 14,
            toleranceReductionScore: 8,
            endedAt: null,
            createdAt: '2026-08-01T00:00:00Z',
            updatedAt: AT,
          },
        ],
        attempts: [
          {
            id: 'attempt-1',
            status: 'completed',
            calculationRecordId: 'calc-1',
            targetDurationDays: 21,
            postBreakMode: 'occasional',
            startedAt: AT,
            segments: [{ startedFromLastUseAt: AT, endedAt: AT, endReason: 'completed' }],
            postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 1 },
            completionAcknowledged: true,
            createdAt: AT,
            updatedAt: AT,
          },
        ],
        corrupt: [{ id: 'bad', kind: 'calculation', reason: 'invalid-record' }],
      },
      AT,
    );
    assert.equal(model.empty, false);
    assert.equal(model.previousBreaks.length, 1);
    assert.equal(model.previousBreaks[0]?.kind, 'previous-break');
    const kinds = model.groups.flatMap((group) => group.entries.map((entry) => entry.kind));
    assert.ok(kinds.includes('calculation'));
    assert.ok(kinds.includes('attempt'));
    assert.ok(kinds.includes('corrupt'));
    assert.ok(!kinds.includes('previous-break'));
    assert.equal(model.groups.some((group) => group.label === 'Unavailable'), true);
  });
});
