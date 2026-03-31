import { finalizeDiagnostics } from '../../../../shared/search/diagnostics.js';
import { computeReasons } from '../../../../src/search/ranking/scoring.js';
import type {
  ExploreSearchResponse,
  NavigateSearchResponse,
  SearchCandidate,
  SearchCountMap,
  SearchDiagnostics,
  SearchRequest,
  SearchResponse,
} from '../../search-types.js';
import { DEFAULT_SEARCH_RANKING_PROFILE_ID, NAVIGATE_RESULT_LIMIT } from '../profiles.js';
import type {
  CountsAndDiagnosticsStageOutput,
  RankingAndSortingStageOutput,
} from '../stage-types.js';

function buildCountMap(items: readonly SearchCandidate[]): SearchCountMap {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  );
}

function toResultItem(
  candidate: SearchCandidate,
  queryTokens: readonly string[],
  selectedTags: readonly string[],
) {
  return {
    canonicalUrl: candidate.canonicalUrl,
    url: candidate.url,
    pathLabel: candidate.pathLabel,
    title: candidate.title,
    description: candidate.description,
    date: candidate.date,
    tags: candidate.tags,
    snippet: candidate.snippet,
    reasons: computeReasons(candidate, queryTokens, selectedTags),
  };
}

export function buildEmptySearchResponse(
  request: SearchRequest,
  diagnostics: SearchDiagnostics,
): SearchResponse {
  const base = {
    items: [],
    total: 0,
    rankingProfileId: DEFAULT_SEARCH_RANKING_PROFILE_ID,
    diagnostics,
  };

  if (request.mode === 'navigate') {
    return {
      ...base,
      mode: 'navigate',
    } satisfies NavigateSearchResponse;
  }

  return {
    ...base,
    mode: 'explore',
    tagCounts: {},
    allTagCounts: {},
  } satisfies ExploreSearchResponse;
}

export function runCountsAndDiagnosticsStage(
  input: RankingAndSortingStageOutput,
): CountsAndDiagnosticsStageOutput {
  const diagnosticsResult = finalizeDiagnostics(input.diagnostics, input.batches);
  const items = input.sortedCandidates.map((candidate) =>
    toResultItem(candidate, input.preparedQuery.tokens, input.request.tags),
  );

  const response =
    input.request.mode === 'navigate'
      ? ({
          mode: 'navigate',
          items: items.slice(0, NAVIGATE_RESULT_LIMIT),
          total: input.sortedCandidates.length,
          rankingProfileId: DEFAULT_SEARCH_RANKING_PROFILE_ID,
          diagnostics: diagnosticsResult,
        } satisfies NavigateSearchResponse)
      : ({
          mode: 'explore',
          items,
          total: input.sortedCandidates.length,
          rankingProfileId: DEFAULT_SEARCH_RANKING_PROFILE_ID,
          tagCounts: buildCountMap(input.filteredCandidates),
          allTagCounts: buildCountMap(input.queryMatchedCandidates),
          diagnostics: diagnosticsResult,
        } satisfies ExploreSearchResponse);

  return {
    ...input,
    diagnosticsResult,
    response,
  };
}
