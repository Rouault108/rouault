import { test, expect } from '@playwright/test';

/**
 * Router E2E Tests（簡略版）
 * Routerインスタンスの基本機能のみをテスト
 */

/** window.router の型定義 */
interface WindowRouter {
	getCurrentPath(): string;
	getQuery(): Record<string, string>;
	getHistory(): string[];
	navigate(path: string): Promise<void>;
	on(event: string, callback: () => void): void;
	isNavigating(): boolean;
}

type WindowWithRouter = Window & typeof globalThis & { router?: WindowRouter };

test.describe('Router - Basic Functionality', () => {
	test.beforeEach(async ({ page }) => {
		// ルートページに移動
		await page.goto('/');

		// Routerが初期化されるまで待機
		await page.waitForSelector('main');
	});

	test('Router instance should be available', async ({ page }) => {
		//window.routerが存在することを確認
		const routerExists = await page.evaluate(() => {
			return typeof (window as WindowWithRouter).router !== 'undefined';
		});

		expect(routerExists).toBe(true);
	});

	test('should get current path', async ({ page }) => {
		const currentPath = await page.evaluate(() => {
			const router = (window as WindowWithRouter).router;
			return router?.getCurrentPath();
		});

		// 現在のパスは '/' であるべき
		expect(currentPath).toBe('/');
	});

	test('should extract query parameters from URL', async ({ page }) => {
		// クエリパラメータ付きでアクセス
		await page.goto('/?q=test&page=2');

		const query = await page.evaluate(() => {
			const router = (window as WindowWithRouter).router;
			return router?.getQuery() ?? {};
		});

		// クエリパラメータが正しく取得できることを確認
		expect(query.q).toBe('test');
		expect(query.page).toBe('2');
	});

	test('should navigate programmatically', async ({ page }) => {
		// プログラマティックにナビゲーション
		await page.evaluate(async () => {
			const router = (window as WindowWithRouter).router;
			await router?.navigate('/test-route');
		});

		// URLが変更されていることを確認（ページは404かもしれないが、URLは変わる）
		await expect(page).toHaveURL('/test-route');
	});

	test('should have navigation history', async ({ page }) => {
		const history = await page.evaluate(() => {
			const router = (window as WindowWithRouter).router;
			return router?.getHistory() ?? [];
		});

		// 初期ロード時、少なくとも1エントリ（'/'）が存在するべき
		expect(history.length).toBeGreaterThanOrEqual(1);
		expect(history).toContain('/');
	});

	test('should support event listeners', async ({ page }) => {
		// イベントリスナーをセットアップし、ナビゲーションイベントを確認
		const eventFired = await page.evaluate(async () => {
			return new Promise<boolean>((resolve) => {
				const router = (window as WindowWithRouter).router;
				let fired = false;

				router?.on('after:navigate', () => {
					fired = true;
				});

				// ナビゲーションを実行
				void router?.navigate('/test').then(() => {
					setTimeout(() => { resolve(fired); }, 100);
				});
			});
		});

		expect(eventFired).toBe(true);
	});

	test('should check if navigating', async ({ page }) => {
		const isNavigating = await page.evaluate(() => {
			const router = (window as WindowWithRouter).router;
			return router?.isNavigating();
		});

		// 初期状態ではナビゲーション中ではない
		expect(isNavigating).toBe(false);
	});
});

test.describe('Router - Accessibility', () => {
	test('should have aria-live region', async ({ page }) => {
		await page.goto('/');

		// aria-liveリージョンが存在することを確認
		const ariaLiveExists = await page.locator('[aria-live="polite"]').count();
		expect(ariaLiveExists).toBeGreaterThan(0);
	});
});
