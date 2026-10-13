import { fileURLToPath } from 'node:url';

export const generatedCasesDirectory = fileURLToPath(
  new URL('../../.generated/ui-check/cases/', import.meta.url),
);

export const generatedCaseNames = [
  'search-controls',
  'code-surface',
  'code-surface-dark',
  'footer',
  'not-found',
  'reading-interactions',
  'video',
] as const;
