import { readFileSync } from 'node:fs';
import { collectImportEdges, walkSourceFiles, edgeMatches } from './import-boundary-graph.js';

const roots = ['src/search', 'shared/search'];
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

  for (const edge of collectImportEdges(roots)) {
    if (edgeMatches(edge, 'src/search/', 'build/search/')) {
      violations.push(`search import boundary violation: ${edge.from} -> ${edge.specifier}: src/search must not import build/search`);
    }
    if (edgeMatches(edge, 'shared/search/', 'src/')) {
      violations.push(`search import boundary violation: ${edge.from} -> ${edge.specifier}: shared/search must not import src`);
    }
  }

  const bootstrapText = readFileSync('src/search/bootstrap.ts', 'utf8');
  if (!bootstrapText.includes('initSearchUnavailable(options: InitSearchUnavailableOptions): SearchBootstrapResult')) {
    violations.push('search import boundary violation: src/search/bootstrap.ts: initSearchUnavailable exact API must be present');
  }
  const searchPageText = readFileSync('src/components/search/search-page.ts', 'utf8');
  if (/createSearchCore(?:FromSiteContext)?\b/u.test(searchPageText)) {
    violations.push('search import boundary violation: src/components/search/search-page.ts: SearchCore must not be created by the component');
  }
  if (searchPageText.includes('pathname.startsWith(\'/\')')) {
    violations.push('search import boundary violation: src/components/search/search-page.ts: SearchPage must not fake a route manifest predicate');
  }
  if (!searchPageText.includes('getInitializedSearchCore')) {
    violations.push('search import boundary violation: src/components/search/search-page.ts: SearchPage must consume the bootstrap-initialized Search runtime');
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
