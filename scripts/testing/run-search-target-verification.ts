import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const child = spawnSync(
  process.execPath,
  [
    resolve('node_modules/vitest/vitest.mjs'),
    'run',
    '--project=browser-*',
    'test/browser/lexical-target.test.ts',
    'test/browser/lexical-recovery.test.ts',
    'test/browser/lexical-packaged-ui.test.ts',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      ROUAULT_SEARCH_TARGET_VERIFY: '1',
      ROUAULT_BROWSER_TEST_BROWSERS:
        process.env['ROUAULT_BROWSER_TEST_BROWSERS'] ?? 'chromium,firefox,webkit',
    },
  },
);
if (child.error) throw child.error;
process.exitCode = child.status ?? 1;
