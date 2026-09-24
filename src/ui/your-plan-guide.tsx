export function YourPlanGuide({
  drivers,
  contextNote,
}: {
  readonly drivers: readonly string[];
  readonly contextNote: string | null;
}) {
  return (
    <>
      <section className="plan-priority" data-testid="plan-priority">
        <div>
          <p className="micro-label">Advice during your break</p>
          <p className="body">Today offers practical advice for your stage of the break, and every topic guide is one tap away.</p>
        </div>
      </section>

      <details className="result-disclosure why-plan" data-testid="why-plan">
        <summary>Why this plan</summary>
        <ul className="driver-list">
          {drivers.map((line) => (
            <li key={line} className="driver-item">
              <span className="driver-mark" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        {contextNote ? <p className="meta" data-testid="planning-context">{contextNote}</p> : null}
      </details>
    </>
  );
}
