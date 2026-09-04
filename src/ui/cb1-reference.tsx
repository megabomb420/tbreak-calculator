import { useRef } from 'preact/hooks';
import { presentCb1Education, presentConceptDistinctions } from '../application/presentation/break-guidance.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

/** Dedicated "Tolerance is not a percentage" reference page. Uses the same
 * dialog chrome and reading design as the detox-claims reference page. */
export function Cb1ReferencePanel({ onClose }: { readonly onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const cb1 = presentCb1Education();
  return (
    <div
      className="questionnaire-overlay"
      data-testid="cb1-reference"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cb1-reference-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={GUIDANCE_CHROME.closeReference} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="cb1-reference-title" className="flow-title">
          {cb1.title}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        {cb1.paragraphs.map((paragraph) => (
          <p key={paragraph} className="body">
            {paragraph}
          </p>
        ))}
        <section className="card" data-testid="concept-distinctions">
          <h3 className="card-title">{GUIDANCE_CHROME.distinctions}</h3>
          <ul className="guidance-list">
            {presentConceptDistinctions().map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
