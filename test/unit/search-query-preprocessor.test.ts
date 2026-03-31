import { expect } from '@open-wc/testing';

import {
  normalizeSearchQuery,
  prepareSearchQuery,
} from '../../shared/search/query-preprocessor.js';
import { tokenizeSearchText } from '../../shared/search/tokenize-text.js';

describe('search-query-preprocessor', () => {
  it('検索文字列を正規化すること', () => {
    expect(normalizeSearchQuery('  Rouault   Search  ')).to.equal('rouault search');
    expect(normalizeSearchQuery('ＡＢＣ　１２３')).to.equal('abc 123');
  });

  it('任意文字列を token 化して policy id を返すこと', () => {
    const tokenized = tokenizeSearchText('ジャズ理論の基礎', () => ({
      segment() {
        return [
          { segment: 'ジャズ', isWordLike: true },
          { segment: '理論', isWordLike: true },
          { segment: 'の', isWordLike: true },
          { segment: '基礎', isWordLike: true },
        ];
      },
    }));

    expect(tokenized).to.deep.equal({
      normalizedText: 'ジャズ理論の基礎',
      segmentedText: 'ジャズ 理論 の 基礎',
      tokens: ['ジャズ', '理論', 'の', '基礎'],
      tokenizerPolicyId: 'ja-word-v1',
    });
  });

  it('PreparedSearchQuery を仕様形で返すこと', () => {
    const prepared = prepareSearchQuery('Rouault Search');

    expect(prepared).to.deep.equal({
      inputQuery: 'Rouault Search',
      normalizedQuery: 'rouault search',
      segmentedQuery: 'rouault search',
      tokens: ['rouault', 'search'],
      tokenizerPolicyId: 'generic-whitespace-v1',
    });
  });

  it('Intl.Segmenter が使えない時は whitespace policy にフォールバックすること', () => {
    const prepared = prepareSearchQuery('  空白  なし  ', () => null);

    expect(prepared).to.deep.equal({
      inputQuery: '  空白  なし  ',
      normalizedQuery: '空白 なし',
      segmentedQuery: '空白 なし',
      tokens: ['空白', 'なし'],
      tokenizerPolicyId: 'generic-whitespace-v1',
    });
  });
});
