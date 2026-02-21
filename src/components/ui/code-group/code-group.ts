import { css, html, LitElement, nothing } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
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
const INTENT_META_LABEL: Record<Exclude<CodeBlockIntent, 'neutral'>, string> = {
  valid: '正しい例',
  invalid: '誤り例',
};

let codeGroupId = 0;

@customElement('ui-code-group')
export class CodeGroup extends LitElement {
  static override styles = css`
    :host {
      --header-tools-width: 88px;
      --_code-group-mask-width: 36px;

      /* グループ内の Code Block は常に親コンテナ幅に収める */
      --ui-code-block-breakout-width: 100%;
      --ui-code-block-breakout-margin: 0;
      --ui-code-block-header-display: block;

      display: block;
      position: relative;
      width: var(--ui-code-group-width, 100%);
      margin-inline: var(--ui-code-group-margin-inline, 0);
      border: var(--border-style-subtle, 1px solid oklch(20% 0.03 250 / 0.12));
      border-radius: var(--radius-md, 6px);
      overflow: hidden;
      background: var(--bg-fill-muted, oklch(96% 0.01 250));
      page-break-inside: avoid;
      break-inside: avoid;
    }

    :host([data-ready]) {
      --ui-code-block-header-display: none;
    }

    .root {
      position: relative;
    }

    .code-group-header {
      display: none;
      position: relative;
      align-items: stretch;
      isolation: isolate;
      background: var(--bg-surface-2, oklch(100% 0 0));
      border-bottom: var(--border-width, 1px) solid
        var(--border-default, oklch(20% 0.03 250 / 0.16));
    }

    :host([data-ready]) .code-group-header {
      display: flex;
    }

    .tab-list {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: stretch;
      overflow-x: auto;
      overflow-y: visible;
      min-height: var(--control-min-touch, 44px);
      padding-inline-end: calc(var(--header-tools-width, 88px) + var(--space-2, 8px));
      scroll-padding-inline-end: calc(var(--header-tools-width, 88px) + var(--space-2, 8px));
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .tab-list::-webkit-scrollbar {
      display: none;
    }

    @media (hover: hover) {
      .tab-list {
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb, oklch(70% 0 0 / 0.3)) transparent;
      }

      .tab-list::-webkit-scrollbar {
        display: block;
        height: 12px;
      }

      .tab-list::-webkit-scrollbar-track {
        background: transparent;
      }

      .tab-list::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb, oklch(70% 0 0 / 0.3));
        border-radius: 9999px;
      }
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
      min-height: var(--control-min-touch, 44px);
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      position: relative;
      border-bottom: var(--border-width, 1px) solid transparent;
      transition: color var(--duration-fast, 70ms)
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
      background: var(--bg-fill-muted, oklch(96% 0.01 250));
      margin-bottom: -1px;
      border-bottom-color: var(--bg-fill-muted, oklch(96% 0.01 250));
      border-radius: var(--radius-md, 6px) var(--radius-md, 6px) 0 0;
      z-index: 2;
    }

    .header-tools {
      position: relative;
      z-index: 10;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      padding-inline-end: var(--space-2, 8px);
      background: var(--bg-surface-2, oklch(100% 0 0));
    }

    .header-tools::before {
      content: '';
      position: absolute;
      inset-inline-start: calc(-1 * var(--_code-group-mask-width, 36px));
      inset-block: 0;
      width: var(--_code-group-mask-width, 36px);
      background: linear-gradient(
        to right,
        transparent 0%,
        var(--bg-surface-2, oklch(100% 0 0)) 100%
      );
      pointer-events: none;
    }

    .header-meta {
      min-width: 0;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      color: var(--fg-muted, oklch(48% 0.01 250));
      font-size: var(--text-xs, 12px);
      font-family: var(--font-mono, ui-monospace, monospace);
      font-weight: var(--font-medium, 500);
      letter-spacing: var(--tracking-wide, 0.025em);
      white-space: nowrap;
    }

    .header-filename {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-intent {
      padding-inline: var(--space-1, 4px);
      border-radius: 9999px;
      border: 1px solid transparent;
    }

    .header-intent[data-intent='valid'] {
      color: var(--fg-success, oklch(60% 0.15 160));
      border-color: oklch(from var(--fg-success, oklch(60% 0.15 160)) l c h / 0.35);
      background: oklch(from var(--fg-success, oklch(60% 0.15 160)) l c h / 0.09);
    }

    .header-intent[data-intent='invalid'] {
      color: var(--fg-danger, oklch(55% 0.2 28));
      border-color: oklch(from var(--fg-danger, oklch(55% 0.2 28)) l c h / 0.35);
      background: oklch(from var(--fg-danger, oklch(55% 0.2 28)) l c h / 0.08);
    }

    .header-tools ui-copy-button {
      --_copy-button-icon-size: var(--icon-sm, 14px);
      opacity: 0;
      pointer-events: none;
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
      .header-tools ui-copy-button {
        opacity: var(--opacity-link-touch, 0.75);
        pointer-events: auto;
      }
    }

    .body {
      display: none;
      background: var(--bg-fill-muted, oklch(96% 0.01 250));
      border-top: var(--border-width, 1px) solid
        var(--border-default, oklch(20% 0.03 250 / 0.16));
      padding: 1px 1px var(--space-1, 4px);
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

    @media (max-width: 639.98px) {
      :host([data-ready]) {
        --ui-code-block-header-display: block;
      }

      .header-filename {
        display: none;
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
        border-bottom: 3px solid Canvas !important;
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }

      .header-intent {
        color: CanvasText !important;
        border-color: CanvasText !important;
        background: transparent !important;
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

  @state()
  private _blocks: CodeBlockHost[] = [];

  @state()
  private _activeIndex = 0;

  @state()
  private _copyValue = '';

  @state()
  private _copyLabel = 'コードをコピー';

  @state()
  private _showFilenameMeta = false;

  @state()
  private _metaFilename = '';

  @state()
  private _metaIntent = '';

  @state()
  private _metaIntentKind: CodeBlockIntent = 'neutral';

  @state()
  private _copyRenderKey = 0;

  private readonly _uid = ++codeGroupId;

  private readonly _tabButtons: HTMLButtonElement[] = [];

  private readonly _tabClickHandlers = new Map<HTMLButtonElement, EventListener>();

  private _mutationObserver?: MutationObserver;

  private _headerToolsResizeObserver?: ResizeObserver;

  private _isComposing = false;

  override connectedCallback(): void {
    super.connectedCallback();

    this._mutationObserver = new MutationObserver(() => {
      if (this._isComposing) return;
      this._composeFromLightDom();
    });

    this._mutationObserver.observe(this, {
      childList: true,
      subtree: false,
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

  override updated(): void {
    if (this._headerToolsEl) {
      this._headerToolsResizeObserver?.observe(this._headerToolsEl);
      this._syncHeaderToolsWidth();
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
        this._showFilenameMeta = false;
        this._metaFilename = '';
        this._metaIntent = '';
        this._metaIntentKind = 'neutral';
        return;
      }

      this._createTabButtons(blocks);
      this._configurePanels(blocks);

      const safeIndex = this._clampIndex(this._activeIndex, blocks.length);
      this._activeIndex = safeIndex;

      this.setAttribute('data-ready', '');
      this._applySelection(safeIndex, false);
      this._syncHeaderToolsWidth();
    } finally {
      this._isComposing = false;
    }
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
      block.setAttribute('aria-roledescription', 'コードパネル');
      block.setAttribute('headless', '');

      if (index === 0) {
        block.removeAttribute('data-panel-after-first');
      } else {
        block.setAttribute('data-panel-after-first', '');
      }
    });
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

    this._syncHeaderMeta(activeBlock);
    this._syncCopyPayload(activeBlock);
  }

  private _syncHeaderMeta(activeBlock: CodeBlockHost): void {
    const descriptor = this._resolveTabDescriptor(activeBlock);
    const filename = this._readFilename(activeBlock);
    const intent = this._normalizeIntent(this._readIntent(activeBlock));

    this._showFilenameMeta = filename !== '' && descriptor.source !== 'filename';
    this._metaFilename = filename;
    this._metaIntentKind = intent;
    this._metaIntent = intent === 'neutral' ? '' : INTENT_META_LABEL[intent];
  }

  private _syncCopyPayload(activeBlock: CodeBlockHost): void {
    const contextName = this._resolveCopyContextName(activeBlock);
    this._copyLabel = contextName === DEFAULT_TAB_LABEL ? 'コードをコピー' : `${contextName} のコードをコピー`;

    if (typeof activeBlock.getCodeContent === 'function') {
      this._copyValue = activeBlock.getCodeContent();
      return;
    }

    this._copyValue = this._extractFallbackCode(activeBlock);
  }

  private _resolveCopyContextName(block: CodeBlockHost): string {
    const filename = this._readFilename(block);
    if (filename !== '') return filename;

    const lang = this._readLang(block);
    if (lang !== '') return lang;

    return DEFAULT_TAB_LABEL;
  }

  private _extractFallbackCode(block: CodeBlockHost): string {
    const pre = block.querySelector('pre');
    if (!pre) return '';

    const code = pre.querySelector('code') ?? pre;
    return code.textContent.replace(/\r\n?/g, '\n');
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
    if (headerToolsWidth > 0) {
      tabList.scrollLeft += headerToolsWidth;
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

  private get _tabListAriaLabel(): string {
    const explicit = this.getAttribute('aria-label')?.trim();
    if (explicit && explicit !== '') return explicit;
    return 'コードグループ';
  }

  private _renderHeaderMeta() {
    if (!this._showFilenameMeta && this._metaIntent === '') return nothing;

    return html`
      <span class="header-meta">
        ${this._showFilenameMeta
          ? html`<span class="header-filename" title="${this._metaFilename}">${this._metaFilename}</span>`
          : nothing}
        ${this._metaIntent !== ''
          ? html`<span class="header-intent" data-intent="${this._metaIntentKind}">${this._metaIntent}</span>`
          : nothing}
      </span>
    `;
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
          </div>

          <div class="header-tools">
            ${this._renderHeaderMeta()}
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
