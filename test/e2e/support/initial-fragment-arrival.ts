import { expect, test } from '@playwright/test';

interface FragmentGeometryEvidence {
  documentY: number;
  offset: number;
  viewportWidth: number;
  viewportHeight: number;
  rangeX: number;
  rangeY: number;
  targetX: number;
  targetY: number;
}
interface FragmentFrameEvidence {
  at: number;
  x: number;
  y: number;
  geometry: FragmentGeometryEvidence | null;
  fonts: FontFaceSetLoadStatus;
  pendingUpperImages: number | null;
  visible: boolean;
  correction: string | undefined;
}
interface FragmentTrace {
  hydratedAt: number | null;
  firstCorrection: FragmentFrameEvidence | null;
  readonly scrollEnds: number[];
  readonly frames: FragmentFrameEvidence[];
  readonly calls: {
    before: number;
    after: number;
    at: number;
    behavior: unknown;
    correction: string | undefined;
  }[];
}
declare global {
  interface Window {
    __initialFragmentTrace: FragmentTrace;
  }
}

// nativeの移動はscroll APIを通らない。appによる実座標の書換えを別に記録する。
function installFragmentTrace(): void {
  const trace: FragmentTrace = {
    hydratedAt: null,
    firstCorrection: null,
    scrollEnds: [],
    frames: [],
    calls: [],
  };
  window.__initialFragmentTrace = trace;
  document.addEventListener('app-content:hydration-ready', (event) => {
    const detail: unknown = event instanceof CustomEvent ? event.detail : null;
    if (
      detail &&
      typeof detail === 'object' &&
      'contentRoot' in detail &&
      detail.contentRoot === document.getElementById('main-content')
    )
      trace.hydratedAt = performance.now();
  });
  document.addEventListener('scrollend', (event) => {
    if (event.target === document) trace.scrollEnds.push(performance.now());
  });
  const sample = (): FragmentFrameEvidence => {
    const heading = document.getElementById('cobol');
    const main = document.getElementById('main-content');
    const root = document.scrollingElement;
    let geometry: FragmentGeometryEvidence | null = null;
    let pendingUpperImages: number | null = null;
    if (heading && main?.contains(heading) && root && heading.getClientRects().length) {
      const documentY = heading.getBoundingClientRect().top + scrollY;
      const offset =
        Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) +
        Number.parseFloat(getComputedStyle(heading).scrollMarginTop);
      const rangeX = Math.max(0, root.scrollWidth - root.clientWidth);
      const rangeY = Math.max(0, root.scrollHeight - root.clientHeight);
      geometry = {
        documentY,
        offset,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        rangeX,
        rangeY,
        targetX: 0,
        targetY: Math.max(0, Math.min(rangeY, documentY - offset)),
      };
      pendingUpperImages = Array.from(main.querySelectorAll('img')).filter(
        (image) =>
          !image.complete &&
          (!image.hasAttribute('width') || !image.hasAttribute('height')) &&
          image.getBoundingClientRect().top + scrollY <= documentY,
      ).length;
    }
    return {
      at: performance.now(),
      x: scrollX,
      y: scrollY,
      geometry,
      fonts: document.fonts.status,
      pendingUpperImages,
      visible: document.visibilityState === 'visible',
      correction: main?.dataset['readingPositionCorrection'],
    };
  };
  const original = window.scrollTo;
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: (...args: unknown[]): void => {
      const correction =
        document.getElementById('main-content')?.dataset['readingPositionCorrection'];
      // 最初の書込より前に同じ幾何を記録し、前後のtargetを混ぜて適格性を作らない。
      if (correction === 'running' && trace.firstCorrection === null)
        trace.firstCorrection = sample();
      const before = scrollY;
      const at = performance.now();
      Reflect.apply(original, window, args);
      const options: unknown = args[0];
      trace.calls.push({
        correction,
        before,
        after: scrollY,
        at,
        behavior:
          typeof options === 'object' && options !== null && 'behavior' in options
            ? options.behavior
            : undefined,
      });
    },
  });
  const frame = (): void => {
    trace.frames.push(sample());
    if (performance.now() < 6500) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

const expectEligibleResidual = (trace: FragmentTrace): void => {
  const first = trace.firstCorrection;
  expect(first, 'corrected arrival requires a measured native miss').not.toBeNull();
  if (!first) return;
  expect(first.geometry).not.toBeNull();
  if (!first.geometry) return;
  expect(
    Math.max(
      Math.abs(first.x - first.geometry.targetX),
      Math.abs(first.y - first.geometry.targetY),
    ),
  ).toBeGreaterThan(2);
  expect(first.visible).toBe(true);
  expect(first.fonts).toBe('loaded');
  expect(first.pendingUpperImages).toBe(0);
  expect(trace.hydratedAt).not.toBeNull();
  const observations = trace.frames.filter(
    (frame) => frame.at >= (trace.hydratedAt ?? Infinity) && frame.at < first.at,
  );
  const quiet: FragmentTrace['frames'] = [];
  for (const frame of observations.reverse()) {
    if (
      frame.x !== first.x ||
      frame.y !== first.y ||
      frame.fonts !== 'loaded' ||
      frame.pendingUpperImages !== 0 ||
      !frame.geometry ||
      !frame.visible ||
      ![first, ...quiet].every((value) => {
        const baseline = frame.geometry;
        const current = value.geometry;
        return (
          baseline !== null &&
          current !== null &&
          (Object.keys(baseline) as (keyof FragmentGeometryEvidence)[]).every(
            (key) => Math.abs(baseline[key] - current[key]) <= 1,
          )
        );
      }) ||
      (quiet[quiet.length - 1]?.at ?? first.at) - frame.at > 50
    )
      break;
    quiet.push(frame);
  }
  expect(
    quiet.length,
    'residual starts after at least three quiet RAF observations',
  ).toBeGreaterThanOrEqual(3);
  const baseline = quiet[quiet.length - 1];
  if (!baseline) return;
  const hint = trace.scrollEnds.some((at) => at >= baseline.at && at <= first.at);
  expect(
    first.at - baseline.at,
    'residual must not interrupt the moving native viewport',
  ).toBeGreaterThanOrEqual(hint ? 100 : 200);
};

export const booksFragmentPath = `/notes/library/collection/${encodeURIComponent('計算機科学・ソフトウェア開発関連書籍')}#cobol`;

export function registerInitialFragmentArrivalTests(): void {
  for (const { motion, readiness } of [
    { motion: 'no-preference', readiness: 'ordinary' },
    { motion: 'no-preference', readiness: 'stable-font-metrics' },
    { motion: 'reduce', readiness: 'ordinary' },
    { motion: 'no-preference', readiness: 'late-client' },
    { motion: 'no-preference', readiness: 'upper-image' },
    { motion: 'no-preference', readiness: 'late-font' },
  ] as const) {
    test(`initial fragment: genuine direct document arrival without an instant interruption (${motion}, ${readiness})`, async ({
      page,
      baseURL,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.emulateMedia({ reducedMotion: motion });
      await page.addInitScript(installFragmentTrace);
      if (readiness === 'stable-font-metrics')
        await page.route(
          (url) => url.pathname === new URL(booksFragmentPath, baseURL).pathname,
          async (route) => {
            const response = await route.fetch();
            // native-only制御では、font swapによる正当な未到達と移動の中断を分離する。
            await route.fulfill({
              response,
              body: (await response.text()).replace(
                '</head>',
                '<style>html * { font-family: monospace !important; }</style></head>',
              ),
            });
          },
        );
      if (readiness === 'late-client')
        await page.route('**/client-assets/client-*.js', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          await route.continue();
        });
      if (readiness === 'late-font')
        await page.route('**/*.woff2', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          await route.continue();
        });
      if (readiness === 'upper-image') {
        await page.route('**/initial-fragment-upper.svg', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 800));
          await route.fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"/>',
          });
        });
        await page.route(
          (url) => url.pathname === new URL(booksFragmentPath, baseURL).pathname,
          async (route) => {
            const response = await route.fetch();
            const html = await response.text();
            expect(html).toContain('<h3 id="cobol">');
            await route.fulfill({
              response,
              body: html.replace(
                '<h3 id="cobol">',
                '<img src="/initial-fragment-upper.svg" alt="" style="display:block"><h3 id="cobol">',
              ),
            });
          },
        );
      }
      await page.goto(new URL(booksFragmentPath, baseURL).href, { waitUntil: 'load' });
      await expect(page.locator('h3#cobol')).toHaveText('COBOL');
      // 大きいmainのlocator診断を各pollで作らず、測定中は状態だけを読む。
      await expect
        .poll(() =>
          page.evaluate(
            () => document.getElementById('main-content')?.dataset['readingPositionStatus'],
          ),
        )
        .toBe('settled')
        .catch(async (error: unknown) => {
          // 到達assertionの失敗は維持し、jobの元の期限後に停止理由だけを採取する。
          await page.waitForTimeout(1500);
          await info.attach('initial-fragment-failure', {
            contentType: 'application/json',
            body: JSON.stringify(
              {
                errors,
                snapshot: await page.evaluate(() => ({
                  trace: window.__initialFragmentTrace,
                  status: document.getElementById('main-content')?.dataset,
                  y: scrollY,
                  headingTop: document.getElementById('cobol')?.getBoundingClientRect().top,
                  fonts: document.fonts.status,
                })),
              },
              null,
              2,
            ),
          });
          throw error;
        });
      // 成功通知後にnativeが再開した場合も、通常の最終到達assertionを維持する。
      await page.waitForTimeout(300);
      const evidence = await page.evaluate(() => {
        const heading = document.getElementById('cobol');
        const root = document.scrollingElement;
        if (!heading || !root) throw new Error('generated fragment target missing');
        const offset =
          Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) +
          Number.parseFloat(getComputedStyle(heading).scrollMarginTop);
        const target = Math.max(
          0,
          Math.min(
            root.scrollHeight - root.clientHeight,
            heading.getBoundingClientRect().top + scrollY - offset,
          ),
        );
        return {
          trace: window.__initialFragmentTrace,
          arrival: document.getElementById('main-content')?.dataset['readingPositionArrival'],
          navigationType: (
            performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          ).type,
          href: location.href,
          y: scrollY,
          x: scrollX,
          target,
          headingTop: heading.getBoundingClientRect().top,
          offset,
        };
      });
      await info.attach('initial-fragment-arrival', {
        body: JSON.stringify(evidence, null, 2),
        contentType: 'application/json',
      });
      expect(errors).toEqual([]);
      expect(evidence.navigationType).toBe('navigate');
      expect(evidence.href).toBe(new URL(booksFragmentPath, baseURL).href);
      expect(Math.abs(evidence.y - evidence.target)).toBeLessThanOrEqual(2);
      expect(Math.abs(evidence.x)).toBeLessThanOrEqual(2);
      expect(evidence.trace.frames.length).toBeGreaterThan(2);
      const nativeOnly = readiness === 'stable-font-metrics' || motion === 'reduce';
      expect(evidence.arrival).toMatch(nativeOnly ? /^native$/ : /^(native|corrected)$/);
      if (evidence.arrival === 'corrected') expectEligibleResidual(evidence.trace);
      else expect(evidence.trace.firstCorrection).toBeNull();
      expect(
        evidence.trace.calls.filter(
          (call) =>
            call.behavior === 'instant' &&
            Math.abs(call.after - call.before) >
              (call.correction === 'running' ? (motion === 'reduce' ? Infinity : 41) : 2),
        ),
        'initial fragment must not replace native movement with an instant position jump',
      ).toEqual([]);
    });
  }
  test('initial fragment: adjacent zero-height pending image blocks acceptance before load', async ({
    page,
    baseURL,
  }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(installFragmentTrace);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/initial-fragment-adjacent.svg', async (route) => {
      await gate;
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="24"/>',
      });
    });
    await page.route(
      (url) => url.pathname === new URL(booksFragmentPath, baseURL).pathname,
      async (route) => {
        const response = await route.fetch();
        const html = await response.text();
        expect(html).toContain('<h3 id="cobol">');
        await route.fulfill({
          response,
          body: html.replace(
            '<h3 id="cobol">',
            '<img id="initial-fragment-adjacent-image" src="/initial-fragment-adjacent.svg" alt="" style="display:block;width:200px"><h3 id="cobol" style="margin-top:0">',
          ),
        });
      },
    );
    try {
      await page.goto(new URL(booksFragmentPath, baseURL).href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () =>
          document.getElementById('main-content')?.dataset['readingPositionStatus'] !== undefined,
      );
      // loadを先に待つと、待機を怠った早期settledをnative anchoringで隠してしまう。
      await page.waitForTimeout(1200);
      const held = await page.evaluate(() => {
        const heading = document.getElementById('cobol');
        const image = document.querySelector<HTMLImageElement>('#initial-fragment-adjacent-image');
        if (!heading || !image) throw new Error('adjacent image fixture missing');
        const documentY = heading.getBoundingClientRect().top + scrollY;
        const offset =
          Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) +
          Number.parseFloat(getComputedStyle(heading).scrollMarginTop);
        return {
          status: document.getElementById('main-content')?.dataset['readingPositionStatus'],
          provisional: document.getElementById('main-content')?.dataset['tocPositionProvisional'],
          complete: image.complete,
          imageHeight: image.getBoundingClientRect().height,
          imageY: image.getBoundingClientRect().top + scrollY,
          documentY,
          targetY: documentY - offset,
          fonts: document.fonts.status,
          trace: window.__initialFragmentTrace,
        };
      });
      await info.attach('adjacent-image-before-load', {
        body: JSON.stringify(held, null, 2),
        contentType: 'application/json',
      });
      expect(held.complete).toBe(false);
      expect(held.imageHeight).toBe(0);
      expect(Math.abs(held.imageY - held.documentY)).toBeLessThanOrEqual(0.1);
      expect(held.imageY).toBeGreaterThan(held.targetY);
      expect(held.status).toBe('pending');
      expect(held.provisional).toBeUndefined();
      release();
      await page.waitForLoadState('load');
      try {
        await expect
          .poll(() =>
            page.evaluate(
              () => document.getElementById('main-content')?.dataset['readingPositionStatus'],
            ),
          )
          .toBe('settled');
      } finally {
        const state = await page.evaluate(() => {
          const main = document.getElementById('main-content');
          const heading = document.getElementById('cobol');
          return {
            status: main?.dataset['readingPositionStatus'],
            reason: main?.dataset['readingPositionReason'],
            correction: main?.dataset['readingPositionCorrection'],
            y: scrollY,
            headingTop: heading?.getBoundingClientRect().top,
            fonts: document.fonts.status,
            trace: window.__initialFragmentTrace,
          };
        });
        await info.attach('adjacent-image-arrival-state', {
          body: JSON.stringify(state, null, 2),
          contentType: 'application/json',
        });
      }
      const arrived = await page.evaluate(() => {
        const heading = document.getElementById('cobol');
        const root = document.scrollingElement;
        if (!heading || !root) throw new Error('heading');
        const offset =
          Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) +
          Number.parseFloat(getComputedStyle(heading).scrollMarginTop);
        const target = Math.max(
          0,
          Math.min(
            root.scrollHeight - root.clientHeight,
            heading.getBoundingClientRect().top + scrollY - offset,
          ),
        );
        return {
          error: Math.abs(scrollY - target),
          trace: window.__initialFragmentTrace,
          navigationType: (
            performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          ).type,
        };
      });
      await info.attach('adjacent-image-after-load', {
        body: JSON.stringify(arrived, null, 2),
        contentType: 'application/json',
      });
      expect(errors).toEqual([]);
      expect(arrived.navigationType).toBe('navigate');
      expect(arrived.error).toBeLessThanOrEqual(2);
      if (arrived.trace.firstCorrection) expectEligibleResidual(arrived.trace);
      expect(
        arrived.trace.calls.filter(
          (call) =>
            call.behavior === 'instant' &&
            Math.abs(call.after - call.before) > (call.correction === 'running' ? 41 : 2),
        ),
      ).toEqual([]);
    } finally {
      release();
    }
  });

  test('initial fragment: unavailable does not disable ordinary TOC activation', async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(
      new URL(booksFragmentPath.replace('#cobol', '#absent-initial-heading'), baseURL).href,
    );
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-reading-position-status',
      'unavailable',
      { timeout: 7000 },
    );
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-reading-position-reason',
      'target-missing',
    );
    // sourceのstatic linkではなく、本人のtriggerから通常のpresentation activationを行う。
    await page.locator('[data-toc-trigger]').click();
    const link = page.locator('[data-layout-toc-mobile-nav] [data-toc-link][href$="#cobol"]');
    await link.click();
    await expect(page).toHaveURL(new URL(booksFragmentPath, baseURL).href);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const heading = document.getElementById('cobol');
          if (!heading) throw new Error('heading');
          const offset =
            Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) +
            Number.parseFloat(getComputedStyle(heading).scrollMarginTop);
          return Math.abs(heading.getBoundingClientRect().top - offset);
        }),
      )
      .toBeLessThanOrEqual(2);
    await expect(link).toHaveAttribute('aria-current', 'location');
  });
}
