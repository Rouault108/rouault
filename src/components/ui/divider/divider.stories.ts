import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './divider';
import {
  DEFAULT_DIVIDER_VARIANT,
  DIVIDER_SCOPE_SELECTOR,
  DOCUMENT_STYLE_ID,
  ensureDividerDocumentStyles,
  resolveDividerVariant,
  type Divider,
  type DividerVariant,
} from './divider';

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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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
- \`variant\` は \`section\` / \`layout\` の意味分類で、既定値は \`section\`
- 追加ロールを付与せず、ネイティブセマンティクスを維持
- 適用スコープは \`.prose hr\` / \`ui-divider > hr\` / \`hr[data-divider-variant="layout"]\` に限定
- トークン: \`--border-style-subtle\` / \`--border-default\` / \`--border-ghost\` / \`--space-12\`
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
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`<ui-divider id="default-divider"></ui-divider>`,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'default-divider');
    await host.updateComplete;

    const hr = getInnerHr(host);
    assert(hr.tagName === 'HR', 'ui-divider は hr 要素を出力する必要があります');
    assert(host.shadowRoot === null, 'ui-divider は Shadow DOM を使用してはいけません');
    assert(host.children.length === 1, 'ui-divider 直下には hr のみを描画する必要があります');
    assert(
      host.getAttribute('variant') === DEFAULT_DIVIDER_VARIANT,
      'default の host variant 属性は "section" を反映する必要があります',
    );
    assert(
      hr.getAttribute('data-divider-variant') === DEFAULT_DIVIDER_VARIANT,
      'default の data-divider-variant は "section" である必要があります',
    );
    assert(
      !hr.hasAttribute('role') && !hr.hasAttribute('tabindex'),
      'hr に追加のインタラクション属性を付与してはいけません',
    );

    const style = getComputedStyle(hr);
    assert(style.borderTopStyle === 'solid', 'border-top は solid である必要があります');
    assert(
      isNearlyEqual(toPx(style.borderTopWidth), 1),
      'border-top-width は 1px である必要があります',
    );
    assert(
      isNearlyEqual(toPx(style.width), toPx(getComputedStyle(host).width)),
      'divider は利用可能幅いっぱいに描画される必要があります',
    );
  },
};

/**
 * バリアント × 状態:
 * - variant: section / layout
 * - state: host に aria-label / tabindex あり・なし（内側 hr へは転送しない）
 */
export const VariantStateMatrix: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
        <div class="label">section x host-labeled</div>
        <ui-divider
          id="matrix-section-labeled"
          variant="section"
          aria-label="章区切り"
        ></ui-divider>
      </div>

      <div class="cell">
        <div class="label">layout x unlabeled</div>
        <ui-divider id="matrix-layout-unlabeled" variant="layout"></ui-divider>
      </div>

      <div class="cell">
        <div class="label">layout x host-labeled</div>
        <ui-divider
          id="matrix-layout-labeled"
          variant="layout"
          aria-label="レイアウト境界"
        ></ui-divider>
      </div>

      <div class="cell">
        <div class="label">section x host-tabindex</div>
        <ui-divider id="matrix-section-tabindex" variant="section" tabindex="0"></ui-divider>
      </div>

      <div class="cell">
        <div class="label">layout x host-tabindex</div>
        <ui-divider id="matrix-layout-tabindex" variant="layout" tabindex="0"></ui-divider>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const matrix = [
      {
        id: 'matrix-section-unlabeled',
        variant: 'section',
        hostLabel: undefined,
        hostTabIndex: null,
      },
      {
        id: 'matrix-section-labeled',
        variant: 'section',
        hostLabel: '章区切り',
        hostTabIndex: null,
      },
      {
        id: 'matrix-layout-unlabeled',
        variant: 'layout',
        hostLabel: undefined,
        hostTabIndex: null,
      },
      {
        id: 'matrix-layout-labeled',
        variant: 'layout',
        hostLabel: 'レイアウト境界',
        hostTabIndex: null,
      },
      {
        id: 'matrix-section-tabindex',
        variant: 'section',
        hostLabel: undefined,
        hostTabIndex: '0',
      },
      { id: 'matrix-layout-tabindex', variant: 'layout', hostLabel: undefined, hostTabIndex: '0' },
    ] as const;

    const hosts = matrix.map(({ id }) => getHost(canvasElement, id));
    await Promise.all(hosts.map((host) => host.updateComplete));

    for (const item of matrix) {
      const host = getHost(canvasElement, item.id);
      const hr = getInnerHr(host);

      if (hr.getAttribute('data-divider-variant') !== item.variant) {
        throw new Error(`${item.id} の data-divider-variant が不正です`);
      }

      if (hr.hasAttribute('aria-label')) {
        throw new Error(`${item.id} の hr に aria-label を転送してはいけません`);
      }
      if (hr.hasAttribute('tabindex')) {
        throw new Error(`${item.id} の hr に tabindex を転送してはいけません`);
      }

      const actualHostLabel = host.getAttribute('aria-label') ?? undefined;
      if (actualHostLabel !== item.hostLabel) {
        throw new Error(`${item.id} の host aria-label が不正です`);
      }

      if (host.getAttribute('tabindex') !== item.hostTabIndex) {
        throw new Error(`${item.id} の host tabindex が不正です`);
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
 * - host aria-label 非転送
 * - host tabindex 非転送
 * - スタイルスコープ漏れ防止
 */
export const BoundaryConditions: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <style>
      #boundary-scope {
        --space-12: 64px;
      }
    </style>
    <div id="boundary-scope">
      <ui-divider id="boundary-invalid-variant" variant="unknown"></ui-divider>
      <ui-divider id="boundary-host-label" aria-label="章区切り"></ui-divider>
      <ui-divider id="boundary-host-role" role="separator"></ui-divider>
      <ui-divider id="boundary-host-tabindex" tabindex="0"></ui-divider>

      <div class="prose">
        <hr id="boundary-prose-hr" />
      </div>
      <hr id="boundary-layout-hr" data-divider-variant="layout" />
      <hr id="boundary-plain-hr" />
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidVariant = getHost(canvasElement, 'boundary-invalid-variant');
    const hostLabel = getHost(canvasElement, 'boundary-host-label');
    const hostRole = getHost(canvasElement, 'boundary-host-role');
    const hostTabIndex = getHost(canvasElement, 'boundary-host-tabindex');
    await Promise.all([
      invalidVariant.updateComplete,
      hostLabel.updateComplete,
      hostRole.updateComplete,
      hostTabIndex.updateComplete,
    ]);

    const invalidHr = getInnerHr(invalidVariant);
    if (
      invalidHr.getAttribute('data-divider-variant') !== DEFAULT_DIVIDER_VARIANT ||
      invalidVariant.getAttribute('variant') !== 'unknown'
    ) {
      throw new Error('不正 variant は "section" にフォールバックする必要があります');
    }
    if (resolveDividerVariant(invalidVariant.getAttribute('variant')) !== DEFAULT_DIVIDER_VARIANT) {
      throw new Error('列挙外 variant の解決規則が仕様どおりではありません');
    }

    const hostLabelHr = getInnerHr(hostLabel);
    if (hostLabelHr.hasAttribute('aria-label')) {
      throw new Error('host aria-label を内側 hr に反映してはいけません');
    }

    const hostRoleHr = getInnerHr(hostRole);
    if (hostRoleHr.hasAttribute('role')) {
      throw new Error('host の role 属性を内側 hr にコピーしてはいけません');
    }

    const hostTabIndexHr = getInnerHr(hostTabIndex);
    if (hostTabIndexHr.hasAttribute('tabindex')) {
      throw new Error('host の tabindex 属性を内側 hr にコピーしてはいけません');
    }

    const scopeRoot = canvasElement.querySelector<HTMLElement>('#boundary-scope');
    if (!scopeRoot) {
      throw new Error('#boundary-scope が見つかりません');
    }

    const expectedMargin = toPx(getComputedStyle(scopeRoot).getPropertyValue('--space-12'));
    const expectedBorderWidth = 1;

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
      throw new Error('.prose hr に期待する 1px border-top が適用されていません');
    }
    if (!isNearlyEqual(toPx(layoutStyle.borderTopWidth), expectedBorderWidth)) {
      throw new Error('layout 用 hr に期待する 1px border-top が適用されていません');
    }

    const plainMatchesScopedMargin = isNearlyEqual(toPx(plainStyle.marginTop), expectedMargin);
    const plainMatchesScopedBorder = isNearlyEqual(
      toPx(plainStyle.borderTopWidth),
      expectedBorderWidth,
    );
    if (plainMatchesScopedMargin && plainMatchesScopedBorder) {
      throw new Error('スコープ外の通常 hr に divider スタイルが漏れています');
    }
  },
};

/**
 * インスタンス非依存契約:
 * - `<ui-divider>` が存在しなくても `.prose hr` / `hr[data-divider-variant="layout"]` にスタイルが適用される
 */
export const ScopeWithoutComponentInstance: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <style>
      #scope-only-contract {
        --space-12: 52px;
      }
    </style>
    <div id="scope-only-contract">
      <div class="prose">
        <hr id="scope-only-prose-hr" />
      </div>
      <hr id="scope-only-layout-hr" data-divider-variant="layout" />
      <hr id="scope-only-plain-hr" />
    </div>
  `,
  play: ({ canvasElement }) => {
    document.querySelectorAll(`#${DOCUMENT_STYLE_ID}`).forEach((node) => {
      node.remove();
    });
    ensureDividerDocumentStyles();

    const styleTags = document.querySelectorAll<HTMLStyleElement>(`#${DOCUMENT_STYLE_ID}`);
    if (styleTags.length !== 1) {
      throw new Error(`スタイル注入は1回であるべきですが ${String(styleTags.length)} 回です`);
    }

    const scopeRoot = canvasElement.querySelector<HTMLElement>('#scope-only-contract');
    if (!scopeRoot) {
      throw new Error('#scope-only-contract が見つかりません');
    }

    const expectedMargin = toPx(getComputedStyle(scopeRoot).getPropertyValue('--space-12'));
    const proseHr = getHrById(canvasElement, 'scope-only-prose-hr');
    const layoutHr = getHrById(canvasElement, 'scope-only-layout-hr');
    const plainHr = getHrById(canvasElement, 'scope-only-plain-hr');

    const proseStyle = getComputedStyle(proseHr);
    const layoutStyle = getComputedStyle(layoutHr);
    const plainStyle = getComputedStyle(plainHr);

    if (!isNearlyEqual(toPx(proseStyle.marginTop), expectedMargin)) {
      throw new Error('インスタンスなしでも .prose hr に margin 契約が必要です');
    }
    if (!isNearlyEqual(toPx(layoutStyle.marginTop), expectedMargin)) {
      throw new Error('インスタンスなしでも layout hr に margin 契約が必要です');
    }
    if (
      !isNearlyEqual(toPx(proseStyle.borderTopWidth), 1) ||
      !isNearlyEqual(toPx(layoutStyle.borderTopWidth), 1)
    ) {
      throw new Error('インスタンスなしでも 1px border-top 契約が必要です');
    }

    const plainMatchesScopedMargin = isNearlyEqual(toPx(plainStyle.marginTop), expectedMargin);
    if (plainMatchesScopedMargin) {
      throw new Error('スコープ外の通常 hr に divider の margin が漏れています');
    }
  },
};

/**
 * メディア/トークン契約:
 * - スタイル注入は1回のみ
 * - forced-colors / print / token 参照を保持
 */
export const MediaAndTokenContracts: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
    if (cssText.includes('CanvasText')) {
      throw new Error('Divider 固有の CanvasText ハードコードは許可されません');
    }

    hostA.remove();
    hostB.remove();

    const retainedStyleTag = document.querySelectorAll<HTMLStyleElement>(`#${DOCUMENT_STYLE_ID}`);
    if (retainedStyleTag.length !== 1) {
      throw new Error('スタイルタグはインスタンス破棄後も document 単位で保持される必要があります');
    }
  },
};

/**
 * Dark Mode 契約:
 * - prefers-color-scheme 分岐を書かず、セマンティックトークン参照でモード追従する
 */
export const DarkModeTokenContract: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <div
        id="dark-contract-light"
        style="padding: 0.75rem; background: var(--bg-default); color: var(--fg-default);"
      >
        <ui-divider id="dark-contract-divider-light"></ui-divider>
      </div>
      <div
        id="dark-contract-dark"
        style="padding: 0.75rem; color-scheme: dark; background: oklch(18% 0.01 250); color: oklch(95% 0.01 250);"
      >
        <ui-divider id="dark-contract-divider-dark"></ui-divider>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const light = getHost(canvasElement, 'dark-contract-divider-light');
    const dark = getHost(canvasElement, 'dark-contract-divider-dark');
    await Promise.all([light.updateComplete, dark.updateComplete]);

    const lightHr = getInnerHr(light);
    const darkHr = getInnerHr(dark);
    const lightStyle = getComputedStyle(lightHr);
    const darkStyle = getComputedStyle(darkHr);

    if (lightStyle.borderTopStyle !== 'solid' || darkStyle.borderTopStyle !== 'solid') {
      throw new Error('Dark/Light どちらでも border-top は solid である必要があります');
    }

    const cssText = getInjectedStyleTag().textContent;
    if (!cssText.includes('var(--border-ghost)')) {
      throw new Error('Dark Mode 追従に必要な border-ghost トークン参照が不足しています');
    }
    if (cssText.includes('prefers-color-scheme')) {
      throw new Error(
        'Divider は prefers-color-scheme 分岐ではなくトークンでモード追従する必要があります',
      );
    }
  },
};

/**
 * Selector Specificity 契約:
 * - divider スタイルは低特異性で提供される
 * - ページ層の妥当な上書きを阻害しない
 */
export const SelectorSpecificityContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <style>
      #specificity-scope .override-target {
        border-top-style: dashed;
        border-top-width: 3px;
        margin-top: 19px;
      }
    </style>
    <div id="specificity-scope">
      <div class="prose">
        <hr id="specificity-prose-hr" class="override-target" />
      </div>
      <hr id="specificity-layout-hr" class="override-target" data-divider-variant="layout" />
    </div>
  `,
  play: ({ canvasElement }) => {
    const cssText = getInjectedStyleTag().textContent;
    if (!cssText.includes(':where(')) {
      throw new Error('低特異性契約のため :where() を維持する必要があります');
    }

    const proseHr = getHrById(canvasElement, 'specificity-prose-hr');
    const layoutHr = getHrById(canvasElement, 'specificity-layout-hr');

    for (const hr of [proseHr, layoutHr]) {
      const style = getComputedStyle(hr);
      if (style.borderTopStyle !== 'dashed') {
        throw new Error('ページ層の border-top-style 上書きを阻害してはいけません');
      }
      if (!isNearlyEqual(toPx(style.borderTopWidth), 3)) {
        throw new Error('ページ層の border-top-width 上書きを阻害してはいけません');
      }
      if (!isNearlyEqual(toPx(style.marginTop), 19)) {
        throw new Error('ページ層の margin 上書きを阻害してはいけません');
      }
    }
  },
};
