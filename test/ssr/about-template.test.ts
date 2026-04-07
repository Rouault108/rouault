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

  it('about を静的 HTML として描画し、TOC を独立して hydration 可能にすること', () => {
    const template = new AboutPageTemplate();
    const rendered = template.render();

    expect(rendered).toContain('<section class="about-shell">');
    expect(rendered).toContain('id="about-page-content" class="about-prose"');
    expect(rendered).toContain('About Rouault');
    expect(rendered).toContain('個人ノートを、静かに読むためのアプリケーション');
    expect(rendered).toContain('<layout-toc');
    expect(rendered).toContain('data-hydration-scope="about-toc"');
    expect(rendered).toContain('data-hydration-capability="interactive"');
    expect(rendered).toContain('data-hydration-trigger="initial"');
    expect(rendered).not.toContain('<about-page');
    expect(rendered).not.toContain('<layout-sidebar');
    expect(rendered).not.toContain('<search-page');
  });
});
