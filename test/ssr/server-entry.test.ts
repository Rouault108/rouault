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

  it('app-router は raw content を canonical main に包んで SSR 描画すること', async () => {
    const rendered = await renderCustomElement('app-router', [], '<h1>SSR App Router</h1><p>Body</p>');

    expect(rendered).toContain('data-app-router-announcement');
    expect(rendered).toContain('<main id="main-content" tabindex="-1"><h1>SSR App Router</h1><p>Body</p></main>');
  });

  it('app-router は既存 canonical main の属性を保持したまま strict 化すること', async () => {
    const rendered = await renderCustomElement(
      'app-router',
      [],
      '<main id="main-content" class="page-body" data-view="article" aria-label="本文"><h1>SSR App Router</h1></main>',
    );

    expect(rendered).toContain('<main id="main-content"');
    expect(rendered).toContain('class="page-body"');
    expect(rendered).toContain('data-view="article"');
    expect(rendered).toContain('aria-label="本文"');
    expect(rendered).toContain('tabindex="-1"');
  });

  it('app-router SSR が sidebar host を保持し sibling 順序も維持すること', async () => {
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
    expect(rendered).toContain('<main id="main-content" tabindex="-1"><h1>SSR App Router</h1></main>');
    expect(rendered).toContain('data-app-router-announcement');
    expect(rendered.indexOf('data-app-shell-sidebar-host')).toBeLessThan(
      rendered.indexOf('<main id="main-content" tabindex="-1">'),
    );
  });

  it('app-router は announcement region を再利用して重複生成しないこと', async () => {
    const rendered = await renderCustomElement(
      'app-router',
      [],
      [
        '<div data-app-router-announcement="" aria-live="polite" aria-atomic="true" class="sr-only"></div>',
        '<main id="main-content"><h1>SSR App Router</h1></main>',
      ].join(''),
    );

    expect(rendered.match(/data-app-router-announcement/g)?.length ?? 0).toBe(1);
  });

  it('app-router は bare main を strict contract violation として拒否すること', async () => {
    await expect(
      renderCustomElement(
        'app-router',
        [],
        '<main><h1>SSR App Router</h1><p>Body</p></main>',
      ),
    ).rejects.toThrow(/id="main-content"/);
  });

  it('app-router は direct child の main が複数ある場合に失敗すること', async () => {
    await expect(
      renderCustomElement(
        'app-router',
        [],
        '<main><h1>First</h1></main><main><h1>Second</h1></main>',
      ),
    ).rejects.toThrow(/direct child の <main>/);
  });

  it('app-router は announcement region が複数ある場合に失敗すること', async () => {
    await expect(
      renderCustomElement(
        'app-router',
        [],
        [
          '<div data-app-router-announcement="" aria-live="polite"></div>',
          '<div data-app-router-announcement="" aria-live="polite"></div>',
          '<main><h1>Body</h1></main>',
        ].join(''),
      ),
    ).rejects.toThrow(/announcement region/);
  });
});
