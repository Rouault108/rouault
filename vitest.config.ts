import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { searchTargetServer } from './scripts/testing/search-target-server.js';
import {
  resolveBrowserTestBrowsers,
  webkitBrowserTestShards,
} from './scripts/testing/browser-test-matrix.js';

const browserTestBrowsers = resolveBrowserTestBrowsers(
  process.env['ROUAULT_BROWSER_TEST_BROWSERS'],
  process.env['CI'] === 'true',
);
// 実corpus artifactを要するD1結合試験はverify:search-targetで準備して実行する。
const targetVerificationExcludes =
  process.env['ROUAULT_SEARCH_TARGET_VERIFY'] === '1'
    ? []
    : [
        'test/browser/lexical-target.test.ts',
        'test/browser/lexical-recovery.test.ts',
        'test/browser/lexical-packaged-ui.test.ts',
        'test/browser/lexical-performance.test.ts',
      ];

const browserTestInstances = browserTestBrowsers
  .filter((browser) => browser !== 'webkit')
  .map((browser) => ({
    browser,
    name: `browser-${browser}`,
    ...(browser === 'firefox' ? { fileParallelism: false } : {}),
  }));

const createBrowserProvider = () =>
  playwright({
    launchOptions: {
      timeout: 90_000,
    },
  });

const createBrowserTestProject = (
  name: string,
  include: readonly string[],
  exclude: readonly string[],
  instances: readonly {
    readonly browser: 'chromium' | 'firefox' | 'webkit';
    readonly name: string;
    readonly fileParallelism?: boolean;
  }[],
  groupOrder?: number,
) => ({
  plugins: [searchTargetServer()],
  // Worker内の遅延importでも実行途中の依存再最適化・reloadを発生させない。
  optimizeDeps: { include: ['@libraz/suzume', 'minisearch'] },
  test: {
    name,
    include: [...include],
    exclude: [...exclude, ...targetVerificationExcludes],
    setupFiles: ['test/browser/setup.ts'],
    isolate: true,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    ...(groupOrder === undefined ? {} : { sequence: { groupOrder } }),
    browser: {
      enabled: true,
      headless: true,
      ui: false,
      api: {
        host: '127.0.0.1',
        strictPort: false,
      },
      connectTimeout: 90_000,
      // 旧WTR/Playwrightのdesktop contractを維持し、Vitest既定のmobile幅へ依存しない。
      viewport: {
        width: 1280,
        height: 720,
      },
      provider: createBrowserProvider(),
      instances: [...instances],
    },
  },
});

const browserTestProjects = [
  ...(browserTestInstances.length > 0
    ? [createBrowserTestProject('browser', ['test/browser/**/*.test.ts'], [], browserTestInstances)]
    : []),
  ...(browserTestBrowsers.includes('webkit')
    ? webkitBrowserTestShards.map((shard) =>
        createBrowserTestProject(
          shard.projectName,
          shard.include,
          shard.exclude,
          [
            {
              browser: 'webkit',
              name: shard.name,
              fileParallelism: shard.fileParallelism,
            },
          ],
          shard.groupOrder,
        ),
      )
    : []),
];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/node/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'ssr',
          environment: 'node',
          include: ['test/ssr/**/*.test.ts'],
        },
      },
      ...browserTestProjects,
    ],
  },
});
