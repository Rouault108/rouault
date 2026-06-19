import { describe, expect, it } from 'vitest';
import { validateStaticHeaderHtmlFragment } from '../../build/navigation/static-header-parse5-validator.js';
import { renderLayoutHeaderHtml } from '../../src/layouts/layout-header-html.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import {
  STATIC_HEADER_CONTRACT_ACCEPTED_HTML,
  STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML,
  STATIC_HEADER_CONTRACT_REJECTED_CASES,
} from '../fixtures/static-header-contract-cases.js';

describe('static header parse5 validator', () => {
  it('runtime DOM validator と共有する accepted fixture を受け付けること', () => {
    expect(() =>
      validateStaticHeaderHtmlFragment(STATIC_HEADER_CONTRACT_ACCEPTED_HTML),
    ).not.toThrow();
    expect(() =>
      validateStaticHeaderHtmlFragment(STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML),
    ).not.toThrow();
  });

  it('static header menu hook を details fallback の semantics と escaped text hook として出力すること', () => {
    const html = renderLayoutHeaderHtml({
      noteLayout: true,
      sidebarEnabled: true,
      sidebarId: 'note-primary',
      tocPresence: 'absent',
      tocTriggerReserved: false,
      corpora: {
        schemaVersion: 1,
        source: 'corpus-navigation-projection',
        items: [
          {
            key: 'all',
            label: 'すべて "Alpha" & <Beta>',
            href: '/corpora/all/',
          },
        ],
      },
      currentCorpusKey: 'all',
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
      searchHref: '/search/',
    });

    expect(() => validateStaticHeaderHtmlFragment(html)).not.toThrow();
    expect(html).toContain('<details class="corpus-switcher" data-header-menu="corpus">');
    expect(html).toContain('<summary id="static-header-corpus-trigger"');
    expect(html).toContain('data-header-menu-trigger="true"');
    expect(html).toContain('data-header-menu-trigger-id="static-header-corpus-trigger"');
    expect(html).toContain('aria-controls="static-header-corpus-panel"');
    expect(html).toContain(
      'data-header-menu-text="すべて &quot;Alpha&quot; &amp; &lt;Beta&gt;"',
    );
    expect(html).toContain('<nav id="static-header-corpus-panel"');
    expect(html).toContain('data-header-menu-panel="true"');
    expect(html).toContain('data-header-menu-panel-id="static-header-corpus-panel"');
    expect(html).toContain('data-header-menu-item="true"');
    expect(html).toContain('<details class="theme-switcher"');
    expect(html).toContain('data-header-menu="theme"');
    expect(html).toContain('<summary id="static-header-theme-trigger"');
    expect(html).toContain('data-header-menu-trigger-id="static-header-theme-trigger"');
    expect(html).toContain('aria-controls="static-header-theme-panel"');
    expect(html).toContain('<div id="static-header-theme-panel" class="theme-switcher__menu" role="group"');
    expect(html).toContain('data-header-menu-panel-id="static-header-theme-panel"');
    expect(html).toContain('data-theme-value="system"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('role="menu"');
    expect(html).not.toContain('role="menuitem"');
    expect(html).not.toMatch(/\s(?:tabindex|hidden|inert)=/u);
  });

  it.each(STATIC_HEADER_CONTRACT_REJECTED_CASES)(
    'runtime DOM validator と共有する rejected fixture を拒否すること: $label',
    ({ html }) => {
      expect(() => validateStaticHeaderHtmlFragment(html)).toThrow();
    },
  );
});
