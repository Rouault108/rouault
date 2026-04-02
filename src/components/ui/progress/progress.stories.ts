import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './progress';
import { type UiProgress } from './progress';

interface ProgressCase {
  id: string;
  value: number;
  max: number;
  label?: string;
  labelRef?: string;
  valueText?: string;
}

const LABELLED_CASE: ProgressCase = {
  id: 'progress-labelled',
  value: 24,
  max: 100,
  label: 'ファイルアップロード中',
};

const EXTERNAL_LABEL_CASE: ProgressCase = {
  id: 'progress-external-label',
  value: 30,
  max: 100,
  label: 'このラベルは優先されない',
  labelRef: 'progress-external-label-text',
};

const VALUE_TEXT_CASE: ProgressCase = {
  id: 'progress-value-text',
  value: 1,
  max: 3,
  label: '同期中',
  valueText: '3件中1件完了',
};

const meta: Meta<UiProgress> = {
  title: 'Components/Progress',
  component: 'ui-progress',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
完了へ向かう決定進捗専用の progressbar です。
- 意味主体はホスト ui-progress
- 公開入力は value / max / label / labelRef / valueText
- labelRef 指定時は label にフォールバックしません
- valueText 未指定時は四捨五入した整数百分率を自動生成します
- 公開スタイル面は CSS Custom Properties のみです

この story ファイルは **docs / smoke / 手動確認** に限定します。命名規則、fallback、トークン面の契約は browser / SSR 側へ移送します。
        `,
      },
    },
  },
  argTypes: {
    value: {
      control: 'number',
      description: '現在値。正規入力は 0 以上 max 以下の有限数です。',
      table: { type: { summary: 'number' }, defaultValue: { summary: '0' } },
    },
    max: {
      control: 'number',
      description: '最大値。正規入力は 0 より大きい有限数です。',
      table: { type: { summary: 'number' }, defaultValue: { summary: '100' } },
    },
    label: {
      control: 'text',
      description: 'labelRef 未指定時に使うアクセシブル名です。',
      table: { type: { summary: 'string | undefined' } },
    },
    labelRef: {
      name: 'label-ref',
      control: 'text',
      description: '外部ラベル要素の ID 参照です。指定時は label より優先されます。',
      table: { type: { summary: 'string | undefined' } },
    },
    valueText: {
      name: 'value-text',
      control: 'text',
      description: '数値進捗と同一状態を補足する読み上げ用文言です。',
      table: { type: { summary: 'string | undefined' } },
    },
  },
};

export default meta;
type Story = StoryObj<UiProgress>;

export const Default: Story = {
  tags: ['smoke'],
  render: () => html`
    <div style="width: min(420px, 100%);">
      <ui-progress
        id="${LABELLED_CASE.id}"
        value="${LABELLED_CASE.value}"
        max="${LABELLED_CASE.max}"
        label="${LABELLED_CASE.label}"
      ></ui-progress>
    </div>
  `,
};

export const NamingReference: Story = {
  render: () => html`
    <style>
      .grid {
        display: grid;
        gap: 0.875rem;
      }

      .cell {
        display: grid;
        gap: 0.5rem;
        width: min(420px, 100%);
      }

      .eyebrow {
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--fg-muted, #666);
      }
    </style>

    <div class="grid">
      <div class="cell">
        <div class="eyebrow">label</div>
        <ui-progress
          id="${LABELLED_CASE.id}"
          value="${LABELLED_CASE.value}"
          max="${LABELLED_CASE.max}"
          label="${LABELLED_CASE.label}"
        ></ui-progress>
      </div>

      <div class="cell">
        <div class="eyebrow">labelRef</div>
        <div id="${EXTERNAL_LABEL_CASE.labelRef}">ダウンロード中</div>
        <ui-progress
          id="${EXTERNAL_LABEL_CASE.id}"
          value="${EXTERNAL_LABEL_CASE.value}"
          max="${EXTERNAL_LABEL_CASE.max}"
          label="${EXTERNAL_LABEL_CASE.label}"
          label-ref="${EXTERNAL_LABEL_CASE.labelRef}"
        ></ui-progress>
      </div>

      <div class="cell">
        <div class="eyebrow">valueText</div>
        <ui-progress
          id="${VALUE_TEXT_CASE.id}"
          value="${VALUE_TEXT_CASE.value}"
          max="${VALUE_TEXT_CASE.max}"
          label="${VALUE_TEXT_CASE.label}"
          value-text="${VALUE_TEXT_CASE.valueText}"
        ></ui-progress>
      </div>
    </div>
  `,
};

export const InvalidValueExamples: Story = {
  render: () => html`
    <div
      id="contract-violations-root"
      style="display: grid; gap: 0.75rem; width: min(420px, 100%);"
    ></div>
  `,
};

export const TokenSurface: Story = {
  render: () => html`
    <style>
      .custom {
        --ui-progress-track-size: 8px;
        --ui-progress-fill-color: rgb(18, 148, 74);
        --ui-progress-track-color: rgb(224, 230, 224);
        --ui-progress-radius: 99px;
        --ui-progress-duration: 240ms;
        --ui-progress-easing: linear;
      }
    </style>

    <div style="width: min(420px, 100%);">
      <ui-progress
        id="progress-custom-tokens"
        class="custom"
        value="92"
        max="100"
        label="カスタムトークン"
      ></ui-progress>
    </div>
  `,
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <div
      style="
        background: oklch(18% 0.01 250);
        color: oklch(95% 0.01 250);
        padding: 1rem;
        border-radius: 10px;
        display: grid;
        gap: 0.75rem;
        width: min(420px, 100%);
      "
    >
      <ui-progress id="dark-default" value="44" max="100" label="ダークモード進捗"></ui-progress>
      <ui-progress
        id="dark-custom"
        style="--ui-progress-track-size: 6px; --ui-progress-fill-color: rgb(18, 148, 74);"
        value="68"
        max="100"
        label="ダークモード補助"
      ></ui-progress>
    </div>
  `,
};
