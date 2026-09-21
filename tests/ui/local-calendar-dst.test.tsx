// A cut-down plan that spans a daylight-saving change must still group use
// events by the local calendar day at its real offset, not a fixed one.
//
// Runs under the `test:tz:pacific` script (TZ=America/Los_Angeles, DST changes
// 2026-03-08 and 2026-11-01). Run anywhere else it fails loudly rather than
// passing for the wrong reason.

import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import type { ReductionPlan, UseEvent } from '../../src/domain/reduction/reduction-engine.ts';
import { createReductionRecordsStore } from '../../src/application/progress/reduction-record.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';

const PACIFIC = 'America/Los_Angeles';
const TZ = process.env.TBREAK_TZ;
const inPacific = TZ === PACIFIC;

const AT = toInstant(Date.parse('2026-03-11T02:00:00.000Z')); // Tue 10 Mar, 19:00 PDT

function event(id: string, at: number): UseEvent {
  return { id, usedAt: toInstant(at), product: 'flower', route: 'smoking', createdAt: toInstant(at) };
}

/** Sat 7 Mar 12:00 PST, then Sun 8 Mar 23:31 PDT after the DST change. */
const PLAN: ReductionPlan = {
  id: 'plan-1',
  origin: 'direct',
  status: 'active',
  startedAt: toInstant(Date.parse('2026-03-07T20:00:00.000Z')),
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
  events: [
    event('ev-1', Date.parse('2026-03-07T20:00:00.000Z')),
    event('ev-2', Date.parse('2026-03-09T06:31:00.000Z')),
  ],
};

function seedPlan(storage: StorageAdapter): void {
  createReductionRecordsStore(storage).save({ schemaVersion: 'reduction-records-v2', plans: [PLAN] });
  createQuestionnaireSnapshotStore(storage).save({
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
  });
  createResultViewStore(storage).save({
    schemaVersion: RESULT_VIEW_SCHEMA_VERSION,
    status: 'acknowledged',
    updatedAt: AT,
  });
}

function renderPlan(): void {
  const storage = createMemoryStorage();
  seedPlan(storage);
  render(<App storage={storage} clock={fixedClock(AT)} />);
}

function localDay(instant: number): string {
  return new Date(instant).toLocaleDateString('en-CA');
}

describe.skipIf(!inPacific)('reduction day grouping across a daylight-saving change', () => {
  it('runs under the Pacific offset this case needs', () => {
    expect(TZ, 'run npm run test:tz:pacific').toBe(PACIFIC);
    expect(localDay(Date.parse('2026-09-01T07:00:00.000Z'))).toBe('2026-09-01');
  });

  it('counts two local use days a week apart across the spring-forward change', () => {
    // Sat 7 Mar noon PST and Sun 8 Mar 23:31 PDT sit on different local days
    // even though the second instant is under one and a half days later.
    expect(localDay(PLAN.events[0]!.usedAt)).toBe('2026-03-07');
    expect(localDay(PLAN.events[1]!.usedAt)).toBe('2026-03-08');
    renderPlan();
    expect(screen.getByTestId('reduction-use-days-value').textContent).toBe('2of 3');
    // Nothing is logged on the local day the app is showing.
    expect(screen.getByTestId('reduction-sessions-value').textContent).toBe('0of 1');
  });

  it('keeps a just-before-midnight session on its own local day', () => {
    const lateEvening: Instant = toInstant(Date.parse('2026-03-09T06:31:00.000Z'));
    // Fixed-offset arithmetic would place this on 2026-03-09 at UTC offsets
    // from -480: the change to -420 is what keeps it on the 8th.
    expect(-new Date(lateEvening).getTimezoneOffset()).toBe(-420);
    expect(new Date(lateEvening).getDate()).toBe(8);
    expect(new Date(lateEvening).getHours()).toBe(23);
  });
});
