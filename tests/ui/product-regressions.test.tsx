import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH } from '../../src/ui/copy.ts';
import { QUESTIONNAIRE } from '../../src/ui/questionnaire-copy.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { C0 } from '../helpers.ts';
import { createQuestionnaireProgressStore } from '../../src/application/progress/questionnaire-progress.ts';
import { PreviousBreakSheet } from '../../src/ui/previous-break-sheet.tsx';

function setupDate() {
  const storage = createMemoryStorage();
  render(<App storage={storage} clock={fixedClock(C0)} />);
  fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
  fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
  fireEvent.click(screen.getByRole('button', { name: /1–6 months/ }));
  fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
  return storage;
}
const continueButton = () => screen.getByRole('button', { name: QUESTIONNAIRE.continue }) as HTMLButtonElement;

describe('date and intake regressions', () => {
  it('clears the submitted answer when a valid native date is cleared, then accepts native change events', () => {
    const storage = setupDate();
    fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
    expect(continueButton().disabled).toBe(true);
    fireEvent.change(screen.getByTestId('date-picker'), { target: { value: '2026-08-18' } });
    expect(continueButton().disabled).toBe(false);
    fireEvent.input(screen.getByTestId('date-picker'), { target: { value: '' } });
    expect(continueButton().disabled).toBe(true);
    expect(createQuestionnaireProgressStore(storage).load()?.answers.lastUseAt).toBeUndefined();
    fireEvent.change(screen.getByTestId('date-picker'), { target: { value: '2026-08-19' } });
    expect(continueButton().disabled).toBe(false);
    fireEvent.click(continueButton());
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q4');
    // The displayed default of one session is a complete, usable answer.
    expect(continueButton().disabled).toBe(false);
    fireEvent.click(continueButton());
    expect(createQuestionnaireProgressStore(storage).load()?.answers.sessionsPerUseDay).toBe(1);
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q5');
  });

  it('restores the picked date and can switch away and back without a stuck Continue', () => {
    setupDate();
    fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
    fireEvent.input(screen.getByTestId('date-picker'), { target: { value: '2026-08-18' } });
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.back }));
    expect((screen.getByTestId('date-picker') as HTMLInputElement).value).toBe('2026-08-18');
    expect(screen.getByRole('button', { name: 'Pick a date' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: 'Today', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
    expect(continueButton().disabled).toBe(false);
    expect(screen.getByTestId('date-selection').textContent).toMatch(/18 Aug/);
  });

  it('rejects an out-of-range previous break date instead of silently dropping it', () => {
    render(<PreviousBreakSheet now={C0} onSave={() => { throw new Error('Invalid date saved'); }} onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('previous-break-ended'), { target: { value: '2026-08-21' } });
    expect((screen.getByTestId('previous-break-save') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByTestId('previous-break-skip-ended'));
    expect((screen.getByTestId('previous-break-save') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('main navigation and modal isolation', () => {
  it('makes all goals reachable from Calculator and restores Settings after Science', () => {
    render(<App storage={createMemoryStorage()} clock={fixedClock(C0)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Calculator', exact: true }));
    expect(screen.getByTestId('app-shell').getAttribute('data-active-tab')).toBe('calculator');
    expect(screen.getByTestId('app-shell').querySelectorAll('[data-goal]')).toHaveLength(4);
    fireEvent.click(screen.getByTestId('open-settings'));
    fireEvent.click(screen.getByTestId('settings-science'));
    expect(screen.getByTestId('app-shell').hasAttribute('inert')).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('science-basics')).toBeNull();
    expect(screen.getByTestId('settings-modal')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('settings-modal')).toBeNull();
    expect(screen.getByTestId('app-shell').hasAttribute('inert')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'History', exact: true }));
    expect(screen.getByTestId('app-shell').getAttribute('data-active-tab')).toBe('history');
  });

  it('keeps keyboard focus on the top confirmation and Escape returns to its parent', () => {
    render(<PreviousBreakSheet now={C0} onSave={() => {}} onDelete={() => {}} onClose={() => {}} />);
    screen.getByTestId('previous-break-delete').focus();
    fireEvent.click(screen.getByTestId('previous-break-delete'));
    const confirm = screen.getByTestId('confirm-dialog');
    expect(document.activeElement?.textContent).toBe('Cancel');
    const action = within(confirm).getByTestId('confirm-dialog-action');
    action.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement?.textContent).toBe('Cancel');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(screen.getByTestId('previous-break-sheet')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByTestId('previous-break-delete'));
  });
});
