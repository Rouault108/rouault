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
let failed = false;
for (const file of walkSourceFiles(roots)) {
  const text = readFileSync(file, 'utf8');
  for (const [pattern, reason] of forbiddenPatterns) {
    if (pattern.test(text)) {
      console.error(`search import boundary violation: ${file}: ${reason}`);
      failed = true;
    }
  }
}

for (const edge of collectImportEdges(roots)) {
  if (edgeMatches(edge, 'src/search/', 'build/search/')) {
    console.error(`search import boundary violation: ${edge.from} -> ${edge.specifier}: src/search must not import build/search`);
    failed = true;
  }
  if (edgeMatches(edge, 'shared/search/', 'src/')) {
    console.error(`search import boundary violation: ${edge.from} -> ${edge.specifier}: shared/search must not import src`);
    failed = true;
  }
}

const bootstrapText = readFileSync('src/search/bootstrap.ts', 'utf8');
if (!bootstrapText.includes('initSearchUnavailable(options: InitSearchUnavailableOptions): SearchBootstrapResult')) {
  console.error('search import boundary violation: src/search/bootstrap.ts: initSearchUnavailable exact API must be present');
  failed = true;
}
const searchPageText = readFileSync('src/components/search/search-page.ts', 'utf8');
if (/createSearchCore(?:FromSiteContext)?\b/u.test(searchPageText)) {
  console.error('search import boundary violation: src/components/search/search-page.ts: SearchCore must not be created by the component');
  failed = true;
}
if (/pathname\.startsWith\('\/'\)/u.test(searchPageText)) {
  console.error('search import boundary violation: src/components/search/search-page.ts: SearchPage must not fake a route manifest predicate');
  failed = true;
}
if (!searchPageText.includes('getInitializedSearchCore')) {
  console.error('search import boundary violation: src/components/search/search-page.ts: SearchPage must consume the bootstrap-initialized Search runtime');
  failed = true;
}
const pagefindSourceText = readFileSync('src/search/sources/pagefind-source.ts', 'utf8');
if (/createDefaultPagefindLoader\b/u.test(pagefindSourceText)) {
  console.error('search import boundary violation: src/search/sources/pagefind-source.ts: Pagefind loader authority must live in shared/search/search-loaders.ts only');
  failed = true;
}
const searchCoreEntrypointText = readFileSync('src/search/search-core.ts', 'utf8');
if (/createDefaultPagefindLoader\b/u.test(searchCoreEntrypointText)) {
  console.error('search import boundary violation: src/search/search-core.ts: Pagefind loader authority must not be re-exported from src/search/search-core.ts');
  failed = true;
}
const directivePayloadText = readFileSync('build/remark/directives/payload/normalize-surface-payload.ts', 'utf8');
if (!directivePayloadText.includes('sanitizeScoreSource')) {
  console.error('search import boundary violation: build/remark/directives/payload/normalize-surface-payload.ts: score directive src must be validated');
  failed = true;
}
if (!directivePayloadText.includes('policyContext.urlPolicyContext.siteUrlContext')) {
  console.error('search import boundary violation: build/remark/directives/payload/normalize-surface-payload.ts: score directive src must use NoteDirectiveUrlPolicyContext.siteUrlContext');
  failed = true;
}

if (!directivePayloadText.includes("from '../../../../shared/media/media-source-attributes.js'")) {
  console.error('search import boundary violation: build/remark/directives/payload/normalize-surface-payload.ts: score directive src must import media URL safety through the correct repository-relative boundary');
  failed = true;
}
if (/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\/media\/media-source-attributes\.js/u.test(directivePayloadText)) {
  console.error('search import boundary violation: build/remark/directives/payload/normalize-surface-payload.ts: score directive src must not import media URL safety through an invalid parent traversal');
  failed = true;
}
const searchDataModelText = readFileSync('docs/references/search-data-model.md', 'utf8');
if (new RegExp('SearchCandidate' + '[^\\n]*、' + 'url' + '、', 'u').test(searchDataModelText) || new RegExp('SearchCandidate' + '\\.url', 'u').test(searchDataModelText)) {
  console.error('search import boundary violation: docs/references/search-data-model.md: Search candidate live docs must not carry legacy URL fields');
  failed = true;
}

const devSearchArtifactMiddlewareText = readFileSync('build/dev/dev-search-artifact-middleware.ts', 'utf8');
if (!devSearchArtifactMiddlewareText.includes('resolveSearchCatalogUrl') || !devSearchArtifactMiddlewareText.includes('resolvePagefindBaseUrl')) {
  console.error('search import boundary violation: build/dev/dev-search-artifact-middleware.ts: dev Search catalog and Pagefind assets must share SearchArtifactUrlResolver path helpers');
  failed = true;
}

if (failed) process.exit(1);
