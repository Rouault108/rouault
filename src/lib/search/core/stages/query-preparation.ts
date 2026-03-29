import { createDiagnostics } from '../../diagnostics.js';
import { prepareSearchQuery } from '../../query-preprocessor.js';
import {
  normalizeSearchQuery,
  normalizeSearchSort,
  normalizeSearchTags,
  normalizeSearchTagMode,
} from '../../search-url.js';
import type { SearchRequest } from '../../search-types.js';
import type { QueryPreparationStageOutput } from '../stage-types.js';

export interface RunQueryPreparationStageInput {
  request: SearchRequest;
  nowUtcMs: number;
}

export function runQueryPreparationStage(
  input: RunQueryPreparationStageInput,
): QueryPreparationStageOutput {
  const request: SearchRequest = {
    mode: input.request.mode,
    q: normalizeSearchQuery(input.request.q),
    tags: normalizeSearchTags(input.request.tags),
    tagMode: normalizeSearchTagMode(input.request.tagMode),
    sort: normalizeSearchSort(input.request.sort),
  };

  return {
    request,
    preparedQuery: prepareSearchQuery(request.q),
    diagnostics: createDiagnostics(),
    nowUtcMs: input.nowUtcMs,
  };
}
