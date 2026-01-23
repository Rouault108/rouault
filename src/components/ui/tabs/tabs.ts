import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * ui-tabs - アクセシブルなタブコンテナ
 * 
 * @fires tab-change - タブが変更されたときに発火 { detail: { tabId: string } }
 * 
 * @slot tab - タブボタンを配置するスロット（ui-tab コンポーネント）
 * @slot panel - タブパネルを配置するスロット（ui-tab-panel コンポーネント）
 */
@customElement('ui-tabs')
export class UiTabs extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, sans-serif);
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: var(--space-4, 1rem);
    }

    [role="tablist"] {
      display: flex;
      gap: var(--space-1, 0.25rem);
      border-bottom: 1px solid var(--color-border, #e5e7eb);
      position: relative;
    }

    /* アクティブインジケーター (Underline型) */
    :host([variant="underline"]) [role="tablist"]::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      height: 2px;
      background: var(--color-primary, #3b82f6);
      transform: translateX(var(--indicator-left, 0px));
      width: var(--indicator-width, 0px);
      transition:
        transform var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        width var(--motion-duration, 200ms) var(--motion-easing, ease-out);
    }

    /* Segmented variant */
    :host([variant="segmented"]) [role="tablist"] {
      background: var(--bg-surface-1, #f3f4f6);
      border-radius: var(--radius-md, 0.375rem);
      padding: var(--space-1, 0.25rem);
      border-bottom: none;
      gap: var(--space-1, 0.25rem);
    }

    /* アクティブインジケーター (Segmented型) */
    :host([variant="segmented"]) [role="tablist"]::after {
      content: '';
      position: absolute;
      top: var(--space-1, 0.25rem);
      left: var(--space-1, 0.25rem);
      height: calc(100% - var(--space-1, 0.25rem) * 2);
      background: var(--color-background, #ffffff);
      border-radius: var(--radius-sm, 0.25rem);
      box-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
      transform: translateX(var(--indicator-left, 0px));
      width: var(--indicator-width, 0px);
      transition:
        transform var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        width var(--motion-duration, 200ms) var(--motion-easing, ease-out);
      z-index: 0;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      [role="tablist"] {
        border-bottom-color: var(--color-border, #27272a);
      }

      :host([variant="underline"]) [role="tablist"]::after {
        background: var(--color-primary, #60a5fa);
      }

      :host([variant="segmented"]) [role="tablist"] {
        background: var(--bg-surface-1, #171717);
      }

      :host([variant="segmented"]) [role="tablist"]::after {
        background: var(--bg-surface-2, #262626);
      }
    }

    :host-context([data-theme='dark']) [role="tablist"] {
      border-bottom-color: var(--color-border, #27272a);
    }

    :host-context([data-theme='dark']):host([variant="underline"]) [role="tablist"]::after {
      background: var(--color-primary, #60a5fa);
    }

    :host-context([data-theme='dark']):host([variant="segmented"]) [role="tablist"] {
      background: var(--bg-surface-1, #171717);
    }

    :host-context([data-theme='dark']):host([variant="segmented"]) [role="tablist"]::after {
      background: var(--bg-surface-2, #262626);
    }

    /* prefers-reduced-motion対応（インジケーター） */
    @media (prefers-reduced-motion: reduce) {
      [role="tablist"]::after {
        transition: none;
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'underline' | 'segmented' = 'underline';

  @property({ type: String, attribute: 'aria-label' })
  override ariaLabel = 'タブ';

  @state()
  private _selectedTabId: string | null = null;

  @state()
  private _tabs: HTMLElement[] = [];

  @state()
  private _panels: HTMLElement[] = [];

  private _tabClickHandler = (e: Event) => {
    const customEvent = e as CustomEvent;
    const tabId = customEvent.detail.tabId;
    if (tabId) {
      this._selectTab(tabId);
    }
  };

  private _resizeObserver: ResizeObserver | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this._handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeyDown);
    
    // イベントリスナーのクリーンアップ
    this._tabs.forEach((tab) => {
      tab.removeEventListener('tab-click', this._tabClickHandler);
    });

    // ResizeObserver のクリーンアップ
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  override firstUpdated() {
    this._collectTabsAndPanels();
    if (!this._selectedTabId && this._tabs.length > 0) {
      const firstNonDisabledTab = this._tabs.find(
        (tab) => !tab.hasAttribute('disabled')
      );
      if (firstNonDisabledTab) {
        const tabId = firstNonDisabledTab.getAttribute('tab-id');
        if (tabId) {
          this._selectTab(tabId);
        }
      }
    }

    // アクティブインジケーターの位置を監視
    this._setupResizeObserver();
  }

  private _setupResizeObserver() {
    this._resizeObserver = new ResizeObserver(() => {
      // ウィンドウサイズ変更時にインジケーターを更新
      if (this._selectedTabId) {
        this._updateActiveIndicator();
      }
    });
    this._resizeObserver.observe(this);
  }

  private _collectTabsAndPanels() {
    const tabSlot = this.shadowRoot?.querySelector('slot[name="tab"]') as HTMLSlotElement;
    const panelSlot = this.shadowRoot?.querySelector('slot[name="panel"]') as HTMLSlotElement;

    if (tabSlot) {
      this._tabs = tabSlot.assignedElements() as HTMLElement[];
    }

    if (panelSlot) {
      this._panels = panelSlot.assignedElements() as HTMLElement[];
    }

    // タブにクリックリスナーを設定
    this._tabs.forEach((tab) => {
      tab.addEventListener('tab-click', this._tabClickHandler);
    });
  }

  private _selectTab(tabId: string) {
    const previousTabId = this._selectedTabId;
    this._selectedTabId = tabId;

    // すべてのタブの状態を更新
    this._tabs.forEach((tab) => {
      const currentTabId = tab.getAttribute('tab-id');
      if (tab instanceof UiTab) {
        tab.selected = currentTabId === tabId;
      }
    });

    // すべてのパネルの状態を更新
    this._panels.forEach((panel) => {
      const panelTabId = panel.getAttribute('tab-id');
      if (panel instanceof UiTabPanel) {
        panel.active = panelTabId === tabId;
      }
    });

    // イベントを発火（初回選択時は発火しない）
    if (previousTabId !== null) {
      this.dispatchEvent(
        new CustomEvent('tab-change', {
          detail: { tabId },
          bubbles: true,
          composed: true,
        })
      );
    }

    this.requestUpdate();
    
    // アクティブインジケーターを更新
    this.updateComplete.then(() => {
      this._updateActiveIndicator();
    });
  }

  private _updateActiveIndicator() {
    const selectedTab = this._tabs.find(
      (tab) => tab.getAttribute('tab-id') === this._selectedTabId
    );

    if (!selectedTab) {
      // 選択タブがない場合はインジケーターを非表示
      this.style.setProperty('--indicator-width', '0px');
      return;
    }

    const tablistRect = this.shadowRoot?.querySelector('[role="tablist"]')?.getBoundingClientRect();
    const tabRect = selectedTab.getBoundingClientRect();

    if (!tablistRect) return;

    if (this.variant === 'underline') {
      // Underline型: タブリストの左端からの相対位置
      const left = tabRect.left - tablistRect.left;
      const width = tabRect.width;

      this.style.setProperty('--indicator-left', `${left}px`);
      this.style.setProperty('--indicator-width', `${width}px`);
    } else if (this.variant === 'segmented') {
      // Segmented型: パディング分を考慮
      const padding = parseFloat(getComputedStyle(this).getPropertyValue('--space-1') || '0.25rem');
      const paddingPx = padding * 16; // remをpxに変換（仮定: 1rem = 16px）
      
      const left = tabRect.left - tablistRect.left - paddingPx;
      const width = tabRect.width;

      this.style.setProperty('--indicator-left', `${left}px`);
      this.style.setProperty('--indicator-width', `${width}px`);
    }
  }

  private _handleKeyDown = (e: KeyboardEvent) => {
    if (!this._selectedTabId) return;

    const currentIndex = this._tabs.findIndex(
      (tab) => tab.getAttribute('tab-id') === this._selectedTabId
    );

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = this._getNextEnabledTabIndex(currentIndex, 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = this._getNextEnabledTabIndex(currentIndex, -1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = this._getNextEnabledTabIndex(-1, 1);
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = this._getNextEnabledTabIndex(this._tabs.length, -1);
    }

    if (nextIndex !== currentIndex) {
      const nextTab = this._tabs[nextIndex];
      const nextTabId = nextTab?.getAttribute('tab-id');
      if (nextTabId) {
        this._selectTab(nextTabId);
        nextTab?.focus();
      }
    }
  };

  private _getNextEnabledTabIndex(startIndex: number, direction: 1 | -1): number {
    let index = startIndex + direction;
    const length = this._tabs.length;

    while (index >= 0 && index < length) {
      const tab = this._tabs[index];
      if (!tab?.hasAttribute('disabled')) {
        return index;
      }
      index += direction;
    }

    return startIndex;
  }

  override render() {
    return html`
      <div class="container">
        <div role="tablist" aria-label="${this.ariaLabel}">
          <slot name="tab"></slot>
        </div>
        <div class="panels">
          <slot name="panel"></slot>
        </div>
      </div>
    `;
  }
}

/**
 * ui-tab - 個別のタブボタン
 * 
 * @fires tab-click - タブがクリックされたときに発火 { detail: { tabId: string } }
 */
@customElement('ui-tab')
export class UiTab extends LitElement {
  static override styles = css`
    /* ホスト要素 */
    :host {
      display: block;
    }

    /* タブボタン共通スタイル */
    [role="tab"] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--color-foreground-muted, #6b7280);
      font-family: inherit;
      font-size: var(--text-sm, 0.875rem);
      font-weight: var(--font-medium, 500);
      line-height: 1.5;
      cursor: pointer;
      user-select: none;
      position: relative;
      transition:
        color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        border-color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        background-color var(--motion-duration, 200ms) var(--motion-easing, ease-out);
    }

    /* タブをクリックした際の押し込みアニメーション */
    [role="tab"]:active:not([aria-disabled="true"]) {
      transform: scale(0.98);
    }

    /* タブにマウスを乗せた際のアニメーション */
    [role="tab"]:hover:not([aria-disabled="true"]) {
      color: var(--color-foreground, #111827);
    }

    [role="tab"]:focus-visible {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
      z-index: 1;
    }

    /* 選択状態 (Underline) */
    :host([variant="underline"]) [role="tab"][aria-selected="true"] {
      color: var(--color-primary, #3b82f6);
      border-bottom-color: var(--color-primary, #3b82f6);
    }

    /* Segmented variant */
    :host([variant="segmented"]) [role="tab"] {
      position: relative;
      z-index: 1;
      border-bottom: none;
      border-radius: var(--radius-sm, 0.25rem);
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    }

    :host([variant="segmented"]) [role="tab"][aria-selected="true"] {
      color: var(--color-foreground, #111827);
    }

    /* 無効状態 */
    [role="tab"][aria-disabled="true"] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* ダークモード */
    @media (prefers-color-scheme: dark) {
      [role="tab"]:hover:not([aria-disabled="true"]) {
        color: var(--color-foreground, #f9fafb);
      }

      :host([variant="underline"]) [role="tab"][aria-selected="true"] {
        color: var(--color-primary, #60a5fa);
        border-bottom-color: var(--color-primary, #60a5fa);
      }

      :host([variant="segmented"]) [role="tab"][aria-selected="true"] {
        color: var(--color-foreground, #f9fafb);
      }
    }

    :host-context([data-theme='dark']) [role="tab"]:hover:not([aria-disabled="true"]) {
      color: var(--color-foreground, #f9fafb);
    }

    :host-context([data-theme='dark']):host([variant="underline"]) [role="tab"][aria-selected="true"] {
      color: var(--color-primary, #60a5fa);
      border-bottom-color: var(--color-primary, #60a5fa);
    }

    :host-context([data-theme='dark']):host([variant="segmented"]) [role="tab"][aria-selected="true"] {
      color: var(--color-foreground, #f9fafb);
    }

    /* prefers-reduced-motion 対応 */
    @media (prefers-reduced-motion: reduce) {
      [role="tab"] {
        transition: none;
      }
    }
  `;

  @property({ type: String, attribute: 'tab-id' })
  tabId = '';

  @property({ type: Boolean, reflect: true })
  selected = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: String, reflect: true })
  variant: 'underline' | 'segmented' = 'underline';

  override connectedCallback() {
    super.connectedCallback();
    // 親の variant を継承
    const parent = this.closest('ui-tabs');
    if (parent) {
      this.variant = parent.variant;
    }
  }

  private _handleClick() {
    if (this.disabled) return;

    this.dispatchEvent(
      new CustomEvent('tab-click', {
        detail: { tabId: this.tabId },
        bubbles: true,
        composed: true,
      })
    );
  }

  override focus(options?: FocusOptions) {
    const button = this.shadowRoot?.querySelector('button');
    if (button) {
      button.focus(options);
    } else {
      super.focus(options);
    }
  }

  override render() {
    return html`
      <button
        role="tab"
        aria-selected="${this.selected ? 'true' : 'false'}"
        aria-disabled="${this.disabled}"
        tabindex="${this.selected ? '0' : '-1'}"
        @click="${this._handleClick}"
      >
        <slot></slot>
      </button>
    `;
  }
}

/**
 * ui-tab-panel - タブパネル
 */
@customElement('ui-tab-panel')
export class UiTabPanel extends LitElement {
  static override styles = css`
    :host {
      display: none;
    }

    :host([active]) {
      display: block;
    }
  `;

  @property({ type: String, attribute: 'tab-id' })
  tabId = '';

  @property({ type: Boolean, reflect: true })
  active = false;

  override render() {
    return html`
      <div role="tabpanel" aria-labelledby="${this.tabId}" ?hidden="${!this.active}">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-tabs': UiTabs;
    'ui-tab': UiTab;
    'ui-tab-panel': UiTabPanel;
  }
}
