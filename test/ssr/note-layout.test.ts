import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import type { NoteNavigationEntry } from '../../build/navigation/index.js';

const TEST_SITE_URL_CONTEXT = { siteOrigin: 'https://example.com', basePath: '' };

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];
interface ParentLike {
  childNodes: ChildNode[];
}

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;

const getAttribute = (node: ElementNode, name: string): string | null =>
  node.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const hasAttribute = (node: ElementNode, name: string): boolean =>
  node.attrs.some((attribute) => attribute.name === name);

const tokens = (value: string | null): string[] => value?.split(/\s+/u).filter(Boolean) ?? [];

const hasToken = (node: ElementNode, attribute: string, token: string): boolean =>
  tokens(getAttribute(node, attribute)).includes(token);

const hasExactTokens = (
  node: ElementNode,
  attribute: string,
  expectedTokens: readonly string[],
): boolean => {
  const actual = tokens(getAttribute(node, attribute));
  return (
    actual.length === expectedTokens.length &&
    expectedTokens.every((expected) => actual.includes(expected))
  );
};

const findElements = (
  node: ParentLike,
  predicate: (element: ElementNode) => boolean,
): ElementNode[] => {
  const matches: ElementNode[] = [];
  for (const child of node.childNodes) {
    if (!isElementNode(child)) continue;
    if (predicate(child)) matches.push(child);
    matches.push(...findElements(child, predicate));
  }
  return matches;
};

const findElement = (
  node: ParentLike,
  predicate: (element: ElementNode) => boolean,
): ElementNode | null => findElements(node, predicate)[0] ?? null;

const textContent = (node: ParentLike): string =>
  node.childNodes
    .map((child) => {
      if (isElementNode(child)) return textContent(child);
      return 'value' in child && typeof child.value === 'string' ? child.value : '';
    })
    .join('');

const matchesArticleHeaderContract = (fragment: ParentLike, headingText: string): boolean => {
  const headers = findElements(
    fragment,
    (element) =>
      element.tagName === 'header' &&
      hasAttribute(element, 'data-article-header') &&
      hasToken(element, 'class', 'article-header'),
  );
  if (headers.length !== 1) return false;
  const headings = findElements(
    headers[0] as ElementNode,
    (element) => element.tagName === 'h1' && hasToken(element, 'class', 'article-header__heading'),
  );
  return headings.length === 1 && textContent(headings[0] as ElementNode) === headingText;
};

const matchesTocNavContract = (fragment: ParentLike): boolean => {
  const roots = findElements(
    fragment,
    (element) =>
      hasAttribute(element, 'data-layout-toc-root') && hasToken(element, 'class', 'layout-toc-col'),
  );
  if (roots.length !== 1) return false;
  const navs = findElements(
    roots[0] as ElementNode,
    (element) =>
      element.tagName === 'nav' &&
      hasToken(element, 'class', 'layout-toc') &&
      getAttribute(element, 'aria-label') === '目次' &&
      hasAttribute(element, 'data-layout-toc-nav'),
  );
  return navs.length === 1;
};

interface SourceLinkContract {
  readonly href: string;
  readonly kind: string;
  readonly ariaLabel: string;
  readonly isExternal: boolean;
}

const matchesSourceLinkContract = (fragment: ParentLike, contract: SourceLinkContract): boolean => {
  const links = findElements(
    fragment,
    (element) =>
      element.tagName === 'a' && hasToken(element, 'class', 'article-header__source-link'),
  );
  if (links.length !== 1) return false;
  const link = links[0] as ElementNode;
  return (
    getAttribute(link, 'href') === contract.href &&
    getAttribute(link, 'target') === '_blank' &&
    hasExactTokens(link, 'rel', ['noopener', 'noreferrer']) &&
    getAttribute(link, 'data-link-kind') === contract.kind &&
    getAttribute(link, 'data-link-surface') === 'metadata' &&
    getAttribute(link, 'aria-label') === contract.ariaLabel &&
    (contract.isExternal
      ? getAttribute(link, 'data-external') === 'true'
      : !hasAttribute(link, 'data-external'))
  );
};

const matchesCurrentBreadcrumbContract = (fragment: ParentLike, expectedText: string): boolean => {
  const currentBreadcrumbs = findElements(
    fragment,
    (element) =>
      element.tagName === 'span' &&
      hasToken(element, 'class', 'article-header__breadcrumb-node') &&
      hasToken(element, 'class', 'article-header__breadcrumb-current') &&
      getAttribute(element, 'aria-current') === 'page' &&
      textContent(element) === expectedText,
  );
  return currentBreadcrumbs.length === 1;
};

const matchesTocAbsenceContract = (
  fragment: ParentLike,
  options: { readonly sourceId: string; readonly scopeId: string },
): boolean =>
  findElements(
    fragment,
    (element) =>
      hasAttribute(element, 'data-layout-toc-root') ||
      hasToken(element, 'class', 'layout-toc-col') ||
      element.tagName === 'layout-toc' ||
      element.tagName === 'layout-toc-controller' ||
      getAttribute(element, 'data-hydration-scope') === options.scopeId ||
      (element.tagName === 'script' && getAttribute(element, 'id') === options.sourceId),
  ).length === 0;

const createProjection = (
  overrides: Partial<NotePageProjection> & { sidebar?: NotePageProjection['sidebar'] | null } = {},
): NotePageProjection => {
  const { sidebar, ...rest } = overrides;
  const defaultSidebar: NonNullable<NotePageProjection['sidebar']> = {
    sidebarId: 'note-primary',
    stateScopeId: 'note-navigation',
    selectedId: 'note',
    initialExpandedIds: [],
    topologyRevision: '[{"id":"note","kind":"leaf","label":"Note","href":"/notes/note"}]',
    navHtml:
      '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="[{&quot;id&quot;:&quot;note&quot;,&quot;kind&quot;:&quot;leaf&quot;,&quot;label&quot;:&quot;Note&quot;,&quot;href&quot;:&quot;/notes/note&quot;}]"><ul><li data-node-id="note" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/note" data-link-kind="internal-document" data-link-surface="navigation" aria-current="page"><span data-sidebar-nav-label>Note</span></a></li></ul></nav>',
    heading: null,
    fixedBreakpoint: '1024',
    presentation: 'auto',
  };

  return {
    noteKind: 'reader',
    noteShellSidebarPresence: 'present',
    tocPresence: 'present',
    showSidebar: true,
    contentHtml: '<p>本文</p>',
    ...(sidebar === undefined ? { sidebar: defaultSidebar } : { sidebar }),
    toc: {
      sourceId: 'toc-source-note',
      runtimeId: 'toc-source-note',
      ownerId: 'toc-owner-note',
      scopeId: 'note-toc',
      headings: [{ id: 'intro', text: 'Intro', level: 2 }],
      capabilities: {
        activeTracking: true,
        dynamicScopes: false,
        mobilePanel: true,
      },
      contentRootId: 'note-content-note',
      homeHref: '/',
      shouldHydrate: true,
    },
    articleHeader: {
      heading: '見出し',
      breadcrumbs: [
        { label: 'Program', href: '/program/' },
        { label: '見出し', href: '/program/example/' },
      ],
      published: '2026-01-01',
      updated: '2026-02-01',
      genres: ['music'],
    },

    ...rest,
  };
};

const createClassificationData = () => ({
  siteUrlContext: TEST_SITE_URL_CONTEXT,
  page: { url: '/notes/current/' },
  note: { permalink: '/notes/current/' },
  notes: [
    {
      slug: 'current',
      title: 'Current',
      permalink: '/notes/current/',
      noteKind: 'leaf',
    },
    {
      slug: 'source-document',
      title: 'Source Document',
      permalink: '/source-document/',
      noteKind: 'leaf',
    },
  ] satisfies readonly NoteNavigationEntry[],
  corpusPages: [],
  tagPages: [{ tag: 'music' }],
});

describe('NoteLayout', () => {
  it('projection 済みデータを描画し hydration scope を出力すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection(),
    });

    const fragment = parseFragment(rendered);
    const shells = findElements(
      fragment,
      (element) =>
        element.tagName === 'section' &&
        hasToken(element, 'class', 'note-shell') &&
        getAttribute(element, 'data-hydration-scope') === 'note-shell' &&
        getAttribute(element, 'data-toc-presence') === 'present',
    );
    const articles = findElements(
      fragment,
      (element) =>
        element.tagName === 'article' &&
        getAttribute(element, 'data-hydration-scope') === 'note-content',
    );
    const tocRoots = findElements(fragment, (element) =>
      hasAttribute(element, 'data-layout-toc-root'),
    );
    const tocRoot = tocRoots[0];
    const controllers = tocRoot
      ? findElements(tocRoot, (element) => element.tagName === 'layout-toc-controller')
      : [];
    const headingEntries = tocRoot
      ? findElements(
          tocRoot,
          (element) =>
            getAttribute(element, 'data-heading-level') === '2' &&
            getAttribute(element, 'data-heading-depth') === '0',
        )
      : [];

    expect(shells).to.have.length(1);
    expect(articles).to.have.length(1);
    expect(matchesArticleHeaderContract(fragment, '見出し')).to.equal(true);
    expect(
      findElements(fragment, (element) => getAttribute(element, 'aria-current') === 'page').length,
    ).toBeGreaterThanOrEqual(1);
    expect(matchesTocNavContract(fragment)).to.equal(true);
    expect(headingEntries.length).toBeGreaterThanOrEqual(1);
    expect(controllers).to.have.length(1);
    expect(getAttribute(controllers[0] as ElementNode, 'content-root-id')).to.equal(
      'note-content-note',
    );
    expect(getAttribute(controllers[0] as ElementNode, 'toc-runtime-id')).to.equal(
      'toc-source-note',
    );
    expect(getAttribute(controllers[0] as ElementNode, 'data-hydration-scope')).to.equal(
      'note-toc',
    );
    expect(tocRoots).to.have.length(1);
    expect((tocRoots[0] as ElementNode).tagName).to.equal('div');
    expect(getAttribute(tocRoots[0] as ElementNode, 'aria-label')).to.equal(null);
    expect(getAttribute(tocRoots[0] as ElementNode, 'role')).to.equal(null);
    expect(
      findElements(
        fragment,
        (element) => getAttribute(element, 'data-hydration-scope') === 'note-sidebar',
      ),
    ).to.have.length(0);
    expect(
      findElements(fragment, (element) => element.tagName === 'layout-sidebar'),
    ).to.have.length(0);
    expect(
      findElements(fragment, (element) => hasAttribute(element, 'data-sidebar-surface')),
    ).to.have.length(0);
    expect(
      findElements(fragment, (element) =>
        hasAttribute(element, 'data-app-shell-sidebar-overlay-layer'),
      ),
    ).to.have.length(0);
    expect(
      findElements(fragment, (element) => element.tagName === 'ui-article-header'),
    ).to.have.length(0);
    expect(findElements(fragment, (element) => element.tagName === 'layout-toc')).to.have.length(0);
  });

  it('static TOC 経路では mobile static nav も共通の navigation label を持つこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        toc: {
          sourceId: 'toc-source-note',
          runtimeId: 'toc-source-note',
          ownerId: 'toc-owner-note',
          scopeId: 'note-toc',
          headings: [{ id: 'intro', text: 'Intro', level: 2 }],
          capabilities: {
            activeTracking: false,
            dynamicScopes: false,
            mobilePanel: false,
          },
          contentRootId: 'note-content-note',
          homeHref: '/',
          shouldHydrate: false,
        },
      }),
    });
    const fragment = parseFragment(rendered);
    const mobileStaticNav = findElement(
      fragment,
      (element) => getAttribute(element, 'data-layout-toc-mobile-static-nav') === '',
    );

    expect(mobileStaticNav).not.to.equal(null);
    expect(mobileStaticNav?.tagName).to.equal('nav');
    expect(mobileStaticNav ? getAttribute(mobileStaticNav, 'aria-label') : null).to.equal('目次');
  });

  it('article-header の source を http/https のみリンク化し、created を aria-label へ含めること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      ...createClassificationData(),
      notePage: createProjection({
        articleHeader: {
          heading: '見出し',
          breadcrumbs: [
            { label: 'Program', href: '/program/' },
            { label: '見出し', href: '/program/example/' },
          ],
          published: '2026-01-01',
          created: '2025-12-31',
          source: 'https://external.example/source',
          genres: ['music'],
        },
      }),
    });

    const fragment = parseFragment(rendered);
    const dates = findElements(
      fragment,
      (element) =>
        element.tagName === 'time' &&
        getAttribute(element, 'aria-label') === '公開日: 2026-01-01、作成日: 2025-12-31',
    );
    expect(
      matchesSourceLinkContract(fragment, {
        href: 'https://external.example/source',
        kind: 'external-web',
        ariaLabel: '出典（外部サイト、新しいタブで開く）',
        isExternal: true,
      }),
    ).to.equal(true);
    expect(dates).to.have.length(1);
    expect(matchesCurrentBreadcrumbContract(fragment, '見出し')).to.equal(true);
  });

  it('NoteLayout final HTML では source link を raw fallback ではなく分類済み internal-resource として描画すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      ...createClassificationData(),
      notePage: createProjection({
        articleHeader: {
          heading: '見出し',
          breadcrumbs: [
            { label: 'Program', href: '/program/' },
            { label: '見出し', href: '/program/example/' },
          ],
          published: '2026-01-01',
          source: 'https://example.com/article-header-link-decoration',
          genres: ['music'],
        },
      }),
    });

    const fragment = parseFragment(rendered);

    expect(
      matchesSourceLinkContract(fragment, {
        href: '/article-header-link-decoration',
        kind: 'internal-resource',
        ariaLabel: '出典（新しいタブで開く）',
        isExternal: false,
      }),
    ).to.equal(true);
  });

  it('NoteLayout final HTML では same-origin internal document source link を passthrough のまま分類すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      ...createClassificationData(),
      notePage: createProjection({
        articleHeader: {
          heading: '見出し',
          source: 'https://example.com/source-document/',
          genres: ['music'],
        },
      }),
    });

    const fragment = parseFragment(rendered);

    expect(
      matchesSourceLinkContract(fragment, {
        href: '/source-document',
        kind: 'internal-document',
        ariaLabel: '出典（新しいタブで開く）',
        isExternal: false,
      }),
    ).to.equal(true);
  });

  it('source link を持つ NoteLayout final HTML は classification data 欠落時に error にすること', () => {
    const layout = new NoteLayout();

    expect(() =>
      layout.render({
        notePage: createProjection({
          articleHeader: {
            heading: '見出し',
            source: 'https://example.com/source',
            genres: ['music'],
          },
        }),
      }),
    ).toThrow('siteUrlContext');
  });

  it('tocPresence=absent では TOC host / script / hydration scope を出力しないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        tocPresence: 'absent',
        toc: {
          sourceId: 'toc-source-note',
          runtimeId: 'toc-source-note',
          ownerId: 'toc-owner-note',
          scopeId: 'note-toc',
          headings: [],
          capabilities: {
            activeTracking: true,
            dynamicScopes: true,
            mobilePanel: true,
          },
          contentRootId: 'note-content-note',
          homeHref: '/',
          shouldHydrate: true,
        },
      }),
    });

    const fragment = parseFragment(rendered);
    const shells = findElements(
      fragment,
      (element) =>
        hasToken(element, 'class', 'note-shell') &&
        getAttribute(element, 'data-toc-presence') === 'absent',
    );

    expect(shells).to.have.length(1);
    expect(
      matchesTocAbsenceContract(fragment, {
        sourceId: 'toc-source-note',
        scopeId: 'note-toc',
      }),
    ).to.equal(true);
  });

  it('projection 値を安全に escape すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        contentHtml: '<p>本文</p><script>console.log("unsafe")</script>',
        sidebar: {
          sidebarId: 'note-primary',
          stateScopeId: 'note-navigation',
          selectedId: 'note',
          initialExpandedIds: [],
          topologyRevision: '[{"id":"note","kind":"leaf","label":"<Unsafe>","href":"/notes/note"}]',
          navHtml:
            '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="unsafe"><ul><li data-node-id="note" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/note" data-link-kind="internal-document" data-link-surface="navigation" aria-current="page"><span data-sidebar-nav-label>&lt;Unsafe&gt;</span></a></li></ul></nav>',
          heading: null,
          fixedBreakpoint: '1024',
          presentation: 'auto',
        },
        articleHeader: {
          heading: '"Danger"<tag>',
          published: '2026-01-01',
          genres: ['a"&b'],
          source: 'javascript:alert(1)',
        },
      }),
    });

    const fragment = parseFragment(rendered);
    const header = findElement(
      fragment,
      (element) => element.tagName === 'header' && hasAttribute(element, 'data-article-header'),
    );
    const heading = header ? findElement(header, (element) => element.tagName === 'h1') : null;
    const tagLink = header
      ? findElement(
          header,
          (element) =>
            element.tagName === 'a' && getAttribute(element, 'href') === '/tags/a%22%26b/',
        )
      : null;

    expect(rendered).toContain('"Danger"&lt;tag&gt;');
    expect(rendered).toContain('href="/tags/a%22%26b/"');
    // Serialization contract: the unsafe raw source must not leak into content or data attributes.
    expect(rendered).not.toContain('javascript:alert(1)');
    expect(heading ? textContent(heading) : null).to.equal('"Danger"<tag>');
    expect(
      heading ? findElements(heading, (element) => element.tagName === 'tag') : [],
    ).to.have.length(0);
    expect(tagLink).not.to.equal(null);
    expect(
      findElements(
        fragment,
        (element) =>
          element.tagName === 'a' &&
          (getAttribute(element, 'href')?.startsWith('javascript:') ?? false),
      ),
    ).to.have.length(0);
    expect(
      findElements(fragment, (element) =>
        hasToken(element, 'class', 'article-header__source-link'),
      ),
    ).to.have.length(0);
  });

  it('意味契約は属性順序・quote style・class / rel token 順序に依存しないこと', () => {
    const fragment = parseFragment(`
      <header data-article-header class='extra article-header'>
        <h1 data-extra="true" class='extra article-header__heading'>見出し</h1>
      </header>
      <div data-layout-toc-root class='extra layout-toc-col'>
        <nav data-layout-toc-nav aria-label='目次' class='extra layout-toc'></nav>
      </div>
      <a
        data-link-surface='metadata'
        aria-label='出典（新しいタブで開く）'
        rel='noreferrer noopener'
        target='_blank'
        data-link-kind='internal-resource'
        href='/source'
        class='extra article-header__source-link'
      >出典</a>
      <span
        aria-current='page'
        class='extra article-header__breadcrumb-current article-header__breadcrumb-node'
      >見出し</span>
    `);

    expect(matchesArticleHeaderContract(fragment, '見出し')).to.equal(true);
    expect(matchesTocNavContract(fragment)).to.equal(true);
    expect(
      matchesSourceLinkContract(fragment, {
        href: '/source',
        kind: 'internal-resource',
        ariaLabel: '出典（新しいタブで開く）',
        isExternal: false,
      }),
    ).to.equal(true);
    expect(matchesCurrentBreadcrumbContract(fragment, '見出し')).to.equal(true);
  });

  it('意味契約は属性変更・別要素への分散・誤った祖先・重複・absent 残骸を拒否すること', () => {
    const sourceContract: SourceLinkContract = {
      href: '/source',
      kind: 'internal-resource',
      ariaLabel: '出典（新しいタブで開く）',
      isExternal: false,
    };
    const invalidSourceFixtures = [
      `<a class="article-header__source-link" href="/source" target="_blank" rel="noopener noreferrer" data-link-kind="internal-resource" data-link-surface="metadata" aria-label="変更済み">出典</a>`,
      `<a class="article-header__source-link" href="/source" target="_blank" rel="noopener noreferrer" data-link-kind="external-web" data-link-surface="metadata" aria-label="出典（新しいタブで開く）">出典</a>`,
      `<a class="article-header__source-link" href="/source" target="_blank" rel="noopener noreferrer" data-link-surface="metadata" aria-label="出典（新しいタブで開く）">出典</a>`,
      `<a class="article-header__source-link" href="/source" target="_blank" rel="noopener noreferrer">出典</a><span data-link-kind="internal-resource" data-link-surface="metadata" aria-label="出典（新しいタブで開く）"></span>`,
    ];
    for (const fixture of invalidSourceFixtures) {
      expect(matchesSourceLinkContract(parseFragment(fixture), sourceContract), fixture).to.equal(
        false,
      );
    }

    for (const invalidBreadcrumb of [
      `<span class="article-header__breadcrumb-current" aria-current="page">見出し</span>`,
      `<a class="article-header__breadcrumb-node article-header__breadcrumb-current" aria-current="page">見出し</a>`,
    ]) {
      expect(
        matchesCurrentBreadcrumbContract(parseFragment(invalidBreadcrumb), '見出し'),
        invalidBreadcrumb,
      ).to.equal(false);
    }

    expect(
      matchesTocNavContract(
        parseFragment(
          `<div data-layout-toc-root class="layout-toc-col"></div><nav data-layout-toc-nav class="layout-toc" aria-label="目次"></nav>`,
        ),
      ),
    ).to.equal(false);
    for (const invalidNav of [
      `<div data-layout-toc-root class="layout-toc-col"><nav data-layout-toc-nav class="layout-toc" aria-label="変更済み"></nav></div>`,
      `<div data-layout-toc-root class="layout-toc-col"><nav class="layout-toc" aria-label="目次"></nav></div>`,
    ]) {
      expect(matchesTocNavContract(parseFragment(invalidNav)), invalidNav).to.equal(false);
    }
    expect(
      matchesTocNavContract(
        parseFragment(
          `<div data-layout-toc-root class="layout-toc-col"><nav data-layout-toc-nav class="layout-toc" aria-label="目次"></nav></div><div data-layout-toc-root class="layout-toc-col"></div>`,
        ),
      ),
    ).to.equal(false);

    const absentOptions = { sourceId: 'toc-source-note', scopeId: 'note-toc' } as const;
    expect(matchesTocAbsenceContract(parseFragment('<article></article>'), absentOptions)).to.equal(
      true,
    );
    for (const residual of [
      '<layout-toc-controller></layout-toc-controller>',
      '<div data-hydration-scope="note-toc"></div>',
      '<script id="toc-source-note" type="application/json">[]</script>',
    ]) {
      expect(matchesTocAbsenceContract(parseFragment(residual), absentOptions), residual).to.equal(
        false,
      );
    }

    const escaped = parseFragment('<h1>"Danger"&lt;tag&gt;</h1>');
    const escapedHeading = findElement(escaped, (element) => element.tagName === 'h1');
    expect(escapedHeading ? textContent(escapedHeading) : null).to.equal('"Danger"<tag>');
    expect(
      escapedHeading ? findElements(escapedHeading, (element) => element.tagName === 'tag') : [],
    ).to.have.length(0);
  });

  it('sidebar が無効な projection では対応マークアップを出さないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        noteKind: 'testing',
        noteShellSidebarPresence: 'absent',
        showSidebar: false,
        sidebar: null,
      }),
    });

    const fragment = parseFragment(rendered);

    expect(
      findElements(fragment, (element) => element.tagName === 'layout-sidebar'),
    ).to.have.length(0);
    expect(
      findElements(fragment, (element) => hasAttribute(element, 'data-pagefind-body')),
    ).to.have.length(0);
    expect(
      findElements(fragment, (element) => getAttribute(element, 'id') === 'sidebar-source-note'),
    ).to.have.length(0);
  });
});
