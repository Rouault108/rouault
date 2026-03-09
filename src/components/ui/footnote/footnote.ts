import { html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { UiPopover } from '../popover/popover';
import '../popover/popover';

const DOCUMENT_STYLE_ID = 'ui-footnote-document-styles';

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
  color: var(--fg-muted, oklch(48% 0.01 250));
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
  border-top: 1px solid var(--border-ghost, oklch(88% 0.01 250 / 0.5));
}

ui-footnote .footnote-list-link {
  color: var(--fg-muted, oklch(48% 0.01 250));
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
  border-block-start: var(--border-width, 1px) solid var(--border-default, oklch(86% 0.01 250));
}

section.footnotes ol {
  list-style-position: inside;
  padding-inline-start: 0;
}

section.footnotes li {
  margin-block-end: var(--space-3, 12px);
  color: var(--fg-default, oklch(20% 0.01 250));
  font-size: var(--text-sm, 13px);
}

section.footnotes li:target {
  background: var(--bg-active, oklch(95% 0.01 250));
  border-radius: var(--radius-sm, 4px);
}

section.footnotes a[href^='#fnref-'] {
  color: var(--fg-muted, oklch(48% 0.01 250));
  text-decoration: none;
}

section.footnotes a[href^='#fnref-']:hover,
section.footnotes a[href^='#fnref-']:focus-visible {
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

  private _contentNodes: Node[] = [];
  private _didCaptureContent = false;

  override connectedCallback(): void {
    this._captureInitialContentNodes();
    super.connectedCallback();
    this._injectDocumentStyles();
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private get _resolvedIndex(): number {
    const normalized = Math.trunc(this.index);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 1;
  }

  private get _resolvedRefInstance(): number {
    const normalized = Math.trunc(this.refInstance);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 1;
  }

  private get _resolvedRefId(): string {
    const explicit = this.refId.trim();
    const fallback = `fn-${String(this._resolvedIndex)}`;
    return (explicit === '' ? fallback : explicit).replace(/\s+/g, '-');
  }

  private get _resolvedTriggerId(): string {
    return `fnref-${String(this._resolvedIndex)}-${String(this._resolvedRefInstance)}`;
  }

  private get _resolvedPopoverId(): string {
    return `${this._resolvedRefId}-popover`;
  }

  private get _resolvedPopoverHostId(): string {
    return `${this._resolvedRefId}-popover-host`;
  }

  private get _resolvedLabelId(): string {
    return `${this._resolvedRefId}-label`;
  }

  private get _supportsPopoverApi(): boolean {
    if (typeof HTMLElement === 'undefined') return false;
    return 'showPopover' in HTMLElement.prototype && 'hidePopover' in HTMLElement.prototype;
  }

  private _captureInitialContentNodes(): void {
    if (this._didCaptureContent) return;

    // SSR で埋め込まれた脚注本文を保持して、Light DOM 再描画時にも失わないようにする。
    const existingContent = this.querySelector<HTMLElement>('[data-part="content"]');
    const sourceNodes = existingContent ? Array.from(existingContent.childNodes) : Array.from(this.childNodes);

    const renderableNodes = sourceNodes.filter((node) => this._isRenderableContentNode(node));
    this._contentNodes = renderableNodes.map((node) => node.cloneNode(true));

    // CSR: キャプチャ済みの元ノードを除去し、Lit の Light DOM 描画との重複を防ぐ。
    // SSR の場合は existingContent（[data-part="content"]）が存在するため除去しない。
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

  private _getSharedPopoverHost(): UiPopover | null {
    const host = document.getElementById(this._resolvedPopoverHostId);
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
    const refId = this._resolvedRefId;
    const index = this._resolvedIndex;
    const triggerId = this._resolvedTriggerId;
    const popoverId = this._resolvedPopoverId;

    if (sharedTrigger) {
      return html`
        <a
          id="${triggerId}"
          data-part="trigger"
          href="#${refId}"
          role="doc-noteref"
          aria-controls="${popoverId}"
          aria-expanded="false"
          aria-details="${popoverId}"
          @click="${this._onSharedTriggerClick}"
        >
          <sup>[${String(index)}]</sup>
        </a>
      `;
    }

    return html`
      <a
        id="${triggerId}"
        data-part="trigger"
        slot="trigger"
        href="#${refId}"
        role="doc-noteref"
        aria-controls="${popoverId}"
        aria-expanded="false"
        aria-details="${popoverId}"
      >
        <sup>[${String(index)}]</sup>
      </a>
    `;
  }

  override render(): TemplateResult {
    const refId = this._resolvedRefId;
    const index = this._resolvedIndex;
    const popoverId = this._resolvedPopoverId;
    const labelId = this._resolvedLabelId;

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
          id="${popoverId}"
          data-part="content"
          slot="content"
          role="note"
          aria-labelledby="${labelId}"
        >
          <span id="${labelId}" class="sr-only">脚注 ${String(index)}</span>
          <div class="footnote-body">${this._renderBodyContent()}</div>
          <footer class="footnote-popover-footer">
            <a
              href="#${refId}"
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
