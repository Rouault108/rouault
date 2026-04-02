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

/**
 * 正準入力 `tokens` による単体キー描画の基本例です。
 */

export const Default: Story = {
  args: {
    tokens: ['Esc'],
    keys: '',
  },
  render: (args) =>
    html`<ui-kbd id="kbd-default" .tokens=${args.tokens} .keys=${args.keys}></ui-kbd>`,
};

/**
 * `tokens`・`keys`・ホストテキスト・スロット補助の優先順位と責務を確認します。
 */

export const InputPriorityAndModes: Story = {
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
};

/**
 * 複合キーで `part="combo"` と `part="separator"` が公開されることを確認します。
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
 * 複合キーが途中改行せず、意味のまとまりを保つことを確認します。
 */

export const DarkModeTokenContract: Story = {
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
      <ui-kbd id="dark-mode-kbd" .tokens=${['Esc']}></ui-kbd>
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
 * 空入力時に空のキートップを出力しないことを確認します。
 */

export const MediaModeContracts: Story = {
  tags: ['manual-only'],
  render: () => html`<ui-kbd id="media-contract-kbd" .tokens=${['Esc']}></ui-kbd>`,
  parameters: {
    docs: {
      description: {
        story:
          'ui-kbd の forced-colors / print の CSS 構造契約は test/ssr/css-structure-contracts.test.ts に移送します。この story は手動確認専用です。',
      },
    },
  },
};
