import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const roots: string[] = [];
const version = '11.2.3';
const pinned = (value = version): string => `pnpm@${value}+sha512.${'a'.repeat(128)}`;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const fixture = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rouault pnpm-'));
  roots.push(root);
  const scripts = path.join(root, 'scripts', 'ci');
  const bin = path.join(root, 'bin');
  const caller = path.join(root, 'unrelated caller');
  await Promise.all(
    [scripts, bin, caller].map((directory) => mkdir(directory, { recursive: true })),
  );
  const helper = path.join(scripts, 'assert-pnpm-version.mjs');
  await copyFile('scripts/ci/assert-pnpm-version.mjs', helper);
  const manifest = path.join(root, 'package.json');
  await writeFile(manifest, JSON.stringify({ packageManager: pinned() }));
  await writeFile(
    path.join(caller, 'package.json'),
    JSON.stringify({ packageManager: pinned('99.0.0') }),
  );
  const observed = path.join(root, 'observed.json');
  const mock = async (output = `${version}\n`, status = 0) => {
    const executable = path.join(bin, 'mock.cjs');
    await writeFile(
      executable,
      [
        `#!${process.execPath}`,
        `require('node:fs').writeFileSync(${JSON.stringify(observed)}, JSON.stringify({cwd:process.cwd(), args:process.argv.slice(2)}));`,
        `process.stdout.write(${JSON.stringify(output)});`,
        `process.exitCode = ${status};`,
      ].join('\n'),
      { mode: 0o755 },
    );
    if (process.platform === 'win32') {
      await writeFile(path.join(bin, 'pnpm.cmd'), `@"${process.execPath}" "${executable}" %*\r\n`);
    } else {
      await copyFile(executable, path.join(bin, 'pnpm'));
    }
  };
  const run = (missingCommand = false) =>
    spawnSync(process.execPath, [helper], {
      cwd: caller,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: missingCommand ? bin : `${bin}${path.delimiter}${process.env['PATH'] ?? ''}`,
      },
    });
  return { root, manifest, observed, mock, run };
};

describe('effective pnpm version CLI', () => {
  it('uses its own repository manifest and command cwd from an unrelated caller', async () => {
    const f = await fixture();
    await f.mock();
    const result = f.run();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      `manifest=${f.manifest} expected=${version} actual="${version}"`,
    );
    expect(JSON.parse(await readFile(f.observed, 'utf8'))).toEqual({
      cwd: f.root,
      args: ['--version'],
    });
  });

  it('follows changes to packageManager alone without changing the helper', async () => {
    const f = await fixture();
    await f.mock('11.2.4\n');
    expect(f.run().status).toBe(1);
    await writeFile(f.manifest, JSON.stringify({ packageManager: pinned('11.2.4') }));
    const result = f.run();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('expected=11.2.4 actual="11.2.4"');
  });

  it.each([
    undefined,
    null,
    123,
    'pnpm@11.2.3',
    pinned('^11.2.3'),
    pinned('11.x'),
    pinned('01.2.3'),
    pinned('11.2.3-rc.1'),
    pinned().replace('sha512', 'sha256'),
    pinned().slice(0, -1),
    pinned().replace('pnpm@', 'npm@'),
    `${pinned()}\n`,
  ])('rejects missing, malformed or ranged packageManager: %s', async (packageManager) => {
    const f = await fixture();
    await writeFile(f.manifest, JSON.stringify({ packageManager }));
    const result = f.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `manifest=${f.manifest} expected=<unavailable> actual=<unavailable>`,
    );
    expect(result.stderr).toContain('packageManager must pin');
  });

  it.each(['', 'unexpected', `${version}\nextra`, '11.2.4', `${version}+metadata`])(
    'rejects empty, invalid or mismatched command output: %s',
    async (output) => {
      const f = await fixture();
      await f.mock(output);
      const result = f.run();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`manifest=${f.manifest} expected=${version} actual=`);
      expect(result.stderr).toContain(output ? JSON.stringify(output) : '<empty>');
    },
  );

  it('rejects nonzero exit even when stdout matches', async () => {
    const f = await fixture();
    await f.mock(`${version}\n`, 7);
    const result = f.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('status=7');
    expect(result.stderr).toContain(`expected=${version} actual="${version}"`);
  });

  it('rejects command lookup failure', async () => {
    const f = await fixture();
    const result = f.run(true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('pnpm --version failed');
    expect(result.stderr).toContain(`expected=${version} actual=<empty>`);
  });

  it.each(['missing', 'invalid JSON'])('rejects %s manifest', async (kind) => {
    const f = await fixture();
    if (kind === 'missing') await rm(f.manifest);
    else await writeFile(f.manifest, '{');
    const result = f.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `manifest=${f.manifest} expected=<unavailable> actual=<unavailable>`,
    );
  });
});
