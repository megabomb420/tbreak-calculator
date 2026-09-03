// Recovery Outlook v2 policy and historical v1 compatibility.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { ToleranceResult } from '../../src/domain/schemas/result.ts';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import { TOLERANCE_POLICY_V3 } from '../../src/domain/policies/tolerance-policy-v3.ts';
import {
  BIOLOGICAL_REFERENCE_DAYS,
  buildToleranceRecoveryOutlook,
  buildToleranceRecoveryOutlookV1,
  MAX_PREDICTED_RECOVERY_DAYS,
} from '../../src/domain/recovery/recovery-outlook.ts';

const NOW = toInstant(Date.parse('2026-06-10T12:00:00.000Z'));

function profile(overrides: Partial<UseProfileInput> = {}): UseProfileInput {
  return {
    goal: 'tolerance_reset',
    breakRequested: true,
    postBreakMode: null,
    thcUseDaysLast30: { value: 10, provenance: 'user_estimate' },
    sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
    products: ['flower'],
    routes: ['smoking'],
    lastUseAt: { value: new Date(NOW - 2 * 86400000).toISOString(), provenance: 'user_estimate' },
    currentPatternDuration: { value: '1_to_6_months', provenance: 'user_estimate' },
    previousBreaks: [],
    ...overrides,
  };
}

function resultOf(input: UseProfileInput): ToleranceResult {
  const result = calculateTolerance(input, TOLERANCE_POLICY_V3, NOW);
  assert.equal(result.kind, 'tolerance_result');
  return result;
}

function outlook(input: UseProfileInput) {
  return buildToleranceRecoveryOutlook({ profile: input, result: resultOf(input), previousBreaks: input.previousBreaks })!;
}

describe('recovery outlook v2: explicit prediction policy', () => {
  it('keeps plan target and plan evidence range byte-for-byte equal to tolerance-v3 output', () => {
    const inputs = [
      profile({ thcUseDaysLast30: { value: 2, provenance: 'user_estimate' } }),
      profile({ thcUseDaysLast30: { value: 12, provenance: 'user_estimate' } }),
      profile({ thcUseDaysLast30: { value: 20, provenance: 'user_estimate' } }),
      profile({
        thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
        sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
        products: ['concentrate'],
        routes: ['dabbing'],
        currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
      }),
    ];
    for (const input of inputs) {
      const result = resultOf(input);
      const view = buildToleranceRecoveryOutlook({ profile: input, result })!;
      assert.equal(view.planningTargetDays, result.preferredTargetDays);
      assert.deepEqual(view.evidenceRange, result.recommendedRangeDays);
      assert.equal(view.biologicalReferenceDays, BIOLOGICAL_REFERENCE_DAYS);
    }
  });

  it('maps very light, regular, frequent and ordinary daily profiles to short/coarse windows', () => {
    assert.deepEqual(
      outlook(profile({ thcUseDaysLast30: { value: 2, provenance: 'user_estimate' } })).predictedRecoveryWindow,
      { min: 2, max: 7 },
    );
    assert.deepEqual(
      outlook(profile({ thcUseDaysLast30: { value: 10, provenance: 'user_estimate' } })).predictedRecoveryWindow,
      { min: 7, max: 14 },
    );
    assert.deepEqual(
      outlook(profile({ thcUseDaysLast30: { value: 20, provenance: 'user_estimate' } })).predictedRecoveryWindow,
      { min: 14, max: 21 },
    );
    assert.deepEqual(
      outlook(profile({ thcUseDaysLast30: { value: 30, provenance: 'user_estimate' } })).predictedRecoveryWindow,
      { min: 21, max: 28 },
    );
  });

  it('allows one reviewed daily extension signal to produce 28–35 days', () => {
    const highIntensity = outlook(profile({
      thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 2, provenance: 'user_estimate' },
    }));
    assert.deepEqual(highIntensity.predictedRecoveryWindow, { min: 28, max: 35 });
    assert.equal(highIntensity.predictionRule, 'daily_with_one_extended_signal');

    const longEstablished = outlook(profile({
      thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
      currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
    }));
    assert.deepEqual(longEstablished.predictedRecoveryWindow, { min: 28, max: 35 });
  });

  it('allows the highest-burden daily + intensity + long-duration class to reach 28–42 days', () => {
    const view = outlook(profile({
      thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
      products: ['concentrate'],
      routes: ['dabbing'],
      currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
    }));
    assert.deepEqual(view.predictedRecoveryWindow, { min: 28, max: 42 });
    assert.equal(view.predictionRule, 'daily_with_intensity_and_long_duration');
    assert.equal(view.predictionEvidence.extendedBeyondHumanReference, true);
    assert.equal(view.predictionEvidence.upperBoundDirectness, 'indirect_preclinical');
  });

  it('requires both intensity and long duration for a frequent non-daily extension', () => {
    const view = outlook(profile({
      thcUseDaysLast30: { value: 20, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 2, provenance: 'user_estimate' },
      currentPatternDuration: { value: '2_to_5_years', provenance: 'user_estimate' },
    }));
    assert.deepEqual(view.predictedRecoveryWindow, { min: 28, max: 35 });
    assert.equal(view.predictionRule, 'frequent_with_intensity_and_long_duration');
  });

  it('does not turn light concentrate use or long duration alone at low frequency into a long window', () => {
    const view = outlook(profile({
      thcUseDaysLast30: { value: 2, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
      products: ['concentrate'],
      routes: ['dabbing'],
      currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
    }));
    assert.deepEqual(view.predictedRecoveryWindow, { min: 2, max: 7 });
    assert.equal(view.profileContext.lightOrRegular, true);
  });

  it('does not silently treat missing intensity and duration as heavy signals', () => {
    const complete = profile({
      thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
      products: ['flower'],
      routes: ['smoking'],
    });
    // Legacy/frozen records can be less complete than today's questionnaire;
    // the recovery layer must not fill those gaps with high-burden defaults.
    const missing: UseProfileInput = {
      ...complete,
      sessionsPerUseDay: { value: null, provenance: 'missing' },
      currentPatternDuration: { value: null, provenance: 'missing' },
    };
    const view = buildToleranceRecoveryOutlook({ profile: missing, result: resultOf(complete) })!;
    assert.deepEqual(view.predictedRecoveryWindow, { min: 21, max: 28 });
    assert.equal(view.predictionRule, 'tolerance_range');
  });

  it('never exceeds the reviewed six-week product ceiling', () => {
    for (const days of [1, 3, 4, 15, 16, 25, 26, 30]) {
      const view = outlook(profile({
        thcUseDaysLast30: { value: days, provenance: 'user_estimate' },
        sessionsPerUseDay: { value: 20, provenance: 'user_estimate' },
        products: ['concentrate'],
        routes: ['dabbing'],
        currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
      }));
      assert.ok(view.predictedRecoveryWindow.max <= MAX_PREDICTED_RECOVERY_DAYS);
    }
  });

  it('emits no reset/receptor/detox percentages or exact complete-reset day', () => {
    const serialized = JSON.stringify(outlook(profile({
      thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
      products: ['concentrate'],
      routes: ['dabbing'],
      currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
    })));
    assert.doesNotMatch(serialized, /%|detox|complete.?reset|fully.?reset|reset.?day/i);
  });

  it('deduplicates Day 28 when plan, reference and predicted start coincide, while retaining Day 42', () => {
    const view = outlook(profile({
      thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
      products: ['concentrate'],
      routes: ['dabbing'],
      currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
    }));
    const days = view.milestones.map((milestone) => milestone.day);
    assert.equal(days.filter((day) => day === 28).length, 1);
    assert.ok(view.milestones.some((milestone) => milestone.id === 'four_week_reference' && milestone.day === 28));
    assert.ok(view.milestones.some((milestone) => milestone.id === 'predicted_window_end' && milestone.day === 42));
  });
});

describe('recovery outlook v2: history and compatibility', () => {
  it('keeps history descriptive and does not use a score to move the predicted window', () => {
    const input = profile({
      previousBreaks: [
        { id: 'pb-1', durationDays: 7, toleranceReductionScore: 8, endedAt: null, createdAt: '2025-01-01T00:00:00.000Z' },
      ],
    });
    const withHistory = buildToleranceRecoveryOutlook({
      profile: input,
      result: resultOf(input),
      previousBreaks: input.previousBreaks,
    })!;
    const withoutHistory = buildToleranceRecoveryOutlook({
      profile: { ...input, previousBreaks: [] },
      result: resultOf({ ...input, previousBreaks: [] }),
      previousBreaks: [],
    })!;
    assert.deepEqual(withHistory.predictedRecoveryWindow, withoutHistory.predictedRecoveryWindow);
    assert.deepEqual(withHistory.personalHistory, [{ durationDays: 7, toleranceReductionScore: 8 }]);
    assert.equal(JSON.stringify(withHistory).includes('80'), false);
  });

  it('keeps v1 as a fixed-reference historical model with no v2 predicted window', () => {
    const input = profile({
      thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
      currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
    });
    const view = buildToleranceRecoveryOutlookV1({ profile: input, result: resultOf(input) })!;
    assert.equal(view.version, 'tolerance-recovery-outlook-v1');
    assert.equal('predictedRecoveryWindow' in view, false);
    assert.equal(Math.max(...view.milestones.map((milestone) => milestone.day)), 28);
  });

  it('returns null for non-tolerance result kinds', () => {
    const base = resultOf(profile());
    const planningOnly: ToleranceResult = {
      ...base,
      kind: 'planning_only',
      recommendedRangeDays: null,
      preferredTargetDays: null,
    };
    assert.equal(buildToleranceRecoveryOutlook({ profile: profile(), result: planningOnly }), null);
  });
});
