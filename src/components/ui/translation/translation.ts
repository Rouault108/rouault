import { html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
  AnchoredOverlayController,
  type AnchoredOverlayDismissReason,
} from '../overlay/internal/anchored-overlay-controller.js';
import { initTranslationOverlayOrchestrator } from './translation-orchestrator.js';

export type TranslationOverlaySurface = 'popover' | 'drawer';

const VALID_SURFACES = new Set<TranslationOverlaySurface>(['popover', 'drawer']);
const DOCUMENT_STYLE_ID = 'ui-translation-document-styles';
const MAX_TRIGGER_TEXT_LENGTH = 150;

export const DOCUMENT_CSS = `
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
  line-height: inherit;
  text-align: inherit;
  text-decoration: none;
  cursor: pointer;
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

ui-translation [data-part='content'][data-surface='popover'] {
  position: fixed;
  left: 0;
  top: 0;
  z-index: var(--z-anchored-overlay, var(--z-popover, 400));
}

ui-translation [data-part='content'][data-surface='drawer'] {
  position: fixed;
  top: var(--space-8, 32px);
  right: var(--space-4, 16px);
  bottom: var(--space-8, 32px);
  width: min(36rem, calc(100vw - var(--space-8, 32px)));
  max-height: calc(100vh - var(--space-16, 64px));
  overflow-y: auto;
  z-index: var(--z-non-modal-panel, var(--z-modal, 300));
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
  ui-translation [data-part='content'] {
    display: none !important;
  }
}
`;

let translationUid = 0;

const ensureDocumentStyles = (): void => {
  if (typeof document === 'undefined') {
    return;
  }
  if (document.getElementById(DOCUMENT_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = DOCUMENT_STYLE_ID;
  style.textContent = DOCUMENT_CSS;
  document.head.append(style);
};

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

  @property({ type: String, reflect: true })
  surface: TranslationOverlaySurface = 'popover';

  @property({ type: Boolean, reflect: true })
  open = false;

  private readonly _uid = ++translationUid;
  private readonly _contentId = `translation-uid-${String(this._uid)}`;
  private _didWarnLongText = false;
  private _didWarnMissingLang = false;
  private _didWarnMissingTargetLang = false;
  private _hydrationActivated = false;
  private _overlayController: AnchoredOverlayController | null = null;
  private _cleanupDrawerPointerDown: (() => void) | null = null;
  private _cleanupDrawerKeyDown: (() => void) | null = null;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._warnLongTriggerTextIfNeeded();
    this._warnMissingLangIfNeeded();
    this._warnMissingTargetLangIfNeeded();

    if (!this.hasAttribute('data-hydration-trigger')) {
      this.activateHydration();
    }
  }

  override disconnectedCallback(): void {
    this._stopPopoverOverlay();
    this._detachDrawerDismissListeners();
    super.disconnectedCallback();
  }

  activateHydration(): void {
    if (this._hydrationActivated) {
      return;
    }

    this._hydrationActivated = true;
    ensureDocumentStyles();
    initTranslationOverlayOrchestrator();
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('surface') && !VALID_SURFACES.has(this.surface)) {
      this.surface = 'popover';
    }

    if (changedProperties.has('targetLang') && this.targetLang.trim() === '') {
      this.targetLang = 'ja';
    }
  }

  override updated(changedProperties: Map<PropertyKey, unknown>): void {
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

    if (
      changedProperties.has('open') ||
      changedProperties.has('surface') ||
      changedProperties.has('translated')
    ) {
      this._syncSurfaceBehavior();
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

  getTriggerElement(): HTMLButtonElement | null {
    return this.querySelector<HTMLButtonElement>('[data-part="trigger"]');
  }

  getContentElement(): HTMLElement | null {
    return this.querySelector<HTMLElement>('[data-part="content"]');
  }

  private get _resolvedSurface(): TranslationOverlaySurface {
    return VALID_SURFACES.has(this.surface) ? this.surface : 'popover';
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
    return this._resolvedTranslated.length > 0;
  }

  private _setOpen(nextOpen: boolean): void {
    if (!this._hasTranslation && nextOpen) {
      return;
    }
    if (this.open === nextOpen) {
      return;
    }

    this.open = nextOpen;
    this.dispatchEvent(
      new CustomEvent<{ open: boolean; surface: TranslationOverlaySurface }>('translation-toggle', {
        detail: {
          open: this.open,
          surface: this._resolvedSurface,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _warnLongTriggerTextIfNeeded(): void {
    if (this._didWarnLongText) {
      return;
    }

    const length = Array.from(this._resolvedOriginal).length;
    if (length <= MAX_TRIGGER_TEXT_LENGTH) {
      return;
    }

    this._didWarnLongText = true;
    console.warn(
      `[ui-translation] original が ${String(length)} 文字です。` +
        `${String(MAX_TRIGGER_TEXT_LENGTH)} 文字以内の短い語句/フレーズに分割することを推奨します。`,
    );
  }

  private _warnMissingLangIfNeeded(): void {
    if (this._didWarnMissingLang) {
      return;
    }

    const attributeValue = this.getAttribute('lang');
    if (typeof attributeValue === 'string' && attributeValue.trim() !== '') {
      return;
    }

    this._didWarnMissingLang = true;
    console.warn(
      '[ui-translation] lang が未指定です。原文の発音品質を維持するため lang 属性の指定を推奨します。',
    );
  }

  private _warnMissingTargetLangIfNeeded(): void {
    if (this._didWarnMissingTargetLang) {
      return;
    }

    const attributeValue = this.getAttribute('target-lang');
    if (typeof attributeValue === 'string' && attributeValue.trim() !== '') {
      return;
    }

    this._didWarnMissingTargetLang = true;
    console.warn(
      '[ui-translation] target-lang が未指定です。翻訳文の発音品質を維持するため target-lang 属性の指定を推奨します。',
    );
  }

  private _onTriggerClick = (event: MouseEvent): void => {
    if (!this._hasTranslation) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.toggleTranslation();
  };

  private _onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.open) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    this.closeTranslation();
    this.getTriggerElement()?.focus();
  };

  private _ensurePopoverOverlayController(): AnchoredOverlayController {
    if (this._overlayController !== null) {
      return this._overlayController;
    }

    this._overlayController = new AnchoredOverlayController({
      ownerDocument: this.ownerDocument,
      getReference: () => this.getTriggerElement(),
      getFloating: () => (this._resolvedSurface === 'popover' ? this.getContentElement() : null),
      getOpen: () => this.open && this._resolvedSurface === 'popover',
      getPlacement: () => 'bottom-start',
      getOffset: () => 8,
      outsidePointerDismiss: true,
      escapeDismiss: true,
      scrollStrategy: 'ignore',
      onDismissRequest: (reason, event) => {
        this._handlePopoverDismiss(reason, event);
      },
    });

    return this._overlayController;
  }

  private _handlePopoverDismiss(reason: AnchoredOverlayDismissReason, event: Event): void {
    if (!this.open || this._resolvedSurface !== 'popover') {
      return;
    }

    if (reason === 'escape' && event instanceof KeyboardEvent) {
      event.preventDefault();
      this.closeTranslation();
      this.getTriggerElement()?.focus();
      return;
    }

    if (reason === 'outside-pointer') {
      this.closeTranslation();
    }
  }

  private _startPopoverOverlay(): void {
    this._ensurePopoverOverlayController().syncOpenState(true);
  }

  private _stopPopoverOverlay(): void {
    this._overlayController?.syncOpenState(false);
  }

  private _attachDrawerDismissListeners(): void {
    if (this._cleanupDrawerPointerDown !== null || this._cleanupDrawerKeyDown !== null) {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      if (!this.open || this._resolvedSurface !== 'drawer') {
        return;
      }
      if (event.defaultPrevented) {
        return;
      }
      if (typeof event.button === 'number' && event.button !== 0) {
        return;
      }

      const path = event.composedPath();
      const trigger = this.getTriggerElement();
      const content = this.getContentElement();
      if (trigger && path.includes(trigger)) {
        return;
      }
      if (content && path.includes(content)) {
        return;
      }

      this.closeTranslation();
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!this.open || this._resolvedSurface !== 'drawer' || event.key !== 'Escape') {
        return;
      }
      if (event.defaultPrevented) {
        return;
      }

      event.preventDefault();
      this.closeTranslation();
      this.getTriggerElement()?.focus();
    };

    this.ownerDocument.addEventListener('pointerdown', handlePointerDown, true);
    this.ownerDocument.addEventListener('keydown', handleKeyDown);

    this._cleanupDrawerPointerDown = (): void => {
      this.ownerDocument.removeEventListener('pointerdown', handlePointerDown, true);
      this._cleanupDrawerPointerDown = null;
    };

    this._cleanupDrawerKeyDown = (): void => {
      this.ownerDocument.removeEventListener('keydown', handleKeyDown);
      this._cleanupDrawerKeyDown = null;
    };
  }

  private _detachDrawerDismissListeners(): void {
    this._cleanupDrawerPointerDown?.();
    this._cleanupDrawerKeyDown?.();
  }

  private _syncSurfaceBehavior(): void {
    if (!this._hasTranslation || !this.open) {
      this._stopPopoverOverlay();
      this._detachDrawerDismissListeners();
      return;
    }

    if (this._resolvedSurface === 'popover') {
      this._detachDrawerDismissListeners();
      this._startPopoverOverlay();
      return;
    }

    this._stopPopoverOverlay();
    this._attachDrawerDismissListeners();
  }

  private _renderContent(): TemplateResult | typeof nothing {
    if (!this._hasTranslation) {
      return nothing;
    }

    const resolvedSurface = this._resolvedSurface;

    return html`
      <div
        id=${this._contentId}
        data-part="content"
        data-surface=${resolvedSurface}
        data-ui-overlay-surface=${resolvedSurface === 'popover'
          ? 'translation-popover'
          : 'translation-drawer'}
        role="dialog"
        aria-modal="false"
        lang=${this._resolvedTargetLang}
        ?hidden=${!this.open}
      >
        ${this._resolvedTranslated}
      </div>
    `;
  }

  override render(): TemplateResult {
    const hasTranslation = this._hasTranslation;

    return html`
      <span data-part="root" @keydown=${this._onKeyDown}>
        <button
          type="button"
          data-part="trigger"
          lang=${ifDefined(this._resolvedLang)}
          aria-haspopup=${ifDefined(hasTranslation ? 'dialog' : undefined)}
          aria-expanded=${String(hasTranslation && this.open)}
          aria-controls=${ifDefined(hasTranslation ? this._contentId : undefined)}
          aria-details=${ifDefined(hasTranslation ? this._contentId : undefined)}
          ?disabled=${!hasTranslation}
          @click=${this._onTriggerClick}
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
