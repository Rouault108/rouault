import { expect, test, type Locator, type Page } from '@playwright/test';

const waitForSearchPageReady = async (page: Page): Promise<void> => {
  await page.goto('/search/');
  await page.locator('#main-content [data-search-page-root]').waitFor();
  await page.waitForFunction(() => {
    const host = document.querySelector('#main-content [data-search-page-root]');
    return (
      host instanceof HTMLElement &&
      host.dataset['enhanced'] === 'true' &&
      host.querySelector('[data-search-query-input]') instanceof HTMLInputElement &&
      host.querySelector('[data-search-filter-input]') instanceof HTMLInputElement
    );
  });
};

const clickNearLeftEdgeAndType = async (
  page: Page,
  input: Locator,
  value: string,
): Promise<void> => {
  const box = await input.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }

  await page.mouse.click(box.x + 12, box.y + box.height / 2);
  await expect(input).toBeFocused();
  await page.keyboard.type(value);
  await expect(input).toHaveValue(value);
};

test.describe('Search Page', () => {
  test('検索 input と tag filter input は左端寄りの実クリックから keyboard.type で入力できること', async ({
    page,
  }) => {
    await waitForSearchPageReady(page);

    const queryInput = page.locator('[data-search-query-input]').first();
    await clickNearLeftEdgeAndType(page, queryInput, 'router');

    await page.locator('details.filter-details > summary').click();
    const filterInput = page.locator('[data-search-filter-input]').first();
    await clickNearLeftEdgeAndType(page, filterInput, 'pro');
  });
});
