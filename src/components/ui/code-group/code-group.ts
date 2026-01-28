import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { t } from '../../../lib/i18n.js';

/**
 * ui-code-group - コードブロックグループ（タブ切り替え）
 * 
 * Linear/Raycast風のモダンなタブインターフェースを提供します。
 * WAI-ARIA Tabsパターンに完全準拠。
 * 
 * ## 機能
 * - スライディングインジケーター付きタブ切り替え
 * - フルキーボードナビゲーション（Arrow, Home, End, Escape）
 * - ダークモード・ハイコントラストモード対応
 * - prefers-reduced-motion 対応
 * 
 * ## キーボード操作
 * - `ArrowLeft/Right`: タブ間を移動（ラップアラウンド）
 * - `Home/End`: 最初/最後のタブへジャンプ
 * - `Tab`: タブパネル内のフォーカス可能な要素（ボタンなど）へ移動
 * - `Escape`: タブパネル内の要素から対応するタブボタンへフォーカス復帰
 * 
 * @element ui-code-group
 * @fires tab-change - タブが変更された時に発火 `{ activeTab: number, label: string }`
 * 
 * @slot - コードブロック（ui-code-block）要素を配置
 * 
 * @example
 * ```html
 * <ui-code-group .labels=${['npm', 'yarn', 'pnpm']}>
 *   <ui-code-block language="bash">npm install</ui-code-block>
 *   <ui-code-block language="bash">yarn add</ui-code-block>
 *   <ui-code-block language="bash">pnpm add</ui-code-block>
 * </ui-code-group>
 * ```
 */
@customElement('ui-code-group')
export class UiCodeGroup extends LitElement {
  static override styles = css`
    :host {
      display: block;
      
      --code-group-bg: var(--color-background-subtle);
      --code-group-border: var(--color-border);
      --tabs-bg: var(--color-background);
      --tabs-border: var(--color-border);
      --tab-color: var(--color-foreground-muted);
      --tab-color-hover: var(--color-foreground);
      --tab-color-active: var(--color-primary);
      --indicator-bg: var(--color-primary);
    }

    .code-group {
      border: var(--border-width-1) solid var(--code-group-border);
      border-radius: var(--radius-lg);
      background-color: var(--code-group-bg);
      overflow: hidden;
    }

    /* タブリスト */
    .tabs {
      display: flex;
      gap: var(--space-1);
      background-color: var(--tabs-bg);
      border-bottom: var(--border-width-1) solid var(--tabs-border);
      padding: var(--space-1) var(--space-2) 0;
      position: relative; /* インジケーター配置用 */
      overflow-x: auto; /* 横スクロール対応 */
      scrollbar-width: none; /* スクロールバー隠し */
    }
    
    .tabs::-webkit-scrollbar {
      display: none;
    }

    /* タブボタン */
    .tab {
      position: relative;
      padding: var(--space-2) var(--space-4);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--tab-color);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: color var(--duration-normal) var(--ease-out);
      outline: none;
      z-index: 1; /* インジケーターより上に */
      flex-shrink: 0; /* 縮まないように */
      transform-origin: center;
    }

    .tab:hover {
      color: var(--tab-color-hover);
    }

    /* クリック時の押し込みアニメーション */
    .tab:active {
      transform: var(--scale-subtle);
    }

    /* フォーカスリング */
    .tab:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-primary);
      outline-offset: var(--focus-ring-offset);
      border-radius: var(--radius-sm);
      z-index: 10;
    }

    /* アクティブタブ */
    .tab[aria-selected="true"] {
      color: var(--tab-color-active);
    }

    /* スライディングインジケーター */
    .indicator {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      background-color: var(--indicator-bg);
      transition: 
        transform var(--duration-normal) var(--ease-out),
        width var(--duration-normal) var(--ease-out);
      transform: translateX(var(--indicator-x));
      width: var(--indicator-width);
      pointer-events: none;
      z-index: 2;
    }

    /* prefers-reduced-motion対応 */
    @media (prefers-reduced-motion: reduce) {
      .tab,
      .indicator {
        transition: none;
      }
    }

    @media (prefers-contrast: more) {
      .tab:focus-visible {
        outline-width: var(--focus-ring-width);
      }
      
      .code-group {
        border-width: 2px;
      }
    }

    /* タブパネル */
    .tab-panel {
      display: none;
    }

    .tab-panel[aria-hidden="false"] {
      display: block;
    }
  `;

  @property({ type: Array })
  labels: string[] = [];

  @property({ type: Number })
  activeTab = 0;

  @state()
  private _tabCount = 0;

  @query('.tabs')
  private _tabsContainer!: HTMLElement;

  private _resizeObserver: ResizeObserver | null = null;

  override connectedCallback() {
    super.connectedCallback();
  }

  override firstUpdated() {
    this._updateIndicator();
    
    // リサイズ監視（タブ幅が変わったときにインジケーターを追従させる）
    this._resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this._updateIndicator());
    });
    this._resizeObserver.observe(this);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
  }
  
  override updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    if (changedProperties.has('activeTab')) {
      this._updateIndicator();
      // アクティブなタブが見えるようにスクロール
      const tabs = this.shadowRoot?.querySelectorAll<HTMLElement>('.tab');
      const activeElement = tabs?.[this.activeTab];
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  private _updateIndicator() {
    const tabs = this.shadowRoot?.querySelectorAll<HTMLElement>('.tab');
    if (!tabs || tabs.length === 0 || !this._tabsContainer) return;

    const activeElement = tabs[this.activeTab];
    if (activeElement) {
      const parentRect = this._tabsContainer.getBoundingClientRect();
      const rect = activeElement.getBoundingClientRect();
      const scrollLeft = this._tabsContainer.scrollLeft;
      
      // 相対位置計算（スクロール対応）
      const x = rect.left - parentRect.left + scrollLeft; 
      const width = rect.width;

      // CSS変数をホストにセットしてインジケーターを動かす
      this.style.setProperty('--indicator-x', `${x}px`);
      this.style.setProperty('--indicator-width', `${width}px`);
    }
  }

  private _handleSlotChange() {
    // Light DOMの直接の子要素をすべて取得
    const children = Array.from(this.children);
    
    // スロット属性の割り当て
    children.forEach((el, index) => {
      const slotName = `panel-${index}`;
      // 属性が違っていれば更新
      if (el.getAttribute('slot') !== slotName) {
        el.setAttribute('slot', slotName);
      }
    });

    // タブ数が変わった場合のみ更新
    if (this._tabCount !== children.length) {
      this._tabCount = children.length;
      
      // ラベルが未設定の場合、要素数に合わせてデフォルトラベルを生成
      if (this.labels.length === 0) {
        this.labels = children.map((el, i) => {
          const codeBlock = el as HTMLElement;
          return codeBlock.getAttribute('filename') 
              || codeBlock.getAttribute('language') 
              || `Tab ${i + 1}`;
        });
      }
    }
    
    this.requestUpdate();
  }

  private _handleTabClick(index: number) {
    if (this.activeTab === index) return;

    this.activeTab = index;
    this._dispatchTabChange();
  }

  private _handleKeyDown(e: KeyboardEvent) {
    let newIndex = this.activeTab;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = (this.activeTab + 1) % this.labels.length;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = (this.activeTab - 1 + this.labels.length) % this.labels.length;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = this.labels.length - 1;
        break;
      default:
        return;
    }

    if (newIndex !== this.activeTab) {
      this.activeTab = newIndex;
      this._dispatchTabChange();

      this.updateComplete.then(() => {
        const tabs = this.shadowRoot?.querySelectorAll('[role="tab"]');
        const newTab = tabs?.[newIndex] as HTMLElement;
        newTab?.focus();
      });
    }
  }

  private _dispatchTabChange() {
    this.dispatchEvent(new CustomEvent('tab-change', {
      bubbles: true,
      composed: true,
      detail: {
        activeTab: this.activeTab,
        label: this.labels[this.activeTab],
      },
    }));
  }

  /**
   * タブパネル内でEscapeキーが押された時のハンドラー
   * 対応するタブボタンにフォーカスを戻す（フォーカストラップ）
   */
  private _handlePanelKeyDown(e: KeyboardEvent, panelIndex: number) {
    if (e.key === 'Escape') {
      e.preventDefault();
      const tabs = this.shadowRoot?.querySelectorAll('[role="tab"]');
      const targetTab = tabs?.[panelIndex] as HTMLElement;
      targetTab?.focus();
    }
  }

  override render() {
    return html`
      <div class="code-group">
        <!-- タブリスト -->
        <div 
          class="tabs" 
          role="tablist" 
          aria-label="${t('codegroup.codeSample')}"
          @keydown=${this._handleKeyDown}
        >
          ${this.labels.map((label, index) => html`
            <button
              role="tab"
              id="tab-${index}"
              aria-selected="${this.activeTab === index}"
              aria-controls="panel-${index}"
              tabindex="${this.activeTab === index ? 0 : -1}"
              class="tab"
              @click=${() => this._handleTabClick(index)}
            >
              ${label}
            </button>
          `)}
          <div class="indicator"></div>
        </div>

        <!-- タブパネル -->
        ${Array.from({ length: this._tabCount }).map((_, index) => html`
          <div
            role="tabpanel"
            id="panel-${index}"
            aria-labelledby="tab-${index}"
            aria-hidden="${this.activeTab !== index}"
            class="tab-panel"
            @keydown=${(e: KeyboardEvent) => this._handlePanelKeyDown(e, index)}
          >
            <slot name="panel-${index}"></slot>
          </div>
        `)}

        <!-- 初期要素検知用のデフォルトスロット -->
        <slot @slotchange=${this._handleSlotChange} style="display: none;"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-code-group': UiCodeGroup;
  }
}
