import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createQuestionnaireProgressStore,
  QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-progress.ts';
import type { ExtraTodayFacts } from '../../src/ui/app.tsx';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH, HISTORY_EMPTY, resumeTitle, SETTINGS } from '../../src/ui/copy.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const AT = toInstant(1787184000000);

function saveDraft(storage: StorageAdapter, answeredSteps = 3): void {
  createQuestionnaireProgressStore(storage).save({
    schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
    answeredSteps,
    updatedAt: AT,
  });
}

function renderApp(storage: StorageAdapter = createMemoryStorage(), extraFacts?: ExtraTodayFacts) {
  return render(<App storage={storage} extraFacts={extraFacts} />);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('app shell', () => {
  it('renders the Today tab on first launch', () => {
    renderApp();
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('first-launch');
    expect(view.getAttribute('data-resume')).toBe('none');
    expect(screen.getByRole('heading', { name: FIRST_LAUNCH.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: FIRST_LAUNCH.cta })).toBeTruthy();
    expect(screen.getByText(FIRST_LAUNCH.safetyPending)).toBeTruthy();
    expect(document.querySelector('[data-slot="safety_first_launch"]')).toBeTruthy();
  });

  it('switches between Today and History without opening settings', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByTestId('app-shell').getAttribute('data-active-tab')).toBe('history');
    expect(screen.getByTestId('history-view')).toBeTruthy();
    expect(screen.getByText(HISTORY_EMPTY)).toBeTruthy();
    expect(screen.queryByTestId('today-view')).toBeNull();
    expect(screen.queryByTestId('settings-modal')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByTestId('app-shell').getAttribute('data-active-tab')).toBe('today');
    expect(screen.getByTestId('today-view')).toBeTruthy();
  });

  it('opens and closes the settings modal', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('open-settings'));
    expect(screen.getByRole('dialog', { name: SETTINGS.title })).toBeTruthy();
    expect(screen.getByTestId('app-shell').getAttribute('data-active-tab')).toBe('today');
    expect(document.querySelector('[data-settings-entry="install-help"]')).toBeTruthy();
    expect(document.querySelector('[data-settings-entry="offline-note"]')).toBeTruthy();
    expect(document.querySelector('[data-settings-entry="delete-everything"]')).toBeTruthy();
    expect(screen.getByText(SETTINGS.offlineNote)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: SETTINGS.close }));
    expect(screen.queryByTestId('settings-modal')).toBeNull();
  });

  it('closes settings on Escape', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('open-settings'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('settings-modal')).toBeNull();
  });
});

describe('Today state binding', () => {
  const shells: Array<{ extra: ExtraTodayFacts; primary: string; title: string }> = [
    { extra: { hasAnyData: true }, primary: 'no-profile', title: 'What do you want to do?' },
    { extra: { detectionOnly: true }, primary: 'detection-only', title: 'Detection information' },
    { extra: { hasProfile: true }, primary: 'profile-no-break', title: 'Your saved result' },
    { extra: { abstinenceTracking: true }, primary: 'abstinence-tracking', title: 'Staying off THC' },
    { extra: { attempt: { status: 'active' } }, primary: 'active-break', title: 'Your break' },
    {
      extra: { attempt: { status: 'interrupted_time_needed' } },
      primary: 'interrupted',
      title: 'Break paused',
    },
    { extra: { attempt: { status: 'completed' } }, primary: 'completed-break', title: 'Break complete' },
  ];

  for (const { extra, primary, title } of shells) {
    it(`renders the ${primary} shell from resolveTodayState`, () => {
      renderApp(createMemoryStorage(), extra);
      const view = screen.getByTestId('today-view');
      expect(view.getAttribute('data-primary')).toBe(primary);
      expect(view.getAttribute('data-resume')).toBe('none');
      expect(screen.getByTestId(`state-${primary}`)).toBeTruthy();
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
      expect(view.textContent ?? '').not.toMatch(/\d+%/);
    });
  }

  it('does not let later-slice shells invent a day counter or range', () => {
    renderApp(createMemoryStorage(), { attempt: { status: 'active' } });
    const text = screen.getByTestId('today-view').textContent ?? '';
    expect(text).not.toMatch(/Day \d+ of \d+/);
    expect(text).not.toMatch(/\d+\s*[–-]\s*\d+\s*days/);
  });
});

describe('questionnaire resume placement', () => {
  it('replaces the primary card when a draft exists and no break owns Today', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 3);
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('no-profile');
    expect(view.getAttribute('data-resume')).toBe('replaces-primary');
    expect(screen.getByTestId('resume-card').getAttribute('data-resume-placement')).toBe('replaces-primary');
    expect(screen.getByRole('heading', { name: resumeTitle(3) })).toBeTruthy();
    expect(screen.queryByTestId('state-no-profile')).toBeNull();
    expect(screen.queryByTestId('state-first-launch')).toBeNull();
  });

  it('keeps an active break primary and shows resume as secondary', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 2);
    renderApp(storage, { attempt: { status: 'active' } });
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('active-break');
    expect(view.getAttribute('data-resume')).toBe('secondary');
    expect(screen.getByTestId('state-active-break')).toBeTruthy();
    expect(screen.getByTestId('resume-card').getAttribute('data-resume-placement')).toBe('secondary');
    expect(screen.getByRole('heading', { name: resumeTitle(2) })).toBeTruthy();
  });

  it('keeps an interrupted break primary and shows resume as secondary', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 4);
    renderApp(storage, { attempt: { status: 'interrupted_time_needed' } });
    expect(screen.getByTestId('today-view').getAttribute('data-resume')).toBe('secondary');
    expect(screen.getByTestId('state-interrupted')).toBeTruthy();
    expect(screen.getByTestId('resume-card')).toBeTruthy();
  });

  it('Start over clears the draft and restores the primary shell', () => {
    const storage = createMemoryStorage();
    saveDraft(storage, 3);
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('first-launch');
    expect(view.getAttribute('data-resume')).toBe('none');
    expect(screen.queryByTestId('resume-card')).toBeNull();
    expect(createQuestionnaireProgressStore(storage).load()).toBeNull();
  });
});

describe('delete everything', () => {
  it('wipes the draft after a 3-second hold and returns to first-launch', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    saveDraft(storage, 3);
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-settings'));
    const hold = screen.getByRole('button', { name: SETTINGS.deleteHoldLabel });
    fireEvent.pointerDown(hold);
    expect(screen.getByTestId('resume-card')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(createQuestionnaireProgressStore(storage).load()).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(createQuestionnaireProgressStore(storage).load()).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('first-launch');
    expect(screen.queryByTestId('settings-modal')).toBeNull();
  });

  it('cancels deletion if the hold is released early', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    saveDraft(storage, 3);
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-settings'));
    const hold = screen.getByRole('button', { name: SETTINGS.deleteHoldLabel });
    fireEvent.pointerDown(hold);
    vi.advanceTimersByTime(1500);
    fireEvent.pointerUp(hold);
    vi.advanceTimersByTime(3000);
    expect(createQuestionnaireProgressStore(storage).load()).not.toBeNull();
    expect(screen.getByTestId('resume-card')).toBeTruthy();
  });
});
