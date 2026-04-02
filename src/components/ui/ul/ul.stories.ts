import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './ul';
import type { Ul } from './ul';

const meta: Meta<Ul> = {
  title: 'Components/Ul',
  component: 'ui-ul',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
順序なしリストのためのコンポーネントです。

- 適用スコープは \`.prose ul\` と \`ui-ul > ul\` のみに限定
- マーカー階層は Level1/2/3 = \`•/◦/▪\`
- \`list-style: none\` の副作用を避けるため \`role="list"\` / \`role="listitem"\` を補強
- リスト内リンク/ボタンのタッチターゲット最小 44px を保証
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Ul>;

/**
 * 基本契約:
 * - `role="list"` / `role="listitem"` が付与される
 * - Level 1 マーカーが `•`
 */

export const Default: Story = {
  render: () => html`
    <ui-ul id="default-ul" style="--space-2: 8px; --space-4: 16px;">
      <ul>
        <li data-testid="item-1">本文の読書リズムを壊さない。</li>
        <li data-testid="item-2">マーカーは主張しすぎない。</li>
        <li data-testid="item-3">情報の信号を優先する。</li>
      </ul>
    </ui-ul>
  `,
};

/**
 * バリアント × 状態:
 * - フラット構造
 * - ネスト構造（1〜4階層）
 * - インタラクティブ要素を含む状態
 */

export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
      }
      .label {
        font-size: 11px;
        color: var(--fg-muted, #666);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-block-end: 0.25rem;
      }
      .cell {
        padding: 0.75rem;
        border: 1px dashed var(--border-default, #d7d7d7);
        border-radius: var(--radius-sm, 4px);
      }
      .touch-link,
      .touch-button {
        display: inline-flex;
        align-items: center;
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <div class="label">Flat × Default</div>
        <ui-ul id="matrix-flat">
          <ul>
            <li data-testid="flat-1">シンプルな並列情報</li>
            <li data-testid="flat-2">行間リズムを維持</li>
          </ul>
        </ui-ul>
      </div>

      <div class="cell">
        <div class="label">Nested × Marker Hierarchy</div>
        <ui-ul id="matrix-nested">
          <ul>
            <li data-testid="nested-l1">
              Level 1
              <ul>
                <li data-testid="nested-l2">
                  Level 2
                  <ul>
                    <li data-testid="nested-l3">
                      Level 3
                      <ul>
                        <li data-testid="nested-l4">Level 4</li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </ui-ul>
      </div>

      <div class="cell">
        <div class="label">Interactive × Touch Target</div>
        <ui-ul
          id="matrix-interactive"
          style="--control-min-touch: 24px; --control-height-sm: 24px;"
        >
          <ul>
            <li>
              <a class="touch-link" href="#read">詳細を読む</a>
            </li>
            <li>
              <button class="touch-button" type="button">操作する</button>
            </li>
          </ul>
        </ui-ul>
      </div>
    </div>
  `,
};

/**
 * 事故が多い境界条件:
 * - `<ui-ul><li>...</li></ui-ul>` 入力の自動補完
 * - MutationObserver による後追加ノードの role 補強
 */

export const MediaAndTokenManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-ul id="contract-ul">
      <ul>
        <li>契約確認</li>
      </ul>
    </ui-ul>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'ui-ul の scope selector / forced-colors / token 参照の CSS 構造契約は test/ssr/css-structure-contracts.test.ts に移送します。この story は手動確認専用です。',
      },
    },
  },
};

/**
 * Dark Mode契約:
 * - セマンティックトークン参照でモード分岐不要
 * - マーカー色は `--fg-muted` を追従する
 */

export const DarkModeManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <style>
      .dark-surface {
        padding: 1rem;
        background: oklch(18% 0.02 250);
        color: oklch(92% 0.01 250);
        border-radius: var(--radius-md, 8px);
        --fg-default: oklch(92% 0.01 250);
        --fg-muted: oklch(74% 0.01 250);
      }
    </style>

    <div class="dark-surface">
      <div id="dark-muted-probe" style="color: var(--fg-muted); display: none;"></div>
      <ui-ul id="dark-contract">
        <ul>
          <li data-testid="dark-item">暗色面でも本文とマーカーの階層差を維持する</li>
        </ul>
      </ui-ul>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'ui-ul の dark-mode token 参照契約は test/ssr/css-structure-contracts.test.ts に移送します。この story は手動確認専用です。',
      },
    },
  },
};
