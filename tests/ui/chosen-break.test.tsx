import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { BREAK_START, CHOSEN_BREAK, PLAN_STATE_NOTES } from '../../src/ui/break-copy.ts';
import { createBreakAttemptsStore, type StoredAttempt } from '../../src/application/progress/break-attempt-record.ts';
import { createQuestionnaireSnapshotStore, QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION } from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { localIsoDate } from '../../src/application/questionnaire/date-answers.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';

const AT: Instant = toInstant(1787184000000); // 2026-08-20T00:00:00Z
const DAY_MS = 24 * 3_600_000;

function renderApp(storage: StorageAdapter, instant: Instant = AT) {
  return render(<App storage={storage} clock={fixedClock(instant)} />);
}

function attemptsOf(storage: StorageAdapter): StoredAttempt[] {
  return createBreakAttemptsStore(storage).load()?.attempts ?? [];
}

function seedProfile(storage: StorageAdapter): void {
  createQuestionnaireSnapshotStore(storage).save({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot: {
      kind: 'use_profile',
      profile: {
        goal: 'abstinence',
        breakRequested: true,
        postBreakMode: null,
        thcUseDaysLast30: { value: 20, provenance: 'user_estimate' },
        sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
        products: ['flower'],
        routes: ['smoking'],
        lastUseAt: { value: new Date(toInstant(AT - 3 * DAY_MS)).toISOString(), provenance: 'user_estimate' },
        previousBreaks: [],
      },
    },
    updatedAt: AT,
  });
  createResultViewStore(storage).save({ schemaVersion: RESULT_VIEW_SCHEMA_VERSION, status: 'acknowledged', updatedAt: AT });
}

/** Runs the Calculator → Choose my break length flow up to the point where the
 * normal break-start sheet is open for the given days. */
function openChooseFlow(storage: StorageAdapter, days: number) {
  const rendered = renderApp(storage);
  fireEvent.click(screen.getByRole('button', { name: 'Calculator', exact: true }));
  fireEvent.click(screen.getByTestId('choose-break-length'));
  const overlay = screen.getByTestId('choose-break-days');
  const from = Number(within(overlay).getByTestId('break-length-value').textContent);
  const step = days >= from ? 1 : -1;
  for (let i = from; i !== days; i += step) {
    fireEvent.click(within(overlay).getByTestId(step > 0 ? 'days-increase' : 'days-decrease'));
  }
  expect(within(overlay).getByTestId('break-length-value').textContent).toBe(String(days));
  fireEvent.click(within(overlay).getByTestId('choose-days-continue'));
  return rendered;
}

describe('Choose my break length (custom duration)', () => {
  it('lets the user pick an arbitrary duration, confirms it as a chosen length, and starts a normal break', () => {
    const storage = createMemoryStorage();
    const rendered = openChooseFlow(storage, 10);

    // Lightweight confirmation, in product language, never a recommendation.
    const confirm = screen.getByTestId('chosen-duration-confirm');
    expect(within(confirm).getByTestId('chosen-days').textContent).toBe('10');
    expect(within(confirm).getByTestId('chosen-duration-label').textContent).toBe('Chosen duration');
    expect(within(confirm).queryByText(/Recommended|Your practical plan/i)).toBeNull();
    expect(screen.queryByTestId('choose-running-notice')).toBeNull();

    // The normal start flow runs against the chosen target.
    fireEvent.click(screen.getByTestId('chosen-start-break'));
    const sheet = screen.getByTestId('break-start-sheet');
    expect(sheet).toBeTruthy();
    expect(within(sheet).getByText('Plan for 10 days.')).toBeTruthy();
    fireEvent.click(within(sheet).getByRole('button', { name: /Occasional use/ }));
    fireEvent.click(within(sheet).getByRole('button', { name: BREAK_START.startBreak }));

    // Explicit metadata: chosen source, no fabricated calculation record.
    const attempt = attemptsOf(storage)[0];
    expect(attempt).toBeTruthy();
    expect(attempt?.status).toBe('active');
    expect(attempt?.targetDurationDays).toBe(10);
    expect(attempt?.targetSource).toBe('chosen');
    expect(attempt?.calculationRecordId).toBeNull();

    // Today shows the normal active-break experience for the chosen target.
    const card = screen.getByTestId('state-active-break');
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 1 of 10');
    expect(within(card).getByTestId('break-journey')).toBeTruthy();
    expect(within(card).getByText('Day 10')).toBeTruthy();
    expect(within(card).getByTestId('checkin-cta').textContent).toBe('Check in');
    // The visual-continuity polish applies: orbit behind the hero, dedicated CTA.
    expect(card.firstElementChild?.className).toContain('result-lens-orbit');
    // Research context: day-1 fact, quiet label, tappable source.
    const fact = within(card).getByTestId('today-research-fact');
    expect(fact.getAttribute('data-fact')).toBe('withdrawal_onset');
    expect(within(fact).getByRole('heading', { name: 'Worth knowing' })).toBeTruthy();
    expect(within(fact).getByRole('link')).toBeTruthy();

    // Nothing in the journey or the card calls the chosen length recommended.
    expect(within(card).queryByText(/recommended/i)).toBeNull();

    // Persistence: a fresh mount keeps the same live plan.
    rendered.unmount();
    renderApp(storage);
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 1 of 10');
    expect(attemptsOf(storage)[0]?.targetSource).toBe('chosen');
  });

  it('enforces the 3–28 day bounds and only whole days', () => {
    const storage = createMemoryStorage();
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Calculator', exact: true }));
    fireEvent.click(screen.getByTestId('choose-break-length'));
    const overlay = screen.getByTestId('choose-break-days');
    const minus = within(overlay).getByTestId('days-decrease') as HTMLButtonElement;
    const plus = within(overlay).getByTestId('days-increase') as HTMLButtonElement;
    for (let i = 0; i < 30; i += 1) fireEvent.click(minus);
    expect(within(overlay).getByTestId('break-length-value').textContent).toBe('3');
    expect(minus.disabled).toBe(true);
    for (let i = 0; i < 40; i += 1) fireEvent.click(plus);
    expect(within(overlay).getByTestId('break-length-value').textContent).toBe('28');
    expect(plus.disabled).toBe(true);
    // 28 is allowed as a chosen maximum target.
    fireEvent.click(within(overlay).getByTestId('choose-days-continue'));
    expect(screen.getByTestId('chosen-days').textContent).toBe('28');
  });

  it('supports a future start: the plan anchors to the chosen start date', () => {
    const storage = createMemoryStorage();
    const rendered = openChooseFlow(storage, 5);
    fireEvent.click(screen.getByTestId('chosen-start-break'));
    const sheet = screen.getByTestId('break-start-sheet');
    fireEvent.click(within(sheet).getByRole('button', { name: /Pick a date/ }));
    const tomorrow = localIsoDate(toInstant(AT + DAY_MS));
    fireEvent.input(screen.getByTestId('break-start-date'), { target: { value: tomorrow } });
    fireEvent.click(within(sheet).getByRole('button', { name: /Not sure yet/ }));
    fireEvent.click(within(sheet).getByRole('button', { name: BREAK_START.startBreak }));

    const planned = attemptsOf(storage)[0];
    expect(planned?.status).toBe('planned');
    expect(planned?.targetDurationDays).toBe(5);
    expect(planned?.targetSource).toBe('chosen');
    // The scheduled card explains the chosen-duration clock honestly.
    expect(screen.getByTestId('scheduled-start-note').textContent).toMatch(/day count begins then/);

    // Once the start date arrives the plan activates, anchored at that date.
    rendered.unmount();
    renderApp(storage, toInstant(AT + 2 * DAY_MS));
    const active = attemptsOf(storage)[0];
    expect(active?.status).toBe('active');
    expect(active?.segments[0]?.startedFromLastUseAt).toBe(active?.startedAt);
    expect(screen.getByTestId('state-active-break')).toBeTruthy();
    expect(screen.getByTestId('break-day-label').textContent).toMatch(/^Day [12] of 5$/);
  });

  it('reaching a chosen target is a milestone, not an automatic end', () => {
    const storage = createMemoryStorage();
    seedProfile(storage);
    createBreakAttemptsStore(storage).save({
      schemaVersion: 'break-attempts-v1',
      attempts: [
        {
          id: 'chosen-1',
          status: 'active',
          calculationRecordId: null,
          targetDurationDays: 5,
          targetSource: 'chosen',
          postBreakMode: 'occasional',
          startedAt: toInstant(AT - 5 * DAY_MS),
          segments: [{ startedFromLastUseAt: toInstant(AT - 5 * DAY_MS), endedAt: null, endReason: null }],
          postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
          preparation: null,
          completionAcknowledged: false,
          createdAt: toInstant(AT - 5 * DAY_MS),
          updatedAt: toInstant(AT - 5 * DAY_MS),
        },
      ],
    });
    const rendered = renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-phase')).toBe('reached');
    const card = screen.getByTestId('state-active-break');
    expect(screen.getByTestId('break-phase-eyebrow').textContent).toBe('Plan target reached');
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 6 · 5-day plan');
    expect(screen.getByTestId('plan-target-note').getAttribute('data-state')).toBe('reached');
    expect(screen.getByTestId('plan-target-note').textContent).toBe(
      PLAN_STATE_NOTES.chosenReached(5),
    );
    // The break continues: check-ins and the journey stay live, and the user
    // decides when it actually ends.
    expect(within(card).getByTestId('checkin-cta')).toBeTruthy();
    expect(within(card).getByTestId('mark-complete-cta')).toBeTruthy();
    expect(within(card).getByTestId('break-journey')).toBeTruthy();

    rendered.unmount();
    renderApp(storage, toInstant(AT + 3 * DAY_MS));
    const laterView = screen.getByTestId('today-view');
    expect(laterView.getAttribute('data-phase')).toBe('extended');
    const later = screen.getByTestId('state-active-break');
    expect(screen.getByTestId('break-phase-eyebrow').textContent).toBe('Beyond the plan');
    expect(screen.getByTestId('plan-target-note').textContent).toBe(
      PLAN_STATE_NOTES.chosenExtended(9, 5),
    );
    expect(within(later).getByTestId('checkin-cta')).toBeTruthy();
    // Research context keeps updating by abstinence day after the target.
    expect(within(later).getByTestId('today-research-fact').getAttribute('data-fact')).toBe('acute_ease');
  });

  it('keeps calculated plans working and labelled as plans (regression guard)', () => {
    const storage = createMemoryStorage();
    // A saved calculation profile still shows the standard Your-plan surfaces.
    seedProfile(storage);
    renderApp(storage);
    const today = screen.getByTestId('today-view');
    expect(today.getAttribute('data-primary')).toBe('profile-no-break');
    expect(within(today).queryByTestId('state-active-break')).toBeNull();
    expect(within(today).getByTestId('view-result')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Calculator', exact: true }));
    // The Calculator offers the science goals and the chosen-duration option.
    expect(within(screen.getByTestId('calculator-screen')).getByRole('button', { name: /Reset my tolerance/ })).toBeTruthy();
    expect(screen.getByTestId('choose-break-length')).toBeTruthy();
  });
});

describe('chosen-duration break ends without a profile', () => {
  function seedChosen(anchor: Instant, days: number): StorageAdapter {
    const storage = createMemoryStorage();
    createBreakAttemptsStore(storage).save({
      schemaVersion: 'break-attempts-v1',
      attempts: [
        {
          id: 'chosen-end',
          status: 'active',
          calculationRecordId: null,
          targetDurationDays: days,
          targetSource: 'chosen',
          postBreakMode: 'occasional',
          startedAt: anchor,
          segments: [{ startedFromLastUseAt: anchor, endedAt: null, endReason: null }],
          postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
          preparation: null,
          completionAcknowledged: false,
          createdAt: anchor,
          updatedAt: anchor,
        },
      ],
    });
    return storage;
  }

  it('returns to the returning state, not first launch, after completing', () => {
    const anchor = toInstant(AT - 5 * DAY_MS);
    const storage = seedChosen(anchor, 5);
    const rendered = renderApp(storage); // day 6 = target reached
    fireEvent.click(screen.getByTestId('mark-complete-cta'));
    const today = screen.getByTestId('today-view');
    expect(today.getAttribute('data-primary')).toBe('completed-break');
    fireEvent.click(screen.getByTestId('acknowledge-complete'));
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('no-profile');
    expect(screen.queryByRole('button', { name: 'Get started' })).toBeNull();
    // The finished attempt is still in history storage.
    expect(attemptsOf(storage)[0]?.status).toBe('completed');
    rendered.unmount();
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('no-profile');
  });

  it('returns to the returning state after ending early', () => {
    const storage = seedChosen(AT, 10);
    renderApp(storage);
    fireEvent.click(screen.getByTestId('end-early'));
    fireEvent.click(screen.getByTestId('confirm-action'));
    expect(attemptsOf(storage)[0]?.status).toBe('ended');
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('no-profile');
    expect(screen.queryByRole('button', { name: 'Get started' })).toBeNull();
  });
});

describe('chosen-duration scheduling edge cases', () => {
  it('shows the running-plan notice instead of starting while a plan is scheduled', () => {
    const storage = createMemoryStorage();
    // A scheduled (planned) chosen break owns Today, so a second start is refused.
    createBreakAttemptsStore(storage).save({
      schemaVersion: 'break-attempts-v1',
      attempts: [
        {
          id: 'planned-1',
          status: 'planned',
          calculationRecordId: null,
          targetDurationDays: 7,
          targetSource: 'chosen',
          postBreakMode: 'occasional',
          startedAt: toInstant(AT + DAY_MS),
          segments: [],
          postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
          preparation: null,
          completionAcknowledged: false,
          createdAt: AT,
          updatedAt: AT,
        },
      ],
    });
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Calculator', exact: true }));
    fireEvent.click(screen.getByTestId('choose-break-length'));
    fireEvent.click(screen.getByTestId('choose-days-continue'));
    expect(screen.getByTestId('choose-running-notice')).toBeTruthy();
    expect((screen.getByTestId('chosen-start-break') as HTMLButtonElement).disabled).toBe(true);
  });

  it('cancels a scheduled chosen break from its Today card', () => {
    const storage = createMemoryStorage();
    createBreakAttemptsStore(storage).save({
      schemaVersion: 'break-attempts-v1',
      attempts: [
        {
          id: 'planned-1',
          status: 'planned',
          calculationRecordId: null,
          targetDurationDays: 5,
          targetSource: 'chosen',
          postBreakMode: 'occasional',
          startedAt: toInstant(AT + DAY_MS),
          segments: [],
          postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
          preparation: null,
          completionAcknowledged: false,
          createdAt: AT,
          updatedAt: AT,
        },
      ],
    });
    renderApp(storage);
    expect(screen.getByTestId('scheduled-start')).toBeTruthy();
    fireEvent.click(screen.getByTestId('cancel-planned'));
    fireEvent.click(screen.getByTestId('confirm-action'));
    expect(attemptsOf(storage)).toHaveLength(0);
    // No data left at all: back to the first-launch surface.
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('first-launch');
  });
});

describe('active-break check-in reflection', () => {
  it('marks the current day checked and shows progress after No + Save', () => {
    const storage = createMemoryStorage();
    const anchor = toInstant(AT - DAY_MS); // day 2 at AT
    createBreakAttemptsStore(storage).save({
      schemaVersion: 'break-attempts-v1',
      attempts: [
        {
          id: 'checkin-1', status: 'active', calculationRecordId: null, targetDurationDays: 10,
          targetSource: 'chosen', postBreakMode: 'occasional', startedAt: anchor,
          segments: [{ startedFromLastUseAt: anchor, endedAt: null, endReason: null }],
          postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
          preparation: null, completionAcknowledged: false, createdAt: anchor, updatedAt: anchor,
        },
      ],
    });
    renderApp(storage);
    const cta = screen.getByTestId('checkin-cta');
    expect(cta.textContent).toBe('Check in');
    expect(screen.queryByTestId('checkin-progress')).toBeNull();

    fireEvent.click(cta);
    fireEvent.click(screen.getByTestId('checkin-no'));
    fireEvent.click(screen.getByTestId('checkin-save'));

    // The journey day marker is checked…
    const day2 = screen.getByTestId('journey-day-2');
    expect(day2.getAttribute('data-checkin')).toBe('true');
    expect(day2.className).toContain('has-checkin');
    // …the primary action reads as done…
    const after = screen.getByTestId('checkin-cta');
    expect(after.textContent).toBe('Checked in today');
    expect(after.className).toContain('is-checked');
    // …and progress is shown.
    expect(screen.getByTestId('checkin-progress').textContent).toBe('1 of 10 days recorded');

    // The action stays tappable (report a later use or add symptoms).
    fireEvent.click(after);
    expect(screen.getByTestId('checkin-flow')).toBeTruthy();
  });
});
