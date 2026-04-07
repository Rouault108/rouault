import { expect, test, type Page } from '@playwright/test';

const sourcePath = '/notes/testing/markdown-basic/';
const sampleJavascriptPath = '/notes/program/sample-javascript/';
const sampleJavascriptSpaPath = '/notes/program/sample-javascript';

interface TocSyncState {
  hostActiveId: string | null;
  childPropActiveId: string | null;
  childAttrActiveId: string | null;
  childDomActiveLabel: string | null;
  tocTemplateCount: number;
}

const waitForAppRouterReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const router = document.querySelector('app-router');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function'
    );
  });
};

const navigateWithAppRouter = async (page: Page, url: string): Promise<void> => {
  await waitForAppRouterReady(page);

  await page.evaluate(async (targetUrl) => {
    const router = document.querySelector('app-router') as
      | (HTMLElement & { navigate: (nextUrl: string) => Promise<unknown> })
      | null;
    if (!router || typeof router.navigate !== 'function') {
      throw new Error('app-router.navigate() が利用できません');
    }

    await router.navigate(targetUrl);
  }, url);
};

const waitForTocReady = async (page: Page): Promise<void> => {
  await page.locator('layout-toc .desktop ui-toc .toc-link-label').first().waitFor();
};

const readTocSyncState = async (page: Page): Promise<TocSyncState> =>
  page.evaluate(() => {
    const host = document.querySelector('layout-toc') as
      | (HTMLElement & { _activeId?: string })
      | null;
    const ui = host?.shadowRoot?.querySelector('ui-toc') as
      | (HTMLElement & { activeId?: string })
      | null;

    const tocTemplateCount =
      host instanceof Element
        ? Array.from(host.children).filter((child) => {
            return (
              child instanceof HTMLTemplateElement &&
              (child.hasAttribute('shadowrootmode') || child.hasAttribute('shadowroot'))
            );
          }).length
        : -1;

    return {
      hostActiveId: host?._activeId ?? null,
      childPropActiveId: typeof ui?.activeId === 'string' ? ui.activeId : null,
      childAttrActiveId: ui?.getAttribute('active-id') ?? null,
      childDomActiveLabel:
        ui?.shadowRoot
          ?.querySelector('a.toc-link.is-active .toc-link-label')
          ?.textContent?.trim() ?? null,
      tocTemplateCount,
    };
  });

const expectTocSynchronized = async (
  page: Page,
  expectedId: string,
  expectedLabel: string,
): Promise<void> => {
  await expect
    .poll(async () => {
      return await readTocSyncState(page);
    })
    .toEqual({
      hostActiveId: expectedId,
      childPropActiveId: expectedId,
      childAttrActiveId: expectedId,
      childDomActiveLabel: expectedLabel,
      tocTemplateCount: 0,
    });
};

const scrollHeadingIntoView = async (page: Page, headingId: string): Promise<void> => {
  await page.evaluate((id) => {
    const target = document.getElementById(id);
    if (!(target instanceof HTMLElement)) {
      throw new Error(`heading not found: ${id}`);
    }

    target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
  }, headingId);
};

test.describe('TOC active state stays synchronized with host state', () => {
  test('sample-javascript 直アクセス時に scroll で host / child / DOM の current が同期して更新されること', async ({
    page,
  }) => {
    await page.goto(sampleJavascriptPath);
    await waitForTocReady(page);

    await expectTocSynchronized(page, '71-配列の生成', '7.1 配列の生成');

    await scrollHeadingIntoView(page, '72-配列の要素の読み書き');
    await expectTocSynchronized(page, '72-配列の要素の読み書き', '7.2 配列の要素の読み書き');

    await scrollHeadingIntoView(page, '714-arrayof');
    await expectTocSynchronized(page, '714-arrayof', '7.1.4 Array.of()');

    await scrollHeadingIntoView(page, '715-arrayfrom');
    await expectTocSynchronized(page, '715-arrayfrom', '7.1.5 Array.from()');
  });

  test('hash 直アクセス時に初回表示から host / child / DOM の current が一致すること', async ({
    page,
  }) => {
    await page.goto(`${sampleJavascriptPath}#72-配列の要素の読み書き`);
    await waitForTocReady(page);

    await expectTocSynchronized(page, '72-配列の要素の読み書き', '7.2 配列の要素の読み書き');

    const targetTop = await page.evaluate(() => {
      const target = document.getElementById('72-配列の要素の読み書き');
      return target instanceof HTMLElement ? Math.round(target.getBoundingClientRect().top) : null;
    });

    expect(targetTop).not.toBeNull();
    expect(Math.abs(targetTop ?? 0)).toBeLessThan(240);
  });

  test('SPA 遷移で sample-javascript を開いた後も scroll に応じて host / child / DOM の current が同期すること', async ({
    page,
  }) => {
    await page.goto(sourcePath);
    await navigateWithAppRouter(page, sampleJavascriptSpaPath);

    await expect(page).toHaveURL(sampleJavascriptSpaPath);
    await waitForTocReady(page);

    await expectTocSynchronized(page, '71-配列の生成', '7.1 配列の生成');

    await scrollHeadingIntoView(page, '72-配列の要素の読み書き');
    await expectTocSynchronized(page, '72-配列の要素の読み書き', '7.2 配列の要素の読み書き');
  });
});
