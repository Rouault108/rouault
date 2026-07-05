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
  { name: 'details', path: '/tools/ui-check/cases/details.html' },
  { name: 'footer', path: '/tools/ui-check/cases/footer.html' },
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
    await page.screenshot({
      path: path.join(screenshotDir, `${workbenchCase.name}.png`),
      fullPage: true,
    });
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
