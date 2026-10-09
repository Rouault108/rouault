import { expect, test, type Page } from '@playwright/test';
import { e2eNoteFixtures } from './support/note-fixtures.js';
import { resolveRouterArtifactPathname } from '../../shared/navigation/router-artifact-path.js';

const a = (): string => e2eNoteFixtures.markdownBasic.normalizedPath;
const b = (): string => e2eNoteFixtures.code.normalizedPath;
const ready = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await customElements.whenDefined('router-document-host');
    const host = document.querySelector('router-document-host');
    if (!host) throw new Error('host');
    await host.whenReady();
  });
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-reading-position-status',
    'settled',
  );
};
const navigate = async (
  page: Page,
  url: string,
  historyMode: 'push' | 'replace' = 'push',
): Promise<void> => {
  await page.evaluate(
    async (target) => {
      const host = document.querySelector('router-document-host');
      if (!host) throw new Error('host');
      const result = await host.navigate(target.url, { historyMode: target.historyMode });
      if (!result.committed) throw new Error(result.outcome);
    },
    { url, historyMode },
  );
  await ready(page);
};
const read = async (page: Page, fraction = 0.45): Promise<number> => {
  const y = await page.evaluate((ratio) => {
    const root = document.scrollingElement;
    if (!root) throw new Error('scroll root');
    const max = root.scrollHeight - root.clientHeight;
    if (max < 700) throw new Error('十分に長いfixtureが必要です');
    const y = Math.floor(max * ratio);
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    return y;
  }, fraction);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
  // scroll sampleのeventを次layoutまでに処理する。
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  return y;
};
const at = async (page: Page, url: string, y: number): Promise<void> => {
  await expect
    .poll(() => page.evaluate(() => location.pathname + location.search + location.hash))
    .toBe(url);
  await ready(page);
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - y))
    .toBeLessThanOrEqual(2);
  await expect(page.locator('router-document-host')).toHaveCount(1);
  await expect(page.locator('main#main-content')).toHaveCount(1);
};

test.use({ viewport: { width: 1280, height: 720 } });

test('通常リンク先頭とA→B→Back→Forwardのentry位置（A1/A2/A9）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const firstUrl = await page.evaluate(() => location.pathname + location.search + location.hash);
  const ay = await read(page);
  await page.evaluate((url) => {
    const link = document.createElement('a');
    link.href = url;
    link.id = 'reading-next';
    link.textContent = '次の本文';
    link.style.cssText = 'position:fixed;top:60px;left:150px;z-index:9999';
    document.querySelector('#main-content')?.prepend(link);
  }, b());
  await page.locator('#reading-next').click();
  await at(page, b(), 0);
  const by = await read(page, 0.6);
  await page.goBack();
  await at(page, firstUrl, ay);
  await page.goForward();
  await at(page, b(), by);
});

test('同URLの二つのA entryは座標を共有しない（A3）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, a());
  const ay = await read(page, 0.25);
  const firstId: unknown = await page.evaluate(() => history.state.__rouaultHistoryEntry.id);
  await navigate(page, b());
  await read(page, 0.4);
  await navigate(page, a());
  const secondY = await read(page, 0.7);
  const secondId: unknown = await page.evaluate(() => history.state.__rouaultHistoryEntry.id);
  expect(secondId).not.toBe(firstId);
  await page.goBack();
  await ready(page);
  await page.goBack();
  await at(page, a(), ay);
  await page.goForward();
  await ready(page);
  await page.goForward();
  await at(page, a(), secondY);
});

test('hash entryでも読んだ座標を優先しsame-document focusを保つ（A2/A7）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const hash = await page.locator('#main-content h2[id]').nth(1).getAttribute('id');
  if (!hash) throw new Error('heading');
  await navigate(page, `${a()}#${encodeURIComponent(hash)}`);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const y = await read(page, 0.7);
  await navigate(page, b());
  await read(page);
  await page.goBack();
  await at(page, `${a()}#${encodeURIComponent(hash)}`, y);
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('main-content');
});

test('遅い未commitのBを同hashの本人TOC再選択で取消す（B2/A6）', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const initialLink = page.locator('[data-layout-toc-nav] [data-toc-link]').first();
  await initialLink.click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested: (() => void) | undefined;
  const seen = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route(`**${resolveRouterArtifactPathname(b())}`, async (route) => {
    requested?.();
    await gate;
    await route.continue().catch(() => {
      /* 取消されたrequestに遅い応答を適用しない。 */
    });
  });
  try {
    await page.evaluate((url) => {
      void document.querySelector('router-document-host')?.navigate(url);
    }, b());
    await seen;
    const link = page.locator('[data-layout-toc-nav] [data-toc-link]').first();
    await expect(link).toBeVisible();
    await link.click();
    const ownedUrl = await page.evaluate(() => location.pathname + location.search + location.hash);
    release?.();
    await expect(page.locator('#main-content')).not.toHaveAttribute('aria-busy', 'true');
    expect(await page.evaluate(() => location.pathname + location.search + location.hash)).toBe(
      ownedUrl,
    );
    expect(ownedUrl).toContain('#');
    expect(ownedUrl).not.toBe(b());
  } finally {
    release?.();
  }
});

test('artifact待機中の本人wheel後はcommitしてもtopとfocusを奪わない（A6）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await read(page, 0.3);
  let release!: () => void;
  let requested!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const seen = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route(`**${resolveRouterArtifactPathname(b())}`, async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  try {
    await page.evaluate((url) => {
      const host = document.querySelector('router-document-host');
      if (!host) throw new Error('host');
      void host.navigate(url).then((result) => {
        host.dataset['readingRequestOutcome'] = result.outcome;
      });
    }, b());
    await seen;
    await page.mouse.wheel(0, 100);
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'reading-precommit-focus';
      button.textContent = '本人操作';
      document.body.append(button);
      button.focus({ preventScroll: true });
      window.scrollTo({ top: 400, behavior: 'instant' });
    });
    release();
    await expect(page.locator('router-document-host')).toHaveAttribute(
      'data-reading-request-outcome',
      'completed',
    );
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-reading-position-status',
      'cancelled',
    );
    expect(new URL(page.url()).pathname).toBe(b());
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('reading-precommit-focus');
  } finally {
    release();
  }
});

test('Back連打で未表示Bの応答が最終Aを上書きしない（A5）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, a());
  const ay = await read(page, 0.35);
  await navigate(page, b());
  await read(page);
  await navigate(page, e2eNoteFixtures.layoutRich.normalizedPath);
  await read(page);
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**${resolveRouterArtifactPathname(b())}`, async (route) => {
    await gate;
    await route.continue().catch(() => {
      /* 取消されたrequestに遅い応答を適用しない。 */
    });
  });
  try {
    await page.evaluate(() => history.back());
    await expect.poll(() => page.evaluate(() => location.pathname)).toBe(b());
    await page.evaluate(() => history.back());
    release?.();
    await at(page, a(), ay);
  } finally {
    release?.();
  }
});

test('native fragment補記はentryを増やさず離脱元stateをcopyしない（B1/A4）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const count = await page.evaluate(() => {
    history.replaceState({ ...history.state, sentinel: 'from-source' }, '', location.href);
    return history.length;
  });
  const hash = await page.locator('#main-content h2[id]').first().getAttribute('id');
  if (!hash) throw new Error('heading');
  await page.evaluate((id) => {
    const anchor = document.createElement('a');
    anchor.id = 'reading-native-fragment';
    anchor.href = `#${encodeURIComponent(id)}`;
    anchor.textContent = '見出しへ';
    anchor.style.cssText = 'position:fixed;top:60px;left:150px;z-index:9999';
    document.querySelector('#main-content')?.prepend(anchor);
  }, hash);
  await page.locator('#reading-native-fragment').click();
  await expect
    .poll(() => page.evaluate(() => history.state?.__rouaultHistoryEntry?.version))
    .toBe(1);
  expect(await page.evaluate(() => history.length)).toBe(count + 1);
  expect(await page.evaluate(() => history.state?.sentinel)).toBeUndefined();
  const secondHash = await page.locator('#main-content h2[id]').nth(1).getAttribute('id');
  if (!secondHash) throw new Error('second heading');
  await page.evaluate((id) => {
    location.replace(`#${encodeURIComponent(id)}`);
  }, secondHash);
  await expect
    .poll(() => page.evaluate(() => location.hash))
    .toBe(`#${encodeURIComponent(secondHash)}`);
  expect(await page.evaluate(() => history.length)).toBe(count + 1);
});

test('reloadは継承manualをautoへ返しnativeの座標を尊重する（A8、Pなし）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const y = await read(page, 0.5);
  await page.reload();
  await page.evaluate(async () => {
    await customElements.whenDefined('router-document-host');
    await document.querySelector('router-document-host')?.whenReady();
  });
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - y))
    .toBeLessThanOrEqual(2);
});

test('no-JSの通常link/hash/Backで本文を読める（A9）', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    ...(baseURL ? { baseURL } : {}),
  });
  try {
    const page = await context.newPage();
    await page.goto(e2eNoteFixtures.markdownBasic.directPath);
    await expect(page.locator('#main-content h1')).toBeVisible();
    const hashLink = page.locator('[data-layout-toc-nav] a[href*="#"]').first();
    await hashLink.click();
    expect(new URL(page.url()).hash).not.toBe('');
    await page.evaluate((url) => {
      const anchor = document.createElement('a');
      anchor.id = 'reading-no-js-next';
      anchor.href = url;
      anchor.textContent = '次へ';
      anchor.style.cssText = 'position:fixed;top:60px;left:150px;z-index:9999';
      document.querySelector('#main-content')?.prepend(anchor);
    }, e2eNoteFixtures.code.directPath);
    await page.locator('#reading-no-js-next').click();
    await expect(page.locator('#main-content h1')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#main-content h1')).toBeVisible();
    expect(new URL(page.url()).hash).not.toBe('');
    await page.goForward();
    await expect(page).toHaveURL(e2eNoteFixtures.code.directPath);
  } finally {
    await context.close();
  }
});

test('遅い寸法未確定画像は2frame後もpendingで解放後に保存座標へ戻る（R1/A5）', async ({ page }) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, a());
  const y = await read(page, 0.65);
  await navigate(page, b());
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/reading-late.svg', async (route) => {
    await gate;
    await route
      .fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300"><rect width="500" height="300" fill="gray"/></svg>',
      })
      .catch(() => {
        /* この観測点では追加処理を行わない。 */
      });
  });
  await page.route(`**${resolveRouterArtifactPathname(a())}`, async (route) => {
    const response = await route.fetch();
    const envelope = (await response.json()) as { document: { html: string } };
    envelope.document.html =
      '<img src="/reading-late.svg" alt="遅延画像">' + envelope.document.html;
    await route.fulfill({ response, json: envelope });
  });
  try {
    await page.goBack();
    await expect(page.locator('#main-content img[src="/reading-late.svg"]')).toHaveCount(1);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-reading-position-status',
      'pending',
    );
    release();
    await at(page, a(), y);
  } finally {
    release();
  }
});

for (const action of ['wheel', 'PageDown', 'pointer'] as const)
  test(`復元待機中の本人${action}後に遅延画像を解放しても位置とfocusを奪わない（A6）`, async ({
    page,
  }) => {
    await page.goto(e2eNoteFixtures.markdownBasic.directPath);
    await ready(page);
    await navigate(page, a());
    await read(page, 0.7);
    await navigate(page, b());
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/reading-cancel.svg', async (route) => {
      await gate;
      await route
        .fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300"/>',
        })
        .catch(() => {
          /* この観測点では追加処理を行わない。 */
        });
    });
    await page.route(`**${resolveRouterArtifactPathname(a())}`, async (route) => {
      const response = await route.fetch();
      const envelope = (await response.json()) as { document: { html: string } };
      envelope.document.html =
        '<img src="/reading-cancel.svg" alt="遅延画像">' + envelope.document.html;
      await route.fulfill({ response, json: envelope });
    });
    try {
      await page.goBack();
      await expect(page.locator('#main-content img[src="/reading-cancel.svg"]')).toHaveCount(1);
      if (action === 'wheel') await page.mouse.wheel(0, 120);
      else if (action === 'PageDown') {
        await page.keyboard.press('PageDown');
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
        await page.evaluate(async () => {
          let previous = scrollY;
          let stable = 0;
          const deadline = performance.now() + 2000;
          while (stable < 4 && performance.now() < deadline) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            stable = Math.abs(scrollY - previous) <= 1 ? stable + 1 : 0;
            previous = scrollY;
          }
        });
      } else await page.mouse.click(400, 200);
      await expect(page.locator('#main-content')).toHaveAttribute(
        'data-reading-position-status',
        'cancelled',
      );
      await page.evaluate(() => {
        const image = document.querySelector<HTMLImageElement>('img[src="/reading-cancel.svg"]');
        // layout shift自身と旧jobの再移動を区別するため、取消後に画像の寸法を固定する。
        if (image) {
          image.width = 500;
          image.height = 300;
        }
        window.scrollTo({ top: 400, behavior: 'instant' });
        const button = document.createElement('button');
        button.id = 'reading-user-focus';
        document.querySelector('#main-content')?.append(button);
        button.focus({ preventScroll: true });
      });
      release();
      await expect(page.locator('#main-content img[src="/reading-cancel.svg"]')).toHaveJSProperty(
        'complete',
        true,
      );
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect(Math.abs((await page.evaluate(() => scrollY)) - 400)).toBeLessThanOrEqual(2);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('reading-user-focus');
    } finally {
      release();
    }
  });

test('same-document Backのfocus保持と後続hashchange/refreshで座標優先を維持する（A7/R4）', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, e2eNoteFixtures.layoutRich.normalizedPath);
  const links = page.locator('[data-layout-toc-nav] [data-toc-link]');
  await links.first().click();
  const firstUrl = await page.evaluate(() => location.pathname + location.search + location.hash);
  const y = await read(page, 0.65);
  await page.mouse.wheel(0, 1);
  const currentLink = page.locator(
    '[data-layout-toc-nav] [data-toc-link][aria-current="location"]',
  );
  const hashId = await links.first().getAttribute('data-heading-id');
  await expect.poll(() => currentLink.getAttribute('data-heading-id')).not.toBeNull();
  await expect.poll(() => currentLink.getAttribute('data-heading-id')).not.toBe(hashId);
  const viewportHeading = await currentLink.getAttribute('data-heading-id');
  const firstId: unknown = await page.evaluate(() => history.state.__rouaultHistoryEntry.id);
  await links.nth(1).click();
  await page.evaluate(() => {
    const button = document.createElement('button');
    button.id = 'reading-same-focus';
    document.querySelector('#main-content')?.append(button);
    button.focus({ preventScroll: true });
  });
  await page.goBack();
  await at(page, firstUrl, y);
  expect(await page.evaluate(() => history.state.__rouaultHistoryEntry.id)).toBe(firstId);
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('reading-same-focus');
  await page.evaluate(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.dispatchEvent(new Event('resize'));
    document.dispatchEvent(new CustomEvent('ui-tab-change', { bubbles: true }));
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThanOrEqual(2);
  await expect(currentLink).toHaveAttribute('data-heading-id', viewportHeading ?? '');
});

test('短文化したentryは現在rangeへclampし保存座標の到達を無限待機しない（A8）', async ({
  page,
}) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, a());
  const y = await read(page, 0.75);
  await navigate(page, b());
  await page.route(`**${resolveRouterArtifactPathname(a())}`, async (route) => {
    const response = await route.fetch();
    const envelope = (await response.json()) as { document: { html: string } };
    envelope.document.html = '<article><h1>短い本文</h1><p>短文化後も読める。</p></article>';
    await route.fulfill({ response, json: envelope });
  });
  await page.goBack();
  await ready(page);
  const max = await page.evaluate(() => {
    const root = document.scrollingElement;
    return root ? Math.max(0, root.scrollHeight - root.clientHeight) : 0;
  });
  expect(max).toBeLessThan(y);
  await at(page, a(), max);
  await expect(page.locator('#main-content h1')).toHaveText('短い本文');
});

for (const surface of ['tabs', 'search'] as const)
  test(`遅い未commit requestを本人${surface}の同値選択でも失効する（B2/A6）`, async ({ page }) => {
    await page.goto(surface === 'tabs' ? e2eNoteFixtures.interactive.directPath : '/search/');
    await ready(page);
    if (surface === 'search')
      await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
        'data-enhanced',
        'true',
      );
    let release!: () => void;
    let requested!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const seen = new Promise<void>((resolve) => {
      requested = resolve;
    });
    await page.route(`**${resolveRouterArtifactPathname(b())}`, async (route) => {
      requested();
      await gate;
      await route.continue().catch(() => {
        /* 取消されたrequestへ応答を適用しない。 */
      });
    });
    try {
      await page.evaluate((url) => {
        const host = document.querySelector('router-document-host');
        if (!host) throw new Error('host');
        void host.navigate(url).then((result) => {
          host.dataset['readingRequestOutcome'] = result.outcome;
        });
      }, b());
      await seen;
      if (surface === 'tabs')
        await page.getByRole('tab', { name: 'JavaScript', exact: true }).click();
      else {
        const menu = page.locator('[data-search-choice-menu="tag-mode"]').first();
        await menu.locator('[data-static-choice-trigger]').click();
        await menu.locator('[data-static-choice-item][data-value="or"]').click();
      }
      const ownedUrl = page.url();
      release();
      await expect(page.locator('router-document-host')).toHaveAttribute(
        'data-reading-request-outcome',
        'superseded',
      );
      expect(page.url()).toBe(ownedUrl);
      if (surface === 'tabs')
        await expect(page.getByRole('tab', { name: 'JavaScript', exact: true })).toHaveAttribute(
          'aria-selected',
          'true',
        );
      else await expect(page.locator('[data-search-page-root]')).toHaveCount(1);
    } finally {
      release();
    }
  });

for (const start of ['/search/', '/tags/Programming/'])
  test(`${start}のfeature pushはbaselineを保ちrouter Backは新SSRへ交代する（R5）`, async ({
    page,
  }) => {
    await page.goto(start);
    await ready(page);
    const surface = page.locator('[data-search-page-root]');
    await expect(surface).toHaveAttribute('data-search-page-capability', 'ready');
    const original = await page.evaluate(() => {
      const baseline = document.querySelector<HTMLElement>('[data-search-page-baseline]');
      if (!baseline) throw new Error('baseline');
      baseline.dataset['readingBaselineOwner'] = 'original';
      return {
        url: location.pathname + location.search,
        id: history.state.__rouaultHistoryEntry.id as string,
        html: baseline.innerHTML,
      };
    });
    const menu = page.locator('[data-search-choice-menu="sort"]').first();
    await menu.locator('[data-static-choice-trigger]').click();
    await menu.locator('[data-static-choice-item][data-value="date-desc"]').click();
    await expect
      .poll(() => page.evaluate(() => location.pathname + location.search))
      .not.toBe(original.url);
    await expect(page.locator('[data-search-page-baseline]')).toHaveAttribute(
      'data-reading-baseline-owner',
      'original',
    );
    expect(await page.locator('[data-search-page-baseline]').innerHTML()).toBe(original.html);
    expect(await page.evaluate(() => history.state.__rouaultHistoryEntry.id)).not.toBe(original.id);
    await page.goBack();
    await ready(page);
    await expect
      .poll(() => page.evaluate(() => location.pathname + location.search))
      .toBe(original.url);
    expect(await page.evaluate(() => history.state.__rouaultHistoryEntry.id)).toBe(original.id);
    await expect(page.locator('[data-search-page-baseline]')).not.toHaveAttribute(
      'data-reading-baseline-owner',
      'original',
    );
    expect(await page.locator('[data-search-page-baseline]').innerHTML()).toBe(original.html);
    await page.goForward();
    await ready(page);
    await expect.poll(() => page.evaluate(() => location.search)).toContain('sort=date-desc');
    await expect(page.locator('[data-search-page-baseline]')).not.toHaveAttribute(
      'data-reading-baseline-owner',
      'original',
    );
    await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
      'data-search-page-surface',
      'search',
    );
  });

test('BFCacheはpersisted観測時だけ同epoch/viewportの再開を判定する（A8）', async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('pageshow', (event) => {
      document.documentElement.dataset['readingBfcachePersisted'] = String(event.persisted);
    });
    document.addEventListener('app-content:hydration-ready', (event) => {
      document.documentElement.dataset['readingProbeEpoch'] = String(
        (event as CustomEvent<{ contentEpoch: number }>).detail.contentEpoch,
      );
    });
  });
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const epoch = await page.locator('html').getAttribute('data-reading-probe-epoch');
  const y = await read(page, 0.5);
  await page.goto('/about/');
  await page.goBack();
  const persisted = await page.locator('html').getAttribute('data-reading-bfcache-persisted');
  if (persisted !== 'true') {
    test.info().annotations.push({
      type: 'BFCache',
      description: 'pageshow.persisted未観測。このrunをBFCache成功に数えない。',
    });
    await expect(page.locator('#main-content h1')).toBeVisible();
    return;
  }
  await expect(page.locator('html')).toHaveAttribute('data-reading-probe-epoch', epoch ?? '');
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => scrollY)) - y))
    .toBeLessThanOrEqual(2);
  await expect.poll(() => page.evaluate(() => history.scrollRestoration)).toBe('manual');
});

test('opaque/未知schemaのreloadはstateを包まずautoでnative位置を尊重する（A8/R3）', async ({
  page,
}) => {
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  for (const state of [7, ['opaque'], { __rouaultHistoryEntry: { version: 99, id: 'unknown' } }]) {
    const y = await read(page, 0.5);
    await page.evaluate((opaque) => history.replaceState(opaque, '', location.href), state);
    await page.reload();
    await ready(page);
    expect(await page.evaluate(() => history.state)).toEqual(state);
    expect(await page.evaluate(() => history.scrollRestoration)).toBe('auto');
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => scrollY)) - y))
      .toBeLessThanOrEqual(2);
  }
});
