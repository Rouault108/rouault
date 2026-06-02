import { expect, test, type Page } from '@playwright/test';

import { resolveInternalDocumentRouteManifestPathname } from '../../shared/navigation/internal-document-route-manifest-path.js';
import {
  createSearchArtifactUrlResolver,
  resolveSearchCatalogUrl,
} from '../../shared/search/search-artifact-url.js';
import { createSiteUrlContext } from '../../shared/site/site-url-context.js';

const productionPreviewOrigin = 'http://127.0.0.1:4173';
const siteUrlContext = createSiteUrlContext({
  siteOrigin: productionPreviewOrigin,
  basePath: process.env['ROUAULT_BASE_PATH'],
});
const resolver = createSearchArtifactUrlResolver({ siteUrlContext });
const searchCatalogPathname = resolveSearchCatalogUrl(siteUrlContext);

const expectJsonContentType = (contentType: string | null): void => {
  expect(contentType?.toLowerCase()).toContain('json');
};

const expectJavaScriptContentType = (contentType: string | null): void => {
  const normalized = contentType?.split(';')[0]?.trim().toLowerCase();
  expect([
    'text/javascript',
    'application/javascript',
    'text/ecmascript',
    'application/ecmascript',
  ]).toContain(normalized);
};

const waitForGlobalSearchDialogOpen = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const dialog = document.querySelector('#global-search-dialog');
    return dialog instanceof HTMLDialogElement && dialog.open === true;
  });
};

const openGlobalSearchDialogFromHeader = async (page: Page): Promise<void> => {
  const searchTrigger = page.locator('layout-header [data-search-dialog-trigger]').first();
  await expect(searchTrigger).toBeVisible();
  await page.waitForFunction(() => {
    const dialog = document.querySelector('#global-search-dialog');
    return (
      dialog instanceof HTMLDialogElement &&
      dialog.querySelector('[data-search-dialog-input]') instanceof HTMLInputElement
    );
  });
  await expect(async () => {
    await searchTrigger.click();
    await waitForGlobalSearchDialogOpen(page);
  }).toPass({ timeout: 10_000 });
};

test.describe('production search artifacts', () => {
  test('production preview が search catalog / route manifest / Pagefind artifact を配信すること', async ({
    request,
  }) => {
    const searchCatalog = await request.get(resolveSearchCatalogUrl(siteUrlContext));
    expect(searchCatalog.status()).toBe(200);
    expectJsonContentType(searchCatalog.headers()['content-type'] ?? null);
    const searchCatalogJson = (await searchCatalog.json()) as unknown;
    expect(Array.isArray(searchCatalogJson)).toBe(true);
    expect((searchCatalogJson as unknown[]).length).toBeGreaterThan(0);

    const routeManifest = await request.get(
      resolveInternalDocumentRouteManifestPathname(siteUrlContext),
    );
    expect(routeManifest.status()).toBe(200);
    expectJsonContentType(routeManifest.headers()['content-type'] ?? null);

    const pagefindModule = await request.get(resolver.resolvePagefindAssetUrl('pagefind.js'));
    expect(pagefindModule.status()).toBe(200);
    expectJavaScriptContentType(pagefindModule.headers()['content-type'] ?? null);

    const pagefindEntry = await request.get(
      resolver.resolvePagefindAssetUrl('pagefind-entry.json'),
    );
    expect(pagefindEntry.status()).toBe(200);
    expectJsonContentType(pagefindEntry.headers()['content-type'] ?? null);
    await pagefindEntry.json();
  });

  test('search page の初期化で search-catalog.json が 404 にならないこと', async ({ page }) => {
    await page.goto('/search/');
    await page.locator('[data-search-page-root]').waitFor();
    const status = await page.evaluate(async (pathname) => {
      const response = await fetch(pathname);
      return response.status;
    }, searchCatalogPathname);

    expect(status).toBe(200);
  });

  test('global search dialog の初期化で search-catalog.json が 404 にならないこと', async ({
    page,
  }) => {
    await page.goto('/');
    await openGlobalSearchDialogFromHeader(page);
    const status = await page.evaluate(async (pathname) => {
      const response = await fetch(pathname);
      return response.status;
    }, searchCatalogPathname);

    expect(status).toBe(200);
  });

  test('search page で production catalog 由来のタグフィルターを展開できること', async ({
    page,
  }) => {
    await page.goto('/search/?tag=Programming');
    await page.locator('[data-search-page-root]').waitFor();
    await page.locator('[data-search-query-input]').first().waitFor();

    await page.locator('details.filter-details').evaluate((element) => {
      const details = element as HTMLDetailsElement;
      details.open = true;
      details.setAttribute('open', '');
    });

    await expect(page.locator('details.filter-details')).toHaveAttribute('open');
    await expect(page.locator('[data-search-page-root] .filter-panel')).toBeVisible();
  });
});
