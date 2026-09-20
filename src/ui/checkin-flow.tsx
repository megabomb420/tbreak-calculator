import { useRef, useState } from 'preact/hooks';
import { CHECKIN, SYMPTOM_FIELDS } from './break-copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

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
  readonly onSymptomsSave: (symptoms: SymptomValues, note: string | null) => void;
  readonly onClose: () => void;
}

export function CheckInFlow({ day, onSymptomsSave, onClose }: CheckInProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const [busy, setBusy] = useState(false);
  const [symptoms, setSymptoms] = useState<SymptomValues>(EMPTY_SYMPTOMS);
  const [note, setNote] = useState('');

  return (
    <div
      className="questionnaire-overlay"
      data-testid="checkin-flow"
      data-screen="symptoms"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={CHECKIN.close} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="checkin-title" className="flow-title">
          {`${CHECKIN.title} — Day ${day}`}
        </h2>
      </header>
        <SymptomsScreen
          symptoms={symptoms}
          note={note}
          onChange={setSymptoms}
          onNoteChange={setNote}
          onBack={onClose}
          onSave={(symptoms, note) => {
            if (busy) return;
            setBusy(true);
            onSymptomsSave(symptoms, note);
          }}
        />
    </div>
  );
}

function SymptomsScreen({
  symptoms,
  note,
  onChange,
  onNoteChange,
  onBack,
  onSave,
}: {
  readonly symptoms: SymptomValues;
  readonly note: string;
  readonly onChange: (symptoms: SymptomValues) => void;
  readonly onNoteChange: (note: string) => void;
  readonly onBack: () => void;
  readonly onSave: (symptoms: SymptomValues, note: string | null) => void;
}) {
  function setField(field: keyof SymptomValues, value: number | null) {
    onChange({ ...symptoms, [field]: value });
  }

  function submit() {
    onSave(symptoms, note === '' ? null : note);
  }

  return (
    <form
      className="checkin-symptoms-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="questionnaire-body flow-body">
        <div className="stack">
          <header>
            <h3 className="title" style={{ fontSize: '1.5rem' }}>
              {CHECKIN.symptomsTitle}
            </h3>
            <p className="meta" data-testid="symptoms-helper">
              {CHECKIN.symptomsHelper} Saving also records today without THC.
            </p>
          </header>
          {SYMPTOM_FIELDS.map((field) => (
            <SymptomSlider
              key={field.id}
              id={field.id}
              label={field.label}
              description={field.description}
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
              enterKeyHint="done"
              onInput={(event) => onNoteChange((event.target as HTMLInputElement).value)}
            />
            <span className="meta">{CHECKIN.noteHelper}</span>
          </label>
        </div>
      </div>
      <footer className="questionnaire-footer">
        <button
          type="submit"
          className="cta-primary"
          data-testid="symptoms-save"
        >
          {CHECKIN.save}
        </button>
        <button type="button" className="text-back" onClick={onBack}>
          {CHECKIN.backToQuestion}
        </button>
      </footer>
    </form>
  );
}

function SymptomSlider({
  id,
  label,
  description,
  zero,
  ten,
  value,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly zero: string;
  readonly ten: string;
  readonly value: number | null;
  readonly onChange: (value: number | null) => void;
}) {
  const armedRef = useRef(false);
  const shown = value ?? 0;
  const pct = `${(shown / 10) * 100}%`;

  function arm() {
    armedRef.current = true;
  }

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
      <p className="meta symptom-description" id={`symptom-${id}-help`}>{description}</p>
      <div className="slider-wrap symptom-slider" style={{ '--slider-pct': pct } as Record<string, string>}>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={shown}
          aria-label={label}
          aria-describedby={`symptom-${id}-help`}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={value === null ? undefined : shown}
          aria-valuetext={value === null ? 'Not set' : String(value)}
          className="slider"
          onFocus={arm}
          onPointerDown={arm}
          onMouseDown={arm}
          onInput={(event) => {
            // A parked thumb stays null until the user deliberately touches
            // the control; an untouched slider is never stored as 0.
            if (!armedRef.current) return;
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
      <div className="symptom-actions">
        <button type="button" className="text-back" aria-label={`Set ${label} to zero`} onClick={() => onChange(0)}>Use 0</button>
        {value !== null ? <button type="button" className="text-back" aria-label={`Leave ${label} unrecorded`} onClick={() => onChange(null)}>Skip this rating</button> : null}
      </div>
    </section>
  );
}
