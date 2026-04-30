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
            {
              label: 'Foreground Subtle',
              token: '--fg-subtle',
              previewText: 'Readable tertiary text',
              previewStyle: {
                background: 'var(--bg-surface-2)',
                color: 'var(--fg-subtle)',
                border: 'var(--border-width) solid var(--border-muted)',
              },
              note: 'Readable tertiary text / caption / metadata 用。',
            },
            {
              label: 'Placeholder',
              token: '--fg-placeholder',
              previewText: '実 placeholder',
              previewStyle: {
                background: 'var(--bg-control-muted)',
                color: 'var(--fg-placeholder)',
                border: 'var(--border-width) solid var(--border-default)',
              },
              note: '実 input / textarea / search-field placeholder 用。',
            },
            {
              label: 'Control Label',
              token: '--fg-control-label',
              previewText: 'Trigger label',
              previewStyle: {
                background: 'var(--bg-control-muted)',
                color: 'var(--fg-control-label)',
                border: 'var(--border-width) solid var(--border-default)',
              },
              note: 'trigger label / 操作 UI の可視ラベル / select trigger の未選択表示用。',
            },
            {
              label: 'Control Affordance',
              token: '--fg-control-affordance',
              previewText: 'Icon / chevron',
              previewStyle: {
                background: 'var(--bg-control-muted)',
                color: 'var(--fg-control-affordance)',
                border: 'var(--border-width) solid var(--border-default)',
              },
              note: 'enabled icon / chevron / scrollbar thumb などの non-text UI affordance 用。',
            },
            {
              label: 'Decorative',
              token: '--fg-decorative',
              previewText: 'Decorative',
              previewStyle: {
                background: 'var(--bg-surface-2)',
                color: 'var(--fg-decorative)',
                border: 'var(--border-width) solid var(--border-muted)',
              },
              note: '読めなくても意味が失われない装飾用。',
            },
            {
              label: 'Disabled',
              token: '--fg-disabled',
              previewText: 'Disabled',
              previewStyle: {
                background: 'var(--bg-control-muted)',
                color: 'var(--fg-disabled)',
                border: 'var(--border-width) solid var(--border-default)',
              },
              note: 'disabled text / disabled affordance 用。',
            },
          ]),
        )}
        ${renderFoundationSection(
          'Control Surface',
          renderTokenSwatchGrid([
            {
              label: 'Control Muted',
              token: '--bg-control-muted',
              previewText: 'Control surface',
              previewStyle: {
                background: 'var(--bg-control-muted)',
                color: 'var(--fg-control-label)',
                border: 'var(--border-width) solid var(--border-default)',
              },
              note: 'control surface 用。Light mode でも --bg-fill-muted への単純 alias にはしません。',
            },
          ]),
          'secondary button hover / pressed と select opened trigger は alpha overlay を base surface に合成するか、専用 readable state token を使います。readonly / disabled の surface を opened state が上書きしてはいけません。',
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
            { label: 'FG placeholder', token: '--fg-placeholder' },
            { label: 'FG control label', token: '--fg-control-label' },
            { label: 'FG control affordance', token: '--fg-control-affordance' },
            { label: 'FG decorative', token: '--fg-decorative' },
            { label: 'FG disabled', token: '--fg-disabled' },
            { label: 'BG control muted', token: '--bg-control-muted' },
          ]),
        )}
      `,
    ),
};
