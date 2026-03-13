import { expect, test } from '@playwright/test';

const notePath = '/notes/music/classical/beethoven/symphony-9/';

test.describe('Tag Page', () => {
  test('タグリンクから SPA でタグページへ遷移できること', async ({ page }) => {
    await page.goto(notePath);

    await page.evaluate(() => {
      (window as typeof window & { __tagProbe?: { alive: boolean } }).__tagProbe = {
        alive: true,
      };
    });

    await page.getByRole('link', { name: 'music', exact: true }).click();

    await expect(page).toHaveURL('/tags/music/');
    await expect(page.locator('#main-content h1').first()).toHaveText('#music');
    await expect(page.locator('#main-content')).toContainText('このタグで検索へ');
    await expect(page.locator('#main-content')).toContainText('交響曲第9番 ニ短調 作品125');

    const probeAlive = await page.evaluate(() => {
      return (window as typeof window & { __tagProbe?: { alive: boolean } }).__tagProbe?.alive === true;
    });
    expect(probeAlive).toBe(true);
  });

  test('タグページのカード内リンクからノートへ遷移できること', async ({ page }) => {
    await page.goto('/tags/music/');

    await page.evaluate(() => {
      (window as typeof window & { __tagCardProbe?: { alive: boolean } }).__tagCardProbe = {
        alive: true,
      };
    });

    await page
      .locator('#main-content .tag-page__item-card a')
      .filter({ hasText: '交響曲第9番 ニ短調 作品125' })
      .first()
      .click();

    await expect(page).toHaveURL(notePath);
    await expect(page.locator('#main-content h1').first()).toHaveText('交響曲第9番 ニ短調 作品125');

    const probeAlive = await page.evaluate(() => {
      return (window as typeof window & { __tagCardProbe?: { alive: boolean } }).__tagCardProbe?.alive === true;
    });
    expect(probeAlive).toBe(true);
  });
});
