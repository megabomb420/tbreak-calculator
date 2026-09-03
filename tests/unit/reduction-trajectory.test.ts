// Reduction trajectory frozen-record comparison (0.9.0).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import { PROFILE_SCHEMA_VERSION } from '../../src/domain/schemas/profile.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { CalculationRecord } from '../../src/application/persistence/calculation-record.ts';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import {
  TOLERANCE_POLICY_V3,
  TOLERANCE_POLICY_VERSION,
} from '../../src/domain/policies/tolerance-policy-v3.ts';
import { reductionTrajectory } from '../../src/application/presentation/reduction-trajectory.ts';

const DAY = 24 * 60 * 60 * 1000;
const T0 = toInstant(Date.parse('2026-05-01T12:00:00.000Z'));
const PLAN_START = toInstant(Date.parse('2026-05-10T12:00:00.000Z'));
const T1 = toInstant(Date.parse('2026-05-20T12:00:00.000Z'));

function profile(useDays: number): UseProfileInput {
  return {
    goal: 'tolerance_reset',
    breakRequested: true,
    postBreakMode: null,
    thcUseDaysLast30: { value: useDays, provenance: 'user_estimate' },
    sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
    products: ['flower'],
    routes: ['smoking'],
    lastUseAt: { value: new Date(T0).toISOString(), provenance: 'user_estimate' },
    currentPatternDuration: { value: '1_to_6_months', provenance: 'user_estimate' },
    previousBreaks: [],
  };
}

function makeRecord(id: string, calculatedAt: Instant, useDays: number): CalculationRecord {
  const snapshot = { kind: 'use_profile' as const, profile: profile(useDays) };
  const result = calculateTolerance(snapshot.profile, TOLERANCE_POLICY_V3, calculatedAt);
  assert.equal(result.kind, 'tolerance_result');
  return {
    id,
    schemaVersion: 'calculation-record-v1',
    calculatedAt,
    inputSchemaVersion: PROFILE_SCHEMA_VERSION,
    policyVersion: TOLERANCE_POLICY_VERSION,
    snapshot,
    result: { type: 'tolerance', value: result },
  };
}

describe('reduction trajectory', () => {
  function toleranceValueOf(record: CalculationRecord) {
    const value = record.result.value;
    if (value.kind !== 'tolerance_result') throw new Error('expected tolerance_result');
    return value;
  }

  it('renders actual numbers from a pre-plan record vs the adaptive record', () => {
    const baseline = makeRecord('baseline', toInstant(PLAN_START - DAY), 10);
    const adaptive = makeRecord('adaptive', T1, 28);
    const baselineValue = toleranceValueOf(baseline);
    const adaptiveValue = toleranceValueOf(adaptive);
    const view = reductionTrajectory([adaptive, baseline], PLAN_START);
    assert.ok(view !== null);
    assert.equal(view.baselineUseDays, 10);
    assert.equal(view.currentUseDays, 28);
    assert.equal(view.baselineTargetDays, baselineValue.preferredTargetDays);
    assert.equal(view.currentTargetDays, adaptiveValue.preferredTargetDays);
    assert.deepEqual(view.baselineRange, baselineValue.recommendedRangeDays);
    assert.deepEqual(view.currentRange, adaptiveValue.recommendedRangeDays);
    assert.equal(view.moved, view.baselineTargetDays !== view.currentTargetDays);
  });

  it('returns null with a single record (nothing to compare)', () => {
    const baseline = makeRecord('baseline', toInstant(PLAN_START - DAY), 10);
    assert.equal(reductionTrajectory([baseline], PLAN_START), null);
  });

  it('returns null when the newest record predates the plan start', () => {
    const older = makeRecord('older', toInstant(PLAN_START - 2 * DAY), 10);
    const newest = makeRecord('newest', toInstant(PLAN_START - DAY), 10);
    assert.equal(reductionTrajectory([newest, older], PLAN_START), null);
  });

  it('reports the neutral same-band line when band and target are unchanged', () => {
    const older = makeRecord('older', toInstant(PLAN_START - DAY), 10);
    const adaptive = makeRecord('adaptive', T1, 10);
    const view = reductionTrajectory([adaptive, older], PLAN_START);
    assert.ok(view !== null);
    assert.equal(view.moved, false);
  });

  it('skips post-plan older records and compares against the pre-plan record', () => {
    const baseline = makeRecord('baseline', toInstant(PLAN_START - DAY), 10);
    const mid = makeRecord('mid', toInstant(PLAN_START + DAY), 16);
    const newest = makeRecord('adaptive', T1, 28);
    const view = reductionTrajectory([newest, mid, baseline], PLAN_START);
    assert.ok(view !== null);
    assert.equal(view.baselineUseDays, 10);
    assert.equal(view.currentUseDays, 28);
  });
});
