import { defineConfig, devices } from '@playwright/test';
process.env['PLAYWRIGHT_NO_COPY_PROMPT'] = '1';
export default defineConfig({
  testDir: '../fixtures',
  testMatch: 'csp-privacy.fixture.ts',
  workers: 1,
  retries: 0,
  reporter: [
    [
      '../../../scripts/ci/csp-private-reporter.ts',
      { outputFile: '.generated/csp/privacy-results.json' },
    ],
  ],
  outputDir: '../../../.generated/csp/privacy-proof',
  preserveOutput: 'always',
  use: { trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'chromium-csp', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-csp', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-csp', use: { ...devices['Desktop Safari'] } },
  ],
});
