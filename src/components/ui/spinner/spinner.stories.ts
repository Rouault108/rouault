import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './spinner';
import type { SpinnerSize, UiSpinner } from './spinner';

const SPINNER_SIZES = ['default', 'lg'] as const satisfies SpinnerSize[];

const toPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isNearlyEqual = (actual: number, expected: number, tolerance = 0.75): boolean =>
  Math.abs(actual - expected) <= tolerance;

const getSpinner = (canvasElement: Element, id: string): UiSpinner => {
  const spinner = canvasElement.querySelector<UiSpinner>(`#${id}`);
  if (!spinner) {
    throw new Error(`#${id} が見つかりません`);
  }
  return spinner;
};

const getSvg = (spinner: UiSpinner): SVGSVGElement => {
  const svg = spinner.shadowRoot?.querySelector<SVGSVGElement>('svg');
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error(`ui-spinner#${spinner.id} の svg が見つかりません`);
  }
  return svg;
};

const getCircle = (spinner: UiSpinner): SVGCircleElement => {
  const circle = spinner.shadowRoot?.querySelector<SVGCircleElement>('circle.spinner-circle');
  if (!(circle instanceof SVGCircleElement)) {
    throw new Error(`ui-spinner#${spinner.id} の circle が見つかりません`);
  }
  return circle;
};

const assertStatusA11y = (spinner: UiSpinner, expectedLabel: string): void => {
  if (spinner.getAttribute('role') !== 'status') {
    throw new Error(`ui-spinner#${spinner.id} の role は status である必要があります`);
  }

  if (spinner.getAttribute('aria-label') !== expectedLabel) {
    throw new Error(
      `ui-spinner#${spinner.id} の aria-label が不正です: expected=${expectedLabel}, actual=${spinner.getAttribute('aria-label') ?? 'null'}`,
    );
  }
};

const assertDefaultSizeEqualsFontSize = (spinner: UiSpinner): void => {
  const style = getComputedStyle(spinner);
  const width = toPx(style.width);
  const fontSize = toPx(style.fontSize);

  if (!isNearlyEqual(width, fontSize)) {
    throw new Error(
      `size="default" は 1em 想定です: width=${String(width)}px, fontSize=${String(fontSize)}px`,
    );
  }
};

const meta: Meta<UiSpinner> = {
  title: 'Components/Spinner',
  component: 'ui-spinner',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
SVGベースのローディングスピナーです。
- host が role="status" と aria-label を担い、内部 SVG は aria-hidden で隠蔽
- size は default(1em) / lg(--icon-xl) を提供
- prefers-reduced-motion では連続アニメーションを停止
        `,
      },
    },
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: SPINNER_SIZES,
      description: 'スピナーサイズ',
      table: { type: { summary: "'default' | 'lg'" }, defaultValue: { summary: "'default'" } },
    },
    label: {
      name: 'aria-label',
      control: 'text',
      description: 'スクリーンリーダー向けラベル',
      table: { type: { summary: 'string' }, defaultValue: { summary: '"読み込み中"' } },
    },
  },
};

export default meta;
type Story = StoryObj<UiSpinner>;

export const Default: Story = {
  render: () => html`<ui-spinner id="default-spinner"></ui-spinner>`,
  play: async ({ canvasElement }) => {
    const spinner = getSpinner(canvasElement, 'default-spinner');
    await spinner.updateComplete;

    assertStatusA11y(spinner, '読み込み中');
    assertDefaultSizeEqualsFontSize(spinner);

    const svg = getSvg(spinner);
    if (svg.getAttribute('viewBox') !== '0 0 50 50') {
      throw new Error('viewBox は "0 0 50 50" である必要があります');
    }
    if (svg.getAttribute('aria-hidden') !== 'true') {
      throw new Error('内部 SVG は aria-hidden="true" である必要があります');
    }
    if (svg.getAttribute('focusable') !== 'false') {
      throw new Error('内部 SVG は focusable="false" である必要があります');
    }

    const circle = getCircle(spinner);
    const circleStyle = getComputedStyle(circle);
    if (circleStyle.strokeLinecap !== 'round') {
      throw new Error('stroke-linecap は round である必要があります');
    }
  },
};

export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        --icon-xl: 40px;
        display: grid;
        gap: 1rem;
      }

      .cell {
        display: grid;
        gap: 0.5rem;
      }

      .label {
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--fg-muted, #666);
      }

      .inline-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        min-height: 44px;
        padding-inline: 0.75rem;
      }

      .overlay {
        display: grid;
        place-items: center;
        min-height: 96px;
        border: var(--border-width, 1px) solid var(--border-default, #d7d7d7);
        border-radius: var(--radius-md, 6px);
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <div class="label">default x inline-saving</div>
        <button id="matrix-button" class="inline-button" disabled>
          <ui-spinner id="matrix-inline-default" size="default" aria-label="保存中"></ui-spinner>
          <span>保存中...</span>
        </button>
      </div>

      <div class="cell">
        <div class="label">lg x overlay-page-loading</div>
        <div id="matrix-overlay" class="overlay">
          <ui-spinner id="matrix-overlay-lg" size="lg" aria-label="ページを読み込み中"></ui-spinner>
        </div>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const inlineSpinner = getSpinner(canvasElement, 'matrix-inline-default');
    const overlaySpinner = getSpinner(canvasElement, 'matrix-overlay-lg');
    await Promise.all([inlineSpinner.updateComplete, overlaySpinner.updateComplete]);

    assertStatusA11y(inlineSpinner, '保存中');
    assertStatusA11y(overlaySpinner, 'ページを読み込み中');

    if (inlineSpinner.size !== 'default') {
      throw new Error(`inline spinner の size が不正です: ${inlineSpinner.size}`);
    }
    if (overlaySpinner.size !== 'lg') {
      throw new Error(`overlay spinner の size が不正です: ${overlaySpinner.size}`);
    }

    assertDefaultSizeEqualsFontSize(inlineSpinner);

    const overlayWidth = toPx(getComputedStyle(overlaySpinner).width);
    if (!isNearlyEqual(overlayWidth, 40)) {
      throw new Error(`size="lg" は --icon-xl(40px) に追従する必要があります: ${String(overlayWidth)}px`);
    }

    const button = canvasElement.querySelector<HTMLButtonElement>('#matrix-button');
    if (!(button instanceof HTMLButtonElement) || !button.disabled) {
      throw new Error('inline 状態のボタンは disabled である必要があります');
    }

    const overlay = canvasElement.querySelector<HTMLElement>('#matrix-overlay');
    if (!(overlay instanceof HTMLElement)) {
      throw new Error('#matrix-overlay が見つかりません');
    }
    if (overlay.getAttribute('role') === 'status') {
      throw new Error('外側コンテナに role="status" を重複付与してはいけません');
    }
  },
};

export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem; font-size: 18px;">
      <ui-spinner id="boundary-invalid-size" size="unknown"></ui-spinner>
      <ui-spinner id="boundary-empty-label" aria-label="   "></ui-spinner>
      <ui-spinner id="boundary-role-override" role="progressbar" aria-label="同期中"></ui-spinner>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidSize = getSpinner(canvasElement, 'boundary-invalid-size');
    const emptyLabel = getSpinner(canvasElement, 'boundary-empty-label');
    const roleOverride = getSpinner(canvasElement, 'boundary-role-override');

    await Promise.all([invalidSize.updateComplete, emptyLabel.updateComplete, roleOverride.updateComplete]);

    if (invalidSize.size !== 'default') {
      throw new Error(`無効 size は default にフォールバックする必要があります: ${invalidSize.size}`);
    }
    if (invalidSize.getAttribute('size') !== 'default') {
      throw new Error('無効 size の属性値は default へ正規化される必要があります');
    }
    assertDefaultSizeEqualsFontSize(invalidSize);

    assertStatusA11y(emptyLabel, '読み込み中');

    assertStatusA11y(roleOverride, '同期中');
    if (roleOverride.getAttribute('role') !== 'status') {
      throw new Error('role の上書き試行があっても status を維持する必要があります');
    }

    const svg = getSvg(roleOverride);
    if (svg.hasAttribute('role')) {
      throw new Error('内部 SVG に role を付与してはいけません');
    }
  },
};
