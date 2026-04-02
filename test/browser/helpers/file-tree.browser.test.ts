import { expect, fixture, html } from '@open-wc/testing';
import '../../../src/components/ui/file-tree/file-tree.js';
import type { FileTree, TreeNode } from '../../../src/components/ui/file-tree/file-tree.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './wait-for-lit.js';

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

const getContainer = (fileTree: FileTree): HTMLElement =>
  must(fileTree.shadowRoot?.querySelector<HTMLElement>('.container'), '.container が見つかりません');

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

describe('ui-file-tree browser contract', () => {
  it('controlled selectedId / expandedIds と density を公開 DOM へ反映すること', async () => {
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
    expect(expandedBranch.hasAttribute('expanded')).to.equal(true);
    expect(ancestorBranch.hasAttribute('ancestor-selected')).to.equal(true);

    expect(firstVisibleItem.getAttribute('density')).to.equal('compact');
    expect(fileTree.getAttribute('variant')).to.equal('card');
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
    expect(retainTree.shadowRoot?.querySelector('.skeleton')).to.equal(null);
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
    expect(replaceTree.shadowRoot?.querySelector('.skeleton')).to.not.equal(null);
    expect(replaceTree.shadowRoot?.querySelector('ui-tree-item')).to.equal(null);
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

    getTreeItemAction(fileTree, 'notes/index').click();
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
    expect(fileTree.activeId).to.equal('daily');

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

    getTreeItemAction(fileTree, 'notes/design/file-tree').click();
    await flush(fileTree);

    expect(selectedId).to.equal('notes/design/file-tree');

    getTreeItemAction(fileTree, 'notes/design').click();
    await flush(fileTree);

    expect(toggledId).to.equal('notes/design');
    expect(toggledExpanded).to.equal(false);

    const container = getContainer(fileTree);
    dispatchKey(container, 'End');
    await flush(fileTree);

    expect(activeId).to.equal('daily/2026-03-24');
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

    expect(fileTree.shadowRoot?.querySelector('ui-tree-item[data-id="notes/design/tree-item"]')).to.equal(
      null,
    );

    window.dispatchEvent(new Event('beforeprint'));
    await flush(fileTree);

    const printVisibleLeaf = getTreeItemHost(fileTree, 'notes/design/tree-item');
    expect(printVisibleLeaf.hasAttribute('print-mode')).to.equal(true);

    window.dispatchEvent(new Event('afterprint'));
    await flush(fileTree);

    expect(fileTree.shadowRoot?.querySelector('ui-tree-item[data-id="notes/design/tree-item"]')).to.equal(
      null,
    );
  });
});