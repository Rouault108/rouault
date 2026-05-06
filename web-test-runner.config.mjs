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

const config = {
  files: ['test/browser/**/*.test.ts'],
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
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
    playwrightLauncher({ product: 'webkit', concurrency: 1 }),
  ],
  browserStartTimeout: 90000,
  testsStartTimeout: 90000,
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: '4000',
    },
  },
  testRunnerHtml: testFramework => renderTestRunnerHtml(testFramework),
};

export default config;
