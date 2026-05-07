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
export const COMPLETE_TOC_RESERVATION_MODE: TocReservationMode = 'complete-validation';

const normalizeOwnerId = (value: string | null): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

export const validateTocOwnerCandidates = (
  candidates: readonly TocOwnerCandidate[],
): TocOwnerCandidateValidationResult => {
  const ownerCounts = new Map<string, number>();
  const normalizedCandidates = candidates.map((candidate) => {
    const ownerId = normalizeOwnerId(candidate.ownerId);
    if (ownerId !== null) {
      ownerCounts.set(ownerId, (ownerCounts.get(ownerId) ?? 0) + 1);
    }

    return {
      ...candidate,
      ownerId,
      scopeId: candidate.scopeId?.trim() ?? null,
    };
  });

  const issues: OwnerCandidateValidationIssue[] = [];
  for (const candidate of normalizedCandidates) {
    if (candidate.ownerId === null) {
      issues.push({
      status: 'missing-owner',
      ownerId: null,
      targetPath: candidate.targetPath,
      });
      continue;
    }

    if ((ownerCounts.get(candidate.ownerId) ?? 0) > 1) {
      issues.push({
        status: 'duplicate-owner',
        ownerId: candidate.ownerId,
        targetPath: candidate.targetPath,
      });
    }

    if (candidate.scopeId !== null && candidate.scopeId.length === 0) {
      issues.push({
        status: 'scope-mismatch',
        ownerId: candidate.ownerId,
        targetPath: candidate.targetPath,
      });
    }
  }

  return {
    mode: COMPLETE_TOC_RESERVATION_MODE,
    issues,
    accepted: normalizedCandidates.map((candidate) => ({
      accepted:
        candidate.ownerId !== null &&
        (ownerCounts.get(candidate.ownerId) ?? 0) === 1 &&
        issues.every((issue) => issue.targetPath !== candidate.targetPath),
      mode: COMPLETE_TOC_RESERVATION_MODE,
      ownerId: candidate.ownerId,
    })),
  };
};
