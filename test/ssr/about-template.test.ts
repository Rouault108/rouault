import { describe, expect, it } from 'vitest';

import { AboutPageTemplate } from '../../src/about.11ty.js';

describe('AboutPageTemplate', () => {
  it('about 専用の静的ページ設定を返すこと', () => {
    const template = new AboutPageTemplate();
    const data = template.data();

    expect(data.layout).toBe('base');
    expect(data.title).toBe('About');
    expect(data.permalink).toBe('/about/index.html');
  });

  it('独立した about-page 要素を描画すること', () => {
    const template = new AboutPageTemplate();
    const rendered = template.render();

    expect(rendered).toContain('<about-page');
    expect(rendered).toContain('data-hydration-scope="about-page"');
    expect(rendered).toContain('data-hydration-capability="interactive"');
    expect(rendered).toContain('data-hydration-trigger="initial"');
    expect(rendered).not.toContain('<layout-sidebar');
    expect(rendered).not.toContain('<search-page');
  });
});
