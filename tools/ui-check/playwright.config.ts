import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: path.resolve(process.cwd(), 'tools/ui-check/playwright'),
  outputDir: path.resolve(process.cwd(), '.generated/ui-check/test-results'),
  reporter: [
    [
      'html',
      {
        outputFolder: path.resolve(process.cwd(), '.generated/ui-check/playwright-report'),
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    screenshot: 'off',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: {
    command:
      'pnpm run codegen:icons && pnpm run prepare:static-font-assets && pnpm exec vite --config tools/ui-check/vite.config.ts --host 127.0.0.1 --port 5174 --strictPort',
    cwd: process.cwd(),
    url: 'http://127.0.0.1:5174/tools/ui-check/',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
