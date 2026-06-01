import { describe, expect, it } from 'vitest';
import {
  annotateGeneratedPageHtmlLinkContracts,
  validateGeneratedPageHtmlLinkContracts,
} from '../../build/content/page-html-link-contracts.js';
import { createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';
import { BaseLayout } from '../../src/layouts/BaseLayout.11ty.js';
import { renderFooterHtml } from '../../src/layouts/footer-html.js';

describe('page HTML link contracts', () => {
  it('note HTML 後段の未注釈 source .md link を解決して本文リンク注釈を付与すること', () => {
    const annotated = annotateGeneratedPageHtmlLinkContracts({
      html: '<p><a href="../group-16/target.md">Sidebar Scroll Target</a></p>',
      sourceLabel: 'content/testing/sidebar-scroll/group-01/source',
      sourceFilePath: 'content/testing/sidebar-scroll/group-01/source.md',
      siteUrlContext: { siteOrigin: 'https://example.com', basePath: '' },
      currentUrl: 'https://example.com/notes/testing/sidebar-scroll/group-01/source',
      routeClassificationMode: createManifestLoadedRouteClassificationMode({
        isInternalDocumentPathname: (pathname) =>
          pathname === '/notes/testing/sidebar-scroll/group-16/target',
      }),
    });

    expect(annotated).toContain('href="/notes/testing/sidebar-scroll/group-16/target"');
    expect(annotated).toContain('data-link-kind="internal-document"');
    expect(annotated).toContain('data-link-surface="prose"');
    expect(() =>
      validateGeneratedPageHtmlLinkContracts({
        html: annotated ?? '',
        sourceLabel: 'content/testing/sidebar-scroll/group-01/source',
        siteUrlContext: { siteOrigin: 'https://example.com', basePath: '' },
        currentUrl: 'https://example.com/notes/testing/sidebar-scroll/group-01/source',
        routeClassificationMode: createManifestLoadedRouteClassificationMode({
          isInternalDocumentPathname: (pathname) =>
            pathname === '/notes/testing/sidebar-scroll/group-16/target',
        }),
      }),
    ).not.toThrow();
  });

  it('unsafe href を拒否すること', () => {
    expect(() =>
      validateGeneratedPageHtmlLinkContracts({
        html: '<a href="javascript:alert(1)" data-link-kind="unsafe" data-link-surface="prose">x</a>',
        sourceLabel: 'test',
      }),
    ).toThrow();
  });

  it('href と data-link-kind の分類不一致を拒否すること', () => {
    expect(() =>
      validateGeneratedPageHtmlLinkContracts({
        html: '<a href="/about/" data-link-kind="external-web" data-link-surface="prose" data-external="true">about</a>',
        sourceLabel: 'test',
      }),
    ).toThrow('external-web link kind does not match href');
  });

  it('generated HTML annotation が link-card surface の prose 降格を card に補正すること', () => {
    const annotated = annotateGeneratedPageHtmlLinkContracts({
      html: '<article data-link-card="true"><a class="link-card__link" href="https://external.example/post" data-link-kind="internal-document" data-link-surface="prose">card</a></article>',
      sourceLabel: 'test',
      siteUrlContext: { siteOrigin: 'https://example.com', basePath: '' },
      currentUrl: 'https://example.com/notes/current',
      routeClassificationMode: createManifestLoadedRouteClassificationMode({
        isInternalDocumentPathname: (pathname) => pathname === '/notes/current',
      }),
    });

    expect(annotated).toContain('data-link-kind="external-web"');
    expect(annotated).toContain('data-link-surface="card"');
    expect(annotated).toContain('data-external="true"');
  });

  it('generated HTML annotation が card surface link の古い data-link-kind を補正すること', () => {
    const annotated = annotateGeneratedPageHtmlLinkContracts({
      html: '<article data-link-card="true"><a class="link-card__link" href="mailto:hello@example.com" data-link-kind="external-web" data-link-surface="card" data-external="true">mail</a></article>',
      sourceLabel: 'test',
      siteUrlContext: { siteOrigin: 'https://example.com', basePath: '' },
      currentUrl: 'https://example.com/notes/current',
      routeClassificationMode: createManifestLoadedRouteClassificationMode({
        isInternalDocumentPathname: (pathname) => pathname === '/notes/current',
      }),
    });

    expect(annotated).toContain('data-link-kind="external-action"');
    expect(annotated).toContain('data-link-surface="card"');
    expect(annotated).not.toContain('data-external="true"');
  });

  it('validate が link-card link の prose 降格と wrong kind を拒否すること', () => {
    const context = {
      siteUrlContext: { siteOrigin: 'https://example.com', basePath: '' },
      currentUrl: 'https://example.com/notes/current',
      routeClassificationMode: createManifestLoadedRouteClassificationMode({
        isInternalDocumentPathname: (pathname: string) => pathname === '/notes/current',
      }),
    };

    expect(() =>
      validateGeneratedPageHtmlLinkContracts({
        html: '<article data-link-card="true"><a class="link-card__link" href="https://external.example/post" data-link-kind="external-web" data-link-surface="prose" data-external="true">card</a></article>',
        sourceLabel: 'test',
        ...context,
      }),
    ).toThrow('link-card link must use data-link-surface="card"');

    expect(() =>
      validateGeneratedPageHtmlLinkContracts({
        html: '<article data-link-card="true"><a class="link-card__link" href="mailto:hello@example.com" data-link-kind="external-web" data-link-surface="card" data-external="true">mail</a></article>',
        sourceLabel: 'test',
        ...context,
      }),
    ).toThrow('link kind does not match classified href');
  });

  it('footer の external:false external-web nav link は data-external なしでも許可すること', () => {
    const html = renderFooterHtml({
      meta: {
        siteName: 'Rouault',
        copyrightText: '© 2026 Ruo Miyata.',
      },
      links: [{ href: 'https://example.com/manual', label: '抑制', external: false }],
    });

    expect(html).toContain('data-link-kind="external-web"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).not.toContain('data-external="true"');
    expect(() =>
      validateGeneratedPageHtmlLinkContracts({
        html,
        sourceLabel: 'footer',
      }),
    ).not.toThrow();
  });

  it('footer 外の external-web link は data-external なしなら拒否すること', () => {
    expect(() =>
      validateGeneratedPageHtmlLinkContracts({
        html: '<a href="https://example.com/manual" data-link-kind="external-web" data-link-surface="prose">外部</a>',
        sourceLabel: 'prose',
      }),
    ).toThrow('external-web requires data-external="true"');
  });

  it('BaseLayout の generated page content で href と data-link-kind の分類不一致を拒否すること', () => {
    const layout = new BaseLayout();
    expect(() =>
      layout.render({
        content:
          '<a href="/about/" data-link-kind="external-web" data-link-surface="prose" data-external="true">about</a>',
        page: { url: '/' },
        buildMetadata: {
          buildId: '0123456789abcdef0123456789abcdef01234567',
          buildLabel: 'test-build',
          generatedAt: '2026-05-15T00:00:00.000Z',
        },
        siteUrlContext: {
          siteOrigin: 'https://example.com',
          basePath: '',
        },
      }),
    ).toThrow('link kind does not match classified href');
  });

  it('BaseLayout の full HTML に skip link structural attributes を出し contract 対象にすること', () => {
    const layout = new BaseLayout();
    const html = layout.render({
      content: '<p>本文</p>',
      page: { url: '/' },
      buildMetadata: {
        buildId: '0123456789abcdef0123456789abcdef01234567',
        buildLabel: 'test-build',
        generatedAt: '2026-05-15T00:00:00.000Z',
      },
      siteUrlContext: {
        siteOrigin: 'https://example.com',
        basePath: '',
      },
    });

    expect(html).toContain('class="skip-link"');
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('data-link-kind="internal-fragment"');
    expect(html).toContain('data-link-surface="structural"');
  });
});
