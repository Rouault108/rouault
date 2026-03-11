import { expect } from '@open-wc/testing';

import {
  buildSearchHref,
  buildTagHref,
  normalizeSearchQuery,
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

  it('URL から検索状態を復元すること', () => {
    const state = parseSearchStateFromUrl(
      new URL('https://example.com/search?q=%20jazz%20theory%20&tag=music&tag=jazz&tag=music'),
    );

    expect(state).to.deep.equal({
      query: 'jazz theory',
      tags: ['music', 'jazz'],
    });
  });

  it('検索URLを構築すること', () => {
    expect(buildSearchHref({ query: 'jazz theory', tags: ['music', 'jazz'] })).to.equal(
      '/search?q=jazz+theory&tag=music&tag=jazz',
    );
    expect(buildSearchHref({ query: '', tags: [] })).to.equal('/search');
  });

  it('タグURLを構築すること', () => {
    expect(buildTagHref('classical')).to.equal('/tags/classical/');
    expect(buildTagHref('music theory')).to.equal('/tags/music%20theory/');
  });
});
