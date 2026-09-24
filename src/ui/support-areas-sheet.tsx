import { useRef, useState } from 'preact/hooks';
import type { SupportArea } from '../application/questionnaire/companion.ts';
import { SUPPORT_AREA_COPY, SUPPORT_AREA_GROUPS, SUPPORT_SHEET } from './companion-copy.ts';
import { CheckIcon, CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

export interface SupportAreasSheetProps {
  /** The topics already chosen, in the person's order. */
  readonly initialAreas: readonly SupportArea[];
  readonly onSave: (areas: readonly SupportArea[]) => void;
  readonly onClose: () => void;
}

/**
 * The topics the app should help with, chosen once after a calculation and
 * editable from Today afterwards. Nothing is written until Save, so backing
 * out leaves the previous choice exactly as it was.
 */
export function SupportAreasSheet({ initialAreas, onSave, onClose }: SupportAreasSheetProps) {
  const [areas, setAreas] = useState<readonly SupportArea[]>(initialAreas);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);

  function toggle(area: SupportArea): void {
    setAreas((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area],
    );
  }

  return (
    <div
      className="questionnaire-overlay"
      data-testid="support-areas-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-areas-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button
          type="button"
          className="icon-button"
          aria-label="Close support topics"
          onClick={onClose}
          data-autofocus
        >
          <CloseIcon />
        </button>
        <h2 className="flow-title">{SUPPORT_SHEET.flowTitle}</h2>
      </header>
      <div className="questionnaire-body flow-body">
        <section className="stack">
          <header>
            <h3 id="support-areas-title" className="title">{SUPPORT_SHEET.title}</h3>
            <p className="meta">{SUPPORT_SHEET.intro}</p>
          </header>
          <div className="support-areas-control" data-testid="support-area-cards">
            {SUPPORT_AREA_GROUPS.map((group) => (
              <div key={group.id} className="support-area-group" data-support-group={group.id}>
                <p className="micro-label">{group.label}</p>
                <div className="support-area-grid">
                  {group.areas.map((area) => {
                    const selected = areas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        className="support-area-card"
                        data-support-area={area}
                        aria-pressed={selected}
                        onClick={() => toggle(area)}
                      >
                        <span className="choice-title">{SUPPORT_AREA_COPY[area].label}</span>
                        <span className="choice-check"><CheckIcon size={16} /></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {areas.length === 0 ? (
            <p className="meta" data-testid="support-empty">{SUPPORT_SHEET.empty}</p>
          ) : null}
        </section>
      </div>
      <footer className="questionnaire-footer">
        <button
          type="button"
          className="cta-primary"
          data-testid="save-support-areas"
          onClick={() => onSave(areas)}
        >
          {SUPPORT_SHEET.save}
        </button>
        <button type="button" className="text-back" onClick={onClose}>{SUPPORT_SHEET.back}</button>
      </footer>
    </div>
  );
}
