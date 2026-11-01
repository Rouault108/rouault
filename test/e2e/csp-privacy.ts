import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from './support/csp-test.js';

test('failure privacy controls redact assertion, source, DOM, stdout and report', async ({
  browserName,
}, info) => {
  void browserName;
  const result = await new Promise<{ code: number | null; output: string }>((resolve) => {
    const child = spawn(
      process.execPath,
      [
        'node_modules/playwright/cli.js',
        'test',
        '--config',
        'test/e2e/support/csp-privacy.config.ts',
        `--project=${info.project.name}`,
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PLAYWRIGHT_NO_COPY_PROMPT: '1' },
      },
    );
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('close', (code) => resolve({ code, output }));
  });
  expect(result.code === 1).toBe(true);
  expect(result.output.includes('CSP_PRIVATE_CANARY_7f1a')).toBe(false);
  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file);
      else files.push(file);
    }
  };
  await visit('.generated/csp/privacy-proof');
  files.push('.generated/csp/privacy-results.json');
  expect(files.some((file) => file.endsWith('error-context.md'))).toBe(true);
  for (const file of files) {
    const body = await readFile(file, 'utf8');
    expect(
      body.includes('CSP_PRIVATE_CANARY_7f1a') ||
        body.includes('# Page snapshot') ||
        body.includes('# Test source'),
    ).toBe(false);
  }
});
