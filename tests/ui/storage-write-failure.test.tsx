// Item 1: a durable write that fails must reach the UI. The app keeps serving
// the in-memory copy, but it may not claim the change is saved on this device.

import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { SETTINGS, STORAGE_BANNER } from '../../src/ui/copy.ts';
import {
  createIndexedDbDurable,
  createMemoryIndexedDbBackend,
  hydrateIndexedDbDurable,
  type IndexedDbBackend,
} from '../../src/infrastructure/storage/indexeddb.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import type { DurablePersistence } from '../../src/application/persistence/durable.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import { createReductionRecordsStore } from '../../src/application/progress/reduction-record.ts';
import type { ReductionPlan } from '../../src/domain/reduction/reduction-engine.ts';

const AT = toInstant(1787184000000); // 2026-08-20T00:00:00Z

const PLAN: ReductionPlan = {
  id: 'plan-1',
  origin: 'direct',
  status: 'active',
  startedAt: AT,
  updatedAt: AT,
  limits: { maxUseDaysPerWeek: 3, maxSessionsPerUseDay: 1 },
  strategy: { avoidConcentrates: false, lowerPotency: false, lowerAmount: false },
  baseline: {
    thcUseDaysLast30: 10,
    sessionsPerUseDay: 1,
    products: ['flower'],
    routes: ['smoking'],
    currentPatternDuration: '6_to_24_months',
  },
  events: [],
};

function snapshotRecord(): QuestionnaireSnapshotRecord {
  return {
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot: {
      kind: 'use_profile',
      profile: {
        goal: 'reduction',
        breakRequested: false,
        postBreakMode: null,
        thcUseDaysLast30: { value: 10, provenance: 'user_estimate' },
        sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
        products: ['flower'],
        routes: ['smoking'],
        lastUseAt: { value: null, provenance: 'missing' },
        currentPatternDuration: { value: '6_to_24_months', provenance: 'user_estimate' },
        previousBreaks: [],
      },
    },
    updatedAt: AT,
  };
}

function seedPlan(storage: StorageAdapter): void {
  createReductionRecordsStore(storage).save({ schemaVersion: 'reduction-records-v2', plans: [PLAN] });
  createQuestionnaireSnapshotStore(storage).save(snapshotRecord());
  createResultViewStore(storage).save({
    schemaVersion: RESULT_VIEW_SCHEMA_VERSION,
    status: 'acknowledged',
    updatedAt: AT,
  });
}

/** Rejects every write until `recover()`; reads keep serving the backing store,
 * so tests can also see what the device really got. */
function faultInjectingBackend(inner: IndexedDbBackend): {
  backend: IndexedDbBackend;
  recover: () => void;
} {
  let failing = true;
  const guard = async (work: () => Promise<void>): Promise<void> => {
    if (failing) throw new Error('QuotaExceededError');
    await work();
  };
  return {
    backend: {
      getAll: (store) => inner.getAll(store),
      put: (store, value) => guard(() => inner.put(store, value)),
      delete: (store, id) => guard(() => inner.delete(store, id)),
      clear: (store) => guard(() => inner.clear(store)),
      write: (stores, mutate) => guard(() => inner.write(stores, mutate)),
    },
    recover: () => {
      failing = false;
    },
  };
}

/** Logs one THC use through the reduction card, which writes the live plan. */
function logUse(): void {
  fireEvent.click(screen.getByTestId('log-use-cta'));
  fireEvent.click(within(screen.getByTestId('log-use')).getByTestId('log-use-save'));
}

function openSettings(): void {
  fireEvent.click(screen.getByTestId('open-settings'));
}

/** Events on the single plan row that actually reached the backend. */
function storedPlanEvents(rows: readonly unknown[]): number {
  const row = rows[0];
  if (row === undefined || typeof row !== 'object' || row === null) return -1;
  const payload = 'payload' in row ? (row as { payload: unknown }).payload : row;
  if (typeof payload !== 'object' || payload === null || !('events' in payload)) return -1;
  const events = (payload as { events: unknown }).events;
  return Array.isArray(events) ? events.length : -1;
}

async function renderWithFaults(): Promise<{
  durable: DurablePersistence;
  inner: IndexedDbBackend;
  recover: () => void;
}> {
  // Seed the real IndexedDB rows, then hydrate them as a successful boot
  // would; only writes made after boot are rejected.
  const seedBackend = createMemoryIndexedDbBackend();
  const seeder = createIndexedDbDurable(seedBackend, await hydrateIndexedDbDurable(seedBackend));
  seeder.saveReductionRecords([PLAN]);
  seeder.saveSnapshot(snapshotRecord());
  await seeder.flush();

  const injected = faultInjectingBackend(seedBackend);
  const durable = createIndexedDbDurable(injected.backend, await hydrateIndexedDbDurable(injected.backend));
  const storage = createMemoryStorage();
  createResultViewStore(storage).save({
    schemaVersion: RESULT_VIEW_SCHEMA_VERSION,
    status: 'acknowledged',
    updatedAt: AT,
  });
  render(<App storage={storage} clock={fixedClock(AT)} durable={durable} />);
  return { durable, inner: seedBackend, recover: injected.recover };
}

describe('storage failure banner', () => {
  it('shows the banner when a durable write is rejected, then clears it', async () => {
    const { durable, inner, recover } = await renderWithFaults();
    expect(screen.queryByTestId('storage-banner')).toBeNull();

    logUse();
    await durable.flush();

    const banner = screen.getByTestId('storage-banner');
    expect(banner.textContent).toBe(STORAGE_BANNER.writeFailed);
    expect(banner.getAttribute('data-variant')).toBe('write-failed');
    // The session keeps the change even though it may not be on the device.
    expect(screen.getByTestId('reduction-sessions-value').textContent).toBe('1of 1');
    expect(durable.writeFailed).toBe(true);
    expect(storedPlanEvents(await inner.getAll('reductionRecords'))).toBe(0);

    recover();
    logUse();
    await durable.flush();

    expect(screen.queryByTestId('storage-banner')).toBeNull();
    expect(durable.writeFailed).toBe(false);
    // The retry writes the whole kept cache: both sessions reach the device.
    expect(storedPlanEvents(await inner.getAll('reductionRecords'))).toBe(2);
  });

  it('keeps Settings honest while writes are failing', async () => {
    const { durable } = await renderWithFaults();
    openSettings();
    expect(screen.getByTestId('storage-status').textContent).toBe(SETTINGS.storageOk);
    fireEvent.click(screen.getByRole('button', { name: SETTINGS.close }));

    logUse();
    await durable.flush();
    openSettings();

    expect(screen.getByTestId('storage-status').textContent).toBe(STORAGE_BANNER.writeFailed);
  });

  it('does not show the banner while writes succeed', async () => {
    const { durable, recover } = await renderWithFaults();
    recover();
    logUse();
    await durable.flush();

    expect(screen.queryByTestId('storage-banner')).toBeNull();
    expect(durable.writeFailed).toBe(false);
  });
});
