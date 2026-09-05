import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { C0, sampleProfile } from '../helpers.ts';
import { toInstant, MILLIS_PER_DAY } from '../../src/domain/schemas/time.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import { savedUseProfile, presentSavedResult } from '../../src/application/calculation/saved-result.ts';
import { resolvePickedDate, resolvePlanStartDate, planStartBounds, localIsoDate } from '../../src/application/questionnaire/date-answers.ts';

describe('saved plans remain stable', () => {
  it('keeps a valid plan after its original last use leaves the 30-day intake window', () => {
    const record = freezeCalculation('plan', { kind: 'use_profile', profile: sampleProfile() }, C0);
    const before = JSON.stringify(record);
    const original = presentSavedResult(record, C0);
    const later = presentSavedResult(record, toInstant(C0 + 45 * MILLIS_PER_DAY));
    assert.equal(later.kind, 'tolerance_result');
    assert.equal(original.kind, 'tolerance_result');
    if (later.kind === 'tolerance_result' && original.kind === 'tolerance_result') {
      assert.deepEqual(later.rangeDays, original.rangeDays);
      assert.equal(later.preferredTargetDays, original.preferredTargetDays);
      assert.notDeepEqual(later.withdrawal, original.withdrawal);
    }
    assert.equal(JSON.stringify(record), before);
  });
  it('uses the owning calculation even after a different use profile is saved', () => {
    const owner = freezeCalculation('owner', { kind: 'use_profile', profile: sampleProfile() }, C0);
    const newer = freezeCalculation('newer', { kind: 'use_profile', profile: sampleProfile({ goal: 'abstinence' }) }, toInstant(C0 + 1));
    const snapshot = savedUseProfile([newer, owner], null)!;
    assert.equal(snapshot.runId, 'newer');
    assert.equal(savedUseProfile([newer, owner], snapshot, 'owner')?.runId, 'owner');
    assert.equal(savedUseProfile([], null), null);
  });
});

describe('calendar dates', () => {
  it('rejects normalised impossible dates and future last-use dates', () => {
    assert.equal(resolvePickedDate('2026-02-31', 'afternoon', C0, 'any_past'), null);
    assert.equal(resolvePickedDate('2026-08-21', 'afternoon', C0, 'any_past'), null);
  });
  it('starts today at now and accepts exactly fourteen local calendar days ahead', () => {
    for (const iso of ['2026-03-20T16:00:00Z', '2026-10-20T16:00:00Z']) {
      const now = toInstant(Date.parse(iso));
      const bounds = planStartBounds(now);
      assert.equal(resolvePlanStartDate(bounds.min, now), now);
      const end = resolvePlanStartDate(bounds.max, now);
      assert.notEqual(end, null);
      assert.equal(localIsoDate(end!), bounds.max);
      const next = new Date(end!); next.setDate(next.getDate() + 1);
      assert.equal(resolvePlanStartDate(localIsoDate(toInstant(next.getTime())), now), null);
    }
  });
});
