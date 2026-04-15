import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import type { ShellProjectionSnapshot } from '../../shared/navigation/shell-projection.js';
import '../../src/components/app/app-router.js';
import type { AppRouterContentRenderedDetail } from '../../src/components/app/app-router.js';
import type { NavigationResult } from '../../src/router/router.js';
import { createRouterContentHtml } from '../../src/router/router-content-html.js';
import { PRIMARY_TAB_URL_STATE_CHANGE_EVENT } from '../../src/components/app/navigation/primary-tab-url-state.js';

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
      buildId: null,
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
    globalThis.fetch = () =>
      Promise.resolve(createEnvelopeResponse());

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

  it('navigate() は NavigationResult を返し main を更新し content-rendered detail に contentRoot を含めること', async () => {
    const renderedRoots: HTMLElement[] = [];

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

    appHost.addEventListener('app-router:content-rendered', (event: Event) => {
      const detail = (event as CustomEvent<AppRouterContentRenderedDetail>).detail;
      if (detail?.contentRoot instanceof HTMLElement) {
        renderedRoots.push(detail.contentRoot);
      }
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
    expect(renderedRoots.length).to.be.greaterThan(0);
    expect(renderedRoots.at(-1)).to.equal(
      appHost.getContentRoot?.() ?? appHost.querySelector('#main-content'),
    );
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
        <div data-app-router-announcement="" aria-live="polite" aria-atomic="true" class="sr-only"></div>
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
        breadcrumbs-json='[{"label":"Old","href":"/old"}]'
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
              breadcrumbs: [{ label: 'New Note', href: '/notes/new-note' }],
              corpora: [
                { key: 'all', label: 'すべてのノート', href: '/corpora/' },
                { key: 'music', label: '音楽', href: '/corpora/music/' },
              ],
              currentCorpusKey: 'music',
              noteLayout: true,
              sidebarEnabled: true,
              tocPresence: 'present',
            },
            sidebar: null,
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
      () =>
        header.getAttribute('breadcrumbs-json') ===
        '[{"label":"New Note","href":"/notes/new-note"}]',
      'breadcrumbs-json が同期されること',
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
              items-json='[{"kind":"leaf","id":"notes/old","label":"Old","href":"/notes/old"}]'
              heading="ナビゲーション"
              fixed-breakpoint="1024"
              sidebar-id="note-primary"
              presentation="auto"
            ></layout-sidebar>
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
              breadcrumbs: [],
              corpora: [],
              currentCorpusKey: 'music',
              noteLayout: false,
              sidebarEnabled: true,
              tocPresence: 'absent',
            },
            sidebar: {
              present: true,
              stateScopeId: 'note-navigation',
              selectedId: 'notes/new',
              structuralExpandedIds: [],
              topologyRevision: 'topology:new',
              navHtml:
                '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="topology:new"><ul><li data-node-id="notes/new" data-node-kind="leaf" data-node-depth="0"><a href="/notes/new" aria-current="page">New</a></li></ul></nav>',
              itemsJson:
                '[{"kind":"leaf","id":"notes/new","label":"New","href":"/notes/new"}]',
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
      () => appHost.querySelector('#main-content')?.textContent?.includes('Sidebar Synced') ?? false,
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

  it('sidebar を持たない遷移先では persistent host を hidden にすること', async () => {
    const shell = await fixture<HTMLElement>(html`
      <div>
        <layout-header current-corpus-key="all"></layout-header>
        <app-router data-sidebar-presence="present">
          <aside class="layout-sidebar-col" data-app-shell-sidebar-host>
            <layout-sidebar
              state-scope-id="note-navigation"
              selected-id="notes/old"
              items-json='[{"kind":"leaf","id":"notes/old","label":"Old","href":"/notes/old"}]'
              heading="ナビゲーション"
              fixed-breakpoint="1024"
              sidebar-id="note-primary"
              presentation="auto"
            ></layout-sidebar>
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
              breadcrumbs: [],
              corpora: [],
              currentCorpusKey: 'all',
              noteLayout: false,
              sidebarEnabled: false,
              tocPresence: 'absent',
            },
            sidebar: null,
          },
        }),
      );

    await appHost.navigate('/standalone-page');

    await waitUntil(
      () =>
        appHost.querySelector('#main-content')?.textContent?.includes('No Sidebar Content') ?? false,
      '本文が更新されること',
    );

    const sidebarColumn = getPersistentSidebarColumn(shell);
    const sidebar = getPersistentSidebarHost(shell);
    expect(appHost.getAttribute('data-sidebar-presence')).to.equal('absent');
    expect(sidebarColumn?.hidden).to.equal(true);
    expect(sidebar?.hidden).to.equal(true);
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
              items-json='[{"kind":"leaf","id":"notes/old","label":"Old","href":"/notes/old"}]'
              heading="古いナビゲーション"
              fixed-breakpoint="1024"
              sidebar-id="note-primary"
              presentation="auto"
            ></layout-sidebar>
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
    const originalApplyShellProjection = projectionSidebar.applyShellProjection?.bind(projectionSidebar);
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
              breadcrumbs: [],
              corpora: [],
              currentCorpusKey: 'music',
              noteLayout: false,
              sidebarEnabled: true,
              tocPresence: 'absent',
            },
            sidebar: {
              present: true,
              stateScopeId: 'reference-navigation',
              selectedId: 'notes/new',
              structuralExpandedIds: [],
              topologyRevision: 'topology:new',
              navHtml:
                '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="topology:new"><ul><li data-node-id="notes/new" data-node-kind="leaf" data-node-depth="0"><a href="/notes/new" aria-current="page">New</a></li></ul></nav>',
              itemsJson:
                '[{"kind":"leaf","id":"notes/new","label":"New","href":"/notes/new"}]',
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
    expect(currentSidebar?.getAttribute('items-json')).to.equal(
      '[{"kind":"leaf","id":"notes/old","label":"Old","href":"/notes/old"}]',
    );
    expect(currentSidebar?.getAttribute('heading')).to.equal('古いナビゲーション');
    expect(currentSidebar?.getAttribute('fixed-breakpoint')).to.equal('1024');
    expect(currentSidebar?.getAttribute('presentation')).to.equal('auto');
    expect(document.title).to.equal('Before Sidebar Failure');
  });

  it('shell commit failure では layout-header と本文を rollback して failed を返すこと', async () => {
    document.title = 'Before Header Failure';

    const header = await fixture<HTMLElement>(
      html`<layout-header
        breadcrumbs-json='[{"label":"Old","href":"/old"}]'
        corpora-json='[{"key":"all","label":"すべてのノート","href":"/corpora/"}]'
        current-corpus-key="all"
      ></layout-header>`,
    );

    const originalSetAttribute = header.setAttribute.bind(header);
    let shouldThrow = true;
    Object.defineProperty(header, 'setAttribute', {
      configurable: true,
      value(name: string, value: string) {
        if (shouldThrow && name === 'breadcrumbs-json') {
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
              breadcrumbs: [{ label: 'Broken Note', href: '/notes/broken-note' }],
              corpora: [{ key: 'music', label: '音楽', href: '/corpora/music/' }],
              currentCorpusKey: 'music',
              noteLayout: true,
              sidebarEnabled: true,
              tocPresence: 'present',
            },
            sidebar: null,
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
    expect(header.getAttribute('breadcrumbs-json')).to.equal('[{"label":"Old","href":"/old"}]');
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

  it('primary tab の state-only navigation で URL state 通知と hash scroll を行うこと', async () => {
    mockHistoryState = {
      __routerUrl: '/notes/testing?tab=overview',
      __routerPath: '/notes/testing',
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

  it('serverContent に branded 本文を与えた場合も #main-content を唯一の更新先として描画できること', async () => {
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
    expect(appHost.querySelector('#main-content')?.innerHTML).to.contain('SSR Branded');
    expect(appHost.querySelector('#main-content')?.innerHTML).to.contain('Body');
  });
});
