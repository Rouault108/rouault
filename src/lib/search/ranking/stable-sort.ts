import type { SearchCandidate, SearchMode, SearchSortMode } from '../search-types.js';
import { computeSearchScore } from './scoring.js';

export function stableSortCandidates(
  candidates: readonly SearchCandidate[],
  mode: SearchMode,
  sort: SearchSortMode,
): SearchCandidate[] {
  return [...candidates].sort((left, right) => {
    if (sort === 'date-desc') {
      const dateOrder = (right.date.epochMs ?? -1) - (left.date.epochMs ?? -1);
      if (dateOrder !== 0) {
        return dateOrder;
      }

      const evidenceOrder = right.featureScores.matchEvidenceScore - left.featureScores.matchEvidenceScore;
      if (evidenceOrder !== 0) {
        return evidenceOrder;
      }

      const titleOrder = left.title.localeCompare(right.title, 'ja');
      if (titleOrder !== 0) {
        return titleOrder;
      }

      return left.canonicalUrl.localeCompare(right.canonicalUrl, 'ja');
    }

    const scoreOrder =
      computeSearchScore(right.featureScores, mode) - computeSearchScore(left.featureScores, mode);
    if (scoreOrder !== 0) {
      return scoreOrder;
    }

    const evidenceOrder = right.featureScores.matchEvidenceScore - left.featureScores.matchEvidenceScore;
    if (evidenceOrder !== 0) {
      return evidenceOrder;
    }

    const sourceOrder =
      right.featureScores.sourceReliabilityScore - left.featureScores.sourceReliabilityScore;
    if (sourceOrder !== 0) {
      return sourceOrder;
    }

    const dateOrder = (right.date.epochMs ?? -1) - (left.date.epochMs ?? -1);
    if (dateOrder !== 0) {
      return dateOrder;
    }

    const titleOrder = left.title.localeCompare(right.title, 'ja');
    if (titleOrder !== 0) {
      return titleOrder;
    }

    return left.canonicalUrl.localeCompare(right.canonicalUrl, 'ja');
  });
}
