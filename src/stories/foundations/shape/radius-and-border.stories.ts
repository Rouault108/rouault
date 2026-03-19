import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSampleGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Foundations/Shape/Radius And Border',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '角丸と境界線のニュアンスを確認し、丸みで役割を誇張しすぎない方針を揃えるためのストーリーです。',
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
        title: 'Radius And Border',
        description: '角丸は小さく、境界は細く。本文より手前にある UI だけが構造を示します。',
      },
      html`
        ${renderFoundationSection(
          'Radius Scale',
          renderTokenSampleGrid([
            {
              label: 'Radius sm',
              note: '--radius-sm',
              containerStyle: {
                borderRadius: 'var(--radius-sm)',
                border: 'var(--border-style-subtle)',
                background: 'var(--bg-surface-2)',
              },
              content: html`<div>4px</div>`,
            },
            {
              label: 'Radius md',
              note: '--radius-md',
              containerStyle: {
                borderRadius: 'var(--radius-md)',
                border: 'var(--border-style-subtle)',
                background: 'var(--bg-surface-2)',
              },
              content: html`<div>6px</div>`,
            },
            {
              label: 'Radius xl',
              note: '--radius-xl',
              containerStyle: {
                borderRadius: 'var(--radius-xl)',
                border: 'var(--border-style-subtle)',
                background: 'var(--bg-surface-2)',
              },
              content: html`<div>12px</div>`,
            },
            {
              label: 'Radius full',
              note: '--radius-full',
              containerStyle: {
                borderRadius: 'var(--radius-full)',
                border: 'var(--border-style-subtle)',
                background: 'var(--bg-surface-2)',
              },
              content: html`<div>Pill</div>`,
            },
          ]),
        )}
        ${renderFoundationSection(
          'Border Patterns',
          renderTokenSampleGrid([
            {
              label: 'Subtle Border',
              note: '標準的な構造提示。',
              containerStyle: {
                border: 'var(--border-style-subtle)',
                background: 'var(--bg-surface-2)',
              },
              content: html`<div>Subtle boundary</div>`,
            },
            {
              label: 'Ghost Border',
              note: 'より静かな補助 UI。',
              containerStyle: {
                border: 'var(--border-style-ghost)',
                background: 'var(--bg-surface-2)',
              },
              content: html`<div>Ghost boundary</div>`,
            },
            {
              label: 'Focus Ring',
              note: '視覚的強調は hover ではなく focus に残す。',
              containerStyle: {
                background: 'var(--bg-surface-1)',
              },
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
                  Focus target
                </button>
              `,
            },
          ]),
        )}
        ${renderFoundationSection(
          'Token Reference',
          renderTokenValueList([
            { label: 'Radius sm', token: '--radius-sm' },
            { label: 'Radius md', token: '--radius-md' },
            { label: 'Radius xl', token: '--radius-xl' },
            { label: 'Radius full', token: '--radius-full' },
            { label: 'Border width', token: '--border-width' },
            { label: 'Border thick', token: '--border-width-thick' },
          ]),
        )}
      `,
    ),
};
