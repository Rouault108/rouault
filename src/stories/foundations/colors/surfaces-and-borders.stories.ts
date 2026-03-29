import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSampleGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Foundations/Colors/Surfaces And Borders',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'surface / fill / border の意味論トークンを面として確認するためのストーリーです。',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  parameters: { rouaultContractKind: 'visual' },
  render: () =>
    renderFoundationFrame(
      {
        title: 'Surfaces And Borders',
        description:
          '本文エリアは透明に近く、独立した情報ブロックだけが繊細な境界を持つという方針を確認します。',
      },
      html`
        ${renderFoundationSection(
          'Surface Hierarchy',
          renderTokenSampleGrid([
            {
              label: 'Surface 1',
              note: 'ページ全体の基準面。',
              containerStyle: {
                background: 'var(--bg-surface-1)',
                border: 'var(--border-width) solid var(--border-default)',
              },
              content: html`<div>Reading canvas</div>`,
            },
            {
              label: 'Surface 2',
              note: 'カードやサイド UI に使う面。',
              containerStyle: {
                background: 'var(--bg-surface-2)',
                border: 'var(--border-width) solid var(--border-default)',
              },
              content: html`<div>Supportive block</div>`,
            },
            {
              label: 'Muted Fill',
              note: 'kbd や code のような小さな強調面。',
              containerStyle: {
                background: 'var(--bg-fill-muted)',
                border: 'var(--border-width) solid var(--border-muted)',
              },
              content: html`<div>Inline emphasis</div>`,
            },
          ]),
        )}
        ${renderFoundationSection(
          'Border Language',
          renderTokenSampleGrid([
            {
              label: 'Default Border',
              containerStyle: {
                border: 'var(--border-width) solid var(--border-default)',
                background: 'var(--bg-surface-2)',
              },
              content: html`<div>Structure is explicit.</div>`,
            },
            {
              label: 'Muted Border',
              containerStyle: {
                border: 'var(--border-width) solid var(--border-muted)',
                background: 'var(--bg-surface-2)',
              },
              content: html`<div>More silent grouping.</div>`,
            },
            {
              label: 'Ghost Border',
              containerStyle: {
                border: 'var(--border-style-ghost)',
                background: 'var(--bg-surface-2)',
              },
              content: html`<div>Almost invisible scaffold.</div>`,
            },
          ]),
        )}
        ${renderFoundationSection(
          'Token Reference',
          renderTokenValueList([
            { label: 'Background default', token: '--bg-default' },
            { label: 'Surface 1', token: '--bg-surface-1' },
            { label: 'Surface 2', token: '--bg-surface-2' },
            { label: 'Fill muted', token: '--bg-fill-muted' },
            { label: 'Border default', token: '--border-default' },
            { label: 'Border muted', token: '--border-muted' },
            { label: 'Border ghost', token: '--border-ghost' },
          ]),
        )}
      `,
    ),
};
