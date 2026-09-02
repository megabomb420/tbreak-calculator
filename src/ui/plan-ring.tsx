// Plan progress ring (UX_SPEC 10.1, 12.4).
//
// The ring is labelled "plan progress" and represents plan time only — never
// biological recovery, reset, or detox. The fraction comes from the plan
// presentation view (day/target), never from component math.

export interface PlanRingProps {
  /** Current abstinence day of the plan. */
  readonly day: number;
  readonly targetDays: number;
  /** Full ring size in px. */
  readonly size?: number;
}

export function PlanRing({ day, targetDays, size = 148 }: PlanRingProps) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(Math.max(day / targetDays, 0), 1);
  const offset = circumference * (1 - fraction);
  const pastTarget = day > targetDays;
  const label = pastTarget
    ? `Day ${day}, past the ${targetDays}-day planning target`
    : `Day ${day} of ${targetDays}, plan progress`;

  return (
    <div className="plan-ring" data-testid="plan-ring" role="img" aria-label={label} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="plan-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="plan-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="plan-ring-center">
        <span className="plan-ring-day" data-testid="plan-ring-day">
          Day {day}
        </span>
        <span className="plan-ring-of">{pastTarget ? 'past target' : `of ${targetDays}`}</span>
      </span>
      <span className="plan-ring-label">{'Plan progress'}</span>
    </div>
  );
}
