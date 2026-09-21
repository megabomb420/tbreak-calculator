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

describe('practical Today advice', () => {
  it('updates advice immediately after check-in and preserves it on reload and a later no-use tap', () => {
    const { storage, app } = setup();
    expect(screen.getByTestId('advice-basis').textContent).toContain('Tap How are you feeling?');
    fireEvent.click(screen.getByTestId('add-symptoms'));
    rate('Sleep quality', 2);
    rate('Craving', 8);
    fireEvent.click(screen.getByTestId('symptoms-save'));
    expect(screen.getByTestId('advice-sleep').textContent).toContain('Sleep quality 2/10');
    expect(screen.getByTestId('advice-cravings').textContent).toContain('Craving 8/10');
    expect(createCheckinsStore(storage).load()!.checkins.at(-1)!.appetite).toBeNull();
    app.unmount();
    render(<App storage={storage} clock={fixedClock(NOW)} />);
    expect(screen.getByTestId('advice-sleep')).toBeTruthy();
    fireEvent.click(screen.getByTestId('checkin-cta'));
    expect(screen.getByTestId('advice-sleep')).toBeTruthy();
  });

  it('shows a topic for every area rated 4 or harder, without a cap of two', () => {
    setup();
    fireEvent.click(screen.getByTestId('add-symptoms'));
    rate('Sleep quality', 2);
    rate('Appetite', 1);
    rate('Craving', 8);
    rate('Anxiety', 7);
    fireEvent.click(screen.getByTestId('symptoms-save'));
    expect(screen.getByTestId('advice-basis').textContent).toBe('Picked from your recent check-ins.');
    for (const area of ['appetite', 'sleep', 'cravings', 'anxiety']) {
      expect(screen.getByTestId(`advice-${area}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('advice-routine')).toBeNull();
    expect(screen.queryByTestId('advice-boredom')).toBeNull();
  });

  it('keeps two stage-relevant defaults for a day with no ratings', () => {
    setup();
    expect(screen.getByTestId('advice-cravings')).toBeTruthy();
    expect(screen.getByTestId('advice-routine')).toBeTruthy();
    expect(screen.queryByTestId('advice-sleep')).toBeNull();
    expect(screen.getByTestId('advice-basis').textContent).toContain('Tap How are you feeling?');
  });

  it('does not fall back to an area the user rated as comfortable', () => {
    setup();
    fireEvent.click(screen.getByTestId('add-symptoms'));
    fireEvent.click(screen.getByRole('button', { name: 'Set Craving to zero' }));
    fireEvent.click(screen.getByTestId('symptoms-save'));
    expect(screen.queryByTestId('advice-cravings')).toBeNull();
    expect(screen.getByTestId('advice-routine')).toBeTruthy();
    expect(screen.getByTestId('advice-boredom')).toBeTruthy();
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
    expect(screen.getByTestId('advice-sleep').textContent).toContain('Sleep quality 2/10');
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

  it('opens any guide without writing stored data and keeps Reddit distinct from clinical sources', () => {
    const { storage } = setup();
    const browser = screen.getByTestId('advice-browser');
    browser.setAttribute('open', '');
    fireEvent.click(within(browser).getByRole('button', { name: 'Nausea' }));
    const guide = screen.getByTestId('opened-advice');
    expect(guide.textContent).toContain('small, regular sips');
    expect(guide.textContent).toContain('Repeated vomiting');
    expect(within(guide).getByRole('link', { name: /NHS/ }).getAttribute('href')).toContain('nhs.uk');
    expect(createCompanionPersonalisationStore(storage).loadOrMigrate().supportAreas).toEqual([]);
    const community = screen.getByTestId('community-tip');
    expect(community.textContent).toContain('Personal experience');
    expect(within(community).getAllByRole('link')[0]!.getAttribute('href')).toContain('reddit.com/r/Petioles/comments/');
  });

  it('discloses that a rating stops counting after 48 hours', () => {
    setup();
    const about = screen.getByText('How these suggestions are chosen').closest('details');
    expect(about).toBeTruthy();
    expect(about?.textContent ?? '').toMatch(/A rating stops counting after 48 hours/);
  });

  it('allows explicit zero or skip and cancels without saving', () => {
    setup();
    fireEvent.click(screen.getByTestId('add-symptoms'));
    fireEvent.click(screen.getByRole('button', { name: 'Set Craving to zero' }));
    expect(screen.getByTestId('symptom-craving-readout').textContent).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'Leave Craving unrecorded' }));
    expect(screen.getByTestId('symptom-craving-readout').textContent).toBe('Not set');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByTestId('checkin-flow')).toBeNull();
    expect(screen.getByTestId('checkin-cta').textContent).toBe('Check in');
  });
});
