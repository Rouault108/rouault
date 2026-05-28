import { describe, expect, it } from 'vitest';

import { renderCustomElement } from '../../build/ssr/server-entry.js';
import { SSR_COMPONENT_DEFINITIONS } from '../../build/ssr/target-definitions.js';
import {
  SSR_LAYOUT_TARGET_TAGS,
  SSR_NOTE_TARGET_TAGS,
  SSR_PAGE_TARGET_TAGS,
  SSR_TARGET_TAGS,
} from '../../build/ssr/targets.js';

const REQUIRED_NOTE_CONTENT_TAGS: readonly string[] = [
  'ui-code-preview',
  'ui-preview-sandbox',
  'ui-tabs',
  'ui-translation',
  'ui-video',
] as const;

describe('component manifest / ssr targets', () => {
  it('component manifest の tag が重複しないこと', () => {
    const tags = SSR_COMPONENT_DEFINITIONS.map(
      (definition: (typeof SSR_COMPONENT_DEFINITIONS)[number]) => definition.tag,
    );
    expect(tags).toEqual([...new Set(tags)]);
  });

  it('ノート本文由来の UI タグを note target に含めること', () => {
    for (const tagName of REQUIRED_NOTE_CONTENT_TAGS) {
      expect(SSR_NOTE_TARGET_TAGS).toContain(tagName);
    }
  });

  it('SSR target 全体に note target を含めること', () => {
    for (const tagName of REQUIRED_NOTE_CONTENT_TAGS) {
      expect(SSR_TARGET_TAGS).toContain(tagName);
    }
  });

  it('layout component は note target ではなく layout target に分離すること', () => {
    expect(SSR_LAYOUT_TARGET_TAGS).toContain('layout-toc');
    expect(SSR_LAYOUT_TARGET_TAGS).toContain('layout-sidebar');
    expect(SSR_NOTE_TARGET_TAGS).not.toContain('layout-toc');
    expect(SSR_NOTE_TARGET_TAGS).not.toContain('layout-sidebar');
  });

  it('静的 HTML 化したノート本文タグを SSR target へ含めないこと', () => {
    const removedTags: readonly string[] = [
      'ui-code-block',
      'ui-code-group',
      'ui-checkbox',
      'ui-callout',
      'ui-table',
      'ui-blockquote',
      'ui-info-box',
      'ui-image',
      'ui-footnote',
      'ui-details',
      'ui-score',
      'ui-syntax-card',
      'ui-syntax-section',
      'ui-syntax-field',
    ];

    expect(
      SSR_COMPONENT_DEFINITIONS.some((definition: (typeof SSR_COMPONENT_DEFINITIONS)[number]) =>
        removedTags.includes(definition.tag),
      ),
    ).toBe(false);

    for (const tagName of removedTags) {
      expect(SSR_NOTE_TARGET_TAGS).not.toContain(tagName);
      expect(SSR_TARGET_TAGS).not.toContain(tagName);
    }
  });

  it('静的 HTML 化した独立ページ系 UI タグを page target に含めないこと', () => {
    const removedTags: readonly string[] = [
      'search-page',
      'tag-page',
      'corpus-page',
      'corpora-overview-page',
      'not-found-page',
      'about-page',
    ];

    for (const tagName of removedTags) {
      expect([...SSR_PAGE_TARGET_TAGS]).not.toContain(tagName);
      expect([...SSR_TARGET_TAGS]).not.toContain(tagName);
      expect(
        SSR_COMPONENT_DEFINITIONS.some((definition) => String(definition.tag) === tagName),
      ).toBe(false);
    }
  });

  it('layout-toc の SSR が Node 環境で HTMLElement を参照せずに完了すること', async () => {
    const rendered = await renderCustomElement(
      'layout-toc',
      [
        { name: 'headings-json', value: '[{"id":"intro","text":"Intro","level":2}]' },
        {
          name: 'capabilities-json',
          value: '{"activeTracking":false,"dynamicScopes":false,"mobilePanel":false}',
        },
        { name: 'content-root-id', value: 'note-content-intro' },
        { name: 'data-hydration-trigger', value: '' },
      ],
      '',
    );

    expect(rendered).toContain('<layout-toc');
  });
});
