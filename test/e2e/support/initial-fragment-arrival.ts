import { expect, test } from '@playwright/test';

interface FragmentTrace {
  readonly frames: { at: number; y: number; correction: string | undefined }[];
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
  const trace: FragmentTrace = { frames: [], calls: [] };
  window.__initialFragmentTrace = trace;
  const original = window.scrollTo;
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: (...args: unknown[]): void => {
      const before = scrollY;
      const at = performance.now();
      Reflect.apply(original, window, args);
      const options: unknown = args[0];
      trace.calls.push({
        correction: document.getElementById('main-content')?.dataset['readingPositionCorrection'],
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
    trace.frames.push({
      at: performance.now(),
      y: scrollY,
      correction: document.getElementById('main-content')?.dataset['readingPositionCorrection'],
    });
    if (performance.now() < 6500) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export const booksFragmentPath = `/notes/library/collection/${encodeURIComponent('計算機科学・ソフトウェア開発関連書籍')}#cobol`;

export function registerInitialFragmentArrivalTests(): void {
  for (const { motion, readiness } of [
    { motion: 'no-preference', readiness: 'ordinary' },
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
      const main = page.locator('#main-content');
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
      await expect(main).toHaveAttribute(
        'data-reading-position-arrival',
        readiness === 'ordinary' ? 'native' : /^(native|corrected)$/,
      );
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
