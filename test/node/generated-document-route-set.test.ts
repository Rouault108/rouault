import { describe, expect, it } from 'vitest';

import {
  buildGeneratedDocumentRouteSet,
  normalizeGeneratedDocumentRoutePathname,
} from '../../build/content/generated-document-route-set.js';

describe('generated document route set', () => {
  it('generated document route pathname は route presence 用に正規化すること', () => {
    expect(normalizeGeneratedDocumentRoutePathname('/notes/current')).to.equal('/notes/current/');
    expect(normalizeGeneratedDocumentRoutePathname('/notes/current/index.html')).to.equal(
      '/notes/current/',
    );
  });

  it('routeSet は静的生成済み route の presence 判定集合であること', () => {
    const routeSet = buildGeneratedDocumentRouteSet({
      pageUrl: '/404.html',
      notePermalink: '/notes/current',
      notes: [{ permalink: '/notes/current', genre: ['music'] }],
      corpusPages: [{ href: '/corpora/program/' }],
      tagPages: [{ tag: 'music' }],
    });

    expect(routeSet.has('/notes/current/')).to.equal(true);
    expect(routeSet.has('/notes/current')).to.equal(true);

    expect(routeSet.has('/corpora/program/')).to.equal(true);
    expect(routeSet.has('/corpora/program')).to.equal(false);

    expect(routeSet.has('/tags/music/')).to.equal(true);
    expect(routeSet.has('/tags/music')).to.equal(false);

    expect(routeSet.has('/404.html')).to.equal(false);
  });
});
