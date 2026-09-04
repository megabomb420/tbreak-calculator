import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH } from '../../src/ui/copy.ts';
import { QUESTIONNAIRE } from '../../src/ui/questionnaire-copy.ts';
import { BREAK_START } from '../../src/ui/break-copy.ts';
import { RESTART_COPY_BREAK } from '../../src/ui/break-copy.ts';
import { RESULT } from '../../src/ui/result-copy.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import {
  createBreakAttemptsStore,
  type StoredAttempt,
} from '../../src/application/progress/break-attempt-record.ts';
import { createTrackingRecordsStore, type StoredTrack } from '../../src/application/progress/tracking-record.ts';
import { createCheckinsStore } from '../../src/application/progress/checkin-store.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import { localIsoDate } from '../../src/application/questionnaire/date-answers.ts';
import type { UseProfileInput, DailyCheckin } from '../../src/domain/schemas/profile.ts';

const AT: Instant = toInstant(1787184000000); // 2026-08-20T00:00:00Z
const DAY_MS = 24 * 3_600_000;
const ANCHOR = toInstant(AT - 3 * DAY_MS); // 2026-08-17

function clockAt(instant: Instant) {
  return fixedClock(instant);
}

function renderApp(storage: StorageAdapter, instant: Instant = AT) {
  return render(<App storage={storage} clock={clockAt(instant)} />);
}

function toleranceProfile(lastUseAt = new Date(ANCHOR).toISOString()): UseProfileInput {
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

function seedAcknowledgedProfile(storage: StorageAdapter, profile: UseProfileInput): void {
  createQuestionnaireSnapshotStore(storage).save({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot: { kind: 'use_profile', profile },
    updatedAt: AT,
  });
  createResultViewStore(storage).save({ schemaVersion: RESULT_VIEW_SCHEMA_VERSION, status: 'acknowledged', updatedAt: AT });
}

function storedAttempt(overrides: Partial<StoredAttempt> = {}): StoredAttempt {
  return {
    id: 'attempt-1',
    status: 'active',
    calculationRecordId: 'run-1',
    targetDurationDays: 21,
    postBreakMode: 'occasional',
    startedAt: AT,
    segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
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

function seedTrack(storage: StorageAdapter, track: StoredTrack): void {
  createTrackingRecordsStore(storage).save({ schemaVersion: 'tracking-records-v1', records: [track] });
}

function storedTrack(overrides: Partial<StoredTrack> = {}): StoredTrack {
  return {
    id: 'track-1',
    calculationRecordId: 'run-1',
    status: 'tracking',
    startedAt: AT,
    segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
    preparation: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

function attemptsOf(storage: StorageAdapter): StoredAttempt[] {
  return createBreakAttemptsStore(storage).load()?.attempts ?? [];
}

function checkinsOf(storage: StorageAdapter): readonly DailyCheckin[] {
  return createCheckinsStore(storage).load()?.checkins ?? [];
}

/** Completes a tolerance questionnaire whose result offers Start this break. */
function completeToleranceFlow(storage: StorageAdapter) {
  const rendered = renderApp(storage);
  fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
  fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
  // Duration is the first use-profile question, then use-days, then last use.
  fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: /5\+ years/ }));
  fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
  const flow = screen.getByTestId('questionnaire-flow');
  fireEvent.click(within(flow).getByRole('button', { name: 'Today' }));
  fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
  fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: '1' }));
  fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: QUESTIONNAIRE.continue }));
  const q5 = screen.getByTestId('questionnaire-flow');
  fireEvent.click(within(q5).getByRole('button', { name: /Flower/ }));
  fireEvent.click(within(q5).getByRole('button', { name: 'Smoking' }));
  fireEvent.click(within(q5).getByRole('button', { name: QUESTIONNAIRE.continue }));
  return rendered;
}

describe('break start sheet', () => {
  it('Start this break opens the real sheet and Now creates an active plan', () => {
    const storage = createMemoryStorage();
    completeToleranceFlow(storage);
    const result = screen.getByTestId('result-screen');
    expect(result.getAttribute('data-kind')).toBe('tolerance_result');
    fireEvent.click(screen.getByRole('button', { name: RESULT.startThisBreak }));
    const sheet = screen.getByTestId('break-start-sheet');
    expect(sheet).toBeTruthy();
    expect(screen.getByRole('heading', { name: BREAK_START.title })).toBeTruthy();
    fireEvent.click(within(sheet).getByRole('button', { name: /Occasional use/ }));
    fireEvent.click(within(sheet).getByRole('button', { name: BREAK_START.startBreak }));
    expect(screen.queryByTestId('break-start-sheet')).toBeNull();
    expect(screen.queryByTestId('result-screen')).toBeNull();
    // Real attempt created and owning Today. The flow profile (20 use days,
    // 5+ years, single session) is long-established frequent use, which the
    // v3 exposure classification places at the top of the evidence bounds.
    const attempt = attemptsOf(storage)[0];
    expect(attempt?.status).toBe('active');
    expect(attempt?.targetDurationDays).toBe(28);
    expect(attempt?.postBreakMode).toBe('occasional');
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
  });

  it('a future start creates a planned attempt that activates after reload', () => {
    const storage = createMemoryStorage();
    const first = completeToleranceFlow(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.startThisBreak }));
    const sheet = screen.getByTestId('break-start-sheet');
    fireEvent.click(within(sheet).getByRole('button', { name: /Pick a date/ }));
    const tomorrow = localIsoDate(toInstant(AT + DAY_MS));
    fireEvent.input(screen.getByTestId('break-start-date'), { target: { value: tomorrow } });
    fireEvent.click(within(sheet).getByRole('button', { name: /Not sure yet/ }));
    fireEvent.click(within(sheet).getByRole('button', { name: BREAK_START.startBreak }));
    expect(attemptsOf(storage)[0]?.status).toBe('planned');
    // Scheduled plan card replaces Start-this-break.
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
    expect(screen.getByTestId('scheduled-start')).toBeTruthy();
    // Reload after the start date has arrived activates the plan.
    first.unmount();
    renderApp(storage, toInstant(AT + 2 * DAY_MS));
    const attempt = attemptsOf(storage)[0];
    expect(attempt?.status).toBe('active');
    // The plan anchors to the authoritative last use (today at creation),
    // not to the chosen plan-start date.
    expect(attempt?.segments[0]?.startedFromLastUseAt).toBe(AT);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
  });

  it('rejects a picked start date outside today..+14 days', () => {
    const storage = createMemoryStorage();
    completeToleranceFlow(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.startThisBreak }));
    const sheet = screen.getByTestId('break-start-sheet');
    fireEvent.click(within(sheet).getByRole('button', { name: /Pick a date/ }));
    const yesterday = localIsoDate(toInstant(AT - DAY_MS));
    fireEvent.input(screen.getByTestId('break-start-date'), { target: { value: yesterday } });
    fireEvent.click(within(sheet).getByRole('button', { name: /Not sure yet/ }));
    expect((screen.getByTestId('start-break') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(sheet).getByRole('button', { name: BREAK_START.startBreak }));
    expect(attemptsOf(storage)).toHaveLength(0);
  });
});

describe('plan detail', () => {
  it('shows real plan progress, phase focus and editable post-break settings', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
    expect(screen.queryByTestId('outlook-day-strip')).toBeNull();
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    const detail = screen.getByTestId('plan-detail');
    expect(detail).toBeTruthy();
    expect(screen.getByTestId('plan-ring-day').textContent).toBe('Day 4');
    expect(screen.getByTestId('break-outlook')).toBeTruthy();
    // 21-day target ends at a single Day 21 (nothing beyond it)…
    expect(screen.getByTestId('outlook-seg-21-21')).toBeTruthy();
    expect(screen.queryByTestId('outlook-seg-22-22')).toBeNull();
    // …and the exact current day (4) is highlighted inside its grouped
    // segment (Days 4–6) with an explicit Today line.
    expect(screen.getByTestId('outlook-seg-4-6').getAttribute('data-status')).toBe('current');
    expect(screen.getByTestId('outlook-today-line').textContent).toBe('Today: Day 4');
    expect(screen.getByTestId('target-date')).toBeTruthy();
    expect(screen.getByTestId('phase-focus')).toBeTruthy();
    expect(screen.getByTestId('post-break-card')).toBeTruthy();
    // Change the mode to reduced regular use and save.
    fireEvent.click(within(detail).getByRole('button', { name: /Regular use, but less than before/ }));
    fireEvent.click(screen.getByTestId('save-post-break'));
    const attempt = attemptsOf(storage)[0];
    expect(attempt?.postBreakMode).toBe('reduced_regular_use');
    expect(attempt?.postBreakPlan?.mode).toBe('reduced_regular_use');
    expect(screen.getByText('Your tolerance may be lower than before the break.')).toBeTruthy();
  });

  it('keeps a post-break mode change if the user leaves without tapping Save', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    fireEvent.click(within(screen.getByTestId('plan-detail')).getByRole('button', { name: /Regular use, but less than before/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to Today' }));
    expect(attemptsOf(storage)[0]?.postBreakMode).toBe('reduced_regular_use');
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    expect(screen.getByTestId('plan-detail').querySelector('[data-mode="reduced_regular_use"]')?.className).toMatch(/selected/);
  });

  it('End break early confirms and ends the plan neutrally', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    fireEvent.click(screen.getByTestId('plan-more'));
    fireEvent.click(screen.getByTestId('end-early'));
    fireEvent.click(screen.getByTestId('confirm-action'));
    expect(screen.queryByTestId('plan-detail')).toBeNull();
    expect(attemptsOf(storage)[0]?.status).toBe('ended');
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
  });

  it('Mark complete from plan detail produces the completed card', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    const longAnchor = toInstant(AT - 28 * DAY_MS);
    seedAttempt(storage, storedAttempt({ segments: [{ startedFromLastUseAt: longAnchor, endedAt: null, endReason: null }] }));
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    fireEvent.click(screen.getByTestId('mark-complete'));
    expect(screen.queryByTestId('plan-detail')).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('completed-break');
    expect(attemptsOf(storage)[0]?.status).toBe('completed');
  });

  it('presents elapsed days past the target without a broken Day N of M fraction', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    const longAnchor = toInstant(AT - 28 * DAY_MS);
    seedAttempt(storage, storedAttempt({
      targetDurationDays: 21,
      segments: [{ startedFromLastUseAt: longAnchor, endedAt: null, endReason: null }],
    }));
    renderApp(storage);
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 29 · 21-day plan');
    expect(screen.getByTestId('mark-complete-cta')).toBeTruthy();
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    expect(screen.getByTestId('plan-ring').getAttribute('aria-label')).toMatch(/past the 21-day planning target/);
  });
});

describe('daily check-in', () => {
  it('No + Save is the fast path and stores a no-use check-in', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('checkin-cta'));
    expect(screen.getByTestId('checkin-flow').getAttribute('data-screen')).toBe('question');
    const save = screen.getByTestId('checkin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(screen.getByTestId('checkin-no'));
    fireEvent.click(screen.getByTestId('checkin-save'));
    expect(screen.queryByTestId('checkin-flow')).toBeNull();
    const checkin = checkinsOf(storage)[0] as { usedThc: boolean; craving: null };
    expect(checkin.usedThc).toBe(false);
    expect(checkin.craving).toBe(null);
  });

  it('optional symptoms stay null until touched, and a note is stored', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('checkin-cta'));
    fireEvent.click(screen.getByTestId('add-symptoms'));
    expect(screen.getByTestId('checkin-flow').getAttribute('data-screen')).toBe('symptoms');
    expect(screen.getByTestId('symptom-craving-readout').textContent).toBe('Not set');
    // Set one slider deliberately; the others must stay untouched.
    const craving = screen.getByRole('slider', { name: 'Craving' });
    fireEvent.pointerDown(craving);
    fireEvent.input(craving, { target: { value: '6' } });
    expect(screen.getByTestId('symptom-craving-readout').textContent).toBe('6');
    fireEvent.input(screen.getByTestId('checkin-note'), { target: { value: 'steady so far' } });
    fireEvent.click(screen.getByTestId('symptoms-save'));
    expect(screen.queryByTestId('checkin-flow')).toBeNull();
    const checkin = checkinsOf(storage)[0] as { craving: number; sleep: null; note: string; usedThc: boolean };
    expect(checkin.craving).toBe(6);
    expect(checkin.sleep).toBe(null);
    expect(checkin.appetite).toBe(null);
    expect(checkin.note).toBe('steady so far');
    expect(checkin.usedThc).toBe(false);
  });

  it('Yes moves straight to interruption without symptom entry', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('checkin-cta'));
    fireEvent.click(screen.getByTestId('checkin-yes'));
    expect(screen.queryByTestId('checkin-flow')).toBeNull();
    const confirm = screen.getByTestId('confirm-use');
    expect(confirm.getAttribute('data-scope')).toBe('attempt');
    expect(attemptsOf(storage)[0]?.status).toBe('interrupted_time_needed');
    // No check-in is recorded until the use is confirmed.
    expect(checkinsOf(storage)).toHaveLength(0);
  });

  it('a repeated Yes after interruption reopens confirm-when instead of closing the flow', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('checkin-cta'));
    fireEvent.click(screen.getByTestId('checkin-yes'));
    expect(screen.getByTestId('confirm-use')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('interrupted');
    fireEvent.click(screen.getByTestId('confirm-when-cta'));
    expect(screen.getByTestId('confirm-use').getAttribute('data-scope')).toBe('attempt');
    expect(attemptsOf(storage)[0]?.status).toBe('interrupted_time_needed');
  });
});

describe('interruption confirmation', () => {
  it('confirming when restarts the plan and records the use-day check-in', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt({ status: 'interrupted_time_needed' }));
    renderApp(storage);
    fireEvent.click(screen.getByTestId('confirm-when-cta'));
    const confirm = screen.getByTestId('confirm-use');
    expect(screen.getByTestId('paused-note')).toBeTruthy();
    // Pick Today inside the constrained window and confirm.
    const flow = within(confirm);
    fireEvent.click(flow.getByRole('button', { name: 'Today' }));
    const submit = screen.getByTestId('confirm-use-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    expect(screen.getByTestId('restart-copy').textContent).toContain(RESTART_COPY_BREAK);
    // The attempt restarted from the confirmed use: day counter resets.
    const attempt = attemptsOf(storage)[0];
    expect(attempt?.status).toBe('active');
    expect(attempt?.segments.length).toBe(2);
    expect(attempt?.segments[1]?.startedFromLastUseAt).toBeGreaterThanOrEqual(AT - 60_000);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
    const checkin = checkinsOf(storage)[0] as { usedThc: boolean; usedAt: { value: string } | null };
    expect(checkin.usedThc).toBe(true);
    expect(checkin.usedAt?.value).toMatch(/^2026-08-20/);
    // The authoritative profile anchor is updated to the confirmed use.
    const snapshot = createQuestionnaireSnapshotStore(storage).load();
    expect(snapshot?.snapshot.kind).toBe('use_profile');
    if (snapshot?.snapshot.kind === 'use_profile') {
      expect(snapshot.snapshot.profile.lastUseAt.value).toMatch(/^2026-08-20/);
    }
  });

  it('closing confirmation without choosing keeps timing suspended', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt({ status: 'interrupted_time_needed' }));
    renderApp(storage);
    fireEvent.click(screen.getByTestId('confirm-when-cta'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('confirm-use')).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('interrupted');
    expect(attemptsOf(storage)[0]?.status).toBe('interrupted_time_needed');
  });
});

describe('reload persistence', () => {
  it('restores an active break after remount', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    const first = renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
    first.unmount();
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 4 of 21');
  });

  it('restores an interrupted state and its confirm flow after remount', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt({ status: 'interrupted_time_needed' }));
    const first = renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('interrupted');
    first.unmount();
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('interrupted');
    fireEvent.click(screen.getByTestId('confirm-when-cta'));
    expect(screen.getByTestId('confirm-use').getAttribute('data-scope')).toBe('attempt');
  });

  it('restores a completed break until acknowledged', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(
      storage,
      storedAttempt({
        status: 'completed',
        // Continue-abstinence mode: acknowledging must not auto-start a
        // post-break reduction plan, so Today falls back to the profile card.
        postBreakMode: 'continue_abstinence',
        postBreakPlan: { mode: 'continue_abstinence' },
        segments: [{ startedFromLastUseAt: ANCHOR, endedAt: toInstant(ANCHOR + 21 * DAY_MS), endReason: 'completed' }],
      }),
    );
    const first = renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('completed-break');
    first.unmount();
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('completed-break');
    fireEvent.click(screen.getByTestId('acknowledge-complete'));
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
  });
});

describe('open-ended abstinence tracking (D4)', () => {
  it('abstinence result Start tracking opens Today tracking with a day counter', () => {
    const storage = createMemoryStorage();
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
    fireEvent.click(screen.getByRole('button', { name: /Stay off THC/ }));
    // Abstinence asks duration first, then the last-use anchor.
    fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: /1–6 months/ }));
    const flow = screen.getByTestId('questionnaire-flow');
    fireEvent.click(within(flow).getByRole('button', { name: 'Today' }));
    fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('abstinence_planning');
    fireEvent.click(screen.getByTestId('start-tracking'));
    expect(screen.queryByTestId('result-screen')).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('abstinence-tracking');
    expect(screen.getByTestId('tracking-day-label').textContent).toContain('Day 1');
    // The stored tracking record carries no finite target.
    const tracking = createTrackingRecordsStore(storage).load();
    expect(tracking?.records[0]?.status).toBe('tracking');
    expect('targetDurationDays' in (tracking?.records[0] ?? {})).toBe(false);
  });

  it('paused tracking interruption restarts without any target recomputation', () => {
    const storage = createMemoryStorage();
    createTrackingRecordsStore(storage).save({
      schemaVersion: 'tracking-records-v1',
      records: [
        {
          id: 'track-1',
          calculationRecordId: 'run-1',
          status: 'interrupted_time_needed',
          startedAt: AT,
          segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
          preparation: null,
          createdAt: AT,
          updatedAt: AT,
        },
      ],
    });
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('interrupted');
    fireEvent.click(screen.getByTestId('confirm-when-cta'));
    expect(screen.getByTestId('confirm-use').getAttribute('data-scope')).toBe('tracking');
  });
});

describe('evidence-guided companion', () => {
  it('shows stage-appropriate Today guidance on a peak day', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    const guidance = screen.getByTestId('today-guidance');
    expect(guidance.getAttribute('data-window')).toBe('days_2_6');
    expect(screen.getByTestId('guidance-headline').textContent).toMatch(/peak/i);
    expect(screen.getByTestId('guidance-primary-action').textContent).toBeTruthy();
    expect(screen.getByTestId('guidance-context').textContent).toMatch(/does not mean the break is failing/i);
  });

  it('renders an overlapping roadmap on plan detail', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    expect(screen.getByTestId('break-roadmap')).toBeTruthy();
    expect(screen.getByTestId('roadmap-stage-days_2_6').getAttribute('data-status')).toBe('current');
    expect(screen.getByTestId('roadmap-stage-days_1_3').getAttribute('data-status')).toBe('past');
    expect(screen.getByTestId('roadmap-stage-days_7_14').getAttribute('data-status')).toBe('future');
  });

  it('shows overlapping windows honestly on day 3', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    const day3 = toInstant(AT - 2 * DAY_MS);
    seedAttempt(storage, storedAttempt({ segments: [{ startedFromLastUseAt: day3, endedAt: null, endReason: null }] }));
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    expect(screen.getByTestId('roadmap-stage-days_2_6').getAttribute('data-status')).toBe('current');
    expect(screen.getByTestId('roadmap-stage-days_1_3').getAttribute('data-status')).toBe('current-overlap');
  });

  it('persists an optional trigger plan from plan detail', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    fireEvent.click(screen.getByTestId('trigger-evening_after_work'));
    fireEvent.input(screen.getByTestId('replacement-action'), { target: { value: 'go for a walk' } });
    fireEvent.blur(screen.getByTestId('replacement-action'));
    const attempt = attemptsOf(storage)[0];
    expect(attempt?.preparation?.triggerIds).toContain('evening_after_work');
    expect(attempt?.preparation?.replacementAction).toBe('go for a walk');
    expect(screen.getByTestId('intention-preview').textContent).toMatch(/after work/i);
  });

  it('compares earliest and latest check-in ratings in week two', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    const longAnchor = toInstant(AT - 10 * DAY_MS);
    seedAttempt(storage, storedAttempt({ segments: [{ startedFromLastUseAt: longAnchor, endedAt: null, endReason: null }] }));
    createCheckinsStore(storage).save({
      schemaVersion: 'checkins-v1',
      checkins: [
        {
          recordedAt: '2026-08-10T00:00:00.000Z',
          craving: 8,
          sleep: 3,
          irritability: null,
          anxiety: null,
          appetite: null,
          usedThc: false,
          usedAt: null,
          note: null,
        },
        {
          recordedAt: '2026-08-18T00:00:00.000Z',
          craving: 3,
          sleep: 6,
          irritability: null,
          anxiety: null,
          appetite: null,
          usedThc: false,
          usedAt: null,
          note: null,
        },
      ],
    });
    renderApp(storage);
    expect(screen.getByTestId('checkin-comparison')).toBeTruthy();
    expect(screen.getByTestId('checkin-comparison').textContent).toMatch(/Craving is lower/);
    expect(screen.getByTestId('checkin-comparison').textContent).toMatch(/Sleep rating is higher/);
  });

  it('opens detox evidence from plan detail with the app-specific scale', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    fireEvent.click(screen.getByTestId('open-detox-evidence'));
    const panel = screen.getByTestId('detox-evidence');
    expect(panel).toBeTruthy();
    expect(screen.getByTestId('evidence-scale-disclaimer').textContent).toMatch(/not formal GRADE/);
    expect(screen.getByTestId('detox-niacin').getAttribute('data-wellbeing')).toBe('harmful_risk');
    expect(screen.getByTestId('detox-exercise').getAttribute('data-speeds')).toBe('false');
    expect(screen.getByTestId('detox-sauna').getAttribute('data-speeds')).toBe('false');
    expect(screen.getByTestId('detox-fasting').getAttribute('data-speeds')).toBe('false');
    expect(screen.getByTestId('detox-normal_hydration').textContent).toMatch(/does not mean faster THC elimination/i);
  });

  it('does not show return-to-use principles for continued abstinence', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, storedAttempt({ postBreakMode: 'continue_abstinence', postBreakPlan: { mode: 'continue_abstinence' } }));
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-plan-detail'));
    expect(screen.getByTestId('abstinence-post-break').textContent).toMatch(/stay off/i);
    expect(screen.queryByTestId('return-principles')).toBeNull();
    expect(screen.queryByTestId('post-break-guidance')).toBeNull();
  });

  it('shows the same guidance on open-ended tracking without a finish line', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, {
      ...toleranceProfile(),
      goal: 'abstinence',
      breakRequested: false,
    });
    seedTrack(storage, storedTrack());
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('abstinence-tracking');
    expect(screen.getByTestId('today-guidance').getAttribute('data-window')).toBe('days_2_6');
    fireEvent.click(screen.getByTestId('open-tracking-detail'));
    expect(screen.getByTestId('tracking-detail')).toBeTruthy();
    expect(screen.getByTestId('open-ended-note').textContent).toMatch(/no finish line/i);
    expect(screen.getByTestId('break-roadmap')).toBeTruthy();
    expect(screen.queryByTestId('mark-complete')).toBeNull();
    expect(screen.queryByTestId('post-break-card')).toBeNull();
    fireEvent.click(screen.getByTestId('trigger-weekend'));
    fireEvent.input(screen.getByTestId('replacement-action'), { target: { value: 'make tea' } });
    const tracking = createTrackingRecordsStore(storage).load()?.records[0];
    expect(tracking?.preparation?.triggerIds).toContain('weekend');
    expect(tracking?.preparation?.replacementAction).toBe('make tea');
  });

  it('does not complete open-ended tracking at day 28', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, {
      ...toleranceProfile(),
      goal: 'abstinence',
      breakRequested: false,
    });
    const longAnchor = toInstant(AT - 29 * DAY_MS);
    seedTrack(storage, storedTrack({ segments: [{ startedFromLastUseAt: longAnchor, endedAt: null, endReason: null }] }));
    renderApp(storage);
    expect(screen.getByTestId('today-guidance').getAttribute('data-window')).toBe('beyond_28');
    expect(screen.queryByTestId('mark-complete-cta')).toBeNull();
    fireEvent.click(screen.getByTestId('open-tracking-detail'));
    expect(screen.getByTestId('roadmap-stage-beyond_28').getAttribute('data-status')).toBe('current');
    expect(screen.queryByTestId('mark-complete')).toBeNull();
  });
});
