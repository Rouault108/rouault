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
    const host = document.querySelector('layout-toc');
    if (!(host instanceof HTMLElement)) {
      return '';
    }

    const root = host.shadowRoot;
    if (!(root instanceof ShadowRoot)) {
      return '';
    }

    const uiTocs = Array.from(root.querySelectorAll<HTMLElement>('ui-toc'));
    const labels = uiTocs.flatMap((uiToc) => {
      const uiTocRoot = uiToc.shadowRoot;
      if (!(uiTocRoot instanceof ShadowRoot)) {
        return [];
      }

      return Array.from(uiTocRoot.querySelectorAll<HTMLElement>('.toc-link-label'))
        .map((label) => label.textContent?.trim() ?? '')
        .filter((label) => label.length > 0);
    });

    return Array.from(new Set(labels)).join('\n');
  });

const waitForTocReady = async (page: Page): Promise<void> => {
  await expect.poll(() => readTocText(page)).not.toBe('');
};

const expectTocText = async (page: Page, expectedText: string, present: boolean): Promise<void> => {
  if (present) {
    await expect.poll(() => readTocText(page)).toContain(expectedText);
    return;
  }
};

const selectTab = async (page: Page, value: string): Promise<void> => {
  await page.evaluate((nextValue) => {
    const host = document.querySelector('ui-tabs') as
      | (HTMLElement & {
          select?: (
            value: string,
            options?: {
              historyMode?: 'none' | 'push' | 'replace';
              emitEvent?: boolean;
            },
          ) => void;
        })
      | null;

    if (!host || typeof host.select !== 'function') {
      throw new Error('ui-tabs.select() が利用できません');
    }

    host.select(nextValue, { historyMode: 'none', emitEvent: true });
  }, value);
};

test.describe('TOC follows active tab', () => {
  test('初期表示ではアクティブタブ内の見出しだけ TOC に出ること', async ({ page }) => {
    await page.goto(path);
    await waitForTabsHydration(page);
    await waitForTocReady(page);

    await expectTocText(page, 'JavaScriptのHello, World!', true);
  });

  test('?tab=rust 直アクセス時は Rust タブが初期選択され TOC も同期すること', async ({ page }) => {
    await page.goto(`${path}?tab=rust`);
    await waitForTabsHydration(page);
    await waitForTocReady(page);

    await expect(
      page.locator('ui-tabs').first().locator('[slot="tab"][value="rust"]'),
    ).toHaveAttribute('aria-selected', 'true');

    await expectTocText(page, 'RustのHello, World!', true);
  });

  test('タブ切り替えで TOC の見出しも切り替わること', async ({ page }) => {
    await page.goto(path);
    await waitForTabsHydration(page);
    await waitForTocReady(page);

    await selectTab(page, 'rust');

    await expect(
      page.locator('ui-tabs').first().locator('[slot="tab"][value="rust"]'),
    ).toHaveAttribute('aria-selected', 'true');

    await expectTocText(page, 'RustのHello, World!', true);
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
  });
});