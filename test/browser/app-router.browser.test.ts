import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '../../src/components/app/app-router.js';
import type { NavigationResult } from '../../src/router/router.js';
import { createRouterContentHtml } from '../../src/router/router-content-html.js';
import { PRIMARY_TAB_URL_STATE_CHANGE_EVENT } from '../../src/components/app/navigation/primary-tab-url-state.js';

type AppRouterElement = HTMLElement & {
  updateComplete: Promise<unknown>;
  navigate(url: string): Promise<NavigationResult>;
};

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
      Promise.resolve(
        new Response('<html><body><main>Default App Router Mock</main></body></html>', {
          status: 200,
        }),
      );

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
        __routerPath: target.pathname,
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
        __routerPath: target.pathname,
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

  it('SSR された main の内容を保持し、初回 fetch を行わないこと', async () => {
    let fetchCalled = false;
    globalThis.fetch = () => {
      fetchCalled = true;
      return Promise.resolve(
        new Response('<html><body><main>Should Not Load</main></body></html>', {
          status: 200,
        }),
      );
    };

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main>
          <h1>SSR Title</h1>
          <p>SSR Body</p>
        </main></app-router
      >`,
    );

    const appHost = host;
    await appHost.updateComplete;

    expect(fetchCalled).to.equal(false);
    expect(appHost.querySelectorAll('main').length).to.equal(1);
    expect(appHost.querySelector('#main-content')?.innerHTML).to.contain('SSR Title');
    expect(appHost.querySelector('#main-content')?.innerHTML).to.contain('SSR Body');
  });

  it('navigate() は NavigationResult を返し main を更新すること', async () => {
    let renderedCount = 0;

    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          `
            <!doctype html>
            <html>
              <head><title>Client Routed</title></head>
              <body><main><h1>Client Page</h1></main></body>
            </html>
          `,
          { status: 200 },
        ),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;

    await appHost.updateComplete;

    appHost.addEventListener('app-router:content-rendered', () => {
      renderedCount += 1;
    });

    const result = await appHost.navigate('/client-page');

    await waitUntil(() => {
      const text = appHost.querySelector('#main-content')?.textContent ?? '';
      return text.includes('Client Page');
    }, 'ページコンテンツが差し替わること');

    expect(result.outcome).to.equal('completed');
    expect(result.renderedKind).to.equal('page');
    expect(document.title).to.equal('Client Routed');
    expect(renderedCount).to.be.greaterThan(0);
  });

  it('SSR 済み app-router からでも navigate() で本文を差し替えられること', async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          `
            <!doctype html>
            <html>
              <head><title>Hydrated Client Routed</title></head>
              <body><main><h1>Hydrated Client Page</h1></main></body>
            </html>
          `,
          { status: 200 },
        ),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router>
        <div aria-live="polite" aria-atomic="true" class="sr-only"></div>
        <main id="main-content" tabindex="-1">
          <h1>SSR Title</h1>
        </main>
      </app-router>`,
    );
    const appHost = host;

    await appHost.updateComplete;

    const result = await appHost.navigate('/hydrated-client-page');

    await waitUntil(() => {
      const text = appHost.querySelector('#main-content')?.textContent ?? '';
      return text.includes('Hydrated Client Page');
    }, 'SSR 済みの app-router でもページコンテンツが差し替わること');

    expect(result.outcome).to.equal('completed');
    expect(result.renderedKind).to.equal('page');
    expect(document.title).to.equal('Hydrated Client Routed');
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
        new Response(
          `
            <!doctype html>
            <html>
              <head><title>Focused Page</title></head>
              <body><main><h1>Focused Heading</h1></main></body>
            </html>
          `,
          { status: 200 },
        ),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;

    await appHost.updateComplete;

    await appHost.navigate('/focused-page');

    await waitUntil(
      () =>
        (appHost
          .querySelector('[aria-live="polite"]')
          ?.textContent.includes('ページが読み込まれました') ??
          false) &&
        focusedTagName === 'MAIN',
      'aria-live と main への focus が更新されること',
    );

    expect(appHost.querySelectorAll('[aria-live="polite"]').length).to.equal(1);
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
        ><main><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;
    await appHost.updateComplete;

    const navigationPromise = appHost.navigate('/slow-page');

    await waitUntil(
      () => appHost.querySelector('#main-content')?.getAttribute('aria-busy') === 'true',
      'ナビゲーション中は aria-busy=true になること',
    );

    resolveResponse?.(
      new Response(
        `
          <!doctype html>
          <html>
            <head><title>Slow Page</title></head>
            <body><main><h1>Slow Content</h1></main></body>
          </html>
        `,
        { status: 200 },
      ),
    );

    await navigationPromise;

    await waitUntil(
      () => !appHost.querySelector('#main-content')?.hasAttribute('aria-busy'),
      '完了後は aria-busy が外れること',
    );

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
        new Response(
          `
            <!doctype html>
            <html>
              <head><title>Header Sync</title></head>
              <body>
                <layout-header
                  note-layout
                  breadcrumbs-json='[{"label":"New Note","href":"/notes/new-note"}]'
                  corpora-json='[{"key":"all","label":"すべてのノート","href":"/corpora/"},{"key":"music","label":"音楽","href":"/corpora/music/"}]'
                  current-corpus-key="music"
                ></layout-header>
                <main><h1>Header Synced</h1></main>
              </body>
            </html>
          `,
          { status: 200 },
        ),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router
        ><main><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;
    await appHost.updateComplete;

    await appHost.navigate('/notes/new-note');

    await waitUntil(
      () =>
        header.getAttribute('breadcrumbs-json') ===
        '[{"label":"New Note","href":"/notes/new-note"}]',
      'breadcrumbs-json が同期されること',
    );

    expect(header.hasAttribute('note-layout')).to.equal(true);
    expect(header.getAttribute('corpora-json')).to.equal(
      '[{"key":"all","label":"すべてのノート","href":"/corpora/"},{"key":"music","label":"音楽","href":"/corpora/music/"}]',
    );
    expect(header.getAttribute('current-corpus-key')).to.equal('music');
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
        ><main><h1>SSR Title</h1></main></app-router
      >`,
    );
    const appHost = host;
    await appHost.updateComplete;

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

  it('serverContent に branded 本文を与えた場合も描画できること', async () => {
    host = await fixture<AppRouterElement>(html`<app-router></app-router>`);
    const appHost = host as AppRouterElement & { serverContent: unknown };

    appHost.serverContent = createRouterContentHtml('<h1>SSR Branded</h1><p>Body</p>');
    await appHost.updateComplete;

    expect(appHost.querySelector('#main-content')?.innerHTML).to.contain('SSR Branded');
  });
});
