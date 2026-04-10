import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sidebar-shell';
import type { UiSidebarShell } from './sidebar-shell';

const renderShell = ({
  mode,
  state,
  header = false,
  bodyLabel = '',
}: {
  mode: 'fixed' | 'overlay';
  state: 'expanded' | 'collapsed';
  header?: boolean;
  bodyLabel?: string;
}) => html`
  <div
    style=${[
      mode === 'fixed'
        ? 'display: grid; grid-template-columns: var(--sidebar-width, 240px) 1fr; min-height: 400px;'
        : 'min-height: 400px; position: relative;',
    ].join(' ')}
  >
    <ui-sidebar-shell mode="${mode}" data-state="${state}">
      ${header
        ? html`<button slot="header" aria-haspopup="menu" aria-expanded="false">
            現在のジャンル
          </button>`
        : null}

      <div role="tree" aria-label="ナビゲーション">
        <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
        <a href="/music" role="treeitem" tabindex="-1" aria-selected="false">音楽</a>
        <a href="/art" role="treeitem" tabindex="-1" aria-selected="false">美術</a>
      </div>
    </ui-sidebar-shell>

    <main style="padding: 2rem;">
      <p>${bodyLabel}</p>
    </main>
  </div>
`;

const meta: Meta<UiSidebarShell> = {
  title: 'Components/Sidebar Shell',
  component: 'ui-sidebar-shell',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
サイドバー補助面の **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
focus movement、trigger restore、scrim click、Escape close、state change event、
属性/プロパティ同期は
\`test/browser/sidebar-shell.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiSidebarShell>;

export const FixedExpanded: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story:
          'fixed / expanded の代表表示用 smoke story です。sticky surface と本文との並びだけを残します。',
      },
    },
  },
  render: () =>
    renderShell({
      mode: 'fixed',
      state: 'expanded',
      bodyLabel: 'Fixed / Expanded の代表表示です。',
    }),
};

export const FixedCollapsedZenMode: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'fixed / collapsed の docs story です。collapsed visibility の合否は browser test を正本とします。',
      },
    },
  },
  render: () =>
    html`<div
      style="display: grid; grid-template-columns: 0px 1fr; min-height: 400px; position: relative;"
    >
      <ui-sidebar-shell mode="fixed" data-state="collapsed">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
        </div>
      </ui-sidebar-shell>

      <main style="padding: 2rem;">
        <p>Fixed / Collapsed の代表表示です。</p>
      </main>
    </div>`,
};

export const OverlayExpanded: Story = {
  parameters: {
    docs: {
      description: {
        story: 'overlay / expanded の docs story です。surface と scrim の見え方だけを残します。',
      },
    },
  },
  render: () =>
    renderShell({
      mode: 'overlay',
      state: 'expanded',
      header: true,
      bodyLabel: 'Overlay / Expanded の代表表示です。',
    }),
};

export const OverlayCollapsed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'overlay / collapsed の docs story です。initial inert / visibility の合否は browser test を正本とします。',
      },
    },
  },
  render: () =>
    renderShell({
      mode: 'overlay',
      state: 'collapsed',
      header: true,
      bodyLabel: 'Overlay / Collapsed の代表表示です。',
    }),
};

export const HeaderSlotModes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'header slot を fixed / overlay の両方で見比べる docs story です。focus restore や inert timing は browser test を正本とします。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; min-height: 320px;">
      <ui-sidebar-shell mode="fixed" data-state="expanded">
        <button slot="header">Fixed Header</button>
        <div role="tree" aria-label="固定ナビゲーション">
          <a href="/notes" role="treeitem" aria-selected="true" tabindex="0">ノート</a>
        </div>
      </ui-sidebar-shell>

      <ui-sidebar-shell mode="overlay" data-state="expanded">
        <button slot="header">Overlay Header</button>
        <div role="tree" aria-label="オーバーレイナビゲーション">
          <a href="/music" role="treeitem" aria-selected="false" tabindex="-1">音楽</a>
        </div>
      </ui-sidebar-shell>
    </div>
  `,
};

export const ManualOverlayReview: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- overlay surface の見え方
- header slot と tree content の視覚的まとまり
- scrim の濃度感
- fixed / overlay の見た目の差

合否判定は Storybook ではなく \`test/browser/sidebar-shell.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
  render: () => html`
    <div style="min-height: 400px; position: relative;">
      <button style="margin: 1rem;">トリガー見本</button>

      <ui-sidebar-shell mode="overlay" data-state="expanded">
        <button slot="header">現在のジャンル</button>

        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
          <a href="/music" role="treeitem" tabindex="-1" aria-selected="false">音楽</a>
          <a href="/art" role="treeitem" tabindex="-1" aria-selected="false">美術</a>
        </div>
      </ui-sidebar-shell>

      <main style="padding: 2rem;">
        <p>手動で overlay surface を確認するための story です。</p>
      </main>
    </div>
  `,
};
