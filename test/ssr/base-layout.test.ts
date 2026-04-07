import { describe, expect, it } from 'vitest';

import { BaseLayout } from '../../src/layouts/BaseLayout.11ty.js';
import { loadBuildMetadataData } from '../../src/data/buildMetadata.js';

describe('BaseLayout', () => {
  it('reader note では header に sidebar-enabled を出力すること', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'reader-note',
        title: 'Reader Note',
        permalink: '/notes/reader-note',
        noteKind: 'leaf',
        kind: 'reader',
      },
    });

    expect(rendered).toContain('<layout-header note-layout sidebar-enabled');
  });

  it('testing note では header に sidebar-enabled を出力しないこと', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'testing-note',
        title: 'Testing Note',
        permalink: '/notes/testing-note',
        noteKind: 'leaf',
        kind: 'testing',
      },
    });

    expect(rendered).toContain('<layout-header note-layout');
    expect(rendered).not.toContain('<layout-header note-layout sidebar-enabled');
  });

  it('breadcrumb 規則を note navigation model から受け取ること', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'computer-science/algorithms/sorting',
        title: 'ソートアルゴリズム比較',
        permalink: '/notes/computer-science/algorithms/sorting',
        noteKind: 'leaf',
      },
      notes: [
        {
          slug: 'computer-science',
          title: '計算機科学',
          permalink: '/notes/computer-science',
          noteKind: 'directory-index',
          directoryPath: 'computer-science',
        },
        {
          slug: 'computer-science/algorithms',
          title: 'アルゴリズム',
          permalink: '/notes/computer-science/algorithms',
          noteKind: 'directory-index',
          directoryPath: 'computer-science/algorithms',
        },
      ],
    });

    expect(rendered).toContain(
      'breadcrumbs-json="[{&quot;label&quot;:&quot;Notes&quot;,&quot;href&quot;:&quot;/&quot;},{&quot;label&quot;:&quot;計算機科学&quot;,&quot;href&quot;:&quot;/notes/computer-science&quot;},{&quot;label&quot;:&quot;アルゴリズム&quot;,&quot;href&quot;:&quot;/notes/computer-science/algorithms&quot;},{&quot;label&quot;:&quot;ソートアルゴリズム比較&quot;}]"',
    );
  });

  it('app shell の骨格として skip link / app root / main / footer を出力すること', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<article><h1>本文</h1><p>静かな本文です。</p></article>',
    });

    expect(rendered).toContain('<ui-skip-link');
    expect(rendered).toContain('href="#main-content"');
    expect(rendered).toContain('label="メインコンテンツへ移動"');
    expect(rendered).toContain('data-hydration-scope="skip-link"');

    expect(rendered).toContain('<div id="app" class="app-root" data-hydration-scope="app-shell">');
    expect(rendered).toContain('<layout-header');
    expect(rendered).toContain('<app-router');
    expect(rendered).toContain('<main id="main-content" tabindex="-1">');
    expect(rendered).toContain(
      '<layout-footer data-hydration-capability="static" data-hydration-trigger="initial"></layout-footer>',
    );
  });

  it('footer を shell hydration の初期計画へ含めること', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
    });

    expect(rendered).toContain('data-hydration-capability="static"');
    expect(rendered).toContain('data-hydration-trigger="initial"');
    expect(rendered).toContain(
      '<layout-footer data-hydration-capability="static" data-hydration-trigger="initial"></layout-footer>',
    );
  });

  it('buildMetadata の buildLabel を footer 属性へ流し込むこと', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      buildMetadata: loadBuildMetadataData('abcdef1'),
    });

    expect(rendered).toContain(
      '<layout-footer build-label="build abcdef1" data-hydration-capability="static" data-hydration-trigger="initial"></layout-footer>',
    );
  });
});