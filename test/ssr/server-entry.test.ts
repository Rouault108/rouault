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

  it('ui-image を picture 契約で SSR 描画できること', async () => {
    const rendered = await renderCustomElement(
      'ui-image',
      [
        { name: 'src', value: '/media/hash/reading.jpg' },
        { name: 'sources', value: '[{"type":"image/avif","srcset":"/media/hash/reading.avif"}]' },
        { name: 'lightbox-src', value: '/media/hash/full.jpg' },
        {
          name: 'lightbox-sources',
          value: '[{"type":"image/avif","srcset":"/media/hash/full.avif"}]',
        },
        { name: 'alt', value: 'SSR Image' },
        { name: 'caption', value: 'caption' },
      ],
      '',
    );

    expect(rendered).toContain('shadowrootmode="open"');
    expect(rendered).toContain('<picture>');
    expect(rendered).toContain('/media/hash/reading.avif');
    expect(rendered).toContain('/media/hash/full.avif');
    expect(rendered).toContain('SSR Image');
  });

  it('ui-info-box を SSR 描画できること', async () => {
    const rendered = await renderCustomElement(
      'ui-info-box',
      [
        { name: 'heading', value: '補足情報' },
        { name: 'icon', value: 'book-open' },
        { name: 'heading-level', value: '2' },
        { name: 'landmark', value: '' },
      ],
      '<p>SSR Info Box Body</p>',
    );

    expect(rendered).toContain('shadowrootmode="open"');
    expect(rendered).toContain('補足情報');
    expect(rendered).toContain('SSR Info Box Body');
    expect(rendered).toContain('heading-level="2"');
  });

  it('ui-tag を SSR 描画できること', async () => {
    const rendered = await renderCustomElement(
      'ui-tag',
      [
        { name: 'href', value: '/tags/testing' },
        { name: 'removable', value: '' },
      ],
      'Testing',
    );

    expect(rendered).toContain('shadowrootmode="open"');
    expect(rendered).toContain('Testing');
    expect(rendered).toContain('/tags/testing');
    expect(rendered).toContain('削除');
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

  it('app-router に SSR 本文を渡して描画できること', async () => {
    const rendered = await renderCustomElement(
      'app-router',
      [],
      '<main><h1>SSR App Router</h1><p>Body</p></main>',
    );

    expect(rendered).toContain('SSR App Router');
    expect(rendered).toContain('main-content');
  });
});
