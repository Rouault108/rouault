import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadNotesData } from '../build/data/notes.js';
import {
  buildSearchCatalog,
  type SearchCatalogSourceNote,
} from '../build/search/build-search-catalog.js';
import { resolveProductionSiteUrlContext } from '../build/site/site-url-context.js';
import {
  parseInternalDocumentRouteManifest,
  toInternalDocumentRouteSet,
} from '../shared/navigation/internal-document-route-manifest.js';
import { resolveInternalDocumentRouteManifestPathname } from '../shared/navigation/internal-document-route-manifest-path.js';
import { createSearchArtifactUrlResolver, resolveSearchCatalogUrl } from '../shared/search/search-artifact-url.js';
import type { SearchCatalogItem } from '../shared/search/search-catalog.js';
import {
  createSearchJsonParseDiagnosticSink,
  type MutableSearchDiagnosticsTarget,
} from '../shared/search/search-diagnostics.js';
import { parseSearchCatalogJson } from '../shared/search/search-json-artifact-parser.js';
import { createSearchRouteAllowlistPredicate } from '../shared/search/search-route-allowlist.js';
import type { SiteUrlContext } from '../shared/site/site-url-context.js';

export interface AssertProductionSearchArtifactsOptions {
  readonly repoRoot?: string;
  readonly allowEmptyCatalogForTestOnly?: boolean;
  readonly expectedItemsForTestOnly?: readonly SearchCatalogItem[];
  readonly loadNotesForTestOnly?: () => readonly SearchCatalogSourceNote[];
}

type SearchArtifactName =
  | 'search catalog'
  | 'route manifest'
  | 'Pagefind module'
  | 'Pagefind entry';

const DIST_DIR = 'dist';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toRepoPath = (repoRoot: string, absolutePath: string): string =>
  path.relative(repoRoot, absolutePath).split(path.sep).join('/');

const readRequiredTextFile = (options: {
  readonly repoRoot: string;
  readonly filePath: string;
  readonly artifactName: SearchArtifactName;
}): string => {
  const repoPath = toRepoPath(options.repoRoot, options.filePath);
  if (!existsSync(options.filePath)) {
    throw new Error(
      `[production-search-artifacts] ${options.artifactName} is missing at ${repoPath}.`,
    );
  }

  const text = readFileSync(options.filePath, 'utf8');
  if (text.length === 0) {
    throw new Error(
      `[production-search-artifacts] ${options.artifactName} is empty at ${repoPath}.`,
    );
  }
  return text;
};

const parseRequiredJson = (options: {
  readonly repoRoot: string;
  readonly filePath: string;
  readonly artifactName: SearchArtifactName;
  readonly text: string;
}): unknown => {
  try {
    return JSON.parse(options.text);
  } catch (error) {
    throw new Error(
      `[production-search-artifacts] ${options.artifactName} JSON is invalid at ${toRepoPath(
        options.repoRoot,
        options.filePath,
      )}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const resolveArtifactPathFromPublicPathname = (options: {
  readonly repoRoot: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly publicPathname: string;
  readonly artifactName: SearchArtifactName;
}): string => {
  const { basePath } = options.siteUrlContext;
  let outputPathname: string;

  if (basePath.length === 0) {
    if (!options.publicPathname.startsWith('/')) {
      throw new Error(
        `[production-search-artifacts] ${options.artifactName} pathname is invalid: ${options.publicPathname}`,
      );
    }
    outputPathname = options.publicPathname;
  } else if (options.publicPathname.startsWith(`${basePath}/`)) {
    outputPathname = options.publicPathname.slice(basePath.length);
  } else {
    throw new Error(
      `[production-search-artifacts] ${options.artifactName} pathname is outside basePath ${basePath}: ${options.publicPathname}`,
    );
  }

  if (!outputPathname.startsWith('/')) {
    throw new Error(
      `[production-search-artifacts] ${options.artifactName} output pathname is invalid: ${outputPathname}`,
    );
  }

  const segments = outputPathname.split('/').filter((segment) => segment.length > 0);
  return path.join(options.repoRoot, DIST_DIR, ...segments);
};

const assertRawSearchCatalogItems = (options: {
  readonly repoRoot: string;
  readonly filePath: string;
  readonly value: unknown;
}): void => {
  const repoPath = toRepoPath(options.repoRoot, options.filePath);
  if (!Array.isArray(options.value)) {
    throw new Error(
      `[production-search-artifacts] search catalog must be a top-level array at ${repoPath}.`,
    );
  }

  for (const [index, item] of options.value.entries()) {
    if (!isRecord(item)) {
      throw new Error(
        `[production-search-artifacts] search catalog raw item ${index.toString()} must be an object at ${repoPath}.`,
      );
    }
    if (!Object.hasOwn(item, 'tags')) {
      throw new Error(
        `[production-search-artifacts] search catalog raw item ${index.toString()} is missing tags at ${repoPath}.`,
      );
    }
    if (!Array.isArray(item['tags'])) {
      throw new Error(
        `[production-search-artifacts] search catalog raw item ${index.toString()} tags must be an array at ${repoPath}.`,
      );
    }
    if (Object.hasOwn(item, 'genres')) {
      throw new Error(
        `[production-search-artifacts] search catalog raw item ${index.toString()} must not include genres at ${repoPath}.`,
      );
    }
  }
};

const createDiagnosticsTarget = (): MutableSearchDiagnosticsTarget => ({ issues: [] });

const parseCatalogForAssertion = (options: {
  readonly label: 'actual' | 'expected';
  readonly value: unknown;
  readonly siteUrlContext: SiteUrlContext;
  readonly isInternalDocumentPathname: (pathname: string) => boolean;
}): readonly SearchCatalogItem[] => {
  const diagnostics = createDiagnosticsTarget();
  const parsed = parseSearchCatalogJson({
    value: options.value,
    siteUrlContext: options.siteUrlContext,
    isInternalDocumentPathname: options.isInternalDocumentPathname,
    diagnostics: createSearchJsonParseDiagnosticSink(diagnostics),
  });

  if (!parsed.ok) {
    throw new Error(
      `[production-search-artifacts] ${options.label} search catalog schema is invalid.`,
    );
  }

  if (parsed.droppedItemCount > 0) {
    throw new Error(
      `[production-search-artifacts] ${options.label} search catalog dropped ${parsed.droppedItemCount.toString()} item(s).`,
    );
  }

  return parsed.items;
};

const assertUniqueCanonicalPathnames = (
  label: 'actual' | 'expected',
  items: readonly SearchCatalogItem[],
): Map<string, SearchCatalogItem> => {
  const byPathname = new Map<string, SearchCatalogItem>();
  for (const item of items) {
    if (byPathname.has(item.canonicalPathname)) {
      throw new Error(
        `[production-search-artifacts] ${label} search catalog has duplicate canonicalPathname: ${item.canonicalPathname}`,
      );
    }
    byPathname.set(item.canonicalPathname, item);
  }
  return byPathname;
};

const normalizeArray = (value: readonly string[] | undefined): readonly string[] => value ?? [];

const assertArrayEquals = (options: {
  readonly canonicalPathname: string;
  readonly fieldName: 'tags' | 'keywords';
  readonly actual: readonly string[] | undefined;
  readonly expected: readonly string[] | undefined;
}): void => {
  const actual = normalizeArray(options.actual);
  const expected = normalizeArray(options.expected);
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(
      `[production-search-artifacts] ${options.canonicalPathname} ${options.fieldName} mismatch.`,
    );
  }
};

const assertPayloadMatches = (options: {
  readonly actualItems: readonly SearchCatalogItem[];
  readonly expectedItems: readonly SearchCatalogItem[];
}): void => {
  const actualByPathname = assertUniqueCanonicalPathnames('actual', options.actualItems);
  const expectedByPathname = assertUniqueCanonicalPathnames('expected', options.expectedItems);

  if (actualByPathname.size !== expectedByPathname.size) {
    throw new Error(
      `[production-search-artifacts] search catalog item count mismatch: expected ${expectedByPathname.size.toString()}, got ${actualByPathname.size.toString()}.`,
    );
  }

  for (const canonicalPathname of actualByPathname.keys()) {
    if (!expectedByPathname.has(canonicalPathname)) {
      throw new Error(
        `[production-search-artifacts] actual search catalog contains unexpected canonicalPathname: ${canonicalPathname}`,
      );
    }
  }

  for (const [canonicalPathname, expected] of expectedByPathname.entries()) {
    const actual = actualByPathname.get(canonicalPathname);
    if (actual === undefined) {
      throw new Error(
        `[production-search-artifacts] actual search catalog is missing canonicalPathname: ${canonicalPathname}`,
      );
    }

    for (const fieldName of ['title', 'description', 'date'] as const) {
      if ((actual[fieldName] ?? '') !== (expected[fieldName] ?? '')) {
        throw new Error(
          `[production-search-artifacts] ${canonicalPathname} ${fieldName} mismatch.`,
        );
      }
    }

    assertArrayEquals({
      canonicalPathname,
      fieldName: 'tags',
      actual: actual.tags,
      expected: expected.tags,
    });
    assertArrayEquals({
      canonicalPathname,
      fieldName: 'keywords',
      actual: actual.keywords,
      expected: expected.keywords,
    });
  }
};

const isDirectExecution = (): boolean => {
  const entryPath = process.argv[1];
  return (
    typeof entryPath === 'string' &&
    entryPath.length > 0 &&
    path.resolve(entryPath) === path.resolve(fileURLToPath(import.meta.url))
  );
};

export async function assertProductionSearchArtifacts(
  options: AssertProductionSearchArtifactsOptions = {},
): Promise<void> {
  await Promise.resolve();

  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const defaultRepoRoot = path.resolve(process.cwd());
  if (
    repoRoot !== defaultRepoRoot &&
    options.expectedItemsForTestOnly === undefined &&
    options.loadNotesForTestOnly === undefined
  ) {
    throw new Error(
      '[production-search-artifacts] repoRoot differs from process.cwd(); expectedItemsForTestOnly or loadNotesForTestOnly is required for fixture assertions.',
    );
  }

  const siteUrlContext = resolveProductionSiteUrlContext();
  const resolver = createSearchArtifactUrlResolver({ siteUrlContext });
  const searchCatalogPath = resolveArtifactPathFromPublicPathname({
    repoRoot,
    siteUrlContext,
    publicPathname: resolveSearchCatalogUrl(siteUrlContext),
    artifactName: 'search catalog',
  });
  const routeManifestPath = resolveArtifactPathFromPublicPathname({
    repoRoot,
    siteUrlContext,
    publicPathname: resolveInternalDocumentRouteManifestPathname(siteUrlContext),
    artifactName: 'route manifest',
  });
  const pagefindModulePath = resolveArtifactPathFromPublicPathname({
    repoRoot,
    siteUrlContext,
    publicPathname: resolver.resolvePagefindAssetUrl('pagefind.js'),
    artifactName: 'Pagefind module',
  });
  const pagefindEntryPath = resolveArtifactPathFromPublicPathname({
    repoRoot,
    siteUrlContext,
    publicPathname: resolver.resolvePagefindAssetUrl('pagefind-entry.json'),
    artifactName: 'Pagefind entry',
  });

  const searchCatalogText = readRequiredTextFile({
    repoRoot,
    filePath: searchCatalogPath,
    artifactName: 'search catalog',
  });
  const searchCatalogJson = parseRequiredJson({
    repoRoot,
    filePath: searchCatalogPath,
    artifactName: 'search catalog',
    text: searchCatalogText,
  });
  assertRawSearchCatalogItems({
    repoRoot,
    filePath: searchCatalogPath,
    value: searchCatalogJson,
  });

  const routeManifestText = readRequiredTextFile({
    repoRoot,
    filePath: routeManifestPath,
    artifactName: 'route manifest',
  });
  const routeManifestJson = parseRequiredJson({
    repoRoot,
    filePath: routeManifestPath,
    artifactName: 'route manifest',
    text: routeManifestText,
  });
  const routeManifest = parseInternalDocumentRouteManifest(routeManifestJson);
  if (
    routeManifest.siteOrigin !== siteUrlContext.siteOrigin ||
    routeManifest.basePath !== siteUrlContext.basePath
  ) {
    throw new Error(
      `[production-search-artifacts] route manifest site URL context mismatch at ${toRepoPath(
        repoRoot,
        routeManifestPath,
      )}.`,
    );
  }
  const routeSet = toInternalDocumentRouteSet(routeManifest);
  const isInternalDocumentPathname = createSearchRouteAllowlistPredicate(routeSet);

  const expectedRawItems =
    options.expectedItemsForTestOnly ??
    buildSearchCatalog(
      options.loadNotesForTestOnly !== undefined
        ? options.loadNotesForTestOnly()
        : loadNotesData(),
    );
  const actualItems = parseCatalogForAssertion({
    label: 'actual',
    value: searchCatalogJson,
    siteUrlContext,
    isInternalDocumentPathname,
  });
  const expectedItems = parseCatalogForAssertion({
    label: 'expected',
    value: expectedRawItems,
    siteUrlContext,
    isInternalDocumentPathname,
  });

  if (actualItems.length === 0 && options.allowEmptyCatalogForTestOnly !== true) {
    throw new Error('[production-search-artifacts] production search catalog must not be empty.');
  }

  assertPayloadMatches({ actualItems, expectedItems });

  readRequiredTextFile({
    repoRoot,
    filePath: pagefindModulePath,
    artifactName: 'Pagefind module',
  });
  const pagefindEntryText = readRequiredTextFile({
    repoRoot,
    filePath: pagefindEntryPath,
    artifactName: 'Pagefind entry',
  });
  parseRequiredJson({
    repoRoot,
    filePath: pagefindEntryPath,
    artifactName: 'Pagefind entry',
    text: pagefindEntryText,
  });
}

if (isDirectExecution()) {
  try {
    await assertProductionSearchArtifacts();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
