import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { createBreakAttemptsStore } from '../../src/application/progress/break-attempt-record.ts';
import { createCheckinsStore } from '../../src/application/progress/checkin-store.ts';
import { createCompanionPersonalisationStore } from '../../src/application/progress/companion-personalisation.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const NOW = toInstant(Date.parse('2026-09-20T12:00:00Z'));
const START = toInstant(NOW - 3 * 86_400_000);
function setup() {
  const storage = createMemoryStorage();
  createBreakAttemptsStore(storage).save({ schemaVersion: 'break-attempts-v1', attempts: [{
    id: 'chosen', status: 'active', targetSource: 'chosen', calculationRecordId: null,
    targetDurationDays: 14, postBreakMode: 'continue_abstinence', startedAt: START,
    segments: [{ startedFromLastUseAt: START, endedAt: null, endReason: null }],
    postBreakPlan: { mode: 'continue_abstinence' }, preparation: null, completionAcknowledged: false,
    createdAt: START, updatedAt: START,
  }] });
  const app = render(<App storage={storage} clock={fixedClock(NOW)} />);
  return { storage, app };
}

function rate(name: string, value: number): void {
  const slider = screen.getByRole('slider', { name });
  fireEvent.pointerDown(slider);
  fireEvent.input(slider, { target: { value: String(value) } });
}

const AREAS = ['sleep', 'cravings', 'appetite', 'anxiety', 'irritability', 'low_mood', 'dreams', 'nausea', 'headaches', 'routine', 'boredom'];

/** The topics whose guides render, in order. */
function adviceTopicIds(): string[] {
  return [...screen.getByTestId('daily-support').querySelectorAll('[data-testid^="advice-"]')]
    .map((el) => el.getAttribute('data-testid')!.replace('advice-', ''))
    .filter((id) => AREAS.includes(id));
}

describe('practical Today advice', () => {
  it('updates advice immediately after check-in and preserves it on reload and a later no-use tap', () => {
    const { storage, app } = setup();
    expect(screen.getByTestId('advice-basis').textContent).toContain('Rate how you feel');
    fireEvent.click(screen.getByTestId('add-symptoms'));
    rate('Sleep quality', 2);
    rate('Craving', 8);
    fireEvent.click(screen.getByTestId('symptoms-save'));
    // Both rated areas are 8 oriented: both guides render, hardest reading first.
    expect(screen.getByTestId('advice-sleep-reason').textContent).toContain('Sleep quality 2/10');
    expect(screen.getByTestId('advice-cravings-reason').textContent).toContain('Craving 8/10');
    expect(createCheckinsStore(storage).load()!.checkins.at(-1)!.appetite).toBeNull();
    app.unmount();
    render(<App storage={storage} clock={fixedClock(NOW)} />);
    expect(screen.getByTestId('advice-sleep')).toBeTruthy();
    fireEvent.click(screen.getByTestId('checkin-cta'));
    expect(screen.getByTestId('advice-sleep')).toBeTruthy();
  });

  it('renders a guide for every area rated 4 or harder, ordered by severity', () => {
    setup();
    fireEvent.click(screen.getByTestId('add-symptoms'));
    rate('Sleep quality', 2);
    rate('Appetite', 1);
    rate('Craving', 8);
    rate('Anxiety', 7);
    fireEvent.click(screen.getByTestId('symptoms-save'));
    expect(screen.getByTestId('advice-basis').textContent).toBe('Picked from your recent check-ins.');
    // Appetite 1/10 is the hardest oriented rating, then sleep, craving, anxiety.
    expect(adviceTopicIds()).toEqual(['appetite', 'sleep', 'cravings', 'anxiety']);
    expect(screen.queryByTestId('advice-routine')).toBeNull();
    expect(screen.queryByTestId('advice-boredom')).toBeNull();
  });

  it('keeps one stage topic for a day with no ratings instead of two default essays', () => {
    setup();
    expect(adviceTopicIds()).toEqual(['cravings']);
    expect(screen.getByTestId('advice-cravings-reason').textContent).toContain('For this stage of the break');
    expect(screen.queryByTestId('advice-routine')).toBeNull();
    expect(screen.queryByTestId('advice-boredom')).toBeNull();
    expect(screen.getByTestId('advice-basis').textContent).toContain('Rate how you feel');
    expect(screen.queryByTestId('rating-topics')).toBeNull();
  });

  it('does not present an area the user rated as comfortable as a problem', () => {
    setup();
    fireEvent.click(screen.getByTestId('add-symptoms'));
    fireEvent.click(screen.getByRole('button', { name: 'Set Craving to zero' }));
    fireEvent.click(screen.getByTestId('symptoms-save'));
    expect(screen.getByTestId('advice-cravings-reason').textContent).toBe('For this stage of the break');
    expect(screen.getByTestId('advice-basis').textContent).toBe('Picked from your recent check-ins.');
  });

  it('undo survives reload, repeated taps do not duplicate, and earlier ratings remain', () => {
    const { storage, app } = setup();
    const prior = { recordedAt: new Date(NOW - 86400000).toISOString(), usedThc: false, usedAt: null,
      craving: 7, sleep: 2, anxiety: null, irritability: null, appetite: null, note: 'yesterday' };
    createCheckinsStore(storage).save({ schemaVersion: 'checkins-v1', checkins: [prior] });
    fireEvent.click(screen.getByTestId('checkin-cta'));
    fireEvent.click(screen.getByTestId('checkin-cta'));
    expect(createCheckinsStore(storage).load()!.checkins).toHaveLength(2);
    expect(screen.queryByTestId('checkin-flow')).toBeNull();
    app.unmount();
    render(<App storage={storage} clock={fixedClock(NOW)} />);
    expect(screen.getByTestId('checkin-cta').textContent).toBe('Checked in today');
    fireEvent.click(screen.getByTestId('undo-checkin'));
    expect(screen.getByTestId('checkin-cta').textContent).toBe('Check in');
    expect(createCheckinsStore(storage).load()!.checkins).toEqual([prior]);
    expect(screen.getByTestId('advice-sleep-reason').textContent).toContain('Sleep quality 2/10');
  });

  it('keeps the break clock and plan unchanged when checking in', () => {
    const { storage } = setup();
    const before = createBreakAttemptsStore(storage).load()!.attempts[0]!.segments;
    fireEvent.click(screen.getByTestId('checkin-cta'));
    expect(screen.queryByTestId('report-use')).toBeNull();
    expect(screen.queryByTestId('confirm-use')).toBeNull();
    expect(createBreakAttemptsStore(storage).load()!.attempts[0]!.segments).toEqual(before);
    expect(createCheckinsStore(storage).load()!.checkins.at(-1)!.usedThc).toBe(false);
  });

  it('opens another topic from the list without writing stored data and keeps its sources', () => {
    const { storage } = setup();
    fireEvent.click(screen.getByTestId('support-switch'));
    const topics = screen.getByTestId('support-topics');
    fireEvent.click(within(topics).getByRole('button', { name: 'Nausea' }));
    // The opened topic is appended after the day's own topics, never replacing them.
    expect(adviceTopicIds()).toEqual(['cravings', 'nausea']);
    const nausea = screen.getByTestId('advice-nausea');
    expect(within(nausea).getByTestId('advice-nausea-action').textContent).toContain('small, regular sips');
    expect(nausea.textContent).toContain('Repeated vomiting');
    expect(within(nausea).getByRole('link', { name: /NHS/ }).getAttribute('href')).toContain('nhs.uk');
    expect(createCompanionPersonalisationStore(storage).loadOrMigrate().supportAreas).toEqual([]);
  });

  it('discloses that a rating stops counting after 48 hours', () => {
    setup();
    fireEvent.click(screen.getByTestId('support-switch'));
    expect(screen.getByTestId('support-topics-note').textContent).toMatch(/A rating stops counting after 48 hours/);
  });

  it('opens on what the day already stored, and can take a rating back', () => {
    const storage = createMemoryStorage();
    createBreakAttemptsStore(storage).save({ schemaVersion: 'break-attempts-v1', attempts: [{
      id: 'chosen', status: 'active', targetSource: 'chosen', calculationRecordId: null,
      targetDurationDays: 14, postBreakMode: 'continue_abstinence', startedAt: START,
      segments: [{ startedFromLastUseAt: START, endedAt: null, endReason: null }],
      postBreakPlan: { mode: 'continue_abstinence' }, preparation: null, completionAcknowledged: false,
      createdAt: START, updatedAt: START,
    }] });
    createCheckinsStore(storage).save({ schemaVersion: 'checkins-v1', checkins: [{
      recordedAt: new Date(NOW).toISOString(), usedThc: false, usedAt: null,
      craving: 6, sleep: null, anxiety: null, irritability: null, appetite: null, note: 'earlier',
    }] });
    render(<App storage={storage} clock={fixedClock(NOW)} />);
    fireEvent.click(screen.getByTestId('add-symptoms'));
    // The saved rating is shown, so it can be changed instead of being untouchable.
    expect(screen.getByTestId('symptom-craving-readout').textContent).toBe('6');
    fireEvent.click(screen.getByRole('button', { name: 'Leave Craving unrecorded' }));
    expect(screen.getByTestId('symptom-craving-readout').textContent).toBe('Not set');
    fireEvent.click(screen.getByTestId('symptoms-save'));
    // The day's report is updated in place, not duplicated.
    const rows = createCheckinsStore(storage).load()!.checkins;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.craving).toBeNull();
  });
});
