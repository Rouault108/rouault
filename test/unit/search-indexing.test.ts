import { expect } from '@open-wc/testing';

import { createFieldTokens, tokenizePath } from '../../src/lib/search/indexing/field-tokenizers.js';
import { buildCatalogKeywords } from '../../src/lib/search/indexing/catalog-keywords.js';

describe('search-indexing', () => {
  it('field tokenizers は title/body/path/keyword を決定的に分解すること', () => {
    const fieldTokens = createFieldTokens({
      canonicalUrl: '/notes/music/jazz-theory/',
      title: 'ジャズ理論の基礎',
      body: '即興と和声のメモ',
      keywords: ['music', 'jazz'],
    });

    expect(fieldTokens.titleTokens).to.deep.equal(['ジャズ', '理論', 'の', '基礎']);
    expect(fieldTokens.bodyTokens).to.include.members(['即興', 'と', '和声', 'メモ']);
    expect(fieldTokens.pathTokens).to.deep.equal(['notes', 'music', 'jazz', 'theory']);
    expect(fieldTokens.keywordTokens).to.deep.equal(['music', 'jazz']);
  });

  it('catalog keywords は slug/title/description/tag を統合すること', () => {
    const keywords = buildCatalogKeywords({
      slug: 'computer-science/algorithms/sorting',
      title: 'ソートアルゴリズム比較',
      description: '主要な計算量の比較メモ',
      tags: ['computer-science', 'algorithms'],
    });

    expect(keywords).to.include.members([
      'computer-science/algorithms/sorting',
      'computer-science',
      'algorithms',
      'sorting',
      'computer',
      'science',
      '比較',
      '計算',
      '量',
      'メモ',
    ]);
    expect(keywords.some((keyword) => keyword.includes('ソート'))).to.equal(true);
    expect(keywords.some((keyword) => keyword.includes('アルゴリズム'))).to.equal(true);
    expect(keywords.some((keyword) => keyword.includes('主要'))).to.equal(true);
  });

  it('tokenizePath は無効 canonical を空配列へ落とすこと', () => {
    expect(tokenizePath('/search?q=test')).to.deep.equal([]);
  });
});
