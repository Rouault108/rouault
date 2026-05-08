export const HYDRATION_DEFER_REASONS = ['toc-trigger'] as const;
export type HydrationDeferReason = (typeof HYDRATION_DEFER_REASONS)[number];

export const isHydrationDeferReason = (value: unknown): value is HydrationDeferReason =>
  typeof value === 'string' && (HYDRATION_DEFER_REASONS as readonly string[]).includes(value);
