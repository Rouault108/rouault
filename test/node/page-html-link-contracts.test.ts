import { describe, expect, it } from 'vitest';
import { validateGeneratedPageHtmlLinkContracts } from '../../build/content/page-html-link-contracts.js';
import { BaseLayout } from '../../src/layouts/BaseLayout.11ty.js';

describe('page HTML link contracts', () => {
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
        content: '<a href="/about/" data-link-kind="external-web" data-link-surface="prose" data-external="true">about</a>',
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
