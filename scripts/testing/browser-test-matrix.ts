export type BrowserTestBrowser = 'chromium' | 'firefox' | 'webkit';

const canonicalOrder: readonly BrowserTestBrowser[] = ['chromium', 'firefox', 'webkit'];

export interface WebkitBrowserTestShard {
  readonly name:
    | 'browser-webkit-general'
    | 'browser-webkit-url-state'
    | 'browser-webkit-navigation-state';
  readonly projectName:
    | 'browser-webkit-general-project'
    | 'browser-webkit-url-state-project'
    | 'browser-webkit-navigation-state-project';
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly fileParallelism: false;
  readonly groupOrder: number;
}

// WebKitのHistory API rate limitをtop-level sessionごとに分離する。
// History／URL stateを高頻度に変更するtestは、責務に応じて
// URL stateまたはNavigation stateへ明示的に分類する。
const webkitUrlStateTestFiles = [
  'test/browser/search-page-enhancer.browser.test.ts',
  'test/browser/tabs.browser.test.ts',
  'test/browser/url-hash.browser.test.ts',
] as const;

const webkitNavigationStateTestFiles = [
  'test/browser/layout-toc-controller.browser.test.ts',
  'test/browser/layout-toc-hydration.browser.test.ts',
  'test/browser/router-stale-fetch-artifact-fallback.browser.test.ts',
  'test/browser/toc-active-tracker.browser.test.ts',
  'test/browser/toc-navigation-controller.browser.test.ts',
] as const;

const webkitHistoryStateTestFiles = [
  ...webkitUrlStateTestFiles,
  ...webkitNavigationStateTestFiles,
] as const;

export const webkitBrowserTestShards = [
  {
    name: 'browser-webkit-general',
    projectName: 'browser-webkit-general-project',
    include: ['test/browser/**/*.test.ts'],
    exclude: webkitHistoryStateTestFiles,
    fileParallelism: false,
    // group 0のChromium／Firefox projectを先に完了させた後、
    // WebKit shardsを1→2→3の順で逐次実行する。
    groupOrder: 1,
  },
  {
    name: 'browser-webkit-url-state',
    projectName: 'browser-webkit-url-state-project',
    include: webkitUrlStateTestFiles,
    exclude: [],
    fileParallelism: false,
    groupOrder: 2,
  },
  {
    name: 'browser-webkit-navigation-state',
    projectName: 'browser-webkit-navigation-state-project',
    include: webkitNavigationStateTestFiles,
    exclude: [],
    fileParallelism: false,
    groupOrder: 3,
  },
] as const satisfies readonly WebkitBrowserTestShard[];

export function resolveBrowserTestBrowsers(
  value: string | undefined,
  isCi: boolean,
): readonly BrowserTestBrowser[] {
  const requested = new Set<BrowserTestBrowser>();

  if (value === undefined) {
    requested.add('chromium');
    requested.add('firefox');
  } else {
    const tokens = value
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);

    if (tokens.length === 0) {
      throw new TypeError('ROUAULT_BROWSER_TEST_BROWSERS must select at least one browser.');
    }

    for (const token of tokens) {
      if (token !== 'chromium' && token !== 'firefox' && token !== 'webkit') {
        throw new TypeError(`Unknown browser test target: ${token}`);
      }
      requested.add(token);
    }
  }

  if (isCi) {
    requested.add('webkit');
  }

  return canonicalOrder.filter((browser) => requested.has(browser));
}
