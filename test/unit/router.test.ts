import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import {
  Router,
  RouterDestroyedError,
  RouterNotStartedError,
  RouterOwnershipError,
  type NavigationResult,
} from '../../src/lib/router.js';

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
  let originalScrollToDescriptor: PropertyDescriptor | undefined;

  let mockHistoryState: unknown;

  beforeEach(async () => {
    outlet = await fixture<HTMLElement>(html`<main id="test-outlet">Initial Content</main>`);

    originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          '<html><head><title>Default</title></head><body><main>Default Mock</main></body></html>',
          {
            status: 200,
          },
        ),
      );

    originalPushState = history.pushState.bind(history);
    originalReplaceState = history.replaceState.bind(history);
    originalHistoryStateDescriptor = Object.getOwnPropertyDescriptor(history, 'state');
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

    if (originalScrollToDescriptor) {
      Object.defineProperty(window, 'scrollTo', originalScrollToDescriptor);
    } else {
      Reflect.deleteProperty(window, 'scrollTo');
    }
  });

  it('constructor は副作用を持たず、start() 前はリンクを横取りしないこと', async () => {
    let fetchCount = 0;
    globalThis.fetch = () => {
      fetchCount += 1;
      return Promise.resolve(
        new Response(
          '<html><head><title>Init</title></head><body><main>Init</main></body></html>',
          {
            status: 200,
          },
        ),
      );
    };

    router = new Router(outlet);

    const link = await fixture<HTMLAnchorElement>(html`<a href="/next-page">Next</a>`);
    let defaultPrevented = false;
    const observer = (event: Event) => {
      defaultPrevented = event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener('click', observer);
    simulateClick(link);
    document.removeEventListener('click', observer);

    expect(fetchCount).to.equal(0);
    expect(defaultPrevented).to.equal(false);
    expect(outlet.textContent).to.contain('Initial Content');
  });

  it('start() は初回遷移結果を返し、2回目以降は null を返すこと', async () => {
    router = new Router(outlet);

    const firstResult = await router.start();
    const secondResult = await router.start();

    expect(firstResult?.outcome).to.equal('completed');
    expect(firstResult?.committed).to.equal(true);
    expect(firstResult?.renderedKind).to.equal('page');
    expect(secondResult).to.equal(null);
    expect(outlet.textContent).to.contain('Default Mock');
    expect(document.title).to.equal('Default');
  });

  it('skipInitialNavigation=true の start() は null を返し、navigate() で遷移できること', async () => {
    router = new Router(outlet, { skipInitialNavigation: true });

    const startResult = await router.start();
    const navigateResult = await router.navigate({
      url: '/docs/example/',
      historyMode: 'push',
    });

    expect(startResult).to.equal(null);
    expect(navigateResult.outcome).to.equal('completed');
    expect(navigateResult.normalizedUrl).to.equal('/docs/example');
    expect(router.getCurrentPath()).to.equal('/docs/example');
  });

  it('start() 前の navigate() は not-started 失敗結果を返すこと', async () => {
    router = new Router(outlet, { skipInitialNavigation: true });

    const result = await router.navigate({
      url: '/before-start',
      historyMode: 'push',
    });

    expect(result.outcome).to.equal('failed');
    expect(result.errorReason).to.equal('not-started');
    expect(result.error).to.be.instanceOf(RouterNotStartedError);
    expect(outlet.textContent).to.contain('Initial Content');
  });

  it('destroy() 後の navigate() は destroyed 失敗結果を返し、所有権を解放すること', async () => {
    router = new Router(outlet, { skipInitialNavigation: true });
    await router.start();
    router.destroy();

    const result = await router.navigate({
      url: '/after-destroy',
      historyMode: 'push',
    });
    const nextRouter = new Router(outlet, { skipInitialNavigation: true });

    expect(result.outcome).to.equal('failed');
    expect(result.errorReason).to.equal('destroyed');
    expect(result.error).to.be.instanceOf(RouterDestroyedError);
    nextRouter.destroy();
  });

  it('live Router の二重生成では RouterOwnershipError を送出すること', () => {
    router = new Router(outlet, { skipInitialNavigation: true });

    expect(() => new Router(outlet, { skipInitialNavigation: true })).to.throw(
      RouterOwnershipError,
    );
  });

  it('addDocumentRoute() は exact pathname と defensive searchParams で評価すること', async () => {
    let fetchCalled = false;
    let observedSearchValues: string[] = [];
    globalThis.fetch = () => {
      fetchCalled = true;
      return Promise.resolve(
        new Response('<html><body><main>Fetched</main></body></html>', {
          status: 200,
        }),
      );
    };

    router = new Router(outlet, { skipInitialNavigation: true });
    router.addDocumentRoute('/virtual-route', ({ normalizedUrl, searchParams }) => {
      observedSearchValues = searchParams.getAll('tag');
      searchParams.append('tag', 'mutated');

      return {
        kind: 'page',
        html: `<section><h1>From Handler</h1><p>${normalizedUrl}</p></section>`,
        title: 'Virtual - Rouault',
        metaDescription: 'virtual route',
        shell: null,
      };
    });

    await router.start();
    const result = await router.navigate({
      url: '/virtual-route?tag=a&tag=b',
      historyMode: 'push',
    });

    expect(fetchCalled).to.equal(false);
    expect(observedSearchValues).to.deep.equal(['a', 'b']);
    expect(result.source).to.equal('document-route');
    expect(result.renderedKind).to.equal('page');
    expect(outlet.innerHTML).to.contain('From Handler');
  });

  it('getSearchParams() は重複値を保持し、防御的コピーを返すこと', async () => {
    router = new Router(outlet, { skipInitialNavigation: true });
    await router.start();
    await router.navigate({
      url: '/notes/testing?tag=a&tag=b&empty=',
      historyMode: 'push',
    });

    const first = router.getSearchParams();
    first.append('tag', 'mutated');
    const second = router.getSearchParams();

    expect(second.getAll('tag')).to.deep.equal(['a', 'b']);
    expect(second.get('empty')).to.equal('');
  });

  it('before navigate hook の false は cancelled を返すこと', async () => {
    router = new Router(outlet, { skipInitialNavigation: true });
    router.addBeforeNavigateHook(() => false);
    await router.start();

    const result = await router.navigate({
      url: '/cancelled',
      historyMode: 'push',
    });

    expect(result.outcome).to.equal('cancelled');
    expect(result.committed).to.equal(false);
    expect(result.source).to.equal('none');
  });

  it('shell/post-commit failure は completed + degraded に落とすこと', async () => {
    router = new Router(outlet, {
      skipInitialNavigation: true,
      shellAdapter: {
        apply: () => {
          throw new Error('shell failed');
        },
      },
      postCommitController: {
        run: () => {
          throw new Error('post failed');
        },
      },
    });
    await router.start();

    const errors: string[] = [];
    router.on('error', ({ stage }) => {
      errors.push(stage);
    });

    const result = await router.navigate({
      url: '/degraded',
      historyMode: 'push',
    });

    expect(result.outcome).to.equal('completed');
    expect(result.degraded).to.equal(true);
    expect(result.issues.map((issue) => issue.code)).to.deep.equal([
      'shell-sync-failed',
      'post-commit-failed',
    ]);
    expect(errors).to.deep.equal(['shell', 'post-commit']);
  });

  it('postCommitController 未指定時は追加後処理なしで full navigation が完了すること', async () => {
    let scrollCount = 0;
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      writable: true,
      value: () => {
        scrollCount += 1;
      },
    });

    router = new Router(outlet, { skipInitialNavigation: true });
    await router.start();

    const result = await router.navigate({
      url: '/plain-navigation',
      historyMode: 'push',
    });

    expect(result.outcome).to.equal('completed');
    expect(result.degraded).to.equal(false);
    expect(scrollCount).to.equal(0);
  });

  it('state-only navigation は policy 注入時のみ fetch せず結果イベントを返し post-commit に委譲すること', async () => {
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

    router = new Router(outlet, {
      skipInitialNavigation: true,
      urlStateNavigationPolicy: {
        evaluate: ({ currentUrl, normalizedUrl }) =>
          currentUrl === '/notes/testing?tab=overview' &&
          normalizedUrl === '/notes/testing?tab=details'
            ? { kind: 'state-only', scrollToHash: true }
            : { kind: 'full' },
      },
      postCommitController: {
        run: (context) => {
          postCommitContext = context;
        },
      },
    });
    await router.start();

    let eventDetail:
      | {
          previousUrl: string;
          url: string;
        }
      | undefined;
    let afterNavigateResult: NavigationResult | undefined;
    let postCommitContext:
      | {
          outlet: HTMLElement;
          previousUrl: string | null;
          url: string;
          isInitial: boolean;
          stateOnly: boolean;
          renderedKind: 'page' | 'not-found' | 'error' | null;
        }
      | undefined;

    router.on('ui-url-state-change', (detail) => {
      eventDetail = detail;
    });
    router.on('after:navigate', (detail) => {
      afterNavigateResult = detail;
    });

    const result = await router.navigate({
      url: '/notes/testing?tab=details',
      historyMode: 'push',
    });

    expect(fetchCalled).to.equal(false);
    expect(result.stateOnly).to.equal(true);
    expect(result.source).to.equal('state-only');
    expect(eventDetail).to.deep.equal({
      previousUrl: '/notes/testing?tab=overview',
      url: '/notes/testing?tab=details',
    });
    expect(afterNavigateResult?.outcome).to.equal('completed');
    expect(postCommitContext).to.deep.include({
      previousUrl: '/notes/testing?tab=overview',
      url: '/notes/testing?tab=details',
      stateOnly: true,
      renderedKind: null,
    });
    expect(postCommitContext?.outlet).to.equal(outlet);
  });

  it('navigation:busy-change は full navigation の開始と終了でだけ発火すること', async () => {
    let resolveResponse: ((value: Response) => void) | undefined;
    globalThis.fetch = () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      });

    router = new Router(outlet, { skipInitialNavigation: true });
    await router.start();

    const busyStates: boolean[] = [];
    router.on('navigation:busy-change', ({ isNavigating }) => {
      busyStates.push(isNavigating);
    });

    const navigationPromise = router.navigate({
      url: '/slow-page',
      historyMode: 'push',
    });

    await waitUntil(() => busyStates.length > 0, 'busy 状態が true になること');
    resolveResponse?.(
      new Response('<html><head><title>Slow</title></head><body><main>Slow</main></body></html>', {
        status: 200,
      }),
    );
    await navigationPromise;

    expect(busyStates).to.deep.equal([true, false]);
  });
});
