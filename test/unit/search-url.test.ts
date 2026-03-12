import { expect } from '@open-wc/testing';

import {
  DEFAULT_SEARCH_SORT_MODE,
  buildSearchHref,
  buildTagHref,
  normalizeSearchQuery,
  normalizeSearchSort,
  normalizeSearchTags,
  parseSearchStateFromUrl,
} from '../../src/lib/search/search-url.js';

describe('search-url', () => {
  it('検索クエリを正規化すること', () => {
    expect(normalizeSearchQuery('  Rouault   Search  ')).to.equal('Rouault Search');
    expect(normalizeSearchQuery('   ')).to.equal('');
  });

  it('タグ配列を正規化すること', () => {
    expect(
      normalizeSearchTags([' music ', '', 'jazz', 'music', '  theory  ']),
    ).to.deep.equal(['music', 'jazz', 'theory']);
  });

  it('並び順を正規化すること', () => {
    expect(normalizeSearchSort('date-desc')).to.equal('date-desc');
    expect(normalizeSearchSort('unknown')).to.equal(DEFAULT_SEARCH_SORT_MODE);
  });

  it('URL から検索状態を復元すること', () => {
    const state = parseSearchStateFromUrl(
      new URL('https://example.com/search?q=%20jazz%20theory%20&tag=music&tag=jazz&tag=music'),
    );

    expect(state).to.deep.equal({
      query: 'jazz theory',
      tags: ['music', 'jazz'],
      sort: 'relevance',
    });
  });

  it('URL から並び順を復元すること', () => {
    const state = parseSearchStateFromUrl(
      new URL('https://example.com/search?q=%E6%A4%9C%E7%B4%A2&sort=date-desc'),
    );

    expect(state).to.deep.equal({
      query: '検索',
      tags: [],
      sort: 'date-desc',
    });
  });

  it('検索URLを構築すること', () => {
    expect(buildSearchHref({ query: 'jazz theory', tags: ['music', 'jazz'], sort: 'date-desc' })).to.equal(
      '/search?q=jazz+theory&tag=music&tag=jazz&sort=date-desc',
    );
    expect(buildSearchHref({ query: 'jazz theory', tags: ['music', 'jazz'], sort: 'relevance' })).to.equal(
      '/search?q=jazz+theory&tag=music&tag=jazz',
    );
    expect(buildSearchHref({ query: '', tags: [], sort: 'relevance' })).to.equal('/search');
  });

  it('タグURLを構築すること', () => {
    expect(buildTagHref('classical')).to.equal('/tags/classical/');
    expect(buildTagHref('music theory')).to.equal('/tags/music%20theory/');
  });
});
