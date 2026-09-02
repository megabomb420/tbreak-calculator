import { useState } from 'preact/hooks';
import { CHECKIN, SYMPTOM_FIELDS } from './break-copy.ts';
import { CheckIcon, CloseIcon } from './icons.tsx';

export interface SymptomValues {
  readonly craving: number | null;
  readonly sleep: number | null;
  readonly irritability: number | null;
  readonly anxiety: number | null;
  readonly appetite: number | null;
}

const EMPTY_SYMPTOMS: SymptomValues = { craving: null, sleep: null, irritability: null, anxiety: null, appetite: null };

export interface CheckInProps {
  /** Abstinence day shown in the header ("Check-in — Day N"). */
  readonly day: number;
  readonly onNoUseSave: () => void;
  /** User tapped "Yes": parent suspends timing and opens confirmation. */
  readonly onUseReported: () => void;
  readonly onSymptomsSave: (symptoms: SymptomValues, note: string | null) => void;
  readonly onClose: () => void;
}

export function CheckInFlow({ day, onNoUseSave, onUseReported, onSymptomsSave, onClose }: CheckInProps) {
  const [screen, setScreen] = useState<'question' | 'symptoms'>('question');
  const [noSelected, setNoSelected] = useState(false);

  return (
    <div
      className="questionnaire-overlay"
      data-testid="checkin-flow"
      data-screen={screen}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-title"
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={CHECKIN.close} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="checkin-title" className="flow-title">
          {`${CHECKIN.title} — Day ${day}`}
        </h2>
      </header>
      {screen === 'question' ? (
        <QuestionScreen
          noSelected={noSelected}
          onSelectNo={() => setNoSelected(true)}
          onYes={onUseReported}
          onSave={() => {
            if (noSelected) onNoUseSave();
          }}
          onAddSymptoms={() => setScreen('symptoms')}
        />
      ) : (
        <SymptomsScreen
          onBack={() => setScreen('question')}
          onSave={(symptoms, note) => onSymptomsSave(symptoms, note)}
        />
      )}
    </div>
  );
}

function QuestionScreen({
  noSelected,
  onSelectNo,
  onYes,
  onSave,
  onAddSymptoms,
}: {
  readonly noSelected: boolean;
  readonly onSelectNo: () => void;
  readonly onYes: () => void;
  readonly onSave: () => void;
  readonly onAddSymptoms: () => void;
}) {
  return (
    <>
      <div className="questionnaire-body flow-body">
        <div className="stack">
          <h3 className="card-title">{CHECKIN.question}</h3>
          <div className="two-choice">
            <button
              type="button"
              className={noSelected ? 'choice-card selected' : 'choice-card'}
              data-testid="checkin-no"
              onClick={onSelectNo}
            >
              <span className="choice-copy">
                <span className="choice-title">{CHECKIN.no}</span>
                <span className="meta">Nothing since your last check-in</span>
              </span>
              <span className="choice-check">
                <CheckIcon size={16} />
              </span>
            </button>
            <button
              type="button"
              className="choice-card"
              data-testid="checkin-yes"
              onClick={onYes}
            >
              <span className="choice-copy">
                <span className="choice-title">{CHECKIN.yes}</span>
                <span className="meta">You used since your last check-in</span>
              </span>
            </button>
          </div>
        </div>
      </div>
      <footer className="questionnaire-footer">
        <button
          type="button"
          className="cta-primary"
          disabled={!noSelected}
          data-testid="checkin-save"
          onClick={onSave}
        >
          {CHECKIN.save}
        </button>
        <button type="button" className="text-back" data-testid="add-symptoms" onClick={onAddSymptoms}>
          {`${CHECKIN.addSymptoms} →`}
        </button>
      </footer>
    </>
  );
}

function SymptomsScreen({
  onBack,
  onSave,
}: {
  readonly onBack: () => void;
  readonly onSave: (symptoms: SymptomValues, note: string | null) => void;
}) {
  const [symptoms, setSymptoms] = useState<SymptomValues>(EMPTY_SYMPTOMS);
  const [note, setNote] = useState('');

  function setField(field: keyof SymptomValues, value: number | null) {
    setSymptoms((current) => ({ ...current, [field]: value }));
  }

  return (
    <>
      <div className="questionnaire-body flow-body">
        <div className="stack">
          <header>
            <h3 className="title" style={{ fontSize: '1.5rem' }}>
              {CHECKIN.symptomsTitle}
            </h3>
            <p className="meta" data-testid="symptoms-helper">
              {`(${CHECKIN.symptomsHelper})`}
            </p>
          </header>
          {SYMPTOM_FIELDS.map((field) => (
            <SymptomSlider
              key={field.id}
              id={field.id}
              label={field.label}
              zero={field.zero}
              ten={field.ten}
              value={symptoms[field.id]}
              onChange={(value) => setField(field.id, value)}
            />
          ))}
          <label className="note-field">
            <span className="settings-entry-title">{CHECKIN.noteLabel}</span>
            <input
              type="text"
              maxLength={500}
              value={note}
              data-testid="checkin-note"
              aria-label={CHECKIN.noteLabel}
              onInput={(event) => setNote((event.target as HTMLInputElement).value)}
            />
            <span className="meta">{CHECKIN.noteHelper}</span>
          </label>
        </div>
      </div>
      <footer className="questionnaire-footer">
        <button
          type="button"
          className="cta-primary"
          data-testid="symptoms-save"
          onClick={() => onSave(symptoms, note === '' ? null : note)}
        >
          {CHECKIN.save}
        </button>
        <button type="button" className="text-back" onClick={onBack}>
          {CHECKIN.backToQuestion}
        </button>
      </footer>
    </>
  );
}

function SymptomSlider({
  id,
  label,
  zero,
  ten,
  value,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly zero: string;
  readonly ten: string;
  readonly value: number | null;
  readonly onChange: (value: number) => void;
}) {
  const [armed, setArmed] = useState(false);
  const shown = value ?? 0;
  const pct = `${(shown / 10) * 100}%`;

  return (
    <section
      className={value === null ? 'symptom-field unset' : 'symptom-field'}
      data-testid={`symptom-${id}`}
      data-value={value ?? 'unset'}
    >
      <header className="symptom-head">
        <span className="choice-title">{label}</span>
        <output className="symptom-output" aria-live="polite" data-testid={`symptom-${id}-readout`}>
          {value === null ? 'Not set' : String(value)}
        </output>
      </header>
      <div className="slider-wrap symptom-slider" style={{ '--slider-pct': pct } as Record<string, string>}>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={shown}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={shown}
          className="slider"
          onFocus={() => setArmed(true)}
          onPointerDown={() => setArmed(true)}
          onInput={(event) => {
            // A parked thumb stays null until the user deliberately touches
            // the control; an untouched slider is never stored as 0.
            if (!armed) return;
            onChange(Number((event.target as HTMLInputElement).value));
          }}
        />
      </div>
      <div className="symptom-anchors meta" aria-hidden="true">
        <span>
          {zero} · 0
        </span>
        <span>
          10 · {ten}
        </span>
      </div>
    </section>
  );
}
