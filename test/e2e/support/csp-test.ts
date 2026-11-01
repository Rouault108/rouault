import { test as base, expect } from '@playwright/test';

// assertionの生値・URL・DOMを標準の失敗artifactへ渡さない。
export const test = base.extend<{ cspPrivacy: undefined }>({
  cspPrivacy: [
    async ({ browserName }, use, info) => {
      void browserName;
      await use(undefined);
      info.errors.splice(
        0,
        info.errors.length,
        ...info.errors.map(() => ({ message: '[csp-test] failed' })),
      );
    },
    { auto: true },
  ],
});
export { expect };
