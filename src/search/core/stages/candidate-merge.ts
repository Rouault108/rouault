import type {
  SearchCandidate,
  SearchSourceBatch,
} from '../../../../shared/search/search-types.js';
import type { CandidateMergeStageOutput, CandidateValidationStageOutput } from '../stage-types.js';

function mergeFieldTokens(
  left: SearchCandidate,
  right: SearchCandidate,
): SearchCandidate['fieldTokens'] {
  return {
    titleTokens: [...new Set([...left.fieldTokens.titleTokens, ...right.fieldTokens.titleTokens])],
    bodyTokens: [...new Set([...left.fieldTokens.bodyTokens, ...right.fieldTokens.bodyTokens])],
    pathTokens: [...new Set([...left.fieldTokens.pathTokens, ...right.fieldTokens.pathTokens])],
    keywordTokens: [
      ...new Set([...left.fieldTokens.keywordTokens, ...right.fieldTokens.keywordTokens]),
    ],
  };
}

function snippetMatchCount(candidate: SearchCandidate): number {
  return candidate.snippet?.segments.filter((segment) => segment.matched).length ?? 0;
}

function mergeCandidates(
  batches: readonly SearchSourceBatch[],
  _diagnostics: CandidateValidationStageOutput['diagnostics'],
): SearchCandidate[] {
  const merged = new Map<string, SearchCandidate>();

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
        existing.matchedSources.includes('pagefind') &&
        !candidate.matchedSources.includes('pagefind')
          ? existing.description
          : candidate.matchedSources.includes('pagefind') &&
              !existing.matchedSources.includes('pagefind')
            ? candidate.description
            : existing.description.length >= candidate.description.length
              ? existing.description
              : candidate.description;
      const preferredSnippet =
        existing.matchedSources.includes('pagefind') &&
        !candidate.matchedSources.includes('pagefind')
          ? existing.snippet
          : candidate.matchedSources.includes('pagefind') &&
              !existing.matchedSources.includes('pagefind')
            ? candidate.snippet
            : snippetMatchCount(existing) >= snippetMatchCount(candidate)
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
        matchedSources: [...new Set([...existing.matchedSources, ...candidate.matchedSources])],
        fieldTokens: mergeFieldTokens(existing, candidate),
        featureScores: {
          ...existing.featureScores,
          sourceReliabilityScore: Math.max(
            existing.featureScores.sourceReliabilityScore,
            candidate.featureScores.sourceReliabilityScore,
          ),
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
    mergedCandidates: mergeCandidates(input.batches, input.diagnostics),
  };
}
