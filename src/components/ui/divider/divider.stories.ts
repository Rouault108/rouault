import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './divider';
import type { Divider, DividerVariant } from './divider';

const DOCUMENT_STYLE_ID = 'ui-divider-document-styles';
const DIVIDER_SCOPE_SELECTOR = ':where(.prose hr, ui-divider > hr, hr[data-divider-variant="layout"])';
const VARIANTS = ['section', 'layout'] as const satisfies DividerVariant[];

const getHost = (canvasElement: Element, id: string): Divider => {
  const host = canvasElement.querySelector<Divider>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getInnerHr = (host: Divider): HTMLHRElement => {
  const hr = host.querySelector<HTMLHRElement>(':scope > hr');
  if (!hr) {
    throw new Error(`ui-divider#${host.id} 直下の hr が見つかりません`);
  }
  return hr;
};

const getHrById = (canvasElement: Element, id: string): HTMLHRElement => {
  const hr = canvasElement.querySelector<HTMLHRElement>(`#${id}`);
  if (!hr) {
    throw new Error(`#${id} が見つかりません`);
  }
  return hr;
};

const toPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isNearlyEqual = (actual: number, expected: number, tolerance = 0.75): boolean =>
  Math.abs(actual - expected) <= tolerance;

const getInjectedStyleTag = (): HTMLStyleElement => {
  const styleTag = document.getElementById(DOCUMENT_STYLE_ID);
  if (!(styleTag instanceof HTMLStyleElement)) {
    throw new Error(`#${DOCUMENT_STYLE_ID} が見つかりません`);
  }
  return styleTag;
};

const meta: Meta<Divider> = {
  title: 'Components/Divider',
  component: 'ui-divider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
区切り線コンポーネントです。

- ネイティブ \`hr\` を最終DOMとして出力
- 追加ロールを付与せず、ネイティブセマンティクスを維持
- 適用スコープは \`.prose hr\` / \`ui-divider > hr\` / \`hr[data-divider-variant="layout"]\` に限定
- トークン: \`--border-ghost\` / \`--space-12\` / \`--border-width\`
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: VARIANTS,
      table: { type: { summary: "'section' | 'layout'" }, defaultValue: { summary: "'section'" } },
      description: '区切り線の用途バリアント',
    },
  },
};

export default meta;
type Story = StoryObj<Divider>;

/**
 * 基本契約:
 * - `ui-divider` は `hr` を出力する
 * - 追加ロールを付与しない
 */
export const Default: Story = {
  render: () => html`<ui-divider id="default-divider"></ui-divider>`,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'default-divider');
    await host.updateComplete;

    const hr = getInnerHr(host);
    if (hr.tagName !== 'HR') {
      throw new Error('ui-divider は hr 要素を出力する必要があります');
    }

    if (hr.getAttribute('data-divider-variant') !== 'section') {
      throw new Error('default の data-divider-variant は "section" である必要があります');
    }

    if (hr.hasAttribute('role') || hr.hasAttribute('tabindex')) {
      throw new Error('hr に追加のインタラクション属性を付与してはいけません');
    }

    const style = getComputedStyle(hr);
    if (style.borderTopStyle !== 'solid') {
      throw new Error('border-top は solid である必要があります');
    }
  },
};

/**
 * バリアント × 状態:
 * - variant: section / layout
 * - state: aria-label あり / なし
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.75rem;
      }
      .cell {
        padding: 0.75rem;
        border: 1px dashed var(--border-default, #d7d7d7);
      }
      .label {
        margin-block-end: 0.5rem;
        font-size: 11px;
        color: var(--fg-muted, #666);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>
    <div class="matrix">
      <div class="cell">
        <div class="label">section x unlabeled</div>
        <ui-divider id="matrix-section-unlabeled" variant="section"></ui-divider>
      </div>

      <div class="cell">
        <div class="label">section x labeled</div>
        <ui-divider id="matrix-section-labeled" variant="section" aria-label="章区切り"></ui-divider>
      </div>

      <div class="cell">
        <div class="label">layout x unlabeled</div>
        <ui-divider id="matrix-layout-unlabeled" variant="layout"></ui-divider>
      </div>

      <div class="cell">
        <div class="label">layout x labeled</div>
        <ui-divider id="matrix-layout-labeled" variant="layout" aria-label="レイアウト境界"></ui-divider>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const matrix = [
      { id: 'matrix-section-unlabeled', variant: 'section', label: undefined },
      { id: 'matrix-section-labeled', variant: 'section', label: '章区切り' },
      { id: 'matrix-layout-unlabeled', variant: 'layout', label: undefined },
      { id: 'matrix-layout-labeled', variant: 'layout', label: 'レイアウト境界' },
    ] as const;

    const hosts = matrix.map(({ id }) => getHost(canvasElement, id));
    await Promise.all(hosts.map(host => host.updateComplete));

    for (const item of matrix) {
      const host = getHost(canvasElement, item.id);
      const hr = getInnerHr(host);

      if (hr.getAttribute('data-divider-variant') !== item.variant) {
        throw new Error(`${item.id} の data-divider-variant が不正です`);
      }

      const actualLabel = hr.getAttribute('aria-label') ?? undefined;
      if (actualLabel !== item.label) {
        throw new Error(`${item.id} の aria-label 反映が不正です`);
      }

      if (hr.hasAttribute('role')) {
        throw new Error(`${item.id} の hr に role を付与してはいけません`);
      }
    }
  },
};

/**
 * 事故が多い境界条件:
 * - 不正 variant のフォールバック
 * - 空白 aria-label の無効化
 * - スタイルスコープ漏れ防止
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <style>
      #boundary-scope {
        --space-12: 64px;
        --border-width: 3px;
      }
    </style>
    <div id="boundary-scope">
      <ui-divider id="boundary-invalid-variant" variant="unknown"></ui-divider>
      <ui-divider id="boundary-empty-label" aria-label="   "></ui-divider>
      <ui-divider id="boundary-host-role" role="separator"></ui-divider>

      <div class="prose">
        <hr id="boundary-prose-hr" />
      </div>
      <hr id="boundary-layout-hr" data-divider-variant="layout" />
      <hr id="boundary-plain-hr" />
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidVariant = getHost(canvasElement, 'boundary-invalid-variant');
    const emptyLabel = getHost(canvasElement, 'boundary-empty-label');
    const hostRole = getHost(canvasElement, 'boundary-host-role');
    await Promise.all([invalidVariant.updateComplete, emptyLabel.updateComplete, hostRole.updateComplete]);

    const invalidHr = getInnerHr(invalidVariant);
    if (invalidHr.getAttribute('data-divider-variant') !== 'section') {
      throw new Error('不正 variant は "section" にフォールバックする必要があります');
    }

    const emptyLabelHr = getInnerHr(emptyLabel);
    if (emptyLabelHr.hasAttribute('aria-label')) {
      throw new Error('空白 aria-label は内側 hr に反映してはいけません');
    }

    const hostRoleHr = getInnerHr(hostRole);
    if (hostRoleHr.hasAttribute('role')) {
      throw new Error('host の role 属性を内側 hr にコピーしてはいけません');
    }

    const scopeRoot = canvasElement.querySelector<HTMLElement>('#boundary-scope');
    if (!scopeRoot) {
      throw new Error('#boundary-scope が見つかりません');
    }

    const expectedMargin = toPx(getComputedStyle(scopeRoot).getPropertyValue('--space-12'));
    const expectedBorderWidth = toPx(getComputedStyle(scopeRoot).getPropertyValue('--border-width'));

    const proseHr = getHrById(canvasElement, 'boundary-prose-hr');
    const layoutHr = getHrById(canvasElement, 'boundary-layout-hr');
    const plainHr = getHrById(canvasElement, 'boundary-plain-hr');

    const proseStyle = getComputedStyle(proseHr);
    const layoutStyle = getComputedStyle(layoutHr);
    const plainStyle = getComputedStyle(plainHr);

    if (!isNearlyEqual(toPx(proseStyle.marginTop), expectedMargin)) {
      throw new Error('.prose hr に期待する margin が適用されていません');
    }
    if (!isNearlyEqual(toPx(layoutStyle.marginTop), expectedMargin)) {
      throw new Error('layout 用 hr に期待する margin が適用されていません');
    }
    if (!isNearlyEqual(toPx(proseStyle.borderTopWidth), expectedBorderWidth)) {
      throw new Error('.prose hr に期待する border-width が適用されていません');
    }
    if (!isNearlyEqual(toPx(layoutStyle.borderTopWidth), expectedBorderWidth)) {
      throw new Error('layout 用 hr に期待する border-width が適用されていません');
    }

    const plainMatchesScopedMargin = isNearlyEqual(toPx(plainStyle.marginTop), expectedMargin);
    const plainMatchesScopedBorder = isNearlyEqual(toPx(plainStyle.borderTopWidth), expectedBorderWidth);
    if (plainMatchesScopedMargin && plainMatchesScopedBorder) {
      throw new Error('スコープ外の通常 hr に divider スタイルが漏れています');
    }
  },
};

/**
 * メディア/トークン契約:
 * - スタイル注入は1回のみ
 * - forced-colors / print / token 参照を保持
 */
export const MediaAndTokenContracts: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.5rem;">
      <ui-divider id="contract-divider-a"></ui-divider>
      <ui-divider id="contract-divider-b" variant="layout"></ui-divider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const hostA = getHost(canvasElement, 'contract-divider-a');
    const hostB = getHost(canvasElement, 'contract-divider-b');
    await Promise.all([hostA.updateComplete, hostB.updateComplete]);

    const styleTags = document.querySelectorAll<HTMLStyleElement>(`#${DOCUMENT_STYLE_ID}`);
    if (styleTags.length !== 1) {
      throw new Error(`スタイル注入は1回であるべきですが ${String(styleTags.length)} 回です`);
    }

    const styleTag = getInjectedStyleTag();
    const cssText = styleTag.textContent;

    if (!cssText.includes(DIVIDER_SCOPE_SELECTOR)) {
      throw new Error('Scope Contract のセレクタが不足しています');
    }
    if (!cssText.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors 契約が不足しています');
    }
    if (!cssText.includes('@media print')) {
      throw new Error('print 契約が不足しています');
    }
    if (!cssText.includes('var(--border-ghost)')) {
      throw new Error('border トークン参照が不足しています');
    }
    if (!cssText.includes('var(--space-12)')) {
      throw new Error('space トークン参照が不足しています');
    }
    if (!cssText.includes('var(--border-width)')) {
      throw new Error('border-width トークン参照が不足しています');
    }
    if (cssText.includes('CanvasText')) {
      throw new Error('Divider 固有の CanvasText ハードコードは許可されません');
    }
  },
};
