import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  presentDetectionResult,
  presentToleranceResult,
} from '../../src/application/presentation/result-presentation.ts';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import { explainDetection } from '../../src/domain/detection/detection-engine.ts';
import { TOLERANCE_POLICY_V3 } from '../../src/domain/policies/tolerance-policy-v3.ts';
import { DETECTION_COPY_POLICY_V1 } from '../../src/domain/policies/detection-copy-policy-v1.ts';
import { sampleProfile, userValue, absent, C0 } from '../helpers.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { ToleranceResult } from '../../src/domain/schemas/result.ts';


describe('result presentation copies engine values and does not recompute them', () => {
  it('passes the engine range and target through verbatim, even when they match no band', () => {
    const profile = sampleProfile({
      thcUseDaysLast30: userValue(10),
      sessionsPerUseDay: userValue(1),
      products: ['flower'],
      routes: ['smoking'],
    });
    const forged: ToleranceResult = {
      ...calculateTolerance(profile, TOLERANCE_POLICY_V3, C0),
      recommendedRangeDays: { min: 3, max: 5 },
      preferredTargetDays: 5,
    };
    const view = presentToleranceResult(forged, profile);
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    assert.deepEqual(view.rangeDays, { min: 3, max: 5 });
    assert.equal(view.preferredTargetDays, 5);
    assert.notEqual(view.rangeDays.min, 7);
  });

  it('maps a real 4–15-day engine result into the tolerance screen model', () => {
    const profile = sampleProfile({
      thcUseDaysLast30: userValue(10),
      sessionsPerUseDay: userValue(1),
      products: ['flower'],
      routes: ['smoking'],
    });
    const engine = calculateTolerance(profile, TOLERANCE_POLICY_V3, C0);
    const view = presentToleranceResult(engine, profile);
    assert.equal(engine.kind, 'tolerance_result');
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result' || engine.recommendedRangeDays === null) return;
    assert.deepEqual(view.rangeDays, engine.recommendedRangeDays);
    assert.equal(view.preferredTargetDays, engine.preferredTargetDays);
    assert.equal(view.uncertainty, 'Limited certainty: this is a broad planning heuristic, and individual response varies.');
    assert.ok(view.drivers.includes('You use THC regularly, but not daily'));
    assert.equal(view.withdrawal?.breakDay, engine.withdrawal?.breakDay);
  });

  it('presents abstinence as planning_only with engine withdrawal and no range', () => {
    const profile = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      postBreakMode: 'continue_abstinence',
      thcUseDaysLast30: absent(),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
    });
    const engine = calculateTolerance(profile, TOLERANCE_POLICY_V3, C0);
    const view = presentToleranceResult(engine, profile);
    assert.equal(engine.kind, 'planning_only');
    assert.equal(view.kind, 'abstinence_planning');
    if (view.kind !== 'abstinence_planning') return;
    assert.equal(view.rangeDays, null);
    assert.equal(view.withdrawal?.breakDay, engine.withdrawal?.breakDay);
  });

  it('presents reduction-no-break as planning_only without fabricating withdrawal', () => {
    const profile = sampleProfile({
      goal: 'reduction',
      breakRequested: false,
      thcUseDaysLast30: userValue(8),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    const engine = calculateTolerance(profile, TOLERANCE_POLICY_V3, C0);
    const view = presentToleranceResult(engine, profile);
    assert.equal(engine.kind, 'planning_only');
    assert.equal(engine.withdrawal, null);
    assert.equal(view.kind, 'reduction_planning');
    if (view.kind !== 'reduction_planning') return;
    assert.equal(view.withdrawal, null);
    assert.equal(view.rangeDays, null);
  });

  it('presents zero use-days as baseline-low, not a range', () => {
    const profile = sampleProfile({
      thcUseDaysLast30: userValue(0),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    const engine = calculateTolerance(profile, TOLERANCE_POLICY_V3, C0);
    const view = presentToleranceResult(engine, profile);
    assert.equal(engine.kind, 'not_applicable');
    assert.equal(view.kind, 'baseline_low');
    if (view.kind !== 'baseline_low') return;
    assert.equal(view.daysSinceLastUse, null);
    assert.ok(view.body.includes('no break to recommend'));
  });

  it('presents detection as qualitative_only with mapped codes and no personal elapsed line', () => {
    const engine = explainDetection({ matrix: 'urine', context: 'workplace' }, DETECTION_COPY_POLICY_V1);
    const view = presentDetectionResult(engine);
    assert.equal(engine.kind, 'qualitative_only');
    assert.equal(view.kind, 'detection');
    if (view.kind !== 'detection') return;
    assert.equal(view.numericEstimateAvailable, false);
    assert.ok(view.matrixCopy.some((line) => line.includes('cutoff')));
    assert.ok(view.contextNote?.includes('Workplace cutoffs'));
    assert.equal(view.daysSinceLastUse, undefined);
  });
});
