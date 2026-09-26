import { afterEach, describe, expect, it, vi } from 'vitest';
import { lexicalResponse } from '../../src/search/lexical/response.js';
import { createLexicalSearchCore } from '../../src/search/lexical/search-core.js';
import { createCatalogFallback } from '../../src/search/lexical/catalog-fallback.js';
import { resolveLexicalArtifact } from '../../src/search/lexical/artifact-loader.js';
import { OccurrenceCache, lexicalSnippet } from '../../src/search/lexical/snippet.js';
import {
  LexicalFailure,
  parseWorkerMessage,
  type LexicalCandidate,
  type LexicalResult,
} from '../../shared/search/lexical-protocol.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';
import type { SearchRequest } from '../../shared/search/search-types.js';
import { sha256 } from '../../shared/search/lexical-artifacts.js';
import profile from '../../shared/search/lexical-ranking-profile.json' with { type: 'json' };

const context = { siteOrigin: 'https://example.test', basePath: '/notes' };
const request: SearchRequest = {
  q: 'query',
  tags: [],
  tagMode: 'and',
  sort: 'relevance',
  mode: 'explore',
};
const candidate = (
  id: string,
  tags: string[] = [],
  date: string | null = null,
): LexicalCandidate => ({
  id,
  canonicalPathname: `/archives/${id}`,
  title: id,
  tags,
  date,
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
  queryTokens: ['query'],
  traceSha256: 'a'.repeat(64),
  metrics: {},
});
afterEach(() => vi.useRealTimers());

describe('Stage 2 response ownership', () => {
  it('retains the adopted exact profile digest', async () => {
    expect(await sha256(new TextEncoder().encode(JSON.stringify(profile)))).toBe(
      '3465a99ea725e96139ba685f60789995d4a040307e58a6f0631a6725d9ac4c38',
    );
  });
  it('applies AND/OR and Q/F counts without reranking lexical evidence', () => {
    const data = result([
      candidate('a', ['x', 'x']),
      candidate('b', ['x', 'y']),
      candidate('c', ['y']),
    ]);
    const and = lexicalResponse({ ...request, tags: ['x', 'y'] }, data, context, () => true);
    expect(and.items.map((item) => item.title)).toEqual(['b']);
    expect(and.mode === 'explore' && and.allTagCounts).toEqual({ x: 2, y: 2 });
    expect(and.mode === 'explore' && and.tagCounts).toEqual({ x: 1, y: 1 });
    const or = lexicalResponse(
      { ...request, tags: ['x', 'y'], tagMode: 'or' },
      data,
      context,
      () => true,
    );
    expect(or.total).toBe(3);
    expect(or.items.map((item) => item.title)).toEqual(['a', 'b', 'c']);
    expect(or.items[0]?.renderHref).toBe('/notes/archives/a/');
    expect(or.items[0]).not.toHaveProperty('evidence');
    expect(or.items[0]?.reasons).toEqual([
      { kind: 'tag-filter-match', source: 'lexical', tokens: ['x'] },
    ]);
  });
  it('keeps valid epoch zero, relevance ties, unknown dates last and limit-before-total distinction', () => {
    const data = result([
      candidate('unknown'),
      candidate('epoch', [], '1970-01-01'),
      candidate('later', [], '2026-01-01'),
      candidate('tie', [], '2026-01-01'),
    ]);
    const response = lexicalResponse({ ...request, sort: 'date-desc' }, data, context, () => true);
    expect(response.items.map((item) => item.title)).toEqual(['later', 'tie', 'epoch', 'unknown']);
    expect(response.items[2]?.date.epochMs).toBe(0);
    const limited = lexicalResponse(
      { ...request, mode: 'navigate' },
      result(Array.from({ length: 24 }, (_, i) => candidate(String(i)))),
      context,
      () => true,
    );
    expect(limited.total).toBe(24);
    expect(limited.items).toHaveLength(20);
  });
  it('counts only displayed snippet degradation and never labels description as body-match', () => {
    const affected = {
      ...candidate('a', ['x']),
      degraded: true,
      issues: ['lexical-snippet-unavailable' as const],
      description: 'query',
      source: 'description' as const,
      snippet: lexicalSnippet('query', ['query']).snippet,
    };
    const data = result([affected, candidate('b', ['y'])]);
    const shown = lexicalResponse(request, data, context, () => true);
    expect(shown.diagnostics.issues).toEqual([
      {
        code: 'lexical-snippet-unavailable',
        severity: 'warn',
        stage: 'fetch',
        source: 'lexical',
        count: 1,
      },
    ]);
    expect(shown.items[0]?.reasons).toEqual([]);
    expect(
      lexicalResponse({ ...request, tags: ['y'] }, data, context, () => true).diagnostics.degraded,
    ).toBe(false);
  });
  it('rejects protocol identity/version and inconsistent snippet offsets', () => {
    const message = {
      protocolVersion: 1,
      generation: 1,
      requestId: 1,
      identity: 'a'.repeat(64),
      type: 'result',
      payload: result(),
    };
    expect(() => parseWorkerMessage({ ...message, protocolVersion: 2 })).toThrow();
    expect(() => parseWorkerMessage({ ...message, identity: 'bad' })).toThrow();
    const validSnippet = lexicalSnippet('query', ['query']).snippet;
    if (!validSnippet) throw new Error('Fixture snippet');
    expect(() =>
      parseWorkerMessage({
        ...message,
        payload: result([{ ...candidate('a'), snippet: { ...validSnippet, endUtf16: 100 } }]),
      }),
    ).toThrow();
  });
});

describe('fallback is failure-only and abort is not failure', () => {
  it('does not call Catalog on normal zero or empty query/tags', async () => {
    const search = vi.fn(async () => result()),
      catalog = vi.fn();
    const core = createLexicalSearchCore({
      context,
      isInternalDocumentPathname: () => true,
      client: { search, dispose: vi.fn() },
      catalog,
    });
    expect((await core.search(request)).diagnostics.activeSources).toEqual(['lexical']);
    expect((await core.search({ ...request, q: '' })).diagnostics.activeSources).toEqual([]);
    expect(search).toHaveBeenCalledTimes(1);
    expect(catalog).not.toHaveBeenCalled();
    core.dispose();
  });
  it('uses the actual Catalog metadata pipeline and reports the lexical failure', async () => {
    const path = createSearchCanonicalPathname({ pathname: '/archives/fallback' });
    if (!path.ok) throw new Error('Fixture path');
    const loader = vi.fn(async () => [
      {
        canonicalPathname: path.canonicalPathname,
        title: 'query',
        description: 'metadata',
        tags: ['x'],
      },
    ]);
    const catalog = createCatalogFallback(context, () => true, loader);
    const core = createLexicalSearchCore({
      context,
      isInternalDocumentPathname: () => true,
      client: {
        search: async () => {
          throw new LexicalFailure('lexical-load-failed', 'validate', 'private detail');
        },
        dispose: vi.fn(),
      },
      catalog,
    });
    const response = await core.search(request);
    expect(response.diagnostics.activeSources).toEqual(['catalog']);
    expect(response.diagnostics.failures).toEqual(['lexical-load-failed']);
    expect(response.items[0]?.reasons).toContainEqual({
      kind: 'catalog-fallback',
      source: 'catalog',
    });
    expect(JSON.stringify(response)).not.toContain('private detail');
    core.dispose();
  });
  it('finishes hung Catalog within 15 seconds and records both-source failure', async () => {
    vi.useFakeTimers();
    const core = createLexicalSearchCore({
      context,
      isInternalDocumentPathname: () => true,
      client: {
        search: async () => {
          throw new LexicalFailure('lexical-timeout', 'fetch', 'timeout');
        },
        dispose: vi.fn(),
      },
      catalog: () =>
        new Promise(() => {
          /* deadlineまで応答しない障害fixture。 */
        }),
    });
    const pending = core.search(request);
    await vi.advanceTimersByTimeAsync(15000);
    const response = await pending;
    expect(response.diagnostics.failures).toEqual([
      'lexical-timeout',
      'catalog-fetch-failed',
      'all-sources-failed',
    ]);
    expect(response.diagnostics.activeSources).toEqual([]);
    core.dispose();
  });
  it('drops stale and caller-aborted results without starting Catalog', async () => {
    const catalog = vi.fn(),
      releases: ((result: LexicalResult) => void)[] = [];
    const core = createLexicalSearchCore({
      context,
      isInternalDocumentPathname: () => true,
      client: { search: () => new Promise((resolve) => releases.push(resolve)), dispose: vi.fn() },
      catalog,
    });
    const old = core.search(request);
    const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' });
    const next = core.search({ ...request, q: 'new' });
    releases[0]?.(result([candidate('old')]));
    releases[1]?.(result([candidate('new')]));
    await rejected;
    expect((await next).items[0]?.title).toBe('new');
    expect(catalog).not.toHaveBeenCalled();
    core.dispose();
  });
});

describe('bounded occurrence cache and safe artifact resolution', () => {
  it('evicts LRU entries, bypasses oversize and invalidates text/identity without changing values', () => {
    const value = [{ surface: 'a', startUtf16: 0, endUtf16: 1 }],
      compute = vi.fn(() => value);
    const cache = new OccurrenceCache(1000, 2);
    cache.get('one', 'a', 'a', compute);
    cache.get('one', 'b', 'b', compute);
    cache.get('one', 'a', 'a', compute);
    cache.get('one', 'c', 'c', compute);
    expect(compute).toHaveBeenCalledTimes(3);
    expect(cache.stats.evictions).toBe(1);
    cache.get('one', 'b', 'b', compute);
    cache.get('two', 'b', 'b', compute);
    cache.get('two', 'b', 'changed', compute);
    expect(compute).toHaveBeenCalledTimes(6);
    const tiny = new OccurrenceCache(1, 128);
    expect(tiny.get('one', 'a', 'a', compute)).toEqual(value);
    expect(tiny.stats.entries).toBe(0);
    const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
    const byteBounded = new OccurrenceCache(bytes, 128);
    byteBounded.get('one', 'a', 'a', compute);
    byteBounded.get('one', 'b', 'b', compute);
    expect(byteBounded.stats).toEqual({ entries: 1, encodedBytes: bytes, evictions: 1 });
    cache.clear();
    expect(cache.stats.entries).toBe(0);
  });
  it('uses exactly one basePath and rejects traversal/cross-origin artifacts', () => {
    expect(resolveLexicalArtifact(context, '/search/manifest.json')).toBe(
      'https://example.test/notes/search/manifest.json',
    );
    for (const path of [
      '//evil.test/a',
      '/notes/search/manifest.json',
      '/search/../x',
      '/search/%2e%2e/x',
      '/search/a%2fb',
      '/search/a?x',
    ])
      expect(() => resolveLexicalArtifact(context, path)).toThrow();
  });
  it('keeps astral and NFKC highlights in the original 240-code-point window', () => {
    const text = '𠮷'.repeat(150) + 'ＡＢＣ' + '田'.repeat(200),
      display = lexicalSnippet(text, ['abc']).snippet;
    expect(display?.codePoints).toBe(240);
    expect(display?.segments.filter((segment) => segment.matched)).toEqual([
      { text: 'ＡＢＣ', matched: true },
    ]);
    expect(display && text.slice(display.startUtf16, display.endUtf16)).toBe(display?.text);
  });
});
