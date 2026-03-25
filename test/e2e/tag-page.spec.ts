import { expect, test, type Page } from '@playwright/test';

const notePath = '/notes/music/classical/beethoven/symphony-9';
const noteCanonicalPath = '/notes/music/classical/beethoven/symphony-9/';
const beethovenTitle = '交響曲第9番 ニ短調';

const changeSearchSelect = async (
  page: Page,
  index: number,
  value: 'and' | 'or' | 'relevance' | 'date-desc',
): Promise<void> => {
  await page.waitForFunction((targetIndex) => {
    const host = document.querySelector('#main-content search-page');
    const selects = host?.shadowRoot?.querySelectorAll<HTMLElement>('ui-select.sort-select') ?? [];
    const target = selects[targetIndex];

    return (
      host instanceof HTMLElement &&
      host.matches(':defined') &&
      target instanceof HTMLElement &&
      target.matches(':defined')
    );
  }, index);

  await page.evaluate((detail) => {
    const host = document.querySelector('#main-content search-page');
    const selects = host?.shadowRoot?.querySelectorAll<HTMLElement & { modelValue?: unknown }>(
      'ui-select.sort-select',
    );
    const target = selects?.[detail.index];
    if (!(target instanceof HTMLElement)) {
      throw new Error(`ui-select[${String(detail.index)}] が見つかりません`);
    }

    target.modelValue = detail.value;
    target.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: detail.value },
        bubbles: true,
        composed: true,
      }),
    );
  }, { index, value });
};

const waitForSearchInputReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const host = document.querySelector('#main-content search-page');
    const input = host?.shadowRoot?.querySelector('ui-search-field.search-input-control')
      ?.shadowRoot?.querySelector('input[type="search"]');
    return input instanceof HTMLInputElement;
  });
};

const waitForArticleHeaderTagReady = async (page: Page, href: string): Promise<void> => {
  await page.waitForFunction((expectedHref) => {
    const header = document.querySelector('#main-content ui-article-header');
    const link = header?.shadowRoot
      ?.querySelector(`ui-tag[href="${expectedHref}"]`)
      ?.shadowRoot?.querySelector('a.tag-link');
    return link instanceof HTMLAnchorElement;
  }, href);
};

const clickArticleHeaderTag = async (page: Page, href: string): Promise<void> => {
  await waitForArticleHeaderTagReady(page, href);
  await page.evaluate((expectedHref) => {
    const header = document.querySelector('#main-content ui-article-header');
    const link = header?.shadowRoot
      ?.querySelector(`ui-tag[href="${expectedHref}"]`)
      ?.shadowRoot?.querySelector<HTMLAnchorElement>('a.tag-link');
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error(`タグリンク ${expectedHref} が見つかりません`);
    }

    link.click();
  }, href);
};

const inputSearchQuery = async (page: Page, value: string): Promise<void> => {
  await waitForSearchInputReady(page);
  const input = page.locator('#main-content search-page').locator('input[type="search"]').first();
  await expect(input).toBeVisible();
  await input.fill(value);
};

const waitForFilterCheckboxReady = async (page: Page, label: string): Promise<void> => {
  await page.waitForFunction((expectedLabel) => {
    const host = document.querySelector('#main-content search-page');
    const checkbox = host?.shadowRoot?.querySelector<HTMLElement>(
      `ui-checkbox[label="${expectedLabel}"]`,
    );
    const control = checkbox?.shadowRoot?.querySelector('.control');

    return (
      host instanceof HTMLElement &&
      host.matches(':defined') &&
      checkbox instanceof HTMLElement &&
      checkbox.matches(':defined') &&
      control instanceof HTMLElement
    );
  }, label);
};

const toggleFilterCheckbox = async (page: Page, label: string): Promise<void> => {
  await waitForFilterCheckboxReady(page, label);
  await page.evaluate((expectedLabel) => {
    const host = document.querySelector('#main-content search-page');
    const checkbox = host?.shadowRoot?.querySelector<HTMLElement>(
      `ui-checkbox[label="${expectedLabel}"]`,
    );
    const control = checkbox?.shadowRoot?.querySelector<HTMLElement>('.control');

    if (!(control instanceof HTMLElement)) {
      throw new Error(`タグ checkbox ${expectedLabel} が見つかりません`);
    }

    control.click();
  }, label);
};

const clickSearchResultLink = async (page: Page, title: string): Promise<void> => {
  await page.waitForFunction((expectedTitle) => {
    const host = document.querySelector('#main-content search-page');
    const links = host?.shadowRoot?.querySelectorAll<HTMLAnchorElement>('a.result-link') ?? [];

    return (
      host instanceof HTMLElement &&
      host.matches(':defined') &&
      [...links].some((link) => link.textContent.includes(expectedTitle))
    );
  }, title);

  await page.evaluate((expectedTitle) => {
    const host = document.querySelector('#main-content search-page');
    const links = host?.shadowRoot?.querySelectorAll<HTMLAnchorElement>('a.result-link') ?? [];
    const link = [...links].find((candidate) => candidate.textContent.includes(expectedTitle));

    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error(`検索結果リンク ${expectedTitle} が見つかりません`);
    }

    link.click();
  }, title);
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
