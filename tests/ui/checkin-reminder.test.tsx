// The check-in reminder in the app: set from Settings, surfaced on Today once
// the chosen local time has passed without a check-in, and silenced by one.

import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { createBreakAttemptsStore } from '../../src/application/progress/break-attempt-record.ts';
import { createCheckinsStore } from '../../src/application/progress/checkin-store.ts';
import {
  createCheckinReminderStore,
  CHECKIN_REMINDER_KEY,
} from '../../src/application/progress/reminder-store.ts';
import { deleteAllLocalData } from '../../src/application/settings/settings.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';

// 22:15 local: past every reminder time used below.
const NOW = toInstant(new Date('2026-09-24T22:15:00').getTime());
const DAY = 86_400_000;

// The break began three days and six hours ago, so the day running now started
// six hours ago: a check-in an hour ago belongs to today's break day, exactly
// as the check-in card counts it.
const ANCHOR = NOW - (3 * DAY + 6 * 3_600_000);

function seedBreak(storage: StorageAdapter): void {
  createBreakAttemptsStore(storage).save({
    schemaVersion: 'break-attempts-v1',
    attempts: [{
      id: 'chosen', status: 'active', targetSource: 'chosen', calculationRecordId: null,
      targetDurationDays: 14, postBreakMode: 'continue_abstinence', startedAt: ANCHOR,
      segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
      postBreakPlan: { mode: 'continue_abstinence' }, preparation: null,
      completionAcknowledged: false, createdAt: ANCHOR, updatedAt: ANCHOR,
    } as never],
  });
}

function setup(options: { readonly time?: string; readonly checkedInToday?: boolean } = {}) {
  const storage = createMemoryStorage();
  seedBreak(storage);
  if (options.time !== undefined) {
    createCheckinReminderStore(storage).save({ schemaVersion: 'checkin-reminder-v1', enabled: true, time: options.time });
  }
  if (options.checkedInToday === true) {
    createCheckinsStore(storage).save({
      schemaVersion: 'checkins-v1',
      checkins: [{
        recordedAt: new Date(NOW - 3_600_000).toISOString(), craving: null, sleep: null, irritability: null,
        anxiety: null, appetite: null, usedThc: false, usedAt: null, note: null,
      }],
    });
  }
  render(<App storage={storage} clock={fixedClock(NOW)} />);
  return storage;
}

describe('check-in reminder', () => {
  it('stays out of the way until it is switched on', () => {
    setup();
    expect(screen.queryByTestId('checkin-reminder')).toBeNull();
  });

  it('shows one quiet line once the time has passed, and offers the check-in', () => {
    setup({ time: '20:00' });
    const note = screen.getByTestId('checkin-reminder');
    expect(note.textContent).toContain('20:00');
    expect(screen.getByTestId('checkin-cta')).toBeTruthy();
  });

  it('keeps quiet while the chosen time is still ahead', () => {
    setup({ time: '23:30' });
    expect(screen.queryByTestId('checkin-reminder')).toBeNull();
  });

  it('disappears once today has a check-in', () => {
    setup({ time: '20:00', checkedInToday: true });
    expect(screen.queryByTestId('checkin-reminder')).toBeNull();
  });

  it('is switched on and timed from Settings, and written immediately', () => {
    const storage = setup();
    fireEvent.click(screen.getByTestId('open-settings'));
    const toggle = screen.getByTestId('reminder-enabled') as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    const stored = createCheckinReminderStore(storage).load();
    expect(stored?.enabled).toBe(true);
    expect(stored?.time).toBe('21:00');
    const time = screen.getByTestId('reminder-time') as HTMLInputElement;
    expect(time.value).toBe('21:00');
    fireEvent.change(time, { target: { value: '19:45' } });
    expect(createCheckinReminderStore(storage).load()?.time).toBe('19:45');
    expect(CHECKIN_REMINDER_KEY).toBe('tbreak.checkin-reminder.v1');
  });

  it('states what the reminder can and cannot do', () => {
    setup();
    fireEvent.click(screen.getByTestId('open-settings'));
    expect(screen.getByTestId('reminder-note').textContent).toContain('a closed app cannot');
  });

  it('is cleared by delete everything, like every other owned key', () => {
    const storage = setup({ time: '20:00' });
    expect(createCheckinReminderStore(storage).load()?.enabled).toBe(true);
    deleteAllLocalData(storage);
    expect(createCheckinReminderStore(storage).load()).toBeNull();
    expect(storage.getItem(CHECKIN_REMINDER_KEY)).toBeNull();
  });
});
