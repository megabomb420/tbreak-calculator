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

function attempt(preparation: unknown = null) {
  return {
    id: 'chosen', status: 'active' as const, targetSource: 'chosen' as const, calculationRecordId: null,
    targetDurationDays: 14, postBreakMode: 'continue_abstinence' as const, startedAt: START,
    segments: [{ startedFromLastUseAt: START, endedAt: null, endReason: null }],
    postBreakPlan: { mode: 'continue_abstinence' as const }, preparation,
    completionAcknowledged: false, createdAt: START, updatedAt: START,
  };
}

function setup(options: { preparation?: unknown } = {}) {
  const storage = createMemoryStorage();
  createBreakAttemptsStore(storage).save({ schemaVersion: 'break-attempts-v1', attempts: [attempt(options.preparation ?? null) as never] });
  render(<App storage={storage} clock={fixedClock(NOW)} />);
  return { storage };
}

function block() {
  return screen.getByTestId('advice-block');
}
function pick(area: string) {
  fireEvent.click(screen.getByTestId(`advice-topic-${area}`));
}

describe('practical Today advice', () => {
  it('shows one topic at a time, the day’s own practice until another is picked', () => {
    setup();
    expect(screen.getAllByTestId('advice-block')).toHaveLength(1);
    // Day 4's practice is about the usual session time.
    expect(block().getAttribute('data-area')).toBe('cravings');
    expect(screen.getByTestId('advice-picker-title').textContent).toBe('How to deal with?');
    expect(screen.getByTestId('advice-topic-cravings').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('advice-reason').textContent).toBe('For this stage of the break');
  });

  it('replaces the block in place when another topic is picked, and writes nothing', () => {
    const { storage } = setup();
    pick('anxiety');
    expect(screen.getAllByTestId('advice-block')).toHaveLength(1);
    expect(block().getAttribute('data-area')).toBe('anxiety');
    expect(screen.getByTestId('advice-title').textContent).toBe('Anxiety or restlessness');
    expect(screen.getByTestId('advice-topic-anxiety').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('advice-topic-cravings').getAttribute('aria-pressed')).toBe('false');
    expect(createCompanionPersonalisationStore(storage).loadOrMigrate().supportAreas).toEqual([]);
    expect(createBreakAttemptsStore(storage).load()!.attempts[0]!.preparation).toBeNull();
  });

  it('renders the full guide with its sources, and the seek-help line, in place', () => {
    setup();
    pick('nausea');
    const card = block();
    expect(within(card).getByTestId('advice-action').textContent).toContain('small, regular sips');
    expect(card.textContent).toContain('Repeated vomiting');
    expect(within(card).getByRole('link', { name: /NHS/ }).getAttribute('href')).toContain('nhs.uk');
  });

  it('leads with the person’s own plan on the topics their plan covers', () => {
    setup({ preparation: { triggerIds: ['evening_after_work'], customTrigger: null, replacementAction: 'make tea', fallbackPlan: 'text a friend' } });
    // Day 4 leads with the usual-session topic, which the plan covers.
    expect(block().getAttribute('data-area')).toBe('cravings');
    expect(screen.getByTestId('advice-action').textContent).toBe('Try your plan first: “make tea”.');
    expect(screen.getByTestId('advice-trigger').textContent).toBe('You flagged: Evening after work.');
    expect(screen.getByTestId('advice-fallback').textContent).toBe('If that is not possible: text a friend.');
    // A symptom topic keeps its own first step and drops the plan lines.
    pick('sleep');
    expect(screen.getByTestId('advice-action').textContent).toBe('Choose a wake-up time you can keep tomorrow, even after a rough night.');
    expect(screen.queryByTestId('advice-trigger')).toBeNull();
    expect(screen.queryByTestId('advice-fallback')).toBeNull();
  });

  it('opens on a topic a saved rating named, with its dated reading', () => {
    // A legacy report: Today no longer collects ratings, but stored ones still rank.
    const storage = createMemoryStorage();
    createBreakAttemptsStore(storage).save({ schemaVersion: 'break-attempts-v1', attempts: [attempt() as never] });
    createCheckinsStore(storage).save({ schemaVersion: 'checkins-v1', checkins: [{
      recordedAt: new Date(NOW).toISOString(), usedThc: false, usedAt: null,
      craving: null, sleep: 1, anxiety: null, irritability: null, appetite: null, note: null,
    }] });
    render(<App storage={storage} clock={fixedClock(NOW)} />);
    expect(block().getAttribute('data-area')).toBe('sleep');
    expect(screen.getByTestId('advice-reason').textContent).toContain('Sleep quality 1/10 in your check-in');
    // Picking another topic still works from there.
    pick('cravings');
    expect(block().getAttribute('data-area')).toBe('cravings');
  });

  it('undo survives reload, repeated taps do not duplicate, and earlier entries remain', () => {
    const storage = createMemoryStorage();
    createBreakAttemptsStore(storage).save({ schemaVersion: 'break-attempts-v1', attempts: [attempt() as never] });
    const prior = { recordedAt: new Date(NOW - 86400000).toISOString(), usedThc: false, usedAt: null,
      craving: 7, sleep: 2, anxiety: null, irritability: null, appetite: null, note: 'yesterday' };
    createCheckinsStore(storage).save({ schemaVersion: 'checkins-v1', checkins: [prior] });
    const app = render(<App storage={storage} clock={fixedClock(NOW)} />);
    fireEvent.click(screen.getByTestId('checkin-cta'));
    fireEvent.click(screen.getByTestId('checkin-cta'));
    expect(createCheckinsStore(storage).load()!.checkins).toHaveLength(2);
    app.unmount();
    render(<App storage={storage} clock={fixedClock(NOW)} />);
    expect(screen.getByTestId('checkin-cta').textContent).toBe('Checked in today');
    fireEvent.click(screen.getByTestId('undo-checkin'));
    expect(screen.getByTestId('checkin-cta').textContent).toBe('Check in');
    expect(createCheckinsStore(storage).load()!.checkins).toEqual([prior]);
  });
});
