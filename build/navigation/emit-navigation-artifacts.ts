import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { MAIN_CONTENT_ID } from '../../shared/navigation/main-landmark-contract.js';
import { normalizeRouterBuildMetadata } from '../../shared/navigation/build-metadata-contract.js';
import {
  assertValidSidebarId,
  assertValidSidebarStateScopeId,
} from '../../shared/navigation/sidebar-identity-contract.js';
import { resolveRouterArtifactPathname } from '../../shared/navigation/router-artifact-path.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';

import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import type { HydrationPlanScope } from '../../shared/navigation/hydration-plan.js';
import type { PayloadSidebarShellProjection } from '../../shared/navigation/navigation-shell-snapshot.js';
import { validateNavigationEnvelopeShell } from '../../shared/navigation/navigation-shell-validator.js';
import {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT,
  DEFAULT_SIDEBAR_ID,
} from '../../shared/navigation/sidebar-shell-defaults.js';
import { readParse5HydrationMarkerResult } from './parse5-hydration-markers.js';
import { validateSidebarNavHtmlInvariant } from './sidebar-nav-html-invariant.js';
import { validateDocumentSidebarIdentityContract } from './sidebar-identity-dom-contract.js';
import {
  validateTocOwnerCandidates,
  type TocOwnerCandidate,
} from './validate-toc-owner-candidates.js';
import { validateStaticHeaderParse5Tree } from './static-header-parse5-validator.js';
import { STATIC_HEADER_ROOT_SELECTOR } from '../../shared/navigation/static-header-contract.js';
import { validateGeneratedPageHtmlLinkContracts } from '../content/page-html-link-contracts.js';
import { createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';
import { normalizeRouaultPathname } from '../../shared/url/rouault-url-policy.js';
import {
  STATIC_GENERATED_DOCUMENT_ROUTES,
  resolveContentPathnameFromHtmlFile,
  resolveGeneratedDocumentCurrentUrlFromHtmlFile,
} from '../content/generated-document-route-set.js';

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5ChildNode = DefaultTreeAdapterMap['childNode'];
type Parse5ParentNode = DefaultTreeAdapterMap['parentNode'];
type Parse5Document = DefaultTreeAdapterMap['document'];
type Parse5DocumentFragment = DefaultTreeAdapterMap['documentFragment'];
type Parse5Element = DefaultTreeAdapterMap['element'];

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

const toOptionalString = (value: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const requireStringAttribute = (value: string | null, label: string): string => {
  const normalized = toOptionalString(value);
  if (normalized === null) {
    throw new Error(`[navigation-artifact] ${label} is required.`);
  }
  return normalized;
};

const toNumber = (value: string | null, fallback: number): number => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readEmbeddedMetaContent = (document: Parse5Document, name: string): string | undefined => {
  const meta = findFirstElement(
    document,
    (candidate) => candidate.tagName === 'meta' && getAttribute(candidate, 'name') === name,
  );
  return toOptionalString(meta ? getAttribute(meta, 'content') : null) ?? undefined;
};

const readRouterBuildIdMetaContent = (document: Parse5Document): string | undefined =>
  readEmbeddedMetaContent(document, 'rouault-build-id');

const readRouterGeneratedAtMetaContent = (document: Parse5Document): string | undefined =>
  readEmbeddedMetaContent(document, 'rouault-generated-at');

const assertEmbeddedSiteUrlContextMatches = (
  document: Parse5Document,
  context: NavigationEnvelopeCreationContext,
): void => {
  const siteOrigin = readEmbeddedMetaContent(document, 'rouault-site-origin');
  const basePath = readEmbeddedMetaContent(document, 'rouault-base-path');
  if (siteOrigin !== undefined && siteOrigin !== context.siteUrlContext.siteOrigin) {
    throw new Error(
      '[navigation-artifact] rouault-site-origin meta must match explicit siteUrlContext.',
    );
  }
  if (basePath !== undefined && basePath !== context.siteUrlContext.basePath) {
    throw new Error(
      '[navigation-artifact] rouault-base-path meta must match explicit siteUrlContext.',
    );
  }
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

const assertNoLegacyHeaderCustomElements = (
  document: Parse5Document,
  htmlFilePath: string,
): void => {
  const legacyHeader = findFirstElement(
    document,
    (candidate) => candidate.tagName === 'layout-header' || candidate.tagName === 'ui-header',
  );
  if (legacyHeader !== null) {
    throw new Error(
      `[navigation-artifact] ${htmlFilePath} must not contain layout-header/ui-header.`,
    );
  }
};

interface NavigationEnvelopeCreationContext {
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl: string;
  readonly isInternalDocumentPathname: (pathname: string) => boolean;
}

const extractLayoutHeaderHtml = (
  document: Parse5Document,
  htmlFilePath: string,
  context: NavigationEnvelopeCreationContext,
): string => {
  const headers = findAllElements(
    document,
    (candidate) => candidate.tagName === 'header' && hasAttribute(candidate, 'data-layout-header'),
  );
  if (headers.length !== 1) {
    throw new Error(
      `[navigation-artifact] ${htmlFilePath} requires exactly one ${STATIC_HEADER_ROOT_SELECTOR}.`,
    );
  }
  const header = headers[0];
  if (header === undefined) {
    throw new Error(
      `[navigation-artifact] ${htmlFilePath} requires ${STATIC_HEADER_ROOT_SELECTOR}.`,
    );
  }
  validateStaticHeaderParse5Tree(header);
  const headerHtml = parse5.serialize(createFragmentNode([header]));
  validateGeneratedPageHtmlLinkContracts({
    html: headerHtml,
    sourceLabel: `navigation-header:${htmlFilePath}`,
    scope: 'generated-page',
    siteUrlContext: context.siteUrlContext,
    currentUrl: context.currentUrl,
    routeClassificationMode: createManifestLoadedRouteClassificationMode({
      isInternalDocumentPathname: context.isInternalDocumentPathname,
    }),
  });
  return headerHtml;
};

const extractSidebarProjection = (
  document: Parse5Document,
): PayloadSidebarShellProjection | null => {
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

  const projection: PayloadSidebarShellProjection = {
    present: true,
    sidebarId: assertValidSidebarId(
      getAttribute(sidebar, 'sidebar-id'),
      'layout-sidebar[sidebar-id]',
    ),
    stateScopeId: assertValidSidebarStateScopeId(
      getAttribute(sidebar, 'state-scope-id'),
      'layout-sidebar[state-scope-id]',
    ),
    selectedId: toOptionalString(getAttribute(sidebar, 'selected-id')),
    initialExpandedIds: parseStringArrayAttribute(getAttribute(sidebar, 'initial-expanded-ids')),
    topologyRevision: requireStringAttribute(
      getAttribute(sidebar, 'topology-revision'),
      'layout-sidebar[topology-revision]',
    ),
    navHtml: requireStringAttribute(serializeInnerHtml(sidebar), 'layout-sidebar navHtml'),
    heading: toOptionalString(getAttribute(sidebar, 'heading')),
    fixedBreakpoint: toNumber(
      getAttribute(sidebar, 'fixed-breakpoint'),
      DEFAULT_SIDEBAR_FIXED_BREAKPOINT,
    ),
    presentation: presentation === 'fixed' || presentation === 'overlay' ? presentation : 'auto',
  };

  validateSidebarNavHtmlInvariant({
    mode: 'artifact-extraction',
    sidebarPresent: true,
    navHtml: projection.navHtml,
    selectedId: projection.selectedId,
    sidebarId: projection.sidebarId,
    stateScopeId: projection.stateScopeId,
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

  const notFoundPage = findFirstElement(document, (candidate) =>
    hasAttribute(candidate, 'data-not-found-page'),
  );
  return notFoundPage === null ? 'page' : 'not-found';
};

interface NavigationEnvelopeStrictArtifactMode {
  readonly mode: 'strict-artifact';
  readonly buildId: string;
  readonly generatedAt: string;
}

type NavigationEnvelopeLegacyFixtureModeName = 'legacy-fixture';

interface NavigationEnvelopeLegacyFixtureMode {
  readonly mode: NavigationEnvelopeLegacyFixtureModeName;
  readonly buildId?: string | null | undefined;
  readonly generatedAt?: string | null | undefined;
}

export type NavigationEnvelopeHtmlMetadataMode =
  | NavigationEnvelopeStrictArtifactMode
  | NavigationEnvelopeLegacyFixtureMode;

const resolveNavigationEnvelopeBuildMetadata = (
  document: Parse5Document,
  metadataMode: NavigationEnvelopeHtmlMetadataMode,
): { buildId: string; generatedAt: string } => {
  const embeddedBuildId = readRouterBuildIdMetaContent(document);
  const embeddedGeneratedAt = readRouterGeneratedAtMetaContent(document);

  if (metadataMode.mode === 'strict-artifact') {
    if (embeddedBuildId === undefined || embeddedGeneratedAt === undefined) {
      throw new Error(
        '[navigation-artifact] strict-artifact mode requires embedded buildId and generatedAt meta.',
      );
    }

    const buildMetadata = normalizeRouterBuildMetadata({
      buildId: metadataMode.buildId,
      generatedAt: metadataMode.generatedAt,
    });

    if (embeddedBuildId !== buildMetadata.buildId) {
      throw new Error(
        '[navigation-artifact] embedded buildId does not match strict-artifact buildId.',
      );
    }

    if (embeddedGeneratedAt !== buildMetadata.generatedAt) {
      throw new Error(
        '[navigation-artifact] embedded generatedAt does not match strict-artifact generatedAt.',
      );
    }

    return buildMetadata;
  }

  return normalizeRouterBuildMetadata({
    buildId: metadataMode.buildId ?? embeddedBuildId,
    generatedAt: metadataMode.generatedAt ?? embeddedGeneratedAt,
  });
};

const assertUniqueLayoutSidebarIdentityInstances = (document: Parse5Document): void => {
  validateDocumentSidebarIdentityContract(document, { sourceLabel: 'navigation-artifact' });
};

const assertHeaderSidebarConsistency = (
  document: Parse5Document,
  sidebarProjection: PayloadSidebarShellProjection | null,
): void => {
  const header = findFirstElement(
    document,
    (candidate) => candidate.tagName === 'header' && hasAttribute(candidate, 'data-layout-header'),
  );
  if (header === null) {
    throw new Error('[navigation-artifact] header[data-layout-header] is required.');
  }
  const sidebarEnabled = getAttribute(header, 'data-sidebar-enabled') === 'true';
  const sidebarId = assertValidSidebarId(
    getAttribute(header, 'data-sidebar-id'),
    'header[data-layout-header][data-sidebar-id]',
  );
  if (sidebarEnabled) {
    if (sidebarProjection === null) {
      throw new Error('[navigation-artifact] header.sidebarEnabled=true requires present sidebar.');
    }
    if (sidebarId !== sidebarProjection.sidebarId) {
      throw new Error('[navigation-artifact] header.sidebarId must match sidebar.sidebarId.');
    }
    return;
  }

  if (sidebarId !== DEFAULT_SIDEBAR_ID) {
    throw new Error(
      '[navigation-artifact] header.sidebarEnabled=false requires default sidebar id.',
    );
  }

  if (sidebarProjection !== null) {
    throw new Error(
      '[navigation-artifact] header.sidebarEnabled=false requires sidebar payload null.',
    );
  }
};

export const createNavigationEnvelopeFromHtml = (
  html: string,
  htmlFilePath: string,
  metadataMode: NavigationEnvelopeHtmlMetadataMode,
  context: NavigationEnvelopeCreationContext,
): NavigationEnvelope => {
  const document = parse5.parse(html);
  assertEmbeddedSiteUrlContextMatches(document, context);
  assertNoLegacyHeaderCustomElements(document, htmlFilePath);
  assertUniqueLayoutSidebarIdentityInstances(document);
  assertTocOwnerCandidates(document, htmlFilePath);
  const buildMetadata = resolveNavigationEnvelopeBuildMetadata(document, metadataMode);
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
  const headerHtml = extractLayoutHeaderHtml(document, htmlFilePath, context);
  const sidebarProjection = extractSidebarProjection(document);
  assertHeaderSidebarConsistency(document, sidebarProjection);
  const shell = validateNavigationEnvelopeShell({
    headerHtml,
    sidebarProjection,
  });
  const hydrationPlan = collectHydrationPlan(document);

  return {
    schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
    buildId: buildMetadata.buildId,
    generatedAt: buildMetadata.generatedAt,
    document: {
      html: serializeInnerHtml(main),
      title: titleElement ? getTextContent(titleElement).trim() : '',
      description: metaDescription ? getAttribute(metaDescription, 'content') : null,
      renderedKind: inferRenderedKind(document, htmlFilePath),
      announcedTitle: titleElement ? getTextContent(titleElement).trim() : '',
    },
    shell,
    hydrationPlan: hydrationPlan.length > 0 ? { scopes: hydrationPlan } : null,
  };
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

const addInternalDocumentPathnameVariants = (routeSet: Set<string>, pathname: string): void => {
  const variants = new Set([pathname, normalizeRouaultPathname(pathname), encodeURI(pathname)]);
  for (const variant of [...variants]) {
    variants.add(normalizeRouaultPathname(variant));
    if (variant !== '/' && variant.endsWith('/')) {
      variants.add(variant.slice(0, -1));
    }
  }
  for (const variant of variants) {
    routeSet.add(variant);
  }
};

export const emitNavigationArtifacts = async (options: {
  outputDir: string;
  buildId: string;
  generatedAt: string;
  siteUrlContext: SiteUrlContext;
}): Promise<void> => {
  const buildMetadata = normalizeRouterBuildMetadata(options);
  const htmlFiles = await collectHtmlFiles(options.outputDir);
  const routeSet = new Set<string>();
  for (const pathname of STATIC_GENERATED_DOCUMENT_ROUTES) {
    addInternalDocumentPathnameVariants(routeSet, pathname);
  }
  for (const htmlFilePath of htmlFiles) {
    const pathname = resolveContentPathnameFromHtmlFile(options.outputDir, htmlFilePath);
    if (pathname !== '/404') {
      addInternalDocumentPathnameVariants(routeSet, pathname);
    }
  }

  await Promise.all(
    htmlFiles.map(async (htmlFilePath) => {
      const html = await readFile(htmlFilePath, 'utf8');
      const currentUrl = resolveGeneratedDocumentCurrentUrlFromHtmlFile({
        outputDir: options.outputDir,
        htmlFilePath,
        siteUrlContext: options.siteUrlContext,
      });
      const envelope = createNavigationEnvelopeFromHtml(
        html,
        htmlFilePath,
        {
          mode: 'strict-artifact',
          buildId: buildMetadata.buildId,
          generatedAt: buildMetadata.generatedAt,
        },
        {
          siteUrlContext: options.siteUrlContext,
          currentUrl,
          isInternalDocumentPathname: (candidate) => routeSet.has(candidate),
        },
      );
      const artifactPath = resolveArtifactPath(options.outputDir, htmlFilePath);
      await mkdir(path.dirname(artifactPath), { recursive: true });
      await writeFile(`${artifactPath}`, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
    }),
  );
};
