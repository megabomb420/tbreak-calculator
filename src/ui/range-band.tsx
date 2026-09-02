const CEILING_DAYS = 28;

export interface RangeBandProps {
  readonly min: number;
  readonly max: number;
  readonly preferred: number;
}

export function RangeBand({ min, max, preferred }: RangeBandProps) {
  const start = clamp((min / CEILING_DAYS) * 100);
  const width = clamp(((max - min) / CEILING_DAYS) * 100);
  const mark = clamp((preferred / CEILING_DAYS) * 100);

  return (
    <div
      className="range-band"
      role="img"
      aria-label={`Recommended break ${min} to ${max} days, plan for ${preferred} days`}
    >
      <div className="range-band-rail">
        <div className="range-band-span" style={{ left: `${start}%`, width: `${Math.max(width, 4)}%` }} />
        <div className="range-band-mark" style={{ left: `${mark}%` }} />
      </div>
      <div className="range-band-labels">
        <span>{min}d</span>
        <span className="range-band-plan">plan {preferred}d</span>
        <span>{max}d</span>
      </div>
    </div>
  );
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
