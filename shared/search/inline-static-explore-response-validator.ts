import {
  parseStaticExploreSearchResponseJson,
  type ParseStaticExploreSearchResponseResult,
} from './search-json-artifact-parser.js';
import type { SearchJsonParseDiagnosticSink } from './search-diagnostics.js';

/**
 * bootstrap unavailable 時の inline payload 専用 validator。
 * route allowlist がないため pathname の構文検証だけに縮退する。
 */
export const validateInlineStaticExploreSearchResponse = (options: {
  readonly value: unknown;
  readonly diagnostics: SearchJsonParseDiagnosticSink;
}): ParseStaticExploreSearchResponseResult =>
  parseStaticExploreSearchResponseJson({
    value: options.value,
    diagnostics: options.diagnostics,
    isInternalDocumentPathname: () => true,
  });
