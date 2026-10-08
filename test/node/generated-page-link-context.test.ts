import { describe, expect, it } from 'vitest';

import { buildGeneratedPageLinkClassificationContext } from '../../build/content/generated-page-link-context.js';
import { classifyLinkHref } from '../../shared/link/link-annotation.js';

const siteUrlContext = {
  siteOrigin: 'https://example.com',
  basePath: '',
};

describe('generated page link classification context', () => {
  it('basePath付きabout/searchでもhash導線とdocument分類が成立すること', () => {
    const nested = { ...siteUrlContext, basePath: '/nested' };
    const context = buildGeneratedPageLinkClassificationContext(
      { page: { url: '/about/' } },
      nested,
    );
    expect(() =>
      classifyLinkHref({
        href: '#main-content',
        siteUrlContext: nested,
        currentUrl: context.currentUrl,
        routeClassificationMode: context.routeClassificationMode,
      }),
    ).not.toThrow();
    expect(
      classifyLinkHref({
        href: '/nested/search/',
        siteUrlContext: nested,
        currentUrl: context.currentUrl,
        routeClassificationMode: context.routeClassificationMode,
      }).kind,
    ).toBe('internal-document');
  });
  it('page / note / navigation data から currentUrl と routeSet を構築すること', () => {
    const context = buildGeneratedPageLinkClassificationContext(
      {
        page: { url: '/notes/current/' },
        note: { permalink: '/notes/current/' },
        notes: [
          {
            permalink: '/notes/current/',
            genre: ['music'],
          },
          {
            permalink: '/source-document/',
            genre: [],
          },
        ],
        corpusPages: [{ href: '/corpora/program/' }],
        tagPages: [{ tag: 'music' }],
      },
      siteUrlContext,
    );

    expect(context.currentUrl).toBe('https://example.com/notes/current/');
    expect(context.routeSet.has('/notes/current/')).toBe(true);
    expect(context.routeSet.has('/source-document/')).toBe(true);
    expect(context.routeSet.has('/corpora/program/')).toBe(true);
    expect(context.routeSet.has('/tags/music/')).toBe(true);
  });

  it('same-origin document / resource の分類に同じ routeSet を使うこと', () => {
    const context = buildGeneratedPageLinkClassificationContext(
      {
        page: { url: '/notes/current/' },
        note: { permalink: '/notes/current/' },
        notes: [{ permalink: '/source-document/', genre: [] }],
      },
      siteUrlContext,
    );

    const internalDocument = classifyLinkHref({
      href: 'https://example.com/source-document/',
      siteUrlContext,
      currentUrl: context.currentUrl,
      routeClassificationMode: context.routeClassificationMode,
      surface: 'metadata',
      target: '_blank',
      rel: 'noopener noreferrer',
    });

    const internalResource = classifyLinkHref({
      href: 'https://example.com/article-header-link-decoration',
      siteUrlContext,
      currentUrl: context.currentUrl,
      routeClassificationMode: context.routeClassificationMode,
      surface: 'metadata',
      target: '_blank',
      rel: 'noopener noreferrer',
    });

    expect(internalDocument.isUnsafe).toBe(false);
    expect(internalDocument.kind).toBe('internal-document');
    expect(internalDocument.routerInterceptionPolicy).toBe('passthrough');

    expect(internalResource.isUnsafe).toBe(false);
    expect(internalResource.kind).toBe('internal-resource');
    expect(internalResource.routerInterceptionPolicy).toBe('passthrough');
  });

  it('tag pageのraw filesystem URLよりcanonical tag routeをcurrentUrlに優先すること', () => {
    const context = buildGeneratedPageLinkClassificationContext(
      {
        page: { url: '/tags/C#/' },
        tagPage: { tag: 'C#' },
        tagPages: [{ tag: 'C#' }],
      },
      siteUrlContext,
    );

    expect(context.currentUrl).toBe('https://example.com/tags/C%23/');
    expect(context.routeSet.has('/tags/C%23/')).toBe(true);
  });
});
