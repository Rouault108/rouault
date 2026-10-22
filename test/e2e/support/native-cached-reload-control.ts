import { createHash } from 'node:crypto';
import type { Browser, Page, Response } from '@playwright/test';
import { NATIVE_RELOAD_CONTROL_HEADER } from '../../../build/preview/native-reload-control.js';

interface ReloadObservation {
  inherited: ScrollRestoration;
  atLoad: ScrollRestoration | null;
  writes: ScrollRestoration[];
  scrollCalls: string[];
}
declare global {
  interface Window {
    __nativeCachedReload: ReloadObservation;
  }
}

export const observeCachedReload = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const observation: ReloadObservation = {
      inherited: history.scrollRestoration,
      atLoad: null,
      writes: [],
      scrollCalls: [],
    };
    window.__nativeCachedReload = observation;
    const descriptor = Object.getOwnPropertyDescriptor(History.prototype, 'scrollRestoration');
    if (!descriptor?.get || !descriptor.set) throw new Error('scrollRestoration descriptor');
    Object.defineProperty(history, 'scrollRestoration', {
      configurable: true,
      get: () => descriptor.get?.call(history) as ScrollRestoration,
      set: (value: ScrollRestoration) => {
        descriptor.set?.call(history, value);
        observation.writes.push(value);
      },
    });
    // parse/load中にはmodeだけを観測し、幾何を強制しない。
    addEventListener(
      'load',
      () => {
        observation.atLoad = history.scrollRestoration;
      },
      { once: true },
    );
    for (const name of ['scrollTo', 'scroll', 'scrollBy'] as const) {
      const original = window[name].bind(window);
      window[name] = (options?: ScrollToOptions | number, y?: number): void => {
        observation.scrollCalls.push(name);
        if (typeof options === 'number') original(options, y ?? 0);
        else original(options);
      };
    }
    const intoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions): void {
      observation.scrollCalls.push('scrollIntoView');
      intoView.call(this, options);
    };
  });
};

export const readCachedReload = (page: Page) =>
  page.evaluate(() => ({
    url: location.href,
    visibility: document.visibilityState,
    x: scrollX,
    y: scrollY,
    range: document.scrollingElement
      ? document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight
      : 0,
    viewport: [innerWidth, innerHeight],
    zoom: visualViewport?.scale,
    font: getComputedStyle(document.querySelector('main') ?? document.body).font,
    fonts: document.fonts.status,
    hash: location.hash,
    mode: history.scrollRestoration,
    state: history.state as unknown,
    length: history.length,
    appDefined: customElements.get('router-document-host') !== undefined,
    observation: window.__nativeCachedReload,
  }));

export const settleCachedReload = async (page: Page): Promise<void> => {
  await page.waitForLoadState('load');
  let previous = '';
  let stable = 0;
  for (let sample = 0; sample < 60; sample++) {
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const value = await page.evaluate(() =>
      [scrollX, scrollY, document.scrollingElement?.scrollHeight, document.fonts.status].join(':'),
    );
    stable = value === previous ? stable + 1 : 0;
    if (stable >= 5) return;
    previous = value;
    await page.waitForTimeout(50);
  }
  throw new Error('cached reload did not settle');
};

// 初回の読書位置だけを外側から準備する。reload後のscriptには座標を渡さない。
export const prepareCachedReadingPosition = async (
  page: Page,
  position: 'hash' | 'middle' | 'end',
): Promise<void> => {
  if (position !== 'hash')
    await page.evaluate((position) => {
      const root = document.scrollingElement;
      if (!root) throw new Error('scrolling element');
      scrollTo({
        top: Math.round(
          (root.scrollHeight - root.clientHeight) * (position === 'middle' ? 0.55 : 0.9),
        ),
        behavior: 'instant',
      });
    }, position);
  await settleCachedReload(page);
};

export const measureNativeCachedReload = async (
  browser: Browser,
  app: Page,
  position: 'hash' | 'middle' | 'end',
  state: unknown,
) => {
  const settings = await app.evaluate(() => ({
    userAgent: navigator.userAgent,
    locale: navigator.language,
    deviceScaleFactor: devicePixelRatio,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? ('reduce' as const)
      : ('no-preference' as const),
    colorScheme: matchMedia('(prefers-color-scheme: dark)').matches
      ? ('dark' as const)
      : ('light' as const),
  }));
  const context = await browser.newContext({
    ...settings,
    viewport: app.viewportSize(),
    extraHTTPHeaders: { [NATIVE_RELOAD_CONTROL_HEADER]: '1' },
  });
  try {
    const page = await context.newPage();
    await observeCachedReload(page);
    await page.bringToFront();
    const initialResponses: Response[] = [];
    const recordInitial = (response: Response): void => {
      initialResponses.push(response);
    };
    page.on('response', recordInitial);
    const documentResponse = await page.goto(app.url());
    if (!documentResponse) throw new Error('native document HTTP response');
    const documentHash = createHash('sha256')
      .update(await documentResponse.text())
      .digest('hex');
    await settleCachedReload(page);
    page.off('response', recordInitial);
    const entry = await page.locator('script[type="module"][src]').evaluate((script) => {
      if (!(script instanceof HTMLScriptElement)) throw new Error('native client entry');
      return script.src;
    });
    const initial = initialResponses.find((response) => response.url() === entry);
    if (!initial) throw new Error('native client HTTP response');
    const initialId = await initial.headerValue('x-rouault-preview-response-id');
    const initialPolicy = await initial.headerValue('cache-control');
    const initialVary = await initial.headerValue('vary');
    await page.evaluate((state) => {
      history.replaceState(state, '');
      history.scrollRestoration = 'manual';
    }, state);
    await prepareCachedReadingPosition(page, position);
    const before = await readCachedReload(page);
    const reloadResponses: Response[] = [];
    page.on('response', (response) => {
      if (response.url() === entry) reloadResponses.push(response);
    });
    await page.bringToFront();
    await page.reload();
    await settleCachedReload(page);
    const after = await readCachedReload(page);
    const responses = await Promise.all(
      reloadResponses.map(async (response) => ({
        url: response.url(),
        status: response.status(),
        cacheControl: await response.headerValue('cache-control'),
        reused:
          !!initialId &&
          initialId === (await response.headerValue('x-rouault-preview-response-id')),
      })),
    );
    return { before, after, entry, documentHash, initialId, initialPolicy, initialVary, responses };
  } finally {
    await context.close();
  }
};
