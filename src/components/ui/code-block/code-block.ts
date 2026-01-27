import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { t } from '../../../lib/i18n';

// Shiki Core imports
import { createHighlighterCore, type HighlighterCore, type ShikiTransformer } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { transformerNotationDiff } from '@shikijs/transformers';
import getWasm from 'shiki/wasm';

// Languages (必要なものだけ厳選)
import langJavascript from 'shiki/langs/javascript.mjs';
import langTypescript from 'shiki/langs/typescript.mjs';
import langHtml from 'shiki/langs/html.mjs';
import langCss from 'shiki/langs/css.mjs';
import langJson from 'shiki/langs/json.mjs';
import langMarkdown from 'shiki/langs/markdown.mjs';
import langBash from 'shiki/langs/bash.mjs';
import langYaml from 'shiki/langs/yaml.mjs';
import langRust from 'shiki/langs/rust.mjs';
import langPython from 'shiki/langs/python.mjs';
import langGo from 'shiki/langs/go.mjs';
import langJava from 'shiki/langs/java.mjs';
import langCpp from 'shiki/langs/cpp.mjs';
import langC from 'shiki/langs/c.mjs';
import langCsharp from 'shiki/langs/csharp.mjs';
import langPhp from 'shiki/langs/php.mjs';
import langRuby from 'shiki/langs/ruby.mjs';
import langSwift from 'shiki/langs/swift.mjs';
import langKotlin from 'shiki/langs/kotlin.mjs';
import langR from 'shiki/langs/r.mjs';
import langScala from 'shiki/langs/scala.mjs';

// Themes
import themeGithubLight from 'shiki/themes/github-light.mjs';
import themeGithubDark from 'shiki/themes/github-dark.mjs';

// マジックナンバー定数
const COPY_FEEDBACK_DURATION = 2000;
const COPY_FEEDBACK_SR_DURATION = 500; // スクリーンリーダー用のフィードバック表示時間
const COPY_ICON_DELAY = 300;

// シングルトンハイライター（複数コンポーネントで共有）
let highlighterPromise: Promise<HighlighterCore> | null = null;

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [themeGithubLight, themeGithubDark],
      langs: [
        langJavascript,
        langTypescript,
        langHtml,
        langCss,
        langJson,
        langMarkdown,
        langBash,
        langYaml,
        langRust,
        langPython,
        langGo,
        langJava,
        langCpp,
        langC,
        langCsharp,
        langPhp,
        langRuby,
        langSwift,
        langKotlin,
        langR,
        langScala,
      ],
      engine: createOnigurumaEngine(getWasm),
    });
  }
  return highlighterPromise;
}

/**
 * highlightLines用カスタムTransformer
 * 例: "1,3-5,8" -> [1, 3, 4, 5, 8]
 */
function parseHighlightLines(spec: string): Set<number> {
  const lines = new Set<number>();
  if (!spec) return lines;
  
  const parts = spec.split(',').map(s => s.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = Number(startStr);
      const end = Number(endStr);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          lines.add(i);
        }
      }
    } else {
      const lineNum = Number(part);
      if (!isNaN(lineNum)) {
        lines.add(lineNum);
      }
    }
  }
  return lines;
}



function createTransformerHighlightLines(highlightLines: string): ShikiTransformer {
  const linesToHighlight = parseHighlightLines(highlightLines);
  
  return {
    name: 'highlight-lines',
    line(node: any, line: number) {
      if (linesToHighlight.has(line)) {
        this.addClassToHast(node, 'highlighted');
      }
    }
  };
}

/**
 * Diff行のアクセシビリティ対応Transformer
 */
function transformerDiffAria(): ShikiTransformer {
  return {
    name: 'diff-aria',
    line(node: any) {
      // HASTのクラスリズトは文字列または配列の可能性がある
      // this.addClassToHastのようなhelperがないため、安全にチェック
      const props = node.properties || {};
      const classValue = props['class'] || [];
      const classes = Array.isArray(classValue) ? classValue : String(classValue).split(' ');
      
      if (classes.includes('diff')) {
        if (classes.includes('add')) {
          props['aria-label'] = '追加行';
        } else if (classes.includes('remove')) {
          props['aria-label'] = '削除行';
        }
      }
    }
  };
}

/**
 * 全ての行に 'line' クラスを付与するTransformer
 * これにより CSS の .line セレクタが正しく機能するようになる
 */
function transformerAddLineClass(): ShikiTransformer {
  return {
    name: 'add-line-class',
    line(node: any) {
      this.addClassToHast(node, 'line');
    }
  };
}

/**
 * ui-code-block - コードブロック表示用コンポーネント (Shiki版)
 * 
 * @element ui-code-block
 * @fires code-copied - コードがコピーされた時に発火
 * 
 * @slot - コードの内容
 */
@customElement('ui-code-block')
export class UiCodeBlock extends LitElement {
  @state()
  private _isLoading = true;

  static override styles = css`
    /* Shiki Dual Theme Integration */
    /* デフォルト (Light) */
    .code-content pre, 
    .code-content code,
    .code-content span {
      color: var(--shiki-light);
    }

    /* ダークモード: OS設定 (ただしdata-theme="light"を除く) */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) .code-content pre,
      :host(:not([data-theme="light"])) .code-content code,
      :host(:not([data-theme="light"])) .code-content span {
        color: var(--shiki-dark);
      }
    }

    /* 明示的なダークモード (data-theme="dark") */
    :host-context([data-theme="dark"]) .code-content pre,
    :host-context([data-theme="dark"]) .code-content code,
    :host-context([data-theme="dark"]) .code-content span {
      color: var(--shiki-dark);
    }

    :host {
      display: block;
      /* Shiki背景色を使用、フォールバックとしてデザインシステムの変数を使用 */
      --code-bg: var(--shiki-light-bg, var(--color-background-subtle));
      --code-header-bg: var(--color-background);
      --code-border: var(--color-border);
      --code-text: var(--color-foreground);
      --code-line-number: var(--color-foreground-muted);
      --code-highlight-bg: var(--color-primary-alpha-10);
    }

    /* ダークモード背景 */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        --code-bg: var(--shiki-dark-bg, var(--color-background-subtle));
        --code-header-bg: var(--color-background);
      }
    }

    :host-context([data-theme="dark"]) {
      --code-bg: var(--shiki-dark-bg, var(--color-background-subtle));
      --code-header-bg: var(--color-background);
    }

    /* コードブロックコンテナ */
    .code-block {
      border: 1px solid var(--code-border);
      border-radius: var(--radius-lg);
      background-color: var(--code-bg);
      position: relative;
    }

    /* ヘッダー */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2) var(--space-3);
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10;
      pointer-events: none;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--code-line-number);
    }

    /* ヘッダーアクション（ボタン群） */
    .header-actions {
      display: flex;
      gap: var(--space-1);
      align-items: center;
    }

    .language {
      font-family: var(--font-mono);
      text-transform: uppercase;
      font-weight: var(--font-semibold);
      letter-spacing: var(--tracking-wider);
    }

    .filename {
      font-family: var(--font-mono);
      color: var(--code-text);
    }

    .filename::before {
      content: '—';
      margin-right: var(--space-2);
      color: var(--code-line-number);
    }

    /* アクションボタン（コピー・折り返し） */
    .action-button {
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--button-size-sm);
      height: var(--button-size-sm);
      padding: 0;
      background: var(--code-header-bg);
      border: var(--border-width-1) solid var(--code-border);
      border-radius: var(--radius-md);
      color: var(--code-line-number);
      cursor: pointer;
      transition: all var(--motion-duration) var(--motion-easing);
      opacity: 0;
      transform: translateY(-2px);
    }

    .code-block:hover .action-button,
    .action-button:focus-visible,
    .action-button.active {
      opacity: 1;
      transform: translateY(0);
    }

    .action-button:hover {
      background-color: var(--code-bg);
      color: var(--code-text);
      border-color: var(--code-text);
    }

    .action-button:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-primary);
      outline-offset: var(--focus-ring-offset);
    }

    /* アクティブ状態 */
    .action-button.active {
      color: var(--code-text);
      background-color: var(--code-bg);
      border-color: var(--code-text);
    }

    .action-button.copied {
      color: var(--color-success);
      border-color: var(--color-success);
      opacity: 1;
      transform: translateY(0);
    }
    
    .action-button iconify-icon {
      font-size: var(--icon-sm);
    }

    /* アクセシビリティ: コピー通知 */
    .copy-feedback {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* prefers-reduced-motion 対応 */
    @media (prefers-reduced-motion: reduce) {
      .action-button {
        transition: none;
      }
    }

    /* コードエリア */
    .code-wrapper {
      display: flex;
      overflow-x: auto;
      font-size: var(--text-sm);
      line-height: var(--line-height-relaxed);
      /* ヘッダー分の余白 */
      padding-top: var(--space-8); 
      background-color: var(--shiki-bg, var(--code-bg));
    }

    .line-numbers {
      display: flex;
      flex-direction: column;
      padding: var(--space-3) 0;
      padding-left: var(--space-3);
      user-select: none;
      text-align: right;
      min-width: 3ch;
      /* 固定背景 */
      background-color: var(--shiki-bg, var(--code-bg)); 
      position: sticky;
      left: 0;
      z-index: 1;
    }

    .line-number {
      color: var(--code-line-number);
      font-family: var(--font-mono);
      font-size: inherit;
      line-height: inherit;
    }

    .code-content {
      flex: 1;
      padding: var(--space-3);
    }

    .code-content.with-line-numbers {
      padding-left: var(--space-2);
    }

    /* コード折り返し */
    .code-content.word-wrap {
      overflow-wrap: anywhere;
    }
    
    .code-content.word-wrap .line {
      width: 100%;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* Shikiが出力するpre/code */
    :host pre.shiki {
      margin: 0;
      padding: 0;
      background-color: transparent;
      font-family: var(--font-mono);
      font-size: inherit;
      line-height: inherit;
    }

    code {
      display: block;
      font-size: 0; /* テキストノード（改行）を視覚的に消去 */
      font-family: inherit;
      line-height: inherit;
    }

    /* ローディング状態 */
    .loading {
      padding: var(--space-4);
      color: var(--code-line-number);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
    }

    /* 行ハイライト */
    .line.highlighted {
      background-color: var(--code-highlight-bg);
      border-left: var(--border-width-2) solid var(--color-primary);
    }

    /* 折りたたみ機能 */
    .collapse-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--collapse-overlay-height, 120px);
      background: linear-gradient(to bottom, transparent, var(--code-bg));
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: var(--space-4);
      z-index: 5;
      pointer-events: none;
    }

    .collapse-button {
      pointer-events: auto;
      background-color: var(--code-header-bg);
      border: var(--border-width-1) solid var(--code-border);
      color: var(--code-text);
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-full);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: var(--space-1);
      box-shadow: var(--shadow-sm);
      transition: all var(--motion-duration) var(--motion-easing);
    }

    .collapse-button:hover {
      background-color: var(--code-bg);
      border-color: var(--code-line-number);
    }

    .code-wrapper.collapsed {
      overflow: hidden;
    }

    /* Diff Styling */
    .line {
      display: block;
      min-width: 100%;
      width: fit-content;
      padding: 0 var(--space-2);
      box-sizing: border-box;
      position: relative;
      font-size: var(--text-sm); /* code の font-size: 0 を打ち消す */
    }

    /* Diffがある場合のみ、全行の左パディングをあける（ガター確保） */
    .has-diff .line {
      padding-left: calc(var(--space-2) + 1.2em);
    }

    .line.diff.add {
      background-color: var(--color-diff-add-bg);
      border-left: var(--border-width-2) solid var(--color-success);
    }

    .line.diff.remove {
      background-color: var(--color-diff-remove-bg);
      border-left: var(--border-width-2) solid var(--color-error);
    }
    
    /* アクセシビリティ記号 (+/-) */
    .line.diff::before {
      position: absolute;
      left: 0.5rem; /* ボーダーの右側 */
      top: 0;
      width: 1em;
      text-align: center;
      font-family: var(--font-mono);
      opacity: 0.6;
      pointer-events: none;
    }

    .line.diff.add::before {
      content: '+';
      color: var(--color-success);
    }

    .line.diff.remove::before {
      content: '-';
      color: var(--color-error);
    }

    
    /* ハイコントラストモード対応 */
    @media (prefers-contrast: more) {
      .action-button:focus-visible {
        outline-width: 3px;
      }
      
      .line.highlighted {
        border-left-width: 3px;
      }
      
      .line.diff.add,
      .line.diff.remove {
        border-left-width: 3px;
      }
    }
  `;

  @property({ type: String })
  language = 'javascript'; // plaintextの代わりにデフォルトをjsにしておく方が無難

  @property({ type: String })
  filename = '';

  @property({ type: Boolean, attribute: 'show-line-numbers' })
  showLineNumbers = false;

  @property({ type: String, attribute: 'highlight-lines' })
  highlightLines = '';

  @property({ type: Boolean, attribute: 'raw-html' })
  rawHtml = false;

  @property({ type: Boolean })
  collapsible = false;

  @property({ type: Number, attribute: 'max-height' })
  maxHeight = 300;

  @state()
  private _copied = false;

  @state()
  private _iconState: 'copy' | 'check' = 'copy';

  @state()
  private _copyFeedback = '';

  @state()
  private _isExpanded = false;

  @state()
  private _wordWrap = false;

  @state()
  private _hasDiff = false;

  @state()
  private _code = '';

  @state()
  private _highlightedCode = '';

  // レースコンディションを防ぐためのバージョン管理
  private _highlightVersion = 0;



  override connectedCallback() {
    super.connectedCallback();
  }

  override firstUpdated() {
    // 全ての属性が反映された後に初期化
    // slotchangeイベントでも呼ばれるが、highlightLinesが既に設定されている
    this._extractCode();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
  }

  override async updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    // コードや言語が変わったら再ハイライト
    // コード関連のプロパティが変わったら再ハイライト
    if (
      changedProperties.has('language') || 
      changedProperties.has('highlightLines') ||
      changedProperties.has('showLineNumbers')
    ) {
      // rawHtmlモード以外の場合のみ再ハイライト
      if (!this.rawHtml) {
        await this._highlightCode();
      }
    }
  }

  private async _extractCode() {
    // textContentの取得タイミングによって空になることがあるため、少し待つか
    // slotchangeイベントを監視するのがベターだが、簡易的に
    this._code = this.textContent?.trim() || '';

    // 空の場合は処理しない（slotchangeなどで再試行されるのを待つ）
    if (!this._code) return;

    if (this.rawHtml) {
      // HTMLモード: スロットの中身をHTMLとしてそのまま使う
      // light DOMのHTML構造を取得
      this._highlightedCode = this.innerHTML;
      this._isLoading = false;
      return;
    }
    
    // ハイライト実行
    await this._highlightCode();
  }

  private async _highlightCode() {
    if (!this._code) return;

    // レースコンディション防止: 最新の呼び出しのみが結果を適用
    const currentVersion = ++this._highlightVersion;

    this._isLoading = true;
    try {
      const highlighter = await getHighlighter();
      
      // 古いバージョンの呼び出しは中断
      if (currentVersion !== this._highlightVersion) return;

      const transformers = [
        transformerAddLineClass(), // 必須: 全行に .line を付与
        transformerNotationDiff(),
        transformerDiffAria(),
      ];

      // highlightLinesが指定されている場合は追加
      if (this.highlightLines) {
        transformers.push(createTransformerHighlightLines(this.highlightLines));
      }

      // Dual Theme: CSS変数を使用してLight/Darkを切り替え
      const html = highlighter.codeToHtml(this._code, {
        lang: this.language,
        themes: {
          light: 'github-light',
          dark: 'github-dark'
        },
        defaultColor: false, // 背景色はCSSで制御
        transformers,
      });

      // 古いバージョンの呼び出しは結果を適用しない
      if (currentVersion !== this._highlightVersion) return;

      this._highlightedCode = html;
      this._hasDiff = html.includes('class="line diff'); // 簡易判定
    } catch (e) {
      console.error('Shiki highlight error:', e);
      // フォールバック: 生コードを表示
      this._highlightedCode = `<pre><code>${this._escapeHtml(this._code)}</code></pre>`;
    } finally {
      // 最新バージョンのみローディング状態を解除
      if (currentVersion === this._highlightVersion) {
        this._isLoading = false;
      }
    }
  }

  private _escapeHtml(text: string) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private _getLineNumbers() {
    const lines = this._code.split('\n');
    return lines.map((_, index) => index + 1);
  }

  private async _handleCopy() {
    try {
      await navigator.clipboard.writeText(this._code);
      this._copied = true;
      this._iconState = 'check';
      
      this.dispatchEvent(new CustomEvent('code-copied', {
        bubbles: true,
        composed: true,
        detail: { code: this._code },
      }));

      // アクセシビリティ: スクリーンリーダー通知
      this._copyFeedback = t('codeblock.copied');
      setTimeout(() => {
        this._copyFeedback = '';
      }, COPY_FEEDBACK_SR_DURATION);

      setTimeout(() => {
        this._copied = false;
        // フェードアウト完了後にアイコンを戻す
        setTimeout(() => {
          this._iconState = 'copy';
        }, COPY_ICON_DELAY);
      }, COPY_FEEDBACK_DURATION);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  override render() {
    const lineNumbers = this._getLineNumbers();
    const isCollapsed = this.collapsible && !this._isExpanded;

    return html`
      <div class="code-block">
        <div class="header">
          <div class="header-left">
            <span class="language">${this.language}</span>
            ${this.filename ? html`<span class="filename">${this.filename}</span>` : nothing}
          </div>
          
          <div class="header-actions">
            <button 
              class="action-button ${this._wordWrap ? 'active' : ''}"
              @click=${() => this._wordWrap = !this._wordWrap}
              aria-label=${this._wordWrap ? t('codeblock.disableWordWrap') : t('codeblock.enableWordWrap')}
              aria-pressed="${this._wordWrap}"
            >
              <iconify-icon icon="lucide:wrap-text"></iconify-icon>
            </button>

            <button 
              class="action-button ${this._copied ? 'copied' : ''}"
              @click=${this._handleCopy}
              aria-label=${t('codeblock.copy')}
            >
              ${this._iconState === 'check' 
                ? html`<iconify-icon icon="lucide:check"></iconify-icon>` 
                : html`<iconify-icon icon="lucide:clipboard"></iconify-icon>`
              }
            </button>
          </div>
        </div>

        <div 
          class="code-wrapper ${isCollapsed ? 'collapsed' : ''}"
          style=${isCollapsed ? `max-height: ${this.maxHeight}px;` : ''}
        >
          ${this.showLineNumbers ? html`
            <div class="line-numbers">
              ${lineNumbers.map(num => html`<span class="line-number">${num}</span>`)}
            </div>
          ` : nothing}

          <div class="code-content ${this.showLineNumbers ? 'with-line-numbers' : ''} ${this._hasDiff ? 'has-diff' : ''} ${this._wordWrap ? 'word-wrap' : ''}">
            ${this._isLoading 
              ? html`<div class="loading">Loading...</div>` 
              : html`${unsafeHTML(this._highlightedCode)}`
            }
          </div>

          ${isCollapsed ? html`
            <div class="collapse-overlay">
              <button 
                class="collapse-button" 
                @click=${() => this._isExpanded = true}
                aria-expanded="false"
              >
                ${t('codeblock.showMore')}
                <iconify-icon icon="lucide:chevron-down"></iconify-icon>
              </button>
            </div>
          ` : nothing}
        </div>
        
        ${this.collapsible && this._isExpanded ? html`
          <div style="display: flex; justify-content: center; padding-bottom: var(--space-2); background-color: var(--code-bg);">
            <button 
              class="collapse-button" 
              @click=${() => this._isExpanded = false}
              aria-expanded="true"
            >
              ${t('codeblock.showLess')}
              <iconify-icon icon="lucide:chevron-up"></iconify-icon>
            </button>
          </div>
        ` : nothing}
      </div>

      <!-- アクセシビリティ: コピー通知 -->
      <div class="copy-feedback" aria-live="polite" aria-atomic="true">
        ${this._copyFeedback}
      </div>

      <slot style="display: none;" @slotchange=${this._extractCode}></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-code-block': UiCodeBlock;
  }
}
