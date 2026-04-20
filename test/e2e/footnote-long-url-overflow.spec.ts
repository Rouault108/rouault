import { expect, test } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const footnoteLongUrlPath = e2eNoteFixtures.footnoteLongUrl.directPath;

test.describe('footnote long url overflow contract', () => {
  test.use({
    viewport: {
      width: 375,
      height: 812,
    },
  });

  test('mobile viewport でも長い脚注 URL が page width を押し広げないこと', async ({ page }) => {
    await page.goto(footnoteLongUrlPath);
    await page.locator('article').waitFor();

    await expect
      .poll(async () => {
        return await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
      })
      .toBeGreaterThan(0);

    const metrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const scrollingElement = document.scrollingElement;
      const footnoteLink = document.querySelector(
        'section.footnotes a[href^="https://example.com/footnote-overflow-check/"]',
      ) as HTMLAnchorElement | null;
      const computed = footnoteLink ? getComputedStyle(footnoteLink) : null;

      return {
        clientWidth: docEl.clientWidth,
        scrollWidth: scrollingElement?.scrollWidth ?? -1,
        overflowWrap: computed?.overflowWrap ?? null,
      };
    });

    expect(metrics.overflowWrap).toBe('anywhere');
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  });
});