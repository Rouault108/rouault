import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './skeleton';
import type { SkeletonVariant, UiSkeleton } from './skeleton';

const SKELETON_VARIANTS = ['text', 'circular', 'rectangular'] as const satisfies SkeletonVariant[];

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

この story ファイルは **docs / smoke / 手動確認** に限定します。busy state や reduced-motion / dark-mode 契約は Storybook を正本にしません。
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
  tags: ['smoke'],
  render: () => html`<ui-skeleton id="default-skeleton" variant="text" width="72%"></ui-skeleton>`,
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
        <div
          id="matrix-busy-region"
          class="busy-region"
          aria-busy="true"
          aria-live="polite"
          aria-label="読み込み中"
        >
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

      <ui-skeleton
        id="boundary-aria-override"
        variant="text"
        width="75%"
        aria-hidden="false"
      ></ui-skeleton>

      <ui-skeleton id="boundary-circular-width-only" variant="circular" width="48px"></ui-skeleton>

      <ui-skeleton id="boundary-rect-no-dimension" variant="rectangular" width="100%"></ui-skeleton>

      <ui-skeleton
        id="boundary-trimmed-dimension"
        variant="text"
        width="  60%  "
        height="  1.5em  "
      ></ui-skeleton>
    </div>
  `,
};

export const BusyStateTransitions: Story = {
  render: () => html`
    <div id="loading-region" aria-busy="true" aria-live="polite" aria-label="読み込み中">
      <ui-skeleton id="transition-skeleton" variant="text" width="80%"></ui-skeleton>
    </div>
  `,
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <div
      style="
        --bg-fill-neutral: oklch(28% 0.02 250);
        --skeleton-shimmer: oklch(42% 0.02 250 / 0.55);
        background: oklch(20% 0.02 250);
        color: oklch(95% 0.01 250);
        padding: 1rem;
        border-radius: 10px;
        display: grid;
        gap: 0.625rem;
      "
    >
      <ui-skeleton
        id="dark-rect"
        variant="rectangular"
        width="100%"
        animated
        style="aspect-ratio: 16 / 9;"
      ></ui-skeleton>
      <ui-skeleton id="dark-text" variant="text" width="74%"></ui-skeleton>
    </div>
  `,
};