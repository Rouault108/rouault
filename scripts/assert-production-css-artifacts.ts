import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import postcss, { type Rule } from 'postcss';

import {
  TOC_MOBILE_PANEL_CSS_ARTIFACT_PATH,
  TOC_MOBILE_PANEL_STYLING_SELECTOR,
} from '../src/toc/toc-mobile-panel-dom-css-contract.js';

interface ManifestEntry {
  readonly file?: unknown;
  readonly src?: unknown;
  readonly isEntry?: unknown;
}

interface ProductionCssArtifactResult {
  readonly htmlFiles: string[];
  readonly reachableCssAssets: string[];
  readonly manifestCssAssets: string[];
  readonly matchingCssAssets: string[];
}

const DIST_DIR = 'dist';
const MANIFEST_PATH = '.generated/client/.vite/manifest.json';
const STYLESHEET_LINK_RE = /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/giu;
const HREF_RE = /\bhref=["']([^"']+)["']/iu;
const REQUIRED_CSS_PATTERNS = [
  /\.layout-toc-mobile-panel\b/u,
  /\.layout-toc-mobile-panel\[data-hydration-state=['"]?disposed['"]?\]/u,
  /@media\s*\(\s*min-width\s*:\s*640px\s*\)/u,
  /@media\s*\(\s*max-width\s*:\s*639px\s*\)/u,
] as const;

interface ExpectedDeclaration {
  readonly property: string;
  readonly value: string;
}

const normalizeCssValue = (value: string): string =>
  value
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/\s*,\s*/gu, ', ')
    .replace(/\(\s+/gu, '(')
    .replace(/\s+\)/gu, ')');

const collectRuleDeclarations = (rule: Rule): Map<string, Set<string>> => {
  const declarations = new Map<string, Set<string>>();

  rule.each((node) => {
    if (node.type !== 'decl') {
      return;
    }
    const values = declarations.get(node.prop) ?? new Set<string>();
    values.add(normalizeCssValue(node.value));
    declarations.set(node.prop, values);
  });

  return declarations;
};

const ruleHasDeclarations = (
  rule: Rule,
  expectedDeclarations: readonly ExpectedDeclaration[],
): boolean => {
  const declarations = collectRuleDeclarations(rule);

  return expectedDeclarations.every(
    (expected) =>
      declarations.get(expected.property)?.has(normalizeCssValue(expected.value)) === true,
  );
};

const expectRuleHasDeclarations = (
  css: string,
  selectorPredicate: (selector: string) => boolean,
  declarations: readonly ExpectedDeclaration[],
  description: string,
): void => {
  const root = postcss.parse(css);
  const rules: Rule[] = [];

  root.walkRules((rule) => {
    rules.push(rule);
  });

  const found = rules.some(
    (rule) => selectorPredicate(rule.selector) && ruleHasDeclarations(rule, declarations),
  );

  if (!found) {
    throw new Error(`${description} was not found in production HTML reachable CSS assets`);
  }
};

const toRepoPath = (repoRoot: string, absolutePath: string): string =>
  path.relative(repoRoot, absolutePath).split(path.sep).join('/');

const collectHtmlFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(absolutePath)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(absolutePath);
    }
  }

  return files;
};

const normalizeAssetPath = (href: string): string | null => {
  const withoutHash = href.split('#', 1)[0] ?? '';
  const withoutQuery = withoutHash.split('?', 1)[0] ?? '';
  if (!withoutQuery.endsWith('.css')) {
    return null;
  }

  return withoutQuery.replace(/^\/+/, '');
};

export const collectProductionHtmlReachableCssAssets = async (
  repoRoot = process.cwd(),
): Promise<string[]> => {
  const distRoot = path.join(repoRoot, DIST_DIR);
  const htmlFiles = await collectHtmlFiles(distRoot);
  const cssAssets = new Set<string>();

  for (const htmlFile of htmlFiles) {
    const html = readFileSync(htmlFile, 'utf8');
    for (const linkMatch of html.matchAll(STYLESHEET_LINK_RE)) {
      const link = linkMatch[0];
      const href = HREF_RE.exec(link)?.[1];
      if (href === undefined) {
        continue;
      }

      const assetPath = normalizeAssetPath(href);
      if (assetPath !== null) {
        cssAssets.add(assetPath);
      }
    }
  }

  return [...cssAssets].sort();
};

const readManifestCssAssets = (repoRoot: string): string[] => {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, MANIFEST_PATH), 'utf8')) as Record<
    string,
    ManifestEntry
  >;
  const cssAssets = new Set<string>();

  for (const entry of Object.values(manifest)) {
    if (typeof entry.file === 'string' && entry.file.endsWith('.css')) {
      cssAssets.add(entry.file);
    }
  }

  return [...cssAssets].sort();
};

const readReachableCss = (repoRoot: string, cssAssets: readonly string[]): Map<string, string> => {
  const cssByAsset = new Map<string, string>();

  for (const asset of cssAssets) {
    const absolutePath = path.join(repoRoot, DIST_DIR, asset);
    cssByAsset.set(asset, readFileSync(absolutePath, 'utf8'));
  }

  return cssByAsset;
};

export const assertProductionCssArtifacts = async (
  repoRoot = process.cwd(),
): Promise<ProductionCssArtifactResult> => {
  const distRoot = path.join(repoRoot, DIST_DIR);
  const htmlFiles = (await collectHtmlFiles(distRoot)).map((file) => toRepoPath(repoRoot, file));
  const reachableCssAssets = await collectProductionHtmlReachableCssAssets(repoRoot);
  const manifestCssAssets = readManifestCssAssets(repoRoot);
  const reachableManifestAssets = reachableCssAssets.filter((asset) =>
    manifestCssAssets.includes(asset),
  );

  if (htmlFiles.length === 0) {
    throw new Error('production CSS artifact assertion found no generated HTML files in dist/');
  }

  if (reachableCssAssets.length === 0) {
    throw new Error('production CSS artifact assertion found no stylesheet links in dist HTML');
  }

  const missingManifestAssets = reachableCssAssets.filter(
    (asset) => !manifestCssAssets.includes(asset),
  );
  if (missingManifestAssets.length > 0) {
    throw new Error(
      `production CSS assets are linked from HTML but missing from ${MANIFEST_PATH}: ${missingManifestAssets.join(
        ', ',
      )}`,
    );
  }

  const cssByAsset = readReachableCss(repoRoot, reachableManifestAssets);
  const reachableCss = [...cssByAsset.values()].join('\n');
  if (reachableCss.includes('--toc-item-inactive-upper-max-lines')) {
    throw new Error('deprecated TOC token was found in production HTML reachable CSS assets');
  }

  if (!/--toc-item-inactive-max-lines\s*:\s*2\b/u.test(reachableCss)) {
    throw new Error(
      '--toc-item-inactive-max-lines: 2 was not found in production HTML reachable CSS assets',
    );
  }
  if (!/--toc-item-active-max-lines\s*:\s*3\b/u.test(reachableCss)) {
    throw new Error(
      '--toc-item-active-max-lines: 3 was not found in production HTML reachable CSS assets',
    );
  }

  expectRuleHasDeclarations(
    reachableCss,
    (selector) =>
      selector.includes('.layout-toc__link:not(.is-active):not([data-active') &&
      selector.includes('.layout-toc__link-label'),
    [
      { property: 'display', value: '-webkit-box' },
      { property: '-webkit-box-orient', value: 'vertical' },
      { property: '-webkit-line-clamp', value: 'var(--toc-item-inactive-max-lines, 2)' },
      { property: 'line-clamp', value: 'var(--toc-item-inactive-max-lines, 2)' },
      { property: 'overflow', value: 'hidden' },
      { property: 'white-space', value: 'normal' },
    ],
    'inactive TOC label wrapping contract',
  );

  expectRuleHasDeclarations(
    reachableCss,
    (selector) =>
      selector.includes('.layout-toc__link.is-active .layout-toc__link-label') &&
      selector.includes('.layout-toc__link[data-active') &&
      selector.includes('.layout-toc__link-label'),
    [
      { property: 'display', value: '-webkit-box' },
      { property: '-webkit-box-orient', value: 'vertical' },
      { property: '-webkit-line-clamp', value: 'var(--toc-item-active-max-lines, 3)' },
      { property: 'line-clamp', value: 'var(--toc-item-active-max-lines, 3)' },
      { property: 'overflow', value: 'hidden' },
      { property: 'white-space', value: 'normal' },
      { property: 'text-overflow', value: 'clip' },
    ],
    'active TOC label wrapping contract',
  );

  const matchingCssAssets = [...cssByAsset.entries()]
    .filter(([, css]) => REQUIRED_CSS_PATTERNS.every((pattern) => pattern.test(css)))
    .map(([asset]) => asset)
    .sort();

  if (matchingCssAssets.length === 0) {
    throw new Error(
      `${TOC_MOBILE_PANEL_STYLING_SELECTOR} CSS from ${TOC_MOBILE_PANEL_CSS_ARTIFACT_PATH} was not found in production HTML reachable CSS assets`,
    );
  }

  return {
    htmlFiles,
    reachableCssAssets,
    manifestCssAssets,
    matchingCssAssets,
  };
};

const isCliEntrypoint = (): boolean => {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
};

if (isCliEntrypoint()) {
  try {
    const result = await assertProductionCssArtifacts();
    console.log(`assert-production-css-artifacts: ok (${result.matchingCssAssets.join(', ')})`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
