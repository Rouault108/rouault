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
  'ui-syntax-card',
  'ui-syntax-section',
  'ui-syntax-field',
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

  it('syntax-card family を SSR component definitions に登録すること', () => {
    const syntaxCardDefinition = SSR_COMPONENT_DEFINITIONS.find(
      (definition: (typeof SSR_COMPONENT_DEFINITIONS)[number]) =>
        definition.tag === 'ui-syntax-card',
    );
    const syntaxSectionDefinition = SSR_COMPONENT_DEFINITIONS.find(
      (definition: (typeof SSR_COMPONENT_DEFINITIONS)[number]) =>
        definition.tag === 'ui-syntax-section',
    );
    const syntaxFieldDefinition = SSR_COMPONENT_DEFINITIONS.find(
      (definition: (typeof SSR_COMPONENT_DEFINITIONS)[number]) =>
        definition.tag === 'ui-syntax-field',
    );

    expect(syntaxCardDefinition).toBeDefined();
    expect(syntaxCardDefinition?.profiles).toContain('note');
    expect(syntaxCardDefinition?.ssr).toBe('light');
    expect(syntaxCardDefinition?.adapterKind).toBe('light-host-passthrough');

    expect(syntaxSectionDefinition).toBeDefined();
    expect(syntaxSectionDefinition?.profiles).toContain('note');
    expect(syntaxSectionDefinition?.ssr).toBe('light');
    expect(syntaxSectionDefinition?.adapterKind).toBe('light-host-passthrough');

    expect(syntaxFieldDefinition).toBeDefined();
    expect(syntaxFieldDefinition?.profiles).toContain('note');
    expect(syntaxFieldDefinition?.ssr).toBe('light');
    expect(syntaxFieldDefinition?.adapterKind).toBe('light-host-passthrough');
    expect(syntaxFieldDefinition?.documentStyle?.id).toBe('ui-syntax-field-document-styles');
    expect(syntaxFieldDefinition?.documentStyle?.cssText).toContain('ui-syntax-field');
  });

  it('syntax-card family の SSR が host と light DOM children を保つこと', async () => {
    const cardRendered = await renderCustomElement(
      'ui-syntax-card',
      [
        { name: 'kind', value: 'Method' },
        { name: 'name', value: 'useEffect' },
      ],
      '<pre slot="signature">function useEffect(): void</pre><ui-syntax-section label="概要"><p>説明です。</p></ui-syntax-section>',
    );
    const rendered = await renderCustomElement(
      'ui-syntax-field',
      [
        { name: 'name', value: 'effect' },
        { name: 'type', value: '() => void' },
        { name: 'required', value: '' },
      ],
      '<p>副作用本体です。</p>',
    );

    expect(cardRendered).toContain('<ui-syntax-card');
    expect(cardRendered).not.toContain('shadowrootmode="open"');
    expect(cardRendered).toContain('<ui-syntax-section');

    expect(rendered).toContain('<ui-syntax-field');
    expect(rendered).not.toContain('shadowrootmode="open"');
    expect(rendered).toContain('副作用本体です。');
  });

  it('ui-syntax-card の SSR passthrough が plain pre signature を保持すること', async () => {
    const rendered = await renderCustomElement(
      'ui-syntax-card',
      [
        { name: 'kind', value: 'Method' },
        { name: 'name', value: 'useEffect' },
        { name: 'data-lang', value: 'ts' },
        { name: 'heading-level', value: '3' },
      ],
      [
        '<pre slot="signature" data-syntax-signature="true">function useEffect(): void</pre>',
        '<ui-syntax-section label="戻り値"><p>void。</p></ui-syntax-section>',
      ].join(''),
    );

    expect(rendered).toContain('<ui-syntax-card');
    expect(rendered).not.toContain('shadowrootmode="open"');
    expect(rendered).toContain('slot="signature"');
    expect(rendered).toContain('data-syntax-signature="true"');
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
    const removedStaticFallbackTag = 'not-found-page';

    expect(SSR_PAGE_TARGET_TAGS).toContain('search-page');
    expect(SSR_PAGE_TARGET_TAGS).toContain('tag-page');
    expect(SSR_PAGE_TARGET_TAGS).toContain('corpus-page');
    expect(SSR_PAGE_TARGET_TAGS).toContain('corpora-overview-page');
    expect([...SSR_PAGE_TARGET_TAGS]).not.toContain(removedStaticFallbackTag);
    expect([...SSR_TARGET_TAGS]).not.toContain(removedStaticFallbackTag);
    expect(
      SSR_COMPONENT_DEFINITIONS.some(
        (definition) => String(definition.tag) === removedStaticFallbackTag,
      ),
    ).toBe(false);
    expect(SSR_PAGE_TARGET_TAGS).not.toContain('about-page');
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
