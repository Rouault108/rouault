import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_INCLUDE_PATTERNS,
  dedupeNormalizedFilePaths,
  detectJapaneseAsciiSpacingCandidates,
  matchesPathPattern,
  normalizeFilePath,
  shouldIncludeFilePath,
  type JapaneseAsciiSpacingCandidate,
} from '../../scripts/japanese-ascii-spacing-policy.js';

const ROOT_DIR = process.cwd();
const MAX_FAILURE_EXAMPLES = 30;

// Phase9A:ガイド・入口文書fail化。
const PHASE9A_FAIL_PATTERNS = [
  'README.md',
  'docs/README.md',
  'docs/guides/**/*.md',
  'src/about.11ty.ts',
  'src/index.11ty.ts',
] as const;

// Phase9B:core docs fail化。
const PHASE9B_FAIL_PATTERNS = [
  'docs/contracts/**/*.md',
  'docs/references/**/*.md',
  'docs/adr/**/*.md',
  'docs/architecture/**/*.md',
  'docs/design-system/*.md',
] as const;

const FAIL_PATTERNS = [...PHASE9A_FAIL_PATTERNS, ...PHASE9B_FAIL_PATTERNS] as const;

const REPORT_ONLY_PATTERNS = [
  'docs/design-system/components/**',
  'docs/workflows/**',
  'content/**',
  'src/**',
  'test/**',
] as const;

const EXCLUDE_PATTERNS = DEFAULT_EXCLUDE_PATTERNS;

interface AllowedCandidate {
  readonly filePath: string;
  readonly snippet: string;
  readonly reason: JapaneseAsciiSpacingCandidate['reason'];
  readonly justification: string;
}

const ALLOWED_CANDIDATES: readonly AllowedCandidate[] = [
  // ADR見出し由来IDの安定性とLitの正式名称を保持する。
  {
    filePath: 'docs/adr/code-surfaces-static-html-migration.md',
    snippet: '### 旧 Lit 互換を戻す案',
    reason: 'japanese-to-ascii',
    justification: '見出し由来ID安定性と英語正式名称',
  },
  {
    filePath: 'docs/adr/code-surfaces-static-html-migration.md',
    snippet: '### 旧 Lit 互換を戻す案',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と英語正式名称',
  },
  // ADR見出し由来IDの安定性とsource contractの契約フレーズを保持する。
  {
    filePath: 'docs/adr/code-surfaces-static-html-migration.md',
    snippet: ' + hidden inactive panel を維持する案',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約フレーズ',
  },
  {
    filePath: 'docs/adr/code-surfaces-static-html-migration.md',
    snippet: '### runtime enhancer で code group を全面再構成する案',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約フレーズ',
  },
  {
    filePath: 'docs/adr/code-surfaces-static-html-migration.md',
    snippet: '### runtime enhancer で code group を全面再構成する案',
    reason: 'japanese-to-ascii',
    justification: '見出し由来ID安定性と契約フレーズ',
  },
  {
    filePath: 'docs/adr/code-surfaces-static-html-migration.md',
    snippet: 'me enhancer で code group を全面再構成する案',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約フレーズ',
  },
  {
    filePath: 'docs/adr/code-surfaces-static-html-migration.md',
    snippet: '/ `ui-code-block-change` などの custom event を復元する案',
    reason: 'inline-code-to-japanese',
    justification: '見出し由来ID安定性と識別子',
  },
  {
    filePath: 'docs/adr/code-surfaces-static-html-migration.md',
    snippet: 'i-code-block-change` などの custom event を復元する案',
    reason: 'japanese-to-ascii',
    justification: '見出し由来ID安定性と契約フレーズ',
  },
  {
    filePath: 'docs/adr/code-surfaces-static-html-migration.md',
    snippet: 'change` などの custom event を復元する案',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約フレーズ',
  },
  // ADR見出し由来IDの安定性とUI契約語を保持する。
  {
    filePath: 'docs/adr/reading-chrome-note-frame-outer-gutter.md',
    snippet: '### sidebar item padding だけを増やす案',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約フレーズ',
  },
  {
    filePath: 'docs/adr/reading-chrome-note-frame-outer-gutter.md',
    snippet: '## `.layout-sidebar-col` に `margin-inline-start` ',
    reason: 'inline-code-to-japanese',
    justification: '見出し由来ID安定性と識別子',
  },
  {
    filePath: 'docs/adr/reading-chrome-note-frame-outer-gutter.md',
    snippet: ' に `margin-inline-start` を直接付ける案',
    reason: 'inline-code-to-japanese',
    justification: '見出し由来ID安定性と識別子',
  },
  {
    filePath: 'docs/adr/reading-chrome-note-frame-outer-gutter.md',
    snippet: ' `.layout-sidebar-col` に `margin-inline-start` を直',
    reason: 'japanese-to-inline-code',
    justification: '見出し由来ID安定性と識別子',
  },
  {
    filePath: 'docs/adr/reading-chrome-note-frame-outer-gutter.md',
    snippet: 'e-fixed-frame-max-width` に `--note-sidebar-main-g',
    reason: 'inline-code-to-japanese',
    justification: '見出し由来ID安定性と識別子',
  },
  {
    filePath: 'docs/adr/reading-chrome-note-frame-outer-gutter.md',
    snippet: '--note-sidebar-main-gap` を含める案',
    reason: 'inline-code-to-japanese',
    justification: '見出し由来ID安定性と識別子',
  },
  {
    filePath: 'docs/adr/reading-chrome-note-frame-outer-gutter.md',
    snippet: 'fixed-frame-max-width` に `--note-sidebar-main-gap',
    reason: 'japanese-to-inline-code',
    justification: '見出し由来ID安定性と識別子',
  },
  {
    filePath: 'docs/adr/reading-chrome-note-frame-outer-gutter.md',
    snippet: '### header max-width と note frame max-width を',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約フレーズ',
  },
  {
    filePath: 'docs/adr/reading-chrome-note-frame-outer-gutter.md',
    snippet: '### header max-width と note frame max-width を同時',
    reason: 'japanese-to-ascii',
    justification: '見出し由来ID安定性と契約フレーズ',
  },
  {
    filePath: 'docs/adr/reading-chrome-note-frame-outer-gutter.md',
    snippet: 'h と note frame max-width を同時に統合する案',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約フレーズ',
  },
  // 契約文書の見出し由来IDと公開契約語を保持する。
  {
    filePath: 'docs/contracts/static-choice-menu.md',
    snippet: '## DOM 契約',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約語',
  },
  {
    filePath: 'docs/contracts/static-choice-menu.md',
    snippet: '## Interaction 契約',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約語',
  },
  {
    filePath: 'docs/contracts/static-choice-menu.md',
    snippet: '## State 復元',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約語',
  },
  {
    filePath: 'docs/contracts/static-select.md',
    snippet: '## Superseded 契約',
    reason: 'ascii-to-japanese',
    justification: '見出し由来ID安定性と契約語',
  },
  // deployment recordのsource contractで固定される英語契約フレーズを保持する。
  {
    filePath: 'docs/guides/operations/deployment.md',
    snippet: 'state artifactである。stdout や raw command output を d',
    reason: 'ascii-to-japanese',
    justification: 'source contractで固定される契約フレーズ',
  },
  {
    filePath: 'docs/guides/operations/deployment.md',
    snippet: 'ate artifactである。stdout や raw command output を dep',
    reason: 'japanese-to-ascii',
    justification: 'source contractで固定される契約フレーズ',
  },
  {
    filePath: 'docs/guides/operations/deployment.md',
    snippet: 'out や raw command output を deployment data source',
    reason: 'ascii-to-japanese',
    justification: 'source contractで固定される契約フレーズ',
  },
  {
    filePath: 'docs/guides/operations/deployment.md',
    snippet: 't や raw command output を deployment data source と',
    reason: 'japanese-to-ascii',
    justification: 'source contractで固定される契約フレーズ',
  },
  {
    filePath: 'docs/guides/operations/deployment.md',
    snippet: 'を deployment data source として扱ってはいけない。',
    reason: 'ascii-to-japanese',
    justification: 'source contractで固定される契約フレーズ',
  },
] as const;

interface RepositoryPolicyClassification {
  readonly kind: 'fail' | 'report-only' | 'excluded' | 'outside-policy';
}

const collectRepositoryFiles = async (
  rootDir: string,
  currentDir = rootDir,
): Promise<string[]> => {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const filePaths: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      const relativeDirectoryPath = normalizeFilePath(path.relative(rootDir, absolutePath));

      if (isExcludedPath(`${relativeDirectoryPath}/`)) {
        continue;
      }

      filePaths.push(...(await collectRepositoryFiles(rootDir, absolutePath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    filePaths.push(normalizeFilePath(path.relative(rootDir, absolutePath)));
  }

  return filePaths;
};

const classifyRepositoryPolicyPath = (filePath: string): RepositoryPolicyClassification => {
  const normalizedPath = normalizeFilePath(filePath);

  if (isExcludedPath(normalizedPath)) {
    return { kind: 'excluded' };
  }

  if (!shouldIncludeFilePath(normalizedPath, DEFAULT_INCLUDE_PATTERNS, EXCLUDE_PATTERNS)) {
    return { kind: 'outside-policy' };
  }

  if (matchesAnyPattern(normalizedPath, FAIL_PATTERNS)) {
    return { kind: 'fail' };
  }

  if (matchesAnyPattern(normalizedPath, REPORT_ONLY_PATTERNS)) {
    return { kind: 'report-only' };
  }

  return { kind: 'outside-policy' };
};

const isExcludedPath = (filePath: string): boolean => {
  return matchesAnyPattern(normalizeFilePath(filePath), EXCLUDE_PATTERNS);
};

const matchesAnyPattern = (filePath: string, patterns: readonly string[]): boolean => {
  return patterns.some((pattern) => matchesPathPattern(filePath, pattern));
};

const collectPolicyTargetFilePaths = async (): Promise<string[]> => {
  const discoveredFiles = await collectRepositoryFiles(ROOT_DIR);
  const includedFiles = discoveredFiles.filter((filePath) =>
    shouldIncludeFilePath(filePath, DEFAULT_INCLUDE_PATTERNS, EXCLUDE_PATTERNS),
  );

  return dedupeNormalizedFilePaths(includedFiles).sort((left, right) => left.localeCompare(right));
};

const collectFailCandidates = async (
  filePaths: readonly string[],
): Promise<JapaneseAsciiSpacingCandidate[]> => {
  const candidates: JapaneseAsciiSpacingCandidate[] = [];

  for (const filePath of filePaths) {
    const text = await readFile(path.join(ROOT_DIR, filePath), 'utf8');
    candidates.push(...detectJapaneseAsciiSpacingCandidates(text, { filePath }));
  }

  return candidates;
};

const isAllowedCandidate = (candidate: JapaneseAsciiSpacingCandidate): boolean => {
  return ALLOWED_CANDIDATES.some((allowedCandidate) => {
    return (
      candidate.filePath === allowedCandidate.filePath &&
      candidate.snippet === allowedCandidate.snippet &&
      candidate.reason === allowedCandidate.reason
    );
  });
};

const formatCandidateFailures = (candidates: readonly JapaneseAsciiSpacingCandidate[]): string => {
  const examples = candidates.slice(0, MAX_FAILURE_EXAMPLES).map((candidate) => {
    return [
      `file path: ${candidate.filePath}`,
      `line: ${candidate.line}`,
      `column: ${candidate.column}`,
      `reason/type: ${candidate.reason}`,
      `snippet: ${JSON.stringify(candidate.snippet)}`,
    ].join(' | ');
  });

  return [
    `Japanese ASCII spacing repository policy failed: ${candidates.length} candidate(s) found in fail targets.`,
    `Showing ${examples.length} of ${candidates.length} candidate(s).`,
    ...examples,
  ].join('\n');
};

describe('japanese-ascii-spacing repository policy', () => {
  it('Phase9A/Phase9Bのfail対象に日本語ASCII境界スペース候補が残っていないこと', async () => {
    const targetFiles = await collectPolicyTargetFilePaths();
    const failTargetFiles = targetFiles.filter(
      (filePath) => classifyRepositoryPolicyPath(filePath).kind === 'fail',
    );
    const candidates = await collectFailCandidates(failTargetFiles);
    const unexpectedCandidates = candidates.filter((candidate) => !isAllowedCandidate(candidate));

    if (unexpectedCandidates.length > 0) {
      throw new Error(formatCandidateFailures(unexpectedCandidates));
    }

    expect(failTargetFiles).toContain('README.md');
    expect(failTargetFiles).toContain('docs/README.md');
    expect(failTargetFiles).toContain('src/about.11ty.ts');
    expect(failTargetFiles).toContain('src/index.11ty.ts');
    expect(failTargetFiles.some((filePath) => matchesPathPattern(filePath, 'docs/guides/**/*.md'))).toBe(
      true,
    );
    expect(
      failTargetFiles.some((filePath) => matchesPathPattern(filePath, 'docs/contracts/**/*.md')),
    ).toBe(true);
    expect(
      failTargetFiles.some((filePath) => matchesPathPattern(filePath, 'docs/references/**/*.md')),
    ).toBe(true);
    expect(failTargetFiles.some((filePath) => matchesPathPattern(filePath, 'docs/adr/**/*.md'))).toBe(
      true,
    );
    expect(
      failTargetFiles.some((filePath) => matchesPathPattern(filePath, 'docs/architecture/**/*.md')),
    ).toBe(true);
    expect(
      failTargetFiles.some((filePath) => matchesPathPattern(filePath, 'docs/design-system/*.md')),
    ).toBe(true);
  });

  it('report-only維持対象は候補が残っていてもfail対象へ分類しないこと', async () => {
    expect(classifyRepositoryPolicyPath('docs/design-system/components/button.md').kind).toBe(
      'report-only',
    );
    expect(classifyRepositoryPolicyPath('docs/workflows/problem-solving/README.md').kind).toBe(
      'report-only',
    );
    expect(
      classifyRepositoryPolicyPath(
        'docs/workflows/problem-solving/frozen-v85-reference/README.md',
      ).kind,
    ).toBe('report-only');
    expect(classifyRepositoryPolicyPath('content/program/_config.json').kind).toBe('report-only');
    expect(classifyRepositoryPolicyPath('content/testing/_config.json').kind).toBe('report-only');
    expect(classifyRepositoryPolicyPath('content/library/_config.json').kind).toBe('report-only');
    expect(classifyRepositoryPolicyPath('src/components/layout-sidebar.ts').kind).toBe(
      'report-only',
    );
    expect(classifyRepositoryPolicyPath('test/node/japanese-ascii-spacing-policy.test.ts').kind).toBe(
      'report-only',
    );
  });

  it('fail対象とreport-only対象が重複する場合はfail対象を優先すること', () => {
    expect(classifyRepositoryPolicyPath('src/about.11ty.ts').kind).toBe('fail');
    expect(classifyRepositoryPolicyPath('src/index.11ty.ts').kind).toBe('fail');
    expect(classifyRepositoryPolicyPath('src/components/layout-sidebar.ts').kind).toBe(
      'report-only',
    );
  });

  it('Phase9除外対象はrepository policy対象外にすること', () => {
    expect(
      classifyRepositoryPolicyPath('docs/workflows/problem-solving/r4-validation/samples/README.md')
        .kind,
    ).toBe('excluded');
    expect(
      classifyRepositoryPolicyPath('docs/workflows/problem-solving/r4-validation/schemas/README.md')
        .kind,
    ).toBe('excluded');
    expect(
      classifyRepositoryPolicyPath('docs/workflows/problem-solving/r4-validation/tools/README.md')
        .kind,
    ).toBe('excluded');
    expect(classifyRepositoryPolicyPath('docs/old/archived.md').kind).toBe('excluded');
    expect(classifyRepositoryPolicyPath('docs/temporary/draft.md').kind).toBe('excluded');
    expect(classifyRepositoryPolicyPath('content/_assets/example.md').kind).toBe('excluded');
  });
});
