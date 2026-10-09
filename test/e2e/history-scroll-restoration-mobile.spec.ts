import { expect, test } from '@playwright/test';
import { e2eNoteFixtures } from './support/note-fixtures.js';
import { resolveRouterArtifactPathname } from '../../shared/navigation/router-artifact-path.js';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('mobile viewportのtouchmoveで待機復元を中断する', async ({ page }) => {
  const first = e2eNoteFixtures.markdownBasic.normalizedPath;
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-reading-position-status',
    'settled',
  );
  for (const url of [first, e2eNoteFixtures.code.normalizedPath]) {
    await page.evaluate(async (target) => {
      await document.querySelector('router-document-host')?.navigate(target);
    }, url);
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-reading-position-status',
      'settled',
    );
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
  }
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/reading-touch.svg', async (route) => {
    await gate;
    await route
      .fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"/>',
      })
      .catch(() => {
        /* この観測点では追加処理を行わない。 */
      });
  });
  await page.route(`**${resolveRouterArtifactPathname(first)}`, async (route) => {
    const response = await route.fetch();
    const envelope = (await response.json()) as { document: { html: string } };
    envelope.document.html =
      '<img src="/reading-touch.svg" alt="遅延画像">' + envelope.document.html;
    await route.fulfill({ response, json: envelope });
  });
  try {
    await page.goBack();
    await expect(page.locator('#main-content img[src="/reading-touch.svg"]')).toHaveCount(1);
    await page.evaluate(() => {
      window.dispatchEvent(new TouchEvent('touchmove'));
      const image = document.querySelector<HTMLImageElement>('img[src="/reading-touch.svg"]');
      if (image) {
        image.width = 300;
        image.height = 300;
      }
      window.scrollTo({ top: 400, behavior: 'instant' });
    });
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-reading-position-status',
      'cancelled',
    );
    release();
    await expect(page.locator('#main-content img[src="/reading-touch.svg"]')).toHaveJSProperty(
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
  } finally {
    release();
  }
});
