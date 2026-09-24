// The support sheet (UX_SPEC 17): asked once after a calculation finishes,
// editable from Today's footer, and the source of the day's topic whenever no
// recent rating outranks it. Nothing is written until Save.

import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { createCompanionPersonalisationStore } from '../../src/application/progress/companion-personalisation.ts';
import { createBreakAttemptsStore } from '../../src/application/progress/break-attempt-record.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import { FIRST_LAUNCH } from '../../src/ui/copy.ts';
import { QUESTIONNAIRE } from '../../src/ui/questionnaire-copy.ts';
import { RESULT } from '../../src/ui/result-copy.ts';
import { SUPPORT_SHEET } from '../../src/ui/companion-copy.ts';
import { SUPPORT_GUIDES } from '../../src/application/presentation/daily-support.ts';
import type { StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';

const NOW = toInstant(Date.parse('2026-09-20T12:00:00Z'));
const DAY = 86_400_000;

function renderApp(storage: StorageAdapter = createMemoryStorage()) {
  render(<App storage={storage} clock={fixedClock(NOW)} />);
  return storage;
}

/** The shortest path through a tolerance questionnaire, ending on the result. */
function completeToleranceCalculation(storage: StorageAdapter): void {
  renderApp(storage);
  fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
  fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
  fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: /1–6 months/ }));
  fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '10' } });
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

function card(area: string): HTMLElement {
  return screen.getByTestId('support-area-cards').querySelector(`[data-support-area="${area}"]`)!;
}

/** An active chosen-length break on day 1, so Today renders the advice block. */
function seedActiveBreak(storage: StorageAdapter): void {
  createBreakAttemptsStore(storage).save({
    schemaVersion: 'break-attempts-v1',
    attempts: [{
      id: 'chosen', status: 'active', targetSource: 'chosen', calculationRecordId: null,
      targetDurationDays: 14, postBreakMode: 'continue_abstinence', startedAt: NOW - DAY,
      segments: [{ startedFromLastUseAt: NOW - DAY, endedAt: null, endReason: null }],
      postBreakPlan: { mode: 'continue_abstinence' }, preparation: null,
      completionAcknowledged: false, createdAt: NOW - DAY, updatedAt: NOW - DAY,
    } as never],
  });
}

describe('support topics', () => {
  it('asks once after a calculation finishes, over the result it belongs to', () => {
    const storage = createMemoryStorage();
    completeToleranceCalculation(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    const sheet = screen.getByTestId('support-areas-sheet');
    expect(within(sheet).getByText(SUPPORT_SHEET.title)).toBeTruthy();
    // Nothing chosen yet, and the sheet says so instead of guessing.
    expect(within(sheet).getByTestId('support-empty')).toBeTruthy();
  });

  it('writes nothing until Save, so backing out leaves the previous choice alone', () => {
    const storage = createMemoryStorage();
    completeToleranceCalculation(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    fireEvent.click(card('sleep'));
    expect(createCompanionPersonalisationStore(storage).loadOrMigrate().supportAreas).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: SUPPORT_SHEET.back }));
    expect(screen.queryByTestId('support-areas-sheet')).toBeNull();
    expect(createCompanionPersonalisationStore(storage).loadOrMigrate().supportAreas).toEqual([]);
  });

  it('saves the chosen topics and shows them in Today’s footer', () => {
    const storage = createMemoryStorage();
    completeToleranceCalculation(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    fireEvent.click(card('sleep'));
    fireEvent.click(card('boredom'));
    fireEvent.click(screen.getByTestId('save-support-areas'));
    expect(createCompanionPersonalisationStore(storage).loadOrMigrate().supportAreas).toEqual(['sleep', 'boredom']);
    expect(screen.queryByTestId('support-areas-sheet')).toBeNull();
    expect(screen.getByTestId('today-support').textContent).toBe(`${SUPPORT_SHEET.footerLink} · 2`);
  });

  it('makes the day’s advice follow the saved topics', () => {
    const storage = createMemoryStorage();
    createCompanionPersonalisationStore(storage).saveAreas(['nausea']);
    seedActiveBreak(storage);
    renderApp(storage);
    // Day 1 of a chosen 14-day break: the person's own topic leads, and the
    // day's own practice stays reachable through the topic picker.
    expect(screen.getByTestId('advice-block').getAttribute('data-area')).toBe('nausea');
    expect(screen.getByTestId('advice-action').textContent).toBe(SUPPORT_GUIDES.nausea.steps[0]);
    // The day's own task does not vanish when another topic leads the card:
    // it moves into the depth, under the topic's remaining steps.
    expect(screen.getByTestId('advice-practice').textContent).toBe(
      'Choose tomorrow’s wake-up time and set aside something quiet to do before bed.',
    );
  });

  it('reopens from the footer with the saved topics already selected', () => {
    const storage = createMemoryStorage();
    createCompanionPersonalisationStore(storage).saveAreas(['sleep', 'headaches']);
    seedActiveBreak(storage);
    renderApp(storage);
    fireEvent.click(screen.getByTestId('today-support'));
    expect(card('sleep').getAttribute('aria-pressed')).toBe('true');
    expect(card('headaches').getAttribute('aria-pressed')).toBe('true');
    expect(card('dreams').getAttribute('aria-pressed')).toBe('false');
    // Unticking both and saving clears the choice and the footer count.
    fireEvent.click(card('sleep'));
    fireEvent.click(card('headaches'));
    fireEvent.click(screen.getByTestId('save-support-areas'));
    expect(createCompanionPersonalisationStore(storage).loadOrMigrate().supportAreas).toEqual([]);
    expect(screen.getByTestId('today-support').textContent).toBe(SUPPORT_SHEET.footerLink);
  });

  it('keeps the day’s own practice when no topics were ever chosen', () => {
    const storage = createMemoryStorage();
    seedActiveBreak(storage);
    renderApp(storage);
    // Day 2's own practice is about winding down for sleep (DAILY_PRACTICES),
    // and no stored topic changes it.
    expect(screen.getByTestId('advice-block').getAttribute('data-area')).toBe('sleep');
    expect(screen.getByTestId('advice-action').textContent).toBe('Choose tomorrow’s wake-up time and set aside something quiet to do before bed.');
    // Its own task is the card, so it is not repeated in the depth.
    expect(screen.queryByTestId('advice-practice')).toBeNull();
    expect(screen.getByTestId('today-support').textContent).toBe(SUPPORT_SHEET.footerLink);
  });
});
