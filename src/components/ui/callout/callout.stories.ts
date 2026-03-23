import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import './callout';
import { Callout, type CalloutKind } from './callout';

const KINDS = ['note', 'tip', 'success', 'warning', 'danger'] as const satisfies CalloutKind[];

const FALLBACK_LABELS: Record<CalloutKind, string> = {
  note: '補足',
  tip: 'ヒント',
  success: '成功',
  warning: '警告',
  danger: '危険',
};

const DEFAULT_ICONS: Record<CalloutKind, string> = {
  note: 'lucide:info',
  tip: 'lucide:lightbulb',
  success: 'lucide:check-circle',
  warning: 'lucide:alert-triangle',
  danger: 'lucide:alert-octagon',
};

const getRoot = (callout: Callout): HTMLElement => {
  const root = callout.shadowRoot?.querySelector<HTMLElement>('aside.callout');
  if (!root) throw new Error('aside.callout が見つかりません');
  return root;
};

const getIcon = (callout: Callout): HTMLElement => {
  const icon = callout.shadowRoot?.querySelector<HTMLElement>('iconify-icon.icon');
  if (!icon) throw new Error('iconify-icon.icon が見つかりません');
  return icon;
};

const getHeading = (callout: Callout): HTMLElement | null =>
  callout.shadowRoot?.querySelector<HTMLElement>('.heading') ?? null;

const getBody = (callout: Callout): HTMLElement => {
  const body = callout.shadowRoot?.querySelector<HTMLElement>('.body');
  if (!body) throw new Error('.body が見つかりません');
  return body;
};

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

/**
 * 基本ケース: `heading` + `heading-level` の組み合わせ。
 * ルートの `aria-labelledby` と見出しセマンティクスを検証します。
 */
export const Default: Story = {
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
  `,
  play: async ({ canvasElement }) => {
    const callout = canvasElement.querySelector<Callout>('#default-callout');
    if (!callout) throw new Error('#default-callout が見つかりません');
    await callout.updateComplete;

    const root = getRoot(callout);
    const heading = getHeading(callout);
    const icon = getIcon(callout);
    const body = getBody(callout);
    if (!heading) throw new Error('.heading が見つかりません');

    if (heading.getAttribute('role') !== 'heading') {
      throw new Error(`Expected role="heading", got "${heading.getAttribute('role') ?? 'null'}"`);
    }
    if (heading.getAttribute('aria-level') !== '3') {
      throw new Error(
        `Expected aria-level="3", got "${heading.getAttribute('aria-level') ?? 'null'}"`,
      );
    }
    if (root.getAttribute('aria-labelledby') !== heading.id) {
      throw new Error('aria-labelledby が heading の id を参照していません');
    }
    if (root.hasAttribute('aria-label')) {
      throw new Error(
        'heading がある場合は aria-label ではなく aria-labelledby を使う必要があります',
      );
    }
    if (root.getAttribute('data-kind') !== 'tip') {
      throw new Error('data-kind が kind と一致していません');
    }
    if (root.getAttribute('part') !== 'container') {
      throw new Error('container part が公開されていません');
    }
    if (heading.getAttribute('part') !== 'heading') {
      throw new Error('heading part が公開されていません');
    }
    if (body.getAttribute('part') !== 'body') {
      throw new Error('body part が公開されていません');
    }
    if (icon.getAttribute('part') !== 'icon') {
      throw new Error('icon part が公開されていません');
    }
    if (icon.getAttribute('icon') !== DEFAULT_ICONS.tip) {
      throw new Error(`Expected icon="${DEFAULT_ICONS.tip}"`);
    }
    if (icon.getAttribute('aria-hidden') !== 'true') {
      throw new Error('装飾アイコンは aria-hidden="true" である必要があります');
    }
  },
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
  `,
  play: async ({ canvasElement }) => {
    const callouts = canvasElement.querySelectorAll<Callout>('ui-callout');
    if (callouts.length !== 10) {
      throw new Error(`Expected 10 callouts, got ${String(callouts.length)}`);
    }
    await Promise.all([...callouts].map((item) => item.updateComplete));

    for (const kind of KINDS) {
      const withHeading = canvasElement.querySelector<Callout>(`#${kind}-with-heading`);
      if (!withHeading) throw new Error(`#${kind}-with-heading が見つかりません`);

      const withHeadingRoot = getRoot(withHeading);
      const withHeadingHeading = getHeading(withHeading);
      if (!withHeadingHeading)
        throw new Error(`#${kind}-with-heading の .heading が見つかりません`);
      if (withHeadingRoot.getAttribute('aria-labelledby') !== withHeadingHeading.id) {
        throw new Error(`#${kind}-with-heading の aria-labelledby が不正です`);
      }
      if (withHeadingHeading.getAttribute('role') !== 'heading') {
        throw new Error(`#${kind}-with-heading は role="heading" である必要があります`);
      }
      if (withHeadingHeading.getAttribute('aria-level') !== '2') {
        throw new Error(`#${kind}-with-heading は aria-level="2" である必要があります`);
      }
      if (withHeadingRoot.getAttribute('data-kind') !== kind) {
        throw new Error(`#${kind}-with-heading の data-kind が不正です`);
      }
      if (getIcon(withHeading).getAttribute('icon') !== DEFAULT_ICONS[kind]) {
        throw new Error(`#${kind}-with-heading の既定アイコンが不正です`);
      }
      if (getIcon(withHeading).getAttribute('aria-hidden') !== 'true') {
        throw new Error(
          `#${kind}-with-heading のアイコンは aria-hidden="true" である必要があります`,
        );
      }

      const withoutHeading = canvasElement.querySelector<Callout>(`#${kind}-without-heading`);
      if (!withoutHeading) throw new Error(`#${kind}-without-heading が見つかりません`);

      const withoutHeadingRoot = getRoot(withoutHeading);
      if (withoutHeadingRoot.hasAttribute('aria-labelledby')) {
        throw new Error(`#${kind}-without-heading は aria-labelledby を持つべきではありません`);
      }
      if (withoutHeadingRoot.getAttribute('aria-label') !== FALLBACK_LABELS[kind]) {
        throw new Error(`#${kind}-without-heading の aria-label が不正です`);
      }
      if (withoutHeadingRoot.getAttribute('data-kind') !== kind) {
        throw new Error(`#${kind}-without-heading の data-kind が不正です`);
      }
      if (getIcon(withoutHeading).getAttribute('icon') !== DEFAULT_ICONS[kind]) {
        throw new Error(`#${kind}-without-heading の既定アイコンが不正です`);
      }
      if (getIcon(withoutHeading).getAttribute('aria-hidden') !== 'true') {
        throw new Error(
          `#${kind}-without-heading のアイコンは aria-hidden="true" である必要があります`,
        );
      }
    }
  },
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
  play: async ({ canvasElement }) => {
    const valid = canvasElement.querySelector<Callout>('#heading-valid');
    const zero = canvasElement.querySelector<Callout>('#heading-zero');
    const seven = canvasElement.querySelector<Callout>('#heading-seven');
    const decimal = canvasElement.querySelector<Callout>('#heading-decimal');
    const none = canvasElement.querySelector<Callout>('#heading-none');
    if (!valid || !zero || !seven || !decimal || !none) {
      throw new Error('境界条件テスト用 callout が見つかりません');
    }

    await Promise.all([
      valid.updateComplete,
      zero.updateComplete,
      seven.updateComplete,
      decimal.updateComplete,
      none.updateComplete,
    ]);

    const validHeading = getHeading(valid);
    if (!validHeading) throw new Error('#heading-valid の .heading が見つかりません');
    if (validHeading.getAttribute('role') !== 'heading') {
      throw new Error('#heading-valid は role="heading" である必要があります');
    }
    if (validHeading.getAttribute('aria-level') !== '1') {
      throw new Error('#heading-valid は aria-level="1" である必要があります');
    }

    const zeroHeading = getHeading(zero);
    if (!zeroHeading) throw new Error('#heading-zero の .heading が見つかりません');
    if (zeroHeading.hasAttribute('role') || zeroHeading.hasAttribute('aria-level')) {
      throw new Error('#heading-zero は無効値のため role/aria-level を出力しない必要があります');
    }

    const sevenHeading = getHeading(seven);
    if (!sevenHeading) throw new Error('#heading-seven の .heading が見つかりません');
    if (sevenHeading.hasAttribute('role') || sevenHeading.hasAttribute('aria-level')) {
      throw new Error('#heading-seven は無効値のため role/aria-level を出力しない必要があります');
    }

    const decimalHeading = getHeading(decimal);
    if (!decimalHeading) throw new Error('#heading-decimal の .heading が見つかりません');
    if (decimalHeading.hasAttribute('role') || decimalHeading.hasAttribute('aria-level')) {
      throw new Error('#heading-decimal は無効値のため role/aria-level を出力しない必要があります');
    }

    const noneRoot = getRoot(none);
    if (getHeading(none)) {
      throw new Error('#heading-none は heading 未指定のため .heading を出力しない必要があります');
    }
    if (noneRoot.hasAttribute('aria-labelledby')) {
      throw new Error('#heading-none は aria-labelledby を持つべきではありません');
    }
    if (noneRoot.getAttribute('aria-label') !== FALLBACK_LABELS.note) {
      throw new Error('#heading-none は note のフォールバックラベルを持つ必要があります');
    }
  },
};

/**
 * 境界条件: アイコン上書き + 空白 heading。
 * 空白のみの `heading` は「見出しなし」として扱い、`aria-label` フォールバックに戻します。
 */
export const IconOverrideAndBlankHeading: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-callout
        id="icon-override"
        kind="danger"
        heading="セキュリティ注意"
        icon="lucide:shield-alert"
      >
        2段階認証を有効化してください。
      </ui-callout>
      <ui-callout id="blank-heading" kind="success" heading="   " heading-level="4">
        空白 heading は未指定として扱います。
      </ui-callout>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const iconOverride = canvasElement.querySelector<Callout>('#icon-override');
    const blankHeading = canvasElement.querySelector<Callout>('#blank-heading');
    if (!iconOverride || !blankHeading) throw new Error('テスト対象 callout が見つかりません');
    await Promise.all([iconOverride.updateComplete, blankHeading.updateComplete]);

    if (getIcon(iconOverride).getAttribute('icon') !== 'lucide:shield-alert') {
      throw new Error('icon 上書きが反映されていません');
    }

    const blankHeadingRoot = getRoot(blankHeading);
    if (getHeading(blankHeading)) {
      throw new Error('空白 heading は .heading を出力しない必要があります');
    }
    if (blankHeadingRoot.getAttribute('aria-label') !== FALLBACK_LABELS.success) {
      throw new Error('空白 heading 時の aria-label フォールバックが不正です');
    }
    if (blankHeadingRoot.hasAttribute('aria-labelledby')) {
      throw new Error('空白 heading 時は aria-labelledby を持つべきではありません');
    }
  },
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
  play: async ({ canvasElement }) => {
    const explicit = canvasElement.querySelector<Callout>('#label-explicit');
    const empty = canvasElement.querySelector<Callout>('#label-empty');
    const withHeading = canvasElement.querySelector<Callout>('#label-with-heading');
    if (!explicit || !empty || !withHeading)
      throw new Error('label テスト対象 callout が見つかりません');
    await Promise.all([explicit.updateComplete, empty.updateComplete, withHeading.updateComplete]);

    const explicitRoot = getRoot(explicit);
    const emptyRoot = getRoot(empty);
    const withHeadingRoot = getRoot(withHeading);
    const withHeadingHeading = getHeading(withHeading);
    if (!withHeadingHeading) throw new Error('#label-with-heading の .heading が見つかりません');

    if (explicitRoot.getAttribute('aria-label') !== '重要な警告') {
      throw new Error('label 明示値が優先されていません');
    }
    if (emptyRoot.getAttribute('aria-label') !== FALLBACK_LABELS.tip) {
      throw new Error('空白 label 時のフォールバックが不正です');
    }
    if (withHeadingRoot.hasAttribute('aria-label')) {
      throw new Error('heading がある場合は aria-label を出力しない必要があります');
    }
    if (withHeadingRoot.getAttribute('aria-labelledby') !== withHeadingHeading.id) {
      throw new Error(
        'heading がある場合は aria-labelledby が heading id を参照する必要があります',
      );
    }
    if (FALLBACK_LABELS.danger !== '危険') {
      throw new Error('danger の既定ラベルは 危険 である必要があります');
    }
  },
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
  play: async ({ canvasElement }) => {
    const callout = canvasElement.querySelector<Callout>('#invalid-kind');
    if (!callout) throw new Error('#invalid-kind が見つかりません');
    await callout.updateComplete;

    const root = getRoot(callout);
    if (root.getAttribute('data-kind') !== 'note') {
      throw new Error(
        `Expected data-kind="note", got "${root.getAttribute('data-kind') ?? 'null'}"`,
      );
    }
    if (callout.kind !== 'note') {
      throw new Error(`Expected callout.kind="note", got "${callout.kind}"`);
    }
    if (callout.getAttribute('kind') !== 'note') {
      throw new Error(`Expected host kind="note", got "${callout.getAttribute('kind') ?? 'null'}"`);
    }
    if (root.getAttribute('aria-label') !== FALLBACK_LABELS.note) {
      throw new Error('不正 kind 時の aria-label フォールバックが不正です');
    }
    if (getIcon(callout).getAttribute('icon') !== DEFAULT_ICONS.note) {
      throw new Error('不正 kind 時の既定アイコンフォールバックが不正です');
    }
  },
};

/**
 * スタイル契約:
 * 受け入れ基準で要求されるトークン参照、part 公開、forced-colors フォールバックが維持されていること。
 */
export const StyleContracts: Story = {
  render: () => html`
    <ui-callout id="style-contracts" kind="warning" heading="Style Contracts" heading-level="2">
      style contract checks
    </ui-callout>
  `,
  play: async ({ canvasElement }) => {
    const callout = canvasElement.querySelector<Callout>('#style-contracts');
    if (!callout) throw new Error('#style-contracts が見つかりません');
    await callout.updateComplete;

    const root = getRoot(callout);
    const heading = getHeading(callout);
    const body = getBody(callout);
    const icon = getIcon(callout);
    const styles = String(Callout.styles);
    if (!heading) throw new Error('#style-contracts の .heading が見つかりません');

    if (!styles.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors スタイルが定義されていません');
    }
    if (!styles.includes('var(--border-width-thick')) {
      throw new Error('アクセントボーダーの太線トークンが使用されていません');
    }
    if (!styles.includes('var(--border-default)')) {
      throw new Error('forced-colors 全周ボーダーのトークンが使用されていません');
    }
    if (!styles.includes('var(--bg-note-subtle)') || !styles.includes('var(--bg-tip-subtle)')) {
      throw new Error('kind 背景トークンが不足しています');
    }
    if (
      !styles.includes('var(--bg-success-subtle)') ||
      !styles.includes('var(--bg-warning-subtle)') ||
      !styles.includes('var(--bg-danger-subtle)')
    ) {
      throw new Error('kind 背景トークンが不足しています');
    }
    if (!styles.includes('var(--fg-muted)') || !styles.includes('var(--fg-info)')) {
      throw new Error('アクセント色トークンが不足しています');
    }
    if (
      !styles.includes('var(--fg-success)') ||
      !styles.includes('var(--fg-warning)') ||
      !styles.includes('var(--fg-danger)')
    ) {
      throw new Error('アクセント色トークンが不足しています');
    }
    if (!styles.includes('stroke-width: 1.5')) {
      throw new Error('アイコン stroke-width 1.5 の契約が不足しています');
    }
    if (root.getAttribute('part') !== 'container') {
      throw new Error('container part が公開されていません');
    }
    if (icon.getAttribute('part') !== 'icon') {
      throw new Error('icon part が公開されていません');
    }
    if (heading.getAttribute('part') !== 'heading') {
      throw new Error('heading part が公開されていません');
    }
    if (body.getAttribute('part') !== 'body') {
      throw new Error('body part が公開されていません');
    }
  },
};

/**
 * Dark Mode 契約:
 * コンポーネント側で prefers-color-scheme 分岐を書かず、セマンティックトークン参照でモード切替に追従する。
 */
export const DarkModeTokenContract: Story = {
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
  play: async ({ canvasElement }) => {
    const callout = canvasElement.querySelector<Callout>('#dark-mode-contract');
    if (!callout) throw new Error('#dark-mode-contract が見つかりません');
    await callout.updateComplete;

    const styles = String(Callout.styles);
    if (styles.includes('prefers-color-scheme')) {
      throw new Error(
        'callout は prefers-color-scheme 分岐を持たずトークンでモード追従する必要があります',
      );
    }
    if (!styles.includes('var(--bg-note-subtle)') || !styles.includes('var(--fg-default)')) {
      throw new Error('Dark/Light 共通のセマンティックトークン参照が不足しています');
    }
  },
};
