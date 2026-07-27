import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import {
  resolveBrowserTestBrowsers,
  webkitBrowserTestShards,
} from './scripts/testing/browser-test-matrix.js';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const browserTestBrowsers = resolveBrowserTestBrowsers(
  process.env['ROUAULT_BROWSER_TEST_BROWSERS'],
  process.env['CI'] === 'true',
);

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
  test: {
    name,
    include: [...include],
    ...(exclude.length > 0 ? { exclude: [...exclude] } : {}),
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
      {
        plugins: await storybookTest({
          configDir: path.join(dirname, '.storybook'),
          disableAddonDocs: true,
          tags: {
            include: ['smoke'],
            exclude: ['manual-only'],
            skip: [],
          },
        }),
        optimizeDeps: {
          include: ['@storybook/web-components', '@storybook/web-components-vite'],
        },
        test: {
          name: 'storybook-smoke',
          setupFiles: ['.storybook/vitest.setup.ts'],
          browser: {
            enabled: true,
            api: {
              host: '127.0.0.1',
              strictPort: false,
            },
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        test: {
          name: 'storybook-meta',
          environment: 'node',
          include: ['test/storybook/**/*.test.ts'],
        },
      },
    ],
  },
});
