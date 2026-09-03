// Recovery result UI: "Your plan | Predicted reset" segmented control and the
// PredictedResetPanel (0.9.0 Recovery Intelligence).

import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH } from '../../src/ui/copy.ts';
import { QUESTIONNAIRE } from '../../src/ui/questionnaire-copy.ts';
import { RESULT } from '../../src/ui/result-copy.ts';
import { RESET_MODE, RESET_PANEL, RESET_EVIDENCE } from '../../src/ui/recovery-copy.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import { createCalculationRecordsStore } from '../../src/application/persistence/calculation-record.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';

const AT = toInstant(1787184000000);
const clock = fixedClock(AT);

function renderApp(storage: StorageAdapter = createMemoryStorage()) {
  return render(<App storage={storage} clock={clock} />);
}

/** Drives the questionnaire to a tolerance result and returns nothing. */
function completeTolerance(storage: StorageAdapter, opts: { useDays: string; duration: RegExp; sessions?: boolean }) {
  renderApp(storage);
  fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
  fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
  fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: opts.duration }));
  fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: opts.useDays } });
  fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
  let flow = screen.getByTestId('questionnaire-flow');
  fireEvent.click(within(flow).getByRole('button', { name: 'Today' }));
  fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
  if (opts.sessions === true) {
    fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: '1' }));
    fireEvent.click(within(screen.getByTestId('questionnaire-flow')).getByRole('button', { name: QUESTIONNAIRE.continue }));
    flow = screen.getByTestId('questionnaire-flow');
    fireEvent.click(within(flow).getByRole('button', { name: /Flower/ }));
    fireEvent.click(within(flow).getByRole('button', { name: 'Smoking' }));
    fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Breaking the usual routine' }));
}

function openResetMode(): void {
  fireEvent.click(screen.getByTestId('result-mode-reset'));
}

describe('result view mode segment (tolerance_result)', () => {
  it('renders the segment on tolerance results with the plan default intact', () => {
    completeTolerance(createMemoryStorage(), { useDays: '10', duration: /1–6 months/, sessions: true });
    const screenBox = screen.getByTestId('result-screen');
    expect(screenBox.getAttribute('data-kind')).toBe('tolerance_result');
    const mode = screen.getByTestId('result-mode');
    expect(mode.getAttribute('role')).toBe('tablist');
    expect(screen.getByTestId('result-mode-plan').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('result-mode-reset').getAttribute('aria-selected')).toBe('false');
    // Default "Your plan": the hero still leads, unchanged.
    expect(screen.getByRole('heading', { name: '7 days' })).toBeTruthy();
    expect(screen.getByTestId('break-outlook')).toBeTruthy();
  });

  it('does not show the segment for non-tolerance result kinds', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
    fireEvent.click(screen.getByRole('button', { name: /Drug test info/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Hair' }));
    fireEvent.click(screen.getByRole('button', { name: /Just curious/ }));
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('detection');
    expect(screen.queryByTestId('result-mode')).toBeNull();
  });
});

describe('predicted reset panel content', () => {
  it('switches to the reset panel with disclaimer, target, range and reference', () => {
    completeTolerance(createMemoryStorage(), { useDays: '10', duration: /1–6 months/, sessions: true });
    openResetMode();
    expect(screen.getByTestId('result-mode-reset').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('reset-disclaimer').textContent).toBe(RESET_PANEL.disclaimer);
    expect(screen.getByTestId('reset-window-value').textContent).toBe('About 1–2 weeks');
    expect(screen.getByTestId('result-lens-recovery').textContent).toContain('weeks');
    expect(screen.getByTestId('reset-target-day').textContent).toBe('7 days');
    expect(screen.getByTestId('reset-evidence-range').textContent).toContain('7–14 days');
    expect(screen.getByTestId('reset-biological-reference').textContent).toContain(RESET_PANEL.referenceValue);
    expect(screen.getByTestId('reset-biological-reference').textContent).toMatch(/not.*proof of complete recovery/i);
    // The panel is a time list, never a percentage meter.
    expect(screen.getByTestId('reset-timeline-section').textContent).toMatch(
      /never a recovery percentage/i,
    );
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByTestId('plan-ring')).toBeNull();
    // Milestones for a 7-14 profile: distinct markers 0/2/7/14/28.
    const timeline = screen.getByTestId('recovery-timeline');
    expect(within(timeline).getByTestId('recovery-milestone-last_use')).toBeTruthy();
    expect(within(timeline).getByTestId('recovery-milestone-early_recovery')).toBeTruthy();
    expect(within(timeline).getByTestId('recovery-milestone-predicted_window_start')).toBeTruthy();
    expect(within(timeline).getByTestId('recovery-milestone-predicted_window_end')).toBeTruthy();
    expect(within(timeline).getByTestId('recovery-milestone-four_week_reference')).toBeTruthy();
    // Plan content is replaced while in reset mode.
    expect(screen.queryByTestId('break-outlook')).toBeNull();
    expect(screen.queryByTestId('history-card')).toBeNull();
  });

  it('deduplicates a Day-28 target into one single four-week marker', () => {
    completeTolerance(createMemoryStorage(), { useDays: '30', duration: /5\+ years/, sessions: true });
    openResetMode();
    const timeline = screen.getByTestId('recovery-timeline');
    const days = within(timeline)
      .getAllByText(/^Day \d+$/)
      .map((node) => node.textContent);
    expect(days.filter((day) => day === 'Day 28')).toHaveLength(1);
    expect(within(timeline).getByTestId('recovery-milestone-four_week_reference')).toBeTruthy();
    expect(within(timeline).queryByTestId('recovery-milestone-plan_target')).toBeNull();
    expect(timeline.textContent).not.toMatch(/[%]/);
  });

  it('keeps the light profile wording free of a 28-day requirement', () => {
    completeTolerance(createMemoryStorage(), { useDays: '2', duration: /Less than 1 month/ });
    openResetMode();
    const wording = screen.getByTestId('reset-wording').textContent ?? '';
    expect(wording).toContain('Your profile-sensitive prediction remains relatively short.');
    expect(screen.getByTestId('reset-window-value').textContent).toBe('2–7 days');
    // It never claims the plan reaches the strongest chronic-use reference.
    expect(screen.getByTestId('reset-light-reference-note').textContent ?? '').toMatch(/does not mean.*Day 28/i);
  });

  it('toggles the evidence disclosure open and closed', () => {
    completeTolerance(createMemoryStorage(), { useDays: '10', duration: /1–6 months/, sessions: true });
    openResetMode();
    const evidence = screen.getByTestId('reset-evidence');
    expect(evidence.hasAttribute('open')).toBe(false);
    expect(within(evidence).getByText(RESET_EVIDENCE.summary)).toBeTruthy();
    fireEvent.click(within(evidence).getByText(RESET_EVIDENCE.summary));
    // happy-dom toggles native <details> on summary activation.
    expect(evidence.hasAttribute('open')).toBe(true);
    expect(evidence.textContent).toMatch(/Eleven cannabis-dependent men/i);
    expect(evidence.textContent).toMatch(/D'Souza/i);
    expect(evidence.textContent).toMatch(/Hirvonen/i);
    expect(evidence.textContent).toMatch(/Cortical CB1 availability/i);
    expect(evidence.textContent).toMatch(/not scientifically proven as a complete reset/i);
    fireEvent.click(within(evidence).getByText(RESET_EVIDENCE.summary));
    expect(evidence.hasAttribute('open')).toBe(false);
  });

  it('opens and closes via keyboard on the segment (arrows, Enter, Space)', () => {
    completeTolerance(createMemoryStorage(), { useDays: '10', duration: /1–6 months/, sessions: true });
    const mode = screen.getByTestId('result-mode');
    const planTab = screen.getByTestId('result-mode-plan');
    const resetTab = screen.getByTestId('result-mode-reset');
    planTab.focus();
    fireEvent.keyDown(mode, { key: 'ArrowRight' });
    expect(resetTab.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(resetTab);
    expect(screen.getByTestId('reset-disclaimer')).toBeTruthy();
    fireEvent.keyDown(resetTab, { key: 'Enter' });
    expect(resetTab.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(mode, { key: 'ArrowLeft' });
    expect(planTab.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(planTab);
    expect(screen.queryByTestId('reset-disclaimer')).toBeNull();
    fireEvent.keyDown(planTab, { key: ' ' });
    expect(planTab.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(mode, { key: 'ArrowRight' });
    expect(resetTab.getAttribute('aria-selected')).toBe('true');
  });

  it('renders the reset panel without crashing on a narrow viewport', () => {
    const width = 320;
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    try {
      completeTolerance(createMemoryStorage(), { useDays: '10', duration: /1–6 months/, sessions: true });
      openResetMode();
      expect(screen.getByTestId('reset-disclaimer')).toBeTruthy();
      expect(screen.getByTestId('recovery-timeline')).toBeTruthy();
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    }
  });

  it('shows the historical-context lead label only for frozen pre-v3 records', () => {
    // The live result is tolerance-v3: no context label in the reset lead.
    completeTolerance(createMemoryStorage(), { useDays: '10', duration: /1–6 months/, sessions: true });
    openResetMode();
    expect(screen.queryByTestId('reset-context-label')).toBeNull();
  });
});

describe('predicted reset from History (frozen records)', () => {
  function toleranceProfile(overrides: Partial<UseProfileInput> = {}): UseProfileInput {
    return {
      goal: 'tolerance_reset',
      breakRequested: true,
      postBreakMode: null,
      thcUseDaysLast30: { value: 10, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
      products: ['flower'],
      routes: ['smoking'],
      lastUseAt: { value: new Date(AT - 2 * 86400000).toISOString(), provenance: 'user_estimate' },
      currentPatternDuration: { value: '1_to_6_months', provenance: 'user_estimate' },
      previousBreaks: [],
      ...overrides,
    };
  }

  function seedHistory(
    storage: StorageAdapter,
    mutate?: (record: ReturnType<typeof freezeCalculation>) => ReturnType<typeof freezeCalculation>,
    profileOverrides: Partial<UseProfileInput> = {},
  ) {
    const profile = toleranceProfile(profileOverrides);
    const snapshot = { kind: 'use_profile' as const, profile };
    createQuestionnaireSnapshotStore(storage).save({
      schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
      snapshot,
      updatedAt: AT,
      runId: 'run-1',
    });
    createResultViewStore(storage).save({ schemaVersion: RESULT_VIEW_SCHEMA_VERSION, status: 'acknowledged', updatedAt: AT });
    const frozen = freezeCalculation('run-1', snapshot, AT);
    const record = mutate !== undefined ? mutate(frozen) : frozen;
    createCalculationRecordsStore(storage).save({
      schemaVersion: 'calculation-records-v1',
      records: [record],
      corrupt: [],
    });
  }

  it('builds the reset panel from the frozen record opened in History', () => {
    const storage = createMemoryStorage();
    seedHistory(storage);
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByTestId('history-row'));
    const result = screen.getByTestId('result-screen');
    expect(result.getAttribute('data-historical')).toBe('true');
    expect(screen.getByTestId('result-mode')).toBeTruthy();
    fireEvent.click(screen.getByTestId('result-mode-reset'));
    expect(screen.getByTestId('reset-disclaimer')).toBeTruthy();
    expect(screen.getByTestId('reset-target-day').textContent).toBe('7 days');
    expect(screen.getByTestId('recovery-timeline')).toBeTruthy();
    expect(screen.queryByTestId('reset-context-label')).toBeNull();
  });

  it('renders a six-week outer heuristic separately from the 28-day plan and human reference', () => {
    const storage = createMemoryStorage();
    seedHistory(storage, undefined, {
      thcUseDaysLast30: { value: 30, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 3, provenance: 'user_estimate' },
      products: ['concentrate'],
      routes: ['dabbing'],
      currentPatternDuration: { value: '5_plus_years', provenance: 'user_estimate' },
    });
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByTestId('history-row'));
    fireEvent.click(screen.getByTestId('result-mode-reset'));
    expect(screen.getByTestId('reset-window-value').textContent).toBe('About 4–6 weeks');
    expect(screen.getByTestId('reset-target-day').textContent).toBe('28 days');
    expect(screen.getByTestId('reset-biological-reference').textContent).toContain('Day 28');
    expect(screen.getByTestId('reset-lower-directness').textContent).toMatch(/product heuristic/i);
    expect(screen.getByTestId('reset-extended-recovery')).toBeTruthy();
    const timeline = screen.getByTestId('recovery-timeline');
    expect(within(timeline).getAllByText('Day 28')).toHaveLength(1);
    expect(within(timeline).getByText('Day 42')).toBeTruthy();
  });

  it('labels legacy v1/v2 records "historical context" but still renders stored numbers', () => {
    const storage = createMemoryStorage();
    seedHistory(storage, (frozen) => {
      const { recoveryOutlookVersion: _recoveryOutlookVersion, ...legacy } = frozen;
      return {
        ...legacy,
        policyVersion: 'tolerance-v1',
        result: { type: 'tolerance', value: { ...frozen.result.value, policyVersion: 'tolerance-v1' } },
      };
    });
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByTestId('history-row'));
    fireEvent.click(screen.getByTestId('result-mode-reset'));
    expect(screen.getByTestId('reset-context-label').textContent).toBe(RESET_MODE.historicalContext);
    expect(screen.getByTestId('reset-target-day').textContent).toBe('Day 7');
    expect(screen.getByTestId('reset-planning-target').textContent).toMatch(/policy used at the time/i);
    expect(screen.getByTestId('reset-v1-historical')).toBeTruthy();
    expect(screen.queryByTestId('reset-predicted-window')).toBeNull();
  });
});
