import { describe, expect, it, vi } from 'vitest';
import { LexicalClient } from '../../src/search/lexical/client.js';
import { createLexicalSearchCore } from '../../src/search/lexical/search-core.js';
import { createCatalogFallback } from '../../src/search/lexical/catalog-fallback.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';
import { lexicalResponse } from '../../src/search/lexical/response.js';
import type { SearchRequest } from '../../shared/search/search-types.js';

const query: SearchRequest = {
  q: 'boxing コピー',
  mode: 'explore',
  tags: [],
  tagMode: 'and',
  sort: 'relevance',
};
const context = (scenario: string) => ({
  siteOrigin: location.origin,
  basePath: `/__search-target/${scenario}`,
});
const signal = () => new AbortController().signal;

describe('actual Worker failure/recovery', () => {
  for (const fault of [
    'lexical-load-failed',
    'lexical-analyzer-unavailable',
    'lexical-search-failed',
    'lexical-timeout',
    'crash',
    'identity',
    'malformed',
  ]) {
    it(`transport ${fault}: rejects and terminates the generation`, async () => {
      const client = new LexicalClient(context('healthy'), () => {
        const url = new URL('./helpers/lexical-fault-worker.ts', import.meta.url);
        url.searchParams.set('fault', fault);
        return new Worker(url, { type: 'module' });
      });
      try {
        const expected = fault.startsWith('lexical-') ? fault : 'lexical-worker-failed';
        await expect(client.search(query, signal())).rejects.toMatchObject({ kind: expected });
        expect(client.state.ready).toBe(false);
        expect(client.state.pending).toBe(0);
      } finally {
        client.dispose();
      }
    });
  }
  it('main deadline terminates an actual Worker blocked in synchronous CPU', async () => {
    const client = new LexicalClient(context('healthy'), () => {
      const url = new URL('./helpers/lexical-fault-worker.ts', import.meta.url);
      url.searchParams.set('fault', 'cpu');
      return new Worker(url, { type: 'module' });
    });
    try {
      await client.search({ ...query, q: 'warm' }, signal());
      vi.useFakeTimers();
      const pending = client.search(query, signal());
      const failed = expect(pending).rejects.toMatchObject({ kind: 'lexical-timeout' });
      await vi.advanceTimersByTimeAsync(30000);
      await failed;
      expect(client.state.ready).toBe(false);
      expect(client.state.pending).toBe(0);
    } finally {
      vi.useRealTimers();
      client.dispose();
    }
  });
  for (const scenario of ['store404', 'storehash', 'storeonce', 'storetimeout']) {
    it(`${scenario}: keeps ranking/counts and degrades only displayed snippets`, async () => {
      const client = new LexicalClient(context(scenario));
      try {
        const first = await client.search(query, signal());
        const response = lexicalResponse(query, first, context(scenario), () => true);
        expect(first.candidates.some((candidate) => candidate.degraded)).toBe(true);
        expect(
          first.candidates
            .filter((candidate) => candidate.degraded)
            .every(
              (candidate) =>
                candidate.source !== 'passage' &&
                !candidate.bodyMatch &&
                candidate.evidence.snippetPassageId === null,
            ),
        ).toBe(true);
        expect(response.diagnostics.failures).toEqual([]);
        expect(response.diagnostics.activeSources).toEqual(['lexical']);
        const next = await client.search(query, signal());
        expect(
          next.candidates.map((candidate) => [
            candidate.id,
            candidate.evidence.fusionScore,
            candidate.evidence.rankingBestPassageId,
          ]),
        ).toEqual(
          first.candidates.map((candidate) => [
            candidate.id,
            candidate.evidence.fusionScore,
            candidate.evidence.rankingBestPassageId,
          ]),
        );
        if (scenario === 'storeonce' || scenario === 'storetimeout')
          expect(next.candidates.some((candidate) => candidate.degraded)).toBe(false);
        expect(client.state.attempts).toBe(1);
      } finally {
        client.dispose();
      }
    }, 90000);
  }
  it('navigate never fetches passage index/store; normal zero and empty tags do not use fallback', async () => {
    const client = new LexicalClient(context('navigate'));
    let catalogCalls = 0;
    const core = createLexicalSearchCore({
      context: context('navigate'),
      isInternalDocumentPathname: () => true,
      client,
      catalog: async () => {
        catalogCalls++;
        throw new Error('Unexpected fallback');
      },
    });
    try {
      await core.search({ ...query, mode: 'navigate', q: 'global.json' });
      const fetched: unknown = await (await fetch('/__search-target/navigate/requests')).json();
      expect(
        Array.isArray(fetched) &&
          fetched.some(
            (path) =>
              typeof path === 'string' &&
              (path.startsWith('search/store.') || path.startsWith('search/passage.')),
          ),
      ).toBe(false);
      const zero = await core.search({ ...query, mode: 'navigate', q: 'zzzzzzzzzzzzzzzzzzzz' });
      expect(zero.total).toBe(0);
      expect(zero.diagnostics.activeSources).toEqual(['lexical']);
      const empty = await core.search({ ...query, q: '' });
      expect(empty.diagnostics.activeSources).toEqual([]);
      expect(catalogCalls).toBe(0);
    } finally {
      core.dispose();
    }
  }, 60000);
  it('failed document load terminates generations, performs one fresh retry and uses actual Catalog metadata', async () => {
    const ctx = context('index404'),
      client = new LexicalClient(ctx);
    const path = createSearchCanonicalPathname({ pathname: '/archives/fallback/' });
    if (!path.ok) throw new Error('Fixture');
    let catalogCalls = 0;
    const catalog = createCatalogFallback(
      ctx,
      () => true,
      async () => {
        catalogCalls++;
        return [
          {
            canonicalPathname: path.canonicalPathname,
            title: 'boxing コピー',
            description: 'Catalog metadata',
          },
        ];
      },
    );
    const core = createLexicalSearchCore({
      context: ctx,
      isInternalDocumentPathname: () => true,
      client,
      catalog,
    });
    try {
      for (let i = 0; i < 3; i++) {
        const response = await core.search(query);
        expect(response.diagnostics.activeSources).toEqual(['catalog']);
        expect(response.diagnostics.failures).toEqual(['lexical-load-failed']);
        expect(response.items[0]?.reasons).toContainEqual({
          kind: 'catalog-fallback',
          source: 'catalog',
        });
      }
      expect(client.state.attempts).toBe(2);
      expect(client.state.ready).toBe(false);
      expect(catalogCalls).toBe(3);
    } finally {
      core.dispose();
    }
  }, 60000);
});
