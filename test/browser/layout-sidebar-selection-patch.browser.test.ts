import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderNoteSidebarNav } from '../../build/navigation/render-note-sidebar-nav.js';
import type { PresentSidebarShellProjection } from '../../shared/navigation/navigation-shell-snapshot.js';
import { createSidebarGroupIdPrefixFromSidebarIdentity } from '../../shared/navigation/sidebar-group-id.js';
import {
  createLayoutSidebarShellAdapter,
  readSidebarShellSnapshot,
} from '../../src/components/app/shell/layout-sidebar-shell-adapter.js';
import {
  readCurrentShellCommitId,
  resetShellLifecycleForTest,
} from '../../src/components/app/shell/app-shell-lifecycle.js';
import { layoutSidebarController } from '../../src/components/layout/layout-sidebar-controller.js';
import {
  adoptContentBinding,
  beginContentMutation,
  beginNavigationIntent,
  initializeContentContext,
  readContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import {
  readAddress,
  readHistoryEntry,
  writeHistoryEntry,
} from '../../src/navigation/history-entry.js';
import { fixture, requireFixtureValue } from './harness/browser-fixture.js';

const source = '/notes/testing/reader-basic';
const target = '/notes/testing/toc-readable-long-heading';
const sourceId = 'testing/reader-basic';
const targetId = 'testing/toc-readable-long-heading';
const sidebarId = 'note-primary';
const stateScopeId = 'note-navigation';
const originalUrl = readAddress();
const originalState: unknown = history.state;
let sourceState: unknown;
let targetState: unknown;
let sourceEntryId: string;
let targetEntryId: string;

const quotaBoundary = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, 10_000));
const restoreHistory = (state: unknown, url: string): void => {
  if (readAddress() !== url || JSON.stringify(history.state) !== JSON.stringify(state))
    history.replaceState(state, '', url);
};

beforeAll(async () => {
  // 管理entryをsuite単位で作り、毎caseのURL往復書込みを増やさない。
  await quotaBoundary();
  writeHistoryEntry({ mode: 'replace', owner: 'router', url: source, state: {} });
  sourceState = history.state;
  sourceEntryId = requireFixtureValue(readHistoryEntry()).id;
  writeHistoryEntry({ mode: 'push', owner: 'router', url: target });
  targetState = history.state;
  targetEntryId = requireFixtureValue(readHistoryEntry()).id;
}, 15_000);

afterAll(async () => {
  restoreHistory(originalState, originalUrl);
  await quotaBoundary();
}, 15_000);

const projection = (selectedId = sourceId): PresentSidebarShellProjection => ({
  present: true,
  sidebarId,
  stateScopeId,
  selectedId,
  initialExpandedIds: ['branch'],
  topologyRevision: 'selection-tree-v1',
  navHtml: renderNoteSidebarNav(
    [
      {
        id: 'branch',
        label: '検証ノート',
        kind: 'branch',
        depth: 0,
        isCurrent: false,
        hasCurrentDescendant: true,
        showsCurrentPathIndicator: true,
        isInitiallyExpanded: true,
        children: [
          {
            id: sourceId,
            label: 'Reader Basic',
            kind: 'leaf',
            href: source,
            depth: 1,
            isCurrent: selectedId === sourceId,
            hasCurrentDescendant: false,
            showsCurrentPathIndicator: false,
            isInitiallyExpanded: false,
            children: [],
          },
          {
            id: targetId,
            label: 'TOC Readable Long Heading',
            kind: 'leaf',
            href: target,
            depth: 1,
            isCurrent: selectedId === targetId,
            hasCurrentDescendant: false,
            showsCurrentPathIndicator: false,
            isInitiallyExpanded: false,
            children: [],
          },
        ],
      },
    ],
    {
      sidebarId,
      topologyRevision: 'selection-tree-v1',
      groupIdPrefix: createSidebarGroupIdPrefixFromSidebarIdentity(stateScopeId, sidebarId),
    },
  ),
  heading: null,
  fixedBreakpoint: 1024,
  presentation: 'auto',
});

const editNav = (
  snapshot: PresentSidebarShellProjection,
  edit: (nav: HTMLElement) => void,
): void => {
  const template = document.createElement('template');
  template.innerHTML = snapshot.navHtml;
  const nav = template.content.firstElementChild;
  if (!(nav instanceof HTMLElement)) throw new Error('nav fixture');
  edit(nav);
  snapshot.navHtml = nav.outerHTML;
};

const attributeSnapshot = (element: Element, excluded: string[] = []): string[][] =>
  [...element.attributes]
    .filter((attribute) => !excluded.includes(attribute.name))
    .map((attribute) => [attribute.name, attribute.value]);

let main: HTMLElement;
let root: HTMLElement;
let surface: HTMLElement;
let nav: HTMLElement;

beforeEach(async () => {
  const initial = projection();
  const shell = await fixture(`<div data-selection-fixture>
    <button data-focus-return>戻る</button>
    <div data-app-shell-sidebar-host><aside data-layout-sidebar-root data-mode="fixed"
      data-sidebar-enhancement-state="active" data-sidebar-enhancement-shell-commit-id="0"
      sidebar-id="${sidebarId}" state-scope-id="${stateScopeId}" selected-id="${sourceId}"
      initial-expanded-ids='["branch"]' topology-revision="selection-tree-v1" fixed-breakpoint="1024" presentation="auto">
      <details data-layout-sidebar-disclosure open><summary>Navigation</summary>
        <div data-layout-sidebar-surface>${initial.navHtml}</div>
      </details>
    </aside></div>
    <main id="main-content"><h1>Reader Basic</h1></main>
  </div>`);
  main = requireFixtureValue(shell.querySelector<HTMLElement>('main'));
  root = requireFixtureValue(shell.querySelector<HTMLElement>('aside'));
  surface = requireFixtureValue(root.querySelector<HTMLElement>('[data-layout-sidebar-surface]'));
  nav = requireFixtureValue(surface.querySelector<HTMLElement>('nav'));
  initializeContentContext(main);
  // addressはtraverse先、表示bindingは取得中の旧本文という実transactionの状態を作る。
  adoptContentBinding(source, sourceEntryId);
  beginNavigationIntent('traverse', target);
  layoutSidebarController.initialize(sidebarId, {
    presentation: 'auto',
    fixedBreakpoint: 1024,
    storage: localStorage,
  });
  layoutSidebarController.restoreRuntimeSnapshot(sidebarId, {
    overlayState: 'expanded',
    returnFocusDescriptor: {
      kind: 'connected-element',
      element: requireFixtureValue(shell.querySelector<HTMLElement>('[data-focus-return]')),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  releaseContentContext(readContentContext()?.root ?? null);
  layoutSidebarController.reset();
  resetShellLifecycleForTest();
  restoreHistory(targetState, target);
});

const prepare = (next = projection(targetId), navigationUrl = target) =>
  createLayoutSidebarShellAdapter().prepare({
    shell: { headerHtml: '', sidebarProjection: next },
    navigationUrl,
    shellCommitId: 1,
  });
const mutateMain = (): number => {
  const epoch = beginContentMutation(main);
  main.innerHTML = '<h1>TOC Readable Long Heading</h1>';
  return epoch;
};
const currentLinks = () => ({
  source: requireFixtureValue(nav.querySelector<HTMLAnchorElement>(`a[href="${source}"]`)),
  target: requireFixtureValue(nav.querySelector<HTMLAnchorElement>(`a[href="${target}"]`)),
});

describe('managed traverseのsidebar選択属性patch', () => {
  it('検証済みprojectionではnav/link/spanを切断せず選択だけ移し、runtimeと所有者を保つこと', async () => {
    const nodes = [nav, ...nav.querySelectorAll('*')];
    const links = currentLinks();
    const branch = requireFixtureValue(nav.querySelector<HTMLDetailsElement>('details'));
    branch.open = false;
    links.source.tabIndex = 0;
    links.target.style.color = 'rgb(1, 2, 3)';
    const span = requireFixtureValue(links.target.querySelector<HTMLElement>('span'));
    span.inert = true;
    const beforeRoot = attributeSnapshot(root, ['selected-id']);
    const runtime = layoutSidebarController.readRuntimeSnapshot(sidebarId);
    const controller = layoutSidebarController.getSnapshot(sidebarId);
    const generation = readCurrentShellCommitId();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const clearStorage = vi.spyOn(Storage.prototype, 'clear');
    const initializeController = vi.spyOn(layoutSidebarController, 'initialize');
    const historyReplace = vi.spyOn(history, 'replaceState');
    const historyPush = vi.spyOn(history, 'pushState');
    const restoreController = vi.spyOn(layoutSidebarController, 'restoreRuntimeSnapshot');
    const removed: Node[] = [];
    const observer = new MutationObserver((records) =>
      records.forEach((record) => removed.push(...record.removedNodes)),
    );
    observer.observe(surface, { childList: true, subtree: true });
    try {
      const previousEpoch = readContentContext()?.contentEpoch ?? -1;
      const update = prepare();
      const nextEpoch = mutateMain();
      expect(nextEpoch).toBeGreaterThan(previousEpoch);
      await update.commit();
      await Promise.resolve();
      expect(surface.querySelector('nav')).toBe(nav);
      const after = [nav, ...nav.querySelectorAll('*')];
      expect(after).toHaveLength(nodes.length);
      after.forEach((node, index) => expect(node).toBe(nodes[index]));
      expect(nodes.every((node) => node.isConnected)).toBe(true);
      expect(removed).toHaveLength(0);
      expect(links.source.hasAttribute('aria-current')).toBe(false);
      expect(links.target.getAttribute('aria-current')).toBe('page');
      expect(root.getAttribute('selected-id')).toBe(targetId);
      expect(branch.open).toBe(false);
      expect(links.source.tabIndex).toBe(0);
      expect(links.target.style.color).toBe('rgb(1, 2, 3)');
      expect(span.inert).toBe(true);
      expect(attributeSnapshot(root, ['selected-id'])).toEqual(beforeRoot);
      expect(layoutSidebarController.readRuntimeSnapshot(sidebarId)).toEqual(runtime);
      expect(layoutSidebarController.getSnapshot(sidebarId)).toEqual(controller);
      expect(readCurrentShellCommitId()).toBe(generation);
      expect(restoreController).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
      expect(removeItem).not.toHaveBeenCalled();
      expect(clearStorage).not.toHaveBeenCalled();
      expect(initializeController).not.toHaveBeenCalled();
      expect(historyReplace).not.toHaveBeenCalled();
      expect(historyPush).not.toHaveBeenCalled();
    } finally {
      observer.disconnect();
    }
  });

  it('逆方向のtraverseでもnav/linkを保持して同node上でrollbackする', async () => {
    nav.innerHTML =
      new DOMParser()
        .parseFromString(projection(targetId).navHtml, 'text/html')
        .querySelector('nav')?.innerHTML ?? '';
    root.setAttribute('selected-id', targetId);
    restoreHistory(sourceState, source);
    adoptContentBinding(target, targetEntryId);
    beginNavigationIntent('traverse', source);
    const links = currentLinks();
    const update = prepare(projection(sourceId), source);
    mutateMain();
    await update.commit();
    expect(surface.firstElementChild).toBe(nav);
    expect(links.source.getAttribute('aria-current')).toBe('page');
    expect(links.target.hasAttribute('aria-current')).toBe(false);
    await update.rollback();
    expect(surface.firstElementChild).toBe(nav);
    expect(links.target.getAttribute('aria-current')).toBe('page');
    expect(root.getAttribute('selected-id')).toBe(targetId);
  });

  it('ページ名・note IDの対応に依存せず正規hrefのdocumentで選択を照合する', async () => {
    const oldUrl = '/about/';
    const nextUrl = '/corpora/guide/';
    const retarget = (snapshot: PresentSidebarShellProjection): PresentSidebarShellProjection => {
      snapshot.selectedId = snapshot.selectedId === sourceId ? 'opaque-old' : 'opaque-new';
      editNav(snapshot, (element) => {
        for (const [id, replacementId, url] of [
          [sourceId, 'opaque-old', oldUrl],
          [targetId, 'opaque-new', nextUrl],
        ]) {
          const row = [...element.querySelectorAll('li[data-node-id]')].find(
            (node) => node.getAttribute('data-node-id') === id,
          );
          requireFixtureValue(row).setAttribute('data-node-id', replacementId ?? '');
          requireFixtureValue(row?.querySelector('a')).setAttribute('href', url ?? '');
        }
      });
      return snapshot;
    };
    const previous = retarget(projection());
    const next = retarget(projection(targetId));
    nav.innerHTML = requireFixtureValue(
      new DOMParser().parseFromString(previous.navHtml, 'text/html').querySelector('nav'),
    ).innerHTML;
    root.setAttribute('selected-id', 'opaque-old');
    restoreHistory(targetState, nextUrl);
    adoptContentBinding(oldUrl, sourceEntryId);
    beginNavigationIntent('traverse', nextUrl);
    const nodes = [nav, ...nav.querySelectorAll('*')];
    const update = prepare(next, nextUrl);
    mutateMain();
    await update.commit();
    expect(surface.firstElementChild).toBe(nav);
    expect(nodes.every((node) => node.isConnected)).toBe(true);
    expect(nav.querySelector('[aria-current]')?.getAttribute('href')).toBe(nextUrl);
    expect(root.getAttribute('selected-id')).toBe('opaque-new');
  });

  it('同documentのquery/hash付き宛先でもpayloadとexact browser ownerを別々に検証する', async () => {
    const url = `${target}?view=reading#section`;
    restoreHistory(targetState, url);
    beginNavigationIntent('traverse', url);
    const update = prepare(projection(targetId), url);
    mutateMain();
    await update.commit();
    expect(surface.firstElementChild).toBe(nav);
    expect(root.getAttribute('selected-id')).toBe(targetId);
    expect(readAddress()).toBe(url);
  });

  it('browser ownerの末尾slashを保持し、正規payload URLで同nodeを更新すること', async () => {
    history.replaceState(targetState, '', `${target}/`);
    beginNavigationIntent('traverse', `${target}/`);
    const links = currentLinks();
    const update = prepare();
    mutateMain();
    await update.commit();
    expect(readAddress()).toBe(`${target}/`);
    expect(surface.querySelector('nav')).toBe(nav);
    expect(links.source.hasAttribute('aria-current')).toBe(false);
    expect(links.target.getAttribute('aria-current')).toBe('page');
    expect(links.target.getAttribute('href')).toBe(target);
    expect(root.getAttribute('selected-id')).toBe(targetId);
  });

  it('受理前の履歴例外ではmode解除後も同node上の属性をrollbackしてruntimeを戻すこと', async () => {
    const links = currentLinks();
    const span = links.target.querySelector('span');
    const canonical = readSidebarShellSnapshot(root);
    const runtime = layoutSidebarController.readRuntimeSnapshot(sidebarId);
    const update = prepare();
    mutateMain();
    await update.commit();
    expect(surface.querySelector('nav')).toBe(nav);
    const writer = vi.spyOn(history, 'replaceState').mockImplementationOnce(() => {
      throw new DOMException('history failed', 'SecurityError');
    });
    try {
      expect(() => writeHistoryEntry({ mode: 'replace', owner: 'router', url: target })).toThrow(
        'history failed',
      );
      root.removeAttribute('data-mode');
      await update.rollback();
      expect(surface.querySelector('nav')).toBe(nav);
      expect(nav.querySelector(`a[href="${source}"]`)).toBe(links.source);
      expect(nav.querySelector(`a[href="${target}"]`)).toBe(links.target);
      expect(links.target.querySelector('span')).toBe(span);
      expect(links.source.getAttribute('aria-current')).toBe('page');
      expect(links.target.hasAttribute('aria-current')).toBe(false);
      expect(readSidebarShellSnapshot(root)).toEqual(canonical);
      expect(layoutSidebarController.readRuntimeSnapshot(sidebarId)).toEqual(runtime);
    } finally {
      writer.mockRestore();
    }
  });

  it('後続intentで失効しても同navの確定前rollbackは逆patchすること', async () => {
    const links = currentLinks();
    const update = prepare();
    mutateMain();
    await update.commit();
    beginNavigationIntent('navigation', '/notes/other');
    await update.rollback();
    expect(surface.querySelector('nav')).toBe(nav);
    expect(links.source.getAttribute('aria-current')).toBe('page');
    expect(links.target.hasAttribute('aria-current')).toBe(false);
    expect(root.getAttribute('selected-id')).toBe(sourceId);
  });

  it.each(['unchanged-node-aria', 'owned-aria-value', 'root-selected-id'])(
    'commit後の未知%sはsnapshot rollbackへ戻して残さないこと',
    async (change) => {
      const previous = readSidebarShellSnapshot(root);
      const update = prepare();
      mutateMain();
      await update.commit();
      expect(surface.querySelector('nav')).toBe(nav);
      if (change === 'unchanged-node-aria')
        requireFixtureValue(nav.querySelector('summary')).setAttribute('aria-current', 'page');
      if (change === 'owned-aria-value') currentLinks().target.setAttribute('aria-current', 'step');
      if (change === 'root-selected-id') root.setAttribute('selected-id', 'unexpected-selection');
      await update.rollback();
      const restored = requireFixtureValue(surface.querySelector('nav'));
      expect(restored).not.toBe(nav);
      expect(nav.isConnected).toBe(false);
      expect(restored.querySelectorAll('[aria-current]')).toHaveLength(1);
      expect(restored.querySelector('[aria-current]')?.getAttribute('href')).toBe(source);
      expect(restored.querySelector('[aria-current]')?.getAttribute('aria-current')).toBe('page');
      expect(readSidebarShellSnapshot(root)).toEqual(previous);
    },
  );

  it.each(['source-before', 'target-before', 'selected-id-before'])(
    '自分の%sへの部分適用は同nodeの逆patchで戻せること',
    async (partial) => {
      const links = currentLinks();
      const update = prepare();
      mutateMain();
      await update.commit();
      if (partial === 'source-before') links.source.setAttribute('aria-current', 'page');
      if (partial === 'target-before') links.target.removeAttribute('aria-current');
      if (partial === 'selected-id-before') root.setAttribute('selected-id', sourceId);
      await update.rollback();
      expect(surface.querySelector('nav')).toBe(nav);
      expect(links.source.isConnected).toBe(true);
      expect(links.target.isConnected).toBe(true);
      expect(links.source.getAttribute('aria-current')).toBe('page');
      expect(links.target.hasAttribute('aria-current')).toBe(false);
      expect(root.getAttribute('selected-id')).toBe(sourceId);
    },
  );

  it.each([
    'href',
    'text',
    'structure',
    'row-id',
    'unknown-attribute',
    'topology',
    'initial-expanded',
    'heading',
    'presentation',
    'breakpoint',
    'sidebar-id',
    'state-scope',
    'invalid-selection',
    'extra-selection',
  ])('%s差分があれば選択patchへ広げず従来nav交換へ戻ること', async (difference) => {
    const next = projection(targetId);
    if (difference === 'href')
      editNav(next, (element) =>
        requireFixtureValue(
          element.querySelector<HTMLAnchorElement>(`a[href="${source}"]`),
        ).setAttribute('href', '/notes/changed'),
      );
    if (difference === 'text')
      editNav(next, (element) =>
        requireFixtureValue(element.querySelector('span[data-sidebar-nav-label]')).append('変更'),
      );
    if (difference === 'structure')
      editNav(next, (element) =>
        requireFixtureValue(element.querySelector('li[data-node-kind="leaf"] span')).append(
          document.createElement('strong'),
        ),
      );
    if (difference === 'row-id')
      editNav(next, (element) =>
        requireFixtureValue(element.querySelector('li[data-node-kind="leaf"]')).setAttribute(
          'data-node-id',
          'changed-id',
        ),
      );
    if (difference === 'unknown-attribute')
      editNav(next, (element) => element.setAttribute('data-future-sidebar-contract', 'true'));
    if (difference === 'topology') {
      next.topologyRevision = 'selection-tree-v2';
      editNav(next, (element) =>
        element.setAttribute('data-topology-revision', 'selection-tree-v2'),
      );
    }
    if (difference === 'initial-expanded') {
      next.initialExpandedIds = [];
      editNav(next, (element) =>
        requireFixtureValue(element.querySelector('details')).removeAttribute('open'),
      );
    }
    if (difference === 'heading') next.heading = '別の見出し';
    if (difference === 'presentation') next.presentation = 'overlay';
    if (difference === 'breakpoint') next.fixedBreakpoint = 1100;
    if (difference === 'sidebar-id') {
      next.sidebarId = 'other-sidebar';
      editNav(next, (element) => element.setAttribute('data-sidebar-id', 'other-sidebar'));
    }
    if (difference === 'state-scope') next.stateScopeId = 'other-scope';
    if (difference === 'invalid-selection') next.selectedId = sourceId;
    if (difference === 'extra-selection')
      editNav(next, (element) =>
        requireFixtureValue(element.querySelector(`a[href="${source}"]`)).setAttribute(
          'aria-current',
          'page',
        ),
      );
    const update = prepare(next);
    mutateMain();
    await update.commit();
    expect(surface.querySelector('nav')).not.toBe(nav);
    expect(nav.isConnected).toBe(false);
  });

  it.each([
    'wrong-route',
    'noncanonical-payload',
    'wrong-source',
    'non-traverse',
    'entry-mismatch',
    'same-entry',
    'unmanaged-entry',
    'already-mutating',
    'overlay-placement',
    'root-inert',
    'absent-root',
    'narrow-viewport',
  ])('%sでは従来nav交換へ戻ること', async (condition) => {
    if (condition === 'wrong-source') adoptContentBinding('/notes/other', sourceEntryId);
    if (condition === 'non-traverse') beginNavigationIntent('navigation', target);
    if (condition === 'entry-mismatch') history.replaceState(sourceState, '', target);
    if (condition === 'same-entry') adoptContentBinding(source, targetEntryId);
    if (condition === 'unmanaged-entry') history.replaceState(null, '', target);
    if (condition === 'already-mutating') beginContentMutation(main);
    if (condition === 'overlay-placement') root.setAttribute('data-mode', 'overlay');
    if (condition === 'root-inert') root.inert = true;
    if (condition === 'absent-root') root.hidden = true;
    if (condition === 'narrow-viewport') vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800);
    const update = prepare(
      projection(targetId),
      condition === 'wrong-route'
        ? '/notes/other'
        : condition === 'noncanonical-payload'
          ? `${target}/`
          : target,
    );
    mutateMain();
    await update.commit();
    expect(surface.querySelector('nav')).not.toBe(nav);
    expect(nav.isConnected).toBe(false);
  });

  it.each([
    'nav-swap',
    'descendant-swap',
    'new-intent',
    'new-entry',
    'metadata-change',
    'no-content-mutation',
  ])('prepare後の%sは再照合して従来nav交換へ戻ること', async (change) => {
    const update = prepare();
    if (change === 'nav-swap') surface.replaceChildren(nav.cloneNode(true));
    if (change === 'descendant-swap') {
      const label = requireFixtureValue(nav.querySelector('span[data-sidebar-nav-label]'));
      label.replaceWith(label.cloneNode(true));
    }
    if (change === 'new-intent') beginNavigationIntent('traverse', target);
    if (change === 'new-entry') history.replaceState(sourceState, '', target);
    if (change === 'metadata-change') root.setAttribute('fixed-breakpoint', '1100');
    if (change !== 'no-content-mutation') mutateMain();
    await update.commit();
    expect(surface.querySelector('nav')).not.toBe(nav);
    expect(nav.isConnected).toBe(false);
  });
});
