import { describe, expect, it } from 'vitest';

import {
  ARTICLE_HEADER_ICON_NAMES,
  type ArticleHeaderIconName,
} from '../../src/article-header/article-header-contract.js';
import { renderStaticArticleHeaderIconHtml } from '../../src/layouts/article-header-icon-html.js';
import { LUCIDE_SUBSET } from '../../src/generated/lucide-subset.js';

describe('static article-header icon html renderer', () => {
  it('article-header icon catalog 全件を static svg として描画できること', () => {
    for (const name of ARTICLE_HEADER_ICON_NAMES) {
      const rendered = renderStaticArticleHeaderIconHtml(name, 'article-header__icon');
      expect(rendered).toContain('<svg');
      expect(rendered).toContain('class="article-header__icon"');
      expect(rendered).toContain('aria-hidden="true"');
      expect(rendered).toContain('focusable="false"');
      expect(rendered).not.toContain('<ui-icon');
      expect(rendered).not.toContain('iconify-icon');
    }
  });

  it('alias parent を解決し、transform 付き alias を混入させないこと', () => {
    const rendered = renderStaticArticleHeaderIconHtml('alert-triangle', 'icon');
    expect(rendered).toContain('viewBox="0 0 24 24"');

    for (const name of ARTICLE_HEADER_ICON_NAMES) {
      const alias = (LUCIDE_SUBSET.aliases as Record<string, { rotate?: number }>)[name];
      expect(alias?.rotate).toBeUndefined();
    }
  });

  it('typed renderer は missing icon を throw すること', () => {
    expect(() =>
      renderStaticArticleHeaderIconHtml('missing-icon' as ArticleHeaderIconName, 'icon'),
    ).toThrowError('Unknown article header icon: "missing-icon".');
  });

  it('unknown icon fallback renderer を公開しないこと', async () => {
    const module = await import('../../src/layouts/article-header-icon-html.js');
    expect('renderUnknownArticleHeaderIconHtml' in module).toBe(false);
  });

  it('outer svg は generated body の stroke/fill を上書きしないこと', () => {
    const rendered = renderStaticArticleHeaderIconHtml('history', 'icon');
    const outerSvg = rendered.match(/^<svg\b[^>]*>/u)?.[0] ?? '';
    expect(outerSvg).not.toContain('stroke=');
    expect(outerSvg).not.toContain('fill=');
  });
});
