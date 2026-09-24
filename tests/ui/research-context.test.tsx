// The result screen's research section replaced the former "Recovery outlook"
// mode. These regressions pin the product decision: one actionable number, one
// research explanation, and no competing estimated window.

import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH } from '../../src/ui/copy.ts';
import { QUESTIONNAIRE } from '../../src/ui/questionnaire-copy.ts';
import { RESEARCH } from '../../src/ui/research-copy.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import { createCalculationRecordsStore, freezeCalculation } from '../../src/application/persistence/calculation-record.ts';

const AT: Instant = toInstant(1787184000000);
const clock = fixedClock(AT);

function toleranceProfile(): UseProfileInput {
  return {
    goal: 'tolerance_reset',
    breakRequested: true,
    postBreakMode: null,
    thcUseDaysLast30: { value: 20, provenance: 'user_estimate' },
    sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
    products: ['flower'],
    routes: ['smoking'],
    lastUseAt: { value: new Date(AT - 2 * 86_400_000).toISOString(), provenance: 'user_estimate' },
    currentPatternDuration: { value: '1_to_6_months', provenance: 'user_estimate' },
    previousBreaks: [],
  };
}

/** Acknowledged profile plus its frozen calculation record. */
function seedSavedResult(storage: StorageAdapter, withRetiredOutlook: boolean): void {
  const snapshot = { kind: 'use_profile' as const, profile: toleranceProfile() };
  createQuestionnaireSnapshotStore(storage).save({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot,
    updatedAt: AT,
    runId: 'run-1',
  });
  createResultViewStore(storage).save({
    schemaVersion: RESULT_VIEW_SCHEMA_VERSION,
    status: 'acknowledged',
    updatedAt: AT,
  });
  const frozen = freezeCalculation('run-1', snapshot, AT);
  createCalculationRecordsStore(storage).save({
    schemaVersion: 'calculation-records-v1',
    records: [
      withRetiredOutlook
        ? { ...frozen, recoveryOutlookVersion: 'tolerance-recovery-outlook-v2' as const }
        : frozen,
    ],
    corrupt: [],
  });
}

function openLiveResult(): void {
  fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
  fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
  fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: /1–6 months/ }));
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
}

describe('tolerance result: one number, one research section', () => {
  it('shows the planning target with the research context open and no second estimated number', () => {
    render(<App storage={createMemoryStorage()} clock={clock} />);
    openLiveResult();
    const result = screen.getByTestId('result-screen');
    expect(result.getAttribute('data-kind')).toBe('tolerance_result');
    // One body: the plan panel is the result, not one of two modes.
    expect(screen.getByTestId('result-plan-panel')).toBeTruthy();
    expect(screen.queryByTestId('result-mode')).toBeNull();
    expect(screen.queryByTestId('result-reset-panel')).toBeNull();
    // No estimated recovery window survives anywhere on the screen.
    const text = result.textContent ?? '';
    expect(text).not.toMatch(/estimated recovery window/i);
    expect(text).not.toMatch(/about \d+–\d+ weeks/i);
    const research = screen.getByTestId('research-context');
    expect(within(research).getByText(RESEARCH.title)).toBeTruthy();
    expect(within(research).getAllByText(/four weeks/i).length).toBeGreaterThan(0);
    expect(within(research).getByText(RESEARCH.notTitle)).toBeTruthy();
    const points = [...screen.getByTestId('research-not-points').querySelectorAll('li')].map((item) => item.textContent);
    expect(points).toEqual([...RESEARCH.notPoints]);
    // The two human PET studies stay linked.
    const links = within(research).getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toContain('https://pubmed.ncbi.nlm.nih.gov/21747398/');
    expect(links).toContain('https://pubmed.ncbi.nlm.nih.gov/29560896/');
    // A fresh result never carries the retired-outlook line.
    expect(screen.queryByTestId('research-legacy-outlook')).toBeNull();
  });

  it('keeps the journey, the plan reasoning and the target as the only headline figure', () => {
    render(<App storage={createMemoryStorage()} clock={clock} />);
    openLiveResult();
    expect(screen.getByTestId('break-journey')).toBeTruthy();
    expect(screen.getByTestId('why-plan')).toBeTruthy();
    expect(screen.getByTestId('result-plan-panel')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Plan for \d+ days/ })).toBeTruthy();
  });
});

describe('saved results that predate the change', () => {
  it('explains the retired outlook on a record that carried one', () => {
    const storage = createMemoryStorage();
    seedSavedResult(storage, true);
    render(<App storage={storage} clock={clock} />);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByTestId('history-row'));
    const result = screen.getByTestId('result-screen');
    expect(result.getAttribute('data-historical')).toBe('true');
    expect(screen.getByTestId('research-legacy-outlook').textContent).toBe(RESEARCH.legacyOutlookNote);
  });

  it('leaves the note off a record that never carried one', () => {
    const storage = createMemoryStorage();
    seedSavedResult(storage, false);
    render(<App storage={storage} clock={clock} />);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByTestId('history-row'));
    expect(screen.getByTestId('research-context')).toBeTruthy();
    expect(screen.queryByTestId('research-legacy-outlook')).toBeNull();
  });
});
