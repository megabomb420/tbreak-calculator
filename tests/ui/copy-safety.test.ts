import { describe, expect, it } from 'vitest';
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
import { MESSAGE_TEMPLATES } from '../../src/application/presentation/message-templates.ts';
import { DETECTION_BANNER, DETECTION_WHAT_HELPS } from '../../src/application/presentation/result-presentation.ts';
import * as evidence from '../../src/domain/guidance/evidence-guidance-v1.ts';
import * as outlook from '../../src/domain/guidance/break-outlook.ts';

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

  it('keeps the first-launch safety note factual and bounded', () => {
    expect(FIRST_LAUNCH.safetyPending.toLowerCase()).toMatch(/not medical advice/);
    expect(FIRST_LAUNCH.safetyPending.toLowerCase()).toMatch(/not.*guaranteed.*test result/);
  });

  it('keeps the check-in symptom anchors on the documented scale', () => {
    expect(breakCopy.SYMPTOM_FIELDS).toHaveLength(5);
    for (const field of breakCopy.SYMPTOM_FIELDS) {
      expect(field.zero.length).toBeGreaterThan(0);
      expect(field.ten.length).toBeGreaterThan(0);
    }
  });
});
