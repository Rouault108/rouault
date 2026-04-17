import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface UiHeaderSidebarToggleDetail {
  expanded: boolean;
}

@customElement('ui-header')
export class UiHeader extends LitElement {
  static override styles = css`
    :host {
      display: contents;

      /* パブリックトークン（外部からオーバーライド可能） */
      --ui-header-backdrop-saturate: 0.5;
      --ui-header-center-start-inset: 0px;
      --ui-header-center-end-inset: 0px;
      --ui-header-max-inline-size: var(--layout-chrome-max-width, 1280px);
      --ui-header-max-inline-size-with-sidebar: var(--ui-header-max-inline-size);

      /* コンポーネントローカルトークン */
      --ui-header-edge-highlight: oklch(100% 0 0 / 0.06);
    }

    /* ── ヘッダー本体 ── */
    header {
      position: sticky;
      top: 0;
      z-index: var(--z-fixed, 100);
      grid-column: 1 / -1;
      block-size: var(--header-height, 48px);

      /* 背景: Baseline（backdrop-filter非対応環境用フォールバック） */
      background: var(--glass-panel, var(--bg-default));
      border-bottom: var(--border-width, 1px) solid var(--border-default);

      font-size: var(--text-base, 0.875rem);
      color: var(--fg-default);
    }

    /* ── Glassmorphism: Progressive Enhancement ── */
    @supports (backdrop-filter: blur(12px)) {
      header {
        background: oklch(from var(--bg-default) l c h / 0.85);
        backdrop-filter: blur(var(--blur-md, 12px)) saturate(var(--ui-header-backdrop-saturate));
        -webkit-backdrop-filter: blur(var(--blur-md, 12px))
          saturate(var(--ui-header-backdrop-saturate));

        /* Edge Highlight: 光の反射を表現 */
        box-shadow:
          inset 0 1px 0 0 oklch(100% 0 0 / 0.05),
          inset 0 0 0 1px oklch(100% 0 0 / 0.03);
      }
    }

    /* ── Dark Mode: Edge Highlight強化 ── */
    @media (prefers-color-scheme: dark) {
      header {
        border-color: var(--ui-header-edge-highlight);
      }
    }

    @media (prefers-color-scheme: dark) {
      @supports (backdrop-filter: blur(12px)) {
        header {
          box-shadow:
            inset 0 1px 0 0 oklch(100% 0 0 / 0.08),
            inset 0 0 0 1px oklch(100% 0 0 / 0.05);
        }
      }
    }

    .inner {
      /*
			 * position: relative は .zone-center の絶対配置基点として必須。
			 * grid を廃止し flex に変更することで、start/end ゾーンを
			 * 自然なコンテンツ幅で配置しつつ、center を全幅に絶対配置して
			 * ヘッダーの視覚的中央に固定する。
			 */
      position: relative;
      display: flex;
      align-items: center;
      block-size: 100%;
      max-inline-size: var(--ui-header-max-inline-size);
      margin-inline: auto;
      padding-inline: var(--space-4, 1rem);
    }

    :host([sidebar-expanded]) .inner {
      max-inline-size: var(--ui-header-max-inline-size-with-sidebar);
    }

    :host([sidebar-expanded]) .zone-start {
      inline-size: var(--sidebar-width, 240px);
    }

    .zone-start {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      flex-shrink: 1;
      min-inline-size: 0;
      overflow: hidden;
    }

    slot[name='start'],
    slot[name='end'] {
      display: block;
      min-inline-size: 0;
      max-inline-size: 100%;
    }

    .zone-center {
      position: absolute;
      inset-inline-start: var(--ui-header-center-start-inset);
      inset-inline-end: var(--ui-header-center-end-inset);
      block-size: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      min-inline-size: 0;
    }

    slot[name='center']::slotted(*) {
      pointer-events: auto;
    }

    .zone-compact-center {
      position: absolute;
      inset-inline-start: var(--ui-header-center-start-inset);
      inset-inline-end: var(--ui-header-center-end-inset);
      block-size: 100%;
      display: none;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      min-inline-size: 0;
    }

    slot[name='compact-center']::slotted(*) {
      pointer-events: auto;
    }

    .zone-end {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-2, 0.5rem);
      flex-shrink: 1;
      min-inline-size: 0;
      margin-inline-start: auto;
      overflow: hidden;
    }

    /* ── モバイル: 639px 以下では Center Zone を非表示（desktop 開始は 640px） ── */
    @media (max-width: 639px) {
      header {
        z-index: var(--z-anchored-overlay, var(--z-popover, 400));
      }

      .zone-center {
        display: none;
      }

      .zone-compact-center {
        display: flex;
      }

      .zone-end {
        /* mobile header の dropdown panel は zone-end の外へ張り出す。
         * ここを hidden のままにすると fixed panel が塗りつぶし段階で切られ、
         * mobile TOC bar より前面に出せない。 */
        overflow: visible;
      }
    }

    /* ── Forced Colors Mode ── */
    @media (forced-colors: active) {
      header {
        background: Canvas;
        border-bottom: var(--border-width, 1px) solid CanvasText;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        box-shadow: none;
      }

      /* スロット経由で配置されたインタラクティブ要素 */
      ::slotted(button),
      ::slotted([role='button']) {
        border: 1px solid ButtonText;
      }
    }

    /* ── Reduced Motion ── */
    @media (prefers-reduced-motion: reduce) {
      header,
      .zone-start,
      .zone-end {
        transition-duration: 0.01ms !important;
      }
    }

    @media print {
      header {
        display: none !important;
      }
    }
  `;

  @property({ type: Boolean, reflect: true, attribute: 'sidebar-expanded' })
  sidebarExpanded = true;

  /** 初回レンダリング完了フラグ（初期値でのイベント発火を防止） */
  private _hasRendered = false;

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (!this._hasRendered) {
      this._hasRendered = true;
      return;
    }

    if (changedProperties.has('sidebarExpanded')) {
      this.dispatchEvent(
        new CustomEvent<UiHeaderSidebarToggleDetail>('ui-header-sidebar-toggle', {
          bubbles: false,
          composed: false,
          detail: { expanded: this.sidebarExpanded },
        }),
      );
    }
  }

  override render() {
    return html`
      <header>
        <div class="inner">
          <div class="zone-start">
            <slot name="start"></slot>
          </div>

          <div class="zone-center">
            <slot name="center"></slot>
          </div>

          <div class="zone-compact-center">
            <slot name="compact-center"></slot>
          </div>

          <div class="zone-end">
            <slot name="end"></slot>
          </div>
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-header': UiHeader;
  }
}
