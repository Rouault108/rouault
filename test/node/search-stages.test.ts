import { describe, expect, it } from 'vitest';

import { runCandidateMergeStage } from '../../src/search/core/stages/candidate-merge.js';
import { runCandidateValidationStage } from '../../src/search/core/stages/candidate-validation.js';
import {
  buildEmptySearchResponse,
  runCountsAndDiagnosticsStage,
} from '../../src/search/core/stages/counts-and-diagnostics.js';
import { runQueryPreparationStage } from '../../src/search/core/stages/query-preparation.js';
import { runRankingAndSortingStage } from '../../src/search/core/stages/ranking-and-sorting.js';
import { runSourceFederationStage } from '../../src/search/core/stages/source-federation.js';
import {
  createSearchCanonicalPathname,
  type SearchCanonicalPathname,
} from '../../shared/search/document-url.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import type { SearchCandidate, SearchSourceBatch } from '../../shared/search/search-types.js';
import type { SearchSortMode, SearchTagMode } from '../../shared/search/search-types.js';
import type { SearchStageEventAudit } from '../../src/search/core/stage-types.js';

function canonicalPathname(pathname: string): SearchCanonicalPathname {
  const result = createSearchCanonicalPathname({ pathname });
  if (!result.ok) {
    throw new Error(`invalid canonical pathname in test fixture: ${pathname}`);
  }
  return result.canonicalPathname;
}

function createCandidate(
  overrides: Partial<SearchCandidate> & Pick<SearchCandidate, 'canonicalPathname' | 'title'>,
): SearchCandidate {
  return {
    canonicalPathname: overrides.canonicalPathname,
    pathLabel: overrides.pathLabel ?? 'notes / sample',
    title: overrides.title,
    description: overrides.description ?? '',
    date: overrides.date ?? { epochMs: Date.parse('2026-03-01'), original: '2026-03-01' },
    tags: overrides.tags ?? [],
    snippet: overrides.snippet ?? null,
    matchedSources: overrides.matchedSources ?? ['catalog'],
    matchedFields: overrides.matchedFields ?? [],
    matchedTokens: overrides.matchedTokens ?? [],
    featureScores: overrides.featureScores ?? {
      titleExactScore: 0,
      titlePrefixScore: 0,
      titleTokenCoverageScore: 0,
      bodyScore: 0,
      pathScore: 0,
      keywordScore: 0,
      freshnessScore: 0,
      sourceReliabilityScore: 0.6,
      matchEvidenceScore: 0,
    },
    fieldTokens: overrides.fieldTokens ?? {
      titleTokens: [],
      bodyTokens: [],
      pathTokens: [],
      keywordTokens: [],
    },
  };
}

describe('search-stages', () => {
  it('stage event audit can record search dialog event contracts', () => {
    const audit = {
      events: [
        {
          eventName: 'rouault-search:return-to-reading',
        },
      ],
    } satisfies SearchStageEventAudit;

    expect(audit.events[0]?.eventName).to.equal('rouault-search:return-to-reading');
  });

  it('query-preparation stage は request を正規化すること', () => {
    const output = runQueryPreparationStage({
      request: {
        mode: 'explore',
        q: '  Rouault   Search  ',
        tags: ['music', 'music', ' jazz '],
        tagMode: 'invalid' as unknown as SearchTagMode,
        sort: 'invalid' as unknown as SearchSortMode,
      },
      nowUtcMs: 123,
    });

    expect(output.request).to.deep.equal({
      mode: 'explore',
      q: 'rouault search',
      tags: ['jazz', 'music'],
      tagMode: 'or',
      sort: 'relevance',
    });
    expect(output.preparedQuery.tokens).to.deep.equal(['rouault', 'search']);
  });

  it('source-federation stage は source batch を統合すること', async () => {
    const prepared = runQueryPreparationStage({
      request: {
        mode: 'explore',
        q: 'router',
        tags: [],
        tagMode: 'or',
        sort: 'relevance',
      },
      nowUtcMs: 123,
    });

    const result = await runSourceFederationStage({
      ...prepared,
      loadPagefind: () =>
        Promise.resolve({
          filters: () => Promise.resolve({}),
          search: () =>
            Promise.resolve({
              results: [],
              unfilteredResultCount: 0,
              totalFilters: { genre: {} },
            }),
        }),
      loadSearchCatalog: () => Promise.resolve([]),
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
    });

    expect(result.batches.map((batch) => batch.source)).to.deep.equal(['pagefind', 'catalog']);
  });

  it('candidate-validation stage は source 横断の URL 不変条件だけを担うこと', () => {
    const prepared = runQueryPreparationStage({
      request: {
        mode: 'explore',
        q: 'router',
        tags: [],
        tagMode: 'or',
        sort: 'relevance',
      },
      nowUtcMs: 123,
    });
    const batches: SearchSourceBatch[] = [
      {
        source: 'catalog',
        status: 'active',
        capabilities: {
          providesBodyEvidence: false,
          providesCountMap: false,
          supportsTagPrefilter: false,
          supportsNativeAndSemantics: false,
          supportsNativeDateDescSort: false,
        },
        candidates: [
          createCandidate({
            canonicalPathname: '/search/' as SearchCanonicalPathname,
            title: 'Router',
          }),
        ],
      },
    ];

    const validated = runCandidateValidationStage({
      ...prepared,
      batches,
    });

    expect(validated.batches[0]?.status).to.equal('active');
    expect(validated.batches[0]?.candidates).to.deep.equal([]);
    expect(validated.diagnostics.issues[0]?.stage).to.equal('validate');
  });

  it('candidate-merge stage は canonical 単位で source を統合すること', () => {
    const prepared = runQueryPreparationStage({
      request: {
        mode: 'explore',
        q: 'router',
        tags: [],
        tagMode: 'or',
        sort: 'relevance',
      },
      nowUtcMs: Date.parse('2026-03-10'),
    });
    const validated = runCandidateValidationStage({
      ...prepared,
      batches: [
        {
          source: 'pagefind',
          status: 'active',
          capabilities: {
            providesBodyEvidence: true,
            providesCountMap: true,
            supportsTagPrefilter: true,
            supportsNativeAndSemantics: false,
            supportsNativeDateDescSort: false,
          },
          candidates: [
            createCandidate({
              canonicalPathname: canonicalPathname('/notes/router/'),
              title: 'Router 設計メモ',
              matchedSources: ['pagefind'],
              description: 'Pagefind description',
            }),
          ],
        },
        {
          source: 'catalog',
          status: 'active',
          capabilities: {
            providesBodyEvidence: false,
            providesCountMap: false,
            supportsTagPrefilter: false,
            supportsNativeAndSemantics: false,
            supportsNativeDateDescSort: false,
          },
          candidates: [
            createCandidate({
              canonicalPathname: canonicalPathname('/notes/router/'),
              title: 'Router 設計メモ',
              matchedSources: ['catalog'],
              description: 'Catalog description',
              tags: ['architecture'],
            }),
          ],
        },
      ],
    });

    const merged = runCandidateMergeStage(validated);

    expect(merged.mergedCandidates).to.have.length(1);
    expect(merged.mergedCandidates[0]?.matchedSources).to.deep.equal(['pagefind', 'catalog']);
    expect(merged.mergedCandidates[0]?.description).to.equal('Pagefind description');
  });

  it('ranking-and-sorting stage は relevance 順を決定すること', () => {
    const prepared = runQueryPreparationStage({
      request: {
        mode: 'explore',
        q: 'router',
        tags: [],
        tagMode: 'or',
        sort: 'relevance',
      },
      nowUtcMs: Date.parse('2026-03-10'),
    });
    const ranked = runRankingAndSortingStage({
      ...prepared,
      batches: [],
      activeBatches: [],
      mergedCandidates: [
        createCandidate({
          canonicalPathname: canonicalPathname('/notes/router/'),
          title: 'Router 設計メモ',
          fieldTokens: {
            titleTokens: ['router', '設計', 'メモ'],
            bodyTokens: [],
            pathTokens: ['notes', 'router'],
            keywordTokens: ['architecture'],
          },
        }),
        createCandidate({
          canonicalPathname: canonicalPathname('/notes/rendering/'),
          title: '描画最適化',
          fieldTokens: {
            titleTokens: ['描画', '最適化'],
            bodyTokens: [],
            pathTokens: ['notes', 'rendering'],
            keywordTokens: ['lit'],
          },
        }),
      ],
    });

    expect(ranked.sortedCandidates.map((candidate) => candidate.canonicalPathname)).to.deep.equal([
      '/notes/router/',
    ]);
  });

  it('counts-and-diagnostics stage は explore count map を返すこと', () => {
    const prepared = runQueryPreparationStage({
      request: {
        mode: 'explore',
        q: 'router',
        tags: ['architecture'],
        tagMode: 'or',
        sort: 'relevance',
      },
      nowUtcMs: Date.parse('2026-03-10'),
    });
    const candidate = createCandidate({
      canonicalPathname: canonicalPathname('/notes/router/'),
      title: 'Router 設計メモ',
      tags: ['architecture', 'router'],
      matchedSources: ['catalog'],
      fieldTokens: {
        titleTokens: ['router', '設計', 'メモ'],
        bodyTokens: [],
        pathTokens: ['notes', 'router'],
        keywordTokens: ['architecture'],
      },
    });

    const result = runCountsAndDiagnosticsStage(
      {
        ...prepared,
        batches: [],
        activeBatches: [],
        mergedCandidates: [candidate],
        queryMatchedCandidates: [candidate],
        filteredCandidates: [candidate],
        sortedCandidates: [candidate],
      },
      { siteUrlContext: DEFAULT_SITE_URL_CONTEXT },
    );

    expect(result.response.mode).to.equal('explore');
    if (result.response.mode !== 'explore') {
      throw new Error('mode is not explore');
    }
    expect(result.response.tagCounts).to.deep.equal({
      architecture: 1,
      router: 1,
    });
    expect(buildEmptySearchResponse(prepared.request, result.diagnosticsResult).mode).to.equal(
      'explore',
    );
  });
});
