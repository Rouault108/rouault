import type { ParseStaticExploreSearchResponseResult } from './search-json-artifact-parser.js';
import type { StaticExploreSearchResponse } from './search-types.js';

export type AdoptInitialStaticExploreSearchResponseFailureReason =
  | 'parse-failed'
  | 'dropped-items'
  | 'raw-total-mismatch'
  | 'normalized-total-mismatch'
  | 'legacy-total-fallback'
  | 'legacy-count-map-fallback'
  | 'normalized-invalid-item-fields';

export type AdoptInitialStaticExploreSearchResponseResult =
  | {
      readonly ok: true;
      readonly response: StaticExploreSearchResponse;
    }
  | {
      readonly ok: false;
      readonly reason: AdoptInitialStaticExploreSearchResponseFailureReason;
    };

export const adoptInitialStaticExploreSearchResponse = (
  parseResult: ParseStaticExploreSearchResponseResult,
): AdoptInitialStaticExploreSearchResponseResult => {
  if (!parseResult.ok) {
    return { ok: false, reason: 'parse-failed' };
  }

  if (parseResult.metadata.droppedItemCount !== 0) {
    return { ok: false, reason: 'dropped-items' };
  }
  if (!parseResult.metadata.rawTotalMatchedAcceptedItems) {
    return { ok: false, reason: 'raw-total-mismatch' };
  }
  if (parseResult.response.total !== parseResult.response.items.length) {
    return { ok: false, reason: 'normalized-total-mismatch' };
  }
  if (parseResult.metadata.usedLegacyTotalFallback) {
    return { ok: false, reason: 'legacy-total-fallback' };
  }
  if (parseResult.metadata.usedLegacyCountMapFallback) {
    return { ok: false, reason: 'legacy-count-map-fallback' };
  }
  if (parseResult.metadata.normalizedFromInvalidItemFields.length > 0) {
    return { ok: false, reason: 'normalized-invalid-item-fields' };
  }

  return { ok: true, response: parseResult.response };
};
