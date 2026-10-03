import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import { searchPageFixture } from '../fixtures/search-page-fixture.js';

const screenshotDir = path.resolve(process.cwd(), '.generated/ui-check/screenshots');
const mainStylesheetHref = '/src/assets/css/main.css';

const cases = [
  { name: 'index', path: '/tools/ui-check/' },
  { name: 'article-header', path: '/tools/ui-check/cases/article-header.html' },
  { name: 'callout', path: '/tools/ui-check/cases/callout.html' },
  { name: 'code-surface', path: '/tools/ui-check/cases/code-surface.html' },
  { name: 'code-surface-dark', path: '/tools/ui-check/cases/code-surface-dark.html' },
  { name: 'details', path: '/tools/ui-check/cases/details.html' },
  { name: 'footer', path: '/tools/ui-check/cases/footer.html' },
  { name: 'not-found', path: '/tools/ui-check/cases/not-found.html' },
  { name: 'reading-interactions', path: '/tools/ui-check/cases/reading-interactions.html' },
  { name: 'video', path: '/tools/ui-check/cases/video.html' },
  { name: 'search-controls', path: '/tools/ui-check/cases/search-controls.html' },
  { name: 'table-overflow', path: '/tools/ui-check/cases/table-overflow.html' },
  { name: 'typography', path: '/tools/ui-check/cases/typography.html' },
] as const;

test('captures ui-check workbench screenshots', async ({ page }) => {
  await mkdir(screenshotDir, { recursive: true });

  await page.goto('/tools/ui-check/');
  await expect(page.getByRole('heading', { name: 'UI Check Workbench' })).toBeVisible();

  for (const workbenchCase of cases) {
    await page.goto(workbenchCase.path);
    await page.evaluate(() => document.fonts.ready);
    if (workbenchCase.name === 'video') {
      await page.locator('#video-default .player-shell').waitFor({ state: 'visible' });
    }
    if (workbenchCase.name === 'reading-interactions') {
      await page.locator('#tabs-horizontal [role="tab"]').first().waitFor({ state: 'visible' });
    }
    await page.screenshot({
      path: path.join(screenshotDir, `${workbenchCase.name}.png`),
      fullPage: true,
    });
  }
});

// 表示準備と撮影だけを行う。操作・a11yの契約判定はtest/browserとtest/e2eが所有する。
test('captures retained surfaces under viewing preferences', async ({ page }) => {
  await mkdir(screenshotDir, { recursive: true });
  for (const preference of [
    'light',
    'dark',
    'mobile',
    'forced-colors',
    'reduced-motion',
    'print',
  ] as const) {
    await page.setViewportSize(
      preference === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    );
    await page.emulateMedia({
      media: preference === 'print' ? 'print' : 'screen',
      colorScheme: preference === 'dark' ? 'dark' : 'light',
      forcedColors: preference === 'forced-colors' ? 'active' : 'none',
      reducedMotion: preference === 'reduced-motion' ? 'reduce' : 'no-preference',
    });
    for (const name of ['footer', 'not-found', 'reading-interactions', 'video'] as const) {
      await page.goto(`/tools/ui-check/cases/${name}.html`);
      await page.evaluate(() => document.fonts.ready);
      if (name === 'reading-interactions') {
        if (preference !== 'print') {
          await page.locator('#preview-responsive').scrollIntoViewIfNeeded();
          await expect(
            page.locator('#preview-responsive [data-command-menu]').first(),
          ).toBeVisible();
        }
        await page
          .locator('#tabs-horizontal [role="tab"]')
          .first()
          .waitFor({ state: preference === 'print' ? 'attached' : 'visible' });
        if (preference !== 'print') {
          await page.locator('#translation-popover > summary').click();
          await page
            .locator('#translation-popover > [data-translation-content]')
            .waitFor({ state: 'visible' });
        }
      }
      if (name === 'video' && preference !== 'print') {
        await page.locator('#video-default .player-shell').waitFor({ state: 'visible' });
      }
      await page.screenshot({
        path: path.join(screenshotDir, `${name}-${preference}.png`),
        fullPage: true,
      });
      if (name === 'reading-interactions' && preference !== 'print') {
        await page.locator('#translation-popover > summary').press('Escape');
        await expect(
          page.locator('#translation-popover > [data-translation-content]'),
        ).toBeHidden();
        await page.locator('#translation-drawer > summary').click();
        await page
          .locator('#translation-drawer > [data-translation-content]')
          .waitFor({ state: 'visible' });
        await page.screenshot({
          path: path.join(screenshotDir, `translation-drawer-${preference}.png`),
          fullPage: true,
        });
      }
    }
  }
});

test('keeps ui-check pages on direct stylesheet loading', async ({ page }) => {
  for (const workbenchCase of cases) {
    await page.goto(workbenchCase.path);
    await expect(page.locator(`link[rel="stylesheet"][href="${mainStylesheetHref}"]`)).toHaveCount(
      1,
    );
    await expect(page.locator('script[src$="ui-check-entry.ts"]')).toHaveCount(0);
  }
});

test('renders generated search controls operational smoke surface', async ({ page }) => {
  await page.goto('/tools/ui-check/cases/search-controls.html');

  await expect(page.locator('form.search-controls[data-search-page-form]')).toBeVisible();
  await expect(page.locator('.toolbar-row')).toBeVisible();
  await expect(page.locator('[data-search-choice="tag-mode"]')).toBeVisible();
  await expect(page.locator('[data-search-choice="sort"]')).toBeVisible();
  await expect(page.locator('.results-section[data-search-page-results-section]')).toBeVisible();
  await expect(page.locator('details.filter-details')).toHaveCount(1);
  await expect(page.locator('details.filter-details')).toHaveAttribute('open', '');
  await expect(page.locator('[data-search-page-result-count]')).toHaveText(
    `${searchPageFixture.initialResponse.total.toString()}件の結果`,
  );
});
