import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './toast';
import { ToastManager, type UiToast } from './toast';

const renderToastDemo = (
  id: string,
  controls: unknown,
  options: {
    dark?: boolean;
  } = {},
) => html`
  <div
    style=${[
      'display: grid',
      'gap: 1rem',
      'min-height: 320px',
      'padding: 1rem',
      options.dark ? 'color-scheme: dark' : '',
      options.dark ? 'background: oklch(16% 0.02 250)' : '',
    ]
      .filter((value) => value.length > 0)
      .join('; ')}
  >
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
      ${controls}
      <button
        type="button"
        @click=${() => {
          ToastManager.clear();
        }}
      >
        クリア
      </button>
    </div>

    <ui-toast id=${id}></ui-toast>
  </div>
`;

const meta: Meta<UiToast> = {
  title: 'Components/Toast',
  component: 'ui-toast',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
一時通知（Non-blocking）を管理するトーストです。

- 新着を上部に積む
- 最大3件を保持し、4件目は最古を削除
- 重複キーは \`variant + normalizedMessage\`
- \`duration > 0\` は hover / focus / visibility で pause できる
- \`duration: 0\` は自動消滅しないが閉じるボタンは表示される

この story ファイルは **docs / smoke / 手動確認** に限定します。  
stack / duplicate / timer / dismiss / legacy variant の browser contract は
\`test/browser/toast.browser.test.ts\` を正本とします。  
dark-mode / forced-colors / reduced-motion / print の CSS 構造契約は
\`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiToast>;

export const Default: Story = {
  tags: ['smoke'],
  render: () =>
    renderToastDemo(
      'toast-default',
      html`
        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'success',
              message: '保存が完了しました',
              duration: 0,
            });
          }}
        >
          success を表示
        </button>
      `,
    ),
};

export const VariantShowcase: Story = {
  render: () =>
    renderToastDemo(
      'toast-variant-showcase',
      html`
        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'success',
              message: '保存が完了しました',
              duration: 0,
            });
          }}
        >
          success
        </button>

        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'info',
              message: '同期を開始しました',
              duration: 0,
            });
          }}
        >
          info
        </button>

        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'warning',
              message: '接続が不安定です',
              duration: 1200,
            });
          }}
        >
          warning
        </button>

        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'danger',
              message: '保存に失敗しました',
            });
          }}
        >
          danger
        </button>
      `,
    ),
};

export const StackAndDuplicateManual: Story = {
  tags: ['manual-only'],
  render: () =>
    renderToastDemo(
      'toast-stack-duplicate',
      html`
        <button
          type="button"
          @click=${() => {
            ToastManager.show({ variant: 'info', message: 'A', duration: 0 });
            ToastManager.show({ variant: 'info', message: 'B', duration: 0 });
            ToastManager.show({ variant: 'info', message: 'C', duration: 0 });
            ToastManager.show({ variant: 'info', message: 'D', duration: 0 });
          }}
        >
          overflow を再現
        </button>

        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'success',
              message: '保存が完了しました',
              duration: 1200,
            });
          }}
        >
          duplicate 基準 1
        </button>

        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'success',
              message: '  保存が完了しました  ',
              duration: 320,
            });
          }}
        >
          duplicate 基準 2
        </button>

        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'danger',
              message: '保存が完了しました',
              duration: 0,
            });
          }}
        >
          variant 違い
        </button>
      `,
    ),
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- 4件目追加時に最古が落ちること
- 新着が上側に積まれること
- 同一 variant + normalized message が統合されること
- variant が違えば統合されないこと

合否は \`test/browser/toast.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const TimingPauseManual: Story = {
  tags: ['manual-only'],
  render: () =>
    renderToastDemo(
      'toast-timing-pause',
      html`
        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'warning',
              message: '接続が不安定です',
              duration: 1600,
            });
          }}
        >
          hover / focus pause 用
        </button>

        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'info',
              message: 'visibility テスト',
              duration: 1600,
            });
          }}
        >
          visibility 用
        </button>
      `,
    ),
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- hover 中に自動消滅が止まること
- close button focus 中に自動消滅が止まること
- ページ visibility 変化で timer を扱えること

合否は \`test/browser/toast.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const DangerManual: Story = {
  tags: ['manual-only'],
  render: () =>
    renderToastDemo(
      'toast-danger-variant',
      html`
        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'danger',
              message: '危険通知テスト',
              duration: 1200,
            });
          }}
        >
          danger toast を表示
        </button>
      `,
    ),
  parameters: {
    docs: {
      description: {
        story: 'danger variantの表示とdurationを手動確認するstoryです。',
      },
    },
  },
};

export const DarkAndMediaManual: Story = {
  tags: ['manual-only'],
  render: () =>
    renderToastDemo(
      'toast-dark-media',
      html`
        <button
          type="button"
          @click=${() => {
            ToastManager.show({
              variant: 'danger',
              message: 'ダークモード確認',
              duration: 0,
            });
          }}
        >
          dark toast を表示
        </button>
      `,
      { dark: true },
    ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story:
          'dark-mode / forced-colors / reduced-motion / print の手動確認用 story です。CSS 構造契約は test/ssr/css-structure-contracts.test.ts を正本とします。',
      },
    },
  },
};
