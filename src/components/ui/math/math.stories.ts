import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './math';
import type { UiMath } from './math';

const PRIMARY_REGION_LABEL = '数式（横スクロール可能）';
const ERROR_DETAILS_SUMMARY = '数式ソースを表示';
const LONG_MATH_LATEX = String.raw`x + y + z + w + v + u + t + s + r + q + p + o + n + m + l + k + j + i + h + g`;

interface ExternalErrorExpectation {
  id: string;
  title: string;
  tone: 'danger' | 'muted';
}

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

const waitForMathSettled = async (host: UiMath): Promise<void> => {
  await new Promise<void>((resolve) => {
    const onSettled = (): void => {
      resolve();
    };

    host.addEventListener('math-settled', onSettled, { once: true });
  });
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

const getErrorTitle = (host: UiMath): string =>
  getErrorBlock(host)?.querySelector('.math-error-title')?.textContent.trim() ?? '';

const getErrorCode = (host: UiMath): string =>
  getErrorBlock(host)?.querySelector('.math-error-code')?.textContent.trim() ?? '';

const meta: Meta<UiMath> = {
  title: 'Components/Math',
  component: 'ui-math',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
数式コンポーネントです。

- \`error-message → slot → latex → runtime 構文エラー → no-op\` の優先順位を固定
- \`primary\` は display 数式のランドマーク制御にのみ使用
- \`speech-mode\` と \`aria-label\` で MathML 公開経路と手動読み上げ経路を切り替え
- \`error-kind\`・\`error-code\`・\`show-error-source\` で external エラー契約を構成
- 空入力時は role を持たない no-op として振る舞い、\`math-settled\` で安定点を通知
        `,
      },
    },
  },
  argTypes: {
    latex: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'ランタイムレンダリング用の LaTeX 文字列（slot 未指定時のみ使用）',
    },
    block: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: 'display mode（別行数式）',
    },
    primary: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: 'display 数式の region ランドマーク付与フラグ',
    },
    speechMode: {
      name: 'speech-mode',
      control: 'radio',
      options: ['mathml', 'label'],
      table: { type: { summary: "'mathml' | 'label'" }, defaultValue: { summary: "'mathml'" } },
      description: '主要な読み上げ経路を指定する列挙入力',
    },
    accessibleLabel: {
      name: 'aria-label',
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '手動読み上げテキスト。speech-mode 未指定時は後方互換入力としても機能',
    },
    errorMessage: {
      name: 'error-message',
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'external エラー表示を強制するメッセージ',
    },
    errorKind: {
      name: 'error-kind',
      control: 'select',
      options: ['build-failed', 'data-missing', 'runtime-failed', 'upstream-invalid', 'unspecified'],
      table: {
        type: {
          summary:
            "'build-failed' | 'data-missing' | 'runtime-failed' | 'upstream-invalid' | 'unspecified'",
        },
        defaultValue: { summary: "'unspecified'" },
      },
      description: 'external エラーの下位分類',
    },
    errorCode: {
      name: 'error-code',
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'external エラーの診断補助コード',
    },
    showErrorSource: {
      name: 'show-error-source',
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: 'エラー時の入力ソース開示を明示 opt-in で許可',
    },
  },
};

export default meta;
type Story = StoryObj<UiMath>;

export const Default: Story = {
  render: () => html`
    <div style="max-width: 320px;">
      <ui-math id="default-math" block primary .latex=${String.raw`x + y = z`}></ui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getMathHost(canvasElement, 'default-math');
    await host.updateComplete;
    await waitForMathSettled(host);

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
      throw new Error('既定の mathml モードでは math-content に aria-label を出力してはいけません');
    }
    if (runtimeMathMl.hasAttribute('aria-hidden')) {
      throw new Error('mathml モードでは runtime MathML を aria-hidden にしてはいけません');
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
        <div class="label">inline / slot / mathml</div>
        <ui-math id="matrix-inline-default">
          <math xmlns="http://www.w3.org/1998/Math/MathML">
            <mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow>
          </math>
          <span class="katex-html" aria-hidden="true">x + y</span>
        </ui-math>
      </div>

      <div class="cell">
        <div class="label">inline / slot / aria-label fallback</div>
        <ui-math id="matrix-inline-labeled" aria-label="エックス プラス ワイ">
          <math xmlns="http://www.w3.org/1998/Math/MathML" aria-hidden="true">
            <mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow>
          </math>
          <span class="katex-html" aria-hidden="true">x + y</span>
        </ui-math>
      </div>

      <div class="cell" style="max-width: 420px;">
        <div class="label">block / runtime / speech-mode mathml</div>
        <ui-math
          id="matrix-block-runtime-mathml"
          block
          speech-mode="mathml"
          aria-label="この aria-label は主要読み上げ経路を変えない"
          .latex=${String.raw`\int_0^1 x^2 dx`}
        ></ui-math>
      </div>

      <div class="cell" style="max-width: 280px;">
        <div class="label">block / runtime / primary + speech-mode label</div>
        <ui-math
          id="matrix-block-runtime-label"
          block
          primary
          speech-mode="label"
          aria-label="総和シグマ、iは1からnまで、a_i"
          .latex=${String.raw`\sum_{i=1}^{n} a_i = a_1 + a_2 + a_3 + a_4 + a_5 + a_6 + a_7 + a_8 + a_9`}
        ></ui-math>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const inlineDefault = getMathHost(canvasElement, 'matrix-inline-default');
    const inlineLabeled = getMathHost(canvasElement, 'matrix-inline-labeled');
    const blockMathml = getMathHost(canvasElement, 'matrix-block-runtime-mathml');
    const blockLabel = getMathHost(canvasElement, 'matrix-block-runtime-label');
    await Promise.all([
      inlineDefault.updateComplete,
      inlineLabeled.updateComplete,
      blockMathml.updateComplete,
      blockLabel.updateComplete,
    ]);
    await Promise.all([
      waitForMathSettled(inlineDefault),
      waitForMathSettled(inlineLabeled),
      waitForMathSettled(blockMathml),
      waitForMathSettled(blockLabel),
    ]);

    const inlineDefaultContainer = getInlineContainer(inlineDefault);
    if (inlineDefaultContainer.getAttribute('role') !== 'math') {
      throw new Error('inline 基本ケースでは role="math" が必要です');
    }
    if (inlineDefaultContainer.hasAttribute('aria-label')) {
      throw new Error('mathml モードの inline で aria-label を出力してはいけません');
    }
    const inlineDefaultMath = getSlottedMathMl(inlineDefault);
    if (!inlineDefaultMath || inlineDefaultMath.hasAttribute('aria-hidden')) {
      throw new Error('mathml モードでは slotted MathML を公開する必要があります');
    }

    const inlineLabeledContainer = getInlineContainer(inlineLabeled);
    if (inlineLabeledContainer.getAttribute('aria-label') !== 'エックス プラス ワイ') {
      throw new Error('aria-label 後方互換入力で label モードへ遷移していません');
    }
    if (getSlottedMathMl(inlineLabeled)?.getAttribute('aria-hidden') !== 'true') {
      throw new Error('label モードの slotted MathML は SSR 側で aria-hidden="true" である必要があります');
    }

    const mathmlDisplay = getDisplayContainer(blockMathml);
    const mathmlContent = getMathContent(blockMathml);
    if (mathmlDisplay.hasAttribute('role')) {
      throw new Error('primary=false の block では role="region" を付与してはいけません');
    }
    if (mathmlContent.hasAttribute('aria-label')) {
      throw new Error('speech-mode="mathml" 明示時は aria-label を主要ラベルとして使ってはいけません');
    }
    const mathmlRuntimeMath = getRuntimeMathMl(blockMathml);
    if (!mathmlRuntimeMath || mathmlRuntimeMath.hasAttribute('aria-hidden')) {
      throw new Error('speech-mode="mathml" 明示時は runtime MathML を公開する必要があります');
    }

    const labelDisplay = getDisplayContainer(blockLabel);
    const labelContent = getMathContent(blockLabel);
    if (labelDisplay.getAttribute('role') !== 'region') {
      throw new Error('primary=true の block では role="region" が必要です');
    }
    if (labelDisplay.getAttribute('aria-label') !== PRIMARY_REGION_LABEL) {
      throw new Error('primary=true の block では region aria-label が必要です');
    }
    if (labelContent.getAttribute('aria-label') !== '総和シグマ、iは1からnまで、a_i') {
      throw new Error('speech-mode="label" の block で手動ラベルが反映されていません');
    }
    const labelRuntimeMath = getRuntimeMathMl(blockLabel);
    if (labelRuntimeMath?.getAttribute('aria-hidden') !== 'true') {
      throw new Error('speech-mode="label" では runtime MathML を aria-hidden にする必要があります');
    }
  },
};

export const ErrorStates: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-math
        id="error-static"
        block
        error-message="ビルド時に LaTeX を解析できませんでした。式を確認してください。"
        error-kind="build-failed"
        error-code="BUILD_KATEX_PARSE"
      ></ui-math>

      <ui-math
        id="error-runtime"
        show-error-source
        .latex=${String.raw`\frac{1}{2`}
      ></ui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const staticErrorHost = getMathHost(canvasElement, 'error-static');
    const runtimeErrorHost = getMathHost(canvasElement, 'error-runtime');
    await Promise.all([staticErrorHost.updateComplete, runtimeErrorHost.updateComplete]);
    await Promise.all([waitForMathSettled(staticErrorHost), waitForMathSettled(runtimeErrorHost)]);

    const staticError = getErrorBlock(staticErrorHost);
    if (!staticError) {
      throw new Error('external エラーケースで .math-error が描画されません');
    }
    if (staticError.getAttribute('data-tone') !== 'danger') {
      throw new Error('build-failed は danger トーンである必要があります');
    }
    if (staticError.hasAttribute('role')) {
      throw new Error('external エラーでは role="alert" を付与してはいけません');
    }
    if (getErrorTitle(staticErrorHost) !== '生成失敗') {
      throw new Error('build-failed の見出しが仕様どおりではありません');
    }
    if (getErrorCode(staticErrorHost) !== 'code: BUILD_KATEX_PARSE') {
      throw new Error('external エラーの error-code が表示されていません');
    }
    if (staticError.querySelector('details')) {
      throw new Error('show-error-source=false の external エラーで details を表示してはいけません');
    }

    const runtimeError = getErrorBlock(runtimeErrorHost);
    if (!runtimeError) throw new Error('author-invalid エラー UI が取得できません');
    if (runtimeError.getAttribute('role') !== 'alert') {
      throw new Error('author-invalid エラーでは role="alert" を付与する必要があります');
    }
    if (getErrorTitle(runtimeErrorHost) !== 'LaTeX構文エラー') {
      throw new Error('author-invalid エラー見出しが仕様どおりではありません');
    }
    const details = runtimeError.querySelector('details');
    const summary = runtimeError.querySelector('summary');
    if (!details || !summary) {
      throw new Error('show-error-source=true の author-invalid エラーでは details/summary が必要です');
    }
    if (summary.textContent.trim() !== ERROR_DETAILS_SUMMARY) {
      throw new Error('エラー詳細 summary 文言が仕様どおりではありません');
    }
    const sourceCode = runtimeError.querySelector('pre code');
    if (!(sourceCode?.textContent ?? '').includes(String.raw`\frac{1}{2`)) {
      throw new Error('author-invalid エラー詳細に入力 LaTeX が表示されていません');
    }
    if (runtimeErrorHost.shadowRoot?.querySelector('[role="math"]')) {
      throw new Error('エラー表示時は math ロール要素を同時表示してはいけません');
    }
  },
};

export const ErrorKindMatrix: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-math
        id="error-build-failed"
        error-message="ビルド工程で KaTeX の描画に失敗しました。"
        error-kind="build-failed"
      ></ui-math>
      <ui-math
        id="error-data-missing"
        error-message="参照された数式ソースが見つかりません。"
        error-kind="data-missing"
      ></ui-math>
      <ui-math
        id="error-runtime-failed"
        error-message="必要な実行時条件が揃わないため描画できません。"
        error-kind="runtime-failed"
      ></ui-math>
      <ui-math
        id="error-upstream-invalid"
        error-message="上流整形済み入力が契約違反です。"
        error-kind="upstream-invalid"
      ></ui-math>
      <ui-math
        id="error-unspecified"
        error-message="外部要因により描画できません。"
        error-kind="unspecified"
      ></ui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const expectations: ExternalErrorExpectation[] = [
      { id: 'error-build-failed', title: '生成失敗', tone: 'danger' },
      { id: 'error-data-missing', title: '欠落', tone: 'muted' },
      { id: 'error-runtime-failed', title: '実行時失敗', tone: 'danger' },
      { id: 'error-upstream-invalid', title: '上流契約違反', tone: 'danger' },
      { id: 'error-unspecified', title: '外部エラー', tone: 'muted' },
    ];

    const hosts = expectations.map(({ id }) => getMathHost(canvasElement, id));
    await Promise.all(hosts.map(async (host) => host.updateComplete));
    await Promise.all(hosts.map(async (host) => waitForMathSettled(host)));

    for (const expectation of expectations) {
      const host = getMathHost(canvasElement, expectation.id);
      const errorBlock = getErrorBlock(host);
      if (!errorBlock) {
        throw new Error(`${expectation.id} の external エラー UI が描画されません`);
      }
      if (errorBlock.getAttribute('data-tone') !== expectation.tone) {
        throw new Error(`${expectation.id} の error tone が仕様どおりではありません`);
      }
      if (getErrorTitle(host) !== expectation.title) {
        throw new Error(`${expectation.id} の見出しが仕様どおりではありません`);
      }
      if (!errorBlock.querySelector('.math-error-header')) {
        throw new Error(`${expectation.id} は共通エラー骨格を維持する必要があります`);
      }
    }
  },
};

export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-math
        id="boundary-error-priority"
        block
        error-message="上位レイヤで描画失敗を検出しました。"
        error-kind="runtime-failed"
        .latex=${String.raw`\frac{1}{2`}
      >
        <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
          <mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow>
        </math>
        <span class="katex-html" aria-hidden="true">a + b</span>
      </ui-math>

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

      <ui-math
        id="boundary-invalid-speech-mode"
        speech-mode="broken"
        aria-label="このラベルは主要読み上げ経路を変えない"
        .latex=${String.raw`x+y=z`}
      ></ui-math>

      <ui-math id="boundary-inline-primary" primary .latex=${String.raw`x^2+y^2=z^2`}></ui-math>
      <ui-math id="boundary-noop"></ui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const errorPriority = getMathHost(canvasElement, 'boundary-error-priority');
    const slotPriority = getMathHost(canvasElement, 'boundary-slot-priority');
    const emptyAria = getMathHost(canvasElement, 'boundary-empty-aria');
    const invalidSpeechMode = getMathHost(canvasElement, 'boundary-invalid-speech-mode');
    const inlinePrimary = getMathHost(canvasElement, 'boundary-inline-primary');
    const noop = getMathHost(canvasElement, 'boundary-noop');
    await Promise.all([
      errorPriority.updateComplete,
      slotPriority.updateComplete,
      emptyAria.updateComplete,
      invalidSpeechMode.updateComplete,
      inlinePrimary.updateComplete,
      noop.updateComplete,
    ]);
    await Promise.all([
      waitForMathSettled(errorPriority),
      waitForMathSettled(slotPriority),
      waitForMathSettled(emptyAria),
      waitForMathSettled(invalidSpeechMode),
      waitForMathSettled(inlinePrimary),
      waitForMathSettled(noop),
    ]);

    const errorPriorityError = getErrorBlock(errorPriority);
    if (!errorPriorityError) {
      throw new Error('error-message 優先ケースでエラー UI が必要です');
    }
    if (getRuntimeMathMl(errorPriority)) {
      throw new Error('error-message 優先ケースで runtime MathML を描画してはいけません');
    }
    if (errorPriority.shadowRoot?.querySelector('[role="math"]')) {
      throw new Error('error-message 優先ケースで math ロール要素を描画してはいけません');
    }

    if (getErrorBlock(slotPriority)) {
      throw new Error('slot 併用時は runtime 構文エラーより slot 表示を優先する必要があります');
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
    if (!emptyAriaMath || emptyAriaMath.hasAttribute('aria-hidden')) {
      throw new Error('空白 aria-label の場合は MathML を公開する必要があります');
    }

    const invalidSpeechInline = getInlineContainer(invalidSpeechMode);
    if (invalidSpeechInline.hasAttribute('aria-label')) {
      throw new Error('列挙外 speech-mode は mathml へフォールバックし、手動ラベルを主要経路にしてはいけません');
    }
    const invalidSpeechMath = getRuntimeMathMl(invalidSpeechMode);
    if (!invalidSpeechMath || invalidSpeechMath.hasAttribute('aria-hidden')) {
      throw new Error('列挙外 speech-mode は runtime MathML を公開する必要があります');
    }

    const inlinePrimaryContainer = getInlineContainer(inlinePrimary);
    if (inlinePrimaryContainer.getAttribute('role') !== 'math') {
      throw new Error('inline primary でも role="math" は維持される必要があります');
    }
    if (inlinePrimary.shadowRoot?.querySelector('[role="region"]')) {
      throw new Error('inline で role="region" を付与してはいけません');
    }

    if ((noop.shadowRoot?.children.length ?? 0) !== 0) {
      throw new Error('空入力時は no-op として何も描画してはいけません');
    }
  },
};

export const KeyboardInteraction: Story = {
  render: () => html`
    <div style="max-width: 300px;">
      <ui-math id="keyboard-scrollable" block primary .latex=${LONG_MATH_LATEX}></ui-math>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getMathHost(canvasElement, 'keyboard-scrollable');
    await host.updateComplete;
    await waitForMathSettled(host);

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

export const SettledEventContract: Story = {
  render: () => html`<ui-math id="settled-event-contract"></ui-math>`,
  play: async ({ canvasElement }) => {
    const host = getMathHost(canvasElement, 'settled-event-contract');
    await host.updateComplete;

    const settledPromise = waitForMathSettled(host);
    host.latex = String.raw`\frac{a+b}{c+d}`;
    await host.updateComplete;
    await settledPromise;

    if (!getRuntimeMathMl(host)) {
      throw new Error('math-settled 発火時には runtime 描画が安定している必要があります');
    }
  },
};

export const IdAnchorContract: Story = {
  render: () => html`
    <ui-math id="eq-pythagorean" block .latex=${String.raw`a^2 + b^2 = c^2`}></ui-math>
  `,
  play: async ({ canvasElement }) => {
    const host = getMathHost(canvasElement, 'eq-pythagorean');
    await host.updateComplete;
    await waitForMathSettled(host);

    const display = getDisplayContainer(host);
    if (host.id !== 'eq-pythagorean') {
      throw new Error('公開アンカー対象の host id が保持されていません');
    }
    if (display.id !== '') {
      throw new Error('内部 display コンテナの id ミラーを公開契約として前提にしてはいけません');
    }
  },
};

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
    await waitForMathSettled(host);

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

export const ForcedColorsContract: Story = {
  render: () =>
    html`<ui-math id="forced-colors-contract" .latex=${String.raw`x + y = z`}></ui-math>`,
  play: async ({ canvasElement }) => {
    const host = getMathHost(canvasElement, 'forced-colors-contract');
    await host.updateComplete;
    await waitForMathSettled(host);

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
