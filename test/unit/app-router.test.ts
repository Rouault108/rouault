import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '../../src/components/app/app-router.js';
import type { Router } from '../../src/lib/router.js';

type AppRouterElement = HTMLElement & {
  updateComplete: Promise<unknown>;
  navigate(url: string): Promise<void>;
};

describe('app-router', () => {
  let host: AppRouterElement | null = null;

  let originalFetch: typeof globalThis.fetch;
  let originalPushState: typeof history.pushState;
  let originalReplaceState: typeof history.replaceState;
  let originalHistoryStateDescriptor: PropertyDescriptor | undefined;
  let originalStartViewTransitionDescriptor: PropertyDescriptor | undefined;
  let originalScrollToDescriptor: PropertyDescriptor | undefined;
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
    originalStartViewTransitionDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'startViewTransition',
    );
    originalScrollToDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollTo');
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

    if (originalFocusDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'focus', originalFocusDescriptor);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'focus');
    }
  });

  it('SSR された main の内容を初回接続時に保持し #main-content へ描画すること', async () => {
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
      html`<app-router><main><h1>SSR Title</h1><p>SSR Body</p></main></app-router>`,
    );

    await host.updateComplete;

    const mains = host.querySelectorAll('main');

    expect(fetchCalled).to.equal(false);
    expect(mains.length).to.equal(1);
    expect(host.querySelector('#main-content')?.innerHTML).to.contain('SSR Title');
    expect(host.querySelector('#main-content')?.innerHTML).to.contain('SSR Body');
  });

  it('navigate() で main を更新し app-router:content-rendered を発火すること', async () => {
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
      html`<app-router><main><h1>SSR Title</h1></main></app-router>`,
    );
    await host.updateComplete;

    host.addEventListener('app-router:content-rendered', () => {
      renderedCount += 1;
    });

    await host.navigate('/client-page');

    await waitUntil(
      () => host?.querySelector('#main-content')?.textContent.includes('Client Page') ?? false,
      'ページコンテンツが差し替わること',
    );

    expect(document.title).to.equal('Client Routed');
    expect(renderedCount).to.be.greaterThan(0);
  });

  it('Router 側の aria-live は作らず AppRouter 側の宣言的 aria-live のみを使うこと', async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          `
            <!doctype html>
            <html>
              <head><title>Announce Page</title></head>
              <body><main><h1>Announced</h1></main></body>
            </html>
          `,
          { status: 200 },
        ),
      );

    host = await fixture<AppRouterElement>(
      html`<app-router><main><h1>SSR Title</h1></main></app-router>`,
    );
    await host.updateComplete;

    await host.navigate('/announce-page');

    await waitUntil(
      () =>
        host?.querySelector('[aria-live="polite"]')?.textContent.includes('ページが読み込まれました') ??
        false,
      'aria-live の通知が出ること',
    );

    expect(host.querySelectorAll('[aria-live="polite"]').length).to.equal(1);
    expect(host.querySelector('[aria-live="polite"]')?.textContent).to.contain(
      'ページが読み込まれました',
    );
  });

  it('コンテンツ更新後に reinitialize hook を実行し見出しへ focus すること', async () => {
    let hookCalls = 0;
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
      html`<app-router><main><h1>SSR Title</h1></main></app-router>`,
    );
    await host.updateComplete;

    const controllerRecord = host as unknown as {
      _routerController: { router: Router | null };
    };

    controllerRecord._routerController.router?.addReinitializeHook(() => {
      hookCalls += 1;
    });

    await host.navigate('/focused-page');

    await waitUntil(
      () => hookCalls === 1 && focusedTagName === 'H1',
      'reinitialize hook と focus が実行されること',
    );

    expect(focusOptions).to.deep.equal({ preventScroll: true });
  });

  it('loading:start / loading:end に応じて aria-busy を切り替えること', async () => {
    let resolveResponse: ((value: Response) => void) | undefined;

    globalThis.fetch = () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      });

    host = await fixture<AppRouterElement>(
      html`<app-router><main><h1>SSR Title</h1></main></app-router>`,
    );
    await host.updateComplete;

    const navigationPromise = host.navigate('/slow-page');

    await waitUntil(
      () => host?.querySelector('#main-content')?.getAttribute('aria-busy') === 'true',
      'ナビゲーション中は aria-busy=true になること',
    );

    if (!resolveResponse) {
      throw new Error('resolveResponse が設定されていません。');
    }

    resolveResponse(
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
      () => !host?.querySelector('#main-content')?.hasAttribute('aria-busy'),
      '完了後は aria-busy が外れること',
    );

    expect(host.querySelector('#main-content')?.hasAttribute('aria-busy')).to.equal(false);
  });
});