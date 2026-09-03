import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH, HISTORY, PREVIOUS_BREAK } from '../../src/ui/copy.ts';
import { QUESTIONNAIRE } from '../../src/ui/questionnaire-copy.ts';
import { RESULT } from '../../src/ui/result-copy.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import { sampleProfile } from '../helpers.ts';

const AT = toInstant(1787184000000);
const clock = fixedClock(AT);

function renderApp(storage: StorageAdapter = createMemoryStorage(), persistent = true) {
  return render(<App storage={storage} clock={clock} persistent={persistent} />);
}

function completeTolerance10Days(storage: StorageAdapter) {
  renderApp(storage);
  fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
  fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
  fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
  const flow = screen.getByTestId('questionnaire-flow');
  fireEvent.click(within(flow).getByRole('button', { name: 'Today' }));
  fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
  fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: /1–6 months/ }));
}

describe('history tab and previous-break flow', () => {
  it('lists a frozen calculation after the questionnaire completes', () => {
    completeTolerance10Days(createMemoryStorage());
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByTestId('history-view')).toBeTruthy();
    expect(screen.getByTestId('history-add-past-break')).toBeTruthy();
    const row = screen.getByTestId('history-row');
    expect(row.getAttribute('data-kind')).toBe('calculation');
    fireEvent.click(row);
    expect(screen.getByTestId('result-screen').getAttribute('data-historical')).toBe('true');
    expect(screen.getByText(RESULT.historicalNote)).toBeTruthy();
  });

  it('adds a past break from the result and recalculates with history', () => {
    completeTolerance10Days(createMemoryStorage());
    fireEvent.click(screen.getByTestId('result-add-past-break'));
    expect(screen.getByTestId('previous-break-sheet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '1 week' }));
    fireEvent.input(screen.getByTestId('previous-break-score'), { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('previous-break-save-another'));
    fireEvent.click(screen.getByRole('button', { name: '2 weeks' }));
    fireEvent.input(screen.getByTestId('previous-break-score'), { target: { value: '8' } });
    fireEvent.click(screen.getByTestId('previous-break-save'));
    expect(screen.queryByTestId('previous-break-sheet')).toBeNull();
    expect(screen.getByTestId('result-recalculate-history')).toBeTruthy();
    fireEvent.click(screen.getByTestId('result-recalculate-history'));
    expect(screen.getByTestId('history-card').textContent).toMatch(/history never changes the recommended range/i);
  });

  it('adds a past break from History and supports per-item delete', () => {
    const storage = createMemoryStorage();
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
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByTestId('history-add-past-break'));
    fireEvent.click(screen.getByRole('button', { name: '1 week' }));
    fireEvent.click(screen.getByTestId('previous-break-save'));
    const past = screen.getAllByTestId('history-row').find((row) => row.getAttribute('data-kind') === 'previous-break');
    expect(past).toBeTruthy();
    const calc = screen.getAllByTestId('history-row').find((row) => row.getAttribute('data-kind') === 'calculation');
    expect(calc).toBeTruthy();
    fireEvent.click(calc!);
    fireEvent.click(screen.getByTestId('history-delete'));
    fireEvent.click(screen.getByTestId('confirm-dialog-action'));
    expect(screen.queryByTestId('result-screen')).toBeNull();
    const remaining = screen.getAllByTestId('history-row');
    expect(remaining.every((row) => row.getAttribute('data-kind') !== 'calculation')).toBe(true);
    expect(remaining.some((row) => row.getAttribute('data-kind') === 'previous-break')).toBe(true);
  });

  it('deletes a past break from the edit sheet', () => {
    const storage = createMemoryStorage();
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
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByTestId('history-add-past-break'));
    fireEvent.click(screen.getByRole('button', { name: '1 week' }));
    fireEvent.click(screen.getByTestId('previous-break-save'));
    const past = screen.getAllByTestId('history-row').find((row) => row.getAttribute('data-kind') === 'previous-break');
    fireEvent.click(past!);
    fireEvent.click(screen.getByTestId('previous-break-delete'));
    fireEvent.click(screen.getByTestId('confirm-dialog-action'));
    expect(screen.queryByTestId('previous-break-sheet')).toBeNull();
    expect(
      screen.queryAllByTestId('history-row').filter((row) => row.getAttribute('data-kind') === 'previous-break'),
    ).toHaveLength(0);
  });

  it('shows the storage banner when persistence is unavailable', () => {
    renderApp(createMemoryStorage(), false);
    expect(screen.getByTestId('storage-banner')).toBeTruthy();
  });

  it('offers a passive install hint after the first saved calculation', () => {
    completeTolerance10Days(createMemoryStorage());
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    expect(screen.getByTestId('install-hint')).toBeTruthy();
  });

  it('keeps the empty history prompt when nothing is stored', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByText(HISTORY.emptyTitle)).toBeTruthy();
    expect(screen.getByText(PREVIOUS_BREAK.title, { exact: false })).toBeTruthy();
  });
});
