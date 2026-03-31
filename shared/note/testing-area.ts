export const TESTING_AREAS = [
  'index',
  'markdown-basic',
  'media',
  'code',
  'interactive',
  'sandbox',
] as const;

export type TestingArea = (typeof TESTING_AREAS)[number];

export const normalizeTestingArea = (value: unknown): TestingArea | undefined => {
  return TESTING_AREAS.includes(value as TestingArea) ? (value as TestingArea) : undefined;
};

