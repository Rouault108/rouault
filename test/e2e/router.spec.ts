import { expect, test, type Locator, type Page } from '@playwright/test';

const beethovenPath = '/notes/music/classical/beethoven/symphony-9';
const nutcrackerPath = '/notes/music/classical/tchaikovsky/the-nutcracker';
const beethovenEntryPath = `${beethovenPath}/`;
const testNotePath = '/notes/testing/test';
const tabsTestPath = '/notes/testing/tabs-test';

const getSidebarTreeItem = (page: Page, label: string): Locator =>
  page.getByRole('treeitem', { name: label, exact: true }).first();

const expandSidebarTreeItem = async (page: Page, label: string): Promise<void> => {
  const item = getSidebarTreeItem(page, label);
  await expect(item).toHaveAttribute('aria-expanded', 'false');
  await item.locator('.expand-icon:not(.hidden)').click();
  await expect(item).toHaveAttribute('aria-expanded', 'true');
};

const expectMainHeading = async (page: Page, headingText: string): Promise<void> => {
  await expect(page.locator('#main-content h1').first()).toHaveText(headingText);
};

const activateSidebarTreeItem = async (page: Page, label: string): Promise<void> => {
  const item = getSidebarTreeItem(page, label);
  await item.locator('.item').click();
};

test.describe('Router Navigation', () => {
  test('サイドバー遷移で SPA ナビゲーションが動作すること', async ({ page }) => {
    await page.goto(beethovenEntryPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調 作品125');

    await page.evaluate(() => {
      (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe = {
        alive: true,
      };
    });

    await expandSidebarTreeItem(page, 'Tchaikovsky');
    await activateSidebarTreeItem(page, '楽曲分析: くるみ割り人形');

    await expect(page).toHaveURL(nutcrackerPath);
    await expectMainHeading(page, 'くるみ割り人形');

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe?.alive === true
      );
    });
    expect(probeAlive).toBe(true);
  });

  test('履歴の戻る / 進むで main content が追従すること', async ({ page }) => {
    await page.goto(beethovenEntryPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調 作品125');

    await expandSidebarTreeItem(page, 'Tchaikovsky');
    await activateSidebarTreeItem(page, '楽曲分析: くるみ割り人形');

    await expect(page).toHaveURL(nutcrackerPath);
    await expectMainHeading(page, 'くるみ割り人形');

    await page.goBack();
    await expect(page).toHaveURL(beethovenEntryPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調 作品125');

    await page.goForward();
    await expect(page).toHaveURL(nutcrackerPath);
    await expectMainHeading(page, 'くるみ割り人形');
  });

  test('遷移後に aria-live とフォーカス管理が更新されること', async ({ page }) => {
    await page.goto(beethovenEntryPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調 作品125');

    await expandSidebarTreeItem(page, 'Tchaikovsky');
    await activateSidebarTreeItem(page, '楽曲分析: くるみ割り人形');

    const ariaLive = page.locator('[aria-live="polite"]').filter({
      hasText: 'ページが読み込まれました',
    });
    await expect(ariaLive.first()).toContainText('ページが読み込まれました');

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

    expect(activeElement.tagName).toBe('H1');
    expect(activeElement.text).toContain('くるみ割り人形');
  });

  test('検索ページ下端から記事へ遷移してもスクロール位置が先頭に戻ること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.goto('/search?tag=music');

    const resultLinks = page.locator('.result-link');
    await expect(resultLinks).toHaveCount(3);

    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });

    const targetLink = resultLinks.last();
    const targetHref = await targetLink.getAttribute('href');
    expect(targetHref).not.toBeNull();

    await targetLink.click();

    const hrefUrl = targetHref ?? '';
    await expect(page).toHaveURL(hrefUrl);
    await expect(page.locator('ui-article-header')).toBeVisible();

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });

  test('hash なしで再読み込みしてもトップ位置のままであること', async ({ page }) => {
    await page.goto(testNotePath);

    await expect(page.locator('ui-tabs')).toBeVisible();
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

    await expect(page.locator('ui-tabs')).toBeVisible();
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
    expect(scrollY).toBeLessThanOrEqual(2);
  });

  test('本文見出しの固定リンクがキーボードで起動できること', async ({ page }) => {
    await page.goto(testNotePath);

    const headingPermalink = page.locator('#main-content .prose h2 .heading-anchor').first();
    await expect(headingPermalink).toBeVisible();

    const href = await headingPermalink.getAttribute('href');
    expect(href).not.toBeNull();

    await headingPermalink.focus();
    await page.keyboard.press('Enter');

    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe(href);
  });
  test('見出し本文クリックでは hash が更新されず、固定リンククリックでのみ更新されること', async ({
    page,
  }) => {
    await page.goto(testNotePath);

    const headingText = page.locator('#main-content .prose h2 .heading-text').first();
    const headingPermalink = page.locator('#main-content .prose h2 .heading-anchor').first();

    await headingText.click();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');

    const href = await headingPermalink.getAttribute('href');
    expect(href).not.toBeNull();

    await headingPermalink.click();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe(href);
  });

  test('未知のURLへ SPA 遷移したとき 404 ページへ切り替わること', async ({ page }) => {
    await page.goto(beethovenEntryPath);

      await page.evaluate(async () => {
        const router = document.querySelector('app-router') as HTMLElement & {
        navigate?: (path: string) => Promise<unknown>;
        };

        await router.navigate?.('/notes/does-not-exist');
      });

    await expect(page).toHaveURL('/notes/does-not-exist');
    await expect(page.locator('not-found-page')).toContainText('ページが見つかりません');
    await expect(page.locator('not-found-page')).toContainText('検索ページへ');
  });

  test('?tab= 付き URL で初期タブが復元されること', async ({ page }) => {
    await page.goto(`${tabsTestPath}?tab=details`);

    const tabs = page.locator('ui-tabs').first();
    const panels = tabs.locator('[slot="panel"]');

    await expect(panels.nth(1)).not.toHaveAttribute('hidden', '');
    await expect(panels.nth(0)).toHaveAttribute('hidden', '');
  });

  test('タブクリックで URL が変わっても SPA 状態が維持されること', async ({ page }) => {
    await page.goto(tabsTestPath);

    await page.evaluate(() => {
      (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe = {
        alive: true,
      };
    });

    const detailsTab = page.locator('ui-tabs').first().locator('[slot="tab"][value="details"]');
    await detailsTab.click();

    await expect(page).toHaveURL(`${tabsTestPath}?tab=details`);

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe?.alive === true
      );
    });
    expect(probeAlive).toBe(true);
  });

  test('戻る / 進むでタブ状態が復元されること', async ({ page }) => {
    await page.goto(tabsTestPath);

    const tabs = page.locator('ui-tabs').first();
    const overviewTab = tabs.locator('[slot="tab"][value="overview"]');
    const detailsTab = tabs.locator('[slot="tab"][value="details"]');
    const panels = tabs.locator('[slot="panel"]');

    await detailsTab.click();
    await expect(page).toHaveURL(`${tabsTestPath}?tab=details`);
    await expect(panels.nth(1)).not.toHaveAttribute('hidden', '');

    await page.goBack();
    await expect(page).toHaveURL(tabsTestPath);
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    await page.goForward();
    await expect(page).toHaveURL(`${tabsTestPath}?tab=details`);
    await expect(detailsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('hash が query より優先され、URL が正規化されること', async ({ page }) => {
    await page.goto(`${tabsTestPath}?tab=overview#details-heading`);

    const tabs = page.locator('ui-tabs').first();
    const detailsTab = tabs.locator('[slot="tab"][value="details"]');
    const panels = tabs.locator('[slot="panel"]');

    await expect(detailsTab).toHaveAttribute('aria-selected', 'true');
    await expect(panels.nth(1)).not.toHaveAttribute('hidden', '');
    await expect(page).toHaveURL(`${tabsTestPath}?tab=details#details-heading`);
  });
});
