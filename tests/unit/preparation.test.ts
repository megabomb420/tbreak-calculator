import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodePreparation,
  emptyPreparation,
  implementationIntentions,
  isValidPreparation,
} from '../../src/application/break/preparation.ts';
import { createBreakPlan, updateBreakPreparation, emptySessionState, suspendBreak, confirmBreakUse } from '../../src/application/break/break-session.ts';
import { createBreakAttemptsStore } from '../../src/application/progress/break-attempt-record.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const NOW = toInstant(1_787_184_000_000);
const ANCHOR = toInstant(NOW - 3 * 86_400_000);

describe('optional trigger preparation', () => {
  it('treats missing preparation on old records as absent', () => {
    assert.deepEqual(decodePreparation(undefined), { ok: true, preparation: null });
    assert.deepEqual(decodePreparation(null), { ok: true, preparation: null });
    assert.equal(isValidPreparation(emptyPreparation()), true);
  });

  it('rejects corrupt preparation rather than inventing a default', () => {
    assert.equal(decodePreparation({ triggerIds: ['not-a-trigger'] }).ok, false);
    assert.equal(isValidPreparation({ triggerIds: ['evening_after_work'], customTrigger: 1 }), false);
  });

  it('builds if-then lines without a medical duration', () => {
    const lines = implementationIntentions({
      triggerIds: ['evening_after_work'],
      customTrigger: null,
      replacementAction: 'go for a walk',
      fallbackPlan: 'make tea',
    });
    assert.ok(lines[0]?.includes('after work'));
    assert.ok(lines[0]?.includes('go for a walk'));
    assert.ok(lines.some((line) => /make tea/.test(line)));
    assert.doesNotMatch(lines.join(' '), /\d+\s*minutes required/i);
  });

  it('persists on a new plan and can be edited later', () => {
    const preparation = {
      triggerIds: ['gaming'] as const,
      customTrigger: null,
      replacementAction: 'stretch',
      fallbackPlan: null,
    };
    const created = createBreakPlan(emptySessionState(), {
      id: 'a1',
      calculationRecordId: 'c1',
      targetDurationDays: 21,
      mode: 'undecided',
      planStart: NOW,
      now: NOW,
      anchor: ANCHOR,
      preparation,
    });
    assert.deepEqual(created.attempts[0]?.preparation, preparation);
    const updated = updateBreakPreparation(created, 'a1', {
      preparation: { ...preparation, fallbackPlan: 'read' },
      now: NOW,
    });
    assert.equal(updated.ok, true);
    if (updated.ok) {
      assert.equal(updated.state.attempts[0]?.preparation?.fallbackPlan, 'read');
    }
  });

  it('keeps the trigger plan through interruption and restart', () => {
    const preparation = {
      triggerIds: ['stress'] as const,
      customTrigger: null,
      replacementAction: 'breathe',
      fallbackPlan: null,
    };
    const created = createBreakPlan(emptySessionState(), {
      id: 'a1',
      calculationRecordId: 'c1',
      targetDurationDays: 21,
      mode: 'undecided',
      planStart: NOW,
      now: NOW,
      anchor: ANCHOR,
      preparation,
    });
    const paused = suspendBreak(created, 'a1', NOW);
    assert.equal(paused.ok, true);
    if (!paused.ok) return;
    assert.deepEqual(paused.state.attempts[0]?.preparation, preparation);
    const restarted = confirmBreakUse(paused.state, {
      id: 'a1',
      usedAt: NOW,
      usedAtIso: new Date(NOW).toISOString(),
      now: NOW,
    });
    assert.equal(restarted.ok, true);
    if (restarted.ok) {
      assert.deepEqual(restarted.state.attempts[0]?.preparation, preparation);
      assert.equal(restarted.state.attempts[0]?.status, 'active');
    }
  });

  it('loads a v0.4-shaped envelope that has no preparation field', () => {
    const storage = createMemoryStorage();
    const store = createBreakAttemptsStore(storage);
    storage.setItem(
      'tbreak.break-attempts.v1',
      JSON.stringify({
        schemaVersion: 'break-attempts-v1',
        attempts: [
          {
            id: 'old',
            status: 'active',
            calculationRecordId: 'c1',
            targetDurationDays: 21,
            postBreakMode: 'occasional',
            startedAt: NOW,
            segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
            postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
            completionAcknowledged: false,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      }),
    );
    const loaded = store.load();
    assert.equal(loaded?.attempts[0]?.id, 'old');
    assert.equal(loaded?.attempts[0]?.preparation, null);
  });
});
