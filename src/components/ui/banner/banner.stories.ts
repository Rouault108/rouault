import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { Banner } from './banner';
import './banner';

const meta: Meta<Banner> = {
  title: 'Components/Banner',
  component: 'ui-banner',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
フィードバックと導線を短く提示するバナーコンポーネントです。

- variant は \`info / warning / error / success\`
- action slot と dismissible を組み合わせられます
- dismiss / focus / role / fallback variant の契約は \`test/browser/banner.browser.test.ts\` に移送済みです
- print / forced-colors / dark mode の確認は手動確認または \`test/ssr/**\` 側で扱います
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Banner>;

export const Default: Story = {
  args: {
    variant: 'warning',
    dismissible: false,
  },
  render: (args) => html`
    <ui-banner variant="${args.variant}" ?dismissible=${args.dismissible}>
      お使いのセッションは30分後に期限切れになります。
      <a slot="action" href="/session">セッションを延長</a>
    </ui-banner>
  `,
};

export const VariantStateCombinations: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.875rem;
      }
      .cell {
        border: 1px dashed var(--border-default, #d7d7d7);
        border-radius: 6px;
        overflow: hidden;
      }
      .label {
        margin: 0;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px dashed var(--border-default, #d7d7d7);
        font-size: 11px;
        color: var(--fg-muted, #6e7781);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <p class="label">info x action</p>
        <ui-banner variant="info">
          メンテナンスの詳細を公開しました。
          <a slot="action" href="/maintenance">詳細を見る</a>
        </ui-banner>
      </div>

      <div class="cell">
        <p class="label">warning x action</p>
        <ui-banner variant="warning">
          お使いのセッションは30分後に期限切れになります。
          <button slot="action" type="button">セッションを延長</button>
        </ui-banner>
      </div>

      <div class="cell">
        <p class="label">error x action + dismissible</p>
        <ui-banner variant="error" dismissible>
          サービスへの接続に問題が発生しています。
          <button slot="action" type="button">再試行</button>
        </ui-banner>
      </div>

      <div class="cell">
        <p class="label">success x dismissible</p>
        <ui-banner variant="success" dismissible> データのバックアップが完了しました。 </ui-banner>
      </div>
    </div>
  `,
};

export const SlotBoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-banner variant="info">
        <ui-icon name="icon" icon="calendar-clock" aria-hidden="true"></ui-icon>
        計画メンテナンスは明日0時に開始します。
      </ui-banner>

      <ui-banner variant="success"> バックアップに成功しました。 </ui-banner>

      <ui-banner variant="warning">
        お使いのセッションはまもなく期限切れになります。
        <button slot="action" type="button">延長する</button>
        <a slot="action" href="/security">設定を確認</a>
      </ui-banner>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'slot 境界と dismiss の observable behavior は browser test 側で検査し、この story は構成例の比較用に残しています。',
      },
    },
  },
};

export const DarkModeVisualOutcome: Story = {
  tags: ['manual-only'],
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'dark mode の見え方確認用です。色トークン解決自体は Storybook の合否にしません。',
      },
    },
  },
  render: () => html`
    <div
      style="color-scheme: dark; background: oklch(14% 0.01 250); color: oklch(92% 0.01 250); padding: 1rem; border-radius: 10px;"
    >
      <ui-banner variant="warning" dismissible>
        お使いのセッションは30分後に期限切れになります。
        <button slot="action" type="button">延長する</button>
      </ui-banner>
    </div>
  `,
};

export const ForcedColorsVisualOutcome: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'forced-colors の CSS 構造契約は test/ssr 側で検査し、この story は手動確認専用に縮退しています。',
      },
    },
  },
  render: () => html`
    <ui-banner variant="error" dismissible>
      接続エラーが発生しました。状況を確認してから再試行してください。
      <a slot="action" href="/status">状況を確認</a>
    </ui-banner>
  `,
};

export const PrintVisualOutcome: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'print の構造契約は test/ssr 側で検査し、この story は印刷時の見え方確認用に残しています。',
      },
    },
  },
  render: () => html`
    <ui-banner variant="success" dismissible>
      バックアップが完了しました。
      <a slot="action" href="/backup">詳細を見る</a>
    </ui-banner>
  `,
};
