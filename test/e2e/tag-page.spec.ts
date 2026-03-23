import { expect, test, type Page } from '@playwright/test';

const notePath = '/notes/music/classical/beethoven/symphony-9';
const beethovenTitle = '交響曲第9番 ニ短調';

const changeSearchSelect = async (
  page: Page,
  index: number,
  value: 'and' | 'or' | 'relevance' | 'date-desc',
): Promise<void> => {
  await page.locator('#main-content search-page').evaluate(
    (host, detail) => {
      const selects = host.shadowRoot?.querySelectorAll('ui-select.sort-select') ?? [];
      const target = selects.item(detail.index);
      if (!target) {
        throw new Error(`ui-select[${String(detail.index)}] が見つかりません`);
      }

      target.dispatchEvent(
        new CustomEvent('change', {
          detail: { value: detail.value },
          bubbles: true,
          composed: true,
        }),
      );
    },
    { index, value },
  );
};

const waitForArticleHeaderTag = async (page: Page, href: string): Promise<void> => {
  await page.waitForFunction((targetHref) => {
    const header = document.querySelector('#main-content ui-article-header');
    const tag = header?.shadowRoot?.querySelector(`ui-tag[href="${targetHref}"]`);
    const link = tag?.shadowRoot?.querySelector('a.tag-link');
    return link instanceof HTMLAnchorElement;
  }, href);
};

const waitForSearchInputReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const host = document.querySelector('#main-content search-page');
    const input = host?.shadowRoot?.querySelector('ui-search-field.search-input-control')
      ?.shadowRoot?.querySelector('input[type="search"]');
    return input instanceof HTMLInputElement;
  });
};

const clickArticleHeaderTag = async (page: Page, href: string): Promise<void> => {
  await waitForArticleHeaderTag(page, href);
  const link = page
    .locator('#main-content ui-article-header')
    .locator(`ui-tag[href="${href}"]`)
    .locator('a.tag-link')
    .first();
  await expect(link).toBeVisible();
  await link.click();
};

const inputSearchQuery = async (page: Page, value: string): Promise<void> => {
  await waitForSearchInputReady(page);
  const input = page.locator('#main-content search-page').locator('input[type="search"]').first();
  await expect(input).toBeVisible();
  await input.fill(value);
};

test.describe('Tag Page', () => {
  test('タグリンクから SPA でタグページへ遷移できること', async ({ page }) => {
    await page.goto(notePath);

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

    await page.locator('.result-link').filter({ hasText: beethovenTitle }).first().click();

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

    await expect(page.locator('#main-content search-page')).toBeVisible();
    await inputSearchQuery(page, '交響曲');

    await expect(page).toHaveURL(/\/search\?q=.*&tag=music$/);
    await expect(page.locator('#main-content h1').first()).toHaveText('検索');
  });

  test('タグページで追加タグを選ぶと /search へ遷移すること', async ({ page }) => {
    await page.goto('/tags/music/');

    const filterButton = page.getByRole('button', { name: /タグで絞り込む/ });
    await expect(filterButton).toBeVisible();
    await filterButton.click();

    const classicalCheckbox = page.getByRole('checkbox', { name: 'classical' });
    await expect(classicalCheckbox).toBeVisible();
    await classicalCheckbox.check();

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
