import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

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
  alt: 'オルト',
  option: 'オプション',
  backspace: 'バックスペース',
  delete: 'デリート',
  del: 'デリート',
  up: '上矢印',
  arrowup: '上矢印',
  down: '下矢印',
  arrowdown: '下矢印',
  left: '左矢印',
  arrowleft: '左矢印',
  right: '右矢印',
  arrowright: '右矢印',
  cmd: 'コマンド',
  command: 'コマンド',
  meta: 'コマンド',
  '⌘': 'コマンド',
  fn: 'ファンクション',
};

type ResolvedInput =
  | {
      source: 'tokens' | 'keys' | 'text';
      tokens: string[];
    }
  | {
      source: 'slot';
      tokens: [];
    }
  | {
      source: 'none';
      tokens: [];
    };

/**
 * キーボード入力 (Keyboard Input) コンポーネント `<ui-kbd>`
 *
 * - 正準入力は `tokens` です。
 * - 単体キー / 複合キーの意味論は正規化後トークン数で決まります。
 * - 複合キー外枠は中立要素を使い、各キー片だけに Native `<kbd>` を使います。
 * - `⌘` は読み上げ一貫性のために SR 専用テキストを同梱します。
 */
@customElement('ui-kbd')
export class Kbd extends LitElement {
  static override styles = css`
    :host {
      display: inline;
      vertical-align: baseline;
      font-family: var(
        --font-sans,
        ui-sans-serif,
        system-ui,
        -apple-system,
        'Segoe UI',
        sans-serif
      );
      font-size: max(0.75rem, var(--text-xs, 12px));
      font-weight: var(--font-medium, 500);
      letter-spacing: var(--tracking-normal, 0);
      line-height: var(--line-height-none, 1);
      color: var(--fg-default, oklch(20% 0 0));
    }

    .kbd-key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: baseline;
      white-space: nowrap;
      font: inherit;
      color: inherit;
      min-inline-size: var(--space-3, 12px);
      min-block-size: calc(0.75em + var(--space-3, 12px));
      background: var(--bg-fill-muted, oklch(96% 0 0));
      border: var(--border-width, 1px) solid
        color-mix(in oklab, var(--border-muted, oklch(20% 0 0 / 0.06)) 80%, transparent);
      box-shadow:
        inset 0 1px 0 oklch(100% 0 0 / 0.7),
        0 1px 2px oklch(0% 0 0 / 0.04);
      border-radius: var(--radius-md, 6px);
      padding: 0 4px;
      line-height: var(--line-height-none, 1);
    }

    .kbd-combo {
      display: inline-flex;
      align-items: center;
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

    .kbd-separator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding-inline: var(--space-2, 8px);
      line-height: var(--line-height-none, 1);
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
   * 表示する正準トークン列。
   * 例: `['Esc']`, `['Ctrl', 'K']`, `['⌘', 'K']`
   */
  @property({ attribute: false })
  tokens: string[] | undefined = undefined;

  /**
   * 表示する互換文字列入力。
   * 例: `Esc`, `Ctrl + K`, `⌘ + K`
   */
  @property({ type: String })
  keys = '';

  private _normalizeToken(token: string | null | undefined): string | undefined {
    const normalized = token?.trim();
    if (!normalized) {
      return undefined;
    }
    return normalized;
  }

  private _normalizeTokens(tokens: readonly string[]): string[] {
    return tokens
      .map((token) => this._normalizeToken(token))
      .filter((token): token is string => token !== undefined);
  }

  private _tokenizeKeys(raw: string): string[] {
    return raw
      .trim()
      .split('+')
      .map((token) => this._normalizeToken(token))
      .filter((token): token is string => token !== undefined);
  }

  private _getHostText(): string {
    return this.textContent.replace(/\s+/g, ' ').trim();
  }

  private _resolveInput(): ResolvedInput {
    if (Array.isArray(this.tokens)) {
      return {
        source: 'tokens',
        tokens: this._normalizeTokens(this.tokens),
      };
    }

    if (this.keys.trim() !== '') {
      return {
        source: 'keys',
        tokens: this._tokenizeKeys(this.keys),
      };
    }

    if (this.childElementCount > 0) {
      return {
        source: 'slot',
        tokens: [],
      };
    }

    const hostText = this._getHostText();
    if (hostText !== '') {
      return {
        source: 'text',
        tokens: this._tokenizeKeys(hostText),
      };
    }

    return {
      source: 'none',
      tokens: [],
    };
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

    return html` <kbd class="kbd-key" part="key" aria-label=${ifDefined(reading)}>${token}</kbd> `;
  }

  private _renderSeparator(): TemplateResult {
    return html`<span class="kbd-separator" part="separator" aria-hidden="true">+</span>`;
  }

  override render(): TemplateResult | typeof nothing {
    const resolved = this._resolveInput();

    if (resolved.source === 'none') {
      return nothing;
    }

    if (resolved.source === 'slot') {
      return this._renderKeyToken('', true);
    }

    if (resolved.tokens.length === 0) {
      return nothing;
    }

    if (resolved.tokens.length > 1) {
      return html`
        <span class="kbd-combo" part="combo">
          ${resolved.tokens.map(
            (token, index) =>
              html`${index > 0 ? this._renderSeparator() : nothing}${this._renderKeyToken(token)}`,
          )}
        </span>
      `;
    }

    return this._renderKeyToken(resolved.tokens[0] ?? '');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-kbd': Kbd;
  }
}
