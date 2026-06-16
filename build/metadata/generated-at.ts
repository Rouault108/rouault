import { requireGeneratedAtInput } from '../../shared/navigation/generated-at-contract.js';

let generatedAtOnce: string | null = null;

export const resolveGeneratedAt = (explicit?: string | undefined): string | undefined => {
  const candidate = explicit ?? process.env['ROUAULT_GENERATED_AT'];
  return candidate === undefined ? undefined : requireGeneratedAtInput(candidate);
};

export const createBuildGeneratedAtOnce = (explicit?: string | undefined): string => {
  if (generatedAtOnce !== null) {
    return generatedAtOnce;
  }

  generatedAtOnce =
    resolveGeneratedAt(explicit) ?? requireGeneratedAtInput(new Date().toISOString());
  return generatedAtOnce;
};
