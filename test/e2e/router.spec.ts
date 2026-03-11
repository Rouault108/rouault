import { expect, test, type Locator, type Page } from '@playwright/test';

const beethovenPath = '/notes/music/classical/beethoven/symphony-9';
const nutcrackerPath = '/notes/music/classical/tchaikovsky/the-nutcracker';

const getTreeItem = (page: Page, label: string): Locator =>
  page.locator('ui-tree-item').filter({ hasText: label }).first();

const getTreeItemRow = (page: Page, label: string): Locator =>
  getTreeItem(page, label).locator('.item').first();

const getExpandIcon = (page: Page, label: string): Locator =>
  getTreeItem(page, label).locator('.expand-icon').first();

const expectMainHeading = async (page: Page, headingText: string): Promise<void> => {
  await expect(page.locator('#main-content h1').first()).toHaveText(headingText);
};

test.describe('Router Navigation', () => {
  test('サイドバー遷移で SPA ナビゲーションが動作すること', async ({ page }) => {
    await page.goto(beethovenPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調 作品125');

    await page.evaluate(() => {
      (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe = {
        alive: true,
      };
    });

    await getExpandIcon(page, 'Tchaikovsky').click();
    await getTreeItemRow(page, '楽曲分析: くるみ割り人形').click();

    await expect(page).toHaveURL(nutcrackerPath);
    await expectMainHeading(page, 'くるみ割り人形');

    const probeAlive = await page.evaluate(() => {
      return (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe?.alive === true;
    });
    expect(probeAlive).toBe(true);
  });

  test('履歴の戻る / 進むで main content が追従すること', async ({ page }) => {
    await page.goto(beethovenPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調 作品125');

    await getExpandIcon(page, 'Tchaikovsky').click();
    await getTreeItemRow(page, '楽曲分析: くるみ割り人形').click();

    await expect(page).toHaveURL(nutcrackerPath);
    await expectMainHeading(page, 'くるみ割り人形');

    await page.goBack();
    await expect(page).toHaveURL(beethovenPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調 作品125');

    await page.goForward();
    await expect(page).toHaveURL(nutcrackerPath);
    await expectMainHeading(page, 'くるみ割り人形');
  });

  test('遷移後に aria-live とフォーカス管理が更新されること', async ({ page }) => {
    await page.goto(beethovenPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調 作品125');

    await getExpandIcon(page, 'Tchaikovsky').click();
    await getTreeItemRow(page, '楽曲分析: くるみ割り人形').click();

    const ariaLive = page.locator('[aria-live="polite"]').filter({
      hasText: 'ページが読み込まれました',
    });
    await expect(ariaLive.first()).toBeVisible();

    const activeElement = await page.evaluate(() => {
      const element = document.activeElement;
      return {
        tagName: element?.tagName ?? '',
        text: element?.textContent?.trim() ?? '',
      };
    });

    expect(activeElement.tagName).toBe('H1');
    expect(activeElement.text).toContain('くるみ割り人形');
  });
});
