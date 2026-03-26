import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './layout-sidebar';
import type { LayoutSidebar } from './layout-sidebar';
import type { TreeNode } from '../ui/file-tree/file-tree';
import { LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY } from './layout-sidebar-tree-state.js';

const sampleItems: readonly TreeNode[] = [
  {
    kind: 'branch',
    id: 'music',
    label: 'Music',
    icon: 'folder',
    children: [
      {
        kind: 'branch',
        id: 'music/classical',
        label: 'Classical',
        icon: 'folder',
        children: [
          {
            kind: 'leaf',
            id: 'music/classical/beethoven/symphony-9',
            label: '交響曲第9番 ニ短調',
            href: '/notes/music/classical/beethoven/symphony-9',
            icon: 'file-text',
          },
          {
            kind: 'leaf',
            id: 'music/classical/tchaikovsky/the-nutcracker',
            label: 'くるみ割り人形',
            href: '/notes/music/classical/tchaikovsky/the-nutcracker',
            icon: 'file-text',
          },
        ],
      },
    ],
  },
];

const meta: Meta<LayoutSidebar> = {
  title: 'Layout/Layout Sidebar',
  component: 'layout-sidebar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<LayoutSidebar>;

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => { resolve(); });
  });

const flush = async (host: LayoutSidebar): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;
};

const getHost = (canvasElement: Element, id: string): LayoutSidebar => {
  const host = canvasElement.querySelector<LayoutSidebar>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

export const PersistsExpandedIds: Story = {
  render: () => html`
    <div style="min-height: 420px;">
      <layout-sidebar
        id="layout-sidebar-persist"
        .itemsJson=${JSON.stringify(sampleItems)}
        selected-id="music/classical/beethoven/symphony-9"
        heading="ナビゲーション"
      ></layout-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    localStorage.removeItem(LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY);

    const host = getHost(canvasElement, 'layout-sidebar-persist');
    await flush(host);

    host.dispatchEvent(
      new CustomEvent<{ id: string; expanded: boolean }>('ui-sidebar-toggle', {
        bubbles: true,
        composed: true,
        detail: {
          id: 'music/classical',
          expanded: true,
        },
      }),
    );
    await flush(host);

    const storedRaw = localStorage.getItem(LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY);
    if (storedRaw === null) {
      throw new Error('expandedIds が保存されていません');
    }

    const stored = JSON.parse(storedRaw) as { expandedIds?: string[] };
    if (!stored.expandedIds?.includes('music/classical')) {
      throw new Error('toggle した branch id が保存されていません');
    }

    localStorage.removeItem(LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY);
  },
};

export const OverlaySelectionCollapses: Story = {
  render: () => html`
    <div style="min-height: 420px;">
      <layout-sidebar
        id="layout-sidebar-overlay"
        .itemsJson=${JSON.stringify(sampleItems)}
        selected-id="music/classical/beethoven/symphony-9"
        fixed-breakpoint="99999"
      ></layout-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'layout-sidebar-overlay');
    await flush(host);

    const sidebar = host.shadowRoot?.querySelector('ui-sidebar');
    if (!sidebar) {
      throw new Error('ui-sidebar が見つかりません');
    }

    sidebar.dispatchEvent(
      new CustomEvent<{ id: string }>('ui-sidebar-select', {
        bubbles: true,
        composed: true,
        detail: {
          id: 'music/classical/tchaikovsky/the-nutcracker',
        },
      }),
    );
    await flush(host);
  },
};
