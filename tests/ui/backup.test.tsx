import { act, fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { HISTORY, HISTORY_EMPTY, SETTINGS } from '../../src/ui/copy.ts';
import { downloadTextFile, readTextFile, type PickedTextFile } from '../../src/ui/backup-file.ts';
import {
  backupCounts,
  createBackup,
  parseBackup,
  serializeBackup,
} from '../../src/application/backup/backup.ts';
import { createWebBackedDurable, type DurablePersistence } from '../../src/application/persistence/durable.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import {
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
  createQuestionnaireSnapshotStore,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { RESULT_VIEW_SCHEMA_VERSION, createResultViewStore } from '../../src/application/progress/result-view.ts';
import {
  createBreakAttemptsStore,
  type StoredAttempt,
} from '../../src/application/progress/break-attempt-record.ts';
import { createCheckinsStore } from '../../src/application/progress/checkin-store.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import { sampleProfile } from '../helpers.ts';

const AT: Instant = toInstant(1787184000000);
const ANCHOR_MS = Date.parse('2026-08-17T00:00:00Z');
const clock = fixedClock(AT);
const APP_VERSION = '0.26.0';

interface FakeDevice {
  pick?: PickedTextFile | null;
  saved?: { readonly name: string; readonly text: string };
}

function renderApp(storage: StorageAdapter, device: FakeDevice = {}) {
  return render(
    <App
      storage={storage}
      clock={clock}
      saveBackupFile={(name, text) => {
        device.saved = { name, text };
      }}
      pickBackupFile={() => Promise.resolve(device.pick ?? null)}
    />,
  );
}

function openSettings(): void {
  fireEvent.click(screen.getByTestId('open-settings'));
  expect(screen.getByTestId('settings-modal')).toBeTruthy();
}

async function flush(): Promise<void> {
  await act(async () => {});
}

function activeAttempt(id: string): StoredAttempt {
  return {
    id,
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
  };
}

function seedSavedPlan(storage: StorageAdapter, attemptId: string): void {
  createQuestionnaireSnapshotStore(storage).save({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot: { kind: 'use_profile', profile: sampleProfile() },
    updatedAt: AT,
  });
  createResultViewStore(storage).save({
    schemaVersion: RESULT_VIEW_SCHEMA_VERSION,
    status: 'acknowledged',
    updatedAt: AT,
  });
  createBreakAttemptsStore(storage).save({
    schemaVersion: 'break-attempts-v1',
    attempts: [activeAttempt(attemptId)],
  });
}

function backupText(seed: (durable: DurablePersistence, storage: StorageAdapter) => void): string {
  const storage = createMemoryStorage();
  const durable = createWebBackedDurable(storage);
  seed(durable, storage);
  return serializeBackup(createBackup({ durable, adapter: storage }, { exportedAt: AT, appVersion: APP_VERSION }));
}

function withData(text: string, mutate: (data: Record<string, unknown>) => void): string {
  const file = JSON.parse(text) as { data: Record<string, unknown> };
  mutate(file.data);
  return JSON.stringify(file);
}

describe('settings: Your data', () => {
  it('offers export and restore apart from the delete action', () => {
    renderApp(createMemoryStorage());
    openSettings();
    const area = document.querySelector('[data-settings-entry="your-data"]');
    expect(area).toBeTruthy();
    expect(within(area as HTMLElement).getByTestId('backup-export').textContent).toBe(SETTINGS.backupExport);
    expect(within(area as HTMLElement).getByTestId('backup-restore').textContent).toBe(SETTINGS.backupRestore);
    expect(within(area as HTMLElement).getByText(SETTINGS.backupHint)).toBeTruthy();
    const deleteArea = document.querySelector('[data-settings-entry="delete-everything"]');
    expect(deleteArea).toBeTruthy();
    expect(within(deleteArea as HTMLElement).getByRole('button', { name: SETTINGS.deleteHoldLabel })).toBeTruthy();
    expect((deleteArea as HTMLElement).contains(area)).toBe(false);
  });

  it('shows no backup message before either action runs', () => {
    renderApp(createMemoryStorage());
    openSettings();
    expect(screen.queryByTestId('backup-status')).toBeNull();
  });
});

describe('settings: export', () => {
  it('downloads one dated file holding every stored record', () => {
    const storage = createMemoryStorage();
    seedSavedPlan(storage, 'attempt-1');
    createCheckinsStore(storage).save({
      schemaVersion: 'checkins-v1',
      checkins: [
        {
          recordedAt: '2026-08-20T12:00:00.000Z',
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
    const device: FakeDevice = {};
    renderApp(storage, device);
    openSettings();
    fireEvent.click(screen.getByTestId('backup-export'));

    expect(device.saved?.name).toBe('tbreak-backup-2026-08-20.json');
    const parsed = parseBackup(device.saved?.text ?? '');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const counts = new Map(backupCounts(parsed.backup).map((line) => [line.store, line.count]));
    expect(counts.get('attempts')).toBe(1);
    expect(counts.get('checkins')).toBe(1);
    expect(counts.get('snapshot')).toBe(1);
    expect(counts.get('companionPersonalisation')).toBe(0);
    expect(screen.getByTestId('backup-status').getAttribute('data-backup-status')).toBe('exported');
    expect(screen.getByTestId('backup-status').textContent).toBe(
      SETTINGS.backupExportDone('tbreak-backup-2026-08-20.json'),
    );
  });
});

describe('settings: restore', () => {
  it('replaces the visible data once the destructive confirmation is accepted', async () => {
    const storage = createMemoryStorage();
    const device: FakeDevice = {
      pick: {
        name: 'my-backup.json',
        text: backupText((durable, source) => {
          seedSavedPlan(source, 'attempt-restored');
          durable.putCalculation(
            freezeCalculation('calc-1', { kind: 'use_profile', profile: sampleProfile() }, AT),
          );
        }),
      },
    };
    renderApp(storage, device);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('first-launch');
    openSettings();
    fireEvent.click(screen.getByTestId('backup-restore'));
    await flush();

    const dialog = screen.getByTestId('confirm-dialog');
    expect(within(dialog).getByText(SETTINGS.backupConfirmTitle('my-backup.json'))).toBeTruthy();
    expect(within(dialog).getByText(SETTINGS.backupConfirmBody)).toBeTruthy();
    expect(within(dialog).getByTestId('confirm-dialog-details').textContent).toContain('Break attempts: 1');
    expect(within(dialog).getByTestId('confirm-dialog-details').textContent).toContain('Tracking runs: 0');
    // Nothing is written before the user confirms.
    expect(createBreakAttemptsStore(storage).load()).toBeNull();

    fireEvent.click(within(dialog).getByTestId('backup-confirm'));
    await flush();

    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 4 of 21');
    expect(createBreakAttemptsStore(storage).load()?.attempts[0]?.id).toBe('attempt-restored');
    expect(createQuestionnaireSnapshotStore(storage).load()).not.toBeNull();
    expect(screen.getByTestId('backup-status').getAttribute('data-backup-status')).toBe('restored');
    expect(screen.getByTestId('backup-status').textContent).toBe(SETTINGS.backupRestoreDone('my-backup.json'));
  });

  it('empties the app when the file holds nothing', async () => {
    const storage = createMemoryStorage();
    seedSavedPlan(storage, 'attempt-old');
    const device: FakeDevice = {
      pick: { name: 'empty.json', text: backupText(() => {}) },
    };
    renderApp(storage, device);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
    openSettings();
    fireEvent.click(screen.getByTestId('backup-restore'));
    await flush();
    fireEvent.click(screen.getByTestId('backup-confirm'));
    await flush();

    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('first-launch');
    expect(createBreakAttemptsStore(storage).load()?.attempts.length).toBe(0);
    expect(createQuestionnaireSnapshotStore(storage).load()).toBeNull();
  });

  it('shows the restored records in History', async () => {
    const storage = createMemoryStorage();
    seedSavedPlan(storage, 'attempt-old');
    const device: FakeDevice = {
      pick: {
        name: 'history.json',
        text: backupText((durable) => {
          durable.putCalculation(freezeCalculation('calc-1', { kind: 'use_profile', profile: sampleProfile() }, AT));
        }),
      },
    };
    renderApp(storage, device);
    openSettings();
    fireEvent.click(screen.getByTestId('backup-restore'));
    await flush();
    fireEvent.click(screen.getByTestId('backup-confirm'));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: SETTINGS.close }));
    fireEvent.click(screen.getByRole('button', { name: 'History' }));

    const kinds = screen.getAllByTestId('history-row').map((row) => row.getAttribute('data-kind'));
    expect(kinds).toContain('calculation');
    expect(kinds).not.toContain('attempt');
    expect(screen.queryByText(HISTORY_EMPTY)).toBeNull();
  });

  it('keeps the device data when the confirmation is cancelled', async () => {
    const storage = createMemoryStorage();
    seedSavedPlan(storage, 'attempt-kept');
    const device: FakeDevice = {
      pick: { name: 'other.json', text: backupText((_durable, source) => seedSavedPlan(source, 'attempt-other')) },
    };
    renderApp(storage, device);
    openSettings();
    fireEvent.click(screen.getByTestId('backup-restore'));
    await flush();
    fireEvent.click(within(screen.getByTestId('confirm-dialog')).getByRole('button', { name: HISTORY.cancel }));
    await flush();

    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(createBreakAttemptsStore(storage).load()?.attempts[0]?.id).toBe('attempt-kept');
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
    expect(screen.queryByTestId('backup-status')).toBeNull();
  });

  it('drops a pending file when Settings is closed without confirming', async () => {
    const storage = createMemoryStorage();
    const device: FakeDevice = {
      pick: { name: 'other.json', text: backupText((_durable, source) => seedSavedPlan(source, 'attempt-other')) },
    };
    renderApp(storage, device);
    openSettings();
    fireEvent.click(screen.getByTestId('backup-restore'));
    await flush();
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: SETTINGS.close }));
    expect(screen.queryByTestId('settings-modal')).toBeNull();
    fireEvent.click(screen.getByTestId('open-settings'));
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(createBreakAttemptsStore(storage).load()).toBeNull();
  });

  it('leaves the app unchanged when the file is not a backup', async () => {
    const storage = createMemoryStorage();
    seedSavedPlan(storage, 'attempt-kept');
    const device: FakeDevice = { pick: { name: 'notes.json', text: '{"hello":"world"}' } };
    renderApp(storage, device);
    openSettings();
    fireEvent.click(screen.getByTestId('backup-restore'));
    await flush();

    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    const status = screen.getByTestId('backup-status');
    expect(status.getAttribute('data-backup-status')).toBe('rejected');
    expect(status.textContent).toBe(SETTINGS.backupErrorFormat);
    expect(createBreakAttemptsStore(storage).load()?.attempts[0]?.id).toBe('attempt-kept');
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
  });

  it('refuses a backup written by a newer app version', async () => {
    const storage = createMemoryStorage();
    seedSavedPlan(storage, 'attempt-kept');
    const device: FakeDevice = {
      pick: {
        name: 'newer.json',
        text: backupText(() => {}).replace('"formatVersion": 1', '"formatVersion": 2'),
      },
    };
    renderApp(storage, device);
    openSettings();
    fireEvent.click(screen.getByTestId('backup-restore'));
    await flush();

    const status = screen.getByTestId('backup-status');
    expect(status.getAttribute('data-backup-status')).toBe('rejected');
    expect(status.textContent).toBe(SETTINGS.backupErrorNewerFormat);
    expect(createBreakAttemptsStore(storage).load()?.attempts[0]?.id).toBe('attempt-kept');
  });

  it('refuses a file with one unreadable store and names it', async () => {
    const storage = createMemoryStorage();
    seedSavedPlan(storage, 'attempt-kept');
    const device: FakeDevice = {
      pick: {
        name: 'partial.json',
        text: withData(backupText(() => {}), (data) => {
          data.checkins = [{ recordedAt: '2026-08-20T12:00:00.000Z', craving: 99, usedThc: false }];
        }),
      },
    };
    renderApp(storage, device);
    openSettings();
    fireEvent.click(screen.getByTestId('backup-restore'));
    await flush();

    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    const status = screen.getByTestId('backup-status');
    expect(status.getAttribute('data-backup-status')).toBe('rejected');
    expect(status.textContent ?? '').toMatch(/check-ins/);
    expect(status.textContent ?? '').toMatch(/nothing was changed/);
    expect(createBreakAttemptsStore(storage).load()?.attempts[0]?.id).toBe('attempt-kept');
  });
});

describe('backup file plumbing', () => {
  it('reads a chosen file as text', async () => {
    const file = new File(['{"format":"tbreak-backup"}'], 'backup.json', { type: 'application/json' });
    expect(await readTextFile(file)).toEqual({ name: 'backup.json', text: '{"format":"tbreak-backup"}' });
  });

  it('saves the text through an attached download anchor and releases the URL afterwards', () => {
    vi.useFakeTimers();
    const clicks: Array<{ readonly href: string; readonly download: string; readonly attached: boolean }> = [];
    const revoked: string[] = [];
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tbreak');
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation((url: string) => revoked.push(url));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicks.push({ href: this.href, download: this.download, attached: this.isConnected });
      });
    try {
      downloadTextFile('tbreak-backup-2026-08-20.json', '{"format":"tbreak-backup"}');
      // The blob has to outlive the click: Safari can still be starting the
      // download when a synchronous revoke lands, and it needs the anchor in
      // the document to honour `download` at all.
      expect(revoked).toEqual([]);
      expect(document.querySelector('a[download]')).toBeNull();
      vi.advanceTimersByTime(40_000);
    } finally {
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
      click.mockRestore();
      vi.useRealTimers();
    }
    expect(clicks).toEqual([{ href: 'blob:tbreak', download: 'tbreak-backup-2026-08-20.json', attached: true }]);
    expect(revoked).toEqual(['blob:tbreak']);
  });
});
