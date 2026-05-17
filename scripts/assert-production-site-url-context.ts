import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import { resolveProductionSiteUrlContext } from '../build/site/site-url-context.js';
import {
  assertInternalDocumentRouteManifestMatches,
  parseInternalDocumentRouteManifest,
} from '../shared/navigation/internal-document-route-manifest.js';
import {
  INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION,
  resolveInternalDocumentRouteManifestPathname,
  resolveInternalDocumentRouteManifestUrl,
} from '../shared/navigation/internal-document-route-manifest-path.js';

const DIST_DIR = 'dist';
const FORBIDDEN_PRODUCTION_FALLBACK_ORIGIN = 'https://rouault.invalid';

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5Element = DefaultTreeAdapterMap['element'];

interface ProductionSiteUrlContextAssertionResult {
  readonly htmlFiles: readonly string[];
  readonly manifestFiles: readonly string[];
}

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

  return files.sort((left, right) => left.localeCompare(right, 'en'));
};

const isElement = (node: Parse5Node): node is Parse5Element => 'tagName' in node;

const visitElements = (node: Parse5Node, visit: (element: Parse5Element) => void): void => {
  if (isElement(node)) {
    visit(node);
  }

  if ('childNodes' in node) {
    for (const child of node.childNodes) {
      visitElements(child, visit);
    }
  }
};

const getAttribute = (element: Parse5Element, name: string): string | undefined =>
  element.attrs.find((attribute) => attribute.name === name)?.value;

const readMetaContent = (html: string): Map<string, string> => {
  const document = parse(html);
  const meta = new Map<string, string>();

  visitElements(document, (element) => {
    if (element.tagName !== 'meta') {
      return;
    }

    const name = getAttribute(element, 'name');
    const content = getAttribute(element, 'content');
    if (name !== undefined && content !== undefined) {
      meta.set(name, content);
    }
  });

  return meta;
};

const requireMeta = (meta: Map<string, string>, name: string, htmlPath: string): string => {
  const content = meta.get(name);
  if (content === undefined) {
    throw new Error(`${htmlPath}: missing meta[name="${name}"] content.`);
  }

  return content;
};

const assertEqual = (actual: string, expected: string, description: string): void => {
  if (actual !== expected) {
    throw new Error(
      `${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`,
    );
  }
};

const resolveManifestFilePath = (options: {
  readonly repoRoot: string;
  readonly htmlPath: string;
  readonly manifestPathname: string;
  readonly expectedPublicPathname: string;
  readonly expectedBasePath: string;
}): string => {
  assertEqual(
    options.manifestPathname,
    options.expectedPublicPathname,
    `${options.htmlPath}: route manifest pathname mismatch`,
  );

  const outputPathname =
    options.expectedBasePath.length > 0
      ? options.manifestPathname.slice(options.expectedBasePath.length)
      : options.manifestPathname;
  if (!outputPathname.startsWith('/')) {
    throw new Error(`${options.htmlPath}: route manifest pathname is outside expected basePath.`);
  }

  return path.join(
    options.repoRoot,
    DIST_DIR,
    ...outputPathname.split('/').filter((segment) => segment.length > 0),
  );
};

export const assertProductionSiteUrlContext = async (
  repoRoot = process.cwd(),
): Promise<ProductionSiteUrlContextAssertionResult> => {
  const siteUrlContext = resolveProductionSiteUrlContext({
    siteOrigin: process.env['ROUAULT_SITE_ORIGIN'],
    basePath: process.env['ROUAULT_BASE_PATH'],
  });
  const distRoot = path.join(repoRoot, DIST_DIR);
  const htmlFiles = await collectHtmlFiles(distRoot);

  if (htmlFiles.length === 0) {
    throw new Error('production site URL context assertion found no generated HTML files in dist/');
  }

  const expectedManifestUrl = (buildId: string): string =>
    resolveInternalDocumentRouteManifestUrl({ siteUrlContext, buildId });
  const expectedManifestPathname = resolveInternalDocumentRouteManifestPathname(siteUrlContext);
  const manifestFiles = new Set<string>();

  for (const htmlFile of htmlFiles) {
    const htmlPath = toRepoPath(repoRoot, htmlFile);
    const meta = readMetaContent(readFileSync(htmlFile, 'utf8'));
    const siteOrigin = requireMeta(meta, 'rouault-site-origin', htmlPath);
    const basePath = requireMeta(meta, 'rouault-base-path', htmlPath);
    const manifestUrl = requireMeta(meta, 'rouault-route-manifest', htmlPath);
    const buildId = requireMeta(meta, 'rouault-route-manifest-build-id', htmlPath);

    assertEqual(siteOrigin, siteUrlContext.siteOrigin, `${htmlPath}: rouault-site-origin mismatch`);
    if (siteOrigin === FORBIDDEN_PRODUCTION_FALLBACK_ORIGIN) {
      throw new Error(
        `${htmlPath}: rouault-site-origin must not use ${FORBIDDEN_PRODUCTION_FALLBACK_ORIGIN}.`,
      );
    }
    assertEqual(basePath, siteUrlContext.basePath, `${htmlPath}: rouault-base-path mismatch`);

    const parsedManifestUrl = new URL(manifestUrl, siteUrlContext.siteOrigin);
    assertEqual(
      parsedManifestUrl.searchParams.get('buildId') ?? '',
      buildId,
      `${htmlPath}: route manifest buildId query mismatch`,
    );

    const manifestFilePath = resolveManifestFilePath({
      repoRoot,
      htmlPath,
      manifestPathname: parsedManifestUrl.pathname,
      expectedPublicPathname: expectedManifestPathname,
      expectedBasePath: siteUrlContext.basePath,
    });
    assertEqual(
      manifestUrl,
      expectedManifestUrl(buildId),
      `${htmlPath}: rouault-route-manifest mismatch`,
    );
    if (!existsSync(manifestFilePath)) {
      throw new Error(
        `${htmlPath}: route manifest JSON does not exist at ${toRepoPath(repoRoot, manifestFilePath)}.`,
      );
    }
    manifestFiles.add(manifestFilePath);

    const manifestJsonPath = toRepoPath(repoRoot, manifestFilePath);
    const manifest = parseInternalDocumentRouteManifest(
      JSON.parse(readFileSync(manifestFilePath, 'utf8')),
    );
    const matchResult = assertInternalDocumentRouteManifestMatches({
      manifest,
      expectedBuildId: buildId,
      expectedVersion: INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION,
      expectedSiteUrlContext: siteUrlContext,
    });

    if (matchResult !== 'ok') {
      throw new Error(`${manifestJsonPath}: route manifest buildId mismatch.`);
    }
    assertEqual(
      manifest.siteOrigin,
      siteUrlContext.siteOrigin,
      `${manifestJsonPath}: siteOrigin mismatch`,
    );
    assertEqual(
      manifest.basePath,
      siteUrlContext.basePath,
      `${manifestJsonPath}: basePath mismatch`,
    );
    assertEqual(manifest.buildId, buildId, `${manifestJsonPath}: buildId mismatch`);
    if (manifest.siteOrigin === FORBIDDEN_PRODUCTION_FALLBACK_ORIGIN) {
      throw new Error(
        `${manifestJsonPath}: siteOrigin must not use ${FORBIDDEN_PRODUCTION_FALLBACK_ORIGIN}.`,
      );
    }
  }

  return {
    htmlFiles: htmlFiles.map((file) => toRepoPath(repoRoot, file)),
    manifestFiles: [...manifestFiles].sort().map((file) => toRepoPath(repoRoot, file)),
  };
};

const isCliEntrypoint = (): boolean => {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
};

if (isCliEntrypoint()) {
  try {
    const result = await assertProductionSiteUrlContext();
    console.log(
      `assert-production-site-url-context: ok (${result.htmlFiles.length.toString()} HTML, ${result.manifestFiles.length.toString()} manifest)`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
