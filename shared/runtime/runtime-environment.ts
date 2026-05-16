export const RUNTIME_ENVIRONMENTS = ['production', 'development', 'test'] as const;

export type RuntimeEnvironment = (typeof RUNTIME_ENVIRONMENTS)[number];

export const isRuntimeEnvironment = (value: string): value is RuntimeEnvironment =>
  RUNTIME_ENVIRONMENTS.includes(value as RuntimeEnvironment);
