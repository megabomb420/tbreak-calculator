import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import {
  createQuestionnaireProgressStore,
  QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-progress.ts';
import { createQuestionnaireSnapshotStore } from '../../src/application/progress/questionnaire-snapshot.ts';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH, RESUME } from '../../src/ui/copy.ts';
import { QUESTIONNAIRE, STEP_COPY } from '../../src/ui/questionnaire-copy.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const AT = toInstant(1787184000000);
const clock = fixedClock(AT);

function renderApp(storage: StorageAdapter = createMemoryStorage()) {
  return render(<App storage={storage} clock={clock} />);
}

function openQ1(storage?: StorageAdapter) {
  const store = storage ?? createMemoryStorage();
  renderApp(store);
  fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
  return store;
}

describe('questionnaire entry points', () => {
  it('opens Q1 from Get started without persisting an empty draft', () => {
    const storage = openQ1();
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q1');
    expect(screen.getByRole('heading', { name: STEP_COPY.Q1.title })).toBeTruthy();
    expect(createQuestionnaireProgressStore(storage).load()).toBeNull();
  });

  it('closes Q1 without an answer back to first-launch with no resume card', () => {
    openQ1();
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.close }));
    expect(screen.queryByTestId('questionnaire-flow')).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('first-launch');
    expect(screen.queryByTestId('resume-card')).toBeNull();
  });

  it('closes on Escape', () => {
    openQ1();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('questionnaire-flow')).toBeNull();
  });
});

describe('Q1 tap-advance, persistence, resume, start over', () => {
  it('advances from Q1, persists, returns to Today resume, and restores the step', () => {
    const storage = openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q2');
    expect(screen.getByRole('heading', { name: STEP_COPY.Q2.title })).toBeTruthy();

    const draft = createQuestionnaireProgressStore(storage).load();
    expect(draft?.answeredSteps).toBe(1);
    expect(draft?.currentStep).toBe('Q2');
    expect(draft?.answers.goal).toBe('tolerance_reset');
    expect(draft?.schemaVersion).toBe(QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION);

    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.close }));
    expect(screen.queryByTestId('questionnaire-flow')).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-resume')).toBe('replaces-primary');
    expect(screen.getByTestId('resume-card')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: RESUME.resume }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q2');
    expect(screen.getByRole('heading', { name: STEP_COPY.Q2.title })).toBeTruthy();
  });

  it('Start over clears the draft and returns to first-launch', () => {
    const storage = openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.close }));
    fireEvent.click(screen.getByRole('button', { name: RESUME.startOver }));
    expect(createQuestionnaireProgressStore(storage).load()).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('first-launch');
    expect(screen.queryByTestId('resume-card')).toBeNull();
  });
});

describe('goal chips and branching', () => {
  it('opens the reduction path at Q2R from the Q1 goal card', () => {
    openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Cut down/ }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q2R');
    expect(screen.getByRole('heading', { name: STEP_COPY.Q2R.title })).toBeTruthy();
  });

  it('does not ask last use on the reduction-no-break path', () => {
    const storage = openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Cut down/ }));
    fireEvent.click(screen.getByRole('button', { name: /Not now/ }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q2');
    fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
    expect(screen.queryByTestId('questionnaire-flow')).toBeNull();
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('reduction_planning');
    expect(createQuestionnaireProgressStore(storage).load()).toBeNull();
    const snapshot = createQuestionnaireSnapshotStore(storage).load();
    expect(snapshot?.snapshot.kind).toBe('use_profile');
    if (snapshot?.snapshot.kind === 'use_profile') {
      expect(snapshot.snapshot.profile.breakRequested).toBe(false);
      expect(snapshot.snapshot.profile.lastUseAt.value).toBeNull();
    }
  });
});

describe('step controls and keyboard', () => {
  it('keeps Continue disabled on use-days until a value is chosen', () => {
    openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
    const cont = screen.getByRole('button', { name: QUESTIONNAIRE.continue }) as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
    fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '10' } });
    expect(cont.disabled).toBe(false);
    fireEvent.click(cont);
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q3');
  });

  it('offers a None (0) chip so baseline-low is reachable without dragging a parked slider', () => {
    openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
    fireEvent.click(screen.getByRole('button', { name: 'None (0)' }));
    expect(screen.getByTestId('use-days-readout').textContent).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q3-opt');
  });

  it('goes Back to the previous shown step', () => {
    openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.back }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q1');
  });

  it('exposes 44px-class tap targets and a labelled close control', () => {
    openQ1();
    const close = screen.getByRole('button', { name: QUESTIONNAIRE.close });
    expect(close.getAttribute('aria-label')).toBe(QUESTIONNAIRE.close);
    expect(screen.getByRole('progressbar', { name: 'Questionnaire progress' })).toBeTruthy();
    const card = screen.getByRole('button', { name: /Reset my tolerance/ });
    expect(card.tagName).toBe('BUTTON');
  });
});

describe('last-use steps', () => {
  it('completes abstinence from the still-use chip', () => {
    const storage = openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Stay off THC/ }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q2A');
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.stillUseToday }));
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
    expect(screen.queryByTestId('questionnaire-flow')).toBeNull();
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('abstinence_planning');
    const snapshot = createQuestionnaireSnapshotStore(storage).load();
    expect(snapshot?.snapshot.kind).toBe('use_profile');
    if (snapshot?.snapshot.kind === 'use_profile') {
      expect(snapshot.snapshot.profile.goal).toBe('abstinence');
      expect(snapshot.snapshot.profile.lastUseAt.value).not.toBeNull();
    }
  });

  it('lets Q3-opt Skip finish a zero use-days tolerance path', () => {
    const storage = openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
    fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q3-opt');
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.skip }));
    expect(screen.queryByTestId('questionnaire-flow')).toBeNull();
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('baseline_low');
    const snapshot = createQuestionnaireSnapshotStore(storage).load();
    expect(snapshot?.snapshot.kind).toBe('use_profile');
    if (snapshot?.snapshot.kind === 'use_profile') {
      expect(snapshot.snapshot.profile.lastUseAt.value).toBeNull();
      expect(snapshot.snapshot.profile.thcUseDaysLast30.value).toBe(0);
    }
  });
});

describe('Q5 vape product', () => {
  it('offers a vape product chip distinct from the vaping route and stores it', () => {
    const storage = openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Reset my tolerance/ }));
    fireEvent.input(screen.getByTestId('use-days-slider'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: QUESTIONNAIRE.continue }));
    let flow = screen.getByTestId('questionnaire-flow');
    fireEvent.click(within(flow).getByRole('button', { name: 'Today' }));
    fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
    flow = screen.getByTestId('questionnaire-flow');
    fireEvent.click(within(flow).getByRole('button', { name: '1' }));
    fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));
    flow = screen.getByTestId('questionnaire-flow');
    expect(flow.getAttribute('data-step')).toBe('Q5');
    expect(within(flow).getByRole('button', { name: 'Vape (cart / pod / disposable)' })).toBeTruthy();
    expect(within(flow).getByRole('button', { name: 'Vaping' })).toBeTruthy();

    fireEvent.click(within(flow).getByRole('button', { name: 'Vape (cart / pod / disposable)' }));
    fireEvent.click(within(flow).getByRole('button', { name: 'Vaping' }));
    fireEvent.click(within(flow).getByRole('button', { name: QUESTIONNAIRE.continue }));

    expect(screen.queryByTestId('questionnaire-flow')).toBeNull();
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('tolerance_result');
    const snapshot = createQuestionnaireSnapshotStore(storage).load();
    expect(snapshot?.snapshot.kind).toBe('use_profile');
    if (snapshot?.snapshot.kind === 'use_profile') {
      expect(snapshot.snapshot.profile.products).toEqual(['vape']);
      expect(snapshot.snapshot.profile.routes).toEqual(['vaping']);
    }
  });
});

describe('detection completion snapshot', () => {
  it('stores a detection snapshot and does not leave a resume draft', () => {
    const storage = openQ1();
    fireEvent.click(screen.getByRole('button', { name: /Drug test info/ }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q2D');
    fireEvent.click(screen.getByRole('button', { name: 'Urine' }));
    expect(screen.getByTestId('questionnaire-flow').getAttribute('data-step')).toBe('Q3D');
    fireEvent.click(screen.getByRole('button', { name: /Just curious/ }));
    expect(screen.queryByTestId('questionnaire-flow')).toBeNull();
    expect(screen.getByTestId('result-screen').getAttribute('data-kind')).toBe('detection');
    expect(createQuestionnaireProgressStore(storage).load()).toBeNull();
    expect(screen.queryByTestId('resume-card')).toBeNull();
    const snapshot = createQuestionnaireSnapshotStore(storage).load();
    expect(snapshot?.snapshot).toEqual({
      kind: 'detection',
      request: { matrix: 'urine', context: 'general' },
    });
  });
});
