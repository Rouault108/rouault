import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './callout';
import { Callout, type CalloutVariant } from './callout';

const VARIANTS = ['note', 'tip', 'success', 'warning', 'danger'] as const satisfies CalloutVariant[];

const FALLBACK_LABELS: Record<CalloutVariant, string> = {
  note: '補足',
  tip: 'ヒント',
  success: '成功',
  warning: '警告',
  danger: '注意',
};

const DEFAULT_ICONS: Record<CalloutVariant, string> = {
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

const meta: Meta<Callout> = {
  title: 'Components/Callout',
  component: 'ui-callout',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
文脈外の補足情報を静かに強調するコールアウトです。
バリアントごとの意味色・アイコン・アクセシブルラベルを持ち、\`title\` がある場合のみ見出しセマンティクスを付与します。
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: VARIANTS,
      description: '意味的種別',
      table: {
        type: { summary: "'note' | 'tip' | 'success' | 'warning' | 'danger'" },
        defaultValue: { summary: "'note'" },
      },
    },
    title: {
      control: 'text',
      description: '見出しテキスト（任意）',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    icon: {
      control: 'text',
      description: 'デフォルトアイコン上書き',
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
 * 基本ケース: `title` + `heading-level` の組み合わせ。
 * ルートの `aria-labelledby` と `div.title` の見出しセマンティクスを検証します。
 */
export const Default: Story = {
  args: {
    variant: 'tip',
    title: '読書のヒント',
    headingLevel: 3,
    icon: '',
  },
  render: (args) => html`
    <ui-callout
      id="default-callout"
      variant="${args.variant}"
      title="${args.title}"
      heading-level="${String(args.headingLevel)}"
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
    const title = callout.shadowRoot?.querySelector<HTMLElement>('.title');
    if (!title) throw new Error('.title が見つかりません');

    if (title.getAttribute('role') !== 'heading') {
      throw new Error(`Expected role="heading", got "${title.getAttribute('role') ?? 'null'}"`);
    }
    if (title.getAttribute('aria-level') !== '3') {
      throw new Error(`Expected aria-level="3", got "${title.getAttribute('aria-level') ?? 'null'}"`);
    }

    const labelledby = root.getAttribute('aria-labelledby');
    if (!labelledby || labelledby !== title.id) {
      throw new Error('aria-labelledby が title の id を参照していません');
    }

    if (root.hasAttribute('aria-label')) {
      throw new Error('title がある場合は aria-label ではなく aria-labelledby を使う必要があります');
    }

    const icon = getIcon(callout);
    if (icon.getAttribute('icon') !== DEFAULT_ICONS.tip) {
      throw new Error(`Expected icon="${DEFAULT_ICONS.tip}"`);
    }
    if (icon.getAttribute('aria-hidden') !== 'true') {
      throw new Error('装飾アイコンは aria-hidden="true" である必要があります');
    }
  },
};

/**
 * 意味のある組み合わせ: `variant × title有無`。
 * - with title: 見出し参照（aria-labelledby）
 * - without title: バリアント別フォールバックラベル（aria-label）
 */
export const VariantStateMatrix: Story = {
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
        <div class="matrix-label">With Title</div>
        ${VARIANTS.map(
          (variant) => html`
            <ui-callout id="${variant}-with-title" variant="${variant}" title="${variant} タイトル" heading-level="2">
              variant="${variant}" の見出し付き状態
            </ui-callout>
          `,
        )}
      </div>

      <div class="matrix-section">
        <div class="matrix-label">Without Title</div>
        ${VARIANTS.map(
          (variant) => html`
            <ui-callout id="${variant}-without-title" variant="${variant}">
              variant="${variant}" のタイトルなし状態
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

    for (const variant of VARIANTS) {
      const withTitle = canvasElement.querySelector<Callout>(`#${variant}-with-title`);
      if (!withTitle) throw new Error(`#${variant}-with-title が見つかりません`);

      const withTitleRoot = getRoot(withTitle);
      const withTitleTitle = withTitle.shadowRoot?.querySelector<HTMLElement>('.title');
      if (!withTitleTitle) throw new Error(`#${variant}-with-title の .title が見つかりません`);
      if (withTitleRoot.getAttribute('aria-labelledby') !== withTitleTitle.id) {
        throw new Error(`#${variant}-with-title の aria-labelledby が不正です`);
      }
      if (withTitleTitle.getAttribute('role') !== 'heading') {
        throw new Error(`#${variant}-with-title は role="heading" である必要があります`);
      }
      if (withTitleTitle.getAttribute('aria-level') !== '2') {
        throw new Error(`#${variant}-with-title は aria-level="2" である必要があります`);
      }
      if (getIcon(withTitle).getAttribute('icon') !== DEFAULT_ICONS[variant]) {
        throw new Error(`#${variant}-with-title のデフォルトアイコンが不正です`);
      }
      if (getIcon(withTitle).getAttribute('aria-hidden') !== 'true') {
        throw new Error(`#${variant}-with-title のアイコンは aria-hidden="true" である必要があります`);
      }

      const withoutTitle = canvasElement.querySelector<Callout>(`#${variant}-without-title`);
      if (!withoutTitle) throw new Error(`#${variant}-without-title が見つかりません`);

      const withoutTitleRoot = getRoot(withoutTitle);
      if (withoutTitleRoot.hasAttribute('aria-labelledby')) {
        throw new Error(`#${variant}-without-title は aria-labelledby を持つべきではありません`);
      }
      if (withoutTitleRoot.getAttribute('aria-label') !== FALLBACK_LABELS[variant]) {
        throw new Error(`#${variant}-without-title の aria-label が不正です`);
      }
      if (getIcon(withoutTitle).getAttribute('icon') !== DEFAULT_ICONS[variant]) {
        throw new Error(`#${variant}-without-title のデフォルトアイコンが不正です`);
      }
      if (getIcon(withoutTitle).getAttribute('aria-hidden') !== 'true') {
        throw new Error(`#${variant}-without-title のアイコンは aria-hidden="true" である必要があります`);
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
      <ui-callout id="heading-valid" variant="note" title="有効レベル" heading-level="1">
        heading-level=1
      </ui-callout>
      <ui-callout id="heading-zero" variant="note" title="無効レベル0" heading-level="0">
        heading-level=0
      </ui-callout>
      <ui-callout id="heading-seven" variant="note" title="無効レベル7" heading-level="7">
        heading-level=7
      </ui-callout>
      <ui-callout id="heading-decimal" variant="note" title="無効レベル2.5" heading-level="2.5">
        heading-level=2.5
      </ui-callout>
      <ui-callout id="heading-no-title" variant="note" heading-level="4">
        title 未指定 + heading-level=4
      </ui-callout>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const valid = canvasElement.querySelector<Callout>('#heading-valid');
    const zero = canvasElement.querySelector<Callout>('#heading-zero');
    const seven = canvasElement.querySelector<Callout>('#heading-seven');
    const decimal = canvasElement.querySelector<Callout>('#heading-decimal');
    const noTitle = canvasElement.querySelector<Callout>('#heading-no-title');
    if (!valid || !zero || !seven || !decimal || !noTitle) {
      throw new Error('境界条件テスト用 callout が見つかりません');
    }

    await Promise.all([valid.updateComplete, zero.updateComplete, seven.updateComplete, decimal.updateComplete, noTitle.updateComplete]);

    const validTitle = valid.shadowRoot?.querySelector<HTMLElement>('.title');
    if (!validTitle) throw new Error('#heading-valid の .title が見つかりません');
    if (validTitle.getAttribute('role') !== 'heading') {
      throw new Error('#heading-valid は role="heading" である必要があります');
    }
    if (validTitle.getAttribute('aria-level') !== '1') {
      throw new Error('#heading-valid は aria-level="1" である必要があります');
    }

    const zeroTitle = zero.shadowRoot?.querySelector<HTMLElement>('.title');
    if (!zeroTitle) throw new Error('#heading-zero の .title が見つかりません');
    if (zeroTitle.hasAttribute('role') || zeroTitle.hasAttribute('aria-level')) {
      throw new Error('#heading-zero は無効値のため role/aria-level を出力しない必要があります');
    }

    const sevenTitle = seven.shadowRoot?.querySelector<HTMLElement>('.title');
    if (!sevenTitle) throw new Error('#heading-seven の .title が見つかりません');
    if (sevenTitle.hasAttribute('role') || sevenTitle.hasAttribute('aria-level')) {
      throw new Error('#heading-seven は無効値のため role/aria-level を出力しない必要があります');
    }

    const decimalTitle = decimal.shadowRoot?.querySelector<HTMLElement>('.title');
    if (!decimalTitle) throw new Error('#heading-decimal の .title が見つかりません');
    if (decimalTitle.hasAttribute('role') || decimalTitle.hasAttribute('aria-level')) {
      throw new Error('#heading-decimal は無効値のため role/aria-level を出力しない必要があります');
    }

    const noTitleRoot = getRoot(noTitle);
    if (noTitle.shadowRoot?.querySelector('.title')) {
      throw new Error('#heading-no-title は title 未指定のため .title を出力しない必要があります');
    }
    if (noTitleRoot.hasAttribute('aria-labelledby')) {
      throw new Error('#heading-no-title は aria-labelledby を持つべきではありません');
    }
    if (noTitleRoot.getAttribute('aria-label') !== FALLBACK_LABELS.note) {
      throw new Error('#heading-no-title は note のフォールバックラベルを持つ必要があります');
    }
  },
};

/**
 * 境界条件: アイコン上書き + 空白タイトル。
 * 空白のみの `title` は「タイトルなし」として扱い、`aria-label` フォールバックに戻します。
 */
export const IconOverrideAndBlankTitle: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-callout id="icon-override" variant="danger" title="セキュリティ注意" icon="lucide:shield-alert">
        2段階認証を有効化してください。
      </ui-callout>
      <ui-callout id="blank-title" variant="success" title="   " heading-level="4">
        空白タイトルは未指定として扱います。
      </ui-callout>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const iconOverride = canvasElement.querySelector<Callout>('#icon-override');
    const blankTitle = canvasElement.querySelector<Callout>('#blank-title');
    if (!iconOverride || !blankTitle) throw new Error('テスト対象 callout が見つかりません');
    await Promise.all([iconOverride.updateComplete, blankTitle.updateComplete]);

    if (getIcon(iconOverride).getAttribute('icon') !== 'lucide:shield-alert') {
      throw new Error('icon 上書きが反映されていません');
    }

    const blankTitleRoot = getRoot(blankTitle);
    if (blankTitle.shadowRoot?.querySelector('.title')) {
      throw new Error('空白タイトルは .title を出力しない必要があります');
    }
    if (blankTitleRoot.getAttribute('aria-label') !== FALLBACK_LABELS.success) {
      throw new Error('空白タイトル時の aria-label フォールバックが不正です');
    }
    if (blankTitleRoot.hasAttribute('aria-labelledby')) {
      throw new Error('空白タイトル時は aria-labelledby を持つべきではありません');
    }
  },
};

/**
 * 境界条件: aria-label 明示値の優先と空文字時フォールバック。
 */
export const AriaLabelOverrides: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-callout id="label-explicit" variant="warning" aria-label="重要な警告">
        明示ラベルを優先して利用
      </ui-callout>
      <ui-callout id="label-empty" variant="tip" aria-label="   ">
        空白ラベルはフォールバックへ戻す
      </ui-callout>
      <ui-callout id="label-with-title" variant="danger" title="タイトルあり" aria-label="無視されるラベル">
        title がある場合は aria-labelledby を使う
      </ui-callout>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const explicit = canvasElement.querySelector<Callout>('#label-explicit');
    const empty = canvasElement.querySelector<Callout>('#label-empty');
    const withTitle = canvasElement.querySelector<Callout>('#label-with-title');
    if (!explicit || !empty || !withTitle) throw new Error('aria-label テスト対象 callout が見つかりません');
    await Promise.all([explicit.updateComplete, empty.updateComplete, withTitle.updateComplete]);

    const explicitRoot = getRoot(explicit);
    const emptyRoot = getRoot(empty);
    const withTitleRoot = getRoot(withTitle);
    const withTitleTitle = withTitle.shadowRoot?.querySelector<HTMLElement>('.title');
    if (!withTitleTitle) throw new Error('#label-with-title の .title が見つかりません');

    if (explicitRoot.getAttribute('aria-label') !== '重要な警告') {
      throw new Error('aria-label 明示値が優先されていません');
    }
    if (emptyRoot.getAttribute('aria-label') !== FALLBACK_LABELS.tip) {
      throw new Error('空白 aria-label 時のフォールバックが不正です');
    }
    if (withTitleRoot.hasAttribute('aria-label')) {
      throw new Error('title がある場合は aria-label を出力しない必要があります');
    }
    if (withTitleRoot.getAttribute('aria-labelledby') !== withTitleTitle.id) {
      throw new Error('title がある場合は aria-labelledby が title id を参照する必要があります');
    }
  },
};

/**
 * 境界条件: 不正バリアント値。
 * 属性が不正でも内部描画は `note` と同等にフォールバックします。
 */
export const InvalidVariantFallback: Story = {
  render: () => html`
    <ui-callout id="invalid-variant" variant="unknown">
      未知の variant 値を与えた場合のフォールバック確認
    </ui-callout>
  `,
  play: async ({ canvasElement }) => {
    const callout = canvasElement.querySelector<Callout>('#invalid-variant');
    if (!callout) throw new Error('#invalid-variant が見つかりません');
    await callout.updateComplete;

    const root = getRoot(callout);
    if (root.getAttribute('data-variant') !== 'note') {
      throw new Error(`Expected data-variant="note", got "${root.getAttribute('data-variant') ?? 'null'}"`);
    }
    if (root.getAttribute('aria-label') !== FALLBACK_LABELS.note) {
      throw new Error('不正 variant 時の aria-label フォールバックが不正です');
    }
    if (getIcon(callout).getAttribute('icon') !== DEFAULT_ICONS.note) {
      throw new Error('不正 variant 時のデフォルトアイコンフォールバックが不正です');
    }
  },
};

/**
 * スタイル契約:
 * 受け入れ基準で要求されるトークン参照と forced-colors フォールバックが維持されていること。
 */
export const StyleContracts: Story = {
  render: () => html`
    <ui-callout id="style-contracts" variant="warning" title="Style Contracts" heading-level="2">
      style contract checks
    </ui-callout>
  `,
  play: async ({ canvasElement }) => {
    const callout = canvasElement.querySelector<Callout>('#style-contracts');
    if (!callout) throw new Error('#style-contracts が見つかりません');
    await callout.updateComplete;

    const styles = String(Callout.styles);
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
      throw new Error('variant 背景トークンが不足しています');
    }
    if (!styles.includes('var(--bg-success-subtle)') || !styles.includes('var(--bg-warning-subtle)') || !styles.includes('var(--bg-danger-subtle)')) {
      throw new Error('variant 背景トークンが不足しています');
    }
    if (!styles.includes('var(--fg-muted)') || !styles.includes('var(--fg-info)')) {
      throw new Error('アクセント色トークンが不足しています');
    }
    if (!styles.includes('var(--fg-success)') || !styles.includes('var(--fg-warning)') || !styles.includes('var(--fg-danger)')) {
      throw new Error('アクセント色トークンが不足しています');
    }
    if (!styles.includes('stroke-width: 1.5')) {
      throw new Error('アイコン stroke-width 1.5 の契約が不足しています');
    }
  },
};

/**
 * Dark Mode 契約:
 * コンポーネント側で prefers-color-scheme 分岐を書かず、セマンティックトークン参照でモード切替に追従する。
 */
export const DarkModeTokenContract: Story = {
  render: () => html`
    <ui-callout id="dark-mode-contract" variant="success" title="Dark Mode Contract" heading-level="2">
      semantic token contract checks
    </ui-callout>
  `,
  play: async ({ canvasElement }) => {
    const callout = canvasElement.querySelector<Callout>('#dark-mode-contract');
    if (!callout) throw new Error('#dark-mode-contract が見つかりません');
    await callout.updateComplete;

    const styles = String(Callout.styles);
    if (styles.includes('prefers-color-scheme')) {
      throw new Error('callout は prefers-color-scheme 分岐を持たずトークンでモード追従する必要があります');
    }
    if (!styles.includes('var(--bg-note-subtle)') || !styles.includes('var(--fg-default)')) {
      throw new Error('Dark/Light 共通のセマンティックトークン参照が不足しています');
    }
  },
};
