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

interface ViewportPosition {
  top: number | null;
  bottom: number | null;
  viewportHeight: number;
}

interface ExpectedActiveHeading {
  id: string | null;
  label: string | null;
}

interface NamedHeading {
  id: string;
  label: string;
}

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
        desktopActiveLink?.querySelector<HTMLElement>('.layout-toc__link-label')?.textContent?.trim() ??
        null,
      mobileActiveId: mobileActiveLink?.getAttribute('data-heading-id') ?? null,
      mobileActiveLabel:
        mobileActiveLink?.querySelector<HTMLElement>('.layout-toc__link-label')?.textContent?.trim() ??
        null,
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

const readHeadingViewportPosition = async (
  page: Page,
  headingId: string,
): Promise<ViewportPosition> =>
  page.evaluate((id) => {
    const target = document.getElementById(id);
    if (!(target instanceof HTMLElement)) {
      return {
        top: null,
        bottom: null,
        viewportHeight: window.innerHeight,
      };
    }

    const rect = target.getBoundingClientRect();
    return {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      viewportHeight: window.innerHeight,
    };
  }, headingId);

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

  test('hash 直アクセス時に初回表示から child prop / attribute / DOM の current が一致すること', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);
    const target = await readHeadingByText(page, '2. 状態同期');

    await page.goto(`${layoutRichPath}#${encodeURIComponent(target.id)}`);
    await waitForTocReady(page);
    await expectTocSynchronized(page, target.id, target.label);

    const position = await readHeadingViewportPosition(page, target.id);

    expect(position.top).not.toBeNull();
    expect(position.bottom).not.toBeNull();
    expect(position.top ?? Number.POSITIVE_INFINITY).toBeLessThan(position.viewportHeight);
    expect(position.bottom ?? Number.NEGATIVE_INFINITY).toBeGreaterThan(0);
  });

  test('SPA 遷移で layout-rich を開いた後も scroll に応じて child prop / attribute / DOM の current が同期すること', async ({
    page,
  }) => {
    await page.goto(sourcePath);
    await navigateWithAppRouter(page, layoutRichSpaPath);

    await expect(page).toHaveURL(layoutRichSpaPath);
    await waitForTocSettled(page);

    const intro = await readHeadingByText(page, '1. 導入');
    const stateSync = await readHeadingByText(page, '2. 状態同期');

    await expectTocSynchronized(page, intro.id, intro.label);

    await scrollHeadingToActiveZone(page, stateSync.id);
    await expectTocSynchronizedToViewport(page);
  });
});
