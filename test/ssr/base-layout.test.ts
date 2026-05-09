import { describe, expect, it } from 'vitest';

import { BaseLayout } from '../../src/layouts/BaseLayout.11ty.js';
import { loadBuildMetadataData } from '../../src/data/buildMetadata.js';

const getBodyTag = (html: string): string => html.match(/<body[^>]*>/u)?.[0] ?? '';

describe('BaseLayout', () => {
  it('page title が未指定の場合は site title のみを出力すること', () => {
    const rendered = new BaseLayout().render({
      content: '<p>Home</p>',
    });

    expect(rendered).toContain('<title>Rouault</title>');
    expect(rendered).not.toContain('<title>Rouault - Rouault</title>');
  });

  it('page title が site title と同一の場合は重複させないこと', () => {
    const rendered = new BaseLayout().render({
      title: 'Rouault',
      content: '<p>Home</p>',
    });

    expect(rendered).toContain('<title>Rouault</title>');
    expect(rendered).not.toContain('<title>Rouault - Rouault</title>');
  });

  it('page title が site title の重複済み文書タイトルの場合は site title に正規化すること', () => {
    const rendered = new BaseLayout().render({
      title: 'Rouault - Rouault',
      content: '<p>Home</p>',
    });

    expect(rendered).toContain('<title>Rouault</title>');
    expect(rendered).not.toContain('<title>Rouault - Rouault</title>');
  });

  it('page title が site title と異なる場合は site title を接尾辞として付けること', () => {
    const rendered = new BaseLayout().render({
      title: 'このサイトについて',
      content: '<p>About</p>',
    });

    expect(rendered).toContain('<title>このサイトについて - Rouault</title>');
  });

  it('page title がすでに文書タイトル化済みの場合は再接尾辞化しないこと', () => {
    const rendered = new BaseLayout().render({
      title: 'このサイトについて - Rouault',
      content: '<p>About</p>',
    });

    expect(rendered).toContain('<title>このサイトについて - Rouault</title>');
    expect(rendered).not.toContain('このサイトについて - Rouault - Rouault');
  });

  it('page title が重複済み文書タイトルの場合は単一接尾辞に正規化すること', () => {
    const rendered = new BaseLayout().render({
      title: 'このサイトについて - Rouault - Rouault',
      content: '<p>About</p>',
    });

    expect(rendered).toContain('<title>このサイトについて - Rouault</title>');
    expect(rendered).not.toContain('このサイトについて - Rouault - Rouault');
  });

  it('page title を HTML text として escape してから title 要素へ出力すること', () => {
    const rendered = new BaseLayout().render({
      title: 'A & B <C>',
      content: '<p>Escaped</p>',
    });

    expect(rendered).toContain('<title>A &amp; B &lt;C&gt; - Rouault</title>');
    expect(rendered).not.toContain('<title>A & B <C> - Rouault</title>');
  });

  it('reader note では header に sidebar-enabled を出力し、既定 heading を注入しないこと', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      notePage: {
        noteKind: 'reader',
        noteShellSidebarPresence: 'present',
        tocPresence: 'absent',
        showSidebar: true,
        contentHtml: '<p>本文</p>',
        sidebar: {
          stateScopeId: 'note-navigation',
          selectedId: 'reader-note',
          initialExpandedIds: [],
          topologyRevision: 'reader-note-topology',
          navHtml:
            '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="reader-note-topology"><ul><li data-node-id="reader-note" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/reader-note" aria-current="page"><span data-sidebar-nav-label>Reader Note</span></a></li></ul></nav>',
          heading: null,
          fixedBreakpoint: '1024',
        },
        toc: {
          sourceId: 'toc-source-reader-note',
          runtimeId: 'toc-source-reader-note',
          ownerId: 'toc-owner-reader-note',
          scopeId: 'note-toc',
          headings: [],
          capabilities: {
            activeTracking: false,
            dynamicScopes: false,
            mobilePanel: false,
          },
          contentRootId: 'note-content-reader-note',
          homeHref: '/',
          shouldHydrate: false,
        },
        articleHeader: {
          heading: 'Reader Note',
          genres: [],
        },
        pagefind: null,
      },
      note: {
        slug: 'reader-note',
        title: 'Reader Note',
        permalink: '/notes/reader-note',
        noteKind: 'leaf',
        kind: 'reader',
      },
    });

    expect(rendered).toContain('<layout-header note-layout sidebar-enabled');
    expect(rendered).toContain('toc-presence="absent"');
    expect(rendered).toContain('toc-runtime-id=""');
    expect(rendered).toContain('toc-trigger-reserved="false"');
    expect(rendered).toContain('initial-expanded-ids="[]"');
    expect(rendered).toContain('topology-revision="reader-note-topology"');
    expect(rendered).toContain('<nav data-sidebar-nav');
    expect(rendered).toContain('data-sidebar-boot-state="ssr"');
    expect(rendered).not.toContain('heading="ナビゲーション"');
  });

  it('TOC present note では header trigger reservation を interactive state とは別に出力すること', () => {
    const rendered = new BaseLayout().render({
      content: '<article>Reader</article>',
      note: {
        slug: 'reader-with-toc',
        title: 'Reader with TOC',
        permalink: '/notes/reader-with-toc',
        noteKind: 'leaf',
        kind: 'reader',
      },
      notePage: {
        noteKind: 'reader',
        noteShellSidebarPresence: 'absent',
        tocPresence: 'present',
        showSidebar: false,
        contentHtml: '<article>Reader</article>',
        toc: {
          sourceId: 'toc-source-reader-with-toc',
          runtimeId: 'toc-source-reader-with-toc',
          ownerId: 'toc-owner-reader-with-toc',
          scopeId: 'note-toc',
          headings: [
            {
              id: 'intro',
              text: 'Intro',
              level: 2,
            },
          ],
          capabilities: {
            activeTracking: true,
            dynamicScopes: false,
            mobilePanel: true,
          },
          contentRootId: 'note-content-reader-with-toc',
          homeHref: '/',
          shouldHydrate: true,
        },
        articleHeader: {
          heading: 'Reader with TOC',
          genres: [],
        },
        pagefind: null,
      },
    });

    expect(rendered).toContain('toc-presence="present"');
    expect(rendered).toContain('toc-runtime-id="toc-source-reader-with-toc"');
    expect(rendered).toContain('toc-trigger-reserved="true"');
    expect(rendered).toContain('data-toc-owner-id="toc-owner-reader-with-toc"');
    expect(rendered.match(/<layout-header\b[^>]*>/u)?.[0] ?? '').not.toContain(
      'data-toc-trigger-reserved',
    );
  });

  it('body pagefind ignore は notePage.pagefind を正本にすること', () => {
    const rendered = new BaseLayout().render({
      content: '<article>Fixture</article>',
      note: {
        slug: 'fixture-reader',
        title: 'Fixture Reader',
        permalink: '/notes/fixture-reader',
        noteKind: 'leaf',
        kind: 'reader',
      },
      notePage: {
        noteKind: 'reader',
        noteShellSidebarPresence: 'absent',
        tocPresence: 'absent',
        showSidebar: false,
        contentHtml: '<article>Fixture</article>',
        toc: {
          sourceId: 'toc-source-fixture-reader',
          runtimeId: 'toc-source-fixture-reader',
          ownerId: 'toc-owner-fixture-reader',
          scopeId: 'note-toc',
          headings: [],
          capabilities: {
            activeTracking: false,
            dynamicScopes: false,
            mobilePanel: false,
          },
          contentRootId: 'note-content-fixture-reader',
          homeHref: '/',
          shouldHydrate: false,
        },
        articleHeader: {
          heading: 'Fixture Reader',
          genres: [],
        },
        pagefind: null,
      },
    });

    expect(getBodyTag(rendered)).toContain('data-pagefind-ignore');
  });

  it('note data があるのに notePage projection がない場合は body を Pagefind 除外にすること', () => {
    const rendered = new BaseLayout().render({
      content: '<article>Broken note input</article>',
      note: {
        slug: 'broken-note-input',
        title: 'Broken note input',
        permalink: '/notes/broken-note-input',
        noteKind: 'leaf',
        kind: 'reader',
      },
    });

    expect(getBodyTag(rendered)).toContain('data-pagefind-ignore');
  });

  it('notePage.pagefind がある場合は body に Pagefind 除外を出さないこと', () => {
    const rendered = new BaseLayout().render({
      content: '<article>Reader</article>',
      note: {
        slug: 'reader',
        title: 'Reader',
        permalink: '/notes/reader',
        noteKind: 'leaf',
        kind: 'reader',
      },
      notePage: {
        noteKind: 'reader',
        noteShellSidebarPresence: 'absent',
        tocPresence: 'absent',
        showSidebar: false,
        contentHtml: '<article>Reader</article>',
        toc: {
          sourceId: 'toc-source-reader',
          runtimeId: 'toc-source-reader',
          ownerId: 'toc-owner-reader',
          scopeId: 'note-toc',
          headings: [],
          capabilities: {
            activeTracking: false,
            dynamicScopes: false,
            mobilePanel: false,
          },
          contentRootId: 'note-content-reader',
          homeHref: '/',
          shouldHydrate: false,
        },
        articleHeader: {
          heading: 'Reader',
          genres: [],
        },
        pagefind: {
          sortDate: '2026-04-25',
          title: 'Reader',
          tokenizedTitle: 'Reader',
          description: '',
          tokenizedDescription: '',
          date: '2026-04-25',
          tags: [],
        },
      },
    });

    expect(getBodyTag(rendered)).not.toContain('data-pagefind-ignore');
  });

  it('testing note でも chromeProfile=reader なら header に sidebar-enabled を出力すること', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'testing-note',
        title: 'Testing Note',
        permalink: '/notes/testing-note',
        noteKind: 'leaf',
        kind: 'testing',
        chromeProfile: 'reader',
      },
    });

    expect(rendered).toContain('<layout-header note-layout sidebar-enabled');
  });

  it('testing note かつ chromeProfile=plain では header に sidebar-enabled を出力しないこと', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'testing-note',
        title: 'Testing Note',
        permalink: '/notes/testing-note',
        noteKind: 'leaf',
        kind: 'testing',
        chromeProfile: 'plain',
      },
    });

    expect(rendered).toContain('<layout-header note-layout');
    expect(rendered).toContain('toc-presence="absent"');
    expect(rendered).toContain('toc-runtime-id=""');
    expect(rendered).not.toContain('<layout-header note-layout sidebar-enabled');
  });

  it('BaseLayout は layout-header へ breadcrumbs-json を出力しないこと', () => {
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
      currentCorpusKey: 'all',
    });

    expect(rendered).toContain('<layout-header note-layout');
    expect(rendered).toContain('corpora-json=');
    expect(rendered).toContain('current-corpus-key="all"');
    expect(rendered).not.toContain('breadcrumbs-json=');
  });

  it('app shell の骨格として skip link / app root / main / footer を出力すること', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<article><h1>本文</h1><p>静かな本文です。</p></article>',
    });

    const skipLinkHtml = '<a class="skip-link" href="#main-content">メインコンテンツへ移動</a>';
    const skipLinkIndex = rendered.indexOf(skipLinkHtml);
    const appRootIndex = rendered.indexOf('<div id="app" class="app-root"');
    const renderedSkipLinkHtml = rendered.slice(
      skipLinkIndex,
      rendered.indexOf('</a>', skipLinkIndex) + 4,
    );

    expect(rendered).toContain(skipLinkHtml);
    expect(rendered).not.toContain('<ui-skip-link');
    expect(
      rendered.match(/<a class="skip-link" href="#main-content">メインコンテンツへ移動<\/a>/g)
        ?.length ?? 0,
    ).to.equal(1);
    expect(skipLinkIndex).toBeGreaterThanOrEqual(0);
    expect(appRootIndex).toBeGreaterThanOrEqual(0);
    expect(skipLinkIndex).toBeLessThan(appRootIndex);
    expect(renderedSkipLinkHtml).not.toContain('data-hydration-');

    expect(rendered).toContain('<div id="app" class="app-root" data-hydration-scope="app-shell"');
    expect(rendered).toContain('data-hydration-marker="reading-shell"');
    expect(rendered).toContain('<layout-header');
    expect(rendered).toContain('<app-router');
    expect(rendered).toContain('data-app-shell-sidebar-overlay-layer');
    expect(rendered).toContain('data-app-router-announcement');
    expect(rendered).toContain('aria-live="polite"');
    expect(rendered).toContain('aria-atomic="true"');
    expect(rendered).toContain('class="sr-only"');
    expect(rendered).toContain('<main id="main-content" tabindex="-1">');
    expect(rendered).toContain(
      '<layout-footer data-hydration-capability="static" data-hydration-trigger="initial"></layout-footer>',
    );
  });

  it('app shell sidebar host と overlay layer を単一実体として出力すること', () => {
    const rendered = new BaseLayout().render({
      content: '<article><h1>本文</h1></article>',
    });

    expect(rendered.match(/data-app-shell-sidebar-host/g)?.length ?? 0).to.equal(1);
    expect(rendered.match(/<layout-sidebar\b/g)?.length ?? 0).to.equal(1);
    expect(rendered.match(/data-app-shell-sidebar-overlay-layer/g)?.length ?? 0).to.equal(1);
  });

  it('sidebar absent でも app shell structure を維持し host を hidden にすること', () => {
    const rendered = new BaseLayout().render({
      content: '<article><h1>本文</h1></article>',
      notePage: {
        noteKind: 'testing',
        noteShellSidebarPresence: 'absent',
        tocPresence: 'absent',
        showSidebar: false,
        contentHtml: '<article><h1>本文</h1></article>',
        toc: {
          sourceId: 'toc-source-plain',
          runtimeId: 'toc-source-plain',
          ownerId: 'toc-owner-plain',
          scopeId: 'note-toc',
          headings: [],
          capabilities: {
            activeTracking: false,
            dynamicScopes: false,
            mobilePanel: false,
          },
          contentRootId: 'note-content-plain',
          homeHref: '/',
          shouldHydrate: false,
        },
        articleHeader: {
          heading: 'Plain',
          genres: [],
        },
        pagefind: null,
      },
    });

    expect(rendered).toContain('data-sidebar-presence="absent"');
    expect(rendered).toContain('data-app-shell-sidebar-host\n        hidden');
    expect(rendered).toContain('<layout-sidebar\n          hidden');
    expect(rendered.match(/<main id="main-content" tabindex="-1">/g)?.length ?? 0).to.equal(1);
    expect(rendered.match(/data-app-shell-sidebar-overlay-layer/g)?.length ?? 0).to.equal(1);
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
    expect(rendered).toContain('<meta name="rouault-build-id" content="build abcdef1">');
  });
});
