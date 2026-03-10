import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSampleGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Foundations/Accessibility/Focus And Preferences',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'focus ring、forced-colors、reduced-motion といった利用者設定への追従方針をまとめるストーリーです。',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () =>
    renderFoundationFrame(
      {
        title: 'Focus And Preferences',
        description:
          'アクセシビリティ設定は例外対応ではなく、デザインの一部として最初から確認します。',
      },
      html`
        ${renderFoundationSection(
          'Focus Ring',
          renderTokenSampleGrid([
            {
              label: 'Standard Focus',
              note: 'outline と offset は常にトークン経由で管理。',
              content: html`
                <button
                  type="button"
                  style="
                    padding: var(--space-2) var(--space-4);
                    border: var(--border-style-subtle);
                    border-radius: var(--radius-md);
                    background: var(--bg-surface-2);
                    color: var(--fg-default);
                    outline: var(--focus-ring-width) solid var(--focus-ring-color);
                    outline-offset: var(--focus-ring-offset);
                  "
                >
                  Focus example
                </button>
              `,
            },
            {
              label: 'Preference Notes',
              note: 'OS 設定変更時は Storybook 背景切替だけで代用せず、実機でも確認します。',
              content: html`
                <div style="display: grid; gap: var(--space-2); font-size: var(--text-sm); line-height: var(--line-height-relaxed);">
                  <div>Reduced motion: animation-duration を即時に短縮</div>
                  <div>Forced colors: Canvas / CanvasText へマップ</div>
                  <div>Print: 装飾面を減らし本文優先へ切替</div>
                </div>
              `,
            },
          ]),
        )}

        ${renderFoundationSection(
          'Token Reference',
          renderTokenValueList([
            { label: 'Focus ring width', token: '--focus-ring-width' },
            { label: 'Focus ring offset', token: '--focus-ring-offset' },
            { label: 'Focus ring radius', token: '--focus-ring-radius' },
            { label: 'Focus ring color', token: '--focus-ring-color' },
            { label: 'Animation focus', token: '--animation-focus' },
            { label: 'Duration instant', token: '--duration-instant' },
          ]),
        )}
      `,
    ),
};
