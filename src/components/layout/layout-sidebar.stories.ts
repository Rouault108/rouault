import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './layout-sidebar';
import type { LayoutSidebar } from './layout-sidebar';
import type { TreeNode } from '../ui/file-tree/file-tree';
import type {
  UiSidebar,
  UiSidebarExpandDetail,
  UiSidebarSelectDetail,
} from '../ui/sidebar/sidebar';
import { LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY } from './layout-sidebar-tree-state.js';

const sampleItems: TreeNode[] = [
  {
    id: 'music',
    label: 'Music',
    icon: 'lucide:folder',
    expanded: true,
    children: [
      {
        id: 'music/classical',
        label: 'Classical',
        icon: 'lucide:folder',
        expanded: true,
        children: [
          {
            id: 'music/classical/beethoven',
            label: 'Beethoven',
            icon: 'lucide:folder',
            expanded: true,
            children: [
              {
                id: 'music/classical/beethoven/symphony-9',
                label: '交響曲第9番 ニ短調',
                icon: 'lucide:file-text',
                selected: true,
                href: '/notes/music/classical/beethoven/symphony-9',
              },
            ],
          },
          {
            id: 'music/classical/tchaikovsky',
            label: 'Tchaikovsky',
            icon: 'lucide:folder',
            children: [
              {
                id: 'music/classical/tchaikovsky/the-nutcracker',
                label: '楽曲分析: くるみ割り人形',
                icon: 'lucide:file-text',
                href: '/notes/music/classical/tchaikovsky/the-nutcracker',
              },
            ],
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const flush = async (host: LayoutSidebar): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;

  const sidebar = getSidebar(host);
  await sidebar.updateComplete;
  await waitFrame();
  await sidebar.updateComplete;
};

const getHost = (canvasElement: Element, id: string): LayoutSidebar => {
  const host = canvasElement.querySelector<LayoutSidebar>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getSidebar = (host: LayoutSidebar): UiSidebar => {
  const sidebar = host.shadowRoot?.querySelector<UiSidebar>('ui-sidebar');
  if (!sidebar) {
    throw new Error('ui-sidebar が見つかりません');
  }
  return sidebar;
};

const readSidebarState = (sidebar: UiSidebar): UiSidebar['state'] => sidebar.state;

const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (Array.isArray(node.children)) {
      const child = findNodeById(node.children, id);
      if (child) {
        return child;
      }
    }
  }
  return null;
};

export const PersistsExpandedIds: Story = {
  render: () => html`
    <div style="min-height: 420px;">
      <script type="application/json" id="layout-sidebar-persist-source">
        ${JSON.stringify(sampleItems)}
      </script>
      <layout-sidebar
        id="layout-sidebar-persist"
        source-id="layout-sidebar-persist-source"
        active-id="music/classical/beethoven/symphony-9"
        heading="ナビゲーション"
      ></layout-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    localStorage.removeItem(LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY);

    const host = getHost(canvasElement, 'layout-sidebar-persist');
    await flush(host);

    const sidebar = getSidebar(host);
    sidebar.dispatchEvent(
      new CustomEvent<UiSidebarExpandDetail>('ui-sidebar-expand', {
        bubbles: true,
        composed: true,
        detail: {
          id: 'music/classical/tchaikovsky',
          expanded: true,
        },
      }),
    );
    await flush(host);

    const storedRaw = localStorage.getItem(LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY);
    assert(storedRaw !== null, 'expandedIds が localStorage に保存されること');

    const stored = JSON.parse(storedRaw) as { expandedIds?: string[] };
    assert(
      stored.expandedIds?.includes('music/classical/tchaikovsky'),
      '展開したノードIDが保存されること',
    );

    host.remove();

    const nextHost = document.createElement('layout-sidebar');
    nextHost.id = 'layout-sidebar-persist-remount';
    nextHost.setAttribute('source-id', 'layout-sidebar-persist-source');
    nextHost.setAttribute('active-id', 'music/classical/beethoven/symphony-9');
    canvasElement.append(nextHost);
    await flush(nextHost);

    const nextSidebar = getSidebar(nextHost);
    const restoredNode = findNodeById(nextSidebar.items, 'music/classical/tchaikovsky');
    assert(restoredNode?.expanded === true, '再マウント後に展開状態が復元されること');

    localStorage.removeItem(LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY);
  },
};

export const OverlaySelectionCollapses: Story = {
  render: () => html`
    <div style="min-height: 420px;">
      <script type="application/json" id="layout-sidebar-overlay-source">
        ${JSON.stringify(sampleItems)}
      </script>
      <layout-sidebar
        id="layout-sidebar-overlay"
        source-id="layout-sidebar-overlay-source"
        active-id="music/classical/beethoven/symphony-9"
        fixed-breakpoint="99999"
      ></layout-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'layout-sidebar-overlay');
    await flush(host);

    const sidebar = getSidebar(host);
    sidebar.expand();
    await flush(host);

    assert(sidebar.mode === 'overlay', 'fixed-breakpoint により overlay モードになること');
    if (readSidebarState(sidebar) !== 'expanded') {
      throw new Error('選択前は expanded であること');
    }

    sidebar.dispatchEvent(
      new CustomEvent<UiSidebarSelectDetail>('ui-sidebar-select', {
        bubbles: true,
        composed: true,
        detail: {
          id: 'music/classical/tchaikovsky/the-nutcracker',
          node: {
            id: 'music/classical/tchaikovsky/the-nutcracker',
            label: '楽曲分析: くるみ割り人形',
          },
        },
      }),
    );
    await flush(host);

    if (readSidebarState(sidebar) !== 'collapsed') {
      throw new Error('overlay では選択後に閉じること');
    }
  },
};
