import { fireEvent, render, screen, within } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { createBreakAttemptsStore } from '../../src/application/progress/break-attempt-record.ts';
import { createCheckinsStore } from '../../src/application/progress/checkin-store.ts';
import { createCompanionPersonalisationStore } from '../../src/application/progress/companion-personalisation.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import { DailySupport } from '../../src/ui/daily-support.tsx';
import { communityTipsFor, presentDailySupport, SUPPORT_GUIDES } from '../../src/application/presentation/daily-support.ts';
import type { SupportArea } from '../../src/application/questionnaire/companion.ts';

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
  const select = screen.getByTestId('advice-picker') as HTMLSelectElement;
  select.value = area;
  fireEvent.input(select);
}

/** The block alone, with the pick kept the way the app keeps it: the topic the
 * person chose by hand is part of the day's state, so the view is built from
 * it, exactly as Today builds it. */
function Picker({ day, build }: {
  readonly day: number;
  readonly build: (picked: SupportArea | null) => ReturnType<typeof presentDailySupport>;
}) {
  // The store scopes the pick to one break day, so the harness does too.
  const [pick, setPick] = useState<{ readonly day: number; readonly area: SupportArea } | null>(null);
  const picked = pick !== null && pick.day === day ? pick.area : null;
  return (
    <DailySupport
      view={build(picked)}
      picked={picked}
      onPick={(area) => setPick(area === null ? null : { day, area })}
    />
  );
}

describe('practical Today advice', () => {
  it('lets a hand-picked topic replace the day’s block and give the day back', () => {
    const view = (day: number, pickedArea: SupportArea | null = null) =>
      presentDailySupport({ day, now: NOW, anchor: START, checkins: [], preparation: null, pickedArea });
    const app = render(<Picker day={4} build={(picked) => view(4, picked)} />);
    const dailyAction = screen.getByTestId('advice-action').textContent;
    pick('nausea');
    expect(screen.getByTestId('advice-action').textContent).toBe(SUPPORT_GUIDES.nausea.steps[0]);
    expect(screen.getByTestId('advice-source').textContent).toBe('Your pick today');
    pick('');
    expect(screen.getByTestId('advice-action').textContent).toBe(dailyAction);
    expect(screen.getByTestId('advice-source').textContent).toBe('Today’s suggestion');
    // A new break day starts on its own topic: the pick belongs to the day it
    // was made, and the app does not carry it forward.
    pick('nausea');
    app.rerender(<Picker day={5} build={(picked) => view(5, picked)} />);
    expect((screen.getByTestId('advice-picker') as HTMLSelectElement).value).toBe('');
    expect(block().getAttribute('data-area')).toBe('irritability');
  });

  it('keeps the action and its reason visible, with the topic depth one tap away', () => {
    setup({ preparation: { triggerIds: [], customTrigger: null, replacementAction: 'make tea', fallbackPlan: null } });
    const card = block();
    // The reason is part of the day, not depth.
    expect(within(card).getByTestId('advice-why').textContent).toBe(SUPPORT_GUIDES.cravings.explanation);
    expect(within(card).getByTestId('advice-why-title').textContent).toBe('Why this helps');
    expect(screen.getByTestId('advice-action').textContent).toBe('Try your plan first: “make tea”.');
    // The remaining steps, pitfalls, advice line and sources are one tap away,
    // so a 5–8 step guide cannot bury the day's action.
    const more = within(card).getByTestId('advice-more');
    expect(more.tagName).toBe('DETAILS');
    expect(more.hasAttribute('open')).toBe(false);
    expect(within(more).getByTestId('advice-steps').querySelectorAll('li')).toHaveLength(SUPPORT_GUIDES.cravings.steps.length);
    fireEvent.click(within(more).getByText('What else can help'));
    expect(more.hasAttribute('open')).toBe(true);
    expect(within(card).getByTestId('advice-avoid').textContent).toBe(SUPPORT_GUIDES.cravings.avoid);
  });

  it('lists every guide step that the shown action does not already cover', () => {
    setup();
    pick('sleep');
    const listed = [...screen.getByTestId('advice-steps').querySelectorAll('li')].map((item) => item.textContent);
    expect(listed).toEqual(SUPPORT_GUIDES.sleep.steps.slice(1));
  });

  it('follows the chosen topic in the experiences beneath it', () => {
    const view = (day: number, pickedArea: SupportArea | null = null) =>
      presentDailySupport({ day, now: NOW, anchor: START, checkins: [], preparation: null, pickedArea });
    render(<Picker day={4} build={(picked) => view(4, picked)} />);
    const firstSlide = () => document.querySelector('.community-slide')?.textContent ?? '';
    expect(firstSlide()).not.toBe('');
    pick('headaches');
    const shown = communityTipsFor(view(4), 'headaches');
    // The card that speaks to the chosen topic leads once it is picked.
    expect(shown[0]!.areas).toContain('headaches');
    expect(firstSlide()).toContain(shown[0]!.title);
  });

  it('records the hand-picked topic for this break day and leaves the topic set alone', () => {
    const { storage } = setup();
    pick('anxiety');
    expect(screen.getAllByTestId('advice-block')).toHaveLength(1);
    expect(block().getAttribute('data-area')).toBe('anxiety');
    const record = createCompanionPersonalisationStore(storage).loadOrMigrate();
    expect(record.supportAreas).toEqual([]);
    expect(record.pick).toEqual({ breakId: 'chosen', day: 4, area: 'anxiety' });
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
    // A symptom topic keeps its own first step and drops the plan lines.
    pick('sleep');
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
