import type { Meta, StoryObj } from '@storybook/web-components';
import { CSSResult, html } from 'lit';
import './sidebar';
import { UiSidebar } from './sidebar';
import type { TreeNode } from '../file-tree/file-tree';
import type { UiSidebarShell } from '../sidebar-shell/sidebar-shell';

const STORAGE_KEY = 'rouault.sidebar.state';

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

const ensureNoEvent = async (
  target: EventTarget,
  eventName: string,
  action: () => void | Promise<void>,
  waitMs = 220,
): Promise<void> => {
  let listener!: EventListener;
  const eventPromise = new Promise<never>((_, reject) => {
    listener = () => {
      target.removeEventListener(eventName, listener);
      reject(new Error(`${eventName} が重複発火しました`));
    };
    target.addEventListener(eventName, listener);
  });

  const timeoutPromise = wait(waitMs);
  await action();
  await Promise.race([eventPromise, timeoutPromise]);
  target.removeEventListener(eventName, listener);
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

const sampleItems: TreeNode[] = [
  {
    id: 'root',
    label: 'root',
    icon: 'lucide:folder',
    expanded: true,
    children: [
      {
        id: 'root/readme',
        label: 'README.md',
        icon: 'lucide:file-text',
        selected: true,
      },
    ],
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

const readCssText = (): string => {
  const styles = UiSidebar.styles;
  if (Array.isArray(styles)) {
    return styles.map((styleSheet) => (styleSheet as CSSResult).cssText).join('\n');
  }
  return styles.cssText;
};

const meta: Meta<UiSidebar> = {
  title: 'Components/Sidebar/Boundary',
  component: 'ui-sidebar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '`<ui-sidebar>` の境界条件、契約テスト、テーマ契約を検証します。',
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiSidebar>;

export const RapidToggleReentrancySafety: Story = {
  render: () => html`
    <div style="min-height: 240px; position: relative;">
      <ui-sidebar
        id="sidebar-rapid"
        data-state="expanded"
        mode="overlay"
        .items=${cloneTree(sampleItems)}
      ></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-rapid');
    await flush(host);

    let eventCount = 0;
    const listener = (): void => {
      eventCount += 1;
    };

    host.addEventListener('ui-sidebar-state-change', listener);

    host.collapse();
    await waitForEvent(host, 'ui-sidebar-state-change');
    await flush(host);

    host.expand();
    await waitForEvent(host, 'ui-sidebar-state-change');
    await flush(host);

    host.collapse();
    await waitForEvent(host, 'ui-sidebar-state-change');
    await flush(host);

    assert(eventCount === 3, `イベント発火回数が 3 であること (実際: ${eventCount.toString()})`);
    assert(host.state === 'collapsed', '最終状態が collapsed であること');

    await ensureNoEvent(host, 'ui-sidebar-state-change', () => {
      host.collapse();
    });

    host.removeEventListener('ui-sidebar-state-change', listener);
  },
};

export const AttributeDrivenStateChange: Story = {
  render: () => html`
    <div style="min-height: 240px;">
      <ui-sidebar
        id="sidebar-attr"
        data-state="expanded"
        mode="fixed"
        .items=${cloneTree(sampleItems)}
      ></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-attr');
    await flush(host);

    const collapsePromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.setAttribute('data-state', 'collapsed');
    await collapsePromise;
    await flush(host);

    assert(host.state === 'collapsed', '属性変更で state が collapsed になること');

    const expandPromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.state = 'expanded';
    await expandPromise;
    await flush(host);

    assert(host.getAttribute('data-state') === 'expanded', 'プロパティ変更で属性が同期されること');
  },
};

export const LocalStoragePersistence: Story = {
  render: () => html`
    <div style="min-height: 240px;">
      <ui-sidebar
        id="sidebar-storage"
        data-state="expanded"
        mode="fixed"
        .items=${cloneTree(sampleItems)}
      ></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-storage');
    await flush(host);

    localStorage.removeItem(STORAGE_KEY);

    const collapsePromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.collapse();
    await collapsePromise;
    await flush(host);

    assert(localStorage.getItem(STORAGE_KEY) === 'collapsed', 'collapse 後に永続化されること');

    const expandPromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.expand();
    await expandPromise;
    await flush(host);

    assert(localStorage.getItem(STORAGE_KEY) === 'expanded', 'expand 後に永続化されること');

    localStorage.removeItem(STORAGE_KEY);
  },
};

export const ModeAutoDetection: Story = {
  render: () => html`
    <div style="min-height: 240px;">
      <ui-sidebar id="sidebar-auto" .items=${cloneTree(sampleItems)}></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-auto');
    await flush(host);

    const expectedMode = window.matchMedia('(min-width: 1280px)').matches ? 'fixed' : 'overlay';
    assert(host.mode === expectedMode, `自動判定 mode が ${expectedMode} になること`);
  },
};

export const StateChangeEventDoesNotBubble: Story = {
  render: () => html`
    <div id="sidebar-parent" style="min-height: 240px;">
      <ui-sidebar
        id="sidebar-no-bubble"
        data-state="expanded"
        mode="fixed"
        .items=${cloneTree(sampleItems)}
      ></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-no-bubble');
    const parent = canvasElement.querySelector('#sidebar-parent');
    if (!parent) {
      throw new Error('親要素が見つかりません');
    }

    await flush(host);

    let parentReceived = false;
    const parentListener = (): void => {
      parentReceived = true;
    };
    parent.addEventListener('ui-sidebar-state-change', parentListener);

    const collapsePromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.collapse();
    await collapsePromise;
    await flush(host);

    assert(!parentReceived, 'ui-sidebar-state-change は親へバブリングしないこと');

    parent.removeEventListener('ui-sidebar-state-change', parentListener);
  },
};

export const LoadingThresholdNoFlicker: Story = {
  render: () => html`
    <div style="min-height: 240px;">
      <ui-sidebar
        id="sidebar-fast-loading"
        data-state="expanded"
        mode="fixed"
        .items=${[]}
        ?loading=${true}
      ></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-fast-loading');
    await flush(host);

    const tree = host.shadowRoot?.querySelector<HTMLElement>('ui-file-tree');
    if (!tree) {
      throw new Error('ui-file-tree が見つかりません');
    }

    await wait(180);
    host.loading = false;
    await flush(host);

    const skeleton = tree.shadowRoot?.querySelector('.skeleton');
    assert(!skeleton, '500ms 未満の loading では skeleton が表示されないこと');
  },
};

export const ThemeContracts: Story = {
  render: () => html`
    <div style="min-height: 240px;">
      <ui-sidebar
        id="sidebar-theme"
        data-state="expanded"
        mode="fixed"
        .items=${cloneTree(sampleItems)}
      ></ui-sidebar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-theme');
    await flush(host);

    const cssText = readCssText();

    assert(
      cssText.includes('@media (prefers-color-scheme: dark)'),
      'dark mode メディアクエリが定義されていること',
    );

    assert(
      cssText.includes('@media (forced-colors: active)'),
      'forced-colors メディアクエリが定義されていること',
    );

    const shell = getShell(host);
    const nav = shell.shadowRoot?.querySelector<HTMLElement>('nav');
    if (!nav) {
      throw new Error('nav が見つかりません');
    }

    const navStyle = getComputedStyle(nav);
    assert(navStyle.borderRightStyle === 'solid', 'ナビゲーション境界線が定義されていること');
  },
};
