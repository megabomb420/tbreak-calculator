import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createQuestionnaireProgressStore,
  QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-progress.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import {
  createBreakAttemptsStore,
  type StoredAttempt,
} from '../../src/application/progress/break-attempt-record.ts';
import {
  createTrackingRecordsStore,
  type StoredTrack,
} from '../../src/application/progress/tracking-record.ts';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH, HISTORY_EMPTY, resumeTitle, SETTINGS } from '../../src/ui/copy.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { RawAnswerSnapshot } from '../../src/application/questionnaire/snapshot.ts';

const AT: Instant = toInstant(1787184000000); // 2026-08-20T00:00:00Z
const clock = fixedClock(AT);
const ANCHOR_MS = Date.parse('2026-08-17T00:00:00Z');

function renderApp(storage: StorageAdapter = createMemoryStorage()) {
  return render(<App storage={storage} clock={clock} />);
}

function saveDraft(storage: StorageAdapter, answeredSteps = 3): void {
  createQuestionnaireProgressStore(storage).save({
    schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
    answeredSteps,
    updatedAt: AT,
    currentStep: 'Q3',
    answers: { goal: 'tolerance_reset', thcUseDaysLast30: 10, lastUseAt: '2026-08-18T12:00:00Z' },
  });
}

function acknowledgeSnapshot(storage: StorageAdapter, snapshot: RawAnswerSnapshot): void {
  createQuestionnaireSnapshotStore(storage).save({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot,
    updatedAt: AT,
  });
  createResultViewStore(storage).save({
    schemaVersion: RESULT_VIEW_SCHEMA_VERSION,
    status: 'acknowledged',
    updatedAt: AT,
  });
}

function acknowledgeProfile(storage: StorageAdapter, profile: UseProfileInput): void {
  acknowledgeSnapshot(storage, { kind: 'use_profile', profile });
}

function toleranceProfile(lastUseAt = '2026-08-17T00:00:00Z'): UseProfileInput {
  return {
    goal: 'tolerance_reset',
    breakRequested: true,
    postBreakMode: null,
    thcUseDaysLast30: { value: 20, provenance: 'user_estimate' },
    sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
    products: ['flower'],
    routes: ['smoking'],
    lastUseAt: { value: lastUseAt, provenance: 'user_estimate' },
    previousBreaks: [],
  };
}

function detectionSnapshot(): RawAnswerSnapshot {
  return { kind: 'detection', request: { matrix: 'urine', context: 'general' } };
}

function storedAttempt(overrides: Partial<StoredAttempt> = {}): StoredAttempt {
  return {
    id: 'attempt-1',
    status: 'active',
    calculationRecordId: 'run-1',
    targetDurationDays: 21,
    postBreakMode: 'occasional',
    startedAt: AT,
    segments: [{ startedFromLastUseAt: ANCHOR_MS as Instant, endedAt: null, endReason: null }],
    postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
    preparation: null,
    completionAcknowledged: false,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

function seedAttempt(storage: StorageAdapter, attempt: StoredAttempt): void {
  createBreakAttemptsStore(storage).save({ schemaVersion: 'break-attempts-v1', attempts: [attempt] });
}

function storedTrack(overrides: Partial<StoredTrack> = {}): StoredTrack {
  return {
    id: 'track-1',
    calculationRecordId: 'run-1',
    status: 'tracking',
    startedAt: AT,
    segments: [{ startedFromLastUseAt: ANCHOR_MS as Instant, endedAt: null, endReason: null }],
    preparation: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

function seedTrack(storage: StorageAdapter, track: StoredTrack): void {
  createTrackingRecordsStore(storage).save({ schemaVersion: 'tracking-records-v1', records: [track] });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('app shell', () => {
  it('renders the Today tab on first launch', () => {
    renderApp();
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('first-launch');
    expect(view.getAttribute('data-resume')).toBe('none');
    expect(screen.getByRole('heading', { name: FIRST_LAUNCH.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: FIRST_LAUNCH.cta })).toBeTruthy();
    expect(screen.getByText(FIRST_LAUNCH.safetyPending)).toBeTruthy();
    expect(document.querySelector('[data-slot="safety_first_launch"]')).toBeTruthy();
  });

  it('switches between Today and History without opening settings', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByTestId('app-shell').getAttribute('data-active-tab')).toBe('history');
    expect(screen.getByTestId('history-view')).toBeTruthy();
    expect(screen.getByText(HISTORY_EMPTY)).toBeTruthy();
    expect(screen.queryByTestId('today-view')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByTestId('today-view')).toBeTruthy();
  });

  it('opens and closes the settings modal', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('open-settings'));
    expect(screen.getByRole('dialog', { name: SETTINGS.title })).toBeTruthy();
    expect(document.querySelector('[data-settings-entry="install-help"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: SETTINGS.close }));
    expect(screen.queryByTestId('settings-modal')).toBeNull();
  });

  it('closes settings on Escape without restoring focus onto the inert shell', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('open-settings'));
    expect(screen.getByTestId('settings-modal')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('settings-modal')).toBeNull();
  });
});

describe('Today states from real records', () => {
  it('shows the detection-only card for an acknowledged detection result', () => {
    const storage = createMemoryStorage();
    acknowledgeSnapshot(storage, detectionSnapshot());
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('detection-only');
    expect(screen.getByTestId('state-detection-only')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Get a break recommendation' })).toBeTruthy();
  });

  it('shows the profile summary with Start this break for a saved tolerance result', () => {
    const storage = createMemoryStorage();
    acknowledgeProfile(storage, toleranceProfile());
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('profile-no-break');
    expect(screen.getByTestId('state-profile-no-break')).toBeTruthy();
    expect(screen.getByTestId('today-start-break')).toBeTruthy();
    expect(screen.getByTestId('view-result')).toBeTruthy();
    // No invented day counter before a break starts.
    expect(view.textContent ?? '').not.toMatch(/Day \d+ of \d+/);
  });

  it('drives an active break card from the stored attempt', () => {
    const storage = createMemoryStorage();
    acknowledgeProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('active-break');
    // Anchor 2026-08-17, now 2026-08-20 => Day 4 of 21.
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 4 of 21');
    expect(screen.getByTestId('checkin-cta')).toBeTruthy();
    expect(screen.getByTestId('open-plan-detail')).toBeTruthy();
    expect(screen.queryByTestId('mark-complete-cta')).toBeNull();
    expect(view.textContent ?? '').not.toMatch(/\d+%/);
  });

  it('offers Mark complete only at/after the target date', () => {
    const storage = createMemoryStorage();
    acknowledgeProfile(storage, toleranceProfile());
    const longAnchor = toInstant(AT - 28 * 24 * 3_600_000);
    seedAttempt(storage, storedAttempt({ segments: [{ startedFromLastUseAt: longAnchor, endedAt: null, endReason: null }] }));
    renderApp(storage);
    expect(screen.getByTestId('mark-complete-cta')).toBeTruthy();
  });

  it('shows the interrupted card with Confirm when for a paused attempt', () => {
    const storage = createMemoryStorage();
    acknowledgeProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt({ status: 'interrupted_time_needed' }));
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('interrupted');
    expect(screen.getByTestId('confirm-when-cta')).toBeTruthy();
    expect(screen.getByTestId('paused-label')).toBeTruthy();
  });

  it('shows a completed break card until acknowledged, then profile-no-break', () => {
    const storage = createMemoryStorage();
    acknowledgeProfile(storage, toleranceProfile());
    const closed = storedAttempt({
      status: 'completed',
      // Continue-abstinence mode so acknowledging falls back to the profile
      // card (an occasional-mode completion hands Today to the reduction
      // tracker instead — covered in the reduction UI tests).
      postBreakMode: 'continue_abstinence',
      postBreakPlan: { mode: 'continue_abstinence' },
      segments: [{ startedFromLastUseAt: ANCHOR_MS as Instant, endedAt: AT, endReason: 'completed' }],
    });
    seedAttempt(storage, closed);
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('completed-break');
    expect(screen.getByTestId('completed-title').textContent).toBe('Break complete — 21 days');
    expect(screen.getByTestId('post-break-summary')).toBeTruthy();
    fireEvent.click(screen.getByTestId('acknowledge-complete'));
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
  });

  it('shows open-ended tracking with a day counter and no target', () => {
    const storage = createMemoryStorage();
    seedTrack(storage, storedTrack());
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('abstinence-tracking');
    expect(screen.getByTestId('tracking-day-label').textContent).toContain('Day 4');
    expect(screen.getByTestId('checkin-cta')).toBeTruthy();
    expect(screen.getByText(/since your last use/)).toBeTruthy();
  });

  it('stops tracking with confirmation and falls back to the profile card', () => {
    const storage = createMemoryStorage();
    acknowledgeProfile(storage, toleranceProfile());
    seedTrack(storage, storedTrack());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('stop-tracking'));
    fireEvent.click(screen.getByTestId('confirm-action'));
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
    expect(createTrackingRecordsStore(storage).load()?.records[0]?.status).toBe('ended');
  });

  it('shows a scheduled (planned) break instead of Start this break', () => {
    const storage = createMemoryStorage();
    acknowledgeProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt({ status: 'planned', segments: [], startedAt: toInstant(AT + 2 * 24 * 3_600_000) }));
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('profile-no-break');
    expect(screen.getByTestId('scheduled-start')).toBeTruthy();
    expect(screen.queryByTestId('today-start-break')).toBeNull();
    expect(screen.getByTestId('view-scheduled-plan')).toBeTruthy();
  });
});

describe('questionnaire resume placement', () => {
  it('replaces the primary card when a draft exists and no live state', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 3);
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('no-profile');
    expect(view.getAttribute('data-resume')).toBe('replaces-primary');
    expect(screen.getByRole('heading', { name: resumeTitle(3) })).toBeTruthy();
  });

  it('keeps an active break primary and shows resume as secondary', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 2);
    acknowledgeProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('active-break');
    expect(view.getAttribute('data-resume')).toBe('secondary');
    expect(screen.getByTestId('resume-card')).toBeTruthy();
  });

  it('keeps an interrupted break primary and shows resume as secondary', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 4);
    acknowledgeProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt({ status: 'interrupted_time_needed' }));
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-resume')).toBe('secondary');
    expect(screen.getByTestId('state-interrupted')).toBeTruthy();
  });

  it('keeps live tracking primary and shows resume as secondary', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 2);
    seedTrack(storage, storedTrack());
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('abstinence-tracking');
    expect(screen.getByTestId('today-view').getAttribute('data-resume')).toBe('secondary');
  });

  it('keeps a completed-unacknowledged card primary when a draft exists', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 2);
    acknowledgeProfile(storage, toleranceProfile());
    seedAttempt(
      storage,
      storedAttempt({
        status: 'completed',
        segments: [{ startedFromLastUseAt: ANCHOR_MS as Instant, endedAt: AT, endReason: 'completed' }],
      }),
    );
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('completed-break');
    expect(screen.getByTestId('today-view').getAttribute('data-resume')).toBe('secondary');
    expect(screen.getByTestId('state-completed-break')).toBeTruthy();
    expect(screen.getByTestId('resume-card')).toBeTruthy();
  });

  it('Start over clears the draft and restores the primary shell', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 3);
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('first-launch');
    expect(screen.queryByTestId('resume-card')).toBeNull();
    expect(createQuestionnaireProgressStore(storage).load()).toBeNull();
  });

  it('Start over on a resume card keeps a live break and saved profile', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 2);
    acknowledgeProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.queryByTestId('resume-card')).toBeNull();
    expect(createQuestionnaireProgressStore(storage).load()).toBeNull();
    expect(createBreakAttemptsStore(storage).load()?.attempts[0]?.status).toBe('active');
    expect(createQuestionnaireSnapshotStore(storage).load()).not.toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
  });
});

describe('delete everything', () => {
  it('wipes draft and plan records after a 3-second hold and returns to first-launch', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    saveDraft(storage, 3);
    acknowledgeProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
    fireEvent.click(screen.getByTestId('open-settings'));
    const hold = screen.getByRole('button', { name: SETTINGS.deleteHoldLabel });
    fireEvent.pointerDown(hold);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(createQuestionnaireProgressStore(storage).load()).toBeNull();
    expect(createBreakAttemptsStore(storage).load()).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('first-launch');
  });
});
