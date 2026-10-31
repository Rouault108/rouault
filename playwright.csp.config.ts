import { defineConfig, devices } from '@playwright/test';

// 通常E2Eと本番配信にpolicyを混ぜず、明示実行だけで使う隔離入口。
export default defineConfig({
  testDir: './test/e2e',
  testMatch: 'csp-report-only.ts',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: '.generated/csp/browser-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [
    { name: 'chromium-csp', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-csp', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-csp', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command:
      'pnpm run build:production && pnpm run generate:csp-stage1 && pnpm exec vite preview --config vite.csp-preview.config.ts --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ROUAULT_SITE_ORIGIN: 'http://127.0.0.1:4173',
      ROUAULT_MEMO_FIXTURES: '1',
      ROUAULT_BUILD_LABEL: 'csp stage1',
    },
  },
});
