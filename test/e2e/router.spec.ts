import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const targetPath = e2eNoteFixtures.sidebarScrollTarget.normalizedPath;
const sourceEntryPath = e2eNoteFixtures.sidebarScrollSource.directPath;
const testNote = e2eNoteFixtures.markdownBasic;
const testNotePath = testNote.directPath;
const tabsNote = e2eNoteFixtures.interactive;
const tabsTestPath = tabsNote.directPath;
const tabsNormalizedPath = tabsNote.normalizedPath;
const layoutRich = e2eNoteFixtures.layoutRich;
const layoutRichPath = layoutRich.directPath;
const layoutRichNormalizedPath = layoutRich.normalizedPath;
const tocAbsentNormalizedPath = e2eNoteFixtures.tocAbsent.normalizedPath;

const expectMainHeading = async (page: Page, headingText: string): Promise<void> => {
  await expect(page.locator('.article-header__heading')).toHaveText(headingText);
};

const hideTocOverlay = async (page: Page): Promise<void> => {
  await page.addStyleTag({
    content: '.layout-toc-col { display: none !important; }',
  });
};

const readHeadingIdByText = async (page: Page, expectedText: string): Promise<string> => {
  return await page.evaluate((text) => {
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

    return match.id;
  }, expectedText);
};

const expectInteractiveCanaryContent = async (page: Page): Promise<void> => {
  await expect(page.locator('#main-content')).toContainText('JavaScriptのHello, World!');
  await expect(page.locator('#main-content')).toContainText('RustのHello, World!');
};

const waitForSearchPageReady = async (page: Page): Promise<void> => {
  await page.locator('[data-search-page-root] [data-search-query-input]').first().waitFor();
};

const navigateWithAppRouter = async (page: Page, url: string): Promise<void> => {
  await page.waitForFunction(() => {
    const router = document.querySelector('app-router');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function' &&
      typeof (router as { whenReady?: unknown }).whenReady === 'function'
    );
  });

  await page.evaluate(async (targetUrl) => {
    const router = document.querySelector('app-router') as
      | (HTMLElement & {
          navigate: (nextUrl: string) => Promise<unknown>;
          whenReady: () => Promise<void>;
        })
      | null;
    if (!router || typeof router.navigate !== 'function' || typeof router.whenReady !== 'function') {
      throw new Error('app-router.navigate() が利用できません');
    }
    await router.whenReady();
    await router.navigate(targetUrl);
  }, url);
};

test.describe('Router Navigation', () => {
  test('サイドバー遷移で SPA ナビゲーションが動作すること', async ({ page }) => {
    await page.goto(sourceEntryPath);
    await expectMainHeading(page, 'Sidebar Scroll Source');

    await page.evaluate(() => {
      (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe = {
        alive: true,
      };
    });

    await navigateWithAppRouter(page, targetPath);

    await expect(page).toHaveURL(targetPath);
    await expectMainHeading(page, 'Sidebar Scroll Target');

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe?.alive === true
      );
    });
    expect(probeAlive).toBe(true);
  });

  test('履歴の戻る / 進むで main content が追従すること', async ({ page }) => {
    await page.goto(sourceEntryPath);
    await expectMainHeading(page, 'Sidebar Scroll Source');

    await navigateWithAppRouter(page, targetPath);

    await expect(page).toHaveURL(targetPath);
    await expectMainHeading(page, 'Sidebar Scroll Target');

    await page.goBack();
    await expect(page).toHaveURL(sourceEntryPath);
    await expectMainHeading(page, 'Sidebar Scroll Source');

    await page.goForward();
    await expect(page).toHaveURL(targetPath);
    await expectMainHeading(page, 'Sidebar Scroll Target');
  });

  test('遷移後に aria-live とフォーカス管理が更新されること', async ({ page }) => {
    await page.goto(sourceEntryPath);
    await expectMainHeading(page, 'Sidebar Scroll Source');

    await navigateWithAppRouter(page, targetPath);

    await expect(page.locator('[data-app-router-announcement][aria-live="polite"]')).toHaveCount(1);

    const activeElement = await page.evaluate(() => {
      const element = document.activeElement;
      if (element === null) {
        return {
          tagName: '',
          text: '',
        };
      }

      return {
        tagName: element.tagName,
        text: element.textContent.trim(),
      };
    });

    expect(activeElement.tagName).toBe('MAIN');
    expect(activeElement.text).toContain('Sidebar Scroll Target');
  });

  test('検索ページ下端から記事へ遷移してもスクロール位置が先頭に戻ること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.goto('/tags/Programming/');
    await waitForSearchPageReady(page);

    const resultLinks = page.locator('#main-content a.result-link');
    await expect(resultLinks.first()).toBeVisible();

    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });

    await resultLinks.last().click();
    await expect(page).not.toHaveURL('/tags/Programming/');
    await expect(page.locator('#main-content article')).toBeVisible();

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThanOrEqual(40);
  });

  test('hash なしで再読み込みしてもトップ位置のままであること', async ({ page }) => {
    await page.goto(testNotePath);

    await expect(page.locator(`#${testNote.contentRootId}`)).toHaveCount(1);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );

    await page.reload();

    await expect(page.locator(`#${testNote.contentRootId}`)).toHaveCount(1);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThanOrEqual(160);
  });

  test('本文見出しの固定リンクへキーボードで到達できること', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(testNotePath);
    await hideTocOverlay(page);

    const headingPermalink = page.locator(`#${testNote.contentRootId} h2 .heading-anchor`).first();
    await expect(headingPermalink).toBeVisible();

    const href = await headingPermalink.getAttribute('href');
    expect(href).not.toBeNull();
    const tabIndex = await headingPermalink.evaluate((element) => {
      return element instanceof HTMLAnchorElement ? element.tabIndex : -1;
    });
    expect(tabIndex).toBe(0);
  });
  test('見出し本文クリックでは hash が更新されず、固定リンククリックでのみ更新されること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(testNotePath);
    await hideTocOverlay(page);

    const heading = page.locator(`#${testNote.contentRootId} h2`).first();
    const headingPermalink = page.locator(`#${testNote.contentRootId} h2 .heading-anchor`).first();

    await heading.click({ position: { x: 8, y: 8 }, force: true });
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');

    const href = await headingPermalink.getAttribute('href');
    if (href === null) {
      throw new Error('heading permalink href が見つかりません');
    }

    await headingPermalink.click();
    await expect
      .poll(() => page.evaluate(() => decodeURIComponent(window.location.hash)))
      .toBe(decodeURIComponent(href));
  });

  test('本文見出しの hover では本文外で固定リンク affordance を出さないこと', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(testNotePath);
    await hideTocOverlay(page);

    const prose = page.locator(`#${testNote.contentRootId}`);
    const heading = prose.locator('h2').first();
    const headingPermalink = heading.locator('.heading-anchor');

    await expect(heading).toBeVisible();

    const readPermalinkOpacity = async (): Promise<number> =>
      headingPermalink.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));

    await heading.evaluate((element) => {
      const anchor = element.querySelector<HTMLElement>('.heading-anchor');
      if (!(anchor instanceof HTMLElement)) {
        throw new Error('本文見出しの hover 判定に必要な要素を取得できませんでした');
      }
    });

    await expect.poll(readPermalinkOpacity).toBe(0);

    await page.mouse.move(1, 1);
    await expect.poll(readPermalinkOpacity).toBe(0);
  });

  test('未知のURLへ SPA 遷移したとき 404 ページへ切り替わること', async ({ page }) => {
    await page.goto(sourceEntryPath);
    await navigateWithAppRouter(page, '/notes/does-not-exist/');

    await expect(page).toHaveURL(/\/notes\/does-not-exist\/?$/);
    await expect(page.locator('#main-content')).toContainText('このページは見つかりませんでした');
    await expect(page.locator('#main-content')).toContainText('検索ページへ');
  });

  test('?tab= 付き URL で初期タブが復元されること', async ({ page }) => {
    await page.goto(`${tabsTestPath}?tab=rust`);
    await expect(page).toHaveURL(`${tabsTestPath}?tab=rust`);
    await expectInteractiveCanaryContent(page);
  });

  test('tabs の URL 同期では router state が現在 URL に更新されること', async ({ page }) => {
    await page.goto(tabsTestPath);

    await page.evaluate(() => {
      history.replaceState(
        {
          customData: 'value',
          nested: {
            ok: true,
          },
        },
        '',
        window.location.pathname,
      );
    });

    await navigateWithAppRouter(page, `${tabsTestPath}?tab=rust`);

    await expect(page).toHaveURL(`${tabsNormalizedPath}?tab=rust`);

    const state = await page.evaluate(() => history.state as Record<string, unknown> | null);
    expect(state?.['__routerUrl']).toBe(`${tabsNormalizedPath}?tab=rust`);
    expect(state?.['__routerPath']).toBeUndefined();
    await expectInteractiveCanaryContent(page);
  });

  test('タブクリックで URL が変わっても SPA 状態が維持されること', async ({ page }) => {
    await page.goto(tabsTestPath);

    await page.evaluate(() => {
      (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe = {
        alive: true,
      };
    });

    await navigateWithAppRouter(page, `${tabsTestPath}?tab=rust`);

    await expect(page).toHaveURL(`${tabsNormalizedPath}?tab=rust`);

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe?.alive === true
      );
    });
    expect(probeAlive).toBe(true);
  });

  test('戻る / 進むでタブURLが復元されること', async ({ page }) => {
    await page.goto(tabsTestPath);
    await navigateWithAppRouter(page, `${tabsTestPath}?tab=rust`);
    await expect(page).toHaveURL(`${tabsNormalizedPath}?tab=rust`);

    await page.goBack();
    await expect(page).toHaveURL(tabsTestPath);

    await page.goForward();
    await expect(page).toHaveURL(`${tabsNormalizedPath}?tab=rust`);
  });

  test('hash と query が競合する場合は query が優先され、入力 URL を保持すること', async ({
    page,
  }) => {
    await page.goto(`${tabsTestPath}?tab=javascript#rustのhello-world`);
    await expect(page).toHaveURL(`${tabsTestPath}?tab=javascript#rustのhello-world`);
    await expectInteractiveCanaryContent(page);
  });

  test('hash 付きで再読み込みした場合も hash と target が維持されること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(layoutRichPath);

    const summaryId = await readHeadingIdByText(page, '3. まとめ');

    await page.goto(`${layoutRichPath}#${encodeURIComponent(summaryId)}`);

    await expect(page.locator(`[id="${summaryId}"]`)).toHaveCount(1);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );

    await page.reload();

    await expect(page.locator(`[id="${summaryId}"]`)).toHaveCount(1);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );

    const result = await page.evaluate((id) => {
      const target = document.getElementById(id);
      if (!(target instanceof HTMLElement)) {
        return null;
      }

      return {
        hash: decodeURIComponent(window.location.hash),
        tagName: target.tagName,
      };
    }, summaryId);

    expect(result).not.toBeNull();
    expect(result?.hash).toBe(`#${summaryId}`);
    expect(result?.tagName).toBe('H2');
  });

  test('TOC present -> absent -> present の SPA 遷移で header と body の契約が同期すること', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);

    await expect(page.locator('layout-header')).toHaveAttribute('toc-presence', 'present');
    await expect(page.locator('.note-shell')).toHaveAttribute('data-toc-presence', 'present');
    await expect(page.locator('[data-layout-toc-nav]')).toHaveCount(1);
    await expect(page.locator('[data-app-shell-sidebar-host]')).toHaveCount(1);

    await navigateWithAppRouter(page, tocAbsentNormalizedPath);

    await expect(page).toHaveURL(tocAbsentNormalizedPath);
    await expect(page.locator('layout-header')).toHaveAttribute('toc-presence', 'absent');
    await expect(page.locator('.note-shell')).toHaveAttribute('data-toc-presence', 'absent');
    await expect(page.locator('.layout-toc-col')).toHaveCount(0);
    await expect(page.locator('[data-layout-toc-nav]')).toHaveCount(0);
    await expect(page.locator('[data-app-shell-sidebar-host]')).toHaveCount(1);

    const absentOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(absentOverflow).toBeLessThanOrEqual(1);

    await navigateWithAppRouter(page, layoutRichNormalizedPath);

    await expect(page).toHaveURL(layoutRichNormalizedPath);
    await expect(page.locator('layout-header')).toHaveAttribute('toc-presence', 'present');
    await expect(page.locator('.note-shell')).toHaveAttribute('data-toc-presence', 'present');
    await expect(page.locator('[data-layout-toc-nav]')).toHaveCount(1);
    await expect(page.locator('[data-app-shell-sidebar-host]')).toHaveCount(1);
  });
});
