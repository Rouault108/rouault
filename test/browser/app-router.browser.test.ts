import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import type { ShellProjectionSnapshot } from '../../shared/navigation/shell-projection.js';
import '../../src/components/app/app-router.js';
import '../../src/components/layout/layout-sidebar.js';
import type {
  AppRouterContentDomReplacedDetail,
  AppRouterNavigationCommittedDetail,
} from '../../src/components/app/app-router.js';
import type { NavigationResult } from '../../src/router/router.js';
import { createRouterContentHtml } from '../../src/router/router-content-html.js';
import { PRIMARY_TAB_URL_STATE_CHANGE_EVENT } from '../../src/components/app/navigation/primary-tab-url-state.js';
import { ensureMainCssLoaded } from './helpers/load-main-css.js';

type AppRouterElement = HTMLElement & {
  ready: Promise<void>;
  whenReady(): Promise<void>;
  navigate(url: string): Promise<NavigationResult>;
  getContentRoot(): HTMLElement | null;
  serverContent?: unknown;
};

const getPersistentSidebarHost = (root: ParentNode): HTMLElement | null =>
  root.querySelector<HTMLElement>('[data-app-shell-sidebar-host] layout-sidebar');

const getPersistentSidebarColumn = (root: ParentNode): HTMLElement | null =>
  root.querySelector<HTMLElement>('[data-app-shell-sidebar-host]');

const VALID_SIDEBAR_NAV_HTML =
  '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="topology:test"><ul><li data-node-id="notes/example" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/example" aria-current="page"><span data-sidebar-nav-label>Example</span></a></li></ul></nav>';

const createValidSidebarProjection = (): ShellProjectionSnapshot['sidebar'] => ({
  present: true,
  sidebarId: 'note-primary',
  stateScopeId: 'note-navigation',
  selectedId: 'notes/example',
  initialExpandedIds: [],
  topologyRevision: 'topology:test',
  navHtml: VALID_SIDEBAR_NAV_HTML,
  heading: null,
  fixedBreakpoint: 1024,
  presentation: 'auto',
});

const createEnvelopeResponse = (options?: {
  html?: string;
  title?: string;
  description?: string | null;
  renderedKind?: NavigationEnvelope['document']['renderedKind'];
  announcedTitle?: string | null;
  shellProjection?: ShellProjectionSnapshot | null;
}): Response =>
  new Response(
    JSON.stringify({
      schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
      buildId: 'build-test',
      generatedAt: '2026-04-11T00:00:00.000Z',
      document: {
        html: options?.html ?? '<h1>Default App Router Mock</h1>',
        title: options?.title ?? 'Default App Router Mock - Rouault',
        description: options?.description ?? 'default app router mock',
        renderedKind: options?.renderedKind ?? 'page',
        announcedTitle: options?.announcedTitle,
      },
      shellProjection: options?.shellProjection ?? null,
      hydrationPlan: null,
    } satisfies NavigationEnvelope),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    },
  );

beforeEach(() => {
  document.head.insertAdjacentHTML(
    'beforeend',
    '<meta name="rouault-build-id" content="build-test"><meta name="rouault-generated-at" content="2026-04-11T00:00:00.000Z">',
  );
});

afterEach(() => {
  document.head.querySelector('meta[name="rouault-build-id"]')?.remove();
  document.head.querySelector('meta[name="rouault-generated-at"]')?.remove();
});

describe('app-router', () => {
  let host: AppRouterElement | null = null;

  let originalFetch: typeof globalThis.fetch;
  let originalPushState: typeof history.pushState;
  let originalReplaceState: typeof history.replaceState;
  let originalHistoryStateDescriptor: PropertyDescriptor | undefined;
  let originalScrollToDescriptor: PropertyDescriptor | undefined;
  let originalScrollIntoViewDescriptor: PropertyDescriptor | undefined;
  let originalFocusDescriptor: PropertyDescriptor | undefined;

  let mockHistoryState: unknown;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve(createEnvelopeResponse());

    originalPushState = history.pushState.bind(history);
    originalReplaceState = history.replaceState.bind(history);
    originalHistoryStateDescriptor = Object.getOwnPropertyDescriptor(history, 'state');
    originalScrollToDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollTo');
    originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
    originalFocusDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'focus');

    mockHistoryState = history.state;

    Object.defineProperty(history, 'state', {
      configurable: true,
      get: () => mockHistoryState,
    });

    history.pushState = ((data: unknown, _unused: string, url?: string | URL | null) => {
      if (url === null || url === undefined) {
        return;
      }

      const target = new URL(url.toString(), window.location.href);
      mockHistoryState = {
        ...(data && typeof data === 'object' ? data : {}),
        __routerUrl: `${target.pathname}${target.search}${target.hash}`,
      };
    }) as typeof history.pushState;

    history.replaceState = ((data: unknown, _unused: string, url?: string | URL | null) => {
      if (url === null || url === undefined) {
        return;
      }

      const target = new URL(url.toString(), window.location.href);
      mockHistoryState = {
        ...(data && typeof data === 'object' ? data : {}),
        __routerUrl: `${target.pathname}${target.search}${target.hash}`,
      };
    }) as typeof history.replaceState;

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      writable: true,
      value: () => {
        /* noop */
      },
    });
  });

  afterEach(() => {
    host?.remove();
    host = null;

    globalThis.fetch = originalFetch;
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;

    if (originalHistoryStateDescriptor) {
      Object.defineProperty(history, 'state', originalHistoryStateDescriptor);
    } else {
      Reflect.deleteProperty(history, 'state');
    }

    if (originalScrollToDescriptor) {
      Object.defineProperty(window, 'scrollTo', originalScrollToDescriptor);
    } else {
      Reflect.deleteProperty(window, 'scrollTo');
    }

    if (originalScrollIntoViewDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollIntoView',
        originalScrollIntoViewDescriptor,
      );
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    }

    if (originalFocusDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'focus', originalFocusDescriptor);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'focus');
    }
  });

  it('shadowRoot を持たず、本文 root は light DOM の #main-content のみであること', async () => {
    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1">
          <h1>SSR Title</h1>
          <p>SSR Body</p>
        </main></app-router
      >`,
    );
    const appHost = host;

    await appHost.whenReady();

    expect(appHost.shadowRoot).to.equal(null);
    expect(appHost.querySelectorAll('main').length).to.equal(1);
    expect(appHost.querySelectorAll('#main-content').length).to.equal(1);
    expect(appHost.getContentRoot?.()).to.equal(appHost.querySelector('#main-content'));
    expect(appHost.querySelector('#main-content')?.parentElement).to.equal(appHost);
  });

  it('SSR された main の内容を保持し、初回 fetch を行わないこと', async () => {
    let fetchCalled = false;
    globalThis.fetch = () => {
      fetchCalled = true;
      return Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Should Not Load</h1>',
          title: 'Should Not Load - Rouault',
          description: 'should not load',
        }),
      );
    };

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1">
          <h1>SSR Title</h1>
          <p>SSR Body</p>
        </main></app-router
      >`,
    );

    const appHost = host;
    await appHost.whenReady();

    expect(fetchCalled).to.equal(false);
    expect(appHost.shadowRoot).to.equal(null);
    expect(appHost.querySelectorAll('main').length).to.equal(1);
    expect(appHost.querySelectorAll('#main-content').length).to.equal(1);
    expect(appHost.querySelector('#main-content')?.innerHTML).to.contain('SSR Title');
    expect(appHost.querySelector('#main-content')?.innerHTML).to.contain('SSR Body');
  });

  it('初期 boot では本文要素の identity を維持し、content-dom-replaced と navigation-committed を発火しないこと', async () => {
    let contentDomReplacedCount = 0;
    let navigationCommittedCount = 0;

    host = await fixture<AppRouterElement>(
      html`<app-router>
        <main id="main-content" tabindex="-1">
          <header class="article-header"><h1>SSR Title</h1></header>
          <p>SSR Body</p>
        </main>
      </app-router>`,
    );
    const appHost = host;
    const main = appHost.querySelector<HTMLElement>('#main-content');
    const articleHeader = appHost.querySelector<HTMLElement>('.article-header');

    appHost.addEventListener('app-router:content-dom-replaced', () => {
      contentDomReplacedCount += 1;
    });
    appHost.addEventListener('app-router:navigation-committed', () => {
      navigationCommittedCount += 1;
    });

    await appHost.whenReady();

    expect(appHost.querySelector('#main-content')).to.equal(main);
    expect(appHost.querySelector('.article-header')).to.equal(articleHeader);
    expect(contentDomReplacedCount).to.equal(0);
    expect(navigationCommittedCount).to.equal(0);
  });

  it('初期 boot では SSR 済み TOC nav の identity も維持すること', async () => {
    host = await fixture<AppRouterElement>(
      html`<app-router>
        <main id="main-content" tabindex="-1">
          <article>
            <header class="article-header"><h1>SSR Title</h1></header>
            <aside class="layout-toc-col" data-layout-toc-root>
              <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
                <ol class="layout-toc__list">
                  <li class="layout-toc__item" data-heading-id="intro">
                    <a class="layout-toc__link" href="#intro" data-toc-link data-heading-id="intro">
                      <span class="layout-toc__link-label">Intro</span>
                    </a>
                  </li>
                </ol>
              </nav>
            </aside>
          </article>
        </main>
      </app-router>`,
    );
    const appHost = host;
    const tocNav = appHost.querySelector<HTMLElement>('.layout-toc');

    await appHost.whenReady();

    expect(appHost.querySelector('.layout-toc')).to.equal(tocNav);
  });

  it('既存の main#main-content を public contract の本文 root として再利用すること', async () => {
    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1">
          <h1>SSR Contract Root</h1>
        </main></app-router
      >`,
    );
    const appHost = host;

    await appHost.whenReady();

    expect(appHost.getContentRoot()).to.equal(appHost.querySelector('main#main-content'));
    expect(appHost.querySelectorAll('main#main-content').length).to.equal(1);
    expect(appHost.querySelector('main#main-content')?.textContent).to.contain('SSR Contract Root');
  });

  it('main#main-content が無い場合は新しい canonical root を作成し既存 sibling を保持すること', async () => {
    host = await fixture<AppRouterElement>(
      html`<app-router><aside data-app-shell-sidebar-host></aside></app-router>`,
    );
    const appHost = host;

    await appHost.whenReady();

    expect(appHost.getContentRoot()).to.equal(appHost.querySelector('main#main-content'));
    expect(appHost.querySelectorAll('main').length).to.equal(1);
    expect(appHost.querySelector('main#main-content')?.textContent).to.equal('');
    expect(appHost.querySelector('[data-app-shell-sidebar-host]')).to.be.instanceOf(HTMLElement);
  });

  it('ready と whenReady() を公開し、接続後に解決されること', async () => {
    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;

    expect(appHost.whenReady).to.be.a('function');
    expect(appHost.ready).to.be.instanceOf(Promise);

    await appHost.whenReady();
    await appHost.ready;
  });

  it('navigate() は NavigationResult を返し main を更新し navigation-committed detail に contentRoot と result を含めること', async () => {
    const committedDetails: AppRouterNavigationCommittedDetail[] = [];

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Client Page</h1>',
          title: 'Client Routed',
          description: 'client routed',
        }),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;

    await appHost.whenReady();

    appHost.addEventListener('app-router:navigation-committed', (event: Event) => {
      const detail = (event as CustomEvent<AppRouterNavigationCommittedDetail>).detail;
      committedDetails.push(detail);
    });

    const result = await appHost.navigate('/client-page');

    await waitUntil(() => {
      const text = appHost.querySelector('#main-content')?.textContent ?? '';
      return text.includes('Client Page');
    }, 'ページコンテンツが差し替わること');

    expect(result.outcome).to.equal('completed');
    expect(result.renderedKind).to.equal('page');
    expect(document.title).to.equal('Client Routed');
    expect(appHost.querySelectorAll('main').length).to.equal(1);
    expect(appHost.querySelectorAll('#main-content').length).to.equal(1);
    expect(committedDetails.length).to.equal(1);

    const detail = committedDetails[0];
    if (!detail) {
      throw new Error('navigation-committed detail が記録されていません');
    }

    expect(detail.contentRoot).to.equal(appHost.getContentRoot());
    expect(detail.result.outcome).to.equal('completed');
    expect(detail.result.committed).to.equal(true);
    expect(detail.result.stateOnly).to.equal(false);
    expect(detail.result.renderedKind).to.equal('page');
  });

  it('content-dom-replaced は navigation-committed より前に発火すること', async () => {
    const events: string[] = [];

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Ordered Page</h1>',
          title: 'Ordered Page',
          description: 'ordered page',
        }),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;

    await appHost.whenReady();

    appHost.addEventListener('app-router:content-dom-replaced', (event: Event) => {
      const detail = (event as CustomEvent<AppRouterContentDomReplacedDetail>).detail;
      expect(detail.contentRoot).to.equal(appHost.getContentRoot());
      events.push('content-dom-replaced');
    });

    appHost.addEventListener('app-router:navigation-committed', (event: Event) => {
      const detail = (event as CustomEvent<AppRouterNavigationCommittedDetail>).detail;
      expect(detail.contentRoot).to.equal(appHost.getContentRoot());
      expect(detail.result.outcome).to.equal('completed');
      events.push('navigation-committed');
    });

    const result = await appHost.navigate('/ordered-page');

    expect(result.outcome).to.equal('completed');
    expect(events).to.deep.equal(['content-dom-replaced', 'navigation-committed']);
  });

  it('SSR 済み app-router からでも navigate() で本文を差し替えられること', async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Hydrated Client Page</h1>',
          title: 'Hydrated Client Routed',
          description: 'hydrated client routed',
        }),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router>
        <div
          data-app-router-announcement=""
          aria-live="polite"
          aria-atomic="true"
          class="sr-only"
        ></div>
        <main id="main-content" tabindex="-1">
          <h1>SSR Title</h1>
        </main>
      </app-router>`,
    );
    const appHost = host;

    await appHost.whenReady();

    const result = await appHost.navigate('/hydrated-client-page');

    await waitUntil(() => {
      const text = appHost.querySelector('#main-content')?.textContent ?? '';
      return text.includes('Hydrated Client Page');
    }, 'SSR 済みの app-router でもページコンテンツが差し替わること');

    expect(result.outcome).to.equal('completed');
    expect(result.renderedKind).to.equal('page');
    expect(document.title).to.equal('Hydrated Client Routed');
    expect(appHost.querySelectorAll('main').length).to.equal(1);
    expect(appHost.querySelectorAll('#main-content').length).to.equal(1);
  });

  it('post-commit controller が aria-live と main への focus を担うこと', async () => {
    let focusedTagName = '';
    let focusOptions: FocusOptions | undefined;

    Object.defineProperty(HTMLElement.prototype, 'focus', {
      configurable: true,
      writable: true,
      value(this: HTMLElement, options?: FocusOptions) {
        focusedTagName = this.tagName;
        focusOptions = options;
      },
    });

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Focused Heading</h1>',
          title: 'Focused Page',
          description: 'focused page',
        }),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;

    await appHost.whenReady();

    await appHost.navigate('/focused-page');

    await waitUntil(
      () =>
        (appHost
          .querySelector('[data-app-router-announcement]')
          ?.textContent.includes('ページが読み込まれました') ??
          false) &&
        focusedTagName === 'MAIN',
      'aria-live と main への focus が更新されること',
    );

    expect(appHost.querySelectorAll('[data-app-router-announcement]').length).to.equal(1);
    expect(appHost.querySelectorAll('main').length).to.equal(1);
    expect(focusOptions).to.deep.equal({ preventScroll: true });
  });

  it('navigation-committed は post-commit による aria-live と focus 更新後に発火すること', async () => {
    let committedSnapshot:
      | {
          announcement: string;
          activeElement: Element | null;
          title: string;
        }
      | undefined;

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Post Commit Page</h1>',
          title: 'Post Commit Page',
          description: 'post commit page',
        }),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;

    await appHost.whenReady();

    appHost.addEventListener('app-router:navigation-committed', () => {
      committedSnapshot = {
        announcement:
          appHost.querySelector('[data-app-router-announcement]')?.textContent ?? '',
        activeElement: document.activeElement,
        title: document.title,
      };
    });

    const result = await appHost.navigate('/post-commit-page');
    const main = appHost.getContentRoot();

    expect(result.outcome).to.equal('completed');
    expect(committedSnapshot?.announcement).to.contain('ページが読み込まれました');
    expect(committedSnapshot?.activeElement).to.equal(main);
    expect(committedSnapshot?.title).to.equal('Post Commit Page');
  });

  it('client-side navigation 後は main#main-content に論理フォーカスを移しつつ可視リングを出さないこと', async () => {
    await ensureMainCssLoaded();

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Focused Main</h1><p><a href="/next">Next</a></p>',
          title: 'Focused Main',
          description: 'focused main',
        }),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;

    await appHost.whenReady();
    await appHost.navigate('/focused-main');

    await waitUntil(() => {
      const main = appHost.querySelector<HTMLElement>('main#main-content');
      return (
        main instanceof HTMLElement &&
        document.activeElement === main &&
        (main.textContent?.includes('Focused Main') ?? false)
      );
    }, '遷移後に main#main-content が activeElement になること');

    const main = appHost.querySelector<HTMLElement>('main#main-content');
    if (!(main instanceof HTMLElement)) {
      throw new Error('main#main-content が見つかりません');
    }

    const style = getComputedStyle(main);
    expect(document.activeElement).to.equal(main);
    expect(style.boxShadow).to.equal('none');
    expect(style.animationName).to.equal('none');
  });

  it('navigation:busy-change に応じて aria-busy を切り替えること', async () => {
    let resolveResponse: ((value: Response) => void) | undefined;

    globalThis.fetch = () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      });

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;
    await appHost.whenReady();

    const navigationPromise = appHost.navigate('/slow-page');

    await waitUntil(
      () => appHost.querySelector('#main-content')?.getAttribute('aria-busy') === 'true',
      'ナビゲーション中は aria-busy=true になること',
    );

    resolveResponse?.(
      createEnvelopeResponse({
        html: '<h1>Slow Content</h1>',
        title: 'Slow Page',
        description: 'slow page',
      }),
    );

    await navigationPromise;

    await waitUntil(
      () => !appHost.querySelector('#main-content')?.hasAttribute('aria-busy'),
      '完了後は aria-busy が外れること',
    );

    expect(appHost.querySelectorAll('main').length).to.equal(1);
    expect(appHost.querySelector('#main-content')?.hasAttribute('aria-busy')).to.equal(false);
  });

  it('shell adapter 経由で layout-header を同期すること', async () => {
    const header = await fixture<HTMLElement>(
      html`<layout-header
        corpora-json='[{"key":"all","label":"すべてのノート","href":"/corpora/"}]'
        current-corpus-key="all"
      ></layout-header>`,
    );

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Header Synced</h1>',
          title: 'Header Sync',
          description: 'header sync',
          shellProjection: {
            header: {
              corpora: [
                { key: 'all', label: 'すべてのノート', href: '/corpora/' },
                { key: 'music', label: '音楽', href: '/corpora/music/' },
              ],
              currentCorpusKey: 'music',
              noteLayout: true,
              sidebarEnabled: true,
              sidebarId: 'note-primary',
              tocPresence: 'present',
              tocRuntimeId: 'toc-source-note',
              tocOwnerId: 'toc-owner-note',
              tocTriggerReserved: true,
            },
            sidebar: createValidSidebarProjection(),
          },
        }),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;
    await appHost.whenReady();

    await appHost.navigate('/notes/new-note');

    await waitUntil(
      () => header.getAttribute('current-corpus-key') === 'music',
      'current-corpus-key が同期されること',
    );

    expect(header.hasAttribute('note-layout')).to.equal(true);
    expect(header.hasAttribute('sidebar-enabled')).to.equal(true);
    expect(header.getAttribute('toc-presence')).to.equal('present');
    expect(header.getAttribute('corpora-json')).to.equal(
      '[{"key":"all","label":"すべてのノート","href":"/corpora/"},{"key":"music","label":"音楽","href":"/corpora/music/"}]',
    );
    expect(header.getAttribute('current-corpus-key')).to.equal('music');
  });

  it('同一 sidebar host を維持したまま selectedId と本文だけを更新すること', async () => {
    const shell = await fixture<HTMLElement>(html`
      <div>
        <layout-header current-corpus-key="all"></layout-header>
        <app-router data-sidebar-presence="present">
          <aside class="layout-sidebar-col" data-app-shell-sidebar-host>
            <layout-sidebar
              state-scope-id="note-navigation"
              selected-id="notes/old"
              initial-expanded-ids="[]"
              topology-revision="topology:old"
              fixed-breakpoint="1024"
              sidebar-id="note-primary"
              presentation="auto"
              ><nav
                data-sidebar-nav
                aria-label="ノートナビゲーション"
                data-sidebar-id="note-primary"
                data-topology-revision="topology:old"
              >
                <ul>
                  <li data-node-id="notes/old" data-node-kind="leaf" data-node-depth="0">
                    <a
                      data-sidebar-nav-control
                      data-sidebar-nav-link
                      href="/notes/old"
                      aria-current="page"
                      ><span data-sidebar-nav-label>Old</span></a
                    >
                  </li>
                </ul>
              </nav></layout-sidebar
            >
          </aside>
          <main id="main-content" tabindex="-1"><h1>SSR Title</h1></main>
        </app-router>
      </div>
    `);
    host = shell.querySelector<AppRouterElement>('app-router');
    const appHost = host;

    if (!appHost) {
      throw new Error('app-router が見つかりません');
    }

    const initialSidebar = getPersistentSidebarHost(shell);
    await appHost.whenReady();

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Sidebar Synced</h1>',
          title: 'Sidebar Sync',
          description: 'sidebar sync',
          shellProjection: {
            header: {
              corpora: [],
              currentCorpusKey: 'music',
              noteLayout: false,
              sidebarEnabled: true,
              sidebarId: 'note-primary',
              tocPresence: 'absent',
              tocRuntimeId: null,
              tocOwnerId: null,
              tocTriggerReserved: false,
            },
            sidebar: {
              present: true,
              stateScopeId: 'note-navigation',
              selectedId: 'notes/new',
              initialExpandedIds: [],
              topologyRevision: 'topology:new',
              navHtml:
                '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="topology:new"><ul><li data-node-id="notes/new" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/new" aria-current="page"><span data-sidebar-nav-label>New</span></a></li></ul></nav>',
              heading: '新しいナビゲーション',
              fixedBreakpoint: 1440,
              sidebarId: 'note-primary',
              presentation: 'fixed',
            },
          },
        }),
      );

    await appHost.navigate('/notes/new');

    await waitUntil(
      () =>
        appHost.querySelector('#main-content')?.textContent?.includes('Sidebar Synced') ?? false,
      '本文が更新されること',
    );

    const currentSidebar = getPersistentSidebarHost(shell);
    expect(currentSidebar).to.equal(initialSidebar);
    expect(currentSidebar?.getAttribute('selected-id')).to.equal('notes/new');
    expect(currentSidebar?.getAttribute('state-scope-id')).to.equal('note-navigation');
    expect(currentSidebar?.getAttribute('heading')).to.equal('新しいナビゲーション');
    expect(currentSidebar?.getAttribute('fixed-breakpoint')).to.equal('1440');
    expect(currentSidebar?.getAttribute('presentation')).to.equal('fixed');
    expect(appHost.getAttribute('data-sidebar-presence')).to.equal('present');
  });

  it('heading ありの sidebar から heading なしの projection へ遷移すると heading attribute を除去すること', async () => {
    const shell = await fixture<HTMLElement>(html`
      <div>
        <layout-header current-corpus-key="all"></layout-header>
        <app-router data-sidebar-presence="present">
          <aside class="layout-sidebar-col" data-app-shell-sidebar-host>
            <layout-sidebar
              state-scope-id="note-navigation"
              selected-id="notes/old"
              initial-expanded-ids="[]"
              topology-revision="topology:old"
              heading="古い見出し"
              fixed-breakpoint="1024"
              sidebar-id="note-primary"
              presentation="fixed"
              ><nav
                data-sidebar-nav
                aria-label="ノートナビゲーション"
                data-sidebar-id="note-primary"
                data-topology-revision="topology:old"
              >
                <ul>
                  <li data-node-id="notes/old" data-node-kind="leaf" data-node-depth="0">
                    <a
                      data-sidebar-nav-control
                      data-sidebar-nav-link
                      href="/notes/old"
                      aria-current="page"
                      ><span data-sidebar-nav-label>Old</span></a
                    >
                  </li>
                </ul>
              </nav></layout-sidebar
            >
          </aside>
          <main id="main-content" tabindex="-1"><h1>SSR Title</h1></main>
        </app-router>
      </div>
    `);
    host = shell.querySelector<AppRouterElement>('app-router');
    const appHost = host;

    if (!appHost) {
      throw new Error('app-router が見つかりません');
    }

    await appHost.whenReady();

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Heading Removed</h1>',
          title: 'Heading Removed',
          description: 'heading removed',
          shellProjection: {
            header: {
              corpora: [],
              currentCorpusKey: 'all',
              noteLayout: false,
              sidebarEnabled: true,
              sidebarId: 'note-primary',
              tocPresence: 'absent',
              tocRuntimeId: null,
              tocOwnerId: null,
              tocTriggerReserved: false,
            },
            sidebar: {
              present: true,
              stateScopeId: 'note-navigation',
              selectedId: 'notes/new',
              initialExpandedIds: [],
              topologyRevision: 'topology:new',
              navHtml:
                '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="topology:new"><ul><li data-node-id="notes/new" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/new" aria-current="page"><span data-sidebar-nav-label>New</span></a></li></ul></nav>',
              heading: null,
              fixedBreakpoint: 1024,
              sidebarId: 'note-primary',
              presentation: 'fixed',
            },
          },
        }),
      );

    await appHost.navigate('/notes/new');

    await waitUntil(
      () =>
        appHost.querySelector('#main-content')?.textContent?.includes('Heading Removed') ?? false,
      '本文が更新されること',
    );

    const currentSidebar = getPersistentSidebarHost(shell) as
      | (HTMLElement & { readShellProjection?: () => { heading: string | null } })
      | null;
    expect(currentSidebar?.hasAttribute('heading')).to.equal(false);
    expect(currentSidebar?.readShellProjection?.().heading).to.equal(null);
  });

  it('sidebar を持たない遷移先では persistent host を hidden にすること', async () => {
    const shell = await fixture<HTMLElement>(html`
      <div>
        <layout-header current-corpus-key="all"></layout-header>
        <app-router data-sidebar-presence="present">
          <aside class="layout-sidebar-col" data-app-shell-sidebar-host>
            <layout-sidebar
              state-scope-id="note-navigation"
              selected-id="notes/old"
              initial-expanded-ids="[]"
              topology-revision="topology:old"
              fixed-breakpoint="1024"
              sidebar-id="note-primary"
              presentation="auto"
              ><nav
                data-sidebar-nav
                aria-label="ノートナビゲーション"
                data-sidebar-id="note-primary"
                data-topology-revision="topology:old"
              >
                <ul>
                  <li data-node-id="notes/old" data-node-kind="leaf" data-node-depth="0">
                    <a
                      data-sidebar-nav-control
                      data-sidebar-nav-link
                      href="/notes/old"
                      aria-current="page"
                      ><span data-sidebar-nav-label>Old</span></a
                    >
                  </li>
                </ul>
              </nav></layout-sidebar
            >
          </aside>
          <main id="main-content" tabindex="-1"><h1>SSR Title</h1></main>
        </app-router>
      </div>
    `);
    host = shell.querySelector<AppRouterElement>('app-router');
    const appHost = host;

    if (!appHost) {
      throw new Error('app-router が見つかりません');
    }

    await appHost.whenReady();

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>No Sidebar Content</h1>',
          title: 'No Sidebar',
          description: 'no sidebar',
          shellProjection: {
            header: {
              corpora: [],
              currentCorpusKey: 'all',
              noteLayout: false,
              sidebarEnabled: false,
              sidebarId: 'note-primary',
              tocPresence: 'absent',
              tocRuntimeId: null,
              tocOwnerId: null,
              tocTriggerReserved: false,
            },
            sidebar: null,
          },
        }),
      );

    await appHost.navigate('/standalone-page');

    await waitUntil(
      () =>
        appHost.querySelector('#main-content')?.textContent?.includes('No Sidebar Content') ??
        false,
      '本文が更新されること',
    );

    const sidebarColumn = getPersistentSidebarColumn(shell);
    const sidebar = getPersistentSidebarHost(shell);
    expect(appHost.getAttribute('data-sidebar-presence')).to.equal('absent');
    expect(sidebarColumn?.hidden).to.equal(true);
    expect(sidebar?.hidden).to.equal(true);
    expect(sidebar?.hasAttribute('state-scope-id')).to.equal(false);
    expect(sidebar?.hasAttribute('selected-id')).to.equal(false);
    expect(sidebar?.hasAttribute('fixed-breakpoint')).to.equal(false);
    expect(sidebar?.getAttribute('presentation')).to.equal('auto');
    expect(sidebar?.innerHTML).not.to.contain('data-sidebar-nav');
  });

  it('sidebar.present=false は defensive absent として stale projection を clear すること', async () => {
    const shell = await fixture<HTMLElement>(html`
      <div>
        <layout-header current-corpus-key="all"></layout-header>
        <app-router data-sidebar-presence="present">
          <aside class="layout-sidebar-col" data-app-shell-sidebar-host>
            <layout-sidebar
              state-scope-id="note-navigation"
              selected-id="notes/old"
              initial-expanded-ids="[]"
              topology-revision="topology:old"
              heading="古い見出し"
              fixed-breakpoint="1440"
              sidebar-id="note-primary"
              presentation="fixed"
              ><nav
                data-sidebar-nav
                aria-label="ノートナビゲーション"
                data-sidebar-id="note-primary"
                data-topology-revision="topology:old"
              >
                <ul>
                  <li data-node-id="notes/old" data-node-kind="leaf" data-node-depth="0">
                    <a
                      data-sidebar-nav-control
                      data-sidebar-nav-link
                      href="/notes/old"
                      aria-current="page"
                    >
                      <span data-sidebar-nav-label>Old</span>
                    </a>
                  </li>
                </ul>
              </nav></layout-sidebar
            >
          </aside>
          <main id="main-content" tabindex="-1"><h1>SSR Title</h1></main>
        </app-router>
      </div>
    `);
    host = shell.querySelector<AppRouterElement>('app-router');
    const appHost = host;

    if (!appHost) {
      throw new Error('app-router が見つかりません');
    }

    await appHost.whenReady();

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Defensive Absent</h1>',
          title: 'Defensive Absent',
          description: 'defensive absent',
          shellProjection: {
            header: {
              corpora: [],
              currentCorpusKey: 'all',
              noteLayout: false,
              sidebarEnabled: false,
              sidebarId: 'note-primary',
              tocPresence: 'absent',
              tocRuntimeId: null,
              tocOwnerId: null,
              tocTriggerReserved: false,
            },
            sidebar: null
          },
        }),
      );

    await appHost.navigate('/standalone-page');

    await waitUntil(
      () =>
        appHost.querySelector('#main-content')?.textContent?.includes('Defensive Absent') ?? false,
      '本文が更新されること',
    );

    const sidebarColumn = getPersistentSidebarColumn(shell);
    const sidebar = getPersistentSidebarHost(shell);
    expect(appHost.getAttribute('data-sidebar-presence')).to.equal('absent');
    expect(sidebarColumn?.hidden).to.equal(true);
    expect(sidebar?.hidden).to.equal(true);
    expect(sidebar?.hasAttribute('state-scope-id')).to.equal(false);
    expect(sidebar?.hasAttribute('selected-id')).to.equal(false);
    expect(sidebar?.hasAttribute('initial-expanded-ids')).to.equal(false);
    expect(sidebar?.hasAttribute('topology-revision')).to.equal(false);
    expect(sidebar?.hasAttribute('heading')).to.equal(false);
    expect(sidebar?.hasAttribute('fixed-breakpoint')).to.equal(false);
    expect(sidebar?.getAttribute('presentation')).to.equal('auto');
    expect(sidebar?.innerHTML).not.to.contain('data-sidebar-nav');
  });

  it('sidebar shell commit failure では sidebar 属性と本文を rollback すること', async () => {
    document.title = 'Before Sidebar Failure';

    const shell = await fixture<HTMLElement>(html`
      <div>
        <layout-header current-corpus-key="all"></layout-header>
        <app-router data-sidebar-presence="present">
          <aside class="layout-sidebar-col" data-app-shell-sidebar-host>
            <layout-sidebar
              state-scope-id="note-navigation"
              selected-id="notes/old"
              initial-expanded-ids="[]"
              topology-revision="topology:old"
              heading="古いナビゲーション"
              fixed-breakpoint="1024"
              sidebar-id="note-primary"
              presentation="auto"
              ><nav
                data-sidebar-nav
                aria-label="ノートナビゲーション"
                data-sidebar-id="note-primary"
                data-topology-revision="topology:old"
              >
                <ul>
                  <li data-node-id="notes/old" data-node-kind="leaf" data-node-depth="0">
                    <a
                      data-sidebar-nav-control
                      data-sidebar-nav-link
                      href="/notes/old"
                      aria-current="page"
                      ><span data-sidebar-nav-label>Old</span></a
                    >
                  </li>
                </ul>
              </nav></layout-sidebar
            >
          </aside>
          <main id="main-content" tabindex="-1"><h1>SSR Title</h1></main>
        </app-router>
      </div>
    `);
    host = shell.querySelector<AppRouterElement>('app-router');
    const appHost = host;

    if (!appHost) {
      throw new Error('app-router が見つかりません');
    }

    const sidebar = getPersistentSidebarHost(shell);
    if (!sidebar) {
      throw new Error('layout-sidebar が見つかりません');
    }

    await appHost.whenReady();

    const projectionSidebar = sidebar as HTMLElement & {
      applyShellProjection?: (snapshot: unknown) => void;
    };
    const originalApplyShellProjection =
      projectionSidebar.applyShellProjection?.bind(projectionSidebar);
    let shouldThrow = true;
    projectionSidebar.applyShellProjection = (snapshot: unknown): void => {
      if (shouldThrow) {
        shouldThrow = false;
        throw new Error('sidebar commit failed');
      }

      originalApplyShellProjection?.(snapshot);
    };

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Broken Sidebar Content</h1>',
          title: 'Broken Sidebar Sync',
          description: 'broken sidebar sync',
          shellProjection: {
            header: {
              corpora: [],
              currentCorpusKey: 'music',
              noteLayout: false,
              sidebarEnabled: true,
              sidebarId: 'note-primary',
              tocPresence: 'absent',
              tocRuntimeId: null,
              tocOwnerId: null,
              tocTriggerReserved: false,
            },
            sidebar: {
              present: true,
              stateScopeId: 'reference-navigation',
              selectedId: 'notes/new',
              initialExpandedIds: [],
              topologyRevision: 'topology:new',
              navHtml:
                '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="topology:new"><ul><li data-node-id="notes/new" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/new" aria-current="page"><span data-sidebar-nav-label>New</span></a></li></ul></nav>',
              heading: '新しいナビゲーション',
              fixedBreakpoint: 1440,
              sidebarId: 'note-primary',
              presentation: 'fixed',
            },
          },
        }),
      );

    const result = await appHost.navigate('/broken-sidebar');

    await waitUntil(
      () => appHost.querySelector('#main-content')?.textContent?.includes('SSR Title') ?? false,
      'rollback 後に本文が戻ること',
    );

    const currentSidebar = getPersistentSidebarHost(shell);
    const currentSidebarColumn = getPersistentSidebarColumn(shell);
    expect(result.outcome).to.equal('failed');
    expect(result.committed).to.equal(false);
    expect(result.renderedKind).to.equal(null);
    expect(appHost.getAttribute('data-sidebar-presence')).to.equal('present');
    expect(currentSidebarColumn?.hidden).to.equal(false);
    expect(currentSidebar?.getAttribute('state-scope-id')).to.equal('note-navigation');
    expect(currentSidebar?.getAttribute('selected-id')).to.equal('notes/old');
    expect(currentSidebar?.getAttribute('heading')).to.equal('古いナビゲーション');
    expect(currentSidebar?.getAttribute('fixed-breakpoint')).to.equal('1024');
    expect(currentSidebar?.getAttribute('presentation')).to.equal('auto');
    expect(document.title).to.equal('Before Sidebar Failure');
  });

  it('shell commit failure では layout-header と本文を rollback して failed を返すこと', async () => {
    document.title = 'Before Header Failure';

    const header = await fixture<HTMLElement>(
      html`<layout-header
        corpora-json='[{"key":"all","label":"すべてのノート","href":"/corpora/"}]'
        current-corpus-key="all"
      ></layout-header>`,
    );

    const originalSetAttribute = header.setAttribute.bind(header);
    let shouldThrow = true;
    Object.defineProperty(header, 'setAttribute', {
      configurable: true,
      value(name: string, value: string) {
        if (shouldThrow && name === 'corpora-json') {
          shouldThrow = false;
          throw new Error('header commit failed');
        }

        originalSetAttribute(name, value);
      },
    });

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Broken Header Synced</h1>',
          title: 'Broken Header Sync',
          description: 'broken header sync',
          shellProjection: {
            header: {
              corpora: [{ key: 'music', label: '音楽', href: '/corpora/music/' }],
              currentCorpusKey: 'music',
              noteLayout: true,
              sidebarEnabled: true,
              sidebarId: 'note-primary',
              tocPresence: 'present',
              tocRuntimeId: 'toc-source-note',
              tocOwnerId: 'toc-owner-note',
              tocTriggerReserved: true,
            },
            sidebar: createValidSidebarProjection(),
          },
        }),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;
    await appHost.whenReady();

    const result = await appHost.navigate('/notes/broken-note');

    await waitUntil(() => {
      const text = appHost.querySelector('#main-content')?.textContent ?? '';
      return text.includes('SSR Title');
    }, 'shell failure 後に本文が rollback されること');

    expect(result.outcome).to.equal('failed');
    expect(result.committed).to.equal(false);
    expect(result.renderedKind).to.equal(null);
    expect(result.degraded).to.equal(false);
    expect(result.issues).to.deep.equal([]);
    expect(header.getAttribute('corpora-json')).to.equal(
      '[{"key":"all","label":"すべてのノート","href":"/corpora/"}]',
    );
    expect(header.getAttribute('current-corpus-key')).to.equal('all');
    expect(header.hasAttribute('note-layout')).to.equal(false);
    expect(header.hasAttribute('sidebar-enabled')).to.equal(false);
    expect(header.getAttribute('toc-presence')).to.equal('absent');
    expect(appHost.querySelectorAll('main').length).to.equal(1);
    expect(appHost.querySelector('#main-content')?.textContent).to.contain('SSR Title');
    expect(appHost.querySelector('#main-content')?.textContent).not.to.contain(
      'Broken Header Synced',
    );
    expect(document.title).to.equal('Before Header Failure');
  });

  it('durable commit 失敗または rollback を伴う navigation では navigation-committed を発火しないこと', async () => {
    const events: string[] = [];

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: '<h1>Rollback Page</h1>',
          title: 'Rollback Page',
          description: 'rollback page',
        }),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;
    await appHost.whenReady();

    const previousMainText = appHost.querySelector('#main-content')?.textContent ?? '';

    appHost.addEventListener('app-router:content-dom-replaced', () => {
      events.push('content-dom-replaced');
    });
    appHost.addEventListener('app-router:navigation-committed', () => {
      events.push('navigation-committed');
    });

    const currentPushState = history.pushState;
    history.pushState = (() => {
      throw new Error('mock pushState failure');
    }) as typeof history.pushState;

    try {
      const result = await appHost.navigate('/rollback-page');

      expect(result.outcome).to.equal('failed');
      expect(result.committed).to.equal(false);
      expect(events).to.not.include('navigation-committed');
      expect(events.filter((event) => event === 'content-dom-replaced').length).to.equal(2);
      expect(appHost.querySelector('#main-content')?.textContent ?? '').to.equal(previousMainText);
    } finally {
      history.pushState = currentPushState;
    }
  });

  it('primary tab の state-only navigation で URL state 通知と hash scroll を行うこと', async () => {
    mockHistoryState = {
      __routerUrl: '/notes/testing?tab=overview',
    };

    let scrollTargetId = '';
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value(this: HTMLElement) {
        scrollTargetId = this.id;
      },
    });

    const heading = await fixture<HTMLElement>(html`<h2 id="details-heading">Details</h2>`);

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;
    await appHost.whenReady();

    let eventDetail:
      | {
          previousUrl: string;
          url: string;
        }
      | undefined;
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<{ previousUrl: string; url: string }>;
      eventDetail = customEvent.detail;
    };
    window.addEventListener(PRIMARY_TAB_URL_STATE_CHANGE_EVENT, listener);

    try {
      const result = await appHost.navigate('/notes/testing?tab=details#details-heading');

      await waitUntil(
        () => scrollTargetId === 'details-heading',
        'state-only 後に hash target へ scroll すること',
      );

      expect(result.stateOnly).to.equal(true);
      expect(result.source).to.equal('state-only');
      expect(eventDetail).to.deep.equal({
        previousUrl: '/notes/testing?tab=overview',
        url: '/notes/testing?tab=details#details-heading',
      });
    } finally {
      window.removeEventListener(PRIMARY_TAB_URL_STATE_CHANGE_EVENT, listener);
      heading.remove();
    }
  });

  it('primary tab の state-only navigation では content-dom-replaced と navigation-committed を発火しないこと', async () => {
    mockHistoryState = {
      __routerUrl: '/notes/state-only-test?tab=overview',
    };

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR State Only</h1></main></app-router
      >`,
    );
    const appHost = host;
    await appHost.whenReady();

    const main = appHost.querySelector<HTMLElement>('#main-content');
    const previousText = main?.textContent ?? '';
    let contentDomReplacedCount = 0;
    let navigationCommittedCount = 0;
    let eventDetail:
      | {
          previousUrl: string;
          url: string;
        }
      | undefined;

    appHost.addEventListener('app-router:content-dom-replaced', () => {
      contentDomReplacedCount += 1;
    });
    appHost.addEventListener('app-router:navigation-committed', () => {
      navigationCommittedCount += 1;
    });

    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<{ previousUrl: string; url: string }>;
      eventDetail = customEvent.detail;
    };
    window.addEventListener(PRIMARY_TAB_URL_STATE_CHANGE_EVENT, listener);

    try {
      const result = await appHost.navigate('/notes/state-only-test?tab=details');

      expect(result.outcome).to.equal('completed');
      expect(result.committed).to.equal(true);
      expect(result.stateOnly).to.equal(true);
      expect(result.source).to.equal('state-only');
      expect(result.renderedKind).to.equal(null);
      expect(contentDomReplacedCount).to.equal(0);
      expect(navigationCommittedCount).to.equal(0);
      expect(eventDetail).to.deep.equal({
        previousUrl: '/notes/state-only-test?tab=overview',
        url: '/notes/state-only-test?tab=details',
      });
      expect(appHost.querySelector('#main-content')).to.equal(main);
      expect(appHost.querySelector('#main-content')?.textContent ?? '').to.equal(previousText);
    } finally {
      window.removeEventListener(PRIMARY_TAB_URL_STATE_CHANGE_EVENT, listener);
    }
  });

  it('full navigation でも hash 付き URL なら先頭ではなく hash target へ scroll すること', async () => {
    let scrollToCalled = false;
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      writable: true,
      value: () => {
        scrollToCalled = true;
      },
    });

    let scrollTargetId = '';
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value(this: HTMLElement) {
        scrollTargetId = this.id;
      },
    });

    globalThis.fetch = () =>
      Promise.resolve(
        createEnvelopeResponse({
          html: `
            <h1>Hash Target Page</h1>
            <section style="height: 1200px"></section>
            <h2 id="details-heading">Details</h2>
          `,
          title: 'Hash Target Page',
          description: 'hash target page',
        }),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main id="main-content" tabindex="-1"><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;
    await appHost.whenReady();

    const result = await appHost.navigate('/hash-target#details-heading');

    await waitUntil(
      () => scrollTargetId === 'details-heading',
      'full navigation 後に hash target へ scroll すること',
    );

    expect(result.stateOnly).to.equal(false);
    expect(scrollTargetId).to.equal('details-heading');
    expect(scrollToCalled).to.equal(false);
  });

  it('boot 後の serverContent setter では採用済み SSR DOM を自動置換しないこと', async () => {
    host = await fixture<AppRouterElement>(
      html`<app-router>
        <main id="main-content" tabindex="-1"><h1>Initial SSR</h1></main>
      </app-router>`,
    );
    const appHost = host;

    await appHost.whenReady();

    appHost.serverContent = createRouterContentHtml('<h1>SSR Branded</h1><p>Body</p>');

    expect(appHost.shadowRoot).to.equal(null);
    expect(appHost.querySelectorAll('main').length).to.equal(1);
    expect(appHost.querySelectorAll('#main-content').length).to.equal(1);
    expect(appHost.querySelector('#main-content')?.innerHTML).to.contain('Initial SSR');
    expect(appHost.querySelector('#main-content')?.innerHTML).not.to.contain('SSR Branded');
  });

  it('pre-boot の serverContent setter があっても接続時は既存 SSR DOM を採用すること', async () => {
    const element = document.createElement('app-router') as AppRouterElement;
    element.serverContent = createRouterContentHtml('<h1>Preboot Server Content</h1>');
    element.innerHTML = '<main id="main-content" tabindex="-1"><h1>Existing SSR</h1></main>';

    document.body.append(element);
    host = element;

    await element.whenReady();

    expect(element.querySelectorAll('main').length).to.equal(1);
    expect(element.querySelectorAll('#main-content').length).to.equal(1);
    expect(element.querySelector('#main-content')?.innerHTML).to.contain('Existing SSR');
    expect(element.querySelector('#main-content')?.innerHTML).not.to.contain(
      'Preboot Server Content',
    );
  });
});
