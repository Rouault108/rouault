import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export type TranslationRenderMode = 'popover' | 'drawer' | 'interlinear';

const VALID_RENDER_MODES = new Set<TranslationRenderMode>(['popover', 'drawer', 'interlinear']);

const DOCUMENT_STYLE_ID = 'ui-translation-document-styles';
const MAX_TRIGGER_TEXT_LENGTH = 150;

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
  background-image: linear-gradient(
    to right,
    oklch(from var(--fg-default, oklch(20% 0.01 250)) l c h / var(--opacity-link, 0.6)) 50%,
    transparent 50%
  );
  background-size: var(--space-1, 4px) 1px;
  background-repeat: repeat-x;
  background-position: 0 calc(100% - 1px);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  transition:
    background-image var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
    color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
}

ui-translation [data-part='trigger']:hover:not(:disabled),
ui-translation [data-part='trigger']:focus-visible:not(:disabled),
ui-translation [data-part='trigger'][aria-expanded='true']:not(:disabled) {
  color: var(--fg-default, oklch(20% 0.01 250));
  background-image: linear-gradient(
    to right,
    oklch(from var(--fg-default, oklch(20% 0.01 250)) l c h / 1) 50%,
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
  color: var(--fg-default, oklch(20% 0.01 250));
  font-family: var(--font-sans, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif);
  line-height: var(--line-height-relaxed, 1.75);
}

ui-translation [data-part='content'][data-render-mode='popover'],
ui-translation [data-part='content'][data-render-mode='drawer'] {
  z-index: var(--z-popover, 400);
  max-width: min(90vw, 40rem);
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border: var(--border-width, 1px) solid var(--border-default, oklch(86% 0.01 250));
  border-radius: var(--radius-md, 6px);
  background: var(--bg-surface-2, oklch(100% 0 0));
  box-shadow: var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12));
  font-size: var(--text-sm, 13px);
}

ui-translation [data-part='content'][data-render-mode='popover'] {
  position: absolute;
  left: 0;
  top: calc(100% + var(--space-2, 8px));
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
  color: var(--fg-default, oklch(20% 0.01 250));
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
  private _isPointerInside = false;
  private _isFocusInside = false;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._injectDocumentStyles();
    this._warnLongTriggerTextIfNeeded();
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
    if (event.key !== 'Escape') return;
    if (!this.open) return;

    event.stopPropagation();
    event.preventDefault();
    this.closeTranslation();
    this.querySelector<HTMLButtonElement>('[data-part="trigger"]')?.focus();
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
      >
        ${this._resolvedTranslated}
      </div>
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
        ${this._renderContent()}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-translation': UiTranslation;
  }
}

export { DOCUMENT_STYLE_ID, MAX_TRIGGER_TEXT_LENGTH };
