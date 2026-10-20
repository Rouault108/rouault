import { expect, test, type Page } from '@playwright/test';

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
