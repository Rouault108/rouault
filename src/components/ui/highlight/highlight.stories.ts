import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './highlight';
import type { Highlight } from './highlight';

const meta: Meta<Highlight> = {
  title: 'Components/Highlight',
  component: 'ui-highlight',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
検索ハイライト専用の inline semantic component です。

- 公開タグは \`ui-highlight\` のみ
- 公開入力は \`current-match\` と \`text\`
- 最終DOMはホスト直下のネイティブ \`mark\`
- \`text === null\` のときだけ初期子テキスト fallback を評価
- 解決後文字列が空なら \`mark\` を形成しない

この story ファイルは **docs / smoke / 手動確認** に限定します。現在一致の判定や CSS media/token 契約は Storybook を正本にしません。
        `,
      },
    },
  },
  argTypes: {
    currentMatch: {
      name: 'current-match',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
      description: '検索ヒット列の現在位置かどうか',
    },
    text: {
      control: 'text',
      table: {
        type: { summary: 'string | null' },
        defaultValue: { summary: 'null' },
      },
      description: '子テキストを与えにくい場合の明示入力',
    },
  },
};

export default meta;
type Story = StoryObj<Highlight>;

export const Default: Story = {
  tags: ['smoke'],
  args: {
    currentMatch: false,
    text: '検索キーワード',
  },
  render: (args) => html`
    <ui-highlight
      id="default-highlight"
      ?current-match=${args.currentMatch}
      .text=${args.text ?? null}
    ></ui-highlight>
  `,
};

export const CurrentMatchMatrix: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-highlight id="passive-highlight" text="通常ヒット"></ui-highlight>
      <ui-highlight id="current-highlight" current-match text="現在ヒット"></ui-highlight>
    </div>
  `,
};

export const CurrentMatchReference: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-highlight id="visual-passive" text="通常ヒット"></ui-highlight>
      <ui-highlight id="visual-current" current-match text="現在ヒット"></ui-highlight>
    </div>
  `,
};

export const MediaAndTokenManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-highlight id="media-highlight" current-match text="検索ヒット"></ui-highlight>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'highlight の forced-colors / print / token hook / current-match hook の CSS 構造契約は test/ssr/css-structure-contracts.test.ts へ移送済みです。この story は手動確認専用です。',
      },
    },
  },
};

export const DarkModeContrastReference: Story = {
  render: () => html`
    <style>
      .theme {
        display: grid;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: 12px;
      }

      .probe {
        inline-size: 1px;
        block-size: 1px;
      }

      .light {
        --fg-default: oklch(22% 0.03 250);
        --bg-highlight-subtle: oklch(96% 0.04 65);
        --bg-highlight-current: oklch(91% 0.07 72);
        background: white;
        color: var(--fg-default);
      }

      .dark {
        --fg-default: oklch(95% 0.01 250);
        --bg-highlight-subtle: oklch(34% 0.05 65);
        --bg-highlight-current: oklch(42% 0.08 72);
        background: oklch(22% 0.02 250);
        color: var(--fg-default);
      }
    </style>

    <div id="light-theme" class="theme light">
      <div id="light-fg" class="probe" style="background: var(--fg-default);"></div>
      <div id="light-bg" class="probe" style="background: var(--bg-highlight-subtle);"></div>
      <ui-highlight id="light-highlight" current-match text="Light"></ui-highlight>
    </div>

    <div id="dark-theme" class="theme dark">
      <div id="dark-fg" class="probe" style="background: var(--fg-default);"></div>
      <div id="dark-bg" class="probe" style="background: var(--bg-highlight-subtle);"></div>
      <ui-highlight id="dark-highlight" current-match text="Dark"></ui-highlight>
    </div>
  `,
};
