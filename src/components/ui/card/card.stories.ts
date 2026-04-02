import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './card';
import type { Card } from './card';

const meta: Meta<Card> = {
  title: 'Components/Card',
  component: 'ui-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
カードの **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
click delegation / selection guard / focus-within / 複数リンク優先順位 / interactive descendants の合否は
Storybook では判定しません。

browser contract は別途 \
\`test/browser/card.browser.test.ts\` 側へ移してください。
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['outlined', 'elevated', 'flat', 'ghost'],
      description: 'カードの外観スタイル',
    },
    clickable: {
      control: 'boolean',
      description: 'クリック可能モード（hover / focus surface の見本用）',
    },
  },
};

export default meta;
type Story = StoryObj<Card>;

export const Default: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: 'outlined の代表表示用 smoke story です。基本 surface の見え方だけを残します。',
      },
    },
  },
  render: () => html`
    <ui-card>
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">ノートのタイトル</h3>
      <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
        本文のテキストがここに入ります。カードはコンテンツをグルーピングする役割を果たします。
      </p>
    </ui-card>
  `,
};

export const VariantMatrix: Story = {
  parameters: {
    docs: {
      description: {
        story: 'outlined / elevated / flat / ghost の視覚差を確認する docs story です。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 560px;">
      <ui-card variant="outlined">
        <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">Outlined</h3>
        <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">標準カード</p>
      </ui-card>
      <ui-card variant="elevated">
        <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">Elevated</h3>
        <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">影で浮かせたカード</p>
      </ui-card>
      <ui-card variant="flat">
        <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">Flat</h3>
        <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">背景で領域を示すカード</p>
      </ui-card>
      <ui-card variant="ghost">
        <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">Ghost</h3>
        <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">最小限の輪郭だけを持つカード</p>
      </ui-card>
    </div>
  `,
};

export const LinkCardSurface: Story = {
  parameters: {
    docs: {
      description: {
        story: 'リンクカードの代表表示用 smoke story です。header / body / footer の組み合わせだけを残します。',
      },
    },
  },
  render: () => html`
    <ui-card variant="elevated" clickable>
      <h3 slot="header" style="margin: 0; font-size: var(--text-base);">リンクカード</h3>
      <p style="margin: 0 0 0.75rem; color: var(--fg-muted); font-size: var(--text-sm);">
        カード内の主要リンクへ委譲される前提の表示例です。
      </p>
      <a href="/notes/card-link">詳細を見る</a>
      <time slot="footer" datetime="2026-04-01">2026-04-01</time>
    </ui-card>
  `,
};

export const ManualInteractiveReview: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- clickable 時の hover / focus-within surface
- header / body / footer の密度
- dark / forced-colors での見え方

合否は Storybook ではなく browser test 側へ移してください。
        `,
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 560px;">
      <ui-card clickable>
        <h3 slot="header" style="margin: 0; font-size: var(--text-base);">Clickable card</h3>
        <p style="margin: 0 0 0.75rem; color: var(--fg-muted); font-size: var(--text-sm);">
          クリック委譲・selection guard の最終合否は手動ではなく browser test に寄せてください。
        </p>
        <a href="/notes/manual-card">主要リンク</a>
        <time slot="footer" datetime="2026-04-01">footer</time>
      </ui-card>
      <ui-card variant="ghost" clickable>
        <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">Ghost clickable</h3>
        <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
          反応の軽さと枠線表現だけを目視確認します。
        </p>
      </ui-card>
    </div>
  `,
};