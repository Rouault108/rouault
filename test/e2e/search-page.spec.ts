import { expect, test, type Locator, type Page } from '@playwright/test';

const waitForSearchPageReady = async (page: Page, path = '/search/'): Promise<void> => {
  await page.goto(path);
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

const tabUntilFocused = async (page: Page, target: Locator): Promise<void> => {
  if (await target.evaluate((element) => document.activeElement === element)) {
    return;
  }

  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press('Tab');

    if (await target.evaluate((element) => document.activeElement === element)) {
      return;
    }
  }

  expect(
    await target.evaluate((element) => document.activeElement === element),
    'Tab should reach the first result link',
  ).toBe(true);
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

  test('result card は padding 相当位置まで a.result-link のリンク面として扱うこと', async ({
    page,
  }) => {
    await waitForSearchPageReady(page, '/search/?q=router');

    const firstCard = page.locator('article.result-card').first();
    const firstLink = firstCard.locator(':scope > a.result-link').first();
    await expect(firstCard).toBeVisible();
    await expect(firstLink).toBeVisible();

    await expect(firstCard.locator(':scope > *')).toHaveCount(1);
    const linkBox = await firstLink.boundingBox();
    expect(linkBox).not.toBeNull();
    if (linkBox === null) {
      return;
    }

    const hitPoints = [
      { label: 'top-left padding', x: linkBox.x + 8, y: linkBox.y + 8 },
      {
        label: 'bottom-right padding',
        x: linkBox.x + linkBox.width - 8,
        y: linkBox.y + linkBox.height - 8,
      },
    ];

    for (const hitPoint of hitPoints) {
      const hitSurface = await page.evaluate(
        ({ x, y }) => {
          const element = document.elementFromPoint(x, y);
          const link = element instanceof Element ? element.closest('a.result-link') : null;
          return {
            tagName: element?.tagName ?? null,
            linkTagName: link?.tagName ?? null,
            linkSurface: link?.getAttribute('data-link-surface') ?? null,
          };
        },
        {
          x: hitPoint.x,
          y: hitPoint.y,
        },
      );

      expect(hitSurface.linkTagName, `${hitPoint.label} should hit a.result-link`).toBe('A');
      expect(hitSurface.linkSurface, `${hitPoint.label} should keep card link surface`).toBe(
        'card',
      );
    }
  });

  test('mouse click focus does not show the result card outer focus ring', async ({ page }) => {
    await waitForSearchPageReady(page, '/search/?q=router');

    const firstCard = page.locator('article.result-card').first();
    const firstLink = firstCard.locator(':scope > a.result-link').first();
    await expect(firstCard).toBeVisible();
    await expect(firstLink).toBeVisible();

    await firstLink.evaluate((link) => {
      link.addEventListener('click', (event) => event.preventDefault(), { once: true });
    });

    await firstLink.click();

    await expect(firstLink).toBeFocused();
    await expect(firstCard).toHaveCSS('outline-style', 'none');
  });

  test('keyboard focus-visible projects the result link focus ring to the result card', async ({
    page,
  }) => {
    await waitForSearchPageReady(page, '/search/?q=router');

    const firstCard = page.locator('article.result-card').first();
    const firstLink = firstCard.locator(':scope > a.result-link').first();
    await expect(firstCard).toBeVisible();
    await expect(firstLink).toBeVisible();

    await tabUntilFocused(page, firstLink);

    await expect(firstLink).toBeFocused();
    await expect(firstCard).toHaveCSS('outline-style', 'solid');
    await expect(firstLink).toHaveCSS('outline-style', 'none');
  });
});
