import { describe, expect, it } from 'vitest';

import { createArticleHeaderSourceLinkAnnotation } from '../../src/layouts/article-header-source-link.js';
import { createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';

const siteUrlContext = { siteOrigin: 'https://example.com', basePath: '' };
const currentUrl = 'https://example.com/notes/current/';

const createRouteClassificationMode = (routes: readonly string[] = []) =>
  createManifestLoadedRouteClassificationMode({
    isInternalDocumentPathname: (pathname) => routes.includes(pathname),
  });

describe('article header source link annotation', () => {
  it('external origin source を external-web metadata link として分類すること', () => {
    const annotation = createArticleHeaderSourceLinkAnnotation({
      href: 'https://external.example/source',
      siteUrlContext,
      currentUrl,
      routeClassificationMode: createRouteClassificationMode(['/notes/current/']),
    });

    expect(annotation).toEqual({
      href: 'https://external.example/source',
      kind: 'external-web',
      surface: 'metadata',
      isExternalWeb: true,
      ariaLabel: '出典（外部サイト、新しいタブで開く）',
    });
  });

  it('same-origin non-document source を internal-resource metadata link として分類すること', () => {
    const annotation = createArticleHeaderSourceLinkAnnotation({
      href: 'https://example.com/article-header-link-decoration',
      siteUrlContext,
      currentUrl,
      routeClassificationMode: createRouteClassificationMode(['/notes/current/']),
    });

    expect(annotation).toEqual({
      href: '/article-header-link-decoration',
      kind: 'internal-resource',
      surface: 'metadata',
      isExternalWeb: false,
      ariaLabel: '出典（新しいタブで開く）',
    });
  });

  it('same-origin internal document source を internal-document metadata link として分類すること', () => {
    const annotation = createArticleHeaderSourceLinkAnnotation({
      href: 'https://example.com/source-document/',
      siteUrlContext,
      currentUrl,
      routeClassificationMode: createRouteClassificationMode([
        '/notes/current/',
        '/source-document',
      ]),
    });

    expect(annotation).toEqual({
      href: '/source-document',
      kind: 'internal-document',
      surface: 'metadata',
      isExternalWeb: false,
      ariaLabel: '出典（新しいタブで開く）',
    });
  });

  it('unsafe または source link 想定外の kind は annotation にしないこと', () => {
    expect(() =>
      createArticleHeaderSourceLinkAnnotation({
        href: 'javascript:alert(1)',
        siteUrlContext,
        currentUrl,
        routeClassificationMode: createRouteClassificationMode(),
      }),
    ).toThrow('unsafe');

    expect(() =>
      createArticleHeaderSourceLinkAnnotation({
        href: 'mailto:hello@example.com',
        siteUrlContext,
        currentUrl,
        routeClassificationMode: createRouteClassificationMode(),
      }),
    ).toThrow('unsupported kind: external-action');
  });
});
