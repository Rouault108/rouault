import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './kbd';
import { Kbd } from './kbd';

/**
 * ## キーボード入力 (Keyboard Input) `<ui-kbd>`
 *
 * `ui-kbd` はキーボードショートカットや入力指示を、ネイティブ `<kbd>` を基礎に静かに可視化するコンポーネントです。
 * 正準入力は `tokens` property であり、`keys` とホストテキストは互換入力、既定スロットは単体キー補助に限定されます。
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
<!-- 正準入力 -->
<ui-kbd></ui-kbd>
<script type="module">
  const kbd = document.querySelector('ui-kbd');
  kbd.tokens = ['Ctrl', 'K'];
</script>

<!-- 互換文字列入力 -->
<ui-kbd keys="Ctrl + K"></ui-kbd>

<!-- 単体キーの補助スロット -->
<ui-kbd>
  <span class="sr-only">コマンド</span>
  <span aria-hidden="true">⌘</span>
</ui-kbd>
\`\`\`

## 契約

- 単体キー / 複合キーの意味論は正規化後トークン数で決まります。
- 複合キー外枠は中立要素であり、各キー片だけがネイティブ \`<kbd>\` です。
- 区切り記号は独立した \`part="separator"\` として公開されます。
- \`keys\` は \`+\` 区切りの互換入力です。literal plus は \`tokens\` を使います。
        `,
      },
    },
  },
  argTypes: {
    tokens: {
      control: 'object',
      description: '表示する正準トークン列（例: ["Ctrl", "K"]）',
      table: {
        type: { summary: 'string[] | undefined' },
        defaultValue: { summary: 'undefined' },
      },
    },
    keys: {
      control: 'text',
      description: '互換文字列入力（例: "Ctrl + K"）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
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

const requireHost = async (canvasElement: HTMLElement, selector: string): Promise<Kbd> => {
  const host = canvasElement.querySelector<Kbd>(selector);
  if (!host) {
    throw new Error(`${selector} が見つかりません`);
  }
  await host.updateComplete;
  return host;
};

const requireKeyParts = (host: Kbd): HTMLElement[] => {
  const keys = host.shadowRoot?.querySelectorAll<HTMLElement>('kbd[part~="key"]') ?? [];
  return Array.from(keys);
};

const requireSeparatorParts = (host: Kbd): HTMLElement[] => {
  const separators = host.shadowRoot?.querySelectorAll<HTMLElement>('[part~="separator"]') ?? [];
  return Array.from(separators);
};

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

  const r = Number.parseInt(match[1] ?? '', 10);
  const g = Number.parseInt(match[2] ?? '', 10);
  const b = Number.parseInt(match[3] ?? '', 10);
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

/**
 * 正準入力 `tokens` による単体キー描画の基本例です。
 */
export const Default: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    tokens: ['Esc'],
    keys: '',
  },
  render: (args) =>
    html`<ui-kbd id="kbd-default" .tokens=${args.tokens} .keys=${args.keys}></ui-kbd>`,
  play: async ({ canvasElement }) => {
    const host = await requireHost(canvasElement, '#kbd-default');
    const key = requireShadowElement(host, 'kbd[part~="key"]') as HTMLElement;

    if (key.tagName.toLowerCase() !== 'kbd') {
      throw new Error('単体キーはネイティブ <kbd> を描画する必要があります');
    }
    if (normalizeText(key.textContent) !== 'Esc') {
      throw new Error(
        `キーテキスト "Esc" を期待していましたが、実際には "${normalizeText(key.textContent)}" でした`,
      );
    }
    if (key.getAttribute('aria-label') !== 'エスケープ') {
      throw new Error('Esc には aria-label="エスケープ" が必要です');
    }
  },
};

/**
 * `tokens`・`keys`・ホストテキスト・スロット補助の優先順位と責務を確認します。
 */
export const InputPriorityAndModes: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <div>
        <span style="display: inline-block; width: 11rem;">Tokens Priority</span>
        <ui-kbd id="priority-tokens" keys="Ctrl + Shift + Enter"></ui-kbd>
      </div>
      <div>
        <span style="display: inline-block; width: 11rem;">Keys Fallback</span>
        <ui-kbd id="priority-keys" keys="Ctrl + K"></ui-kbd>
      </div>
      <div>
        <span style="display: inline-block; width: 11rem;">Text Fallback</span>
        <ui-kbd id="priority-text">Ctrl + K</ui-kbd>
      </div>
      <div>
        <span style="display: inline-block; width: 11rem;">Slot Assist</span>
        <ui-kbd id="priority-slot">
          <span class="sr-only">コマンド</span>
          <span aria-hidden="true">⌘</span>
        </ui-kbd>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const tokensHost = await requireHost(canvasElement, '#priority-tokens');
    tokensHost.tokens = ['Esc'];
    await tokensHost.updateComplete;

    const tokenKeys = requireKeyParts(tokensHost);
    if (tokenKeys.length !== 1 || normalizeText(tokenKeys[0]?.textContent) !== 'Esc') {
      throw new Error('`tokens` は `keys` より優先され、単体キーとして描画される必要があります');
    }

    const keysHost = await requireHost(canvasElement, '#priority-keys');
    const keysCombo = requireShadowElement(keysHost, '[part~="combo"]') as HTMLElement;
    if (keysCombo.tagName.toLowerCase() === 'kbd') {
      throw new Error('複合キー外枠は中立要素である必要があります');
    }
    if (requireKeyParts(keysHost).length !== 2) {
      throw new Error('`keys` は2トークンの複合キーへ正規化される必要があります');
    }

    const textHost = await requireHost(canvasElement, '#priority-text');
    if (requireKeyParts(textHost).length !== 2) {
      throw new Error('ホストテキストは互換入力として複合キーへ正規化される必要があります');
    }

    const slotHost = await requireHost(canvasElement, '#priority-slot');
    const slot = requireShadowElement(slotHost, 'slot') as HTMLSlotElement;
    const assigned = slot.assignedElements();
    if (assigned.length !== 2) {
      throw new Error('単体キー補助スロットには 2 つの補助要素が必要です');
    }
    if (slotHost.shadowRoot?.querySelector('[part~="combo"]')) {
      throw new Error('スロット入力は複合キーを導出してはいけません');
    }
  },
};

/**
 * 複合キーで `part="combo"` と `part="separator"` が公開されることを確認します。
 */
export const ComboStructureContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`<ui-kbd id="combo-structure"></ui-kbd>`,
  play: async ({ canvasElement }) => {
    const host = await requireHost(canvasElement, '#combo-structure');
    host.tokens = ['Ctrl', 'Shift', 'Enter'];
    await host.updateComplete;

    const combo = requireShadowElement(host, '[part~="combo"]') as HTMLElement;
    const keys = requireKeyParts(host);
    const separators = requireSeparatorParts(host);

    if (combo.tagName.toLowerCase() === 'kbd') {
      throw new Error('複合キーの外枠に <kbd> を使ってはいけません');
    }
    if (keys.length !== 3) {
      throw new Error(`3 つのキー片を期待していましたが、実際には ${String(keys.length)} つでした`);
    }
    if (separators.length !== 2) {
      throw new Error(
        `2 つの separator を期待していましたが、実際には ${String(separators.length)} つでした`,
      );
    }
    if (!separators.every((separator) => separator.getAttribute('aria-hidden') === 'true')) {
      throw new Error('separator は aria-hidden="true" を持つ必要があります');
    }
    if (!separators.every((separator) => normalizeText(separator.textContent) === '+')) {
      throw new Error('separator の可視文字は "+" である必要があります');
    }
  },
};

/**
 * 記号キー補助と literal plus 境界を確認します。
 */
export const SymbolAndLiteralPlusBoundaries: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <div>
        <span style="display: inline-block; width: 11rem;">Command Symbol</span>
        <ui-kbd id="boundary-command" .tokens=${['⌘']}></ui-kbd>
      </div>
      <div>
        <span style="display: inline-block; width: 11rem;">Literal Plus</span>
        <ui-kbd id="boundary-plus" .tokens=${['+']}></ui-kbd>
      </div>
      <div>
        <span style="display: inline-block; width: 11rem;">Malformed Keys</span>
        <ui-kbd id="boundary-malformed" keys="  Ctrl ++  +  K  "></ui-kbd>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const commandHost = await requireHost(canvasElement, '#boundary-command');
    const commandKey = requireShadowElement(commandHost, 'kbd[part~="key"]') as HTMLElement;
    const srOnly = commandKey.querySelector('.sr-only');
    const visibleSymbol = commandKey.querySelector<HTMLElement>('[aria-hidden="true"]');
    if (!srOnly || normalizeText(srOnly.textContent) !== 'コマンド') {
      throw new Error('`⌘` は SR 専用の "コマンド" を持つ必要があります');
    }
    if (!visibleSymbol || normalizeText(visibleSymbol.textContent) !== '⌘') {
      throw new Error('`⌘` の可視記号は aria-hidden で分離される必要があります');
    }

    const plusHost = await requireHost(canvasElement, '#boundary-plus');
    const plusKey = requireShadowElement(plusHost, 'kbd[part~="key"]') as HTMLElement;
    if (normalizeText(plusKey.textContent) !== '+') {
      throw new Error('literal plus は `tokens` によってそのまま描画される必要があります');
    }

    const malformedHost = await requireHost(canvasElement, '#boundary-malformed');
    if (requireKeyParts(malformedHost).length !== 2) {
      throw new Error('`keys` の空トークンは除去される必要があります');
    }
  },
};

/**
 * 視覚表記と `aria-keyshortcuts` の対応を確認します。
 */
export const ShortcutContractAlignment: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
      <ui-kbd id="shortcut-win" .tokens=${['Ctrl', 'K']}></ui-kbd>
      <span aria-hidden="true">/</span>
      <ui-kbd id="shortcut-mac" .tokens=${['⌘', 'K']}></ui-kbd>
    </button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<HTMLButtonElement>('#shortcut-trigger');
    if (!button) throw new Error('#shortcut-trigger が見つかりません');

    const shortcutAttr = button.getAttribute('aria-keyshortcuts');
    if (shortcutAttr !== 'Control+K Meta+K') {
      throw new Error('aria-keyshortcuts が想定どおりではありません');
    }

    const win = await requireHost(canvasElement, '#shortcut-win');
    const mac = await requireHost(canvasElement, '#shortcut-mac');
    const winCombo = requireShadowElement(win, '[part~="combo"]') as HTMLElement;
    const macCombo = requireShadowElement(mac, '[part~="combo"]') as HTMLElement;

    if (normalizeText(winCombo.textContent) !== 'Ctrl + K') {
      throw new Error('Windows 側ショートカットの可視表記が崩れています');
    }

    const macClone = macCombo.cloneNode(true) as HTMLElement;
    macClone.querySelectorAll('.sr-only').forEach((element) => {
      element.remove();
    });
    if (normalizeText(macClone.textContent) !== '⌘ + K') {
      throw new Error('macOS 側ショートカットの可視表記が崩れています');
    }
  },
};

/**
 * 小さい親フォント環境でも判読性が維持されることを確認します。
 */
export const SmallTextHardLimit: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div
      id="small-text-container"
      style="font-size: 11px; display: inline-flex; align-items: center; gap: 0.5rem;"
    >
      <span>親 11px:</span>
      <ui-kbd id="small-text-kbd" .tokens=${['Tab']}></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = await requireHost(canvasElement, '#small-text-kbd');
    const key = requireShadowElement(host, 'kbd[part~="key"]') as HTMLElement;
    const fontSize = Number.parseFloat(getComputedStyle(key).fontSize);
    if (Number.isNaN(fontSize) || fontSize < 12) {
      throw new Error(
        `キートップのフォントサイズは 12px 以上である必要があります: ${String(fontSize)}`,
      );
    }
  },
};

/**
 * 複合キーが途中改行せず、意味のまとまりを保つことを確認します。
 */
export const ComboNoWrapIntegrity: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div
      id="nowrap-box"
      style="width: 72px; border: 1px dashed var(--border-default); padding: 0.5rem;"
    >
      <ui-kbd id="nowrap-combo" .tokens=${['Ctrl', 'Shift', 'Enter']}></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = await requireHost(canvasElement, '#nowrap-combo');
    const combo = requireShadowElement(host, '[part~="combo"]') as HTMLElement;
    const style = getComputedStyle(combo);

    if (style.whiteSpace !== 'nowrap') {
      throw new Error(
        `white-space: nowrap を期待していましたが、実際には "${style.whiteSpace}" でした`,
      );
    }
    if (style.display !== 'inline-flex') {
      throw new Error(
        `display: inline-flex を期待していましたが、実際には "${style.display}" でした`,
      );
    }
    if (requireKeyParts(host).length !== 3) {
      throw new Error('複合キーのキー片数が崩れています');
    }
  },
};

/**
 * 最低保証集合の日本語読み上げを確認します。
 */
export const JapaneseSRConsistency: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
      <ui-kbd id="sr-ctrl" .tokens=${['Ctrl']}></ui-kbd>
      <ui-kbd id="sr-cmd" .tokens=${['⌘']}></ui-kbd>
      <ui-kbd id="sr-esc" .tokens=${['Esc']}></ui-kbd>
      <ui-kbd id="sr-shift" .tokens=${['Shift']}></ui-kbd>
      <ui-kbd id="sr-enter" .tokens=${['Enter']}></ui-kbd>
      <ui-kbd id="sr-tab" .tokens=${['Tab']}></ui-kbd>
      <ui-kbd id="sr-space" .tokens=${['Space']}></ui-kbd>
      <ui-kbd id="sr-alt" .tokens=${['Alt']}></ui-kbd>
      <ui-kbd id="sr-option" .tokens=${['Option']}></ui-kbd>
      <ui-kbd id="sr-backspace" .tokens=${['Backspace']}></ui-kbd>
      <ui-kbd id="sr-delete" .tokens=${['Delete']}></ui-kbd>
      <ui-kbd id="sr-up" .tokens=${['ArrowUp']}></ui-kbd>
      <ui-kbd id="sr-fn" .tokens=${['Fn']}></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const expected: readonly {
      id: string;
      label: string;
      useSrOnly?: boolean;
    }[] = [
      { id: '#sr-ctrl', label: 'コントロール' },
      { id: '#sr-cmd', label: 'コマンド', useSrOnly: true },
      { id: '#sr-esc', label: 'エスケープ' },
      { id: '#sr-shift', label: 'シフト' },
      { id: '#sr-enter', label: 'エンター' },
      { id: '#sr-tab', label: 'タブ' },
      { id: '#sr-space', label: 'スペース' },
      { id: '#sr-alt', label: 'オルト' },
      { id: '#sr-option', label: 'オプション' },
      { id: '#sr-backspace', label: 'バックスペース' },
      { id: '#sr-delete', label: 'デリート' },
      { id: '#sr-up', label: '上矢印' },
      { id: '#sr-fn', label: 'ファンクション' },
    ];

    for (const item of expected) {
      const host = await requireHost(canvasElement, item.id);
      const key = requireShadowElement(host, 'kbd[part~="key"]') as HTMLElement;

      if (item.useSrOnly) {
        const srOnly = key.querySelector('.sr-only');
        if (!srOnly || normalizeText(srOnly.textContent) !== item.label) {
          throw new Error(`${item.id} の SR 専用読み上げが想定どおりではありません`);
        }
        continue;
      }

      if (key.getAttribute('aria-label') !== item.label) {
        throw new Error(`${item.id} の aria-label が "${item.label}" ではありません`);
      }
    }
  },
};

/**
 * 暗色トークンでも AA コントラストを維持することを確認します。
 */
export const DarkModeTokenContract: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
      <ui-kbd id="dark-mode-kbd" .tokens=${['Esc']}></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = await requireHost(canvasElement, '#dark-mode-kbd');
    const surface = canvasElement.querySelector<HTMLElement>('#dark-mode-surface');
    if (!surface) throw new Error('#dark-mode-surface が見つかりません');

    const key = requireShadowElement(host, 'kbd[part~="key"]') as HTMLElement;
    const style = getComputedStyle(key);
    const expectedBorderColor = resolveBorderColor(surface);

    if (style.color !== 'rgb(230, 232, 236)') {
      throw new Error('ダークモードの文字色がトークン追従していません');
    }
    if (style.backgroundColor !== 'rgb(31, 35, 43)') {
      throw new Error('ダークモードの背景色がトークン追従していません');
    }
    if (style.borderTopColor !== expectedBorderColor) {
      throw new Error('ダークモードのボーダーカラーがトークン追従していません');
    }
    if (style.borderRadius !== '12px') {
      throw new Error('ダークモードの角丸がトークン追従していません');
    }

    const fg = parseRgb(style.color);
    const bg = parseRgb(style.backgroundColor);
    if (!fg || !bg) {
      throw new Error('色解析に失敗しました');
    }

    const ratio = contrastRatio(fg, bg);
    if (ratio < 4.5) {
      throw new Error(`ダークモードのコントラスト比が不足しています: ${ratio.toFixed(2)}`);
    }
  },
};

/**
 * 空入力時に空のキートップを出力しないことを確認します。
 */
export const EmptyInputNoRenderBoundary: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <div style="display: flex; gap: 0.75rem;">
      <ui-kbd id="empty-none"></ui-kbd>
      <ui-kbd id="empty-tokens"></ui-kbd>
      <ui-kbd id="empty-keys" keys="   "></ui-kbd>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const emptyNone = await requireHost(canvasElement, '#empty-none');
    const emptyTokens = await requireHost(canvasElement, '#empty-tokens');
    const emptyKeys = await requireHost(canvasElement, '#empty-keys');

    emptyTokens.tokens = [];
    await emptyTokens.updateComplete;

    if (emptyNone.shadowRoot?.querySelector('kbd, [part~="combo"]')) {
      throw new Error('完全な空入力時に描画が発生しています');
    }
    if (emptyTokens.shadowRoot?.querySelector('kbd, [part~="combo"]')) {
      throw new Error('空の `tokens` 入力時に描画が発生しています');
    }
    if (emptyKeys.shadowRoot?.querySelector('kbd, [part~="combo"]')) {
      throw new Error('空白のみの `keys` 入力時に描画が発生しています');
    }
  },
};

/**
 * `forced-colors` / `print` 契約がスタイル定義に含まれていることを確認します。
 */
export const MediaModeContracts: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`<ui-kbd id="media-contract-kbd" .tokens=${['Esc']}></ui-kbd>`,
  play: async ({ canvasElement }) => {
    const host = await requireHost(canvasElement, '#media-contract-kbd');
    void host;

    const styleGroup = Array.isArray(Kbd.styles) ? Kbd.styles : [Kbd.styles];
    const styleText = styleGroup.map((item) => toCssText(item)).join('\n');

    if (!styleText.includes('@media (forced-colors: active)')) {
      throw new Error('スタイルに forced-colors メディアクエリが含まれている必要があります');
    }
    if (!styleText.includes('forced-color-adjust: auto')) {
      throw new Error('forced-colors では forced-color-adjust: auto を維持する必要があります');
    }
    if (!styleText.includes('@media print')) {
      throw new Error('スタイルに print メディアクエリが含まれている必要があります');
    }
    if (!styleText.includes('background: transparent !important')) {
      throw new Error('印刷時は背景を除去する必要があります');
    }
    if (!styleText.includes('box-shadow: none !important')) {
      throw new Error('印刷時はボックスシャドウを除去する必要があります');
    }
  },
};
