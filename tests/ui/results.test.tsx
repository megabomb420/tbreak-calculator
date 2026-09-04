import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH } from '../../src/ui/copy.ts';
import { QUESTIONNAIRE } from '../../src/ui/questionnaire-copy.ts';
import { RESULT } from '../../src/ui/result-copy.ts';
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
  // Duration is the first use-profile question, then use-days, then last use.
  fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: /1–6 months/ }));
  fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
  const flow = screen.getByTestId('questionnaire-flow');
  fireEvent.click(within(flow).getByRole('button', { name: 'Today' }));
  fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
  // Tolerance-v3 reads intensity from 4 use-days up: answer sessions + products.
  fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: '1' }));
  fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: QUESTIONNAIRE.continue }));
  const q5 = screen.getByTestId('questionnaire-flow');
  fireEvent.click(within(q5).getByRole('button', { name: /Flower/ }));
  fireEvent.click(within(q5).getByRole('button', { name: 'Smoking' }));
  fireEvent.click(within(q5).getByRole('button', { name: QUESTIONNAIRE.continue }));
  return rendered;
}

describe('result screens from engine output', () => {
  it('opens a tolerance result whose range matches the engine, not a UI band table', () => {
    completeTolerance10Days(createMemoryStorage());
    const result = screen.getByTestId('result-screen');
    expect(result.getAttribute('data-kind')).toBe('tolerance_result');
    // The actionable planning target leads the hero; the broad evidence range
    // is stated directly underneath so the two are never conflated.
    expect(screen.getByRole('heading', { name: '7 days' })).toBeTruthy();
    expect(screen.getByTestId('result-lens-plan')).toBeTruthy();
    expect(result.textContent ?? '').toMatch(/Evidence range: 7–14 days/);
    // 10 use days + "1–6 months" + a single flower session is a recently
    // established regular pattern: the planner targets the lower anchor (7).
    expect(result.textContent ?? '').toMatch(/Limited certainty: this is a broad planning heuristic/);
    expect(result.textContent ?? '').not.toMatch(/100%/);
    expect(result.textContent ?? '').not.toMatch(/reset complete/i);
    expect(screen.getByTestId('break-outlook')).toBeTruthy();
    expect(screen.getByTestId('outlook-day-strip')).toBeTruthy();
    // Consecutive equivalent days are grouped: 7-day target = Day 1 / Days
    // 2–3 / Days 4–6 / Day 7.
    expect(screen.getByTestId('outlook-seg-2-3')).toBeTruthy();
    expect(screen.getByTestId('outlook-seg-4-6')).toBeTruthy();
    expect(screen.getByTestId('outlook-seg-7-7')).toBeTruthy();
    expect(screen.queryByTestId('outlook-seg-8-8')).toBeNull();
    expect(result.textContent ?? '').toMatch(/This current pattern has been typical for a few months/);
    expect(result.textContent ?? '').toMatch(/lower end of the 7–14-day range/);
    expect(screen.getByTestId('cb1-note')).toBeTruthy();
  });

  it('shows exactly Days 1–2 for a recent infrequent pattern and Days 1–7 for a long-established one', () => {
    const rareStorage = createMemoryStorage();
    const rare = renderApp(rareStorage);
    fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
    fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
    fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: /Less than 1 month/ }));
    fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
    let flow = screen.getByTestId('questionnaire-flow');
    fireEvent.click(within(flow).getByRole('button', { name: 'Today' }));
    fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
    // Recent pattern: lower anchor of the 2–7 evidence range (target 2).
    expect(screen.getByTestId('break-outlook').getAttribute('data-target')).toBe('2');
    expect(screen.getByTestId('outlook-seg-2-2')).toBeTruthy();
    expect(screen.queryByTestId('outlook-seg-3-3')).toBeNull();
    expect(screen.getByTestId('result-screen').textContent ?? '').toMatch(/weeks rather than years/);
    expect(screen.getByTestId('result-screen').textContent ?? '').toMatch(/lower end/);
    rare.unmount();

    // Same infrequent frequency, long-established: upper anchor of 2–7.
    renderApp(createMemoryStorage());
    fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
    fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
    fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: /5\+ years/ }));
    fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
    flow = screen.getByTestId('questionnaire-flow');
    fireEvent.click(within(flow).getByRole('button', { name: 'Today' }));
    fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
    expect(screen.getByTestId('break-outlook').getAttribute('data-target')).toBe('7');
    expect(screen.getByTestId('outlook-seg-7-7')).toBeTruthy();
    expect(screen.queryByTestId('outlook-seg-8-8')).toBeNull();
    expect(screen.getByTestId('result-screen').textContent ?? '').toMatch(/upper end of the 2–7-day range/);
  });

  it('shows exactly Days 1–28 for daily use', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
    fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
    fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: /5\+ years/ }));
    fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
    let flow = screen.getByTestId('questionnaire-flow');
    fireEvent.click(within(flow).getByRole('button', { name: 'Today' }));
    fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
    flow = screen.getByTestId('questionnaire-flow');
    fireEvent.click(within(flow).getByRole('button', { name: '1' }));
    fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
    flow = screen.getByTestId('questionnaire-flow');
    fireEvent.click(within(flow).getByRole('button', { name: 'Flower (bud)' }));
    fireEvent.click(within(flow).getByRole('button', { name: 'Smoking' }));
    fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
    expect(screen.getByTestId('break-outlook').getAttribute('data-target')).toBe('28');
    // The 28-day journey is grouped into meaningful consecutive ranges; the
    // final milestone day stays a single Day 28 and nothing extends beyond it.
    expect(screen.getByTestId('outlook-seg-2-3')).toBeTruthy();
    expect(screen.getByTestId('outlook-seg-4-6')).toBeTruthy();
    expect(screen.getByTestId('outlook-seg-8-13')).toBeTruthy();
    expect(screen.getByTestId('outlook-seg-28-28')).toBeTruthy();
    expect(screen.queryByTestId('outlook-seg-29-29')).toBeNull();
    expect(screen.queryByTestId('outlook-seg-3-3')).toBeNull();
    expect(screen.getByTestId('result-screen').textContent ?? '').toMatch(/many years/);
  });

  it('Save without starting acknowledges the result and shows Today profile-no-break', () => {
    const storage = createMemoryStorage();
    completeTolerance10Days(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    expect(screen.queryByTestId('result-screen')).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
    // The saved tolerance result on Today reuses the shared result lens: the
    // actionable planning target leads the card, the broad evidence range is
    // a secondary line, and the RangeBand receives the same target/range.
    const card = screen.getByTestId('state-profile-no-break');
    expect(within(card).getByRole('heading', { name: '7 days' })).toBeTruthy();
    expect(within(card).queryByRole('heading', { name: '7–14 days' })).toBeNull();
    expect(within(card).getByText('Evidence range: 7–14 days')).toBeTruthy();
    expect(within(card).getByRole('img', { name: 'Recommended break 7 to 14 days, plan for 7 days' })).toBeTruthy();
    expect(within(card).getByText('Your target within the recommended range.')).toBeTruthy();
    // The planning-heuristic caveat stays visible in the compact card.
    expect(card.textContent ?? '').toMatch(/Limited certainty: this is a broad planning heuristic/);
    // Start-this-break stays the primary action; Recalculate and View result
    // remain available as secondary actions on the same card.
    expect(within(card).getByTestId('today-start-break')).toBeTruthy();
    expect(within(card).getByTestId('today-recalculate')).toBeTruthy();
    expect(within(card).getByTestId('view-result')).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: 'View result' }));
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

  it('persists reduction limits and shows them on Today', () => {
    const storage = createMemoryStorage();
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
    fireEvent.click(screen.getByRole('button', { name: /Cut down/ }));
    fireEvent.click(screen.getByRole('button', { name: /Not now/ }));
    fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
    expect(screen.getByTestId('limit-days').textContent).toBe('3');
    fireEvent.click(screen.getByRole('button', { name: 'Increase Max use days per week' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Max use days per week' }));
    expect(screen.getByTestId('limit-days').textContent).toBe('5');
    fireEvent.click(screen.getByRole('button', { name: RESULT.done }));
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
    expect(screen.getByTestId('reduction-limits').textContent).toMatch(/Up to 5 use days a week/);
    fireEvent.click(screen.getByTestId('view-result'));
    expect(screen.getByTestId('limit-days').textContent).toBe('5');
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
