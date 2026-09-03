import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as evidence from '../../src/domain/guidance/evidence-guidance-v1.ts';
import * as outlook from '../../src/domain/guidance/break-outlook.ts';
import { presentDetoxEvidence, presentPostBreakGuidance } from '../../src/application/presentation/break-guidance.ts';
import * as breakCopy from '../../src/ui/break-copy.ts';

describe('scientific integrity of companion copy', () => {
  it('forbids recovery, detox, receptor and clearance percentages in guidance data', () => {
    const dumped = JSON.stringify({
      evidence,
      outlook,
      detox: presentDetoxEvidence(),
      postBreak: presentPostBreakGuidance({ mode: 'occasional', maxUseDaysPerWeek: 2 }),
      breakCopy,
    });
    assert.doesNotMatch(dumped, /\d+\s*%/);
    assert.doesNotMatch(dumped, /100%\s*reset/i);
    assert.doesNotMatch(dumped, /receptors?\s+fully restored/i);
    assert.doesNotMatch(dumped, /detox days remaining/i);
    assert.doesNotMatch(dumped, /clearance (bonus|multiplier)/i);
    assert.doesNotMatch(dumped, /days saved/i);
    assert.doesNotMatch(dumped, /clean countdown/i);
    assert.doesNotMatch(dumped, /\d+\s*mg\b/i);
  });

  it('does not smuggle numeric detection windows into the companion layer', () => {
    const dumped = JSON.stringify(evidence.DETECTION_EDUCATION_V1);
    assert.match(dumped, /does not estimate a personal detection window/i);
    assert.doesNotMatch(dumped, /\b\d+\s*-\s*\d+\s*days until negative\b/i);
  });
});
