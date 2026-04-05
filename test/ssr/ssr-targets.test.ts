import { describe, expect, it } from 'vitest';

import { renderCustomElement } from '../../build/ssr/server-entry.js';
import { SSR_COMPONENT_DEFINITIONS } from '../../build/ssr/target-definitions.js';
import {
  SSR_NOTE_TARGET_TAGS,
  SSR_PAGE_TARGET_TAGS,
  SSR_TARGET_TAGS,
} from '../../build/ssr/targets.js';

const REQUIRED_NOTE_CONTENT_TAGS: readonly string[] = [
  'ui-checkbox',
  'ui-code-preview',
  'ui-preview-sandbox',
  'ui-details',
  'ui-score',
  'ui-tabs',
  'ui-translation',
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

  it('静的 code surface 化したため ui-code-block / ui-code-group を SSR target へ含めないこと', () => {
    const removedTags: readonly string[] = [
      'ui-code-block',
      'ui-code-group',
      'ui-callout',
      'ui-table',
      'ui-blockquote',
      'ui-info-box',
      'ui-image',
      'ui-footnote',
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

  it('独立ページ系 UI タグを page target に含めること', () => {
    expect(SSR_PAGE_TARGET_TAGS).toContain('search-page');
    expect(SSR_PAGE_TARGET_TAGS).toContain('tag-page');
    expect(SSR_PAGE_TARGET_TAGS).toContain('corpus-page');
    expect(SSR_PAGE_TARGET_TAGS).toContain('corpora-overview-page');
    expect(SSR_PAGE_TARGET_TAGS).toContain('not-found-page');
    expect(SSR_PAGE_TARGET_TAGS).not.toContain('about-page');
  });

  it('layout-toc の SSR が Node 環境で HTMLElement を参照せずに完了すること', async () => {
    const rendered = await renderCustomElement(
      'layout-toc',
      [
        { name: 'headings-json', value: '[{"id":"intro","text":"Intro","level":2}]' },
        {
          name: 'capabilities-json',
          value: '{"activeTracking":false,"dynamicScopes":false,"mobileSummary":false}',
        },
        { name: 'content-root-id', value: 'note-content-intro' },
        { name: 'data-hydration-trigger', value: '' },
      ],
      '',
    );

    expect(rendered).toContain('<layout-toc');
  });
});