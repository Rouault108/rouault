/// <reference types="node" />

import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = process.cwd();
const workflowRoot = path.join(repositoryRoot, 'docs', 'workflows');

const requiredPaths = [
  'docs/workflows/README.md',
  'docs/workflows/proportionality-and-review.md',
  'docs/workflows/analysis-and-review-surfaces.md',
  'docs/workflows/source-state-and-codex.md',
  'docs/workflows/audited-mode.md',
  'docs/workflows/problem-solving/README.md',
  'docs/workflows/problem-solving/quick-start.md',
  'docs/workflows/problem-solving/prompts/r1-mini.md',
  'docs/workflows/problem-solving/prompts/r2-lite.md',
  'docs/workflows/problem-solving/prompts/r2-full-cause-analysis.md',
  'docs/workflows/problem-solving/prompts/r2-full-fix-plan.md',
  'docs/workflows/problem-solving/prompts/r3-handoff.md',
  'docs/workflows/feature-change/README.md',
  'docs/workflows/feature-change/quick-start.md',
  'docs/workflows/feature-change/prompts/r1-mini.md',
  'docs/workflows/feature-change/prompts/r2-lite.md',
  'docs/workflows/feature-change/prompts/r2-full.md',
  'docs/workflows/feature-change/prompts/r3-full.md',
  'docs/workflows/shared/prompts/chatgpt-plan-review.md',
  'docs/workflows/shared/prompts/codex-limited-implementation.md',
  'docs/workflows/shared/prompts/chatgpt-completion-review.md',
  'docs/workflows/shared/prompts/r4-phased.md',
  'docs/workflows/shared/prompts/r4-completion-overlay.md',
] as const;

const legacyNormativePaths = [
  'docs/workflows/problem-solving/full-workflow',
  'docs/workflows/problem-solving/frozen-v85-reference',
  'docs/workflows/problem-solving/r4-validation',
  'docs/workflows/feature-change/prompts/r4-phased.md',
  'docs/workflows/shared/prompts/chatgpt-diff-review.md',
] as const;

const requiredQuickStartReferences = [
  '../proportionality-and-review.md',
  '../source-state-and-codex.md',
  '../shared/prompts/chatgpt-plan-review.md',
  '../shared/prompts/codex-limited-implementation.md',
  '../shared/prompts/chatgpt-completion-review.md',
  '../shared/prompts/r4-phased.md',
  '../shared/prompts/r4-completion-overlay.md',
] as const;

// workflow文書で使用するinline relative linkだけを検査する。
// anchorの実在性やreference-style linkまで扱う汎用validatorにはしない。
const markdownLinkPattern = /(?<!!)\[[^\]]*\]\((?<target>[^)]+)\)/gu;

const toRepositoryPath = (absolutePath: string): string =>
  path.relative(repositoryRoot, absolutePath).split(path.sep).join('/');

const pathExists = async (relativePath: string): Promise<boolean> => {
  try {
    await access(path.join(repositoryRoot, relativePath));
    return true;
  } catch {
    return false;
  }
};

const collectMarkdownFiles = async (directory: string): Promise<readonly string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectMarkdownFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : [];
    }),
  );
  return paths.flat();
};

const normalizeMarkdownTarget = (rawTarget: string): string | null => {
  const target =
    rawTarget
      .trim()
      .replace(/^<|>$/gu, '')
      .split(/\s+["']/u, 1)[0] ?? '';
  if (
    !target ||
    target.startsWith('#') ||
    target.startsWith('/') ||
    /^[a-z][a-z0-9+.-]*:/iu.test(target)
  ) {
    return null;
  }
  return decodeURIComponent(target.split('#', 1)[0] ?? '');
};

const assertRequiredPaths = async (): Promise<void> => {
  for (const relativePath of requiredPaths) {
    if (!(await pathExists(relativePath))) {
      throw new Error(`required workflow file is missing: ${relativePath}`);
    }
  }
};

const assertLegacyNormativePathsAreAbsent = async (): Promise<void> => {
  for (const relativePath of legacyNormativePaths) {
    if (await pathExists(relativePath)) {
      throw new Error(`legacy workflow asset remains in the normative path: ${relativePath}`);
    }
  }

  for (const promptRoot of [
    path.join(workflowRoot, 'problem-solving', 'prompts'),
    path.join(workflowRoot, 'feature-change', 'prompts'),
  ]) {
    const entries = await readdir(promptRoot, { withFileTypes: true });
    const numberedLegacyPrompt = entries.find(
      (entry) => entry.isFile() && /^\d{2}-.*\.md$/u.test(entry.name),
    );
    if (numberedLegacyPrompt) {
      throw new Error(
        `numbered legacy prompt remains: ${toRepositoryPath(path.join(promptRoot, numberedLegacyPrompt.name))}`,
      );
    }
  }
};

const assertMarkdownLinksResolve = async (): Promise<void> => {
  const markdownFiles = await collectMarkdownFiles(workflowRoot);
  for (const markdownPath of markdownFiles) {
    const source = await readFile(markdownPath, 'utf8');
    for (const match of source.matchAll(markdownLinkPattern)) {
      const target = normalizeMarkdownTarget(match.groups?.['target'] ?? '');
      if (!target) {
        continue;
      }
      const resolvedPath = path.resolve(path.dirname(markdownPath), target);
      try {
        await stat(resolvedPath);
      } catch {
        throw new Error(`broken workflow link: ${toRepositoryPath(markdownPath)} -> ${target}`);
      }
    }
  }
};

const assertQuickStartsUseSharedEntryPoints = async (): Promise<void> => {
  for (const relativePath of [
    'docs/workflows/problem-solving/quick-start.md',
    'docs/workflows/feature-change/quick-start.md',
  ]) {
    const source = await readFile(path.join(repositoryRoot, relativePath), 'utf8');
    for (const reference of requiredQuickStartReferences) {
      if (!source.includes(reference)) {
        throw new Error(`${relativePath} does not reference shared entry point: ${reference}`);
      }
    }
  }
};

const checkWorkflowDocs = async (): Promise<void> => {
  await assertRequiredPaths();
  await assertLegacyNormativePathsAreAbsent();
  await assertMarkdownLinksResolve();
  await assertQuickStartsUseSharedEntryPoints();
};

await checkWorkflowDocs();
console.log('[workflow-docs] structure check passed');
