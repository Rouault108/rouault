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
    throw new Error(`Shadow Root 内に要素が見つかりません: ${selector}`);
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
    if (!kbd) throw new Error('#kbd-default が見つかりません');
    await kbd.updateComplete;

    const key = requireShadowElement(kbd, 'kbd.kbd-key') as HTMLElement;
    if (key.tagName.toLowerCase() !== 'kbd') {
      throw new Error(
        `ネイティブの <kbd> 要素を期待していましたが、実際には <${key.tagName.toLowerCase()}> でした`,
      );
    }
    if (normalizeText(key.textContent) !== 'Esc') {
      throw new Error(
        `キーテキスト "Esc" を期待していましたが、実際には "${normalizeText(key.textContent)}" でした`,
      );
    }
    if (key.getAttribute('aria-label') !== 'エスケープ') {
      throw new Error(
        `aria-label="エスケープ" を期待していましたが、実際には "${key.getAttribute('aria-label') ?? 'null'}" でした`,
      );
    }

    const combo = kbd.shadowRoot?.querySelector('.kbd-combo');
    if (combo) throw new Error('単体キーは .kbd-combo を描画すべきではありません');
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
    if (all.length !== 5)
      throw new Error(
        `5つの ui-kbd 要素を期待していましたが、実際には ${String(all.length)} つでした`,
      );
    await Promise.all(all.map((item) => item.updateComplete));

    const comboWin = canvasElement.querySelector<Kbd>('#matrix-combo-win');
    if (!comboWin) throw new Error('#matrix-combo-win が見つかりません');
    const comboWinRoot = requireShadowElement(comboWin, 'kbd.kbd-combo') as HTMLElement;
    const winKeys = comboWin.shadowRoot?.querySelectorAll('kbd.kbd-key');
    if (winKeys?.length !== 2) {
      throw new Error(
        `Windows のコンボには2つのキーを期待していましたが、実際には ${String(winKeys?.length ?? 0)} つでした`,
      );
    }
    if (normalizeText(comboWinRoot.textContent) !== 'Ctrl + K') {
      throw new Error(`想定外のコンボテキストです: "${normalizeText(comboWinRoot.textContent)}"`);
    }

    const keyCmd = canvasElement.querySelector<Kbd>('#matrix-key-cmd');
    if (!keyCmd) throw new Error('#matrix-key-cmd が見つかりません');
    const cmdKey = requireShadowElement(keyCmd, 'kbd.kbd-key') as HTMLElement;
    const srOnly = cmdKey.querySelector('.sr-only');
    if (!srOnly || normalizeText(srOnly.textContent) !== 'コマンド') {
      throw new Error('記号キーには SR 専用のコマンドラベルを期待していました');
    }
    const commandSymbol = cmdKey.querySelector<HTMLElement>('[aria-hidden="true"]');
    if (!commandSymbol || normalizeText(commandSymbol.textContent) !== '⌘') {
      throw new Error('aria-hidden なコマンド記号 "⌘" を期待していました');
    }

    const comboLong = canvasElement.querySelector<Kbd>('#matrix-combo-long');
    if (!comboLong) throw new Error('#matrix-combo-long が見つかりません');
    const longKeys = comboLong.shadowRoot?.querySelectorAll<HTMLElement>('kbd.kbd-key');
    if (longKeys?.length !== 3) {
      throw new Error(
        `長いコンボには3つのキーを期待していましたが、実際には ${String(longKeys?.length ?? 0)} つでした`,
      );
    }
    const [firstLongKey, secondLongKey, thirdLongKey] = Array.from(longKeys);
    if (!firstLongKey || !secondLongKey || !thirdLongKey) {
      throw new Error('長いコンボのキーノードが見つかりません');
    }
    if (firstLongKey.getAttribute('aria-label') !== 'コントロール') {
      throw new Error(
        '1番目の長いコンボキーの aria-label が "コントロール" であることを期待していました',
      );
    }
    if (secondLongKey.getAttribute('aria-label') !== 'シフト') {
      throw new Error(
        '2番目の長いコンボキーの aria-label が "シフト" であることを期待していました',
      );
    }
    if (thirdLongKey.getAttribute('aria-label') !== 'エンター') {
      throw new Error(
        '3番目の長いコンボキーの aria-label が "エンター" であることを期待していました',
      );
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
    if (!button) throw new Error('#shortcut-trigger が見つかりません');

    const shortcutAttr = button.getAttribute('aria-keyshortcuts');
    if (shortcutAttr !== 'Control+K Meta+K') {
      throw new Error(
        `aria-keyshortcuts="Control+K Meta+K" を期待していましたが、実際には "${shortcutAttr ?? 'null'}" でした`,
      );
    }

    const tokens = shortcutAttr.split(/\s+/);
    if (!tokens.includes('Control+K')) {
      throw new Error('aria-keyshortcuts に "Control+K" が含まれている必要があります');
    }
    if (!tokens.includes('Meta+K')) {
      throw new Error('aria-keyshortcuts に "Meta+K" が含まれている必要があります');
    }

    const win = canvasElement.querySelector<Kbd>('#shortcut-win');
    const mac = canvasElement.querySelector<Kbd>('#shortcut-mac');
    if (!win || !mac) throw new Error('ショートカットの ui-kbd 要素が見つかりません');
    await Promise.all([win.updateComplete, mac.updateComplete]);

    const winCombo = requireShadowElement(win, 'kbd.kbd-combo') as HTMLElement;
    const macCombo = requireShadowElement(mac, 'kbd.kbd-combo') as HTMLElement;
    if (normalizeText(winCombo.textContent) !== 'Ctrl + K') {
      throw new Error(
        `視覚的なショートカット "Ctrl + K" を期待していましたが、実際には "${normalizeText(winCombo.textContent)}" でした`,
      );
    }
    // sr-only 要素（スクリーンリーダー専用テキスト）を除いた視覚テキストで比較する
    const macComboClone = macCombo.cloneNode(true) as HTMLElement;
    macComboClone.querySelectorAll('.sr-only').forEach((el) => {
      el.remove();
    });
    if (normalizeText(macComboClone.textContent) !== '⌘ + K') {
      throw new Error(
        `視覚的なショートカット "⌘ + K" を期待していましたが、実際には "${normalizeText(macComboClone.textContent)}" でした`,
      );
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
    <div
      id="small-text-container"
      style="font-size: 11px; display: inline-flex; align-items: center; gap: 0.5rem;"
    >
      <span>親 11px:</span>
      <ui-kbd id="small-text-kbd" keys="Tab"></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Kbd>('#small-text-kbd');
    if (!host) throw new Error('#small-text-kbd が見つかりません');
    await host.updateComplete;

    const key = requireShadowElement(host, 'kbd.kbd-key') as HTMLElement;
    const keyFontSize = parseFloat(getComputedStyle(key).fontSize);
    if (Number.isNaN(keyFontSize)) {
      throw new Error('.kbd-key の計算済みフォントサイズの取得に失敗しました');
    }
    if (keyFontSize < 12) {
      throw new Error(
        `.kbd-key のフォントサイズが 12px 以上であることを期待していましたが、実際には ${String(keyFontSize)}px でした`,
      );
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
    <div
      id="nowrap-box"
      style="width: 72px; border: 1px dashed var(--border-default); padding: 0.5rem;"
    >
      <ui-kbd id="nowrap-combo" variant="combo" keys="Ctrl + Shift + Enter"></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Kbd>('#nowrap-combo');
    if (!host) throw new Error('#nowrap-combo が見つかりません');
    await host.updateComplete;

    const combo = requireShadowElement(host, 'kbd.kbd-combo') as HTMLElement;
    const comboStyle = getComputedStyle(combo);

    if (comboStyle.whiteSpace !== 'nowrap') {
      throw new Error(
        `white-space: nowrap を期待していましたが、実際には "${comboStyle.whiteSpace}" でした`,
      );
    }
    if (comboStyle.display !== 'inline-flex') {
      throw new Error(
        `display: inline-flex を期待していましたが、実際には "${comboStyle.display}" でした`,
      );
    }
    if (comboStyle.alignItems !== 'center') {
      throw new Error(
        `align-items: center を期待していましたが、実際には "${comboStyle.alignItems}" でした`,
      );
    }

    const keys = host.shadowRoot?.querySelectorAll('kbd.kbd-key');
    if (keys?.length !== 3) {
      throw new Error(
        `nowrap コンボには3つのキーを期待していましたが、実際には ${String(keys?.length ?? 0)} つでした`,
      );
    }
    if (normalizeText(combo.textContent) !== 'Ctrl + Shift + Enter') {
      throw new Error(`想定外のコンボテキストです: "${normalizeText(combo.textContent)}"`);
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
        <span
          style="font-size: 11px; color: oklch(48% 0.01 250); width: 9rem; display: inline-block;"
          >Text Auto</span
        >
        <ui-kbd id="boundary-text-combo">Ctrl + K</ui-kbd>
      </div>
      <div>
        <span
          style="font-size: 11px; color: oklch(48% 0.01 250); width: 9rem; display: inline-block;"
          >Malformed</span
        >
        <ui-kbd id="boundary-malformed" variant="combo" keys="  Ctrl ++  +  K  "></ui-kbd>
      </div>
      <div>
        <span
          style="font-size: 11px; color: oklch(48% 0.01 250); width: 9rem; display: inline-block;"
          >Slot Symbol</span
        >
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
      throw new Error('境界テストの要素が見つかりません');
    }

    await Promise.all([
      textAuto.updateComplete,
      malformed.updateComplete,
      slotSymbol.updateComplete,
    ]);

    const autoCombo = requireShadowElement(textAuto, 'kbd.kbd-combo') as HTMLElement;
    const autoKeys = textAuto.shadowRoot?.querySelectorAll('kbd.kbd-key');
    if (autoKeys?.length !== 2) {
      throw new Error(
        `自動検出されたキーが2つであることを期待していましたが、実際には ${String(autoKeys?.length ?? 0)} つでした`,
      );
    }
    if (normalizeText(autoCombo.textContent) !== 'Ctrl + K') {
      throw new Error(`想定外の自動コンボテキストです: "${normalizeText(autoCombo.textContent)}"`);
    }

    const malformedCombo = requireShadowElement(malformed, 'kbd.kbd-combo') as HTMLElement;
    const malformedKeys = malformed.shadowRoot?.querySelectorAll('kbd.kbd-key');
    if (malformedKeys?.length !== 2) {
      throw new Error(
        `不正な入力が2つのキーに正規化されることを期待していましたが、実際には ${String(malformedKeys?.length ?? 0)} つでした`,
      );
    }
    if (normalizeText(malformedCombo.textContent) !== 'Ctrl + K') {
      throw new Error(
        `正規化されたコンボテキスト "Ctrl + K" を期待していましたが、実際には "${normalizeText(malformedCombo.textContent)}" でした`,
      );
    }

    const slot = requireShadowElement(slotSymbol, 'slot') as HTMLSlotElement;
    const assignedElements = slot.assignedElements();
    if (assignedElements.length !== 2) {
      throw new Error(
        `記号キーに2つのスロット要素を期待していましたが、実際には ${String(assignedElements.length)} つでした`,
      );
    }
    const srOnlyText = assignedElements.at(0) as HTMLElement | undefined;
    if (!srOnlyText) {
      throw new Error('1番目のスロットされた SR 専用要素が見つかりません');
    }
    const srOnlyStyle = getComputedStyle(srOnlyText);
    if (srOnlyStyle.position !== 'absolute') {
      throw new Error(
        `スロットされた SR 専用要素が非表示であることを期待していましたが、実際には position="${srOnlyStyle.position}" でした`,
      );
    }
    const hiddenSymbol = assignedElements.at(1);
    if (!hiddenSymbol) {
      throw new Error('2番目のスロットされた記号要素が見つかりません');
    }
    if (hiddenSymbol.getAttribute('aria-hidden') !== 'true') {
      throw new Error(
        '2番目のスロットされた記号要素に aria-hidden="true" が設定されている必要があります',
      );
    }
    if (normalizeText(hiddenSymbol.textContent) !== '⌘') {
      throw new Error(
        `スロットされた記号テキスト "⌘" を期待していましたが、実際には "${normalizeText(hiddenSymbol.textContent)}" でした`,
      );
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

const parseRgb = (value: string): [number, number, number] | null => {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(value);
  if (!match) return null;

  const redText = match[1];
  const greenText = match[2];
  const blueText = match[3];
  if (!redText || !greenText || !blueText) return null;

  const r = Number.parseInt(redText, 10);
  const g = Number.parseInt(greenText, 10);
  const b = Number.parseInt(blueText, 10);
  if ([r, g, b].some((item) => Number.isNaN(item))) return null;

  return [r, g, b];
};

const toLuminance = ([r, g, b]: [number, number, number]): number => {
  const normalize = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const rs = normalize(r);
  const gs = normalize(g);
  const bs = normalize(b);
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const contrastRatio = (
  foreground: [number, number, number],
  background: [number, number, number],
): number => {
  const fgLum = toLuminance(foreground);
  const bgLum = toLuminance(background);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
};

const resolveBorderColor = (surface: HTMLElement): string => {
  const probe = document.createElement('div');
  probe.style.borderTopWidth = '1px';
  probe.style.borderTopStyle = 'solid';
  probe.style.borderTopColor =
    'color-mix(in oklab, var(--border-muted, oklch(20% 0 0 / 0.06)) 80%, transparent)';
  surface.append(probe);
  const color = getComputedStyle(probe).borderTopColor;
  probe.remove();
  return color;
};

// ──────────────────────────────────────────────
// 受け入れ基準: 日本語読み上げ整合
// ──────────────────────────────────────────────

/**
 * 必須マッピング（Ctrl/Cmd/Esc/Shift/Enter/Tab/Space）の日本語読み上げ整合を検証します。
 */
export const JapaneseSRConsistency: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
      <ui-kbd id="sr-ctrl" keys="Ctrl"></ui-kbd>
      <ui-kbd id="sr-cmd" keys="⌘"></ui-kbd>
      <ui-kbd id="sr-esc" keys="Esc"></ui-kbd>
      <ui-kbd id="sr-shift" keys="Shift"></ui-kbd>
      <ui-kbd id="sr-enter" keys="Enter"></ui-kbd>
      <ui-kbd id="sr-tab" keys="Tab"></ui-kbd>
      <ui-kbd id="sr-space" keys="Space"></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const expected: readonly { id: string; label: string; useSrOnly?: boolean }[] = [
      { id: '#sr-ctrl', label: 'コントロール' },
      { id: '#sr-cmd', label: 'コマンド', useSrOnly: true },
      { id: '#sr-esc', label: 'エスケープ' },
      { id: '#sr-shift', label: 'シフト' },
      { id: '#sr-enter', label: 'エンター' },
      { id: '#sr-tab', label: 'タブ' },
      { id: '#sr-space', label: 'スペース' },
    ];

    const hosts = expected.map(({ id }) => {
      const host = canvasElement.querySelector<Kbd>(id);
      if (!host) throw new Error(`${id} が見つかりません`);
      return host;
    });
    await Promise.all(hosts.map((host) => host.updateComplete));

    for (const item of expected) {
      const host = canvasElement.querySelector<Kbd>(item.id);
      if (!host) throw new Error(`${item.id} が見つかりません`);
      const key = requireShadowElement(host, 'kbd.kbd-key') as HTMLElement;

      if (item.useSrOnly) {
        const srOnly = key.querySelector('.sr-only');
        if (!srOnly || normalizeText(srOnly.textContent) !== item.label) {
          throw new Error(
            `${item.id} に対して SR 専用ラベル "${item.label}" を期待していましたが、実際には異なりました`,
          );
        }
        continue;
      }

      if (key.getAttribute('aria-label') !== item.label) {
        throw new Error(
          `${item.id} に対して aria-label="${item.label}" を期待していましたが、実際には "${key.getAttribute('aria-label') ?? 'null'}" でした`,
        );
      }
    }
  },
};

// ──────────────────────────────────────────────
// 受け入れ基準: ダークモード契約
// ──────────────────────────────────────────────

/**
 * ダークトークンセットでもトークン追従と AA コントラストを維持することを検証します。
 */
export const DarkModeTokenContract: Story = {
  render: () => html`
    <div
      id="dark-mode-surface"
      style="
        color-scheme: dark;
        --fg-default: rgb(230, 232, 236);
        --bg-surface-2: rgb(43, 48, 59);
        --bg-fill-muted: rgb(31, 35, 43);
        --border-muted: rgb(94, 103, 121);
        --border-width: 1px;
        --radius-md: 12px;
        background: rgb(24, 28, 35);
        color: rgb(230, 232, 236);
        padding: 1rem;
        border-radius: 8px;
      "
    >
      <ui-kbd id="dark-mode-kbd" keys="Esc"></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Kbd>('#dark-mode-kbd');
    if (!host) throw new Error('#dark-mode-kbd が見つかりません');
    await host.updateComplete;

    const surface = canvasElement.querySelector<HTMLElement>('#dark-mode-surface');
    if (!surface) throw new Error('#dark-mode-surface が見つかりません');

    const key = requireShadowElement(host, 'kbd.kbd-key') as HTMLElement;
    const style = getComputedStyle(key);
    const expectedBorderColor = resolveBorderColor(surface);

    if (style.color !== 'rgb(230, 232, 236)') {
      throw new Error(
        `ダークモードのフォアグラウンドカラーを期待していましたが、実際には "${style.color}" でした`,
      );
    }
    if (style.backgroundColor !== 'rgb(31, 35, 43)') {
      throw new Error(
        `ダークモードのバックグラウンドカラーを期待していましたが、実際には "${style.backgroundColor}" でした`,
      );
    }
    if (style.borderTopColor !== expectedBorderColor) {
      throw new Error(
        `ダークモードのボーダーカラーを期待していましたが、実際には "${style.borderTopColor}" でした`,
      );
    }
    if (style.borderRadius !== '12px') {
      throw new Error(
        `ダークモードの角丸が 12px であることを期待していましたが、実際には "${style.borderRadius}" でした`,
      );
    }

    const fg = parseRgb(style.color);
    const bg = parseRgb(style.backgroundColor);
    if (!fg || !bg) {
      throw new Error('コントラスト比計算のための色解析に失敗しました');
    }

    const ratio = contrastRatio(fg, bg);
    if (ratio < 4.5) {
      throw new Error(
        `ダークモードのコントラスト比が 4.5 以上であることを期待していましたが、実際には ${ratio.toFixed(2)} でした`,
      );
    }
  },
};

// ──────────────────────────────────────────────
// 境界条件: 空入力
// ──────────────────────────────────────────────

/**
 * 空入力時に空のキートップを出力しないことを確認します。
 */
export const EmptyInputNoRenderBoundary: Story = {
  render: () => html`
    <div style="display: flex; gap: 0.75rem;">
      <ui-kbd id="empty-auto"></ui-kbd>
      <ui-kbd id="empty-combo" variant="combo"></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const auto = canvasElement.querySelector<Kbd>('#empty-auto');
    const combo = canvasElement.querySelector<Kbd>('#empty-combo');
    if (!auto || !combo) throw new Error('空入力のホストが見つかりません');
    await Promise.all([auto.updateComplete, combo.updateComplete]);

    const emptyAutoRendered = auto.shadowRoot?.querySelector('kbd');
    const emptyComboRendered = combo.shadowRoot?.querySelector('kbd');
    if (emptyAutoRendered || emptyComboRendered) {
      throw new Error('空入力時には <kbd> ノードが描画されないことを期待していました');
    }
  },
};

/**
 * `forced-colors` / `print` 契約がスタイル定義に含まれていることを確認します。
 */
export const MediaModeContracts: Story = {
  render: () => html`<ui-kbd id="media-contract-kbd" keys="Esc"></ui-kbd>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Kbd>('#media-contract-kbd');
    if (!host) throw new Error('#media-contract-kbd が見つかりません');
    await host.updateComplete;

    const styleGroup = Array.isArray(Kbd.styles) ? Kbd.styles : [Kbd.styles];
    const styleText = styleGroup.map((item) => toCssText(item)).join('\n');

    if (!styleText.includes('@media (forced-colors: active)')) {
      throw new Error('スタイルに forced-colors メディアクエリが含まれている必要があります');
    }
    if (!styleText.includes('forced-color-adjust: auto')) {
      throw new Error(
        'forced-colors スタイルに forced-color-adjust: auto が含まれている必要があります',
      );
    }
    if (!styleText.includes('border: var(--border-width, 1px) solid var(--border-default)')) {
      throw new Error(
        'forced-colors のボーダーが var(--border-default) の参照を維持している必要があります',
      );
    }
    if (!styleText.includes('@media print')) {
      throw new Error('スタイルに print メディアクエリが含まれている必要があります');
    }
    if (!styleText.includes('background: transparent !important')) {
      throw new Error('印刷ルールでキーの背景が削除されている必要があります');
    }
    if (!styleText.includes('box-shadow: none !important')) {
      throw new Error('印刷ルールでキーのボックスシャドウが削除されている必要があります');
    }
    if (
      !styleText.includes(
        'border: var(--border-width, 1px) solid var(--border-default, oklch(85% 0 0))',
      )
    ) {
      throw new Error('印刷用のボーダーがボーダートークンの参照を維持している必要があります');
    }
  },
};
