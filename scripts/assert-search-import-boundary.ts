import { readFileSync } from 'node:fs';
import { collectImportEdges, walkSourceFiles, edgeMatches } from './import-boundary-graph.js';

const roots = ['src/search', 'shared/search'];
const searchDialogRuntimeTargets = [
  'src/client/post-hydrate/search-dialog-enhancer.ts',
  'src/client/post-hydrate/search-dialog-dom-controller.ts',
  'src/client/post-hydrate/search-dialog-dom-utils.ts',
] as const;
const forbiddenPatterns: readonly [RegExp, string][] = [
  [/window\.location\.assign/u, 'Search/router fallback must not use window.location.assign'],
  [/\bsearchCatalogItems\b|\bsearchCatalogPromise\b/u, 'module-level Search catalog cache must be removed'],
  [/\bsearchController\b/u, 'Search singleton controller must be removed'],
  [/entry\['canonicalPathname'\] \?\? entry\['url'\]/u, 'Search catalog parser must not accept legacy url fallback'],
  [new RegExp('\\b' + 'navigateTo' + 'Url' + '\\b', 'u'), 'legacy Search navigation API must be removed'],
  [new RegExp('\\b' + 'DocumentCanonical' + 'Url' + '\\b', 'u'), 'legacy Search canonical URL type must be removed'],
  [new RegExp('\\b' + 'canonical' + 'Url' + '\\b', 'u'), 'legacy Search canonical URL field must be removed'],
  [new RegExp('testOnly' + 'LoadSearchCatalog', 'u'), 'legacy Search catalog loader bypass must be removed'],
  [/https:\/\/rouault\.invalid|rouault\.invalid/u, 'production Search code must not use synthetic origin'],
  [/window\.location\.origin/u, 'Search URL normalization must not infer origin from window.location' + '.origin'],
];

export const findSearchImportBoundaryViolations = (): Promise<string[]> => {
  const violations: string[] = [];
  for (const file of walkSourceFiles(roots)) {
    const text = readFileSync(file, 'utf8');
    for (const [pattern, reason] of forbiddenPatterns) {
      if (pattern.test(text)) {
        violations.push(`search import boundary violation: ${file}: ${reason}`);
      }
    }
  }

  for (const file of searchDialogRuntimeTargets) {
    const text = readFileSync(file, 'utf8');
    if (/src\/components\/ui\/search-dialog|UiSearchDialog|SearchDialogElement|<\/?ui-search-(?:dialog|field)\b/u.test(text)) {
      violations.push(`search import boundary violation: ${file}: static search dialog runtime must not depend on legacy components`);
    }
    if (/from ['"]lit|TemplateResult|new\s+CustomEvent\(['"]search-dialog:/u.test(text)) {
      violations.push(`search import boundary violation: ${file}: static search dialog runtime must use neutral DOM and event helpers`);
    }
  }

  const selectionModelText = readFileSync('src/search/search-dialog-selection-model.ts', 'utf8');
  if (/SearchDialogVirtualizer|\b(?:KeyboardEvent|Event|HTMLElement|HTMLInputElement|HTMLButtonElement|ShadowRoot)\b|composedPath|\.closest\(|querySelector|getElementById|search-option-|requestClear|requestClose/u.test(selectionModelText)) {
    violations.push('search import boundary violation: src/search/search-dialog-selection-model.ts: selection model must remain DOM independent');
  }
  const searchDialogTypesText = readFileSync('src/search/search-dialog-types.ts', 'utf8');
  if (/SearchDialog(?:Opened|Closed|OpenRequested|CloseRequested|QueryChanged|Selected)Detail/u.test(searchDialogTypesText)) {
    violations.push('search import boundary violation: src/search/search-dialog-types.ts: event detail types must live in search-dialog-events.ts');
  }

  for (const edge of collectImportEdges(roots)) {
    if (edgeMatches(edge, 'src/search/', 'build/search/')) {
      violations.push(`search import boundary violation: ${edge.from} -> ${edge.specifier}: src/search must not import build/search`);
    }
    if (edgeMatches(edge, 'shared/search/', 'src/')) {
      violations.push(`search import boundary violation: ${edge.from} -> ${edge.specifier}: shared/search must not import src`);
    }
  }

  const bootstrapText = readFileSync('src/search/bootstrap.ts', 'utf8');
  const searchDialogConstantsText = readFileSync('src/search/search-dialog-constants.ts', 'utf8');
  if (!bootstrapText.includes('initSearchUnavailable(options: InitSearchUnavailableOptions): SearchBootstrapResult')) {
    violations.push('search import boundary violation: src/search/bootstrap.ts: initSearchUnavailable exact API must be present');
  }
  if (searchDialogConstantsText.includes('SEARCH_DEBOUNCE_MS')) {
    violations.push('search import boundary violation: src/search/search-dialog-constants.ts: SEARCH_DEBOUNCE_MS must be owned by search-constants.ts');
  }
  if (!bootstrapText.includes("from './search-constants.js'")) {
    violations.push('search import boundary violation: src/search/bootstrap.ts: SEARCH_DEBOUNCE_MS must be imported directly from search-constants.ts');
  }
  const searchPageEnhancerText = readFileSync('src/client/post-hydrate/search-page-enhancer.ts', 'utf8');
  const searchPageControllerText = readFileSync('src/client/post-hydrate/search-page-controller.ts', 'utf8');
  const siteUrlContextReaderText = readFileSync('src/site/read-site-url-context-from-document-meta.ts', 'utf8');
  const internalDocumentRouteManifestLoaderText = readFileSync('src/router/internal-document-route-manifest-loader.ts', 'utf8');
  const searchPageLayoutText = readFileSync('src/layouts/search-page-html.ts', 'utf8');
  const searchPageSiteUrlContextProductionPaths = [
    ['src/client/post-hydrate/search-page-enhancer.ts', searchPageEnhancerText],
    ['src/client/post-hydrate/search-page-controller.ts', searchPageControllerText],
    ['src/site/read-site-url-context-from-document-meta.ts', siteUrlContextReaderText],
  ] as const;
  for (const [file, text] of searchPageSiteUrlContextProductionPaths) {
    if (text.includes('rouault.invalid')) {
      violations.push(`search import boundary violation: ${file}: production Search page site URL context must not use synthetic origin fallback`);
    }
    if (/\bbasePath\s*:\s*['"]['"]/u.test(text)) {
      violations.push(`search import boundary violation: ${file}: production Search page site URL context must not use root basePath placeholder`);
    }
  }
  for (const [file, text] of [
    ['src/client/post-hydrate/search-page-enhancer.ts', searchPageEnhancerText],
    ['src/client/post-hydrate/search-page-controller.ts', searchPageControllerText],
  ] as const) {
    if (/createSearchCore(?:FromSiteContext)?\b/u.test(text)) {
      violations.push(`search import boundary violation: ${file}: SearchCore must not be created by the Search page enhancer or controller`);
    }
  }
  if (searchPageEnhancerText.includes('pathname.startsWith(\'/\')')) {
    violations.push('search import boundary violation: src/client/post-hydrate/search-page-enhancer.ts: search-page enhancer must not fake a route manifest predicate');
  }
  if (searchPageControllerText.includes('internal-document-route-manifest-loader')) {
    violations.push('search import boundary violation: src/client/post-hydrate/search-page-controller.ts: search-page controller must not import the router manifest loader');
  }
  if (!internalDocumentRouteManifestLoaderText.includes("from '../site/read-site-url-context-from-document-meta.js'")) {
    violations.push('search import boundary violation: src/router/internal-document-route-manifest-loader.ts: router manifest loader must import the shared document meta site URL context reader');
  }
  if (/\b(?:export\s+)?const\s+readSiteUrlContextFromDocumentMeta\b/u.test(internalDocumentRouteManifestLoaderText)) {
    violations.push('search import boundary violation: src/router/internal-document-route-manifest-loader.ts: router manifest loader must not redefine the document meta site URL context reader');
  }
  if (!searchPageLayoutText.includes('data-hydration-key="search-page-enhancer"')) {
    violations.push('search import boundary violation: src/layouts/search-page-html.ts: static search page must expose search-page-enhancer hydration key');
  }
  if (/type\s+SearchBootstrapUnavailableReason\s*=/u.test(bootstrapText)) {
    violations.push('search import boundary violation: src/search/bootstrap.ts: unavailable reason must use shared/search/search-unavailable-reason.ts');
  }
  const pagefindSourceText = readFileSync('src/search/sources/pagefind-source.ts', 'utf8');
  if (/createDefaultPagefindLoader\b/u.test(pagefindSourceText)) {
    violations.push('search import boundary violation: src/search/sources/pagefind-source.ts: Pagefind loader authority must live in shared/search/search-loaders.ts only');
  }
  const searchCoreEntrypointText = readFileSync('src/search/search-core.ts', 'utf8');
  if (/createDefaultPagefindLoader\b/u.test(searchCoreEntrypointText)) {
    violations.push('search import boundary violation: src/search/search-core.ts: Pagefind loader authority must not be re-exported from src/search/search-core.ts');
  }
  const directivePayloadText = readFileSync('build/remark/directives/payload/normalize-surface-payload.ts', 'utf8');
  if (!directivePayloadText.includes('sanitizeScoreSource')) {
    violations.push('search import boundary violation: build/remark/directives/payload/normalize-surface-payload.ts: score directive src must be validated');
  }
  if (!directivePayloadText.includes('policyContext.urlPolicyContext.siteUrlContext')) {
    violations.push('search import boundary violation: build/remark/directives/payload/normalize-surface-payload.ts: score directive src must use NoteDirectiveUrlPolicyContext.siteUrlContext');
  }

  if (!directivePayloadText.includes("from '../../../../shared/media/media-source-attributes.js'")) {
    violations.push('search import boundary violation: build/remark/directives/payload/normalize-surface-payload.ts: score directive src must import media URL safety through the correct repository-relative boundary');
  }
  if (directivePayloadText.includes('../../../../../shared/media/media-source-attributes.js')) {
    violations.push('search import boundary violation: build/remark/directives/payload/normalize-surface-payload.ts: score directive src must not import media URL safety through an invalid parent traversal');
  }
  const searchDataModelText = readFileSync('docs/references/search-data-model.md', 'utf8');
  if (new RegExp('SearchCandidate' + '[^\\n]*、' + 'url' + '、', 'u').test(searchDataModelText) || searchDataModelText.includes('SearchCandidate.url')) {
    violations.push('search import boundary violation: docs/references/search-data-model.md: Search candidate live docs must not carry legacy URL fields');
  }

  const devSearchArtifactMiddlewareText = readFileSync('build/dev/dev-search-artifact-middleware.ts', 'utf8');
  if (!devSearchArtifactMiddlewareText.includes('resolveSearchCatalogUrl') || !devSearchArtifactMiddlewareText.includes('resolvePagefindBaseUrl')) {
    violations.push('search import boundary violation: build/dev/dev-search-artifact-middleware.ts: dev Search catalog and Pagefind assets must share SearchArtifactUrlResolver path helpers');
  }

  return Promise.resolve(violations);
};

if (process.argv[1]?.includes('assert-search-import-boundary') === true) {
  const violations = await findSearchImportBoundaryViolations();
  for (const violation of violations) {
    console.error(violation);
  }

  if (violations.length > 0) process.exit(1);
}
