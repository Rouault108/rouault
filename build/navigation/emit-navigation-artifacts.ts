import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { MAIN_CONTENT_ID } from '../../shared/navigation/main-landmark-contract.js';
import { resolveRouterArtifactPathname } from '../../shared/navigation/router-artifact-path.js';

import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import type { HydrationPlanScope } from '../../shared/navigation/hydration-plan.js';
import type {
  HeaderShellProjection,
  SidebarShellProjection,
} from '../../shared/navigation/shell-projection.js';
import type { TocPresence } from '../../shared/note/toc-presence.js';
import { readParse5HydrationMarkerResult } from './parse5-hydration-markers.js';
import { validateSidebarNavHtmlInvariant } from './validate-sidebar-nav-html-invariant.js';
import {
  validateTocOwnerCandidates,
  type TocOwnerCandidate,
} from './validate-toc-owner-candidates.js';

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5ChildNode = DefaultTreeAdapterMap['childNode'];
type Parse5ParentNode = DefaultTreeAdapterMap['parentNode'];
type Parse5Document = DefaultTreeAdapterMap['document'];
type Parse5DocumentFragment = DefaultTreeAdapterMap['documentFragment'];
type Parse5Element = DefaultTreeAdapterMap['element'];

const FALLBACK_CURRENT_CORPUS_KEY = 'all';
const FALLBACK_SIDEBAR_ID = 'note-primary';
const FALLBACK_SIDEBAR_BREAKPOINT = 1024;

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const isParentNode = (node: Parse5Node): node is Parse5ParentNode => {
  const candidate = node as { childNodes?: unknown };
  return Array.isArray(candidate.childNodes);
};

const createFragmentNode = (childNodes: Parse5ChildNode[]): Parse5DocumentFragment => ({
  nodeName: '#document-fragment',
  childNodes,
});

const getAttribute = (element: Parse5Element, name: string): string | null =>
  element.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const hasAttribute = (element: Parse5Element, name: string): boolean =>
  element.attrs.some((attribute) => attribute.name === name);

const getTextContent = (node: Parse5Node): string => {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }

  if (!isParentNode(node)) {
    return '';
  }

  return node.childNodes.map((childNode) => getTextContent(childNode)).join('');
};

const findFirstElement = (
  node: Parse5ParentNode,
  predicate: (candidate: Parse5Element) => boolean,
): Parse5Element | null => {
  for (const childNode of node.childNodes) {
    if (isElementNode(childNode) && predicate(childNode)) {
      return childNode;
    }

    if (isParentNode(childNode)) {
      const nested = findFirstElement(childNode, predicate);
      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
};

const findAllElements = (
  node: Parse5ParentNode,
  predicate: (candidate: Parse5Element) => boolean,
  matches: Parse5Element[] = [],
): Parse5Element[] => {
  for (const childNode of node.childNodes) {
    if (isElementNode(childNode) && predicate(childNode)) {
      matches.push(childNode);
    }

    if (isParentNode(childNode)) {
      findAllElements(childNode, predicate, matches);
    }
  }

  return matches;
};

const serializeInnerHtml = (node: Parse5Element): string =>
  parse5.serialize(createFragmentNode([...node.childNodes]));

const parseJsonAttribute = <T>(value: string | null, fallback: T): T => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const parseStringArrayAttribute = (value: string | null): string[] => {
  const parsed = parseJsonAttribute<unknown>(value, []);
  return Array.isArray(parsed)
    ? parsed.filter((entry): entry is string => typeof entry === 'string')
    : [];
};

const toTrimmedString = (value: string | null, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const toOptionalString = (value: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toNumber = (value: string | null, fallback: number): number => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toTocPresence = (value: string | null): TocPresence =>
  value === 'present' ? 'present' : 'absent';

const readEmbeddedBuildId = (document: Parse5Document): string | undefined => {
  const buildIdMeta = findFirstElement(
    document,
    (candidate) =>
      candidate.tagName === 'meta' && getAttribute(candidate, 'name') === 'rouault-build-id',
  );
  const metaBuildId = toOptionalString(buildIdMeta ? getAttribute(buildIdMeta, 'content') : null);
  if (metaBuildId) {
    return metaBuildId;
  }

  const footer = findFirstElement(document, (candidate) => candidate.tagName === 'layout-footer');
  return toOptionalString(footer ? getAttribute(footer, 'build-label') : null) ?? undefined;
};

const collectHydrationPlan = (document: Parse5Document): HydrationPlanScope[] => {
  const scopes = findAllElements(
    document,
    (candidate) => getAttribute(candidate, 'data-hydration-scope') !== null,
  );
  const seen = new Set<string>();
  const plan: HydrationPlanScope[] = [];

  for (const scopeElement of scopes) {
    const scope = getAttribute(scopeElement, 'data-hydration-scope');
    if (typeof scope !== 'string' || scope.trim().length === 0) {
      continue;
    }

    const normalizedScope = scope.trim();
    const capability = getAttribute(scopeElement, 'data-hydration-capability');
    const trigger = getAttribute(scopeElement, 'data-hydration-trigger');
    const dedupeKey = `${normalizedScope}::${capability ?? ''}::${trigger ?? ''}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    const markerResult = readParse5HydrationMarkerResult(scopeElement);
    if (markerResult.status === 'malformed') {
      const issueText = markerResult.issues
        .map((issue) => `${issue.code}:${issue.attribute}`)
        .join(', ');
      throw new Error(`[navigation-artifact] malformed hydration marker: ${issueText}`);
    }

    plan.push({
      scope: normalizedScope,
      ...(capability === 'static' || capability === 'progressive' || capability === 'interactive'
        ? { capability }
        : {}),
      ...(trigger === 'initial' ||
      trigger === 'post-commit' ||
      trigger === 'visible' ||
      trigger === 'interaction'
        ? { trigger }
        : {}),
      ...(markerResult.status === 'valid'
        ? { marker: markerResult.marker.marker, ownerId: markerResult.marker.ownerId }
        : {}),
    });
  }

  return plan;
};

const collectTocOwnerCandidates = (
  document: Parse5Document,
  htmlFilePath: string,
): TocOwnerCandidate[] =>
  findAllElements(
    document,
    (candidate) => getAttribute(candidate, 'data-hydration-marker') === 'toc-owner',
  ).map((candidate, index) => ({
    ownerId: getAttribute(candidate, 'data-hydration-owner-id'),
    targetPath: `${htmlFilePath}#toc-owner-${String(index + 1)}`,
    scopeId: getAttribute(candidate, 'data-hydration-scope'),
  }));

const assertTocOwnerCandidates = (document: Parse5Document, htmlFilePath: string): void => {
  const candidates = collectTocOwnerCandidates(document, htmlFilePath);
  if (candidates.length === 0) {
    return;
  }

  const result = validateTocOwnerCandidates(candidates);
  if (result.issues.length === 0) {
    return;
  }

  const issueText = result.issues
    .map((issue) => `${issue.status}:${issue.ownerId ?? 'null'}:${issue.targetPath}`)
    .join(', ');
  throw new Error(`[navigation-artifact] TOC owner candidate validation failed: ${issueText}`);
};

const extractHeaderProjection = (document: Parse5Document): HeaderShellProjection | null => {
  const header = findFirstElement(document, (candidate) => candidate.tagName === 'layout-header');
  if (header === null) {
    return null;
  }

  return {
    corpora: parseJsonAttribute(getAttribute(header, 'corpora-json'), []),
    currentCorpusKey: toTrimmedString(
      getAttribute(header, 'current-corpus-key'),
      FALLBACK_CURRENT_CORPUS_KEY,
    ),
    noteLayout: hasAttribute(header, 'note-layout'),
    sidebarEnabled: hasAttribute(header, 'sidebar-enabled'),
    tocPresence: toTocPresence(getAttribute(header, 'toc-presence')),
    tocRuntimeId: toOptionalString(getAttribute(header, 'toc-runtime-id')),
    tocOwnerId: toOptionalString(getAttribute(header, 'data-toc-owner-id')),
    tocTriggerReserved: getAttribute(header, 'toc-trigger-reserved') === 'true',
  };
};

const extractSidebarProjection = (document: Parse5Document): SidebarShellProjection | null => {
  const sidebarHost = findFirstElement(
    document,
    (candidate) =>
      candidate.tagName === 'aside' && hasAttribute(candidate, 'data-app-shell-sidebar-host'),
  );
  if (sidebarHost === null || hasAttribute(sidebarHost, 'hidden')) {
    return null;
  }

  const sidebar = findFirstElement(
    sidebarHost,
    (candidate) => candidate.tagName === 'layout-sidebar',
  );
  if (sidebar === null || hasAttribute(sidebar, 'hidden')) {
    return null;
  }

  const presentation = getAttribute(sidebar, 'presentation');

  const projection: SidebarShellProjection = {
    present: true,
    sidebarId: toTrimmedString(getAttribute(sidebar, 'sidebar-id'), FALLBACK_SIDEBAR_ID),
    stateScopeId: toTrimmedString(getAttribute(sidebar, 'state-scope-id'), ''),
    selectedId: toOptionalString(getAttribute(sidebar, 'selected-id')),
    initialExpandedIds: parseStringArrayAttribute(getAttribute(sidebar, 'initial-expanded-ids')),
    topologyRevision: toOptionalString(getAttribute(sidebar, 'topology-revision')),
    navHtml: serializeInnerHtml(sidebar).trim() || null,
    heading: toOptionalString(getAttribute(sidebar, 'heading')),
    fixedBreakpoint: toNumber(
      getAttribute(sidebar, 'fixed-breakpoint'),
      FALLBACK_SIDEBAR_BREAKPOINT,
    ),
    presentation: presentation === 'fixed' || presentation === 'overlay' ? presentation : 'auto',
  };

  validateSidebarNavHtmlInvariant({
    sidebarPresent: true,
    navHtml: projection.navHtml,
    selectedId: projection.selectedId,
    initialExpandedIds: projection.initialExpandedIds,
    topologyRevision: projection.topologyRevision,
    sourceLabel: 'navigation-artifact',
  });

  return projection;
};

const inferRenderedKind = (
  document: Parse5Document,
  htmlFilePath: string,
): 'page' | 'not-found' => {
  if (path.basename(htmlFilePath) === '404.html') {
    return 'not-found';
  }

  const notFoundPage = findFirstElement(
    document,
    (candidate) => candidate.tagName === 'not-found-page',
  );
  return notFoundPage === null ? 'page' : 'not-found';
};

export const createNavigationEnvelopeFromHtml = (
  html: string,
  htmlFilePath: string,
  options: {
    buildId?: string | null | undefined;
    generatedAt?: string | null | undefined;
  } = {},
): NavigationEnvelope => {
  const document = parse5.parse(html);
  assertTocOwnerCandidates(document, htmlFilePath);
  const embeddedBuildId = readEmbeddedBuildId(document);
  const main = findFirstElement(
    document,
    (candidate) =>
      candidate.tagName === 'main' && getAttribute(candidate, 'id') === MAIN_CONTENT_ID,
  );

  if (main === null) {
    throw new Error(
      `[navigation-artifact] ${htmlFilePath} に main#${MAIN_CONTENT_ID} がありません。`,
    );
  }

  const titleElement = findFirstElement(document, (candidate) => candidate.tagName === 'title');
  const metaDescription = findFirstElement(
    document,
    (candidate) =>
      candidate.tagName === 'meta' && getAttribute(candidate, 'name') === 'description',
  );
  const headerProjection = extractHeaderProjection(document);
  const hydrationPlan = collectHydrationPlan(document);

  return {
    schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
    buildId: embeddedBuildId ?? options.buildId,
    generatedAt: options.generatedAt,
    document: {
      html: serializeInnerHtml(main),
      title: titleElement ? getTextContent(titleElement).trim() : '',
      description: metaDescription ? getAttribute(metaDescription, 'content') : null,
      renderedKind: inferRenderedKind(document, htmlFilePath),
      announcedTitle: titleElement ? getTextContent(titleElement).trim() : '',
    },
    shellProjection:
      headerProjection === null
        ? null
        : {
            header: headerProjection,
            sidebar: extractSidebarProjection(document),
          },
    hydrationPlan: hydrationPlan.length > 0 ? { scopes: hydrationPlan } : null,
  };
};

const normalizeRelativePath = (value: string): string => value.split(path.sep).join('/');

const resolveContentPathnameFromHtmlFile = (outputDir: string, htmlFilePath: string): string => {
  const relativeHtmlPath = normalizeRelativePath(path.relative(outputDir, htmlFilePath));

  if (relativeHtmlPath === 'index.html') {
    return '/';
  }

  if (relativeHtmlPath.endsWith('/index.html')) {
    return `/${relativeHtmlPath.slice(0, -'/index.html'.length)}/`;
  }

  const extension = path.extname(relativeHtmlPath);
  const basename =
    extension.length > 0 ? relativeHtmlPath.slice(0, -extension.length) : relativeHtmlPath;

  return `/${basename}`;
};

const resolveArtifactPath = (outputDir: string, htmlFilePath: string): string => {
  const contentPathname = resolveContentPathnameFromHtmlFile(outputDir, htmlFilePath);
  const artifactPathname = resolveRouterArtifactPathname(contentPathname);
  return path.join(outputDir, artifactPathname.slice(1));
};

const collectHtmlFiles = async (rootDirectory: string): Promise<string[]> => {
  const entries = await readdir(rootDirectory, { withFileTypes: true });
  const htmlFiles: string[] = [];

  for (const entry of entries) {
    const resolvedPath = path.join(rootDirectory, entry.name);

    if (entry.isDirectory()) {
      htmlFiles.push(...(await collectHtmlFiles(resolvedPath)));
      continue;
    }

    if (entry.isFile() && resolvedPath.endsWith('.html')) {
      htmlFiles.push(resolvedPath);
    }
  }

  return htmlFiles;
};

export const emitNavigationArtifacts = async (options: {
  outputDir: string;
  buildId?: string | null | undefined;
  generatedAt?: string | null | undefined;
}): Promise<void> => {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const htmlFiles = await collectHtmlFiles(options.outputDir);

  await Promise.all(
    htmlFiles.map(async (htmlFilePath) => {
      const html = await readFile(htmlFilePath, 'utf8');
      const envelope = createNavigationEnvelopeFromHtml(html, htmlFilePath, {
        buildId: options.buildId,
        generatedAt,
      });
      const artifactPath = resolveArtifactPath(options.outputDir, htmlFilePath);
      await mkdir(path.dirname(artifactPath), { recursive: true });
      await writeFile(`${artifactPath}`, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
    }),
  );
};
