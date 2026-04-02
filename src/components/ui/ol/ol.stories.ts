import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './ol';
import type { Ol } from './ol';

const meta: Meta<Ol> = {
  title: 'Components/Ol',
  component: 'ui-ol',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
単一の ordered list を、native ordered list semantics と整合したまま静かに整列表示するコンポーネントです。

- 契約対象は \`ui-ol\` 配下の ordered list のみ
- \`start\` / \`reversed\` / \`li[value]\` と視覚マーカーを整合
- 本文開始位置は list 単位で安定して揃う
- \`variant="steps"\` はマーカー差分のみに限定
- 非正規入力は best-effort であり、公開契約の中心には含めない
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Ol>;

export const Default: Story = {
  render: () => html`
    <ui-ol id="default-ol" style="--space-2: 8px;">
      <ol>
        <li><span data-testid="anchor-1">順序を明確に伝える。</span></li>
        <li><span data-testid="anchor-2">本文の視線誘導を壊さない。</span></li>
        <li><span data-testid="anchor-3">静かな構造を保つ。</span></li>
      </ol>
    </ui-ol>
  `,
};

export const StartZeroAndNegative: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-ol id="start-zero" style="--space-2: 8px;">
        <ol start="0">
          <li><span data-testid="zero-1">0 から始まる。</span></li>
          <li><span data-testid="zero-2">1 へ進む。</span></li>
        </ol>
      </ui-ol>

      <ui-ol id="start-negative" style="--space-2: 8px;">
        <ol start="-1">
          <li><span data-testid="negative-1">-1 から始まる。</span></li>
          <li><span data-testid="negative-2">0 へ進む。</span></li>
        </ol>
      </ui-ol>
    </div>
  `,
};

export const StartAndValueJump: Story = {
  render: () => html`
    <ui-ol id="start-value-jump" style="--space-2: 8px;">
      <ol start="9">
        <li><span data-testid="jump-9">9。</span></li>
        <li><span data-testid="jump-10">10。</span></li>
        <li value="99"><span data-testid="jump-99">99。</span></li>
        <li><span data-testid="jump-100">100。</span></li>
        <li value="-3"><span data-testid="jump-neg3">-3。</span></li>
        <li><span data-testid="jump-neg2">-2。</span></li>
      </ol>
    </ui-ol>
  `,
};

export const Reversed: Story = {
  render: () => html`
    <ui-ol id="reversed-only" style="--space-2: 8px;">
      <ol reversed>
        <li><span data-testid="reversed-3">降順 3。</span></li>
        <li><span data-testid="reversed-2">降順 2。</span></li>
        <li><span data-testid="reversed-1">降順 1。</span></li>
      </ol>
    </ui-ol>
  `,
};

export const ReversedWithStartAndValue: Story = {
  render: () => html`
    <ui-ol id="reversed-composite" style="--space-2: 8px;">
      <ol reversed start="5">
        <li><span data-testid="reversed-start-5">5。</span></li>
        <li value="2"><span data-testid="reversed-value-2">2。</span></li>
        <li><span data-testid="reversed-value-1">1。</span></li>
      </ol>
    </ui-ol>
  `,
};

export const MarkerAlignment: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-ol id="align-9-10">
        <ol start="9">
          <li><span data-testid="a-9">9。</span></li>
          <li><span data-testid="a-10">10。</span></li>
        </ol>
      </ui-ol>

      <ui-ol id="align-99-100">
        <ol start="99">
          <li><span data-testid="a-99">99。</span></li>
          <li><span data-testid="a-100">100。</span></li>
        </ol>
      </ui-ol>

      <ui-ol id="align-999-1000">
        <ol start="999">
          <li><span data-testid="a-999">999。</span></li>
          <li><span data-testid="a-1000">1000。</span></li>
        </ol>
      </ui-ol>

      <ui-ol id="align-neg1-0">
        <ol start="-1">
          <li><span data-testid="a-neg1">-1。</span></li>
          <li><span data-testid="a-0">0。</span></li>
        </ol>
      </ui-ol>

      <ui-ol id="align-0-1">
        <ol start="0">
          <li><span data-testid="a-0b">0。</span></li>
          <li><span data-testid="a-1">1。</span></li>
        </ol>
      </ui-ol>
    </div>
  `,
};

export const VariantSteps: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
        --fg-muted: rgb(111, 111, 124);
        --primary: rgb(24, 118, 242);
        --space-2: 8px;
      }
    </style>

    <div class="matrix">
      <div id="token-muted-probe" style="color: var(--fg-muted); display: none;"></div>
      <div id="token-primary-probe" style="color: var(--primary); display: none;"></div>

      <ui-ol id="variant-default">
        <ol>
          <li><span data-testid="variant-default-anchor">既定状態。</span></li>
          <li>本文色はそのまま。</li>
        </ol>
      </ui-ol>

      <ui-ol id="variant-steps" variant="steps">
        <ol>
          <li><span data-testid="variant-steps-anchor">手順状態。</span></li>
          <li>本文色はそのまま。</li>
        </ol>
      </ui-ol>
    </div>
  `,
};

export const NestedOrderedList: Story = {
  render: () => html`
    <ui-ol id="nested-ordered" style="--space-2: 8px;">
      <ol>
        <li><span data-testid="parent-1">親 1。</span></li>
        <li>
          <span data-testid="parent-2">親 2。</span>
          <ol start="9">
            <li><span data-testid="child-9">子 9。</span></li>
            <li><span data-testid="child-10">子 10。</span></li>
          </ol>
        </li>
      </ol>
    </ui-ol>
  `,
};

export const NestedUnorderedListIsolation: Story = {
  render: () => html`
    <ui-ol id="nested-unordered">
      <ol>
        <li>
          <span data-testid="ordered-anchor">ordered item</span>
          <ul data-testid="nested-ul">
            <li data-testid="unordered-item">unordered item</li>
          </ul>
        </li>
      </ol>
    </ui-ol>
  `,
};

export const EnvironmentManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'ui-ol の環境差分（dark surface / token 参照 / interactive descendant）の合否は Storybook ではなく SSR / browser テストを正本とします。この story は手動確認専用です。',
      },
    },
  },
  render: () => html`
    <style>
      .surface {
        display: grid;
        gap: 1rem;
        padding: 1rem;
        border-radius: 12px;
        background: oklch(18% 0.02 250);
        color: oklch(92% 0.01 250);
        --space-2: 8px;
        --fg-muted: oklch(74% 0.01 250);
        --primary: oklch(72% 0.17 256);
      }

      .touch-link,
      .touch-button {
        display: inline-flex;
        align-items: center;
      }
    </style>

    <div class="surface">
      <div id="env-muted-probe" style="color: var(--fg-muted); display: none;"></div>
      <div id="env-primary-probe" style="color: var(--primary); display: none;"></div>

      <ui-ol id="env-default">
        <ol>
          <li><span data-testid="env-default-anchor">暗色面でも本文を優先する。</span></li>
          <li><a class="touch-link" href="#detail">詳細を読む</a></li>
        </ol>
      </ui-ol>

      <ui-ol id="env-steps" variant="steps">
        <ol>
          <li><span data-testid="env-steps-anchor">steps でも本文色は変えない。</span></li>
          <li><button class="touch-button" type="button">次へ進む</button></li>
        </ol>
      </ui-ol>
    </div>
  `,
};
