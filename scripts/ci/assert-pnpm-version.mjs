import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const manifestPath = fileURLToPath(new URL('../../package.json', import.meta.url));
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const packageManagerPattern =
  /^pnpm@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\+sha512\.[0-9a-f]{128}$/u;
let expected = '<unavailable>';
let actual = '<unavailable>';

try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const pinned =
    typeof manifest?.packageManager === 'string'
      ? packageManagerPattern.exec(manifest.packageManager)
      : null;
  if (!pinned) {
    throw new Error(
      'packageManager must pin pnpm@<exact version>+sha512.<128 lowercase hex digits>',
    );
  }
  expected = pinned[1];

  // Windowsの.cmdはcmd.exeを要する。manifest由来の文字列をshell命令へ渡さない。
  const windows = process.platform === 'win32';
  const result = spawnSync(
    windows ? 'cmd.exe' : 'pnpm',
    windows ? ['/d', '/s', '/c', 'pnpm.cmd --version'] : ['--version'],
    {
      cwd: path.dirname(manifestPath),
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 4096,
      windowsHide: true,
    },
  );
  const output = result.stdout?.trim() ?? '';
  actual = output ? JSON.stringify(output.slice(0, 200)) : '<empty>';
  if (result.error || result.status !== 0) {
    throw new Error(
      `pnpm --version failed (code=${result.error?.code ?? 'none'}, status=${result.status}, signal=${result.signal})`,
    );
  }
  if (!versionPattern.test(output)) {
    throw new Error('pnpm --version must return one exact version');
  }
  if (output !== expected) {
    throw new Error('effective pnpm version does not match packageManager');
  }
  console.log(`[pnpm-version] manifest=${manifestPath} expected=${expected} actual=${actual}`);
} catch (error) {
  console.error(
    `[pnpm-version] manifest=${manifestPath} expected=${expected} actual=${actual}: ${error.message}`,
  );
  process.exitCode = 1;
}
