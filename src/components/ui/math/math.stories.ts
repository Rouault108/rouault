import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './math';
import type { UiMath } from './math';

const LONG_MATH_LATEX = String.raw`x + y + z + w + v + u + t + s + r + q + p + o + n + m + l + k + j + i + h + g`;

const meta: Meta<UiMath> = {
  title: 'Components/Math',
  component: 'ui-math',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
math の **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
runtime render settle / error kind / keyboard horizontal scroll / id anchor / aria region の合否は Storybook で判定しません。

browser contract は別途 \
\`test/browser/math.browser.test.ts\` 側へ移してください。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiMath>;

export const Default: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: 'display math の代表表示用 smoke story です。基本 surface だけを残します。',
      },
    },
  },
  render: () => html`<ui-math id="display-math" latex="E = mc^2"></ui-math>`,
};

export const VariantStateMatrix: Story = {
  parameters: {
    docs: {
      description: {
        story: 'inline / display / long expression の視覚差を見る docs story です。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <p>
        inline:
        <ui-math id="inline-math" inline latex="a^2 + b^2 = c^2"></ui-math>
      </p>
      <ui-math id="display-math-2" latex="\\int_0^1 x^2 \\, dx = \\frac{1}{3}"></ui-math>
      <ui-math id="long-display-math" latex="${LONG_MATH_LATEX}"></ui-math>
    </div>
  `,
};

export const ErrorStates: Story = {
  parameters: {
    docs: {
      description: {
        story: 'error surface の代表表示用 smoke story です。エラー表示だけを残します。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-math id="parse-error" latex="\\frac{1}{"></ui-math>
      <ui-math id="empty-source" latex=""></ui-math>
    </div>
  `,
};

export const ManualKeyboardReview: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- 長い display 数式の横スクロール surface
- inline / display の密度差
- エラー surface の視認性

math-settled / keyboard / aria region / id anchor の合否は browser test 側へ移してください。
        `,
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-math id="manual-display" latex="${LONG_MATH_LATEX}"></ui-math>
      <p>
        <ui-math id="manual-inline" inline latex="\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}"></ui-math>
      </p>
    </div>
  `,
};
