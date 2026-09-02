import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import {
  QUESTIONNAIRE_SNAPSHOT_KEY,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { RESULT_VIEW_SCHEMA_VERSION, createResultViewStore } from '../../src/application/progress/result-view.ts';
import { BREAK_ATTEMPTS_KEY } from '../../src/application/progress/break-attempt-record.ts';
import { TRACKING_RECORDS_KEY } from '../../src/application/progress/tracking-record.ts';
import { REDUCTION_PLAN_KEY } from '../../src/application/progress/reduction-plan.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import { sampleProfile } from '../helpers.ts';

const AT: Instant = toInstant(1787184000000);
const ANCHOR = toInstant(AT - 3 * 24 * 3_600_000);
const clock = fixedClock(AT);

function renderApp(storage: StorageAdapter) {
  return render(<App storage={storage} clock={clock} />);
}

function acknowledgeProfile(storage: StorageAdapter): void {
  storage.setItem(
    QUESTIONNAIRE_SNAPSHOT_KEY,
    JSON.stringify({
      schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
      updatedAt: AT,
      snapshot: { kind: 'use_profile', profile: sampleProfile() },
    }),
  );
  createResultViewStore(storage).save({
    schemaVersion: RESULT_VIEW_SCHEMA_VERSION,
    status: 'acknowledged',
    updatedAt: AT,
  });
}

function activeAttempt(id: string) {
  return {
    id,
    status: 'active',
    calculationRecordId: 'run-1',
    targetDurationDays: 21,
    postBreakMode: 'occasional',
    startedAt: AT,
    segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
    postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
    completionAcknowledged: false,
    createdAt: AT,
    updatedAt: AT,
  };
}

describe('persistence corruption recovery', () => {
  it('does not crash when a stored snapshot is missing profile fields', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      QUESTIONNAIRE_SNAPSHOT_KEY,
      JSON.stringify({
        schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
        updatedAt: AT,
        snapshot: { kind: 'use_profile', profile: { goal: 'tolerance_reset', breakRequested: true } },
      }),
    );
    createResultViewStore(storage).save({
      schemaVersion: RESULT_VIEW_SCHEMA_VERSION,
      status: 'open',
      updatedAt: AT,
    });
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('first-launch');
    expect(screen.queryByTestId('result-screen')).toBeNull();
  });

  it('keeps an active break visible when a newer planned row is also stored', () => {
    const storage = createMemoryStorage();
    acknowledgeProfile(storage);
    storage.setItem(
      BREAK_ATTEMPTS_KEY,
      JSON.stringify({
        schemaVersion: 'break-attempts-v1',
        attempts: [
          {
            ...activeAttempt('planned-newer'),
            status: 'planned',
            segments: [],
          },
          activeAttempt('active-older'),
        ],
      }),
    );
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
  });

  it('does not crash on a corrupt reduction plan beside a valid profile', () => {
    const storage = createMemoryStorage();
    acknowledgeProfile(storage);
    storage.setItem(REDUCTION_PLAN_KEY, '{"maxUseDaysPerWeek":-1}');
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
  });

  it('ignores a live tracking row that tries to look like a finite plan', () => {
    const storage = createMemoryStorage();
    acknowledgeProfile(storage);
    storage.setItem(
      TRACKING_RECORDS_KEY,
      JSON.stringify({
        schemaVersion: 'tracking-records-v1',
        records: [
          {
            id: 'track-1',
            calculationRecordId: 'run-1',
            status: 'completed',
            targetDurationDays: 21,
            startedAt: AT,
            segments: [{ startedFromLastUseAt: ANCHOR, endedAt: AT, endReason: 'completed' }],
            createdAt: AT,
            updatedAt: AT,
          },
        ],
      }),
    );
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
  });
});
