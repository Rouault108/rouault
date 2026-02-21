import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './kbd';
import { Kbd } from './kbd';

/**
 * ## キーボード入力 (Keyboard Input) `<ui-kbd>`
 *
 * キーボードショートカットや入力指示を、ネイティブ `<kbd>` で表現するためのコンポーネントです。
 *
 * ### 実装ポイント
 *
 * - 最終 DOM にネイティブ `<kbd>` を出力
 * - 単体キー（`.kbd-key`）と複合キー（`.kbd-combo`）を分離
 * - 複合キーは `Ctrl + K` のように `+` をテキストノードで表現
 * - `white-space: nowrap` により複合キーの途中改行を防止
 * - `forced-colors` / `print` の劣化制御を組み込み
 */
const meta: Meta<Kbd> = {
  title: 'Components/Kbd',
  component: 'ui-kbd',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
キーボード入力コンポーネントは、ショートカットや入力指示をネイティブ \`<kbd>\` で表現します。

## 使用方法

\`\`\`html
<!-- 単体キー -->
<ui-kbd keys="Esc"></ui-kbd>

<!-- 複合キー -->
<ui-kbd variant="combo" keys="Ctrl + K"></ui-kbd>
<ui-kbd variant="combo" keys="⌘ + K"></ui-kbd>

<!-- テキストから自動判定 -->
<ui-kbd>Ctrl + Shift + Enter</ui-kbd>
\`\`\`

## 注意事項

- 記号キー \`⌘\` は、読み上げ一貫性のために SR 専用テキストを内部で補完します。
- 複合キーは \`.kbd-combo\` に \`white-space: nowrap\` を適用し、途中改行を防ぎます。
- 小さい親フォントサイズ環境でも \`font-size\` は 12px 未満にならないよう固定下限を持ちます。
        `,
      },
    },
  },
  argTypes: {
    keys: {
      control: 'text',
      description: '表示するキー文字列（例: "Esc", "Ctrl + K", "⌘ + K"）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    variant: {
      control: 'select',
      options: ['auto', 'key', 'combo'],
      description: '描画モード（auto/key/combo）',
      table: {
        type: { summary: "'auto' | 'key' | 'combo'" },
        defaultValue: { summary: "'auto'" },
      },
    },
  },
};

export default meta;
type Story = StoryObj<Kbd>;

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const requireShadowElement = (host: Kbd, selector: string): Element => {
  const found = host.shadowRoot?.querySelector(selector);
  if (!found) {
    throw new Error(`Element not found in shadow root: ${selector}`);
  }
  return found;
};

// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * 単体キーの基本例。
 */
export const Default: Story = {
  args: {
    keys: 'Esc',
    variant: 'auto',
  },
  render: (args) => html`
    <ui-kbd id="kbd-default" keys="${args.keys}" variant="${args.variant}"></ui-kbd>
  `,
  play: async ({ canvasElement }) => {
    const kbd = canvasElement.querySelector<Kbd>('#kbd-default');
    if (!kbd) throw new Error('#kbd-default not found');
    await kbd.updateComplete;

    const key = requireShadowElement(kbd, 'kbd.kbd-key') as HTMLElement;
    if (key.tagName.toLowerCase() !== 'kbd') {
      throw new Error(`Expected native <kbd>, got <${key.tagName.toLowerCase()}>`);
    }
    if (normalizeText(key.textContent) !== 'Esc') {
      throw new Error(`Expected key text "Esc", got "${normalizeText(key.textContent)}"`);
    }
    if (key.getAttribute('aria-label') !== 'エスケープ') {
      throw new Error(
        `Expected aria-label="エスケープ", got "${key.getAttribute('aria-label') ?? 'null'}"`,
      );
    }

    const combo = kbd.shadowRoot?.querySelector('.kbd-combo');
    if (combo) throw new Error('Single key should not render .kbd-combo');
  },
};

// ──────────────────────────────────────────────
// バリアント × 状態
// ──────────────────────────────────────────────

/**
 * バリアント（key/combo）× 状態（Windows/macOS/長い複合）を同時確認するマトリクスです。
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .row {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .label {
        font-size: 11px;
        color: oklch(48% 0.01 250);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .items {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: baseline;
      }
    </style>
    <div class="matrix">
      <div class="row">
        <div class="label">Key Variant</div>
        <div class="items">
          <ui-kbd id="matrix-key-esc" variant="key" keys="Esc"></ui-kbd>
          <ui-kbd id="matrix-key-cmd" variant="key" keys="⌘"></ui-kbd>
        </div>
      </div>
      <div class="row">
        <div class="label">Combo Variant</div>
        <div class="items">
          <ui-kbd id="matrix-combo-win" variant="combo" keys="Ctrl + K"></ui-kbd>
          <ui-kbd id="matrix-combo-mac" variant="combo" keys="⌘ + K"></ui-kbd>
          <ui-kbd id="matrix-combo-long" variant="combo" keys="Ctrl + Shift + Enter"></ui-kbd>
        </div>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const all = [...canvasElement.querySelectorAll<Kbd>('ui-kbd')];
    if (all.length !== 5) throw new Error(`Expected 5 ui-kbd elements, got ${String(all.length)}`);
    await Promise.all(all.map((item) => item.updateComplete));

    const comboWin = canvasElement.querySelector<Kbd>('#matrix-combo-win');
    if (!comboWin) throw new Error('#matrix-combo-win not found');
    const comboWinRoot = requireShadowElement(comboWin, 'kbd.kbd-combo') as HTMLElement;
    const winKeys = comboWin.shadowRoot?.querySelectorAll('kbd.kbd-key');
    if (winKeys?.length !== 2) {
      throw new Error(`Expected 2 keys in Windows combo, got ${String(winKeys?.length ?? 0)}`);
    }
    if (normalizeText(comboWinRoot.textContent) !== 'Ctrl + K') {
      throw new Error(`Unexpected combo text: "${normalizeText(comboWinRoot.textContent)}"`);
    }

    const keyCmd = canvasElement.querySelector<Kbd>('#matrix-key-cmd');
    if (!keyCmd) throw new Error('#matrix-key-cmd not found');
    const cmdKey = requireShadowElement(keyCmd, 'kbd.kbd-key') as HTMLElement;
    const srOnly = cmdKey.querySelector('.sr-only');
    if (!srOnly || normalizeText(srOnly.textContent) !== 'コマンド') {
      throw new Error('Expected SR-only command label for symbol key');
    }
    const commandSymbol = cmdKey.querySelector<HTMLElement>('[aria-hidden="true"]');
    if (!commandSymbol || normalizeText(commandSymbol.textContent) !== '⌘') {
      throw new Error('Expected aria-hidden command symbol "⌘"');
    }

    const comboLong = canvasElement.querySelector<Kbd>('#matrix-combo-long');
    if (!comboLong) throw new Error('#matrix-combo-long not found');
    const longKeys = comboLong.shadowRoot?.querySelectorAll<HTMLElement>('kbd.kbd-key');
    if (longKeys?.length !== 3) {
      throw new Error(`Expected 3 keys in long combo, got ${String(longKeys?.length ?? 0)}`);
    }
    const [firstLongKey, secondLongKey, thirdLongKey] = Array.from(longKeys);
    if (!firstLongKey || !secondLongKey || !thirdLongKey) {
      throw new Error('Long combo key nodes are missing');
    }
    if (firstLongKey.getAttribute('aria-label') !== 'コントロール') {
      throw new Error('Expected first long combo key aria-label to be "コントロール"');
    }
    if (secondLongKey.getAttribute('aria-label') !== 'シフト') {
      throw new Error('Expected second long combo key aria-label to be "シフト"');
    }
    if (thirdLongKey.getAttribute('aria-label') !== 'エンター') {
      throw new Error('Expected third long combo key aria-label to be "エンター"');
    }
  },
};

// ──────────────────────────────────────────────
// ショートカット契約
// ──────────────────────────────────────────────

/**
 * 視覚表記（`<kbd>`）と `aria-keyshortcuts` の対応を確認します。
 */
export const ShortcutContractAlignment: Story = {
  render: () => html`
    <button
      id="shortcut-trigger"
      type="button"
      aria-label="検索"
      aria-keyshortcuts="Control+K Meta+K"
      style="
        display: inline-flex;
        align-items: baseline;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
      "
    >
      <ui-kbd id="shortcut-win" variant="combo" keys="Ctrl + K"></ui-kbd>
      <span aria-hidden="true">/</span>
      <ui-kbd id="shortcut-mac" variant="combo" keys="⌘ + K"></ui-kbd>
    </button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<HTMLButtonElement>('#shortcut-trigger');
    if (!button) throw new Error('#shortcut-trigger not found');

    const shortcutAttr = button.getAttribute('aria-keyshortcuts');
    if (shortcutAttr !== 'Control+K Meta+K') {
      throw new Error(
        `Expected aria-keyshortcuts="Control+K Meta+K", got "${shortcutAttr ?? 'null'}"`,
      );
    }

    const tokens = (shortcutAttr).split(/\s+/);
    if (!tokens.includes('Control+K')) {
      throw new Error('Expected aria-keyshortcuts to include "Control+K"');
    }
    if (!tokens.includes('Meta+K')) {
      throw new Error('Expected aria-keyshortcuts to include "Meta+K"');
    }

    const win = canvasElement.querySelector<Kbd>('#shortcut-win');
    const mac = canvasElement.querySelector<Kbd>('#shortcut-mac');
    if (!win || !mac) throw new Error('Shortcut ui-kbd elements not found');
    await Promise.all([win.updateComplete, mac.updateComplete]);

    const winCombo = requireShadowElement(win, 'kbd.kbd-combo') as HTMLElement;
    const macCombo = requireShadowElement(mac, 'kbd.kbd-combo') as HTMLElement;
    if (normalizeText(winCombo.textContent) !== 'Ctrl + K') {
      throw new Error(`Expected visual shortcut "Ctrl + K", got "${normalizeText(winCombo.textContent)}"`);
    }
    if (normalizeText(macCombo.textContent) !== '⌘ + K') {
      throw new Error(`Expected visual shortcut "⌘ + K", got "${normalizeText(macCombo.textContent)}"`);
    }
  },
};

// ──────────────────────────────────────────────
// 境界条件: 12px 下限
// ──────────────────────────────────────────────

/**
 * 親フォントサイズが 11px の場合でも、`ui-kbd` が 12px 未満にならないことを確認します。
 */
export const SmallTextHardLimit: Story = {
  render: () => html`
    <div id="small-text-container" style="font-size: 11px; display: inline-flex; align-items: center; gap: 0.5rem;">
      <span>親 11px:</span>
      <ui-kbd id="small-text-kbd" keys="Tab"></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Kbd>('#small-text-kbd');
    if (!host) throw new Error('#small-text-kbd not found');
    await host.updateComplete;

    const key = requireShadowElement(host, 'kbd.kbd-key') as HTMLElement;
    const keyFontSize = parseFloat(getComputedStyle(key).fontSize);
    if (Number.isNaN(keyFontSize)) {
      throw new Error('Failed to read computed font-size for .kbd-key');
    }
    if (keyFontSize < 12) {
      throw new Error(`Expected .kbd-key font-size >= 12px, got ${String(keyFontSize)}px`);
    }
  },
};

// ──────────────────────────────────────────────
// 境界条件: 途中改行防止
// ──────────────────────────────────────────────

/**
 * `.kbd-combo` の `white-space: nowrap` と `inline-flex` 契約を確認します。
 */
export const ComboNoWrapIntegrity: Story = {
  render: () => html`
    <div id="nowrap-box" style="width: 72px; border: 1px dashed var(--border-default); padding: 0.5rem;">
      <ui-kbd id="nowrap-combo" variant="combo" keys="Ctrl + Shift + Enter"></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Kbd>('#nowrap-combo');
    if (!host) throw new Error('#nowrap-combo not found');
    await host.updateComplete;

    const combo = requireShadowElement(host, 'kbd.kbd-combo') as HTMLElement;
    const comboStyle = getComputedStyle(combo);

    if (comboStyle.whiteSpace !== 'nowrap') {
      throw new Error(`Expected white-space: nowrap, got "${comboStyle.whiteSpace}"`);
    }
    if (comboStyle.display !== 'inline-flex') {
      throw new Error(`Expected display: inline-flex, got "${comboStyle.display}"`);
    }
    if (comboStyle.alignItems !== 'baseline') {
      throw new Error(`Expected align-items: baseline, got "${comboStyle.alignItems}"`);
    }

    const keys = host.shadowRoot?.querySelectorAll('kbd.kbd-key');
    if (keys?.length !== 3) {
      throw new Error(`Expected 3 keys in nowrap combo, got ${String(keys?.length ?? 0)}`);
    }
    if (normalizeText(combo.textContent) !== 'Ctrl + Shift + Enter') {
      throw new Error(`Unexpected combo text: "${normalizeText(combo.textContent)}"`);
    }
  },
};

// ──────────────────────────────────────────────
// 境界条件: 事故が多い入力
// ──────────────────────────────────────────────

/**
 * 境界条件の確認:
 * - テキストのみ指定時の自動判定
 * - セパレータ連打入力の正規化
 * - 記号キーのスロット運用
 */
export const BoundaryCases: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <div>
        <span style="font-size: 11px; color: oklch(48% 0.01 250); width: 9rem; display: inline-block;">Text Auto</span>
        <ui-kbd id="boundary-text-combo">Ctrl + K</ui-kbd>
      </div>
      <div>
        <span style="font-size: 11px; color: oklch(48% 0.01 250); width: 9rem; display: inline-block;">Malformed</span>
        <ui-kbd id="boundary-malformed" variant="combo" keys="  Ctrl ++  +  K  "></ui-kbd>
      </div>
      <div>
        <span style="font-size: 11px; color: oklch(48% 0.01 250); width: 9rem; display: inline-block;">Slot Symbol</span>
        <ui-kbd id="boundary-slot-symbol">
          <span class="sr-only">コマンド</span>
          <span aria-hidden="true">⌘</span>
        </ui-kbd>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const textAuto = canvasElement.querySelector<Kbd>('#boundary-text-combo');
    const malformed = canvasElement.querySelector<Kbd>('#boundary-malformed');
    const slotSymbol = canvasElement.querySelector<Kbd>('#boundary-slot-symbol');
    if (!textAuto || !malformed || !slotSymbol) {
      throw new Error('Boundary test elements not found');
    }

    await Promise.all([textAuto.updateComplete, malformed.updateComplete, slotSymbol.updateComplete]);

    const autoCombo = requireShadowElement(textAuto, 'kbd.kbd-combo') as HTMLElement;
    const autoKeys = textAuto.shadowRoot?.querySelectorAll('kbd.kbd-key');
    if (autoKeys?.length !== 2) {
      throw new Error(`Expected 2 auto-detected keys, got ${String(autoKeys?.length ?? 0)}`);
    }
    if (normalizeText(autoCombo.textContent) !== 'Ctrl + K') {
      throw new Error(`Unexpected auto combo text: "${normalizeText(autoCombo.textContent)}"`);
    }

    const malformedCombo = requireShadowElement(malformed, 'kbd.kbd-combo') as HTMLElement;
    const malformedKeys = malformed.shadowRoot?.querySelectorAll('kbd.kbd-key');
    if (malformedKeys?.length !== 2) {
      throw new Error(`Expected malformed input to normalize to 2 keys, got ${String(malformedKeys?.length ?? 0)}`);
    }
    if (normalizeText(malformedCombo.textContent) !== 'Ctrl + K') {
      throw new Error(`Expected normalized malformed combo text "Ctrl + K", got "${normalizeText(malformedCombo.textContent)}"`);
    }

    const slot = requireShadowElement(slotSymbol, 'slot') as HTMLSlotElement;
    const assignedElements = slot.assignedElements();
    if (assignedElements.length !== 2) {
      throw new Error(`Expected 2 slotted elements for symbol key, got ${String(assignedElements.length)}`);
    }
    const hiddenSymbol = assignedElements.at(1);
    if (!hiddenSymbol) {
      throw new Error('Second slotted symbol element not found');
    }
    if (hiddenSymbol.getAttribute('aria-hidden') !== 'true') {
      throw new Error('Expected second slotted symbol element to have aria-hidden="true"');
    }
    if (normalizeText(hiddenSymbol.textContent) !== '⌘') {
      throw new Error(`Expected slotted symbol text "⌘", got "${normalizeText(hiddenSymbol.textContent)}"`);
    }
  },
};

// ──────────────────────────────────────────────
// 境界条件: メディア契約
// ──────────────────────────────────────────────

const toCssText = (style: unknown): string => {
  if (style && typeof style === 'object' && 'cssText' in style) {
    const cssText = (style as { cssText?: unknown }).cssText;
    if (typeof cssText === 'string') return cssText;
  }
  return String(style);
};

/**
 * `forced-colors` / `print` 契約がスタイル定義に含まれていることを確認します。
 */
export const MediaModeContracts: Story = {
  render: () => html`<ui-kbd id="media-contract-kbd" keys="Esc"></ui-kbd>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Kbd>('#media-contract-kbd');
    if (!host) throw new Error('#media-contract-kbd not found');
    await host.updateComplete;

    const styleGroup = Array.isArray(Kbd.styles) ? Kbd.styles : [Kbd.styles];
    const styleText = styleGroup.map((item) => toCssText(item)).join('\n');

    if (!styleText.includes('@media (forced-colors: active)')) {
      throw new Error('Expected forced-colors media query in styles');
    }
    if (!styleText.includes('forced-color-adjust: auto')) {
      throw new Error('Expected forced-color-adjust: auto in forced-colors styles');
    }
    if (!styleText.includes('@media print')) {
      throw new Error('Expected print media query in styles');
    }
    if (!styleText.includes('background: transparent !important')) {
      throw new Error('Expected print rule to remove key background');
    }
    if (!styleText.includes('box-shadow: none !important')) {
      throw new Error('Expected print rule to remove key box-shadow');
    }
  },
};
