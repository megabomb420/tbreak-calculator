import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH } from '../../src/ui/copy.ts';
import { QUESTIONNAIRE } from '../../src/ui/questionnaire-copy.ts';
import { RESULT, recommendedBreakTitle } from '../../src/ui/result-copy.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_KEY,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { sampleProfile } from '../helpers.ts';

const AT = toInstant(1787184000000);
const clock = fixedClock(AT);

function renderApp(storage: StorageAdapter = createMemoryStorage()) {
  return render(<App storage={storage} clock={clock} />);
}

function completeTolerance10Days(storage: StorageAdapter) {
  const rendered = renderApp(storage);
  fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
  fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
  fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
  const flow = screen.getByTestId('questionnaire-flow');
  fireEvent.click(within(flow).getByRole('button', { name: 'Today' }));
  fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
  return rendered;
}

describe('result screens from engine output', () => {
  it('opens a tolerance result whose range matches the engine, not a UI band table', () => {
    completeTolerance10Days(createMemoryStorage());
    const result = screen.getByTestId('result-screen');
    expect(result.getAttribute('data-kind')).toBe('tolerance_result');
    expect(screen.getByRole('heading', { name: recommendedBreakTitle(7, 14) })).toBeTruthy();
    expect(result.textContent ?? '').toMatch(/Plan for 14 days/);
    expect(result.textContent ?? '').toMatch(/Limited certainty: this is a broad planning heuristic/);
    expect(result.textContent ?? '').not.toMatch(/100%/);
    expect(result.textContent ?? '').not.toMatch(/reset complete/i);
    expect(screen.getByTestId('withdrawal-track')).toBeTruthy();
  });

  it('Save without starting acknowledges the result and shows Today profile-no-break', () => {
    const storage = createMemoryStorage();
    completeTolerance10Days(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    expect(screen.queryByTestId('result-screen')).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
    fireEvent.click(screen.getByRole('button', { name: 'View result' }));
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('tolerance_result');
  });

  it('restores an open result after remount from the stored snapshot', () => {
    const storage = createMemoryStorage();
    const first = completeTolerance10Days(storage);
    expect(screen.getByTestId('result-screen')).toBeTruthy();
    first.unmount();
    renderApp(storage);
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('tolerance_result');
  });

  it('shows detection qualitative copy with no personal elapsed-time line', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
    fireEvent.click(screen.getByRole('button', { name: /Drug test info/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Hair' }));
    fireEvent.click(screen.getByRole('button', { name: /Just curious/ }));
    const result = screen.getByTestId('result-screen');
    expect(result.getAttribute('data-kind')).toBe('detection');
    expect(screen.getByTestId('detection-banner').textContent).toMatch(/Qualitative information only/);
    expect(result.textContent ?? '').toMatch(/historical record of exposure/);
    expect(result.textContent ?? '').not.toMatch(/days since your last use/i);
    expect(result.textContent ?? '').not.toMatch(/Day \d+ of \d+/);
  });

  it('Check another test type re-enters the questionnaire at Q2D', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
    fireEvent.click(screen.getByRole('button', { name: /Drug test info/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Urine' }));
    fireEvent.click(screen.getByRole('button', { name: /Workplace/ }));
    fireEvent.click(screen.getByRole('button', { name: RESULT.checkAnotherTest }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q2D');
  });

  it('does not render a withdrawal track on reduction-no-break planning', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
    fireEvent.click(screen.getByRole('button', { name: /Cut down/ }));
    fireEvent.click(screen.getByRole('button', { name: /Not now/ }));
    fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('reduction_planning');
    expect(screen.queryByTestId('withdrawal-track')).toBeNull();
    expect(screen.getByTestId('limit-days')).toBeTruthy();
  });

  it('treats a corrupt snapshot as absent and recovers to first-launch', () => {
    const storage = createMemoryStorage();
    storage.setItem(QUESTIONNAIRE_SNAPSHOT_KEY, '{not-json');
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('first-launch');
    expect(screen.queryByTestId('result-screen')).toBeNull();
    expect(createQuestionnaireSnapshotStore(storage).load()).toBeNull();
  });

  it('shows unavailable recovery when a stored snapshot cannot validate', () => {
    const storage = createMemoryStorage();
    createQuestionnaireSnapshotStore(storage).save({
      schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
      updatedAt: AT,
      snapshot: { kind: 'use_profile', profile: sampleProfile({ breakRequested: false }) },
    });
    renderApp(storage);
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('unavailable');
    fireEvent.click(screen.getByRole('button', { name: RESULT.startOver }));
    expect(screen.queryByTestId('result-screen')).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('first-launch');
  });
});
