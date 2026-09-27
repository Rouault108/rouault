import { describe, expect, it, vi } from 'vitest';
import { createSearchCore } from '../../src/search/search-core.js';
import { createCatalogFallback } from '../../src/search/lexical/catalog-fallback.js';
import {
  LexicalFailure,
  type LexicalCandidate,
  type LexicalResult,
} from '../../shared/search/lexical-protocol.js';
import type { SearchRequest } from '../../shared/search/search-types.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';
import { createSearchArtifactUrlResolver } from '../../shared/search/search-artifact-url.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';

const context = { ...DEFAULT_SITE_URL_CONTEXT, basePath: '/nested' };
const request: SearchRequest = {
  mode: 'explore',
  q: '  LangVersion  ',
  tags: [],
  tagMode: 'or',
  sort: 'relevance',
};
const candidate = (id: string, tags: string[] = []): LexicalCandidate => ({
  id,
  canonicalPathname: `/notes/${id}/`,
  title: id,
  date: null,
  tags,
  description: '',
  snippet: null,
  source: 'none',
  bodyMatch: false,
  degraded: false,
  issues: [],
  evidence: {
    fusionScore: 1,
    rankingBestPassageId: null,
    snippetPassageId: null,
    exactTitle: false,
    titlePrefix: false,
  },
});
const result = (candidates: LexicalCandidate[] = []): LexicalResult => ({
  candidates,
  queryTokens: ['lang', 'version'],
  traceSha256: 'a'.repeat(64),
  metrics: {},
});
const canonical = createSearchCanonicalPathname({ pathname: '/notes/catalog/' });
if (!canonical.ok) throw new Error('Fixture');
const catalog = createCatalogFallback(
  context,
  () => true,
  async () => [
    {
      canonicalPathname: canonical.canonicalPathname,
      title: 'LangVersion',
      description: 'Catalog metadata',
      tags: ['x'],
    },
  ],
);
function setup(
  search = vi.fn(async (_request: SearchRequest, _signal: AbortSignal) => result()),
  fallback = vi.fn(catalog),
) {
  const dispose = vi.fn();
  const core = createSearchCore({
    runtimeEnvironment: 'test',
    siteUrlContext: context,
    artifactUrlResolver: createSearchArtifactUrlResolver({ siteUrlContext: context }),
    isInternalDocumentPathname: (path) => path.startsWith('/notes/'),
    testOnlyClient: { search, dispose },
    testOnlyCatalog: fallback,
  });
  return { core, search, dispose, fallback };
}

describe('production search core cutover contract', () => {
  it('passes raw camelCase to the Worker and never federates normal lexical results', async () => {
    const state = setup(vi.fn(async () => result([candidate('first'), candidate('LangVersion')])));
    const response = await state.core.search(request);
    expect(state.search.mock.calls[0]?.[0].q).toBe('LangVersion');
    expect(response.rankingProfileId).toBe('rouault-search-v3');
    expect(response.items.map((item) => item.title)).toEqual(['first', 'LangVersion']);
    expect(response.items[0]?.renderHref).toBe('/nested/notes/first/');
    expect(response.diagnostics.activeSources).toEqual(['lexical']);
    expect(state.fallback).not.toHaveBeenCalled();
    state.core.dispose?.();
    expect(state.dispose).toHaveBeenCalledOnce();
  });
  it('empty query without tags loads no source; normal zero never falls back', async () => {
    const state = setup();
    expect((await state.core.search({ ...request, q: '' })).diagnostics.activeSources).toEqual([]);
    expect(state.search).not.toHaveBeenCalled();
    expect((await state.core.search(request)).total).toBe(0);
    expect(state.fallback).not.toHaveBeenCalled();
  });
  it('keeps Q/F counts and AND/OR separate and applies limit after total', async () => {
    const data = Array.from({ length: 25 }, (_, n) =>
      candidate(`n${n}`, n === 0 ? ['x', 'y'] : ['x']),
    );
    const state = setup(vi.fn(async () => result(data)));
    const all = await state.core.search({ ...request, mode: 'navigate' });
    expect(all.total).toBe(25);
    expect(all.items).toHaveLength(20);
    const filtered = await state.core.search({ ...request, tags: ['x', 'y'], tagMode: 'and' });
    expect(filtered.total).toBe(1);
    expect(filtered.mode === 'explore' && filtered.allTagCounts).toEqual({ x: 25, y: 1 });
    expect(filtered.mode === 'explore' && filtered.tagCounts).toEqual({ x: 1, y: 1 });
    expect((await state.core.search({ ...request, tags: ['x', 'y'] })).total).toBe(25);
  });
  it('allows empty-query tag metadata and no pathname special case', async () => {
    const state = setup(vi.fn(async () => result([candidate('testing', ['x'])])));
    const response = await state.core.search({ ...request, q: '', tags: ['x'] });
    expect(response.items[0]?.canonicalPathname).toBe('/notes/testing/');
    expect(state.fallback).not.toHaveBeenCalled();
  });
  it('retains valid epoch zero and puts unknown dates last', async () => {
    const data = [
      candidate('unknown'),
      { ...candidate('zero'), date: '1970-01-01' },
      { ...candidate('new'), date: '2026-01-01' },
    ];
    const state = setup(vi.fn(async () => result(data)));
    expect(
      (await state.core.search({ ...request, sort: 'date-desc' })).items.map((item) => item.title),
    ).toEqual(['new', 'zero', 'unknown']);
  });
  it.each(['lexical-load-failed', 'lexical-search-failed', 'lexical-timeout'] as const)(
    'falls back only on %s',
    async (kind) => {
      const state = setup(
        vi.fn(async () => {
          throw new LexicalFailure(kind, 'fetch', 'Fixture');
        }),
      );
      const response = await state.core.search(request);
      expect(state.fallback).toHaveBeenCalledOnce();
      expect(response.diagnostics.activeSources).toEqual(['catalog']);
      expect(response.diagnostics.failures).toEqual([kind]);
      expect(response.items[0]?.title).toBe('LangVersion');
      expect(response.items[0]?.reasons).toContainEqual({
        kind: 'catalog-fallback',
        source: 'catalog',
      });
    },
  );
  it('reports both sources failed without pretending to return normal zero', async () => {
    const state = setup(
      vi.fn(async () => {
        throw new LexicalFailure('lexical-load-failed', 'fetch', 'Fixture');
      }),
      vi.fn(async () => {
        throw new Error('Catalog');
      }),
    );
    const response = await state.core.search(request);
    expect(response.diagnostics.failures).toEqual([
      'lexical-load-failed',
      'catalog-fetch-failed',
      'all-sources-failed',
    ]);
    expect(response.diagnostics.activeSources).toEqual([]);
  });
  it('already-aborted caller invokes neither source', async () => {
    const state = setup(),
      controller = new AbortController();
    controller.abort();
    await expect(state.core.search(request, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(state.search).not.toHaveBeenCalled();
    expect(state.fallback).not.toHaveBeenCalled();
  });
  it('caller abort during lexical failure does not become fallback diagnostics', async () => {
    const controller = new AbortController();
    const state = setup(
      vi.fn(async () => {
        controller.abort();
        throw new Error('Interrupted');
      }),
    );
    await expect(state.core.search(request, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(state.fallback).not.toHaveBeenCalled();
  });
  it('caller abort during Catalog failure cannot commit a degraded response', async () => {
    const controller = new AbortController();
    const state = setup(
      vi.fn(async () => {
        throw new LexicalFailure('lexical-load-failed', 'fetch', 'Fixture');
      }),
      vi.fn(async () => {
        controller.abort();
        throw new Error('Interrupted');
      }),
    );
    await expect(state.core.search(request, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
