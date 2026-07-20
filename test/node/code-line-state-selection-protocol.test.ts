import { open, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { afterEach, describe, expect, it } from 'vitest';

import {
  canonicalizeCodeSelectionRecords,
  codeSelectionArtifactPath,
  compareCodeSelectionBaseline,
  createCodeSelectionRecord,
  EXPECTED_CODE_SELECTION_RECORD_KEYS,
  parseCodeSelectionBaseline,
  resolveCodeSelectionProtocolConfiguration,
  writeCodeSelectionBaseline,
} from '../e2e/support/code-line-state-selection-protocol.js';

const TEST_ROOT = path.resolve(
  process.cwd(),
  '.generated',
  'e2e',
  `code-selection-protocol-unit-${process.pid.toString()}`,
);
const PROJECT = 'chromium-integration' as const;

const createExpectedRecords = (suffix = '') =>
  EXPECTED_CODE_SELECTION_RECORD_KEYS.map((key) =>
    createCodeSelectionRecord(key, `${key}${suffix}`),
  );

afterEach(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });
});

describe('code line state selection protocol', () => {
  it('standardを既定にし、prefixだけの指定をrejectする', () => {
    expect(resolveCodeSelectionProtocolConfiguration({}, PROJECT, TEST_ROOT)).toMatchObject({
      runKind: 'standard',
      prefix: null,
      artifactPath: null,
    });
    expect(() =>
      resolveCodeSelectionProtocolConfiguration(
        { ROUAULT_CODE_SELECTION_BASELINE_PREFIX: 'p2-smoke' },
        PROJECT,
        TEST_ROOT,
      ),
    ).toThrow(/must be unset/u);
  });

  it('run kind、prefix、projectをclosed setで検証する', () => {
    expect(() =>
      resolveCodeSelectionProtocolConfiguration(
        { ROUAULT_CODE_SELECTION_RUN_KIND: 'unexpected' },
        PROJECT,
        TEST_ROOT,
      ),
    ).toThrow(/Invalid ROUAULT_CODE_SELECTION_RUN_KIND/u);

    for (const prefix of ['', '.', '../escape', 'Uppercase', 'with.dot', 'with/slash']) {
      expect(() =>
        resolveCodeSelectionProtocolConfiguration(
          {
            ROUAULT_CODE_SELECTION_RUN_KIND: 'baseline',
            ROUAULT_CODE_SELECTION_BASELINE_PREFIX: prefix,
          },
          PROJECT,
          TEST_ROOT,
        ),
      ).toThrow(/Invalid ROUAULT_CODE_SELECTION_BASELINE_PREFIX/u);
    }

    expect(() =>
      resolveCodeSelectionProtocolConfiguration({}, 'webkit-mobile-final-check', TEST_ROOT),
    ).toThrow(/Unsupported code selection project/u);
  });

  it('artifact pathをhelper内の固定directoryとfilenameへ閉じる', () => {
    expect(codeSelectionArtifactPath('p3-start', PROJECT, TEST_ROOT)).toBe(
      path.join(
        TEST_ROOT,
        '.generated',
        'e2e',
        'code-line-state-selection.p3-start.chromium-integration.json',
      ),
    );
  });

  it('recordをkey昇順へcanonicalizeし、duplicate／missing／unexpectedをrejectする', () => {
    const records = createExpectedRecords().reverse();
    expect(canonicalizeCodeSelectionRecords(records).map((record) => record.key)).toEqual(
      EXPECTED_CODE_SELECTION_RECORD_KEYS,
    );
    const firstRecord = records[0];
    if (!firstRecord) throw new Error('Expected protocol fixture records.');
    expect(() => canonicalizeCodeSelectionRecords([...records, firstRecord])).toThrow(
      /Duplicate code selection record key/u,
    );
    expect(() => canonicalizeCodeSelectionRecords(records.slice(1))).toThrow(/missing:/u);
    expect(() =>
      canonicalizeCodeSelectionRecords([
        ...records,
        createCodeSelectionRecord('unexpected/normal/fixture', 'value'),
      ]),
    ).toThrow(/unexpected:/u);
  });

  it('selection本文を保存せずSHA-256／UTF-16 length／line countだけを記録する', () => {
    const record = createCodeSelectionRecord('surface/state/fixture', 'alpha\r\nbeta');
    expect(record).toEqual({
      key: 'surface/state/fixture',
      selectionSha256: 'bbfb79e82216bd2db1ad2c507d44ddf80aeb12f64f9562056afe93aad43154d9',
      utf16Length: 10,
      lineCount: 2,
      containsStateLabel: false,
    });
    expect(Object.keys(record)).not.toEqual(
      expect.arrayContaining(['source', 'selection', 'path']),
    );
  });

  it('baselineをrecursive directory作成後にatomic publishし、既存finalを上書きしない', async () => {
    const artifactPath = codeSelectionArtifactPath('unit-baseline', PROJECT, TEST_ROOT);
    const records = createExpectedRecords();

    await writeCodeSelectionBaseline(artifactPath, PROJECT, records);
    const before = await readFile(artifactPath, 'utf8');
    const artifactFiles = await readdir(path.dirname(artifactPath));
    expect(artifactFiles).toEqual([path.basename(artifactPath)]);
    expect(before).not.toContain('selectionText');

    await expect(writeCodeSelectionBaseline(artifactPath, PROJECT, records)).rejects.toThrow(
      /already exists/u,
    );
    expect(await readFile(artifactPath, 'utf8')).toBe(before);
    expect(await readdir(path.dirname(artifactPath))).toEqual([path.basename(artifactPath)]);
  });

  it('write／rename failureでもtemporary artifactを残さない', async () => {
    const writeFailurePath = codeSelectionArtifactPath(
      'unit-write-failure',
      PROJECT,
      TEST_ROOT,
    );
    const records = createExpectedRecords();

    await expect(
      writeCodeSelectionBaseline(writeFailurePath, PROJECT, records, {
        fileOperations: {
          openExclusive: async (temporaryPath) => {
            const handle = await open(temporaryPath, 'wx');
            return {
              writeFile: async (data, encoding) => {
                await handle.writeFile(data, encoding);
                throw new Error('synthetic write failure');
              },
              sync: async () => handle.sync(),
              close: async () => handle.close(),
            };
          },
        },
      }),
    ).rejects.toThrow(/synthetic write failure/u);
    expect(await readdir(path.dirname(writeFailurePath))).toEqual([]);

    const renameFailurePath = codeSelectionArtifactPath(
      'unit-rename-failure',
      PROJECT,
      TEST_ROOT,
    );
    await expect(
      writeCodeSelectionBaseline(renameFailurePath, PROJECT, records, {
        fileOperations: {
          rename: async () => {
            throw new Error('synthetic rename failure');
          },
        },
      }),
    ).rejects.toThrow(/synthetic rename failure/u);
    expect(await readdir(path.dirname(renameFailurePath))).toEqual([]);
  });

  it('compareはbaselineをread-onlyで検証し、selection回帰をrejectする', async () => {
    const artifactPath = codeSelectionArtifactPath('unit-compare', PROJECT, TEST_ROOT);
    const records = createExpectedRecords();
    await writeCodeSelectionBaseline(artifactPath, PROJECT, records);
    const before = await readFile(artifactPath, 'utf8');

    await compareCodeSelectionBaseline(artifactPath, PROJECT, records);
    expect(await readFile(artifactPath, 'utf8')).toBe(before);
    await expect(
      compareCodeSelectionBaseline(artifactPath, PROJECT, createExpectedRecords('-changed')),
    ).rejects.toThrow(/selectionSha256/u);
    expect(await readdir(path.dirname(artifactPath))).toEqual([path.basename(artifactPath)]);
  });

  it('schema、project、record setの不一致をrejectする', () => {
    const records = createExpectedRecords();
    const baseline = {
      schemaVersion: 1,
      runKind: 'baseline',
      project: PROJECT,
      records,
    };
    expect(parseCodeSelectionBaseline(baseline, PROJECT).records).toEqual(records);
    expect(() => parseCodeSelectionBaseline({ ...baseline, schemaVersion: 2 }, PROJECT)).toThrow(
      /header/u,
    );
    expect(() =>
      parseCodeSelectionBaseline({ ...baseline, project: 'firefox-final-check' }, PROJECT),
    ).toThrow(/header/u);
    expect(() =>
      parseCodeSelectionBaseline({ ...baseline, records: records.slice(1) }, PROJECT),
    ).toThrow(/missing:/u);
    expect(() => parseCodeSelectionBaseline({ ...baseline, source: 'private' }, PROJECT)).toThrow(
      /unexpected schema field/u,
    );
  });
});
