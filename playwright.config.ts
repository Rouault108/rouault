import { defineConfig, devices } from '@playwright/test';

const crossBrowserFinalCheck = [
  '**/app-shell.spec.ts',
  '**/not-found-page.spec.ts',
  '**/router.spec.ts',
  '**/tag-page.spec.ts',
  '**/toc-tabs.spec.ts',
];

export default defineConfig({
  testDir: './test/e2e',

  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  fullyParallel: true,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

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
  ],

  webServer: {
    command: 'pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 8080 --strictPort',
    url: 'http://127.0.0.1:8080/search/',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});