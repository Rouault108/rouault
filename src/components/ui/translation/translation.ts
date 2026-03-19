import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export type TranslationRenderMode = 'popover' | 'drawer' | 'interlinear';
export type TranslationModeToggleRequestSource = 'keyboard' | 'api';

export interface TranslationModeToggleRequestDetail {
  source: TranslationModeToggleRequestSource;
}

const VALID_RENDER_MODES = new Set<TranslationRenderMode>(['popover', 'drawer', 'interlinear']);

const DOCUMENT_STYLE_ID = 'ui-translation-document-styles';
const MAX_TRIGGER_TEXT_LENGTH = 150;
const MOBILE_VIEWPORT_MAX_WIDTH = 1279;
const BOTTOM_SHEET_MEDIA_QUERY = `(max-width: ${String(MOBILE_VIEWPORT_MAX_WIDTH)}px) and (hover: none) and (pointer: coarse)`;
const POPOVER_EDGE_PADDING = 16;
const POPOVER_TRIGGER_GAP = 8;
const BOTTOM_SHEET_CLOSE_RATIO = 0.3;
const BOTTOM_SHEET_CLOSE_VELOCITY = 0.75;

const DOCUMENT_CSS = `
ui-translation {
  display: inline;
  position: relative;
  font-family: inherit;
  line-height: inherit;
}

ui-translation [data-part='trigger'] {
  display: inline-flex;
  align-items: baseline;
  gap: 0;
  min-height: 24px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm, 4px);
  background-color: transparent;
  color: inherit;
  font: inherit;
  font-family: var(--font-sans, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif);
  line-height: inherit;
  text-align: inherit;
  text-decoration: none;
  cursor: help;
  position: relative;
  background-image: linear-gradient(
    to right,
    oklch(from var(--fg-default, oklch(20% 0 0)) l c h / var(--opacity-link, 0.6)) 50%,
    transparent 50%
  );
  background-size: var(--space-1, 4px) 1px;
  background-repeat: repeat-x;
  background-position: 0 calc(100% - 1px);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  transition: color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
}

ui-translation [data-part='trigger']::after {
  content: '';
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  inline-size: max(100%, 24px);
  block-size: max(100%, 24px);
  pointer-events: none;
}

ui-translation [data-part='trigger']:hover:not(:disabled),
ui-translation [data-part='trigger']:focus-visible:not(:disabled),
ui-translation [data-part='trigger'][aria-expanded='true']:not(:disabled) {
  color: var(--fg-default, oklch(20% 0 0));
  background-image: linear-gradient(
    to right,
    oklch(from var(--fg-default, oklch(20% 0 0)) l c h / 1) 50%,
    transparent 50%
  );
}

ui-translation [data-part='trigger']:focus-visible {
  outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
  outline-offset: var(--focus-ring-offset, 2px);
  animation: var(--animation-focus);
}

ui-translation [data-part='trigger']:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background-image: none;
}

ui-translation [data-part='content'] {
  box-sizing: border-box;
  color: var(--fg-default, oklch(20% 0 0));
  font-family: var(--font-sans, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif);
  line-height: var(--line-height-relaxed, 1.75);
}

ui-translation [data-part='content'][data-render-mode='popover'],
ui-translation [data-part='content'][data-render-mode='drawer'] {
  z-index: var(--z-popover, 400);
  max-width: min(90vw, 40rem);
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border: var(--border-width, 1px) solid var(--border-default, oklch(86% 0 0));
  border-radius: var(--radius-md, 6px);
  background: var(--bg-surface-2, oklch(100% 0 0));
  box-shadow:
    var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12)),
    inset 0 1px 0 0 oklch(100% 0 0 / 0.1);
  font-size: var(--text-sm, 13px);
}

ui-translation [data-part='content'][data-render-mode='popover'] {
  position: fixed;
  left: var(--ui-translation-popover-left, 0px);
  top: var(--ui-translation-popover-top, 0px);
}

ui-translation [data-part='scrim'] {
  display: none;
}

ui-translation[data-sheet-dragging='true'] [data-part='content'][data-render-mode='popover'] {
  transition: none !important;
}

ui-translation [data-part='content'][data-render-mode='drawer'] {
  position: fixed;
  top: var(--space-8, 32px);
  right: var(--space-4, 16px);
  bottom: var(--space-8, 32px);
  width: min(36rem, calc(100vw - var(--space-8, 32px)));
  max-height: calc(100vh - var(--space-16, 64px));
  overflow-y: auto;
}

ui-translation [data-part='content'][data-render-mode='interlinear'] {
  display: block;
  margin-block-start: var(--space-2, 8px);
  color: var(--fg-default, oklch(20% 0 0));
  font-size: var(--text-sm, 13px);
  opacity: 0;
}

ui-translation [data-part='content'][data-render-mode='interlinear'][data-open='true'] {
  opacity: 1;
  transition: opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
}

ui-translation [data-part='content'][data-render-mode='interlinear'][data-open='false'] {
  opacity: 0;
}

ui-translation [data-part='content'][hidden] {
  display: none !important;
}

@media (prefers-reduced-motion: reduce) {
  ui-translation [data-part='trigger'],
  ui-translation [data-part='content'] {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

@media (forced-colors: active) {
  ui-translation [data-part='trigger'] {
    background-image: none;
    color: LinkText;
    text-decoration-line: underline;
    text-decoration-style: dashed;
    text-decoration-thickness: from-font;
    text-underline-offset: 0.12em;
  }

  ui-translation [data-part='content'] {
    background: Canvas;
    color: CanvasText;
    border: var(--border-width, 1px) solid CanvasText;
    box-shadow: none;
  }
}

@media ${BOTTOM_SHEET_MEDIA_QUERY} {
  ui-translation [data-part='trigger']::after {
    inline-size: max(100%, var(--control-min-touch, 24px));
    block-size: max(100%, var(--control-min-touch, 24px));
  }

  ui-translation [data-part='content'][data-render-mode='popover'] {
    left: var(--space-2, 8px);
    right: var(--space-2, 8px);
    top: auto;
    bottom: var(--space-2, 8px);
    width: auto;
    max-width: none;
    max-height: min(72vh, calc(100vh - var(--space-8, 32px)));
    overflow-y: auto;
    border-radius: var(--radius-lg, 10px);
    transform: translateY(var(--ui-translation-sheet-translate-y, 0px));
    transition:
      transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
      opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
  }

  ui-translation [data-part='scrim'] {
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-popover, 400) - 1);
    background: oklch(from var(--fg-default, oklch(20% 0 0)) l c h / 0.24);
    display: block;
    border: 0;
    padding: 0;
    margin: 0;
    cursor: pointer;
  }
}

@media print {
  ui-translation [data-part='trigger'] {
    background-image: none !important;
    text-decoration: underline;
  }

  ui-translation [data-part='content'][data-render-mode='popover'],
  ui-translation [data-part='content'][data-render-mode='drawer'] {
    display: none !important;
  }

  ui-translation [data-part='content'][data-render-mode='interlinear'] {
    display: block !important;
    position: static !important;
    margin: var(--space-1, 4px) 0 0;
    padding: 0;
    border: none;
    box-shadow: none;
    opacity: 1 !important;
  }
}
`;

let translationUid = 0;

@customElement('ui-translation')
export class UiTranslation extends LitElement {
  @property({ type: String })
  original = '';

  @property({ type: String })
  translated = '';

  @property({ type: String, reflect: true })
  override lang = '';

  @property({ type: String, attribute: 'target-lang', reflect: true })
  targetLang = 'ja';

  @property({ type: String, attribute: 'render-mode', reflect: true })
  renderMode: TranslationRenderMode = 'popover';

  @property({ type: Boolean, reflect: true })
  open = false;

  private readonly _uid = ++translationUid;
  private readonly _contentId = `translation-uid-${String(this._uid)}`;

  private _didWarnLongText = false;
  private _didWarnMissingLang = false;
  private _didWarnMissingTargetLang = false;
  private _isPointerInside = false;
  private _isFocusInside = false;
  private _suppressFocusOpen = false;
  private _sheetPointerId: number | null = null;
  private _sheetStartY = 0;
  private _sheetStartTime = 0;
  private _sheetDeltaY = 0;
  private _sheetStartScrollTop = 0;
  private _positionRaf: number | null = null;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._injectDocumentStyles();
    this._warnLongTriggerTextIfNeeded();
    this._warnMissingLangIfNeeded();
    this._warnMissingTargetLangIfNeeded();
    this.dataset['sheetDragging'] = 'false';

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onWindowViewportChange, { passive: true });
      window.addEventListener('scroll', this._onWindowViewportChange, {
        passive: true,
        capture: true,
      });
    }
  }

  override disconnectedCallback(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._onWindowViewportChange);
      window.removeEventListener('scroll', this._onWindowViewportChange, true);
    }

    if (this._positionRaf !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this._positionRaf);
      this._positionRaf = null;
    }

    this._resetBottomSheetGesture();
    super.disconnectedCallback();
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('renderMode') && !VALID_RENDER_MODES.has(this.renderMode)) {
      this.renderMode = 'popover';
    }

    if (changedProperties.has('targetLang') && this.targetLang.trim() === '') {
      this.targetLang = 'ja';
    }
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('original')) {
      this._warnLongTriggerTextIfNeeded();
    }

    if (changedProperties.has('lang')) {
      this._warnMissingLangIfNeeded();
    }

    if (changedProperties.has('targetLang')) {
      this._warnMissingTargetLangIfNeeded();
    }

    if (changedProperties.has('open') && !this.open) {
      this._resetBottomSheetGesture();
    }

    if (
      changedProperties.has('open') ||
      changedProperties.has('renderMode') ||
      changedProperties.has('translated')
    ) {
      this._schedulePopoverPositioning();
    }
  }

  openTranslation(): void {
    this._setOpen(true);
  }

  closeTranslation(): void {
    this._setOpen(false);
  }

  toggleTranslation(): void {
    this._setOpen(!this.open);
  }

  requestModeToggle(source: TranslationModeToggleRequestSource = 'api'): void {
    this.dispatchEvent(
      new CustomEvent<TranslationModeToggleRequestDetail>('translation-request-mode-toggle', {
        detail: { source },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private get _resolvedRenderMode(): TranslationRenderMode {
    return VALID_RENDER_MODES.has(this.renderMode) ? this.renderMode : 'popover';
  }

  private get _resolvedTargetLang(): string {
    const normalized = this.targetLang.trim();
    return normalized === '' ? 'ja' : normalized;
  }

  private get _resolvedLang(): string | undefined {
    const normalized = this.lang.trim();
    return normalized === '' ? undefined : normalized;
  }

  private get _resolvedOriginal(): string {
    const normalized = this.original.trim();
    return normalized === '' ? '翻訳を表示' : normalized;
  }

  private get _resolvedTranslated(): string {
    return this.translated.trim();
  }

  private get _hasTranslation(): boolean {
    return this._resolvedTranslated !== '';
  }

  private get _isLookupMode(): boolean {
    return this._resolvedRenderMode !== 'interlinear';
  }

  private get _isPopoverMode(): boolean {
    return this._resolvedRenderMode === 'popover';
  }

  private get _matchesBottomSheetViewport(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(BOTTOM_SHEET_MEDIA_QUERY).matches;
  }

  private get _isBottomSheetMode(): boolean {
    return this._isPopoverMode && this._isLookupMode && this._matchesBottomSheetViewport;
  }

  private _setOpen(nextOpen: boolean): void {
    if (!this._hasTranslation && nextOpen) return;
    if (this.open === nextOpen) return;

    this.open = nextOpen;
    this.dispatchEvent(
      new CustomEvent<{ open: boolean; renderMode: TranslationRenderMode }>('translation-toggle', {
        detail: { open: this.open, renderMode: this._resolvedRenderMode },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _injectDocumentStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DOCUMENT_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    document.head.append(style);
  }

  private _warnLongTriggerTextIfNeeded(): void {
    if (this._didWarnLongText) return;
    const length = Array.from(this._resolvedOriginal).length;
    if (length <= MAX_TRIGGER_TEXT_LENGTH) return;

    this._didWarnLongText = true;
    console.warn(
      `[ui-translation] original が ${String(length)} 文字です。` +
        `${String(MAX_TRIGGER_TEXT_LENGTH)} 文字以内の短い語句/フレーズに分割することを推奨します。`,
    );
  }

  private _warnMissingLangIfNeeded(): void {
    if (this._didWarnMissingLang) return;
    const attributeValue = this.getAttribute('lang');
    if (typeof attributeValue === 'string' && attributeValue.trim() !== '') return;

    this._didWarnMissingLang = true;
    console.warn(
      '[ui-translation] lang が未指定です。原文の発音品質を維持するため lang 属性の指定を推奨します。',
    );
  }

  private _warnMissingTargetLangIfNeeded(): void {
    if (this._didWarnMissingTargetLang) return;
    const attributeValue = this.getAttribute('target-lang');
    if (typeof attributeValue === 'string' && attributeValue.trim() !== '') return;

    this._didWarnMissingTargetLang = true;
    console.warn(
      '[ui-translation] target-lang が未指定です。翻訳文の発音品質を維持するため target-lang 属性の指定を推奨します。',
    );
  }

  private _onWindowViewportChange = (): void => {
    if (!this.open) return;
    if (!this._isBottomSheetMode) {
      this._resetBottomSheetGesture();
    }
    this._schedulePopoverPositioning();
  };

  private _schedulePopoverPositioning(): void {
    if (!this.open || !this._hasTranslation || !this._isPopoverMode) return;
    if (this._isBottomSheetMode) return;
    if (this._positionRaf !== null || typeof window === 'undefined') return;

    this._positionRaf = window.requestAnimationFrame(() => {
      this._positionRaf = null;
      this._updatePopoverPosition();
    });
  }

  private _updatePopoverPosition(): void {
    if (!this.open || !this._isPopoverMode || this._isBottomSheetMode) return;

    const trigger = this.querySelector<HTMLButtonElement>('[data-part="trigger"]');
    const content = this.querySelector<HTMLElement>('[data-part="content"]');
    if (!trigger || !content || content.hidden) return;

    const triggerRect = trigger.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const maxLeft = Math.max(
      POPOVER_EDGE_PADDING,
      viewportWidth - contentRect.width - POPOVER_EDGE_PADDING,
    );
    const left = Math.min(Math.max(triggerRect.left, POPOVER_EDGE_PADDING), maxLeft);

    const preferredBelowTop = triggerRect.bottom + POPOVER_TRIGGER_GAP;
    const preferredAboveTop = triggerRect.top - contentRect.height - POPOVER_TRIGGER_GAP;
    const canPlaceBelow =
      preferredBelowTop + contentRect.height + POPOVER_EDGE_PADDING <= viewportHeight;
    const topCandidate = canPlaceBelow ? preferredBelowTop : preferredAboveTop;
    const maxTop = Math.max(
      POPOVER_EDGE_PADDING,
      viewportHeight - contentRect.height - POPOVER_EDGE_PADDING,
    );
    const top = Math.min(Math.max(topCandidate, POPOVER_EDGE_PADDING), maxTop);

    this.style.setProperty('--ui-translation-popover-left', `${String(Math.round(left))}px`);
    this.style.setProperty('--ui-translation-popover-top', `${String(Math.round(top))}px`);
  }

  private _resetBottomSheetGesture(): void {
    this._sheetPointerId = null;
    this._sheetStartY = 0;
    this._sheetStartTime = 0;
    this._sheetDeltaY = 0;
    this._sheetStartScrollTop = 0;
    this.dataset['sheetDragging'] = 'false';
    this.style.setProperty('--ui-translation-sheet-translate-y', '0px');
  }

  private _onScrimClick = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    if (!this.open || !this._isBottomSheetMode) return;
    this.closeTranslation();
  };

  private _onTriggerClick = (event: MouseEvent): void => {
    if (!this._hasTranslation) return;
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

    event.preventDefault();
    this.toggleTranslation();
  };

  private _onHostPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    if (!this._isLookupMode || !this._hasTranslation) return;

    this._isPointerInside = true;
    this.openTranslation();
  };

  private _onHostPointerLeave = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    if (!this._isLookupMode) return;

    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && this.contains(nextTarget)) return;

    this._isPointerInside = false;
    this._closeLookupIfIdle();
  };

  private _onHostFocusIn = (): void => {
    if (this._suppressFocusOpen) {
      this._suppressFocusOpen = false;
      this._isFocusInside = true;
      return;
    }

    if (!this._isLookupMode || !this._hasTranslation) return;

    this._isFocusInside = true;
    this.openTranslation();
  };

  private _onHostFocusOut = (event: FocusEvent): void => {
    if (!this._isLookupMode) return;

    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && this.contains(nextTarget)) return;

    this._isFocusInside = false;
    this._closeLookupIfIdle();
  };

  private _closeLookupIfIdle(): void {
    if (!this._isLookupMode) return;
    if (this._isPointerInside || this._isFocusInside) return;
    this.closeTranslation();
  }

  private _onKeyDown = (event: KeyboardEvent): void => {
    const wantsModeToggle =
      (event.key === 'p' || event.key === 'P') &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      this.open &&
      this._isLookupMode;

    if (wantsModeToggle) {
      event.stopPropagation();
      event.preventDefault();
      this.requestModeToggle('keyboard');
      return;
    }

    if (event.key !== 'Escape') return;
    if (!this.open) return;

    event.stopPropagation();
    event.preventDefault();
    this._isPointerInside = false;
    this._isFocusInside = false;
    this._suppressFocusOpen = true;
    this.closeTranslation();
    this.querySelector<HTMLButtonElement>('[data-part="trigger"]')?.focus();
  };

  private _onContentPointerDown = (event: PointerEvent): void => {
    if (!this._isBottomSheetMode || !this.open) return;
    if (event.pointerType !== 'touch') return;
    if (this._sheetPointerId !== null) return;

    const content = this.querySelector<HTMLElement>('[data-part="content"]');
    if (!content) return;

    this._sheetPointerId = event.pointerId;
    this._sheetStartY = event.clientY;
    this._sheetStartTime = performance.now();
    this._sheetDeltaY = 0;
    this._sheetStartScrollTop = content.scrollTop;
    this.dataset['sheetDragging'] = 'false';
    try {
      content.setPointerCapture(event.pointerId);
    } catch {
      // ポインターキャプチャ非対応環境では継続する
    }
  };

  private _onContentPointerMove = (event: PointerEvent): void => {
    if (!this._isBottomSheetMode || !this.open) return;
    if (event.pointerId !== this._sheetPointerId) return;

    const deltaY = Math.max(0, event.clientY - this._sheetStartY);
    if (deltaY <= 0) return;
    if (this._sheetStartScrollTop > 0) return;

    this._sheetDeltaY = deltaY;
    this.dataset['sheetDragging'] = 'true';
    this.style.setProperty('--ui-translation-sheet-translate-y', `${String(Math.round(deltaY))}px`);
    event.preventDefault();
  };

  private _onContentPointerCancel = (_event: PointerEvent): void => {
    if (!this._isBottomSheetMode) return;
    this._resetBottomSheetGesture();
  };

  private _onContentPointerUp = (event: PointerEvent): void => {
    if (!this._isBottomSheetMode || !this.open) return;
    if (event.pointerId !== this._sheetPointerId) return;

    const content = this.querySelector<HTMLElement>('[data-part="content"]');
    if (!content) {
      this._resetBottomSheetGesture();
      return;
    }

    try {
      content.releasePointerCapture(event.pointerId);
    } catch {
      // capture未取得時は例外を無視する
    }

    const elapsed = Math.max(1, performance.now() - this._sheetStartTime);
    const velocity = this._sheetDeltaY / elapsed;
    const closeByRatio = this._sheetDeltaY >= content.offsetHeight * BOTTOM_SHEET_CLOSE_RATIO;
    const closeByVelocity = velocity >= BOTTOM_SHEET_CLOSE_VELOCITY;
    const shouldClose = closeByRatio || closeByVelocity;

    if (shouldClose) {
      this.closeTranslation();
      this._resetBottomSheetGesture();
      return;
    }

    this._resetBottomSheetGesture();
  };

  private _renderContent(): TemplateResult | typeof nothing {
    if (!this._hasTranslation) return nothing;

    const renderMode = this._resolvedRenderMode;
    const isLookupMode = renderMode !== 'interlinear';
    const isOpen = this.open;

    return html`
      <div
        id="${this._contentId}"
        data-part="content"
        data-render-mode="${renderMode}"
        data-open="${String(isOpen)}"
        role="${isLookupMode ? 'dialog' : 'note'}"
        aria-modal="${ifDefined(isLookupMode ? 'false' : undefined)}"
        lang="${this._resolvedTargetLang}"
        ?hidden="${!isOpen}"
        @pointerdown="${this._onContentPointerDown}"
        @pointermove="${this._onContentPointerMove}"
        @pointerup="${this._onContentPointerUp}"
        @pointercancel="${this._onContentPointerCancel}"
      >
        ${this._resolvedTranslated}
      </div>
    `;
  }

  private _renderScrim(): TemplateResult | typeof nothing {
    if (!this.open || !this._hasTranslation || !this._isBottomSheetMode) return nothing;

    return html`
      <button
        type="button"
        data-part="scrim"
        tabindex="-1"
        aria-hidden="true"
        @click="${this._onScrimClick}"
      ></button>
    `;
  }

  override render(): TemplateResult {
    const isLookupMode = this._isLookupMode;
    const hasTranslation = this._hasTranslation;
    const isExpanded = hasTranslation && this.open;

    return html`
      <span
        data-part="root"
        @pointerenter="${this._onHostPointerEnter}"
        @pointerleave="${this._onHostPointerLeave}"
        @focusin="${this._onHostFocusIn}"
        @focusout="${this._onHostFocusOut}"
        @keydown="${this._onKeyDown}"
      >
        <button
          type="button"
          data-part="trigger"
          lang="${ifDefined(this._resolvedLang)}"
          aria-haspopup="${ifDefined(hasTranslation && isLookupMode ? 'dialog' : undefined)}"
          aria-expanded="${String(isExpanded)}"
          aria-controls="${ifDefined(hasTranslation ? this._contentId : undefined)}"
          aria-details="${ifDefined(hasTranslation ? this._contentId : undefined)}"
          ?disabled="${!hasTranslation}"
          @click="${this._onTriggerClick}"
        >
          ${this._resolvedOriginal}
        </button>
        ${this._renderScrim()} ${this._renderContent()}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-translation': UiTranslation;
  }
}

export { DOCUMENT_STYLE_ID, MAX_TRIGGER_TEXT_LENGTH, BOTTOM_SHEET_MEDIA_QUERY };
