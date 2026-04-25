import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildPagefindDocumentData } from '../../build/search/build-pagefind-document-data.js';
import {
  buildStaticExploreResponse,
  buildStaticSearchState,
} from '../../build/search/build-static-explore-response.js';
import { buildSearchCatalog } from '../../build/search/build-search-catalog.js';
import { emitSearchArtifacts } from '../../build/search/emit-search-artifacts.js';

describe('search build helpers', () => {
  it('Pagefind 補助索引用データを構築すること', () => {
    expect(
      buildPagefindDocumentData({
        title: 'ジャズ理論の基礎',
        description: '即興と和声のメモ',
        updated: '2026-02-10',
        tags: ['music', 'jazz'],
      }),
    ).toEqual({
      title: 'ジャズ理論の基礎',
      tokenizedTitle: 'ジャズ 理論 の 基礎',
      description: '即興と和声のメモ',
      tokenizedDescription: '即興 と 和声 の メモ',
      date: '2026-02-10',
      sortDate: '2026-02-10',
      tags: ['music', 'jazz'],
    });
  });

  it('静的 explore response を shared helper で構築すること', () => {
    const state = buildStaticSearchState({
      tags: ['music'],
    });
    const response = buildStaticExploreResponse({
      state,
      notes: [
        {
          title: '交響曲メモ',
          permalink: '/notes/music/symphony/',
          description: '主題展開の整理',
          date: '2026-03-10',
          tags: ['music', 'analysis'],
        },
      ],
      activeSources: ['catalog'],
    });

    expect(state).toEqual({
      q: '',
      tags: ['music'],
      tagMode: 'or',
      sort: 'relevance',
    });
    expect(response.items[0]).toMatchObject({
      canonicalUrl: '/notes/music/symphony/',
      pathLabel: 'notes / music / symphony',
      title: '交響曲メモ',
      reasons: [{ kind: 'tag-filter-match', tokens: ['music'] }],
    });
  });

  it('search-catalog.json artifact を静的出力すること', async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'rouault-search-artifacts-'));

    try {
      const result = await emitSearchArtifacts({
        notes: [
          {
            title: '公開ノート',
            permalink: '/notes/public/',
            slug: 'public',
            description: '説明',
          },
        ],
        outputDir,
      });

      expect(path.basename(result.searchCatalogPath)).toBe('search-catalog.json');
      expect(await readFile(result.searchCatalogPath, 'utf8')).toBe(
        '[{"title":"公開ノート","url":"/notes/public/","path":"/notes/public/","description":"説明","date":"","keywords":["public","公開","ノート","説明"],"tags":[]}]',
      );
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it('excludeFromPublicationSurfaces=true の reader fixture を search catalog に出さないこと', () => {
    expect(
      buildSearchCatalog([
        {
          title: 'Fixture Reader',
          slug: 'e2e/fixture-reader',
          permalink: '/notes/e2e/fixture-reader/',
          description: 'Fixture reader note',
          date: '2026-04-25',
          kind: 'reader',
          chromeProfile: 'plain',
          sourceRoot: 'test/fixtures/content',
          excludeFromPublicationSurfaces: true,
        },
      ]),
    ).toEqual([]);
  });
});
