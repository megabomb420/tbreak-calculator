import { CB1_EDUCATION_V1 } from '../domain/guidance/evidence-guidance-v1.ts';
import { RESEARCH } from './research-copy.ts';

/**
 * The result screen's research section. It replaces the former recovery-outlook
 * mode: one honest explanation of what the four-week human reference is, what it
 * is not, and which studies it comes from. `legacyOutlook` marks a saved result
 * that was calculated while the app still showed a predicted recovery window.
 */
export function ResearchContext({ legacyOutlook = false }: { readonly legacyOutlook?: boolean }) {
  return (
    <section className="result-section research-context" data-testid="research-context">
      <h3 className="card-title">{RESEARCH.title}</h3>
      {CB1_EDUCATION_V1.paragraphs.map((paragraph) => <p key={paragraph} className="body">{paragraph}</p>)}
      <p className="meta" data-testid="research-reference-note">{RESEARCH.referenceNote}</p>
      <h4 className="micro-label" data-testid="research-not-title">{RESEARCH.notTitle}</h4>
      <ul className="guidance-list" data-testid="research-not-points">
        {RESEARCH.notPoints.map((point) => <li key={point}>{point}</li>)}
      </ul>
      <div className="advice-sources">
        {RESEARCH.studies.map((study) => (
          <a key={study.href} className="text-link source-link" href={study.href} target="_blank" rel="noopener noreferrer">
            {study.label} ↗
          </a>
        ))}
      </div>
      {legacyOutlook ? (
        <p className="meta" data-testid="research-legacy-outlook">{RESEARCH.legacyOutlookNote}</p>
      ) : null}
    </section>
  );
}
