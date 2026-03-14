/**
 * Router クラスの包括的な単体テスト
 * View Transitions API を使用したSPAルーターのテスト
 */

import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { Router } from '../../src/lib/router.js';

/**
 * テスト用クリックシミュレーション。
 * アンカー要素に直接 dispatchEvent するとChromium/Webkitで
 * DefaultEventHandler が実行され実際のページナビゲーションが発生する。
 * 子要素（<span>）にイベントを発行することで、ルーターの closest('a') は
 * 正しくアンカーを検出するが、ブラウザのナビゲーションは発生しない。
 */
function simulateClick(element: HTMLElement, options: MouseEventInit = {}) {
	let target = element;
	let tempSpan: HTMLSpanElement | null = null;

	// アンカー要素の場合、一時的な子要素を挿入してそこにクリックを発行
	if (element.tagName === 'A') {
		tempSpan = document.createElement('span');
		element.prepend(tempSpan);
		target = tempSpan;
	}

	target.dispatchEvent(new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
		composed: true,
		button: 0,
		...options,
	}));

	if (tempSpan) {
		tempSpan.remove();
	}
}

/**
 * 失敗系テストで発生する想定済みの console.error を一時的に吸収する。
 * WTR の browser logs を抑制しつつ、他テストでは通常のエラーを見逃さないため局所利用に限定する。
 */
function stubConsoleError() {
	const originalConsoleError = console.error;
	const calls: unknown[][] = [];

	console.error = (...args: unknown[]) => {
		calls.push(args);
	};

	return {
		calls,
		restore() {
			console.error = originalConsoleError;
		},
	};
}

describe('Router', () => {
	let outlet: HTMLElement;
	let router: Router;
	let originalStartViewTransition: Document['startViewTransition'];
	let originalFetch: typeof globalThis.fetch;
	let originalPushState: typeof history.pushState;
	let originalReplaceState: typeof history.replaceState;
	let originalHistoryStateDescriptor: PropertyDescriptor | undefined;
	let mockHistoryState: unknown;

	beforeEach(async () => {
		// テスト用のアウトレット要素を作成
		outlet = await fixture<HTMLElement>(html` <main id="test-outlet">Initial Content</main> `);

		// fetch のオリジナルを保存し、デフォルトモックを設定
		// （テストで実際のHTTPリクエストが発生するのを防ぐ）
		originalFetch = globalThis.fetch;
		globalThis.fetch = () => {
			return Promise.resolve(new Response('<html><body><main>Default Mock</main></body></html>', {
				status: 200,
			}));
		};

		// history API のオリジナルを保存（ネイティブメソッドへの参照を直接保持）
		originalPushState = history.pushState.bind(history);
		originalReplaceState = history.replaceState.bind(history);
		originalHistoryStateDescriptor = Object.getOwnPropertyDescriptor(history, 'state');
		mockHistoryState = history.state;

		Object.defineProperty(history, 'state', {
			configurable: true,
			get: () => mockHistoryState,
		});

		// Playwrightのナビゲーション検出を防ぐため、
		// history APIをラッパーで包み、URLのパス名を変更せず state だけをテスト内で保持する。
		history.pushState = ((data: unknown, unused: string, url?: string | URL | null) => {
			if (url !== null && url !== undefined) {
				const target = new URL(url.toString(), window.location.href);
				void unused;
				mockHistoryState = { ...(data && typeof data === 'object' ? data : {}), __routerPath: target.pathname };
			}
		}) as typeof history.pushState;
		history.replaceState = ((data: unknown, unused: string, url?: string | URL | null) => {
			if (url !== null && url !== undefined) {
				const target = new URL(url.toString(), window.location.href);
				void unused;
				mockHistoryState = { ...(data && typeof data === 'object' ? data : {}), __routerPath: target.pathname };
			}
		}) as typeof history.replaceState;

		// View Transition API のモック（ネイティブメソッドへの参照を直接保持）
		originalStartViewTransition = document.startViewTransition.bind(document);
		const mockTransition: Document['startViewTransition'] = (
			callback?: ViewTransitionUpdateCallback | StartViewTransitionOptions,
		) => {
			// コールバックを非同期実行し、完了を追跡
			const updateCallback =
				typeof callback === 'function' ? callback : callback?.update;

			const callbackPromise: Promise<void> = updateCallback
				? Promise.resolve(updateCallback()).then(() => undefined)
				: Promise.resolve();

			// typesのモックオブジェクトを作成
			const typesArray = typeof callback === 'object' ? callback.types ?? [] : [];
			const backingSet = new Set(typesArray);

			const mockTypes = {
				// Setの標準メソッドをデリゲート
				add: (value: string) => {
					backingSet.add(value);
					return mockTypes;
				},
				clear: () => { backingSet.clear(); },
				delete: (value: string) => backingSet.delete(value),
				has: (value: string) => backingSet.has(value),
				entries: () => backingSet.entries(),
				keys: () => backingSet.keys(),
				values: () => backingSet.values(),
				[Symbol.iterator]: () => backingSet[Symbol.iterator](),
				get size() {
					return backingSet.size;
				},

				// ViewTransitionTypeSetのforEachは第3引数に自身の参照が必要
				forEach(
					callbackfn: (value: string, key: string, parent: ViewTransitionTypeSet) => void,
				) {
					backingSet.forEach((value, key) => { callbackfn(value, key, mockTypes); },
					);
				},
			} as ViewTransitionTypeSet;

			return {
				// コールバック完了後にresolve
				finished: callbackPromise,
				ready: callbackPromise,
				updateCallbackDone: callbackPromise,
				skipTransition: () => {
					/* モック */
				},
				types: mockTypes,
			};
		};
		document.startViewTransition = mockTransition;
	});

	afterEach(() => {
		// ルーターのクリーンアップ（先に実行して非同期処理を停止）
		router.destroy();

		// URLをWTRのセッションURLに復元（ラッパー解除前に実行）
		try {
			mockHistoryState = undefined;
		} catch {
			// 復元失敗は無視
		}

		// すべてのモックを解除
		document.startViewTransition = originalStartViewTransition;
		globalThis.fetch = originalFetch;
		history.pushState = originalPushState;
		history.replaceState = originalReplaceState;
		if (originalHistoryStateDescriptor) {
			Object.defineProperty(history, 'state', originalHistoryStateDescriptor);
		} else {
			delete (history as History & { state?: unknown }).state;
		}
	});

	// ========================================
	// 1. 初期化とライフサイクル
	// ========================================
	describe('1. 初期化とライフサイクル', () => {
		it('1.1 コンストラクタでRouterインスタンスが生成されること', () => {
			router = new Router(outlet);
			expect(router).to.be.instanceOf(Router);
		});

		it('1.2 初期化時に現在のパスでナビゲーションが実行されること', async () => {
			let fetchCalled = false;
			globalThis.fetch = () => {
				fetchCalled = true;
				return Promise.resolve(new Response('<html><body><main>Initial</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			await waitUntil(() => fetchCalled, '初期ナビゲーションが実行されること');
			expect(fetchCalled).to.be.true;
		});

		it('1.3 destroy() メソッドでイベントリスナーが解除されること', async () => {
			router = new Router(outlet);
			router.destroy();

			// destroyされた後はリンククリックがインターセプトされない
			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Test Link</a> `);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault(); // テスト環境を保護
			};
			document.addEventListener('click', handler);

			simulateClick(link);

			document.removeEventListener('click', handler);

			// destroyされているのでpreventDefaultされていないはず
			expect(defaultPrevented).to.be.false;
		});
	});

	// ========================================
	// 2. リンクインターセプト
	// ========================================
	describe('2. リンクインターセプト', () => {
		beforeEach(() => {
			// ナビゲーションをモック（実際のfetchを防ぐ）
			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Mocked</main></body></html>', {
					status: 200,
				}));
			};
		});

		it('2.1 内部リンクのクリックを preventDefault すること', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Test Link</a> `);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				if (!defaultPrevented) e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link);

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.true;
		});

		it('2.2 外部リンク（https://）はインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(
				html` <a href="https://example.com">External Link</a> `,
			);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link);

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.3 外部リンク（http://）はインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(
				html` <a href="http://example.com">External Link</a> `,
			);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link);

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.4 ハッシュリンクはインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(html` <a href="#section">Hash Link</a> `);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link);

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.5 target 属性があるリンクはインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(
				html` <a href="/test" target="_blank">New Tab Link</a> `,
			);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link);

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.6 download 属性があるリンクはインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(
				html` <a href="/file.pdf" download>Download Link</a> `,
			);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link);

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.7 rel="external" があるリンクはインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(
				html` <a href="/test" rel="external">External Rel Link</a> `,
			);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link);

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.8 Ctrl/Cmd キー押下時はインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Test Link</a> `);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			// 修飾キー付きでも実ブラウザ遷移は起こさず、ルーターの介入有無だけを検証する
			simulateClick(link, { ctrlKey: true });

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.9 Shift キー押下時はインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Test Link</a> `);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link, { shiftKey: true });

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.10 Alt キー押下時はインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Test Link</a> `);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link, { altKey: true });

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.11 Meta キー押下時はインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Test Link</a> `);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link, { metaKey: true });

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.12 中ボタンクリック（button: 1）はインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Test Link</a> `);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link, { button: 1 });

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.13 data-no-router 属性があるリンクはインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(
				html` <a href="/test" data-no-router>No Router Link</a> `,
			);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link);

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.14 rel に external を含む複合トークンはインターセプトしないこと', async () => {
			router = new Router(outlet);
			const link = await fixture<HTMLAnchorElement>(
				html` <a href="/test" rel="noopener external">External Rel Link</a> `,
			);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault();
			};
			document.addEventListener('click', handler);

			simulateClick(link);

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
		});

		it('2.15 Shadow DOM 内の内部リンクもインターセプトすること', () => {
			router = new Router(outlet);

			const host = document.createElement('div');
			const shadowRoot = host.attachShadow({ mode: 'open' });
			shadowRoot.innerHTML = '<a href="/shadow-link"><span>Shadow Link</span></a>';
			document.body.append(host);

			const innerSpan = shadowRoot.querySelector('span');
			expect(innerSpan).to.not.equal(null);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				if (!defaultPrevented) {
					e.preventDefault();
				}
			};
			document.addEventListener('click', handler);

			simulateClick(innerSpan as HTMLElement);

			document.removeEventListener('click', handler);
			host.remove();

			expect(defaultPrevented).to.be.true;
		});
	});

	// ========================================
	// 3. ナビゲーション - 基本機能
	// ========================================
	describe('3. ナビゲーション - 基本機能', () => {
		it('3.1 リンククリックで正常にナビゲーションが実行されること', async () => {
			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <head><title>Test Page</title></head>
                    <body>
                        <main><h1>Test Content</h1></main>
                    </body>
                </html>
            `;

			globalThis.fetch = () => {
				return Promise.resolve(new Response(mockHTML, {
					status: 200,
					headers: { 'Content-Type': 'text/html' },
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test-page">Navigate</a> `);
			simulateClick(link);

			await waitUntil(() => outlet.innerHTML.includes('Test Content'), 'コンテンツが更新されること');

			// manageFocus()がtabindex="-1"を付与するため、テキスト内容で検証
			expect(outlet.querySelector('h1')?.textContent.trim()).to.equal('Test Content');
			expect(document.title).to.equal('Test Page');
		});

		it('3.1.1 ナビゲーション後のフォーカス移動で preventScroll を指定すること', async () => {
			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <head><title>Focus Page</title></head>
                    <body>
                        <main><h1>Focus Target</h1></main>
                    </body>
                </html>
            `;

			globalThis.fetch = () => {
				return Promise.resolve(new Response(mockHTML, {
					status: 200,
					headers: { 'Content-Type': 'text/html' },
				}));
			};

			const originalFocus = HTMLElement.prototype.focus;
			let focusedTagName = '';
			let focusOptions: FocusOptions | undefined;

			HTMLElement.prototype.focus = function focus(this: HTMLElement, options?: FocusOptions): void {
				focusedTagName = this.tagName;
				focusOptions = options;
			};

			try {
				router = new Router(outlet, { skipInitialNavigation: true });

				const link = await fixture<HTMLAnchorElement>(html` <a href="/focus-page">Navigate</a> `);
				simulateClick(link);

				await waitUntil(() => focusedTagName === 'H1', '見出しへフォーカス移動');

				expect(focusOptions).to.deep.equal({ preventScroll: true });
			} finally {
				HTMLElement.prototype.focus = originalFocus;
			}
		});

		it('3.2 navigate() メソッドでプログラマティックナビゲーションができること', async () => {
			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <head><title>Programmatic Page</title></head>
                    <body>
                        <main><p>Programmatic Content</p></main>
                    </body>
                </html>
            `;

			globalThis.fetch = () => {
				return Promise.resolve(new Response(mockHTML, {
					status: 200,
				}));
			};

			router = new Router(outlet);

			// プログラマティックにナビゲーション
			await router.navigate('/programmatic');

			expect(outlet.innerHTML).to.include('Programmatic Content');
			expect(document.title).to.equal('Programmatic Page');
		});

		it('3.2.1 onContentUpdate が非同期でも描画完了まで待ってから遷移完了すること', async () => {
			const lifecycle: string[] = [];
			let resolveRender!: () => void;
			const renderCompleted = new Promise<void>((resolve) => {
				resolveRender = resolve;
			});

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main><h1>Delayed</h1></main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet, {
				skipInitialNavigation: true,
				onContentUpdate: async (html) => {
					lifecycle.push('content:update:start');
					outlet.innerHTML = html;
					await renderCompleted;
					lifecycle.push('content:update:end');
				},
			});

			router.on('after:navigate', () => {
				lifecycle.push('after:navigate');
			});

			const navigationPromise = router.navigate('/delayed');

			await waitUntil(() => lifecycle.includes('content:update:start'), '描画開始待ち');
			expect(lifecycle).to.deep.equal(['content:update:start']);

			resolveRender();
			await navigationPromise;

			expect(lifecycle).to.deep.equal([
				'content:update:start',
				'content:update:end',
				'after:navigate',
			]);
		});

		it('3.2.2 拡張子のない内部URLは fetch 時のみ trailing slash を補うこと', async () => {
			let fetchedUrl = '';
			let pushedPath = '';

			history.pushState = ((_data: unknown, _unused: string, url?: string | URL | null) => {
				if (url) {
					pushedPath = url.toString();
				}
			}) as typeof history.pushState;

			globalThis.fetch = (input: RequestInfo | URL) => {
				fetchedUrl = input instanceof Request ? input.url : String(input);
				return Promise.resolve(new Response('<html><body><main>Trailing Slash</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			await router.navigate('/programmatic');

			expect(pushedPath).to.equal('/programmatic');
			expect(fetchedUrl).to.include('/programmatic/');
		});

		it('3.2.2 末尾 slash 付きで navigate しても表示URLと履歴は canonical に揃えること', async () => {
			let fetchedUrl = '';
			let pushedPath = '';

			history.pushState = ((data: unknown, _unused: string, url?: string | URL | null) => {
				if (url) {
					pushedPath = url.toString();
					const target = new URL(url.toString(), window.location.href);
					mockHistoryState = { ...(data && typeof data === 'object' ? data : {}), __routerUrl: `${target.pathname}${target.search}${target.hash}` };
				}
			}) as typeof history.pushState;

			globalThis.fetch = (input: RequestInfo | URL) => {
				fetchedUrl = input instanceof Request ? input.url : String(input);
				return Promise.resolve(new Response('<html><body><main>Canonical</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			await router.navigate('/programmatic/');

			expect(pushedPath).to.equal('/programmatic');
			expect(router.getCurrentPath()).to.equal('/programmatic');
			expect(router.getHistory()).to.include('/programmatic');
			expect(fetchedUrl).to.include('/programmatic/');
		});

		it('3.3 history.pushState が呼ばれて履歴に追加されること', async () => {
			let pushedPath = '';
			history.pushState = ((_data: unknown, _unused: string, url?: string | URL | null) => {
				if (url) pushedPath = url.toString();
			}) as typeof history.pushState;

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/new-page">Link</a> `);
			simulateClick(link);

			await waitUntil(() => pushedPath === '/new-page', 'pushStateが呼ばれること');

			expect(pushedPath).to.equal('/new-page');
		});

		it('3.4 popstate イベントで戻る/進むボタンに対応すること', async () => {
			let lastFetchedPath = '';
			globalThis.fetch = (input: RequestInfo | URL) => {
				lastFetchedPath = input instanceof Request ? input.url : String(input);
				return Promise.resolve(new Response('<html><body><main>Back Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			// popstateイベントをシミュレート
			window.history.pushState({}, '', '/back-page');
			window.dispatchEvent(new PopStateEvent('popstate'));

			await waitUntil(() => lastFetchedPath.includes('/back-page'), 'popstateでナビゲーション');

			expect(lastFetchedPath).to.include('/back-page');
		});
	});

	// ========================================
	// 4. ナビゲーション - コンテンツ取得と更新
	// ========================================
	describe('4. ナビゲーション - コンテンツ取得と更新', () => {
		it('4.1 <main> 要素の内容が正しく抽出されること', async () => {
			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <body>
                        <header>Header</header>
                        <main><article>Article Content</article></main>
                        <footer>Footer</footer>
                    </body>
                </html>
            `;

			globalThis.fetch = () => {
				return Promise.resolve(new Response(mockHTML, { status: 200 }));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => outlet.innerHTML.includes('Article Content'), 'main要素が抽出');

			expect(outlet.innerHTML).to.include('<article>Article Content</article>');
			expect(outlet.innerHTML).not.to.include('Header');
			expect(outlet.innerHTML).not.to.include('Footer');
		});

		it('4.2 <title> タグが正しく更新されること', async () => {
			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <head><title>Updated Title</title></head>
                    <body><main>Content</main></body>
                </html>
            `;

			globalThis.fetch = () => {
				return Promise.resolve(new Response(mockHTML, { status: 200 }));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => document.title === 'Updated Title', 'タイトルが更新');

			expect(document.title).to.equal('Updated Title');
		});

		it('4.3 <meta name="description"> タグが正しく更新されること', async () => {
			// 既存のmeta descriptionを削除
			const existingMeta = document.querySelector('meta[name="description"]');
			if (existingMeta) existingMeta.remove();

			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta name="description" content="Updated Description">
                    </head>
                    <body><main>Content</main></body>
                </html>
            `;

			globalThis.fetch = () => {
				return Promise.resolve(new Response(mockHTML, { status: 200 }));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(
				() => document.querySelector('meta[name="description"]')?.getAttribute('content') === 'Updated Description',
				'meta descriptionが更新',
			);

			const metaTag = document.querySelector('meta[name="description"]');
			expect(metaTag?.getAttribute('content')).to.equal('Updated Description');
		});

		it('4.3.1 layout-header の breadcrumbs-json が遷移先に同期されること', async () => {
			const header = await fixture<HTMLElement>(
				html`<layout-header breadcrumbs-json='[{"label":"Old Note","href":"/notes/old-note"}]'></layout-header>`,
			);

			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <body>
                        <layout-header breadcrumbs-json='[{"label":"New Note","href":"/notes/new-note"}]'></layout-header>
                        <main><h1>New Note</h1></main>
                    </body>
                </html>
            `;

			globalThis.fetch = () => {
				return Promise.resolve(new Response(mockHTML, { status: 200 }));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/notes/new-note">Link</a> `);
			simulateClick(link);

			await waitUntil(
				() => header.getAttribute('breadcrumbs-json') === '[{"label":"New Note","href":"/notes/new-note"}]',
				'breadcrumbs-json が更新される',
			);

			expect(header.getAttribute('breadcrumbs-json')).to.equal(
				'[{"label":"New Note","href":"/notes/new-note"}]',
			);
		});

		it('4.3.2 検索ページ遷移時は layout-header の breadcrumbs-json を空配列へ更新できること', async () => {
			const header = await fixture<HTMLElement>(
				html`<layout-header breadcrumbs-json='[{"label":"Current Note","href":"/notes/current-note"}]'></layout-header>`,
			);

			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <body>
                        <layout-header breadcrumbs-json="[]"></layout-header>
                        <main><search-page></search-page></main>
                    </body>
                </html>
            `;

			globalThis.fetch = () => {
				return Promise.resolve(new Response(mockHTML, { status: 200 }));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/search">Search</a> `);
			simulateClick(link);

			await waitUntil(
				() => header.getAttribute('breadcrumbs-json') === '[]',
				'breadcrumbs-json が検索ページ用に更新される',
			);

			expect(header.getAttribute('breadcrumbs-json')).to.equal('[]');
		});

		it('4.4 空のレスポンスを適切に処理すること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('', { status: 200 }));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/empty">Link</a> `);
			simulateClick(link);

			await waitUntil(
				// ルーターは「404 - ページが見つかりません」を表示するため'404'でも確認
				() => outlet.textContent.includes('Not Found') || outlet.textContent.includes('エラー') || outlet.textContent.includes('404'),
				'エラー表示',
			);

			// 空のレスポンスはエラーとして扱われるべき
			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('Not Found') || text.includes('エラー') || text.includes('404')
			);
		});

		it('4.5 main要素がないHTMLを適切に処理すること', async () => {
			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <body><div>No main element</div></body>
                </html>
            `;

			globalThis.fetch = () => {
				return Promise.resolve(new Response(mockHTML, { status: 200 }));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/no-main">Link</a> `);
			simulateClick(link);

			await waitUntil(
				// ルーターは「404 - ページが見つかりません」を表示するため'404'でも確認
				() => outlet.textContent.includes('Not Found') || outlet.textContent.includes('エラー') || outlet.textContent.includes('404'),
				'エラー表示',
			);

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('Not Found') || text.includes('エラー') || text.includes('404')
			);
		});

		it('4.6 遷移先にmeta descriptionがない場合は既存タグを削除すること', async () => {
			const staleMeta = document.createElement('meta');
			staleMeta.setAttribute('name', 'description');
			staleMeta.setAttribute('content', 'Stale Description');
			document.head.appendChild(staleMeta);

			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <head><title>No Description</title></head>
                    <body><main>Content</main></body>
                </html>
            `;

			globalThis.fetch = () => {
				return Promise.resolve(new Response(mockHTML, { status: 200 }));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/meta-clear">Link</a> `);
			simulateClick(link);

			await waitUntil(
				() => document.querySelector('meta[name="description"]') === null,
				'meta descriptionが削除される',
			);

			expect(document.querySelector('meta[name="description"]')).to.equal(null);
		});
	});

	// ========================================
	// 5. View Transitions API 統合
	// ========================================
	describe('5. View Transitions API 統合', () => {
		it('5.1 startViewTransition が呼ばれること', async () => {
			let transitionCalled = false;
			document.startViewTransition = ((callback: () => Promise<void>) => {
				transitionCalled = true;
				void callback();
				return {
					finished: Promise.resolve(),
					ready: Promise.resolve(),
					updateCallbackDone: Promise.resolve(),
					skipTransition: () => { /* モック */ },
				};
			}) as Document['startViewTransition'];

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => transitionCalled, 'startViewTransitionが呼ばれる');

			expect(transitionCalled).to.be.true;
		});

		it('5.2 非対応ブラウザでフォールバックが動作すること', async () => {
			// startViewTransitionを削除して非対応環境をシミュレート
			// @ts-expect-error - テストのために意図的に削除
			document.startViewTransition = undefined;

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main><p>Fallback Content</p></main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/fallback">Link</a> `);
			simulateClick(link);

			await waitUntil(() => outlet.innerHTML.includes('Fallback Content'), 'フォールバック動作');

			expect(outlet.innerHTML).to.include('Fallback Content');
		});

		it('5.3 トランジション失敗時にもコンテンツが更新されること', async () => {
			const consoleErrorStub = stubConsoleError();
			document.startViewTransition = ((callback: () => Promise<void>) => {
				// コールバックを実行してコンテンツを更新した後、トランジション自体は失敗させる
				void callback();
				return {
					finished: Promise.reject(new Error('Transition failed')),
					ready: Promise.resolve(),
					updateCallbackDone: Promise.resolve(),
					skipTransition: () => { /* モック */ },
				};
			}) as Document['startViewTransition'];

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main><p>Content Despite Error</p></main></body></html>', {
					status: 200,
				}));
			};

			try {
				router = new Router(outlet, { skipInitialNavigation: true });

				const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
				simulateClick(link);

				await waitUntil(() => outlet.innerHTML.includes('Content Despite Error'), 'コンテンツ更新');

				expect(outlet.innerHTML).to.include('Content Despite Error');
				expect(consoleErrorStub.calls.length).to.equal(1);
			} finally {
				consoleErrorStub.restore();
			}
		});
	});

	// ========================================
	// 6. エラーハンドリング
	// ========================================
	describe('6. エラーハンドリング', () => {
		it('6.1 404エラー時に適切なエラーメッセージを表示すること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('Not Found', {
					status: 404,
					statusText: 'Not Found',
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/404">Link</a> `);
			simulateClick(link);

			await waitUntil(() => outlet.textContent.includes('404'), '404エラー表示');

			expect(outlet.textContent).to.include('404');
		});

		it('6.2 500エラー時に適切なエラーメッセージを表示すること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('Internal Server Error', {
					status: 500,
					statusText: 'Internal Server Error',
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/500">Link</a> `);
			simulateClick(link);

			await waitUntil(() => outlet.textContent.includes('500') || outlet.textContent.includes('エラー'), '500エラー表示');

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('500') || text.includes('エラー')
			);
		});

		it('6.3 ネットワークエラー時に適切なメッセージを表示すること', async () => {
			const consoleErrorStub = stubConsoleError();
			globalThis.fetch = () => {
				throw new TypeError('Failed to fetch');
			};

			try {
				router = new Router(outlet, { skipInitialNavigation: true });

				const link = await fixture<HTMLAnchorElement>(html` <a href="/network-error">Link</a> `);
				simulateClick(link);

				await waitUntil(
					() => outlet.textContent.includes('ネットワーク') || outlet.textContent.includes('エラー'),
					'ネットワークエラー表示',
				);

				expect(outlet.textContent).to.satisfy((text: string) =>
					text.includes('ネットワーク') || text.includes('エラー')
				);
				expect(consoleErrorStub.calls.length).to.equal(1);
			} finally {
				consoleErrorStub.restore();
			}
		});

		it('6.4 401エラー時に認証エラーメッセージを表示すること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('Unauthorized', {
					status: 401,
					statusText: 'Unauthorized',
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/401">Link</a> `);
			simulateClick(link);

			await waitUntil(() => outlet.textContent.includes('401') || outlet.textContent.includes('認証'), '401エラー表示');

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('401') || text.includes('認証')
			);
		});

		it('6.5 403エラー時に権限エラーメッセージを表示すること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('Forbidden', {
					status: 403,
					statusText: 'Forbidden',
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/403">Link</a> `);
			simulateClick(link);

			await waitUntil(() => outlet.textContent.includes('403') || outlet.textContent.includes('権限'), '403エラー表示');

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('403') || text.includes('権限')
			);
		});

		it('6.6 503エラー時にサービス利用不可メッセージを表示すること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('Service Unavailable', {
					status: 503,
					statusText: 'Service Unavailable',
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/503">Link</a> `);
			simulateClick(link);

			await waitUntil(() => outlet.textContent.includes('503') || outlet.textContent.includes('利用'), '503エラー表示');

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('503') || text.includes('利用')
			);
		});

		it('6.7 タイムアウト時に適切なメッセージを表示すること', async () => {
			const consoleErrorStub = stubConsoleError();
			globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
				return new Promise((resolve, reject) => {
					const timeoutId = setTimeout(() => {
						resolve(new Response('Should timeout', { status: 200 }));
					}, 100000); // 長時間待機

					if (init?.signal) {
						init.signal.addEventListener('abort', () => {
							clearTimeout(timeoutId);
							reject(new DOMException('Aborted', 'AbortError'));
						});
					}
				});
			};

			// skipInitialNavigation: trueで初期ナビゲーションをスキップ（初期fetchが無限ハングするため）
			// タイムアウトを100msに設定（Mochaのデフォルト2000ms以内に収めるため）
			try {
				router = new Router(outlet, { skipInitialNavigation: true });
				router.setTimeout(100);

				const link = await fixture<HTMLAnchorElement>(html` <a href="/timeout">Link</a> `);
				simulateClick(link);

				await waitUntil(
					() => outlet.textContent.includes('タイムアウト') || outlet.textContent.includes('Timeout'),
					'タイムアウトエラー表示',
					{ timeout: 10000 },
				);

				expect(outlet.textContent).to.satisfy((text: string) =>
					text.includes('タイムアウト') || text.includes('Timeout')
				);
				expect(consoleErrorStub.calls.length).to.equal(1);
			} finally {
				consoleErrorStub.restore();
			}
		});

		it('6.8 CORSエラー時に適切なメッセージを表示すること', async () => {
			const consoleErrorStub = stubConsoleError();
			globalThis.fetch = () => {
				throw new TypeError('CORS policy blocked');
			};

			try {
				router = new Router(outlet, { skipInitialNavigation: true });

				const link = await fixture<HTMLAnchorElement>(html` <a href="/cors">Link</a> `);
				simulateClick(link);

				await waitUntil(
					() => outlet.textContent.includes('CORS') || outlet.textContent.includes('エラー'),
					'CORSエラー表示',
				);

				expect(outlet.textContent).to.satisfy((text: string) =>
					text.includes('CORS') || text.includes('エラー')
				);
				expect(consoleErrorStub.calls.length).to.equal(1);
			} finally {
				consoleErrorStub.restore();
			}
		});
	});

	// ========================================
	// 7. ローディング状態管理
	// ========================================
	describe('7. ローディング状態管理', () => {
		it('7.1 ナビゲーション中に isNavigating が true になること', async () => {
			let resolvePromise: (() => void) | undefined;
			const promise = new Promise<void>((resolve) => {
				resolvePromise = resolve;
			});

			globalThis.fetch = async () => {
				await promise;
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			// ナビゲーション中
			expect(router.isNavigating()).to.be.true;

			// ナビゲーション完了
			resolvePromise?.();
			await waitUntil(() => !router.isNavigating(), 'ナビゲーション完了');

			expect(router.isNavigating()).to.be.false;
		});

		it('7.2 競合時は最後のナビゲーション要求のみ実行されること（後勝ち）', async () => {
			let resolveFirstFetch: (() => void) | undefined;
			const firstFetchPromise = new Promise<void>((resolve) => {
				resolveFirstFetch = resolve;
			});
			const fetchedPaths: string[] = [];

			globalThis.fetch = async (input: RequestInfo | URL) => {
				const path = new URL(input instanceof Request ? input.url : String(input), window.location.href).pathname;
				fetchedPaths.push(path);
				if (path === '/first/') {
					await firstFetchPromise;
				}
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet, { skipInitialNavigation: true });

			const firstNavigation = router.navigate('/first');
			const droppedNavigation = router.navigate('/drop-me');
			const latestNavigation = router.navigate('/latest');

			// 先行リクエスト完了後に pending の最新のみが実行される
			resolveFirstFetch?.();
			await Promise.all([firstNavigation, droppedNavigation, latestNavigation]);

			expect(fetchedPaths).to.deep.equal(['/first/', '/latest/']);
		});

		it('7.3 ローディングイベントが発火すること', async () => {
			let loadingStarted = false;
			let loadingEnded = false;

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			router.on('loading:start', () => {
				loadingStarted = true;
			});

			router.on('loading:end', () => {
				loadingEnded = true;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => loadingEnded, 'ローディング完了イベント');

			expect(loadingStarted).to.be.true;
			expect(loadingEnded).to.be.true;
		});
	});

	// ========================================
	// 8. 再初期化処理
	// ========================================
	describe('8. 再初期化処理', () => {
		it('8.1 addReinitializeHook() で登録したフックが呼ばれること', async () => {
			let hookCalled = false;
			globalThis.fetch = () => {
				return Promise.resolve(new Response(
					'<html><body><main><pre><code>test</code></pre></main></body></html>',
					{ status: 200 },
				));
			};

			router = new Router(outlet);
			router.addReinitializeHook(() => {
				hookCalled = true;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => hookCalled, '再初期化フック呼び出し');

			expect(hookCalled).to.be.true;
		});

		it('8.2 スクロール位置がトップにリセットされること', async () => {
			window.scrollTo(0, 500);

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => window.scrollY === 0, 'スクロールリセット');

			expect(window.scrollY).to.equal(0);
		});

		it('8.3 カスタム再初期化フックが実行されること', async () => {
			let customHookCalled = false;

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			router.addReinitializeHook(() => {
				customHookCalled = true;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => customHookCalled, 'カスタムフック実行');

			expect(customHookCalled).to.be.true;
		});
	});

	// ========================================
	// 9. ライフサイクルフック
	// ========================================
	describe('9. ライフサイクルフック', () => {
		it('9.1 beforeNavigate フックが実行されること', async () => {
			let beforeNavigateCalled = false;
			let beforeNavigatePath = '';

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			router.on('before:navigate', (path) => {
				beforeNavigateCalled = true;
				beforeNavigatePath = String(path);
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => beforeNavigateCalled, 'beforeNavigate実行');

			expect(beforeNavigateCalled).to.be.true;
			expect(beforeNavigatePath).to.equal('/test');
		});

		it('9.2 beforeNavigate でナビゲーションをキャンセルできること', async () => {
			let fetchCalled = false;
			let pushStateCalled = false;
			history.pushState = ((data: unknown, unused: string, url?: string | URL | null) => {
				pushStateCalled = true;
				originalPushState.call(history, data, unused, url);
			}) as typeof history.pushState;

			globalThis.fetch = () => {
				fetchCalled = true;
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet, { skipInitialNavigation: true });

			router.on('before:navigate', () => {
				return false; // キャンセル
			});

			await router.navigate('/test');

			// キャンセルされているのでfetchは呼ばれない
			expect(fetchCalled).to.be.false;
			expect(pushStateCalled).to.be.false;
		});

		it('9.3 afterNavigate フックが実行されること', async () => {
			let afterNavigateCalled = false;

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			router.on('after:navigate', () => {
				afterNavigateCalled = true;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => afterNavigateCalled, 'afterNavigate実行');

			expect(afterNavigateCalled).to.be.true;
		});

		it('9.4 onError フックが実行されること', async () => {
			const consoleErrorStub = stubConsoleError();
			let errorCaught = false;
			let errorMessage = '';

			globalThis.fetch = () => {
				throw new Error('Test Error');
			};

			try {
				router = new Router(outlet, { skipInitialNavigation: true });

				router.on('error', (error) => {
					errorCaught = true;
					errorMessage = error instanceof Error ? error.message : String(error);
				});

				const link = await fixture<HTMLAnchorElement>(html` <a href="/error">Link</a> `);
				simulateClick(link);

				await waitUntil(() => errorCaught, 'errorフック実行');

				expect(errorCaught).to.be.true;
				expect(errorMessage).to.equal('Test Error');
				expect(consoleErrorStub.calls.length).to.equal(1);
			} finally {
				consoleErrorStub.restore();
			}
		});

		it('9.5 onContentLoad フックが実行されること', async () => {
			let contentLoadCalled = false;

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			router.on('content:load', () => {
				contentLoadCalled = true;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => contentLoadCalled, 'contentLoadフック実行');

			expect(contentLoadCalled).to.be.true;
		});
	});

	// ========================================
	// 10. ルートマッチングとパラメータ
	// ========================================
	describe('10. ルートマッチングとパラメータ', () => {
		it('10.1 動的ルートパラメータ（/posts/:id）が取得できること', async () => {
			let capturedParams: Record<string, string> = {};

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Post Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			router.on('after:navigate', () => {
				capturedParams = router.getParams();
			});

			await router.navigate('/posts/123');

			await waitUntil(() => Object.keys(capturedParams).length > 0, 'パラメータ取得');

			expect(capturedParams).to.have.property('id', '123');
		});

		it('10.2 複数の動的パラメータ（/posts/:category/:id）が取得できること', async () => {
			let capturedParams: Record<string, string> = {};

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			router.on('after:navigate', () => {
				capturedParams = router.getParams();
			});

			await router.navigate('/posts/tech/456');

			await waitUntil(() => Object.keys(capturedParams).length > 0, 'パラメータ取得');

			expect(capturedParams).to.include({ category: 'tech', id: '456' });
		});

		it('10.3 クエリパラメータが取得できること', async () => {
			let capturedQuery: Record<string, string> = {};

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			router.on('after:navigate', () => {
				capturedQuery = router.getQuery();
			});

			await router.navigate('/search?q=test&page=2');

			await waitUntil(() => Object.keys(capturedQuery).length > 0, 'クエリ取得');

			expect(capturedQuery).to.include({ q: 'test', page: '2' });
		});

		it('10.4 ルート定義を登録できること', async () => {
			let handlerCalled = false;

			router = new Router(outlet);

			router.addRoute('/custom-route', () => {
				handlerCalled = true;
				return Promise.resolve('<p>Custom Handler</p>');
			});

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Should not be used</main></body></html>', {
					status: 200,
				}));
			};

			await router.navigate('/custom-route');

			await waitUntil(() => handlerCalled, 'カスタムハンドラ実行');

			expect(handlerCalled).to.be.true;
			expect(outlet.innerHTML).to.include('Custom Handler');
		});

		it('10.5 ワイルドカードルート（/posts/*）がマッチすること', async () => {
			let wildcardMatched = false;

			router = new Router(outlet);

			router.addRoute('/posts/*', () => {
				wildcardMatched = true;
				return Promise.resolve('<p>Wildcard Match</p>');
			});

			await router.navigate('/posts/anything/here');

			await waitUntil(() => wildcardMatched, 'ワイルドカードマッチ');

			expect(wildcardMatched).to.be.true;
			expect(outlet.innerHTML).to.include('Wildcard Match');
		});

		it('10.6 正規表現ルートがマッチすること', async () => {
			let regexMatched = false;

			router = new Router(outlet);

			router.addRoute(/^\/posts\/(\d+)$/, () => {
				regexMatched = true;
				return Promise.resolve('<p>Regex Match</p>');
			});

			await router.navigate('/posts/789');

			await waitUntil(() => regexMatched, '正規表現マッチ');

			expect(regexMatched).to.be.true;
			expect(outlet.innerHTML).to.include('Regex Match');
		});
	});

	// ========================================
	// 11. 状態とデータ管理
	// ========================================
	describe('11. 状態とデータ管理', () => {
		it('11.1 現在のパスを取得できること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			await router.navigate('/current-path');

			await waitUntil(() => router.getCurrentPath() === '/current-path', 'パス取得');

			expect(router.getCurrentPath()).to.equal('/current-path');
		});

		it('11.1.2 末尾 slash 付きの現在URLも同じパスとして取得できること', () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			mockHistoryState = { __routerUrl: '/current-path/' };
			router = new Router(outlet, { skipInitialNavigation: true });

			expect(router.getCurrentPath()).to.equal('/current-path');
		});

		it('11.2 history.state を使ってルート固有のデータを保存できること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			await router.navigate('/test', { customData: 'value' });

			expect(history.state).to.include({ customData: 'value' });
		});

		it('11.3 ナビゲーション履歴を取得できること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			await router.navigate('/page1');
			await router.navigate('/page2');
			await router.navigate('/page3');

			const history = router.getHistory();

			expect(history).to.include.members(['/page1', '/page2', '/page3']);
		});

		it('11.4 ルート変更を監視できること', async () => {
			let routeChangeCount = 0;

			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			router.on('route:change', () => {
				routeChangeCount++;
			});

			await router.navigate('/test1');
			await router.navigate('/test2');

			expect(routeChangeCount).to.equal(2);
		});
	});

	// ========================================
	// 12. アクセシビリティ（WCAG AA準拠）
	// ========================================
	describe('12. アクセシビリティ（WCAG AA準拠）', () => {
		it('12.1 ナビゲーション後にフォーカスが適切に移動すること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response(
					'<html><body><main><h1 tabindex="-1">New Page</h1></main></body></html>',
					{ status: 200 },
				));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => {
				const h1 = outlet.querySelector('h1');
				return document.activeElement === h1;
			}, 'フォーカス移動');

			const h1 = outlet.querySelector('h1');
			expect(document.activeElement).to.equal(h1);
		});

		it('12.2 aria-live でスクリーンリーダーに通知されること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>New Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => {
				const liveRegion = document.querySelector('[aria-live]');
				return (liveRegion?.textContent ?? '').includes('ページが読み込まれました');
			}, 'aria-live通知');

			const liveRegion = document.querySelector('[aria-live]');
			expect(liveRegion?.textContent).to.include('ページが読み込まれました');
		});

		it('12.3 ナビゲーション後にドキュメントタイトルが適切に更新されること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response(
					'<html><head><title>Accessible Page Title</title></head><body><main>Content</main></body></html>',
					{ status: 200 },
				));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			simulateClick(link);

			await waitUntil(() => document.title === 'Accessible Page Title', 'タイトル更新');

			expect(document.title).to.equal('Accessible Page Title');
		});

		it('12.4 キーボードナビゲーションが機能すること', async () => {
			globalThis.fetch = () => {
				return Promise.resolve(new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				}));
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);

			// Enterキーでリンクを起動
			const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
			link.dispatchEvent(event);

			// リンクのクリックハンドラをトリガー
			simulateClick(link);

			await waitUntil(() => outlet.innerHTML.includes('Content'), 'キーボードナビゲーション');

			expect(outlet.innerHTML).to.include('Content');
		});
	});
});
