import { describe, expect, it } from 'vitest';
import {
  annotateGeneratedPageHtmlLinkContracts,
  validateGeneratedPageHtmlLinkContracts,
} from '../../build/content/page-html-link-contracts.js';
import { createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';
import { BaseLayout } from '../../src/layouts/BaseLayout.11ty.js';

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
