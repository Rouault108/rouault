import type { PropertyValues } from 'lit';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { t } from '../../../lib/i18n.js';

/**
 * ui-preview - コードとその実行結果（プレビュー）を表示するコンポーネント
 * 
 * @element ui-preview
 * @fires view-mode-change - 表示モードが変更された時に発火
 * 
 * @slot preview - プレビュー描画コンテンツ
 * @slot - コードブロック（ui-code-block または ui-code-group）
 * 
 * ## 使用例
 * 
 * ### 基本的な使用
 * ```html
 * <ui-preview>
 *   <div slot="preview">
 *     <button>Click me</button>
 *   </div>
 *   <ui-code-block language="html">
 *     <button>Click me</button>
 *   </ui-code-block>
 * </ui-preview>
 * ```
 * 
 * ### コードグループとの組み合わせ
 * ```html
 * <ui-preview>
 *   <div slot="preview">
 *     <button class="btn">Click me</button>
 *   </div>
 *   <ui-code-group .labels=${['HTML', 'CSS']}>
 *     <ui-code-block language="html">...</ui-code-block>
 *     <ui-code-block language="css">...</ui-code-block>
 *   </ui-code-group>
 * </ui-preview>
 * ```
 */
@customElement('ui-preview')
export class UiPreview extends LitElement {
  static override styles = css`
    :host {
      display: block;
      
      /* Design Tokens - Spacing (design-system.md) */
      --preview-toggle-size: var(--space-8, 2rem); /* 32px */
      --preview-min-height: calc(var(--space-8, 2rem) * 3.75); /* 120px */
      --preview-area-padding: var(--space-6, 1.5rem);
      --preview-container-radius: var(--radius-lg, 0.5rem);
      
      /* Design Tokens - Motion */
      --motion-duration: var(--duration-normal);
      --motion-easing: var(--ease-out);
      
      /* Color Variables - Mode Independent (Handled by tokens.css) */
      --preview-bg: var(--color-background);
      --preview-surface: var(--color-background-subtle);
      --preview-border: var(--color-border);
      --preview-border-hover: var(--color-border-hover);
      
      /* Toggle Button Colors */
      --toggle-bg: transparent;
      --toggle-bg-hover: var(--color-background);
      --toggle-bg-active: var(--color-background-subtle);
      --toggle-color: var(--color-foreground-muted);
      --toggle-color-hover: var(--color-foreground);
      --toggle-color-active: var(--color-primary);
      --toggle-border: transparent;
      --toggle-border-hover: var(--color-border);
      
      /* Nested Radius: Inner = Outer - Padding */
      --preview-content-radius: calc(var(--preview-container-radius) - var(--preview-area-padding));
      
      /* Slot Content Overrides (no !important) */
      --slot-border: none;
      --slot-radius: 0;
    }

    /* Dark Mode - Overrides for specific interaction states */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        /* DarkモードではSurface-1上のボタンホバーはSurface-2にする（可視性確保） */
        --toggle-bg-hover: var(--bg-surface-2);
        --toggle-bg-active: var(--bg-surface-3);
      }
    }

    :host-context([data-theme="dark"]) {
      --toggle-bg-hover: var(--bg-surface-2);
      --toggle-bg-active: var(--bg-surface-3);
    }

    /* Container */
    .preview-container {
      display: flex;
      gap: var(--space-4, 1rem);
      border: 1px solid var(--preview-border);
      border-radius: var(--preview-container-radius);
      overflow: hidden;
      background: var(--preview-bg);
    }

    /* Horizontal Layout (Default) */
    .preview-container.horizontal {
      flex-direction: row;
    }

    /* Vertical Layout */
    .preview-container.vertical {
      flex-direction: column;
    }

    /* Split View - Horizontal */
    .preview-container.split.horizontal .preview-area {
      flex: 1;
      min-width: 0;
    }

    .preview-container.split.horizontal .code-area {
      flex: 1;
      min-width: 0;
    }

    /* Split View - Vertical */
    .preview-container.split.vertical .preview-area {
      flex: 0 0 auto;
    }

    .preview-container.split.vertical .code-area {
      flex: 1;
    }

    /* Preview Only Mode */
    .preview-container.preview-only {
      flex-direction: column;
    }

    .preview-container.preview-only .code-area {
      display: none;
    }

    .preview-container.preview-only .code-area.show-code {
      display: block;
    }

    /* Code Only Mode */
    .preview-container.code-only .preview-area {
      display: none;
    }

    /* Preview Area - Linear/Raycast Style: Clean Subtle Background */
    .preview-area {
      position: relative;
      padding: var(--preview-area-padding);
      background: var(--preview-surface);
      overflow: auto;
      min-height: var(--preview-min-height);
    }

    /* Horizontal Layout: Left Side */
    .preview-container.horizontal .preview-area {
      border-right: 1px solid var(--preview-border);
      border-radius: 0;
    }

    /* Vertical Layout: Top Side */
    .preview-container.vertical .preview-area {
      border-bottom: 1px solid var(--preview-border);
      border-radius: 0;
    }

    /* Preview Content Wrapper - Nested Radius Applied */
    .preview-content-wrapper {
      position: relative;
      background: var(--preview-bg);
      border-radius: var(--preview-content-radius);
      min-height: inherit;
    }

    /* Iframe (Sandboxed Mode) */
    .preview-iframe {
      width: 100%;
      height: 100%;
      min-height: inherit;
      border: none;
      background: var(--preview-bg);
      border-radius: var(--preview-content-radius);
    }

    /* Code Area */
    .code-area {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    /* Slotted Code Block - Use CSS Custom Properties Instead of !important */
    .code-area ::slotted(*) {
      flex: 1;
      border: var(--slot-border);
      border-radius: var(--slot-radius);
    }

    /* Code Toggle Button - Ghost/Minimal Style */
    .code-toggle-button {
      position: absolute;
      top: var(--space-3, 0.75rem);
      right: var(--space-3, 0.75rem);
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-1, 0.25rem);
      width: var(--preview-toggle-size);
      height: var(--preview-toggle-size);
      padding: 0;
      background: var(--toggle-bg);
      color: var(--toggle-color);
      border: 1px solid var(--toggle-border);
      border-radius: var(--radius-md, 0.375rem);
      cursor: pointer;
      transition: 
        background-color var(--motion-duration) var(--motion-easing),
        color var(--motion-duration) var(--motion-easing),
        border-color var(--motion-duration) var(--motion-easing),
        box-shadow var(--motion-duration) var(--motion-easing),
        transform var(--duration-fast, 100ms) var(--motion-easing);
    }

    .code-toggle-button:hover {
      background: var(--toggle-bg-hover);
      color: var(--toggle-color-hover);
      border-color: var(--toggle-border-hover);
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
    }

    .code-toggle-button:active {
      background: var(--toggle-bg-active);
      transform: scale(0.95);
      box-shadow: none;
    }

    .code-toggle-button:focus-visible {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
      background: var(--toggle-bg-hover);
      color: var(--toggle-color-hover);
      border-color: var(--toggle-border-hover);
    }

    /* Active State - Visual Indicator for Color Blind Users */
    .code-toggle-button.active {
      background: var(--toggle-bg-hover);
      color: var(--toggle-color-active);
      border-color: var(--toggle-border-hover);
    }

    /* Icon - Using Design Token */
    .code-toggle-button iconify-icon {
      font-size: var(--icon-md, 20px);
    }

    /* Accessibility: Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .code-toggle-button {
        transition: none;
      }
    }

    /* Responsive: Mobile-First Vertical Layout */
    @media (max-width: 768px) {
      .preview-container.horizontal {
        flex-direction: column;
      }

      .preview-container.horizontal .preview-area {
        border-right: none;
        border-bottom: 1px solid var(--preview-border);
      }
    }
  `;

  @property({ type: String })
  viewMode: 'split' | 'preview-only' | 'code-only' = 'split';

  @property({ type: String })
  orientation: 'horizontal' | 'vertical' = 'horizontal';

  @property({ type: String })
  previewHeight = 'auto';

  @property({ type: Boolean })
  sandboxed = false;

  @property({ type: String })
  previewTheme: 'auto' | 'light' | 'dark' = 'auto';

  @property({ type: Boolean })
  showCodeToggle = true;

  @state()
  private _showCode = false;

  override updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);

    if (changedProperties.has('viewMode')) {
      this._dispatchViewModeChange();
    }
  }

  private _updateIframeContent(e?: Event) {
    // イベントから直接スロットを取得するか、shadowRootからクエリで取得
    const slot = e?.target as HTMLSlotElement | undefined 
      ?? this.shadowRoot?.querySelector('slot[name="preview"]') as HTMLSlotElement | null;
    
    if (!slot) return;

    // iframeを再取得（slotchangeイベント時にはまだ_iframeが最新でない可能性）
    const iframe = this.shadowRoot?.querySelector('.preview-iframe') as HTMLIFrameElement | null;
    if (!iframe) return;

    const slotElements = slot.assignedElements();
    if (slotElements.length === 0) return;

    // スロットに割り当てられた要素のouterHTMLを取得
    const content = slotElements
      .map((el) => el.outerHTML)
      .join('\n');

    // iframe内のドキュメントを構築
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    const themeAttr = this.previewTheme !== 'auto' ? `data-theme="${this.previewTheme}"` : '';

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="ja" ${themeAttr}>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            padding: 1rem;
            background: transparent;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `);
    iframeDoc.close();
  }

  private _handleCodeToggle() {
    this._showCode = !this._showCode;
  }

  private _dispatchViewModeChange() {
    this.dispatchEvent(
      new CustomEvent('view-mode-change', {
        bubbles: true,
        composed: true,
        detail: {
          viewMode: this.viewMode,
        },
      }),
    );
  }

  override render() {
    const containerClasses = classMap({
      'preview-container': true,
      [this.viewMode]: true,
      [this.orientation]: true,
    });

    const codeAreaClasses = classMap({
      'code-area': true,
      'show-code': this._showCode,
    });

    const toggleButtonClasses = classMap({
      'code-toggle-button': true,
      'active': this._showCode,
    });

    const previewStyle = this.previewHeight !== 'auto' 
      ? `min-height: ${this.previewHeight};` 
      : '';

    const showToggle = this.viewMode === 'preview-only' && this.showCodeToggle;
    const toggleLabel = this._showCode ? t('preview.hideCode') : t('preview.showCode');

    return html`
      <div class="${containerClasses}">
        <!-- Preview Area -->
        ${this.viewMode !== 'code-only' ? html`
          <div 
            class="preview-area" 
            style="${previewStyle}"
            role="region"
            aria-label="${t('preview.codePreview')}"
          >
            ${showToggle ? html`
              <button
                class="${toggleButtonClasses}"
                @click=${this._handleCodeToggle}
                aria-label="${toggleLabel}"
                aria-expanded="${this._showCode}"
                aria-live="polite"
                title="${toggleLabel}"
              >
                <iconify-icon icon="lucide:code-2"></iconify-icon>
              </button>
            ` : nothing}

            ${this.sandboxed ? html`
              <iframe 
                class="preview-iframe" 
                sandbox="allow-scripts allow-same-origin"
                title="${t('preview.previewTitle')}"
              ></iframe>
              <!-- Hidden slot for content extraction -->
              <div style="display: none;" hidden>
                <slot name="preview" @slotchange=${this._updateIframeContent}></slot>
              </div>
            ` : html`
              <div 
                class="preview-content-wrapper"
                data-theme="${this.previewTheme !== 'auto' ? this.previewTheme : nothing}"
              >
                <slot name="preview"></slot>
              </div>
            `}
          </div>
        ` : nothing}

        <!-- Code Area -->
        ${this.viewMode !== 'preview-only' || this._showCode ? html`
          <div class="${codeAreaClasses}" role="region" aria-label="${t('preview.sourceCode')}">
            <slot></slot>
          </div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-preview': UiPreview;
  }
}
