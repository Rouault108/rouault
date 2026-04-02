import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSwatchGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Foundations/Colors/Semantic Colors',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '意味論トークンとして使うブランド色・本文色・状態色を俯瞰するためのストーリーです。',
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
        title: 'Semantic Colors',
        description:
          'Rouault の色は飾りではなく意味を持ちます。本文・状態・強調の役割単位で確認します。',
      },
      html`
        ${renderFoundationSection(
          'Brand / Foreground',
          renderTokenSwatchGrid([
            {
              label: 'Primary',
              token: '--primary',
              previewText: 'Primary Action',
              previewStyle: {
                background: 'var(--primary)',
                color: 'var(--on-primary)',
              },
              note: '主要アクションとリンク強調の基準色。',
            },
            {
              label: 'Foreground Default',
              token: '--fg-default',
              previewText: '本文の基準色',
              previewStyle: {
                background: 'var(--bg-surface-2)',
                color: 'var(--fg-default)',
                border: 'var(--border-width) solid var(--border-default)',
              },
            },
            {
              label: 'Foreground Muted',
              token: '--fg-muted',
              previewText: '補助情報',
              previewStyle: {
                background: 'var(--bg-surface-2)',
                color: 'var(--fg-muted)',
                border: 'var(--border-width) solid var(--border-muted)',
              },
            },
          ]),
        )}
        ${renderFoundationSection(
          'Status Colors',
          renderTokenSwatchGrid([
            {
              label: 'Danger',
              token: '--danger / --on-danger',
              previewText: 'Danger',
              previewStyle: {
                background: 'var(--danger)',
                color: 'var(--on-danger)',
              },
            },
            {
              label: 'Success',
              token: '--success / --on-success',
              previewText: 'Success',
              previewStyle: {
                background: 'var(--success)',
                color: 'var(--on-success)',
              },
            },
            {
              label: 'Warning',
              token: '--warning / --on-warning',
              previewText: 'Warning',
              previewStyle: {
                background: 'var(--warning)',
                color: 'var(--on-warning)',
              },
            },
          ]),
          '状態色は banner, toast, callout などの意味論 UI に接続されます。',
        )}
        ${renderFoundationSection(
          'Token Reference',
          renderTokenValueList([
            { label: 'Primary', token: '--primary' },
            { label: 'Primary hover', token: '--primary-hover' },
            { label: 'On primary', token: '--on-primary' },
            { label: 'FG default', token: '--fg-default' },
            { label: 'FG muted', token: '--fg-muted' },
            { label: 'FG subtle', token: '--fg-subtle' },
          ]),
        )}
      `,
    ),
};
