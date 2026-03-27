import { describe, expect, it } from 'vitest';

import { collectDocumentStylesForTags, renderCustomElement } from '../../src/ssr/server-entry.js';

describe('server-entry', () => {
  it('ui-highlight の document style を収集できること', () => {
    const styles = collectDocumentStylesForTags(['ui-highlight']);
    const highlightStyle = styles.find((style) => style.id === 'ui-highlight-styles');

    expect(highlightStyle).toBeDefined();
    expect(highlightStyle?.cssText).toContain('ui-highlight > mark');
  });

  it('ui-card の link mode を SSR 描画できること', async () => {
    const rendered = await renderCustomElement(
      'ui-card',
      [
        { name: 'card-kind', value: 'link' },
        { name: 'href', value: 'https://example.com/article' },
        { name: 'card-title', value: 'SSR Link Card' },
        { name: 'description', value: 'SSR description' },
        { name: 'site-name', value: 'Example' },
      ],
      '',
    );

    expect(rendered).toContain('shadowrootmode="open"');
    expect(rendered).toContain('SSR Link Card');
    expect(rendered).toContain('https://example.com/article');
  });

  it('not-found-page を SSR 描画できること', async () => {
    const rendered = await renderCustomElement(
      'not-found-page',
      [{ name: 'requested-path', value: '/notes/does-not-exist' }],
      '',
    );

    expect(rendered).toContain('shadowrootmode="open"');
    expect(rendered).toContain('このページは見つかりませんでした');
    expect(rendered).toContain('/notes/does-not-exist');
  });

  it('ui-article-header に data-tags がある場合、SSR 時にタグを描画できること', async () => {
    const rendered = await renderCustomElement(
      'ui-article-header',
      [
        { name: 'heading', value: 'SSR Article Header' },
        { name: 'published', value: '2026-02-01' },
        { name: 'data-tags', value: '["music","classical"]' },
      ],
      '',
    );

    expect(rendered).toContain('shadowrootmode="open"');
    expect(rendered).toContain('SSR Article Header');
    expect(rendered).toContain('music');
    expect(rendered).toContain('classical');
    expect(rendered).toContain('data-tags="[');
  });
});
