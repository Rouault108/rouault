import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './toc';
import type { Heading, Toc } from './toc';

const flatHeaders: Heading[] = [
  { id: 'intro', text: 'はじめに', level: 2 },
  { id: 'implementation', text: '実装', level: 2 },
  { id: 'testing', text: '検証', level: 2 },
];

const nestedHeaders: Heading[] = [
  { id: 'overview', text: '概要', level: 2 },
  { id: 'setup', text: 'セットアップ', level: 3 },
  { id: 'details', text: '詳細仕様', level: 3 },
  { id: 'appendix', text: '補足', level: 4 },
];

const getToc = (canvasElement: Element, id: string): Toc => {
  const toc = canvasElement.querySelector<Toc>(`#${id}`);
  if (!toc) {
    throw new Error(`#${id} が見つかりません`);
  }
  return toc;
};

const meta: Meta<Toc> = {
  title: 'Components/Toc',
  component: 'ui-toc',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
static view 専用の TOC です。

- 見出し配列は外部入力
- \`activeId\` は controlled
- click 時のみ \`ui-toc-active-change\` を通知
- 現在地追跡や mobile summary は \`layout-toc\` 側 controller が担当します
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Toc>;

export const Default: Story = {
  render: () =>
    html`<ui-toc id="toc-default" .headers=${flatHeaders} active-id="implementation"></ui-toc>`,
  play: async ({ canvasElement }) => {
    const toc = getToc(canvasElement, 'toc-default');
    await toc.updateComplete;

    const active = toc.shadowRoot?.querySelector<HTMLAnchorElement>('a[aria-current="location"]');
    if (active?.getAttribute('href') !== '#implementation') {
      throw new Error(
        'activeId に対応するリンクだけが aria-current="location" を持つ必要があります',
      );
    }
  },
};

export const NestedLevels: Story = {
  render: () => html`<ui-toc id="toc-nested" .headers=${nestedHeaders} active-id="setup"></ui-toc>`,
};

export const Empty: Story = {
  render: () => html`<ui-toc id="toc-empty" .headers=${[]}></ui-toc>`,
  play: async ({ canvasElement }) => {
    const toc = getToc(canvasElement, 'toc-empty');
    await toc.updateComplete;
    if (toc.shadowRoot?.querySelector('nav')) {
      throw new Error('headers が空のときは nav を描画してはいけません');
    }
  },
};
