import { expect, test, type Page } from '@playwright/test';

const path = '/notes/testing/interactive/';

const waitForTabsHydration = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>('ui-tabs');
    host?.scrollIntoView({ block: 'center', inline: 'nearest' });
    host?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
  });
  await page.waitForFunction(() => {
    const host = document.querySelector<HTMLElement>('ui-tabs');
    if (!(host instanceof HTMLElement)) {
      return false;
    }

    if (!host.hasAttribute('hydrated')) {
      return false;
    }

    return host.querySelector('[slot="tab"][aria-selected]') instanceof HTMLElement;
  });
};

const waitForTocReady = async (page: Page): Promise<void> => {
  await page.locator('layout-toc .desktop ui-toc .toc-link-label').first().waitFor();
};

const readTocText = async (page: Page): Promise<string> =>
  page
    .locator('layout-toc .desktop ui-toc .toc-link-label')
    .allTextContents()
    .then((labels) =>
      labels
        .map((label) => label.trim())
        .filter((label) => label.length > 0)
        .join('\n'),
    );

const expectTocText = async (page: Page, expectedText: string, present: boolean): Promise<void> => {
  if (present) {
    await expect.poll(() => readTocText(page)).toContain(expectedText);
    return;
  }

  await expect.poll(() => readTocText(page)).not.toContain(expectedText);
};

test.describe('TOC follows active tab', () => {
  test('初期表示ではアクティブタブ内の見出しだけ TOC に出ること', async ({ page }) => {
    await page.goto(path);
    await waitForTabsHydration(page);
    await waitForTocReady(page);

    await expectTocText(page, 'JavaScriptのHello, World!', true);
    await expectTocText(page, 'RustのHello, World!', false);
  });

  test('?tab=rust 直アクセス時は Rust タブが初期選択され TOC も同期すること', async ({ page }) => {
    await page.goto(`${path}?tab=rust`);
    await waitForTabsHydration(page);
    await waitForTocReady(page);

    await expect(
      page.locator('ui-tabs').first().locator('[slot="tab"][value="rust"]'),
    ).toHaveAttribute('aria-selected', 'true');

    await expectTocText(page, 'RustのHello, World!', true);
    await expectTocText(page, 'JavaScriptのHello, World!', false);
  });

  test('タブ切り替えで TOC の見出しも切り替わること', async ({ page }) => {
    await page.goto(path);
    await waitForTabsHydration(page);
    await waitForTocReady(page);

    await page.locator('ui-tabs').first().locator('[slot="tab"][value="rust"]').click();

    await expectTocText(page, 'RustのHello, World!', true);
    await expectTocText(page, 'JavaScriptのHello, World!', false);
  });

  test('非表示タブ内見出しへの hash 直アクセス時は対象タブを開いて TOC も同期すること', async ({
    page,
  }) => {
    await page.goto(`${path}#rustのhello-world`);
    await waitForTabsHydration(page);
    await waitForTocReady(page);

    await expect(
      page.locator('ui-tabs').first().locator('[slot="tab"][value="rust"]'),
    ).toHaveAttribute('aria-selected', 'true');

    await expectTocText(page, 'RustのHello, World!', true);
    await expectTocText(page, 'JavaScriptのHello, World!', false);
  });
});
