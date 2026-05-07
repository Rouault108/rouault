import type { TocHeading } from './toc-headings.js';

export type TocDensityTier = 'compact' | 'comfortable' | 'expanded';

export interface TocDensityTierContract {
  readonly tier: TocDensityTier;
  readonly minInlineSizePx: number;
}

export const tocDensityTierContracts = [
  { tier: 'compact', minInlineSizePx: 0 },
  { tier: 'comfortable', minInlineSizePx: 320 },
  { tier: 'expanded', minInlineSizePx: 480 },
] as const satisfies readonly TocDensityTierContract[];

export const defaultTocDensityTier = 'comfortable' satisfies TocDensityTier;

export const tocDensityTiers = tocDensityTierContracts.map((contract) => contract.tier);

export const isTocDensityTier = (value: string): value is TocDensityTier =>
  tocDensityTiers.includes(value as TocDensityTier);

export const normalizeTocDensityTier = (value: string | null | undefined): TocDensityTier => {
  const normalized = value?.trim();
  return normalized !== undefined && isTocDensityTier(normalized)
    ? normalized
    : defaultTocDensityTier;
};

export const resolveTocDensityTier = (headings: readonly TocHeading[]): TocDensityTier => {
  if (headings.length === 0) {
    return defaultTocDensityTier;
  }

  const levels = headings.map((heading) => heading.level);
  const minimumLevel = Math.min(...levels);
  const maximumDepth = Math.max(...levels.map((level) => Math.max(0, level - minimumLevel)));

  if (headings.length >= 12 || maximumDepth >= 3) {
    return 'compact';
  }

  if (headings.length <= 4 && maximumDepth <= 1) {
    return 'expanded';
  }

  return defaultTocDensityTier;
};
