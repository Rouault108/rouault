import { expect } from '@open-wc/testing';

import {
  DEFAULT_SEARCH_SORT_MODE,
  DEFAULT_SEARCH_TAG_MODE,
  buildSearchStateUrl,
  buildTagHref,
  normalizeSearchQuery,
  normalizeSearchSort,
  normalizeSearchTagMode,
  normalizeSearchTags,
  parseSearchStateFromUrl,
} from '../../src/lib/search/search-url.js';

describe('search-url', () => {
  it('検索クエリを正規化すること', () => {
    expect(normalizeSearchQuery('  Rouault   Search  ')).to.equal('Rouault Search');
    expect(normalizeSearchQuery('   ')).to.equal('');
  });

  it('タグ配列を正規化し昇順化すること', () => {
    expect(normalizeSearchTags([' music ', '', 'jazz', 'music', '  theory  '])).to.deep.equal([
      'jazz',
      'music',
      'theory',
    ]);
  });

  it('並び順を正規化すること', () => {
    expect(normalizeSearchSort('date-desc')).to.equal('date-desc');
    expect(normalizeSearchSort('unknown')).to.equal(DEFAULT_SEARCH_SORT_MODE);
  });

  it('タグ演算子を正規化すること', () => {
    expect(normalizeSearchTagMode('and')).to.equal('and');
    expect(normalizeSearchTagMode('unknown')).to.equal(DEFAULT_SEARCH_TAG_MODE);
  });

  it('検索URLから検索状態を復元すること', () => {
    const state = parseSearchStateFromUrl(
      new URL(
        'https://example.com/search?q=%20jazz%20theory%20&tag=music&tag=jazz&tag=music&tagMode=and',
      ),
    );

    expect(state).to.deep.equal({
      q: 'jazz theory',
      tags: ['jazz', 'music'],
      tagMode: 'and',
      sort: 'relevance',
    });
  });

  it('タグページURLから単一タグ既定状態を復元すること', () => {
    const state = parseSearchStateFromUrl(new URL('https://example.com/tags/music/'));

    expect(state).to.deep.equal({
      q: '',
      tags: ['music'],
      tagMode: 'or',
      sort: 'relevance',
    });
  });

  it('検索URLを構築すること', () => {
    expect(
      buildSearchStateUrl({
        q: 'jazz theory',
        tags: ['music', 'jazz'],
        tagMode: 'and',
        sort: 'date-desc',
      }),
    ).to.equal('/search?q=jazz+theory&tag=jazz&tag=music&tagMode=and&sort=date-desc');
    expect(
      buildSearchStateUrl({
        q: 'jazz theory',
        tags: ['music', 'jazz'],
        tagMode: 'or',
        sort: 'relevance',
      }),
    ).to.equal('/search?q=jazz+theory&tag=jazz&tag=music');
    expect(
      buildSearchStateUrl({ q: '', tags: [], tagMode: 'or', sort: 'relevance' }),
    ).to.equal('/search');
  });

  it('タグURLを構築すること', () => {
    expect(buildTagHref('classical')).to.equal('/tags/classical/');
    expect(buildTagHref('music theory')).to.equal('/tags/music%20theory/');
  });
});
