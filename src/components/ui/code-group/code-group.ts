import { LitElement, css, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

/**
 * ui-code-group - コードブロックグループ（タブ切り替え）
 * 
 * @element ui-code-group
 * @fires tab-change - タブが変更された時に発火
 * 
 * @slot - コードブロック（ui-code-block）
 */
@customElement('ui-code-group')
export class UiCodeGroup extends LitElement {
  static override styles = css`
    :host {
      display: block;
      
      /* Local CSS variables (design-system.md準拠) */
      --duration-normal: 200ms;
      --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
      
      /* ダークモード対応（変数で一元管理） */
      --code-group-bg: var(--color-background-subtle, #f9fafb);
      --code-group-border: var(--color-border, #e5e7eb);
      --tabs-bg: var(--color-background, #ffffff);
      --tabs-border: var(--color-border, #e5e7eb);
      --tab-color: var(--color-foreground-muted, #6b7280);
      --tab-color-hover: var(--color-foreground, #111827);
      --tab-color-active: var(--color-primary, #3b82f6);
      --indicator-bg: var(--color-primary, #3b82f6);
    }

    /* ダークモード変数オーバーライド */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        --code-group-bg: var(--color-background-subtle, #171717);
        --code-group-border: var(--color-border, #27272a);
        --tabs-bg: var(--color-background, #0a0a0a);
        --tabs-border: var(--color-border, #27272a);
        --tab-color: var(--color-foreground-muted, #a1a1aa);
        --tab-color-hover: var(--color-foreground, #ededed);
        --tab-color-active: var(--color-primary, #60a5fa);
        --indicator-bg: var(--color-primary, #60a5fa);
      }
    }

    :host-context([data-theme="dark"]) {
      --code-group-bg: var(--color-background-subtle, #171717);
      --code-group-border: var(--color-border, #27272a);
      --tabs-bg: var(--color-background, #0a0a0a);
      --tabs-border: var(--color-border, #27272a);
      --tab-color: var(--color-foreground-muted, #a1a1aa);
      --tab-color-hover: var(--color-foreground, #ededed);
      --tab-color-active: var(--color-primary, #60a5fa);
      --indicator-bg: var(--color-primary, #60a5fa);
    }

    .code-group {
      border: 1px solid var(--code-group-border);
      border-radius: var(--radius-lg, 0.5rem);
      background-color: var(--code-group-bg);
      overflow: hidden;
    }

    /* タブリスト */
    .tabs {
      display: flex;
      gap: var(--space-1, 0.25rem); /* Linear風: タブ間に適度な余白 */
      background-color: var(--tabs-bg);
      border-bottom: 1px solid var(--tabs-border);
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem) 0;
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
      padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: var(--text-sm, 0.8125rem);
      font-weight: var(--font-medium, 500);
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

    /* クリック時の押し込みアニメーション（Linear/Raycast準拠） */
    .tab:active {
      transform: scale(0.98);
    }

    /* フォーカスリング（design-system.md準拠: outline-offset: 2px） */
    .tab:focus-visible {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
      border-radius: var(--radius-sm, 0.25rem);
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
      transform: translateX(var(--indicator-x, 0));
      width: var(--indicator-width, 0);
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

  @property({ type: String, attribute: 'aria-label' })
  override ariaLabel = 'コードサンプル';

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
  
  override updated(changedProperties: Map<string, any>) {
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
        this.labels = children.map((_, i) => `Tab ${i + 1}`);
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

  override render() {
    return html`
      <div class="code-group">
        <!-- タブリスト -->
        <div 
          class="tabs" 
          role="tablist" 
          aria-label="${this.ariaLabel}"
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
