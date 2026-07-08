import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TARGET_KEYS = new Set([
  'title',
  'date',
  'updated',
  'kind',
  'status',
  'excludeFromPublicationSurfaces',
]);

const NON_READER_FACING_KEYS = new Set([
  'updated',
  'date',
  'testingArea',
  'hydrationBudgetProfile',
  'e2eFixtureId',
]);

const VALID_KINDS = new Set(['reader', 'testing', 'demo']);
const VALID_STATUSES = new Set(['draft', 'archived', 'wip', 'deprecated']);

type ChangeStatus = 'A' | 'M' | 'T' | 'R';
type StampMode = 'stamp' | 'dry-run' | 'check';

interface ParsedArgs {
  readonly mode: StampMode;
  readonly date: string | undefined;
  readonly files: readonly string[];
}

interface GitNameStatusEntry {
  readonly status: string;
  readonly path: string;
  readonly oldPath?: string;
}

interface Candidate {
  readonly status: ChangeStatus | 'files';
  readonly path: string;
  readonly oldPath?: string;
}

interface FrontmatterField {
  readonly key: string;
  readonly value: string;
  readonly rawValue: string;
  readonly lineIndex: number;
}

interface ParsedFrontmatter {
  readonly text: string;
  readonly newline: string;
  readonly startLineIndex: number;
  readonly endLineIndex: number;
  readonly fields: ReadonlyMap<string, FrontmatterField>;
  readonly body: string;
}

interface NoteClassification {
  readonly eligible: boolean;
  readonly skipReason?: string;
  readonly frontmatter: ParsedFrontmatter;
}

export interface StampResult {
  readonly path: string;
  readonly action: 'updated' | 'would-update' | 'ok' | 'skip' | 'error';
  readonly currentUpdated?: string | undefined;
  readonly nextUpdated?: string | undefined;
  readonly reason?: string | undefined;
}

export interface StampRunResult {
  readonly exitCode: number;
  readonly stdout: readonly string[];
  readonly stderr: readonly string[];
  readonly results: readonly StampResult[];
}

interface RunOptions {
  readonly cwd?: string | undefined;
  readonly argv: readonly string[];
  readonly now?: Date | undefined;
}

export const parseGitNameStatusZ = (output: Buffer | string): GitNameStatusEntry[] => {
  const text = Buffer.isBuffer(output) ? output.toString('utf8') : output;
  const parts = text.split('\0').filter((part) => part.length > 0);
  const entries: GitNameStatusEntry[] = [];

  for (let index = 0; index < parts.length; ) {
    const status = parts[index];
    if (status === undefined) break;
    index += 1;

    if (status.startsWith('R')) {
      const oldPath = parts[index];
      const newPath = parts[index + 1];
      if (oldPath === undefined || newPath === undefined) {
        throw new Error('git diff rename output is incomplete');
      }
      entries.push({ status, oldPath: toPosixPath(oldPath), path: toPosixPath(newPath) });
      index += 2;
      continue;
    }

    const changedPath = parts[index];
    if (changedPath === undefined) {
      throw new Error('git diff output is incomplete');
    }
    entries.push({ status, path: toPosixPath(changedPath) });
    index += 1;
  }

  return entries;
};

export const todayInTokyo = (now = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
};

export const runStampNoteUpdated = (options: RunOptions): StampRunResult => {
  const cwd = options.cwd ?? process.cwd();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const results: StampResult[] = [];

  let args: ParsedArgs;
  try {
    args = parseArgs(options.argv);
    if (args.date !== undefined) validateDateValue(args.date, '--date');
  } catch (error) {
    return failure(error, stdout, stderr, results);
  }

  if (args.mode === 'check' && args.files.length > 0) {
    stderr.push('--check --files is unsupported in Phase1');
    return { exitCode: 1, stdout, stderr, results };
  }

  const stampDate = args.date ?? todayInTokyo(options.now);

  try {
    const candidates = args.files.length > 0 ? candidatesFromFiles(cwd, args.files) : candidatesFromGit(cwd);
    const mode = args.mode;

    if (mode === 'check') {
      for (const candidate of candidates) {
        results.push(checkCandidate(cwd, candidate));
      }
    } else {
      for (const candidate of candidates) {
        results.push(stampCandidate(cwd, candidate, stampDate, {
          dryRun: mode === 'dry-run',
          explicitDate: args.date !== undefined,
        }));
      }
    }

    for (const result of results) {
      stdout.push(formatResult(result));
    }

    const hasError = results.some((result) => result.action === 'error');
    return { exitCode: hasError ? 1 : 0, stdout, stderr, results };
  } catch (error) {
    return failure(error, stdout, stderr, results);
  }
};

const failure = (
  error: unknown,
  stdout: string[],
  stderr: string[],
  results: StampResult[],
): StampRunResult => {
  stderr.push(error instanceof Error ? error.message : String(error));
  return { exitCode: 1, stdout, stderr, results };
};

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  let mode: StampMode = 'stamp';
  let date: string | undefined;
  const files: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) continue;
    if (arg === '--dry-run') {
      mode = 'dry-run';
      continue;
    }
    if (arg === '--check') {
      mode = 'check';
      continue;
    }
    if (arg === '--date') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error('--date requires YYYY-MM-DD');
      }
      date = value;
      index += 1;
      continue;
    }
    if (arg === '--files') {
      files.push(...argv.slice(index + 1));
      break;
    }
    throw new Error(`unknown argument: ${arg}`);
  }

  return { mode, date, files };
};

const candidatesFromFiles = (cwd: string, files: readonly string[]): Candidate[] => {
  return files.map((filePath) => ({ status: 'files', path: normalizeInputPath(cwd, filePath) }));
};

const candidatesFromGit = (cwd: string): Candidate[] => {
  const uxb = parseGitNameStatusZ(
    execGit(cwd, ['diff', '--name-status', '-z', '--diff-filter=UXB', 'HEAD', '--', 'content']),
  ).filter((entry) => isContentMarkdownPath(entry.path));

  if (uxb.length > 0) {
    throw new Error(
      `unmerged, unknown, or broken Markdown candidates: ${uxb.map((entry) => entry.path).join(', ')}`,
    );
  }

  const entries = parseGitNameStatusZ(
    execGit(cwd, [
      'diff',
      '--name-status',
      '-z',
      '-M',
      '--diff-filter=AMRT',
      'HEAD',
      '--',
      'content',
    ]),
  );

  return entries.flatMap((entry): Candidate[] => {
    if (!isContentMarkdownPath(entry.path)) return [];
    if (entry.status === 'A' || entry.status === 'M' || entry.status === 'T') {
      return [{ status: entry.status, path: entry.path }];
    }
    if (entry.status.startsWith('R') && entry.oldPath !== undefined) {
      return [{ status: 'R', path: entry.path, oldPath: entry.oldPath }];
    }
    return [];
  });
};

const execGit = (cwd: string, args: readonly string[]): Buffer => {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
};

const stampCandidate = (
  cwd: string,
  candidate: Candidate,
  stampDate: string,
  options: { readonly dryRun: boolean; readonly explicitDate: boolean },
): StampResult => {
  const pathSkipReason = getPathLevelSkipReason(candidate.path);
  if (pathSkipReason !== undefined) {
    return skip(candidate.path, pathSkipReason);
  }

  const absolutePath = path.join(cwd, fromPosixPath(candidate.path));
  if (!isReadableFile(absolutePath)) {
    return errorResult(candidate.path, 'post-change path is not a readable Markdown file');
  }

  const text = readFileSync(absolutePath, 'utf8');
  const classification = classifyPostChangeNote(candidate.path, text);
  if (!classification.eligible) {
    return skip(candidate.path, classification.skipReason ?? 'not eligible');
  }

  const currentUpdated = getFieldValue(classification.frontmatter, 'updated');
  if (
    !options.explicitDate &&
    candidate.status !== 'files' &&
    isManualUpdatedChange(cwd, candidate, currentUpdated)
  ) {
    return skip(candidate.path, 'updated already changed manually in this diff');
  }

  if (candidate.status !== 'files' && candidate.status !== 'A') {
    const oldText = readHeadFile(cwd, candidate.oldPath ?? candidate.path);
    const oldFrontmatter =
      oldText === undefined ? undefined : parseFrontmatter(oldText, { requireTitle: false });
    const changed = hasReaderFacingChange(
      candidate,
      oldText,
      oldFrontmatter,
      classification.frontmatter,
    );
    if (!changed) {
      return skip(candidate.path, 'no reader-facing change');
    }
  }

  const nextText = updateFrontmatterUpdated(classification.frontmatter, stampDate);
  const action = options.dryRun ? 'would-update' : 'updated';
  if (!options.dryRun) writeFileSync(absolutePath, nextText);

  return {
    path: candidate.path,
    action,
    currentUpdated,
    nextUpdated: stampDate,
  };
};

const checkCandidate = (cwd: string, candidate: Candidate): StampResult => {
  const pathSkipReason = getPathLevelSkipReason(candidate.path);
  if (pathSkipReason !== undefined) {
    return skip(candidate.path, pathSkipReason);
  }

  const absolutePath = path.join(cwd, fromPosixPath(candidate.path));
  if (!isReadableFile(absolutePath)) {
    return errorResult(candidate.path, 'post-change path is not a readable Markdown file');
  }

  const text = readFileSync(absolutePath, 'utf8');
  const classification = classifyPostChangeNote(candidate.path, text);
  if (!classification.eligible) {
    return skip(candidate.path, classification.skipReason ?? 'not eligible');
  }

  const updated = getFieldValue(classification.frontmatter, 'updated');
  if (updated !== undefined) validateDateValue(updated, `${candidate.path}: updated`);
  const date = getFieldValue(classification.frontmatter, 'date');
  if (date !== undefined) validateDateValue(date, `${candidate.path}: date`);
  validateUpdatedNotBeforeDate(candidate.path, date, updated);

  if (candidate.status === 'A') {
    return updated === undefined
      ? errorResult(candidate.path, 'added reader/public note requires updated')
      : { path: candidate.path, action: 'ok', currentUpdated: updated };
  }

  const oldText = readHeadFile(cwd, candidate.oldPath ?? candidate.path);
  const oldFrontmatter = oldText === undefined ? undefined : parseFrontmatter(oldText, { requireTitle: false });
  const changed = hasReaderFacingChange(candidate, oldText, oldFrontmatter, classification.frontmatter);
  if (!changed) {
    return { path: candidate.path, action: 'ok', currentUpdated: updated, reason: 'no reader-facing change' };
  }

  const oldUpdated = oldFrontmatter === undefined ? undefined : getFieldValue(oldFrontmatter, 'updated');
  if (updated !== undefined && updated !== oldUpdated) {
    return { path: candidate.path, action: 'ok', currentUpdated: updated };
  }

  return errorResult(candidate.path, 'reader-facing change requires updated in the same diff');
};

const classifyPostChangeNote = (sourcePath: string, text: string): NoteClassification => {
  const frontmatter = parseFrontmatter(text, { requireTitle: true });
  const kind = getFieldValue(frontmatter, 'kind') ?? 'reader';
  const status = getFieldValue(frontmatter, 'status');
  const exclude = getExcludeFromPublicationSurfaces(sourcePath, frontmatter);

  if (!VALID_KINDS.has(kind)) {
    throw new Error(`${sourcePath}: unknown kind: ${kind}`);
  }
  if (status !== undefined && !VALID_STATUSES.has(status)) {
    throw new Error(`${sourcePath}: unknown status: ${status}`);
  }

  const updated = getFieldValue(frontmatter, 'updated');
  const date = getFieldValue(frontmatter, 'date');
  if (updated !== undefined) validateDateValue(updated, `${sourcePath}: updated`);
  if (date !== undefined) validateDateValue(date, `${sourcePath}: date`);
  validateUpdatedNotBeforeDate(sourcePath, date, updated);

  if (kind === 'testing' || kind === 'demo') {
    return { eligible: false, skipReason: `kind:${kind}`, frontmatter };
  }
  if (status === 'draft') {
    return { eligible: false, skipReason: 'status:draft', frontmatter };
  }
  if (exclude === true) {
    return { eligible: false, skipReason: 'excludeFromPublicationSurfaces:true', frontmatter };
  }

  return { eligible: true, frontmatter };
};

const parseFrontmatter = (
  text: string,
  options: { readonly requireTitle: boolean },
): ParsedFrontmatter => {
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = splitLinesWithEndings(text);
  const firstLine = lines[0];
  if (firstLine === undefined || trimLineEnding(firstLine) !== '---') {
    throw new Error('frontmatter block is required');
  }

  let endLineIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== undefined && trimLineEnding(line) === '---') {
      endLineIndex = index;
      break;
    }
  }
  if (endLineIndex === -1) throw new Error('frontmatter closing marker is required');

  const fields = new Map<string, FrontmatterField>();
  const seenTargetKeys = new Set<string>();
  for (let index = 1; index < endLineIndex; index += 1) {
    const line = lines[index];
    if (line === undefined) continue;
    const rawLine = trimLineEnding(line);
    const match = /^([A-Za-z][A-Za-z0-9]*):(?:\s*(.*))?$/.exec(rawLine);
    if (match === null) continue;
    const key = match[1];
    if (key === undefined) throw new Error('frontmatter key parse failed');
    const rawValue = match[2] ?? '';
    if (TARGET_KEYS.has(key)) {
      if (seenTargetKeys.has(key)) throw new Error(`duplicate frontmatter key: ${key}`);
      seenTargetKeys.add(key);
    }
    fields.set(key, {
      key,
      rawValue,
      value: parseScalarValue(rawValue),
      lineIndex: index,
    });
  }

  if (options.requireTitle && !fields.has('title')) {
    throw new Error('frontmatter title is required');
  }

  return {
    text,
    newline,
    startLineIndex: 0,
    endLineIndex,
    fields,
    body: lines.slice(endLineIndex + 1).join(''),
  };
};

const splitLinesWithEndings = (text: string): string[] => {
  const matches = text.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g) ?? [];
  return matches.filter((line, index) => line.length > 0 || index < matches.length - 1);
};

const trimLineEnding = (line: string): string => line.replace(/\r?\n$|\r$/, '');

const parseScalarValue = (rawValue: string): string => {
  const trimmed = rawValue.trim();
  const single = /^'([^']*)'$/.exec(trimmed);
  if (single !== null) return single[1] ?? '';
  const double = /^"([^"]*)"$/.exec(trimmed);
  if (double !== null) return double[1] ?? '';
  return trimmed;
};

const getExcludeFromPublicationSurfaces = (
  sourcePath: string,
  frontmatter: ParsedFrontmatter,
): boolean | undefined => {
  const field = frontmatter.fields.get('excludeFromPublicationSurfaces');
  if (field === undefined) return undefined;
  const raw = field.rawValue.trim();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^['"](?:true|false)['"]$/.test(raw)) {
    throw new Error(`${sourcePath}: excludeFromPublicationSurfaces must be an unquoted boolean`);
  }
  throw new Error(`${sourcePath}: invalid excludeFromPublicationSurfaces value`);
};

const updateFrontmatterUpdated = (frontmatter: ParsedFrontmatter, nextUpdated: string): string => {
  const lines = splitLinesWithEndings(frontmatter.text);
  const updatedField = frontmatter.fields.get('updated');
  if (updatedField !== undefined) {
    const currentLine = lines[updatedField.lineIndex] ?? '';
    lines[updatedField.lineIndex] =
      `updated: ${nextUpdated}${lineEndingOf(currentLine, frontmatter.newline)}`;
    return lines.join('');
  }

  const dateField = frontmatter.fields.get('date');
  const titleField = frontmatter.fields.get('title');
  const insertAfter = dateField?.lineIndex ?? titleField?.lineIndex;
  if (insertAfter === undefined) throw new Error('frontmatter title or date is required');

  lines.splice(insertAfter + 1, 0, `updated: ${nextUpdated}${frontmatter.newline}`);
  return lines.join('');
};

const lineEndingOf = (line: string, fallback: string): string => {
  if (line.endsWith('\r\n')) return '\r\n';
  if (line.endsWith('\n')) return '\n';
  if (line.endsWith('\r')) return '\r';
  return fallback;
};

const isManualUpdatedChange = (
  cwd: string,
  candidate: Candidate,
  currentUpdated: string | undefined,
): boolean => {
  if (candidate.status === 'A') return currentUpdated !== undefined;
  const oldText = readHeadFile(cwd, candidate.oldPath ?? candidate.path);
  if (oldText === undefined) return currentUpdated !== undefined;
  const oldFrontmatter = parseFrontmatter(oldText, { requireTitle: false });
  return getFieldValue(oldFrontmatter, 'updated') !== currentUpdated;
};

const hasReaderFacingChange = (
  candidate: Candidate,
  oldText: string | undefined,
  oldFrontmatter: ParsedFrontmatter | undefined,
  nextFrontmatter: ParsedFrontmatter,
): boolean => {
  if (candidate.status === 'R' && candidate.oldPath !== undefined && candidate.oldPath !== candidate.path) {
    return true;
  }
  if (oldText === undefined || oldFrontmatter === undefined) return true;
  if (oldFrontmatter.body !== nextFrontmatter.body) return true;

  const keys = new Set([...oldFrontmatter.fields.keys(), ...nextFrontmatter.fields.keys()]);
  for (const key of keys) {
    if (NON_READER_FACING_KEYS.has(key)) continue;
    if (getFieldValue(oldFrontmatter, key) !== getFieldValue(nextFrontmatter, key)) return true;
  }

  return false;
};

const readHeadFile = (cwd: string, gitPath: string): string | undefined => {
  try {
    return execFileSync('git', ['show', `HEAD:${gitPath}`], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return undefined;
  }
};

const validateDateValue = (value: string, label: string): void => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }

  const [yearText, monthText, dayText] = value.split('-');
  if (yearText === undefined || monthText === undefined || dayText === undefined) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${label} must be a real calendar date`);
  }
};

const validateUpdatedNotBeforeDate = (
  sourcePath: string,
  date: string | undefined,
  updated: string | undefined,
): void => {
  if (date !== undefined && updated !== undefined && updated < date) {
    throw new Error(`${sourcePath}: updated must be greater than or equal to date`);
  }
};

const getFieldValue = (frontmatter: ParsedFrontmatter, key: string): string | undefined =>
  frontmatter.fields.get(key)?.value;

const getPathLevelSkipReason = (sourcePath: string): string | undefined => {
  if (sourcePath.startsWith('test/fixtures/content/')) return 'test fixture path';
  if (sourcePath.startsWith('content/testing/')) return 'content/testing path';
  if (!isContentMarkdownPath(sourcePath)) return 'outside content Markdown';
  return undefined;
};

const isContentMarkdownPath = (sourcePath: string): boolean =>
  sourcePath.startsWith('content/') && sourcePath.endsWith('.md');

const normalizeInputPath = (cwd: string, inputPath: string): string => {
  const resolved = path.isAbsolute(inputPath) ? inputPath : path.resolve(cwd, inputPath);
  return toPosixPath(path.relative(cwd, resolved));
};

const toPosixPath = (value: string): string => value.replaceAll(path.sep, '/').replaceAll('\\', '/');
const fromPosixPath = (value: string): string => value.split('/').join(path.sep);

const isReadableFile = (absolutePath: string): boolean => {
  if (!existsSync(absolutePath)) return false;
  return statSync(absolutePath).isFile();
};

const skip = (sourcePath: string, reason: string): StampResult => ({
  path: sourcePath,
  action: 'skip',
  reason,
});

const errorResult = (sourcePath: string, reason: string): StampResult => ({
  path: sourcePath,
  action: 'error',
  reason,
});

const formatResult = (result: StampResult): string => {
  const pieces = [result.action, result.path];
  if (result.currentUpdated !== undefined) pieces.push(`current=${result.currentUpdated}`);
  if (result.nextUpdated !== undefined) pieces.push(`next=${result.nextUpdated}`);
  if (result.reason !== undefined) pieces.push(`reason=${result.reason}`);
  return pieces.join(' ');
};

const isCliEntry = (): boolean => {
  const entry = process.argv[1];
  return entry !== undefined && path.resolve(entry) === fileURLToPath(import.meta.url);
};

if (isCliEntry()) {
  const result = runStampNoteUpdated({ argv: process.argv.slice(2) });
  for (const line of result.stdout) console.log(line);
  for (const line of result.stderr) console.error(line);
  process.exitCode = result.exitCode;
}
