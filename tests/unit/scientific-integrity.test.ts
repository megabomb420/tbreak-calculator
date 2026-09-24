import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as evidence from '../../src/domain/guidance/evidence-guidance-v1.ts';
import * as outlook from '../../src/domain/guidance/break-outlook.ts';
import { presentDetoxEvidence, presentPostBreakGuidance } from '../../src/application/presentation/break-guidance.ts';
import * as breakCopy from '../../src/ui/break-copy.ts';
import * as companionCopy from '../../src/ui/companion-copy.ts';
import * as researchFacts from '../../src/ui/research-facts.ts';
import * as recoveryCopy from '../../src/ui/recovery-copy.ts';
import * as dailySupport from '../../src/application/presentation/daily-support.ts';
import {
  ALLOWED_EVIDENCE_QUOTES,
  FORBIDDEN_CLAIM_SAMPLES,
  FORBIDDEN_PERSONAL_CLAIMS,
} from '../helpers.ts';

const AT = 1787184000000;
const DAY_MS = 24 * 3_600_000;

/** Advice and reset copy lives inline in the components, so the guard reads
 * those files whole rather than only their exported constants. */
function inlineSources(): string {
  return ['../../src/ui/daily-support.tsx', '../../src/ui/community-carousel.tsx', '../../src/ui/predicted-reset.tsx', '../../src/ui/science-basics.tsx']
    .map((relative) => readFileSync(new URL(relative, import.meta.url), 'utf8'))
    .join('\n');
}

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

  it('forbids personal percentages, per-day outcomes, guarantees and detection windows in the advice, community, research-fact and recovery copy', () => {
    const dumped = JSON.stringify({
      dailySupport,
      days: [1, 5, 12, 20, 28, 29, 40].map((day) =>
        dailySupport.presentDailySupport({
          day,
          now: AT,
          anchor: AT - 3 * DAY_MS,
          checkins: [],
          preparation: null,
        }),
      ),
      researchFacts,
      recoveryCopy,
      companionCopy,
      inline: inlineSources(),
    });
    for (const pattern of FORBIDDEN_PERSONAL_CLAIMS) assert.doesNotMatch(dumped, pattern);
    assert.doesNotMatch(dumped, /reset complete/i);
    assert.doesNotMatch(dumped, /receptors?\s+fully restored/i);
    assert.doesNotMatch(dumped, /\d+\s*mg\b/i);
  });

  it('catches each prohibited personal claim while quoted population findings stay clean', () => {
    for (const claim of FORBIDDEN_CLAIM_SAMPLES) {
      assert.ok(
        FORBIDDEN_PERSONAL_CLAIMS.some((pattern) => pattern.test(claim)),
        `no pattern caught: ${claim}`,
      );
    }
    for (const quote of ALLOWED_EVIDENCE_QUOTES) {
      assert.ok(
        !FORBIDDEN_PERSONAL_CLAIMS.some((pattern) => pattern.test(quote)),
        `pattern flagged a quoted finding: ${quote}`,
      );
    }
  });
});
