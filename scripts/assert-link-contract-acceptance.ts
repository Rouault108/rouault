import { existsSync, readFileSync } from 'node:fs';

const violations: string[] = [];

const readRequiredFile = (path: string): string => {
  if (!existsSync(path)) {
    violations.push(`${path}: required acceptance input file is missing`);
    return '';
  }
  return readFileSync(path, 'utf8');
};

const requireContains = (path: string, text: string, label: string): void => {
  const source = readRequiredFile(path);
  if (!source.includes(text)) {
    violations.push(`${path}: ${label}`);
  }
};

const forbidPattern = (path: string, pattern: RegExp, label: string): void => {
  const source = readRequiredFile(path);
  if (pattern.test(source)) {
    violations.push(`${path}: ${label}`);
  }
};


const forbidFileExists = (path: string, label: string): void => {
  if (existsSync(path)) {
    violations.push(`${path}: ${label}`);
  }
};

const packageJson = readRequiredFile('package.json');
if (!packageJson.includes('"assert-link-contract-acceptance"')) {
  violations.push('package.json: assert-link-contract-acceptance script must be registered');
}
if (!packageJson.includes('scripts/assert-link-contract-acceptance.ts')) {
  violations.push('package.json: assert-link-contract-acceptance must point to scripts/assert-link-contract-acceptance.ts');
}

forbidPattern(
  'src/search/search-core.ts',
  /createDefaultPagefindLoader\b/u,
  'Pagefind loader authority must not be imported or re-exported from the public SearchCore entry point',
);
forbidPattern(
  'src/search/sources/pagefind-source.ts',
  /createDefaultPagefindLoader\b/u,
  'Pagefind loader authority must live in shared/search/search-loaders.ts only',
);
forbidPattern(
  'src/client/post-hydrate/search-page-enhancer.ts',
  /createSearchCore(?:FromSiteContext)?\b/u,
  'search-page enhancer must not create SearchCore directly or through a compatibility wrapper',
);
forbidPattern(
  'src/client/post-hydrate/search-page-enhancer.ts',
  /pathname\.startsWith\('\/'\)/u,
  'search-page enhancer must not fake a route manifest predicate',
);
requireContains(
  'src/layouts/search-page-html.ts',
  'data-hydration-key="search-page-enhancer"',
  'static search page must expose the search-page enhancer hydration key',
);
requireContains(
  'build/remark/directives/payload/normalize-surface-payload.ts',
  'sanitizeScoreSource',
  'score directive src must be validated by media URL safety',
);
requireContains(
  'shared/search/search-loaders.ts',
  'export const createDefaultPagefindLoader',
  'Pagefind loader authority must be defined in shared/search/search-loaders.ts',
);
requireContains(
  'scripts/assert-search-import-boundary.ts',
  'createDefaultPagefindLoader',
  'Search import boundary must detect Pagefind loader authority leaks',
);

forbidPattern(
  'src/search/core/search-core.ts',
  new RegExp('testOnly' + 'LoadSearchCatalog', 'u'),
  'legacy SearchCoreDependencies.testOnly' + 'LoadSearchCatalog must be removed',
);
forbidPattern(
  'shared/search/document-url.ts',
  /https:\/\/rouault\.invalid|rouault\.invalid|window\.location\.origin/u,
  'Search URL contract must not use synthetic origin or window.location' + '.origin',
);
forbidPattern(
  'shared/search/search-url.ts',
  /https:\/\/rouault\.invalid|rouault\.invalid/u,
  'Search state URL normalization must not use synthetic origin',
);
requireContains(
  'build/dev/dev-search-artifact-middleware.ts',
  'resolvePagefindBaseUrl',
  'dev Search artifact middleware must serve Pagefind assets through the Search artifact URL resolver',
);
requireContains(
  'build/dev/dev-search-artifact-middleware.ts',
  'resolveSearchCatalogUrl',
  'dev Search artifact middleware must serve the basePath-aware search catalog URL',
);
requireContains(
  'shared/media/media-source-attributes.ts',
  'siteUrlContext: SiteUrlContext',
  'score source sanitizer must require SiteUrlContext',
);
requireContains(
  'shared/media/media-source-attributes.ts',
  'stripBasePathFromPathname',
  'score source sanitizer must validate the basePath-stripped /media/score/ pathname',
);
requireContains(
  'src/router/browser-link-interceptor.ts',
  'export class RouterLinkInterceptor',
  'RouterLinkInterceptor implementation must live in src/router/browser-link-interceptor.ts',
);
forbidPattern(
  'src/router/create-router-runtime.ts',
  /router-link-interceptor\.js/u,
  'Router runtime must import RouterLinkInterceptor from browser-link-interceptor.js, not a compatibility wrapper',
);

requireContains(
  'build/remark/directives/payload/normalize-surface-payload.ts',
  "from '../../../../shared/media/media-source-attributes.js'",
  'score directive src must import media URL safety through the correct repository-relative boundary',
);
forbidPattern(
  'build/remark/directives/payload/normalize-surface-payload.ts',
  /\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\/media\/media-source-attributes\.js/u,
  'score directive src must not import media URL safety through an invalid parent traversal',
);
forbidPattern(
  'docs/references/search-data-model.md',
  new RegExp('SearchCandidate' + '[^\\n]*、' + 'url' + '、', 'u'),
  'Search data model docs must not describe the candidate as carrying a legacy URL field',
);
forbidPattern(
  'docs/references/search-data-model.md',
  new RegExp('SearchCandidate' + '\\.url', 'u'),
  'Search data model docs must not reference the legacy candidate URL property',
);

forbidPattern(
  'docs/design-system/components/search-dialog.md',
  new RegExp('SearchResultItem' + '\\.url', 'u'),
  'live Search dialog docs must not reference legacy SearchResultItem' + '.url',
);



forbidFileExists(
  'src/router/rouault-url-policy.ts',
  'legacy router-local RouaultUrlPolicy module must be removed instead of kept as a compatibility wrapper',
);
forbidPattern(
  'test/node/rouault-url-policy.test.ts',
  /RouaultUrlPolicy/u,
  'Rouault URL policy tests must target shared/url/rouault-url-policy.ts directly, not a router compatibility wrapper',
);
requireContains(
  'test/node/rouault-url-policy.test.ts',
  '../../shared/url/rouault-url-policy.js',
  'Rouault URL policy tests must import the shared URL policy authority directly',
);

requireContains(
  'src/router/location-adapter.ts',
  'createSharedRouaultUrlPolicy',
  'LocationAdapter must use the shared Rouault URL policy as its default policy',
);
forbidPattern(
  'src/router/location-adapter.ts',
  /\.\/rouault-url-policy\.js/u,
  'LocationAdapter must not use the legacy router-local URL policy module',
);
requireContains(
  'src/router/validate-internal-document-navigation-request.ts',
  'normalizeRouaultUrl',
  'router navigation validation must share URL normalization with link classification',
);
requireContains(
  'src/router/router-types.ts',
  'InternalDocumentNormalizedUrl',
  'NavigationResult normalizedUrl branches must use the branded internal document URL type',
);
forbidPattern(
  'src/router/router-types.ts',
  /normalizedUrl:\s*string/u,
  'NavigationResult and router contexts must not expose normalizedUrl as an unbranded string',
);
requireContains(
  'shared/link/link-annotation.ts',
  'resolveRouterInterceptionPolicy',
  'ResolvedLinkAnnotation.routerInterceptionPolicy must be derived in the shared annotation layer',
);
requireContains(
  'src/router/dom-link-contract.ts',
  'classifyLinkHref',
  'committed runtime DOM contract must reclassify links instead of using a scheme-only check',
);
requireContains(
  'src/router/dom-link-contract.ts',
  'detectUnsafeHref',
  'committed runtime DOM contract must use the shared unsafe href detector',
);
requireContains(
  'scripts/sync-link-card-metadata.ts',
  'detectUnsafeHref',
  'link-card metadata sync must reject unsafe and credentials URLs through the shared detector',
);
requireContains(
  'scripts/sync-link-card-metadata.ts',
  'createUrlLogRef',
  'link-card metadata sync diagnostics must redact raw URLs',
);
forbidPattern(
  'scripts/sync-link-card-metadata.ts',
  /warn: \$\{url\}|metadata: \$\{url\}|thumbnail \$\{metadata\.image\}/u,
  'link-card metadata sync must not echo raw URLs in diagnostics',
);
forbidPattern(
  'build/content/validate-note-source-links.ts',
  /href="\$\{link\.href\}"/u,
  'validate-note-links must not echo raw href values in diagnostics',
);
requireContains(
  'build/content/validate-note-source-links.ts',
  'createHrefDiagnosticRef',
  'validate-note-links must use redacted href diagnostic references',
);
requireContains(
  'build/rehype/preview-sandbox-link-contract.ts',
  'detectUnsafeHref',
  'preview sandbox base-url validation must use the shared unsafe href detector',
);
requireContains(
  'build/rehype/preview-sandbox-link-contract.ts',
  'stripBasePathFromPathname',
  'preview sandbox base-url validation must use segment-safe basePath stripping',
);


requireContains(
  'shared/search/search-json-artifact-parser.ts',
  'parseSearchCatalogJson',
  'Search catalog JSON parser authority must live in shared/search/search-json-artifact-parser.ts',
);
requireContains(
  'shared/search/search-json-artifact-parser.ts',
  'parseStaticExploreSearchResponseJson',
  'static explore response JSON parser authority must live in shared/search/search-json-artifact-parser.ts',
);
requireContains(
  'shared/search/search-diagnostics.ts',
  'export interface SearchJsonParseDiagnosticSink',
  'SearchJsonParseDiagnosticSink authority must live in shared/search/search-diagnostics.ts',
);
requireContains(
  'shared/search/search-diagnostics.ts',
  'readonly addIssue',
  'SearchJsonParseDiagnosticSink and SearchEventDiagnosticSink must expose addIssue, not record',
);
forbidPattern(
  'shared/search/search-loaders.ts',
  /interface SearchJsonParseDiagnosticSink/u,
  'SearchJsonParseDiagnosticSink must not be locally defined in search-loaders.ts',
);
requireContains(
  'shared/search/document-url.ts',
  'SearchCanonicalPathnameBrand: unique symbol',
  'SearchCanonicalPathname must use a unique symbol brand',
);
requireContains(
  'shared/search/document-url.ts',
  'SearchRenderHrefBrand: unique symbol',
  'SearchRenderHref must use a unique symbol brand',
);
forbidPattern(
  'shared/search/search-types.ts',
  /candidateUrl/u,
  'SearchIndexTypeContract must not keep legacy candidateUrl',
);
requireContains(
  'shared/search/search-types.ts',
  'renderHref: SearchRenderHref',
  'SearchResultItem must carry browser display renderHref',
);
requireContains(
  'src/components/ui/search-dialog/search-dialog.types.ts',
  'renderHref: string',
  'Search dialog item and selected detail must use renderHref, not legacy url',
);
forbidPattern(
  'src/components/ui/search-dialog/search-dialog.types.ts',
  /\burl:\s*string/u,
  'Search dialog public item/detail contract must not expose legacy url',
);
requireContains(
  'shared/search/search-diagnostics.ts',
  'export interface SearchEventDiagnosticSink',
  'Search event diagnostic sink must be defined separately from response-scoped diagnostics',
);
requireContains(
  'src/search/navigation.ts',
  'SearchReturnToReadingNavigationOptions',
  'Search return-to-reading handler must require injected event diagnostics',
);
requireContains(
  'src/search/navigation.ts',
  'search-event-render-href-mismatch',
  'Search event renderHref mismatch must be recorded',
);
forbidPattern(
  'src/search/navigation.ts',
  /defaultSearchEventDiagnosticSink/u,
  'production Search navigation must not fallback to defaultSearchEventDiagnosticSink',
);
requireContains(
  'src/router/location-adapter.ts',
  'readTrustedHistoryRouterUrl',
  'LocationAdapter must validate history.state.__routerUrl before normalization',
);
requireContains(
  'test/node/location-adapter.test.ts',
  '不正な __routerUrl を破棄',
  'history.state.__routerUrl invalid recovery must be covered by tests',
);
requireContains(
  'test/browser/search-navigation.browser.test.ts',
  'search-event-render-href-mismatch',
  'Search event renderHref mismatch must be covered by browser tests',
);
forbidPattern(
  'build/search/build-static-explore-response.ts',
  /renderHref/u,
  'initial-search-response-json/static explore response must not store renderHref',
);


requireContains(
  'shared/search/search-json-artifact-parser.ts',
  "readonly reason: 'invalid-search-catalog-schema'",
  'ParseSearchCatalogJsonResult.reason must be fixed to invalid-search-catalog-schema',
);
requireContains(
  'shared/search/search-json-artifact-parser.ts',
  "readonly reason: 'invalid-static-response-schema'",
  'ParseStaticExploreSearchResponseResult.reason must be fixed to invalid-static-response-schema',
);
forbidPattern(
  'shared/search/search-json-artifact-parser.ts',
  /readonly reason: 'schema-mismatch'|readonly reason: 'invalid-json'/u,
  'Search JSON parser result reasons must not expose invalid-json or schema-mismatch',
);
requireContains(
  'shared/search/search-diagnostics.ts',
  "export type SearchArtifactDiagnosticSource = 'search-catalog-json' | 'static-explore-response-json'",
  'SearchArtifactDiagnosticSource must use the exact JSON artifact source literals',
);
forbidPattern(
  'shared/search/search-diagnostics.ts',
  /export type SearchArtifactDiagnosticSource = 'search-catalog'|'static-explore-response'/u,
  'SearchArtifactDiagnosticSource must not keep legacy artifact source literals',
);
requireContains(
  'shared/search/search-diagnostics.ts',
  'SearchEventDiagnosticCandidateRefBrand: unique symbol',
  'SearchEventDiagnosticCandidateRef must use a unique symbol brand',
);
requireContains(
  'shared/search/search-json-artifact-parser.ts',
  'search-json-dropped-items',
  'Search JSON parser must record item drop summaries through the JSON diagnostic taxonomy',
);
requireContains(
  'src/layouts/search-page-html.ts',
  'initial-search-response-json',
  'static SearchPage HTML must serialize initial-search-response-json for progressive enhancement',
);
forbidPattern(
  'src/client/post-hydrate/search-page-enhancer.ts',
  /JSON\.parse\(normalized\) as ExploreSearchResponse/u,
  'search-page enhancer must not cast parsed initial-search-response-json directly to ExploreSearchResponse',
);
requireContains(
  'src/router/location-adapter.ts',
  'detectUnsafeHref',
  'LocationAdapter must reject unsafe history.state.__routerUrl before normalization',
);
requireContains(
  'src/router/location-adapter.ts',
  'isDefaultInternalResourcePathname',
  'LocationAdapter must reject internal-resource history.state.__routerUrl before router commit',
);
requireContains(
  'test/node/location-adapter.test.ts',
  '/assets/file.pdf',
  'history.state.__routerUrl recovery tests must cover internal-resource URLs',
);
requireContains(
  'test/node/location-adapter.test.ts',
  '/notes/%2e%2e/secret/',
  'history.state.__routerUrl recovery tests must cover encoded dangerous segments',
);
requireContains(
  'src/components/layout/layout-header.ts',
  'ui-menu-link',
  'Corpus switcher must render link items',
);
forbidPattern(
  'shared/navigation/shell-projection.ts',
  /CorpusNavigationProjectionPayload\s*\|\s*readonly\s+CorpusNavigationItem\[\]/u,
  'HeaderShellProjection.corpora must not accept raw CorpusNavigationItem arrays',
);
forbidPattern(
  'test/browser/app-router.browser.test.ts',
  /corpora:\s*\[/u,
  'app-router shellProjection fixtures must use CorpusNavigationProjectionPayload, not raw Corpus arrays',
);
forbidPattern(
  'test/ssr/navigation-artifacts.test.ts',
  /corpora-json=(?:'|")\[\]/u,
  'navigation artifact fixtures must use CorpusNavigationProjectionPayload JSON, not raw arrays',
);

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`link contract acceptance violation: ${violation}`);
  }
  process.exit(1);
}
