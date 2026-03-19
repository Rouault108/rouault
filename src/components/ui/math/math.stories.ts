import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './math';
import type { UiMath } from './math';

const PRIMARY_REGION_LABEL = '数式（横スクロール可能）';
const LONG_MATH_LATEX = String.raw`x + y + z + w + v + u + t + s + r + q + p + o + n + m + l + k + j + i + h + g`;

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const waitFor = async (
  predicate: () => boolean,
  errorMessage: string,
  maxFrames = 180,
): Promise<void> => {
  for (let frame = 0; frame < maxFrames; frame += 1) {
    if (predicate()) return;
    await waitFrame();
  }
  throw new Error(errorMessage);
};

const getMathHost = (canvasElement: Element, id: string): UiMath => {
  const host = canvasElement.querySelector<UiMath>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getDisplayContainer = (host: UiMath): HTMLDivElement => {
  const display = host.shadowRoot?.querySelector<HTMLDivElement>('.math-display');
  if (!display) throw new Error(`ui-math#${host.id} の .math-display が見つかりません`);
  return display;
};

const getInlineContainer = (host: UiMath): HTMLSpanElement => {
  const inline = host.shadowRoot?.querySelector<HTMLSpanElement>('.math-inline');
  if (!inline) throw new Error(`ui-math#${host.id} の .math-inline が見つかりません`);
  return inline;
};

const getMathContent = (host: UiMath): HTMLDivElement => {
  const content = host.shadowRoot?.querySelector<HTMLDivElement>('.math-content');
  if (!content) throw new Error(`ui-math#${host.id} の .math-content が見つかりません`);
  return content;
};

const getRuntimeMathMl = (host: UiMath): Element | null =>
  host.shadowRoot?.querySelector('.runtime-katex math') ?? null;

const getRuntimeKatexMathMlContainer = (host: UiMath): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.runtime-katex .katex-mathml') ?? null;

const getRuntimeKatex = (host: UiMath): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.runtime-katex .katex') ?? null;

const getSlottedMathMl = (host: UiMath): Element | null => host.querySelector('math');

const getErrorBlock = (host: UiMath): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.math-error') ?? null;

const meta: Meta<UiMath> = {
  title: 'Components/Math',
  component: 'ui-math',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
数式コンポーネントです。

- display と inline の責務を分離し、display はスクロール操作を担当
- \`role="region"\` は \`primary=true\` の display 数式のみに限定
- \`aria-label\` 指定時のみ MathML を \`aria-hidden\` 化して手動読み上げへ切り替え
- runtime 入力（\`latex\`）は最小検証を行い、構文崩れ時はエラーUIへフォールバック
        `,
      },
    },
  },
  argTypes: {
    latex: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'ランタイムレンダリング用のLaTeX文字列（slot未指定時のみ使用）',
    },
    block: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: 'display mode（別行数式）',
    },
    primary: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: '主題数式として region ランドマークを付与',
    },
    accessibleLabel: {
      name: 'aria-label',
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '複雑数式の手動読み上げテキスト',
    },
    errorMessage: {
      name: 'error-message',
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'ビルド時・運用時に注入されるエラー表示メッセージ',
    },
  },
};

export default meta;
type Story = StoryObj<UiMath>;

/**
 * 基本契約:
 * - 通常表示時の block + primary の責務分離
 * - 非オーバーフロー時は余計なスクロール状態を持たない
 */
export const Default: Story = {
  render: () => html`
    <div style="max-width: 320px;">
      <ui-math id="default-math" block primary .latex=${String.raw`x + y = z`}></ui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getMathHost(canvasElement, 'default-math');
    await host.updateComplete;
    await waitFrame();

    const display = getDisplayContainer(host);
    const content = getMathContent(host);
    const runtimeMathMl = getRuntimeMathMl(host);
    const runtimeMathMlContainer = getRuntimeKatexMathMlContainer(host);
    const runtimeKatex = getRuntimeKatex(host);
    if (!runtimeMathMl) throw new Error('runtime MathML が見つかりません');
    if (!runtimeMathMlContainer) throw new Error('runtime KaTeX MathML コンテナが見つかりません');
    if (!runtimeKatex) throw new Error('runtime KaTeX が見つかりません');

    if (display.getAttribute('role') !== 'region') {
      throw new Error('primary=true の block では role="region" が必要です');
    }
    if (display.getAttribute('aria-label') !== PRIMARY_REGION_LABEL) {
      throw new Error('primary=true の block では region 用 aria-label が必要です');
    }
    if (content.getAttribute('role') !== 'math') {
      throw new Error('math-content には role="math" が必要です');
    }
    if (content.hasAttribute('aria-label')) {
      throw new Error('aria-label 未指定時に math-content へ aria-label を出力してはいけません');
    }
    if (runtimeMathMl.hasAttribute('aria-hidden')) {
      throw new Error('aria-label 未指定時は MathML を aria-hidden にしてはいけません');
    }
    if (display.hasAttribute('tabindex')) {
      throw new Error('非オーバーフロー時に tabindex を付与してはいけません');
    }
    if (display.getAttribute('data-scroll') !== 'none') {
      throw new Error('非オーバーフロー時は data-scroll="none" である必要があります');
    }
    if (display.scrollWidth > display.clientWidth + 1) {
      throw new Error('Default は横スクロールしない代表例である必要があります');
    }
    if (getComputedStyle(runtimeKatex).color !== getComputedStyle(content).color) {
      throw new Error('runtime KaTeX は math-content の文字色を継承する必要があります');
    }

    const runtimeMathMlStyle = getComputedStyle(runtimeMathMlContainer);
    const runtimeMathMlRect = runtimeMathMlContainer.getBoundingClientRect();
    if (runtimeMathMlStyle.position !== 'absolute') {
      throw new Error('runtime KaTeX MathML は通常フローから外して視覚非表示にする必要があります');
    }
    if (runtimeMathMlRect.width > 1.5 || runtimeMathMlRect.height > 1.5) {
      throw new Error(
        `runtime KaTeX MathML は 1px 退避である必要があります: width=${runtimeMathMlRect.width.toString()}, height=${runtimeMathMlRect.height.toString()}`,
      );
    }
  },
};

/**
 * 意味のある組み合わせ:
 * - inline / block
 * - primary の有無
 * - aria-label 指定時の MathML 優先順位切り替え
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
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--fg-muted, oklch(45% 0 0));
      }
      .cell {
        display: grid;
        gap: 0.375rem;
      }
    </style>
    <div class="matrix">
      <div class="cell">
        <div class="label">inline / no aria-label</div>
        <ui-math id="matrix-inline-default">
          <math xmlns="http://www.w3.org/1998/Math/MathML">
            <mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow>
          </math>
          <span class="katex-html" aria-hidden="true">x + y</span>
        </ui-math>
      </div>

      <div class="cell">
        <div class="label">inline / aria-label override</div>
        <ui-math id="matrix-inline-labeled" aria-label="エックス プラス ワイ">
          <math xmlns="http://www.w3.org/1998/Math/MathML" aria-hidden="true">
            <mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow>
          </math>
          <span class="katex-html" aria-hidden="true">x + y</span>
        </ui-math>
      </div>

      <div class="cell" style="max-width: 560px;">
        <div class="label">block runtime / secondary</div>
        <ui-math
          id="matrix-block-runtime-secondary"
          block
          .latex=${String.raw`\int_0^1 x^2 dx`}
        ></ui-math>
      </div>

      <div class="cell" style="max-width: 280px;">
        <div class="label">block runtime / primary + aria-label</div>
        <ui-math
          id="matrix-block-runtime-primary"
          block
          primary
          aria-label="総和シグマ、iは1からnまで、a_i"
          .latex=${String.raw`\sum_{i=1}^{n} a_i = a_1 + a_2 + a_3 + a_4 + a_5 + a_6 + a_7 + a_8 + a_9`}
        ></ui-math>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const inlineDefault = getMathHost(canvasElement, 'matrix-inline-default');
    const inlineLabeled = getMathHost(canvasElement, 'matrix-inline-labeled');
    const blockSecondary = getMathHost(canvasElement, 'matrix-block-runtime-secondary');
    const blockPrimary = getMathHost(canvasElement, 'matrix-block-runtime-primary');
    await Promise.all([
      inlineDefault.updateComplete,
      inlineLabeled.updateComplete,
      blockSecondary.updateComplete,
      blockPrimary.updateComplete,
    ]);
    await waitFrame();

    const inlineDefaultContainer = getInlineContainer(inlineDefault);
    if (inlineDefaultContainer.getAttribute('role') !== 'math') {
      throw new Error('inline 基本ケースでは role="math" が必要です');
    }
    if (inlineDefaultContainer.hasAttribute('aria-label')) {
      throw new Error('aria-label 未指定ケースで aria-label が出力されています');
    }
    const inlineDefaultMath = getSlottedMathMl(inlineDefault);
    if (!inlineDefaultMath || inlineDefaultMath.hasAttribute('aria-hidden')) {
      throw new Error('aria-label 未指定時は slotted MathML を公開する必要があります');
    }

    const inlineLabeledContainer = getInlineContainer(inlineLabeled);
    if (inlineLabeledContainer.getAttribute('aria-label') !== 'エックス プラス ワイ') {
      throw new Error('inline + aria-label ケースで aria-label が反映されていません');
    }
    if (getSlottedMathMl(inlineLabeled)?.getAttribute('aria-hidden') !== 'true') {
      throw new Error(
        'aria-label 指定時の slotted MathML は SSR 側で aria-hidden="true" である必要があります',
      );
    }

    const secondaryDisplay = getDisplayContainer(blockSecondary);
    const secondaryContent = getMathContent(blockSecondary);
    if (secondaryDisplay.hasAttribute('role')) {
      throw new Error('primary=false の block では role="region" を付与してはいけません');
    }
    if (secondaryDisplay.hasAttribute('aria-label')) {
      throw new Error('primary=false の block では region aria-label を付与してはいけません');
    }
    if (secondaryDisplay.hasAttribute('tabindex')) {
      throw new Error('スクロール不要な block に tabindex を付与してはいけません');
    }
    if (secondaryDisplay.getAttribute('data-scroll') !== 'none') {
      throw new Error('スクロール不要な block は data-scroll="none" である必要があります');
    }
    if (secondaryContent.getAttribute('role') !== 'math') {
      throw new Error('block secondary の .math-content に role="math" が必要です');
    }
    const secondaryRuntimeMath = getRuntimeMathMl(blockSecondary);
    if (!secondaryRuntimeMath) {
      throw new Error('runtime secondary ケースで MathML が生成されていません');
    }
    if (secondaryRuntimeMath.hasAttribute('aria-hidden')) {
      throw new Error('aria-label 未指定の runtime MathML は aria-hidden にしてはいけません');
    }

    const primaryDisplay = getDisplayContainer(blockPrimary);
    const primaryContent = getMathContent(blockPrimary);
    if (primaryDisplay.getAttribute('role') !== 'region') {
      throw new Error('primary=true の block では role="region" が必要です');
    }
    if (primaryDisplay.getAttribute('aria-label') !== PRIMARY_REGION_LABEL) {
      throw new Error('primary=true の block で region aria-label が不足しています');
    }
    if (primaryContent.getAttribute('aria-label') !== '総和シグマ、iは1からnまで、a_i') {
      throw new Error('math-content 側の aria-label が反映されていません');
    }
    const primaryRuntimeMath = getRuntimeMathMl(blockPrimary);
    if (!primaryRuntimeMath) {
      throw new Error('runtime primary ケースで MathML が生成されていません');
    }
    if (primaryRuntimeMath.getAttribute('aria-hidden') !== 'true') {
      throw new Error('aria-label 指定時の runtime MathML は aria-hidden="true" が必要です');
    }
  },
};

/**
 * 状態系:
 * - build-time 注入エラー（静的）
 * - runtime 構文エラー（動的 alert）
 */
export const ErrorStates: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-math
        id="error-static"
        block
        error-message="ビルド時にLaTeXを解析できませんでした。式を確認してください。"
      ></ui-math>

      <ui-math id="error-runtime" .latex=${String.raw`\frac{1}{2`}></ui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const staticErrorHost = getMathHost(canvasElement, 'error-static');
    const runtimeErrorHost = getMathHost(canvasElement, 'error-runtime');
    await Promise.all([staticErrorHost.updateComplete, runtimeErrorHost.updateComplete]);
    await waitFrame();

    const staticError = getErrorBlock(staticErrorHost);
    if (!staticError) {
      throw new Error('build-time エラーケースで .math-error が描画されません');
    }
    if (staticError.hasAttribute('role')) {
      throw new Error('静的エラーでは role="alert" を付与してはいけません');
    }
    if (!staticError.textContent.includes('ビルド時にLaTeXを解析できませんでした')) {
      throw new Error('静的エラーのメッセージ表示が不正です');
    }

    await waitFor(
      () => getErrorBlock(runtimeErrorHost) !== null,
      'runtime エラーUIが描画されません',
    );
    const runtimeError = getErrorBlock(runtimeErrorHost);
    if (!runtimeError) throw new Error('runtime エラーUIが取得できません');
    if (runtimeError.getAttribute('role') !== 'alert') {
      throw new Error('動的エラーでは role="alert" を付与する必要があります');
    }
    if (!runtimeError.textContent.includes('LaTeX構文エラー')) {
      throw new Error('runtime エラーメッセージが想定の構文エラーを示していません');
    }

    const icon = runtimeError.querySelector<HTMLElement>('iconify-icon');
    if (icon?.getAttribute('icon') !== 'lucide:triangle-alert') {
      throw new Error('エラーアイコンが仕様どおりではありません');
    }

    const details = runtimeError.querySelector('details');
    const summary = runtimeError.querySelector('summary');
    if (!details || !summary) {
      throw new Error('runtime エラー時は details/summary でソースを提示する必要があります');
    }
    const sourceCode = runtimeError.querySelector('pre code');
    if (!(sourceCode?.textContent ?? '').includes(String.raw`\frac{1}{2`)) {
      throw new Error('runtime エラー詳細に入力LaTeXが表示されていません');
    }

    const runtimeShadow = runtimeErrorHost.shadowRoot;
    if (runtimeShadow === null) {
      throw new Error('runtime エラーケースの shadowRoot が見つかりません');
    }
    if (runtimeShadow.querySelector('[role="math"]')) {
      throw new Error('エラー表示時は math ロール要素を同時表示してはいけません');
    }
  },
};

/**
 * 事故が多い境界条件:
 * - slot優先（slot + latex 併用時は slot を採用）
 * - 空白 aria-label の無効化
 * - 非スクロール block で tabindex 非付与
 * - inline では primary=true でも region を付与しない
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-math id="boundary-slot-priority" block .latex=${String.raw`\frac{1}{2`}>
        <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
          <mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow>
        </math>
        <span class="katex-html" aria-hidden="true">a + b</span>
      </ui-math>

      <ui-math id="boundary-empty-aria" aria-label="   ">
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <mrow><mi>m</mi><mo>+</mo><mi>n</mi></mrow>
        </math>
        <span class="katex-html" aria-hidden="true">m + n</span>
      </ui-math>

      <div style="max-width: 640px;">
        <ui-math id="boundary-no-overflow" block .latex=${String.raw`x+y=z`}></ui-math>
      </div>

      <ui-math id="boundary-inline-primary" primary .latex=${String.raw`x^2+y^2=z^2`}></ui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slotPriority = getMathHost(canvasElement, 'boundary-slot-priority');
    const emptyAria = getMathHost(canvasElement, 'boundary-empty-aria');
    const noOverflow = getMathHost(canvasElement, 'boundary-no-overflow');
    const inlinePrimary = getMathHost(canvasElement, 'boundary-inline-primary');
    await Promise.all([
      slotPriority.updateComplete,
      emptyAria.updateComplete,
      noOverflow.updateComplete,
      inlinePrimary.updateComplete,
    ]);
    await waitFrame();

    if (getErrorBlock(slotPriority)) {
      throw new Error('slot 併用時は latex 構文エラーより slot 表示を優先する必要があります');
    }
    if (!getSlottedMathMl(slotPriority)) {
      throw new Error('slot 優先ケースで slotted MathML が見つかりません');
    }
    if (getRuntimeMathMl(slotPriority)) {
      throw new Error('slot 優先ケースで runtime MathML を描画してはいけません');
    }

    const emptyAriaInline = getInlineContainer(emptyAria);
    if (emptyAriaInline.hasAttribute('aria-label')) {
      throw new Error('空白のみの aria-label は無効化される必要があります');
    }
    const emptyAriaMath = getSlottedMathMl(emptyAria);
    if (!emptyAriaMath) throw new Error('boundary-empty-aria の MathML が見つかりません');
    if (emptyAriaMath.hasAttribute('aria-hidden')) {
      throw new Error('空白 aria-label の場合は MathML を aria-hidden にしてはいけません');
    }

    const noOverflowDisplay = getDisplayContainer(noOverflow);
    if (noOverflowDisplay.hasAttribute('tabindex')) {
      throw new Error('非スクロール block では tabindex を付与してはいけません');
    }
    if (noOverflowDisplay.getAttribute('data-scroll') !== 'none') {
      throw new Error('非スクロール block は data-scroll="none" である必要があります');
    }

    const inlinePrimaryContainer = getInlineContainer(inlinePrimary);
    if (inlinePrimaryContainer.getAttribute('role') !== 'math') {
      throw new Error('inline primary でも role="math" は維持される必要があります');
    }
    if (inlinePrimary.shadowRoot?.querySelector('[role="region"]')) {
      throw new Error('inline で role="region" を付与してはいけません');
    }
  },
};

/**
 * キーボード操作契約:
 * - スクロール可能な display はフォーカス可能
 * - フォーカス後にスクロール状態が遷移できる
 */
export const KeyboardInteraction: Story = {
  render: () => html`
    <div style="max-width: 300px;">
      <ui-math id="keyboard-scrollable" block primary .latex=${LONG_MATH_LATEX}></ui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getMathHost(canvasElement, 'keyboard-scrollable');
    await host.updateComplete;
    await waitFrame();

    const display = getDisplayContainer(host);
    await waitFor(
      () => display.getAttribute('tabindex') === '0',
      'キーボード操作用 tabindex が付与されません',
    );

    display.focus();
    await waitFrame();
    if (host.shadowRoot?.activeElement !== display) {
      throw new Error('スクロールコンテナにフォーカスできません');
    }

    display.scrollLeft = display.scrollWidth;
    display.dispatchEvent(new Event('scroll'));
    await waitFor(
      () => display.getAttribute('data-scroll') === 'end',
      'フォーカス後のスクロール状態が end へ遷移しません',
    );
  },
};

/**
 * id 契約:
 * - block 時に host id をスクロールコンテナへミラーする
 */
export const IdAnchorContract: Story = {
  render: () => html`
    <ui-math id="eq-pythagorean" block .latex=${String.raw`a^2 + b^2 = c^2`}></ui-math>
  `,
  play: async ({ canvasElement }) => {
    const host = getMathHost(canvasElement, 'eq-pythagorean');
    await host.updateComplete;
    await waitFrame();

    const display = getDisplayContainer(host);
    if (display.id !== 'eq-pythagorean') {
      throw new Error('block コンテナへ id がミラーされていません');
    }
  },
};

/**
 * Dark Mode 契約:
 * - KaTeX 出力が color: inherit で暗色トークンに追従する
 */
export const DarkModeTokenContract: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <div
      style="color-scheme: dark; background: oklch(16% 0.02 250); color: oklch(92% 0.01 250); padding: 1rem;"
    >
      <ui-math id="dark-runtime" block .latex=${String.raw`\sum_{i=1}^{n} a_i`}></ui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getMathHost(canvasElement, 'dark-runtime');
    await host.updateComplete;
    await waitFrame();

    const content = getMathContent(host);
    const katex = getRuntimeKatex(host);
    if (!katex) throw new Error('runtime KaTeX が描画されていません');

    const contentColor = getComputedStyle(content).color;
    const katexColor = getComputedStyle(katex).color;
    if (contentColor !== katexColor) {
      throw new Error(`KaTeX 色が継承されていません: content=${contentColor}, katex=${katexColor}`);
    }
  },
};

/**
 * Forced Colors 契約:
 * - 強制色メディアクエリでマスク無効化とシステムカラー追従を維持する
 */
export const ForcedColorsContract: Story = {
  render: () =>
    html`<ui-math id="forced-colors-contract" .latex=${String.raw`x + y = z`}></ui-math>`,
  play: async ({ canvasElement }) => {
    const host = getMathHost(canvasElement, 'forced-colors-contract');
    await host.updateComplete;

    const sheets = host.shadowRoot?.adoptedStyleSheets ?? [];
    const cssText = sheets
      .map((sheet) =>
        Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n'),
      )
      .join('\n');
    const requiredPatterns: { label: string; pattern: RegExp }[] = [
      { label: 'forced-colors media query', pattern: /@media\s*\(forced-colors:\s*active\)/i },
      { label: 'mask-image none', pattern: /mask-image:\s*none/i },
      { label: 'border-color CanvasText', pattern: /border-color:\s*canvastext/i },
    ];

    for (const { label, pattern } of requiredPatterns) {
      if (!pattern.test(cssText)) {
        throw new Error(`forced-colors 契約の定義が不足しています: ${label}`);
      }
    }

    const hasScrollbarRule = /scrollbar-color:\s*canvastext\s+transparent/i.test(cssText);
    const hasForcedColorsBlock = /@media\s*\(forced-colors:\s*active\)[\s\S]*\.math-display/.test(
      cssText,
    );
    if (!hasScrollbarRule && !hasForcedColorsBlock) {
      throw new Error('forced-colors 時のスクロール領域フォールバック定義が不足しています');
    }
  },
};
