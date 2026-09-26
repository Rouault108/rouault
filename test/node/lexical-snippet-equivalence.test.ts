import { expect, it } from 'vitest';
import { createBuildAnalyzer } from '../../build/search/create-build-analyzer.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';
import { OccurrenceCache, selectLexicalSnippet } from '../../src/search/lexical/snippet.js';
import {
  OccurrenceCache as ReferenceCache,
  selectLexicalSnippet as referenceSelector,
} from '../fixtures/search/snippet-reference.js';
import type { DocumentMetadata, PassageMetadata } from '../../shared/search/lexical-artifacts.js';
import type { LexicalRanking, RankedDocument } from '../../src/search/lexical/ranking.js';

it('necessary surface check preserves the adopted selector across normalization, false positives and unit/window boundaries', async () => {
  const canonical = createSearchCanonicalPathname({ pathname: '/archives/equivalence/' });
  if (!canonical.ok) throw new Error('Fixture path');
  const document: DocumentMetadata = {
    id: 'document',
    canonicalPathname: canonical.canonicalPathname,
    title: '',
    description: 'fallback',
    pathLabel: '',
    keywords: [],
    tags: [],
    date: '',
  };
  const hit: RankedDocument = {
    document,
    fusionScore: 1,
    exactTitle: false,
    titlePrefix: false,
    rankingBestPassageId: 'p0',
  };
  const passages = new Map<string, PassageMetadata>(
    ['p0', 'p1'].map((id, order) => [
      id,
      {
        id,
        documentId: document.id,
        canonicalPathname: document.canonicalPathname,
        order,
        headingPath: [],
        currentHeading: '',
        ancestorHeading: '',
        anchorId: null,
      },
    ]),
  );
  const ranking: LexicalRanking = {
    ranked: [hit],
    passageScores: new Map([
      ['p0', 1],
      ['p1', 0.5],
    ]),
    traces: [],
  };
  const analyzer = await createBuildAnalyzer();
  const cases = [
    ['alpha beta', 'alpha。beta。', 'ＡＬＰＨＡ beta。'],
    ['alpha beta', 'alpha。beta。', 'alphabet betamax。'],
    ['alpha beta', 'alpha。beta。', 'alpha\r\nbeta。'],
    ['alpha beta', 'alpha。beta。', 'alpha ' + 'x'.repeat(260) + ' beta。'],
    ['café beta', 'café。beta。', 'cafe\u0301 beta。'],
    ['カタカナ コピー', 'カタカナ。コピー。', 'ｶﾀｶﾅ コピー。'],
    ['𠮷田 髙橋', '𠮷田。髙橋。', '𠮷田と髙橋。'],
    ['foo bar', 'foo。bar。', 'foo.bar; foo_bar!'],
    ['ガ beta', 'ガ。beta。', 'ｶﾞ beta。'],
  ];
  try {
    for (const [query, first, second] of cases) {
      if (query === undefined || first === undefined || second === undefined)
        throw new Error('Fixture');
      const analysis = analyzer.analyze(query),
        store = new Map([
          ['p0', first],
          ['p1', second],
        ]);
      const options = {
        hit,
        ranking,
        mode: 'explore' as const,
        queryWords: analysis.queryWordTokens,
        queryGrams: analysis.queryGramTokens,
        passages,
        store,
        analyzer,
        identity: 'fixed',
      };
      expect(selectLexicalSnippet({ ...options, cache: new OccurrenceCache() }), query).toEqual(
        referenceSelector({ ...options, cache: new ReferenceCache() }),
      );
    }
  } finally {
    analyzer.dispose();
  }
});
