import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: './test/e2e',
	
	// テストのタイムアウト設定
	timeout: 30 * 1000,
	expect: {
		timeout: 5000,
	},

	// 並列実行設定
	fullyParallel: true,
	
	// CI環境での設定
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,

	// レポーター設定
	reporter: 'html',

	use: {
		// ベースURL（開発サーバー）
		baseURL: 'http://127.0.0.1:8080',

		// スクリーンショット・ビデオ設定
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},

	// プロジェクト設定（ブラウザ）
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
	],

	// 開発サーバー設定
	webServer: {
		command: 'pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 8080 --strictPort',
		url: 'http://127.0.0.1:8080/search/',
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
});
