import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSampleGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Foundations/Elevation/Shadows',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'shadow / elevation トークンを面の階層として確認するためのストーリーです。',
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
        title: 'Elevation Shadows',
        description: 'Rouaultの影は強い演出ではなく、浮きすぎない面の分離に使います。',
      },
      html`
        ${renderFoundationSection(
          'Elevation Scale',
          renderTokenSampleGrid([
            {
              label: 'Elevation sm',
              note: '--elevation-sm',
              containerStyle: {
                background: 'var(--bg-surface-2)',
                boxShadow: 'var(--elevation-sm)',
              },
              content: html`<div>Quiet separation</div>`,
            },
            {
              label: 'Elevation md',
              note: '--elevation-md',
              containerStyle: {
                background: 'var(--bg-surface-2)',
                boxShadow: 'var(--elevation-md)',
              },
              content: html`<div>Dropdown / popover</div>`,
            },
            {
              label: 'Elevation lg',
              note: '--elevation-lg',
              containerStyle: {
                background: 'var(--bg-surface-2)',
                boxShadow: 'var(--elevation-lg)',
              },
              content: html`<div>Dialog class surface</div>`,
            },
            {
              label: 'Elevation glow',
              note: '--elevation-glow',
              containerStyle: {
                background: 'var(--bg-surface-2)',
                boxShadow: 'var(--elevation-glow)',
              },
              content: html`<div>Active feedback only</div>`,
            },
          ]),
        )}
        ${renderFoundationSection(
          'Token Reference',
          renderTokenValueList([
            { label: 'Shadow sm', token: '--shadow-sm' },
            { label: 'Shadow md', token: '--shadow-md' },
            { label: 'Shadow lg', token: '--shadow-lg' },
            { label: 'Shadow xl', token: '--shadow-xl' },
            { label: 'Elevation sm', token: '--elevation-sm' },
            { label: 'Elevation glow', token: '--elevation-glow' },
          ]),
        )}
      `,
    ),
};
