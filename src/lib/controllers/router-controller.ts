/**
 * RouterController - Router を Lit のリアクティブシステムに統合する Reactive Controller
 *
 * clickable-controller.ts と同じパターンに従い、ReactiveController を実装する。
 * AppRouter コンポーネントがこのコントローラを通じてルーター状態をリアクティブに受け取る。
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { Router, type RouterOptions } from '../router.js';

export class RouterController implements ReactiveController {
  private _router: Router | null = null;

  /**
   * ナビゲーション中かどうか
   * ホストが requestUpdate() を呼ぶため @state は不要
   */
  isNavigating = false;

  constructor(private host: ReactiveControllerHost) {
    host.addController(this);
  }

  /**
   * initRouter() は AppRouter.connectedCallback() から呼ぶため、
   * hostConnected() での初期化は行わない
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  hostConnected(): void {}

  /**
   * ホストが DOM から切り離された時にルーターを破棄する
   */
  hostDisconnected(): void {
    this._router?.destroy();
    this._router = null;
  }

  /**
   * Router を初期化する
   * AppRouter.connectedCallback() から SSG コンテンツの保存後に呼ばれる
   *
   * @param outlet - Router のアウトレット要素（AppRouter 自身）
   * @param onPageContent - ページコンテンツ更新時のコールバック
   * @param options - Router 初期化オプション（onContentUpdate は自動設定されるため除外）
   */
  initRouter(
    outlet: HTMLElement,
    onPageContent: (html: string) => void,
    options: Omit<RouterOptions, 'onContentUpdate'> = {},
  ): Router {
    this._router = new Router(outlet, {
      ...options,
      onContentUpdate: onPageContent,
    });

    // loading:start / loading:end イベントで isNavigating を同期し、
    // ホストの再レンダリングをトリガーする
    this._router.on('loading:start', () => {
      this.isNavigating = true;
      this.host.requestUpdate();
    });

    this._router.on('loading:end', () => {
      this.isNavigating = false;
      this.host.requestUpdate();
    });

    return this._router;
  }

  /**
   * 内部の Router インスタンスを返す
   * AppRouter から runReinitializeHooks() などを呼ぶために使用する
   */
  get router(): Router | null {
    return this._router;
  }
}
