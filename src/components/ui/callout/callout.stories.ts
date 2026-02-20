import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './callout';
import type { Callout, CalloutVariant } from './callout';

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
      <ui-callout id="heading-no-title" variant="note" heading-level="4">
        title 未指定 + heading-level=4
      </ui-callout>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const valid = canvasElement.querySelector<Callout>('#heading-valid');
    const zero = canvasElement.querySelector<Callout>('#heading-zero');
    const seven = canvasElement.querySelector<Callout>('#heading-seven');
    const noTitle = canvasElement.querySelector<Callout>('#heading-no-title');
    if (!valid || !zero || !seven || !noTitle) {
      throw new Error('境界条件テスト用 callout が見つかりません');
    }

    await Promise.all([valid.updateComplete, zero.updateComplete, seven.updateComplete, noTitle.updateComplete]);

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
