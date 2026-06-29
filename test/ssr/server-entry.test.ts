import { describe, expect, it } from 'vitest';

import { collectDocumentStylesForTags, renderCustomElement } from '../../build/ssr/server-entry.js';

describe('server-entry', () => {
  it('static-first 化した ui-card を SSR target として扱わないこと', async () => {
    await expect(renderCustomElement('ui-card' as never, [], '')).rejects.toThrow(
      /Unknown SSR target/u,
    );
  });

  it('note 本文 static-first 化により ui-image / ui-footnote を SSR target として要求しないこと', () => {
    const styles = collectDocumentStylesForTags([]);

    expect(styles.some((style) => style.id === 'ui-image-styles')).toBe(false);
    expect(styles.some((style) => style.id === 'ui-footnote-document-styles')).toBe(false);
  });

  it('ui-translation は Light DOM children を保持し declarative shadow DOM を生成しないこと', async () => {
    const rendered = await renderCustomElement(
      'ui-translation',
      [
        { name: 'lang', value: 'fr' },
        { name: 'target-lang', value: 'ja' },
        { name: 'original', value: 'Je pense, donc je suis.' },
        { name: 'translated', value: '我思う、ゆえに我あり。' },
        { name: 'surface', value: 'drawer' },
      ],
      [
        '<details class="translation-overlay-fallback" data-translation-fallback>',
        '<summary data-translation-fallback-trigger lang="fr">Je pense, donc je suis.</summary>',
        '<p data-translation-fallback-content lang="ja">我思う、ゆえに我あり。</p>',
        '</details>',
      ].join(''),
    );

    expect(rendered).toContain('<ui-translation');
    expect(rendered).toContain('data-translation-fallback');
    expect(rendered).toContain('data-translation-fallback-trigger');
    expect(rendered).toContain('data-translation-fallback-content');
    expect(rendered).not.toContain('shadowrootmode');
    expect(rendered).not.toContain('<template');
  });

  it('app-router は main#main-content を持たない raw content を strict contract violation として拒否すること', async () => {
    await expect(
      renderCustomElement('app-router', [], '<h1>SSR App Router</h1><p>Body</p>'),
    ).rejects.toThrow(/main#main-content/);
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
    expect(rendered).toContain(
      '<main id="main-content" tabindex="-1"><h1>SSR App Router</h1></main>',
    );
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

  it('app-router は generic aria-live 領域を announcement fallback として再利用しないこと', async () => {
    const rendered = await renderCustomElement(
      'app-router',
      [],
      [
        '<div aria-live="polite" aria-atomic="true" class="sr-only">generic</div>',
        '<main id="main-content"><h1>SSR App Router</h1></main>',
      ].join(''),
    );

    expect(rendered.match(/data-app-router-announcement/g)?.length ?? 0).toBe(1);
    expect(rendered).toContain(
      '<div aria-live="polite" aria-atomic="true" class="sr-only">generic</div>',
    );
  });

  it('layout-sidebar は app-router 内でも shadow SSR を持たず light DOM host のまま保持されること', async () => {
    const rendered = await renderCustomElement(
      'app-router',
      [],
      `
        <aside class="layout-sidebar-col" data-app-shell-sidebar-host>
          <layout-sidebar heading="Navigation">
            <nav data-sidebar-nav aria-label="Navigation"></nav>
          </layout-sidebar>
        </aside>
        <main id="main-content"><h1>SSR App Router</h1></main>
      `.trim(),
    );

    expect(rendered).toContain('<layout-sidebar heading="Navigation">');
    expect(rendered).toContain('<nav data-sidebar-nav="" aria-label="Navigation"></nav>');
    expect(rendered).not.toContain('shadowrootmode="open"');
    expect(rendered).not.toMatch(/<layout-sidebar[\s\S]*?<template\s+shadowroot(?:mode)?=/);
  });

  it('app-router は bare main を strict contract violation として拒否すること', async () => {
    await expect(
      renderCustomElement('app-router', [], '<main><h1>SSR App Router</h1><p>Body</p></main>'),
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
