import { describe, expect, it } from 'vitest';
import { renderFooterHtml } from '../../src/layouts/footer-html.js';
import type { FooterRenderOptions } from '../../src/layouts/footer-options.js';

const renderFooterMarkup = async (options: FooterRenderOptions): Promise<string> =>
  Promise.resolve(renderFooterHtml(options));

const BASE_META: FooterRenderOptions['meta'] = {
  siteName: 'Rouault',
  copyrightText: '© 2026 Ruo Miyata.',
};

const renderWithLinks = (links: unknown): string =>
  renderFooterHtml({
    meta: BASE_META,
    links: links as readonly FooterLinkItemBoundary[],
  });

type FooterLinkItemBoundary = NonNullable<FooterRenderOptions['links']>[number];

const navItemCount = (markup: string): number =>
  markup.match(/class="ui-footer__nav-item"/gu)?.length ?? 0;

const findAnchorOpenTagByHref = (markup: string, href: string): string => {
  const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = new RegExp(`<a\\b(?=[^>]*\\bhref="${escapedHref}")[^>]*>`, 'u').exec(markup);
  expect(match, `anchor with href ${href}`).not.toBeNull();
  return match?.[0] ?? '';
};

const findAnchorOpenTagByText = (markup: string, text: string): string => {
  const escapedText = text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = new RegExp(`(<a\\b[^>]*>)${escapedText}</a>`, 'u').exec(markup);
  expect(match, `anchor with text ${text}`).not.toBeNull();
  return match?.[1] ?? '';
};

const findOptionalAnchorOpenTagByText = (markup: string, text: string): string | null => {
  const escapedText = text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = new RegExp(`(<a\\b[^>]*>)${escapedText}</a>`, 'u').exec(markup);
  return match?.[1] ?? null;
};

const getAttribute = (openTag: string, name: string): string | null => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = new RegExp(`\\s${escapedName}="([^"]*)"`, 'u').exec(openTag);
  return match?.[1] ?? null;
};

const expectAttribute = (openTag: string, name: string, value: string): void => {
  expect(getAttribute(openTag, name), `${openTag} ${name}`).to.equal(value);
};

const expectNoAttribute = (openTag: string, name: string): void => {
  expect(getAttribute(openTag, name), `${openTag} ${name}`).toBeNull();
};

const expectOnlyOkLink = (markup: string): void => {
  expect(navItemCount(markup)).to.equal(1);
  expect(findAnchorOpenTagByHref(markup, '/ok/')).toContain('href="/ok/"');
};

describe('renderFooter', () => {
  it('完全状態で brand / legal / build / nav を出力すること', async () => {
    const rendered = await renderFooterMarkup({
      id: 'footer-default',
      meta: {
        siteName: 'Rouault',
        siteUrl: '/',
        copyrightText: '© 2026 Ruo Miyata. CC BY 4.0.',
        buildLabel: 'build 4a2b9f1',
      },
      links: [
        { href: '/search/', label: '検索' },
        { href: '/about/', label: 'このサイトについて' },
      ],
    });

    expect(rendered).toContain('<footer id="footer-default" class="ui-footer" data-footer data-layout-footer>');
    expect(rendered).toContain('class="ui-footer__inner"');
    expect(rendered).toContain('class="ui-footer__meta"');
    expect(rendered).toContain('class="ui-footer__brand"');
    expect(rendered).toContain('class="ui-footer__subline"');
    expect(rendered).toContain('class="ui-footer__legal"');
    expect(rendered).toContain('class="ui-footer__build"');
    expect(rendered).toContain('aria-label="補助ナビゲーション"');
    expect(rendered).toContain('<p class="ui-footer__site">');
    expect(rendered).toContain('href="/"');
    expect(rendered).toContain('>Rouault<');
    expect(rendered).toContain('© 2026 Ruo Miyata. CC BY 4.0.');
    expect(rendered).toContain('build 4a2b9f1');
    expect(rendered).toContain('href="/search/"');
    expect(rendered).toContain('href="/about/"');
  });

  it('最小状態では nav / build / site link を省略しつつ legal row は残すこと', async () => {
    const rendered = await renderFooterMarkup({
      id: 'footer-minimal',
      meta: BASE_META,
    });

    expect(rendered).toContain('<footer id="footer-minimal" class="ui-footer" data-footer data-layout-footer>');
    expect(rendered).toContain('class="ui-footer__meta"');
    expect(rendered).toContain('class="ui-footer__subline"');
    expect(rendered).toContain('class="ui-footer__legal"');
    expect(rendered).toContain('<p class="ui-footer__site">');
    expect(rendered).toContain('>Rouault<');
    expect(rendered).toContain('© 2026 Ruo Miyata.');
    expect(rendered).not.toContain('class="ui-footer__build"');
    expect(rendered).not.toContain('class="ui-footer__nav"');
    expect(rendered).not.toContain('<p class="ui-footer__description">');
    expect(rendered).not.toContain('<p class="ui-footer__eyebrow">');
  });

  it('無効な link を除外し external web link を注記すること', async () => {
    const rendered = await renderFooterMarkup({
      id: 'footer-variant-full',
      meta: {
        siteName: 'Rouault',
        siteUrl: 'https://rouault.example',
        copyrightText: '© 2026 Ruo Miyata. CC BY 4.0.',
        buildLabel: 'release 2026.03.24',
      },
      links: [
        { href: '/license', label: 'ライセンス' },
        { href: 'https://example.com', label: '外部' },
        { href: 'javascript:alert(1)', label: 'invalid' },
        { href: '/ignored', label: '   ' },
      ],
      a11y: {
        navLabel: 'フッター補助導線',
      },
    });

    const externalLink = findAnchorOpenTagByHref(rendered, 'https://example.com');

    expect(findAnchorOpenTagByText(rendered, 'Rouault')).toContain('href="https://rouault.example"');
    expect(rendered).toContain('release 2026.03.24');
    expect(rendered).toContain('aria-label="フッター補助導線"');
    expect(rendered).toContain('href="/license"');
    expectAttribute(externalLink, 'data-link-kind', 'external-web');
    expectAttribute(externalLink, 'data-external', 'true');
    expectAttribute(externalLink, 'rel', 'noreferrer');
    expectAttribute(externalLink, 'aria-label', '外部（外部サイト）');
    expect(navItemCount(rendered)).to.equal(2);
    expect(rendered).not.toContain('javascript:alert(1)');
    expect(rendered).not.toContain('href="/ignored"');
  });

  it('危険 URL と protocol-relative URL を除外すること', () => {
    const rendered = renderWithLinks([
      { href: 'javascript:alert(1)', label: 'js' },
      { href: 'data:text/html,<svg>', label: 'data' },
      { href: 'vbscript:msgbox(1)', label: 'vbscript' },
      { href: '//example.com', label: 'protocol-relative' },
      { href: '/ok/', label: 'OK' },
    ]);

    expectOnlyOkLink(rendered);
    expect(rendered).not.toContain('javascript:');
    expect(rendered).not.toContain('data:text/html');
    expect(rendered).not.toContain('vbscript:');
    expect(rendered).not.toContain('//example.com');
  });

  it('制御文字、ASCII 空白、backslash、裸パス、曖昧な Web URL を除外すること', () => {
    const rendered = renderWithLinks([
      { href: '/bad\u0000path/', label: 'control' },
      { href: 'about', label: 'about' },
      { href: 'foo/bar', label: 'foo' },
      { href: 'https:example.com', label: 'loose https' },
      { href: 'http:/example.com', label: 'loose http' },
      { href: 'https://exa mple.com', label: 'space in host' },
      { href: '/bad path/', label: 'space in path' },
      { href: 'https://', label: 'missing host' },
      { href: 'https:///path', label: 'missing host path' },
      { href: 'http://?q=1', label: 'missing host query' },
      { href: 'https://example.com\\path', label: 'external backslash' },
      { href: '/bad\\path/', label: 'internal backslash' },
      { href: './bad\\path', label: 'relative backslash' },
      { href: '../bad\\path', label: 'parent relative backslash' },
      { href: '#bad\\fragment', label: 'fragment backslash' },
      { href: '?q=bad\\value', label: 'query backslash' },
      { href: '/ok/', label: 'OK' },
    ]);

    expectOnlyOkLink(rendered);
    expect(rendered).not.toContain('loose https');
    expect(rendered).not.toContain('space in host');
    expect(rendered).not.toContain('backslash');
  });

  it('links[].label が trim 後空文字なら当該 link を描画しないこと', () => {
    const rendered = renderWithLinks([
      { href: '/ignored/', label: '   ' },
      { href: '/ok/', label: 'OK' },
    ]);

    expectOnlyOkLink(rendered);
    expect(rendered).not.toContain('/ignored/');
  });

  it('external-web nav link の自動判定と external:false を属性単位で反映すること', () => {
    const rendered = renderWithLinks([
      { href: 'https://example.com/auto', label: '外部' },
      { href: 'https://example.com/manual', label: '抑制', external: false },
      { href: 'HTTPS://example.com/upper', label: '大文字 scheme' },
    ]);
    const autoLink = findAnchorOpenTagByHref(rendered, 'https://example.com/auto');
    const suppressedLink = findAnchorOpenTagByHref(rendered, 'https://example.com/manual');
    const upperSchemeLink = findAnchorOpenTagByHref(rendered, 'HTTPS://example.com/upper');

    expectAttribute(autoLink, 'data-link-kind', 'external-web');
    expectAttribute(autoLink, 'data-external', 'true');
    expectAttribute(autoLink, 'rel', 'noreferrer');
    expectAttribute(autoLink, 'aria-label', '外部（外部サイト）');
    expectAttribute(suppressedLink, 'data-link-kind', 'external-web');
    expectAttribute(suppressedLink, 'rel', 'noreferrer');
    expectNoAttribute(suppressedLink, 'data-external');
    expectNoAttribute(suppressedLink, 'aria-label');
    expectAttribute(upperSchemeLink, 'data-link-kind', 'external-web');
    expectAttribute(upperSchemeLink, 'data-external', 'true');
    expectAttribute(upperSchemeLink, 'rel', 'noreferrer');
    expectAttribute(upperSchemeLink, 'aria-label', '大文字 scheme（外部サイト）');
  });

  it('mailto と tel は external-action とし external:true でも外部サイト扱いしないこと', () => {
    const rendered = renderWithLinks([
      { href: 'mailto:hello@example.com', label: '連絡', external: true },
      { href: 'tel:+81000000000', label: '電話', external: true },
      { href: 'mailto:', label: 'empty mailto' },
      { href: 'tel:', label: 'empty tel' },
    ]);
    const mailLink = findAnchorOpenTagByHref(rendered, 'mailto:hello@example.com');
    const telLink = findAnchorOpenTagByHref(rendered, 'tel:+81000000000');

    expectAttribute(mailLink, 'data-link-kind', 'external-action');
    expectAttribute(telLink, 'data-link-kind', 'external-action');
    expectNoAttribute(mailLink, 'data-external');
    expectNoAttribute(telLink, 'data-external');
    expectNoAttribute(mailLink, 'aria-label');
    expectNoAttribute(telLink, 'aria-label');
    expectNoAttribute(mailLink, 'rel');
    expectNoAttribute(telLink, 'rel');
    expect(rendered).not.toContain('empty mailto');
    expect(rendered).not.toContain('empty tel');
  });

  it('siteUrl の URL 許可規則を適用し external-web 属性を siteName link に限定して付与すること', () => {
    const invalidSiteUrls = [
      'mailto:hello@example.com',
      'tel:+81000000000',
      'javascript:alert(1)',
      'data:text/html,<svg>',
      'vbscript:msgbox(1)',
      '//example.com',
      'https:example.com',
      'http:/example.com',
      '/bad\u0000path/',
      'https://exa mple.com',
      '/bad path/',
      'https://',
      'https:///path',
      'http://?q=1',
      'https://example.com\\path',
      '/bad\\path/',
      './bad\\path',
      '../bad\\path',
      '#bad\\fragment',
      '?q=bad\\value',
    ];

    for (const siteUrl of invalidSiteUrls) {
      const rendered = renderFooterHtml({ meta: { ...BASE_META, siteUrl } });
      expect(findOptionalAnchorOpenTagByText(rendered, 'Rouault'), siteUrl).toBeNull();
    }

    const internalRendered = renderFooterHtml({ meta: { ...BASE_META, siteUrl: '/' } });
    expectAttribute(findAnchorOpenTagByText(internalRendered, 'Rouault'), 'href', '/');

    const externalRendered = renderFooterHtml({
      meta: { ...BASE_META, siteUrl: 'HTTPS://example.com' },
    });
    const siteLink = findAnchorOpenTagByText(externalRendered, 'Rouault');
    expectAttribute(siteLink, 'href', 'HTTPS://example.com');
    expectAttribute(siteLink, 'data-link-kind', 'external-web');
    expectAttribute(siteLink, 'data-external', 'true');
    expectAttribute(siteLink, 'rel', 'noreferrer');
    expectNoAttribute(siteLink, 'aria-label');
  });

  it('required text が非文字列または trim 後空文字の場合は明示エラーにすること', () => {
    expect(() =>
      renderFooterHtml({
        meta: { siteName: '   ', copyrightText: '© 2026 Ruo Miyata.' },
      }),
    ).toThrowError('Footer requires non-empty meta.siteName.');

    expect(() =>
      renderFooterHtml({
        meta: { siteName: 'Rouault', copyrightText: '   ' },
      }),
    ).toThrowError('Footer requires non-empty meta.copyrightText.');

    expect(() =>
      renderFooterHtml({
        meta: {
          siteName: undefined as unknown as string,
          copyrightText: '© 2026 Ruo Miyata.',
        },
      }),
    ).toThrowError('Footer requires non-empty meta.siteName.');
  });

  it('optional text が trim 後空文字なら未指定として扱うこと', () => {
    const rendered = renderFooterHtml({
      id: '   ',
      meta: {
        eyebrow: '   ',
        siteName: 'Rouault',
        description: '   ',
        copyrightText: '© 2026 Ruo Miyata.',
        buildLabel: '   ',
      },
      links: [{ href: '/about/', label: 'このサイトについて' }],
      a11y: {
        navLabel: '   ',
      },
    });

    expect(rendered).toContain('<footer class="ui-footer" data-footer data-layout-footer>');
    expect(rendered).not.toContain('<footer id=');
    expect(rendered).not.toContain('class="ui-footer__eyebrow"');
    expect(rendered).not.toContain('class="ui-footer__description"');
    expect(rendered).not.toContain('class="ui-footer__build"');
    expect(rendered).toContain('aria-label="補助ナビゲーション"');
  });

  it('links の型境界外入力を throw せず有効要素だけ描画すること', () => {
    const rendered = renderWithLinks([
      null,
      123,
      [],
      {},
      { href: '/missing-label/' },
      { label: 'missing href' },
      { href: '/ok/', label: 'OK' },
    ]);

    expectOnlyOkLink(rendered);
    expect(rendered).not.toContain('missing-label');
    expect(rendered).not.toContain('missing href');
  });

  it('links 自体が非配列なら nav を描画しないこと', () => {
    for (const links of [null, {}, 'invalid']) {
      const rendered = renderWithLinks(links);
      expect(rendered).not.toContain('class="ui-footer__nav"');
    }
  });
});
