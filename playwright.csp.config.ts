import { defineConfig, devices } from '@playwright/test';

// 固定Playwrightの自動DOM採取を止め、失敗情報は専用fixture/reporterで最小化する。
process.env['PLAYWRIGHT_NO_COPY_PROMPT'] = '1';

// 通常E2Eと本番配信にpolicyを混ぜず、明示実行だけで使う隔離入口。
export default defineConfig({
  testDir: './test/e2e',
  testMatch: [
    'csp-report-only.ts',
    'csp-worker-diagnostics.ts',
    'csp-worker-observation.ts',
    'csp-privacy.ts',
    'csp-observer-faults.ts',
  ],
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [['./scripts/ci/csp-private-reporter.ts']],
  outputDir: '.generated/csp/private-run',
  preserveOutput: 'never',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'en-US',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'chromium-csp', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-csp', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-csp', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command:
      'pnpm run build:production && pnpm run generate:csp-stage1 && pnpm exec vite preview --config vite.csp-preview.config.ts --host 127.0.0.1 --port 4173 --strictPort',
    stdout: 'ignore',
    stderr: 'ignore',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ROUAULT_SITE_ORIGIN: 'http://127.0.0.1:4173',
      // CIの配信設定を継承せず、外部送信なしのroot fixtureへ固定する。
      ROUAULT_BASE_PATH: '',
      ROUAULT_MEDIA_BASE_URL: '',
      ROUAULT_MEMO_FIXTURES: '1',
      ROUAULT_BUILD_LABEL: 'csp stage1',
    },
  },
});
