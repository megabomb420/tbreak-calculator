// Community carousel — stage-matched Reddit accounts on Today (0.25.0 rewrite).

import { fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { CommunityCarousel } from '../../src/ui/community-carousel.tsx';
import { COMMUNITY_TIPS, presentDailySupport } from '../../src/application/presentation/daily-support.ts';
import type { WithdrawalWindowId } from '../../src/domain/guidance/evidence-guidance-v1.ts';
import { createBreakAttemptsStore } from '../../src/application/progress/break-attempt-record.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';

const AT: Instant = toInstant(1787184000000); // 2026-08-20T00:00:00Z
const DAY_MS = 24 * 3_600_000;
const ANCHOR = toInstant(AT - 3 * DAY_MS); // 2026-08-17: Today is day 4 of the break

/** A live break on day 4, which the guidance places in the days_2_6 window. */
function seedActiveBreak(storage: StorageAdapter): void {
  const profile: UseProfileInput = {
    goal: 'tolerance_reset',
    breakRequested: true,
    postBreakMode: null,
    thcUseDaysLast30: { value: 20, provenance: 'user_estimate' },
    sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
    products: ['flower'],
    routes: ['smoking'],
    lastUseAt: { value: new Date(ANCHOR).toISOString(), provenance: 'user_estimate' },
    previousBreaks: [],
  };
  createQuestionnaireSnapshotStore(storage).save({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot: { kind: 'use_profile', profile },
    updatedAt: AT,
  });
  createResultViewStore(storage).save({ schemaVersion: RESULT_VIEW_SCHEMA_VERSION, status: 'acknowledged', updatedAt: AT });
  createBreakAttemptsStore(storage).save({
    schemaVersion: 'break-attempts-v1',
    attempts: [
      {
        id: 'attempt-1',
        status: 'active',
        calculationRecordId: 'run-1',
        targetDurationDays: 21,
        postBreakMode: 'occasional',
        startedAt: AT,
        segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
        postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
        preparation: null,
        completionAcknowledged: false,
        createdAt: AT,
        updatedAt: AT,
      },
    ],
  });
}

/** happy-dom performs no layout, so the track reports no width and settles no
 * scroll. Give it a width and make a programmatic scroll report the position
 * the way a browser would. */
function makeTrackScrollable(carousel: HTMLElement): HTMLElement {
  const track = carousel.querySelector('.community-track') as HTMLElement;
  Object.defineProperty(track, 'clientWidth', { value: 320, configurable: true });
  track.scrollTo = ((options: ScrollToOptions) => {
    track.scrollLeft = options.left ?? 0;
    track.dispatchEvent(new Event('scroll'));
  }) as typeof track.scrollTo;
  return track;
}

function renderCarousel(): HTMLElement {
  const storage = createMemoryStorage();
  seedActiveBreak(storage);
  render(<App storage={storage} clock={fixedClock(AT)} />);
  const carousel = screen.getByTestId('community-tip');
  makeTrackScrollable(carousel);
  return carousel;
}

/** The tips Today feeds the carousel on day 4 of the break. */
function dayFourView() {
  return presentDailySupport({
    day: 4,
    now: AT,
    anchor: ANCHOR,
    checkins: [],
    supportAreas: [],
    preparation: null,
  });
}

function slidesOf(carousel: HTMLElement): HTMLElement[] {
  return within(carousel).getAllByRole('group');
}

function counterOf(carousel: HTMLElement): string {
  return carousel.querySelector('.community-carousel-heading > .meta')?.textContent ?? '';
}

function arrow(carousel: HTMLElement, name: 'Next experience' | 'Previous experience'): HTMLButtonElement {
  return within(carousel).getByRole('button', { name }) as HTMLButtonElement;
}

const stageOf = (windowId: WithdrawalWindowId) =>
  COMMUNITY_TIPS.filter((tip) => tip.windows.includes(windowId));

afterEach(() => {
  vi.useRealTimers();
});

describe('community carousel', () => {
  it('renders the first stage-matched account with a position counter of stage-only cards', () => {
    const carousel = renderCarousel();
    const windowId = screen.getByTestId('daily-support').getAttribute('data-window') as WithdrawalWindowId;
    expect(windowId).toBe('days_2_6');
    const stage = stageOf(windowId);
    const rendered = slidesOf(carousel);
    expect(rendered.length).toBeGreaterThan(1);
    expect(counterOf(carousel)).toBe(`1 / ${rendered.length}`);

    const first = rendered[0];
    const firstTip = stage.find((tip) => tip.title === first?.querySelector('h4')?.textContent);
    expect(firstTip).toBeTruthy();
    expect(first?.querySelector('p.body')?.textContent).toBe(firstTip?.text);
    expect(first?.querySelector('a')?.getAttribute('href')).toBe(firstTip?.href);
    expect(first?.hasAttribute('inert')).toBe(false);

    // Every rendered card, not just the visible one, is an account written for
    // this window — no story from another stage leaks into the rotation.
    for (const slide of rendered) {
      const tip = COMMUNITY_TIPS.find((item) => item.title === slide.querySelector('h4')?.textContent);
      expect(tip).toBeTruthy();
      expect(tip?.windows).toContain(windowId);
      expect(slide.querySelector('a')?.getAttribute('href')).toBe(tip?.href);
    }
  });

  it('moves one card per arrow press and stops at both ends without wrapping', () => {
    const carousel = renderCarousel();
    const total = slidesOf(carousel).length;
    expect(arrow(carousel, 'Previous experience').disabled).toBe(true);
    expect(arrow(carousel, 'Next experience').disabled).toBe(false);

    fireEvent.click(arrow(carousel, 'Next experience'));
    expect(counterOf(carousel)).toBe(`2 / ${total}`);
    expect(slidesOf(carousel)[0]?.hasAttribute('inert')).toBe(true);
    expect(slidesOf(carousel)[1]?.hasAttribute('inert')).toBe(false);
    expect(arrow(carousel, 'Previous experience').disabled).toBe(false);

    fireEvent.click(arrow(carousel, 'Previous experience'));
    expect(counterOf(carousel)).toBe(`1 / ${total}`);

    for (let step = 1; step < total; step += 1) fireEvent.click(arrow(carousel, 'Next experience'));
    expect(counterOf(carousel)).toBe(`${total} / ${total}`);
    expect(arrow(carousel, 'Next experience').disabled).toBe(true);
    expect(slidesOf(carousel)[total - 1]?.hasAttribute('inert')).toBe(false);

    // The last card is a hard end: pressing on cannot wrap round to the first.
    fireEvent.click(arrow(carousel, 'Next experience'));
    expect(counterOf(carousel)).toBe(`${total} / ${total}`);
    expect(slidesOf(carousel).filter((slide) => !slide.hasAttribute('inert'))).toHaveLength(1);
  });

  it('never auto-advances while time passes', () => {
    vi.useFakeTimers();
    const view = dayFourView();
    render(<CommunityCarousel tips={view.communityTips} initialId={view.communityTip.id} />);
    const carousel = screen.getByTestId('community-tip');
    makeTrackScrollable(carousel);
    const total = slidesOf(carousel).length;
    // The carousel schedules no timer of its own to move itself.
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(arrow(carousel, 'Next experience'));
    expect(counterOf(carousel)).toBe(`2 / ${total}`);
    vi.advanceTimersByTime(90 * 60_000);
    expect(counterOf(carousel)).toBe(`2 / ${total}`);
    vi.advanceTimersByTime(3 * DAY_MS);
    expect(counterOf(carousel)).toBe(`2 / ${total}`);
    expect(slidesOf(carousel)[1]?.hasAttribute('inert')).toBe(false);
  });

  it('keeps the same account visible when the ranking changes under it', () => {
    const view = dayFourView();
    const tips = view.communityTips;
    const last = tips.at(-1);
    if (last === undefined || tips.length < 2) throw new Error('need at least two stage cards');
    const { rerender } = render(<CommunityCarousel tips={tips} initialId={view.communityTip.id} />);
    const carousel = screen.getByTestId('community-tip');
    const track = makeTrackScrollable(carousel);

    function visibleTitle(): string {
      return slidesOf(carousel).find((slide) => !slide.hasAttribute('inert'))?.querySelector('h4')?.textContent ?? '';
    }

    fireEvent.click(arrow(carousel, 'Next experience'));
    const watched = visibleTitle();
    expect(watched).not.toBe('');

    // Saving a check-in or choosing topics re-ranks the same accounts. The card
    // the reader is looking at must stay put, and the counter follow it.
    const reordered = [last, ...tips.slice(0, -1)];
    rerender(<CommunityCarousel tips={reordered} initialId={view.communityTip.id} />);

    const visible = slidesOf(carousel).filter((slide) => !slide.hasAttribute('inert'));
    expect(visible).toHaveLength(1);
    expect(visible[0]?.querySelector('h4')?.textContent).toBe(watched);
    const movedTo = reordered.findIndex((tip) => tip.title === watched);
    expect(movedTo).toBeGreaterThan(-1);
    expect(counterOf(carousel)).toBe(`${movedTo + 1} / ${reordered.length}`);
    expect(track.scrollLeft).toBe(movedTo * 320);
  });
});
