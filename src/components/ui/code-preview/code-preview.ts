import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

type PreviewPadding = 'normal' | 'none' | 'compact';
type PreviewAlign = 'center' | 'start' | 'stretch';

const VALID_PADDING = new Set<PreviewPadding>(['normal', 'none', 'compact']);
const VALID_ALIGN = new Set<PreviewAlign>(['center', 'start', 'stretch']);

/**
 * コードプレビューコンポーネント。
 *
 * UIのレンダリング結果（プレビュー）とソースコードを一体化して提示します。
 * 「See it, then understand it」の読み順を実現します。
 *
 * @slot preview - レンダリング結果を含む任意のHTML
 * @slot         - コードエリア（ui-code-block または ui-code-group を配置）
 * @slot toolbar - ヘッダー右側に配置するオプションのアクション領域
 */
@customElement('ui-code-preview')
export class CodePreview extends LitElement {
  static override styles = css`
    :host {
      /* ─── Breakout デフォルト値（Mobile） ─── */
      --_ui-code-preview-breakout-width-default: calc(100% + var(--space-8, 2rem));
      --_ui-code-preview-breakout-margin-default: var(--space-n4, -1rem);

      /* ─── 子コンポーネントの breakout を無効化（本コンポーネントが担当） ─── */
      --ui-code-block-breakout-width: 100%;
      --ui-code-block-breakout-margin: 0;
      --ui-code-block-radius-top: 0;
      --ui-code-group-width: 100%;
      --ui-code-group-margin-inline: 0;

      display: block;
      width: var(
        --ui-code-preview-breakout-width,
        var(--_ui-code-preview-breakout-width-default)
      );
      margin-inline: var(
        --ui-code-preview-breakout-margin,
        var(--_ui-code-preview-breakout-margin-default)
      );
      margin-block: var(--space-8, 2rem);
    }

    @media (min-width: 768px) {
      :host {
        /* ─── Breakout デフォルト値（Desktop） ─── */
        --_ui-code-preview-breakout-width-default: calc(100% + var(--space-16, 4rem));
        --_ui-code-preview-breakout-margin-default: var(--space-n8, -2rem);
      }
    }

    /* ─── Root Container ─── */
    .root {
      border: var(--border-style-subtle, 1px solid oklch(20% 0 0 / 0.08));
      border-radius: var(--ui-code-preview-radius, var(--radius-md, 6px));
      overflow: hidden;
      background: var(--bg-fill-muted, oklch(96% 0 0));
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ─── Header ─── */
    .header {
      display: none;
      align-items: center;
      justify-content: flex-start;
      gap: var(--space-2, 0.5rem);
      padding: var(--space-4, 1rem) var(--space-4, 1rem);
      background: var(--ui-code-preview-preview-bg, var(--bg-surface-2, oklch(100% 0 0)));
      border-bottom: none;
    }

    :host([data-show-header]) .header {
      display: flex;
    }

    .header-label {
      display: none;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--fg-muted, oklch(48% 0 0));
      font-size: var(--text-xs, 12px);
      font-weight: var(--font-medium, 500);
      letter-spacing: var(--tracking-wide, 0.025em);
    }

    :host([data-has-label]) .header-label {
      display: block;
    }

    .header-toolbar {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      flex-shrink: 0;
      margin-inline-start: auto;
    }

    /* toolbar 内の操作要素は最低ターゲットサイズを保証 */
    ::slotted(button[slot='toolbar']),
    ::slotted(a[slot='toolbar']),
    ::slotted([role='button'][slot='toolbar']) {
      min-inline-size: 24px;
      min-block-size: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    @media (pointer: coarse) {
      ::slotted(button[slot='toolbar']),
      ::slotted(a[slot='toolbar']),
      ::slotted([role='button'][slot='toolbar']) {
        min-inline-size: var(--control-min-touch, 24px);
        min-block-size: var(--control-min-touch, 24px);
      }
    }

    /* ─── Preview Area ─── */
    .preview-area {
      display: flex;
      background: var(--bg-fill-muted, oklch(96% 0 0));
      min-height: var(--ui-code-preview-preview-min-height, 72px);
      border-bottom: var(--border-width, 1px) solid
        var(--border-default, oklch(20% 0 0 / 0.16));
      /* Padding variant: normal（既定値） */
      padding: var(--space-4, 1rem);
      /* Align variant: center（既定値） */
      align-items: center;
      justify-content: center;
    }

    /* Padding variants */
    :host([preview-padding='compact']) .preview-area {
      padding: var(--space-3, 0.75rem);
    }

    :host([preview-padding='none']) .preview-area {
      padding: 0;
    }

    :host([data-show-header]) .header {
      padding-bottom: 0;
    }

    /* ヘッダー表示時はヘッダーの下パディングと重複するため除去 */
    :host([data-show-header]) .preview-area {
      padding-top: 0;
    }

    /* Align variants */
    :host([preview-align='start']) .preview-area {
      align-items: flex-start;
      justify-content: flex-start;
    }

    :host([preview-align='stretch']) .preview-area {
      align-items: stretch;
      justify-content: flex-start;
    }

    :host([preview-align='stretch']) ::slotted([slot='preview']) {
      inline-size: 100%;
    }

    /* ─── Code Area ─── */

    /* 子 Code Block の外枠・breakout を除去し、親の外枠に統合 */
    ::slotted(ui-code-block) {
      width: 100% !important;
      margin-inline: 0 !important;
      --border-style-subtle: none;
      --ui-code-block-radius-bottom: var(--ui-code-preview-radius, var(--radius-md, 6px));
      border-radius: 0 0 var(--ui-code-preview-radius, var(--radius-md, 6px))
        var(--ui-code-preview-radius, var(--radius-md, 6px)) !important;
    }

    /* 子 Code Group の外枠・角丸を除去し、親の外枠に統合 */
    ::slotted(ui-code-group) {
      border: none !important;
      border-radius: 0 0 var(--ui-code-preview-radius, var(--radius-md, 6px))
        var(--ui-code-preview-radius, var(--radius-md, 6px)) !important;
    }

    /* ─── Forced Colors ─── */
    @media (forced-colors: active) {
      .root {
        border-color: CanvasText;
      }

      .header,
      .preview-area {
        background: Canvas;
        border-bottom-color: CanvasText;
      }

      .preview-area {
        /* プレビューとコードの区別のため太い境界線を使用 */
        border-bottom-width: var(--border-width-thick, 2px);
      }
    }

    /* ─── Print ─── */
    @media print {
      :host {
        width: 100% !important;
        margin-inline: 0 !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .root {
        background: transparent !important;
        border-color: #000 !important;
      }

      .header {
        background: transparent !important;
        border-bottom-color: #000 !important;
      }

      .header-toolbar {
        display: none !important;
      }

      .preview-area {
        background: transparent !important;
        border-bottom-color: #000 !important;
        min-height: auto !important;
      }
    }
  `;

  /** オプションのヘッダーラベル。非空の場合、toolbar が空でもヘッダー領域を表示します。 */
  @property({ type: String, reflect: true })
  label = '';

  /**
   * プレビュー領域の内部余白を制御します。
   * `normal`: --space-4（既定値）、`compact`: --space-3、`none`: 余白なし
   */
  @property({ type: String, attribute: 'preview-padding', reflect: true })
  previewPadding: PreviewPadding = 'normal';

  /**
   * プレビュー領域内のコンテンツ配置を制御します。
   * `center`: 中央揃え（既定値）、`start`: 左上揃え、`stretch`: 親幅いっぱい
   */
  @property({ type: String, attribute: 'preview-align', reflect: true })
  previewAlign: PreviewAlign = 'center';

  @state()
  private _hasToolbarContent = false;

  @query('slot[name="toolbar"]')
  private _toolbarSlot?: HTMLSlotElement;

  @query('slot:not([name])')
  private _codeSlot?: HTMLSlotElement;

  override firstUpdated(): void {
    this._onToolbarSlotChange();
    this._onCodeSlotChange();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('previewPadding') && !VALID_PADDING.has(this.previewPadding)) {
      this.previewPadding = 'normal';
    }

    if (changedProperties.has('previewAlign') && !VALID_ALIGN.has(this.previewAlign)) {
      this.previewAlign = 'center';
    }
    this._syncHostAttributes();
  }

  private _syncHostAttributes(): void {
    const hasLabel = this.label.trim() !== '';
    const showHeader = hasLabel || this._hasToolbarContent;
    this.toggleAttribute('data-has-label', hasLabel);
    this.toggleAttribute('data-show-header', showHeader);
  }

  private _onToolbarSlotChange = (): void => {
    const slot = this._toolbarSlot;
    if (!slot) return;

    const hasMeaningful = slot.assignedNodes({ flatten: true }).some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return true;
      if (node.nodeType !== Node.TEXT_NODE) return false;
      return (node.textContent?.trim().length ?? 0) > 0;
    });

    this._hasToolbarContent = hasMeaningful;
  };

  private _onCodeSlotChange = (): void => {
    const slot = this._codeSlot;
    if (!slot) return;

    for (const element of slot.assignedElements({ flatten: true })) {
      const tag = element.tagName.toLowerCase();
      if (tag !== 'ui-code-block' && tag !== 'ui-code-group') continue;
      element.setAttribute('embedded', '');
    }
  };

  private get _groupAriaLabel(): string {
    const label = this.label.trim();
    return label !== '' ? label : 'コード プレビュー';
  }

  override render() {
    return html`
      <div class="root" role="group" aria-label="${this._groupAriaLabel}">
        <div class="header">
          <span class="header-label">${this.label.trim()}</span>
          <div class="header-toolbar">
            <slot name="toolbar" @slotchange="${this._onToolbarSlotChange}"></slot>
          </div>
        </div>

        <div class="preview-area">
          <slot name="preview"></slot>
        </div>

        <div class="code-area">
          <slot @slotchange="${this._onCodeSlotChange}"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-code-preview': CodePreview;
  }
}
