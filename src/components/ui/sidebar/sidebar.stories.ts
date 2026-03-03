import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sidebar';
import type { UiSidebar } from './sidebar';
import type { TreeNode } from '../file-tree/file-tree';
import type { UiSidebarShell } from '../sidebar-shell/sidebar-shell';

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const flush = async (host: UiSidebar): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;

  const shell = getShell(host);
  await shell.updateComplete;
  await waitFrame();
  await shell.updateComplete;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const waitForEvent = <T extends Event>(
  target: EventTarget,
  eventName: string,
  timeoutMs = 3000,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${eventName} の待機がタイムアウトしました`));
    }, timeoutMs);

    const listener: EventListener = (event) => {
      window.clearTimeout(timer);
      resolve(event as T);
    };

    target.addEventListener(eventName, listener, { once: true });
  });

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

const getTree = (host: UiSidebar): HTMLElement => {
  const tree = host.shadowRoot?.querySelector<HTMLElement>('ui-file-tree');
  if (!tree) {
    throw new Error('ui-file-tree が見つかりません');
  }
  return tree;
};

const getNav = (shell: UiSidebarShell): HTMLElement => {
  const nav = shell.shadowRoot?.querySelector<HTMLElement>('nav');
  if (!nav) {
    throw new Error('nav が見つかりません');
  }
  return nav;
};

const getScrim = (shell: UiSidebarShell): HTMLElement => {
  const scrim = shell.shadowRoot?.querySelector<HTMLElement>('.scrim');
  if (!scrim) {
    throw new Error('.scrim が見つかりません');
  }
  return scrim;
};

const getShellHeader = (shell: UiSidebarShell): HTMLElement => {
  const header = shell.shadowRoot?.querySelector<HTMLElement>('.sidebar-header');
  if (!header) {
    throw new Error('.sidebar-header が見つかりません');
  }
  return header;
};

const sampleItems: TreeNode[] = [
  {
    id: 'notes',
    label: 'ノート',
    icon: 'lucide:folder',
    expanded: true,
    children: [
      {
        id: 'notes/reading',
        label: '読書メモ.md',
        icon: 'lucide:file-text',
        selected: true,
      },
      {
        id: 'notes/ideas',
        label: 'アイデア.md',
        icon: 'lucide:file-text',
      },
    ],
  },
  {
    id: 'daily',
    label: '日報',
    icon: 'lucide:folder',
    children: [{ id: 'daily/2026-03-03', label: '2026-03-03.md', icon: 'lucide:file-text' }],
  },
];

const cloneTree = (nodes: TreeNode[]): TreeNode[] =>
  nodes.map((node) => {
    const cloned: TreeNode = { ...node };
    if (node.children) {
      cloned.children = cloneTree(node.children);
    }
    return cloned;
  });

const meta: Meta<UiSidebar> = {
  title: 'Components/Sidebar',
  component: 'ui-sidebar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
ui-sidebar は ui-sidebar-shell と ui-file-tree を統合した合成コンポーネントです。

- シェル責務: 開閉、overlay/fixed、フォーカス返却、scrim
- ナビ責務: ツリー表示、選択、展開、キーボードナビゲーション
- 統合責務: state/mode と tree イベントの一貫した API 提供
        `,
      },
    },
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
      ></ui-sidebar>
      <main style="padding: 1.5rem;">本文エリア</main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-fixed-expanded');
    await flush(host);

    const shell = getShell(host);
    const tree = getTree(host);
    const nav = getNav(shell);
    const header = getShellHeader(shell);

    assert(host.state === 'expanded', 'host.state が expanded であること');
    assert(host.mode === 'fixed', 'host.mode が fixed であること');
    assert(shell.state === 'expanded', 'shell.state が expanded であること');
    assert(!nav.inert, 'expanded 時に nav が inert でないこと');
    assert(tree.getAttribute('role') === 'tree', 'tree role が設定されていること');

    const headerStyle = getComputedStyle(header);
    assert(headerStyle.display === 'none', 'fixed では shell header が非表示であること');

    const heading = host.shadowRoot?.querySelector('.heading');
    assert((heading?.textContent ?? '').trim() === '知識ベース', 'heading が表示されること');
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
      >
        <button slot="header-actions" type="button" aria-label="閉じる">閉じる</button>
      </ui-sidebar>
      <main style="padding: 1.5rem;">本文エリア</main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-overlay-expanded');
    await flush(host);

    const shell = getShell(host);
    const scrim = getScrim(shell);
    const header = getShellHeader(shell);
    const tree = getTree(host);

    assert(host.mode === 'overlay', 'host.mode が overlay であること');
    assert(host.state === 'expanded', 'host.state が expanded であること');
    assert(tree.getAttribute('variant') === 'card', 'ui-file-tree の variant が card であること');

    const scrimStyle = getComputedStyle(scrim);
    assert(scrimStyle.pointerEvents === 'auto', 'overlay expanded で scrim が有効であること');

    const headerStyle = getComputedStyle(header);
    assert(headerStyle.display !== 'none', 'overlay では shell header が表示されること');
  },
};

export const OverlayCollapsedInitial: Story = {
  render: () => html`
    <div style="min-height: 320px; position: relative;">
      <ui-sidebar
        id="sidebar-overlay-collapsed"
        data-state="collapsed"
        mode="overlay"
        .items=${cloneTree(sampleItems)}
      ></ui-sidebar>
      <main style="padding: 1.5rem;">本文エリア</main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-overlay-collapsed');
    await flush(host);

    const shell = getShell(host);
    const nav = getNav(shell);
    const scrim = getScrim(shell);

    assert(host.state === 'collapsed', 'host.state が collapsed であること');
    assert(nav.inert, 'collapsed 初期状態で nav が inert であること');
    assert(nav.style.visibility === 'hidden', 'collapsed 初期状態で nav が hidden であること');

    const scrimStyle = getComputedStyle(scrim);
    assert(scrimStyle.pointerEvents === 'none', 'collapsed で scrim が無効であること');
  },
};

export const LoadingSkeletonLifecycle: Story = {
  render: () => html`
    <div style="min-height: 320px;">
      <ui-sidebar
        id="sidebar-loading"
        mode="fixed"
        data-state="expanded"
        .items=${cloneTree(sampleItems)}
        ?loading=${true}
      ></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-loading');
    await flush(host);

    const tree = getTree(host);
    await wait(550);
    await flush(host);

    const skeleton = tree.shadowRoot?.querySelector('.skeleton');
    assert(skeleton, 'loading が 500ms を超えた後に skeleton が表示されること');

    host.loading = false;
    await flush(host);

    const skeletonAfter = tree.shadowRoot?.querySelector('.skeleton');
    assert(!skeletonAfter, 'loading 完了後に skeleton が非表示になること');
  },
};

export const TreeEventIntegration: Story = {
  render: () => html`
    <div style="min-height: 320px;">
      <ui-sidebar
        id="sidebar-tree-events"
        mode="fixed"
        data-state="expanded"
        .items=${cloneTree(sampleItems)}
      ></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-tree-events');
    await flush(host);

    const tree = getTree(host);

    let selectedId = '';
    let expandedId = '';
    let focusedId = '';

    host.addEventListener('ui-sidebar-select', (event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      selectedId = customEvent.detail.id;
    });

    host.addEventListener('ui-sidebar-expand', (event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      expandedId = customEvent.detail.id;
    });

    host.addEventListener('ui-sidebar-focus-change', (event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      focusedId = customEvent.detail.id;
    });

    tree.dispatchEvent(
      new CustomEvent<{ id: string; node: { id: string; label: string } }>('ui-tree-select', {
        bubbles: true,
        composed: true,
        detail: {
          id: 'notes/ideas',
          node: { id: 'notes/ideas', label: 'アイデア.md' },
        },
      }),
    );

    tree.dispatchEvent(
      new CustomEvent<{ id: string; expanded: boolean }>('ui-tree-expand', {
        bubbles: true,
        composed: true,
        detail: {
          id: 'notes',
          expanded: true,
        },
      }),
    );

    tree.dispatchEvent(
      new CustomEvent<{ id: string }>('ui-tree-focus-change', {
        bubbles: true,
        composed: true,
        detail: {
          id: 'notes/ideas',
        },
      }),
    );

    await flush(host);

    assert(host.activeId === 'notes/ideas', 'tree イベントで activeId が同期されること');
    assert(selectedId === 'notes/ideas', 'ui-sidebar-select が転送されること');
    assert(expandedId === 'notes', 'ui-sidebar-expand が転送されること');
    assert(focusedId === 'notes/ideas', 'ui-sidebar-focus-change が転送されること');
  },
};

export const ShellApiDelegation: Story = {
  render: () => html`
    <div style="min-height: 320px; position: relative;">
      <button id="sidebar-trigger" type="button">トグル</button>
      <ui-sidebar
        id="sidebar-delegate"
        data-state="collapsed"
        mode="overlay"
        .items=${cloneTree(sampleItems)}
      ></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-delegate');
    const trigger = canvasElement.querySelector<HTMLElement>('#sidebar-trigger');
    if (!trigger) {
      throw new Error('トリガー要素が見つかりません');
    }

    await flush(host);

    const expandPromise = waitForEvent<CustomEvent<{ state: string; mode: string }>>(
      host,
      'ui-sidebar-state-change',
    );
    host.expand(trigger);
    const expandedEvent = await expandPromise;
    await flush(host);

    assert(expandedEvent.detail.state === 'expanded', 'expand() で expanded イベントが発火すること');

    const collapsePromise = waitForEvent<CustomEvent<{ state: string; mode: string }>>(
      host,
      'ui-sidebar-state-change',
    );
    host.toggle(trigger);
    const collapsedEvent = await collapsePromise;
    await flush(host);

    assert(collapsedEvent.detail.state === 'collapsed', 'toggle() で collapsed イベントが発火すること');

    host.collapse();
    await wait(40);
    assert(host.state === 'collapsed', 'collapse() で最終状態が collapsed のままであること');
  },
};
