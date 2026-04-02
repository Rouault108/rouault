import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSampleGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';
const meta: Meta = {
  title: 'Foundations/Typography/Heading',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `見出しのタイポグラフィを確認するためのストーリーです。`,
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
        title: 'Heading Scale',
        description:
          '見出しは本文より密度を高くし、階層差はサイズだけでなく weight と tracking でも作ります。',
      },
      html`
        ${renderFoundationSection(
          'Heading Preview',
          renderTokenSampleGrid([
            {
              label: 'H1',
              note: '主要タイトル。最も強い階層。',
              content: html`<h1 id="heading-h1">読むための静かな見出し</h1>`,
              containerStyle: { minBlockSize: 'auto' },
            },
            {
              label: 'H2',
              note: '章の切り替え。',
              content: html`<h2 id="heading-h2">第二階層の見出し</h2>`,
              containerStyle: { minBlockSize: 'auto' },
            },
            {
              label: 'H3',
              note: '節の導入。',
              content: html`<h3 id="heading-h3">第三階層の見出し</h3>`,
              containerStyle: { minBlockSize: 'auto' },
            },
            {
              label: 'H4',
              note: '本文内の小さな区切り。',
              content: html`<h4 id="heading-h4">第四階層の見出し</h4>`,
              containerStyle: { minBlockSize: 'auto' },
            },
          ]),
          'h1-h4 を個別カードで比較し、見出しの密度差を確認します。',
        )}
        ${renderFoundationSection(
          'Token Contract',
          renderTokenValueList([
            { label: 'H1 size', token: '--text-4xl / --font-bold' },
            { label: 'H2 size', token: '--text-2xl / --font-semibold' },
            { label: 'H3 size', token: '--text-xl / --font-semibold' },
            { label: 'H4 size', token: '--text-base / --font-semibold' },
            { label: 'Heading line-height', token: '--line-height-tight' },
            { label: 'Heading tracking', token: '--tracking-tight' },
          ]),
        )}
      `,
    ),
};
