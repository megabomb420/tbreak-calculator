import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIRST_LAUNCH,
  GOAL_CHIPS,
  HISTORY,
  HISTORY_EMPTY,
  INSTALL_HINT,
  NO_PROFILE,
  PREVIOUS_BREAK,
  PWA_UPDATE,
  RESUME,
  SETTINGS,
  STORAGE_BANNER,
} from '../../src/ui/copy.ts';
import * as questionnaireCopy from '../../src/ui/questionnaire-copy.ts';
import * as resultCopy from '../../src/ui/result-copy.ts';
import * as breakCopy from '../../src/ui/break-copy.ts';
import * as companionCopy from '../../src/ui/companion-copy.ts';
import * as researchFacts from '../../src/ui/research-facts.ts';
import * as recoveryCopy from '../../src/ui/recovery-copy.ts';
import * as dailySupport from '../../src/application/presentation/daily-support.ts';
import { MESSAGE_TEMPLATES } from '../../src/application/presentation/message-templates.ts';
import { DETECTION_BANNER, DETECTION_WHAT_HELPS } from '../../src/application/presentation/result-presentation.ts';
import * as evidence from '../../src/domain/guidance/evidence-guidance-v1.ts';
import * as outlook from '../../src/domain/guidance/break-outlook.ts';
import {
  ALLOWED_EVIDENCE_QUOTES,
  FORBIDDEN_CLAIM_SAMPLES,
  FORBIDDEN_PERSONAL_CLAIMS,
} from '../helpers.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('UI copy invariants', () => {
  const dumped = JSON.stringify({
    FIRST_LAUNCH,
    GOAL_CHIPS,
    HISTORY,
    HISTORY_EMPTY,
    INSTALL_HINT,
    NO_PROFILE,
    PREVIOUS_BREAK,
    PWA_UPDATE,
    RESUME,
    SETTINGS,
    STORAGE_BANNER,
    questionnaireCopy,
    resultCopy,
    breakCopy,
    MESSAGE_TEMPLATES,
    DETECTION_BANNER,
    DETECTION_WHAT_HELPS,
    evidence,
    outlook,
  });

  it('does not invent prohibited scientific claims', () => {
    expect(dumped).not.toMatch(/detoxed/i);
    expect(dumped).not.toMatch(/100%\s*reset/i);
    expect(dumped).not.toMatch(/reset complete/i);
    expect(dumped).not.toMatch(/receptors?\s+fully restored/i);
    expect(dumped).not.toMatch(/\d+\s*%\s*(reset|clean|recovered|recovery|detox|receptor|clearance)/i);
    expect(dumped).not.toMatch(/\d+%/);
    expect(dumped).not.toMatch(/\d+\s*mg/i);
    expect(dumped).not.toMatch(/detox days remaining/i);
    expect(dumped).not.toMatch(/clearance multiplier/i);
    expect(dumped).not.toMatch(/clean countdown/i);
  });

  it('keeps the first-launch safety slot factual and bounded', () => {
    const safety = FIRST_LAUNCH.safety.join(' ').toLowerCase();
    expect(safety).toMatch(/not medical advice/);
    expect(safety).toMatch(/not.*guaranteed.*test result/);
    // The slot is a release blocker in `UX_SPEC` §3.3 / `CALCULATOR_SPEC` §14:
    // age eligibility, the detection scope and the escalation lines have to be
    // in it, not only the disclaimer.
    expect(FIRST_LAUNCH.safety).toContain('For adults.');
    expect(safety).toMatch(/not a flush protocol/);
    expect(safety).toMatch(/urgent assessment/);
    expect(safety).toMatch(/seek emergency help/);
  });

});

describe('advice, community, research and recovery copy', () => {
  const AT = 1787184000000;
  const DAY_MS = 24 * 3_600_000;
  // The advice and reset surfaces hold copy inline in their components, so the
  // guard reads those files whole instead of only their exported constants.
  const inlineSources = ['src/ui/daily-support.tsx', 'src/ui/community-carousel.tsx', 'src/ui/predicted-reset.tsx']
    .map((source) => readFileSync(resolve(ROOT, source), 'utf8'))
    .join('\n');
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
    inlineSources,
  });

  it('never promises a personal percentage, per-day outcome, guarantee or detection window', () => {
    for (const pattern of FORBIDDEN_PERSONAL_CLAIMS) expect(dumped).not.toMatch(pattern);
    expect(dumped).not.toMatch(/reset complete/i);
    expect(dumped).not.toMatch(/receptors?\s+fully restored/i);
    expect(dumped).not.toMatch(/\d+\s*mg\b/i);
  });

  it('catches each prohibited claim while population findings stay quoted', () => {
    for (const claim of FORBIDDEN_CLAIM_SAMPLES) {
      expect(FORBIDDEN_PERSONAL_CLAIMS.some((pattern) => pattern.test(claim))).toBe(true);
    }
    for (const quote of ALLOWED_EVIDENCE_QUOTES) {
      expect(FORBIDDEN_PERSONAL_CLAIMS.some((pattern) => pattern.test(quote))).toBe(false);
    }
  });
});

describe('spec copy follows the shipped strings', () => {
  it('leaves the superseded first-launch and view-label wording out of the specs', () => {
    const uxSpec = readFileSync(resolve(ROOT, 'UX_SPEC.md'), 'utf8');
    const evidenceSpec = readFileSync(resolve(ROOT, 'EVIDENCE_CONTENT_SPEC.md'), 'utf8');
    expect(uxSpec).toContain(FIRST_LAUNCH.title);
    expect(uxSpec).toContain(FIRST_LAUNCH.promise);
    // The spec's §3.3 safety slot and the shipped block are the same lines.
    for (const line of FIRST_LAUNCH.safety) {
      expect(uxSpec).toContain(line);
    }
    expect(uxSpec).not.toContain('A private, on-device planner');
    expect(evidenceSpec).not.toContain('“Predicted reset”');
    expect(evidenceSpec).toMatch(new RegExp(`“${recoveryCopy.RESET_MODE.reset}”[^.]{0,40}compact navigation label`));
  });
});
