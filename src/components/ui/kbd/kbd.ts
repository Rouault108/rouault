import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

type KbdVariant = 'auto' | 'key' | 'combo';

const KEY_READING_MAP: Readonly<Record<string, string>> = {
  ctrl: 'コントロール',
  control: 'コントロール',
  esc: 'エスケープ',
  escape: 'エスケープ',
  shift: 'シフト',
  enter: 'エンター',
  return: 'エンター',
  tab: 'タブ',
  space: 'スペース',
  spacebar: 'スペース',
  cmd: 'コマンド',
  command: 'コマンド',
  meta: 'コマンド',
  '⌘': 'コマンド',
};

/**
 * キーボード入力 (Keyboard Input) コンポーネント `<ui-kbd>`
 *
 * - Native `<kbd>` を必ず出力します。
 * - `variant="combo"` または `keys` に `+` が含まれる場合、複合キーとして描画します。
 * - `⌘` は読み上げ一貫性のために SR 専用テキストを同梱します。
 */
@customElement('ui-kbd')
export class Kbd extends LitElement {
  static override styles = css`
    :host {
      display: inline;
      vertical-align: baseline;
      font-family:
        var(--font-sans, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif);
      font-size: max(1em, var(--text-xs, 12px));
      font-weight: var(--font-medium, 500);
      letter-spacing: var(--tracking-wide, 0.02em);
      line-height: var(--line-height-none, 1);
      color: var(--fg-default, oklch(20% 0 0));
    }

    .kbd-key {
      display: inline-flex;
      align-items: baseline;
      vertical-align: baseline;
      white-space: nowrap;
      font: inherit;
      color: inherit;
      background: var(--bg-surface-2, oklch(100% 0 0));
      border: var(--border-width, 1px) solid var(--border-default, oklch(85% 0 0));
      box-shadow: 0 var(--border-width-thick, 2px) 0 0
        var(--border-default, oklch(85% 0 0));
      border-radius: var(--radius-sm, 4px);
      padding: 0 0.4em;
      line-height: var(--line-height-none, 1);
    }

    .kbd-combo {
      display: inline-flex;
      align-items: baseline;
      column-gap: var(--space-1, 4px);
      white-space: nowrap;
      font: inherit;
      color: inherit;
      background: transparent;
      border: 0;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
      margin: 0;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }

    /* スロット経由で渡された読み上げ補助要素にも同じ不可視化ルールを適用する */
    ::slotted(.sr-only) {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }

    @media (forced-colors: active) {
      .kbd-key {
        color: var(--fg-default);
        background: var(--bg-surface-2);
        border: var(--border-width, 1px) solid var(--border-default);
        box-shadow: none;
        forced-color-adjust: auto;
      }
    }

    @media print {
      .kbd-key {
        background: transparent !important;
        box-shadow: none !important;
        border: var(--border-width, 1px) solid var(--border-default, oklch(85% 0 0));
      }

      .kbd-combo {
        white-space: nowrap;
      }
    }
  `;

  /**
   * 表示するキー文字列。
   * 例: `Esc`, `Ctrl + K`, `⌘ + K`
   */
  @property({ type: String })
  keys = '';

  /**
   * 描画モード。
   * - auto: `keys` のトークン数で自動判定
   * - key: 単体キーとして描画
   * - combo: 複合キーとして描画
   */
  @property({ type: String, reflect: true })
  variant: KbdVariant = 'auto';

  private _tokenizeKeys(raw: string): string[] {
    return raw
      .split('+')
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
  }

  private _resolveVariant(tokenCount: number): Exclude<KbdVariant, 'auto'> {
    if (this.variant === 'key' || this.variant === 'combo') return this.variant;
    return tokenCount > 1 ? 'combo' : 'key';
  }

  private _getSourceText(): string {
    const fromProperty = this.keys.trim();
    if (fromProperty !== '') return fromProperty;

    // スロットに明示的な要素がある場合は、テキスト解析せずにスロットを優先します。
    if (this.childElementCount > 0) return '';

    return (this.textContent).replace(/\s+/g, ' ').trim();
  }

  private _getReading(token: string): string | undefined {
    return KEY_READING_MAP[token.trim().toLowerCase()];
  }

  private _renderKeyToken(token: string, useSlot = false): TemplateResult {
    if (useSlot) {
      return html`<kbd class="kbd-key" part="key"><slot></slot></kbd>`;
    }

    const reading = this._getReading(token);
    const isCommandSymbol = token === '⌘';

    if (isCommandSymbol) {
      return html`
        <kbd class="kbd-key" part="key">
          <span class="sr-only">${reading ?? 'コマンド'}</span>
          <span aria-hidden="true">${token}</span>
        </kbd>
      `;
    }

    return html`
      <kbd class="kbd-key" part="key" aria-label=${ifDefined(reading)}>
        ${token}
      </kbd>
    `;
  }

  override render(): TemplateResult | typeof nothing {
    const source = this._getSourceText();
    const tokens = source === '' ? [] : this._tokenizeKeys(source);
    const mode = this._resolveVariant(tokens.length);

    // 空入力時は空のキートップを描画せず、出力を省略する。
    if (source === '' && this.childElementCount === 0) {
      return nothing;
    }

    if (source === '' && this.childElementCount > 0) {
      if (mode === 'combo') {
        return html`<kbd class="kbd-combo" part="combo"><slot></slot></kbd>`;
      }
      return this._renderKeyToken('', true);
    }

    if (mode === 'combo') {
      return html`
        <kbd class="kbd-combo" part="combo">
          ${tokens.map((token, index) => html`
            ${index > 0 ? ' + ' : nothing}${this._renderKeyToken(token)}
          `)}
        </kbd>
      `;
    }

    const firstToken = tokens[0];
    if (firstToken === undefined || firstToken === '') {
      return this._renderKeyToken('', true);
    }

    return this._renderKeyToken(firstToken);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-kbd': Kbd;
  }
}

export type { KbdVariant };
