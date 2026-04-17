import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './kbd';
import { Kbd } from './kbd';

/**
 * ## キーボード入力 (Keyboard Input) `<ui-kbd>`
 *
 * `ui-kbd` はキーボードショートカットや入力指示を、ネイティブ `<kbd>` を基礎に静かに可視化するコンポーネントです。
 * 正準入力は `tokens` property であり、既定スロットは単体キー補助に限定されます。
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
<ui-kbd id="kbd-example"></ui-kbd>
<script type="module">
  const kbd = document.querySelector('#kbd-example');
  kbd.tokens = ['Ctrl', 'K'];
</script>

<!-- 単体キーの補助スロット -->
<ui-kbd>
  <span class="sr-only">コマンド</span>
  <span aria-hidden="true">⌘</span>
</ui-kbd>
\`\`\`

## 契約

- 正準入力は \`tokens\` です。
- 単体キー / 複合キーの意味論は正規化後トークン数で決まります。
- 複合キー外枠は中立要素であり、各キー片だけがネイティブ \`<kbd>\` です。
- 区切り記号は独立した \`part="separator"\` として公開されます。
- 既定スロットは単体キーの補助表現に限定されます。
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
  },
};

export default meta;
type Story = StoryObj<Kbd>;

/**
 * 正準入力 `tokens` による単体キー描画の基本例です。
 */
export const Default: Story = {
  args: {
    tokens: ['Esc'],
  },
  render: (args) => html`<ui-kbd id="kbd-default" .tokens=${args.tokens}></ui-kbd>`,
};

/**
 * 単体キーと複合キーの正規入力例を確認します。
 */
export const SupportedInputModes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <div>
        <span style="display: inline-block; width: 11rem;">Single Key</span>
        <ui-kbd id="mode-single" .tokens=${['Esc']}></ui-kbd>
      </div>
      <div>
        <span style="display: inline-block; width: 11rem;">Combo Keys</span>
        <ui-kbd id="mode-combo" .tokens=${['Ctrl', 'K']}></ui-kbd>
      </div>
      <div>
        <span style="display: inline-block; width: 11rem;">Command Symbol</span>
        <ui-kbd id="mode-command" .tokens=${['⌘', 'K']}></ui-kbd>
      </div>
      <div>
        <span style="display: inline-block; width: 11rem;">Slot Assist</span>
        <ui-kbd id="mode-slot">
          <span class="sr-only">コマンド</span>
          <span aria-hidden="true">⌘</span>
        </ui-kbd>
      </div>
    </div>
  `,
};

/**
 * 小さい親フォント環境でもキー表記が判読可能であることを確認します。
 */
export const SmallTextHardLimit: Story = {
  render: () => html`
    <div
      id="small-text-container"
      style="font-size: 11px; display: inline-flex; align-items: center; gap: 0.5rem;"
    >
      <span>親 11px:</span>
      <ui-kbd id="small-text-kbd" .tokens=${['Tab']}></ui-kbd>
    </div>
  `,
};

/**
 * 暗色トークンへの追従を手動確認します。
 */
export const DarkModeManual: Story = {
  tags: ['manual-only'],
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
      <ui-kbd id="dark-mode-kbd" .tokens=${['Ctrl', 'K']}></ui-kbd>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'ui-kbd の dark-mode token 参照契約は test/ssr/css-structure-contracts.test.ts に移送します。この story は手動確認専用です。',
      },
    },
  },
};

/**
 * forced-colors / print の CSS 構造契約を手動確認します。
 */
export const MediaModeManual: Story = {
  tags: ['manual-only'],
  render: () => html`<ui-kbd id="media-contract-kbd" .tokens=${['Ctrl', 'K']}></ui-kbd>`,
  parameters: {
    docs: {
      description: {
        story:
          'ui-kbd の forced-colors / print の CSS 構造契約は test/ssr/css-structure-contracts.test.ts に移送します。この story は手動確認専用です。',
      },
    },
  },
};