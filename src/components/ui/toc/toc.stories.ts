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

const longJapaneseHeadings: Heading[] = [
  { id: 'overview', text: '全体像と読み進めるための前提', level: 2 },
  {
    id: 'source-code-to-execution',
    text: '第2章 ソースコードから実行まで：コンパイル単位、アセンブリ、IL、メタデータ、CLRの関係',
    level: 4,
  },
  {
    id: 'runtime-boundary',
    text: '実行時境界を越えるときに発生する型情報、例外、依存解決の扱い',
    level: 3,
  },
  {
    id: 'verification-policy',
    text: '検証方針：静的生成、SSR、hydration、検索インデックスの責務分離',
    level: 2,
  },
];

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
- 現在地追跡や mobile panel 制御は \`layout-toc\` 側 controller が担当します

この story ファイルは **docs / smoke / 手動確認** に限定します。activeId 更新や emitted event の合否は Storybook ではなく browser 側で判定します。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Toc>;

export const Default: Story = {
  tags: ['smoke'],
  render: () =>
    html`<ui-toc id="toc-default" .headers=${flatHeaders} active-id="implementation"></ui-toc>`,
};

export const NestedLevels: Story = {
  render: () => html`<ui-toc id="toc-nested" .headers=${nestedHeaders} active-id="setup"></ui-toc>`,
};

export const Empty: Story = {
  render: () => html`<ui-toc id="toc-empty" .headers=${[]}></ui-toc>`,
};

export const LongJapaneseHeadingsCompact: Story = {
  render: () => html`
    <ui-toc
      id="toc-long-japanese-compact"
      density-tier="compact"
      .headers=${longJapaneseHeadings}
      active-id="overview"
    ></ui-toc>
  `,
};

export const LongJapaneseHeadingsActive: Story = {
  render: () => html`
    <ui-toc
      id="toc-long-japanese-active"
      density-tier="compact"
      .headers=${longJapaneseHeadings}
      active-id="source-code-to-execution"
    ></ui-toc>
  `,
};

export const DeepLongJapaneseHeadings: Story = {
  render: () => html`
    <ui-toc
      id="toc-deep-long-japanese"
      density-tier="compact"
      .headers=${longJapaneseHeadings}
      active-id="runtime-boundary"
    ></ui-toc>
  `,
};
