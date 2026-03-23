import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sidebar';
import type { UiSidebar } from './sidebar';
import type { TreeNode } from '../file-tree/file-tree';
import type { UiSidebarShell } from '../sidebar-shell/sidebar-shell';

const createLeaf = (id: string, label: string, href: string): TreeNode => ({
  kind: 'leaf',
  id,
  label,
  href,
  icon: 'lucide:file-text',
});

const sampleItems: readonly TreeNode[] = [
  {
    kind: 'branch',
    id: 'notes',
    label: 'Notes',
    icon: 'lucide:folder',
    children: [
      createLeaf('notes/reading', '読書メモ.md', '/notes/reading'),
      createLeaf('notes/ideas', 'アイデア.md', '/notes/ideas'),
    ],
  },
  {
    kind: 'branch',
    id: 'daily',
    label: 'Daily',
    icon: 'lucide:folder',
    children: [createLeaf('daily/2026-03-24', '2026-03-24.md', '/daily/2026-03-24')],
  },
];

const cloneTree = (nodes: readonly TreeNode[]): TreeNode[] =>
  nodes.map((node) =>
    node.kind === 'branch'
      ? {
          ...node,
          children: cloneTree(node.children),
        }
      : { ...node },
  );

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const flush = async (host: UiSidebar): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;
};

const getHost = (canvasElement: Element, id: string): UiSidebar => {
  const host = canvasElement.querySelector<UiSidebar>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getShell = (host: UiSidebar): UiSidebarShell => {
  const shell = host.shadowRoot?.querySelector<UiSidebarShell>('ui-sidebar-shell');
  if (!shell) {
    throw new Error('ui-sidebar-shell が見つかりません');
  }
  return shell;
};

const meta: Meta<UiSidebar> = {
  title: 'Components/Sidebar',
  component: 'ui-sidebar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<UiSidebar>;

export const FixedExpandedDefault: Story = {
  render: () => html`
    <div
      style="display: grid; grid-template-columns: var(--sidebar-width, 240px) 1fr; min-height: 420px;"
    >
      <ui-sidebar
        id="sidebar-fixed-expanded"
        data-state="expanded"
        mode="fixed"
        heading="知識ベース"
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['notes'])}
        selected-id="notes/reading"
      ></ui-sidebar>
      <main style="padding: 1.5rem;">本文エリア</main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-fixed-expanded');
    await flush(host);

    const shell = getShell(host);
    if (host.state !== 'expanded') {
      throw new Error('state が expanded である必要があります');
    }
    if (host.mode !== 'fixed') {
      throw new Error('mode が fixed である必要があります');
    }
    if (shell.state !== 'expanded') {
      throw new Error('shell.state が expanded である必要があります');
    }
  },
};

export const OverlayExpandedCard: Story = {
  render: () => html`
    <div style="min-height: 420px; position: relative;">
      <ui-sidebar
        id="sidebar-overlay-expanded"
        data-state="expanded"
        mode="overlay"
        variant="card"
        heading="移動"
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['notes'])}
        selected-id="notes/reading"
      ></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-overlay-expanded');
    await flush(host);

    const tree = host.shadowRoot?.querySelector<HTMLElement>('ui-file-tree');
    if (tree?.getAttribute('variant') !== 'card') {
      throw new Error('overlay card では ui-file-tree に variant="card" が必要です');
    }
  },
};

export const EventBridge: Story = {
  render: () => {
    const updateLog = (label: string, detail: object): void => {
      const log = document.querySelector<HTMLElement>('#sidebar-event-log');
      if (log) {
        log.textContent = `${label}: ${JSON.stringify(detail)}`;
      }
    };

    return html`
      <div style="display: grid; gap: 12px;">
        <div
          id="sidebar-event-log"
          style="padding: 12px; border: 1px solid var(--border-default); border-radius: 6px;"
        >
          イベント待機中
        </div>
        <ui-sidebar
          .items=${cloneTree(sampleItems)}
          .expandedIds=${new Set(['notes'])}
          selected-id="notes/reading"
          @ui-sidebar-select=${(event: CustomEvent<{ id: string }>) =>
            updateLog('select', event.detail)}
          @ui-sidebar-toggle=${(event: CustomEvent<{ id: string; expanded: boolean }>) =>
            updateLog('toggle', event.detail)}
          @ui-sidebar-active-change=${(event: CustomEvent<{ id: string }>) =>
            updateLog('active-change', event.detail)}
        ></ui-sidebar>
      </div>
    `;
  },
};
