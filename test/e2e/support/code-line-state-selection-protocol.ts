import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

export const CODE_SELECTION_RUN_KINDS = ['standard', 'baseline', 'compare'] as const;
export type CodeSelectionRunKind = (typeof CODE_SELECTION_RUN_KINDS)[number];

export const CODE_SELECTION_PROJECTS = [
  'chromium-integration',
  'firefox-final-check',
  'webkit-final-check',
] as const;
export type CodeSelectionProject = (typeof CODE_SELECTION_PROJECTS)[number];

export const CODE_LINE_STATES = ['normal', 'highlight', 'add', 'remove'] as const;
export type SelectionLineState = (typeof CODE_LINE_STATES)[number];

export const CODE_SELECTION_FIXTURES = [
  {
    surface: 'standalone',
    filename: 'line-state-standalone.ts',
    requiresJavaScript: true,
  },
  {
    surface: 'group-enhanced',
    filename: 'line-state-group-active.ts',
    requiresJavaScript: true,
  },
  {
    surface: 'group-no-js',
    filename: 'line-state-group-active.ts',
    requiresJavaScript: false,
  },
  {
    surface: 'preview',
    filename: 'line-state-preview.html',
    requiresJavaScript: true,
  },
] as const;

export const EXPECTED_CODE_SELECTION_RECORD_KEYS = CODE_SELECTION_FIXTURES.flatMap((fixture) =>
  CODE_LINE_STATES.map((state) => `${fixture.surface}/${state}/${fixture.filename}`),
).sort();

export interface CodeSelectionRecord {
  readonly key: string;
  readonly selectionSha256: string;
  readonly utf16Length: number;
  readonly lineCount: number;
  readonly containsStateLabel: boolean;
}

export interface CodeSelectionBaseline {
  readonly schemaVersion: 1;
  readonly runKind: 'baseline';
  readonly project: CodeSelectionProject;
  readonly records: readonly CodeSelectionRecord[];
}

export interface CodeSelectionProtocolConfiguration {
  readonly runKind: CodeSelectionRunKind;
  readonly prefix: string | null;
  readonly project: CodeSelectionProject;
  readonly artifactPath: string | null;
}

interface CodeSelectionBaselineWriteHandle {
  writeFile(data: string, encoding: 'utf8'): Promise<void>;
  sync(): Promise<void>;
  close(): Promise<void>;
}

export interface CodeSelectionBaselineFileOperations {
  access(filePath: string): Promise<void>;
  ensureDirectory(directoryPath: string): Promise<void>;
  openExclusive(filePath: string): Promise<CodeSelectionBaselineWriteHandle>;
  rename(sourcePath: string, destinationPath: string): Promise<void>;
  remove(filePath: string): Promise<void>;
}

export interface CodeSelectionBaselineWriteOptions {
  readonly fileOperations?: Partial<CodeSelectionBaselineFileOperations>;
}

const DEFAULT_BASELINE_FILE_OPERATIONS: CodeSelectionBaselineFileOperations = {
  access,
  ensureDirectory: async (directoryPath) => {
    await mkdir(directoryPath, { recursive: true });
  },
  openExclusive: async (filePath) => open(filePath, 'wx'),
  rename,
  remove: async (filePath) => {
    await rm(filePath, { force: true });
  },
};

const RUN_KIND_ENV = 'ROUAULT_CODE_SELECTION_RUN_KIND';
const PREFIX_ENV = 'ROUAULT_CODE_SELECTION_BASELINE_PREFIX';
const PREFIX_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const STATE_LABELS = ['強調行', '追加行', '削除行'] as const;

const isNodeError = (value: unknown): value is NodeJS.ErrnoException =>
  value instanceof Error && 'code' in value;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertProject = (project: string): CodeSelectionProject => {
  const matchedProject = CODE_SELECTION_PROJECTS.find((candidate) => candidate === project);
  if (!matchedProject) {
    throw new Error(
      `Unsupported code selection project: ${JSON.stringify(project)}. ` +
        `Allowed projects: ${CODE_SELECTION_PROJECTS.join(', ')}.`,
    );
  }
  return matchedProject;
};

const assertPrefix = (prefix: string | undefined): string => {
  if (!prefix || !PREFIX_PATTERN.test(prefix)) {
    throw new Error(
      `Invalid ${PREFIX_ENV}: ${JSON.stringify(prefix)}. ` +
        'Expected lowercase kebab-case without dots or path separators.',
    );
  }
  return prefix;
};

export const codeSelectionArtifactPath = (
  prefix: string,
  project: CodeSelectionProject,
  workspaceRoot = process.cwd(),
): string =>
  path.join(
    workspaceRoot,
    '.generated',
    'e2e',
    `code-line-state-selection.${prefix}.${project}.json`,
  );

export const resolveCodeSelectionProtocolConfiguration = (
  environment: Readonly<Record<string, string | undefined>>,
  projectName: string,
  workspaceRoot = process.cwd(),
): CodeSelectionProtocolConfiguration => {
  const project = assertProject(projectName);
  const rawRunKind = environment[RUN_KIND_ENV]?.trim();
  const rawPrefix = environment[PREFIX_ENV]?.trim();

  if (!rawRunKind) {
    if (rawPrefix !== undefined) {
      throw new Error(`${PREFIX_ENV} must be unset when ${RUN_KIND_ENV} is unset.`);
    }
    return { runKind: 'standard', prefix: null, project, artifactPath: null };
  }

  if (rawRunKind !== 'standard' && rawRunKind !== 'baseline' && rawRunKind !== 'compare') {
    throw new Error(
      `Invalid ${RUN_KIND_ENV}: ${JSON.stringify(rawRunKind)}. ` +
        `Expected ${CODE_SELECTION_RUN_KINDS.join(', ')}.`,
    );
  }

  if (rawRunKind === 'standard') {
    if (rawPrefix !== undefined) {
      throw new Error(`${PREFIX_ENV} must be unset for a standard run.`);
    }
    return { runKind: 'standard', prefix: null, project, artifactPath: null };
  }

  const prefix = assertPrefix(rawPrefix);
  return {
    runKind: rawRunKind,
    prefix,
    project,
    artifactPath: codeSelectionArtifactPath(prefix, project, workspaceRoot),
  };
};

export const normalizeCodeSelectionText = (value: string): string => value.replace(/\r\n?/gu, '\n');

export const createCodeSelectionRecord = (
  key: string,
  selectedText: string,
): CodeSelectionRecord => {
  const normalized = normalizeCodeSelectionText(selectedText);
  return {
    key,
    selectionSha256: createHash('sha256').update(normalized, 'utf8').digest('hex'),
    utf16Length: normalized.length,
    lineCount: normalized.length === 0 ? 0 : normalized.split('\n').length,
    containsStateLabel: STATE_LABELS.some((label) => normalized.includes(label)),
  };
};

export const canonicalizeCodeSelectionRecords = (
  records: readonly CodeSelectionRecord[],
  expectedKeys: readonly string[] = EXPECTED_CODE_SELECTION_RECORD_KEYS,
): CodeSelectionRecord[] => {
  const byKey = new Map<string, CodeSelectionRecord>();
  for (const record of records) {
    if (byKey.has(record.key)) {
      throw new Error(`Duplicate code selection record key: ${record.key}.`);
    }
    byKey.set(record.key, record);
  }

  const expected = [...expectedKeys].sort();
  const actual = [...byKey.keys()].sort();
  const missing = expected.filter((key) => !byKey.has(key));
  const unexpected = actual.filter((key) => !expected.includes(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Invalid code selection record set; missing: ${missing.join(', ') || '<none>'}; ` +
        `unexpected: ${unexpected.join(', ') || '<none>'}.`,
    );
  }

  return actual.map((key) => {
    const record = byKey.get(key);
    if (!record) throw new Error(`Missing canonical code selection record: ${key}.`);
    return record;
  });
};

const assertExactKeys = (value: Record<string, unknown>, expected: readonly string[]): void => {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, i) => key !== expectedKeys[i])
  ) {
    throw new Error('Code selection baseline contains an unexpected schema field.');
  }
};

const parseRecord = (value: unknown): CodeSelectionRecord => {
  if (!isRecord(value)) {
    throw new Error('Code selection baseline record must be an object.');
  }
  const record = value;
  assertExactKeys(record, [
    'key',
    'selectionSha256',
    'utf16Length',
    'lineCount',
    'containsStateLabel',
  ]);
  if (
    typeof record['key'] !== 'string' ||
    typeof record['selectionSha256'] !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(record['selectionSha256']) ||
    typeof record['utf16Length'] !== 'number' ||
    !Number.isInteger(record['utf16Length']) ||
    record['utf16Length'] < 0 ||
    typeof record['lineCount'] !== 'number' ||
    !Number.isInteger(record['lineCount']) ||
    record['lineCount'] < 0 ||
    typeof record['containsStateLabel'] !== 'boolean'
  ) {
    throw new Error('Code selection baseline record has an invalid field value.');
  }
  return {
    key: record['key'],
    selectionSha256: record['selectionSha256'],
    utf16Length: record['utf16Length'],
    lineCount: record['lineCount'],
    containsStateLabel: record['containsStateLabel'],
  };
};

export const parseCodeSelectionBaseline = (
  value: unknown,
  expectedProject: CodeSelectionProject,
): CodeSelectionBaseline => {
  if (!isRecord(value)) {
    throw new Error('Code selection baseline must be an object.');
  }
  const baseline = value;
  assertExactKeys(baseline, ['schemaVersion', 'runKind', 'project', 'records']);
  if (
    baseline['schemaVersion'] !== 1 ||
    baseline['runKind'] !== 'baseline' ||
    baseline['project'] !== expectedProject ||
    !Array.isArray(baseline['records'])
  ) {
    throw new Error('Code selection baseline header does not match the protocol.');
  }

  return {
    schemaVersion: 1,
    runKind: 'baseline',
    project: expectedProject,
    records: canonicalizeCodeSelectionRecords(
      baseline['records'].map((record) => parseRecord(record)),
    ),
  };
};

export const writeCodeSelectionBaseline = async (
  artifactPath: string,
  project: CodeSelectionProject,
  records: readonly CodeSelectionRecord[],
  options: CodeSelectionBaselineWriteOptions = {},
): Promise<void> => {
  const fileOperations: CodeSelectionBaselineFileOperations = {
    access: options.fileOperations?.access ?? DEFAULT_BASELINE_FILE_OPERATIONS.access,
    ensureDirectory:
      options.fileOperations?.ensureDirectory ?? DEFAULT_BASELINE_FILE_OPERATIONS.ensureDirectory,
    openExclusive:
      options.fileOperations?.openExclusive ?? DEFAULT_BASELINE_FILE_OPERATIONS.openExclusive,
    rename: options.fileOperations?.rename ?? DEFAULT_BASELINE_FILE_OPERATIONS.rename,
    remove: options.fileOperations?.remove ?? DEFAULT_BASELINE_FILE_OPERATIONS.remove,
  };
  const canonicalRecords = canonicalizeCodeSelectionRecords(records);
  const baseline: CodeSelectionBaseline = {
    schemaVersion: 1,
    runKind: 'baseline',
    project,
    records: canonicalRecords,
  };
  await fileOperations.ensureDirectory(path.dirname(artifactPath));
  const temporaryPath = `${artifactPath}.tmp-${process.pid.toString()}-${randomUUID()}`;
  let handle: CodeSelectionBaselineWriteHandle | null = null;

  try {
    try {
      await fileOperations.access(artifactPath);
      throw new Error(`Code selection baseline already exists: ${path.basename(artifactPath)}.`);
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
    }

    handle = await fileOperations.openExclusive(temporaryPath);
    await handle.writeFile(`${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;

    try {
      await fileOperations.access(artifactPath);
      throw new Error(`Code selection baseline already exists: ${path.basename(artifactPath)}.`);
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
    }
    await fileOperations.rename(temporaryPath, artifactPath);
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    await fileOperations.remove(temporaryPath).catch(() => undefined);
    throw error;
  }
};

export const compareCodeSelectionBaseline = async (
  artifactPath: string,
  project: CodeSelectionProject,
  records: readonly CodeSelectionRecord[],
): Promise<void> => {
  const current = canonicalizeCodeSelectionRecords(records);
  const parsedBaseline: unknown = JSON.parse(await readFile(artifactPath, 'utf8'));
  const baseline = parseCodeSelectionBaseline(parsedBaseline, project);

  for (let index = 0; index < current.length; index += 1) {
    const actual = current[index];
    const expected = baseline.records[index];
    if (!actual || !expected || actual.key !== expected.key) {
      throw new Error('Code selection baseline record order is invalid.');
    }
    for (const field of ['selectionSha256', 'utf16Length', 'lineCount'] as const) {
      if (actual[field] !== expected[field]) {
        throw new Error(`Code selection comparison failed for ${actual.key}/${field}.`);
      }
    }
  }
};
