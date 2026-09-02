import { describe, expect, it } from 'vitest';
import {
  DEFERRED_TODAY_SHELL,
  FIRST_LAUNCH,
  GOAL_CHIPS,
  HISTORY_EMPTY,
  NO_PROFILE,
  RESUME,
  SETTINGS,
} from '../../src/ui/copy.ts';
import * as questionnaireCopy from '../../src/ui/questionnaire-copy.ts';
import * as resultCopy from '../../src/ui/result-copy.ts';
import { MESSAGE_TEMPLATES } from '../../src/application/presentation/message-templates.ts';
import { DETECTION_BANNER, DETECTION_WHAT_HELPS } from '../../src/application/presentation/result-presentation.ts';

describe('UI copy invariants', () => {
  const dumped = JSON.stringify({
    DEFERRED_TODAY_SHELL,
    FIRST_LAUNCH,
    GOAL_CHIPS,
    HISTORY_EMPTY,
    NO_PROFILE,
    RESUME,
    SETTINGS,
    questionnaireCopy,
    resultCopy,
    MESSAGE_TEMPLATES,
    DETECTION_BANNER,
    DETECTION_WHAT_HELPS,
  });

  it('does not invent prohibited scientific claims', () => {
    expect(dumped).not.toMatch(/detoxed/i);
    expect(dumped).not.toMatch(/100%\s*reset/i);
    expect(dumped).not.toMatch(/reset complete/i);
    expect(dumped).not.toMatch(/receptor/i);
    expect(dumped).not.toMatch(/guaranteed/i);
    expect(dumped).not.toMatch(/\d+%/);
  });

  it('keeps the first-launch safety slot explicitly unfilled', () => {
    expect(FIRST_LAUNCH.safetyPending.toLowerCase()).toMatch(/not available yet/);
    expect(FIRST_LAUNCH.safetyPending.toLowerCase()).not.toMatch(/seek (medical|emergency)/);
  });
});
