import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

export interface ImportBoundaryViolation {
  readonly file: string;
  readonly specifier: string;
  readonly ruleId:
    | 'production-no-test-imports'
    | 'toc-production-boundary-explicit'
    | 'runtime-no-build-metadata-imports';
}

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?(?:[^'"]+?\s+from\s+)?|export\s+(?:type\s+)?[^'"]+?\s+from\s+)['"]([^'"]+)['"]/gu;

const RUNTIME_SOURCE_ROOTS = ['src', 'shared'] as const;

const RUNTIME_FORBIDDEN_BUILD_IMPORTS = [
  'build/metadata/build-id',
  'build/metadata/generated-at',
  'build/metadata/build-label',
  'build/metadata/build-metadata',
  'build/dev/dev-build-metadata',
] as const;

const isSourceFile = (filePath: string): boolean =>
  (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) &&
  !filePath.endsWith('.d.ts') &&
  !filePath.includes(`${path.sep}.generated${path.sep}`);

const collectFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      files.push(...(await collectFiles(absolutePath)));
    } else if (entry.isFile() && isSourceFile(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files;
};

const toRepoPath = (repoRoot: string, filePath: string): string =>
  path.relative(repoRoot, filePath).split(path.sep).join('/');

const stripKnownExtension = (value: string): string =>
  value.replace(/\.(?:js|mjs|ts|tsx)$/u, '');

const resolveRelativeSpecifier = (fromFile: string, specifier: string): string | null => {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const resolved = path.normalize(path.join(path.dirname(fromFile), specifier));
  return stripKnownExtension(resolved.split(path.sep).join('/'));
};

const isForbiddenRuntimeBuildImport = (resolved: string | null): boolean =>
  resolved !== null &&
  RUNTIME_FORBIDDEN_BUILD_IMPORTS.some(
    (forbidden) => resolved === forbidden || resolved.startsWith(`${forbidden}/`),
  );

export const findProductionImportBoundaryViolations = async (
  repoRoot = process.cwd(),
): Promise<ImportBoundaryViolation[]> => {
  const files = (
    await Promise.all(
      RUNTIME_SOURCE_ROOTS.map((root) => collectFiles(path.join(repoRoot, root))),
    )
  ).flat();
  const violations: ImportBoundaryViolation[] = [];

  for (const absoluteFile of files) {
    const repoPath = toRepoPath(repoRoot, absoluteFile);
    const source = readFileSync(absoluteFile, 'utf8');

    for (const match of source.matchAll(IMPORT_RE)) {
      const specifier = match[1] ?? '';
      const resolved = resolveRelativeSpecifier(repoPath, specifier);
      if (resolved?.startsWith('test/') === true) {
        violations.push({
          file: repoPath,
          specifier,
          ruleId: 'production-no-test-imports',
        });
      }

      if (isForbiddenRuntimeBuildImport(resolved)) {
        violations.push({
          file: repoPath,
          specifier,
          ruleId: 'runtime-no-build-metadata-imports',
        });
      }
    }
  }

  return violations;
};
