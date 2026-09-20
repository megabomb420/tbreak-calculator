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

describe('practical Today advice', () => {
  it('updates advice immediately after check-in and preserves it on reload and a later no-use tap', () => {
    const { storage, app } = setup();
    expect(screen.getByTestId('advice-basis').textContent).toContain('No symptom ratings');
    fireEvent.click(screen.getByTestId('add-symptoms'));
    fireEvent.click(screen.getByRole('button', { name: 'Set Sleep quality to zero' }));
    const craving = screen.getByRole('slider', { name: 'Craving' });
    fireEvent.pointerDown(craving);
    fireEvent.input(craving, { target: { value: '8' } });
    fireEvent.click(screen.getByTestId('symptoms-save'));
    expect(screen.getByTestId('advice-sleep').textContent).toContain('Sleep quality 0/10');
    expect(screen.getByTestId('advice-cravings').textContent).toContain('Craving 8/10');
    expect(createCheckinsStore(storage).load()!.checkins.at(-1)!.appetite).toBeNull();
    app.unmount();
    render(<App storage={storage} clock={fixedClock(NOW)} />);
    expect(screen.getByTestId('advice-sleep')).toBeTruthy();
    fireEvent.click(screen.getByTestId('checkin-cta'));
    expect(screen.getByTestId('advice-sleep')).toBeTruthy();
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

  it('a confirmed use changes the clock only on save', () => {
    const { storage } = setup();
    fireEvent.click(screen.getByTestId('checkin-cta'));
    fireEvent.click(screen.getByTestId('report-use'));
    expect(createBreakAttemptsStore(storage).load()!.attempts[0]!.segments).toHaveLength(1);
    fireEvent.click(within(screen.getByTestId('confirm-use')).getByRole('button', { name: 'Today', exact: true }));
    fireEvent.click(screen.getByTestId('confirm-use-submit'));
    expect(screen.getByTestId('restart-confirmed')).toBeTruthy();
    expect(createBreakAttemptsStore(storage).load()!.attempts[0]!.segments).toHaveLength(2);
    expect(createCheckinsStore(storage).load()!.checkins.at(-1)!.usedThc).toBe(true);
  });

  it('opens specific guides independently of saved preferences and keeps Reddit distinct from clinical sources', () => {
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
