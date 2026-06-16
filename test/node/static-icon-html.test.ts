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
  it('renders every article-header icon as static svg html', () => {
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

  it('keeps string calls decorative and compatible', () => {
    const rendered = renderStaticIconHtml('search', 'search-trigger__icon');

    expect(rendered).toContain('class="search-trigger__icon static-icon"');
    expect(rendered).toContain('<span');
    expect(rendered).toContain('aria-hidden="true"');
    expect(rendered).not.toContain('role="img"');
    expect(rendered).not.toContain('aria-label=');
    expect(rendered).toContain(
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="search"',
    );
  });

  it('renders semantic icons only when options label is non-empty after trim', () => {
    const rendered = renderStaticIconHtml('search', {
      className: 'search-trigger__icon',
      label: '  Search notes  ',
    });

    expect(rendered).toContain('class="search-trigger__icon static-icon"');
    expect(rendered).toContain('role="img"');
    expect(rendered).toContain('aria-label="Search notes"');
    expect(rendered).not.toContain('aria-hidden="true"><svg');
    expect(rendered).toContain(
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="search"',
    );
  });

  it('keeps options without a meaningful label decorative', () => {
    const cases = [
      renderStaticIconHtml('search', { className: 'icon' }),
      renderStaticIconHtml('search', { className: 'icon', label: undefined as unknown as string }),
      renderStaticIconHtml('search', { className: 'icon', label: null as unknown as string }),
      renderStaticIconHtml('search', { className: 'icon', label: '' }),
      renderStaticIconHtml('search', { className: 'icon', label: '   ' }),
    ];

    for (const rendered of cases) {
      expect(rendered).toContain('class="icon static-icon"');
      expect(rendered).toContain('aria-hidden="true"');
      expect(rendered).not.toContain('role="img"');
      expect(rendered).not.toContain('aria-label=');
      expect(rendered).not.toContain('aria-label="undefined"');
      expect(rendered).not.toContain('aria-label="null"');
    }
  });

  it('escapes className, label, and data-icon attribute values', () => {
    const rendered = renderStaticIconHtml('link', {
      className: 'icon&A <broken> "quoted"',
      label: ' A&B <C> "D" ',
    });

    expect(rendered).toContain('class="icon&amp;A &lt;broken&gt; &quot;quoted&quot; static-icon"');
    expect(rendered).toContain('aria-label="A&amp;B &lt;C&gt; &quot;D&quot;"');
    expect(rendered).toContain('data-icon="link"');
  });

  it('normalizes classes by removing blanks, deduplicating, and adding static-icon once', () => {
    const rendered = renderStaticIconHtml('search', {
      className: '  icon   static-icon icon  ',
      label: 'Search',
    });

    expect(rendered).toContain('class="icon static-icon"');
  });

  it('uses static-icon when className is omitted or empty', () => {
    expect(renderStaticIconHtml('search')).toContain('class="static-icon"');
    expect(renderStaticIconHtml('search', { label: 'Search' })).toContain('class="static-icon"');
    expect(renderStaticIconHtml('search', { className: '', label: 'Search' })).toContain(
      'class="static-icon"',
    );
  });

  it('never emits ui-icon custom elements or iconify-icon runtime output', () => {
    const decorative = renderStaticIconHtml('search', 'icon');
    const semantic = renderStaticIconHtml('search', { className: 'icon', label: 'Search' });

    for (const rendered of [decorative, semantic]) {
      expect(rendered).not.toContain('<ui-icon');
      expect(rendered).not.toContain('</ui-icon>');
      expect(rendered).not.toContain('iconify-icon');
    }
  });

  it('does not inject alias parent transforms into static svg output', () => {
    const rendered = renderStaticIconHtml('alert-triangle', 'icon');
    expect(rendered).toContain('viewBox="0 0 24 24"');

    for (const name of ARTICLE_HEADER_ICON_NAMES) {
      const alias = (LUCIDE_SUBSET.aliases as Record<string, { rotate?: number }>)[name];
      expect(alias?.rotate).toBeUndefined();
    }
  });

  it('throws for missing typed icon names', () => {
    expect(() =>
      renderStaticIconHtml('missing-icon' as ArticleHeaderIconName, 'icon'),
    ).toThrowError('Unknown static icon: "missing-icon".');
  });

  it('does not restore the layout-local icon helper', () => {
    expect(existsSync(resolve('src/layouts/article-header-icon-html.ts'))).toBe(false);
  });

  it('does not override generated body stroke or fill on the outer svg', () => {
    const rendered = renderStaticIconHtml('history', 'icon');
    const outerSvg = rendered.match(/<svg\b[^>]*>/u)?.[0] ?? '';
    expect(outerSvg).not.toContain('stroke=');
    expect(outerSvg).not.toContain('fill=');
  });
});
