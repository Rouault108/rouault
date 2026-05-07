export interface TocPanelContentSignature {
  readonly ownerId: string;
  readonly headingCount: number;
  readonly sourceVersion: string;
}

export const createTocPanelContentSignature = (input: {
  readonly ownerId: string | null | undefined;
  readonly headingCount: number;
  readonly sourceVersion?: string | null;
}): TocPanelContentSignature => {
  const ownerId = input.ownerId?.trim();
  const sourceVersion = input.sourceVersion?.trim();

  return {
    ownerId: ownerId === undefined || ownerId.length === 0 ? 'unknown-owner' : ownerId,
    headingCount: Math.max(0, Math.trunc(input.headingCount)),
    sourceVersion:
      sourceVersion === undefined || sourceVersion.length === 0 ? 'current' : sourceVersion,
  };
};

export const serializeTocPanelContentSignature = (
  signature: TocPanelContentSignature,
): string => `${signature.ownerId}:${String(signature.headingCount)}:${signature.sourceVersion}`;
