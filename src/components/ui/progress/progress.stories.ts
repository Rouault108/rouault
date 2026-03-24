import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './progress';
import { UiProgress } from './progress';

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

const getFill = (progress: UiProgress): HTMLElement => {
  const fill = progress.shadowRoot?.querySelector<HTMLElement>('.fill');
  if (!fill) {
    throw new Error(`ui-progress#${progress.id} の .fill が見つかりません`);
  }
  return fill;
};

const getPrintValue = (progress: UiProgress): HTMLElement => {
  const printValue = progress.shadowRoot?.querySelector<HTMLElement>('.print-value');
  if (!printValue) {
    throw new Error(`ui-progress#${progress.id} の .print-value が見つかりません`);
  }
  return printValue;
};

const readNumericAttr = (element: Element, name: string): number => {
  const raw = element.getAttribute(name);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} が数値として解釈できません: ${raw ?? 'null'}`);
  }
  return parsed;
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

const assertHostProgressbarA11y = (
  progress: UiProgress,
  expected: {
    valueNow: number;
    valueMax: number;
    valueText?: string;
    label?: string;
    labelRef?: string;
  },
): void => {
  if (progress.getAttribute('role') !== 'progressbar') {
    throw new Error(`ui-progress#${progress.id} の role はホストに付与される必要があります`);
  }

  if (readNumericAttr(progress, 'aria-valuenow') !== expected.valueNow) {
    throw new Error(`ui-progress#${progress.id} の aria-valuenow が不正です`);
  }

  if (readNumericAttr(progress, 'aria-valuemin') !== 0) {
    throw new Error(`ui-progress#${progress.id} の aria-valuemin は 0 固定です`);
  }

  if (readNumericAttr(progress, 'aria-valuemax') !== expected.valueMax) {
    throw new Error(`ui-progress#${progress.id} の aria-valuemax が不正です`);
  }

  const expectedValueText = expected.valueText ?? `${String(Math.round((expected.valueNow / expected.valueMax) * 100))}%`;
  if (progress.getAttribute('aria-valuetext') !== expectedValueText) {
    throw new Error(`ui-progress#${progress.id} の aria-valuetext が不正です`);
  }

  if (expected.labelRef !== undefined) {
    if (progress.getAttribute('aria-labelledby') !== expected.labelRef) {
      throw new Error(`ui-progress#${progress.id} の aria-labelledby が不正です`);
    }
    if (progress.hasAttribute('aria-label')) {
      throw new Error(`ui-progress#${progress.id} は labelRef 指定時に aria-label を出力してはいけません`);
    }
  } else if (expected.label !== undefined) {
    if (progress.getAttribute('aria-label') !== expected.label) {
      throw new Error(`ui-progress#${progress.id} の aria-label が不正です`);
    }
    if (progress.hasAttribute('aria-labelledby')) {
      throw new Error(`ui-progress#${progress.id} は label 指定時に aria-labelledby を出力してはいけません`);
    }
  }

  if (progress.hasAttribute('aria-live')) {
    throw new Error(`ui-progress#${progress.id} の progressbar に aria-live を直接付与してはいけません`);
  }
};

const assertFillRatio = (progress: UiProgress, expectedRatio: number): void => {
  const fill = getFill(progress);
  const inlineStyle = fill.getAttribute('style') ?? '';
  const ratioMatch = /--_ui-progress-ratio:\s*([^;]+)/u.exec(inlineStyle);
  if (!ratioMatch?.[1]) {
    throw new Error(`ui-progress#${progress.id} の内部進捗率が見つかりません`);
  }

  const actualRatio = Number.parseFloat(ratioMatch[1]);
  if (!Number.isFinite(actualRatio)) {
    throw new Error(`ui-progress#${progress.id} の内部進捗率が数値ではありません`);
  }

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
完了へ向かう決定進捗専用の progressbar です。
- 意味主体はホスト ui-progress
- 公開入力は value / max / label / labelRef / valueText
- labelRef 指定時は label にフォールバックしません
- valueText 未指定時は四捨五入した整数百分率を自動生成します
- 公開スタイル面は CSS Custom Properties のみです
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
  play: async ({ canvasElement }) => {
    const progress = getProgress(canvasElement, LABELLED_CASE.id);
    await progress.updateComplete;

    assertHostProgressbarA11y(progress, {
      valueNow: 24,
      valueMax: 100,
      label: 'ファイルアップロード中',
    });
    assertFillRatio(progress, 0.24);

    const printValue = getPrintValue(progress);
    if (printValue.textContent.trim() !== '24%') {
      throw new Error('valueText 未指定時は自動割合文言を印刷テキストとして持つ必要があります');
    }

    assertNoPartAndNoSlot(progress);
  },
};

export const NamingContract: Story = {
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
  play: async ({ canvasElement }) => {
    const labelled = getProgress(canvasElement, LABELLED_CASE.id);
    const external = getProgress(canvasElement, EXTERNAL_LABEL_CASE.id);
    const valueText = getProgress(canvasElement, VALUE_TEXT_CASE.id);
    await Promise.all([labelled.updateComplete, external.updateComplete, valueText.updateComplete]);

    assertHostProgressbarA11y(labelled, {
      valueNow: 24,
      valueMax: 100,
      label: 'ファイルアップロード中',
    });

    assertHostProgressbarA11y(external, {
      valueNow: 30,
      valueMax: 100,
      labelRef: 'progress-external-label-text',
    });
    assertFillRatio(external, 0.3);

    assertHostProgressbarA11y(valueText, {
      valueNow: 1,
      valueMax: 3,
      label: '同期中',
      valueText: '3件中1件完了',
    });
    if (getPrintValue(valueText).textContent.trim() !== '3件中1件完了') {
      throw new Error('valueText は印刷時にも可視テキスト化できる内容である必要があります');
    }
  },
};

export const ContractViolations: Story = {
  render: () => html`
    <div
      id="contract-violations-root"
      style="display: grid; gap: 0.75rem; width: min(420px, 100%);"
    ></div>
  `,
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>('#contract-violations-root');
    if (!root) {
      throw new Error('契約違反用の描画先が見つかりません');
    }

    const originalWarn = console.warn;
    const capturedWarnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      capturedWarnings.push(args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' '));
    };

    try {
      const invalidMax = document.createElement('ui-progress');
      invalidMax.id = 'progress-invalid-max';
      invalidMax.value = 24;
      invalidMax.max = 0;
      invalidMax.label = 'max 不正';

      const negativeValue = document.createElement('ui-progress');
      negativeValue.id = 'progress-negative-value';
      negativeValue.value = -10;
      negativeValue.max = 100;
      negativeValue.label = '負値';

      const overflowValue = document.createElement('ui-progress');
      overflowValue.id = 'progress-overflow-value';
      overflowValue.value = 130;
      overflowValue.max = 100;
      overflowValue.label = '超過';

      const invalidLabelRef = document.createElement('ui-progress');
      invalidLabelRef.id = 'progress-invalid-label-ref';
      invalidLabelRef.value = 40;
      invalidLabelRef.max = 100;
      invalidLabelRef.label = 'フォールバックしてはいけない';
      invalidLabelRef.labelRef = 'still-missing-label';

      const missingName = document.createElement('ui-progress');
      missingName.id = 'progress-missing-name';
      missingName.value = 50;
      missingName.max = 100;
      missingName.label = ' ';

      root.append(invalidMax, negativeValue, overflowValue, invalidLabelRef, missingName);

      await Promise.all([
        invalidMax.updateComplete,
        negativeValue.updateComplete,
        overflowValue.updateComplete,
        invalidLabelRef.updateComplete,
        missingName.updateComplete,
      ]);
    } finally {
      console.warn = originalWarn;
    }

    const invalidMax = getProgress(canvasElement, 'progress-invalid-max');
    const negativeValue = getProgress(canvasElement, 'progress-negative-value');
    const overflowValue = getProgress(canvasElement, 'progress-overflow-value');
    const invalidLabelRef = getProgress(canvasElement, 'progress-invalid-label-ref');
    const missingName = getProgress(canvasElement, 'progress-missing-name');

    if (!capturedWarnings.some((message) => message.includes('max は 0 より大きい有限数'))) {
      throw new Error('max 契約違反の警告が必要です');
    }
    if (!capturedWarnings.some((message) => message.includes('value は 0 以上'))) {
      throw new Error('負値 value 契約違反の警告が必要です');
    }
    if (!capturedWarnings.some((message) => message.includes('value は max 以下'))) {
      throw new Error('value > max 契約違反の警告が必要です');
    }
    if (!capturedWarnings.some((message) => message.includes('labelRef の参照先が見つかりません'))) {
      throw new Error('無効 labelRef の警告が必要です');
    }
    if (!capturedWarnings.some((message) => message.includes('アクセシブル名が必要'))) {
      throw new Error('無名状態の警告が必要です');
    }

    assertHostProgressbarA11y(invalidMax, {
      valueNow: 24,
      valueMax: 100,
      label: 'max 不正',
    });
    assertFillRatio(invalidMax, 0.24);

    assertHostProgressbarA11y(negativeValue, {
      valueNow: 0,
      valueMax: 100,
      label: '負値',
    });
    assertFillRatio(negativeValue, 0);

    assertHostProgressbarA11y(overflowValue, {
      valueNow: 100,
      valueMax: 100,
      label: '超過',
    });
    assertFillRatio(overflowValue, 1);

    if (invalidLabelRef.hasAttribute('aria-label')) {
      throw new Error('無効 labelRef 時に label へ黙ってフォールバックしてはいけません');
    }
    if (invalidLabelRef.hasAttribute('aria-labelledby')) {
      throw new Error('無効 labelRef 時に未解決 aria-labelledby を公開してはいけません');
    }

    if (missingName.hasAttribute('aria-label') || missingName.hasAttribute('aria-labelledby')) {
      throw new Error('無名状態は契約違反として扱い、名前属性を捏造してはいけません');
    }
  },
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
  play: async ({ canvasElement }) => {
    const progress = getProgress(canvasElement, 'progress-custom-tokens');
    await progress.updateComplete;

    assertHostProgressbarA11y(progress, {
      valueNow: 92,
      valueMax: 100,
      label: 'カスタムトークン',
    });

    const track = getTrack(progress);
    const fill = getFill(progress);
    const trackHeight = toPx(getComputedStyle(track).height);
    if (!isNearlyEqual(trackHeight, 8)) {
      throw new Error(`--ui-progress-track-size の反映が不正です: ${String(trackHeight)}px`);
    }
    if (getComputedStyle(fill).backgroundColor !== 'rgb(18, 148, 74)') {
      throw new Error('--ui-progress-fill-color の反映が不正です');
    }
    if (getComputedStyle(track).backgroundColor !== 'rgb(224, 230, 224)') {
      throw new Error('--ui-progress-track-color の反映が不正です');
    }

    const styles = String(UiProgress.styles);
    const normalizedStyles = styles.replace(/\s+/g, '').toLowerCase();
    if (!styles.includes('--ui-progress-track-size')) {
      throw new Error('公開トークン --ui-progress-track-size が必要です');
    }
    if (!styles.includes('--ui-progress-fill-color')) {
      throw new Error('公開トークン --ui-progress-fill-color が必要です');
    }
    if (!styles.includes('--ui-progress-track-color')) {
      throw new Error('公開トークン --ui-progress-track-color が必要です');
    }
    if (!styles.includes('--ui-progress-radius')) {
      throw new Error('公開トークン --ui-progress-radius が必要です');
    }
    if (!styles.includes('--ui-progress-duration')) {
      throw new Error('公開トークン --ui-progress-duration が必要です');
    }
    if (!styles.includes('--ui-progress-easing')) {
      throw new Error('公開トークン --ui-progress-easing が必要です');
    }
    if (styles.includes('--ui-progress-track-height') || styles.includes('--ui-progress-bar-background')) {
      throw new Error('旧公開トークン名を残してはいけません');
    }
    if (!styles.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error('Reduced Motion 対応が必要です');
    }
    if (!styles.includes('@media (forced-colors: active)')) {
      throw new Error('Forced Colors 対応が必要です');
    }
    if (!styles.includes('@media print')) {
      throw new Error('印刷スタイルが必要です');
    }
    if (!normalizedStyles.includes('.track{display:none;')) {
      throw new Error('印刷時は視覚バーを非表示にする必要があります');
    }
    if (normalizedStyles.includes('attr(aria-valuetext)')) {
      throw new Error('印刷値を CSS generated content のみに依存してはいけません');
    }
    if (!normalizedStyles.includes('font-variant-numeric:tabular-nums')) {
      throw new Error('印刷テキストには tabular-nums を適用する必要があります');
    }

    assertNoPartAndNoSlot(progress);
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
        id="dark-custom"
        style="--ui-progress-track-size: 6px; --ui-progress-fill-color: rgb(18, 148, 74);"
        value="68"
        max="100"
        label="ダークモード補助"
      ></ui-progress>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const darkDefault = getProgress(canvasElement, 'dark-default');
    const darkCustom = getProgress(canvasElement, 'dark-custom');
    await Promise.all([darkDefault.updateComplete, darkCustom.updateComplete]);

    assertHostProgressbarA11y(darkDefault, {
      valueNow: 44,
      valueMax: 100,
      label: 'ダークモード進捗',
    });
    assertHostProgressbarA11y(darkCustom, {
      valueNow: 68,
      valueMax: 100,
      label: 'ダークモード補助',
    });
    assertFillRatio(darkDefault, 0.44);
    assertFillRatio(darkCustom, 0.68);

    const customTrackHeight = toPx(getComputedStyle(getTrack(darkCustom)).height);
    if (!isNearlyEqual(customTrackHeight, 6)) {
      throw new Error(`ダークモード時の track 高さトークン反映が不正です: ${String(customTrackHeight)}px`);
    }
  },
};
