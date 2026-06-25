import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_INCLUDE_PATTERNS,
  dedupeNormalizedFilePaths,
  detectJapaneseAsciiSpacingCandidates,
  normalizeFilePath,
  shouldIncludeFilePath,
  type JapaneseAsciiSpacingReport,
} from './japanese-ascii-spacing-policy.js';

interface CliOptions {
  readonly rootDir: string;
  readonly maxExamples: number;
}

const DEFAULT_MAX_EXAMPLES = 80;
const PRUNED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  '.git',
  '.cache',
  'coverage',
  'test-results',
  'playwright-report',
]);

export const parseCliOptions = (args: readonly string[], cwd: string): CliOptions => {
  let rootDir = cwd;
  let maxExamples = DEFAULT_MAX_EXAMPLES;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--root') {
      const value = args[index + 1];

      if (value === undefined || value.trim() === '') {
        throw new Error('--root requires a directory path.');
      }

      rootDir = path.resolve(cwd, value);
      index += 1;
      continue;
    }

    if (argument === '--max-examples') {
      const value = args[index + 1];
      const parsedValue = Number(value);

      if (value === undefined || !Number.isInteger(parsedValue) || parsedValue < 0) {
        throw new Error('--max-examples requires a non-negative integer.');
      }

      maxExamples = parsedValue;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument ?? ''}`);
  }

  return { rootDir, maxExamples };
};

export const collectReportTargetFiles = async (rootDir: string): Promise<string[]> => {
  const discoveredFiles = await collectFiles(rootDir, rootDir);
  const matchedFiles = discoveredFiles.filter((filePath) => shouldIncludeFilePath(filePath));

  return dedupeNormalizedFilePaths(matchedFiles).sort((left, right) => left.localeCompare(right));
};

export const createJapaneseAsciiSpacingReports = async (
  rootDir: string,
  filePaths: readonly string[],
): Promise<JapaneseAsciiSpacingReport[]> => {
  const reports: JapaneseAsciiSpacingReport[] = [];

  for (const filePath of filePaths) {
    const absolutePath = path.join(rootDir, filePath);
    const text = await readFile(absolutePath, 'utf8');
    const candidates = detectJapaneseAsciiSpacingCandidates(text, { filePath });

    if (candidates.length > 0) {
      reports.push({ filePath, candidates });
    }
  }

  return reports;
};

const formatCount = (value: number): string => {
  return String(value);
};

export const formatReport = (
  targetFileCount: number,
  reports: readonly JapaneseAsciiSpacingReport[],
  maxExamples: number,
): string => {
  const candidateCount = reports.reduce((total, report) => total + report.candidates.length, 0);
  const lines = [
    'Japanese ASCII spacing report (report-only)',
    `Target files: ${formatCount(targetFileCount)}`,
    `Candidates: ${formatCount(candidateCount)}`,
    `Files with candidates: ${formatCount(reports.length)}`,
  ];

  if (reports.length > 0) {
    lines.push('', 'Candidate files:');

    for (const report of reports) {
      lines.push(`- ${report.filePath} (${formatCount(report.candidates.length)})`);
    }
  }

  if (candidateCount > 0 && maxExamples > 0) {
    let emittedExamples = 0;
    lines.push('', `Representative candidates (max ${formatCount(maxExamples)}):`);

    for (const report of reports) {
      for (const candidate of report.candidates.slice(0, 3)) {
        if (emittedExamples >= maxExamples) {
          break;
        }

        lines.push(
          `- ${candidate.filePath}:${formatCount(candidate.line)}:${formatCount(candidate.column)} ${
            candidate.reason
          } ${JSON.stringify(candidate.snippet)}`,
        );
        emittedExamples += 1;
      }

      if (emittedExamples >= maxExamples) {
        break;
      }
    }
  }

  lines.push(
    '',
    'This command is report-only. Candidates do not fail this Phase2A check; exit code remains 0.',
  );
  lines.push(`Includes: ${DEFAULT_INCLUDE_PATTERNS.join(', ')}`);
  lines.push(`Excludes: ${DEFAULT_EXCLUDE_PATTERNS.join(', ')}`);

  return lines.join('\n');
};

export const runReportCli = async (args: readonly string[], cwd: string): Promise<void> => {
  const options = parseCliOptions(args, cwd);
  const targetFiles = await collectReportTargetFiles(options.rootDir);
  const reports = await createJapaneseAsciiSpacingReports(options.rootDir, targetFiles);

  console.log(formatReport(targetFiles.length, reports, options.maxExamples));
};

const collectFiles = async (rootDir: string, currentDir: string): Promise<string[]> => {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const filePaths: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (PRUNED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      filePaths.push(...(await collectFiles(rootDir, absolutePath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    filePaths.push(normalizeFilePath(path.relative(rootDir, absolutePath)));
  }

  return filePaths;
};

const isCliEntrypoint = (): boolean => {
  const entrypointPath = process.argv[1];

  return (
    entrypointPath !== undefined && fileURLToPath(import.meta.url) === path.resolve(entrypointPath)
  );
};

if (isCliEntrypoint()) {
  runReportCli(process.argv.slice(2), process.cwd()).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
