import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CSP_REQUIRED_CASE_IDS } from '../ci/csp-test-cases.js';

// config読込やfixture起動前のエラーも生stderrとして保存しない。
export const safeCspRunnerLine = (line: string): string | null => {
  if (
    /^\[csp-tests\] (?:passed|failed|timedout|interrupted): [0-9]{1,5} passed, [0-9]{1,5} not passed$/u.test(
      line,
    )
  )
    return line;
  if (/^\[csp-tests\] (?:web-server|fixture-config|timeout|runner-error)$/u.test(line)) return line;
  const match =
    /^\[csp-tests\] (chromium-csp|firefox-csp|webkit-csp|unknown) ([a-z-]+): (passed|failed|timedOut|skipped|interrupted)$/u.exec(
      line,
    );
  return match && (CSP_REQUIRED_CASE_IDS.includes(match[2] ?? '') || match[2] === 'unknown')
    ? line
    : null;
};
export const runCspTests = async (args: readonly string[]): Promise<number> => {
  const projects =
    args.length === 2 && args[0] === '--project' ? [`--project=${args[1] ?? ''}`] : args;
  if (
    projects.length > 1 ||
    projects.some((arg) => !/^--project=(?:chromium|firefox|webkit)-csp$/u.test(arg))
  ) {
    process.stderr.write('[csp-run] invalid-arguments\n');
    return 1;
  }
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        'node_modules/playwright/cli.js',
        'test',
        '--config',
        'playwright.csp.config.ts',
        ...projects,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let pending = '';
    let unexpected = false;
    child.stdout.on('data', (chunk: Buffer) => {
      pending += chunk.toString();
      const lines = pending.split(/\r?\n/u);
      pending = lines.pop() ?? '';
      for (const line of lines) {
        if (!line) continue;
        const safe = safeCspRunnerLine(line);
        if (safe) process.stdout.write(safe + '\n');
        else unexpected = true;
      }
      if (pending.length > 4096) {
        pending = '';
        unexpected = true;
      }
    });
    child.stderr.on('data', () => {
      unexpected = true;
    });
    child.on('error', () => {
      process.stderr.write('[csp-run] launch-failed\n');
      resolve(1);
    });
    child.on('close', (code) => {
      if (pending.trim()) unexpected = true;
      if (unexpected) process.stderr.write('[csp-run] unexpected-runner-output\n');
      resolve(code === 0 && !unexpected ? 0 : 1);
    });
  });
};
const entry = process.argv[1];
if (entry && fileURLToPath(import.meta.url) === path.resolve(entry))
  process.exitCode = await runCspTests(process.argv.slice(2));
