import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './skeleton';
import type { SkeletonVariant, UiSkeleton } from './skeleton';

const SKELETON_VARIANTS = ['text', 'circular', 'rectangular'] as const satisfies SkeletonVariant[];

const toPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isNearlyEqual = (actual: number, expected: number, tolerance = 0.75): boolean =>
  Math.abs(actual - expected) <= tolerance;

const getSkeleton = (canvasElement: Element, id: string): UiSkeleton => {
  const skeleton = canvasElement.querySelector<UiSkeleton>(`#${id}`);
  if (!skeleton) {
    throw new Error(`#${id} が見つかりません`);
  }
  return skeleton;
};

const assertAriaHidden = (skeleton: UiSkeleton): void => {
  if (skeleton.getAttribute('aria-hidden') !== 'true') {
    throw new Error(`ui-skeleton#${skeleton.id} は aria-hidden="true" を維持する必要があります`);
  }
};

const assertAnimatedState = (skeleton: UiSkeleton, shouldAnimate: boolean): void => {
  const afterStyle = getComputedStyle(skeleton, '::after');
  const animationName = afterStyle.animationName;

  if (shouldAnimate && !animationName.includes('ui-skeleton-shimmer')) {
    throw new Error(`ui-skeleton#${skeleton.id} は shimmer アニメーションを持つ必要があります`);
  }

  if (!shouldAnimate && animationName !== 'none') {
    throw new Error(`ui-skeleton#${skeleton.id} は animation=none である必要があります`);
  }
};

const meta: Meta<UiSkeleton> = {
  title: 'Components/Skeleton',
  component: 'ui-skeleton',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
読み込み中プレースホルダーのコンポーネントです。
- variant: text / circular / rectangular
- デフォルトは静止表示（animated は opt-in）
- host は常に aria-hidden="true" を維持
- prefers-reduced-motion, forced-colors, print を考慮
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: SKELETON_VARIANTS,
      description: 'スケルトン形状バリアント',
      table: {
        type: { summary: "'text' | 'circular' | 'rectangular'" },
        defaultValue: { summary: "'rectangular'" },
      },
    },
    width: {
      control: 'text',
      description: '幅（CSS単位）',
      table: { type: { summary: 'string' } },
    },
    height: {
      control: 'text',
      description: '高さ（CSS単位）',
      table: { type: { summary: 'string' } },
    },
    animated: {
      control: 'boolean',
      description: 'Shimmer アニメーション',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<UiSkeleton>;

export const Default: Story = {
  render: () => html`<ui-skeleton id="default-skeleton" variant="text" width="72%"></ui-skeleton>`,
  play: async ({ canvasElement }) => {
    const skeleton = getSkeleton(canvasElement, 'default-skeleton');
    await skeleton.updateComplete;

    assertAriaHidden(skeleton);

    if (skeleton.variant !== 'text') {
      throw new Error(`default の variant が不正です: ${skeleton.variant}`);
    }

    const style = getComputedStyle(skeleton);
    const fontSize = toPx(style.fontSize);
    const height = toPx(style.height);

    if (!isNearlyEqual(height, fontSize)) {
      throw new Error(
        `text の既定高さは 1em である必要があります: height=${String(height)}px, fontSize=${String(fontSize)}px`,
      );
    }

    assertAnimatedState(skeleton, false);
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
        width: min(520px, 100%);
      }

      .label {
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--fg-muted, #666);
      }

      .media-box {
        width: min(420px, 100%);
      }

      .busy-region {
        display: grid;
        gap: 0.5rem;
        padding: 0.75rem;
        border: var(--border-width, 1px) solid var(--border-default, #d7d7d7);
        border-radius: var(--radius-md, 6px);
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <div class="label">text x static</div>
        <ui-skeleton id="matrix-text-static" variant="text" width="82%"></ui-skeleton>
      </div>

      <div class="cell">
        <div class="label">text x animated</div>
        <ui-skeleton id="matrix-text-animated" variant="text" width="68%" animated></ui-skeleton>
      </div>

      <div class="cell">
        <div class="label">circular x static-avatar</div>
        <ui-skeleton
          id="matrix-circular-avatar"
          variant="circular"
          width="40px"
          height="40px"
        ></ui-skeleton>
      </div>

      <div class="cell media-box">
        <div class="label">rectangular x animated-media</div>
        <div id="matrix-busy-region" class="busy-region" aria-busy="true" aria-live="polite" aria-label="読み込み中">
          <ui-skeleton
            id="matrix-rect-media"
            variant="rectangular"
            width="100%"
            animated
            style="aspect-ratio: 16 / 9;"
          ></ui-skeleton>
          <ui-skeleton variant="text" width="88%"></ui-skeleton>
        </div>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const textStatic = getSkeleton(canvasElement, 'matrix-text-static');
    const textAnimated = getSkeleton(canvasElement, 'matrix-text-animated');
    const circular = getSkeleton(canvasElement, 'matrix-circular-avatar');
    const rectangular = getSkeleton(canvasElement, 'matrix-rect-media');

    await Promise.all([
      textStatic.updateComplete,
      textAnimated.updateComplete,
      circular.updateComplete,
      rectangular.updateComplete,
    ]);

    assertAriaHidden(textStatic);
    assertAriaHidden(textAnimated);
    assertAriaHidden(circular);
    assertAriaHidden(rectangular);

    assertAnimatedState(textStatic, false);
    assertAnimatedState(textAnimated, true);
    assertAnimatedState(rectangular, true);

    const circularStyle = getComputedStyle(circular);
    const circularWidth = toPx(circularStyle.width);
    const circularHeight = toPx(circularStyle.height);
    if (!isNearlyEqual(circularWidth, 40) || !isNearlyEqual(circularHeight, 40)) {
      throw new Error(
        `circular のサイズが不正です: width=${String(circularWidth)}px, height=${String(circularHeight)}px`,
      );
    }

    const rectangularHeight = toPx(getComputedStyle(rectangular).height);
    if (rectangularHeight <= 0) {
      throw new Error('aspect-ratio 指定の rectangular は高さを持つ必要があります');
    }

    const busyRegion = canvasElement.querySelector<HTMLElement>('#matrix-busy-region');
    if (!busyRegion) {
      throw new Error('#matrix-busy-region が見つかりません');
    }
    if (busyRegion.getAttribute('aria-busy') !== 'true') {
      throw new Error('コンテナ側で aria-busy="true" を付与する必要があります');
    }
  },
};

export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem; width: 240px;">
      <ui-skeleton
        id="boundary-invalid-variant"
        variant="unknown"
        width="180px"
        height="24px"
      ></ui-skeleton>

      <ui-skeleton id="boundary-aria-override" variant="text" width="75%" aria-hidden="false"></ui-skeleton>

      <ui-skeleton id="boundary-circular-width-only" variant="circular" width="48px"></ui-skeleton>

      <ui-skeleton id="boundary-rect-no-dimension" variant="rectangular"></ui-skeleton>

      <ui-skeleton
        id="boundary-trimmed-dimension"
        variant="text"
        width="  60%  "
        height="  1.5em  "
      ></ui-skeleton>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidVariant = getSkeleton(canvasElement, 'boundary-invalid-variant');
    const ariaOverride = getSkeleton(canvasElement, 'boundary-aria-override');
    const circularWidthOnly = getSkeleton(canvasElement, 'boundary-circular-width-only');
    const rectNoDimension = getSkeleton(canvasElement, 'boundary-rect-no-dimension');
    const trimmedDimension = getSkeleton(canvasElement, 'boundary-trimmed-dimension');

    await Promise.all([
      invalidVariant.updateComplete,
      ariaOverride.updateComplete,
      circularWidthOnly.updateComplete,
      rectNoDimension.updateComplete,
      trimmedDimension.updateComplete,
    ]);

    if (invalidVariant.variant !== 'rectangular') {
      throw new Error(`不正 variant は rectangular にフォールバックする必要があります: ${invalidVariant.variant}`);
    }
    if (invalidVariant.getAttribute('variant') !== 'rectangular') {
      throw new Error('不正 variant の属性値は rectangular に正規化される必要があります');
    }

    assertAriaHidden(ariaOverride);

    const circularStyle = getComputedStyle(circularWidthOnly);
    const circularWidth = toPx(circularStyle.width);
    const circularHeight = toPx(circularStyle.height);
    if (!isNearlyEqual(circularWidth, 48) || !isNearlyEqual(circularHeight, 48)) {
      throw new Error(
        `circular の width-only 指定は正円に補完される必要があります: width=${String(circularWidth)}px, height=${String(circularHeight)}px`,
      );
    }

    const rectHeight = toPx(getComputedStyle(rectNoDimension).height);
    if (rectHeight <= 0) {
      throw new Error('rectangular の高さ未指定時は最小高さフォールバックが必要です');
    }

    if (trimmedDimension.width !== '60%') {
      throw new Error(`width の前後空白は正規化される必要があります: ${trimmedDimension.width}`);
    }
    if (trimmedDimension.height !== '1.5em') {
      throw new Error(`height の前後空白は正規化される必要があります: ${trimmedDimension.height}`);
    }

    const trimmedStyle = getComputedStyle(trimmedDimension);
    const trimmedHeight = toPx(trimmedStyle.height);
    const trimmedFontSize = toPx(trimmedStyle.fontSize);
    if (!isNearlyEqual(trimmedHeight, trimmedFontSize * 1.5)) {
      throw new Error('height="1.5em" の反映が不正です');
    }
  },
};

