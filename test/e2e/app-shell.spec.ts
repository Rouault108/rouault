import { expect, test } from '@playwright/test';

test.describe('App Shell', () => {
  test('最初の Tab 停留点が skip link であり Enter で main へ移動できること', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.keyboard.press('Tab');

    const focusState = await page.evaluate(() => {
      const skipLink = document.querySelector('ui-skip-link');
      const activeElement = document.activeElement;
      const shadowActiveElement =
        skipLink instanceof HTMLElement ? skipLink.shadowRoot?.activeElement ?? null : null;

      return {
        isSkipLinkFocused: activeElement === skipLink,
        shadowActiveTagName: shadowActiveElement?.tagName ?? null,
        shadowActiveHref:
          shadowActiveElement instanceof HTMLAnchorElement
            ? shadowActiveElement.getAttribute('href')
            : null,
      };
    });

    expect(focusState.isSkipLinkFocused).toBe(true);
    expect(focusState.shadowActiveTagName).toBe('A');
    expect(focusState.shadowActiveHref).toBe('#main-content');

    await page.keyboard.press('Enter');

    await expect(page.locator('#main-content')).toBeFocused();
  });
});