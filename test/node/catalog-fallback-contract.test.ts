import { describe, expect, it } from 'vitest';
import { createCatalogFallback } from '../../src/search/lexical/catalog-fallback.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';
import { buildStaticExploreResponse } from '../../build/search/build-static-explore-response.js';
import type { SearchRequest } from '../../shared/search/search-types.js';

const context = { siteOrigin: 'https://example.com', basePath: '/nested' };
function path(value: string) {
  const result = createSearchCanonicalPathname({ pathname: value });
  if (!result.ok) throw new Error('Invalid test path');
  return result.canonicalPathname;
}
const items = [
  {
    canonicalPathname: path('/notes/first'),
    title: 'Shared first',
    description: 'Metadata marker',
    tags: ['A'],
    body: 'bodyonlysecret',
  },
  { canonicalPathname: path('/notes/second'), title: 'Shared second', tags: ['B'] },
  { canonicalPathname: path('/notes/third'), title: 'Other', tags: ['C'] },
];
const request: SearchRequest = {
  mode: 'explore',
  q: 'Shared',
  tags: ['A'],
  tagMode: 'and',
  sort: 'relevance',
};

describe('Catalog単独fallbackのmetadata / 集計境界', () => {
  it('query前の静的projectionとruntime Q/F集合を分離する', async () => {
    const fallback = createCatalogFallback(
      context,
      () => true,
      async () => items,
    );
    const response = await fallback(request, new AbortController().signal);
    if (response.mode !== 'explore') throw new Error('Expected explore');
    expect(response.total).toBe(1);
    expect(response.allTagCounts).toEqual({ A: 1, B: 1 });
    expect(response.tagCounts).toEqual({ A: 1 });
    expect(response.diagnostics.activeSources).toEqual(['catalog']);
    const notes = items.map((item) => ({ ...item, permalink: item.canonicalPathname }));
    const projection = buildStaticExploreResponse({ state: request, notes });
    expect(projection.total).toBe(3);
    expect(projection.allTagCounts).toEqual({ A: 1, B: 1, C: 1 });
    expect(projection.tagCounts).toEqual(projection.allTagCounts);
    expect(
      projection.items
        .flatMap((item) => item.reasons)
        .some((reason) => reason.kind === 'catalog-fallback'),
    ).toBe(false);
  });

  it('descriptionは照合するがCatalog外のbodyを取り込まない', async () => {
    const fallback = createCatalogFallback(
      context,
      () => true,
      async () => items,
    );
    const metadata = await fallback(
      { ...request, tags: [], q: 'marker' },
      new AbortController().signal,
    );
    expect(metadata.items.map((item) => item.canonicalPathname)).toEqual([path('/notes/first')]);
    expect(metadata.items[0]?.reasons).toContainEqual({
      kind: 'catalog-fallback',
      source: 'catalog',
    });
    const body = await fallback(
      { ...request, tags: [], q: 'bodyonlysecret' },
      new AbortController().signal,
    );
    expect(body.total).toBe(0);
    expect(body.diagnostics).toEqual({
      degraded: false,
      activeSources: ['catalog'],
      failures: [],
      issues: [],
    });
  });
});
