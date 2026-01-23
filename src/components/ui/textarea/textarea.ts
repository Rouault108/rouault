import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

/**
 * ui-textarea - アクセシブルなテキストエリアコンポーネント
 *
 * @cssprop --input-padding-y - 垂直方向のパディング
 * @cssprop --input-padding-x - 水平方向のパディング
 * @cssprop --input-bg - 背景色
 *
 * @fires input - テキストが入力されたときに発火
 */
@customElement('ui-textarea')
export class UiTextarea extends LitElement {
  static override styles = css`
    /* -------------------------------------------------------------
     * ホスト要素
     * ------------------------------------------------------------- */
    :host {
      display: inline-block;
      width: 100%;
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: var(--text-base, 0.875rem);
      line-height: 1.5;
    }

    /* -------------------------------------------------------------
     * コンテナ
     * ------------------------------------------------------------- */
    .textarea-container {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 0.25rem);
    }

    /* -------------------------------------------------------------
     * ラベル
     * ------------------------------------------------------------- */
    .label {
      font-size: var(--text-sm, 0.8125rem);
      font-weight: var(--font-medium, 500);
      color: var(--color-foreground, #111827);
      padding-left: var(--space-1, 0.25rem);
      transition: color var(--motion-duration, 200ms) var(--ease-out, ease-out);
    }

    :host([invalid]) .label {
      color: var(--color-error, #ef4444);
    }

    :host([disabled]) .label {
      opacity: 0.5;
    }

    /* -------------------------------------------------------------
     * ネイティブ Textarea 要素
     * ------------------------------------------------------------- */
    textarea {
      width: 100%;
      padding: var(--input-padding-y, 0.625rem) var(--input-padding-x, 0.875rem);
      
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: var(--color-foreground, #111827);
      
      background-color: var(--input-bg, white);
      border: 1.5px solid var(--color-border, #d1d5db);
      border-radius: var(--radius-md, 0.5rem);
      
      resize: vertical;
      
      transition:
        border-color var(--motion-duration, 200ms) var(--ease-out, ease-out),
        background-color var(--motion-duration, 200ms) var(--ease-out, ease-out),
        box-shadow var(--motion-duration, 200ms) var(--ease-out, ease-out);
    }

    textarea::placeholder {
      color: var(--color-foreground-muted, #6b7280);
    }

    textarea:hover:not(:disabled) {
      border-color: var(--color-border-hover, #9ca3af);
    }

    textarea:focus {
      outline: none;
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent);
    }

    textarea:disabled {
      cursor: not-allowed;
      opacity: 0.5;
      background-color: var(--color-background-subtle, #f9fafb);
    }

    textarea:read-only {
      cursor: default;
      background-color: var(--color-background-subtle, #f9fafb);
    }

    /* -------------------------------------------------------------
     * リサイズオプション
     * ------------------------------------------------------------- */
    :host([resize='none']) textarea {
      resize: none;
    }

    :host([resize='vertical']) textarea {
      resize: vertical;
    }

    :host([resize='horizontal']) textarea {
      resize: horizontal;
    }

    :host([resize='both']) textarea {
      resize: both;
    }

    /* -------------------------------------------------------------
     * バリアント: Outlined（デフォルト）
     * ------------------------------------------------------------- */
    :host([variant='outlined']) textarea {
      background-color: var(--input-bg, white);
      border: 1.5px solid var(--color-border, #d1d5db);
    }

    /* -------------------------------------------------------------
     * バリアント: Filled
     * ------------------------------------------------------------- */
    :host([variant='filled']) textarea {
      background-color: var(--color-background-subtle, #f3f4f6);
      border: 1.5px solid transparent;
    }

    :host([variant='filled']) textarea:hover:not(:disabled) {
      background-color: var(--color-background-muted, #e5e7eb);
      border-color: transparent;
    }

    :host([variant='filled']) textarea:focus {
      background-color: var(--input-bg, white);
      border-color: var(--color-primary, #3b82f6);
    }

    /* -------------------------------------------------------------
     * バリアント: Standard
     * ------------------------------------------------------------- */
    :host([variant='standard']) textarea {
      background-color: transparent;
      border: none;
      border-bottom: 1.5px solid var(--color-border, #d1d5db);
      border-radius: 0;
      padding-left: 0;
    }

    :host([variant='standard']) textarea:hover:not(:disabled) {
      border-bottom-color: var(--color-border-hover, #9ca3af);
    }

    :host([variant='standard']) textarea:focus {
      border-bottom-color: var(--color-primary, #3b82f6);
      box-shadow: none;
    }

    :host([variant='standard']) .label {
      padding-left: 0;
    }

    /* -------------------------------------------------------------
     * Invalid（エラー）状態
     * ------------------------------------------------------------- */
    :host([invalid]) textarea {
      border-color: var(--color-error, #ef4444);
    }

    :host([invalid]) textarea:focus {
      border-color: var(--color-error, #ef4444);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error, #ef4444) 15%, transparent);
    }

    /* Standard バリアントの Invalid 状態は下線のみ */
    :host([variant='standard'][invalid]) textarea {
      border-bottom-color: var(--color-error, #ef4444);
    }

    /* -------------------------------------------------------------
     * サイズバリエーション
     * ------------------------------------------------------------- */
    :host([size='sm']) {
      font-size: var(--text-sm, 0.8125rem);
    }

    :host([size='sm']) textarea {
      --input-padding-y: 0.5rem;
      --input-padding-x: 0.75rem;
    }

    :host([size='md']) {
      font-size: var(--text-base, 0.875rem);
    }

    :host([size='md']) textarea {
      --input-padding-y: 0.625rem;
      --input-padding-x: 0.875rem;
    }

    :host([size='lg']) {
      font-size: var(--text-lg, 1rem);
    }

    :host([size='lg']) textarea {
      --input-padding-y: 0.75rem;
      --input-padding-x: 1rem;
    }

    /* -------------------------------------------------------------
     * ダークモード対応
     * ------------------------------------------------------------- */
    @media (prefers-color-scheme: dark) {
      .label {
        color: var(--color-foreground, #ededed);
      }

      textarea {
        color: var(--color-foreground, #ededed);
        background-color: var(--bg-surface-0, #0a0a0a);
        border-color: var(--color-border-hover, #3f3f46);
      }

      textarea::placeholder {
        color: var(--color-foreground-muted, #71717a);
      }

      textarea:hover:not(:disabled) {
        border-color: var(--color-border, #52525b);
      }

      textarea:disabled {
        background-color: var(--bg-surface-1, #171717);
        border-color: var(--color-border, #27272a);
      }

      textarea:read-only {
        background-color: var(--bg-surface-1, #171717);
      }

      :host([variant='filled']) textarea {
        background-color: var(--bg-surface-1, #171717);
      }

      :host([variant='filled']) textarea:hover:not(:disabled) {
        background-color: var(--bg-surface-2, #262626);
      }

      :host([variant='filled']) textarea:focus {
        background-color: var(--bg-surface-0, #0a0a0a);
      }

      :host([invalid]) textarea {
        border-color: var(--color-error, #ef4444);
      }

      :host([disabled][invalid]) textarea {
        background-color: var(--bg-surface-1, #171717);
        border-color: var(--color-border, #27272a);
      }
    }

    /* data-theme="dark" 対応 */
    :host-context([data-theme='dark']) .label {
      color: var(--color-foreground, #ededed);
    }

    :host-context([data-theme='dark']) textarea {
      color: var(--color-foreground, #ededed);
      background-color: var(--bg-surface-0, #0a0a0a);
      border-color: var(--color-border-hover, #3f3f46);
    }

    :host-context([data-theme='dark']) textarea::placeholder {
      color: var(--color-foreground-muted, #71717a);
    }

    :host-context([data-theme='dark']) textarea:hover:not(:disabled) {
      border-color: var(--color-border, #52525b);
    }

    :host-context([data-theme='dark']) textarea:disabled {
      background-color: var(--bg-surface-1, #171717);
      border-color: var(--color-border, #27272a);
    }

    :host-context([data-theme='dark']) textarea:read-only {
      background-color: var(--bg-surface-1, #171717);
    }

    :host-context([data-theme='dark']):host([variant='filled']) textarea {
      background-color: var(--bg-surface-1, #171717);
    }

    :host-context([data-theme='dark']):host([variant='filled']) textarea:hover:not(:disabled) {
      background-color: var(--bg-surface-2, #262626);
    }

    :host-context([data-theme='dark']):host([variant='filled']) textarea:focus {
      background-color: var(--bg-surface-0, #0a0a0a);
    }

    :host-context([data-theme='dark']):host([invalid]) textarea {
      border-color: var(--color-error, #ef4444);
    }

    :host-context([data-theme='dark']):host([disabled][invalid]) textarea {
      background-color: var(--bg-surface-1, #171717);
      border-color: var(--color-border, #27272a);
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      textarea,
      .label {
        transition: none;
      }
    }
  `;

  @property({ type: String })
  label = '';

  @property({ type: String })
  placeholder = '';

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  invalid = false;

  @property({ type: String, reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md';

  @property({ type: String, reflect: true })
  variant: 'outlined' | 'filled' | 'standard' = 'outlined';

  @property({ type: String, reflect: true })
  resize: 'none' | 'vertical' | 'horizontal' | 'both' = 'vertical';

  @property({ type: Number })
  rows = 4;

  @property({ type: String })
  name = '';

  @property({ type: String })
  value = '';

  @property({ type: Number })
  maxlength?: number;

  @property({ type: Boolean, reflect: true })
  readonly = false;

  @query('textarea')
  private _textareaElement!: HTMLTextAreaElement;

  private _handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.value = target.value;

    // カスタムイベントを発火
    this.dispatchEvent(
      new CustomEvent('input', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * プログラム的にテキストエリアにフォーカスを当てる
   */
  public override focus() {
    this._textareaElement?.focus();
  }

  /**
   * テキストエリアのテキストを全選択する
   */
  public select() {
    this._textareaElement?.select();
  }

  override render() {
    return html`
      <div class="textarea-container">
        ${this.label
          ? html`<label class="label" for="textarea">${this.label}</label>`
          : ''}
        <textarea
          id="textarea"
          .value=${live(this.value)}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          placeholder=${this.placeholder}
          name=${this.name}
          rows=${this.rows}
          maxlength=${this.maxlength ?? ''}
          aria-invalid="${this.invalid}"
          @input=${this._handleInput}
        ></textarea>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-textarea': UiTextarea;
  }
}
