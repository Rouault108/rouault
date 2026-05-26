import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  ARTICLE_HEADER_ICON_NAMES,
  type ArticleHeaderIconName,
} from '../../src/article-header/article-header-contract.js';
import { renderStaticIconHtml } from '../../shared/icons/render-static-icon-html.js';
import { LUCIDE_SUBSET } from '../../src/generated/lucide-subset.js';

describe('static article-header icon html renderer', () => {
  it('article-header icon catalog 全件を static svg として描画できること', () => {
    for (const name of ARTICLE_HEADER_ICON_NAMES) {
      const rendered = renderStaticIconHtml(name, 'article-header__icon');
      expect(rendered).toContain('<span');
      expect(rendered).toContain('<svg');
      expect(rendered).toContain('class="article-header__icon static-icon"');
      expect(rendered).toContain('aria-hidden="true"');
      expect(rendered).toContain('focusable="false"');
      expect(rendered).not.toContain('<ui-icon');
      expect(rendered).not.toContain('iconify-icon');
    }
  });

  it('alias parent を解決し、transform 付き alias を混入させないこと', () => {
    const rendered = renderStaticIconHtml('alert-triangle', 'icon');
    expect(rendered).toContain('viewBox="0 0 24 24"');

    for (const name of ARTICLE_HEADER_ICON_NAMES) {
      const alias = (LUCIDE_SUBSET.aliases as Record<string, { rotate?: number }>)[name];
      expect(alias?.rotate).toBeUndefined();
    }
  });

  it('typed renderer は missing icon を throw すること', () => {
    expect(() =>
      renderStaticIconHtml('missing-icon' as ArticleHeaderIconName, 'icon'),
    ).toThrowError('Unknown static icon: "missing-icon".');
  });

  it('layout local icon helper を参照しないこと', () => {
    expect(existsSync(resolve('src/layouts/article-header-icon-html.ts'))).toBe(false);
  });

  it('outer svg は generated body の stroke/fill を上書きしないこと', () => {
    const rendered = renderStaticIconHtml('history', 'icon');
    const outerSvg = rendered.match(/<svg\b[^>]*>/u)?.[0] ?? '';
    expect(outerSvg).not.toContain('stroke=');
    expect(outerSvg).not.toContain('fill=');
  });
});
