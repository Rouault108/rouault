import { expect, test, type Locator, type Page } from '@playwright/test';

const beethovenPath = '/notes/music/classical/beethoven/symphony-9';
const nutcrackerPath = '/notes/music/classical/tchaikovsky/the-nutcracker';
const beethovenEntryPath = `${beethovenPath}/`;

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
      return (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe?.alive === true;
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
    await page.goto('/search/?tag=music');

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
});
