import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DETECTION_COPY_POLICY_V1 } from '../../src/domain/policies/detection-copy-policy-v1.ts';
import { explainDetection } from '../../src/domain/detection/detection-engine.ts';
import type { DetectionRequest } from '../../src/domain/schemas/profile.ts';
import type { DetectionResult } from '../../src/domain/schemas/result.ts';

interface GoldenDetectionCase {
  readonly name: string;
  readonly request: { matrix: string; context: string };
  readonly expected: DetectionResult;
}

interface GoldenDetectionFixture {
  readonly cases: GoldenDetectionCase[];
}

function loadFixture(): GoldenDetectionFixture {
  const url = new URL('./fixtures/detection-golden.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as GoldenDetectionFixture;
}

describe('golden detection fixtures (matrices, contexts, invalid input)', () => {
  const fixture = loadFixture();

  it('reproduces the frozen expected result for every golden case', () => {
    for (const golden of fixture.cases) {
      const result = explainDetection(golden.request as unknown as DetectionRequest, DETECTION_COPY_POLICY_V1);
      assert.deepEqual(result, golden.expected, golden.name);
    }
  });

  it('is deterministic across repeated runs with identical requests', () => {
    for (const golden of fixture.cases) {
      const a = explainDetection(golden.request as unknown as DetectionRequest, DETECTION_COPY_POLICY_V1);
      const b = explainDetection(golden.request as unknown as DetectionRequest, DETECTION_COPY_POLICY_V1);
      assert.deepEqual(a, b, golden.name);
    }
  });

  it('emits no numeric values, clear dates or jurisdiction claims in any golden result', () => {
    for (const golden of fixture.cases) {
      const result = explainDetection(golden.request as unknown as DetectionRequest, DETECTION_COPY_POLICY_V1);
      // No numeric literal outside the version string: no ranges, cutoffs,
      // windows or dates anywhere in the qualitative output.
      const { policyVersion: _version, ...content } = result;
      assert.ok(!/\d/.test(JSON.stringify(content)), `${golden.name} must contain no numeric value`);
      const lowered = JSON.stringify(result).toLowerCase();
      for (const phrase of ['clean date', 'clear date', 'ireland', 'irish', 'ng/ml', 'ng / ml']) {
        assert.ok(!lowered.includes(phrase), `${golden.name} must not contain ${phrase}`);
      }
    }
  });

  it('keeps tolerance and impairment concepts out of detection output', () => {
    for (const golden of fixture.cases) {
      const result = explainDetection(golden.request as unknown as DetectionRequest, DETECTION_COPY_POLICY_V1);
      assert.equal('recommendedRangeDays' in result, false, golden.name);
      assert.equal('drivers' in result, false, golden.name);
    }
  });
});
