import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { UiPopover } from '../popover/popover';
import '../popover/popover';

interface ImportMetaEnvLike {
  DEV?: boolean;
}

type FootnoteScope = Document | HTMLElement;

export const DOCUMENT_STYLE_ID = 'ui-footnote-document-styles';

const IS_DEVELOPMENT =
  (import.meta as ImportMeta & { env?: ImportMetaEnvLike }).env?.DEV ?? true;

const SCOPE_SELECTOR = '[data-footnote-scope], article, [role="article"], [data-note-root], main';

const INTERACTIVE_ANCESTOR_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
].join(', ');

const DOCUMENT_CSS = `
ui-footnote {
  --footnote-popover-max-width: 400px;
  display: inline;
  font-family: inherit;
  line-height: inherit;
}

ui-footnote [data-part='trigger'] {
  display: inline-flex;
  align-items: baseline;
  margin-inline: 0.1em;
  color: var(--fg-muted, oklch(48% 0 0));
  font-size: max(var(--text-xs, 12px), 12px);
  font-weight: var(--font-medium, 500);
  letter-spacing: var(--tracking-wide, 0.02em);
  line-height: var(--line-height-none, 1);
  text-decoration: none;
  cursor: pointer;
  border-radius: var(--radius-sm, 4px);
  transition:
    color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
    background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
}

ui-footnote [data-part='trigger'] > sup {
  font-size: inherit;
  line-height: 1;
  vertical-align: super;
}

ui-footnote [data-part='trigger']:hover,
ui-footnote [data-part='trigger']:focus-visible {
  color: var(--primary, oklch(56% 0.16 252));
  text-decoration: underline;
}

ui-footnote [data-part='trigger']:focus-visible {
  outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 252));
  outline-offset: var(--focus-ring-offset, 2px);
  animation: var(--animation-focus);
}

ui-footnote ui-popover[data-part='popover-host'] {
  --ui-popover-max-width: min(90vw, var(--footnote-popover-max-width));
  --ui-popover-max-height: 60vh;
}

ui-footnote [data-part='content'] {
  overflow-y: auto;
  font-family: var(--font-sans, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: var(--text-sm, 13px);
  line-height: var(--line-height-relaxed, 1.75);
}

ui-footnote .footnote-body > :first-child {
  margin-block-start: 0;
}

ui-footnote .footnote-body > :last-child {
  margin-block-end: 0;
}

ui-footnote .footnote-popover-footer {
  margin-block-start: var(--space-3, 12px);
  padding-block-start: var(--space-1, 4px);
  border-top: 1px solid var(--border-ghost, oklch(88% 0 0 / 0.5));
}

ui-footnote .footnote-list-link {
  color: var(--fg-muted, oklch(48% 0 0));
  font-size: 10px;
  font-weight: var(--font-medium, 500);
  letter-spacing: var(--tracking-wide, 0.02em);
  text-decoration: none;
}

ui-footnote .footnote-list-link:hover,
ui-footnote .footnote-list-link:focus-visible {
  color: var(--primary, oklch(56% 0.16 252));
  text-decoration: underline;
}

ui-footnote .sr-only,
section.footnotes .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

section.footnotes {
  margin-block-start: var(--space-16, 64px);
  padding-block-start: var(--space-8, 32px);
  border-block-start: var(--border-width, 1px) solid var(--border-default, oklch(86% 0 0));
}

section.footnotes ol {
  list-style-position: inside;
  padding-inline-start: 0;
}

section.footnotes li {
  margin-block-end: var(--space-3, 12px);
  color: var(--fg-default, oklch(20% 0 0));
  font-size: var(--text-sm, 13px);
}

section.footnotes li:target {
  background: var(--bg-active, oklch(95% 0 0));
  border-radius: var(--radius-sm, 4px);
}

section.footnotes a[data-footnote-backref] {
  color: var(--fg-muted, oklch(48% 0 0));
  text-decoration: none;
}

section.footnotes a[data-footnote-backref]:hover,
section.footnotes a[data-footnote-backref]:focus-visible {
  color: var(--primary, oklch(56% 0.16 252));
}

@media (prefers-reduced-motion: reduce) {
  ui-footnote [data-part='trigger'] {
    transition-duration: var(--duration-instant, 0ms);
  }
}

@media (forced-colors: active) {
  ui-footnote [data-part='trigger'] {
    color: LinkText;
  }

  section.footnotes {
    border-block-start: 1px solid CanvasText;
  }
}

@media print {
  ui-footnote [data-part='trigger'] {
    color: currentColor;
    text-decoration: underline;
  }
}
`;

const escapeCssIdentifier = (value: string): string => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
};

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;

@customElement('ui-footnote')
export class Footnote extends LitElement {
  @property({ type: String, attribute: 'ref-id' })
  refId = '';

  @property({ type: Number })
  index = 1;

  @property({ type: Number, attribute: 'ref-instance' })
  refInstance = 1;

  @property({ type: Boolean, reflect: true })
  shared = false;

  private readonly _contentNodes: Node[] = [];
  private readonly _reportedDiagnostics = new Set<string>();
  private readonly _fallbackBaseId = `ui-footnote-invalid-${Math.random().toString(36).slice(2, 11)}`;

  private _didCaptureContent = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._injectDocumentStyles();
    queueMicrotask(() => {
      this._runDiagnostics();
    });
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (!this._didCaptureContent) {
      this._captureInitialContentNodes();
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (
      changedProperties.has('refId') ||
      changedProperties.has('index') ||
      changedProperties.has('refInstance') ||
      changedProperties.has('shared')
    ) {
      this._runDiagnostics();
    }
  }

  private get _resolvedIndex(): number {
    const normalized = Math.trunc(this.index);
    return isPositiveInteger(normalized) ? normalized : 1;
  }

  private get _resolvedRefInstance(): number {
    const normalized = Math.trunc(this.refInstance);
    return isPositiveInteger(normalized) ? normalized : 1;
  }

  private get _resolvedRefId(): string {
    return this.refId.trim();
  }

  private get _resolvedBaseId(): string {
    return this._resolvedRefId === '' ? this._fallbackBaseId : this._resolvedRefId;
  }

  private get _resolvedTriggerId(): string {
    return `${this._resolvedBaseId}-ref-${String(this._resolvedRefInstance)}`;
  }

  private get _resolvedPopoverId(): string {
    return `${this._resolvedBaseId}-popover`;
  }

  private get _resolvedPopoverHostId(): string {
    return `${this._resolvedBaseId}-popover-host`;
  }

  private get _resolvedLabelId(): string {
    return `${this._resolvedBaseId}-label`;
  }

  private get _resolvedHref(): string {
    return this._resolvedRefId === '' ? '#' : `#${this._resolvedRefId}`;
  }

  private get _supportsPopoverApi(): boolean {
    if (typeof HTMLElement === 'undefined') return false;
    return 'showPopover' in HTMLElement.prototype && 'hidePopover' in HTMLElement.prototype;
  }

  private _resolveScope(): FootnoteScope {
    return this.closest<HTMLElement>(SCOPE_SELECTOR) ?? document;
  }

  private _getScopeRoot(): ParentNode {
    const scope = this._resolveScope();
    return scope instanceof Document ? scope : scope;
  }

  private _getScopeFootnotes(refId: string): Footnote[] {
    if (refId === '') return [];
    const root = this._getScopeRoot();
    return Array.from(root.querySelectorAll<Footnote>('ui-footnote')).filter(
      (footnote) => footnote.refId.trim() === refId,
    );
  }

  private _captureInitialContentNodes(): void {
    if (this._didCaptureContent) return;

    // SSR で埋め込まれた脚注本文を保持して、Light DOM 再描画時にも失わないようにする。
    const existingContent = this.querySelector<HTMLElement>('[data-part="content"]');
    const sourceNodes = existingContent
      ? Array.from(existingContent.childNodes)
      : Array.from(this.childNodes);

    const renderableNodes = sourceNodes.filter((node) => this._isRenderableContentNode(node));
    this._contentNodes.push(...renderableNodes.map((node) => node.cloneNode(true)));

    // CSR では初期子ノードを退避後に除去し、再描画時の二重化を防ぐ。
    if (!existingContent) {
      for (const node of renderableNodes) {
        node.remove();
      }
    }

    this._didCaptureContent = true;
  }

  private _isRenderableContentNode(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent?.trim() ?? '') !== '';
    }

    if (!(node instanceof HTMLElement)) return true;

    const part = node.getAttribute('data-part');
    if (part === 'trigger' || part === 'content' || part === 'popover-host') return false;

    if (node.classList.contains('footnote-popover-footer')) return false;
    if (node.classList.contains('footnote-list-link')) return false;
    if (node.classList.contains('sr-only') && node.id === this._resolvedLabelId) return false;

    return true;
  }

  private _injectDocumentStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DOCUMENT_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    document.head.append(style);
  }

  private _warnDiagnostic(key: string, message: string): void {
    if (!IS_DEVELOPMENT) return;
    if (this._reportedDiagnostics.has(key)) return;
    this._reportedDiagnostics.add(key);
    console.warn(`[ui-footnote] ${message}`, this);
  }

  private _getScopeEndnotes(): HTMLElement | null {
    return this._getScopeRoot().querySelector<HTMLElement>('section.footnotes[role="doc-endnotes"]');
  }

  private _getScopeEndnoteItem(refId: string): HTMLElement | null {
    if (refId === '') return null;
    const endnotes = this._getScopeEndnotes();
    if (!endnotes) return null;
    return endnotes.querySelector<HTMLElement>(`#${escapeCssIdentifier(refId)}`);
  }

  private _runDiagnostics(): void {
    const refId = this._resolvedRefId;
    const sameRefFootnotes = this._getScopeFootnotes(refId);
    const owners = sameRefFootnotes.filter((footnote) => !footnote.shared);
    const sameInstanceFootnotes = sameRefFootnotes.filter(
      (footnote) => footnote._resolvedRefInstance === this._resolvedRefInstance,
    );

    if (refId === '') {
      this._warnDiagnostic('missing-ref-id', 'refId は必須です。index からの黙示補完には依存しません。');
    }

    if (this.refId !== this.refId.trim()) {
      this._warnDiagnostic(
        'trimmed-ref-id',
        'refId の前後空白は安定識別子として不適切です。明示的に正規化してください。',
      );
    }

    if (/\s/.test(refId)) {
      this._warnDiagnostic(
        'whitespace-ref-id',
        'refId に空白を含めないでください。安定識別子として扱えません。',
      );
    }

    if (!isPositiveInteger(this.index)) {
      this._warnDiagnostic(
        'invalid-index',
        'index は正の整数で指定してください。現在は縮退表示として 1 を使用しています。',
      );
    }

    if (!isPositiveInteger(this.refInstance)) {
      this._warnDiagnostic(
        'invalid-ref-instance',
        'refInstance は正の整数で指定してください。現在は縮退表示として 1 を使用しています。',
      );
    }

    if (this.shared && this._contentNodes.length > 0) {
      this._warnDiagnostic(
        'shared-has-content',
        'secondary reference は本文入力を持てません。本文は primary reference だけに与えてください。',
      );
    }

    const interactiveAncestor = this.parentElement?.closest(INTERACTIVE_ANCESTOR_SELECTOR) ?? null;
    if (interactiveAncestor) {
      this._warnDiagnostic(
        'interactive-ancestor',
        'ui-footnote を interactive ancestor の内側で使用しないでください。',
      );
    }

    if (refId !== '' && owners.length > 1) {
      this._warnDiagnostic(
        'multiple-primary',
        `refId="${refId}" に対する primary reference は 1 つだけにしてください。`,
      );
    }

    if (refId !== '' && sameInstanceFootnotes.length > 1) {
      this._warnDiagnostic(
        'duplicate-ref-instance',
        `refId="${refId}" 配下で refInstance="${String(this._resolvedRefInstance)}" が重複しています。`,
      );
    }

    if (this.shared && refId !== '' && owners.length === 0) {
      this._warnDiagnostic(
        'missing-primary',
        `secondary reference refId="${refId}" に対応する primary reference が scope 内に見つかりません。`,
      );
    }

    const endnotes = this._getScopeEndnotes();
    if (!endnotes) {
      this._warnDiagnostic(
        'missing-endnotes',
        '同一 scope 内に section.footnotes[role="doc-endnotes"] が必要です。',
      );
      return;
    }

    const endnoteItem = this._getScopeEndnoteItem(refId);
    if (refId !== '' && !endnoteItem) {
      this._warnDiagnostic(
        'missing-endnote-item',
        `endnotes 内に id="${refId}" の脚注項目が見つかりません。`,
      );
      return;
    }

    if (refId !== '' && endnoteItem) {
      const backlinkSelector = `a[data-footnote-backref][href="#${escapeCssIdentifier(this._resolvedTriggerId)}"]`;
      if (!endnoteItem.querySelector(backlinkSelector)) {
        this._warnDiagnostic(
          'missing-backlink',
          `endnote item "${refId}" に "${this._resolvedTriggerId}" への backlink がありません。`,
        );
      }
    }
  }

  private _getSharedPopoverHost(): UiPopover | null {
    const refId = this._resolvedRefId;
    if (refId === '') return null;

    const root = this._getScopeRoot();
    const ownerSelector = `ui-footnote[ref-id="${escapeCssIdentifier(refId)}"]:not([shared])`;
    const host = root.querySelector<HTMLElement>(
      `${ownerSelector} ui-popover[data-part="popover-host"]`,
    );

    if (!(host instanceof HTMLElement)) return null;
    if (host.tagName.toLowerCase() !== 'ui-popover') return null;
    return host as UiPopover;
  }

  private _getOwnPopoverHost(): UiPopover | null {
    const host = this.querySelector<HTMLElement>('[data-part="popover-host"]');
    if (!(host instanceof HTMLElement)) return null;
    if (host.tagName.toLowerCase() !== 'ui-popover') return null;
    return host as UiPopover;
  }

  private _resolvePopoverHost(): UiPopover | null {
    if (this.shared) {
      return this._getSharedPopoverHost();
    }
    return this._getOwnPopoverHost();
  }

  private _isPrimaryTriggerClick(event: MouseEvent): boolean {
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      !event.defaultPrevented
    );
  }

  private _onSharedTriggerClick = (event: MouseEvent): void => {
    if (!this._isPrimaryTriggerClick(event)) return;
    if (!this._supportsPopoverApi) return;

    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLElement)) return;

    const popoverHost = this._getSharedPopoverHost();
    if (!popoverHost) return;

    event.preventDefault();
    popoverHost.openForTrigger(trigger, { returnFocus: true });
  };

  private _onFooterLinkClick = (): void => {
    const popoverHost = this._resolvePopoverHost();
    if (!popoverHost) return;
    popoverHost.close({ returnFocus: false });
  };

  private _onFooterLinkKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || event.shiftKey) return;
    const popoverHost = this._resolvePopoverHost();
    if (!popoverHost) return;
    popoverHost.close({ returnFocus: false });
  };

  private _renderBodyContent(): TemplateResult | typeof nothing {
    if (this._contentNodes.length === 0) return nothing;
    return html`${this._contentNodes}`;
  }

  private _renderTriggerTemplate(sharedTrigger: boolean): TemplateResult {
    const index = this._resolvedIndex;

    if (sharedTrigger) {
      return html`
        <a
          id="${this._resolvedTriggerId}"
          data-part="trigger"
          href="${this._resolvedHref}"
          role="doc-noteref"
          aria-controls="${this._resolvedPopoverId}"
          aria-expanded="false"
          aria-details="${this._resolvedPopoverId}"
          @click="${this._onSharedTriggerClick}"
        >
          <sup>[${String(index)}]</sup>
        </a>
      `;
    }

    return html`
      <a
        id="${this._resolvedTriggerId}"
        data-part="trigger"
        slot="trigger"
        href="${this._resolvedHref}"
        role="doc-noteref"
        aria-controls="${this._resolvedPopoverId}"
        aria-expanded="false"
        aria-details="${this._resolvedPopoverId}"
      >
        <sup>[${String(index)}]</sup>
      </a>
    `;
  }

  override render(): TemplateResult {
    const index = this._resolvedIndex;

    if (this.shared) {
      return this._renderTriggerTemplate(true);
    }

    return html`
      <ui-popover
        id="${this._resolvedPopoverHostId}"
        data-part="popover-host"
        placement="bottom-start"
        .offset=${8}
        keep-link-fallback
      >
        ${this._renderTriggerTemplate(false)}
        <div
          id="${this._resolvedPopoverId}"
          data-part="content"
          slot="content"
          role="note"
          aria-labelledby="${this._resolvedLabelId}"
        >
          <span id="${this._resolvedLabelId}" class="sr-only">脚注 ${String(index)}</span>
          <div class="footnote-body">${this._renderBodyContent()}</div>
          <footer class="footnote-popover-footer">
            <a
              href="${this._resolvedHref}"
              class="footnote-list-link"
              @click="${this._onFooterLinkClick}"
              @keydown="${this._onFooterLinkKeyDown}"
            >
              脚注一覧で見る <span aria-hidden="true">→</span>
            </a>
          </footer>
        </div>
      </ui-popover>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-footnote': Footnote;
  }
}
