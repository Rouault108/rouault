import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * クリック可能な要素に必要なアクセシビリティ機能を提供する Reactive Controller
 *
 * 機能:
 * - `tabindex="0"` と `role="button"` の自動管理
 * - Enter/Space キーでのクリックイベント発火
 * - interactive プロパティの動的変更への対応
 *
 * 使用例:
 * ```typescript
 * class MyElement extends LitElement {
 *   @property({ type: Boolean, reflect: true })
 *   interactive = false;
 *
 *   private clickable = new ClickableController(this, () => this.interactive);
 * }
 * ```
 */
export class ClickableController implements ReactiveController {
  private host: ReactiveControllerHost & HTMLElement;
  private getInteractive: () => boolean;
  private previousInteractive = false;

  constructor(host: ReactiveControllerHost & HTMLElement, getInteractive: () => boolean) {
    this.host = host;
    this.getInteractive = getInteractive;
    this.host.addController(this);
  }

  hostConnected(): void {
    this._updateAttributes();
  }

  hostDisconnected(): void {
    this._cleanup();
  }

  hostUpdated(): void {
    const currentInteractive = this.getInteractive();

    // interactive プロパティが変更された場合のみ更新
    if (currentInteractive !== this.previousInteractive) {
      this._updateAttributes();
      this.previousInteractive = currentInteractive;
    }
  }

  private _updateAttributes(): void {
    const interactive = this.getInteractive();

    if (interactive) {
      this.host.setAttribute('tabindex', '0');
      this.host.setAttribute('role', 'button');
      this.host.addEventListener('keydown', this._handleKeyDown);
    } else {
      this.host.removeAttribute('tabindex');
      this.host.removeAttribute('role');
      this.host.removeEventListener('keydown', this._handleKeyDown);
    }
  }

  private _cleanup(): void {
    this.host.removeEventListener('keydown', this._handleKeyDown);
  }

  private _handleKeyDown = (e: KeyboardEvent): void => {
    // Enter または Space でクリックイベントを発火
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); // Space のスクロールを防ぐ

      // this.host.click() だとテスト環境でイベントが捕捉されない場合があるため、
      // 明示的に MouseEvent を発火させる
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        composed: true,
      });
      this.host.dispatchEvent(clickEvent);
    }
  };
}
