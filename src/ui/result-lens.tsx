import type { ComponentChildren } from 'preact';

export function ResultLensHero({
  eyebrow,
  value,
  prefix,
  unit,
  summary,
  tone,
  labelledBy,
  valueTestId,
  summaryTestId,
  children,
}: {
  readonly eyebrow: string;
  readonly value: string | number;
  readonly prefix?: string;
  readonly unit: string;
  readonly summary: string;
  readonly tone: 'plan' | 'recovery';
  readonly labelledBy?: string;
  readonly valueTestId?: string;
  readonly summaryTestId?: string;
  readonly children?: ComponentChildren;
}) {
  return (
    <header className={`result-lens-hero is-${tone}`} data-testid={`result-lens-${tone}`}>
      <span className="result-lens-orbit" aria-hidden="true" />
      <p className="micro-label">{eyebrow}</p>
      <h2
        id={labelledBy}
        className="result-lens-value"
        data-testid={valueTestId}
      >
        {prefix ? <><span className="result-lens-prefix">{prefix}</span>{' '}</> : null}
        <span className="result-lens-number">{value}</span>{' '}
        <span className="result-lens-unit">{unit}</span>
      </h2>
      <p className="result-lens-summary" data-testid={summaryTestId}>{summary}</p>
      {children}
    </header>
  );
}

export function ResultInsight({
  label,
  value,
  children,
  testId,
}: {
  readonly label: string;
  readonly value?: string;
  readonly children: ComponentChildren;
  readonly testId?: string;
}) {
  return (
    <section className="result-insight" data-testid={testId}>
      <p className="micro-label">{label}</p>
      {value ? <p className="result-insight-value">{value}</p> : null}
      <div className="result-insight-copy">{children}</div>
    </section>
  );
}
