import { expect, test, type Locator, type Page } from '@playwright/test';

const beethovenPath = '/notes/music/classical/beethoven/symphony-9';
const nutcrackerPath = '/notes/music/classical/tchaikovsky/the-nutcracker';
const beethovenEntryPath = `${beethovenPath}/`;
const testNotePath = '/notes/testing/markdown-basic/';
const tabsTestPath = '/notes/testing/interactive/';

const getSidebarTreeItem = (page: Page, label: string): Locator =>
  page.getByRole('treeitem', { name: label, exact: true }).first();

const expandSidebarTreeItem = async (page: Page, label: string): Promise<void> => {
  const item = getSidebarTreeItem(page, label);
  await expect(item).toHaveAttribute('aria-expanded', 'false');
  await item.locator('.expand-icon:not(.hidden)').click();
  await expect(item).toHaveAttribute('aria-expanded', 'true');
};

const expectMainHeading = async (page: Page, headingText: string): Promise<void> => {
  await expect(page.locator('ui-article-header')).toHaveAttribute('heading', headingText);
};

const activateSidebarTreeItem = async (page: Page, label: string): Promise<void> => {
  const item = getSidebarTreeItem(page, label);
  await item.locator('.item').click();
};

const waitForTabsHydration = async (page: Page, index = 0): Promise<void> => {
  await page.evaluate((targetIndex) => {
    const host = document.querySelectorAll<HTMLElement>('ui-tabs')[targetIndex];
    host?.scrollIntoView({ block: 'center', inline: 'nearest' });
    host?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
  }, index);
  await page.waitForFunction((targetIndex) => {
    const host = document.querySelectorAll<HTMLElement>('ui-tabs')[targetIndex];
    if (!(host instanceof HTMLElement)) {
      return false;
    }

    if (!host.hasAttribute('hydrated')) {
      return false;
    }

    return host.querySelector('[slot="tab"][aria-selected]') instanceof HTMLElement;
  }, index);
};

const hideTocOverlay = async (page: Page): Promise<void> => {
  await page.addStyleTag({
    content: '.layout-toc-col { display: none !important; }',
  });
};

test.describe('Router Navigation', () => {
  test('サイドバー遷移で SPA ナビゲーションが動作すること', async ({ page }) => {
    await page.goto(beethovenEntryPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調');

    await page.evaluate(() => {
      (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe = {
        alive: true,
      };
    });

    await expandSidebarTreeItem(page, 'Tchaikovsky');
    await activateSidebarTreeItem(page, '楽曲分析: くるみ割り人形');

    await expect(page).toHaveURL(nutcrackerPath);
    await expectMainHeading(page, '楽曲分析: くるみ割り人形');

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe?.alive === true
      );
    });
    expect(probeAlive).toBe(true);
  });

  test('履歴の戻る / 進むで main content が追従すること', async ({ page }) => {
    await page.goto(beethovenEntryPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調');

    await expandSidebarTreeItem(page, 'Tchaikovsky');
    await activateSidebarTreeItem(page, '楽曲分析: くるみ割り人形');

    await expect(page).toHaveURL(nutcrackerPath);
    await expectMainHeading(page, '楽曲分析: くるみ割り人形');

    await page.goBack();
    await expect(page).toHaveURL(beethovenEntryPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調');

    await page.goForward();
    await expect(page).toHaveURL(nutcrackerPath);
    await expectMainHeading(page, '楽曲分析: くるみ割り人形');
  });

  test('遷移後に aria-live とフォーカス管理が更新されること', async ({ page }) => {
    await page.goto(beethovenEntryPath);
    await expectMainHeading(page, '交響曲第9番 ニ短調');

    await expandSidebarTreeItem(page, 'Tchaikovsky');
    await activateSidebarTreeItem(page, '楽曲分析: くるみ割り人形');

    const ariaLive = page.locator('[aria-live="polite"]').filter({
      hasText: 'ページが読み込まれました',
    });
    await expect(ariaLive.first()).toContainText('ページが読み込まれました');

    const activeElement = await page.evaluate(() => {
      const element = document.activeElement;
      if (element === null) {
        return {
          tagName: '',
          text: '',
        };
      }

      return {
        tagName: element.tagName,
        text: element.textContent.trim(),
      };
    });

    expect(activeElement.tagName).toBe('H1');
    expect(activeElement.text).toContain('くるみ割り人形');
  });

  test('検索ページ下端から記事へ遷移してもスクロール位置が先頭に戻ること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.goto('/tags/music/');

    const resultLinks = page.locator('.result-link');
    await expect(resultLinks).toHaveCount(3);

    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });

    const targetLink = resultLinks.last();
    const targetHref = await targetLink.getAttribute('href');
    expect(targetHref).not.toBeNull();

    await targetLink.click();

    const hrefUrl = targetHref ?? '';
    await expect(page).toHaveURL(hrefUrl);
    await expect(page.locator('#main-content article')).toBeVisible();

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });

  test('hash なしで再読み込みしてもトップ位置のままであること', async ({ page }) => {
    await page.goto(testNotePath);

    await expect(page.locator('#note-content-testing-markdown-basic')).toHaveCount(1);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );

    await page.reload();

    await expect(page.locator('#note-content-testing-markdown-basic')).toHaveCount(1);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThanOrEqual(2);
  });

  test('本文見出しの固定リンクがキーボードで起動できること', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(testNotePath);
    await hideTocOverlay(page);

    const headingPermalink = page
      .locator('#note-content-testing-markdown-basic h2 .heading-anchor')
      .first();
    await expect(headingPermalink).toBeVisible();

    const href = await headingPermalink.getAttribute('href');
    expect(href).not.toBeNull();

    await headingPermalink.focus();
    await page.keyboard.press('Enter');

    await expect
      .poll(() => page.evaluate(() => decodeURIComponent(window.location.hash)))
      .toBe(href);
  });
  test('見出し本文クリックでは hash が更新されず、固定リンククリックでのみ更新されること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(testNotePath);
    await hideTocOverlay(page);

    const headingText = page
      .locator('#note-content-testing-markdown-basic h2 .heading-text')
      .first();
    const headingPermalink = page
      .locator('#note-content-testing-markdown-basic h2 .heading-anchor')
      .first();

    await headingText.click({ force: true });
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');

    const href = await headingPermalink.getAttribute('href');
    expect(href).not.toBeNull();

    await headingPermalink.click();
    await expect
      .poll(() => page.evaluate(() => decodeURIComponent(window.location.hash)))
      .toBe(href);
  });

  test('本文見出しの hover は見出し実体の範囲に限定されること', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(testNotePath);
    await hideTocOverlay(page);

    const prose = page.locator('#note-content-testing-markdown-basic');
    const heading = prose.locator('h2').first();
    const headingText = heading.locator('.heading-text');
    const headingPermalink = heading.locator('.heading-anchor');

    const proseBox = await prose.boundingBox();
    const headingBox = await heading.boundingBox();
    if (!proseBox || !headingBox) {
      throw new Error('本文見出しの位置情報を取得できませんでした');
    }

    const hoveredOpacity = async (): Promise<string> =>
      headingPermalink.evaluate((element) => getComputedStyle(element).opacity);

    await page.mouse.move(proseBox.x + proseBox.width - 4, headingBox.y + headingBox.height / 2);
    await expect.poll(hoveredOpacity).toBe('0');

    await headingText.hover({ force: true });
    await expect.poll(hoveredOpacity).toBe('1');
  });

  test('未知のURLへ SPA 遷移したとき 404 ページへ切り替わること', async ({ page }) => {
    await page.goto(beethovenEntryPath);

    await page.evaluate(() => {
      history.pushState({}, '', '/notes/does-not-exist/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(page).toHaveURL('/notes/does-not-exist/');
    await expect(page.locator('#main-content')).toContainText('このページは見つかりませんでした');
    await expect(page.locator('#main-content')).toContainText('検索ページへ');
  });

  test('?tab= 付き URL で初期タブが復元されること', async ({ page }) => {
    await page.goto(`${tabsTestPath}?tab=rust`);
    await waitForTabsHydration(page, 0);

    const tabs = page.locator('ui-tabs').first();
    const tabsItems = tabs.locator('[slot="tab"]');
    const panels = tabs.locator('[slot="panel"]');

    await expect(tabsItems.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(panels.nth(1)).not.toHaveAttribute('hidden', '');
    await expect(panels.nth(0)).toHaveAttribute('hidden', '');
  });

  test('tabs の URL 同期は既存 history.state を再利用し router key を生成しないこと', async ({
    page,
  }) => {
    await page.goto(tabsTestPath);
    await waitForTabsHydration(page, 0);

    await page.evaluate(() => {
      history.replaceState(
        {
          customData: 'value',
          nested: {
            ok: true,
          },
        },
        '',
        window.location.pathname,
      );
    });

    await page.locator('ui-tabs [slot="tab"][value="rust"]').click();

    await expect(page).toHaveURL(`${tabsTestPath}?tab=rust`);

    const state = await page.evaluate(() => history.state as Record<string, unknown>);
    expect(state['customData']).toBe('value');
    expect(state['nested']).toEqual({ ok: true });
    expect(state['__routerUrl']).toBeUndefined();
    expect(state['__routerPath']).toBeUndefined();
  });

  test('タブクリックで URL が変わっても SPA 状態が維持されること', async ({ page }) => {
    await page.goto(tabsTestPath);
    await waitForTabsHydration(page, 0);

    await page.evaluate(() => {
      (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe = {
        alive: true,
      };
    });

    await page.evaluate(() => {
      const rustTab = document.querySelector<HTMLElement>('ui-tabs [slot="tab"][value="rust"]');
      rustTab?.click();
    });

    await expect(page).toHaveURL(`${tabsTestPath}?tab=rust`);

    const probeAlive = await page.evaluate(() => {
      return (
        (window as typeof window & { __spaProbe?: { alive: boolean } }).__spaProbe?.alive === true
      );
    });
    expect(probeAlive).toBe(true);
  });

  test('戻る / 進むでタブ状態が復元されること', async ({ page }) => {
    await page.goto(tabsTestPath);
    await waitForTabsHydration(page, 0);

    const tabs = page.locator('ui-tabs').first();
    const javascriptTab = tabs.locator('[slot="tab"][value="javascript"]');
    const rustTab = tabs.locator('[slot="tab"][value="rust"]');
    const panels = tabs.locator('[slot="panel"]');

    await page.evaluate(() => {
      const rustTab = document.querySelector<HTMLElement>('ui-tabs [slot="tab"][value="rust"]');
      rustTab?.click();
    });
    await expect(page).toHaveURL(`${tabsTestPath}?tab=rust`);
    await expect(panels.nth(1)).not.toHaveAttribute('hidden', '');

    await page.goBack();
    await expect(page).toHaveURL(tabsTestPath);
    await expect(javascriptTab).toHaveAttribute('aria-selected', 'true');

    await page.goForward();
    await expect(page).toHaveURL(`${tabsTestPath}?tab=rust`);
    await expect(rustTab).toHaveAttribute('aria-selected', 'true');
  });

  test('hash が query より優先され、URL が正規化されること', async ({ page }) => {
    await page.goto(`${tabsTestPath}?tab=javascript#rustのhello-world`);
    await waitForTabsHydration(page, 0);

    const tabs = page.locator('ui-tabs').first();
    const rustTab = tabs.locator('[slot="tab"][value="rust"]');
    const panels = tabs.locator('[slot="panel"]');

    await expect(rustTab).toHaveAttribute('aria-selected', 'true');
    await expect(panels.nth(1)).not.toHaveAttribute('hidden', '');
    await expect(page).toHaveURL(`${tabsTestPath}?tab=rust#rustのhello-world`);
  });
});
