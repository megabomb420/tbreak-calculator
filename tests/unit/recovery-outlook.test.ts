// Recovery-outlook invariants (0.9.0, tolerance-recovery-outlook-v1).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { ToleranceResult } from '../../src/domain/schemas/result.ts';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import { TOLERANCE_POLICY_V3 } from '../../src/domain/policies/tolerance-policy-v3.ts';
import { buildToleranceRecoveryOutlook } from '../../src/domain/recovery/recovery-outlook.ts';

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
  const outcome = calculateTolerance(input, TOLERANCE_POLICY_V3, NOW);
  assert.equal(outcome.kind, 'tolerance_result');
  return outcome;
}

function outlook(input: UseProfileInput, extra: Partial<Parameters<typeof buildToleranceRecoveryOutlook>[0]> = {}) {
  return buildToleranceRecoveryOutlook({
    profile: input,
    result: resultOf(input),
    ...extra,
  });
}

describe('recovery outlook: invariants', () => {
  it('emits no percentage-reset output anywhere', () => {
    for (const days of [2, 10, 20, 30]) {
      const view = outlook(profile({ thcUseDaysLast30: { value: days, provenance: 'user_estimate' } }));
      const serialized = JSON.stringify(view);
      assert.ok(!/%|reset to|recovered|detox|100%/i.test(serialized.replace(/"([0-9]+)"/g, '$1')));
    }
  });

  it('never changes planning target or evidence range from tolerance-v3', () => {
    const input = profile({
      thcUseDaysLast30: { value: 27, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
      currentPatternDuration: { value: 'under_1_month', provenance: 'user_estimate' },
    });
    const result = resultOf(input);
    const view = buildToleranceRecoveryOutlook({ profile: input, result })!;
    assert.equal(view.planningTargetDays, result.preferredTargetDays);
    assert.deepEqual(view.evidenceRange, result.recommendedRangeDays);
    assert.equal(view.biologicalReferenceDays, 28);
  });

  it('does not require 28 days for a light profile wording', () => {
    const input = profile({ thcUseDaysLast30: { value: 2, provenance: 'user_estimate' } });
    const view = outlook(input)!;
    assert.equal(view.wordingKey, 'light_or_regular');
    assert.equal(view.profileContext.lightOrRegular, true);
    assert.equal(view.profileContext.planReachesReference, false);
  });

  it('flags when the plan reaches the four-week reference', () => {
    const input = profile({
      thcUseDaysLast30: { value: 28, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 2, provenance: 'user_estimate' },
      products: ['concentrate'],
      routes: ['dabbing'],
      currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
    });
    const view = outlook(input)!;
    assert.equal(view.wordingKey, 'heavy_reaches_reference');
    assert.equal(view.profileContext.planReachesReference, true);
  });

  it('heavy profile below 28 uses the near-reference wording, not a mandate', () => {
    // 27/30 multi-session recent -> 21-28, plan 21.
    const input = profile({
      thcUseDaysLast30: { value: 27, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
      currentPatternDuration: { value: 'under_1_month', provenance: 'user_estimate' },
    });
    const view = outlook(input)!;
    assert.equal(view.planningTargetDays, 21);
    assert.equal(view.wordingKey, 'heavy_target_below_reference');
    assert.equal(view.profileContext.planReachesReference, false);
  });

  it('deduplicates milestone days (target = range.max = 28)', () => {
    const input = profile({
      thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
      currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
    });
    const view = outlook(input)!;
    const days = view.milestones.map((m) => m.day);
    assert.equal(new Set(days).size, days.length);
    // One single Day-28 marker (the four-week reference wins over duplicates).
    assert.equal(days.filter((d) => d === 28).length, 1);
    assert.ok(view.milestones.some((m) => m.id === 'four_week_reference' && m.day === 28));
  });

  it('keeps after-28 open: no invented further reference day', () => {
    const view = outlook(
      profile({
        thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
        sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
      }),
    )!;
    const maxDay = Math.max(...view.milestones.map((m) => m.day));
    assert.equal(maxDay, 28);
  });

  it('returns null for non-tolerance results', () => {
    const base = resultOf(profile({ thcUseDaysLast30: { value: 10, provenance: 'user_estimate' } }));
    const notApplicable: ToleranceResult = { ...base, kind: 'not_applicable', recommendedRangeDays: null, preferredTargetDays: null };
    const planningOnly: ToleranceResult = { ...base, kind: 'planning_only', recommendedRangeDays: null, preferredTargetDays: null };
    assert.equal(
      buildToleranceRecoveryOutlook({ profile: profile(), result: notApplicable }),
      null,
    );
    assert.equal(
      buildToleranceRecoveryOutlook({ profile: profile(), result: planningOnly }),
      null,
    );
  });
});

describe('recovery outlook: personal history', () => {
  it('lists clean scored breaks as facts only', () => {
    const input = profile({ thcUseDaysLast30: { value: 10, provenance: 'user_estimate' } });
    const view = outlook(input, {
      previousBreaks: [
        { durationDays: 7, toleranceReductionScore: 4 },
        { durationDays: 14, toleranceReductionScore: 8 },
      ],
    })!;
    assert.ok(view.personalHistory);
    // Preserves the stored order of the user's recorded observations.
    assert.deepEqual(view.personalHistory![0], { durationDays: 7, toleranceReductionScore: 4 });
    // No conversion to percentages anywhere in the model.
    assert.equal(JSON.stringify(view).includes('80'), false);
  });

  it('omits personal history when no scored break exists', () => {
    const view = outlook(
      profile({ thcUseDaysLast30: { value: 10, provenance: 'user_estimate' } }),
      { previousBreaks: [{ durationDays: 14, toleranceReductionScore: null }] },
    )!;
    assert.equal(view.personalHistory, null);
  });

  it('flags when tolerance-v3 used an in-range history observation for the target', () => {
    const input = profile({
      thcUseDaysLast30: { value: 10, provenance: 'user_estimate' },
      currentPatternDuration: { value: 'under_1_month', provenance: 'user_estimate' },
      previousBreaks: [
        { id: 'pb-1', durationDays: 7, toleranceReductionScore: 3, endedAt: null, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'pb-2', durationDays: 14, toleranceReductionScore: 8, endedAt: null, createdAt: '2025-06-01T00:00:00.000Z' },
      ],
    });
    const result = resultOf(input);
    // 7-14 range with a recent profile anchors at 7; the clean 14-day
    // observation raises the target inside the range.
    assert.equal(result.preferredTargetDays, 14);
    const view = buildToleranceRecoveryOutlook({
      profile: input,
      result,
      previousBreaks: input.previousBreaks,
    })!;
    assert.equal(view.planningTargetDays, 14);
    assert.equal(view.historyRaisedTarget, true);
  });
});
