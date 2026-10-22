import { expect, test, type Page, type Locator } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const sourcePath = e2eNoteFixtures.markdownBasic.directPath;
const layoutRich = e2eNoteFixtures.layoutRich;
const layoutRichPath = layoutRich.directPath;
const layoutRichSpaPath = layoutRich.normalizedPath;

interface TocSyncState {
  controllerExists: boolean;
  desktopActiveId: string | null;
  desktopActiveLabel: string | null;
  mobileActiveId: string | null;
  mobileActiveLabel: string | null;
}

interface ExpectedActiveHeading {
  id: string | null;
  label: string | null;
}

interface NamedHeading {
  id: string;
  label: string;
}

const waitForRouterDocumentHostReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const router = document.querySelector('router-document-host');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function' &&
      typeof (router as { whenReady?: unknown }).whenReady === 'function'
    );
  });
};

const navigateWithRouterDocumentHost = async (page: Page, url: string): Promise<void> => {
  await waitForRouterDocumentHostReady(page);

  await page.evaluate(async (targetUrl) => {
    const router = document.querySelector('router-document-host') as
      | (HTMLElement & {
          navigate: (nextUrl: string) => Promise<unknown>;
          whenReady: () => Promise<void>;
        })
      | null;
    if (
      !router ||
      typeof router.navigate !== 'function' ||
      typeof router.whenReady !== 'function'
    ) {
      throw new Error('router-document-host.navigate() が利用できません');
    }

    await router.whenReady();
    await router.navigate(targetUrl);
  }, url);
};

const readTocSyncState = async (page: Page): Promise<TocSyncState> =>
  page.evaluate(() => {
    const controller = document.querySelector('layout-toc-controller');
    const desktopActiveLink = document.querySelector<HTMLAnchorElement>(
      '[data-layout-toc-nav] [data-toc-link][aria-current="location"]',
    );
    const mobileActiveLink = document.querySelector<HTMLAnchorElement>(
      '[data-layout-toc-mobile-nav] [data-toc-link][aria-current="location"]',
    );

    return {
      controllerExists: controller instanceof HTMLElement,
      desktopActiveId: desktopActiveLink?.getAttribute('data-heading-id') ?? null,
      desktopActiveLabel:
        desktopActiveLink
          ?.querySelector<HTMLElement>('.layout-toc__link-label')
          ?.textContent?.trim() ?? null,
      mobileActiveId: mobileActiveLink?.getAttribute('data-heading-id') ?? null,
      mobileActiveLabel:
        mobileActiveLink
          ?.querySelector<HTMLElement>('.layout-toc__link-label')
          ?.textContent?.trim() ?? null,
    };
  });

const waitForTocReady = async (page: Page): Promise<void> => {
  await expect.poll(async () => (await readTocSyncState(page)).controllerExists).toBe(true);
  await expect.poll(async () => (await readTocSyncState(page)).desktopActiveLabel).not.toBeNull();
  await expect.poll(async () => (await readTocSyncState(page)).mobileActiveLabel).not.toBeNull();
};

const waitForTocSettled = async (page: Page): Promise<void> => {
  await waitForTocReady(page);
  await expectTocSynchronizedToViewport(page);
};

const expectTocSynchronized = async (
  page: Page,
  expectedId: string,
  expectedLabel: string,
): Promise<void> => {
  await expect
    .poll(async () => {
      return await readTocSyncState(page);
    })
    .toEqual({
      controllerExists: true,
      desktopActiveId: expectedId,
      desktopActiveLabel: expectedLabel,
      mobileActiveId: expectedId,
      mobileActiveLabel: expectedLabel,
    });
};

const readExpectedActiveHeadingFromViewport = async (page: Page): Promise<ExpectedActiveHeading> =>
  page.evaluate(() => {
    const article = document.querySelector('article');
    if (!(article instanceof HTMLElement)) {
      return { id: null, label: null };
    }

    const readComputedPx = (value: string): number => {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    };
    const resolveActivationOffset = (heading: HTMLElement): number =>
      readComputedPx(getComputedStyle(document.documentElement).scrollPaddingTop) +
      readComputedPx(getComputedStyle(heading).scrollMarginTop);

    const headings = Array.from(article.querySelectorAll<HTMLElement>('h2[id], h3[id], h4[id]'));
    if (headings.length === 0) {
      return { id: null, label: null };
    }

    let current = headings[0] ?? null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= resolveActivationOffset(heading)) {
        current = heading;
        continue;
      }
      break;
    }

    return {
      id: current?.id ?? null,
      label: current?.textContent?.replace(/「.*?」への固定リンク/g, '').trim() ?? null,
    };
  });

const readHeadingByText = async (page: Page, expectedText: string): Promise<NamedHeading> =>
  page.evaluate((text) => {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>('article h2[id], article h3[id], article h4[id]'),
    );
    const match = headings.find((heading) => {
      const label = heading.textContent?.replace(/「.*?」への固定リンク/g, '').trim() ?? '';
      return label === text;
    });

    if (!(match instanceof HTMLElement) || match.id.length === 0) {
      throw new Error(`heading not found: ${text}`);
    }

    return {
      id: match.id,
      label: match.textContent?.replace(/「.*?」への固定リンク/g, '').trim() ?? '',
    };
  }, expectedText);

const expectTocSynchronizedToViewport = async (page: Page): Promise<void> => {
  const expected = await readExpectedActiveHeadingFromViewport(page);
  expect(expected.id).not.toBeNull();
  expect(expected.label).not.toBeNull();
  await expectTocSynchronized(page, expected.id ?? '', expected.label ?? '');
};

const scrollHeadingToActiveZone = async (page: Page, headingId: string): Promise<void> => {
  await page.evaluate(async (id) => {
    const target = document.getElementById(id);
    if (!(target instanceof HTMLElement)) {
      throw new Error(`heading not found: ${id}`);
    }

    const readComputedPx = (value: string): number => {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    };
    const activationOffset =
      readComputedPx(getComputedStyle(document.documentElement).scrollPaddingTop) +
      readComputedPx(getComputedStyle(target).scrollMarginTop);
    const desiredTop = activationOffset - 24;
    const waitForFrame = async (): Promise<void> =>
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const currentTop = target.getBoundingClientRect().top;
      if (currentTop <= activationOffset - 8) {
        break;
      }

      const absoluteTop = currentTop + window.scrollY;
      const nextScrollTop = Math.max(0, absoluteTop - desiredTop);

      window.scrollTo({
        top: nextScrollTop,
        left: 0,
        behavior: 'instant',
      });

      await waitForFrame();
      await waitForFrame();
    }
  }, headingId);
};

test.describe('TOC active state stays synchronized with rendered contract', () => {
  test('layout-rich 直アクセス時に scroll で child prop / attribute / DOM の current が同期して更新されること', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);
    await waitForTocSettled(page);

    const intro = await readHeadingByText(page, '1. 導入');
    const stateSync = await readHeadingByText(page, '2. 状態同期');
    const scroll = await readHeadingByText(page, '2.1 スクロール');
    const hash = await readHeadingByText(page, '2.2 ハッシュ遷移');

    await expectTocSynchronized(page, intro.id, intro.label);

    await scrollHeadingToActiveZone(page, stateSync.id);
    await expectTocSynchronizedToViewport(page);

    await scrollHeadingToActiveZone(page, scroll.id);
    await expectTocSynchronizedToViewport(page);

    await scrollHeadingToActiveZone(page, hash.id);
    await expectTocSynchronizedToViewport(page);
  });

  test('同一 path の hash 遷移後に child prop / attribute / DOM の current が hash 対象へ一致すること', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);
    const target = await readHeadingByText(page, '2. 状態同期');
    await waitForTocReady(page);

    await page.goto(`${layoutRichPath}#${encodeURIComponent(target.id)}`);
    await expect.poll(() => new URL(page.url()).hash).toBe(`#${encodeURIComponent(target.id)}`);
    await waitForTocReady(page);
    await expectTocSynchronized(page, target.id, target.label);
  });

  test('SPA 遷移で layout-rich を開いた後も scroll に応じて child prop / attribute / DOM の current が同期すること', async ({
    page,
  }) => {
    await page.goto(sourcePath);
    await navigateWithRouterDocumentHost(page, layoutRichSpaPath);

    await expect(page).toHaveURL(layoutRichSpaPath);
    await waitForTocSettled(page);

    const intro = await readHeadingByText(page, '1. 導入');
    const stateSync = await readHeadingByText(page, '2. 状態同期');

    await expectTocSynchronized(page, intro.id, intro.label);

    await scrollHeadingToActiveZone(page, stateSync.id);
    await expectTocSynchronizedToViewport(page);
  });
});

const expectTocSurface = async (target: Locator, focusRing = false): Promise<void> => {
  const violations = await target.evaluate((element, includeRing) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const ring = includeRing
      ? Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset))
      : 0;
    const box = {
      left: rect.left - ring,
      right: rect.right + ring,
      top: rect.top - ring,
      bottom: rect.bottom + ring,
    };
    const failures: string[] = [];
    const check = (
      name: string,
      left: number,
      right: number,
      top: number,
      bottom: number,
      x = true,
      y = true,
    ) => {
      if (x && (box.left < left - 1 || box.right > right + 1))
        failures.push(`${name}: horizontal clipping`);
      if (y && (box.top < top - 1 || box.bottom > bottom + 1))
        failures.push(`${name}: vertical clipping`);
    };
    check('viewport', 0, innerWidth, 0, innerHeight);
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const css = getComputedStyle(ancestor);
      const clips = (overflow: string) => /^(auto|scroll|hidden|clip)$/.test(overflow);
      const bounds = ancestor.getBoundingClientRect();
      const left = bounds.left + ancestor.clientLeft;
      const top = bounds.top + ancestor.clientTop;
      check(
        ancestor.tagName,
        left,
        left + ancestor.clientWidth,
        top,
        top + ancestor.clientHeight,
        clips(css.overflowX),
        clips(css.overflowY),
      );
    }
    for (const x of [rect.left + 3, (rect.left + rect.right) / 2, rect.right - 3]) {
      for (const y of [rect.top + 3, (rect.top + rect.bottom) / 2, rect.bottom - 3]) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || !element.contains(hit)) failures.push(`occluded at ${x},${y}`);
      }
    }
    return failures;
  }, focusRing);
  expect(violations).toEqual([]);
};

const tocLongPath = e2eNoteFixtures.tocReadableLongHeading.directPath;
const tocViewports = {
  desktop: { width: 1280, height: 480 },
  mobile: { width: 390, height: 480 },
} as const;
type TocSurface = keyof typeof tocViewports;

const openTocScrollport = async (
  page: Page,
  surface: TocSurface,
  long = true,
): Promise<Locator> => {
  await page.setViewportSize(tocViewports[surface]);
  await page.goto(long ? tocLongPath : layoutRichPath);
  await waitForTocSettled(page);
  if (surface === 'mobile') {
    await page.locator('[data-toc-trigger]').click();
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeVisible();
  }
  return page.locator(
    surface === 'desktop' ? '[data-layout-toc-nav]' : '[data-layout-toc-mobile-panel]',
  );
};

const tocMetrics = async (root: Locator) =>
  root.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollTop: element.scrollTop,
      overflowY: style.overflowY,
      scrollbarWidth: style.getPropertyValue('scrollbar-width'),
      scrollbarColor: style.getPropertyValue('scrollbar-color'),
      scrollbarGutter: style.scrollbarGutter,
      currentId:
        document
          .querySelector('[data-layout-toc-nav] [aria-current="location"]')
          ?.getAttribute('data-heading-id') ?? null,
    };
  });

const servedTocScrollbarDeclarations = async (scrollport: Locator) =>
  scrollport.evaluate((element) => {
    const declarations: { selector: string; width: string; color: string }[] = [];
    const visit = (rules: CSSRuleList): void => {
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule && element.matches(rule.selectorText)) {
          const width = rule.style.getPropertyValue('scrollbar-width');
          const color = rule.style.getPropertyValue('scrollbar-color');
          if (width || color) declarations.push({ selector: rule.selectorText, width, color });
        }
        if (rule instanceof CSSImportRule && rule.styleSheet) visit(rule.styleSheet.cssRules);
        else if (rule instanceof CSSGroupingRule) visit(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) visit(sheet.cssRules);
    return declarations;
  });

const tocStable = async (root: Locator, atEnd = false): Promise<void> => {
  await expect
    .poll(async () =>
      root.evaluate(async (element, endpoint) => {
        const read = () =>
          JSON.stringify([
            element.scrollHeight,
            element.clientHeight,
            element.scrollTop,
            document
              .querySelector('[data-layout-toc-nav] [aria-current="location"]')
              ?.getAttribute('data-heading-id'),
          ]);
        let previous = read();
        for (let frame = 0; frame < 4; frame += 1) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const next = read();
          if (next !== previous) return false;
          previous = next;
        }
        return (
          !endpoint ||
          Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) <= 1
        );
      }, atEnd),
    )
    .toBe(true);
};

const scrollTocToEnd = async (
  page: Page,
  root: Locator,
  input: 'wheel' | 'scrollTop',
): Promise<void> => {
  if (input === 'scrollTop')
    await root.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  else {
    const point = await root.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      let left = Math.max(0, rect.left + element.clientLeft);
      let right = Math.min(innerWidth, rect.left + element.clientLeft + element.clientWidth);
      let top = Math.max(0, rect.top + element.clientTop);
      let bottom = Math.min(innerHeight, rect.top + element.clientTop + element.clientHeight);
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const bounds = ancestor.getBoundingClientRect();
        if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX)) {
          left = Math.max(left, bounds.left + ancestor.clientLeft);
          right = Math.min(right, bounds.left + ancestor.clientLeft + ancestor.clientWidth);
        }
        if (/^(auto|scroll|hidden|clip)$/.test(style.overflowY)) {
          top = Math.max(top, bounds.top + ancestor.clientTop);
          bottom = Math.min(bottom, bounds.top + ancestor.clientTop + ancestor.clientHeight);
        }
      }
      if (right - left < 8 || bottom - top < 8)
        throw new Error('TOC scrollport has no visible wheel coordinate');
      return { x: left + 4, y: top + Math.min(80, (bottom - top) / 2) };
    });
    await page.mouse.move(point.x, point.y);
    await page.mouse.wheel(0, (await tocMetrics(root)).scrollHeight);
  }
  await tocStable(root, true);
};

for (const surface of ['desktop', 'mobile'] as const) {
  for (const environment of ['light', 'dark', 'forced-colors'] as const) {
    test(`${surface} native TOC scrollbar computed styles: ${environment}`, async ({
      page,
      browserName,
      headless,
      browser,
    }) => {
      await page.emulateMedia({
        colorScheme: environment === 'dark' ? 'dark' : 'light',
        forcedColors: environment === 'forced-colors' ? 'active' : 'none',
      });
      const support = await page.evaluate(() => ({
        width: CSS.supports('scrollbar-width', 'thin'),
        color: CSS.supports('scrollbar-color', 'auto'),
        forcedColors: matchMedia('(forced-colors: active)').matches,
        userAgent: navigator.userAgent,
      }));
      const playwrightVersion = test.info().config.version;
      const firefoxHeadlessAgentOverride =
        browserName === 'firefox' && headless && playwrightVersion === '1.63.0';
      test.info().annotations.push({
        type: 'scrollbar-environment',
        description: JSON.stringify({
          browserName,
          browserVersion: browser.version(),
          headless,
          playwrightVersion,
          surface,
          environment,
          firefoxHeadlessAgentOverride,
          ...support,
        }),
      });
      if (firefoxHeadlessAgentOverride)
        test.info().annotations.push({
          type: 'headless-agent-scrollbar-override',
          description:
            'Playwright v1.63.0 Firefox headless registers hidden-scrollbars.css as AGENT_SHEET: * { scrollbar-width: none !important; }. Author thin is verified separately. https://github.com/microsoft/playwright/blob/v1.63.0/browser_patches/firefox/juggler/components/Juggler.js#L101-L105',
        });
      for (const state of ['normal', 'hover', 'focus-within'] as const) {
        const root = await openTocScrollport(page, surface);
        await page.mouse.move(0, 0);
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        if (state === 'hover') {
          const box = await root.boundingBox();
          if (!box) throw new Error('TOC has no scrollport rectangle');
          await page.mouse.move(box.x + 20, box.y + 20);
        }
        if (state === 'focus-within') await root.locator('[data-toc-link]').first().focus();
        expect(await root.evaluate((element) => element.matches(':hover'))).toBe(state === 'hover');
        expect(await root.evaluate((element) => element.matches(':focus-within'))).toBe(
          state === 'focus-within',
        );
        const scrollports =
          surface === 'mobile' ? [root, page.locator('[data-layout-toc-mobile-nav]')] : [root];
        for (const [index, scrollport] of scrollports.entries()) {
          const metrics = await tocMetrics(scrollport);
          const authorDeclarations = await servedTocScrollbarDeclarations(scrollport);
          const selector = await scrollport.evaluate((element) =>
            element.matches('.layout-toc-mobile-panel')
              ? '.layout-toc-mobile-panel'
              : '.layout-toc',
          );
          // 未対応 property は CSSOM が落とすため、source の保証は SSR に残す。
          if (support.width)
            expect(
              authorDeclarations.some(
                (rule) =>
                  rule.selector
                    .split(',')
                    .map((part) => part.trim())
                    .includes(selector) && rule.width === 'thin',
              ),
            ).toBe(true);
          expect(
            authorDeclarations.filter((rule) => rule.width !== '' && rule.width !== 'thin'),
          ).toEqual([]);
          expect(authorDeclarations.filter((rule) => rule.color !== '')).toEqual([]);
          await test.info().attach(`${surface}-${environment}-${state}-${index}`, {
            body: JSON.stringify({ metrics, authorDeclarations }, null, 2),
            contentType: 'application/json',
          });
          if (support.width)
            expect(metrics.scrollbarWidth).toBe(firefoxHeadlessAgentOverride ? 'none' : 'thin');
          if (support.color) expect(metrics.scrollbarColor).toBe('auto');
          expect(metrics.overflowY).toBe('auto');
        }
      }
    });
  }

  for (const input of ['wheel', 'scrollTop'] as const) {
    test(`${surface} TOC endpoint is fully reachable by ${input} before link activation`, async ({
      page,
    }) => {
      const root = await openTocScrollport(page, surface);
      const nav = surface === 'mobile' ? page.locator('[data-layout-toc-mobile-nav]') : root;
      const target = nav.locator('[data-toc-link]').last();
      const headingId = await target.getAttribute('data-heading-id');
      expect(headingId).toBeTruthy();
      await root.evaluate((element) => {
        element.scrollTop = 0;
      });
      if (surface === 'mobile')
        await nav.evaluate((element) => {
          element.scrollTop = 0;
        });
      await tocStable(root);
      const initial = await tocMetrics(root);
      expect(initial.scrollTop).toBe(0);
      expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight + 1);
      await scrollTocToEnd(page, root, input);
      if (surface === 'mobile') {
        const inner = await tocMetrics(nav);
        await test
          .info()
          .attach('mobile-inner', { body: JSON.stringify(inner), contentType: 'application/json' });
        if (inner.scrollHeight > inner.clientHeight + 1) {
          await scrollTocToEnd(page, nav, input);
          await tocStable(root, true);
        }
      }
      await test.info().attach('endpoint', {
        body: JSON.stringify(await tocMetrics(root)),
        contentType: 'application/json',
      });
      await expectTocSurface(target);
      await target.click();
      await expect
        .poll(() => decodeURIComponent(new URL(page.url()).hash.slice(1)))
        .toBe(headingId);
      await expect.poll(async () => (await readTocSyncState(page)).desktopActiveId).toBe(headingId);
      await expect.poll(async () => (await readTocSyncState(page)).mobileActiveId).toBe(headingId);
      if (surface === 'mobile') {
        await expect(root).toBeHidden();
        await expect(page.locator('[data-toc-trigger]')).toBeFocused();
      }
    });
  }

  test(`${surface} short TOC does not overflow`, async ({ page }) => {
    const root = await openTocScrollport(page, surface, false);
    await tocStable(root);
    const scrollports =
      surface === 'mobile' ? [root, page.locator('[data-layout-toc-mobile-nav]')] : [root];
    for (const [index, scrollport] of scrollports.entries()) {
      const metrics = await tocMetrics(scrollport);
      await test.info().attach(`short-${index}`, {
        body: JSON.stringify(metrics),
        contentType: 'application/json',
      });
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
    }
  });

  test(`${surface} TOC keyboard focus ring fits independently of endpoint arrival`, async ({
    page,
  }) => {
    const root = await openTocScrollport(page, surface, false);
    const first = root.locator('[data-toc-link]').first();
    await first.focus();
    await page.keyboard.press('Tab');
    const focused = root.locator('[data-toc-link]:focus-visible');
    await expect(focused).toHaveCount(1);
    await expect(focused).toHaveCSS('outline-style', 'solid');
    await expectTocSurface(focused, true);
    if (surface === 'mobile') {
      await page.keyboard.press('Escape');
      await expect(root).toBeHidden();
      await expect(page.locator('[data-toc-trigger]')).toBeFocused();
    }
  });
}

const readHashLanding = async (page: Page, headingId: string) =>
  page.evaluate((id) => {
    const target = document.getElementById(id);
    const root = document.scrollingElement;
    if (!(target instanceof HTMLElement) || !(root instanceof HTMLElement))
      throw new Error('hash landing fixtureがありません');
    const top = target.getBoundingClientRect().top;
    const scrollPaddingTop = Number.parseFloat(
      getComputedStyle(document.documentElement).scrollPaddingTop,
    );
    const scrollMarginTop = Number.parseFloat(getComputedStyle(target).scrollMarginTop);
    const offset = scrollPaddingTop + scrollMarginTop;
    const absoluteTop = scrollY + top;
    const maxY = Math.max(0, root.scrollHeight - root.clientHeight);
    const idealY = absoluteTop - offset;
    const link = document.querySelector(
      `[data-layout-toc-nav] [data-toc-link][data-heading-id="${CSS.escape(id)}"]`,
    );
    return {
      top,
      y: scrollY,
      scrollPaddingTop,
      scrollMarginTop,
      offset,
      absoluteTop,
      maxY,
      idealY,
      expectedY: Math.min(maxY, Math.max(0, idealY)),
      headerBottom: document.querySelector('[data-layout-header]')?.getBoundingClientRect().bottom,
      readingHashTarget: target.getAttribute('data-router-hash-target'),
      current: link?.getAttribute('aria-current'),
      active: link?.getAttribute('data-active'),
      activeClass: link?.classList.contains('is-active'),
    };
  }, headingId);

test.describe('hash見出しの停止位置は入口によらず共通', () => {
  for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    test.describe(reducedMotion, () => {
      test.use({ reducedMotion });
      for (const entry of ['direct', 'toc', 'hash-link', 'router-link'] as const) {
        for (const [id, clamped] of [
          ['11-目的', false],
          ['3-まとめ', true],
        ] as const) {
          test(`${entry}の${id}はpaddingとmarginへ整列し末尾をclampする`, async ({
            page,
          }, info) => {
            await page.goto(
              entry === 'direct'
                ? `${layoutRichPath}#${encodeURIComponent(id)}`
                : entry === 'router-link'
                  ? sourcePath
                  : layoutRichPath,
            );
            await expect(page.locator('#main-content')).toHaveAttribute(
              'data-reading-position-status',
              'settled',
            );
            await page.evaluate(() => document.fonts.ready);
            if (entry === 'router-link') await waitForRouterDocumentHostReady(page);
            else await waitForTocReady(page);
            if (entry === 'toc')
              await page
                .locator(`[data-layout-toc-nav] [data-toc-link][data-heading-id="${id}"]`)
                .click();
            if (entry === 'hash-link')
              await page.locator(`[id="${id}"] [data-heading-permalink]`).click();
            if (entry === 'router-link') {
              await page.evaluate(
                (url) => {
                  const anchor = document.createElement('a');
                  anchor.id = 'ordinary-heading-document-link';
                  anchor.href = url;
                  anchor.textContent = '見出しへの通常リンク';
                  anchor.dataset['linkKind'] = 'internal-document';
                  anchor.dataset['linkSurface'] = 'prose';
                  anchor.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:100';
                  document.body.append(anchor);
                },
                `${layoutRichSpaPath}#${encodeURIComponent(id)}`,
              );
              await page.locator('#ordinary-heading-document-link').click();
            }
            await expect
              .poll(() => new URL(page.url()).pathname.replace(/\/+$/u, ''))
              .toBe(layoutRichSpaPath);
            await expect.poll(() => new URL(page.url()).hash).toBe(`#${encodeURIComponent(id)}`);
            await expect(page.locator('#main-content')).toHaveAttribute(
              'data-reading-position-status',
              'settled',
            );
            // TOCのsmooth scrollも実到達を待つ。期待座標はproduction helperを呼ばずCSSから読む。
            await expect
              .poll(async () => {
                const landing = await readHashLanding(page, id);
                return Math.abs(landing.y - landing.expectedY);
              })
              .toBeLessThanOrEqual(2);
            const landing = await readHashLanding(page, id);
            console.log(
              'hash-heading-arrived',
              JSON.stringify({ entry, id, reducedMotion, landing }),
            );
            await info.attach(`hash-landing-${entry}-${id}`, {
              body: JSON.stringify(landing, null, 2),
              contentType: 'application/json',
            });
            expect(landing.scrollPaddingTop).toBeGreaterThan(0);
            expect(landing.scrollMarginTop).toBeGreaterThan(0);
            if (entry === 'direct' || entry === 'router-link')
              expect(landing.readingHashTarget).toBe('true');
            if (clamped) {
              expect(landing.idealY).toBeGreaterThan(landing.maxY);
              expect(Math.abs(landing.y - landing.maxY)).toBeLessThanOrEqual(2);
              expect(
                Math.abs(landing.top - (landing.absoluteTop - landing.maxY)),
              ).toBeLessThanOrEqual(2);
            } else {
              expect(landing.idealY).toBeGreaterThan(0);
              expect(landing.idealY).toBeLessThan(landing.maxY);
              expect(Math.abs(landing.top - landing.offset)).toBeLessThanOrEqual(2);
              expect(landing.top).toBeGreaterThan(landing.headerBottom ?? Infinity);
            }
            // 末尾clamp時も本人が指定した見出しのholdを保つ。単純な上端oracleへ置き換えない。
            await expectTocSynchronized(page, id, id === '11-目的' ? '1.1 目的' : '3. まとめ');
            const after = await readHashLanding(page, id);
            expect(after.current).toBe('location');
            expect(after.active).toBe('true');
            expect(after.activeClass).toBe(true);
            expect(Math.abs(after.y - landing.y)).toBeLessThanOrEqual(2);
            expect(Math.abs(after.top - landing.top)).toBeLessThanOrEqual(2);
            console.log(
              'hash-heading-offset',
              JSON.stringify({ entry, id, reducedMotion, landing: after }),
            );
          });
        }
      }
    });
  }
});
