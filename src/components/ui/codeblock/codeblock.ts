import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../../../lib/icons';
import '../copy-button/copy-button';

type CodeBlockIntent = 'neutral' | 'valid' | 'invalid';
type CodeBlockCopyMode = 'auto' | 'always' | 'hidden';
type CodeBlockLayout = 'standalone' | 'inline';

interface IntentMeta {
  readonly label: string;
  readonly icon: string;
  readonly ariaSuffix: string;
}

const VALID_INTENTS = new Set<CodeBlockIntent>(['neutral', 'valid', 'invalid']);
const VALID_COPY_MODES = new Set<CodeBlockCopyMode>(['auto', 'always', 'hidden']);
const VALID_LAYOUTS = new Set<CodeBlockLayout>(['standalone', 'inline']);
const FALSE_BOOLEAN_ATTRIBUTE_VALUES = new Set(['false', '0', 'off', 'no']);

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

const copyableAttributeConverter = {
  fromAttribute: (value: string | null): boolean => {
    if (value === null) {
      return true;
    }

    return !FALSE_BOOLEAN_ATTRIBUTE_VALUES.has(value.trim().toLowerCase());
  },
  toAttribute: (value: boolean): string | null => (value ? '' : 'false'),
};

const normalizeLineEndings = (value: string): string => value.replace(/\r\n?/g, '\n');

const parseHighlightLines = (value: string): Set<number> => {
  const lines = new Set<number>();
  const tokens = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token !== '');

  for (const token of tokens) {
    const rangeMatch = /^(\d+)-(\d+)$/.exec(token);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1] ?? '', 10);
      const end = Number.parseInt(rangeMatch[2] ?? '', 10);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start) {
        continue;
      }

      for (let index = start; index <= end; index += 1) {
        lines.add(index);
      }
      continue;
    }

    const single = Number.parseInt(token, 10);
    if (Number.isFinite(single) && single > 0) {
      lines.add(single);
    }
  }

  return lines;
};

const isWhitespaceOnlyTextNode = (node: ChildNode): node is Text =>
  node.nodeType === Node.TEXT_NODE && /^[\t\r\n ]*$/.test(node.textContent ?? '');

const isDirectLineContainer = (element: Element): boolean => {
  const children = Array.from(element.children);
  return children.length > 0 && children.every((child) => child.classList.contains('line'));
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
  font-size: var(--text-lg, 1rem);
  line-height: var(--line-height-code, 1.45);
  padding: var(--ui-code-surface-padding, var(--ui-code-block-padding, var(--space-3, 12px)));
  overflow-x: auto;
  overflow-y: hidden;
  white-space: pre;
  scrollbar-gutter: stable;
}

ui-code-block pre.shiki > .line,
ui-code-block pre.shiki code > .line {
  display: block;
}

ui-code-block pre code {
  display: block;
  min-width: max-content;
  background: transparent !important;
}

ui-code-block pre.shiki .line {
  display: block;
}

ui-code-block pre .line.highlighted,
ui-code-block pre .line.ui-explicit-highlight {
  background: color-mix(in oklch, var(--bg-highlight-subtle, oklch(96% 0.04 65)) 78%, transparent);
}

ui-code-block pre .line.diff.add {
  background: color-mix(in oklch, var(--success, oklch(60% 0.15 160)) 14%, transparent);
}

ui-code-block pre .line.diff.remove {
  background: color-mix(in oklch, var(--danger, oklch(55% 0.2 28)) 12%, transparent);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) ui-code-block pre.shiki {
    background-color: var(--shiki-dark-bg, transparent) !important;
    color: var(--shiki-dark, inherit) !important;
  }

  :root:not([data-theme='light']) ui-code-block pre.shiki span {
    color: var(--shiki-dark, inherit) !important;
  }
}

:root[data-theme='dark'] ui-code-block pre.shiki {
  background-color: var(--shiki-dark-bg, transparent) !important;
  color: var(--shiki-dark, inherit) !important;
}

:root[data-theme='dark'] ui-code-block pre.shiki span {
  color: var(--shiki-dark, inherit) !important;
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

ui-code-block[wrap] pre,
ui-code-block[data-wrap='true'] pre,
ui-code-block pre[data-wrap='true'] {
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
      --_ui-code-surface-breakout-width-default: calc(100% + var(--space-8, 2rem));
      --_ui-code-surface-breakout-margin-default: var(--space-n4, -1rem);
      --_ui-code-header-display: block;

      display: block;
      width: var(
        --ui-code-surface-breakout-width,
        var(--ui-code-block-breakout-width, var(--_ui-code-surface-breakout-width-default))
      );
      margin-inline: var(
        --ui-code-surface-breakout-margin,
        var(--ui-code-block-breakout-margin, var(--_ui-code-surface-breakout-margin-default))
      );
    }

    @media (min-width: 768px) {
      :host {
        --_ui-code-surface-breakout-width-default: calc(100% + var(--space-16, 4rem));
        --_ui-code-surface-breakout-margin-default: var(--space-n8, -2rem);
      }
    }

    :host([headless]) {
      --_ui-code-header-display: none;
    }

    .root {
      margin: 0;
      position: relative;
      overflow: hidden;
      border: var(
        --ui-code-block-border,
        var(--border-style-subtle, 1px solid oklch(20% 0 0 / 0.12))
      );
      background: var(--ui-code-block-background, var(--bg-default, oklch(1 0 0)));
      border-radius: var(
          --ui-code-surface-radius-top,
          var(--ui-code-block-radius-top, var(--radius-md, 6px))
        )
        var(--ui-code-surface-radius-top, var(--ui-code-block-radius-top, var(--radius-md, 6px)))
        var(
          --ui-code-surface-radius-bottom,
          var(--ui-code-block-radius-bottom, var(--radius-md, 6px))
        )
        var(
          --ui-code-surface-radius-bottom,
          var(--ui-code-block-radius-bottom, var(--radius-md, 6px))
        );
    }

    :host([headless]) .root {
      border: none;
      background: transparent;
      border-radius: 0;
      overflow: visible;
    }

    .root[data-layout='inline'] {
      border: none;
      border-radius: 0;
    }

    .caption {
      display: var(
        --ui-code-header-display,
        var(--ui-code-block-header-display, var(--_ui-code-header-display, block))
      );
      padding: var(--space-2, 8px)
        var(--ui-code-surface-padding, var(--ui-code-block-padding, var(--space-2, 8px))) 0
        var(--ui-code-surface-padding, var(--ui-code-block-padding, var(--space-3, 12px)));
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

    .caption-overlay > .caption {
      position: absolute;
      top: calc(
        var(--ui-code-surface-padding, var(--ui-code-block-padding, var(--space-3, 12px))) -
          (
            var(--control-height-sm, 24px) -
              (var(--text-sm, 0.8125rem) * var(--line-height-code, 1.45))
          ) / 2
      );
      inset-inline-end: 0;
      z-index: 1;
      padding: 0 var(--space-2, 8px);
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

  @property({ type: String, attribute: 'group-key', reflect: true })
  groupKey = '';

  @property({ type: String, attribute: 'tab-label', reflect: true })
  tabLabel = '';

  @property({ type: String, attribute: 'copy-label', reflect: true })
  copyLabel = '';

  @property({ type: String, reflect: true })
  intent: CodeBlockIntent = 'neutral';

  @property({ type: Boolean, attribute: 'show-line-numbers', reflect: true })
  showLineNumbers = false;

  @property({ type: String, attribute: 'copy-mode', reflect: true })
  copyMode: CodeBlockCopyMode = 'auto';

  @property({ reflect: true, converter: copyableAttributeConverter })
  copyable = true;

  @property({ type: Boolean, reflect: true })
  wrap = false;

  @property({ type: String, attribute: 'highlight-lines', reflect: true })
  highlightLines = '';

  @property({ type: String })
  layout: CodeBlockLayout = 'standalone';

  @property({ type: Boolean, reflect: true })
  headless = false;

  @property({ type: Boolean, reflect: true })
  embedded = false;

  @property({ type: String, attribute: 'initial-code' })
  initialCode = '';

  @state()
  private _copyValue = '';

  @query('slot:not([name])')
  private _defaultSlot?: HTMLSlotElement;

  private _contentObserver?: MutationObserver;

  private _hasCompletedFirstUpdate = false;

  private _isSyncingPre = false;

  private _resizeObserver?: ResizeObserver;

  override connectedCallback(): void {
    super.connectedCallback();
    this._injectDocumentStyles();
    this._resizeObserver = new ResizeObserver(() => {
      this._updateScrollableState();
    });
    this._contentObserver = new MutationObserver(() => {
      if (this._isSyncingPre) {
        return;
      }

      this._syncSlottedPre();
      if (this._hasCompletedFirstUpdate) {
        this._dispatchChange(['content'], true);
      }
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._contentObserver?.disconnect();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('intent') && !VALID_INTENTS.has(this.intent)) {
      this.intent = 'neutral';
    }

    if (changedProperties.has('copyMode') && !VALID_COPY_MODES.has(this.copyMode)) {
      this.copyMode = 'auto';
    }

    if (changedProperties.has('layout') && !VALID_LAYOUTS.has(this.layout)) {
      this.layout = 'standalone';
    }

    if (changedProperties.has('lang')) {
      const normalizedLang = this._normalizedLang;
      if (normalizedLang === '') {
        this.removeAttribute('data-lang');
      } else {
        this.setAttribute('data-lang', normalizedLang);
      }
    }
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('layout') || changedProperties.has('embedded')) {
      this._applyLayoutSurfaceVars();
    }

    const requiresPreResync =
      changedProperties.has('showLineNumbers') ||
      changedProperties.has('highlightLines') ||
      changedProperties.has('wrap') ||
      changedProperties.has('layout');

    if (
      changedProperties.has('filename') ||
      changedProperties.has('lang') ||
      changedProperties.has('intent') ||
      requiresPreResync
    ) {
      this._syncSlottedPre();
    }

    if (changedProperties.has('initialCode') && this._findPreElement() === null) {
      this._copyValue = normalizeLineEndings(this.initialCode);
    }

    if (!this._hasCompletedFirstUpdate) {
      this._hasCompletedFirstUpdate = true;
      return;
    }

    const metadataChanged =
      changedProperties.has('filename') ||
      changedProperties.has('lang') ||
      changedProperties.has('intent') ||
      changedProperties.has('groupKey') ||
      changedProperties.has('tabLabel') ||
      changedProperties.has('copyLabel') ||
      changedProperties.has('copyable') ||
      changedProperties.has('copyMode') ||
      changedProperties.has('layout') ||
      changedProperties.has('label');

    const affectsCopyValue =
      changedProperties.has('initialCode') ||
      changedProperties.has('showLineNumbers') ||
      changedProperties.has('highlightLines');

    if (metadataChanged || affectsCopyValue) {
      const kinds: ('content' | 'metadata')[] = [];
      if (metadataChanged) {
        kinds.push('metadata');
      }
      if (affectsCopyValue) {
        kinds.push('content');
      }
      this._dispatchChange(kinds, affectsCopyValue);
    }
  }

  /**
   * コピー用に整形されたコード文字列を返します。
   * 行番号要素（line-number系）は除去して返します。
   */
  getCodeContent(): string {
    const pre = this._findPreElement();
    if (pre) {
      return this._readSlottedCodeText(pre);
    }

    return normalizeLineEndings(this.initialCode);
  }

  private get _resolvedIntent(): CodeBlockIntent {
    return VALID_INTENTS.has(this.intent) ? this.intent : 'neutral';
  }

  private get _resolvedCopyMode(): CodeBlockCopyMode {
    return VALID_COPY_MODES.has(this.copyMode) ? this.copyMode : 'auto';
  }

  private get _resolvedLayout(): CodeBlockLayout {
    if (this.getAttribute('layout') === null && this.embedded) {
      return 'inline';
    }

    if (VALID_LAYOUTS.has(this.layout)) {
      return this.layout;
    }

    return 'standalone';
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

  private get _hasCaptionContent(): boolean {
    return this._resolvedFilename !== '' || this._resolvedIntent !== 'neutral';
  }

  private get _hasCopyValue(): boolean {
    return this._copyValue !== '';
  }

  private get _copyDisabled(): boolean {
    return !this.copyable || !this._hasCopyValue;
  }

  private get _shouldRenderCopyButton(): boolean {
    switch (this._resolvedCopyMode) {
      case 'hidden':
        return false;
      case 'always':
        return true;
      case 'auto':
        return this._hasCopyValue;
    }
  }

  private get _shouldRenderCaption(): boolean {
    return this._hasCaptionContent || this._shouldRenderCopyButton;
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

  private _applyLayoutSurfaceVars(): void {
    if (this._resolvedLayout === 'inline') {
      this.style.setProperty('--_ui-code-surface-breakout-width-default', '100%');
      this.style.setProperty('--_ui-code-surface-breakout-margin-default', '0');
      return;
    }

    this.style.removeProperty('--_ui-code-surface-breakout-width-default');
    this.style.removeProperty('--_ui-code-surface-breakout-margin-default');
  }

  /** テキスト省略時のみtitle属性を付与し、冗長なツールチップを回避 */
  private _onFilenameMouseEnter = (event: MouseEvent): void => {
    const element = event.currentTarget as HTMLElement;
    if (element.scrollWidth > element.clientWidth) {
      element.title = this._resolvedFilename;
    } else {
      element.removeAttribute('title');
    }
  };

  private _onSlotChange = (): void => {
    this._syncSlottedPre();
    if (this._hasCompletedFirstUpdate) {
      this._dispatchChange(['content'], true);
    }
  };

  private _syncSlottedPre(): void {
    const pre = this._findPreElement();
    this._resizeObserver?.disconnect();
    this._contentObserver?.disconnect();

    if (!pre) {
      this._copyValue = normalizeLineEndings(this.initialCode);
      return;
    }

    this._resizeObserver?.observe(pre);

    this._isSyncingPre = true;
    try {
      this._applyPreAttributes(pre);
      this._ensureLineWrappers(pre);
      this._normalizeLineMarkup(pre);
      this._applyHighlightLines(pre);
      this._updateAccessibleMetadata(pre);
      this._updateScrollableState(pre);
      this._copyValue = this._readSlottedCodeText(pre);
    } finally {
      this._isSyncingPre = false;
    }

    this._contentObserver?.observe(pre, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-wrap'],
    });
  }

  private _normalizeLineMarkup(pre: HTMLPreElement): void {
    const container = (pre.querySelector('code') ?? pre);

    if (!isDirectLineContainer(container)) {
      return;
    }

    for (const node of Array.from(container.childNodes)) {
      if (isWhitespaceOnlyTextNode(node)) {
        node.remove();
      }
    }
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
    const needsLineWrappers = this.showLineNumbers || this.highlightLines.trim() !== '';
    if (!needsLineWrappers) return;

    const code = pre.querySelector('code');
    const container = code ?? pre;

    if (isDirectLineContainer(container)) {
      return;
    }

    if (container.childElementCount > 0) {
      return;
    }

    const sourceText = normalizeLineEndings(container.textContent);
    const lines = sourceText.split('\n');

    const fragments = lines.map((line) => {
      const lineElement = document.createElement('span');
      lineElement.className = 'line';
      lineElement.setAttribute('data-ui-code-line', '');
      lineElement.textContent = line;
      return lineElement;
    });

    container.replaceChildren(...fragments);
  }

  private _applyHighlightLines(pre: HTMLPreElement): void {
    const container = (pre.querySelector('code') ?? pre);
    const lines = Array.from(container.querySelectorAll<HTMLElement>(':scope > .line'));

    lines.forEach((line) => {
      line.classList.remove('ui-explicit-highlight');
      line.removeAttribute('data-ui-highlight-line');
    });

    if (lines.length === 0) {
      return;
    }

    const highlighted = parseHighlightLines(this.highlightLines);
    if (highlighted.size === 0) {
      return;
    }

    lines.forEach((line, index) => {
      if (!highlighted.has(index + 1)) {
        return;
      }

      line.classList.add('ui-explicit-highlight');
      line.setAttribute('data-ui-highlight-line', '');
    });
  }

  private _readSlottedCodeText(pre: HTMLPreElement): string {
    const root = (pre.querySelector('code') ?? pre).cloneNode(true) as HTMLElement;

    root
      .querySelectorAll('.line-number,[data-line-number],.ui-code-block-line-number')
      .forEach((element) => {
        element.remove();
      });

    if (isDirectLineContainer(root)) {
      const lines = Array.from(root.children).map((line) => (line as HTMLElement).textContent);
      return normalizeLineEndings(lines.join('\n'));
    }

    return normalizeLineEndings(root.textContent);
  }

  private _hasLegacyWrap(pre?: HTMLPreElement | null): boolean {
    const hostWrap = this.getAttribute('data-wrap')?.trim().toLowerCase() === 'true';
    if (hostWrap) {
      return true;
    }

    return pre?.getAttribute('data-wrap')?.trim().toLowerCase() === 'true';
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

    const wrapEnabled = this.wrap || (!this.hasAttribute('wrap') && this._hasLegacyWrap(pre));
    if (wrapEnabled) {
      pre.removeAttribute('tabindex');
      pre.removeAttribute('role');
      pre.removeAttribute('aria-label');
      return;
    }

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

  private _dispatchChange(kinds: ('content' | 'metadata')[], affectsCopyValue: boolean): void {
    if (kinds.length === 0) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent('ui-code-block-change', {
        detail: { kinds, affectsCopyValue },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _renderCopyButton(): TemplateResult | typeof nothing {
    if (!this._shouldRenderCopyButton) {
      return nothing;
    }

    return html`
      <span class="copy-button-shell">
        <ui-copy-button
          size="sm"
          value="${this._copyValue}"
          label="${this._copyButtonLabel}"
          ?disabled="${this._copyDisabled}"
        ></ui-copy-button>
      </span>
    `;
  }

  override render() {
    const intentMeta = this._intentMeta;
    const captionClass = this._hasCaptionContent ? '' : 'caption-overlay';

    return html`
      <figure
        class="root ${captionClass}"
        aria-description="${this._ariaDescription}"
        data-layout="${this._resolvedLayout}"
      >
        ${this._shouldRenderCaption
        ? html`
              <figcaption class="caption">
                <div class="caption-layout">
                  <span class="caption-main">
                    <span class="filename" @mouseenter="${this._onFilenameMouseEnter}">
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
                  ${this._renderCopyButton()}
                </div>
              </figcaption>
            `
        : nothing}

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
