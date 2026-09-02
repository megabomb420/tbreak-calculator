import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateDailyCheckin } from '../../src/domain/validation/checkin-validation.ts';

const VALID_NO_USE = {
  recordedAt: '2026-08-20T12:00:00.000Z',
  craving: null,
  sleep: 7,
  irritability: null,
  anxiety: 3,
  appetite: null,
  usedThc: false,
  usedAt: null,
  note: null,
};

describe('daily check-in validation (D5, UX_SPEC 10.2)', () => {
  it('accepts untouched symptoms as null', () => {
    const outcome = validateDailyCheckin(VALID_NO_USE);
    assert.equal(outcome.ok, true);
    if (outcome.ok) {
      assert.equal(outcome.checkin.craving, null);
      assert.equal(outcome.checkin.appetite, null);
    }
  });

  it('accepts real ratings as integers 0..10', () => {
    for (const value of [0, 1, 10]) {
      const outcome = validateDailyCheckin({ ...VALID_NO_USE, craving: value });
      assert.equal(outcome.ok, true, `value ${value}`);
      if (outcome.ok) assert.equal(outcome.checkin.craving, value);
    }
  });

  it('rejects non-integer and out-of-range symptom values', () => {
    for (const value of [-1, 11, 2.5, '3', true]) {
      const outcome = validateDailyCheckin({ ...VALID_NO_USE, sleep: value });
      assert.equal(outcome.ok, false, `value ${String(value)}`);
    }
  });

  it('requires a confirmed usedAt on a use-day check-in', () => {
    const outcome = validateDailyCheckin({ ...VALID_NO_USE, usedThc: true, usedAt: null });
    assert.equal(outcome.ok, false);
    if (!outcome.ok) assert.ok(outcome.errors.some((error) => error.code === 'used_at_missing_after_use'));
  });

  it('accepts a use-day check-in with a confirmed usedAt and null symptoms', () => {
    const outcome = validateDailyCheckin({
      ...VALID_NO_USE,
      usedThc: true,
      usedAt: { value: '2026-08-20T09:00:00.000Z', provenance: 'user_estimate' },
    });
    assert.equal(outcome.ok, true);
  });

  it('rejects usedAt stored without a reported use', () => {
    const outcome = validateDailyCheckin({
      ...VALID_NO_USE,
      usedAt: { value: '2026-08-20T09:00:00.000Z', provenance: 'user_estimate' },
    });
    assert.equal(outcome.ok, false);
    if (!outcome.ok) assert.ok(outcome.errors.some((error) => error.code === 'used_at_present_without_use'));
  });

  it('rejects an invalid usedAt provenance or timestamp', () => {
    const badProvenance = validateDailyCheckin({
      ...VALID_NO_USE,
      usedThc: true,
      usedAt: { value: '2026-08-20T09:00:00.000Z', provenance: 'missing' },
    });
    assert.equal(badProvenance.ok, false);
    const badTimestamp = validateDailyCheckin({
      ...VALID_NO_USE,
      usedThc: true,
      usedAt: { value: 'not-a-time', provenance: 'user_estimate' },
    });
    assert.equal(badTimestamp.ok, false);
  });

  it('rejects usedAt after recordedAt', () => {
    const outcome = validateDailyCheckin({
      ...VALID_NO_USE,
      usedThc: true,
      usedAt: { value: '2026-08-21T12:00:00.000Z', provenance: 'user_estimate' },
    });
    assert.equal(outcome.ok, false);
    if (!outcome.ok) assert.ok(outcome.errors.some((error) => error.code === 'invalid_used_at'));
  });
});
