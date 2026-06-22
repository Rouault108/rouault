import { describe, expect, it } from 'vitest';

import { AboutPageTemplate } from '../../src/about.11ty.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';

describe('AboutPageTemplate', () => {
  it('about 専用の TOC absent 静的ページ設定を返すこと', () => {
    const template = new AboutPageTemplate();
    const data = template.data();

    expect(data.layout).toBe('base');
    expect(data.title).toBe('About');
    expect(data.permalink).toBe('/about/index.html');
    expect(data.headerTocPresence).toBe('absent');
    expect(data).not.toHaveProperty('headerTocRuntimeId');
    expect(data).not.toHaveProperty('headerTocOwnerId');
    expect(data).not.toHaveProperty('headerTocShouldHydrate');
  });

  it('about を TOC なしの静的紹介ページとして描画すること', () => {
    const template = new AboutPageTemplate();
    const rendered = template.render({ siteUrlContext: DEFAULT_SITE_URL_CONTEXT });

    expect(rendered).toContain('<section class="about-shell">');
    expect(rendered).toContain('<article class="about-main-col">');
    expect(rendered).toContain('<header class="about-hero">');
    expect(rendered).toMatch(/<h1 class="about-title">[\s\S]*?\S[\s\S]*?<\/h1>/);
    const leadMatch = rendered.match(/<p class="about-lead">([\s\S]*?)<\/p>/);
    expect(leadMatch).not.toBeNull();

    const leadHtml = leadMatch?.[1] ?? '';
    expect(leadHtml).toContain('ための<span class="about-lead__keep">設計メモ。</span>');
    expect([...leadHtml.matchAll(/class="about-lead__keep"/g)]).toHaveLength(1);
    expect(leadHtml).not.toContain('<br');
    expect(leadHtml).not.toContain('<wbr');
    expect(rendered).toMatch(
      /<div\b(?=[^>]*\bclass="[^"]*\babout-summary\b[^"]*")(?=[^>]*\baria-label="[^"]+")[^>]*>/,
    );
    expect(rendered).toContain('<ul class="about-summary-list">');
    expect(rendered).toContain('id="about-page-content" class="about-prose"');

    expect(rendered).not.toContain('layout-main-col');
    expect(rendered).not.toContain('container-reading');
    expect(rendered).not.toContain('layout-toc-col');
    expect(rendered).not.toContain('data-layout-toc-nav');
    expect(rendered).not.toContain('toc-source-about');
    expect(rendered).not.toContain('data-layout-toc-source');
    expect(rendered).not.toContain('<layout-toc-controller');
    expect(rendered).not.toContain('data-toc-owner-id="about-page-toc-owner"');
    expect(rendered).not.toContain('data-toc-runtime-id');
    expect(rendered).not.toContain('data-hydration-scope="about-toc"');
    expect(rendered).not.toContain('data-hydration-deferred="toc-trigger"');
    expect(rendered).not.toContain('data-toc-trigger-reserved');
    expect(rendered).not.toContain('<about-page');
    expect(rendered).not.toContain('<layout-sidebar');
    expect(rendered).not.toContain('<search-page');
  });
});
