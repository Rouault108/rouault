import { describe, expect, it } from 'vitest';
import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import { BaseLayout } from '../../src/layouts/BaseLayout.11ty.js';
import { loadBuildMetadataData } from '../../src/data/buildMetadata.js';
import { loadSiteUrlContextData } from '../../src/data/siteUrlContext.js';
import { THEME_STORAGE_KEY } from '../../src/theme/theme-manager.js';

type Parse5Element = DefaultTreeAdapterMap['element'];
type Parse5Node = DefaultTreeAdapterMap['node'];

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const getChildNodes = (node: Parse5Node): readonly Parse5Node[] =>
  'childNodes' in node && Array.isArray(node.childNodes) ? node.childNodes : [];

const collectElements = (root: Parse5Node): Parse5Element[] => {
  const elements: Parse5Element[] = [];
  const visit = (node: Parse5Node): void => {
    if (isElementNode(node)) elements.push(node);
    for (const child of getChildNodes(node)) visit(child);
  };
  visit(root);
  return elements;
};

const hasAttribute = (element: Parse5Element, name: string): boolean =>
  element.attrs.some((attribute) => attribute.name === name);

const getAttribute = (element: Parse5Element, name: string): string | undefined =>
  element.attrs.find((attribute) => attribute.name === name)?.value;

const hasClassToken = (element: Parse5Element, token: string): boolean =>
  (getAttribute(element, 'class') ?? '').split(/[\t\n\f\r ]+/u).includes(token);

const getTextContent = (root: Parse5Node): string =>
  'value' in root && typeof root.value === 'string'
    ? root.value
    : getChildNodes(root)
        .map((child) => getTextContent(child))
        .join('');

const requireElement = (element: Parse5Element | undefined, label: string): Parse5Element => {
  if (element === undefined) throw new Error(`${label} is required`);
  return element;
};

const getBodyTag = (html: string): string => html.match(/<body[^>]*>/u)?.[0] ?? '';

const enumerateScriptBlocks = (
  html: string,
): readonly { readonly attributes: string; readonly body: string; readonly index: number }[] => {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gu;
  return [...html.matchAll(scriptPattern)].map((match) => ({
    attributes: match[1] ?? '',
    body: match[2] ?? '',
    index: match.index ?? -1,
  }));
};

const TEST_BUILD_METADATA = loadBuildMetadataData({
  buildId: 'test-build',
  buildLabel: 'build test',
  generatedAt: '2026-01-01T00:00:00.000Z',
  sourceLabel: 'base-layout-test',
});

const TEST_SITE_URL_CONTEXT = loadSiteUrlContextData({
  siteOrigin: 'https://example.com',
  basePath: '',
  sourceLabel: 'base-layout-test',
});

describe('BaseLayout', () => {
  it('buildMetadata missing では render-time hard fail すること', () => {
    expect(() =>
      new BaseLayout().render({
        content: '<p>本文</p>',
      } as unknown as Parameters<BaseLayout['render']>[0]),
    ).toThrow(/BaseLayout requires buildMetadata/u);
  });

  it('SiteUrlContext と route manifest meta を SSR head に出力すること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      content: '<p>Home</p>',
    });

    expect(rendered).toContain('<meta name="rouault-site-origin" content="https://example.com">');
    expect(rendered).toContain('<meta name="rouault-base-path" content="">');
    expect(rendered).toContain(
      '<meta name="rouault-route-manifest" content="/assets/internal-document-routes.json?buildId=test-build">',
    );
    expect(rendered).toContain(
      '<meta name="rouault-route-manifest-build-id" content="test-build">',
    );
    expect(rendered).toContain('<meta name="rouault-route-manifest-version" content="1">');
  });

  it('theme document bootstrap script を stylesheet と client module script より前に出力すること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      content: '<p>Home</p>',
    });
    const scripts = enumerateScriptBlocks(rendered);
    const themeDocumentBootstrap = scripts.find(
      (script) =>
        script.attributes.trim() === '' && script.body.includes(JSON.stringify(THEME_STORAGE_KEY)),
    );
    const themeChromeBootstrap = scripts.find((script) =>
      script.attributes.includes('data-theme-chrome-bootstrap'),
    );
    const firstStylesheetIndex = rendered.indexOf('<link rel="stylesheet"');
    const clientModuleScript = scripts.find((script) =>
      script.attributes.includes('type="module"'),
    );

    expect(themeDocumentBootstrap).toBeDefined();
    expect(themeChromeBootstrap).toBeDefined();
    expect(clientModuleScript).toBeDefined();
    expect(themeDocumentBootstrap).not.toBe(themeChromeBootstrap);
    expect(themeDocumentBootstrap?.index).toBeGreaterThanOrEqual(0);
    expect(firstStylesheetIndex).toBeGreaterThanOrEqual(0);
    expect(themeDocumentBootstrap?.index).toBeLessThan(firstStylesheetIndex);
    expect(themeDocumentBootstrap?.index).toBeLessThan(clientModuleScript?.index ?? -1);

    const themeDocumentBootstrapBody = themeDocumentBootstrap?.body ?? '';
    for (const literal of [
      THEME_STORAGE_KEY,
      'data-theme',
      'data-resolved-theme',
      'prefers-color-scheme: dark',
      'colorScheme',
      'light',
      'dark',
      'system',
    ]) {
      expect(themeDocumentBootstrapBody).toContain(literal);
    }
  });

  it('page title が未指定の場合は site title のみを出力すること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      content: '<p>Home</p>',
    });

    expect(rendered).toContain('<title>Rouault</title>');
    expect(rendered).not.toContain('<title>Rouault - Rouault</title>');
  });

  it('page title が site title と同一の場合は重複させないこと', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      title: 'Rouault',
      content: '<p>Home</p>',
    });

    expect(rendered).toContain('<title>Rouault</title>');
    expect(rendered).not.toContain('<title>Rouault - Rouault</title>');
  });

  it('page title が site title の重複済み文書タイトルの場合は site title に正規化すること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      title: 'Rouault - Rouault',
      content: '<p>Home</p>',
    });

    expect(rendered).toContain('<title>Rouault</title>');
    expect(rendered).not.toContain('<title>Rouault - Rouault</title>');
  });

  it('page title が site title と異なる場合は site title を接尾辞として付けること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      title: 'このサイトについて',
      content: '<p>About</p>',
    });

    expect(rendered).toContain('<title>このサイトについて - Rouault</title>');
  });

  it('page title がすでに文書タイトル化済みの場合は再接尾辞化しないこと', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      title: 'このサイトについて - Rouault',
      content: '<p>About</p>',
    });

    expect(rendered).toContain('<title>このサイトについて - Rouault</title>');
    expect(rendered).not.toContain('このサイトについて - Rouault - Rouault');
  });

  it('page title が重複済み文書タイトルの場合は単一接尾辞に正規化すること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      title: 'このサイトについて - Rouault - Rouault',
      content: '<p>About</p>',
    });

    expect(rendered).toContain('<title>このサイトについて - Rouault</title>');
    expect(rendered).not.toContain('このサイトについて - Rouault - Rouault');
  });

  it('page title を HTML text として escape してから title 要素へ出力すること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      title: 'A & B <C>',
      content: '<p>Escaped</p>',
    });

    expect(rendered).toContain('<title>A &amp; B &lt;C&gt; - Rouault</title>');
    expect(rendered).not.toContain('<title>A & B <C> - Rouault</title>');
  });

  it('reader note では header に sidebar-enabled を出力し、既定 heading を注入しないこと', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      content: '<p>本文</p>',
      notePage: {
        noteKind: 'reader',
        noteShellSidebarPresence: 'present',
        tocPresence: 'absent',
        showSidebar: true,
        contentHtml: '<p>本文</p>',
        sidebar: {
          sidebarId: 'note-primary',
          stateScopeId: 'note-navigation',
          selectedId: 'reader-note',
          initialExpandedIds: [],
          topologyRevision: 'reader-note-topology',
          navHtml:
            '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="reader-note-topology"><ul><li data-node-id="reader-note" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/reader-note" data-link-kind="internal-document" data-link-surface="navigation" aria-current="page"><span data-sidebar-nav-label>Reader Note</span></a></li></ul></nav>',
          heading: null,
          fixedBreakpoint: '1024',
          presentation: 'auto',
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

    expect(rendered).toContain(
      '<header class="layout-header" data-layout-header="true" data-note-layout="true" data-sidebar-enabled="true"',
    );
    expect(rendered).toContain('data-toc-presence="absent"');
    expect(rendered).not.toContain('toc-runtime-id=""');
    expect(rendered).toContain('data-toc-trigger-reserved="false"');
    expect(rendered).toContain('initial-expanded-ids="[]"');
    expect(rendered).toContain('topology-revision="reader-note-topology"');
    expect(rendered).toContain('<nav data-sidebar-nav');
    expect(rendered).toContain('href="/notes/reader-note"');
    expect(rendered).toContain('data-link-kind="internal-document"');
    expect(rendered).toContain('data-link-surface="navigation"');
    expect(rendered).toContain('data-sidebar-boot-state="ssr"');
    expect(rendered).not.toContain('heading="ナビゲーション"');
  });

  it('TOC present note では header trigger reservation を interactive state とは別に出力すること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
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

    expect(rendered).toContain('data-toc-presence="present"');
    expect(rendered).toContain('data-toc-runtime-id="toc-source-reader-with-toc"');
    expect(rendered).toContain('data-toc-trigger-reserved="true"');
    expect(rendered).toContain('data-toc-owner-id="toc-owner-reader-with-toc"');
    expect(rendered).toContain('href="#layout-toc-toc-source-reader-with-toc"');
    expect(rendered).toContain('data-link-kind="internal-fragment"');
    expect(rendered).toContain('data-link-surface="header"');
    expect(rendered.match(/<header\b[^>]*data-layout-header[^>]*>/u)?.[0] ?? '').toContain(
      'data-toc-trigger-reserved',
    );
  });

  it('body pagefind ignore は notePage.pagefind を正本にすること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
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
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
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
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
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
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
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

    expect(rendered).toContain('data-note-layout="true" data-sidebar-enabled="true"');
  });

  it('testing note かつ chromeProfile=plain では header に sidebar-enabled を出力しないこと', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
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

    expect(rendered).toContain('data-note-layout="true"');
    expect(rendered).toContain('data-toc-presence="absent"');
    expect(rendered).not.toContain('toc-runtime-id=""');
    expect(rendered).toContain('data-sidebar-enabled="false"');
  });

  it('BaseLayout は layout-header へ breadcrumbs-json を出力しないこと', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
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

    expect(rendered).toContain('data-note-layout="true"');
    expect(rendered).toContain('data-current-corpus-key="all"');
    expect(rendered).not.toContain('breadcrumbs-json=');
  });

  it('app shell の骨格として skip link / app shell root / main / footer を出力すること', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      content: '<article><h1>本文</h1><p>静かな本文です。</p></article>',
    });

    const document = parse5.parse(rendered);
    const elements = collectElements(document);
    const structuralRoots = elements.filter((element) =>
      hasAttribute(element, 'data-app-shell-root'),
    );

    expect(structuralRoots).toHaveLength(1);
    const appShellRoot = structuralRoots[0];
    if (appShellRoot === undefined) throw new Error('app shell root is required');

    const appShellElements = collectElements(appShellRoot);
    const skipLinks = elements.filter(
      (element) => element.tagName === 'a' && hasClassToken(element, 'skip-link'),
    );
    const skipLink = skipLinks[0];
    const staticHeader = appShellElements.find(
      (element) => element.tagName === 'header' && hasAttribute(element, 'data-layout-header'),
    );
    const routerDocumentHost = appShellElements.find(
      (element) => element.tagName === 'router-document-host',
    );
    const overlayLayer = appShellElements.find((element) =>
      hasAttribute(element, 'data-app-shell-sidebar-overlay-layer'),
    );
    const main = appShellElements.find(
      (element) => element.tagName === 'main' && getAttribute(element, 'id') === 'main-content',
    );
    const footer = appShellElements.find(
      (element) => element.tagName === 'footer' && hasAttribute(element, 'data-layout-footer'),
    );
    const announcement = appShellElements.find((element) =>
      hasAttribute(element, 'data-router-document-host-announcement'),
    );
    const footerBuild = appShellElements.find(
      (element) => element.tagName === 'p' && hasClassToken(element, 'ui-footer__build'),
    );
    const requiredStaticHeader = requireElement(staticHeader, 'static header');
    const requiredMain = requireElement(main, 'main');
    const requiredFooter = requireElement(footer, 'footer');
    const requiredAnnouncement = requireElement(announcement, 'announcement');
    const requiredFooterBuild = requireElement(footerBuild, 'footer build');

    expect(hasClassToken(appShellRoot, 'app-shell-root')).toBe(true);
    expect(hasAttribute(appShellRoot, 'id')).toBe(false);
    expect(elements.some((element) => getAttribute(element, 'id') === 'app')).toBe(false);
    expect(elements.some((element) => hasClassToken(element, 'app-root'))).toBe(false);
    expect(getAttribute(appShellRoot, 'data-hydration-scope')).toBe('app-shell');
    expect(getAttribute(appShellRoot, 'data-hydration-marker')).toBe('reading-shell');
    expect(getAttribute(appShellRoot, 'data-hydration-owner-id')).toBe('app-shell');

    expect(skipLinks).toHaveLength(1);
    expect(skipLink).toBeDefined();
    if (skipLink === undefined) throw new Error('skip link is required');
    expect(getAttribute(skipLink, 'href')).toBe('#main-content');
    expect(getAttribute(skipLink, 'data-link-kind')).toBe('internal-fragment');
    expect(getAttribute(skipLink, 'data-link-surface')).toBe('structural');
    expect(skipLink.attrs.some((attribute) => attribute.name.startsWith('data-hydration-'))).toBe(
      false,
    );
    expect(getTextContent(skipLink)).toBe('メインコンテンツへ移動');
    expect(elements.some((element) => element.tagName === 'ui-skip-link')).toBe(false);
    expect(elements.indexOf(skipLink)).toBeLessThan(elements.indexOf(appShellRoot));

    expect(routerDocumentHost).toBeDefined();
    expect(overlayLayer).toBeDefined();
    expect(getAttribute(requiredStaticHeader, 'data-layout-header')).toBe('true');
    expect(getAttribute(requiredMain, 'tabindex')).toBe('-1');
    expect(hasClassToken(requiredFooter, 'ui-footer')).toBe(true);
    expect(hasAttribute(requiredFooter, 'data-footer')).toBe(true);
    expect(getAttribute(requiredAnnouncement, 'aria-live')).toBe('polite');
    expect(getAttribute(requiredAnnouncement, 'aria-atomic')).toBe('true');
    expect(hasClassToken(requiredAnnouncement, 'sr-only')).toBe(true);
    expect(getTextContent(requiredFooterBuild)).toBe('build test');
    expect(elements.some((element) => element.tagName === 'layout-footer')).toBe(false);
  });

  it('app shell sidebar host と overlay layer を単一実体として出力すること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
      content: '<article><h1>本文</h1></article>',
    });

    expect(rendered.match(/data-app-shell-sidebar-host/g)?.length ?? 0).to.equal(1);
    expect(rendered.match(/<layout-sidebar\b/g)?.length ?? 0).to.equal(1);
    expect(rendered.match(/data-app-shell-sidebar-overlay-layer/g)?.length ?? 0).to.equal(1);
  });

  it('sidebar absent でも app shell structure を維持し host を hidden にすること', () => {
    const rendered = new BaseLayout().render({
      buildMetadata: TEST_BUILD_METADATA,
      siteUrlContext: TEST_SITE_URL_CONTEXT,
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

  it('footer を静的 HTML として shell へ含めること', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      buildMetadata: loadBuildMetadataData({
        buildId: 'test-build',
        buildLabel: 'build test',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sourceLabel: 'base-layout-test',
      }),
      siteUrlContext: TEST_SITE_URL_CONTEXT,
    });

    expect(rendered).toContain('<footer class="ui-footer" data-footer data-layout-footer>');
    expect(rendered).toContain('<p class="ui-footer__build">build test</p>');
    expect(rendered).not.toContain('<layout-footer');
  });

  it('buildMetadata の buildLabel を footer の静的本文へ流し込むこと', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      buildMetadata: loadBuildMetadataData({
        buildId: 'abcdef1',
        buildLabel: 'build abcdef1',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sourceLabel: 'base-layout-test',
      }),
      siteUrlContext: TEST_SITE_URL_CONTEXT,
    });

    expect(rendered).toContain('<p class="ui-footer__build">build abcdef1</p>');
    expect(rendered).not.toContain('<layout-footer');
    expect(rendered).toContain('<meta name="rouault-build-id" content="abcdef1">');
  });
});
