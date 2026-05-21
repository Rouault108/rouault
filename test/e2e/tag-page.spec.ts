import { expect, test, type Page } from '@playwright/test';

const notePath = '/notes/program/csharp/what-is-csharp';
const noteCanonicalPath = '/notes/program/csharp/';
const publicTagPagePath = '/tags/Programming/';
const targetTitle = 'C#とは何か';

const waitForAppRouterReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const router = document.querySelector('app-router');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function' &&
      typeof (router as { whenReady?: unknown }).whenReady === 'function'
    );
  });
  await page.evaluate(async () => {
    const router = document.querySelector('app-router') as
      | (HTMLElement & { whenReady: () => Promise<void> })
      | null;
    if (!router || typeof router.whenReady !== 'function') {
      throw new Error('app-router.whenReady() が利用できません');
    }
    await router.whenReady();
  });
};

const expectNoteHeading = async (page: Page, headingText: string): Promise<void> => {
  await expect(page.locator('.article-header .article-header__heading')).toHaveText(headingText);
};

const changeSearchSelect = async (
  page: Page,
  index: number,
  value: 'and' | 'or' | 'relevance' | 'date-desc',
): Promise<void> => {
  await waitForSearchInputReady(page);
  const selector = index === 0 ? '[data-search-tag-mode-select]' : '[data-search-sort-select]';
  await page.locator(selector).selectOption(value);
};

const waitForSearchInputReady = async (page: Page): Promise<void> => {
  await page.locator('#main-content [data-search-page-root]').waitFor();
  await page.locator('[data-search-query-input]').first().waitFor();
  await page.waitForFunction(() => {
    const host = document.querySelector('#main-content [data-search-page-root]');
    return (
      host instanceof HTMLElement &&
      host.querySelector('[data-search-page-form]') instanceof HTMLFormElement &&
      host.querySelector('[data-search-query-input]') instanceof HTMLInputElement
    );
  });
};

const openTagFilter = async (page: Page): Promise<void> => {
  await waitForSearchInputReady(page);
  await page.locator('details.filter-details').evaluate((element) => {
    const details = element as HTMLDetailsElement;
    details.open = true;
    details.setAttribute('open', '');
  });
};

const clickArticleHeaderTag = async (page: Page, href: string): Promise<void> => {
  await waitForAppRouterReady(page);
  const link = page.locator(`.article-header a.article-header__tag-link[href="${href}"]`).first();
  await expect(link).toBeVisible();
  await link.click();
};

const inputSearchQuery = async (page: Page, value: string): Promise<void> => {
  await waitForSearchInputReady(page);
  await page.locator('[data-search-query-input]').first().fill(value);
};

const toggleFilterCheckbox = async (page: Page, label: string): Promise<void> => {
  await waitForSearchInputReady(page);
  await page.locator(`[data-search-tag-checkbox][value="${label}"]`).check();
};

const clickSearchResultLink = async (page: Page, title: string): Promise<void> => {
  await waitForSearchInputReady(page);
  await waitForAppRouterReady(page);
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

    await clickArticleHeaderTag(page, publicTagPagePath);

    await expect(page).toHaveURL(publicTagPagePath);
    await expect(page.locator('#main-content h1').first()).toHaveText('#Programming');
    await expect(page.locator('#main-content')).toContainText(
      'このタグに属するノートを起点に、検索語や追加タグで探索を広げられます。',
    );
    await expect(page.locator('#main-content')).toContainText(targetTitle);

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __tagProbe?: { alive: boolean } }).__tagProbe?.alive === true
      );
    });
    expect(probeAlive).toBe(true);
  });

  test('タグページのカード内リンクからノートへ遷移できること', async ({ page }) => {
    await page.goto(publicTagPagePath);

    await page.evaluate(() => {
      (window as typeof window & { __tagCardProbe?: { alive: boolean } }).__tagCardProbe = {
        alive: true,
      };
    });

    await clickSearchResultLink(page, targetTitle);

    await expect(page).toHaveURL(notePath);
    await expectNoteHeading(page, targetTitle);

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __tagCardProbe?: { alive: boolean } }).__tagCardProbe
          ?.alive === true
      );
    });
    expect(probeAlive).toBe(true);
  });

  test('タグページで検索語を入力すると /search/ へ遷移すること', async ({ page }) => {
    await page.goto(publicTagPagePath);

    await inputSearchQuery(page, 'Target');

    await expect(page).toHaveURL(/\/search\/\?/);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const url = new URL(window.location.href);
          return {
            pathname: url.pathname,
            q: url.searchParams.get('q'),
            tags: url.searchParams.getAll('tag'),
          };
        }),
      )
        .toEqual({
        pathname: '/search/',
        q: 'target',
        tags: ['Programming'],
      });
    await expect(page.locator('#main-content h1').first()).toHaveText('検索');
  });

  test('タグページで追加タグを選ぶと /search/ へ遷移すること', async ({ page }) => {
    await page.goto(publicTagPagePath);
    await openTagFilter(page);

    await toggleFilterCheckbox(page, 'C#');

    await expect(page).toHaveURL(/\/search\/\?/);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const url = new URL(window.location.href);
          return {
            pathname: url.pathname,
            tags: url.searchParams.getAll('tag'),
          };
        }),
      )
        .toEqual({
        pathname: '/search/',
        tags: ['C#', 'Programming'],
      });
    await expect(page.locator('#main-content h1').first()).toHaveText('検索');
  });

  test('タグページでタグ演算子や並び順を変えると /search/ へ遷移すること', async ({ page }) => {
    await page.goto(publicTagPagePath);

    await changeSearchSelect(page, 0, 'and');
    await expect(page).toHaveURL('/search/?tag=Programming&tagMode=and');

    await page.goto(publicTagPagePath);

    await changeSearchSelect(page, 1, 'date-desc');
    await expect(page).toHaveURL('/search/?tag=Programming&sort=date-desc');
  });
});
