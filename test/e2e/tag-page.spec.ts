import { expect, test, type Page } from '@playwright/test';

const notePath = '/notes/music/classical/beethoven/symphony-9';
const noteCanonicalPath = '/notes/music/classical/beethoven/symphony-9/';
const beethovenTitle = '交響曲第9番 ニ短調';

const changeSearchSelect = async (
  page: Page,
  index: number,
  value: 'and' | 'or' | 'relevance' | 'date-desc',
): Promise<void> => {
  await page.locator('#main-content search-page').waitFor();
  const label = index === 0 ? 'タグ演算子' : '並び順';
  const combobox = page.getByRole('combobox', { name: label });

  await combobox.click();

  if (value === 'and' || value === 'date-desc') {
    await page.keyboard.press('ArrowDown');
  }

  await page.keyboard.press('Enter');
};

const waitForSearchInputReady = async (page: Page): Promise<void> => {
  await page.locator('#main-content search-page').waitFor();
  await page.locator('ui-search-field.search-input-control input[type="search"]').first().waitFor();
};

const openTagFilter = async (page: Page): Promise<void> => {
  await page.locator('#main-content search-page').waitFor();
  await page.locator('ui-details.filter-details .filter-summary').first().click();
};

const clickArticleHeaderTag = async (page: Page, href: string): Promise<void> => {
  const link = page.locator(`ui-article-header ui-tag[href="${href}"] a.tag-link`).first();
  await expect(link).toBeVisible();
  await link.click();
};

const inputSearchQuery = async (page: Page, value: string): Promise<void> => {
  await waitForSearchInputReady(page);
  await page.locator('ui-search-field.search-input-control input[type="search"]').first().fill(value);
};

const toggleFilterCheckbox = async (page: Page, label: string): Promise<void> => {
  await page.locator('#main-content search-page').waitFor();
  await page.locator(`ui-checkbox[label="${label}"] .control`).first().click();
};

const clickSearchResultLink = async (page: Page, title: string): Promise<void> => {
  await page.locator('#main-content search-page').waitFor();
  await page
    .locator('#main-content a.result-link')
    .filter({
      hasText: title,
    })
    .first()
    .click();
};

test.describe('Tag Page', () => {
  test('タグリンクから SPA でタグページへ遷移できること', async ({ page }) => {
    await page.goto(noteCanonicalPath);

    await page.evaluate(() => {
      (window as typeof window & { __tagProbe?: { alive: boolean } }).__tagProbe = {
        alive: true,
      };
    });

    await clickArticleHeaderTag(page, '/tags/music/');

    await expect(page).toHaveURL('/tags/music/');
    await expect(page.locator('#main-content h1').first()).toHaveText('#music');
    await expect(page.locator('#main-content')).toContainText(
      'このタグに属するノートを起点に、検索語や追加タグで探索を広げられます。',
    );
    await expect(page.locator('#main-content')).toContainText(beethovenTitle);

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __tagProbe?: { alive: boolean } }).__tagProbe?.alive === true
      );
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

    await clickSearchResultLink(page, beethovenTitle);

    await expect(page).toHaveURL(notePath);
    await expect(page.locator('#main-content h1').first()).toHaveText(beethovenTitle);

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __tagCardProbe?: { alive: boolean } }).__tagCardProbe
          ?.alive === true
      );
    });
    expect(probeAlive).toBe(true);
  });

  test('タグページで検索語を入力すると /search へ遷移すること', async ({ page }) => {
    await page.goto('/tags/music/');

    await inputSearchQuery(page, '交響曲');

    await expect(page).toHaveURL(/\/search\?q=.*&tag=music$/);
    await expect(page.locator('#main-content h1').first()).toHaveText('検索');
  });

  test('タグページで追加タグを選ぶと /search へ遷移すること', async ({ page }) => {
    await page.goto('/tags/music/');
    await openTagFilter(page);

    await toggleFilterCheckbox(page, 'classical');

    await expect(page).toHaveURL('/search?tag=classical&tag=music');
    await expect(page.locator('#main-content h1').first()).toHaveText('検索');
  });

  test('タグページでタグ演算子や並び順を変えると /search へ遷移すること', async ({ page }) => {
    await page.goto('/tags/music/');

    await changeSearchSelect(page, 0, 'and');
    await expect(page).toHaveURL('/search?tag=music&tagMode=and');

    await page.goto('/tags/music/');

    await changeSearchSelect(page, 1, 'date-desc');
    await expect(page).toHaveURL('/search?tag=music&sort=date-desc');
  });
});