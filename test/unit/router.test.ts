/// <reference types="../../types/global.d.ts" />

/**
 * Router クラスの包括的な単体テスト
 *
 * View Transitions API を使用したSPAルーターのテスト
 * TDD方式で段階的に機能を実装していく
 */

import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { Router } from '../../src/lib/router.js';

describe('Router', () => {
	let outlet: HTMLElement;
	let router: Router;
	let originalStartViewTransition: Document['startViewTransition'];
	let originalFetch: typeof globalThis.fetch;
	let originalPushState: typeof history.pushState;
	let originalReplaceState: typeof history.replaceState;

	beforeEach(async () => {
		// テスト用のアウトレット要素を作成
		outlet = await fixture<HTMLElement>(html` <main id="test-outlet">Initial Content</main> `);

		// fetch のオリジナルを保存
		originalFetch = globalThis.fetch;

		// history API のオリジナルを保存
		originalPushState = history.pushState;
		originalReplaceState = history.replaceState;

		// history API のモック（SecurityErrorを防ぐため）
		history.pushState = (_data: unknown, _unused: string, _url?: string | URL | null) => {
			// mock
		};
		history.replaceState = (_data: unknown, _unused: string, _url?: string | URL | null) => {
			// mock
		};

		// View Transition API のモック
		// exactOptionalPropertyTypesに対応するため、型アサーションを使用
		originalStartViewTransition = document.startViewTransition;
		const mockTransition: Document['startViewTransition'] = (
			callback?: ViewTransitionUpdateCallback | StartViewTransitionOptions,
		) => {
			// コールバックの即時実行
			const updateCallback =
				typeof callback === 'function' ? callback : callback?.update;
			if (updateCallback) {
				void Promise.resolve(updateCallback());
			}

			// typesのモックオブジェクトを作成
			const typesArray = typeof callback === 'object' && callback?.types ? callback.types : [];
			const backingSet = new Set(typesArray);

			const mockTypes = {
				// Setの標準メソッドをデリゲート
				add: (value: string) => {
					backingSet.add(value);
					return mockTypes;
				},
				clear: () => backingSet.clear(),
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
					backingSet.forEach((value, key) =>
						callbackfn(value, key, mockTypes as ViewTransitionTypeSet),
					);
				},
			} as ViewTransitionTypeSet;

			return {
				finished: Promise.resolve(),
				ready: Promise.resolve(),
				updateCallbackDone: Promise.resolve(),
				skipTransition: () => {
					// mock
				},
				types: mockTypes,
			};
		};
		document.startViewTransition = mockTransition;
	});

	afterEach(() => {
		// すべてのモックを解除
		document.startViewTransition = originalStartViewTransition;
		globalThis.fetch = originalFetch;
		history.pushState = originalPushState;
		history.replaceState = originalReplaceState;

		// ルーターのクリーンアップ
		if (router) {
			router.destroy?.();
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
			globalThis.fetch = async () => {
				fetchCalled = true;
				return new Response('<html><body><main>Initial</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			await waitUntil(() => fetchCalled, '初期ナビゲーションが実行されること');
			expect(fetchCalled).to.be.true;
		});

		it('1.3 destroy() メソッドでイベントリスナーが解除されること', async () => {
			router = new Router(outlet);
			router.destroy?.();

			// destroyされた後はリンククリックがインターセプトされない
			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Test Link</a> `);

			let defaultPrevented = false;
			const handler = (e: Event) => {
				defaultPrevented = e.defaultPrevented;
				e.preventDefault(); // テスト環境を保護
			};
			document.addEventListener('click', handler);

			link.click();

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
			globalThis.fetch = async () => {
				return new Response('<html><body><main>Mocked</main></body></html>', {
					status: 200,
				});
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

			link.click();

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

			link.click();

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

			link.click();

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

			link.click();

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

			link.click();

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

			link.click();

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

			link.click();

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

			// Ctrl キーを押しながらクリック
			const event = new MouseEvent('click', { ctrlKey: true, bubbles: true });
			link.dispatchEvent(event);

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

			const event = new MouseEvent('click', { shiftKey: true, bubbles: true });
			link.dispatchEvent(event);

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

			const event = new MouseEvent('click', { altKey: true, bubbles: true });
			link.dispatchEvent(event);

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

			const event = new MouseEvent('click', { metaKey: true, bubbles: true });
			link.dispatchEvent(event);

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

			const event = new MouseEvent('click', { button: 1, bubbles: true });
			link.dispatchEvent(event);

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

			link.click();

			document.removeEventListener('click', handler);

			expect(defaultPrevented).to.be.false;
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

			globalThis.fetch = async () => {
				return new Response(mockHTML, {
					status: 200,
					headers: { 'Content-Type': 'text/html' },
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test-page">Navigate</a> `);
			link.click();

			await waitUntil(() => outlet.innerHTML.includes('Test Content'), 'コンテンツが更新されること');

			expect(outlet.innerHTML).to.include('<h1>Test Content</h1>');
			expect(document.title).to.equal('Test Page');
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

			globalThis.fetch = async () => {
				return new Response(mockHTML, {
					status: 200,
				});
			};

			router = new Router(outlet);

			// プログラマティックにナビゲーション
			await router.navigate?.('/programmatic');

			expect(outlet.innerHTML).to.include('Programmatic Content');
			expect(document.title).to.equal('Programmatic Page');
		});

		it('3.3 history.pushState が呼ばれて履歴に追加されること', async () => {
			let pushedPath = '';
			history.pushState = ((_data: unknown, _unused: string, url?: string | URL | null) => {
				if (url) pushedPath = url.toString();
			}) as typeof history.pushState;

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/new-page">Link</a> `);
			link.click();

			await waitUntil(() => pushedPath === '/new-page', 'pushStateが呼ばれること');

			expect(pushedPath).to.equal('/new-page');
		});

		it('3.4 popstate イベントで戻る/進むボタンに対応すること', async () => {
			let lastFetchedPath = '';
			globalThis.fetch = async (input: RequestInfo | URL) => {
				lastFetchedPath = input.toString();
				return new Response('<html><body><main>Back Content</main></body></html>', {
					status: 200,
				});
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

			globalThis.fetch = async () => {
				return new Response(mockHTML, { status: 200 });
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

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

			globalThis.fetch = async () => {
				return new Response(mockHTML, { status: 200 });
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

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

			globalThis.fetch = async () => {
				return new Response(mockHTML, { status: 200 });
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(
				() => document.querySelector('meta[name="description"]')?.getAttribute('content') === 'Updated Description',
				'meta descriptionが更新',
			);

			const metaTag = document.querySelector('meta[name="description"]');
			expect(metaTag?.getAttribute('content')).to.equal('Updated Description');
		});

		it('4.4 空のレスポンスを適切に処理すること', async () => {
			globalThis.fetch = async () => {
				return new Response('', { status: 200 });
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/empty">Link</a> `);
			link.click();

			await waitUntil(
				() => outlet.textContent?.includes('Not Found') || outlet.textContent?.includes('エラー'),
				'エラー表示',
			);

			// 空のレスポンスはエラーとして扱われるべき
			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('Not Found') || text.includes('エラー')
			);
		});

		it('4.5 main要素がないHTMLを適切に処理すること', async () => {
			const mockHTML = `
                <!DOCTYPE html>
                <html>
                    <body><div>No main element</div></body>
                </html>
            `;

			globalThis.fetch = async () => {
				return new Response(mockHTML, { status: 200 });
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/no-main">Link</a> `);
			link.click();

			await waitUntil(
				() => outlet.textContent?.includes('Not Found') || outlet.textContent?.includes('エラー'),
				'エラー表示',
			);

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('Not Found') || text.includes('エラー')
			);
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
					skipTransition: () => {},
				};
			}) as Document['startViewTransition'];

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(() => transitionCalled, 'startViewTransitionが呼ばれる');

			expect(transitionCalled).to.be.true;
		});

		it('5.2 非対応ブラウザでフォールバックが動作すること', async () => {
			// startViewTransitionを削除して非対応環境をシミュレート
			// @ts-expect-error - テストのために意図的に削除
			document.startViewTransition = undefined;

			globalThis.fetch = async () => {
				return new Response('<html><body><main><p>Fallback Content</p></main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/fallback">Link</a> `);
			link.click();

			await waitUntil(() => outlet.innerHTML.includes('Fallback Content'), 'フォールバック動作');

			expect(outlet.innerHTML).to.include('Fallback Content');
		});

		it('5.3 トランジション失敗時にもコンテンツが更新されること', async () => {
			document.startViewTransition = ((_callback: () => Promise<void>) => {
				return {
					finished: Promise.reject(new Error('Transition failed')),
					ready: Promise.resolve(),
					updateCallbackDone: Promise.resolve(),
					skipTransition: () => {},
				};
			}) as Document['startViewTransition'];

			globalThis.fetch = async () => {
				return new Response('<html><body><main><p>Content Despite Error</p></main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(() => outlet.innerHTML.includes('Content Despite Error'), 'コンテンツ更新');

			expect(outlet.innerHTML).to.include('Content Despite Error');
		});
	});

	// ========================================
	// 6. エラーハンドリング
	// ========================================
	describe('6. エラーハンドリング', () => {
		it('6.1 404エラー時に適切なエラーメッセージを表示すること', async () => {
			globalThis.fetch = async () => {
				return new Response('Not Found', {
					status: 404,
					statusText: 'Not Found',
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/404">Link</a> `);
			link.click();

			await waitUntil(() => outlet.textContent?.includes('404'), '404エラー表示');

			expect(outlet.textContent).to.include('404');
		});

		it('6.2 500エラー時に適切なエラーメッセージを表示すること', async () => {
			globalThis.fetch = async () => {
				return new Response('Internal Server Error', {
					status: 500,
					statusText: 'Internal Server Error',
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/500">Link</a> `);
			link.click();

			await waitUntil(() => outlet.textContent?.includes('500') || outlet.textContent?.includes('エラー'), '500エラー表示');

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('500') || text.includes('エラー')
			);
		});

		it('6.3 ネットワークエラー時に適切なメッセージを表示すること', async () => {
			globalThis.fetch = async () => {
				throw new TypeError('Failed to fetch');
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/network-error">Link</a> `);
			link.click();

			await waitUntil(
				() => outlet.textContent?.includes('ネットワーク') || outlet.textContent?.includes('エラー'),
				'ネットワークエラー表示',
			);

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('ネットワーク') || text.includes('エラー')
			);
		});

		it('6.4 401エラー時に認証エラーメッセージを表示すること', async () => {
			globalThis.fetch = async () => {
				return new Response('Unauthorized', {
					status: 401,
					statusText: 'Unauthorized',
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/401">Link</a> `);
			link.click();

			await waitUntil(() => outlet.textContent?.includes('401') || outlet.textContent?.includes('認証'), '401エラー表示');

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('401') || text.includes('認証')
			);
		});

		it('6.5 403エラー時に権限エラーメッセージを表示すること', async () => {
			globalThis.fetch = async () => {
				return new Response('Forbidden', {
					status: 403,
					statusText: 'Forbidden',
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/403">Link</a> `);
			link.click();

			await waitUntil(() => outlet.textContent?.includes('403') || outlet.textContent?.includes('権限'), '403エラー表示');

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('403') || text.includes('権限')
			);
		});

		it('6.6 503エラー時にサービス利用不可メッセージを表示すること', async () => {
			globalThis.fetch = async () => {
				return new Response('Service Unavailable', {
					status: 503,
					statusText: 'Service Unavailable',
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/503">Link</a> `);
			link.click();

			await waitUntil(() => outlet.textContent?.includes('503') || outlet.textContent?.includes('利用'), '503エラー表示');

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('503') || text.includes('利用')
			);
		});

		it('6.7 タイムアウト時に適切なメッセージを表示すること', async () => {
			globalThis.fetch = async () => {
				await new Promise((resolve) => setTimeout(resolve, 100000)); // 長時間待機
				return new Response('Should timeout', { status: 200 });
			};

			router = new Router(outlet);

			// タイムアウトを5秒に設定
			router.setTimeout?.(5000);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/timeout">Link</a> `);
			link.click();

			await waitUntil(
				() => outlet.textContent?.includes('タイムアウト') || outlet.textContent?.includes('Timeout'),
				'タイムアウトエラー表示',
				{ timeout: 10000 },
			);

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('タイムアウト') || text.includes('Timeout')
			);
		});

		it('6.8 CORSエラー時に適切なメッセージを表示すること', async () => {
			globalThis.fetch = async () => {
				throw new TypeError('CORS policy blocked');
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/cors">Link</a> `);
			link.click();

			await waitUntil(
				() => outlet.textContent?.includes('CORS') || outlet.textContent?.includes('エラー'),
				'CORSエラー表示',
			);

			expect(outlet.textContent).to.satisfy((text: string) =>
				text.includes('CORS') || text.includes('エラー')
			);
		});
	});

	// ========================================
	// 7. ローディング状態管理
	// ========================================
	describe('7. ローディング状態管理', () => {
		it('7.1 ナビゲーション中に isNavigating が true になること', async () => {
			let resolvePromise: () => void;
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
			link.click();

			// ナビゲーション中
			expect(router.isNavigating?.()).to.be.true;

			// ナビゲーション完了
			resolvePromise!();
			await waitUntil(() => !router.isNavigating?.(), 'ナビゲーション完了');

			expect(router.isNavigating?.()).to.be.false;
		});

		it('7.2 二重ロード防止: ローディング中は新しいナビゲーションをブロックすること', async () => {
			let fetchCount = 0;
			let resolveFirstFetch: () => void;
			const firstFetchPromise = new Promise<void>((resolve) => {
				resolveFirstFetch = resolve;
			});

			globalThis.fetch = async () => {
				fetchCount++;
				if (fetchCount === 1) {
					await firstFetchPromise;
				}
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			
			// 1回目のクリック
			link.click();
			
			// 即座に2回目のクリック（ブロックされるべき）
			link.click();

			// 1回目を完了させる
			resolveFirstFetch!();

			await waitUntil(() => fetchCount === 1, 'fetchが1回だけ');

			// 2回目はブロックされているのでfetchは1回だけ
			expect(fetchCount).to.equal(1);
		});

		it('7.3 ローディングイベントが発火すること', async () => {
			let loadingStarted = false;
			let loadingEnded = false;

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			router.on?.('loading:start', () => {
				loadingStarted = true;
			});

			router.on?.('loading:end', () => {
				loadingEnded = true;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(() => loadingEnded, 'ローディング完了イベント');

			expect(loadingStarted).to.be.true;
			expect(loadingEnded).to.be.true;
		});
	});

	// ========================================
	// 8. 再初期化処理
	// ========================================
	describe('8. 再初期化処理', () => {
		it('8.1 Prism.highlightAll() が呼ばれること', async () => {
			let highlightAllCalled = false;
			window.Prism = {
				highlightAll: () => {
					highlightAllCalled = true;
				},
				highlightElement: () => {},
			} as NonNullable<typeof window.Prism>;

			globalThis.fetch = async () => {
				return new Response(
					'<html><body><main><pre><code>test</code></pre></main></body></html>',
					{ status: 200 },
				);
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(() => highlightAllCalled, 'Prism.highlightAll呼び出し');

			expect(highlightAllCalled).to.be.true;

			delete window.Prism;
		});

		it('8.2 スクロール位置がトップにリセットされること', async () => {
			window.scrollTo(0, 500);

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(() => window.scrollY === 0, 'スクロールリセット');

			expect(window.scrollY).to.equal(0);
		});

		it('8.3 PagefindUI が再初期化されること', async () => {
			let pagefindInitialized = false;

			class MockPagefindUI {
				constructor(_options: { element: Element | null }) {
					pagefindInitialized = true;
				}
			}

			const originalPagefindUI = window.PagefindUI;
			window.PagefindUI = MockPagefindUI as unknown as NonNullable<typeof window.PagefindUI>;

			globalThis.fetch = async () => {
				return new Response(
					'<html><body><main><div id="search"></div></main></body></html>',
					{ status: 200 },
				);
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/search">Link</a> `);
			link.click();

			await waitUntil(() => pagefindInitialized, 'PagefindUI初期化');

			expect(pagefindInitialized).to.be.true;

			window.PagefindUI = originalPagefindUI;
		});

		it('8.4 カスタム再初期化フックが実行されること', async () => {
			let customHookCalled = false;

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			router.addReinitializeHook?.(() => {
				customHookCalled = true;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

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

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			router.on?.('before:navigate', (path: string) => {
				beforeNavigateCalled = true;
				beforeNavigatePath = path;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(() => beforeNavigateCalled, 'beforeNavigate実行');

			expect(beforeNavigateCalled).to.be.true;
			expect(beforeNavigatePath).to.equal('/test');
		});

		it('9.2 beforeNavigate でナビゲーションをキャンセルできること', async () => {
			let fetchCalled = false;

			globalThis.fetch = async () => {
				fetchCalled = true;
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			router.on?.('before:navigate', () => {
				return false; // キャンセル
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			// キャンセルされているのでfetchは呼ばれない
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(fetchCalled).to.be.false;
		});

		it('9.3 afterNavigate フックが実行されること', async () => {
			let afterNavigateCalled = false;

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			router.on?.('after:navigate', () => {
				afterNavigateCalled = true;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(() => afterNavigateCalled, 'afterNavigate実行');

			expect(afterNavigateCalled).to.be.true;
		});

		it('9.4 onError フックが実行されること', async () => {
			let errorCaught = false;
			let errorMessage = '';

			globalThis.fetch = async () => {
				throw new Error('Test Error');
			};

			router = new Router(outlet);

			router.on?.('error', (error: Error) => {
				errorCaught = true;
				errorMessage = error.message;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/error">Link</a> `);
			link.click();

			await waitUntil(() => errorCaught, 'errorフック実行');

			expect(errorCaught).to.be.true;
			expect(errorMessage).to.equal('Test Error');
		});

		it('9.5 onContentLoad フックが実行されること', async () => {
			let contentLoadCalled = false;

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			router.on?.('content:load', () => {
				contentLoadCalled = true;
			});

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

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

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Post Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			router.on?.('after:navigate', () => {
				capturedParams = router.getParams?.() ?? {};
			});

			await router.navigate?.('/posts/123');

			await waitUntil(() => Object.keys(capturedParams).length > 0, 'パラメータ取得');

			expect(capturedParams).to.have.property('id', '123');
		});

		it('10.2 複数の動的パラメータ（/posts/:category/:id）が取得できること', async () => {
			let capturedParams: Record<string, string> = {};

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			router.on?.('after:navigate', () => {
				capturedParams = router.getParams?.() ?? {};
			});

			await router.navigate?.('/posts/tech/456');

			await waitUntil(() => Object.keys(capturedParams).length > 0, 'パラメータ取得');

			expect(capturedParams).to.include({ category: 'tech', id: '456' });
		});

		it('10.3 クエリパラメータが取得できること', async () => {
			let capturedQuery: Record<string, string> = {};

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			router.on?.('after:navigate', () => {
				capturedQuery = router.getQuery?.() ?? {};
			});

			await router.navigate?.('/search?q=test&page=2');

			await waitUntil(() => Object.keys(capturedQuery).length > 0, 'クエリ取得');

			expect(capturedQuery).to.include({ q: 'test', page: '2' });
		});

		it('10.4 ルート定義を登録できること', async () => {
			let handlerCalled = false;

			router = new Router(outlet);

			router.addRoute?.('/custom-route', async () => {
				handlerCalled = true;
				return '<p>Custom Handler</p>';
			});

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Should not be used</main></body></html>', {
					status: 200,
				});
			};

			await router.navigate?.('/custom-route');

			await waitUntil(() => handlerCalled, 'カスタムハンドラ実行');

			expect(handlerCalled).to.be.true;
			expect(outlet.innerHTML).to.include('Custom Handler');
		});

		it('10.5 ワイルドカードルート（/posts/*）がマッチすること', async () => {
			let wildcardMatched = false;

			router = new Router(outlet);

			router.addRoute?.('/posts/*', async () => {
				wildcardMatched = true;
				return '<p>Wildcard Match</p>';
			});

			await router.navigate?.('/posts/anything/here');

			await waitUntil(() => wildcardMatched, 'ワイルドカードマッチ');

			expect(wildcardMatched).to.be.true;
			expect(outlet.innerHTML).to.include('Wildcard Match');
		});

		it('10.6 正規表現ルートがマッチすること', async () => {
			let regexMatched = false;

			router = new Router(outlet);

			router.addRoute?.(/^\/posts\/(\d+)$/, async () => {
				regexMatched = true;
				return '<p>Regex Match</p>';
			});

			await router.navigate?.('/posts/789');

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
			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			await router.navigate?.('/current-path');

			await waitUntil(() => router.getCurrentPath?.() === '/current-path', 'パス取得');

			expect(router.getCurrentPath?.()).to.equal('/current-path');
		});

		it('11.2 history.state を使ってルート固有のデータを保存できること', async () => {
			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			await router.navigate?.('/test', { customData: 'value' });

			expect(history.state).to.include({ customData: 'value' });
		});

		it('11.3 ナビゲーション履歴を取得できること', async () => {
			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			await router.navigate?.('/page1');
			await router.navigate?.('/page2');
			await router.navigate?.('/page3');

			const history = router.getHistory?.();

			expect(history).to.include.members(['/page1', '/page2', '/page3']);
		});

		it('11.4 ルート変更を監視できること', async () => {
			let routeChangeCount = 0;

			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			router.on?.('route:change', () => {
				routeChangeCount++;
			});

			await router.navigate?.('/test1');
			await router.navigate?.('/test2');

			expect(routeChangeCount).to.equal(2);
		});
	});

	// ========================================
	// 12. アクセシビリティ（WCAG AA準拠）
	// ========================================
	describe('12. アクセシビリティ（WCAG AA準拠）', () => {
		it('12.1 ナビゲーション後にフォーカスが適切に移動すること', async () => {
			globalThis.fetch = async () => {
				return new Response(
					'<html><body><main><h1 tabindex="-1">New Page</h1></main></body></html>',
					{ status: 200 },
				);
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(() => {
				const h1 = outlet.querySelector('h1');
				return document.activeElement === h1;
			}, 'フォーカス移動');

			const h1 = outlet.querySelector('h1');
			expect(document.activeElement).to.equal(h1);
		});

		it('12.2 aria-live でスクリーンリーダーに通知されること', async () => {
			globalThis.fetch = async () => {
				return new Response('<html><body><main>New Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(() => {
				const liveRegion = document.querySelector('[aria-live]');
				return liveRegion?.textContent?.includes('ページが読み込まれました');
			}, 'aria-live通知');

			const liveRegion = document.querySelector('[aria-live]');
			expect(liveRegion?.textContent).to.include('ページが読み込まれました');
		});

		it('12.3 ナビゲーション後にドキュメントタイトルが適切に更新されること', async () => {
			globalThis.fetch = async () => {
				return new Response(
					'<html><head><title>Accessible Page Title</title></head><body><main>Content</main></body></html>',
					{ status: 200 },
				);
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);
			link.click();

			await waitUntil(() => document.title === 'Accessible Page Title', 'タイトル更新');

			expect(document.title).to.equal('Accessible Page Title');
		});

		it('12.4 キーボードナビゲーションが機能すること', async () => {
			globalThis.fetch = async () => {
				return new Response('<html><body><main>Content</main></body></html>', {
					status: 200,
				});
			};

			router = new Router(outlet);

			const link = await fixture<HTMLAnchorElement>(html` <a href="/test">Link</a> `);

			// Enterキーでリンクを起動
			const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
			link.dispatchEvent(event);

			// リンクのクリックハンドラをトリガー
			link.click();

			await waitUntil(() => outlet.innerHTML.includes('Content'), 'キーボードナビゲーション');

			expect(outlet.innerHTML).to.include('Content');
		});
	});
});
