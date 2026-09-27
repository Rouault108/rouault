import type { CatalogCandidate, CatalogBatch } from '../../../../shared/search/search-types.js';
import type { CandidateMergeStageOutput, CandidateValidationStageOutput } from '../stage-types.js';

function mergeFieldTokens(
  left: CatalogCandidate,
  right: CatalogCandidate,
): CatalogCandidate['fieldTokens'] {
  return {
    titleTokens: [...new Set([...left.fieldTokens.titleTokens, ...right.fieldTokens.titleTokens])],
    descriptionTokens: [
      ...new Set([...left.fieldTokens.descriptionTokens, ...right.fieldTokens.descriptionTokens]),
    ],
    pathTokens: [...new Set([...left.fieldTokens.pathTokens, ...right.fieldTokens.pathTokens])],
    keywordTokens: [
      ...new Set([...left.fieldTokens.keywordTokens, ...right.fieldTokens.keywordTokens]),
    ],
  };
}

function snippetMatchCount(candidate: CatalogCandidate): number {
  return candidate.snippet?.segments.filter((segment) => segment.matched).length ?? 0;
}

function mergeCandidates(batches: readonly CatalogBatch[]): CatalogCandidate[] {
  const merged = new Map<string, CatalogCandidate>();

  for (const batch of batches) {
    if (batch.status !== 'active') {
      continue;
    }

    for (const candidate of batch.candidates) {
      const existing = merged.get(candidate.canonicalPathname);
      if (!existing) {
        merged.set(candidate.canonicalPathname, candidate);
        continue;
      }

      const preferredDescription =
        existing.description.length >= candidate.description.length
          ? existing.description
          : candidate.description;
      const preferredSnippet =
        snippetMatchCount(existing) >= snippetMatchCount(candidate)
          ? existing.snippet
          : candidate.snippet;
      const preferredDate =
        (existing.date.epochMs ?? -1) >= (candidate.date.epochMs ?? -1)
          ? existing.date
          : candidate.date;
      const preferredTitle =
        existing.title.length > 0
          ? existing.title
          : candidate.title.length > 0
            ? candidate.title
            : existing.title;

      merged.set(candidate.canonicalPathname, {
        ...existing,
        title: preferredTitle,
        description: preferredDescription,
        date: preferredDate,
        tags: [...new Set([...existing.tags, ...candidate.tags])].sort((left, right) =>
          left.localeCompare(right, 'ja'),
        ),
        snippet: preferredSnippet,
        fieldTokens: mergeFieldTokens(existing, candidate),
        featureScores: {
          ...existing.featureScores,
          matchEvidenceScore: Math.max(
            existing.featureScores.matchEvidenceScore,
            candidate.featureScores.matchEvidenceScore,
          ),
        },
      });
    }
  }

  return [...merged.values()];
}

export function runCandidateMergeStage(
  input: CandidateValidationStageOutput,
): CandidateMergeStageOutput {
  return {
    ...input,
    mergedCandidates: mergeCandidates(input.batches),
  };
}
