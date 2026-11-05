import { pathToFileURL } from 'node:url';

import { collectProductionHtmlReachableCssAssets } from './assert-production-css-artifacts.js';
import { resolveProductionSiteUrlContext } from '../build/site/site-url-context.js';
import { collectGeistMonoFontFaceUrls } from '../build/assets/font-face-sources.js';
import type { SiteUrlContext } from '../shared/site/site-url-context.js';
import {
  assertProductionAssetFile,
  productionAssetUrl,
  readProductionCssAsset,
  resolveProductionAssetReference,
} from './production-asset-reference.js';
import { stripBasePathFromPathname } from '../shared/url/normalize-rouault-url.js';

interface ProductionFontAssetAssertionResult {
  readonly reachableCssAssets: string[];
  readonly fontPathnames: string[];
  readonly geistFontPathnames: string[];
}

const NOTO_SANS_JP_FONT_PATHNAME_PREFIX = '/assets/fonts/noto-sans-jp/';
const CSS_URL_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]*?))\s*\)/giu;

const normalizeNotoSansJpFontPathname = (
  rawUrl: string,
  context: SiteUrlContext,
): string | null => {
  const trimmedUrl = rawUrl.trim();
  const pathname = stripBasePathFromPathname(
    (trimmedUrl.split('#', 1)[0] ?? '').split('?', 1)[0] ?? '',
    context.basePath,
  );
  if (
    pathname.startsWith(NOTO_SANS_JP_FONT_PATHNAME_PREFIX) &&
    pathname.endsWith('.woff2') &&
    !pathname.slice(NOTO_SANS_JP_FONT_PATHNAME_PREFIX.length).includes('/')
  ) {
    return pathname;
  }

  return null;
};

const collectNotoSansJpFontPathnames = (css: string, context: SiteUrlContext): string[] => {
  const pathnames = new Set<string>();

  for (const match of css.matchAll(CSS_URL_RE)) {
    const rawUrl = match[1] ?? match[2] ?? match[3];
    if (rawUrl === undefined) {
      continue;
    }

    const pathname = normalizeNotoSansJpFontPathname(rawUrl, context);
    if (pathname !== null) {
      pathnames.add(pathname);
    }
  }

  return [...pathnames].sort();
};

export const assertProductionFontAssets = async (
  repoRoot = process.cwd(),
): Promise<ProductionFontAssetAssertionResult> => {
  const context = resolveProductionSiteUrlContext();
  const reachableCssAssets = await collectProductionHtmlReachableCssAssets(repoRoot, context);
  const fontPathnames = new Set<string>();
  const geistFontPathnames = new Set<string>();

  for (const cssAsset of reachableCssAssets) {
    const css = readProductionCssAsset(repoRoot, cssAsset);
    for (const rawUrl of collectGeistMonoFontFaceUrls(css, cssAsset)) {
      const reference = resolveProductionAssetReference(
        rawUrl,
        productionAssetUrl(cssAsset, context),
        context,
      );
      assertProductionAssetFile(repoRoot, reference.assetPath, 'Geist Mono Variable');
      geistFontPathnames.add(reference.pathname);
    }
    for (const pathname of collectNotoSansJpFontPathnames(css, context)) {
      fontPathnames.add(pathname);
    }
  }

  const sortedFontPathnames = [...fontPathnames].sort();
  if (sortedFontPathnames.length === 0) {
    throw new Error(
      '[production-font-assets] found no /assets/fonts/noto-sans-jp/*.woff2 URLs in production HTML reachable CSS assets.',
    );
  }

  for (const pathname of sortedFontPathnames) {
    assertProductionAssetFile(repoRoot, pathname.slice(1), 'Noto Sans JP');
  }

  if (geistFontPathnames.size === 0) {
    throw new Error(
      '[production-font-assets] found no Geist Mono Variable @font-face URLs in production HTML directly linked CSS assets.',
    );
  }

  return {
    reachableCssAssets,
    fontPathnames: sortedFontPathnames,
    geistFontPathnames: [...geistFontPathnames].sort(),
  };
};

const isCliEntrypoint = (): boolean => {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
};

if (isCliEntrypoint()) {
  try {
    const result = await assertProductionFontAssets();
    console.log(
      `assert-production-font-assets: ok (Noto Sans JP: ${result.fontPathnames.length.toString()}, Geist Mono: ${result.geistFontPathnames.length.toString()})`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
