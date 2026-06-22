import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { collectProductionHtmlReachableCssAssets } from './assert-production-css-artifacts.js';

interface ProductionFontAssetAssertionResult {
  readonly reachableCssAssets: string[];
  readonly fontPathnames: string[];
}

const DIST_DIR = 'dist';
const NOTO_SANS_JP_FONT_PATHNAME_PREFIX = '/assets/fonts/noto-sans-jp/';
const CSS_URL_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]*?))\s*\)/giu;

const normalizeNotoSansJpFontPathname = (rawUrl: string): string | null => {
  const trimmedUrl = rawUrl.trim();
  const pathname = (trimmedUrl.split('#', 1)[0] ?? '').split('?', 1)[0] ?? '';
  if (
    pathname.startsWith(NOTO_SANS_JP_FONT_PATHNAME_PREFIX) &&
    pathname.endsWith('.woff2') &&
    !pathname.slice(NOTO_SANS_JP_FONT_PATHNAME_PREFIX.length).includes('/')
  ) {
    return pathname;
  }

  return null;
};

const collectNotoSansJpFontPathnames = (css: string): string[] => {
  const pathnames = new Set<string>();

  for (const match of css.matchAll(CSS_URL_RE)) {
    const rawUrl = match[1] ?? match[2] ?? match[3];
    if (rawUrl === undefined) {
      continue;
    }

    const pathname = normalizeNotoSansJpFontPathname(rawUrl);
    if (pathname !== null) {
      pathnames.add(pathname);
    }
  }

  return [...pathnames].sort();
};

const toDistPath = (repoRoot: string, pathname: string): string =>
  path.join(repoRoot, DIST_DIR, ...pathname.split('/').filter((segment) => segment.length > 0));

const formatPathnameList = (pathnames: readonly string[]): string =>
  pathnames.slice(0, 20).join(', ');

export const assertProductionFontAssets = async (
  repoRoot = process.cwd(),
): Promise<ProductionFontAssetAssertionResult> => {
  const reachableCssAssets = await collectProductionHtmlReachableCssAssets(repoRoot);
  const fontPathnames = new Set<string>();

  for (const cssAsset of reachableCssAssets) {
    const cssPath = path.join(repoRoot, DIST_DIR, cssAsset);
    const css = readFileSync(cssPath, 'utf8');
    for (const pathname of collectNotoSansJpFontPathnames(css)) {
      fontPathnames.add(pathname);
    }
  }

  const sortedFontPathnames = [...fontPathnames].sort();
  if (sortedFontPathnames.length === 0) {
    throw new Error(
      '[production-font-assets] found no /assets/fonts/noto-sans-jp/*.woff2 URLs in production HTML reachable CSS assets.',
    );
  }

  const missingPathnames: string[] = [];
  const emptyPathnames: string[] = [];

  for (const pathname of sortedFontPathnames) {
    const fontPath = toDistPath(repoRoot, pathname);
    if (!existsSync(fontPath)) {
      missingPathnames.push(pathname);
      continue;
    }

    if (statSync(fontPath).size === 0) {
      emptyPathnames.push(pathname);
    }
  }

  if (missingPathnames.length > 0) {
    throw new Error(
      `[production-font-assets] missing ${missingPathnames.length.toString()} Noto Sans JP font asset(s); first pathnames: ${formatPathnameList(
        missingPathnames,
      )}`,
    );
  }

  if (emptyPathnames.length > 0) {
    throw new Error(
      `[production-font-assets] empty ${emptyPathnames.length.toString()} Noto Sans JP font asset(s); first pathnames: ${formatPathnameList(
        emptyPathnames,
      )}`,
    );
  }

  return {
    reachableCssAssets,
    fontPathnames: sortedFontPathnames,
  };
};

const isCliEntrypoint = (): boolean => {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
};

if (isCliEntrypoint()) {
  try {
    const result = await assertProductionFontAssets();
    console.log(`assert-production-font-assets: ok (${result.fontPathnames.length.toString()})`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
