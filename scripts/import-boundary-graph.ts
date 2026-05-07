import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

export interface ImportBoundaryViolation {
  readonly file: string;
  readonly specifier: string;
  readonly ruleId: 'production-no-test-imports' | 'toc-production-boundary-explicit';
}

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?(?:[^'"]+?\s+from\s+)?|export\s+(?:type\s+)?[^'"]+?\s+from\s+)['"]([^'"]+)['"]/gu;

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

const resolveRelativeSpecifier = (fromFile: string, specifier: string): string | null => {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const resolved = path.normalize(path.join(path.dirname(fromFile), specifier));
  return resolved.split(path.sep).join('/');
};

export const findProductionImportBoundaryViolations = async (
  repoRoot = process.cwd(),
): Promise<ImportBoundaryViolation[]> => {
  const files = await collectFiles(path.join(repoRoot, 'src'));
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

    }
  }

  return violations;
};
