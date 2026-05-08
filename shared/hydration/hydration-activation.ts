import type { HydrationDeferReason } from './hydration-deferred.js';

export type HydrationSkippedReason =
  | 'already-activated'
  | 'element-disconnected'
  | 'invalid-element'
  | 'missing-source';

export type HydrationCleanup = () => void | Promise<void>;

export interface HydrationActivationCleanupRegistration {
  readonly id: string;
  readonly category: 'watcher' | 'activation' | 'session-bookkeeping';
  readonly cleanup: HydrationCleanup;
}

export type HydrationActivationResult =
  | {
      readonly status: 'activated';
      readonly cleanup?: HydrationCleanup | HydrationActivationCleanupRegistration;
    }
  | { readonly status: 'deferred'; readonly reason: HydrationDeferReason }
  | { readonly status: 'skipped'; readonly reason: HydrationSkippedReason }
  | { readonly status: 'aborted' };

export const normalizeHydrationActivationResult = (
  value: unknown,
): HydrationActivationResult => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    (value.status === 'activated' ||
      value.status === 'deferred' ||
      value.status === 'skipped' ||
      value.status === 'aborted')
  ) {
    return value as HydrationActivationResult;
  }

  return { status: 'activated' };
};
