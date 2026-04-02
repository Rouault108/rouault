import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './copy-button';
import type { CopyButton } from './copy-button';

const meta: Meta<CopyButton> = {
  title: 'Components/Copy Button',
  component: 'ui-copy-button',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
コピーボタンコンポーネントは、クリップボード操作を自己完結的に処理します。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
success / error / loading / rapid click replay / timer reset / emitted event / size forward / missing-label fallback は
\`test/browser/copy-button.browser.test.ts\` を正本とします。  
CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'クリップボードに書き込むテキスト',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    label: {
      control: 'text',
      description: 'aria-label のベースとなるテキスト（必須）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
      description: 'ボタンサイズ',
      table: {
        type: { summary: "'sm' | 'md'" },
        defaultValue: { summary: 'sm' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'クリック無効',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<CopyButton>;

export const Default: Story = {
  tags: ['smoke'],
  args: {
    value: 'コピーされるテキスト',
    label: 'コードをコピー',
    size: 'sm',
    disabled: false,
  },
  render: (args) => html`
    <ui-copy-button
      value="${args.value}"
      label="${args.label}"
      size="${args.size}"
      ?disabled=${args.disabled}
    ></ui-copy-button>
  `,
};

export const WithCodeBlock: Story = {
  render: () => html`
    <style>
      .code-block-demo {
        position: relative;
        background: var(--bg-surface-2, #f5f5f5);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        padding: 1rem;
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        max-width: 500px;
      }

      .code-block-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .code-block-lang {
        font-size: 12px;
        color: var(--fg-muted, #666);
        font-weight: var(--font-medium, 500);
      }

      .code-block-content {
        margin: 0;
        overflow-x: auto;
      }
    </style>

    <div class="code-block-demo">
      <div class="code-block-header">
        <span class="code-block-lang">TypeScript</span>
        <ui-copy-button
          value="const greeting = 'Hello, World!';
console.log(greeting);"
          label="コードをコピー"
        ></ui-copy-button>
      </div>
      <pre class="code-block-content"><code>const greeting = 'Hello, World!';
console.log(greeting);</code></pre>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'コードブロック文脈での代表表示用 smoke story です。',
      },
    },
  },
};

export const URLCopy: Story = {
  render: () => html`
    <style>
      .url-copy-demo {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        max-width: 400px;
      }

      .url-text {
        flex: 1;
        font-size: 13px;
        color: var(--fg-muted, #666);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    </style>

    <div class="url-copy-demo">
      <span class="url-text">https://example.com/article/design-system</span>
      <ui-copy-button
        value="https://example.com/article/design-system"
        label="URLをコピー"
        size="sm"
      ></ui-copy-button>
    </div>
  `,
};

export const SizeVariants: Story = {
  render: () => html`
    <div
      style="
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      "
    >
      <ui-copy-button value="small" label="smサイズをコピー" size="sm"></ui-copy-button>
      <ui-copy-button value="medium" label="mdサイズをコピー" size="md"></ui-copy-button>
      <ui-copy-button value="disabled" label="無効" size="sm" ?disabled=${true}></ui-copy-button>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'size と disabled の代表表示です。size forward の合否は browser test を正本とします。',
      },
    },
  },
};

export const MultipleButtons: Story = {
  render: () => html`
    <div
      style="
        display: grid;
        grid-template-columns: repeat(3, max-content);
        gap: 0.75rem 1rem;
        align-items: center;
      "
    >
      <ui-copy-button value="alpha" label="alpha をコピー"></ui-copy-button>
      <ui-copy-button value="beta" label="beta をコピー"></ui-copy-button>
      <ui-copy-button value="gamma" label="gamma をコピー"></ui-copy-button>
    </div>
  `,
};

export const ManualFeedbackReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <p style="margin: 0; color: var(--fg-muted, #666);">
        クリックして success / error / loading / rapid replay の見え方を手動確認してください。
      </p>

      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
        <ui-copy-button value="success" label="成功確認" size="sm"></ui-copy-button>
        <ui-copy-button value="error" label="失敗確認" size="sm"></ui-copy-button>
        <ui-copy-button
          value="loading-threshold"
          label="loading 確認"
          size="sm"
          style="--timeout-async-threshold: 10;"
        ></ui-copy-button>
        <ui-copy-button value="rapid" label="連打確認" size="sm"></ui-copy-button>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- success / error / loading の視覚差
- ライブリージョン以外の見た目
- 連打時の体感
- disabled を除く通常操作感

合否は Storybook ではなく \`test/browser/copy-button.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const ManualEventAndFallbackReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <style>
      .event-demo {
        display: grid;
        gap: 0.75rem;
        max-width: 480px;
      }

      .event-log {
        min-height: 120px;
        padding: 0.75rem;
        border: 1px solid var(--border-default, #ddd);
        border-radius: 8px;
        background: var(--bg-surface-2, #f7f7f7);
        overflow: auto;
        font-size: 12px;
      }

      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }
    </style>

    <div class="event-demo">
      <div class="row">
        <ui-copy-button
          id="copy-button-with-event-handlers"
          value="event-driven copy"
          label="イベント付きコピー"
          @copy=${(event: Event) => {
            const log = document.getElementById('event-log');
            if (!(log instanceof HTMLElement)) return;
            const detail = (event as CustomEvent<{ value: string }>).detail;
            const item = document.createElement('div');
            item.textContent = `copy: ${detail.value}`;
            log.appendChild(item);
          }}
          @copy-error=${(event: Event) => {
            const log = document.getElementById('event-log');
            if (!(log instanceof HTMLElement)) return;
            const detail = (event as CustomEvent<{ error: unknown; value: string }>).detail;
            const item = document.createElement('div');
            item.textContent = `copy-error: ${String(detail.error)}`;
            log.appendChild(item);
          }}
        ></ui-copy-button>

        <ui-copy-button value="missing-label"></ui-copy-button>
      </div>

      <div id="event-log" class="event-log">
        <div style="color: var(--fg-muted, #666);">
          ボタンをクリックするとイベントログが追記されます。
        </div>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- copy / copy-error の event log
- label 欠落時の安全側 fallback
- 開発時 warning の観察

契約の合否は Storybook ではなく \`test/browser/copy-button.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const ContrastAndMediaManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <section
        style="
          padding: 1rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          background: oklch(18% 0.01 250);
          color: oklch(95% 0.01 250);
          border-radius: 12px;
        "
      >
        <ui-copy-button value="dark-default" label="ダークモードでコピー"></ui-copy-button>
        <ui-copy-button
          value="dark-disabled"
          label="ダークモード無効"
          ?disabled=${true}
        ></ui-copy-button>
      </section>

      <section
        style="
          padding: 1rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          background: Canvas;
          color: CanvasText;
          border: 1px solid CanvasText;
        "
      >
        <ui-copy-button value="forced" label="forced colors でコピー"></ui-copy-button>
        <ui-copy-button
          value="forced-disabled"
          label="forced colors 無効"
          ?disabled=${true}
        ></ui-copy-button>
      </section>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'dark / forced-colors / print / motion の手動確認用 story です。CSS 構造契約は SSR 側を正本とします。',
      },
    },
  },
};
