import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createCompanionPersonalisationStore } from '../../src/application/progress/companion-personalisation.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import { sampleProfile, userValue } from '../helpers.ts';
import { DailySupport } from '../../src/ui/daily-support.tsx';

const AT = toInstant(1787184000000);

function renderResult() {
  const storage = createMemoryStorage();
  createQuestionnaireSnapshotStore(storage).save({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot: {
      kind: 'use_profile',
      profile: sampleProfile({ currentPatternDuration: userValue('1_to_6_months') }),
    },
    updatedAt: AT,
  });
  render(<App storage={storage} clock={fixedClock(AT)} />);
  return storage;
}

describe('independent companion personalisation flow', () => {
  it('saves and edits multiple areas without entering the scientific questionnaire', () => {
    const storage = renderResult();
    fireEvent.click(screen.getByTestId('edit-support'));
    expect(screen.getByTestId('personalisation-flow')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByTestId('questionnaire-flow')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Sleep or winding down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cravings in the moment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anxiety or racing thoughts' }));
    fireEvent.click(screen.getByTestId('save-support-areas'));

    expect(screen.queryByTestId('personalisation-flow')).toBeNull();
    expect(screen.getByTestId('result-screen')).toBeTruthy();
    expect(screen.getByTestId('support-area-summary').textContent).toMatch(/Sleep/);
    expect(screen.getByTestId('support-area-summary').textContent).toMatch(/Cravings/);
    expect(screen.getByTestId('support-area-summary').textContent).toMatch(/Anxiety/);
    expect(createCompanionPersonalisationStore(storage).loadOrMigrate().supportAreas)
      .toEqual(['sleep', 'cravings', 'anxiety']);

    fireEvent.click(screen.getByTestId('edit-support'));
    fireEvent.click(screen.getByRole('button', { name: 'Sleep or winding down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByTestId('personalisation-flow')).toBeNull();
    expect(screen.getByTestId('result-screen')).toBeTruthy();
    expect(createCompanionPersonalisationStore(storage).loadOrMigrate().supportAreas)
      .toEqual(['sleep', 'cravings', 'anxiety']);
  });

  it('Close returns to the result that opened it', () => {
    renderResult();
    fireEvent.click(screen.getByTestId('edit-support'));
    fireEvent.click(screen.getByRole('button', { name: 'Close personalisation' }));
    expect(screen.queryByTestId('personalisation-flow')).toBeNull();
    expect(screen.getByTestId('result-screen')).toBeTruthy();
    expect(screen.queryByTestId('questionnaire-flow')).toBeNull();
  });

  it('shows more than the first saved topic, with the basis for each suggestion', () => {
    render(<DailySupport input={{
      day: 3,
      now: AT,
      anchor: AT - 2 * 86400000,
      targetDays: 14,
      preparation: null,
      checkins: [],
      supportAreas: ['sleep', 'cravings', 'anxiety'],
    }} />);
    expect(screen.getByTestId('advice-anxiety').textContent).toContain('A topic you chose');
    expect(screen.getByTestId('advice-sleep').textContent).toContain('A topic you chose');
    expect(screen.getByTestId('advice-basis').textContent).toContain('No symptom ratings');
  });
});
