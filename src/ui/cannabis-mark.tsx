/** Original botanical mark, rendered as local vector artwork. */
export function CannabisMark({ size = 26, className = '' }: { readonly size?: number; readonly className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <g fill="currentColor">
      <path d="M32 46C22 32 27 15 32 5C37 15 42 32 32 46Z" />
      <path d="M30 47C16 41 12 27 10 17C20 22 29 31 30 47ZM34 47C48 41 52 27 54 17C44 22 35 31 34 47Z" />
      <path d="M29 48C16 51 8 42 3 35C14 35 24 38 29 48ZM35 48C48 51 56 42 61 35C50 35 40 38 35 48Z" />
      <path d="M29 49C24 57 16 56 11 54C17 50 23 48 29 49ZM35 49C40 57 48 56 53 54C47 50 41 48 35 49Z" />
    </g>
    <path d="M32 40V60" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
  </svg>;
}
