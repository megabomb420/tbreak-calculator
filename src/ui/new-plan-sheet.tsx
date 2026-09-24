import { useRef } from 'preact/hooks';
import type { Goal } from '../domain/schemas/enums.ts';
import type { QuestionnaireProgressRecord } from '../application/progress/questionnaire-progress.ts';
import { RESUME } from './copy.ts';
import { CHOSEN_BREAK } from './break-copy.ts';
import { CloseIcon, CalendarIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';
import { GoalCards } from './questionnaire-controls.tsx';

export interface NewPlanSheetProps {
  /** An unfinished questionnaire, when one exists. */
  readonly draft: QuestionnaireProgressRecord | null;
  /** A saved result is available to reopen. */
  readonly hasSavedPlan: boolean;
  readonly onSelectGoal: (goal: Goal) => void;
  readonly onChooseLength: () => void;
  readonly onResume: () => void;
  readonly onDiscardDraft: () => void;
  readonly onViewSavedPlan: () => void;
  readonly onClose: () => void;
}

/**
 * Starting a plan is an action, not a destination: the four goals, a chosen
 * break length and any unfinished or saved calculation live here, opened from
 * Today, so browsing them never means leaving a running break behind.
 */
export function NewPlanSheet({
  draft,
  hasSavedPlan,
  onSelectGoal,
  onChooseLength,
  onResume,
  onDiscardDraft,
  onViewSavedPlan,
  onClose,
}: NewPlanSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  return (
    <div
      className="questionnaire-overlay"
      data-testid="new-plan"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-plan-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label="Close new calculation" onClick={onClose} data-autofocus>
          <CloseIcon />
        </button>
        <h2 id="new-plan-title" className="flow-title">New calculation</h2>
      </header>
      <div className="questionnaire-body flow-body">
        <p className="body">{CHOSEN_BREAK.newPlanIntro}</p>
        {draft !== null ? (
          <section className="card">
            <h3 className="card-title">{RESUME.unfinishedTitle}</h3>
            <p className="meta">{RESUME.unfinishedBody}</p>
            <div className="cta-row">
              <button type="button" className="cta-primary" data-testid="resume-draft" onClick={onResume}>{RESUME.resume}</button>
              <button type="button" className="text-back" data-testid="discard-draft" onClick={onDiscardDraft}>{RESUME.startOver}</button>
            </div>
          </section>
        ) : null}
        <GoalCards onSelect={onSelectGoal} />
        <button type="button" className="choice-card" data-testid="choose-break-length" onClick={onChooseLength}>
          <span className="choice-icon">
            <CalendarIcon size={20} />
          </span>
          <span className="choice-copy">
            <span className="choice-title">{CHOSEN_BREAK.optionTitle}</span>
            <span className="meta">{CHOSEN_BREAK.optionHelper}</span>
          </span>
        </button>
        {hasSavedPlan ? (
          <button type="button" className="cta-secondary" data-testid="view-saved-plan" onClick={onViewSavedPlan}>
            {CHOSEN_BREAK.viewSavedPlan}
          </button>
        ) : null}
        <p className="meta">{CHOSEN_BREAK.newPlanNote}</p>
      </div>
    </div>
  );
}
