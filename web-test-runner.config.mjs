import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

/** @type {import('@web/test-runner').TestRunnerConfig} */
export default {
  files: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  nodeResolve: {
exportConditions: ['browser', 'development'],
  },
plugins: [
    esbuildPlugin({
      ts: true,
      target: 'es2022', 
    }),
  ],
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    // playwrightLauncher({ product: 'firefox' }),
    // playwrightLauncher({ product: 'webkit' }),
  ],
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: '2000',
    },
  },
};
