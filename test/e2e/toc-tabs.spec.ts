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

const readTocText = async (page: Page): Promise<string> =>
  page.evaluate(() => {
    const collectText = (node: Node | null): string => {
      if (!node) {
        return '';
      }

      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent ?? '';
      }

      if (node instanceof HTMLSlotElement) {
        return node
          .assignedNodes({ flatten: true })
          .map((assignedNode) => collectText(assignedNode))
          .join('');
      }

      if (node instanceof Element && node.shadowRoot) {
        return collectText(node.shadowRoot);
      }

      return Array.from(node.childNodes)
        .map((childNode) => collectText(childNode))
        .join('');
    };

    const toc = document.querySelector('layout-toc');
    return collectText(toc);
  });

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

    await expectTocText(page, 'JavaScriptのHello, World!', true);
    await expectTocText(page, 'RustのHello, World!', false);
  });

  test('?tab=rust 直アクセス時は Rust タブが初期選択され TOC も同期すること', async ({ page }) => {
    await page.goto(`${path}?tab=rust`);
    await waitForTabsHydration(page);

    await expect(page.locator('ui-tabs').first().locator('[slot="tab"][value="rust"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await expectTocText(page, 'RustのHello, World!', true);
    await expectTocText(page, 'JavaScriptのHello, World!', false);
  });

  test('タブ切り替えで TOC の見出しも切り替わること', async ({ page }) => {
    await page.goto(path);
    await waitForTabsHydration(page);

    await page.evaluate(() => {
      const rustTab = document.querySelector<HTMLElement>('ui-tabs [slot="tab"][value="rust"]');
      rustTab?.click();
    });

    await expectTocText(page, 'RustのHello, World!', true);
    await expectTocText(page, 'JavaScriptのHello, World!', false);
  });

  test('非表示タブ内見出しへの hash 直アクセス時は対象タブを開いて TOC も同期すること', async ({
    page,
  }) => {
    await page.goto(`${path}#rustのhello-world`);
    await waitForTabsHydration(page);

    await expect(page.locator('ui-tabs').first().locator('[slot="tab"][value="rust"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await expectTocText(page, 'RustのHello, World!', true);
    await expectTocText(page, 'JavaScriptのHello, World!', false);
  });
});
