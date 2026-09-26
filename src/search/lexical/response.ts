import {
  buildSearchRenderHref,
  createSearchCanonicalPathname,
  derivePathLabel,
} from '../../../shared/search/document-url.js';
import { normalizeSearchTags } from '../../../shared/search/search-url.js';
import type { SearchRequest } from '../../../shared/search/search-types.js';
import type {
  LexicalCandidate,
  LexicalContext,
  LexicalResult,
} from '../../../shared/search/lexical-protocol.js';
import type {
  LexicalDiagnostics,
  LexicalResultItem,
  LexicalSearchResponse,
  LexicalReason,
} from '../../../shared/search/lexical-response.js';

export const emptyLexicalDiagnostics = (): LexicalDiagnostics => ({
  degraded: false,
  activeSources: [],
  failures: [],
  issues: [],
});
export function emptyLexicalResponse(
  request: SearchRequest,
  diagnostics = emptyLexicalDiagnostics(),
): LexicalSearchResponse {
  const base = { items: [], total: 0, rankingProfileId: 'rouault-search-v3' as const, diagnostics };
  return request.mode === 'explore'
    ? { ...base, mode: 'explore', tagCounts: {}, allTagCounts: {} }
    : { ...base, mode: 'navigate' };
}
function counts(candidates: readonly LexicalCandidate[]): Record<string, number> {
  const result = new Map<string, number>();
  for (const candidate of candidates)
    for (const tag of new Set(candidate.tags)) result.set(tag, (result.get(tag) ?? 0) + 1);
  return Object.fromEntries(result);
}
export function lexicalResponse(
  request: SearchRequest,
  result: LexicalResult,
  context: LexicalContext,
  isInternal: (path: string) => boolean,
): LexicalSearchResponse {
  const tags = normalizeSearchTags(request.tags),
    diagnostics = emptyLexicalDiagnostics();
  diagnostics.activeSources = ['lexical'];
  const canonical = new Map<string, ReturnType<typeof createSearchCanonicalPathname>>();
  const seen = new Set<string>();
  const querySet = result.candidates.filter((candidate) => {
    const checked = createSearchCanonicalPathname({
      pathname: candidate.canonicalPathname,
      isInternalDocumentPathname: isInternal,
    });
    canonical.set(candidate.id, checked);
    if (!checked.ok || seen.has(checked.canonicalPathname)) {
      diagnostics.issues.push({
        code: 'invalid-document-canonical-url',
        severity: 'error',
        stage: 'validate',
        source: 'lexical',
        count: 1,
      });
      return false;
    }
    seen.add(checked.canonicalPathname);
    return true;
  });
  const filtered = querySet.filter(
    (candidate) =>
      !tags.length ||
      (request.tagMode === 'or'
        ? tags.some((tag) => candidate.tags.includes(tag))
        : tags.every((tag) => candidate.tags.includes(tag))),
  );
  const ordered = filtered.map((candidate, rank) => ({ candidate, rank }));
  if (request.sort === 'date-desc')
    ordered.sort((a, b) => {
      const left = Date.parse(a.candidate.date ?? ''),
        right = Date.parse(b.candidate.date ?? '');
      const leftValid = Number.isFinite(left),
        rightValid = Number.isFinite(right);
      if (leftValid !== rightValid) return leftValid ? -1 : 1;
      return (
        (leftValid ? right - left : 0) ||
        a.rank - b.rank ||
        (a.candidate.canonicalPathname < b.candidate.canonicalPathname
          ? -1
          : a.candidate.canonicalPathname > b.candidate.canonicalPathname
            ? 1
            : 0)
      );
    });
  const displayed = request.mode === 'navigate' ? ordered.slice(0, 20) : ordered;
  const items = displayed.map(({ candidate }): LexicalResultItem => {
    const checked = canonical.get(candidate.id);
    if (!checked?.ok) throw new Error('Unvalidated canonical');
    const reasons: LexicalReason[] = [];
    if (candidate.evidence.exactTitle) reasons.push({ kind: 'title-exact', source: 'lexical' });
    else if (candidate.evidence.titlePrefix)
      reasons.push({ kind: 'title-prefix', source: 'lexical' });
    if (
      candidate.bodyMatch &&
      candidate.source === 'passage' &&
      candidate.evidence.snippetPassageId !== null
    )
      reasons.push({ kind: 'body-match', source: 'lexical' });
    const matchedTags = tags.filter((tag) => candidate.tags.includes(tag));
    if (matchedTags.length)
      reasons.push({ kind: 'tag-filter-match', source: 'lexical', tokens: matchedTags });
    const epoch = Date.parse(candidate.date ?? '');
    return {
      canonicalPathname: checked.canonicalPathname,
      renderHref: buildSearchRenderHref({
        canonicalPathname: checked.canonicalPathname,
        basePath: context.basePath,
      }),
      pathLabel: derivePathLabel(checked.canonicalPathname),
      title: candidate.title,
      description: candidate.description,
      date: { epochMs: Number.isFinite(epoch) ? epoch : null, original: candidate.date },
      tags: candidate.tags,
      snippet: candidate.snippet ? { segments: candidate.snippet.segments } : null,
      reasons,
    };
  });
  const degraded = displayed.filter(({ candidate }) => candidate.degraded).length;
  if (degraded) {
    diagnostics.degraded = true;
    diagnostics.issues.push({
      code: 'lexical-snippet-unavailable',
      severity: 'warn',
      stage: 'fetch',
      source: 'lexical',
      count: degraded,
    });
  }
  const base = {
    items,
    total: filtered.length,
    rankingProfileId: 'rouault-search-v3' as const,
    diagnostics,
  };
  return request.mode === 'explore'
    ? { ...base, mode: 'explore', tagCounts: counts(filtered), allTagCounts: counts(querySet) }
    : { ...base, mode: 'navigate' };
}
