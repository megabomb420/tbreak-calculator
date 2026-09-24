// The delay timer (1.0.0): starting it from the day's advice card, closing it
// while it runs, reporting the outcome, stopping it without a trace, and the
// rows it leaves in History.

import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { createBreakAttemptsStore } from '../../src/application/progress/break-attempt-record.ts';
import {
  createUrgeSessionsStore,
  emptyUrgeSessionsRecord,
  type UrgeSession,
} from '../../src/application/progress/urge-session-record.ts';
import { finishUrgeSession, startUrgeSession } from '../../src/domain/urges/urge-session.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import { RIDE_IT_OUT } from '../../src/ui/urge-copy.ts';

const NOW = toInstant(Date.parse('2026-09-24T21:00:00Z'));
const MINUTE = 60_000;

function attempt() {
  return {
    id: 'chosen', status: 'active', targetSource: 'chosen', calculationRecordId: null,
    targetDurationDays: 14, postBreakMode: 'continue_abstinence', startedAt: NOW - 3 * 86_400_000,
    segments: [{ startedFromLastUseAt: NOW - 3 * 86_400_000, endedAt: null, endReason: null }],
    postBreakPlan: { mode: 'continue_abstinence' }, preparation: null,
    completionAcknowledged: false, createdAt: NOW - 3 * 86_400_000, updatedAt: NOW - 3 * 86_400_000,
  };
}

function setup(sessions: readonly UrgeSession[] = []) {
  const storage = createMemoryStorage();
  createBreakAttemptsStore(storage).save({ schemaVersion: 'break-attempts-v1', attempts: [attempt() as never] });
  if (sessions.length > 0) {
    createUrgeSessionsStore(storage).save({ ...emptyUrgeSessionsRecord(), sessions });
  }
  render(<App storage={storage} clock={fixedClock(NOW)} />);
  return { storage, stored: () => createUrgeSessionsStore(storage).load().sessions };
}

describe('ride it out', () => {
  it('starts a timer from the day card and counts down the chosen length', () => {
    const { stored } = setup();
    fireEvent.click(screen.getByTestId('open-ride-it-out'));
    expect(screen.getByTestId('ride-it-out').getAttribute('data-step')).toBe('choose');
    fireEvent.click(screen.getByTestId('urge-minutes-10'));
    const sheet = screen.getByTestId('ride-it-out');
    expect(sheet.getAttribute('data-step')).toBe('running');
    expect(screen.getByTestId('ride-countdown').textContent).toBe('10:00');
    // The run is stored, so it survives a reload or a frozen tab.
    expect(stored()).toHaveLength(1);
    expect(stored()[0]!.plannedMinutes).toBe(10);
    expect(stored()[0]!.endedAt).toBeNull();
  });

  it('keeps a running timer running when the sheet is closed, and shows it on the day card', () => {
    const { stored } = setup();
    fireEvent.click(screen.getByTestId('open-ride-it-out'));
    fireEvent.click(screen.getByTestId('urge-minutes-5'));
    fireEvent.click(screen.getByRole('button', { name: 'Close the timer' }));
    expect(screen.queryByTestId('ride-it-out')).toBeNull();
    expect(stored()[0]!.endedAt).toBeNull();
    expect(screen.getByTestId('open-ride-it-out').textContent).toBe(RIDE_IT_OUT.runningCta('5:00'));
    // Reopening resumes it instead of asking for a length again.
    fireEvent.click(screen.getByTestId('open-ride-it-out'));
    expect(screen.getByTestId('ride-it-out').getAttribute('data-step')).toBe('running');
  });

  it('asks how it went once the countdown is done, and records what was reported', () => {
    // Started 40 minutes ago: a 10-minute timer is long finished.
    const started = startUrgeSession('urge-elapsed', 10, toInstant(NOW - 40 * MINUTE));
    const { stored } = setup([started]);
    fireEvent.click(screen.getByTestId('open-ride-it-out'));
    expect(screen.getByTestId('ride-it-out').getAttribute('data-step')).toBe('report');
    expect(screen.getByTestId('ride-countdown').textContent).toBe('0:00');
    fireEvent.click(screen.getByTestId('ride-still-there'));
    expect(screen.getByTestId('ride-it-out').getAttribute('data-step')).toBe('done');
    expect(screen.getByTestId('ride-done-line').textContent).toBe(RIDE_IT_OUT.done);
    expect(stored()[0]!.outcome).toBe('still_there');
    expect(stored()[0]!.endedAt).toBe(NOW);
    fireEvent.click(screen.getByTestId('ride-close'));
    expect(screen.queryByTestId('ride-it-out')).toBeNull();
  });

  it('counts the sittings it has recorded without calling them victories', () => {
    const earlier = finishUrgeSession(startUrgeSession('urge-1', 5, toInstant(NOW - 2 * 86_400_000)), 'easier', toInstant(NOW - 2 * 86_400_000 + 5 * MINUTE));
    setup([earlier]);
    fireEvent.click(screen.getByTestId('open-ride-it-out'));
    expect(screen.getByTestId('ride-summary').textContent).toBe(RIDE_IT_OUT.summary(1, 1));
    fireEvent.click(screen.getByTestId('urge-minutes-5'));
    fireEvent.click(screen.getByTestId('ride-stop'));
    // Stopping is silent in the record: only the finished sitting stays.
    expect(screen.queryByTestId('ride-it-out')).toBeNull();
    expect(screen.getByTestId('open-ride-it-out').textContent).toBe(RIDE_IT_OUT.open);
  });

  it('forgets a timer that was never finished instead of counting it later', () => {
    const stale = startUrgeSession('urge-stale', 5, toInstant(NOW - 10 * 3_600_000));
    setup([stale]);
    expect(screen.getByTestId('open-ride-it-out').textContent).toBe(RIDE_IT_OUT.open);
    fireEvent.click(screen.getByTestId('open-ride-it-out'));
    expect(screen.getByTestId('ride-it-out').getAttribute('data-step')).toBe('choose');
  });

  it('lists a finished sitting in History and lets it be deleted', () => {
    const finished = finishUrgeSession(startUrgeSession('urge-1', 15, toInstant(NOW - 3_600_000)), 'easier', toInstant(NOW - 3_600_000 + 15 * MINUTE));
    const { stored } = setup([finished]);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    const row = screen.getByText('Ride it out · 15 min');
    expect(within(row.closest('[data-kind]') as HTMLElement).getByText('Easier at the end')).toBeTruthy();
    fireEvent.click(row.closest('button') as HTMLElement);
    fireEvent.click(screen.getByTestId('history-delete'));
    fireEvent.click(screen.getByTestId('confirm-dialog-action'));
    expect(stored()).toHaveLength(0);
  });

  it('does not list a timer that is still running', () => {
    setup([startUrgeSession('urge-running', 10, NOW)]);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.queryByText(/Ride it out ·/)).toBeNull();
  });
});
