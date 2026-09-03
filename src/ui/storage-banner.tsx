import { STORAGE_BANNER } from './copy.ts';

export function StorageBanner() {
  return (
    <div className="storage-banner" role="status" data-testid="storage-banner">
      {STORAGE_BANNER.message}
    </div>
  );
}
