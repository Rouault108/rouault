import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { Router } from '../../src/lib/router.js';
import { URL_STATE_CHANGE_EVENT } from '../../src/lib/tabs/url-state.js';

/**
 * テスト用クリックシミュレーション。
 * アンカー要素に直接 dispatchEvent すると実ブラウザ遷移が発生しうるため、
 * 子要素（<span>）にイベントを発行して Router の closest('a') 判定だけを通す。
 */
function simulateClick(element: HTMLElement, options: MouseEventInit = {}): void {
  let target = element;
  let tempSpan: HTMLSpanElement | null = null;

  if (element.tagName === 'A') {
    tempSpan = document.createElement('span');
    element.prepend(tempSpan);
    target = tempSpan;
  }

  target.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      ...options,
    }),
  );

  tempSpan?.remove();
}

describe('Router', () => {
  let outlet: HTMLElement;
  let router: Router | null = null;

  let originalFetch: typeof globalThis.fetch;
  let originalPushState: typeof history.pushState;
  let originalReplaceState: typeof history.replaceState;
  let originalHistoryStateDescriptor: PropertyDescriptor | undefined;
  let originalStartViewTransitionDescriptor: PropertyDescriptor | undefined;
  let originalScrollToDescriptor: PropertyDescriptor | undefined;

  let mockHistoryState: unknown;

  beforeEach(async () => {
    outlet = await fixture<HTMLElement>(html`<main id="test-outlet">Initial Content</main>`);

    originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(
        new Response('<html><body><main>Default Mock</main></body></html>', {
          status: 200,
        }),
      );

    originalPushState = history.pushState.bind(history);
    originalReplaceState = history.replaceState.bind(history);
    originalHistoryStateDescriptor = Object.getOwnPropertyDescriptor(history, 'state');
    originalStartViewTransitionDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'startViewTransition',
    );
    originalScrollToDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollTo');

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

    const mockStartViewTransition: NonNullable<typeof document.startViewTransition> = (
      callback?: ViewTransitionUpdateCallback | StartViewTransitionOptions,
    ) => {
      const updateCallback = typeof callback === 'function' ? callback : callback?.update;
      const done = updateCallback
        ? Promise.resolve(updateCallback()).then(() => undefined)
        : Promise.resolve();

      return {
        finished: done,
        ready: done,
        updateCallbackDone: done,
        skipTransition() {
          /* noop */
        },
        types: new Set<string>() as unknown as ViewTransitionTypeSet,
      };
    };

    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: mockStartViewTransition,
    });

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      writable: true,
      value: () => {
        /* noop */
      },
    });
  });

  afterEach(() => {
    router?.destroy();
    router = null;

    globalThis.fetch = originalFetch;
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;

    if (originalHistoryStateDescriptor) {
      Object.defineProperty(history, 'state', originalHistoryStateDescriptor);
    } else {
      Reflect.deleteProperty(history, 'state');
    }

    if (originalStartViewTransitionDescriptor) {
      Object.defineProperty(document, 'startViewTransition', originalStartViewTransitionDescriptor);
    } else {
      Reflect.deleteProperty(document, 'startViewTransition');
    }

    if (originalScrollToDescriptor) {
      Object.defineProperty(window, 'scrollTo', originalScrollToDescriptor);
    } else {
      Reflect.deleteProperty(window, 'scrollTo');
    }
  });

  it('skipInitialNavigation=false の場合は初期ナビゲーションを実行すること', async () => {
    let fetchCount = 0;
    globalThis.fetch = () => {
      fetchCount += 1;
      return Promise.resolve(
        new Response(
          '<html><head><title>Initial</title></head><body><main>Initial Page</main></body></html>',
          {
            status: 200,
          },
        ),
      );
    };

    router = new Router(outlet);

    await waitUntil(() => fetchCount === 1, '初期ナビゲーションが実行されること');
    expect(outlet.textContent).to.contain('Initial Page');
    expect(document.title).to.equal('Initial');
  });

  it('skipInitialNavigation=true の場合は初期ナビゲーションをスキップし current URL を履歴に積むこと', () => {
    let fetchCalled = false;
    globalThis.fetch = () => {
      fetchCalled = true;
      return Promise.resolve(
        new Response('<html><body><main>Should Not Load</main></body></html>', {
          status: 200,
        }),
      );
    };

    mockHistoryState = { __routerUrl: '/initial-state' };
    router = new Router(outlet, { skipInitialNavigation: true });

    expect(fetchCalled).to.equal(false);
    expect(router.getHistory()).to.deep.equal(['/initial-state']);
    expect(router.getCurrentPath()).to.equal('/initial-state');
  });

  it('内部リンクはインターセプトしてコンテンツを更新すること', async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          `
            <!doctype html>
            <html>
              <head><title>Next Page</title></head>
              <body><main><h1>Next Content</h1></main></body>
            </html>
          `,
          { status: 200 },
        ),
      );

    router = new Router(outlet, { skipInitialNavigation: true });

    const link = await fixture<HTMLAnchorElement>(html`<a href="/next-page">Next</a>`);

    let defaultPrevented = false;
    const observer = (event: Event) => {
      defaultPrevented = event.defaultPrevented;
      if (!defaultPrevented) {
        event.preventDefault();
      }
    };
    document.addEventListener('click', observer);

    simulateClick(link);

    document.removeEventListener('click', observer);

    await waitUntil(
      () => outlet.textContent.includes('Next Content'),
      'コンテンツが更新されること',
    );

    expect(defaultPrevented).to.equal(true);
    expect(document.title).to.equal('Next Page');
    expect(outlet.querySelector('h1')?.textContent.trim()).to.equal('Next Content');
  });

  it('外部リンク・hashリンク・data-no-router リンクはインターセプトしないこと', async () => {
    router = new Router(outlet, { skipInitialNavigation: true });

    const cases = [
      html`<a href="https://example.com">External</a>`,
      html`<a href="#local-fragment">Hash</a>`,
      html`<a href="/no-router" data-no-router>No Router</a>`,
    ];

    for (const template of cases) {
      const link = await fixture<HTMLAnchorElement>(template);

      let defaultPrevented = false;
      const observer = (event: Event) => {
        defaultPrevented = event.defaultPrevented;
        event.preventDefault();
      };
      document.addEventListener('click', observer);

      simulateClick(link);

      document.removeEventListener('click', observer);
      expect(defaultPrevented).to.equal(false);

      link.remove();
    }
  });

  it('navigate() は表示 URL を canonical に揃えつつ fetch では trailing slash を補うこと', async () => {
    let pushedUrl = '';
    let fetchedUrl = '';

    history.pushState = ((data: unknown, _unused: string, url?: string | URL | null) => {
      if (url === null || url === undefined) {
        return;
      }

      pushedUrl = url.toString();
      const target = new URL(url.toString(), window.location.href);
      mockHistoryState = {
        ...(data && typeof data === 'object' ? data : {}),
        __routerUrl: `${target.pathname}${target.search}${target.hash}`,
        __routerPath: target.pathname,
      };
    }) as typeof history.pushState;

    globalThis.fetch = (input: RequestInfo | URL) => {
      fetchedUrl = input instanceof Request ? input.url : String(input);
      return Promise.resolve(
        new Response(
          '<html><head><title>Canonical</title></head><body><main>Canonical Page</main></body></html>',
          {
            status: 200,
          },
        ),
      );
    };

    router = new Router(outlet, { skipInitialNavigation: true });

    await router.navigate('/docs/example/');

    expect(pushedUrl).to.equal('/docs/example');
    expect(router.getCurrentPath()).to.equal('/docs/example');
    expect(router.getHistory()).to.deep.equal(['/', '/docs/example']);
    expect(fetchedUrl).to.include('/docs/example/');
  });

  it('addRoute() した route handler が一致した場合は fetch をスキップすること', async () => {
    let fetchCalled = false;
    globalThis.fetch = () => {
      fetchCalled = true;
      return Promise.resolve(
        new Response('<html><body><main>Fetched</main></body></html>', {
          status: 200,
        }),
      );
    };

    router = new Router(outlet, { skipInitialNavigation: true });
    router.addRoute('/virtual-route', () => '<section><h1>From Handler</h1></section>');

    await router.navigate('/virtual-route');

    expect(fetchCalled).to.equal(false);
    expect(outlet.innerHTML).to.contain('From Handler');
  });

  it('title・meta description・layout-header を遷移先 document に同期すること', async () => {
    const header = await fixture<HTMLElement>(
      html`<layout-header breadcrumbs-json='[{"label":"Old","href":"/old"}]'></layout-header>`,
    );

    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          `
            <!doctype html>
            <html>
              <head>
                <title>Routed Title</title>
                <meta name="description" content="Updated Description" />
              </head>
              <body>
                <layout-header
                  note-layout
                  breadcrumbs-json='[{"label":"New Note","href":"/notes/new-note"}]'
                ></layout-header>
                <main><h1>Header Synced</h1></main>
              </body>
            </html>
          `,
          { status: 200 },
        ),
      );

    router = new Router(outlet, { skipInitialNavigation: true });
    await router.navigate('/notes/new-note');

    await waitUntil(
      () => header.getAttribute('breadcrumbs-json') === '[{"label":"New Note","href":"/notes/new-note"}]',
      'breadcrumbs-json が同期されること',
    );

    expect(document.title).to.equal('Routed Title');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).to.equal(
      'Updated Description',
    );
    expect(header.hasAttribute('note-layout')).to.equal(true);
  });

  it('onContentUpdate 指定時は outlet.innerHTML を直接変更せず callback 側へ委譲すること', async () => {
    let callbackHtml = '';
    let callbackCount = 0;

    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          `
            <!doctype html>
            <html>
              <head><title>Callback Page</title></head>
              <body><main><h1>Callback Content</h1></main></body>
            </html>
          `,
          { status: 200 },
        ),
      );

    router = new Router(outlet, {
      skipInitialNavigation: true,
      skipAriaLiveRegion: true,
      onContentUpdate: (html) => {
        callbackHtml = html;
        callbackCount += 1;
      },
    });

    await router.navigate('/callback-page');

    expect(callbackCount).to.equal(1);
    expect(callbackHtml).to.contain('Callback Content');
    expect(outlet.innerHTML).to.equal('Initial Content');
    expect(document.querySelectorAll('[aria-live="polite"]').length).to.equal(0);
  });

  it('tab クエリだけが変化する state-only navigation では fetch せず ui-url-state-change を dispatch すること', async () => {
    let fetchCalled = false;
    globalThis.fetch = () => {
      fetchCalled = true;
      return Promise.resolve(
        new Response('<html><body><main>Should Not Fetch</main></body></html>', {
          status: 200,
        }),
      );
    };

    mockHistoryState = {
      __routerUrl: '/notes/testing?tab=overview',
      __routerPath: '/notes/testing',
    };

    router = new Router(outlet, { skipInitialNavigation: true });

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
    window.addEventListener(URL_STATE_CHANGE_EVENT, listener);

    try {
      await router.navigate('/notes/testing?tab=details');
    } finally {
      window.removeEventListener(URL_STATE_CHANGE_EVENT, listener);
    }

    expect(fetchCalled).to.equal(false);
    expect(eventDetail).to.deep.equal({
      previousUrl: '/notes/testing?tab=overview',
      url: '/notes/testing?tab=details',
    });
    expect(router.getHistory()).to.deep.equal([
      '/notes/testing?tab=overview',
      '/notes/testing?tab=details',
    ]);
  });

  it('destroy() 後は document click をインターセプトしないこと', async () => {
    router = new Router(outlet, { skipInitialNavigation: true });
    router.destroy();

    const link = await fixture<HTMLAnchorElement>(html`<a href="/destroyed">Destroyed</a>`);

    let defaultPrevented = false;
    const observer = (event: Event) => {
      defaultPrevented = event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener('click', observer);

    simulateClick(link);

    document.removeEventListener('click', observer);

    expect(defaultPrevented).to.equal(false);
  });
});
