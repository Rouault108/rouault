import { expect, test, type Page } from '@playwright/test';

const path = '/notes/testing/interactive/';

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

test.describe('TOC follows active tab', () => {
  test('初期表示ではアクティブタブ内の見出しだけ TOC に出ること', async ({ page }) => {
    await page.goto(path);
    await waitForTocReady(page);

    await expectTocText(page, 'JavaScriptのHello, World!', true);
  });

  test('?tab=rust 直アクセス時は Rust タブが初期選択され TOC も同期すること', async ({ page }) => {
    await page.goto(`${path}?tab=rust`);
    await waitForTocReady(page);

    await expectTocText(page, 'RustのHello, World!', true);
  });

  test('公開 URL を Rust へ切り替えると TOC の見出しも切り替わること', async ({ page }) => {
    await page.goto(path);
    await waitForTocReady(page);

    await page.goto(`${path}?tab=rust`);
    await waitForTocReady(page);

    await expectTocText(page, 'RustのHello, World!', true);
  });

  test('非表示タブ内見出しへの hash 直アクセスでは TOC は既定タブのままであること', async ({
    page,
  }) => {
    await page.goto(`${path}#rustのhello-world`);
    await waitForTocReady(page);

    await expectTocText(page, 'JavaScriptのHello, World!', true);
  });
});
