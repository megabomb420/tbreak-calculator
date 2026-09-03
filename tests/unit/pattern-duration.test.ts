import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import { TOLERANCE_POLICY_V1 } from '../../src/domain/policies/tolerance-policy-v1.ts';
import { validateAndNormalizeProfile } from '../../src/domain/validation/profile-validation.ts';
import { presentToleranceResult } from '../../src/application/presentation/result-presentation.ts';
import { applyAnswer, isFlowComplete, resolvedPath } from '../../src/application/questionnaire/engine.ts';
import { finishQuestionnaire } from '../../src/application/questionnaire/snapshot.ts';
import { sampleProfile, userValue, absent, C0 } from '../helpers.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { CurrentPatternDurationBand } from '../../src/domain/schemas/enums.ts';

const LAST_USE = '2026-08-19T22:00:00Z';

function withDuration(profile: UseProfileInput, band: CurrentPatternDurationBand | null): UseProfileInput {
  return {
    ...profile,
    currentPatternDuration:
      band === null ? { value: null, provenance: 'missing' } : userValue(band),
  };
}

function rangeOf(profile: UseProfileInput) {
  const result = calculateTolerance(profile, TOLERANCE_POLICY_V1, C0);
  return {
    kind: result.kind,
    range: result.recommendedRangeDays,
    target: result.preferredTargetDays,
    drivers: result.drivers,
  };
}

describe('currentPatternDuration is contextual only', () => {
  it('very short current pattern + infrequent use does not change the 2–7 range', () => {
    const profile = sampleProfile({
      thcUseDaysLast30: userValue(2),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      currentPatternDuration: userValue('under_1_month'),
    });
    const result = rangeOf(profile);
    assert.deepEqual(result.range, { min: 2, max: 7 });
    const view = presentToleranceResult(
      calculateTolerance(profile, TOLERANCE_POLICY_V1, C0),
      profile,
    );
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    assert.ok(view.drivers.some((line) => /weeks rather than years/.test(line)));
    assert.ok(view.drivers.some((line) => /does not change the recommended day range/.test(line)));
    assert.equal(view.outlook?.tone, 'lighter');
    assert.equal(view.outlook?.days.length, 7);
  });

  it('long-established infrequent use keeps the same range with different context', () => {
    const short = sampleProfile({
      thcUseDaysLast30: userValue(2),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      currentPatternDuration: userValue('under_1_month'),
    });
    const long = withDuration(short, '5_plus_years');
    const shortResult = calculateTolerance(short, TOLERANCE_POLICY_V1, C0);
    const longResult = calculateTolerance(long, TOLERANCE_POLICY_V1, C0);
    assert.deepEqual(shortResult.recommendedRangeDays, longResult.recommendedRangeDays);
    assert.deepEqual(shortResult.preferredTargetDays, longResult.preferredTargetDays);
    assert.deepEqual(shortResult.drivers, longResult.drivers);
    const shortView = presentToleranceResult(shortResult, short);
    const longView = presentToleranceResult(longResult, long);
    assert.equal(shortView.kind, 'tolerance_result');
    assert.equal(longView.kind, 'tolerance_result');
    if (shortView.kind !== 'tolerance_result' || longView.kind !== 'tolerance_result') return;
    assert.notEqual(JSON.stringify(shortView.drivers), JSON.stringify(longView.drivers));
    assert.equal(shortView.outlook?.tone, 'lighter');
    assert.equal(longView.outlook?.tone, 'typical');
  });

  it('short-duration daily use does not add days beyond the daily band', () => {
    const profile = sampleProfile({
      thcUseDaysLast30: userValue(28),
      sessionsPerUseDay: userValue(1),
      products: ['flower'],
      routes: ['smoking'],
      currentPatternDuration: userValue('under_1_month'),
    });
    const result = rangeOf(profile);
    assert.deepEqual(result.range, { min: 21, max: 28 });
    const view = presentToleranceResult(calculateTolerance(profile, TOLERANCE_POLICY_V1, C0), profile);
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    assert.equal(view.outlook?.days.length, 28);
    assert.ok(view.drivers.some((line) => /weeks rather than years/.test(line)));
  });

  it('long-established daily use keeps 21–28 and adds duration context', () => {
    const profile = sampleProfile({
      thcUseDaysLast30: userValue(28),
      sessionsPerUseDay: userValue(1),
      products: ['flower'],
      routes: ['smoking'],
      currentPatternDuration: userValue('5_plus_years'),
    });
    const result = rangeOf(profile);
    assert.deepEqual(result.range, { min: 21, max: 28 });
    const view = presentToleranceResult(calculateTolerance(profile, TOLERANCE_POLICY_V1, C0), profile);
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    assert.equal(view.outlook?.tone, 'heavier');
    assert.ok(view.drivers.some((line) => /many years/.test(line)));
  });

  it('long-established daily + multiple sessions still uses the intensity range, not a duration multiplier', () => {
    const profile = sampleProfile({
      thcUseDaysLast30: userValue(28),
      sessionsPerUseDay: userValue(3),
      products: ['flower'],
      routes: ['smoking'],
      currentPatternDuration: userValue('5_plus_years'),
    });
    const result = rangeOf(profile);
    assert.deepEqual(result.range, { min: 21, max: 28 });
    assert.equal(result.target, 28);
    assert.ok(result.drivers.includes('multiple_sessions_per_day'));
  });

  it('long-established daily + concentrate/dabbing does not invent extra days past 28', () => {
    const profile = sampleProfile({
      thcUseDaysLast30: userValue(30),
      sessionsPerUseDay: userValue(3),
      products: ['concentrate'],
      routes: ['dabbing'],
      currentPatternDuration: userValue('5_plus_years'),
    });
    const result = rangeOf(profile);
    assert.deepEqual(result.range, { min: 21, max: 28 });
    const view = presentToleranceResult(calculateTolerance(profile, TOLERANCE_POLICY_V1, C0), profile);
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    assert.equal(view.outlook?.days.length, 28);
    assert.equal(view.outlook?.tone, 'heavier');
  });

  it('frequent 16-day use produces a 21-day outlook without a duration multiplier', () => {
    const short = sampleProfile({
      thcUseDaysLast30: userValue(16),
      sessionsPerUseDay: userValue(1),
      products: ['flower'],
      routes: ['smoking'],
      currentPatternDuration: userValue('under_1_month'),
    });
    const long = withDuration(short, '5_plus_years');
    const shortResult = calculateTolerance(short, TOLERANCE_POLICY_V1, C0);
    const longResult = calculateTolerance(long, TOLERANCE_POLICY_V1, C0);
    assert.deepEqual(shortResult.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(shortResult.preferredTargetDays, 21);
    assert.deepEqual(shortResult.recommendedRangeDays, longResult.recommendedRangeDays);
    const shortView = presentToleranceResult(shortResult, short);
    const longView = presentToleranceResult(longResult, long);
    assert.equal(shortView.kind, 'tolerance_result');
    assert.equal(longView.kind, 'tolerance_result');
    if (shortView.kind !== 'tolerance_result' || longView.kind !== 'tolerance_result') return;
    assert.equal(shortView.outlook?.days.length, 21);
    assert.equal(longView.outlook?.days.length, 21);
    assert.notEqual(JSON.stringify(shortView.drivers), JSON.stringify(longView.drivers));
  });

  it('same frequency with different pattern duration keeps the numeric range identical', () => {
    const base = sampleProfile({
      thcUseDaysLast30: userValue(10),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
    });
    const a = calculateTolerance(withDuration(base, 'under_1_month'), TOLERANCE_POLICY_V1, C0);
    const b = calculateTolerance(withDuration(base, '5_plus_years'), TOLERANCE_POLICY_V1, C0);
    assert.deepEqual(a.recommendedRangeDays, b.recommendedRangeDays);
    assert.equal(a.preferredTargetDays, b.preferredTargetDays);
    const viewA = presentToleranceResult(a, withDuration(base, 'under_1_month'));
    const viewB = presentToleranceResult(b, withDuration(base, '5_plus_years'));
    assert.equal(viewA.kind, 'tolerance_result');
    assert.equal(viewB.kind, 'tolerance_result');
    if (viewA.kind !== 'tolerance_result' || viewB.kind !== 'tolerance_result') return;
    assert.notDeepEqual(viewA.drivers, viewB.drivers);
  });

  it('legacy profiles with duration missing remain valid and do not change the range', () => {
    const legacy = sampleProfile({
      thcUseDaysLast30: userValue(20),
      sessionsPerUseDay: userValue(1),
      products: ['flower'],
      routes: ['smoking'],
    });
    assert.equal(legacy.currentPatternDuration, undefined);
    const outcome = validateAndNormalizeProfile(legacy, C0);
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.profile.currentPatternDuration.value, null);
    const result = calculateTolerance(legacy, TOLERANCE_POLICY_V1, C0);
    assert.deepEqual(result.recommendedRangeDays, { min: 14, max: 21 });
    const view = presentToleranceResult(result, legacy);
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    assert.equal(
      view.drivers.some((line) => /does not change the recommended day range/.test(line)),
      false,
    );
  });

  it('rejects an unknown duration band and accepts a missing wrapper', () => {
    const invalid = sampleProfile({
      currentPatternDuration: userValue('forever' as CurrentPatternDurationBand),
    });
    const failed = validateAndNormalizeProfile(invalid, C0);
    assert.equal(failed.ok, false);
    if (failed.ok) return;
    assert.ok(failed.errors.some((error) => error.code === 'invalid_current_pattern_duration'));
    const missing = sampleProfile({ currentPatternDuration: { value: null, provenance: 'missing' } });
    assert.equal(validateAndNormalizeProfile(missing, C0).ok, true);
  });
});

describe('questionnaire routing for current pattern duration', () => {
  it('asks Q6 after last use on consuming routes with use days, and on abstinence', () => {
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 10 }), [
      'Q1',
      'Q2',
      'Q3',
      'Q6',
    ]);
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 20 }), [
      'Q1',
      'Q2',
      'Q3',
      'Q6',
      'Q4',
      'Q5',
    ]);
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 0 }), [
      'Q1',
      'Q2',
      'Q3-opt',
    ]);
    assert.deepEqual(resolvedPath({ goal: 'abstinence' }), ['Q1', 'Q2A', 'Q6']);
    assert.deepEqual(
      resolvedPath({ goal: 'reduction', breakRequested: false, thcUseDaysLast30: 10 }),
      ['Q1', 'Q2R', 'Q2'],
    );
  });

  it('requires Q6 before a new 1–15 calculation can finish', () => {
    let answers = applyAnswer({}, { step: 'Q1', value: 'tolerance_reset' }, C0);
    answers = applyAnswer(answers, { step: 'Q2', value: 10 }, C0);
    answers = applyAnswer(answers, { step: 'Q3', value: LAST_USE }, C0);
    assert.equal(isFlowComplete(answers, C0), false);
    answers = applyAnswer(answers, { step: 'Q6', value: '1_to_6_months' }, C0);
    assert.equal(isFlowComplete(answers, C0), true);
    const finished = finishQuestionnaire(answers, C0);
    assert.equal(finished.status, 'complete');
    if (finished.status !== 'complete' || finished.snapshot.kind !== 'use_profile') return;
    assert.equal(finished.snapshot.profile.currentPatternDuration?.value, '1_to_6_months');
  });
});
