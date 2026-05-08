export const HYDRATION_SCOPE_ATTRIBUTE = 'data-hydration-scope';
export const HYDRATION_CAPABILITY_ATTRIBUTE = 'data-hydration-capability';
export const HYDRATION_TRIGGER_ATTRIBUTE = 'data-hydration-trigger';
export const HYDRATION_KEY_ATTRIBUTE = 'data-hydration-key';

export const HYDRATION_TRIGGERS = ['initial', 'post-commit', 'visible', 'interaction'] as const;
export type HydrationTrigger = (typeof HYDRATION_TRIGGERS)[number];

export const HYDRATION_CAPABILITIES = [
  'static',
  'progressive',
  'interactive',
  'sandboxed',
] as const;
export type HydrationCapability = (typeof HYDRATION_CAPABILITIES)[number];

export const isHydrationTrigger = (value: unknown): value is HydrationTrigger =>
  typeof value === 'string' && (HYDRATION_TRIGGERS as readonly string[]).includes(value);

export const isHydrationCapability = (value: unknown): value is HydrationCapability =>
  typeof value === 'string' && (HYDRATION_CAPABILITIES as readonly string[]).includes(value);
