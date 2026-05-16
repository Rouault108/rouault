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
  'src/components/search/search-page.ts',
  /createSearchCore(?:FromSiteContext)?\b/u,
  'SearchPage must not create SearchCore directly or through a compatibility wrapper',
);
forbidPattern(
  'src/components/search/search-page.ts',
  /pathname\.startsWith\('\/'\)/u,
  'SearchPage must not fake a route manifest predicate',
);
requireContains(
  'src/components/search/search-page.ts',
  'getInitializedSearchCore',
  'SearchPage must consume the bootstrap-initialized Search runtime',
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

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`link contract acceptance violation: ${violation}`);
  }
  process.exit(1);
}
