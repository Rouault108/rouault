import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/file-tree/file-tree.js';
import type { FileTree, TreeNode } from '../../src/components/ui/file-tree/file-tree.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const must = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

const createLeaf = (id: string, label: string, href: string): TreeNode => ({
  kind: 'leaf',
  id,
  label,
  href,
  icon: 'file-text',
});

const createBranch = (id: string, label: string, children: readonly TreeNode[]): TreeNode => ({
  kind: 'branch',
  id,
  label,
  children,
  icon: 'folder',
});

const sampleTree: readonly TreeNode[] = [
  createBranch('notes', 'Notes', [
    createLeaf('notes/index', 'Index.md', '/notes/index'),
    createBranch('notes/design', 'Design', [
      createLeaf('notes/design/file-tree', 'File Tree.md', '/notes/design/file-tree'),
      createLeaf('notes/design/tree-item', 'Tree Item.md', '/notes/design/tree-item'),
    ]),
  ]),
  createBranch('daily', 'Daily', [
    createLeaf('daily/2026-03-24', '2026-03-24.md', '/daily/2026-03-24'),
  ]),
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

const flush = async (fileTree: FileTree): Promise<void> => {
  await waitForLitUpdate(fileTree);
  await nextAnimationFrame();
  await waitForLitUpdate(fileTree);
};

const flushWithoutAnimationFrame = async (fileTree: FileTree): Promise<void> => {
  await waitForLitUpdate(fileTree);
  await Promise.resolve();
  await waitForLitUpdate(fileTree);
};

const getContainer = (fileTree: FileTree): HTMLElement =>
  must(
    fileTree.shadowRoot?.querySelector<HTMLElement>('.container'),
    '.container が見つかりません',
  );

const getTreeItemHost = (fileTree: FileTree, id: string): HTMLElement =>
  must(
    fileTree.shadowRoot?.querySelector<HTMLElement>(`ui-tree-item[data-id="${id}"]`),
    `ui-tree-item[data-id="${id}"] が見つかりません`,
  );

const getTreeItemAction = (fileTree: FileTree, id: string): HTMLElement =>
  must(
    getTreeItemHost(fileTree, id).shadowRoot?.querySelector<HTMLElement>('.item'),
    `${id} の .item が見つかりません`,
  );

const getTreeItemChildrenPanel = (fileTree: FileTree, id: string): HTMLElement =>
  must(
    getTreeItemHost(fileTree, id).shadowRoot?.querySelector<HTMLElement>('.children'),
    `${id} の .children が見つかりません`,
  );

const preventLeafNavigation = (event: Event): void => {
  const anchor = event
    .composedPath()
    .find((target) => target instanceof HTMLAnchorElement && target.classList.contains('item'));

  if (anchor instanceof HTMLAnchorElement) {
    event.preventDefault();
  }
};

describe('ui-file-tree browser contract', () => {
  beforeEach(() => {
    document.addEventListener('click', preventLeafNavigation, true);
  });

  afterEach(() => {
    document.removeEventListener('click', preventLeafNavigation, true);
  });

  it('controlled selectedId / expandedIds と density を公開 DOM へ反映し、SSR 安定属性を保持すること', async () => {
    const fileTree = await fixture<FileTree>(html`
      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        .expandedIds=${new Set(['notes', 'notes/design'])}
        selected-id="notes/design/file-tree"
        density="compact"
        variant="card"
      ></ui-file-tree>
    `);

    await flush(fileTree);

    const selectedItem = getTreeItemHost(fileTree, 'notes/design/file-tree');
    const expandedBranch = getTreeItemHost(fileTree, 'notes/design');
    const ancestorBranch = getTreeItemHost(fileTree, 'notes');
    const firstVisibleItem = getTreeItemHost(fileTree, 'notes');

    expect(fileTree.getAttribute('role')).to.equal('tree');
    expect(fileTree.getAttribute('aria-orientation')).to.equal('vertical');
    expect(fileTree.getAttribute('aria-label')).to.equal('ファイルツリー');
    expect(fileTree.selectedId).to.equal('notes/design/file-tree');

    expect(selectedItem.hasAttribute('selected')).to.equal(true);
    expect(selectedItem.getAttribute('data-link-kind')).to.equal('internal-document');
    expect(selectedItem.getAttribute('data-link-surface')).to.equal('navigation');
    const selectedAction = getTreeItemAction(fileTree, 'notes/design/file-tree');
    expect(selectedAction.getAttribute('data-link-kind')).to.equal('internal-document');
    expect(selectedAction.getAttribute('data-link-surface')).to.equal('navigation');
    expect(expandedBranch.hasAttribute('has-children')).to.equal(true);
    expect(expandedBranch.hasAttribute('expanded')).to.equal(true);
    expect(ancestorBranch.hasAttribute('has-children')).to.equal(true);
    expect(ancestorBranch.hasAttribute('ancestor-selected')).to.equal(true);

    expect(firstVisibleItem.getAttribute('density')).to.equal('compact');
    expect(fileTree.getAttribute('variant')).to.equal('card');
  });

  it('selectedId の祖先 branch は補助展開され、selected leaf を可視化したうえで active に採用すること', async () => {
    const controlledExpandedIds = new Set<string>();
    const fileTree = await fixture<FileTree>(html`
      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        .expandedIds=${controlledExpandedIds}
        selected-id="notes/design/file-tree"
      ></ui-file-tree>
    `);

    await flush(fileTree);

    const selectedLeaf = getTreeItemHost(fileTree, 'notes/design/file-tree');
    const notesBranch = getTreeItemHost(fileTree, 'notes');
    const designBranch = getTreeItemHost(fileTree, 'notes/design');
    const collapsedBranchPanel = getTreeItemChildrenPanel(fileTree, 'notes/design');

    expect(notesBranch.hasAttribute('expanded')).to.equal(true);
    expect(designBranch.hasAttribute('expanded')).to.equal(true);
    expect(selectedLeaf.hasAttribute('selected')).to.equal(true);
    expect(selectedLeaf.getAttribute('tabindex')).to.equal('0');
    expect(collapsedBranchPanel.getAttribute('aria-hidden')).to.equal('false');
    expect(collapsedBranchPanel.hasAttribute('inert')).to.equal(false);
    expect(fileTree.activeId).to.equal('notes/design/file-tree');
    expect([...controlledExpandedIds]).to.deep.equal([]);
    expect(getTreeItemHost(fileTree, 'daily').getAttribute('tabindex')).to.equal('-1');
  });

  it('tree-item の focus request を bridge し、activeId を親子間で移動すること', async () => {
    const fileTree = await fixture<FileTree>(html`
      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        .defaultExpandedIds=${new Set(['notes', 'notes/design'])}
      ></ui-file-tree>
    `);

    await flush(fileTree);

    const activeIds: string[] = [];
    fileTree.addEventListener('ui-tree-active-change', (event: Event) => {
      activeIds.push((event as CustomEvent<{ id: string }>).detail.id);
    });

    const notesBranch = getTreeItemHost(fileTree, 'notes');
    notesBranch.dispatchEvent(
      new CustomEvent('tree-item-focus-first-child-request', {
        bubbles: true,
        composed: true,
      }),
    );
    await flush(fileTree);

    expect(fileTree.activeId).to.equal('notes/index');

    const selectedLeaf = getTreeItemHost(fileTree, 'notes/design/file-tree');
    selectedLeaf.dispatchEvent(
      new CustomEvent('tree-item-focus-parent-request', {
        bubbles: true,
        composed: true,
      }),
    );
    await flush(fileTree);

    expect(fileTree.activeId).to.equal('notes/design');
    expect(activeIds).to.deep.equal(['notes/index', 'notes/design']);
  });

  it('loadingStrategy=retain は aria-busy のみを立て、replace は skeleton に置き換えること', async () => {
    const retainTree = await fixture<FileTree>(html`
      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        loading
        loading-strategy="retain"
      ></ui-file-tree>
    `);

    await flush(retainTree);

    expect(retainTree.getAttribute('aria-busy')).to.equal('true');
    expect((retainTree.shadowRoot?.querySelectorAll('.skeleton').length ?? 0) === 0).to.equal(true);
    expect(retainTree.shadowRoot?.querySelector('ui-tree-item')).to.not.equal(null);

    const replaceTree = await fixture<FileTree>(html`
      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        loading
        loading-strategy="replace"
      ></ui-file-tree>
    `);

    await flush(replaceTree);

    expect(replaceTree.getAttribute('aria-busy')).to.equal('true');
    expect((replaceTree.shadowRoot?.querySelectorAll('.skeleton').length ?? 0) > 0).to.equal(true);
    expect(replaceTree.shadowRoot?.querySelectorAll('ui-tree-item').length ?? 0).to.equal(0);
  });

  it('ui-tree-request-select を cancel すると ui-tree-select を発火しないこと', async () => {
    const fileTree = await fixture<FileTree>(html`
      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        .defaultExpandedIds=${new Set(['notes'])}
      ></ui-file-tree>
    `);

    await flush(fileTree);

    let requestCount = 0;
    let commitCount = 0;
    let requestedId = '';

    fileTree.addEventListener('ui-tree-request-select', (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      requestCount += 1;
      requestedId = customEvent.detail.id;
      customEvent.preventDefault();
    });

    fileTree.addEventListener('ui-tree-select', () => {
      commitCount += 1;
    });

    const leafAction = getTreeItemAction(fileTree, 'notes/index');
    leafAction.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
      },
      { once: true },
    );
    leafAction.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    await flush(fileTree);

    expect(requestCount).to.equal(1);
    expect(requestedId).to.equal('notes/index');
    expect(commitCount).to.equal(0);
  });

  it('ui-tree-request-toggle を cancel すると uncontrolled 展開を変更せず ui-tree-toggle を発火しないこと', async () => {
    const fileTree = await fixture<FileTree>(html`
      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        .defaultExpandedIds=${new Set(['notes'])}
      ></ui-file-tree>
    `);

    await flush(fileTree);

    let requestCount = 0;
    let commitCount = 0;
    let requestedExpanded: boolean | null = null;

    fileTree.addEventListener('ui-tree-request-toggle', (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string; expanded: boolean }>;
      requestCount += 1;
      requestedExpanded = customEvent.detail.expanded;
      customEvent.preventDefault();
    });

    fileTree.addEventListener('ui-tree-toggle', () => {
      commitCount += 1;
    });

    const targetBranch = getTreeItemHost(fileTree, 'notes/design');
    expect(targetBranch.hasAttribute('expanded')).to.equal(false);

    getTreeItemAction(fileTree, 'notes/design').click();
    await flush(fileTree);

    expect(requestCount).to.equal(1);
    expect(requestedExpanded).to.equal(true);
    expect(commitCount).to.equal(0);
    expect(targetBranch.hasAttribute('expanded')).to.equal(false);
  });

  it('focusSelected と keyboard navigation と type-ahead が activeId を更新し、Escape で外部フォーカスへ戻すこと', async () => {
    const mount = await fixture<HTMLElement>(html`
      <div>
        <button id="tree-trigger" type="button">Tree Trigger</button>
        <ui-file-tree
          .items=${cloneTree(sampleTree)}
          .defaultExpandedIds=${new Set(['notes', 'notes/design'])}
          selected-id="notes/design/file-tree"
        ></ui-file-tree>
      </div>
    `);

    const trigger = must(
      mount.querySelector<HTMLButtonElement>('#tree-trigger'),
      '#tree-trigger が見つかりません',
    );
    const fileTree = must(
      mount.querySelector<FileTree>('ui-file-tree'),
      'ui-file-tree が見つかりません',
    );

    await flush(fileTree);

    trigger.focus();
    fileTree.focusSelected();
    await flush(fileTree);

    expect(fileTree.activeId).to.equal('notes/design/file-tree');

    const container = getContainer(fileTree);

    dispatchKey(container, 'ArrowDown');
    await flush(fileTree);
    expect(fileTree.activeId).to.equal('notes/design/tree-item');

    dispatchKey(container, 'Home');
    await flush(fileTree);
    expect(fileTree.activeId).to.equal('notes');

    dispatchKey(container, 'D');
    await flush(fileTree);
    expect(fileTree.activeId).to.equal('notes/design');

    dispatchKey(container, 'Escape');
    await nextAnimationFrame();

    expect(document.activeElement).to.equal(trigger);
  });

  it('leaf 操作で ui-tree-select、branch 操作で ui-tree-toggle、keyboard 移動で ui-tree-active-change を発火すること', async () => {
    const fileTree = await fixture<FileTree>(html`
      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        .defaultExpandedIds=${new Set(['notes', 'notes/design'])}
      ></ui-file-tree>
    `);

    await flush(fileTree);

    let selectedId = '';
    let toggledId = '';
    let toggledExpanded: boolean | null = null;
    let activeId = '';

    fileTree.addEventListener('ui-tree-select', (event: Event) => {
      selectedId = (event as CustomEvent<{ id: string }>).detail.id;
    });

    fileTree.addEventListener('ui-tree-toggle', (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; expanded: boolean }>).detail;
      toggledId = detail.id;
      toggledExpanded = detail.expanded;
    });

    fileTree.addEventListener('ui-tree-active-change', (event: Event) => {
      activeId = (event as CustomEvent<{ id: string }>).detail.id;
    });

    const leafAction = getTreeItemAction(fileTree, 'notes/design/file-tree');
    leafAction.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
      },
      { once: true },
    );
    leafAction.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    await flush(fileTree);

    expect(selectedId).to.equal('notes/design/file-tree');
    expect(fileTree.activeId).to.equal('notes/design/file-tree');

    getTreeItemAction(fileTree, 'notes/design').click();
    await flush(fileTree);

    expect(toggledId).to.equal('notes/design');
    expect(toggledExpanded).to.equal(false);
    expect(fileTree.activeId).to.equal('notes/design');

    const container = getContainer(fileTree);
    dispatchKey(container, 'End');
    await flush(fileTree);

    expect(activeId).to.equal('daily');
  });

  it('可視ノード更新で既存 activeId が無効になった場合、selectedId と先頭可視ノードへ順に補正すること', async () => {
    const fileTree = await fixture<FileTree>(html`
      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        .defaultExpandedIds=${new Set(['notes', 'notes/design'])}
        selected-id="notes/design/file-tree"
      ></ui-file-tree>
    `);

    await flush(fileTree);

    fileTree.focusFirst();
    await flush(fileTree);
    expect(fileTree.activeId).to.equal('notes');

    fileTree.items = [
      createBranch('archive', 'Archive', [
        createLeaf('archive/index', 'Index.md', '/archive/index'),
      ]),
    ];
    await flush(fileTree);

    expect(fileTree.activeId).to.equal('archive');

    fileTree.items = cloneTree(sampleTree);
    fileTree.selectedId = 'notes/design/tree-item';
    await flush(fileTree);

    expect(fileTree.activeId).to.equal('notes/design/tree-item');

    fileTree.items = [
      createBranch('notes', 'Notes', [
        createBranch('notes/design', 'Design', [
          createLeaf('notes/design/appendix', 'Appendix.md', '/notes/design/appendix'),
        ]),
      ]),
    ];
    await flush(fileTree);

    expect(fileTree.activeId).to.equal('notes');
  });

  it('printable=true では beforeprint で全 branch を展開し afterprint で元に戻すこと', async () => {
    const fileTree = await fixture<FileTree>(html`
      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        .defaultExpandedIds=${new Set(['notes'])}
        printable
      ></ui-file-tree>
    `);

    await flush(fileTree);

    const nestedBranch = getTreeItemHost(fileTree, 'notes/design');
    const nestedLeaf = getTreeItemHost(fileTree, 'notes/design/tree-item');
    expect(nestedBranch.hasAttribute('expanded')).to.equal(false);
    expect(nestedLeaf.hasAttribute('print-mode')).to.equal(false);

    window.dispatchEvent(new Event('beforeprint'));
    await flushWithoutAnimationFrame(fileTree);

    expect(nestedBranch.hasAttribute('expanded')).to.equal(true);
    expect(nestedLeaf.hasAttribute('print-mode')).to.equal(true);

    window.dispatchEvent(new Event('afterprint'));
    await flushWithoutAnimationFrame(fileTree);

    expect(nestedBranch.hasAttribute('expanded')).to.equal(false);
    expect(nestedLeaf.hasAttribute('print-mode')).to.equal(false);
  });
});
