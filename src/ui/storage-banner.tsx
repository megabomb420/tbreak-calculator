import { STORAGE_BANNER } from './copy.ts';

/** `write-failed` is the mid-session case: one change was rejected, so the
 * banner stays up until a later write succeeds. */
export type StorageBannerVariant = 'unavailable' | 'write-failed';

export function StorageBanner({ variant = 'unavailable' }: { readonly variant?: StorageBannerVariant } = {}) {
  return (
    <div className="storage-banner" role="status" data-testid="storage-banner" data-variant={variant}>
      {variant === 'write-failed' ? STORAGE_BANNER.writeFailed : STORAGE_BANNER.message}
    </div>
  );
}
