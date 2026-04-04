import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

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
