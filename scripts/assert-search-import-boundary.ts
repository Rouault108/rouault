import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

interface SearchImportBoundaryViolation {
  readonly file: string;
  readonly specifier: string;
  readonly ruleId: 'search-dialog-no-router-core-import' | 'search-return-to-reading-via-adapter';
}

const IMPORT_RE =
  /(?<statement>(?:import|export)\s+(?:type\s+)?(?:[^'"]+?\s+from\s+)?['"](?<specifier>[^'"]+)['"])/gu;

const isSourceFile = (filePath: string): boolean =>
  (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) && !filePath.endsWith('.d.ts');

const collectFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
    } else if (entry.isFile() && isSourceFile(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files;
};

const toRepoPath = (repoRoot: string, absolutePath: string): string =>
  path.relative(repoRoot, absolutePath).split(path.sep).join('/');

const normalizeSpecifierPath = (repoPath: string, specifier: string): string | null => {
  if (!specifier.startsWith('.')) {
    return null;
  }

  return path
    .normalize(path.join(path.dirname(repoPath), specifier))
    .replace(/\\/gu, '/')
    .replace(/\.(?:js|ts|tsx)$/u, '.ts');
};

const isTypeOnlyStatement = (statement: string): boolean =>
  /^(?:import|export)\s+type\b/u.test(statement.trim());

export const findSearchImportBoundaryViolations = async (
  repoRoot = process.cwd(),
): Promise<SearchImportBoundaryViolation[]> => {
  const searchDialogFiles = await collectFiles(
    path.join(repoRoot, 'src/components/ui/search-dialog'),
  );
  const searchFiles = await collectFiles(path.join(repoRoot, 'src/search'));
  const violations: SearchImportBoundaryViolation[] = [];

  for (const absoluteFile of [...searchDialogFiles, ...searchFiles]) {
    const repoPath = toRepoPath(repoRoot, absoluteFile);
    const source = readFileSync(absoluteFile, 'utf8');

    for (const match of source.matchAll(IMPORT_RE)) {
      const statement = match.groups?.['statement'] ?? '';
      const specifier = match.groups?.['specifier'] ?? '';
      const resolved = normalizeSpecifierPath(repoPath, specifier);
      if (resolved === null) {
        continue;
      }

      if (repoPath.startsWith('src/components/ui/search-dialog/') && resolved === 'src/router/router.ts') {
        violations.push({
          file: repoPath,
          specifier,
          ruleId: 'search-dialog-no-router-core-import',
        });
      }

      if (
        repoPath.startsWith('src/search/') &&
        resolved.startsWith('src/router/') &&
        !isTypeOnlyStatement(statement)
      ) {
        violations.push({
          file: repoPath,
          specifier,
          ruleId: 'search-return-to-reading-via-adapter',
        });
      }
    }
  }

  return violations;
};

const isCliEntrypoint = (): boolean => {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
};

if (isCliEntrypoint()) {
  const violations = await findSearchImportBoundaryViolations();

  if (violations.length > 0) {
    console.error('search import boundary violations:');
    for (const violation of violations) {
      console.error(`- ${violation.ruleId}: ${violation.file} imports ${violation.specifier}`);
    }
    process.exitCode = 1;
  } else {
    console.log('assert-search-import-boundary: ok');
  }
}
