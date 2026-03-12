import { expect } from '@open-wc/testing';

import {
  prepareSearchQuery,
  tokenizeSearchText,
} from '../../src/lib/search/query-preprocessor.js';

describe('search-query-preprocessor', () => {
  it('任意文字列を token 化して索引用文字列も返すこと', () => {
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
      rawText: 'ジャズ理論の基礎',
      segmentedText: 'ジャズ 理論 の 基礎',
      tokens: ['ジャズ', '理論', 'の', '基礎'],
    });
  });

  it('Intl.Segmenter の分かち書き結果を検索クエリへ反映すること', () => {
    const prepared = prepareSearchQuery('検索仕様', () => ({
      segment() {
        return [
          { segment: '検索', isWordLike: true },
          { segment: '仕様', isWordLike: true },
        ];
      },
    }));

    expect(prepared).to.deep.equal({
      rawQuery: '検索仕様',
      segmentedQuery: '検索 仕様',
      tokens: ['検索', '仕様'],
    });
  });

  it('token 化 fallback 時は空白ベースで処理すること', () => {
    const tokenized = tokenizeSearchText('  空白  なし  ', () => null);

    expect(tokenized).to.deep.equal({
      rawText: '空白 なし',
      segmentedText: '空白 なし',
      tokens: ['空白', 'なし'],
    });
  });

  it('Intl.Segmenter が使えない時は無変換でフォールバックすること', () => {
    const prepared = prepareSearchQuery('  空白  なし  ', () => null);

    expect(prepared).to.deep.equal({
      rawQuery: '空白 なし',
      segmentedQuery: '空白 なし',
      tokens: ['空白', 'なし'],
    });
  });
});
