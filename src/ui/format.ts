// Display formatting helpers (display-only; instants stay UTC, formatting is
// local per UX_SPEC 2). Defined in the application layer so result copy and UI
// copy share one implementation and re-exported here for UI imports.

export { formatLocalDay, formatShortDay } from '../application/presentation/format.ts';
