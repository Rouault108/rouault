import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const screenshotDir = path.resolve(process.cwd(), '.generated/ui-check/screenshots');

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

