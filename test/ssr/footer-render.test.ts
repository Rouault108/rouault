import { describe, expect, it } from 'vitest';
import { renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import {
  FOOTER_DEFAULT_NAV_LABEL,
  renderFooter,
  type FooterRenderOptions,
} from '../../src/components/ui/footer/footer.js';

const renderFooterMarkup = async (options: FooterRenderOptions): Promise<string> =>
  collectResult(renderThunked(renderFooter(options)));

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

    expect(rendered).toContain('<footer id="footer-default" class="ui-footer">');
    expect(rendered).toContain('class="ui-footer__inner"');
    expect(rendered).toContain('class="ui-footer__meta"');
    expect(rendered).toContain('class="ui-footer__brand"');
    expect(rendered).toContain('class="ui-footer__subline"');
    expect(rendered).toContain('class="ui-footer__legal"');
    expect(rendered).toContain('class="ui-footer__build"');
    expect(rendered).toContain(`aria-label="${FOOTER_DEFAULT_NAV_LABEL}"`);
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
      meta: {
        siteName: 'Rouault',
        copyrightText: '© 2026 Ruo Miyata.',
      },
    });

    expect(rendered).toContain('<footer id="footer-minimal" class="ui-footer">');
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

  it('無効な link を除外し external link を注記すること', async () => {
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
        { href: 'mailto:hello@example.com', label: '連絡', external: true },
        { href: 'javascript:alert(1)', label: 'invalid' },
        { href: '/ignored', label: '   ' },
      ],
      a11y: {
        navLabel: 'フッター補助導線',
      },
    });

    const navItemCount = rendered.match(/class="ui-footer__nav-item"/g)?.length ?? 0;

    expect(rendered).toContain('<a href="https://rouault.example">');
    expect(rendered).toContain('>Rouault<');
    expect(rendered).toContain('release 2026.03.24');
    expect(rendered).toContain('aria-label="フッター補助導線"');
    expect(rendered).toContain('href="/license"');
    expect(rendered).toContain('href="mailto:hello@example.com"');
    expect(rendered).toContain('data-external="true"');
    expect(rendered).toContain('aria-label="連絡（外部サイト）"');
    expect(navItemCount).to.equal(2);
    expect(rendered).not.toContain('javascript:alert(1)');
    expect(rendered).not.toContain('href="/ignored"');
  });
});
