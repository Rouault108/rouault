import { expect } from '@open-wc/testing';

import { prepareSearchQuery } from '../../src/lib/search/query-preprocessor.js';

describe('search-query-preprocessor', () => {
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

  it('Intl.Segmenter が使えない時は無変換でフォールバックすること', () => {
    const prepared = prepareSearchQuery('  空白  なし  ', () => null);

    expect(prepared).to.deep.equal({
      rawQuery: '空白 なし',
      segmentedQuery: '空白 なし',
      tokens: ['空白', 'なし'],
    });
  });
});
