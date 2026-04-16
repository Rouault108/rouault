import { expect, test } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const sourcePath = e2eNoteFixtures.sampleJavascript.directPath;

const waitForAppRouterReady = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.waitForFunction(async () => {
    await customElements.whenDefined('app-router');

    const router = document.querySelector('app-router') as
      | (HTMLElement & { whenReady?: () => Promise<void> })
      | null;
    if (!router || typeof router.whenReady !== 'function') {
      return false;
    }

    await router.whenReady();
    return true;
  });
};

test.describe('dev router artifact', () => {
  test('開発サーバーでも footer の About 遷移が router artifact を 200 で返すこと', async ({
    page,
  }) => {
    await page.goto(sourcePath);
    await waitForAppRouterReady(page);

    const aboutLink = page.locator('layout-footer a[href="/about/"]').first();
    await expect(aboutLink).toBeVisible();

    const artifactResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/__router/about/index.router.json';
    });

    await aboutLink.click();

    const artifactResponse = await artifactResponsePromise;
    expect(artifactResponse.status()).toBe(200);

    await expect(page).toHaveURL('/about/');
    await expect(page.locator('#main-content')).not.toContainText(
      'このページは見つかりませんでした',
    );

    await expect(page.locator('#main-content')).toContainText(
      '個人ノートを、静かに読むためのアプリケーション',
    );
  });
});