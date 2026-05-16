import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

const renderTestRunnerHtml = testFramework => `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <script>
      globalThis.litIssuedWarnings ??= new Set();
      globalThis.litIssuedWarnings.add('dev-mode');
    </script>
    <script type="module" src="${testFramework}"></script>
  </body>
</html>`;

const includeWebkit = process.env.CI === 'true' || process.env.ROUAULT_WTR_WEBKIT === '1';
const requestedBrowsers = new Set(
  (process.env.ROUAULT_WTR_BROWSERS ?? 'chromium,firefox')
    .split(',')
    .map(browser => browser.trim())
    .filter(Boolean),
);

const browserLaunchers = [
  ...(requestedBrowsers.has('chromium') ? [playwrightLauncher({ product: 'chromium' })] : []),
  ...(requestedBrowsers.has('firefox') ? [playwrightLauncher({ product: 'firefox' })] : []),
  ...(includeWebkit || requestedBrowsers.has('webkit')
    ? [playwrightLauncher({ product: 'webkit', concurrency: 1 })]
    : []),
];

const config = {
  files: ['test/browser/**/*.test.ts', '!test/browser/app-router.browser.test.ts'],
  nodeResolve: {
    exportConditions: ['browser', 'development'],
  },
  plugins: [
    esbuildPlugin({
      ts: true,
      target: 'es2022',
      tsconfig: './tsconfig.json',
    }),
  ],
  browsers: browserLaunchers,
  browserStartTimeout: 90000,
  testsStartTimeout: 90000,
  testsFinishTimeout: 900000,
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: 10000,
    },
  },
  testRunnerHtml: testFramework => renderTestRunnerHtml(testFramework),
};

export default config;
