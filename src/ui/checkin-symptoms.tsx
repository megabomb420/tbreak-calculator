import { useState } from 'preact/hooks';
import type { DailyCheckin } from '../domain/schemas/profile.ts';
import type { CheckinSymptoms as SymptomValues } from '../application/break/break-session.ts';
import { CHECKIN, SYMPTOM_FIELDS } from './break-copy.ts';

const SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function valuesFrom(row: DailyCheckin | null): SymptomValues {
  return {
    craving: row?.craving ?? null,
    sleep: row?.sleep ?? null,
    irritability: row?.irritability ?? null,
    anxiety: row?.anxiety ?? null,
    appetite: row?.appetite ?? null,
  };
}

/**
 * Today's symptom report, edited where it is read. Values are toggles: tapping
 * the selected number clears the field again, so a rating can be taken back
 * without undoing the day's check-in.
 */
export function CheckinSymptoms({ recorded, onSave }: {
  /** Today's saved report, when the day already has one. */
  readonly recorded: DailyCheckin | null;
  readonly onSave: (symptoms: SymptomValues, note: string | null) => void;
}) {
  const [values, setValues] = useState<SymptomValues>(() => valuesFrom(recorded));
  const [note, setNote] = useState(recorded?.note ?? '');

  function toggle(field: keyof SymptomValues, value: number): void {
    setValues((current) => ({ ...current, [field]: current[field] === value ? null : value }));
  }

  return (
    <section className="checkin-symptoms" data-testid="checkin-symptoms">
      <h3 className="card-title">{CHECKIN.symptomsTitle}</h3>
      <p className="meta" data-testid="symptoms-helper">
        {CHECKIN.symptomsHelper} {CHECKIN.symptomsSaveNote}
      </p>
      {SYMPTOM_FIELDS.map((field) => {
        const value = values[field.id];
        return (
          <section className="symptom-field" key={field.id} data-testid={`symptom-${field.id}`} data-value={value ?? 'unset'}>
            <header className="symptom-head">
              <span className="choice-title">{field.label}</span>
              <output className="symptom-output" aria-live="polite" data-testid={`symptom-${field.id}-readout`}>
                {value === null ? CHECKIN.notSet : String(value)}
              </output>
            </header>
            <p className="meta symptom-description" id={`symptom-${field.id}-help`}>{field.description}</p>
            <div className="symptom-scale" role="group" aria-label={field.label} aria-describedby={`symptom-${field.id}-help`}>
              {SCALE.map((step) => (
                <button
                  type="button"
                  key={step}
                  className={value === step ? 'symptom-value selected' : 'symptom-value'}
                  data-testid={`symptom-${field.id}-${step}`}
                  aria-pressed={value === step}
                  onClick={() => toggle(field.id, step)}
                >
                  {step}
                </button>
              ))}
            </div>
            <div className="symptom-anchors meta" aria-hidden="true">
              <span>{field.zero} · 0</span>
              <span>10 · {field.ten}</span>
            </div>
            {value !== null ? (
              <button
                type="button"
                className="text-back symptom-clear"
                data-testid={`symptom-${field.id}-clear`}
                aria-label={`Clear ${field.label}`}
                onClick={() => toggle(field.id, value)}
              >
                {CHECKIN.clearRating}
              </button>
            ) : null}
          </section>
        );
      })}
      <label className="note-field">
        <span className="settings-entry-title">{CHECKIN.noteLabel}</span>
        <input
          type="text"
          maxLength={500}
          value={note}
          data-testid="checkin-note"
          aria-label={CHECKIN.noteLabel}
          enterKeyHint="done"
          onInput={(event) => setNote((event.target as HTMLInputElement).value)}
        />
        <span className="meta">{CHECKIN.noteHelper}</span>
      </label>
      <button
        type="button"
        className="cta-secondary"
        data-testid="symptoms-save"
        onClick={() => onSave(values, note.trim() === '' ? null : note)}
      >
        {recorded === null ? CHECKIN.save : CHECKIN.update}
      </button>
    </section>
  );
}
