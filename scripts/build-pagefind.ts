import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface PagefindCommand {
  file: string;
  args: readonly string[];
  cwd: string;
}

export type PagefindCommandRunner = (command: PagefindCommand) => Promise<void>;

export interface BuildPagefindIndexOptions {
  projectRoot?: string;
  siteDir?: string;
  cliPath?: string;
  execPath?: string;
  runner?: PagefindCommandRunner;
}

export function resolvePagefindCliPath(projectRoot: string = process.cwd()): string {
  const cliPath = path.resolve(projectRoot, 'node_modules', 'pagefind', 'lib', 'runner', 'bin.cjs');
  if (!existsSync(cliPath)) {
    throw new Error(`pagefind CLI が見つかりません: ${cliPath}`);
  }

  return cliPath;
}

const defaultRunner: PagefindCommandRunner = async (command) => {
  const result = await execFileAsync(command.file, [...command.args], {
    cwd: command.cwd,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
};

export async function buildPagefindIndex(options: BuildPagefindIndexOptions = {}): Promise<void> {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const siteDir = path.resolve(projectRoot, options.siteDir ?? 'dist');
  const cliPath = options.cliPath ?? resolvePagefindCliPath(projectRoot);
  const execPath = options.execPath ?? process.execPath;
  const runner = options.runner ?? defaultRunner;

  await runner({
    file: execPath,
    args: [cliPath, '--site', siteDir],
    cwd: projectRoot,
  });
}

const isDirectExecution = (): boolean => {
  const entryPath = process.argv[1];
  if (typeof entryPath !== 'string' || entryPath.length === 0) {
    return false;
  }

  return path.resolve(entryPath) === path.resolve(fileURLToPath(import.meta.url));
};

if (isDirectExecution()) {
  try {
    await buildPagefindIndex();
  } catch (error: unknown) {
    console.error('[build-pagefind] Pagefind index generation failed.', error);
    process.exitCode = 1;
  }
}
