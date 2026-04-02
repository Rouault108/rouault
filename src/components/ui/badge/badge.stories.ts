import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './badge';
import type { Badge } from './badge';

/**
 * ## バッジ (Badge) `<ui-badge>`
 *
 * `ui-badge` は、件数、状態、更新有無などの小さなシステム状態を提示する非インタラクティブな表示要素です。
 * 表示優先順位は `dot > count > slot` で固定され、数値状態は既定で静的表示、`announce="auto"` の場合のみ通知可能状態として扱います。
 */
const meta = {
  title: 'Components/Badge',
  component: 'ui-badge',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
仕様書 \`docs/design-system/components/badge.md\` を正本とした表示見本です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
表示優先順位、count/max 正規化、announce、count-aria-label、dot fallback、非インタラクティブ契約は
\`test/browser/badge.browser.test.ts\` を正本とします。  
forced-colors を含む CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['solid', 'subtle', 'dot'],
    },
    color: {
      control: 'select',
      options: ['danger', 'primary', 'neutral', 'success', 'warning'],
    },
    count: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    announce: {
      control: 'select',
      options: ['off', 'auto'],
    },
    countAriaLabel: {
      control: 'text',
      name: 'count-aria-label',
    },
    ariaLabelText: {
      control: 'text',
      name: 'aria-label',
    },
  },
} satisfies Meta<Badge>;

export default meta;
type Story = StoryObj<Badge>;

export const Default: Story = {
  tags: ['smoke'],
  render: () => html`<ui-badge id="default-badge">New</ui-badge>`,
};

export const VariantColorMatrix: Story = {
  render: () => {
    const variants = ['solid', 'subtle', 'dot'] as const;
    const colors = ['primary', 'danger', 'success', 'warning', 'neutral'] as const;

    return html`
      <style>
        .matrix {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .matrix-row {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .matrix-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: oklch(48% 0.01 250);
        }
        .matrix-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }
      </style>
      <div class="matrix">
        ${variants.map(
          (variant) => html`
            <div class="matrix-row">
              <div class="matrix-label">${variant}</div>
              <div class="matrix-badges">
                ${colors.map((color) =>
                  variant === 'dot'
                    ? html`
                        <ui-badge
                          variant="dot"
                          color="${color}"
                          aria-label="${color} の更新があります"
                        ></ui-badge>
                      `
                    : html` <ui-badge variant="${variant}" color="${color}">${color}</ui-badge> `,
                )}
              </div>
            </div>
          `,
        )}
      </div>
    `;
  },
};

export const CountVariants: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
      <ui-badge count="1"></ui-badge>
      <ui-badge count="99"></ui-badge>
      <ui-badge count="100"></ui-badge>
      <ui-badge color="danger" count="128"></ui-badge>
      <ui-badge color="warning" .count=${10} .max=${9}></ui-badge>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'count / max による表示例です。99+ や custom max の合否は test/browser/badge.browser.test.ts を正本とします。',
      },
    },
  },
};

export const AnnounceReference: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge count="12"></ui-badge>
      <ui-badge count="12" announce="auto"></ui-badge>
      <ui-badge count="128" announce="auto" count-aria-label="未読 128 件"></ui-badge>
      <ui-badge announce="auto">Static</ui-badge>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'announce="off" と announce="auto" の見本です。role="status" の付与契約は browser test を正本とします。',
      },
    },
  },
};

export const PriorityFallbackReference: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge variant="dot" count="5" aria-label="未読があります">New</ui-badge>
      <ui-badge variant="dot" count="5">New</ui-badge>
      <ui-badge variant="dot">New</ui-badge>
      <ui-badge variant="subtle" count="5">New</ui-badge>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'dot > count > slot の優先順位と dot 不成立時のフォールバック見本です。合否は browser test を正本とします。',
      },
    },
  },
};

export const NormalizationReference: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge .count=${Number.NaN}>Fallback</ui-badge>
      <ui-badge .count=${Number.POSITIVE_INFINITY}>Fallback</ui-badge>
      <ui-badge .count=${-5}></ui-badge>
      <ui-badge .count=${3.9}></ui-badge>
      <ui-badge .count=${5} .max=${0}></ui-badge>
      <ui-badge .count=${11} .max=${10.9}></ui-badge>
      <ui-badge .count=${100} .max=${Number.NaN}></ui-badge>
      <ui-badge></ui-badge>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'count / max 正規化の docs story です。NaN / Infinity / 負数 / 小数 / empty の合否は browser test を正本とします。',
      },
    },
  },
};

export const NonInteractiveReference: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-badge count="5"></ui-badge>
      <ui-badge variant="subtle">Beta</ui-badge>
      <ui-badge variant="dot" aria-label="更新があります"></ui-badge>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'badge は非インタラクティブ要素です。tabindex / role / disabled を持たない契約は browser test を正本とします。',
      },
    },
  },
};

export const ContrastAndMediaManual: Story = {
  tags: ['manual-only'],
  render: () => {
    const colors = ['primary', 'danger', 'success', 'warning', 'neutral'] as const;

    return html`
      <style>
        .theme-grid {
          display: grid;
          gap: 1.25rem;
        }
        .theme-block {
          padding: 1rem;
          border-radius: 10px;
          border: 1px solid oklch(76% 0.02 250 / 0.4);
        }
        .theme-title {
          margin-bottom: 0.75rem;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: oklch(48% 0.01 250);
        }
        .row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
          margin-bottom: 0.75rem;
        }
      </style>

      <div class="theme-grid">
        <section
          class="theme-block"
          style="
            --primary: #1f5eff;
            --on-primary: #ffffff;
            --success: #007a4d;
            --on-success: #ffffff;
            --danger: #b42318;
            --on-danger: #ffffff;
            --warning: #9a4a00;
            --on-warning: #ffffff;
            --fg-default: #111827;
            --bg-default: #ffffff;
            --bg-surface-2: #f3f4f6;
            background: var(--bg-default);
            color: var(--fg-default);
          "
        >
          <div class="theme-title">Light Token Set</div>
          <div class="row">
            ${colors.map((color) => html`<ui-badge color="${color}">text</ui-badge>`)}
          </div>
          <div class="row">
            ${colors.map(
              (color) => html`<ui-badge variant="subtle" color="${color}">text</ui-badge>`,
            )}
          </div>
          <div class="row">
            ${colors.map(
              (color) =>
                html`<ui-badge variant="dot" color="${color}" aria-label="${color}"></ui-badge>`,
            )}
          </div>
        </section>

        <section
          class="theme-block"
          style="
            --primary: #7aa2ff;
            --on-primary: #081225;
            --success: #6dd0a5;
            --on-success: #072116;
            --danger: #ff8c8c;
            --on-danger: #2f0a0a;
            --warning: #ffd27a;
            --on-warning: #2c1a00;
            --fg-default: #f3f4f6;
            --bg-default: #111827;
            --bg-surface-2: #1f2937;
            background: var(--bg-default);
            color: var(--fg-default);
          "
        >
          <div class="theme-title">Dark Token Set</div>
          <div class="row">
            ${colors.map((color) => html`<ui-badge color="${color}">text</ui-badge>`)}
          </div>
          <div class="row">
            ${colors.map(
              (color) => html`<ui-badge variant="subtle" color="${color}">text</ui-badge>`,
            )}
          </div>
          <div class="row">
            ${colors.map(
              (color) =>
                html`<ui-badge variant="dot" color="${color}" aria-label="${color}"></ui-badge>`,
            )}
          </div>
        </section>
      </div>
    `;
  },
  parameters: {
    docs: {
      description: {
        story:
          'contrast / forced-colors の手動確認用 story です。CSS 構造契約の合否は test/ssr/css-structure-contracts.test.ts を正本とします。',
      },
    },
  },
};
