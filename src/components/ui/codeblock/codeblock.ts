import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import '../../../lib/icons';
import '../copy-button/copy-button';

type CodeBlockIntent = 'neutral' | 'valid' | 'invalid';

interface IntentMeta {
  readonly label: string;
  readonly icon: string;
  readonly ariaSuffix: string;
}

const VALID_INTENTS = new Set<CodeBlockIntent>(['neutral', 'valid', 'invalid']);

const INTENT_META: Record<Exclude<CodeBlockIntent, 'neutral'>, IntentMeta> = {
  valid: {
    label: '正しい例',
    icon: 'lucide:check-circle',
    ariaSuffix: '正しいコード例',
  },
  invalid: {
    label: '誤り例',
    icon: 'lucide:alert-triangle',
    ariaSuffix: '誤りコード例',
  },
};

const LANGUAGE_LABEL_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  css: 'CSS',
  html: 'HTML',
  json: 'JSON',
  md: 'Markdown',
  markdown: 'Markdown',
  sh: 'Shell',
  bash: 'Bash',
  yml: 'YAML',
  yaml: 'YAML',
};

export const DOCUMENT_STYLE_ID = 'ui-code-block-document-styles';
export const DOCUMENT_CSS = `/* ============================================================
   <ui-code-block> document styles
   Shadow DOM の ::slotted() 制約を回避して pre/code 配下を制御
   ============================================================ */

ui-code-block pre {
  margin: 0;
  border: none;
  background: transparent !important;
  color: var(--fg-default, oklch(20% 0 0));
  font-family: var(--font-mono, monospace);
  font-size: var(--text-sm, 0.8125rem);
  line-height: var(--line-height-relaxed, 1.75);
  padding: var(--space-3, 12px);
  overflow-x: auto;
  overflow-y: hidden;
  white-space: pre;
  scrollbar-gutter: stable;
}

ui-code-block pre code {
  display: block;
  min-width: max-content;
  background: transparent !important;
}

ui-code-block pre.shiki .line {
  display: block;
}

ui-code-block pre .line.highlighted {
  background: color-mix(in oklch, var(--bg-highlight-subtle, oklch(96% 0.04 65)) 78%, transparent);
}

ui-code-block pre .line.diff.add {
  background: color-mix(in oklch, var(--success, oklch(60% 0.15 160)) 14%, transparent);
}

ui-code-block pre .line.diff.remove {
  background: color-mix(in oklch, var(--danger, oklch(55% 0.2 28)) 12%, transparent);
}

@media (prefers-color-scheme: dark) {
  ui-code-block pre.shiki {
    background-color: var(--shiki-dark-bg, transparent) !important;
    color: var(--shiki-dark, inherit) !important;
  }

  ui-code-block pre.shiki span {
    color: var(--shiki-dark, inherit) !important;
  }
}

ui-code-block pre:focus-visible {
  outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
  outline-offset: var(--focus-ring-offset, 2px);
  border-radius: var(--radius-sm, 4px);
  animation: var(--animation-focus);
}

ui-code-block[show-line-numbers] pre code {
  counter-reset: ui-code-block-line;
}

ui-code-block[show-line-numbers] pre .line {
  display: block;
  position: relative;
  padding-inline-start: calc(var(--space-8, 2rem) + var(--space-2, 0.5rem));
}

ui-code-block[show-line-numbers] pre .line::before {
  counter-increment: ui-code-block-line;
  content: counter(ui-code-block-line);
  position: absolute;
  inset-inline-start: 0;
  width: var(--space-8, 2rem);
  text-align: end;
  color: var(--fg-subtle, oklch(60% 0 0));
  user-select: none;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

ui-code-block pre[data-wrap='true'],
ui-code-block[data-wrap='true'] pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

@media (forced-colors: active) {
  ui-code-block pre .comment,
  ui-code-block pre .token.comment {
    font-style: italic;
  }
}

@media print {
  ui-code-block pre {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    font-size: 9pt !important;
    background: transparent !important;
  }
}`;

@customElement('ui-code-block')
export class CodeBlock extends LitElement {
  static override styles = css`
    :host {
      /* Breakout: 親からの変数指定があればそちらを優先 */
      --_ui-code-block-breakout-width-default: calc(100% + var(--space-8, 2rem));
      --_ui-code-block-breakout-margin-default: var(--space-n4, -1rem);

      /* 表示優先順位: 親CSS変数 > headless > default */
      --_ui-code-block-header-display: block;

      display: block;
      width: var(
        --ui-code-block-breakout-width,
        var(--_ui-code-block-breakout-width-default)
      );
      margin-inline: var(
        --ui-code-block-breakout-margin,
        var(--_ui-code-block-breakout-margin-default)
      );
    }

    @media (min-width: 768px) {
      :host {
        --_ui-code-block-breakout-width-default: calc(100% + var(--space-16, 4rem));
        --_ui-code-block-breakout-margin-default: var(--space-n8, -2rem);
      }
    }

    :host([headless]) {
      --_ui-code-block-header-display: none;
    }

    :host([embedded]) {
      --ui-code-block-breakout-width: 100%;
      --ui-code-block-breakout-margin: 0;
    }

    .root {
      margin: 0;
      position: relative;
      overflow: hidden;
      border: var(--border-style-subtle, 1px solid oklch(20% 0 0 / 0.12));
      background: var(--bg-default, oklch(1 0 0));
      border-radius:
        var(--ui-code-block-radius-top, var(--radius-md, 6px))
        var(--ui-code-block-radius-top, var(--radius-md, 6px))
        var(--ui-code-block-radius-bottom, var(--radius-md, 6px))
        var(--ui-code-block-radius-bottom, var(--radius-md, 6px));
    }

    :host([headless]) .root {
      border: none;
      background: transparent;
      border-radius: 0;
      overflow: visible;
    }

    :host([embedded]):not([headless]) .root {
      border: none;
      border-radius: 0;
    }

    .caption {
      display: var(
        --ui-code-block-header-display,
        var(--_ui-code-block-header-display, block)
      );
      padding: var(--space-2, 8px) var(--ui-code-block-padding, var(--space-2, 8px)) 0 var(--space-3, 12px);
      color: var(--fg-muted, oklch(45% 0 0));
      font-size: var(--text-xs, 12px);
      font-weight: var(--font-medium, 500);
      letter-spacing: var(--tracking-wide, 0.025em);
    }

    .caption-layout {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2, 8px);
      min-height: var(--control-height-sm, 24px);
    }

    .caption-main {
      min-width: 0;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
    }

    .filename {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* メタデータのないキャプションをオーバーレイ化し、コピーボタンのみ表示 */
    .caption-overlay > .caption {
      position: absolute;
      top: 0;
      inset-inline-end: 0;
      z-index: 1;
      padding: var(--space-1, 4px) var(--space-2, 8px);
      background: none;
    }

    .caption-overlay > .caption .caption-main {
      display: none;
    }

    .caption-overlay > .caption .caption-layout {
      justify-content: flex-end;
      min-height: 0;
    }

    .intent {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
      white-space: nowrap;
      color: var(--fg-muted, oklch(45% 0 0));
    }

    .intent iconify-icon {
      font-size: var(--icon-sm, 14px);
      flex-shrink: 0;
    }

    .copy-button-shell {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .copy-button-shell ui-copy-button {
      --_copy-button-icon-size: var(--icon-sm, 14px);

      opacity: 0.56;
      pointer-events: auto;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    :host(:hover) .copy-button-shell ui-copy-button,
    :host(:focus-within) .copy-button-shell ui-copy-button {
      opacity: 1;
      pointer-events: auto;
    }

    :host(:focus-within) .copy-button-shell ui-copy-button {
      transition-duration: var(--duration-instant, 0ms);
    }

    @media (hover: none) and (pointer: coarse) {
      .copy-button-shell ui-copy-button {
        opacity: var(--opacity-link-touch, 0.75);
        pointer-events: auto;
      }
    }

    @media (forced-colors: active) {
      .copy-button-shell {
        border: 1px solid ButtonText;
      }
    }

    @media print {
      :host {
        width: 100% !important;
        margin-inline: 0 !important;
      }

      .root {
        background: transparent !important;
        border-color: #000 !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .copy-button-shell {
        display: none !important;
      }
    }
  `;

  @property({ type: String, reflect: true })
  filename = '';

  @property({ type: String, reflect: true })
  override lang = '';

  @property({ type: String, reflect: true })
  label = '';

  @property({ type: String, reflect: true })
  intent: CodeBlockIntent = 'neutral';

  @property({ type: Boolean, attribute: 'show-line-numbers', reflect: true })
  showLineNumbers = false;

  @property({ type: Boolean, reflect: true })
  headless = false;

  @property({ type: Boolean, reflect: true })
  embedded = false;

  @property({ type: String, attribute: 'initial-code' })
  initialCode = '';

  private _copyValue = '';

  @query('slot:not([name])')
  private _defaultSlot?: HTMLSlotElement;

  @query('ui-copy-button')
  private _copyButton?: HTMLElement & { value: string };

  private _resizeObserver?: ResizeObserver;

  override connectedCallback(): void {
    super.connectedCallback();
    this._injectDocumentStyles();
    this._resizeObserver = new ResizeObserver(() => {
      this._updateScrollableState();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('intent') && !VALID_INTENTS.has(this.intent)) {
      this.intent = 'neutral';
    }

    if (changedProperties.has('lang')) {
      const normalizedLang = this._normalizedLang;
      if (normalizedLang === '') {
        this.removeAttribute('data-lang');
      } else {
        this.setAttribute('data-lang', normalizedLang);
      }
    }

    if (changedProperties.has('initialCode') && this._copyValue === '') {
      this._copyValue = this.initialCode.replace(/\r\n?/g, '\n');
    }
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (
      changedProperties.has('filename') ||
      changedProperties.has('lang') ||
      changedProperties.has('intent') ||
      changedProperties.has('initialCode')
    ) {
      this._updateAccessibleMetadata();
      this._updateCopyButtonValue();
    }

    if (changedProperties.has('showLineNumbers')) {
      this._syncSlottedPre();
    }
  }

  /**
   * コピー用に整形されたコード文字列を返します。
   * 行番号要素（line-number系）は除去して返します。
   */
  getCodeContent(): string {
    const pre = this._findPreElement();
    if (!pre) return '';

    const raw = pre.getAttribute('data-raw');
    if (typeof raw === 'string') {
      return raw;
    }

    const root = (pre.querySelector('code') ?? pre).cloneNode(true) as HTMLElement;
    root
      .querySelectorAll('.line-number,[data-line-number],.ui-code-block-line-number')
      .forEach((element) => { element.remove(); });

    return (root.textContent).replace(/\r\n?/g, '\n');
  }

  private get _resolvedIntent(): CodeBlockIntent {
    return VALID_INTENTS.has(this.intent) ? this.intent : 'neutral';
  }

  private get _resolvedFilename(): string {
    return this.filename.trim();
  }

  private get _normalizedLang(): string {
    return this.lang.trim().toLowerCase();
  }

  private get _languageLabel(): string {
    if (this._normalizedLang === '') return '';
    const mapped = LANGUAGE_LABEL_MAP[this._normalizedLang];
    if (mapped) return mapped;

    const lang = this.lang.trim();
    if (lang.length === 0) return '';

    return lang.slice(0, 1).toUpperCase() + lang.slice(1);
  }

  private get _contextName(): string {
    if (this._resolvedFilename !== '') return this._resolvedFilename;
    if (this._languageLabel !== '') return this._languageLabel;
    return 'コード';
  }

  private get _scrollAriaLabel(): string {
    if (this._contextName === 'コード') return 'コード';
    return `${this._contextName} コード`;
  }

  private get _ariaDescription(): string {
    const language = this._languageLabel || 'コード';
    if (this._resolvedIntent === 'neutral') {
      if (language === 'コード') return 'コード';
      return `${language} のコード`;
    }

    const meta = INTENT_META[this._resolvedIntent];
    if (language === 'コード') {
      return meta.ariaSuffix;
    }
    return `${language} の${meta.ariaSuffix}`;
  }

  private get _copyButtonLabel(): string {
    if (this._contextName === 'コード') return 'コードをコピー';
    return `${this._contextName} のコードをコピー`;
  }

  /** キャプションに表示すべきメタデータ（ファイル名またはintent）が存在するか */
  private get _hasCaptionContent(): boolean {
    return this._resolvedFilename !== '' || this._resolvedIntent !== 'neutral';
  }

  private get _intentMeta(): IntentMeta | null {
    if (this._resolvedIntent === 'neutral') return null;
    return INTENT_META[this._resolvedIntent];
  }

  private _injectDocumentStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DOCUMENT_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    document.head.append(style);
  }

  /** テキスト省略時のみtitle属性を付与し、冗長なツールチップを回避 */
  private _onFilenameMouseEnter = (e: MouseEvent): void => {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollWidth > el.clientWidth) {
      el.title = this._resolvedFilename;
    } else {
      el.removeAttribute('title');
    }
  };

  private _onSlotChange = (): void => {
    this._syncSlottedPre();
  };

  private _syncSlottedPre(): void {
    const pre = this._findPreElement();
    if (!pre) {
      this._copyValue = '';
      return;
    }

    this._resizeObserver?.disconnect();
    this._resizeObserver?.observe(pre);

    this._applyPreAttributes(pre);
    this._ensureLineWrappers(pre);
    this._updateAccessibleMetadata(pre);
    this._updateScrollableState(pre);
    this._updateCopyButtonValue();
  }

  private _findPreElement(): HTMLPreElement | null {
    const assigned = this._defaultSlot?.assignedElements({ flatten: true }) ?? [];
    for (const element of assigned) {
      if (element instanceof HTMLPreElement) {
        return element;
      }

      const nestedPre = element.querySelector('pre');
      if (nestedPre instanceof HTMLPreElement) {
        return nestedPre;
      }
    }

    return null;
  }

  private _applyPreAttributes(pre: HTMLPreElement): void {
    pre.setAttribute('part', 'pre');
    pre.setAttribute('aria-description', this._ariaDescription);

    const code = pre.querySelector('code');
    if (code) {
      code.setAttribute('part', 'code');
    }
  }

  private _ensureLineWrappers(pre: HTMLPreElement): void {
    if (!this.showLineNumbers) return;

    const code = pre.querySelector('code');
    const container = code ?? pre;
    if (container.querySelector('.line')) return;

    // Shikiトークンを保持するため、要素ノードを含む場合は破壊的な再構築を避ける。
    // 行ラッパー未付与のプレーンテキスト入力のみを正規化対象にする。
    if (container.childElementCount > 0) {
      return;
    }

    // 行番号の適用を優先し、.line が無い場合はプレーン行ラッパーへ正規化する
    const sourceText = (pre.getAttribute('data-raw') ?? container.textContent).replace(/\r\n?/g, '\n');
    const lines = sourceText.split('\n');

    container.textContent = '';

    lines.forEach((line, index) => {
      const lineElement = document.createElement('span');
      lineElement.className = 'line';
      lineElement.setAttribute('data-ui-code-line', '');
      lineElement.textContent = line;
      container.append(lineElement);

      if (index < lines.length - 1) {
        container.append(document.createTextNode('\n'));
      }
    });
  }

  private _updateAccessibleMetadata(targetPre?: HTMLPreElement): void {
    const pre = targetPre ?? this._findPreElement();
    if (!pre) return;

    pre.setAttribute('aria-description', this._ariaDescription);
    if (pre.hasAttribute('tabindex')) {
      pre.setAttribute('aria-label', this._scrollAriaLabel);
    }
  }

  private _updateScrollableState(targetPre?: HTMLPreElement): void {
    const pre = targetPre ?? this._findPreElement();
    if (!pre) return;

    const isOverflowing = pre.scrollWidth > pre.clientWidth + 1;
    if (isOverflowing) {
      pre.setAttribute('tabindex', '0');
      pre.setAttribute('role', 'region');
      pre.setAttribute('aria-label', this._scrollAriaLabel);
      return;
    }

    pre.removeAttribute('tabindex');
    pre.removeAttribute('role');
    pre.removeAttribute('aria-label');
  }

  private _updateCopyButtonValue(): void {
    const normalizedInitialCode = this.initialCode.replace(/\r\n?/g, '\n');
    this._copyValue = this.getCodeContent() || normalizedInitialCode;
    if (this._copyButton) {
      this._copyButton.value = this._copyValue;
    }
  }

  override render() {
    const intentMeta = this._intentMeta;

    return html`
      <figure
        class="root ${this._hasCaptionContent ? '' : 'caption-overlay'}"
        aria-description="${this._ariaDescription}"
      >
        <figcaption class="caption">
          <div class="caption-layout">
            <span class="caption-main">
              <span
                class="filename"
                @mouseenter="${this._onFilenameMouseEnter}"
              >
                ${this._resolvedFilename}
              </span>
              ${intentMeta
                ? html`
                    <span class="intent" data-intent="${this._resolvedIntent}">
                      <iconify-icon icon="${intentMeta.icon}" aria-hidden="true"></iconify-icon>
                      <span>${intentMeta.label}</span>
                    </span>
                  `
                : nothing}
            </span>
            <span class="copy-button-shell">
              <ui-copy-button
                size="sm"
                value="${this._copyValue || this.initialCode.replace(/\r\n?/g, '\n')}"
                label="${this._copyButtonLabel}"
              ></ui-copy-button>
            </span>
          </div>
        </figcaption>

        <slot @slotchange="${this._onSlotChange}"></slot>
      </figure>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-code-block': CodeBlock;
  }
}
