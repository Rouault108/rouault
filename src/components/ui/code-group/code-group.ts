import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import '../../../lib/icons';
import '../codeblock/codeblock';
import '../copy-button/copy-button';

type CodeBlockIntent = 'neutral' | 'valid' | 'invalid';
type TabLabelSource = 'label' | 'filename' | 'lang' | 'fallback';

interface TabDescriptor {
  readonly label: string;
  readonly source: TabLabelSource;
}

interface CodeBlockHost extends HTMLElement {
  getCodeContent?: () => string;
}

const DEFAULT_TAB_LABEL = 'コード';
const COMPARISON_LABEL_BY_INTENT: Record<Exclude<CodeBlockIntent, 'neutral'>, string> = {
  valid: '正しい例',
  invalid: '誤り例',
};
let codeGroupId = 0;

@customElement('ui-code-group')
export class CodeGroup extends LitElement {
  static override styles = css`
    :host {
      --header-tools-width: 48px;

      /* グループ内の Code Block は常に親コンテナ幅に収める */
      --ui-code-block-breakout-width: 100%;
      --ui-code-block-breakout-margin: 0;
      --ui-code-block-padding: var(--space-3, 12px);
      --ui-code-block-header-display: block;

      display: block;
      container-type: inline-size;
      position: relative;
      width: var(--ui-code-group-width, 100%);
      margin-inline: var(--ui-code-group-margin-inline, 0);
      border: var(--border-style-subtle, 1px solid oklch(20% 0.03 250 / 0.12));
      border-radius: var(--radius-md, 6px);
      overflow: hidden;
      background: var(--bg-default, oklch(1 0 0));
      page-break-inside: avoid;
      break-inside: avoid;
    }

    :host([data-ready]) {
      --ui-code-block-header-display: none;
    }

    :host([embedded]) {
      border: none;
      border-radius: 0;
    }

    .root {
      position: relative;
    }

    .code-group-header {
      display: none;
      position: relative;
      align-items: stretch;
      isolation: isolate;
      // background: var(--bg-default, oklch(1 0 0));
    }

    :host([data-ready]) .code-group-header {
      display: flex;
    }

    .tab-list {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: stretch;
      background: var(--bg-default, oklch(1 0 0));
      overflow-x: auto;
      /* visible は overflow-x: auto によって auto に強制計算されるため clip に変更。
         clip はスクロールコンテナを生成しないため縦スクロールバーが出ない */
      overflow-y: clip;
      /* 選択タブの margin-bottom: -1px によるオーバーフロー（1px）と
         フォーカスリング（outline-offset + outline-width = デフォルト 4px）を
         クリップ境界外にレンダリングできるよう余白を確保する */
      overflow-clip-margin: calc(var(--focus-ring-offset, 2px) + var(--focus-ring-width, 2px) + 2px);
      min-height: 36px;
      /* フォーカスリングがスクロールコンテナ内部に収まるよう余白を確保。
         padding によってリングが .tab-list の padding-box 内に描画されるため、
         祖先の overflow: hidden によるクリップを回避できる */
      padding-block: 2px;
      padding-inline-start: calc(var(--focus-ring-offset, 2px) + var(--focus-ring-width, 2px));
      padding-inline-end: calc(var(--header-tools-width, 48px) + var(--space-1, 4px));
      /* フォーカス時のスクロール位置にフォーカスリング分の余白を確保 */
      scroll-padding-inline-start: calc(var(--focus-ring-offset, 2px) + var(--focus-ring-width, 2px));
      scroll-padding-inline-end: calc(var(--header-tools-width, 48px) + var(--space-1, 4px));
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .tab-list::-webkit-scrollbar {
      display: none;
    }

    .tab-list-spacer {
      flex: 0 0 calc(var(--header-tools-width, 48px) + var(--space-1, 4px));
      align-self: stretch;
      pointer-events: none;
    }

    ::slotted([slot='tab']) {
      appearance: none;
      border: none;
      margin: 0;
      background: transparent;
      color: var(--fg-muted, oklch(48% 0.01 250));
      font: inherit;
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      font-family: var(--font-sans);
      line-height: 1.3;
      padding-inline: var(--space-3, 12px);
      min-height: 36px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      position: relative;
      border-bottom: 2px solid transparent;
      transition:
        color var(--duration-fast, 70ms)
          var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms)
          var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    ::slotted([slot='tab']:hover) {
      color: var(--fg-default, oklch(20% 0.03 250));
    }

    ::slotted([slot='tab']:focus-visible) {
      outline: var(--focus-ring-width, 2px) solid
        var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
      border-radius: var(--radius-sm, 4px);
      z-index: 3;
    }

    ::slotted([slot='tab'][aria-selected='true']) {
      color: var(--fg-default, oklch(20% 0.03 250));
      border-bottom-width: 1px;
      border-bottom-color: currentColor;
    }

    .header-tools {
      position: relative;
      z-index: 10;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 0;
      padding-inline: var(--space-1, 4px);
      background: var(--bg-default, oklch(1 0 0));
    }

    .header-tools ui-copy-button {
      --_copy-button-icon-size: var(--icon-sm, 14px);
      opacity: 0.56;
      pointer-events: auto;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    :host([data-ready]:hover) .header-tools ui-copy-button,
    :host([data-ready]:focus-within) .header-tools ui-copy-button {
      opacity: 1;
      pointer-events: auto;
    }

    :host([data-ready]:focus-within) .header-tools ui-copy-button {
      transition-duration: var(--duration-instant, 0ms);
    }

    @media (hover: none) and (pointer: coarse) {
      .tab-list {
        padding-block: calc(var(--focus-ring-offset, 2px) + var(--focus-ring-width, 2px));
        /* モバイルではスクロールバーの代わりに純CSSのシャドウでスクロール可能性を示す */
        background:
          linear-gradient(
              to right,
              var(--bg-fill-muted, oklch(96% 0 0)) 30%,
              transparent 100%
            )
            0 0 / 24px 100% no-repeat local,
          linear-gradient(
              to left,
              var(--bg-fill-muted, oklch(96% 0 0)) 30%,
              transparent 100%
            )
            100% 0 / 24px 100% no-repeat local,
          radial-gradient(
              farthest-side at 0 50%,
              oklch(32% 0.03 250 / 0.2),
              transparent
            )
            0 0 / 12px 100% no-repeat scroll,
          radial-gradient(
              farthest-side at 100% 50%,
              oklch(32% 0.03 250 / 0.2),
              transparent
            )
            100% 0 / 12px 100% no-repeat scroll;
      }

      // ::slotted([slot='tab']) {
      //   min-height: var(--control-min-touch, 44px);
      // }

      .header-tools ui-copy-button {
        opacity: var(--opacity-link-touch, 0.75);
        pointer-events: auto;
      }
    }

    .body {
      display: none;
      background: var(--bg-default, oklch(1 0 0));
      padding-block: var(--ui-code-group-body-padding-block, 0);
      padding-inline: var(--ui-code-group-body-padding-inline, 0);
    }

    :host([data-ready]) .body {
      display: block;
    }

    .stack-slot {
      display: block;
    }

    :host([data-ready]) .stack-slot {
      display: none;
    }

    ::slotted([slot='panel']) {
      display: block;
      margin: 0;
    }

    ::slotted([slot='panel'][hidden]) {
      display: none !important;
    }

    @container (max-width: 639.98px) {
      :host([data-ready]) {
        --ui-code-block-header-display: block;
      }
    }

    @media (forced-colors: active) {
      :host {
        background: Canvas;
        border-color: CanvasText;
      }

      .code-group-header,
      .tab-list,
      .header-tools,
      .body {
        background: Canvas;
      }

      .code-group-header,
      .body {
        border-color: CanvasText;
      }

      ::slotted([slot='tab']) {
        border: var(--border-width, 1px) solid CanvasText;
        color: CanvasText;
      }

      ::slotted([slot='tab'][aria-selected='true']) {
        border-bottom-color: CanvasText !important;
      }
    }

    @media print {
      :host {
        width: 100% !important;
        margin-inline: 0 !important;
        background: transparent !important;
        border-color: #000 !important;
      }

      .code-group-header {
        display: none !important;
      }

      .body {
        display: block !important;
        background: transparent !important;
        border-top: 1px solid #000 !important;
        padding: 0 !important;
      }

      ::slotted([slot='panel']),
      ::slotted([slot='panel'][hidden]) {
        display: block !important;
      }

      ::slotted([slot='panel'][data-panel-after-first]) {
        margin-block-start: var(--space-4, 1rem);
      }
    }
  `;

  @query('.tab-list')
  private _tabListEl?: HTMLElement;

  @query('.header-tools')
  private _headerToolsEl?: HTMLElement;

  @property({ type: Boolean, reflect: true })
  embedded = false;

  @state()
  private _blocks: CodeBlockHost[] = [];

  @state()
  private _activeIndex = 0;

  @state()
  private _copyValue = '';

  @state()
  private _copyLabel = 'コードをコピー';

  @state()
  private _copyRenderKey = 0;

  private readonly _uid = ++codeGroupId;

  private readonly _tabButtons: HTMLButtonElement[] = [];

  private readonly _tabClickHandlers = new Map<HTMLButtonElement, EventListener>();

  private _mutationObserver?: MutationObserver;

  private _headerToolsResizeObserver?: ResizeObserver;

  private _isComposing = false;

  private _composeScheduled = false;

  override connectedCallback(): void {
    super.connectedCallback();

    this._mutationObserver = new MutationObserver((records) => {
      if (this._isComposing) return;
      if (!this._shouldRecompose(records)) return;
      this._scheduleComposeFromLightDom();
    });

    this._mutationObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['label', 'filename', 'lang', 'intent'],
    });

    this._headerToolsResizeObserver = new ResizeObserver(() => {
      this._syncHeaderToolsWidth();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._mutationObserver?.disconnect();
    this._headerToolsResizeObserver?.disconnect();
    this._cleanupTabButtons();
  }

  override firstUpdated(): void {
    this._composeFromLightDom();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (this._headerToolsEl) {
      this._headerToolsResizeObserver?.observe(this._headerToolsEl);
      this._syncHeaderToolsWidth();
    }

    if (changedProperties.has('embedded')) {
      this._applyEmbeddedMode();
    }
  }

  private _composeFromLightDom(): void {
    if (this._isComposing) return;
    this._isComposing = true;

    try {
      const blocks = this._collectCodeBlocks();
      this._cleanupTabButtons();
      this._blocks = blocks;

      if (blocks.length === 0) {
        this.removeAttribute('data-ready');
        this._activeIndex = 0;
        this._copyValue = '';
        this._copyLabel = 'コードをコピー';
        return;
      }

      this._createTabButtons(blocks);
      this._configurePanels(blocks);
      this._warnComparisonPairContract(blocks);

      const safeIndex = this._clampIndex(this._activeIndex, blocks.length);
      this._activeIndex = safeIndex;

      this.setAttribute('data-ready', '');
      this._applySelection(safeIndex, false);
      this._syncHeaderToolsWidth();
    } finally {
      this._isComposing = false;
    }
  }

  private _scheduleComposeFromLightDom(): void {
    if (this._composeScheduled) return;
    this._composeScheduled = true;

    queueMicrotask(() => {
      this._composeScheduled = false;
      if (!this.isConnected) return;
      if (this._isComposing) return;
      this._composeFromLightDom();
    });
  }

  private _shouldRecompose(records: readonly MutationRecord[]): boolean {
    for (const record of records) {
      if (record.type === 'attributes') {
        if (this._isDirectCodeBlock(record.target)) {
          return true;
        }
        continue;
      }

      if (record.type === 'childList') {
        const changedNodes = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)];
        if (record.target === this && changedNodes.some((node) => this._isCodeBlockElement(node))) {
          return true;
        }
      }
    }
    return false;
  }

  private _isCodeBlockElement(node: Node): node is HTMLElement {
    return node instanceof HTMLElement && node.tagName.toLowerCase() === 'ui-code-block';
  }

  private _isDirectCodeBlock(node: Node): node is HTMLElement {
    return this._isCodeBlockElement(node) && node.parentElement === this;
  }

  private _collectCodeBlocks(): CodeBlockHost[] {
    const blocks: CodeBlockHost[] = [];
    for (const child of Array.from(this.children)) {
      if (child.tagName.toLowerCase() !== 'ui-code-block') continue;
      blocks.push(child as CodeBlockHost);
    }
    return blocks;
  }

  private _cleanupTabButtons(): void {
    for (const [button, handler] of this._tabClickHandlers) {
      button.removeEventListener('click', handler);
    }
    this._tabClickHandlers.clear();

    for (const button of this._tabButtons) {
      if (button.parentElement === this) {
        button.remove();
      }
    }
    this._tabButtons.length = 0;
  }

  private _createTabButtons(blocks: readonly CodeBlockHost[]): void {
    const anchor = blocks[0] ?? null;

    blocks.forEach((block, index) => {
      const descriptor = this._resolveTabDescriptor(block);
      const panelId = this._resolvePanelId(block, index);

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = descriptor.label;
      button.setAttribute('slot', 'tab');
      button.setAttribute('role', 'tab');
      button.setAttribute('id', this._tabId(index));
      button.setAttribute('aria-controls', panelId);

      const onClick: EventListener = () => {
        this._selectTab(index, true);
      };

      button.addEventListener('click', onClick);
      this._tabClickHandlers.set(button, onClick);
      this._tabButtons.push(button);
      this.insertBefore(button, anchor);
    });
  }

  private _configurePanels(blocks: readonly CodeBlockHost[]): void {
    blocks.forEach((block, index) => {
      const panelId = this._resolvePanelId(block, index);

      block.id = panelId;
      block.setAttribute('slot', 'panel');
      block.setAttribute('role', 'tabpanel');
      block.setAttribute('aria-labelledby', this._tabId(index));
      block.removeAttribute('aria-roledescription');
      block.setAttribute('headless', '');
      this._syncPanelEmbedded(block);

      if (index === 0) {
        block.removeAttribute('data-panel-after-first');
      } else {
        block.setAttribute('data-panel-after-first', '');
      }
    });
  }

  private _applyEmbeddedMode(): void {
    for (const block of this._blocks) {
      this._syncPanelEmbedded(block);
    }
  }

  private _syncPanelEmbedded(block: CodeBlockHost): void {
    if (this.embedded) {
      block.setAttribute('embedded', '');
      return;
    }
    block.removeAttribute('embedded');
  }

  private _selectTab(index: number, emitEvent: boolean): void {
    if (index < 0 || index >= this._blocks.length) return;

    const previousIndex = this._activeIndex;
    this._activeIndex = index;
    this._applySelection(index, true);

    if (previousIndex !== index) {
      this._copyRenderKey += 1;
    }

    if (!emitEvent || previousIndex === index) return;

    this.dispatchEvent(
      new CustomEvent('ui-code-group-change', {
        detail: { index, prevIndex: previousIndex },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _applySelection(index: number, shouldScroll: boolean): void {
    const activeBlock = this._blocks[index];
    if (!activeBlock) return;

    this._tabButtons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.setAttribute('tabindex', selected ? '0' : '-1');
      if (selected && shouldScroll) {
        this._scrollTabIntoView(button);
      }
    });

    this._blocks.forEach((block, blockIndex) => {
      const isActive = blockIndex === index;

      block.toggleAttribute('data-panel-active', isActive);
      if (isActive) {
        block.removeAttribute('hidden');
        block.removeAttribute('aria-hidden');
      } else if (this.hasAttribute('data-ready')) {
        block.setAttribute('hidden', '');
        block.setAttribute('aria-hidden', 'true');
      }
    });

    this._syncCopyPayload(activeBlock);
  }

  private _syncCopyPayload(activeBlock: CodeBlockHost): void {
    const contextName = this._resolveCopyContextName(activeBlock);
    this._copyLabel = contextName === DEFAULT_TAB_LABEL ? 'コードをコピー' : `${contextName} のコードをコピー`;

    if (typeof activeBlock.getCodeContent === 'function') {
      this._copyValue = activeBlock.getCodeContent();
      return;
    }

    this._copyValue = '';
  }

  private _resolveCopyContextName(block: CodeBlockHost): string {
    const filename = this._readFilename(block);
    if (filename !== '') return filename;

    const lang = this._readLang(block);
    if (lang !== '') return lang;

    return DEFAULT_TAB_LABEL;
  }

  private _scrollTabIntoView(tab: HTMLElement): void {
    const tabList = this._tabListEl;
    if (!tabList) return;

    tab.scrollIntoView({
      behavior: 'instant' as ScrollBehavior,
      block: 'nearest',
      inline: 'nearest',
    });

    const headerToolsWidth = this._readHeaderToolsWidth();
    if (headerToolsWidth <= 0) return;

    const tabListRect = tabList.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const visibleInlineStart = tabListRect.left;
    const visibleInlineEnd = tabListRect.right - headerToolsWidth;

    if (tabRect.right > visibleInlineEnd) {
      tabList.scrollLeft += Math.ceil(tabRect.right - visibleInlineEnd);
    }

    if (tabRect.left < visibleInlineStart) {
      tabList.scrollLeft -= Math.ceil(visibleInlineStart - tabRect.left);
    }
  }

  private _syncHeaderToolsWidth(): void {
    if (!this._headerToolsEl) return;
    const width = Math.ceil(this._headerToolsEl.getBoundingClientRect().width);
    if (width <= 0) return;
    this.style.setProperty('--header-tools-width', `${String(width)}px`);
  }

  private _readHeaderToolsWidth(): number {
    const fromStyle = Number.parseFloat(
      getComputedStyle(this).getPropertyValue('--header-tools-width').trim(),
    );
    if (Number.isFinite(fromStyle) && fromStyle > 0) return fromStyle;

    if (!this._headerToolsEl) return 0;
    const measured = this._headerToolsEl.getBoundingClientRect().width;
    return Number.isFinite(measured) ? measured : 0;
  }

  private _resolvePanelId(block: HTMLElement, index: number): string {
    const existing = block.id.trim();
    if (existing !== '') return existing;
    return `ui-code-group-${String(this._uid)}-panel-${String(index)}`;
  }

  private _tabId(index: number): string {
    return `ui-code-group-${String(this._uid)}-tab-${String(index)}`;
  }

  private _clampIndex(index: number, length: number): number {
    if (length <= 0) return 0;
    if (index < 0) return 0;
    if (index >= length) return length - 1;
    return index;
  }

  private _resolveTabDescriptor(block: CodeBlockHost): TabDescriptor {
    const label = this._readLabel(block);
    if (label !== '') return { label, source: 'label' };

    const filename = this._readFilename(block);
    if (filename !== '') return { label: filename, source: 'filename' };

    const lang = this._readLang(block);
    if (lang !== '') return { label: lang, source: 'lang' };

    return { label: DEFAULT_TAB_LABEL, source: 'fallback' };
  }

  private _normalizeIntent(rawIntent: string): CodeBlockIntent {
    if (rawIntent === 'valid' || rawIntent === 'invalid') return rawIntent;
    return 'neutral';
  }

  private _readLabel(block: HTMLElement): string {
    return block.getAttribute('label')?.trim() ?? '';
  }

  private _readFilename(block: HTMLElement): string {
    return block.getAttribute('filename')?.trim() ?? '';
  }

  private _readLang(block: HTMLElement): string {
    return block.getAttribute('lang')?.trim() ?? '';
  }

  private _readIntent(block: HTMLElement): string {
    return block.getAttribute('intent')?.trim() ?? '';
  }

  private _onTabListKeyDown = (event: KeyboardEvent): void => {
    const target = event.composedPath()[0];
    if (!(target instanceof HTMLElement)) return;

    const currentIndex = this._tabButtons.indexOf(target as HTMLButtonElement);
    if (currentIndex === -1) return;

    const tabCount = this._tabButtons.length;
    if (tabCount === 0) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this._focusAndSelect((currentIndex - 1 + tabCount) % tabCount);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this._focusAndSelect((currentIndex + 1) % tabCount);
        break;
      case 'Home':
        event.preventDefault();
        this._focusAndSelect(0);
        break;
      case 'End':
        event.preventDefault();
        this._focusAndSelect(tabCount - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this._selectTab(currentIndex, true);
        break;
      default:
        break;
    }
  };

  private _focusAndSelect(index: number): void {
    const tab = this._tabButtons[index];
    if (!tab) return;
    tab.focus();
    this._selectTab(index, true);
  }

  private _warnComparisonPairContract(blocks: readonly CodeBlockHost[]): void {
    for (const block of blocks) {
      const intent = this._normalizeIntent(this._readIntent(block));
      if (intent === 'neutral') continue;

      const label = this._readLabel(block);
      const expected = COMPARISON_LABEL_BY_INTENT[intent];
      if (label === expected) continue;

      console.warn(
        `[ui-code-group] Comparison Pair Contract mismatch: intent="${intent}" expects label="${expected}", actual="${label}".`,
      );
    }
  }

  private get _tabListAriaLabel(): string {
    const explicit = this.getAttribute('aria-label')?.trim();
    if (explicit && explicit !== '') return explicit;
    return 'コードグループ';
  }

  override render() {
    return html`
      <div class="root">
        <div class="code-group-header">
          <div
            class="tab-list"
            role="tablist"
            aria-orientation="horizontal"
            aria-label="${this._tabListAriaLabel}"
            @keydown="${this._onTabListKeyDown}"
          >
            <slot name="tab"></slot>
            <span class="tab-list-spacer" aria-hidden="true"></span>
          </div>

          <div class="header-tools">
            ${keyed(
              this._copyRenderKey,
              html`
                <ui-copy-button
                  size="sm"
                  value="${this._copyValue}"
                  label="${this._copyLabel}"
                ></ui-copy-button>
              `,
            )}
          </div>
        </div>

        <div class="body">
          <slot name="panel"></slot>
        </div>

        <slot class="stack-slot"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-code-group': CodeGroup;
  }
}
