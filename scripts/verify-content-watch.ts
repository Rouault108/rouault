import { createServer } from 'node:net';
import { writeFileSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import {
  appendFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

// 実作業ツリーの本文を変更せず、コピー内だけで故障と連続編集を起こす。
const root = await mkdtemp(path.join(tmpdir(), 'rouault-content-watch-'));
const sourceRoot = process.cwd();
await cp(sourceRoot, root, {
  recursive: true,
  filter: (source) => {
    const relative = path.relative(sourceRoot, source);
    return ![
      '.git',
      'node_modules',
      'dist',
      '.velite',
      'tmp',
      'playwright-report',
      'test-results',
    ].some((name) => relative === name || relative.startsWith(`${name}${path.sep}`));
  },
});
await symlink(path.join(sourceRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
const fixture = path.join(root, 'content/notes/watch-canary.md');
const valid = (marker: string) =>
  `---\ntitle: Watch Canary\ndate: 2026-01-01\nupdated: 2026-01-01\n---\n\n## Canary\n\n${marker}\n`;
await writeFile(fixture, '---\ntitle: []\n---\nInvalid');
const configFile = path.join(root, 'eleventy.config.ts');
let config = await readFile(configFile, 'utf8');
config = config.replace(
  'const generated = await generateContent();',
  `console.log('[verify:content:start]');
      await new Promise((resolve) => setTimeout(resolve, 300));
      const generated = await generateContent().finally(() => { console.log('[verify:content:end]'); });`,
);

const faultPath = (phase: string) => path.join(root, `.verify-fault-${phase}`);
config = "import { existsSync as verifyExists } from 'node:fs';\n" + config;
config = config.replace(
  'viteOptions: {',
  'viteOptions: { cacheDir: path.resolve(".generated/verify-vite-cache"),',
);
config = config.replace(
  'copyStaticArtifacts: copyStaticHostingArtifacts,',
  `copyStaticArtifacts: async () => {
  if (verifyExists(${JSON.stringify(faultPath('static'))})) throw new Error('injected-static-failure');
  await copyStaticHostingArtifacts();
},`,
);
config = config.replace(
  'emitSearch: async () => {',
  `emitSearch: async () => {
  if (verifyExists(${JSON.stringify(faultPath('search'))})) throw new Error('injected-search-failure');`,
);
const templatePath = path.join(root, 'src/notes.11ty.ts');
const template =
  "import { existsSync as verifyExists } from 'node:fs';\n" +
  (await readFile(templatePath, 'utf8'));
await writeFile(
  templatePath,
  template.replace(
    'render(_data: NotePageData) {',
    `render(_data: NotePageData) {
  if (verifyExists(${JSON.stringify(faultPath('html'))})) throw new Error('injected-html-failure');`,
  ),
);
await writeFile(configFile, config);
const portProbe = createServer();
await new Promise<void>((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
const probeAddress = portProbe.address();
if (!probeAddress || typeof probeAddress === 'string') throw new Error('missing probe address');
const port = probeAddress.port;
await new Promise<void>((resolve, reject) =>
  portProbe.close((error) => {
    if (error) reject(error);
    else resolve();
  }),
);
const base = `http://127.0.0.1:${String(port)}`;
let child: ChildProcess | undefined;
let log = '';
const events: { check: string; result: 'passed'; detail?: string }[] = [];
const record = (check: string, detail?: string) => {
  events.push({ check, result: 'passed', ...(detail ? { detail } : {}) });
  console.log(`PASS ${check}`);
};
const start = () => {
  child = spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      'node_modules/@11ty/eleventy/cmd.cjs',
      '--config=eleventy.config.ts',
      '--serve',
      `--port=${String(port)}`,
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        ROUAULT_SITE_ORIGIN: base,
        ROUAULT_BUILD_LABEL: 'watch-verification',
        ROUAULT_BUILD_ID: 'watch-verification',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    },
  );
  child.stdout?.on('data', (data: Buffer) => {
    log += data.toString();
    writeFileSync(path.join(root, 'live-server.log'), log);
  });
  child.stderr?.on('data', (data: Buffer) => {
    log += data.toString();
    writeFileSync(path.join(root, 'live-server.log'), log);
  });
  return child;
};
const until = async (
  test: () => boolean | Promise<boolean>,
  description: string,
  timeout = 120_000,
) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await test()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${description}\n${log.slice(-4000)}`);
};
const status = async () => {
  try {
    return (await fetch(`${base}/search-catalog.json`, { signal: AbortSignal.timeout(2000) }))
      .status;
  } catch {
    return 0;
  }
};
const stop = async () => {
  if (child?.exitCode !== null) return;
  const running = child;
  if (process.platform !== 'win32' && running.pid) process.kill(-running.pid, 'SIGTERM');
  else running.kill('SIGTERM');
  await until(
    () => running.exitCode !== null || running.signalCode !== null,
    'server stop',
    20_000,
  );
};
try {
  const initial = start();
  await until(() => initial.exitCode !== null, 'initial failure exits');
  assert.notEqual(initial.exitCode, 0);
  record('initial metadata failure exits; restart required');
  await writeFile(fixture, valid('WATCH-V1'));
  start();
  await until(async () => (await status()) === 200, 'first successful startup');
  record('restart after initial failure; middleware preserves initial success');
  const beforeError = log.length;
  await writeFile(fixture, '---\ntitle: []\n---\nInvalid watch input');
  await until(
    async () => log.slice(beforeError).includes('invalid title') && (await status()) === 503,
    'watch metadata failure closes serving',
  );
  assert.equal(child?.exitCode, null);
  const failedResponse = await fetch(`${base}/search/manifest.json`, { method: 'HEAD' });
  assert.equal(failedResponse.status, 503);
  assert.equal(failedResponse.headers.get('cache-control'), 'no-store');
  record('running watch metadata failure keeps process alive and data at 503/no-store');
  await writeFile(fixture, valid('WATCH-RECOVERED'));
  await until(
    async () =>
      (await status()) === 200 &&
      (await readFile(path.join(root, 'dist/notes/watch-canary/index.html'), 'utf8')).includes(
        'WATCH-RECOVERED',
      ),
    'watch recovery',
  );
  record('corrected article recovers through watch without restart');
  for (const phase of ['html', 'static', 'search']) {
    const startLog = log.length;
    await writeFile(faultPath(phase), 'synthetic failure');
    await writeFile(fixture, valid(`WATCH-FAIL-${phase}`));
    await until(
      async () =>
        log.slice(startLog).includes(`injected-${phase}-failure`) && (await status()) === 503,
      `${phase} failure closes serving`,
    );
    assert.equal(child.exitCode, null);
    await unlink(faultPath(phase));
    const marker = `WATCH-RECOVERED-${phase}`;
    await writeFile(fixture, valid(marker));
    await until(
      async () =>
        (await status()) === 200 &&
        (await readFile(path.join(root, 'dist/notes/watch-canary/index.html'), 'utf8')).includes(
          marker,
        ),
      `${phase} recovery`,
    );
    record(`${phase} fault keeps search unavailable and corrected watch recovers`);
  }
  const beforeEdits = log.length;
  await writeFile(fixture, valid('WATCH-EDIT-1'));
  await until(
    () => log.slice(beforeEdits).includes('[verify:content:start]'),
    'rapid edit first build starts',
  );
  await writeFile(fixture, valid('WATCH-EDIT-2'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  await writeFile(fixture, valid('WATCH-V1-LATEST'));
  await until(
    async () =>
      (await status()) === 200 &&
      (await readFile(path.join(root, 'dist/notes/watch-canary/index.html'), 'utf8')).includes(
        'WATCH-V1-LATEST',
      ),
    'latest edit rendered',
  );
  // 次のwatch試行が待機している場合も、終了まで確認する。
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await until(async () => (await status()) === 200, 'queued watch completes');
  let active = 0,
    maximum = 0;
  for (const event of log.matchAll(/\[verify:content:(start|end)\]/gu)) {
    active += event[1] === 'start' ? 1 : -1;
    maximum = Math.max(maximum, active);
  }
  assert.equal(maximum, 1);
  assert.equal(active, 0);
  const notes = JSON.parse(await readFile(path.join(root, '.velite/notes.json'), 'utf8')) as {
    slug: string;
    content: string;
  }[];
  assert(notes.find((note) => note.slug === 'watch-canary')?.content.includes('WATCH-V1-LATEST'));
  record(
    'consecutive edits are serialized and latest processed input reaches JSON and HTML',
    `max active generation=${String(maximum)}`,
  );
  await stop();
  const compilerFile = path.join(root, 'build/content/content-compiler.ts');
  const compiler = await readFile(compilerFile, 'utf8');
  assert(compiler.includes('value: input.body,'));
  await writeFile(
    compilerFile,
    compiler.replace('value: input.body,', "value: input.body.replaceAll('WATCH-V1', 'WATCH-V2'),"),
  );
  await writeFile(path.join(root, 'content/notes/watch-second.md'), valid('WATCH-V1-SECOND'));
  start();
  await until(
    async () =>
      (await status()) === 200 &&
      (await readFile(path.join(root, 'dist/notes/watch-canary/index.html'), 'utf8')).includes(
        'WATCH-V2-LATEST',
      ),
    'new compiler after restart',
  );
  assert(
    (await readFile(path.join(root, 'dist/notes/watch-second/index.html'), 'utf8')).includes(
      'WATCH-V2-SECOND',
    ),
  );
  record('stop, edit implementation, restart uses new compiler for full generation');
} finally {
  await stop();
  await mkdir(path.join(root, 'evidence'), { recursive: true });
  await writeFile(path.join(root, 'evidence/server.log'), log);
  await writeFile(
    path.join(root, 'evidence/results.json'),
    JSON.stringify({ root, events }, null, 2),
  );
  await appendFile(
    path.join(sourceRoot, 'tmp/content-watch-evidence-path.txt'),
    `${root}/evidence\n`,
  );
  console.log(`Evidence: ${root}/evidence`);
}
