import type { ComponentChildren, JSX } from 'preact';
import type { DetectionContext, DetectionMatrix, Goal, ProductKind, Route } from '../domain/schemas/enums.ts';

type SvgProps = {
  readonly size?: number;
  readonly className?: string;
};

function Glyph({
  size = 22,
  className,
  children,
}: SvgProps & { readonly children: ComponentChildren }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function CloseIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M6 6l12 12M18 6L6 18" {...stroke} />
    </Glyph>
  );
}

export function GearIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="2.4" {...stroke} />
      <path
        d="M12 3.4l.7 2.2a6.6 6.6 0 0 1 1.8.8l2.1-.8 1.6 2.8-1.7 1.4c.1.5.2 1 .2 1.5s-.1 1-.2 1.5l1.7 1.4-1.6 2.8-2.1-.8a6.6 6.6 0 0 1-1.8.8l-.7 2.2h-3.2l-.7-2.2a6.6 6.6 0 0 1-1.8-.8l-2.1.8L3.8 15l1.7-1.4A6 6 0 0 1 5.3 12c0-.5.1-1 .2-1.5L3.8 9.1 5.4 6.3l2.1.8a6.6 6.6 0 0 1 1.8-.8l.7-2.2H12z"
        {...stroke}
      />
    </Glyph>
  );
}

export function TodayIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="10" r="3.2" {...stroke} />
      <path d="M12 4.2v1.4M12 14.4v1.3M6.6 10H5.2M18.8 10h-1.4M7.6 5.8l1 1M16.4 5.8l-1 1" {...stroke} />
      <path d="M4 19.2h16" {...stroke} />
    </Glyph>
  );
}

export function HistoryIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M5 6.5h4.5M5 12h4.5M5 17.5h4.5" {...stroke} />
      <circle cx="6.2" cy="6.5" r="1.05" fill="currentColor" />
      <circle cx="6.2" cy="12" r="1.05" fill="currentColor" />
      <circle cx="6.2" cy="17.5" r="1.05" fill="currentColor" />
      <path d="M12.5 7h6.5M12.5 12h6.5M12.5 17h4" {...stroke} />
    </Glyph>
  );
}

export function IntervalMark({ size = 40, className }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="32" height="32" rx="10" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      <rect x="13" y="12" width="4.2" height="16" rx="2.1" fill="currentColor" />
      <rect x="22.8" y="12" width="4.2" height="16" rx="2.1" fill="currentColor" />
    </svg>
  );
}

export function OfflineIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M5 12a9 9 0 0 1 14 0" {...stroke} />
      <path d="M8.2 12a5.2 5.2 0 0 1 7.6 0" {...stroke} />
      <circle cx="12" cy="16.2" r="1.15" fill="currentColor" />
    </Glyph>
  );
}

export function DeviceIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <rect x="8" y="3.5" width="8" height="17" rx="1.8" {...stroke} />
      <path d="M10.5 18.2h3" {...stroke} />
    </Glyph>
  );
}

export function NoAccountIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="9" r="3" {...stroke} />
      <path d="M6.4 19c.8-2.8 2.8-4.2 5.6-4.2s4.8 1.4 5.6 4.2" {...stroke} />
    </Glyph>
  );
}

export function CheckIcon({ size = 16, className }: SvgProps) {
  return (
    <Glyph size={size} className={className}>
      <path d="M5 12.2l4 4 10-10" {...stroke} strokeWidth={2} />
    </Glyph>
  );
}

export function GoalResetIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <rect x="8" y="6" width="3.2" height="12" rx="1.6" fill="currentColor" />
      <rect x="12.8" y="6" width="3.2" height="12" rx="1.6" fill="currentColor" />
    </Glyph>
  );
}

export function GoalReduceIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M5 16h4.2V8H13v5h6" {...stroke} />
      <path d="M16.2 10.2L19 13l2.8-2.8" {...stroke} />
    </Glyph>
  );
}

export function GoalAbstinenceIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="7.2" {...stroke} />
      <path d="M8.2 12h7.6" {...stroke} />
    </Glyph>
  );
}

export function GoalDetectionIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M8 4.5h5.4L18 9.2V19a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V6A1.5 1.5 0 0 1 8 4.5z" {...stroke} />
      <path d="M13.2 4.8V9h4.4M9 13h6M9 16.2h4" {...stroke} />
    </Glyph>
  );
}

export function goalIcon(id: Goal, props?: SvgProps) {
  switch (id) {
    case 'tolerance_reset':
      return <GoalResetIcon {...props} />;
    case 'reduction':
      return <GoalReduceIcon {...props} />;
    case 'abstinence':
      return <GoalAbstinenceIcon {...props} />;
    case 'detection_information':
      return <GoalDetectionIcon {...props} />;
  }
}

export function ProductFlowerIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="9.2" r="3" {...stroke} />
      <path d="M12 12.2v6.2M9.4 16.2c1.2 1.4 4 1.4 5.2 0" {...stroke} />
    </Glyph>
  );
}

export function ProductConcentrateIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M12 4.8c2.6 3.2 5.4 6 5.4 9a5.4 5.4 0 0 1-10.8 0c0-3 2.8-5.8 5.4-9z" {...stroke} />
    </Glyph>
  );
}

export function ProductVapeIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <rect x="4.5" y="10" width="12.5" height="5.2" rx="1.6" {...stroke} />
      <path d="M17 11.4h2.4v2.4H17M8.2 7.6c.8-.8 1.6-.8 2.4 0M11.2 6.4c.8-.8 1.7-.8 2.5 0" {...stroke} />
    </Glyph>
  );
}

export function ProductEdibleIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <rect x="5.5" y="7" width="13" height="10" rx="2.2" {...stroke} />
      <path d="M9 12h6M12 9.4v5.2" {...stroke} />
    </Glyph>
  );
}

export function ProductOilIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M10 4.8h4v3.2l2.4 3V18a2.4 2.4 0 0 1-2.4 2.4h-4A2.4 2.4 0 0 1 7.6 18v-7l2.4-3V4.8z" {...stroke} />
    </Glyph>
  );
}

export function ProductOtherIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M12 7v10M7 12h10" {...stroke} />
      <circle cx="12" cy="12" r="7.2" {...stroke} />
    </Glyph>
  );
}

export function productIcon(id: ProductKind, props?: SvgProps) {
  switch (id) {
    case 'flower':
      return <ProductFlowerIcon {...props} />;
    case 'concentrate':
      return <ProductConcentrateIcon {...props} />;
    case 'vape':
      return <ProductVapeIcon {...props} />;
    case 'edible':
      return <ProductEdibleIcon {...props} />;
    case 'oil':
      return <ProductOilIcon {...props} />;
    case 'other':
      return <ProductOtherIcon {...props} />;
  }
}

export function RouteSmokingIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M4.5 16.5h10.2c2 0 3.3-1.2 3.3-3.1 0-1.7-1.2-2.7-2.8-2.7" {...stroke} />
      <path d="M16.4 8.2c.7-.7 1.6-.7 2.3 0M18.4 6.2c.7-.7 1.6-.7 2.3 0" {...stroke} />
    </Glyph>
  );
}

export function RouteVapingIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M4.8 15.2h9.4l2.2-6.4h2.8" {...stroke} />
      <path d="M16.6 6.6c.7-.7 1.6-.7 2.3 0M18.6 4.8c.7-.7 1.6-.7 2.3 0" {...stroke} />
    </Glyph>
  );
}

export function RouteDabbingIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M7 17.5h10" {...stroke} />
      <path d="M9.2 17.5l1.6-8.2h2.4l1.6 8.2" {...stroke} />
      <path d="M12 5.2v2.6M9.6 6.2l1.2 1.4M14.4 6.2l-1.2 1.4" {...stroke} />
    </Glyph>
  );
}

export function RouteOralIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M6 10.5c0-1.6 1.4-2.8 3.1-2.8h5.8c1.7 0 3.1 1.2 3.1 2.8v4.2c0 2.2-2.2 3.8-6 3.8s-6-1.6-6-3.8v-4.2z" {...stroke} />
    </Glyph>
  );
}

export function RouteSublingualIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M12 5.2c2.2 2.8 4.6 5.1 4.6 7.6a4.6 4.6 0 0 1-9.2 0c0-2.5 2.4-4.8 4.6-7.6z" {...stroke} />
      <path d="M6 19.2h12" {...stroke} />
    </Glyph>
  );
}

export function RouteOtherIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="7.2" {...stroke} />
      <path d="M8.2 12h7.6" {...stroke} />
    </Glyph>
  );
}

export function routeIcon(id: Route, props?: SvgProps) {
  switch (id) {
    case 'smoking':
      return <RouteSmokingIcon {...props} />;
    case 'vaping':
      return <RouteVapingIcon {...props} />;
    case 'dabbing':
      return <RouteDabbingIcon {...props} />;
    case 'oral':
      return <RouteOralIcon {...props} />;
    case 'sublingual':
      return <RouteSublingualIcon {...props} />;
    case 'other':
      return <RouteOtherIcon {...props} />;
  }
}

export function MatrixUrineIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M9 4.8h6v3.4l2.2 2.6V18a2.6 2.6 0 0 1-2.6 2.6H9.4A2.6 2.6 0 0 1 6.8 18v-7.2l2.2-2.6V4.8z" {...stroke} />
      <path d="M9.4 15.2h5.2" {...stroke} />
    </Glyph>
  );
}

export function MatrixBloodIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M12 4.6c2.8 3.6 5.8 6.6 5.8 9.6a5.8 5.8 0 0 1-11.6 0c0-3 3-6 5.8-9.6z" {...stroke} />
    </Glyph>
  );
}

export function MatrixSalivaIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <rect x="5.2" y="8.2" width="13.6" height="9.2" rx="4.6" {...stroke} />
      <path d="M9 8.2V6.8A3 3 0 0 1 12 4.5 3 3 0 0 1 15 6.8v1.4" {...stroke} />
    </Glyph>
  );
}

export function MatrixHairIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M8 19.2c0-5.4 1.4-10.4 4-14.4 2.6 4 4 9 4 14.4" {...stroke} />
      <path d="M10.2 19.2c0-4 1-7.8 2.8-10.8" {...stroke} />
    </Glyph>
  );
}

export function matrixIcon(id: DetectionMatrix, props?: SvgProps) {
  switch (id) {
    case 'urine':
      return <MatrixUrineIcon {...props} />;
    case 'blood':
      return <MatrixBloodIcon {...props} />;
    case 'oral_fluid':
      return <MatrixSalivaIcon {...props} />;
    case 'hair':
      return <MatrixHairIcon {...props} />;
  }
}

export function ContextCuriousIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="7.2" {...stroke} />
      <path d="M9.6 10a2.5 2.5 0 0 1 4.8.8c0 1.4-2.4 2-2.4 3.4M12 17.2h.01" {...stroke} />
    </Glyph>
  );
}

export function ContextWorkIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <rect x="4.8" y="9" width="14.4" height="9.4" rx="1.6" {...stroke} />
      <path d="M9 9V7.4A2 2 0 0 1 11 5.5h2A2 2 0 0 1 15 7.4V9M4.8 13h14.4" {...stroke} />
    </Glyph>
  );
}

export function ContextRoadIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M5 16.5h14M7.2 16.5l1.6-8.4h6.4l1.6 8.4" {...stroke} />
      <path d="M9.6 11.4h4.8" {...stroke} />
    </Glyph>
  );
}

export function contextIcon(id: DetectionContext, props?: SvgProps) {
  switch (id) {
    case 'general':
      return <ContextCuriousIcon {...props} />;
    case 'workplace':
      return <ContextWorkIcon {...props} />;
    case 'roadside':
      return <ContextRoadIcon {...props} />;
  }
}

export function BreakYesIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <rect x="8.2" y="6" width="3" height="12" rx="1.5" fill="currentColor" />
      <rect x="12.8" y="6" width="3" height="12" rx="1.5" fill="currentColor" />
    </Glyph>
  );
}

export function BreakNoIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M6 15.5c2.4-3 4.6-4.6 6-4.6s3.6 1.6 6 4.6" {...stroke} />
      <path d="M8.5 9.5h7" {...stroke} />
    </Glyph>
  );
}

export function ChevronIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M9 6l6 6-6 6" {...stroke} />
    </Glyph>
  );
}

export function TrackDot({
  status,
}: {
  readonly status: 'current' | 'past' | 'upcoming' | 'none';
}) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className={`track-dot is-${status}`}>
      {status === 'past' ? (
        <>
          <circle cx="9" cy="9" r="8" fill="currentColor" />
          <path d="M5.2 9.2l2.4 2.4 5.2-5.4" fill="none" stroke="#151b24" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : status === 'current' ? (
        <>
          <circle cx="9" cy="9" r="8" fill="currentColor" />
          <circle cx="9" cy="9" r="3" fill="#151b24" />
        </>
      ) : (
        <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      )}
    </svg>
  );
}

/** Back chevron (points left) for pushed flow headers. */
export function BackIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M15 6l-6 6 6 6" {...stroke} />
    </Glyph>
  );
}

/** Pause bars — timing suspended (never colour alone). */
export function PauseIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M8 6.5v11M16 6.5v11" {...stroke} />
    </Glyph>
  );
}

/** Calendar — plan start / target dates. */
export function CalendarIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" {...stroke} />
      <path d="M4 10h16M8.5 3.5v3M15.5 3.5v3" {...stroke} />
    </Glyph>
  );
}

/** More (horizontal ellipsis) — overflow actions. */
export function MoreIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" />
    </Glyph>
  );
}

/** Stop square — neutral end (stop tracking / end early). */
export function StopIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" {...stroke} />
    </Glyph>
  );
}

/** Flag — completion acknowledgement. */
export function FlagIcon(props: SvgProps) {
  return (
    <Glyph {...props}>
      <path d="M6 20.5V4.5" {...stroke} />
      <path d="M6 5.5h10.5l-2.6 3.4 2.6 3.6H6" {...stroke} />
    </Glyph>
  );
}
