import { expect, test, type Page } from '@playwright/test';

const notePath = '/notes/program/csharp';
const noteCanonicalPath = '/notes/program/csharp/';
const publicTagPagePath = '/tags/Programming/';
const targetTitle = 'C#とは何か';

const waitForAppRouterReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const router = document.querySelector('app-router');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function'
    );
  });
};

const expectNoteHeading = async (page: Page, headingText: string): Promise<void> => {
  await expect(page.locator('ui-article-header')).toHaveAttribute('heading', headingText);
};

const changeSearchSelect = async (
  page: Page,
  index: number,
  value: 'and' | 'or' | 'relevance' | 'date-desc',
): Promise<void> => {
  await waitForSearchInputReady(page);
  await page.locator('#main-content search-page').evaluate(
    (element, next) => {
      const host = element as HTMLElement & {
        _onTagModeChange?: (event: Event) => void;
        _onSortChange?: (event: Event) => void;
      };
      const event = new CustomEvent('change', {
        detail: { value: next.value },
        bubbles: true,
        composed: true,
      });

      if (next.index === 0) {
        host._onTagModeChange?.(event);
        return;
      }

      host._onSortChange?.(event);
    },
    { index, value },
  );
};

const waitForSearchInputReady = async (page: Page): Promise<void> => {
  await page.locator('#main-content search-page').waitFor();
  await page.locator('ui-search-field.search-input-control input[type="search"]').first().waitFor();
  await page.waitForFunction(() => {
    const host = document.querySelector('#main-content search-page');
    return (
      host instanceof HTMLElement &&
      typeof (host as { _toggleTag?: unknown })._toggleTag === 'function' &&
      typeof (host as { _onTagModeChange?: unknown })._onTagModeChange === 'function' &&
      typeof (host as { _onSortChange?: unknown })._onSortChange === 'function'
    );
  });
};

const openTagFilter = async (page: Page): Promise<void> => {
  await waitForSearchInputReady(page);
  await page.locator('ui-details.filter-details').evaluate((element) => {
    const details = element as HTMLElement & { open?: boolean };
    details.open = true;
    details.setAttribute('open', '');
  });
};

const clickArticleHeaderTag = async (page: Page, href: string): Promise<void> => {
  await waitForAppRouterReady(page);
  const link = page.locator(`ui-article-header ui-tag[href="${href}"] a.tag-link`).first();
  await expect(link).toBeVisible();
  await link.click();
};

const inputSearchQuery = async (page: Page, value: string): Promise<void> => {
  await waitForSearchInputReady(page);
  await page
    .locator('ui-search-field.search-input-control input[type="search"]')
    .first()
    .fill(value);
};

const toggleFilterCheckbox = async (page: Page, label: string): Promise<void> => {
  await waitForSearchInputReady(page);
  await page.locator('#main-content search-page').evaluate((element, tag) => {
    const host = element as HTMLElement & { _toggleTag?: (value: string) => void };
    host._toggleTag?.(tag);
  }, label);
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

    await toggleFilterCheckbox(page, 'c#');

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
        tags: ['c#', 'Programming'],
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
