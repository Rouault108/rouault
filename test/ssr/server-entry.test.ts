import { describe, expect, it } from 'vitest';

import { collectDocumentStylesForTags, renderCustomElement } from '../../build/ssr/server-entry.js';

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

  it('note 本文 static-first 化により ui-image / ui-footnote を SSR target として要求しないこと', () => {
    const styles = collectDocumentStylesForTags(['ui-highlight']);

    expect(styles.some((style) => style.id === 'ui-image-styles')).toBe(false);
    expect(styles.some((style) => style.id === 'ui-footnote-document-styles')).toBe(false);
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

    expect(rendered).toContain('not-found-page');
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

  it('ui-article-header に breadcrumbs-json がある場合、SSR 時にパンくずを描画できること', async () => {
    const rendered = await renderCustomElement(
      'ui-article-header',
      [
        { name: 'heading', value: 'SSR Article Header' },
        {
          name: 'breadcrumbs-json',
          value:
            '[{"label":"Notes","href":"/"},{"label":"Program","href":"/notes/program"},{"label":"JavaScriptの配列"}]',
        },
      ],
      '',
    );

    expect(rendered).toContain('shadowrootmode="open"');
    expect(rendered).toContain('items-json="[{&quot;label&quot;:&quot;Notes&quot;');
    expect(rendered).toContain('aria-label="現在の階層"');
    expect(rendered).toContain('JavaScriptの配列');
  });

  it('app-router に SSR 本文を渡して描画できること', async () => {
    const rendered = await renderCustomElement(
      'app-router',
      [],
      '<main><h1>SSR App Router</h1><p>Body</p></main>',
    );

    expect(rendered).toContain('SSR App Router');
    expect(rendered).toContain('<main><h1>SSR App Router</h1><p>Body</p></main>');
    expect(rendered).toContain('data-app-router-announcement');
    expect(rendered).not.toContain('id="main-content"');
  });

  it('app-router SSR が sidebar host を保持すること', async () => {
    const rendered = await renderCustomElement(
      'app-router',
      [{ name: 'data-sidebar-presence', value: 'present' }],
      `
        <aside class="layout-sidebar-col" data-app-shell-sidebar-host>
          <layout-sidebar heading="Navigation"></layout-sidebar>
        </aside>
        <main id="main-content"><h1>SSR App Router</h1></main>
      `.trim(),
    );

    expect(rendered).toContain('data-app-shell-sidebar-host');
    expect(rendered).toContain('<layout-sidebar heading="Navigation">');
    expect(rendered).toContain('<main id="main-content"><h1>SSR App Router</h1></main>');
    expect(rendered).toContain('data-app-router-announcement');
  });
});
