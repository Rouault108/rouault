import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../icon/icon.js';
import '../codeblock/codeblock';
import '../copy-button/copy-button';

type ActivationMode = 'auto' | 'manual';
type TabLabelSource = 'tab-label' | 'filename' | 'lang';

interface CodeBlockHost extends HTMLElement {
  copyable?: boolean;
  copyLabel?: string;
  filename?: string;
  getCodeContent?: () => string;
  groupKey?: string;
  lang: string;
  tabLabel?: string;
}

interface CopyButtonHost extends HTMLElement {
  disabled?: boolean;
  label?: string;
  resetState?: () => void;
  value?: string;
}

interface GroupItem {
  readonly block: CodeBlockHost;
  readonly copyContextLabel: string;
  readonly copyDisabled: boolean;
  readonly panelId: string;
  readonly tabId: string;
  readonly tabLabel: string;
  readonly tabLabelSource: TabLabelSource;
  readonly value: string;
}

interface CompositionResult {
  readonly blocks: CodeBlockHost[];
  readonly items: GroupItem[];
  readonly majorViolation: boolean;
}

const DEFAULT_COPY_CONTEXT = 'コード';
const DEFAULT_GROUP_LABEL = 'コードグループ';
const DEFAULT_COPY_BUTTON_LABEL = 'コードをコピー';
const FALSE_BOOLEAN_ATTRIBUTE_VALUES = new Set(['false', '0', 'off', 'no']);
const RECOMPOSE_TRIGGER_ATTRIBUTES = new Set([
  'group-key',
  'tab-label',
  'copy-label',
  'copyable',
  'filename',
  'lang',
  'id',
]);
const VALID_ACTIVATION_MODES = new Set<ActivationMode>(['auto', 'manual']);

let codeGroupId = 0;

@customElement('ui-code-group')
export class CodeGroup extends LitElement {
  static override styles = css`
    :host {
      --header-tools-width: 48px;
      --ui-code-surface-breakout-width: 100%;
      --ui-code-surface-breakout-margin: 0;
      --ui-code-surface-padding: var(--space-2, 8px);
      --ui-code-header-display: none;
      --ui-code-surface-radius-top: 0;
      --ui-code-surface-radius-bottom: 0;
      --ui-code-block-breakout-width: 100%;
      --ui-code-block-breakout-margin: 0;
      --ui-code-block-padding: var(--space-2, 8px);
      --ui-code-block-header-display: none;
      --ui-code-block-border: none;
      --ui-code-block-background: transparent;
      --ui-code-block-radius-top: 0;
      --ui-code-block-radius-bottom: 0;

      display: block;
      container-type: inline-size;
      position: relative;
      width: var(--ui-code-group-width, 100%);
      margin-inline: var(--ui-code-group-margin-inline, 0);
      border: var(--border-style-subtle, 1px solid oklch(20% 0 0 / 0.12));
      border-radius: var(--radius-md, 6px);
      overflow: hidden;
      background: var(--bg-default, oklch(1 0 0));
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .root {
      position: relative;
    }

    .code-group-header {
      display: none;
      position: relative;
      align-items: stretch;
      isolation: isolate;
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
      overflow-y: clip;
      overflow-clip-margin: calc(
        var(--focus-ring-offset, 2px) + var(--focus-ring-width, 2px) + 2px
      );
      min-height: 36px;
      padding-block: 2px;
      padding-inline-start: calc(var(--focus-ring-offset, 2px) + var(--focus-ring-width, 2px));
      padding-inline-end: calc(var(--header-tools-width, 48px) + var(--space-1, 4px));
      scroll-padding-inline-start: calc(
        var(--focus-ring-offset, 2px) + var(--focus-ring-width, 2px)
      );
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
      color: var(--fg-muted, oklch(48% 0 0));
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
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    ::slotted([slot='tab']:hover) {
      color: var(--fg-default, oklch(20% 0 0));
    }

    ::slotted([slot='tab']:focus-visible) {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
      border-radius: var(--radius-sm, 4px);
      z-index: 3;
    }

    ::slotted([slot='tab'][aria-selected='true']) {
      color: var(--fg-default, oklch(20% 0 0));
      border-bottom-color: currentColor;
    }

    .header-tools {
      position: relative;
      z-index: 10;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 0;
      padding-inline: var(
        --ui-code-surface-padding,
        var(--ui-code-block-padding, var(--space-2, 8px))
      );
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
      ::slotted([slot='tab']) {
        min-height: var(--control-min-touch, 24px);
      }

      .header-tools ui-copy-button {
        opacity: var(--opacity-link-touch, 0.75);
        pointer-events: auto;
      }
    }

    .body {
      display: none;
      background: var(--bg-default, oklch(1 0 0));
      padding-block: var(--ui-code-panel-padding, var(--ui-code-group-body-padding-block, 0));
      padding-inline: var(--ui-code-panel-padding, var(--ui-code-group-body-padding-inline, 0));
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
      :host {
        --ui-code-header-display: block;
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

  @query('ui-copy-button')
  private _copyButtonEl?: CopyButtonHost;

  @property({ type: String, attribute: 'selected-value', reflect: true })
  selectedValue = '';

  @property({ type: String, attribute: 'default-selected-value' })
  defaultSelectedValue = '';

  @property({ type: String, reflect: true })
  activation: ActivationMode = 'auto';

  @state()
  private _copyDisabled = false;

  @state()
  private _copyLabel = DEFAULT_COPY_BUTTON_LABEL;

  @state()
  private _copyValue = '';

  @state()
  private _items: GroupItem[] = [];

  @state()
  private _focusedValue = '';

  @state()
  private _selectedResolvedValue = '';

  private readonly _uid = ++codeGroupId;

  private _composeScheduled = false;

  private _hasComposedOnce = false;

  private _headerToolsResizeObserver?: ResizeObserver;

  private _isComposing = false;

  private _mutationObserver?: MutationObserver;

  private _selectedInitialized = false;

  private _hasCompletedInitialUpdate = false;

  private readonly _tabButtons: HTMLButtonElement[] = [];

  private readonly _tabClickHandlers = new Map<HTMLButtonElement, EventListener>();

  private _hydrationActivated = false;

  private readonly _mutationObserverOptions = {
    attributes: true,
    attributeFilter: Array.from(RECOMPOSE_TRIGGER_ATTRIBUTES),
    childList: true,
    subtree: true,
  } as const;

  activateHydration(): void {
    if (this._hydrationActivated) {
      return;
    }

    this._hydrationActivated = true;

    this._mutationObserver = new MutationObserver((records) => {
      if (this._isComposing) {
        return;
      }
      if (!this._shouldRecompose(records)) {
        return;
      }
      this._scheduleCompose();
    });

    this._observeMutations();

    this._headerToolsResizeObserver = new ResizeObserver(() => {
      this._syncHeaderToolsWidth();
    });

    if (this._headerToolsEl) {
      this._headerToolsResizeObserver.observe(this._headerToolsEl);
      this._syncHeaderToolsWidth();
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.addEventListener('ui-code-block-change', this._onCodeBlockChange as EventListener);
    this._composeFromLightDom();

    if (!this.hasAttribute('data-hydration-trigger')) {
      this.activateHydration();
    }
  }

  override firstUpdated(): void {
    queueMicrotask(() => {
      this._hasCompletedInitialUpdate = true;
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('ui-code-block-change', this._onCodeBlockChange as EventListener);
    this._mutationObserver?.disconnect();
    this._headerToolsResizeObserver?.disconnect();
    this._cleanupTabButtons();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('activation') && !VALID_ACTIVATION_MODES.has(this.activation)) {
      this.activation = 'auto';
    }
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (this._hydrationActivated && this._headerToolsEl) {
      this._headerToolsResizeObserver?.observe(this._headerToolsEl);
      this._syncHeaderToolsWidth();
    }

    const selectionInputsChanged =
      changedProperties.has('selectedValue') ||
      changedProperties.has('defaultSelectedValue') ||
      changedProperties.has('activation');

    if (this._hasCompletedInitialUpdate && this._hasComposedOnce && selectionInputsChanged) {
      this._scheduleCompose();
    }
  }

  focusSelectedTab(): void {
    const button = this._findButtonByValue(this._selectedResolvedValue);
    button?.focus();
  }

  refresh(): void {
    this._composeFromLightDom();
  }

  private _composeFromLightDom(): void {
    if (this._isComposing) {
      return;
    }

    this._isComposing = true;
    const shouldReobserveMutations = this._hydrationActivated;

    this._mutationObserver?.disconnect();

    try {
      const previousValue = this._selectedResolvedValue;
      const composition = this._collectComposition();

      this._cleanupTabButtons();
      this._resetPanels(composition.blocks);

      if (composition.majorViolation || composition.items.length < 2) {
        this._items = [];
        this._selectedResolvedValue = '';
        this._focusedValue = '';
        this._copyValue = '';
        this._copyLabel = DEFAULT_COPY_BUTTON_LABEL;
        this._copyDisabled = false;
        this.removeAttribute('data-ready');
        this._hasComposedOnce = true;
        return;
      }

      const items = composition.items;
      this._items = items;

      const nextSelectedValue = this._resolveSelectedValue(items, previousValue);
      const nextFocusedValue = this._resolveFocusedValue(items, nextSelectedValue);

      this._selectedResolvedValue = nextSelectedValue;
      this._focusedValue = nextFocusedValue;

      this._createTabButtons(items);
      this._configurePanels(items);
      this.setAttribute('data-ready', '');
      this._applyUiState(false);
      this._syncHeaderToolsWidth();

      if (this._hasComposedOnce && previousValue !== nextSelectedValue) {
        this._dispatchGroupChange(nextSelectedValue, previousValue, false);
      }

      this._hasComposedOnce = true;
    } finally {
      this._isComposing = false;
      if (shouldReobserveMutations) {
        this._observeMutations();
      }
    }
  }

  private _observeMutations(): void {
    this._mutationObserver?.observe(this, this._mutationObserverOptions);
  }

  private _scheduleCompose(): void {
    if (this._composeScheduled) {
      return;
    }

    this._composeScheduled = true;
    queueMicrotask(() => {
      this._composeScheduled = false;
      if (!this.isConnected || this._isComposing) {
        return;
      }
      this._composeFromLightDom();
    });
  }

  private _collectComposition(): CompositionResult {
    const blocks: CodeBlockHost[] = [];
    const foreignElements: HTMLElement[] = [];
    const children =
      'children' in this
        ? Array.from((this as typeof this & { children?: ArrayLike<Element> }).children)
        : [];

    for (const child of children) {
      if (this._isGeneratedTabButton(child)) {
        continue;
      }

      if (child.tagName.toLowerCase() === 'ui-code-block') {
        blocks.push(child as CodeBlockHost);
        continue;
      }

      if (child instanceof HTMLElement) {
        foreignElements.push(child);
      }
    }

    if (foreignElements.length > 0) {
      return { blocks, items: [], majorViolation: true };
    }

    const duplicateKeys = new Set<string>();
    const seenKeys = new Set<string>();

    for (const block of blocks) {
      const value = this._readGroupKey(block);
      if (value === '') {
        continue;
      }

      if (seenKeys.has(value)) {
        duplicateKeys.add(value);
        continue;
      }

      seenKeys.add(value);
    }

    if (duplicateKeys.size > 0) {
      return { blocks, items: [], majorViolation: true };
    }

    const items: GroupItem[] = [];
    blocks.forEach((block) => {
      const value = this._readGroupKey(block);
      if (value === '') {
        return;
      }

      const tabDescriptor = this._resolveTabLabel(block);
      if (!tabDescriptor) {
        return;
      }

      items.push({
        block,
        copyContextLabel: this._resolveCopyContextLabel(block, tabDescriptor.label),
        copyDisabled: this._isCopyDisabled(block),
        panelId: this._resolvePanelId(block, value),
        tabId: this._tabId(value),
        tabLabel: tabDescriptor.label,
        tabLabelSource: tabDescriptor.source,
        value,
      });
    });

    return { blocks, items, majorViolation: false };
  }

  private _cleanupTabButtons(): void {
    for (const [button, handler] of this._tabClickHandlers) {
      button.removeEventListener('click', handler);
    }

    this._tabClickHandlers.clear();

    for (const button of this._tabButtons) {
      button.remove();
    }

    this._tabButtons.length = 0;
  }

  private _createTabButtons(items: readonly GroupItem[]): void {
    const anchor = items[0]?.block ?? null;
    if (!anchor) {
      return;
    }

    items.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.tabLabel;
      button.setAttribute('slot', 'tab');
      button.setAttribute('role', 'tab');
      button.setAttribute('id', item.tabId);
      button.setAttribute('aria-controls', item.panelId);
      button.setAttribute('data-ui-generated-tab', '');
      button.dataset['uiCodeGroupTab'] = item.value;

      const onClick: EventListener = () => {
        this._requestSelection(item.value, true);
      };

      button.addEventListener('click', onClick);
      this._tabClickHandlers.set(button, onClick);
      this._tabButtons.push(button);
      this.insertBefore(button, anchor);
    });
  }

  private _configurePanels(items: readonly GroupItem[]): void {
    items.forEach((item, index) => {
      const { block } = item;
      block.id = item.panelId;
      block.setAttribute('slot', 'panel');
      block.setAttribute('role', 'tabpanel');
      block.setAttribute('aria-labelledby', item.tabId);
      if (index === 0) {
        block.removeAttribute('data-panel-after-first');
      } else {
        block.setAttribute('data-panel-after-first', '');
      }
    });
  }

  private _resetPanels(blocks: readonly CodeBlockHost[]): void {
    blocks.forEach((block) => {
      block.removeAttribute('slot');
      block.removeAttribute('role');
      block.removeAttribute('aria-hidden');
      block.removeAttribute('aria-labelledby');
      block.removeAttribute('data-panel-active');
      block.removeAttribute('data-panel-after-first');
      block.removeAttribute('hidden');
    });
  }

  private _requestSelection(value: string, userInitiated: boolean): void {
    const item = this._items.find((candidate) => candidate.value === value);
    if (!item) {
      return;
    }

    const previousValue = this._selectedResolvedValue;
    if (this.activation === 'manual') {
      this._focusedValue = value;
    }

    if (this._isControlled()) {
      this._applyUiState(true);
      if (previousValue !== value) {
        this._dispatchGroupChange(value, previousValue, userInitiated);
      }
      return;
    }

    if (previousValue === value) {
      this._applyUiState(true);
      return;
    }

    this._selectedInitialized = true;
    this._selectedResolvedValue = value;
    this._focusedValue = value;
    this._applyUiState(true);
    this._copyButtonEl?.resetState?.();
    this._dispatchGroupChange(value, previousValue, userInitiated);
  }

  private _applyUiState(shouldScroll: boolean): void {
    const activeItem = this._items.find((item) => item.value === this._selectedResolvedValue);
    if (!activeItem) {
      return;
    }

    const focusValue =
      this.activation === 'manual' ? this._focusedValue || activeItem.value : activeItem.value;

    this._tabButtons.forEach((button, index) => {
      const item = this._items[index];
      if (!item) {
        return;
      }

      const selected = item.value === activeItem.value;
      const focusable = item.value === focusValue;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = focusable ? 0 : -1;

      if ((selected || focusable) && shouldScroll) {
        this._scrollTabIntoView(button);
      }
    });

    this._items.forEach((item, index) => {
      const isActive = item.value === activeItem.value;
      item.block.toggleAttribute('data-panel-active', isActive);
      if (isActive) {
        item.block.removeAttribute('hidden');
        item.block.removeAttribute('aria-hidden');
      } else {
        item.block.setAttribute('hidden', '');
        item.block.setAttribute('aria-hidden', 'true');
      }

      if (index === 0) {
        item.block.removeAttribute('data-panel-after-first');
      } else {
        item.block.setAttribute('data-panel-after-first', '');
      }
    });

    this._copyValue =
      typeof activeItem.block.getCodeContent === 'function'
        ? activeItem.block.getCodeContent()
        : '';
    this._copyLabel =
      activeItem.copyContextLabel === DEFAULT_COPY_CONTEXT
        ? DEFAULT_COPY_BUTTON_LABEL
        : `${activeItem.copyContextLabel} のコードをコピー`;
    this._copyDisabled = activeItem.copyDisabled;
  }

  private _resolveSelectedValue(items: readonly GroupItem[], previousValue: string): string {
    const controlledValue = this.selectedValue.trim();
    if (this._isControlled()) {
      const controlledMatch = items.find((item) => item.value === controlledValue);
      return controlledMatch?.value ?? items[0]?.value ?? '';
    }

    const previousMatch = items.find((item) => item.value === previousValue);
    if (previousMatch) {
      return previousMatch.value;
    }

    if (!this._selectedInitialized) {
      const defaultValue = this.defaultSelectedValue.trim();
      const defaultMatch = items.find((item) => item.value === defaultValue);
      this._selectedInitialized = true;
      if (defaultMatch) {
        return defaultMatch.value;
      }
    }

    return items[0]?.value ?? '';
  }

  private _resolveFocusedValue(items: readonly GroupItem[], selectedValue: string): string {
    if (this.activation === 'auto') {
      return selectedValue;
    }

    const focusedMatch = items.find((item) => item.value === this._focusedValue);
    if (focusedMatch) {
      return focusedMatch.value;
    }

    return selectedValue;
  }

  private _resolveTabLabel(block: CodeBlockHost): { label: string; source: TabLabelSource } | null {
    const tabLabel = this._readStringValue(block, 'tabLabel', 'tab-label');
    if (tabLabel !== '') {
      return { label: tabLabel, source: 'tab-label' };
    }

    const filename = this._readStringValue(block, 'filename', 'filename');
    if (filename !== '') {
      return { label: filename, source: 'filename' };
    }

    const lang = this._readStringValue(block, 'lang', 'lang');
    if (lang !== '') {
      return { label: lang, source: 'lang' };
    }

    return null;
  }

  private _resolveCopyContextLabel(block: CodeBlockHost, tabLabel: string): string {
    const copyLabel = this._readStringValue(block, 'copyLabel', 'copy-label');
    if (copyLabel !== '') {
      return copyLabel;
    }

    const filename = this._readStringValue(block, 'filename', 'filename');
    if (filename !== '') {
      return filename;
    }

    const lang = this._readStringValue(block, 'lang', 'lang');
    if (lang !== '') {
      return lang;
    }

    if (tabLabel !== '') {
      return tabLabel;
    }

    return DEFAULT_COPY_CONTEXT;
  }

  private _readGroupKey(block: CodeBlockHost): string {
    return this._readStringValue(block, 'groupKey', 'group-key');
  }

  private _readStringValue(
    block: CodeBlockHost,
    propertyName: 'copyLabel' | 'filename' | 'groupKey' | 'lang' | 'tabLabel',
    attributeName: string,
  ): string {
    const propertyValue = block[propertyName];
    if (typeof propertyValue === 'string' && propertyValue.trim() !== '') {
      return propertyValue.trim();
    }

    return block.getAttribute(attributeName)?.trim() ?? '';
  }

  private _isCopyDisabled(block: CodeBlockHost): boolean {
    if (typeof block.getCodeContent !== 'function') {
      return true;
    }

    const propertyValue = block.copyable;
    if (typeof propertyValue === 'boolean') {
      return !propertyValue;
    }

    const attributeValue = block.getAttribute('copyable');
    if (attributeValue === null) {
      return false;
    }

    return FALSE_BOOLEAN_ATTRIBUTE_VALUES.has(attributeValue.trim().toLowerCase());
  }

  private _resolvePanelId(block: CodeBlockHost, value: string): string {
    const existingId = block.id.trim();
    if (existingId !== '') {
      return existingId;
    }

    return `ui-code-group-${String(this._uid)}-panel-${this._slugify(value)}`;
  }

  private _tabId(value: string): string {
    return `ui-code-group-${String(this._uid)}-tab-${this._slugify(value)}`;
  }

  private _slugify(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');
    const trimmed = normalized.replace(/^-+|-+$/g, '');
    return trimmed === '' ? 'item' : trimmed;
  }

  private _isControlled(): boolean {
    return this.getAttribute('selected-value')?.trim() !== '';
  }

  private _findItemIndex(value: string, items: readonly GroupItem[]): number {
    return items.findIndex((item) => item.value === value);
  }

  private _dispatchGroupChange(value: string, prevValue: string, userInitiated: boolean): void {
    const index = this._findItemIndex(value, this._items);
    const prevIndex = this._findItemIndex(prevValue, this._items);

    this.dispatchEvent(
      new CustomEvent('ui-code-group-change', {
        detail: {
          index,
          prevIndex,
          prevValue,
          userInitiated,
          value,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _scrollTabIntoView(tab: HTMLElement): void {
    const tabList = this._tabListEl;
    if (!tabList) {
      return;
    }

    tab.scrollIntoView({
      behavior: 'instant' as ScrollBehavior,
      block: 'nearest',
      inline: 'nearest',
    });

    const headerToolsWidth = this._readHeaderToolsWidth();
    if (headerToolsWidth <= 0) {
      return;
    }

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
    if (!this._headerToolsEl) {
      return;
    }

    const width = Math.ceil(this._headerToolsEl.getBoundingClientRect().width);
    if (width <= 0) {
      return;
    }

    this.style.setProperty('--header-tools-width', `${String(width)}px`);
  }

  private _readHeaderToolsWidth(): number {
    const fromStyle = Number.parseFloat(
      getComputedStyle(this).getPropertyValue('--header-tools-width').trim(),
    );
    if (Number.isFinite(fromStyle) && fromStyle > 0) {
      return fromStyle;
    }

    if (!this._headerToolsEl) {
      return 0;
    }

    const measured = this._headerToolsEl.getBoundingClientRect().width;
    return Number.isFinite(measured) ? measured : 0;
  }

  private _findButtonByValue(value: string): HTMLButtonElement | undefined {
    return this._tabButtons.find((button) => button.dataset['uiCodeGroupTab'] === value);
  }

  private _moveFocus(delta: number): void {
    if (this._items.length === 0) {
      return;
    }

    const currentValue =
      this.activation === 'manual'
        ? this._focusedValue || this._selectedResolvedValue
        : this._selectedResolvedValue;
    const currentIndex = Math.max(0, this._findItemIndex(currentValue, this._items));
    const nextIndex = (currentIndex + delta + this._items.length) % this._items.length;
    const nextItem = this._items[nextIndex];
    const nextButton = nextItem ? this._findButtonByValue(nextItem.value) : undefined;
    if (!nextItem || !nextButton) {
      return;
    }

    if (this.activation === 'manual') {
      this._focusedValue = nextItem.value;
      this._applyUiState(true);
      nextButton.focus();
      return;
    }

    nextButton.focus();
    this._requestSelection(nextItem.value, true);
  }

  private _focusBoundaryTab(index: number): void {
    const target = this._items[index];
    const button = target ? this._findButtonByValue(target.value) : undefined;
    if (!target || !button) {
      return;
    }

    if (this.activation === 'manual') {
      this._focusedValue = target.value;
      this._applyUiState(true);
      button.focus();
      return;
    }

    button.focus();
    this._requestSelection(target.value, true);
  }

  private _shouldRecompose(records: readonly MutationRecord[]): boolean {
    for (const record of records) {
      if (record.type === 'attributes') {
        if (
          this._isDirectCodeBlock(record.target) &&
          RECOMPOSE_TRIGGER_ATTRIBUTES.has(record.attributeName ?? '')
        ) {
          return true;
        }
        continue;
      }

      if (record.type !== 'childList' || record.target !== this) {
        continue;
      }

      const changedNodes = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)];
      if (changedNodes.some((node) => this._isRelevantDirectChild(node))) {
        return true;
      }
    }

    return false;
  }

  private _isRelevantDirectChild(node: Node): boolean {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    if (this._isGeneratedTabButton(node)) {
      return false;
    }

    return node.parentElement === this;
  }

  private _isDirectCodeBlock(node: Node): node is CodeBlockHost {
    return (
      node instanceof HTMLElement &&
      node.parentElement === this &&
      node.tagName.toLowerCase() === 'ui-code-block'
    );
  }

  private _isGeneratedTabButton(node: Element): boolean {
    return (
      node.tagName.toLowerCase() === 'button' &&
      node.getAttribute('slot') === 'tab' &&
      node.hasAttribute('data-ui-generated-tab')
    );
  }

  private _onCodeBlockChange = (event: Event): void => {
    const target = event.target;
    if (!this._isDirectCodeBlock(target as Node)) {
      return;
    }

    this._scheduleCompose();
  };

  private _onTabListKeyDown = (event: KeyboardEvent): void => {
    const target = event.composedPath()[0];
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const currentIndex = this._tabButtons.indexOf(target);
    if (currentIndex === -1 || this._items.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this._moveFocus(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this._moveFocus(1);
        break;
      case 'Home':
        event.preventDefault();
        this._focusBoundaryTab(0);
        break;
      case 'End':
        event.preventDefault();
        this._focusBoundaryTab(this._items.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this._requestSelection(this._items[currentIndex]?.value ?? '', true);
        break;
      default:
        break;
    }
  };

  private get _tabListAriaLabel(): string {
    const labelledBy = this.getAttribute('aria-labelledby')?.trim();
    if (labelledBy) {
      return '';
    }

    const explicit = this.getAttribute('aria-label')?.trim();
    if (explicit) {
      return explicit;
    }

    return DEFAULT_GROUP_LABEL;
  }

  override render() {
    const labelledBy = this.getAttribute('aria-labelledby')?.trim();
    const ariaLabel = labelledBy ? undefined : this._tabListAriaLabel || undefined;

    return html`
      <div class="root">
        <div class="code-group-header">
          <div
            class="tab-list"
            role="tablist"
            aria-orientation="horizontal"
            aria-labelledby="${ifDefined(labelledBy)}"
            aria-label="${ifDefined(ariaLabel)}"
            @keydown="${this._onTabListKeyDown}"
          >
            <slot name="tab"></slot>
            <span class="tab-list-spacer" aria-hidden="true"></span>
          </div>

          <div class="header-tools">
            <ui-copy-button
              size="sm"
              value="${this._copyValue}"
              label="${this._copyLabel}"
              ?disabled=${this._copyDisabled}
            ></ui-copy-button>
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
