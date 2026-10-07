import path from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const faults = vi.hoisted(() => ({
  mkdtemp: vi.fn<(prefix: string) => Promise<string>>(),
  rename: vi.fn<typeof import('node:fs/promises').rename>(),
  writeFile: vi.fn<typeof import('node:fs/promises').writeFile>(),
}));

vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  mkdtemp: faults.mkdtemp,
  rename: faults.rename,
  writeFile: faults.writeFile,
}));

import { writeJsonAtomically } from '../../scripts/deploy/production-authority.js';

const fs = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');

describe('production JSON atomic publication', () => {
  let root: string;
  let targetDirectory: string;
  let targetPath: string;

  const renameOnRunner: typeof fs.rename = async (source, destination) => {
    // system tempとcheckoutが別filesystemであるrunnerの制約を再現する。
    const relative = path.relative(root, String(source));
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw Object.assign(new Error('cross-device link not permitted'), { code: 'EXDEV' });
    }
    await fs.rename(source, destination);
  };

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(tmpdir(), 'rouault-authority-test-'));
    targetDirectory = path.join(root, 'checkout', '.generated', 'deployment');
    targetPath = path.join(targetDirectory, 'state.json');
    faults.mkdtemp.mockReset().mockImplementation((prefix) => fs.mkdtemp(prefix));
    faults.writeFile.mockReset().mockImplementation(fs.writeFile);
    faults.rename.mockReset().mockImplementation(renameOnRunner);
  });

  afterEach(async () => {
    for (const result of faults.mkdtemp.mock.results) {
      if (result.type === 'return') {
        await fs.rm(await result.value, { recursive: true, force: true });
      }
    }
    await fs.rm(root, { recursive: true, force: true });
  });

  const existingState = async (): Promise<string> => {
    await fs.mkdir(targetDirectory, { recursive: true });
    const previous = '{"state":"previous"}\n';
    await fs.writeFile(targetPath, previous);
    return previous;
  };

  it('publishes complete JSON across the runner filesystem boundary without replacing early', async () => {
    const previous = await existingState();
    faults.rename.mockImplementation(async (source, destination) => {
      expect(await fs.readFile(targetPath, 'utf8')).toBe(previous);
      expect(JSON.parse(await fs.readFile(source, 'utf8'))).toEqual({ state: 'next' });
      await renameOnRunner(source, destination);
    });

    await expect(writeJsonAtomically(targetPath, { state: 'next' })).resolves.toBe(targetDirectory);
    expect(JSON.parse(await fs.readFile(targetPath, 'utf8'))).toEqual({ state: 'next' });
    expect(await fs.readdir(targetDirectory)).toEqual(['state.json']);
    expect(faults.rename).toHaveBeenCalledTimes(1);
  });

  it('creates missing output directories and removes staging after publication', async () => {
    await writeJsonAtomically(targetPath, { state: 'first' });
    expect(JSON.parse(await fs.readFile(targetPath, 'utf8'))).toEqual({ state: 'first' });
    expect(await fs.readdir(targetDirectory)).toEqual(['state.json']);
  });

  it('preserves the previous JSON and removes staging when writing fails', async () => {
    const previous = await existingState();
    const error = Object.assign(new Error('write failed'), { code: 'ENOSPC' });
    faults.writeFile.mockRejectedValueOnce(error);

    await expect(writeJsonAtomically(targetPath, { state: 'next' })).rejects.toBe(error);
    expect(await fs.readFile(targetPath, 'utf8')).toBe(previous);
    expect(await fs.readdir(targetDirectory)).toEqual(['state.json']);
    expect(faults.rename).not.toHaveBeenCalled();
  });

  it('preserves the previous JSON and removes staging when rename fails', async () => {
    const previous = await existingState();
    const error = Object.assign(new Error('rename failed'), { code: 'EACCES' });
    faults.rename.mockRejectedValueOnce(error);

    await expect(writeJsonAtomically(targetPath, { state: 'next' })).rejects.toBe(error);
    expect(await fs.readFile(targetPath, 'utf8')).toBe(previous);
    expect(await fs.readdir(targetDirectory)).toEqual(['state.json']);
  });

  it('preserves the previous JSON and leaves no staging when serialization fails', async () => {
    const previous = await existingState();

    await expect(writeJsonAtomically(targetPath, { unsupported: 1n })).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(await fs.readFile(targetPath, 'utf8')).toBe(previous);
    expect(await fs.readdir(targetDirectory)).toEqual(['state.json']);
    expect(faults.mkdtemp).not.toHaveBeenCalled();
    expect(faults.writeFile).not.toHaveBeenCalled();
    expect(faults.rename).not.toHaveBeenCalled();
  });
});
