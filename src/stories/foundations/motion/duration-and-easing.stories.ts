import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSampleGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Foundations/Motion/Duration And Easing',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'duration / easing / scale の関係を軽いモーションデモとして確認するためのストーリーです。',
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
        title: 'Duration And Easing',
        description:
          'モーションは情報伝達のためにのみ使い、読書の集中を壊す装飾には使いません。',
      },
      html`
        <style>
          .motion-demo {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-block-size: 56px;
            padding-inline: var(--space-4);
            border-radius: var(--radius-full);
            background: var(--bg-fill-muted);
            transition:
              transform var(--duration-normal) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
            box-shadow: var(--elevation-sm);
          }

          .motion-demo:hover {
            transform: scale(var(--scale-hover-sm));
            background: var(--bg-surface-active);
            box-shadow: var(--elevation-md);
          }

          .motion-demo.is-pressed {
            transform: scale(var(--scale-pressed));
          }
        </style>
        ${renderFoundationSection(
          'Hover / Press Demo',
          renderTokenSampleGrid([
            {
              label: 'Hover',
              note: 'pointer hover で緩やかに強調。',
              content: html`<div class="motion-demo">Hover me</div>`,
            },
            {
              label: 'Pressed',
              note: '押下時は軽く縮めて触感を返す。',
              content: html`<div class="motion-demo is-pressed">Pressed state</div>`,
            },
          ]),
        )}

        ${renderFoundationSection(
          'Token Reference',
          renderTokenValueList([
            { label: 'Duration fast', token: '--duration-fast' },
            { label: 'Duration normal', token: '--duration-normal' },
            { label: 'Duration slower', token: '--duration-slower' },
            { label: 'Ease out', token: '--ease-out' },
            { label: 'Ease in', token: '--ease-in' },
            { label: 'Scale pressed', token: '--scale-pressed' },
            { label: 'Scale hover sm', token: '--scale-hover-sm' },
          ]),
        )}
      `,
    ),
};
