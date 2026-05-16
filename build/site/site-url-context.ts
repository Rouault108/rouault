import { createSiteUrlContext, type SiteUrlContext } from '../../shared/site/site-url-context.js';

export interface ResolveBuildSiteUrlContextOptions {
  readonly siteOrigin?: unknown;
  readonly basePath?: unknown;
}

const TEST_FIXTURE_SITE_ORIGIN = 'https://rouault.invalid';

const readProductionSiteOriginSource = (explicit?: unknown): unknown =>
  explicit === undefined ? process.env['ROUAULT_SITE_ORIGIN'] : explicit;

const readDevelopmentSiteOriginSource = (explicit?: unknown): unknown =>
  explicit === undefined ? process.env['ROUAULT_DEV_SITE_ORIGIN'] : explicit;

const readBasePathSource = (explicit?: unknown): unknown =>
  explicit === undefined ? process.env['ROUAULT_BASE_PATH'] : explicit;

export const resolveProductionSiteUrlContext = (
  options: ResolveBuildSiteUrlContextOptions = {},
): SiteUrlContext =>
  createSiteUrlContext({
    siteOrigin: readProductionSiteOriginSource(options.siteOrigin),
    basePath: readBasePathSource(options.basePath),
  });

export const resolveDevelopmentSiteUrlContext = (
  options: ResolveBuildSiteUrlContextOptions = {},
): SiteUrlContext =>
  createSiteUrlContext({
    siteOrigin: readDevelopmentSiteOriginSource(options.siteOrigin) ?? TEST_FIXTURE_SITE_ORIGIN,
    basePath: readBasePathSource(options.basePath),
  });
