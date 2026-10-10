import { expect, test, type Page } from '@playwright/test';
import { e2eNoteFixtures } from './support/note-fixtures.js';
import { resolveRouterArtifactPathname } from '../../shared/navigation/router-artifact-path.js';

interface ReloadProbe {
  modeAtLoad: ScrollRestoration | null;
  scrollCalls: string[];
  modeChanges: { mode: ScrollRestoration; readyState: DocumentReadyState; at: number }[];
  phases: {
    phase: string;
    mode: ScrollRestoration;
    readyState: DocumentReadyState;
    at: number;
    visibility: DocumentVisibilityState;
  }[];
}
declare global {
  interface Window {
    __readingReloadProbe?: ReloadProbe;
    __readingFocusCalls?: string[];
  }
}

const a = (): string => e2eNoteFixtures.markdownBasic.normalizedPath;
const b = (): string => e2eNoteFixtures.code.normalizedPath;
const ready = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await customElements.whenDefined('router-document-host');
    const host = document.querySelector('router-document-host');
    if (!host) throw new Error('host');
    await host.whenReady();
  });
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-reading-position-status',
    'settled',
  );
};
const navigate = async (
  page: Page,
  url: string,
  historyMode: 'push' | 'replace' = 'push',
): Promise<void> => {
  await page.evaluate(
    async (target) => {
      const host = document.querySelector('router-document-host');
      if (!host) throw new Error('host');
      const result = await host.navigate(target.url, { historyMode: target.historyMode });
      if (!result.committed) throw new Error(result.outcome);
    },
    { url, historyMode },
  );
  await ready(page);
};
const read = async (page: Page, fraction = 0.45): Promise<number> => {
  const y = await page.evaluate((ratio) => {
    const root = document.scrollingElement;
    if (!root) throw new Error('scroll root');
    const max = root.scrollHeight - root.clientHeight;
    if (max < 700) throw new Error('十分に長いfixtureが必要です');
    const y = Math.floor(max * ratio);
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    return y;
  }, fraction);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
  // scroll sampleのeventを次layoutまでに処理する。
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  return y;
};
const at = async (page: Page, url: string, y: number): Promise<void> => {
  await expect
    .poll(() => page.evaluate(() => location.pathname + location.search + location.hash))
    .toBe(url);
  await ready(page);
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - y))
    .toBeLessThanOrEqual(2);
  await expect(page.locator('router-document-host')).toHaveCount(1);
  await expect(page.locator('main#main-content')).toHaveCount(1);
};

test.use({ viewport: { width: 1280, height: 720 } });

test('通常リンク先頭とA→B→Back→Forwardのentry位置（A1/A2/A9）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const firstUrl = await page.evaluate(() => location.pathname + location.search + location.hash);
  const ay = await read(page);
  await page.evaluate((url) => {
    const link = document.createElement('a');
    link.href = url;
    link.id = 'reading-next';
    link.textContent = '次の本文';
    link.style.cssText = 'position:fixed;top:60px;left:150px;z-index:9999';
    document.querySelector('#main-content')?.prepend(link);
  }, b());
  await page.locator('#reading-next').click();
  await at(page, b(), 0);
  const by = await read(page, 0.6);
  await page.goBack();
  await at(page, firstUrl, ay);
  await page.goForward();
  await at(page, b(), by);
});

test('同URLの二つのA entryは座標を共有しない（A3）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, a());
  const ay = await read(page, 0.25);
  const firstId: unknown = await page.evaluate(() => history.state.__rouaultHistoryEntry.id);
  await navigate(page, b());
  await read(page, 0.4);
  await navigate(page, a());
  const secondY = await read(page, 0.7);
  const secondId: unknown = await page.evaluate(() => history.state.__rouaultHistoryEntry.id);
  expect(secondId).not.toBe(firstId);
  await page.goBack();
  await ready(page);
  await page.goBack();
  await at(page, a(), ay);
  await page.goForward();
  await ready(page);
  await page.goForward();
  await at(page, a(), secondY);
});

test('hash entryの保存座標を優先しfull commitはmainへfocusする（A2/A7）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const hash = await page.locator('#main-content h2[id]').nth(1).getAttribute('id');
  if (!hash) throw new Error('heading');
  await navigate(page, `${a()}#${encodeURIComponent(hash)}`);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const y = await read(page, 0.7);
  await navigate(page, b());
  await read(page);
  await page.goBack();
  await at(page, `${a()}#${encodeURIComponent(hash)}`, y);
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('main-content');
});

test('遅い未commitのBを同hashの本人TOC再選択で取消す（B2/A6）', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const initialLink = page.locator('[data-layout-toc-nav] [data-toc-link]').first();
  await initialLink.click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested: (() => void) | undefined;
  const seen = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route(`**${resolveRouterArtifactPathname(b())}`, async (route) => {
    requested?.();
    await gate;
    await route.continue().catch(() => {
      /* 取消されたrequestに遅い応答を適用しない。 */
    });
  });
  try {
    await page.evaluate((url) => {
      void document.querySelector('router-document-host')?.navigate(url);
    }, b());
    await seen;
    const link = page.locator('[data-layout-toc-nav] [data-toc-link]').first();
    await expect(link).toBeVisible();
    await link.click();
    const ownedUrl = await page.evaluate(() => location.pathname + location.search + location.hash);
    release?.();
    await expect(page.locator('#main-content')).not.toHaveAttribute('aria-busy', 'true');
    expect(await page.evaluate(() => location.pathname + location.search + location.hash)).toBe(
      ownedUrl,
    );
    expect(ownedUrl).toContain('#');
    expect(ownedUrl).not.toBe(b());
  } finally {
    release?.();
  }
});

test('artifact待機中の本人wheel後はcommitしてもtopとfocusを奪わない（A6）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await read(page, 0.3);
  let release!: () => void;
  let requested!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const seen = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route(`**${resolveRouterArtifactPathname(b())}`, async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  try {
    await page.evaluate((url) => {
      const host = document.querySelector('router-document-host');
      if (!host) throw new Error('host');
      void host.navigate(url).then((result) => {
        host.dataset['readingRequestOutcome'] = result.outcome;
      });
    }, b());
    await seen;
    await page.evaluate(() => {
      window.addEventListener(
        'wheel',
        (event) => {
          document.documentElement.dataset['readingWheelReceived'] = String(event.isTrusted);
        },
        { once: true },
      );
    });
    await page.mouse.wheel(0, 100);
    // wheelの送信完了とDOMへの配送は別。実際の本人操作が届いてからartifactを解放する。
    await expect(page.locator('html')).toHaveAttribute('data-reading-wheel-received', 'true');
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'reading-precommit-focus';
      button.textContent = '本人操作';
      document.body.append(button);
      button.focus({ preventScroll: true });
      window.scrollTo({ top: 400, behavior: 'instant' });
    });
    release();
    await expect(page.locator('router-document-host')).toHaveAttribute(
      'data-reading-request-outcome',
      'completed',
    );
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-reading-position-status',
      'cancelled',
    );
    expect(new URL(page.url()).pathname).toBe(b());
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('reading-precommit-focus');
  } finally {
    release();
  }
});

for (const key of ['Tab', 'Shift+Tab'])
  test(`artifact待機中の本人${key}で本文外focusを選んだ後は奪わない（A6）`, async ({ page }) => {
    await page.goto(e2eNoteFixtures.markdownBasic.directPath);
    await ready(page);
    await page.evaluate(() => {
      const before = document.createElement('button');
      before.id = 'reading-tab-before';
      before.textContent = '前のfocus';
      const after = document.createElement('button');
      after.id = 'reading-tab-after';
      after.textContent = '次のfocus';
      document.body.prepend(before, after);
      (document.getElementById('reading-tab-before') as HTMLElement).focus({ preventScroll: true });
    });
    if (key === 'Shift+Tab')
      await page.evaluate(() => {
        document.getElementById('reading-tab-after')?.focus({ preventScroll: true });
      });
    let release!: () => void;
    let requested!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const seen = new Promise<void>((resolve) => {
      requested = resolve;
    });
    await page.route(`**${resolveRouterArtifactPathname(b())}`, async (route) => {
      requested();
      await gate;
      await route.continue();
    });
    try {
      await page.evaluate((url) => {
        const host = document.querySelector('router-document-host');
        if (!host) throw new Error('host');
        void host.navigate(url).then((result) => {
          host.dataset['readingRequestOutcome'] = result.outcome;
        });
      }, b());
      await seen;
      await page.keyboard.press(key);
      const focus = key === 'Tab' ? 'reading-tab-after' : 'reading-tab-before';
      expect(await page.evaluate(() => document.activeElement?.id)).toBe(focus);
      release();
      await expect(page.locator('router-document-host')).toHaveAttribute(
        'data-reading-request-outcome',
        'completed',
      );
      await expect(page.locator('#main-content')).toHaveAttribute(
        'data-reading-position-status',
        'cancelled',
      );
      expect(await page.evaluate(() => document.activeElement?.id)).toBe(focus);
    } finally {
      release();
    }
  });

test('Back連打で未表示Bの応答が最終Aを上書きしない（A5）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, a());
  const ay = await read(page, 0.35);
  await navigate(page, b());
  await read(page);
  await navigate(page, e2eNoteFixtures.layoutRich.normalizedPath);
  await read(page);
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**${resolveRouterArtifactPathname(b())}`, async (route) => {
    await gate;
    await route.continue().catch(() => {
      /* 取消されたrequestに遅い応答を適用しない。 */
    });
  });
  try {
    await page.evaluate(() => history.back());
    await expect.poll(() => page.evaluate(() => location.pathname)).toBe(b());
    await page.evaluate(() => history.back());
    release?.();
    await at(page, a(), ay);
  } finally {
    release?.();
  }
});

test('native fragment補記はentryを増やさず離脱元stateをcopyしない（B1/A4）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const count = await page.evaluate(() => {
    history.replaceState({ ...history.state, sentinel: 'from-source' }, '', location.href);
    return history.length;
  });
  const hash = await page.locator('#main-content h2[id]').first().getAttribute('id');
  if (!hash) throw new Error('heading');
  await page.evaluate((id) => {
    const anchor = document.createElement('a');
    anchor.id = 'reading-native-fragment';
    anchor.href = `#${encodeURIComponent(id)}`;
    anchor.textContent = '見出しへ';
    anchor.style.cssText = 'position:fixed;top:60px;left:150px;z-index:9999';
    document.querySelector('#main-content')?.prepend(anchor);
  }, hash);
  await page.locator('#reading-native-fragment').click();
  await expect
    .poll(() => page.evaluate(() => history.state?.__rouaultHistoryEntry?.version))
    .toBe(1);
  expect(await page.evaluate(() => history.length)).toBe(count + 1);
  expect(await page.evaluate(() => history.state?.sentinel)).toBeUndefined();
  const secondHash = await page.locator('#main-content h2[id]').nth(1).getAttribute('id');
  if (!secondHash) throw new Error('second heading');
  await page.evaluate((id) => {
    location.replace(`#${encodeURIComponent(id)}`);
  }, secondHash);
  await expect
    .poll(() => page.evaluate(() => location.hash))
    .toBe(`#${encodeURIComponent(secondHash)}`);
  expect(await page.evaluate(() => history.length)).toBe(count + 1);
});

const settleNativeLayout = async (page: Page): Promise<void> => {
  await page.waitForLoadState('load');
  await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded');
  let previous: string | null = null;
  let stable = 0;
  // JS無効のnative対照ではrAF callbackを起動しない。外側から同じ安定条件を測る。
  await expect
    .poll(
      async () => {
        const measurement = await page.evaluate(() => ({
          fonts: document.fonts.status,
          key: JSON.stringify([
            scrollX,
            scrollY,
            document.scrollingElement?.scrollWidth,
            document.scrollingElement?.scrollHeight,
            innerWidth,
            innerHeight,
          ]),
        }));
        stable = measurement.fonts === 'loaded' && measurement.key === previous ? stable + 1 : 0;
        previous = measurement.key;
        return stable;
      },
      { intervals: [16] },
    )
    .toBeGreaterThanOrEqual(2);
};
const readReloadPosition = async (page: Page): Promise<number> => {
  await page.bringToFront();
  const y = await page.evaluate(() => {
    const root = document.scrollingElement;
    if (!root || root.scrollHeight - root.clientHeight < 700) throw new Error('long fixture');
    const y = Math.floor((root.scrollHeight - root.clientHeight) * 0.37);
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    return y;
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(y);
  await settleNativeLayout(page);
  return y;
};
const withNativeControl = async (
  app: Page,
  compare: (native: Page) => Promise<void>,
  control: 'no-js' | 'same-mode' | 'steady-auto' = 'no-js',
  initialUrl = app.url(),
): Promise<void> => {
  const browser = app.context().browser();
  if (!browser) throw new Error('native対照には同じbrowserが必要です');
  const environment = await app.evaluate(() => ({
    userAgent: navigator.userAgent,
    locale: navigator.language,
    deviceScaleFactor: devicePixelRatio,
  }));
  const context = await browser.newContext({
    ...environment,
    viewport: app.viewportSize() ?? { width: 1280, height: 720 },
    reducedMotion: 'reduce',
    javaScriptEnabled: control !== 'no-js',
  });
  try {
    const native = await context.newPage();
    // app moduleの位置でmodeだけを受け渡す。native対照にscroll/focus/復元storeを加えない。
    await native.route('**/*', async (route) => {
      if (control === 'no-js' || route.request().resourceType() !== 'script') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      await route.fulfill({
        response,
        contentType: 'text/javascript',
        body: `
            history.scrollRestoration = 'auto';
            addEventListener('pagehide', () => { history.scrollRestoration = 'auto'; });
            addEventListener('load', () => requestAnimationFrame(() => {
              const entry = history.state?.__rouaultHistoryEntry;
              history.scrollRestoration = ${control === 'same-mode'} && entry?.version === 1 && typeof entry.id === 'string'
                ? 'manual' : 'auto';
            }), { once: true });
          `,
      });
    });
    if (control !== 'no-js') {
      await probeReloadScroll(native);
    }
    await native.goto(initialUrl);
    await settleNativeLayout(native);
    expect(
      await native.evaluate(() => customElements.get('router-document-host') !== undefined),
    ).toBe(false);
    await compare(native);
  } finally {
    await context.close();
  }
};
const viewportSnapshot = (page: Page) =>
  page.evaluate(() => {
    const root = document.scrollingElement;
    if (!root) throw new Error('scroll root');
    return {
      url: location.pathname + location.search + location.hash,
      x: scrollX,
      y: scrollY,
      maxX: root.scrollWidth - root.clientWidth,
      maxY: root.scrollHeight - root.clientHeight,
      mode: history.scrollRestoration,
      length: history.length,
      state: history.state as unknown,
      fonts: document.fonts.status,
      readyState: document.readyState,
    };
  });
const probeReloadScroll = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const probe: ReloadProbe = { modeAtLoad: null, scrollCalls: [], phases: [], modeChanges: [] };
    window.__readingReloadProbe = probe;
    const record = (phase: string): void => {
      // 初期parse/load中にlayoutを強制しない。座標と字体/rangeはload後の安定待ちで測る。
      probe.phases.push({
        phase,
        mode: history.scrollRestoration,
        readyState: document.readyState,
        at: performance.now(),
        visibility: document.visibilityState,
      });
    };
    const mode = Object.getOwnPropertyDescriptor(History.prototype, 'scrollRestoration');
    if (!mode?.get || !mode.set) throw new Error('native scrollRestoration descriptor');
    Object.defineProperty(history, 'scrollRestoration', {
      configurable: true,
      get: () => mode.get?.call(history) as ScrollRestoration,
      set: (value: ScrollRestoration) => {
        mode.set?.call(history, value);
        // setterの観測でlayoutを強制し、native復元の時系列を変えない。
        probe.modeChanges.push({
          mode: value,
          readyState: document.readyState,
          at: performance.now(),
        });
      },
    });
    record('init');
    for (const name of ['DOMContentLoaded', 'pageshow', 'pagehide'] as const)
      window.addEventListener(name, () => {
        record(name);
      });
    window.addEventListener('load', () => {
      probe.modeAtLoad = history.scrollRestoration;
      record('load');
    });
    for (const method of ['scrollTo', 'scroll', 'scrollBy'] as const) {
      const original = window[method].bind(window);
      window[method] = (options?: ScrollToOptions | number, y?: number): void => {
        probe.scrollCalls.push(JSON.stringify([method, options, y]));
        if (typeof options === 'number') original(options, y ?? 0);
        else original(options);
      };
    }
    const intoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions): void {
      probe.scrollCalls.push(JSON.stringify(['scrollIntoView', this.id, options]));
      intoView.call(this, options);
    };
  });
};
type ReloadVariant =
  | { kind: 'managed' }
  | { kind: 'primitive' | 'array' | 'unknown-version'; state: unknown };
const compareNativeReload = async (app: Page, variant: ReloadVariant): Promise<void> => {
  await app.emulateMedia({ reducedMotion: 'reduce' });
  await probeReloadScroll(app);
  // native対照のroutingはHTTP cacheを無効化するため、app側も同じnetwork条件にする。
  await app.route('**/*', (route) => route.continue());
  await app.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(app);
  await settleNativeLayout(app);
  expect(await app.evaluate(() => history.scrollRestoration)).toBe('manual');
  const initialUrl = app.url();
  await withNativeControl(
    app,
    async (native) => {
      const hash = await app.locator('#main-content h2[id]').nth(1).getAttribute('id');
      if (!hash) throw new Error('heading');
      const source = new URL(app.url());
      source.hash = hash;
      const targetUrl = source.pathname + source.search + source.hash;
      const state: unknown =
        variant.kind === 'managed'
          ? await app.evaluate((url) => {
              const current: unknown = history.state;
              if (typeof current !== 'object' || current === null || Array.isArray(current))
                throw new Error('managed state');
              return { ...current, __routerUrl: url, comparisonSentinel: 'reload' };
            }, targetUrl)
          : variant.state;
      for (const page of [native, app])
        await page.evaluate(
          ({ state, url }) => {
            history.replaceState(state, '', url);
            history.scrollRestoration = 'manual';
          },
          {
            state,
            url: targetUrl,
          },
        );
      const hashY = await app
        .locator('#main-content h2[id]')
        .nth(1)
        .evaluate((heading) => heading.getBoundingClientRect().top + scrollY);
      const beforeAppY = await readReloadPosition(app);
      const beforeNativeY = await readReloadPosition(native);
      expect(
        await app.evaluate(() => window.__readingReloadProbe?.scrollCalls.length),
      ).toBeGreaterThan(0);
      expect(beforeAppY).toBeGreaterThan(0);
      expect(Math.abs(beforeAppY - hashY)).toBeGreaterThan(2);
      const beforeApp = await viewportSnapshot(app);
      const beforeNative = await viewportSnapshot(native);
      expect(beforeApp.url).toBe(beforeNative.url);
      expect(beforeApp.state).toEqual(beforeNative.state);
      expect(Math.abs(beforeApp.maxY - beforeNative.maxY)).toBeLessThanOrEqual(2);
      expect(Math.abs(beforeAppY - beforeNativeY)).toBeLessThanOrEqual(2);
      expect(beforeApp.mode).toBe('manual');
      expect(beforeNative.mode).toBe(beforeApp.mode);
      expect(beforeApp.fonts).toBe('loaded');
      expect(beforeNative.fonts).toBe(beforeApp.fonts);
      expect(beforeApp.readyState).toBe('complete');
      expect(beforeNative.readyState).toBe(beforeApp.readyState);
      const diagnostics: {
        control: 'steady-auto' | 'no-js';
        before: Awaited<ReturnType<typeof viewportSnapshot>>;
        after: Awaited<ReturnType<typeof viewportSnapshot>>;
      }[] = [];
      // mode差とJS無効自体の差を分ける。異なるmodeの対照は合否の座標基準へ使わない。
      for (const control of ['steady-auto', 'no-js'] as const)
        await withNativeControl(
          app,
          async (baseline) => {
            await baseline.evaluate(({ state, url }) => history.replaceState(state, '', url), {
              state,
              url: targetUrl,
            });
            await readReloadPosition(baseline);
            const before = await viewportSnapshot(baseline);
            expect(before.mode).toBe('auto');
            expect(before.url).toBe(beforeApp.url);
            expect(before.state).toEqual(beforeApp.state);
            expect(before.fonts).toBe('loaded');
            expect(before.readyState).toBe('complete');
            expect(Math.abs(before.maxX - beforeApp.maxX)).toBeLessThanOrEqual(2);
            expect(Math.abs(before.maxY - beforeApp.maxY)).toBeLessThanOrEqual(2);
            expect(Math.abs(before.y - beforeApp.y)).toBeLessThanOrEqual(2);
            await baseline.reload();
            await settleNativeLayout(baseline);
            const after = await viewportSnapshot(baseline);
            expect(after.state).toEqual(state);
            expect(after.url).toBe(targetUrl);
            expect(after.length).toBe(before.length);
            expect(after.mode).toBe('auto');
            expect(after.fonts).toBe('loaded');
            expect(after.readyState).toBe('complete');
            expect(Math.abs(after.maxX - beforeApp.maxX)).toBeLessThanOrEqual(2);
            expect(Math.abs(after.maxY - beforeApp.maxY)).toBeLessThanOrEqual(2);
            diagnostics.push({ control, before, after });
          },
          control,
          initialUrl,
        );
      await native.bringToFront();
      await native.reload();
      await settleNativeLayout(native);
      await app.bringToFront();
      await app.reload();
      await ready(app);
      await settleNativeLayout(app);
      const afterNative = await viewportSnapshot(native);
      const afterApp = await viewportSnapshot(app);
      const probe = await app.evaluate(() => window.__readingReloadProbe);
      const nativeProbe = await native.evaluate(() => window.__readingReloadProbe);
      try {
        expect(probe).toBeDefined();
        expect(probe?.modeAtLoad).toBe('auto');
        expect(probe?.phases[0]?.phase).toBe('init');
        expect(probe?.scrollCalls).toEqual([]);
        expect(afterApp.mode).toBe(variant.kind === 'managed' ? 'manual' : 'auto');
        expect(afterNative.mode).toBe(afterApp.mode);
        expect(nativeProbe?.modeAtLoad).toBe('auto');
        expect(nativeProbe?.phases[0]?.phase).toBe('init');
        expect(nativeProbe?.phases[0]?.mode).toBe(probe?.phases[0]?.mode);
        expect(probe?.modeChanges[0]?.mode).toBe('auto');
        expect(nativeProbe?.modeChanges[0]?.mode).toBe('auto');
        expect(nativeProbe?.scrollCalls).toEqual([]);
        expect(afterApp.state).toEqual(state);
        expect(afterNative.state).toEqual(state);
        expect(afterApp.length).toBe(beforeApp.length);
        expect(afterNative.length).toBe(beforeNative.length);
        expect(afterApp.url).toBe(targetUrl);
        expect(afterNative.url).toBe(targetUrl);
        expect(afterApp.fonts).toBe('loaded');
        expect(afterNative.fonts).toBe(afterApp.fonts);
        expect(afterApp.readyState).toBe('complete');
        expect(afterNative.readyState).toBe(afterApp.readyState);
        expect(Math.abs(afterApp.maxX - afterNative.maxX)).toBeLessThanOrEqual(2);
        expect(Math.abs(afterApp.maxY - afterNative.maxY)).toBeLessThanOrEqual(2);
        // load後にもnative復元が進み得る。mode/state判定を先に行い、座標失敗で隠さない。
        await expect
          .poll(async () => {
            const [appPosition, nativePosition] = await Promise.all([
              viewportSnapshot(app),
              viewportSnapshot(native),
            ]);
            return Math.max(
              Math.abs(appPosition.x - nativePosition.x),
              Math.abs(appPosition.y - nativePosition.y),
            );
          })
          .toBeLessThanOrEqual(2);
      } finally {
        console.log(
          'reading-native-reload-comparison',
          JSON.stringify({
            variant: variant.kind,
            beforeApp,
            beforeNative,
            afterApp: await viewportSnapshot(app),
            afterNative: await viewportSnapshot(native),
            probe: await app.evaluate(() => window.__readingReloadProbe),
            nativeProbe: await native.evaluate(() => window.__readingReloadProbe),
            diagnostics,
          }),
        );
      }
    },
    'same-mode',
  );
};
const installFocusProbe = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.__readingFocusCalls = [];
    const focus = HTMLElement.prototype.focus;
    const blur = HTMLElement.prototype.blur;
    HTMLElement.prototype.focus = function (options?: FocusOptions): void {
      window.__readingFocusCalls?.push(`focus:${this.tagName}:${this.id}`);
      focus.call(this, options);
    };
    HTMLElement.prototype.blur = function (): void {
      window.__readingFocusCalls?.push(`blur:${this.tagName}:${this.id}`);
      blur.call(this);
    };
    const button = document.createElement('button');
    button.id = 'reading-same-focus';
    button.textContent = '同一focus対象';
    document.querySelector('#main-content')?.append(button);
    button.focus({ preventScroll: true });
  });
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('reading-same-focus');
  expect(await page.evaluate(() => window.__readingFocusCalls)).toEqual([
    'focus:BUTTON:reading-same-focus',
  ]);
  await page.evaluate(() => {
    window.__readingFocusCalls = [];
  });
};
const focusSnapshot = (page: Page) =>
  page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    id: document.activeElement?.id,
    retained: document.getElementById('reading-same-focus')?.isConnected,
    calls: window.__readingFocusCalls,
  }));

test('same-document Backはappがfocusを動かさず同じnative履歴操作に従う（A7）', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(e2eNoteFixtures.layoutRich.directPath);
  await ready(page);
  await withNativeControl(page, async (native) => {
    const links = page.locator('[data-layout-toc-nav] [data-toc-link]');
    const before = await page.evaluate(() => history.length);
    const nativeBefore = await native.evaluate(() => history.length);
    await native.evaluate(() => {
      history.scrollRestoration = 'manual';
    });
    await links.first().click();
    const first = await viewportSnapshot(page);
    const y = await read(page, 0.65);
    await native.evaluate(
      ({ state, url, y }) => {
        history.pushState(state, '', url);
        window.scrollTo({ top: y, behavior: 'instant' });
      },
      { state: first.state, url: first.url, y },
    );
    await links.nth(1).click();
    await settleNativeLayout(page);
    const second = await viewportSnapshot(page);
    expect(second.url).not.toBe(first.url);
    await native.evaluate(
      ({ state, url, y }) => {
        history.pushState(state, '', url);
        window.scrollTo({ top: y, behavior: 'instant' });
      },
      { state: second.state, url: second.url, y: second.y },
    );
    expect(await page.evaluate(() => history.length)).toBe(before + 2);
    expect(await native.evaluate(() => history.length)).toBe(nativeBefore + 2);
    expect(await native.evaluate(() => history.state as unknown)).toEqual(second.state);
    await installFocusProbe(native);
    await installFocusProbe(page);
    await native.goBack();
    await settleNativeLayout(native);
    await page.goBack();
    await at(page, first.url, y);
    await settleNativeLayout(page);
    expect(await native.evaluate(() => location.pathname + location.search + location.hash)).toBe(
      first.url,
    );
    expect(await native.evaluate(() => history.state as unknown)).toEqual(first.state);
    expect(await page.evaluate(() => history.state as unknown)).toEqual(first.state);
    const nativeFocus = await focusSnapshot(native);
    const appFocus = await focusSnapshot(page);
    expect(nativeFocus.retained).toBe(true);
    expect(appFocus.retained).toBe(true);
    expect(nativeFocus.calls).toEqual([]);
    expect(appFocus.calls).toEqual([]);
    expect({ tag: appFocus.tag, id: appFocus.id }).toEqual({
      tag: nativeFocus.tag,
      id: nativeFocus.id,
    });
    console.log('reading-native-focus-comparison', { nativeFocus, appFocus });
  });
});

test('reloadはmanualからautoへ返し同じnative座標を採用する（A8、Pなし）', async ({ page }) => {
  await compareNativeReload(page, { kind: 'managed' });
});

test('no-JSの通常link/hash/Backで本文を読める（A9）', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    ...(baseURL ? { baseURL } : {}),
  });
  try {
    const page = await context.newPage();
    await page.goto(e2eNoteFixtures.markdownBasic.directPath);
    await expect(page.locator('#main-content h1')).toBeVisible();
    const hashLink = page.locator('[data-layout-toc-nav] a[href*="#"]').first();
    await hashLink.click();
    expect(new URL(page.url()).hash).not.toBe('');
    await page.evaluate((url) => {
      const anchor = document.createElement('a');
      anchor.id = 'reading-no-js-next';
      anchor.href = url;
      anchor.textContent = '次へ';
      anchor.style.cssText = 'position:fixed;top:60px;left:150px;z-index:9999';
      document.querySelector('#main-content')?.prepend(anchor);
    }, e2eNoteFixtures.code.directPath);
    await page.locator('#reading-no-js-next').click();
    await expect(page.locator('#main-content h1')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#main-content h1')).toBeVisible();
    expect(new URL(page.url()).hash).not.toBe('');
    await page.goForward();
    await expect(page).toHaveURL(e2eNoteFixtures.code.directPath);
  } finally {
    await context.close();
  }
});

test('遅い寸法未確定画像は2frame後もpendingで解放後に保存座標へ戻る（R1/A5）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, a());
  const y = await read(page, 0.65);
  await navigate(page, b());
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/reading-late.svg', async (route) => {
    await gate;
    await route
      .fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300"><rect width="500" height="300" fill="gray"/></svg>',
      })
      .catch(() => {
        /* この観測点では追加処理を行わない。 */
      });
  });
  await page.route(`**${resolveRouterArtifactPathname(a())}`, async (route) => {
    const response = await route.fetch();
    const envelope = (await response.json()) as { document: { html: string } };
    envelope.document.html =
      '<img src="/reading-late.svg" alt="遅延画像">' + envelope.document.html;
    await route.fulfill({ response, json: envelope });
  });
  try {
    await page.goBack();
    await expect(page.locator('#main-content img[src="/reading-late.svg"]')).toHaveCount(1);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-reading-position-status',
      'pending',
    );
    release();
    await at(page, a(), y);
  } finally {
    release();
  }
});

for (const action of ['wheel', 'PageDown', 'pointer'] as const)
  test(`復元待機中の本人${action}後に遅延画像を解放しても位置とfocusを奪わない（A6）`, async ({
    page,
  }) => {
    await page.goto(e2eNoteFixtures.markdownBasic.directPath);
    await ready(page);
    await navigate(page, a());
    await read(page, 0.7);
    await navigate(page, b());
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/reading-cancel.svg', async (route) => {
      await gate;
      await route
        .fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300"/>',
        })
        .catch(() => {
          /* この観測点では追加処理を行わない。 */
        });
    });
    await page.route(`**${resolveRouterArtifactPathname(a())}`, async (route) => {
      const response = await route.fetch();
      const envelope = (await response.json()) as { document: { html: string } };
      envelope.document.html =
        '<img src="/reading-cancel.svg" alt="遅延画像">' + envelope.document.html;
      await route.fulfill({ response, json: envelope });
    });
    try {
      await page.goBack();
      await expect(page.locator('#main-content img[src="/reading-cancel.svg"]')).toHaveCount(1);
      if (action === 'wheel') await page.mouse.wheel(0, 120);
      else if (action === 'PageDown') {
        await page.keyboard.press('PageDown');
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
        await page.evaluate(async () => {
          let previous = scrollY;
          let stable = 0;
          const deadline = performance.now() + 2000;
          while (stable < 4 && performance.now() < deadline) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            stable = Math.abs(scrollY - previous) <= 1 ? stable + 1 : 0;
            previous = scrollY;
          }
        });
      } else await page.mouse.click(400, 200);
      await expect(page.locator('#main-content')).toHaveAttribute(
        'data-reading-position-status',
        'cancelled',
      );
      await page.evaluate(() => {
        const image = document.querySelector<HTMLImageElement>('img[src="/reading-cancel.svg"]');
        // layout shift自身と旧jobの再移動を区別するため、取消後に画像の寸法を固定する。
        if (image) {
          image.width = 500;
          image.height = 300;
        }
        window.scrollTo({ top: 400, behavior: 'instant' });
        const button = document.createElement('button');
        button.id = 'reading-user-focus';
        document.querySelector('#main-content')?.append(button);
        button.focus({ preventScroll: true });
      });
      release();
      await expect(page.locator('#main-content img[src="/reading-cancel.svg"]')).toHaveJSProperty(
        'complete',
        true,
      );
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect(Math.abs((await page.evaluate(() => scrollY)) - 400)).toBeLessThanOrEqual(2);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('reading-user-focus');
    } finally {
      release();
    }
  });

for (const refresh of ['hashchange', 'resize', 'ui-tab-change'] as const)
  test(`same-document Back後の${refresh}でも座標とTOC currentを維持する（A7/R4）`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(e2eNoteFixtures.markdownBasic.directPath);
    await ready(page);
    await navigate(page, e2eNoteFixtures.layoutRich.normalizedPath);
    const links = page.locator('[data-layout-toc-nav] [data-toc-link]');
    await links.first().click();
    const firstUrl = await page.evaluate(() => location.pathname + location.search + location.hash);
    const y = await read(page, 0.65);
    await page.mouse.wheel(0, 1);
    const currentLink = page.locator(
      '[data-layout-toc-nav] [data-toc-link][aria-current="location"]',
    );
    const hashId = await links.first().getAttribute('data-heading-id');
    await expect.poll(() => currentLink.getAttribute('data-heading-id')).not.toBeNull();
    await expect.poll(() => currentLink.getAttribute('data-heading-id')).not.toBe(hashId);
    const viewportHeading = await currentLink.getAttribute('data-heading-id');
    const firstId: unknown = await page.evaluate(() => history.state.__rouaultHistoryEntry.id);
    await links.nth(1).click();
    await page.goBack();
    await at(page, firstUrl, y);
    expect(await page.evaluate(() => history.state.__rouaultHistoryEntry.id)).toBe(firstId);
    await expect(currentLink).toHaveAttribute('data-heading-id', viewportHeading ?? '');
    await page.evaluate((kind) => {
      if (kind === 'hashchange') window.dispatchEvent(new HashChangeEvent('hashchange'));
      else if (kind === 'resize') window.dispatchEvent(new Event('resize'));
      else document.dispatchEvent(new CustomEvent('ui-tab-change', { bubbles: true }));
    }, refresh);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThanOrEqual(2);
    await expect(currentLink).toHaveAttribute('data-heading-id', viewportHeading ?? '');
  });

test('短文化したentryは現在rangeへclampし保存座標の到達を無限待機しない（A8）', async ({
  page,
}) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, a());
  const y = await read(page, 0.75);
  await navigate(page, b());
  await page.route(`**${resolveRouterArtifactPathname(a())}`, async (route) => {
    const response = await route.fetch();
    const envelope = (await response.json()) as { document: { html: string } };
    envelope.document.html = '<article><h1>短い本文</h1><p>短文化後も読める。</p></article>';
    await route.fulfill({ response, json: envelope });
  });
  await page.goBack();
  await ready(page);
  const max = await page.evaluate(() => {
    const root = document.scrollingElement;
    return root ? Math.max(0, root.scrollHeight - root.clientHeight) : 0;
  });
  expect(max).toBeLessThan(y);
  await at(page, a(), max);
  await expect(page.locator('#main-content h1')).toHaveText('短い本文');
});

for (const surface of ['tabs', 'search'] as const)
  test(`遅い未commit requestを本人${surface}の同値選択でも失効する（B2/A6）`, async ({ page }) => {
    await page.goto(surface === 'tabs' ? e2eNoteFixtures.interactive.directPath : '/search/');
    await ready(page);
    if (surface === 'search')
      await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
        'data-enhanced',
        'true',
      );
    let release!: () => void;
    let requested!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const seen = new Promise<void>((resolve) => {
      requested = resolve;
    });
    await page.route(`**${resolveRouterArtifactPathname(b())}`, async (route) => {
      requested();
      await gate;
      await route.continue().catch(() => {
        /* 取消されたrequestへ応答を適用しない。 */
      });
    });
    try {
      await page.evaluate((url) => {
        const host = document.querySelector('router-document-host');
        if (!host) throw new Error('host');
        void host.navigate(url).then((result) => {
          host.dataset['readingRequestOutcome'] = result.outcome;
        });
      }, b());
      await seen;
      if (surface === 'tabs')
        await page.getByRole('tab', { name: 'JavaScript', exact: true }).click();
      else {
        const menu = page.locator('[data-search-choice-menu="tag-mode"]').first();
        await menu.locator('[data-static-choice-trigger]').click();
        await menu.locator('[data-static-choice-item][data-value="or"]').click();
      }
      const ownedUrl = page.url();
      release();
      await expect(page.locator('router-document-host')).toHaveAttribute(
        'data-reading-request-outcome',
        'superseded',
      );
      expect(page.url()).toBe(ownedUrl);
      if (surface === 'tabs')
        await expect(page.getByRole('tab', { name: 'JavaScript', exact: true })).toHaveAttribute(
          'aria-selected',
          'true',
        );
      else await expect(page.locator('[data-search-page-root]')).toHaveCount(1);
    } finally {
      release();
    }
  });

for (const start of ['/search/', '/tags/Programming/'])
  test(`${start}のfeature pushはbaselineを保ちrouter Backは新SSRへ交代する（R5）`, async ({
    page,
  }) => {
    await page.goto(start);
    await ready(page);
    const surface = page.locator('[data-search-page-root]');
    await expect(surface).toHaveAttribute('data-search-page-capability', 'ready');
    const original = await page.evaluate(() => {
      const baseline = document.querySelector<HTMLElement>('[data-search-page-baseline]');
      if (!baseline) throw new Error('baseline');
      baseline.dataset['readingBaselineOwner'] = 'original';
      return {
        url: location.pathname + location.search,
        id: history.state.__rouaultHistoryEntry.id as string,
        html: baseline.innerHTML,
      };
    });
    const menu = page.locator('[data-search-choice-menu="sort"]').first();
    await menu.locator('[data-static-choice-trigger]').click();
    await menu.locator('[data-static-choice-item][data-value="date-desc"]').click();
    await expect
      .poll(() => page.evaluate(() => location.pathname + location.search))
      .not.toBe(original.url);
    await expect(page.locator('[data-search-page-baseline]')).toHaveAttribute(
      'data-reading-baseline-owner',
      'original',
    );
    expect(await page.locator('[data-search-page-baseline]').innerHTML()).toBe(original.html);
    expect(await page.evaluate(() => history.state.__rouaultHistoryEntry.id)).not.toBe(original.id);
    await page.goBack();
    await ready(page);
    await expect
      .poll(() => page.evaluate(() => location.pathname + location.search))
      .toBe(original.url);
    expect(await page.evaluate(() => history.state.__rouaultHistoryEntry.id)).toBe(original.id);
    await expect(page.locator('[data-search-page-baseline]')).not.toHaveAttribute(
      'data-reading-baseline-owner',
      'original',
    );
    expect(await page.locator('[data-search-page-baseline]').innerHTML()).toBe(original.html);
    await page.goForward();
    await ready(page);
    await expect.poll(() => page.evaluate(() => location.search)).toContain('sort=date-desc');
    await expect(page.locator('[data-search-page-baseline]')).not.toHaveAttribute(
      'data-reading-baseline-owner',
      'original',
    );
    await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
      'data-search-page-surface',
      'search',
    );
  });

test('BFCacheはpersisted観測時だけ同epoch/viewportの再開を判定する（A8）', async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('pageshow', (event) => {
      document.documentElement.dataset['readingBfcachePersisted'] = String(event.persisted);
    });
    document.addEventListener('app-content:hydration-ready', (event) => {
      document.documentElement.dataset['readingProbeEpoch'] = String(
        (event as CustomEvent<{ contentEpoch: number }>).detail.contentEpoch,
      );
    });
  });
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const epoch = await page.locator('html').getAttribute('data-reading-probe-epoch');
  const y = await read(page, 0.5);
  await page.goto('/about/');
  await page.goBack();
  const persisted = await page.locator('html').getAttribute('data-reading-bfcache-persisted');
  console.log('reading-bfcache-evidence', persisted);
  if (persisted !== 'true') {
    test.info().annotations.push({
      type: 'BFCache',
      description: 'pageshow.persisted未観測。このrunをBFCache成功に数えない。',
    });
    await expect(page.locator('#main-content h1')).toBeVisible();
    return;
  }
  await expect(page.locator('html')).toHaveAttribute('data-reading-probe-epoch', epoch ?? '');
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => scrollY)) - y))
    .toBeLessThanOrEqual(2);
  await expect.poll(() => page.evaluate(() => history.scrollRestoration)).toBe('manual');
});

for (const variant of [
  { kind: 'primitive', state: 7 },
  { kind: 'array', state: ['opaque'] },
  { kind: 'unknown-version', state: { __rouaultHistoryEntry: { version: 99, id: 'unknown' } } },
] as const)
  test(`${variant.kind}のreloadはstateを保全し同じnative座標を採用する（A8/R3）`, async ({
    page,
  }) => {
    await compareNativeReload(page, variant);
  });
