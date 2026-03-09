import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import './info-box';
import { InfoBox, type InfoBoxVariant } from './info-box';

interface VariantMatrixCase {
  readonly id: string;
  readonly variant: InfoBoxVariant;
  readonly heading: string;
  readonly icon: string;
  readonly landmark: boolean;
  readonly expectedRole: 'region' | 'note';
  readonly expectsHeader: boolean;
}

const VARIANT_MATRIX_CASES: readonly VariantMatrixCase[] = [
  {
    id: 'matrix-default-region',
    variant: 'default',
    heading: '作品情報',
    icon: 'music',
    landmark: true,
    expectedRole: 'region',
    expectsHeader: true,
  },
  {
    id: 'matrix-default-note',
    variant: 'default',
    heading: '補足情報',
    icon: 'book-open',
    landmark: false,
    expectedRole: 'note',
    expectsHeader: true,
  },
  {
    id: 'matrix-filled-note',
    variant: 'filled',
    heading: 'この章のポイント',
    icon: 'clipboard-list',
    landmark: false,
    expectedRole: 'note',
    expectsHeader: true,
  },
  {
    id: 'matrix-filled-region',
    variant: 'filled',
    heading: 'filled region',
    icon: 'shield',
    landmark: true,
    expectedRole: 'region',
    expectsHeader: true,
  },
  {
    id: 'matrix-filled-no-heading',
    variant: 'filled',
    heading: '   ',
    icon: 'shield',
    landmark: true,
    expectedRole: 'note',
    expectsHeader: false,
  },
];

const normalizeColor = (value: string): string => value.replace(/\s+/g, '').toLowerCase();

const getHost = (canvasElement: Element, id: string): InfoBox => {
  const host = canvasElement.querySelector<InfoBox>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getContainer = (infoBox: InfoBox): HTMLElement => {
  const container = infoBox.shadowRoot?.querySelector<HTMLElement>('.info-box');
  if (!container) throw new Error('.info-box が見つかりません');
  return container;
};

const getHeader = (infoBox: InfoBox): HTMLElement | null =>
  infoBox.shadowRoot?.querySelector<HTMLElement>('.header') ?? null;

const getHeading = (infoBox: InfoBox): HTMLElement => {
  const heading = infoBox.shadowRoot?.querySelector<HTMLElement>('.heading');
  if (!heading) throw new Error('.heading が見つかりません');
  return heading;
};

const getIcon = (infoBox: InfoBox): HTMLElement | null =>
  infoBox.shadowRoot?.querySelector<HTMLElement>('iconify-icon.icon') ?? null;

const meta: Meta<InfoBox> = {
  title: 'Components/InfoBox',
  component: 'ui-info-box',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
価値中立な参照情報を構造化する静的コンテナです。
- \`heading\` があるときだけヘッダーを描画
- \`landmark=true\` かつ \`heading\` ありのときだけ \`role="region"\`
- それ以外は \`role="note"\` にフォールバック
- \`variant="filled"\` は \`--bg-fill-muted\` を使用
        `,
      },
    },
  },
  argTypes: {
    heading: {
      control: 'text',
      description: 'ヘッダーラベル',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    icon: {
      control: 'text',
      description: 'ヘッダーアイコン名（lucide プレフィックス不要）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    headingLevel: {
      control: 'number',
      description: 'ヘッダーの aria-level（1-6）',
      table: {
        type: { summary: 'number | undefined' },
      },
    },
    landmark: {
      control: 'boolean',
      description: 'heading ありの場合に region ランドマーク化する',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    variant: {
      control: 'inline-radio',
      options: ['default', 'filled'],
      description: 'スタイルバリアント',
      table: {
        type: { summary: "'default' | 'filled'" },
        defaultValue: { summary: "'default'" },
      },
    },
  },
};

export default meta;
type Story = StoryObj<InfoBox>;

/**
 * 基本ケース:
 * heading + icon + heading-level + landmark の組み合わせ。
 */
export const Default: Story = {
  args: {
    heading: '作品情報',
    icon: 'music',
    headingLevel: 3,
    landmark: true,
    variant: 'default',
  },
  render: (args) => html`
    <ui-info-box
      id="info-box-default"
      heading="${args.heading}"
      icon="${args.icon}"
      heading-level="${ifDefined(args.headingLevel !== undefined ? String(args.headingLevel) : undefined)}"
      ?landmark="${args.landmark}"
      variant="${args.variant}"
    >
      <dl style="display: grid; gap: 0.5rem; margin: 0;">
        <dt>作曲</dt>
        <dd style="margin: 0;">クロード・ドビュッシー</dd>
        <dt>作品番号</dt>
        <dd style="margin: 0;">L. 75</dd>
      </dl>
    </ui-info-box>
  `,
  play: async ({ canvasElement }) => {
    const infoBox = getHost(canvasElement, 'info-box-default');
    await infoBox.updateComplete;

    const container = getContainer(infoBox);
    const heading = getHeading(infoBox);
    const icon = getIcon(infoBox);

    if (container.getAttribute('data-variant') !== 'default') {
      throw new Error('default バリアントの data-variant が不正です');
    }
    if (infoBox.getAttribute('role') !== 'region') {
      throw new Error('landmark=true + heading ありは role="region" である必要があります');
    }
    if (infoBox.getAttribute('aria-labelledby') !== heading.id) {
      throw new Error('aria-labelledby が heading id と一致していません');
    }
    if (heading.getAttribute('role') !== 'heading') {
      throw new Error('heading-level 指定時に role="heading" が必要です');
    }
    if (heading.getAttribute('aria-level') !== '3') {
      throw new Error('heading-level=3 の aria-level が設定されていません');
    }
    if (!icon) {
      throw new Error('icon が描画されていません');
    }
    if (icon.getAttribute('icon') !== 'lucide:music') {
      throw new Error('icon 名が期待値と一致しません');
    }
    if (icon.getAttribute('aria-hidden') !== 'true') {
      throw new Error('装飾アイコンは aria-hidden="true" である必要があります');
    }
  },
};

/**
 * 意味のある組み合わせ:
 * variant × heading 有無 × landmark の主要な分岐を検証。
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.75rem;
      }
      .matrix-cell {
        display: grid;
        gap: 0.375rem;
      }
      .matrix-label {
        margin: 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--fg-muted, #6e7781);
      }
    </style>
    <div class="matrix">
      ${VARIANT_MATRIX_CASES.map(
        (item) => html`
          <div class="matrix-cell">
            <p class="matrix-label">${item.id}</p>
            <ui-info-box
              id="${item.id}"
              variant="${item.variant}"
              heading="${item.heading}"
              icon="${item.icon}"
              ?landmark="${item.landmark}"
              style="
                --bg-fill-muted: rgb(230, 231, 232);
                --fg-muted: rgb(70, 71, 72);
                --fg-default: rgb(20, 21, 22);
              "
            >
              <p style="margin: 0;">${item.variant} / landmark=${String(item.landmark)}</p>
            </ui-info-box>
          </div>
        `,
      )}
    </div>
  `,
  play: async ({ canvasElement }) => {
    for (const testCase of VARIANT_MATRIX_CASES) {
      const infoBox = getHost(canvasElement, testCase.id);
      await infoBox.updateComplete;

      const container = getContainer(infoBox);
      const header = getHeader(infoBox);

      if (container.getAttribute('data-variant') !== testCase.variant) {
        throw new Error(`${testCase.id}: data-variant が一致しません`);
      }
      if (infoBox.getAttribute('role') !== testCase.expectedRole) {
        throw new Error(`${testCase.id}: role が期待値と一致しません`);
      }

      if (testCase.expectsHeader) {
        if (!header) throw new Error(`${testCase.id}: header が必要です`);
        const heading = getHeading(infoBox);
        if (testCase.expectedRole === 'region') {
          if (infoBox.getAttribute('aria-labelledby') !== heading.id) {
            throw new Error(`${testCase.id}: region の aria-labelledby が heading id と一致しません`);
          }
        } else if (infoBox.hasAttribute('aria-labelledby')) {
          throw new Error(`${testCase.id}: note では aria-labelledby を出力しません`);
        }

        const expectedHeaderColor = testCase.variant === 'filled' ? 'rgb(20, 21, 22)' : 'rgb(70, 71, 72)';
        const actualHeaderColor = normalizeColor(getComputedStyle(header).color);
        if (actualHeaderColor !== normalizeColor(expectedHeaderColor)) {
          throw new Error(`${testCase.id}: ヘッダー色の切り替えが不正です`);
        }
      } else {
        if (header) throw new Error(`${testCase.id}: heading なしでは header を描画しません`);
        if (infoBox.hasAttribute('aria-labelledby')) {
          throw new Error(`${testCase.id}: heading なしでは aria-labelledby を出力しません`);
        }
        if (getIcon(infoBox)) {
          throw new Error(`${testCase.id}: heading なしでは icon を描画しません`);
        }
      }

      const expectedBackground = testCase.variant === 'filled' ? 'rgb(230, 231, 232)' : 'rgba(0, 0, 0, 0)';
      const actualBackground = normalizeColor(getComputedStyle(container).backgroundColor);
      if (actualBackground !== normalizeColor(expectedBackground)) {
        throw new Error(`${testCase.id}: バリアント背景色の切り替えが不正です`);
      }
    }
  },
};

/**
 * 境界条件:
 * heading-level の許容値（1-6）と無効値の扱い。
 */
export const HeadingLevelBoundaries: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-info-box id="heading-valid" heading="有効レベル" heading-level="1">heading-level=1</ui-info-box>
      <ui-info-box id="heading-zero" heading="無効レベル0" heading-level="0">heading-level=0</ui-info-box>
      <ui-info-box id="heading-seven" heading="無効レベル7" heading-level="7">heading-level=7</ui-info-box>
      <ui-info-box id="heading-decimal" heading="無効レベル2.5" heading-level="2.5">heading-level=2.5</ui-info-box>
      <ui-info-box id="heading-no-title" heading-level="4">heading なし + heading-level=4</ui-info-box>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const valid = getHost(canvasElement, 'heading-valid');
    const zero = getHost(canvasElement, 'heading-zero');
    const seven = getHost(canvasElement, 'heading-seven');
    const decimal = getHost(canvasElement, 'heading-decimal');
    const noTitle = getHost(canvasElement, 'heading-no-title');
    await Promise.all([valid.updateComplete, zero.updateComplete, seven.updateComplete, decimal.updateComplete, noTitle.updateComplete]);

    const validHeading = getHeading(valid);
    if (validHeading.getAttribute('role') !== 'heading' || validHeading.getAttribute('aria-level') !== '1') {
      throw new Error('heading-level=1 で role/aria-level が正しく付与されていません');
    }

    const zeroHeading = getHeading(zero);
    if (zeroHeading.hasAttribute('role') || zeroHeading.hasAttribute('aria-level')) {
      throw new Error('heading-level=0 は無効値として role/aria-level を出力しません');
    }

    const sevenHeading = getHeading(seven);
    if (sevenHeading.hasAttribute('role') || sevenHeading.hasAttribute('aria-level')) {
      throw new Error('heading-level=7 は無効値として role/aria-level を出力しません');
    }

    const decimalHeading = getHeading(decimal);
    if (decimalHeading.hasAttribute('role') || decimalHeading.hasAttribute('aria-level')) {
      throw new Error('heading-level=2.5 は無効値として role/aria-level を出力しません');
    }

    if (getHeader(noTitle)) {
      throw new Error('heading なしではヘッダーは描画されません');
    }
    if (noTitle.getAttribute('role') !== 'note') {
      throw new Error('heading なしのフォールバック role は note です');
    }
  },
};

/**
 * 境界条件:
 * landmark=true でも heading が空なら note へフォールバックする。
 */
export const LandmarkRequiresHeadingBoundary: Story = {
  render: () => html`
    <ui-info-box id="landmark-without-heading" heading="   " icon="music" landmark>
      heading 空文字時は landmark を無効化します。
    </ui-info-box>
  `,
  play: async ({ canvasElement }) => {
    const infoBox = getHost(canvasElement, 'landmark-without-heading');
    await infoBox.updateComplete;

    if (infoBox.getAttribute('role') !== 'note') {
      throw new Error('heading が空の場合は role="note" へフォールバックする必要があります');
    }
    if (infoBox.hasAttribute('aria-labelledby')) {
      throw new Error('heading が空の場合は aria-labelledby を出力しません');
    }
    if (getHeader(infoBox)) {
      throw new Error('heading が空の場合は header を描画しません');
    }
  },
};

/**
 * 境界条件:
 * icon は heading があるときのみ描画し、装飾扱いで aria-hidden を持つ。
 */
export const IconRenderingBoundary: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-info-box id="icon-with-heading" heading="アイコン付き" icon="music">icon を表示します</ui-info-box>
      <ui-info-box id="icon-without-heading" icon="music">heading なしでは icon を表示しません</ui-info-box>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const withHeading = getHost(canvasElement, 'icon-with-heading');
    const withoutHeading = getHost(canvasElement, 'icon-without-heading');
    await Promise.all([withHeading.updateComplete, withoutHeading.updateComplete]);

    const icon = getIcon(withHeading);
    if (!icon) throw new Error('heading ありで icon が描画されていません');
    if (icon.getAttribute('icon') !== 'lucide:music') {
      throw new Error('icon 名が一致しません');
    }
    if (icon.getAttribute('aria-hidden') !== 'true') {
      throw new Error('icon は aria-hidden=true が必要です');
    }

    if (getIcon(withoutHeading)) {
      throw new Error('heading なしでは icon を描画してはいけません');
    }
  },
};

/**
 * 境界条件:
 * 不正 variant は default にフォールバックする。
 */
export const InvalidVariantFallback: Story = {
  render: () => html`
    <ui-info-box id="invalid-variant" variant="unknown" heading="不正バリアント">
      invalid variant fallback
    </ui-info-box>
  `,
  play: async ({ canvasElement }) => {
    const infoBox = getHost(canvasElement, 'invalid-variant');
    await infoBox.updateComplete;

    const container = getContainer(infoBox);
    if (container.getAttribute('data-variant') !== 'default') {
      throw new Error('不正 variant は default へフォールバックする必要があります');
    }
  },
};

/**
 * 境界条件:
 * 有効な要素/テキストノードがない場合は描画しない。
 */
export const EmptySlotDoesNotRender: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-info-box id="empty-slot"></ui-info-box>
      <ui-info-box id="whitespace-only">   </ui-info-box>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const empty = getHost(canvasElement, 'empty-slot');
    const whitespaceOnly = getHost(canvasElement, 'whitespace-only');
    await Promise.all([empty.updateComplete, whitespaceOnly.updateComplete]);

    if (empty.shadowRoot?.querySelector('.info-box')) {
      throw new Error('空スロットでは .info-box を描画してはいけません');
    }
    if (whitespaceOnly.shadowRoot?.querySelector('.info-box')) {
      throw new Error('空白のみのスロットでは .info-box を描画してはいけません');
    }
  },
};

/**
 * スタイル契約:
 * 受け入れ基準にあるトークンと forced-colors ブロックを保持していることを検証。
 */
export const StyleContracts: Story = {
  render: () => html`
    <ui-info-box id="style-contracts" heading="Style Contracts" variant="filled" icon="palette" heading-level="2" landmark>
      style contract checks
    </ui-info-box>
  `,
  play: async ({ canvasElement }) => {
    const infoBox = getHost(canvasElement, 'style-contracts');
    await infoBox.updateComplete;

    const styles = String(InfoBox.styles);

    if (!styles.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors スタイルが定義されていません');
    }
    if (!styles.includes('var(--bg-fill-muted')) {
      throw new Error('filled 背景トークン --bg-fill-muted が使用されていません');
    }
    if (!styles.includes('var(--font-semibold')) {
      throw new Error('Small Text Rule: --font-semibold が適用されていません');
    }
    if (!styles.includes('var(--tracking-wide')) {
      throw new Error('Small Text Rule: --tracking-wide が適用されていません');
    }
    if (!styles.includes('var(--icon-xs')) {
      throw new Error('アイコンサイズトークン --icon-xs が使用されていません');
    }
    if (!styles.includes('var(--border-style-subtle')) {
      throw new Error('境界線トークン --border-style-subtle が使用されていません');
    }
  },
};

/**
 * Dark Mode 契約:
 * prefers-color-scheme 分岐を持たず、セマンティックトークンで Light/Dark を追従する。
 */
export const DarkModeTokenContract: Story = {
  render: () => html`
    <ui-info-box id="dark-mode-contract" heading="Dark Mode Contract" variant="filled" icon="moon" heading-level="2" landmark>
      semantic token contract checks
    </ui-info-box>
  `,
  play: async ({ canvasElement }) => {
    const infoBox = getHost(canvasElement, 'dark-mode-contract');
    await infoBox.updateComplete;

    const styles = String(InfoBox.styles);
    if (styles.includes('prefers-color-scheme')) {
      throw new Error('info-box は prefers-color-scheme 分岐を持たずトークンでモード追従する必要があります');
    }
    if (!styles.includes('var(--bg-fill-muted, oklch(96% 0 0))')) {
      throw new Error('--bg-fill-muted の参照が不足しています');
    }
    if (!styles.includes('var(--fg-muted,') || !styles.includes('var(--fg-default,')) {
      throw new Error('ヘッダー配色のトークン参照が不足しています');
    }
  },
};
