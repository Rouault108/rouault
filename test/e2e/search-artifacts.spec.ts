import { expect, test } from '@playwright/test';

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
    await page.locator('search-page').waitFor();
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
    await page.locator('ui-search-trigger').first().click();
    await expect(page.locator('#global-search-dialog')).toHaveAttribute('opened');
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
    await page.locator('search-page').waitFor();
    await page.locator('ui-search-field.search-input-control input[type="search"]').first().waitFor();

    await page.locator('ui-details.filter-details').evaluate((element) => {
      const details = element as HTMLElement & { open?: boolean };
      details.open = true;
      details.setAttribute('open', '');
    });

    await expect(page.locator('ui-details.filter-details')).toHaveAttribute('open');
    await expect
      .poll(async () =>
        page.locator('search-page').evaluate((element) => {
          const host = element as HTMLElement & { shadowRoot: ShadowRoot };
          return host.shadowRoot.querySelector('.filter-panel') !== null;
        }),
      )
      .toBe(true);
  });
});
