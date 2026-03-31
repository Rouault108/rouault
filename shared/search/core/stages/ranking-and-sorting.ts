import {
  computeMatchedFields,
  computeMatchedTokens,
  extractFeatureScores,
} from '../../../../src/search/ranking/scoring.js';
import { stableSortCandidates } from '../../../../src/search/ranking/stable-sort.js';
import type { SearchCandidate } from '../../search-types.js';
import type { CandidateMergeStageOutput, RankingAndSortingStageOutput } from '../stage-types.js';

function hasAllTags(itemTags: readonly string[], tags: readonly string[]): boolean {
  return tags.every((tag) => itemTags.includes(tag));
}

function hasAnyTags(itemTags: readonly string[], tags: readonly string[]): boolean {
  return tags.some((tag) => itemTags.includes(tag));
}

function applyTagFilter(
  items: readonly SearchCandidate[],
  tags: readonly string[],
  tagMode: CandidateMergeStageOutput['request']['tagMode'],
): SearchCandidate[] {
  if (tags.length === 0) {
    return [...items];
  }

  return items.filter((item) =>
    tagMode === 'and' ? hasAllTags(item.tags, tags) : hasAnyTags(item.tags, tags),
  );
}

function isQueryMatch(candidate: SearchCandidate, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }

  return candidate.featureScores.matchEvidenceScore > 0;
}

export function runRankingAndSortingStage(
  input: CandidateMergeStageOutput,
): RankingAndSortingStageOutput {
  const mergedCandidates = input.mergedCandidates.map((candidate) => {
    const featureScores = extractFeatureScores(
      candidate,
      input.preparedQuery.tokens,
      input.preparedQuery.normalizedQuery,
      input.nowUtcMs,
    );

    return {
      ...candidate,
      featureScores,
      matchedTokens: computeMatchedTokens(candidate, input.preparedQuery.tokens),
      matchedFields: computeMatchedFields(
        candidate,
        input.preparedQuery.tokens,
        input.request.tags,
      ),
    };
  });

  const queryMatchedCandidates = mergedCandidates.filter((candidate) =>
    isQueryMatch(candidate, input.preparedQuery.normalizedQuery),
  );
  const filteredCandidates = applyTagFilter(
    queryMatchedCandidates,
    input.request.tags,
    input.request.tagMode,
  );

  return {
    ...input,
    mergedCandidates,
    queryMatchedCandidates,
    filteredCandidates,
    sortedCandidates: stableSortCandidates(filteredCandidates, input.request.mode, input.request.sort),
  };
}
