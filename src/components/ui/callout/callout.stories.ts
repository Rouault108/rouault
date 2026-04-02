import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import './callout';
import { Callout, type CalloutKind } from './callout';

const KINDS = ['note', 'tip', 'success', 'warning', 'danger'] as const satisfies CalloutKind[];

const meta: Meta<Callout> = {
  title: 'Components/Callout',
  component: 'ui-callout',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
本文から一段引いた非対話の補助情報ブロックです。
\`kind\` で意味種別、\`heading\` で可視見出し、\`label\` で見出しなし時のアクセシブル名を分離して扱います。
        `,
      },
    },
  },
  argTypes: {
    kind: {
      control: 'select',
      options: KINDS,
      description: '補助情報の意味種別',
      table: {
        type: { summary: "'note' | 'tip' | 'success' | 'warning' | 'danger'" },
        defaultValue: { summary: "'note'" },
      },
    },
    heading: {
      control: 'text',
      description: '可視見出し（任意）',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    label: {
      control: 'text',
      description: '見出しなし時のアクセシブル名（任意）',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    icon: {
      control: 'text',
      description: '既定アイコンの上書き',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    headingLevel: {
      control: 'number',
      description: '見出しレベル（1-6 のときのみ有効）',
      table: { type: { summary: 'number | undefined' } },
    },
  },
};

export default meta;
type Story = StoryObj<Callout>;

const movedToBrowserDocs = (
  story: string,
): Pick<Story, 'tags' | 'parameters'> => ({
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story,
      },
    },
  },
});

/**
 * 基本ケース: `heading` + `heading-level` の組み合わせ。
 * ルートの `aria-labelledby` と見出しセマンティクスを検証します。
 */
export const Default: Story = {
  tags: ['smoke'],
  ...movedToBrowserDocs(
    '公開 DOM / aria / fallback / part の契約は test/browser/callout.browser.test.ts で検査します。この story は docs / 手動確認専用です。',
  ),
  args: {
    kind: 'tip',
    heading: '読書のヒント',
    label: '',
    headingLevel: 3,
    icon: '',
  },
  render: (args) => html`
    <ui-callout
      id="default-callout"
      kind="${args.kind}"
      heading="${args.heading}"
      label="${args.label}"
      heading-level="${ifDefined(
        typeof args.headingLevel === 'number' ? String(args.headingLevel) : undefined,
      )}"
      icon="${args.icon}"
    >
      長文ノートは、まず結論を冒頭に1文で書いてから詳細を追記すると再読効率が上がります。
    </ui-callout>
  `
};

/**
 * 意味のある組み合わせ: `kind × heading有無`。
 * - with heading: 見出し参照（aria-labelledby）
 * - without heading: kind 別フォールバックラベル（aria-label）
 */
export const KindStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
      }
      .matrix-section {
        display: grid;
        gap: 0.75rem;
      }
      .matrix-label {
        font-size: 11px;
        color: var(--fg-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>
    <div class="matrix">
      <div class="matrix-section">
        <div class="matrix-label">With Heading</div>
        ${KINDS.map(
          (kind) => html`
            <ui-callout
              id="${kind}-with-heading"
              kind="${kind}"
              heading="${kind} 見出し"
              heading-level="2"
            >
              kind="${kind}" の見出し付き状態
            </ui-callout>
          `,
        )}
      </div>

      <div class="matrix-section">
        <div class="matrix-label">Without Heading</div>
        ${KINDS.map(
          (kind) => html`
            <ui-callout id="${kind}-without-heading" kind="${kind}">
              kind="${kind}" の見出しなし状態
            </ui-callout>
          `,
        )}
      </div>
    </div>
  `
};

/**
 * 境界条件: `heading-level` の有効/無効。
 * 無効値は `aria-level` を出力せず、見出しロールも付与しません。
 */
export const HeadingLevelBoundaries: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-callout id="heading-valid" kind="note" heading="有効レベル" heading-level="1">
        heading-level=1
      </ui-callout>
      <ui-callout id="heading-zero" kind="note" heading="無効レベル0" heading-level="0">
        heading-level=0
      </ui-callout>
      <ui-callout id="heading-seven" kind="note" heading="無効レベル7" heading-level="7">
        heading-level=7
      </ui-callout>
      <ui-callout id="heading-decimal" kind="note" heading="無効レベル2.5" heading-level="2.5">
        heading-level=2.5
      </ui-callout>
      <ui-callout id="heading-none" kind="note" heading-level="4">
        heading 未指定 + heading-level=4
      </ui-callout>
    </div>
  `,
};

/**
 * 境界条件: アイコン上書き + 空白 heading。
 * 空白のみの `heading` は「見出しなし」として扱い、`aria-label` フォールバックに戻します。
 */
export const IconOverrideAndBlankHeading: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-callout id="icon-override" kind="danger" heading="セキュリティ注意" icon="shield-alert">
        2段階認証を有効化してください。
      </ui-callout>
      <ui-callout id="blank-heading" kind="success" heading="   " heading-level="4">
        空白 heading は未指定として扱います。
      </ui-callout>
    </div>
  `,
};

/**
 * 境界条件: `label` の優先と、`heading` がある場合の無視。
 */
export const LabelPriority: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-callout id="label-explicit" kind="warning" label="重要な警告">
        明示ラベルを優先して利用
      </ui-callout>
      <ui-callout id="label-empty" kind="tip" label="   ">
        空白ラベルはフォールバックへ戻す
      </ui-callout>
      <ui-callout
        id="label-with-heading"
        kind="danger"
        heading="見出しあり"
        label="無視されるラベル"
      >
        heading がある場合は aria-labelledby を使う
      </ui-callout>
    </div>
  `,
};

/**
 * 境界条件: 不正 kind 値。
 * 属性が不正でも内部描画とホスト反映は `note` へ正規化されます。
 */
export const InvalidKindFallback: Story = {
  render: () => html`
    <ui-callout id="invalid-kind" kind="unknown">
      未知の kind 値を与えた場合のフォールバック確認
    </ui-callout>
  `,
};

/**
 * スタイル契約:
 * 受け入れ基準で要求されるトークン参照、part 公開、forced-colors フォールバックが維持されていること。
 */
export const StyleContracts: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-callout id="style-contracts" kind="warning" heading="Style Contracts" heading-level="2">
      style contract checks
    </ui-callout>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'callout の forced-colors / semantic token の CSS 構造契約は test/ssr/css-structure-contracts.test.ts で検査します。この story では公開 part の露出だけを確認します。',
      },
    },
  },
};

/**
 * Dark Mode 契約:
 * コンポーネント側で prefers-color-scheme 分岐を書かず、セマンティックトークン参照でモード切替に追従する。
 */
export const DarkModeTokenContract: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-callout
      id="dark-mode-contract"
      kind="success"
      heading="Dark Mode Contract"
      heading-level="2"
    >
      semantic token contract checks
    </ui-callout>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'callout の dark-mode token 参照契約は test/ssr/css-structure-contracts.test.ts で検査します。この story は手動確認専用です。',
      },
    },
  },
};