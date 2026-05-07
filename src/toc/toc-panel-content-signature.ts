export interface TocPanelContentSignature {
  readonly ownerId: string;
  readonly headingCount: number;
  readonly sourceVersion: string;
}

export const createTocPanelContentSignature = (input: {
  readonly ownerId: string | null | undefined;
  readonly headingCount: number;
  readonly sourceVersion?: string | null;
}): TocPanelContentSignature => ({
  ownerId: input.ownerId?.trim() || 'unknown-owner',
  headingCount: Math.max(0, Math.trunc(input.headingCount)),
  sourceVersion: input.sourceVersion?.trim() || 'current',
});

export const serializeTocPanelContentSignature = (
  signature: TocPanelContentSignature,
): string => `${signature.ownerId}:${signature.headingCount}:${signature.sourceVersion}`;
