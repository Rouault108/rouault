import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SEARCH_SORT_MODE,
  DEFAULT_SEARCH_TAG_MODE,
  buildSearchStateUrl,
  buildTagPageUrl,
  buildUrlForSearchState,
  normalizeSearchQuery,
  normalizeSearchSort,
  normalizeSearchStateUrl,
  normalizeSearchTagMode,
  normalizeSearchTags,
  parseSearchStateFromUrl,
} from '../../shared/search/search-url.js';

describe('search-url', () => {
  it('検索クエリを NFKC + ASCII lowercase で正規化すること', () => {
    expect(normalizeSearchQuery('  Rouault   Search  ')).to.equal('rouault search');
    expect(normalizeSearchQuery('ＡＢＣ　１２３')).to.equal('abc 123');
    expect(normalizeSearchQuery('   ')).to.equal('');
  });

  it('タグ配列を正規化し昇順化すること', () => {
    expect(normalizeSearchTags([' music ', '', 'jazz', 'music', '  theory  '])).to.deep.equal([
      'jazz',
      'music',
      'theory',
    ]);
  });

  it('並び順とタグ演算子を正規化すること', () => {
    expect(normalizeSearchSort('date-desc')).to.equal('date-desc');
    expect(normalizeSearchSort('unknown')).to.equal(DEFAULT_SEARCH_SORT_MODE);
    expect(normalizeSearchTagMode('and')).to.equal('and');
    expect(normalizeSearchTagMode('unknown')).to.equal(DEFAULT_SEARCH_TAG_MODE);
  });

  it('検索 URL から検索状態を復元すること', () => {
    const state = parseSearchStateFromUrl(
      new URL(
        'https://example.com/search?q=%20Rouault%20Search%20&tag=music&tag=jazz&tag=music&tagMode=and&sort=date-desc',
      ),
    );

    expect(state).to.deep.equal({
      q: 'rouault search',
      tags: ['jazz', 'music'],
      tagMode: 'and',
      sort: 'date-desc',
    });
  });

  it('タグページ URL から単一タグ既定状態を復元すること', () => {
    const state = parseSearchStateFromUrl(new URL('https://example.com/tags/music/'));

    expect(state).to.deep.equal({
      q: '',
      tags: ['music'],
      tagMode: 'or',
      sort: 'relevance',
    });
  });

  it('SearchStateUrl は常に /search/ を生成すること', () => {
    expect(
      buildSearchStateUrl({
        q: 'Rouault Search',
        tags: ['music', 'jazz'],
        tagMode: 'and',
        sort: 'date-desc',
      }),
    ).to.equal('/search/?q=rouault+search&tag=jazz&tag=music&tagMode=and&sort=date-desc');
    expect(
      buildSearchStateUrl({
        q: '',
        tags: ['music'],
        tagMode: 'or',
        sort: 'relevance',
      }),
    ).to.equal('/search/?tag=music');
  });

  it('タグページ URL 生成は別 helper に分離されること', () => {
    expect(buildTagPageUrl('classical')).to.equal('/tags/classical/');
    expect(
      buildUrlForSearchState({
        q: '',
        tags: ['classical'],
        tagMode: 'or',
        sort: 'relevance',
      }),
    ).to.equal('/tags/classical/');
    expect(
      buildUrlForSearchState({
        q: 'beethoven',
        tags: ['classical'],
        tagMode: 'or',
        sort: 'relevance',
      }),
    ).to.equal('/search/?q=beethoven&tag=classical');
  });

  it('SearchStateUrl の正規化は /search のみを対象にすること', () => {
    expect(
      normalizeSearchStateUrl('https://example.com/search/?q=Rouault%20Search&tag=music#hash'),
    ).to.equal('/search/?q=rouault+search&tag=music');
    expect(normalizeSearchStateUrl('https://example.com/tags/music/')).to.equal('/tags/music/');
    expect(normalizeSearchStateUrl('/tags/music/')).to.equal('/tags/music/');
    expect(normalizeSearchStateUrl('/tags/music')).to.equal('/search/');
  });
});
