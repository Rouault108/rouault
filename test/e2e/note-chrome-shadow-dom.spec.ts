import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const sourcePath = e2eNoteFixtures.markdownBasic.directPath;
const layoutRich = e2eNoteFixtures.layoutRich;
const layoutRichDirectPath = layoutRich.directPath;
const layoutRichSpaPath = layoutRich.normalizedPath;

const waitForAppRouterReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const router = document.querySelector('app-router');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function'
    );
  });
};

const navigateWithAppRouter = async (page: Page, url: string): Promise<void> => {
  await waitForAppRouterReady(page);

  await page.evaluate(async (targetUrl) => {
    const router = document.querySelector('app-router') as
      | (HTMLElement & { navigate: (nextUrl: string) => Promise<unknown> })
      | null;
    if (!router || typeof router.navigate !== 'function') {
      throw new Error('app-router.navigate() が利用できません');
    }

    await router.navigate(targetUrl);
  }, url);
};

const readNoteChromeState = async (
  page: Page,
): Promise<{
  headerExists: boolean;
  headerHeight: number;
  headerWidth: number;
  proseWidth: number;
  headerBreadcrumbLabels: string[];
  tocExists: boolean;
  tocLabels: string[];
}> =>
  page.evaluate(() => {
    const articleHeader = document.querySelector<HTMLElement>('.article-header');
    const prose = document.querySelector('.prose');
    const toc = document.querySelector<HTMLElement>('.layout-toc');

    const readHeaderBreadcrumbLabels = (element: Element | null): string[] => {
      if (!(element instanceof HTMLElement)) {
        return [];
      }

      const labels = Array.from(element.querySelectorAll<HTMLElement>('.article-header__breadcrumb-item'))
        .map((node) => node.textContent?.trim() ?? '')
        .filter((text) => text.length > 0);

      return Array.from(new Set(labels));
    };

    const readTocLabels = (element: Element | null): string[] => {
      if (!(element instanceof HTMLElement)) {
        return [];
      }

      const labels = Array.from(element.querySelectorAll<HTMLElement>('.layout-toc__link-label'))
        .map((node) => node.textContent?.trim() ?? '')
        .filter((text) => text.length > 0);

      return Array.from(new Set(labels));
    };

    const roundWidth = (element: Element | null): number => {
      if (!(element instanceof HTMLElement)) {
        return -1;
      }

      return Math.round(element.getBoundingClientRect().width * 100) / 100;
    };

    return {
      headerExists: articleHeader instanceof HTMLElement,
      headerHeight:
        articleHeader instanceof HTMLElement
          ? Math.round(articleHeader.getBoundingClientRect().height)
          : -1,
      headerWidth: roundWidth(articleHeader),
      proseWidth: roundWidth(prose),
      headerBreadcrumbLabels: readHeaderBreadcrumbLabels(articleHeader),
      tocExists: toc instanceof HTMLElement,
      tocLabels: readTocLabels(toc),
    };
  });

const expectLayoutRichNoteChrome = async (page: Page): Promise<void> => {
  await expect(page.locator('.article-header__heading')).toHaveText(layoutRich.title);
  await expect(page.locator('#main-content')).toContainText('このノートは e2e 専用 fixture です。');

  await expect.poll(async () => (await readNoteChromeState(page)).headerExists).toBe(true);
  await expect
    .poll(async () => (await readNoteChromeState(page)).headerBreadcrumbLabels.join('\n'))
    .toContain('Notes');
  await expect.poll(async () => (await readNoteChromeState(page)).tocExists).toBe(true);
  await expect.poll(async () => (await readNoteChromeState(page)).headerHeight).toBeGreaterThan(0);
  await expect
    .poll(async () => (await readNoteChromeState(page)).tocLabels.join('\n'))
    .toContain('1. 導入');
  await expect
    .poll(async () => (await readNoteChromeState(page)).tocLabels.length)
    .toBeGreaterThan(0);
  await expect
    .poll(async () => {
      const { headerWidth, proseWidth } = await readNoteChromeState(page);
      if (headerWidth < 0 || proseWidth < 0) {
        return Number.POSITIVE_INFINITY;
      }

      return Math.abs(headerWidth - proseWidth);
    })
    .toBeLessThanOrEqual(1);
};

test.describe('note chrome shadow DOM', () => {
  test('layout-rich 直アクセス時に front matter と TOC が初回表示で見えること', async ({
    page,
  }) => {
    await page.goto(layoutRichDirectPath);

    await expectLayoutRichNoteChrome(page);
  });

  test('SPA 遷移で layout-rich を開いても front matter と TOC が見えること', async ({ page }) => {
    await page.goto(sourcePath);

    await page.evaluate(() => {
      (window as typeof window & { __noteChromeProbe?: { alive: boolean } }).__noteChromeProbe = {
        alive: true,
      };
    });

    await navigateWithAppRouter(page, layoutRichSpaPath);

    await expect(page).toHaveURL(layoutRichSpaPath);
    await expectLayoutRichNoteChrome(page);

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __noteChromeProbe?: { alive: boolean } }).__noteChromeProbe
          ?.alive === true
      );
    });

    expect(probeAlive).toBe(true);
  });
});
