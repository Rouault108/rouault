import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './progress';
import { UiProgress } from './progress';

interface MatrixCase {
  id: string;
  value: number;
  max: number;
  label?: string;
  valueText?: string;
  ariaLabelledby?: string;
}

const MATRIX_DEFAULT_UPLOAD: MatrixCase = {
  id: 'matrix-default-upload',
  value: 24,
  max: 100,
  label: 'ファイルアップロード中',
};

const MATRIX_TOKEN_SUCCESS: MatrixCase = {
  id: 'matrix-token-success',
  value: 92,
  max: 100,
  label: '同期中',
};

const MATRIX_EXTERNAL_LABEL: MatrixCase = {
  id: 'matrix-external-label',
  value: 30,
  max: 100,
  label: 'このラベルは優先されない',
  ariaLabelledby: 'matrix-external-label-text',
};

const MATRIX_CUSTOM_VALUETEXT: MatrixCase = {
  id: 'matrix-custom-valuetext',
  value: 1,
  max: 3,
  label: '処理中',
  valueText: '3件中1件完了',
};

const toPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isNearlyEqual = (actual: number, expected: number, tolerance = 0.75): boolean =>
  Math.abs(actual - expected) <= tolerance;

const getProgress = (canvasElement: Element, id: string): UiProgress => {
  const progress = canvasElement.querySelector<UiProgress>(`#${id}`);
  if (!progress) {
    throw new Error(`#${id} が見つかりません`);
  }
  return progress;
};

const getTrack = (progress: UiProgress): HTMLElement => {
  const track = progress.shadowRoot?.querySelector<HTMLElement>('.track');
  if (!track) {
    throw new Error(`ui-progress#${progress.id} の .track が見つかりません`);
  }
  return track;
};

const getBar = (progress: UiProgress): HTMLElement => {
  const bar = progress.shadowRoot?.querySelector<HTMLElement>('.bar');
  if (!bar) {
    throw new Error(`ui-progress#${progress.id} の .bar が見つかりません`);
  }
  return bar;
};

const readNumericAttr = (element: Element, name: string): number => {
  const raw = element.getAttribute(name);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} が数値として解釈できません: ${raw ?? 'null'}`);
  }
  return parsed;
};

const assertProgressbarCoreA11y = (progress: UiProgress, expectedValueText?: string): void => {
  const track = getTrack(progress);

  if (track.getAttribute('role') !== 'progressbar') {
    throw new Error(`ui-progress#${progress.id} の role は progressbar である必要があります`);
  }

  const ariaValueNow = readNumericAttr(track, 'aria-valuenow');
  if (ariaValueNow !== progress.value) {
    throw new Error(
      `ui-progress#${progress.id} の aria-valuenow が不正です: expected=${String(progress.value)}, actual=${String(ariaValueNow)}`,
    );
  }

  const ariaValueMin = readNumericAttr(track, 'aria-valuemin');
  if (ariaValueMin !== 0) {
    throw new Error(`ui-progress#${progress.id} の aria-valuemin は 0 固定です`);
  }

  const ariaValueMax = readNumericAttr(track, 'aria-valuemax');
  if (ariaValueMax !== progress.max) {
    throw new Error(
      `ui-progress#${progress.id} の aria-valuemax が不正です: expected=${String(progress.max)}, actual=${String(ariaValueMax)}`,
    );
  }

  const expectedText =
    expectedValueText ??
    `${String(
      Math.round(
        progress.max > 0
          ? (Math.min(Math.max(progress.value, 0), progress.max) / progress.max) * 100
          : 0,
      ),
    )}%`;
  const actualText = track.getAttribute('aria-valuetext');
  if (actualText !== expectedText) {
    throw new Error(
      `ui-progress#${progress.id} の aria-valuetext が不正です: expected=${expectedText}, actual=${actualText ?? 'null'}`,
    );
  }

  if (track.hasAttribute('aria-live')) {
    throw new Error(
      `ui-progress#${progress.id} の progressbar に aria-live を直接付与してはいけません`,
    );
  }
};

const assertNoPartAndNoSlot = (progress: UiProgress): void => {
  const root = progress.shadowRoot;
  if (!root) {
    throw new Error(`ui-progress#${progress.id} の shadowRoot が見つかりません`);
  }

  if (root.querySelector('[part]')) {
    throw new Error(`ui-progress#${progress.id} は part 属性を公開してはいけません`);
  }

  if (root.querySelector('slot')) {
    throw new Error(`ui-progress#${progress.id} は slot を持ってはいけません`);
  }
};

const assertBarTransformRatio = (progress: UiProgress, expectedPercent: number): void => {
  const bar = getBar(progress);
  const transformDeclaration = bar.style.transform.trim();
  const ratioMatch = /scaleX\(([^)]+)\)/.exec(transformDeclaration);
  if (!ratioMatch) {
    throw new Error(
      `ui-progress#${progress.id} の transform 指定が不正です: ${transformDeclaration}`,
    );
  }
  const ratioText = ratioMatch[1];
  if (!ratioText) {
    throw new Error(
      `ui-progress#${progress.id} の scaleX 値が抽出できません: ${transformDeclaration}`,
    );
  }

  const actualRatio = Number.parseFloat(ratioText);
  if (!Number.isFinite(actualRatio)) {
    throw new Error(`ui-progress#${progress.id} の scaleX 値が不正です: ${transformDeclaration}`);
  }

  const expectedRatio = expectedPercent / 100;
  if (!isNearlyEqual(actualRatio, expectedRatio, 0.005)) {
    throw new Error(
      `ui-progress#${progress.id} の進捗率が不正です: expected=${String(expectedRatio)}, actual=${String(actualRatio)}`,
    );
  }
};

const meta: Meta<UiProgress> = {
  title: 'Components/Progress',
  component: 'ui-progress',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
完了までの進捗を可視化する progressbar コンポーネントです。
- value は 0..max にクランプ
- max <= 0 は 100 へフォールバック（開発時エラーログ）
- aria-valuetext は valueText 未指定時に割合（例: 33%）を自動生成
- aria-labelledby 指定時は aria-label より優先
- 公開スタイリングは CSS カスタムプロパティのみ（::part 不使用）
        `,
      },
    },
  },
  argTypes: {
    value: {
      control: 'number',
      description: '現在値（0 〜 max）',
      table: { type: { summary: 'number' }, defaultValue: { summary: '0' } },
    },
    max: {
      control: 'number',
      description: '最大値（0 以下は 100 にフォールバック）',
      table: { type: { summary: 'number' }, defaultValue: { summary: '100' } },
    },
    label: {
      control: 'text',
      description: 'aria-label として使うラベル',
      table: { type: { summary: 'string | undefined' } },
    },
    valueText: {
      name: 'value-text',
      control: 'text',
      description: 'aria-valuetext のカスタム読み上げ文言',
      table: { type: { summary: 'string | undefined' } },
    },
    ariaLabelledBy: {
      name: 'aria-labelledby',
      control: 'text',
      description: '外部ラベル要素への参照',
      table: { type: { summary: 'string | undefined' } },
    },
  },
};

export default meta;
type Story = StoryObj<UiProgress>;

export const Default: Story = {
  render: () => html`
    <div style="width: min(420px, 100%);">
      <ui-progress
        id="progress-default"
        value="50"
        max="100"
        label="ファイルアップロード中"
      ></ui-progress>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const progress = getProgress(canvasElement, 'progress-default');
    await progress.updateComplete;

    if (progress.value !== 50) {
      throw new Error(`value が不正です: ${String(progress.value)}`);
    }
    if (progress.max !== 100) {
      throw new Error(`max が不正です: ${String(progress.max)}`);
    }

    assertProgressbarCoreA11y(progress);

    const track = getTrack(progress);
    if (track.getAttribute('aria-label') !== 'ファイルアップロード中') {
      throw new Error('label 指定時は aria-label が設定される必要があります');
    }

    assertBarTransformRatio(progress, 50);
    assertNoPartAndNoSlot(progress);
  },
};

export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.875rem;
      }

      .cell {
        display: grid;
        gap: 0.5rem;
        width: min(420px, 100%);
      }

      .label {
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--fg-muted, #666);
      }

      .success-token {
        --ui-progress-track-height: 8px;
        --ui-progress-bar-background: rgb(18, 148, 74);
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <div class="label">default token x uploading</div>
        <ui-progress
          id="matrix-default-upload"
          value="${MATRIX_DEFAULT_UPLOAD.value}"
          max="${MATRIX_DEFAULT_UPLOAD.max}"
          label="${MATRIX_DEFAULT_UPLOAD.label}"
        ></ui-progress>
      </div>

      <div class="cell">
        <div class="label">custom token x near complete</div>
        <ui-progress
          id="matrix-token-success"
          class="success-token"
          value="${MATRIX_TOKEN_SUCCESS.value}"
          max="${MATRIX_TOKEN_SUCCESS.max}"
          label="${MATRIX_TOKEN_SUCCESS.label}"
        ></ui-progress>
      </div>

      <div class="cell">
        <div class="label">external label x in progress</div>
        <label id="matrix-external-label-text">ダウンロード中</label>
        <ui-progress
          id="matrix-external-label"
          value="${MATRIX_EXTERNAL_LABEL.value}"
          max="${MATRIX_EXTERNAL_LABEL.max}"
          label="${MATRIX_EXTERNAL_LABEL.label}"
          aria-labelledby="${MATRIX_EXTERNAL_LABEL.ariaLabelledby}"
        ></ui-progress>
      </div>

      <div class="cell">
        <div class="label">custom valuetext x step progress</div>
        <ui-progress
          id="matrix-custom-valuetext"
          value="${MATRIX_CUSTOM_VALUETEXT.value}"
          max="${MATRIX_CUSTOM_VALUETEXT.max}"
          label="${MATRIX_CUSTOM_VALUETEXT.label}"
          value-text="${MATRIX_CUSTOM_VALUETEXT.valueText}"
        ></ui-progress>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultUpload = getProgress(canvasElement, 'matrix-default-upload');
    const tokenSuccess = getProgress(canvasElement, 'matrix-token-success');
    const externalLabel = getProgress(canvasElement, 'matrix-external-label');
    const customValueText = getProgress(canvasElement, 'matrix-custom-valuetext');

    await Promise.all([
      defaultUpload.updateComplete,
      tokenSuccess.updateComplete,
      externalLabel.updateComplete,
      customValueText.updateComplete,
    ]);

    assertProgressbarCoreA11y(defaultUpload);
    assertBarTransformRatio(defaultUpload, 24);

    assertProgressbarCoreA11y(tokenSuccess);
    assertBarTransformRatio(tokenSuccess, 92);

    const tokenTrack = getTrack(tokenSuccess);
    const tokenBar = getBar(tokenSuccess);
    const tokenTrackHeight = toPx(getComputedStyle(tokenTrack).height);
    if (!isNearlyEqual(tokenTrackHeight, 8)) {
      throw new Error(`--ui-progress-track-height の反映が不正です: ${String(tokenTrackHeight)}px`);
    }
    if (getComputedStyle(tokenBar).backgroundColor !== 'rgb(18, 148, 74)') {
      throw new Error('--ui-progress-bar-background の反映が不正です');
    }

    assertProgressbarCoreA11y(externalLabel);
    const externalTrack = getTrack(externalLabel);
    if (externalTrack.getAttribute('aria-labelledby') !== 'matrix-external-label-text') {
      throw new Error('aria-labelledby が progressbar 要素に伝播していません');
    }
    if (externalTrack.hasAttribute('aria-label')) {
      throw new Error('aria-labelledby 指定時は aria-label より優先される必要があります');
    }

    assertProgressbarCoreA11y(customValueText, '3件中1件完了');
    assertBarTransformRatio(customValueText, (1 / 3) * 100);
  },
};

export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem; width: min(420px, 100%);">
      <ui-progress
        id="boundary-negative-value"
        value="-10"
        max="100"
        label="負値クランプ"
      ></ui-progress>

      <ui-progress
        id="boundary-overflow-value"
        value="130"
        max="100"
        label="超過クランプ"
      ></ui-progress>

      <ui-progress id="boundary-invalid-max" value="24" max="0" label="max不正値"></ui-progress>

      <ui-progress
        id="boundary-auto-valuetext"
        value="1"
        max="3"
        label="割合読み上げ"
      ></ui-progress>

      <ui-progress id="boundary-no-label" value="40" max="100"></ui-progress>

      <ui-progress
        id="boundary-non-finite"
        value="10"
        max="20"
        label="非数値フォールバック"
      ></ui-progress>

      <label id="boundary-priority-label">外部ラベル優先</label>
      <ui-progress
        id="boundary-label-priority"
        value="40"
        max="100"
        label="内部ラベル"
        aria-labelledby="boundary-priority-label"
      ></ui-progress>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const negativeValue = getProgress(canvasElement, 'boundary-negative-value');
    const overflowValue = getProgress(canvasElement, 'boundary-overflow-value');
    const invalidMax = getProgress(canvasElement, 'boundary-invalid-max');
    const autoValueText = getProgress(canvasElement, 'boundary-auto-valuetext');
    const noLabel = getProgress(canvasElement, 'boundary-no-label');
    const nonFinite = getProgress(canvasElement, 'boundary-non-finite');
    const labelPriority = getProgress(canvasElement, 'boundary-label-priority');

    await Promise.all([
      negativeValue.updateComplete,
      overflowValue.updateComplete,
      invalidMax.updateComplete,
      autoValueText.updateComplete,
      noLabel.updateComplete,
      nonFinite.updateComplete,
      labelPriority.updateComplete,
    ]);

    if (negativeValue.value !== 0) {
      throw new Error(
        `value < 0 は 0 にクランプされる必要があります: ${String(negativeValue.value)}`,
      );
    }
    if (negativeValue.getAttribute('value') !== '0') {
      throw new Error('クランプ後の value 属性が 0 に正規化されていません');
    }
    assertProgressbarCoreA11y(negativeValue);
    assertBarTransformRatio(negativeValue, 0);

    if (overflowValue.value !== 100) {
      throw new Error(
        `value > max は max にクランプされる必要があります: ${String(overflowValue.value)}`,
      );
    }
    if (overflowValue.getAttribute('value') !== '100') {
      throw new Error('超過 value の属性が max に正規化されていません');
    }
    assertProgressbarCoreA11y(overflowValue);
    assertBarTransformRatio(overflowValue, 100);

    const originalError = console.error;
    const capturedErrors: string[] = [];
    console.error = (...args: unknown[]) => {
      const message = args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ');
      capturedErrors.push(message);
    };

    try {
      invalidMax.max = 0;
      await invalidMax.updateComplete;
    } finally {
      console.error = originalError;
    }

    if (invalidMax.max !== 100) {
      throw new Error(
        `max <= 0 は 100 にフォールバックされる必要があります: ${String(invalidMax.max)}`,
      );
    }
    if (!capturedErrors.some((message) => message.includes('[ui-progress]'))) {
      throw new Error('max 不正値時に [ui-progress] のエラーログが必要です');
    }
    assertProgressbarCoreA11y(invalidMax);

    assertProgressbarCoreA11y(autoValueText, '33%');
    assertBarTransformRatio(autoValueText, (1 / 3) * 100);

    nonFinite.max = Number.NaN;
    nonFinite.value = Number.POSITIVE_INFINITY;
    await nonFinite.updateComplete;
    if (nonFinite.max !== 100) {
      throw new Error(
        `非数値 max は 100 にフォールバックされる必要があります: ${String(nonFinite.max)}`,
      );
    }
    if (nonFinite.value !== 0) {
      throw new Error(
        `非数値 value は 0 にフォールバックされる必要があります: ${String(nonFinite.value)}`,
      );
    }
    assertProgressbarCoreA11y(nonFinite, '0%');
    assertBarTransformRatio(nonFinite, 0);

    const noLabelTrack = getTrack(noLabel);
    if (noLabelTrack.hasAttribute('aria-label')) {
      throw new Error('label 未指定時は aria-label 属性を除去する必要があります');
    }
    if (noLabelTrack.getAttribute('aria-label') === 'undefined') {
      throw new Error('aria-label="undefined" が出力されてはいけません');
    }

    const labelPriorityTrack = getTrack(labelPriority);
    if (labelPriorityTrack.getAttribute('aria-labelledby') !== 'boundary-priority-label') {
      throw new Error('aria-labelledby が優先されていません');
    }
    if (labelPriorityTrack.hasAttribute('aria-label')) {
      throw new Error('aria-labelledby と label 併用時は aria-label を出力してはいけません');
    }

    for (const progress of [
      negativeValue,
      overflowValue,
      invalidMax,
      autoValueText,
      noLabel,
      nonFinite,
      labelPriority,
    ]) {
      assertNoPartAndNoSlot(progress);
    }

    const styles = String(UiProgress.styles);
    const normalizedStyles = styles.replace(/\s+/g, '').toLowerCase();
    if (!styles.includes('var(--duration-normal')) {
      throw new Error('トランジション duration token の利用が必須です');
    }
    if (!styles.includes('var(--ease-out')) {
      throw new Error('トランジション easing token の利用が必須です');
    }
    if (!normalizedStyles.includes('transition:transformvar(--duration-normal')) {
      throw new Error('トランジションは transform プロパティで定義する必要があります');
    }
    if (!normalizedStyles.includes('transform-origin:leftcenter')) {
      throw new Error('transform-origin:left center の定義が必要です');
    }
    if (!styles.includes('--ui-progress-track-height')) {
      throw new Error('公開トークン --ui-progress-track-height が必要です');
    }
    if (!styles.includes('--ui-progress-bar-background')) {
      throw new Error('公開トークン --ui-progress-bar-background が必要です');
    }
    if (!styles.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error('Reduced Motion 対応が必要です');
    }
    if (!styles.includes('@media (forced-colors: active)')) {
      throw new Error('Forced Colors 対応が必要です');
    }
    if (!normalizedStyles.includes('border:1pxsolidcanvastext')) {
      throw new Error('Forced Colors では track に CanvasText ボーダーが必要です');
    }
    if (!normalizedStyles.includes('background:highlight')) {
      throw new Error('Forced Colors では bar に Highlight 背景が必要です');
    }
    if (!styles.includes('@media print')) {
      throw new Error('印刷スタイルが必要です');
    }
    if (!normalizedStyles.includes('.bar{display:none;')) {
      throw new Error('印刷時は bar を非表示にする必要があります');
    }
    if (!normalizedStyles.includes('attr(aria-valuetext)')) {
      throw new Error('印刷時は aria-valuetext をテキスト表示する必要があります');
    }
    if (!normalizedStyles.includes('font-variant-numeric:tabular-nums')) {
      throw new Error('印刷時テキストには tabular-nums を適用する必要があります');
    }
  },
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
        id="dark-custom-token"
        style="--ui-progress-track-height: 6px; --ui-progress-bar-background: rgb(18, 148, 74);"
        value="68"
        max="100"
        label="ダークモード成功"
      ></ui-progress>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const darkDefault = getProgress(canvasElement, 'dark-default');
    const darkCustom = getProgress(canvasElement, 'dark-custom-token');
    await Promise.all([darkDefault.updateComplete, darkCustom.updateComplete]);

    assertProgressbarCoreA11y(darkDefault);
    assertProgressbarCoreA11y(darkCustom);
    assertBarTransformRatio(darkDefault, 44);
    assertBarTransformRatio(darkCustom, 68);

    const customTrack = getTrack(darkCustom);
    const customBar = getBar(darkCustom);
    const customTrackHeight = toPx(getComputedStyle(customTrack).height);
    if (!isNearlyEqual(customTrackHeight, 6)) {
      throw new Error(
        `ダークモード時の track 高さトークン反映が不正です: ${String(customTrackHeight)}px`,
      );
    }
    const barBg = getComputedStyle(customBar).backgroundColor;
    if (barBg !== 'rgb(18, 148, 74)') {
      throw new Error(`ダークモード時の bar 背景色反映が不正です: ${barBg}`);
    }
  },
};
