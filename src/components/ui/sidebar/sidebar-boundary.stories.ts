import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sidebar';
import type { UiSidebar } from './sidebar';
import type { TreeNode } from '../file-tree/file-tree';
import type { UiSidebarShell } from '../sidebar-shell/sidebar-shell';

const sampleItems: readonly TreeNode[] = [
  {
    kind: 'branch',
    id: 'root',
    label: 'root',
    icon: 'lucide:folder',
    children: [
      {
        kind: 'leaf',
        id: 'root/readme',
        label: 'README.md',
        href: '/notes/readme',
        icon: 'lucide:file-text',
      },
    ],
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
    requestAnimationFrame(() => { resolve(); });
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
  title: 'Components/Sidebar/Boundary',
  component: 'ui-sidebar',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<UiSidebar>;

export const StateReflection: Story = {
  render: () => html`
    <ui-sidebar
      id="sidebar-state-reflection"
      data-state="expanded"
      mode="fixed"
      .items=${cloneTree(sampleItems)}
      .expandedIds=${new Set(['root'])}
      selected-id="root/readme"
    ></ui-sidebar>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-state-reflection');
    await flush(host);

    host.state = 'collapsed';
    await flush(host);

    if (host.getAttribute('data-state') !== 'collapsed') {
      throw new Error('state の property/attribute 反映が崩れています');
    }
  },
};

export const ShellSync: Story = {
  render: () => html`
    <ui-sidebar
      id="sidebar-shell-sync"
      data-state="expanded"
      mode="overlay"
      .items=${cloneTree(sampleItems)}
      .expandedIds=${new Set(['root'])}
      selected-id="root/readme"
    ></ui-sidebar>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-shell-sync');
    await flush(host);

    const shell = getShell(host);
    if (shell.state !== host.state) {
      throw new Error('host と shell の state が同期していません');
    }

    host.collapse();
    await flush(host);

    if (shell.state !== 'collapsed') {
      throw new Error('collapse が shell へ伝播していません');
    }
  },
};
