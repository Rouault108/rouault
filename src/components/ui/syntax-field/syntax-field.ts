import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

const DOCUMENT_STYLE_ID = 'ui-syntax-field-document-styles';

export const DOCUMENT_CSS = `
ui-syntax-field {
  display: contents;
}

ui-syntax-field .field-wrapper {
  display: block;
  margin: 0px;
  padding: var(--space-2, 0.5rem);
  border: none;
}

ui-syntax-field .field-term,
ui-syntax-field .field-description {
  margin: 0;
  min-width: 0;
}

ui-syntax-field .field-term {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2, 0.5rem);
  margin-bottom: var(--space-2, 0.5rem);
}

ui-syntax-field .field-name {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-sm, 0.8125rem);
  font-weight: var(--font-semibold, 600);
  color: var(--fg-default, oklch(20% 0 0));
  line-height: var(--line-height-normal, 1.5);
  overflow-wrap: break-word;
  word-break: normal;
}

ui-syntax-field .field-required {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs, 0.75rem);
  font-weight: var(--font-semibold, 600);
  text-transform: none;
  color: var(--fg-warning, oklch(55% 0.15 55));
  background-color: transparent;
  border: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
  padding: calc(var(--space-1, 0.25rem) * 0.5) var(--space-2, 0.5rem);
  border-radius: var(--radius-sm, 4px);
  line-height: 1.2;
}

ui-syntax-field .field-type,
ui-syntax-field .field-default {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs, 0.75rem);
  font-weight: var(--font-medium, 500);
  color: var(--fg-muted, oklch(48% 0 0));
  line-height: 1.4;
  overflow-wrap: break-word;
  word-break: normal;
}

ui-syntax-field .field-default-with-type {
  margin-inline-start: var(--space-2, 0.5rem);
}

ui-syntax-field .field-description {
  margin-left: 0;
  font-family: var(--font-sans, sans-serif);
  font-size: var(--text-sm, 0.8125rem);
  font-weight: var(--font-normal, 400);
  color: var(--fg-default, oklch(20% 0 0));
  line-height: var(--line-height-normal, 1.5);
}

@media (min-width: 768px) {
  ui-syntax-field .field-wrapper {
    display: grid;
    grid-template-columns: minmax(min-content, 30%) 1fr;
    column-gap: var(--space-6, 1.5rem);
    align-items: baseline;
  }

  ui-syntax-field .field-term {
    gap: var(--space-3, 0.75rem);
    margin-bottom: 0;
  }
}

@media (hover: hover) {
  ui-syntax-field .field-wrapper:hover {
    background-color: var(--bg-hover, oklch(0% 0 0 / 0.05));
    cursor: default;
    border-radius: var(--radius-md, 6px);
    transition: background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
  }
}

@media (forced-colors: active) {
  ui-syntax-field .field-wrapper:hover {
    outline: var(--border-width, 1px) solid CanvasText;
    outline-offset: calc(-1 * var(--border-width, 1px));
  }

  ui-syntax-field .field-required {
    border: var(--border-width, 1px) solid CanvasText;
  }

  ui-syntax-field .field-type,
  ui-syntax-field .field-default {
    color: CanvasText;
  }
}

@media (prefers-reduced-motion: reduce) {
  ui-syntax-field .field-wrapper:hover {
    transition-duration: 0.01ms;
  }
}

@media print {
  ui-syntax-field .field-wrapper {
    display: grid;
    grid-template-columns: minmax(min-content, 30%) 1fr;
    column-gap: var(--space-6, 1.5rem);
    page-break-inside: avoid;
    background-color: transparent !important;
    border-radius: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    outline: none !important;
  }

  ui-syntax-field .field-required {
    background-color: transparent !important;
  }
}
`;

@customElement('ui-syntax-field')
export class SyntaxField extends LitElement {
  @property({ type: String })
  name = '';

  @property({ type: String, attribute: 'type' })
  fieldType = '';

  @property({ type: Boolean })
  required = false;

  @property({ type: String, attribute: 'default' })
  defaultValue = '';

  @state()
  private _descriptionNodes: Node[] = [];

  private _didCaptureDescription = false;
  private _descriptionObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    this._captureInitialDescriptionNodes();
    super.connectedCallback();
    this._injectDocumentStyles();
    this._observeDescriptionChanges();
  }

  override disconnectedCallback(): void {
    this._descriptionObserver?.disconnect();
    this._descriptionObserver = null;
    super.disconnectedCallback();
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private get _resolvedName(): string {
    return this.name.trim();
  }

  private get _resolvedType(): string {
    return this.fieldType.trim();
  }

  private get _resolvedDefaultValue(): string {
    return this.defaultValue.trim();
  }

  private _captureInitialDescriptionNodes(): void {
    if (this._didCaptureDescription) return;

    // Light DOM レンダリング時に説明文ノードを失わないよう初期子ノードを保持する
    this._descriptionNodes = Array.from(this.childNodes).filter(
      (node) => !(node instanceof HTMLElement && node.classList.contains('field-wrapper')),
    );
    this._didCaptureDescription = true;
  }

  private _observeDescriptionChanges(): void {
    if (typeof MutationObserver === 'undefined' || this._descriptionObserver) return;

    this._descriptionObserver = new MutationObserver((records) => {
      const wrapper = this.querySelector('.field-wrapper');
      const addedDescriptionNodes: Node[] = [];

      for (const record of records) {
        if (record.type !== 'childList') continue;

        for (const node of Array.from(record.addedNodes)) {
          if (wrapper && node === wrapper) continue;
          if (this._descriptionNodes.includes(node) || addedDescriptionNodes.includes(node))
            continue;
          addedDescriptionNodes.push(node);
        }
      }

      if (addedDescriptionNodes.length === 0) return;

      // 外部から追加された説明文ノードを追従して dd へ再配置する
      this._descriptionNodes = [...this._descriptionNodes, ...addedDescriptionNodes];
      this.requestUpdate();
    });

    this._descriptionObserver.observe(this, { childList: true });
  }

  private _injectDocumentStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DOCUMENT_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    document.head.append(style);
  }

  override render() {
    const typeValue = this._resolvedType;
    const defaultValue = this._resolvedDefaultValue;

    const hasType = typeValue !== '';
    const hasDefault = defaultValue !== '';

    return html`
      <div class="field-wrapper">
        <dt class="field-term">
          <span class="field-name">${this._resolvedName}</span>
          ${this.required
            ? html`<span class="field-required" aria-label="必須">必須</span>`
            : nothing}
          ${hasType ? html`<span class="field-type">${typeValue}</span>` : nothing}
          ${hasDefault
            ? html`<span class="field-default ${hasType ? 'field-default-with-type' : ''}">
                default: ${defaultValue}
              </span>`
            : nothing}
        </dt>
        <dd class="field-description">${this._descriptionNodes}</dd>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-syntax-field': SyntaxField;
  }
}
