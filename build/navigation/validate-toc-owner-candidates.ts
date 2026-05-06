import type {
  OwnerCandidateValidationIssue,
  TocReservationAcceptanceResult,
  TocReservationMode,
} from '../../src/toc/toc-runtime-id.js';

export interface TocOwnerCandidate {
  readonly ownerId: string | null;
  readonly targetPath: string;
  readonly scopeId?: string | null;
}

export interface TocOwnerCandidateValidationResult {
  readonly mode: TocReservationMode;
  readonly issues: readonly OwnerCandidateValidationIssue[];
  readonly accepted: readonly TocReservationAcceptanceResult[];
}

export const STAGE_ONE_TOC_RESERVATION_MODE: TocReservationMode = 'fail-closed-skeleton';

export const validateTocOwnerCandidates = (
  candidates: readonly TocOwnerCandidate[],
): TocOwnerCandidateValidationResult => ({
  mode: STAGE_ONE_TOC_RESERVATION_MODE,
  issues: candidates
    .filter((candidate) => candidate.ownerId === null || candidate.ownerId.trim().length === 0)
    .map((candidate) => ({
      status: 'missing-owner',
      ownerId: null,
      targetPath: candidate.targetPath,
    })),
  accepted: candidates.map((candidate) => ({
    accepted: false,
    mode: STAGE_ONE_TOC_RESERVATION_MODE,
    ownerId:
      typeof candidate.ownerId === 'string' && candidate.ownerId.trim().length > 0
        ? candidate.ownerId.trim()
        : null,
  })),
});
