// Support topics (UX_SPEC 17): the areas this person wants help with during
// this break. Chosen after a calculation, carried into the break when it
// starts, reviewed rather than inherited by a later break, editable from
// Today's footer, and steered day by day in Help with. Nothing is written
// until Save, and a topic picked by hand belongs to one break day only.

import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
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
import { BREAK_START } from '../../src/ui/break-copy.ts';
import { SUPPORT_SHEET } from '../../src/ui/companion-copy.ts';
import { ADVICE_PICKER } from '../../src/ui/break-copy.ts';
import type { StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';

const NOW = toInstant(Date.parse('2026-09-20T12:00:00Z'));
const DAY = 86_400_000;

function renderApp(storage: StorageAdapter, now: number = NOW) {
  const rendered = render(<App storage={storage} clock={fixedClock(toInstant(now))} />);
  return { storage, rendered };
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

/** Starts the break the finished calculation just produced. */
function startBreak(): void {
  fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
  fireEvent.click(screen.getByTestId('save-support-areas'));
  fireEvent.click(screen.getByRole('button', { name: RESULT.startThisBreak }));
  const sheet = screen.getByTestId('break-start-sheet');
  fireEvent.click(within(sheet).getByRole('button', { name: /Occasional use/ }));
  fireEvent.click(within(sheet).getByRole('button', { name: BREAK_START.startBreak }));
}

function card(area: string): HTMLElement {
  return screen.getByTestId('support-area-cards').querySelector(`[data-support-area="${area}"]`)!;
}

function companion(storage: StorageAdapter) {
  return createCompanionPersonalisationStore(storage).loadOrMigrate();
}

function attemptRow(id: string, status: 'active' | 'ended', startedAt: number, updatedAt: number) {
  return {
    id, status, targetSource: 'chosen' as const, calculationRecordId: null,
    targetDurationDays: 14, postBreakMode: 'continue_abstinence' as const, startedAt,
    segments: [{ startedFromLastUseAt: startedAt, endedAt: status === 'ended' ? updatedAt : null, endReason: status === 'ended' ? 'user_ended' : null }],
    postBreakPlan: { mode: 'continue_abstinence' as const }, preparation: null,
    completionAcknowledged: false, createdAt: startedAt, updatedAt,
  };
}

/** An active chosen-length break, so Today renders the advice block. */
function seedActiveBreak(storage: StorageAdapter, options: { id?: string; startedAt?: number } = {}): string {
  const id = options.id ?? 'chosen';
  const startedAt = options.startedAt ?? NOW - DAY;
  createBreakAttemptsStore(storage).save({
    schemaVersion: 'break-attempts-v1',
    attempts: [attemptRow(id, 'active', startedAt, startedAt) as never],
  });
  return id;
}

function pickAdvice(area: string): void {
  const select = screen.getByTestId('advice-picker') as HTMLSelectElement;
  select.value = area;
  fireEvent.input(select);
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
    createCompanionPersonalisationStore(storage).saveAreas(['nausea'], { id: 'old', day: 2 });
    completeToleranceCalculation(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    fireEvent.click(card('sleep'));
    expect(companion(storage).supportAreas).toEqual(['nausea']);
    fireEvent.click(screen.getByRole('button', { name: SUPPORT_SHEET.back }));
    expect(screen.queryByTestId('support-areas-sheet')).toBeNull();
    expect(companion(storage).supportAreas).toEqual(['nausea']);
  });

  it('saves the chosen topics in taxonomy order and counts them in Today’s footer', () => {
    const storage = createMemoryStorage();
    completeToleranceCalculation(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    // Tapped boredom first: the order of the taps decides nothing.
    fireEvent.click(card('boredom'));
    fireEvent.click(card('sleep'));
    fireEvent.click(screen.getByTestId('save-support-areas'));
    expect(companion(storage).supportAreas).toEqual(['sleep', 'boredom']);
    expect(screen.queryByTestId('support-areas-sheet')).toBeNull();
    expect(screen.getByTestId('today-support').textContent).toBe(`${SUPPORT_SHEET.footerLink} · 2`);
  });

  it('gives the topics chosen before the break to that break, and leads day 1 with them', () => {
    const storage = createMemoryStorage();
    completeToleranceCalculation(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    fireEvent.click(card('nausea'));
    fireEvent.click(card('sleep'));
    fireEvent.click(screen.getByTestId('save-support-areas'));
    // Chosen with no break in hand: meant for the break that starts next.
    expect(companion(storage).forBreak).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: RESULT.startThisBreak }));
    const sheet = screen.getByTestId('break-start-sheet');
    fireEvent.click(within(sheet).getByRole('button', { name: /Occasional use/ }));
    fireEvent.click(within(sheet).getByRole('button', { name: BREAK_START.startBreak }));
    const attempt = createBreakAttemptsStore(storage).load()!.attempts[0]!;
    expect(companion(storage).forBreak).toBe(attempt.id);
    expect(companion(storage).confirmedDay).toBe(1);
    // Day 1 is the first topic in taxonomy order, and the card says whose it is.
    expect(screen.getByTestId('advice-block').getAttribute('data-area')).toBe('sleep');
    expect(screen.getByTestId('advice-source').textContent).toBe(ADVICE_PICKER.sourceChosen);
    expect(screen.getByTestId('advice-topics').textContent).toBe(SUPPORT_SHEET.turns);
    expect(screen.getByTestId('today-support').textContent).toBe(`${SUPPORT_SHEET.footerLink} · 2`);
  });

  it('offers a later break the topics from the last one instead of inheriting them', () => {
    const storage = createMemoryStorage();
    createCompanionPersonalisationStore(storage).saveAreas(['sleep', 'nausea'], { id: 'earlier', day: 2 });
    createBreakAttemptsStore(storage).save({
      schemaVersion: 'break-attempts-v1',
      attempts: [
        attemptRow('earlier', 'ended', NOW - 20 * DAY, NOW - 6 * DAY) as never,
        attemptRow('current', 'active', NOW - DAY, NOW - DAY) as never,
      ],
    });
    renderApp(storage);
    // Day 2 of the new break shows its own practice, not the old list, and the
    // block offers the list back rather than applying it.
    expect(screen.getByTestId('advice-block').getAttribute('data-area')).toBe('sleep');
    expect(screen.getByTestId('advice-source').textContent).toBe(ADVICE_PICKER.sourceSuggested);
    expect(screen.getByTestId('advice-topics').textContent).toContain('Last break’s topics: Sleep, Nausea.');
    expect(screen.getByTestId('today-support').textContent).toBe(SUPPORT_SHEET.footerLink);
    fireEvent.click(screen.getByTestId('support-use-last'));
    expect(companion(storage).forBreak).toBe('current');
    expect(companion(storage).confirmedDay).toBe(2);
    expect(screen.getByTestId('advice-block').getAttribute('data-area')).toBe('sleep');
    expect(screen.getByTestId('advice-source').textContent).toBe(ADVICE_PICKER.sourceChosen);
    expect(screen.getByTestId('today-support').textContent).toBe(`${SUPPORT_SHEET.footerLink} · 2`);
  });

  it('opens the sheet for review when a later calculation finds a list from another break', () => {
    const storage = createMemoryStorage();
    createCompanionPersonalisationStore(storage).saveAreas(['sleep'], { id: 'earlier', day: 2 });
    completeToleranceCalculation(storage);
    fireEvent.click(screen.getByRole('button', { name: RESULT.saveWithoutStarting }));
    // The list is shown, selected, and named as the last break's rather than
    // silently reused.
    const sheet = screen.getByTestId('support-areas-sheet');
    expect(within(sheet).getByText(SUPPORT_SHEET.carried)).toBeTruthy();
    expect(card('sleep').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByTestId('save-support-areas'));
    const record = companion(storage);
    expect(record.supportAreas).toEqual(['sleep']);
    expect(record.forBreak).toBeNull();
  });

  it('keeps a topic picked by hand for that break day, across a reload', () => {
    const storage = createMemoryStorage();
    const id = seedActiveBreak(storage);
    createCompanionPersonalisationStore(storage).saveAreas(['sleep', 'nausea'], { id, day: 1 });
    renderApp(storage);
    // Day 2's turn is the second topic; picking another replaces it in place.
    expect(screen.getByTestId('advice-block').getAttribute('data-area')).toBe('nausea');
    pickAdvice('headaches');
    expect(screen.getByTestId('advice-block').getAttribute('data-area')).toBe('headaches');
    expect(screen.getByTestId('advice-source').textContent).toBe(ADVICE_PICKER.sourcePicked);
    expect(companion(storage).pick).toEqual({ breakId: id, day: 2, area: 'headaches' });
    cleanup();
    renderApp(storage);
    expect(screen.getByTestId('advice-block').getAttribute('data-area')).toBe('headaches');
    expect((screen.getByTestId('advice-picker') as HTMLSelectElement).value).toBe('headaches');
    // The next break day starts on its own turn again.
    cleanup();
    renderApp(storage, NOW + DAY);
    expect(screen.getByTestId('advice-block').getAttribute('data-area')).toBe('sleep');
    expect(screen.getByTestId('advice-source').textContent).toBe(ADVICE_PICKER.sourceChosen);
    expect((screen.getByTestId('advice-picker') as HTMLSelectElement).value).toBe('');
    // Going back to the automatic topic for today clears the pick.
    pickAdvice('nausea');
    expect(companion(storage).pick).toEqual({ breakId: id, day: 3, area: 'nausea' });
  });

  it('rebinds the topics saved mid-break to the day they were saved on', () => {
    const storage = createMemoryStorage();
    const id = seedActiveBreak(storage, { startedAt: NOW - 4 * DAY });
    createCompanionPersonalisationStore(storage).saveAreas(['sleep'], { id, day: 1 });
    renderApp(storage);
    // Day 5 of the break, a different topic chosen from Today's footer.
    fireEvent.click(screen.getByTestId('today-support'));
    expect(card('sleep').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(card('headaches'));
    fireEvent.click(screen.getByTestId('save-support-areas'));
    const record = companion(storage);
    expect(record.supportAreas).toEqual(['sleep', 'headaches']);
    expect(record.forBreak).toBe(id);
    expect(record.confirmedDay).toBe(5);
    // The first topic of the new set leads today rather than an arbitrary one.
    expect(screen.getByTestId('advice-block').getAttribute('data-area')).toBe('sleep');
    expect(screen.getByTestId('advice-source').textContent).toBe(ADVICE_PICKER.sourceChosen);
  });

  it('separates this break’s topics from the rest of the guides in Help with', () => {
    const storage = createMemoryStorage();
    const id = seedActiveBreak(storage);
    createCompanionPersonalisationStore(storage).saveAreas(['sleep', 'nausea'], { id, day: 1 });
    renderApp(storage);
    const select = screen.getByTestId('advice-picker') as HTMLSelectElement;
    const groups = [...select.querySelectorAll('optgroup')];
    expect(groups.map((group) => group.getAttribute('label'))).toEqual([ADVICE_PICKER.topicGroup, ADVICE_PICKER.allTopicsGroup]);
    expect([...groups[0]!.querySelectorAll('option')].map((option) => option.value)).toEqual(['sleep', 'nausea']);
    expect([...groups[1]!.querySelectorAll('option')].map((option) => option.value)).toEqual(
      ['anxiety', 'irritability', 'low_mood', 'dreams', 'cravings', 'routine', 'boredom', 'appetite', 'headaches'],
    );
    // The first option names the topic the app would show by itself.
    expect(select.options[0]!.textContent).toBe(ADVICE_PICKER.suggestionOption('Nausea'));
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
    // Nothing chosen yet: the block asks rather than pretending.
    expect(screen.getByTestId('advice-topics').textContent).toContain(SUPPORT_SHEET.askChoose);
    fireEvent.click(screen.getByTestId('support-choose'));
    expect(screen.getByTestId('support-areas-sheet')).toBeTruthy();
    expect(screen.getByTestId('support-empty')).toBeTruthy();
  });

  it('reopens from the footer with this break’s topics already selected', () => {
    const storage = createMemoryStorage();
    const id = seedActiveBreak(storage);
    createCompanionPersonalisationStore(storage).saveAreas(['sleep', 'headaches'], { id, day: 1 });
    renderApp(storage);
    fireEvent.click(screen.getByTestId('today-support'));
    expect(card('sleep').getAttribute('aria-pressed')).toBe('true');
    expect(card('headaches').getAttribute('aria-pressed')).toBe('true');
    expect(card('dreams').getAttribute('aria-pressed')).toBe('false');
    // The sheet is about this break, so it does not claim to be a carried list.
    expect(screen.queryByText(SUPPORT_SHEET.carried)).toBeNull();
    // Unticking both and saving clears the choice and the footer count.
    fireEvent.click(card('sleep'));
    fireEvent.click(card('headaches'));
    fireEvent.click(screen.getByTestId('save-support-areas'));
    expect(companion(storage).supportAreas).toEqual([]);
    expect(companion(storage).forBreak).toBe(id);
    expect(screen.getByTestId('today-support').textContent).toBe(SUPPORT_SHEET.footerLink);
  });
});
