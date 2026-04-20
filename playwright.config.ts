/// <reference types="node" />

import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';

const crossBrowserFinalCheck = [
  '**/app-shell.spec.ts',
  '**/not-found-page.spec.ts',
  '**/router.spec.ts',
  '**/tag-page.spec.ts',
  '**/toc-active-scroll.spec.ts',
  '**/toc-tabs.spec.ts',
  '**/sidebar-pre-hydration-leakage.spec.ts',
];


const mobileWebkitFinalCheck = ['**/mobile-header-dropdown-position.spec.ts'];

const isCI = !!process.env['CI'];

const withNodeOption = (currentValue: string | undefined, option: string): string => {
  if (typeof currentValue !== 'string' || currentValue.trim().length === 0) {
    return option;
  }

  return currentValue.includes(option) ? currentValue : `${currentValue} ${option}`;
};

const toPlaywrightEnv = (env: NodeJS.ProcessEnv): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
};

export default defineConfig({
  testDir: './test/e2e',

  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  fullyParallel: true,

  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),

  reporter: 'html',

  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-integration',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-final-check',
      testMatch: crossBrowserFinalCheck,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-final-check',
      testMatch: crossBrowserFinalCheck,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'webkit-mobile-final-check',
      testMatch: mobileWebkitFinalCheck,
      use: { ...devices['iPhone 14'] },
    },
  ],

  webServer: {
    command:
      'pnpm run build:production && pnpm exec vite preview --config vite.preview.config.ts --host 127.0.0.1 --port 8080 --strictPort',
    url: 'http://127.0.0.1:8080/search/',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    env: {
      ...toPlaywrightEnv(process.env),
      ROUAULT_SKIP_PAGEFIND: '1',
      NODE_OPTIONS: withNodeOption(process.env['NODE_OPTIONS'], '--max-old-space-size=4096'),
    },
  },
});
