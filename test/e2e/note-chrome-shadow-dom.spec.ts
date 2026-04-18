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
  headerShadowRoot: boolean;
  headerTemplateCount: number;
  headerHeight: number;
  tocShadowRoot: boolean;
  tocTemplateCount: number;
  tocLabels: string[];
}> =>
  page.evaluate(() => {
    const articleHeader = document.querySelector('ui-article-header');
    const toc = document.querySelector('layout-toc');

    const readDirectTemplateCount = (element: Element | null): number => {
      if (!(element instanceof Element)) {
        return -1;
      }

      return element.querySelectorAll(
        ':scope > template[shadowrootmode], :scope > template[shadowroot]',
      ).length;
    };

    const readTocLabels = (element: Element | null): string[] => {
      if (!(element instanceof HTMLElement)) {
        return [];
      }

      const tocShadowRoot = element.shadowRoot;
      if (!(tocShadowRoot instanceof ShadowRoot)) {
        return [];
      }

      const uiTocs = Array.from(tocShadowRoot.querySelectorAll<HTMLElement>('ui-toc'));
      const labels = uiTocs.flatMap((uiToc) => {
        const uiTocShadowRoot = uiToc.shadowRoot;
        if (!(uiTocShadowRoot instanceof ShadowRoot)) {
          return [];
        }

        return Array.from(uiTocShadowRoot.querySelectorAll<HTMLElement>('.toc-link-label'))
          .map((node) => node.textContent?.trim() ?? '')
          .filter((text) => text.length > 0);
      });

      return Array.from(new Set(labels));
    };

    return {
      headerShadowRoot: articleHeader instanceof HTMLElement && articleHeader.shadowRoot !== null,
      headerTemplateCount: readDirectTemplateCount(articleHeader),
      headerHeight:
        articleHeader instanceof HTMLElement
          ? Math.round(articleHeader.getBoundingClientRect().height)
          : -1,
      tocShadowRoot: toc instanceof HTMLElement && toc.shadowRoot !== null,
      tocTemplateCount: readDirectTemplateCount(toc),
      tocLabels: readTocLabels(toc),
    };
  });

const expectLayoutRichNoteChrome = async (page: Page): Promise<void> => {
  await expect(page.locator('ui-article-header')).toHaveAttribute('heading', layoutRich.title);
  await expect(page.locator('ui-article-header')).toContainText('Notes');
  await expect(page.locator('#main-content')).toContainText('このノートは e2e 専用 fixture です。');

  await expect.poll(async () => (await readNoteChromeState(page)).headerShadowRoot).toBe(true);
  await expect.poll(async () => (await readNoteChromeState(page)).tocShadowRoot).toBe(true);
  await expect.poll(async () => (await readNoteChromeState(page)).headerTemplateCount).toBe(0);
  await expect.poll(async () => (await readNoteChromeState(page)).tocTemplateCount).toBe(0);
  await expect.poll(async () => (await readNoteChromeState(page)).headerHeight).toBeGreaterThan(0);
  await expect
    .poll(async () => (await readNoteChromeState(page)).tocLabels.join('\n'))
    .toContain('1. 導入');
  await expect
    .poll(async () => (await readNoteChromeState(page)).tocLabels.length)
    .toBeGreaterThan(0);
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
