import { useRef } from 'preact/hooks';
import { presentConceptDistinctions } from '../application/presentation/break-guidance.ts';
import { DETECTION_EDUCATION_V1 } from '../domain/guidance/evidence-guidance-v1.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

/** Dedicated reference page separating withdrawal, tolerance, CB1 adaptation,
 * detectability and present impairment. */
export function ConceptDistinctionsPanel({ onClose }: { readonly onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  return (
    <div
      className="questionnaire-overlay"
      data-testid="concept-distinctions-reference"
      role="dialog"
      aria-modal="true"
      aria-labelledby="concept-distinctions-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={GUIDANCE_CHROME.closeReference} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="concept-distinctions-title" className="flow-title">
          {GUIDANCE_CHROME.distinctions}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        <ul className="guidance-list" data-testid="concept-distinctions">
          {presentConceptDistinctions().map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <section className="result-section" data-testid="detection-education">
          <h3 className="card-title">{DETECTION_EDUCATION_V1.title}</h3>
          <p className="body">{DETECTION_EDUCATION_V1.lead}</p>
          <ul className="guidance-list">
            {DETECTION_EDUCATION_V1.points.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="meta">{DETECTION_EDUCATION_V1.deferred}</p>
        </section>
      </div>
    </div>
  );
}
