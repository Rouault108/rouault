import { readFileSync } from 'node:fs';
import { collectImportEdges, walkSourceFiles, edgeMatches } from './import-boundary-graph.js';

const roots = ['src', 'build'];
const forbiddenPatterns: readonly [RegExp, string][] = [
  [/\bLegacyClassifyLinkOptions\b/u, 'legacy link classification options must be removed'],
  [/classifyLinkHref\s*\(\s*href\b/u, 'legacy classifyLinkHref(href, ...) API must be removed'],
  [/\bDEFAULT_SITE_URL_CONTEXT\b/u, 'production code must not import DEFAULT_SITE_URL_CONTEXT'],
  [new RegExp('\\b' + 'isRoutable' + 'LinkKind' + '\\b', 'u'), 'legacy routable predicate must not be used'],
  [new RegExp('\\b' + 'isExternal' + 'LinkKind' + '\\b', 'u'), 'legacy external predicate must not be used'],
  [new RegExp('\\b' + 'Browser' + 'LinkInterceptor' + '\\b', 'u'), 'legacy router interceptor export must not be used'],
  [new RegExp('\\b' + 'HtmlDocument' + 'Fetcher' + '\\b', 'u'), 'HTML direct fetcher must not be used'],
  [new RegExp('\\b' + 'navigateTo' + 'Url' + '\\b', 'u'), 'legacy imperative navigation API must not be used'],
];

const forbiddenEdges: readonly [string, string, string][] = [
  ['shared/link/', 'src/router/', 'shared/link must not depend on src/router'],
  ['shared/url/', 'shared/link/', 'shared/url must not depend on shared/link'],
  ['src/router/', 'build/navigation/', 'src/router must not import build/navigation'],
  ['src/search/', 'build/search/', 'src/search must not import build/search'],
];

let failed = false;
for (const file of walkSourceFiles(roots)) {
  if (file.startsWith('scripts/assert-')) continue;
  const text = readFileSync(file, 'utf8');
  for (const [pattern, reason] of forbiddenPatterns) {
    if (pattern.test(text)) {
      console.error(`production import boundary violation: ${file}: ${reason}`);
      failed = true;
    }
  }
}

for (const edge of collectImportEdges(roots)) {
  for (const [fromPrefix, toPrefix, reason] of forbiddenEdges) {
    if (edgeMatches(edge, fromPrefix, toPrefix)) {
      console.error(`production import boundary violation: ${edge.from} -> ${edge.specifier}: ${reason}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
