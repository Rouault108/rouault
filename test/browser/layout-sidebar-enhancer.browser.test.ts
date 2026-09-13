import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { enhanceLayoutSidebar } from '../../src/client/post-hydrate/layout-sidebar-enhancer.js';
import { layoutSidebarController } from '../../src/components/layout/layout-sidebar-controller.js';
import {
  createLayoutSidebarShellAdapter,
  readSidebarShellSnapshot,
} from '../../src/components/app/shell/layout-sidebar-shell-adapter.js';
import {
  commitShellGeneration,
  restoreShellGeneration,
  resetShellLifecycleForTest,
} from '../../src/components/app/shell/app-shell-lifecycle.js';
import { waitForCondition } from './harness/browser-test-utilities.js';
import { getLayoutSidebarTreeStateStorageKey } from '../../src/components/layout/layout-sidebar-tree-state.js';

const required = <T>(value: T | null): T => {
  if (value === null) throw new Error('fixture value missing');
  return value;
};
let abort: AbortController;
let shell: HTMLDivElement;
const navHtml =
  '<nav data-sidebar-nav data-sidebar-id="note-primary" data-topology-revision="test"><ul><li data-node-id="branch" data-node-kind="branch"><details data-sidebar-nav-branch open><summary data-sidebar-nav-control>Branch</summary><ul><li data-node-id="leaf" data-node-kind="leaf"><a data-sidebar-nav-control href="/about/" aria-current="page">Page</a></li></ul></details></li></ul></nav>';
const projection = {
  present: true as const,
  sidebarId: 'note-primary',
  stateScopeId: 'note-navigation',
  selectedId: 'leaf',
  initialExpandedIds: ['branch'],
  topologyRevision: 'test',
  navHtml,
  heading: null,
  fixedBreakpoint: 1024,
  presentation: 'overlay' as const,
};
const treeKey = getLayoutSidebarTreeStateStorageKey();
const event = (name: string, detail: object): void => {
  document.dispatchEvent(new CustomEvent(name, { detail }));
};
const state = (): string | null => shell.getAttribute('data-sidebar-enhancement-state');
const ready = (id = 0): void => {
  shell.setAttribute('data-layout-header-ready-shell-commit-id', String(id));
  shell.setAttribute('data-layout-header-enhancer-state', 'ready');
};
const validate = (id = 0): void => event('app-shell:validated', { shellCommitId: id });
const fixture = (present = true): HTMLElement => {
  abort = new AbortController();
  shell = document.createElement('div');
  shell.setAttribute('data-app-shell-root', '');
  shell.innerHTML = `<header data-layout-header><button data-layout-sidebar-toggle data-sidebar-id="note-primary">Toggle</button></header><div data-app-shell-sidebar-host ${present ? '' : 'hidden'}><aside data-layout-sidebar-root ${present ? '' : 'hidden'} sidebar-id="note-primary" state-scope-id="note-navigation" selected-id="leaf" initial-expanded-ids='["branch"]' topology-revision="test" presentation="overlay"><details open data-layout-sidebar-disclosure><summary data-layout-sidebar-static-trigger>Navigation</summary><div data-layout-sidebar-surface>${present ? navHtml : ''}</div></details></aside></div><div data-app-shell-sidebar-overlay-layer><div data-layout-sidebar-backdrop hidden></div></div><button data-external-focus>Outside</button>`;
  document.body.append(shell);
  const root = shell.querySelector<HTMLElement>('[data-layout-sidebar-root]');
  if (!root) throw new Error('missing fixture root');
  return root;
};
const start = (root: HTMLElement): void => {
  ready();
  enhanceLayoutSidebar(root, abort.signal);
  validate();
};

afterEach(() => {
  vi.restoreAllMocks();
  abort?.abort();
  shell?.remove();
  layoutSidebarController.reset();
  resetShellLifecycleForTest();
  localStorage.removeItem(treeKey);
  localStorage.removeItem('rouault.note-sidebar.overlay-state');
});

describe('plain sidebar shell lifecycle', () => {
  it('initial absent is dormant and retains the root across present and absent commits', () => {
    const root = fixture(false);
    start(root);
    expect(state()).toBe('dormant');
    const mutation = createLayoutSidebarShellAdapter().prepare({
      shell: { headerHtml: '', sidebarProjection: projection },
      navigationUrl: '/about/',
      shellCommitId: 1,
    });
    mutation.commit();
    commitShellGeneration(1);
    ready(1);
    event('app-shell:committed', { shellCommitId: 1 });
    expect(state()).toBe('staged');
    expect(root.querySelectorAll('nav')).toHaveLength(1);
    validate(1);
    expect(state()).toBe('active');
    const absent = createLayoutSidebarShellAdapter().prepare({
      shell: { headerHtml: '', sidebarProjection: null },
      navigationUrl: '/',
      shellCommitId: 2,
    });
    absent.commit();
    commitShellGeneration(2);
    ready(2);
    event('app-shell:committed', { shellCommitId: 2 });
    expect(state()).toBe('staged');
    validate(2);
    expect(state()).toBe('dormant');
    expect(shell.querySelector('[data-layout-sidebar-root]')).toBe(root);
    expect(root.querySelectorAll('nav')).toHaveLength(0);
  });

  it('pre-active native close remains fallback even after reopen and readiness recovery', async () => {
    const root = fixture();
    const disclosure = required(
      root.querySelector<HTMLDetailsElement>('[data-layout-sidebar-disclosure]'),
    );
    disclosure.open = false;
    start(root);
    expect(state()).toBe('fallback');
    await userEvent.click(required(root.querySelector('[data-layout-sidebar-static-trigger]')));
    expect(disclosure.open).toBe(true);
    ready();
    await Promise.resolve();
    expect(state()).toBe('fallback');
  });

  it('staging restores native Tab order without collapsing raw overlay state or clearing focus descriptor', () => {
    const root = fixture();
    start(root);
    const trigger = required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]'));
    layoutSidebarController.open('note-primary', trigger);
    const snapshot = layoutSidebarController.readRuntimeSnapshot();
    commitShellGeneration(1);
    event('app-shell:committed', { shellCommitId: 1 });
    expect(state()).toBe('staged');
    expect(root.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(layoutSidebarController.readRuntimeSnapshot()).toEqual(snapshot);
    expect(root.parentElement?.hasAttribute('data-app-shell-sidebar-host')).toBe(true);
  });

  it('successful absent settlement clears the user session without persisting a close', () => {
    const root = fixture();
    start(root);
    layoutSidebarController.open(
      undefined,
      required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]')),
    );
    const bytes = localStorage.getItem('rouault.note-sidebar.overlay-state');
    const mutation = createLayoutSidebarShellAdapter().prepare({
      shell: { headerHtml: '', sidebarProjection: null },
      navigationUrl: '/',
      shellCommitId: 1,
    });
    mutation.commit();
    commitShellGeneration(1);
    event('app-shell:committed', { shellCommitId: 1 });
    expect(layoutSidebarController.readRuntimeSnapshot().overlayState).toBe('expanded');
    validate(1);
    expect(layoutSidebarController.readRuntimeSnapshot()).toEqual({
      overlayState: 'collapsed',
      returnFocusDescriptor: null,
    });
    expect(localStorage.getItem('rouault.note-sidebar.overlay-state')).toBe(bytes);
  });

  it('rollback restores canonical nav and raw state then reconciles after restored dispatch', async () => {
    const root = fixture();
    start(root);
    layoutSidebarController.open(
      undefined,
      required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]')),
    );
    const before = layoutSidebarController.readRuntimeSnapshot();
    const mutation = createLayoutSidebarShellAdapter().prepare({
      shell: { headerHtml: '', sidebarProjection: null },
      navigationUrl: '/',
      shellCommitId: 1,
    });
    mutation.commit();
    commitShellGeneration(1);
    event('app-shell:committed', { shellCommitId: 1 });
    event('app-shell:rollback-start', { failedShellCommitId: 1 });
    mutation.rollback();
    restoreShellGeneration(0);
    event('app-shell:restored', { restoredShellCommitId: 0 });
    ready(0);
    expect(state()).toBe('staged');
    expect(layoutSidebarController.readRuntimeSnapshot()).toEqual(before);
    await Promise.resolve();
    expect(state()).toBe('active');
    expect(root.querySelectorAll('nav')).toHaveLength(1);
  });

  it('canonical readback excludes roving state and user disclosure state', () => {
    const root = fixture();
    start(root);
    required(root.querySelector<HTMLDetailsElement>('[data-sidebar-nav-branch]')).open = false;
    const snapshot = readSidebarShellSnapshot(root);
    expect(snapshot.navHtml).not.toContain('tabindex');
    expect(snapshot.navHtml).toContain(' open');
  });

  it('invalid projection prepare changes neither DOM nor controller state', () => {
    const root = fixture();
    start(root);
    const before = root.outerHTML;
    expect(() =>
      createLayoutSidebarShellAdapter().prepare({
        shell: {
          headerHtml: '',
          sidebarProjection: { ...projection, navHtml: '<div>invalid</div>' },
        },
        navigationUrl: '/',
        shellCommitId: 1,
      }),
    ).toThrow();
    expect(root.outerHTML).toBe(before);
  });

  it('staged trusted branch toggles flush only at matching validation', async () => {
    const root = fixture();
    start(root);
    commitShellGeneration(1);
    event('app-shell:committed', { shellCommitId: 1 });
    await userEvent.click(required(root.querySelector('summary[data-sidebar-nav-control]')));
    await waitForCondition(
      () => !required(root.querySelector<HTMLDetailsElement>('[data-sidebar-nav-branch]')).open,
      'native branch closes',
    );
    expect(localStorage.getItem(treeKey)).toBeNull();
    validate(1);
    await waitForCondition(
      () => localStorage.getItem(treeKey) !== null,
      'validated tree is persisted',
    );
    expect(JSON.parse(required(localStorage.getItem(treeKey)))).toEqual({ expandedIds: [] });
    expect(state()).toBe('fallback');
  });

  it('synthetic activation is never persisted', async () => {
    const root = fixture();
    start(root);
    required(root.querySelector<HTMLElement>('summary[data-sidebar-nav-control]')).click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(localStorage.getItem(treeKey)).toBeNull();
  });

  it('persisted expanded with no descriptor does not steal focus', () => {
    const root = fixture();
    const external = required(shell.querySelector<HTMLElement>('[data-external-focus]'));
    external.focus();
    localStorage.setItem('rouault.note-sidebar.overlay-state', '{"note-primary":"expanded"}');
    start(root);
    expect(state()).toBe('active');
    expect(root.inert).toBe(false);
    expect(document.activeElement).toBe(external);
    expect(layoutSidebarController.readRuntimeSnapshot().returnFocusDescriptor).toBeNull();
  });

  it('presentation moves the same live root and nav', () => {
    const root = fixture();
    start(root);
    const nav = root.querySelector('nav');
    layoutSidebarController.setViewportMode(undefined, 'fixed');
    expect(root.parentElement?.hasAttribute('data-app-shell-sidebar-host')).toBe(true);
    layoutSidebarController.setViewportMode(undefined, 'overlay');
    expect(root.parentElement?.hasAttribute('data-app-shell-sidebar-overlay-layer')).toBe(true);
    expect(root.querySelector('nav')).toBe(nav);
  });

  it('header replacement rebinds a logical return target without moving initial focus', () => {
    const root = fixture();
    start(root);
    const trigger = required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]'));
    layoutSidebarController.open(undefined, trigger);
    const next = trigger.cloneNode(true) as HTMLElement;
    trigger.replaceWith(next);
    required(shell.querySelector<HTMLElement>('[data-external-focus]')).focus();
    commitShellGeneration(1);
    event('app-shell:committed', { shellCommitId: 1 });
    ready(1);
    validate(1);
    expect(layoutSidebarController.getSnapshot().returnFocusTarget).toBe(next);
    layoutSidebarController.close(undefined);
    expect(document.activeElement).toBe(next);
    expect(layoutSidebarController.readRuntimeSnapshot().returnFocusDescriptor).toBeNull();
  });

  it('readiness failure preserves external focus and clears its override on the next success', async () => {
    const root = fixture();
    const external = required(shell.querySelector<HTMLElement>('[data-external-focus]'));
    external.focus();
    localStorage.setItem('rouault.note-sidebar.overlay-state', '{"note-primary":"expanded"}');
    start(root);
    shell.removeAttribute('data-layout-header-enhancer-state');
    await waitForCondition(() => state() === 'fallback', 'readiness failure settles');
    expect(document.activeElement).toBe(external);
    ready();
    await waitForCondition(() => state() === 'active', 'readiness recovers');
    expect(layoutSidebarController.readRuntimeSnapshot().overlayState).toBe('collapsed');
    commitShellGeneration(1);
    event('app-shell:committed', { shellCommitId: 1 });
    ready(1);
    validate(1);
    expect(layoutSidebarController.readRuntimeSnapshot().overlayState).toBe('expanded');
    expect(document.activeElement).toBe(external);
  });

  it('cancelled trusted activation never persists and does not poison the next native toggle', async () => {
    const root = fixture();
    start(root);
    layoutSidebarController.open(undefined);
    const summary = required(root.querySelector<HTMLElement>('summary[data-sidebar-nav-control]'));
    summary.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
      },
      { once: true },
    );
    await userEvent.click(summary);
    expect(localStorage.getItem(treeKey)).toBeNull();
    await userEvent.click(summary);
    await waitForCondition(
      () => localStorage.getItem(treeKey) !== null,
      'next native toggle persists',
    );
    expect(JSON.parse(required(localStorage.getItem(treeKey)))).toEqual({ expandedIds: [] });
  });

  it('abort returns to native Tab order and removes both shared attributes', () => {
    const root = fixture();
    start(root);
    abort.abort();
    expect(state()).toBeNull();
    expect(shell.hasAttribute('data-sidebar-enhancement-shell-commit-id')).toBe(false);
    expect(root.inert).toBe(false);
    expect(root.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(
      required(root.querySelector<HTMLElement>('[data-layout-sidebar-static-trigger]')).hidden,
    ).toBe(false);
  });

  it('unexpected root disconnect cleans up shared state and subscriptions', async () => {
    const root = fixture();
    start(root);
    root.remove();
    await waitForCondition(() => state() === null, 'disconnect cleanup');
    expect(root.isConnected).toBe(false);
    expect(shell.hasAttribute('data-sidebar-enhancement-shell-commit-id')).toBe(false);
  });

  it('initialization failure publishes no shared state', () => {
    const root = fixture();
    vi.spyOn(layoutSidebarController, 'initialize').mockImplementation(() => {
      throw new Error('initialize failure');
    });
    expect(() => enhanceLayoutSidebar(root, abort.signal)).toThrow('initialize failure');
    expect(state()).toBeNull();
    expect(shell.hasAttribute('data-sidebar-enhancement-shell-commit-id')).toBe(false);
    expect(root.inert).toBe(false);
  });

  it('rollback-start stages a reserved generation even when commit failed before generation publication', () => {
    const root = fixture();
    start(root);
    const raw = layoutSidebarController.readRuntimeSnapshot();
    event('app-shell:rollback-start', { failedShellCommitId: 1, previousShellCommitId: 0 });
    expect(state()).toBe('staged');
    expect(shell.getAttribute('data-sidebar-enhancement-shell-commit-id')).toBe('1');
    expect(root.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(layoutSidebarController.readRuntimeSnapshot()).toEqual(raw);
  });

  it('fixed-mode projection rollback preserves underlying collapsed preference', () => {
    const root = fixture();
    root.setAttribute('presentation', 'fixed');
    start(root);
    expect(layoutSidebarController.getSnapshot().state).toBe('expanded');
    const mutation = createLayoutSidebarShellAdapter().prepare({
      shell: { headerHtml: '', sidebarProjection: null },
      navigationUrl: '/',
      shellCommitId: 1,
    });
    mutation.commit();
    commitShellGeneration(1);
    event('app-shell:committed', { shellCommitId: 1 });
    event('app-shell:rollback-start', { failedShellCommitId: 1, previousShellCommitId: 0 });
    mutation.rollback();
    expect(layoutSidebarController.readRuntimeSnapshot().overlayState).toBe('collapsed');
    expect(localStorage.getItem('rouault.note-sidebar.overlay-state')).toBeNull();
  });

  it('native Enter and Space toggle once while arrows provide branch navigation', async () => {
    const root = fixture();
    start(root);
    layoutSidebarController.open(undefined);
    const summary = required(root.querySelector<HTMLElement>('summary[data-sidebar-nav-control]'));
    const branch = required(root.querySelector<HTMLDetailsElement>('[data-sidebar-nav-branch]'));
    summary.focus();
    await userEvent.keyboard('{Enter}');
    expect(branch.open).toBe(false);
    await userEvent.keyboard(' ');
    expect(branch.open).toBe(true);
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement?.tagName).toBe('A');
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(summary);
    await userEvent.keyboard('{ArrowLeft}');
    expect(branch.open).toBe(false);
    await userEvent.keyboard('{ArrowRight}');
    expect(branch.open).toBe(true);
  });
});
