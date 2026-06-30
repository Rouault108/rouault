import { expect, test } from '@playwright/test';

const wideTableNotePath = '/notes/library/collection/%E5%B2%A9%E6%B3%A2%E6%96%87%E5%BA%AB/';

test.describe('Accessible top scroll rail', () => {
  test('fine pointer 相当では実 Tab 順序で rail に到達し、次の focusable へ進めること', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit の Tab focus は実行環境設定に依存するため、Tab 順序契約は Chromium で固定する。',
    );

    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(wideTableNotePath);

    const root = page.locator('[data-table-root]').first();
    const rail = page.locator('[data-table-scroll-rail]').first();

    await expect(root).toBeVisible();
    await expect(rail).toBeVisible();
    await expect(rail).toHaveAttribute('role', 'region');
    await expect(rail).toHaveAttribute('tabindex', '0');
    await expect(rail).toHaveAttribute('aria-controls', /.+/u);
    await expect(rail).not.toHaveAttribute('aria-hidden', 'true');

    const inserted = await page.evaluate(() => {
      const railElement = document.querySelector('[data-table-scroll-rail]');
      const rootElement = railElement?.nextElementSibling;

      if (
        !(railElement instanceof HTMLElement) ||
        !(rootElement instanceof HTMLElement) ||
        !rootElement.matches('[data-table-root]')
      ) {
        return false;
      }

      const before = document.createElement('button');
      before.type = 'button';
      before.textContent = 'before table rail';
      before.dataset['e2eTableRailFocusBefore'] = 'true';

      const after = document.createElement('button');
      after.type = 'button';
      after.textContent = 'after table root';
      after.dataset['e2eTableRailFocusAfter'] = 'true';

      railElement.before(before);
      rootElement.after(after);

      return true;
    });

    expect(inserted).toBe(true);

    const before = page.locator('[data-e2e-table-rail-focus-before]').first();
    const after = page.locator('[data-e2e-table-rail-focus-after]').first();

    await before.focus();
    await expect(before).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(rail).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(root).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(after).toBeFocused();
  });
});
