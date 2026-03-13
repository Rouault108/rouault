import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildPagefindIndex,
  resolvePagefindCliPath,
  type PagefindCommand,
  type PagefindCommandRunner,
} from '../../scripts/build-pagefind.js';

describe('build-pagefind', () => {
  it('pagefind CLI の実体を解決できること', () => {
    const cliPath = resolvePagefindCliPath(process.cwd());

    expect(cliPath).toMatch(/pagefind[\\/]+lib[\\/]+runner[\\/]+bin\.cjs$/);
  });

  it('Node 経由で pagefind CLI を dist に対して実行すること', async () => {
    const commands: PagefindCommand[] = [];
    const runner: PagefindCommandRunner = (command) => {
      commands.push(command);
      return Promise.resolve();
    };

    await buildPagefindIndex({
      projectRoot: '/tmp/rouault',
      siteDir: 'dist',
      cliPath: '/tmp/rouault/node_modules/pagefind/lib/runner/bin.cjs',
      execPath: '/usr/local/bin/node',
      runner,
    });

    expect(commands).toEqual([
      {
        file: '/usr/local/bin/node',
        args: [
          '/tmp/rouault/node_modules/pagefind/lib/runner/bin.cjs',
          '--site',
          path.resolve('/tmp/rouault', 'dist'),
        ],
        cwd: path.resolve('/tmp/rouault'),
      },
    ]);
  });
});
