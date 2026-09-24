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

/** Tap a rating on the card and save it, the way the screen works. */
function rate(field: string, value: number): void {
  fireEvent.click(screen.getByTestId(`symptom-${field}-${value}`));
}
function saveReport(): void {
  fireEvent.click(screen.getByTestId('symptoms-save'));
}

/** The one card Today shows, plus its two open-on-demand lists. */
function card(): HTMLElement {
  return screen.getByTestId('support-card');
}

describe('practical Today advice', () => {
  it('updates advice immediately after check-in and preserves it on reload and a later no-use tap', () => {
    const { storage, app } = setup();
    expect(screen.getByTestId('advice-basis').textContent).toContain('Rate how you feel');
    rate('sleep', 2);
    rate('craving', 8);
    saveReport();
    // Both ratings are severity 8; FIELD_AREAS lists sleep first, so sleep leads
    // and the craving becomes a one-tap alternative instead of a second essay.
    expect(card().getAttribute('data-area')).toBe('sleep');
    expect(screen.getByTestId('support-reason').textContent).toContain('Sleep quality 2/10');
    expect(within(screen.getByTestId('support-also')).getByText('Cravings')).toBeTruthy();
    expect(screen.getAllByTestId('support-card')).toHaveLength(1);
    expect(createCheckinsStore(storage).load()!.checkins.at(-1)!.appetite).toBeNull();
    app.unmount();
    render(<App storage={storage} clock={fixedClock(NOW)} />);
    expect(card().getAttribute('data-area')).toBe('sleep');
    fireEvent.click(screen.getByTestId('checkin-cta'));
    expect(card().getAttribute('data-area')).toBe('sleep');
  });

  it('orders every area rated 4 or harder behind one card instead of one article each', () => {
    setup();
    rate('sleep', 2);
    rate('appetite', 1);
    rate('craving', 8);
    rate('anxiety', 7);
    saveReport();
    expect(screen.getByTestId('advice-basis').textContent).toBe('Picked from your recent check-ins.');
    // Appetite 1/10 is the hardest oriented rating, so it leads.
    expect(card().getAttribute('data-area')).toBe('appetite');
    const also = screen.getByTestId('support-also');
    for (const label of ['Sleep', 'Cravings', 'Anxiety']) {
      expect(within(also).getByText(label)).toBeTruthy();
    }
    expect(screen.getAllByTestId('support-card')).toHaveLength(1);
    expect(screen.queryByTestId('advice-routine')).toBeNull();
    expect(screen.queryByTestId('advice-boredom')).toBeNull();
  });

  it('keeps one stage topic for a day with no ratings instead of two default essays', () => {
    setup();
    expect(card().getAttribute('data-area')).toBe('cravings');
    expect(screen.getByTestId('support-reason').textContent).toContain('For this stage of the break');
    expect(screen.queryByTestId('support-also')).toBeNull();
    expect(screen.queryByTestId('advice-routine')).toBeNull();
    expect(screen.queryByTestId('advice-boredom')).toBeNull();
    expect(screen.getByTestId('advice-basis').textContent).toContain('Rate how you feel');
  });

  it('does not present an area the user rated as comfortable as a problem', () => {
    setup();
    rate('craving', 0);
    saveReport();
    // The card falls back to the day's practice and names no rating.
    expect(screen.getByTestId('support-reason').textContent).toBe('For this stage of the break');
    expect(screen.getByTestId('advice-basis').textContent).toBe('Picked from your recent check-ins.');
    expect(screen.queryByTestId('support-also')).toBeNull();
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
    expect(screen.getByTestId('support-reason').textContent).toContain('Sleep quality 2/10');
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

  it('swaps the card to another topic without writing stored data and keeps sources inside More', () => {
    const { storage } = setup();
    fireEvent.click(screen.getByTestId('support-switch'));
    const topics = screen.getByTestId('support-topics');
    fireEvent.click(within(topics).getByRole('button', { name: 'Nausea' }));
    // A swapped topic shows its own guide step, not the day's action line.
    expect(card().getAttribute('data-area')).toBe('nausea');
    expect(screen.getByTestId('support-action').textContent).toContain('small, regular sips');
    const more = within(card()).getByText('More').closest('details')!;
    // The full guide, its sources and the seek-help line are visible by default.
    expect(more.hasAttribute('open')).toBe(true);
    expect(more.textContent).toContain('Repeated vomiting');
    expect(within(more).getByRole('link', { name: /NHS/ }).getAttribute('href')).toContain('nhs.uk');
    expect(createCompanionPersonalisationStore(storage).loadOrMigrate().supportAreas).toEqual([]);
  });

  it('discloses that a rating stops counting after 48 hours', () => {
    setup();
    fireEvent.click(screen.getByTestId('support-switch'));
    expect(screen.getByTestId('support-topics-note').textContent).toMatch(/A rating stops counting after 48 hours/);
  });

  it('allows an explicit zero and takes a rating back', () => {
    const { storage } = setup();
    rate('craving', 0);
    expect(screen.getByTestId('symptom-craving-readout').textContent).toBe('0');
    // Tapping the selected number again clears the field: nothing to un-select.
    fireEvent.click(screen.getByTestId('symptom-craving-0'));
    expect(screen.getByTestId('symptom-craving-readout').textContent).toBe('Not set');
    expect(screen.getByTestId('symptom-craving').getAttribute('data-value')).toBe('unset');
    expect(createCheckinsStore(storage).load()?.checkins ?? []).toHaveLength(0);
  });
});
