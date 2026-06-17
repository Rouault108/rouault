import { describe, expect, it } from 'vitest';

import {
  loadSearchCatalog,
  resetSearchCatalogCache,
  type SearchCatalogItem,
} from '../../shared/search/search-catalog.js';
import { createSearchArtifactUrlResolver } from '../../shared/search/search-artifact-url.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import type { SearchCatalogFetcher } from '../../shared/search/search-loaders.js';

const artifactUrlResolver = createSearchArtifactUrlResolver({
  siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
});
const isInternalDocumentPathname = (pathname: string): boolean => pathname.startsWith('/notes/');

const makeResponse = (payload: unknown, init: ResponseInit = { status: 200 }): Response =>
  new Response(JSON.stringify(payload), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });

const loadWithFetcher = (fetcher: SearchCatalogFetcher): Promise<readonly SearchCatalogItem[]> =>
  loadSearchCatalog({
    runtimeEnvironment: 'test',
    artifactUrlResolver,
    siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
    isInternalDocumentPathname,
    testOnlyFetcher: fetcher,
  });

describe('search-catalog', () => {
  it('検索カタログ JSON を canonicalPathname として正規化して読み込むこと', async () => {
    const items = await loadWithFetcher(async () =>
      makeResponse([
        {
          title: ' ソートアルゴリズム比較 ',
          canonicalPathname: '/notes/computer-science/algorithms/sorting/',
          description: ' 比較メモ ',
          date: ' 2026-02-10 ',
          keywords: [' algorithms ', ' 比較 ', '', 123],
          tags: [' computer-science ', 'algorithms'],
        },
        {
          title: '',
          canonicalPathname: '/external-resource/',
        },
      ]),
    );

    expect(items).to.deep.equal([
      {
        title: 'ソートアルゴリズム比較',
        canonicalPathname: '/notes/computer-science/algorithms/sorting/',
        description: '比較メモ',
        date: '2026-02-10',
        keywords: ['algorithms', '比較'],
        tags: ['computer-science', 'algorithms'],
      },
    ]);
  });

  it('SearchArtifactUrlResolver の catalog URL だけを fetch すること', async () => {
    let requestedUrl = '';
    await loadWithFetcher(async (url) => {
      requestedUrl = url;
      return makeResponse([]);
    });

    expect(requestedUrl).to.equal('/search-catalog.json');
  });

  it('redirect / wrong MIME を catalog-fetch-failed として拒否すること', async () => {
    await expect(
      loadWithFetcher(
        async () =>
          new Response('[]', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          }),
      ),
    ).rejects.toMatchObject({ code: 'catalog-fetch-failed' });
  });

  it('resetSearchCatalogCache は module-level cache を持たない no-op として成立すること', () => {
    expect(() => resetSearchCatalogCache()).not.toThrow();
  });
});
