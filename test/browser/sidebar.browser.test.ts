import { html } from 'lit/static-html.js';
import { describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import '../../src/components/ui/sidebar/sidebar.js';
import type { TreeNode } from '../../src/components/ui/file-tree/file-tree.js';
import type {
  UiSidebar,
  UiSidebarActiveChangeDetail,
  UiSidebarRequestCloseEventDetail,
  UiSidebarSelectDetail,
  UiSidebarToggleDetail,
} from '../../src/components/ui/sidebar/sidebar.js';
import type {
  UiSidebarShell,
  UiSidebarStateChangeDetail,
} from '../../src/components/ui/sidebar-shell/sidebar-shell.js';
import { nextAnimationFrame, waitForLitUpdate } from './harness/browser-test-utilities.js';

const sampleItems: readonly TreeNode[] = [
  {
    kind: 'branch',
    id: 'root',
    label: 'root',
    icon: 'folder',
    children: [
      {
        kind: 'leaf',
        id: 'root/readme',
        label: 'README.md',
        href: '/notes/readme',
        icon: 'file-text',
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

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const getShell = (host: UiSidebar): UiSidebarShell | null =>
  host.shadowRoot?.querySelector<UiSidebarShell>('ui-sidebar-shell') ?? null;

const getTree = (host: UiSidebar): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('ui-file-tree') ?? null;

const getSidebarHead = (host: UiSidebar): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.sidebar-head') ?? null;

const flush = async (host: UiSidebar): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();

  const shell = getShell(host);
  if (shell) {
    await waitForLitUpdate(shell);
  }

  const tree = getTree(host);
  if (tree) {
    await nextAnimationFrame();
  }

  await waitForLitUpdate(host);
};

const waitForSidebarStateChange = (host: UiSidebar): Promise<UiSidebarStateChangeDetail> =>
  new Promise((resolve) => {
    host.addEventListener(
      'ui-sidebar-state-change',
      ((event: Event) => {
        if (event instanceof CustomEvent) {
          resolve((event as CustomEvent<UiSidebarStateChangeDetail>).detail);
        }
      }) as EventListener,
      { once: true },
    );
  });

const waitForSidebarSelect = (host: UiSidebar): Promise<CustomEvent<UiSidebarSelectDetail>> =>
  new Promise((resolve) => {
    host.addEventListener(
      'ui-sidebar-select',
      ((event: Event) => {
        if (event instanceof CustomEvent) {
          resolve(event as CustomEvent<UiSidebarSelectDetail>);
        }
      }) as EventListener,
      { once: true },
    );
  });

const waitForSidebarToggle = (host: UiSidebar): Promise<CustomEvent<UiSidebarToggleDetail>> =>
  new Promise((resolve) => {
    host.addEventListener(
      'ui-sidebar-toggle',
      ((event: Event) => {
        if (event instanceof CustomEvent) {
          resolve(event as CustomEvent<UiSidebarToggleDetail>);
        }
      }) as EventListener,
      { once: true },
    );
  });

const waitForSidebarActiveChange = (
  host: UiSidebar,
): Promise<CustomEvent<UiSidebarActiveChangeDetail>> =>
  new Promise((resolve) => {
    host.addEventListener(
      'ui-sidebar-active-change',
      ((event: Event) => {
        if (event instanceof CustomEvent) {
          resolve(event as CustomEvent<UiSidebarActiveChangeDetail>);
        }
      }) as EventListener,
      { once: true },
    );
  });

describe('ui-sidebar browser contract', () => {
  it('state / mode の property と attribute を shell と同期すること', async () => {
    const host = await fixture<UiSidebar>(html`
      <ui-sidebar
        data-state="expanded"
        mode="fixed"
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['root'])}
        selected-id="root/readme"
      ></ui-sidebar>
    `);

    await flush(host);

    const shell = expectPresent(getShell(host), 'shell');

    expect(host.state).to.equal('expanded');
    expect(host.mode).to.equal('fixed');

    expect(host.getAttribute('data-state')).to.equal('expanded');
    expect(host.getAttribute('mode')).to.equal('fixed');

    expect(shell.state).to.equal('expanded');
    expect(shell.mode).to.equal('fixed');
    expect(shell.getAttribute('data-state')).to.equal('expanded');
    expect(shell.getAttribute('mode')).to.equal('fixed');

    host.state = 'collapsed';
    host.mode = 'overlay';
    await flush(host);

    expect(host.getAttribute('data-state')).to.equal('collapsed');
    expect(host.getAttribute('mode')).to.equal('overlay');

    expect(shell.state).to.equal('collapsed');
    expect(shell.mode).to.equal('overlay');
    expect(shell.getAttribute('data-state')).to.equal('collapsed');
    expect(shell.getAttribute('mode')).to.equal('overlay');
  });

  it('collapse() が shell を経由して host state-change を再送出すること', async () => {
    const host = await fixture<UiSidebar>(html`
      <ui-sidebar
        data-state="expanded"
        mode="overlay"
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['root'])}
        selected-id="root/readme"
      ></ui-sidebar>
    `);

    await flush(host);

    const shell = expectPresent(getShell(host), 'shell');
    expect(shell.state).to.equal(host.state);

    const stateChange = waitForSidebarStateChange(host);
    host.collapse();

    const detail = await stateChange;
    await flush(host);

    expect(detail.state).to.equal('collapsed');
    expect(detail.mode).to.equal('overlay');
    expect(host.state).to.equal('collapsed');
    expect(host.getAttribute('data-state')).to.equal('collapsed');
    expect(shell.state).to.equal('collapsed');
    expect(shell.getAttribute('data-state')).to.equal('collapsed');
  });

  it('variant と density を inner ui-file-tree へ伝播すること', async () => {
    const host = await fixture<UiSidebar>(html`
      <ui-sidebar
        data-state="expanded"
        mode="overlay"
        variant="card"
        density="compact"
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['root'])}
        selected-id="root/readme"
      ></ui-sidebar>
    `);

    await flush(host);

    const tree = expectPresent(getTree(host), 'ui-file-tree');

    expect(tree.getAttribute('variant')).to.equal('card');
    expect(tree.getAttribute('density')).to.equal('compact');

    host.variant = 'default';
    host.density = 'normal';
    await flush(host);

    expect(tree.getAttribute('variant')).to.equal('default');
    expect(tree.getAttribute('density')).to.equal('normal');
  });

  it('overlay では header-actions がない限り見出しヘッダーを描画しないこと', async () => {
    const host = await fixture<UiSidebar>(html`
      <ui-sidebar
        data-state="expanded"
        mode="overlay"
        heading="ナビゲーション"
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['root'])}
        selected-id="root/readme"
      ></ui-sidebar>
    `);

    await flush(host);

    expect(getSidebarHead(host)).to.equal(null);
  });

  it('header-actions がある場合に限り overlay 補助ヘッダーを描画すること', async () => {
    const host = await fixture<UiSidebar>(html`
      <ui-sidebar
        data-state="expanded"
        mode="overlay"
        heading="ナビゲーション"
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['root'])}
        selected-id="root/readme"
      >
        <button slot="header-actions" type="button">閉じる</button>
      </ui-sidebar>
    `);

    await flush(host);

    const header = expectPresent(getSidebarHead(host), 'sidebar-head');
    expect(header.textContent).to.contain('ナビゲーション');
    const actionsSlot = header.querySelector<HTMLSlotElement>('slot[name="header-actions"]');
    expect(actionsSlot).to.not.equal(null);
  });

  it('shell の close request を ui-sidebar-request-close として再送出すること', async () => {
    const host = await fixture<UiSidebar>(html`
      <ui-sidebar
        data-state="expanded"
        mode="overlay"
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['root'])}
        selected-id="root/readme"
      ></ui-sidebar>
    `);

    await flush(host);

    const shell = expectPresent(getShell(host), 'shell');
    const requestClose = new Promise<UiSidebarRequestCloseEventDetail>((resolve) => {
      host.addEventListener(
        'ui-sidebar-request-close',
        ((event: Event) => {
          resolve((event as CustomEvent<UiSidebarRequestCloseEventDetail>).detail);
        }) as EventListener,
        { once: true },
      );
    });

    shell.dispatchEvent(
      new CustomEvent<UiSidebarRequestCloseEventDetail>('ui-sidebar-request-close', {
        bubbles: false,
        composed: false,
        detail: { reason: 'scrim' },
      }),
    );

    expect(await requestClose).to.deep.equal({ reason: 'scrim' });
  });

  it('ui-tree-select を ui-sidebar-select として bubbles/composed 付きで再送出すること', async () => {
    const host = await fixture<UiSidebar>(html`
      <ui-sidebar
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['root'])}
        selected-id="root/readme"
      ></ui-sidebar>
    `);

    await flush(host);

    const tree = expectPresent(getTree(host), 'ui-file-tree');
    const selectEventPromise = waitForSidebarSelect(host);

    tree.dispatchEvent(
      new CustomEvent<UiSidebarSelectDetail>('ui-tree-select', {
        bubbles: true,
        composed: true,
        detail: { id: 'root/readme' },
      }),
    );

    const event = await selectEventPromise;

    expect(event.detail.id).to.equal('root/readme');
    expect(event.bubbles).to.equal(true);
    expect(event.composed).to.equal(true);
  });

  it('ui-tree-toggle を ui-sidebar-toggle として bubbles/composed 付きで再送出すること', async () => {
    const host = await fixture<UiSidebar>(html`
      <ui-sidebar
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['root'])}
        selected-id="root/readme"
      ></ui-sidebar>
    `);

    await flush(host);

    const tree = expectPresent(getTree(host), 'ui-file-tree');
    const toggleEventPromise = waitForSidebarToggle(host);

    tree.dispatchEvent(
      new CustomEvent<UiSidebarToggleDetail>('ui-tree-toggle', {
        bubbles: true,
        composed: true,
        detail: {
          id: 'root',
          expanded: false,
        },
      }),
    );

    const event = await toggleEventPromise;

    expect(event.detail.id).to.equal('root');
    expect(event.detail.expanded).to.equal(false);
    expect(event.bubbles).to.equal(true);
    expect(event.composed).to.equal(true);
  });

  it('ui-tree-active-change を ui-sidebar-active-change として bubbles/composed 付きで再送出すること', async () => {
    const host = await fixture<UiSidebar>(html`
      <ui-sidebar
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['root'])}
        selected-id="root/readme"
      ></ui-sidebar>
    `);

    await flush(host);

    const tree = expectPresent(getTree(host), 'ui-file-tree');
    const activeChangePromise = waitForSidebarActiveChange(host);

    tree.dispatchEvent(
      new CustomEvent<UiSidebarActiveChangeDetail>('ui-tree-active-change', {
        bubbles: true,
        composed: true,
        detail: { id: 'root/readme' },
      }),
    );

    const event = await activeChangePromise;

    expect(event.detail.id).to.equal('root/readme');
    expect(event.bubbles).to.equal(true);
    expect(event.composed).to.equal(true);
  });
});
