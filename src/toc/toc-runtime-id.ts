export type RawHeadingId = string;

export type ValidatedHeadingId = string & {
  readonly __brand: 'ValidatedHeadingId';
};

export type TocEntryId = string & {
  readonly __brand: 'TocEntryId';
};

export type TocRuntimeId = string & {
  readonly __brand: 'TocRuntimeId';
};

export type OwnerCandidateValidationStatus =
  | 'valid'
  | 'missing-owner'
  | 'duplicate-owner'
  | 'scope-mismatch';

export interface OwnerCandidateValidationIssue {
  readonly status: OwnerCandidateValidationStatus;
  readonly ownerId: string | null;
  readonly targetPath: string;
}

export type TocReservationMode = 'fail-closed-skeleton' | 'complete-validation';

export interface TocReservationAcceptanceResult {
  readonly accepted: boolean;
  readonly mode: TocReservationMode;
  readonly ownerId: string | null;
}

export interface RuntimeIdValidationResult {
  readonly raw: RawHeadingId;
  readonly validated: ValidatedHeadingId | null;
  readonly tocEntryId: TocEntryId | null;
}

export const normalizeTocRuntimeId = (value: string): TocRuntimeId | null => {
  const normalized = value.trim();
  return normalized.length > 0 ? (normalized as TocRuntimeId) : null;
};

export const validateHeadingRuntimeId = (raw: RawHeadingId): RuntimeIdValidationResult => {
  const normalized = raw.trim();
  if (normalized.length === 0) {
    return { raw, validated: null, tocEntryId: null };
  }

  return {
    raw,
    validated: normalized as ValidatedHeadingId,
    tocEntryId: `toc-entry-${normalized}` as TocEntryId,
  };
};
