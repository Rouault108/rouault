import { beforeSidebarShellMutation } from '../../src/components/layout/sidebar-presentation-coordination.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { ensureMainCssLoaded } from './helpers/load-main-css.js';
import { enhanceLayoutHeader } from '../../src/client/post-hydrate/layout-header-enhancer.js';
import { enhanceLayoutSidebar } from '../../src/client/post-hydrate/layout-sidebar-enhancer.js';
import { layoutSidebarController } from '../../src/components/layout/layout-sidebar-controller.js';
import {
  applyPayloadShellSnapshot,
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
  shell.innerHTML = `<header data-layout-header data-sidebar-id="note-primary" data-sidebar-enabled="true"><button data-layout-sidebar-toggle data-sidebar-id="note-primary">Toggle</button></header><div data-app-shell-sidebar-host ${present ? '' : 'hidden'}><aside data-layout-sidebar-root tabindex="-1" aria-label="Navigation" ${present ? '' : 'hidden'} sidebar-id="note-primary" state-scope-id="note-navigation" selected-id="leaf" initial-expanded-ids='["branch"]' topology-revision="test" presentation="overlay"><a data-layout-sidebar-main-link href="#main-content" data-link-kind="internal-fragment" data-link-surface="structural">Main</a><div data-layout-sidebar-surface>${present ? navHtml : ''}</div></aside></div><div data-app-shell-sidebar-overlay-layer><div data-layout-sidebar-backdrop hidden></div></div><button data-external-focus>Outside</button>`;
  document.body.append(shell);
  const root = shell.querySelector<HTMLElement>('[data-layout-sidebar-root]');
  if (!root) throw new Error('missing fixture root');
  return root;
};
const start = (root: HTMLElement): void => {
  enhanceLayoutHeader(document, abort.signal);
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

  it('pre-active branch interaction remains fallback after readiness recovery', async () => {
    const root = fixture();
    enhanceLayoutHeader(document, abort.signal);
    enhanceLayoutSidebar(root, abort.signal);
    await userEvent.click(required(root.querySelector('summary[data-sidebar-nav-control]')));
    validate();
    expect(state()).toBe('fallback');
    ready();
    await Promise.resolve();
    expect(state()).toBe('fallback');
    expect(root.inert).toBe(false);
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
    expect(root.querySelector('[data-layout-sidebar-main-link]')).not.toBeNull();
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
  for (const target of ['aside', 'nav', 'helper'] as const) {
    it(`fixed to collapsed overlay moves ${target} focus before hiding`, () => {
      const root = fixture();
      root.setAttribute('presentation', 'fixed');
      start(root);
      const focused =
        target === 'aside'
          ? root
          : required(
              root.querySelector<HTMLElement>(
                target === 'nav' ? '[data-sidebar-nav-control]' : '[data-layout-sidebar-main-link]',
              ),
            );
      focused.focus();
      const button = required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]'));
      let preparedBeforeHidden = false;
      button.addEventListener('focus', () => {
        preparedBeforeHidden = !root.inert && !button.hidden;
      });
      layoutSidebarController.setViewportMode(undefined, 'overlay');
      expect(preparedBeforeHidden).toBe(true);
      expect(document.activeElement).toBe(button);
      expect(root.inert).toBe(true);
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(state()).toBe('active');
    });
  }

  it('overlay to fixed exposes aside before returning focus and hiding the header button', () => {
    const root = fixture();
    start(root);
    const button = required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]'));
    button.focus();
    let visibleAtFocus = false;
    root.addEventListener('focus', () => {
      visibleAtFocus = !root.inert && !button.hidden;
    });
    layoutSidebarController.setViewportMode(undefined, 'fixed');
    expect(visibleAtFocus).toBe(true);
    expect(document.activeElement).toBe(root);
    expect(button.hidden).toBe(true);
    expect(root.inert).toBe(false);
  });

  for (const descriptor of ['null', 'invalid'] as const) {
    it(`close with ${descriptor} return target protects owned focus without stealing external focus`, () => {
      const root = fixture();
      start(root);
      const external = required(shell.querySelector<HTMLElement>('[data-external-focus]'));
      const invalid = document.createElement('button');
      layoutSidebarController.open(undefined, descriptor === 'invalid' ? invalid : undefined);
      required(root.querySelector<HTMLElement>('[data-layout-sidebar-main-link]')).focus();
      layoutSidebarController.close(undefined);
      expect(document.activeElement).toBe(shell.querySelector('[data-layout-sidebar-toggle]'));
      expect(layoutSidebarController.readRuntimeSnapshot().returnFocusDescriptor).toBeNull();
      layoutSidebarController.open(undefined);
      external.focus();
      layoutSidebarController.close(undefined);
      expect(document.activeElement).toBe(external);
    });
  }

  it('mandatory header focus failure leaves the native sidebar visible without storage writes', () => {
    const root = fixture();
    root.setAttribute('presentation', 'fixed');
    start(root);
    root.focus();
    const button = required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]'));
    vi.spyOn(button, 'focus').mockImplementation(() => {
      /* focusの不受理を注入する。 */
    });
    const stored = localStorage.getItem('rouault.note-sidebar.overlay-state');
    layoutSidebarController.setViewportMode(undefined, 'overlay');
    expect(state()).toBe('fallback');
    expect(root.inert).toBe(false);
    expect(root.hasAttribute('data-mode')).toBe(false);
    expect(document.activeElement).toBe(root);
    expect(localStorage.getItem('rouault.note-sidebar.overlay-state')).toBe(stored);
  });

  it('focus reentry cancels a stale mode request and protects the prepared button focus', async () => {
    const root = fixture();
    root.setAttribute('presentation', 'fixed');
    start(root);
    root.focus();
    const button = required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]'));
    button.addEventListener(
      'focus',
      () => layoutSidebarController.setViewportMode(undefined, 'fixed'),
      { once: true },
    );
    layoutSidebarController.setViewportMode(undefined, 'overlay');
    await Promise.resolve();
    expect(root.inert).toBe(false);
    expect(document.activeElement).toBe(root);
    expect(state()).toBe('fallback');
    expect(button.hidden).toBe(true);
  });

  for (const headerFirst of [true, false]) {
    it(`header registration order ${String(headerFirst)} cannot hide an owned focus early`, () => {
      const root = fixture();
      root.setAttribute('presentation', 'fixed');
      if (headerFirst) enhanceLayoutHeader(document, abort.signal);
      enhanceLayoutSidebar(root, abort.signal);
      if (!headerFirst) enhanceLayoutHeader(document, abort.signal);
      validate();
      root.focus();
      layoutSidebarController.setViewportMode(undefined, 'overlay');
      expect(state()).toBe('active');
      expect(document.activeElement).toBe(shell.querySelector('[data-layout-sidebar-toggle]'));
      expect(root.inert).toBe(true);
    });
  }

  it('same-generation header reinitialization protects retiring trigger focus', async () => {
    const root = fixture();
    start(root);
    required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]')).focus();
    enhanceLayoutHeader(document, abort.signal);
    await Promise.resolve();
    expect(document.activeElement).toBe(root);
    expect(state()).toBe('fallback');
    expect(root.inert).toBe(false);
    expect(required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]')).hidden).toBe(
      true,
    );
  });

  it('header retirement during focus preparation cancels hiding synchronously', async () => {
    const root = fixture();
    root.setAttribute('presentation', 'fixed');
    const headerAbort = new AbortController();
    enhanceLayoutHeader(document, headerAbort.signal);
    enhanceLayoutSidebar(root, abort.signal);
    validate();
    root.focus();
    const button = required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]'));
    button.addEventListener('focus', () => headerAbort.abort(), { once: true });
    layoutSidebarController.setViewportMode(undefined, 'overlay');
    await Promise.resolve();
    expect(document.activeElement).toBe(root);
    expect(root.inert).toBe(false);
    expect(state()).toBe('fallback');
    expect(button.hidden).toBe(true);
  });

  it('surface replacement repairs captured owned focus and retains the auxiliary link through rollback', async () => {
    const root = fixture();
    start(root);
    layoutSidebarController.open(undefined);
    const link = root.querySelector('[data-layout-sidebar-main-link]');
    const old = required(root.querySelector<HTMLElement>('[data-sidebar-nav-control]'));
    old.focus();
    applyPayloadShellSnapshot(
      { headerHtml: '', sidebarProjection: projection, footerCopyrightText: '' },
      null,
      null,
      root,
    );
    expect(old.isConnected).toBe(false);
    expect(document.activeElement).toBe(root);
    expect(root.querySelector('[data-layout-sidebar-main-link]')).toBe(link);
    await Promise.resolve();
    expect(state()).toBe('fallback');
    const mutation = createLayoutSidebarShellAdapter().prepare({
      shell: { headerHtml: '', sidebarProjection: null },
      navigationUrl: '/',
      shellCommitId: 1,
    });
    mutation.commit();
    mutation.rollback();
    expect(root.querySelector('[data-layout-sidebar-main-link]')).toBe(link);
    expect(root.querySelectorAll('nav')).toHaveLength(1);
  });

  for (const target of ['aside', 'nav', 'helper', 'header', 'external', 'body'] as const) {
    it(`cleanup preserves or repairs ${target} focus without an initial body focus grab`, () => {
      const root = fixture();
      start(root);
      layoutSidebarController.open(undefined);
      const element =
        target === 'aside'
          ? root
          : target === 'body'
            ? document.body
            : required(
                shell.querySelector<HTMLElement>(
                  target === 'nav'
                    ? '[data-sidebar-nav-control]'
                    : target === 'helper'
                      ? '[data-layout-sidebar-main-link]'
                      : target === 'header'
                        ? '[data-layout-sidebar-toggle]'
                        : '[data-external-focus]',
                ),
              );
      if (target !== 'body') element.focus();
      else {
        required(shell.querySelector<HTMLElement>('[data-external-focus]')).focus();
        (document.activeElement as HTMLElement).blur();
      }
      abort.abort();
      expect(root.inert).toBe(false);
      expect(document.activeElement).toBe(target === 'header' ? root : element);
      expect(state()).toBeNull();
    });
  }
  for (const target of ['aside', 'nav', 'helper', 'header'] as const) {
    it(`readiness loss preserves or repairs ${target} ownership before retiring the trigger`, async () => {
      const root = fixture();
      start(root);
      layoutSidebarController.open(undefined);
      const element =
        target === 'aside'
          ? root
          : required(
              shell.querySelector<HTMLElement>(
                target === 'nav'
                  ? '[data-sidebar-nav-control]'
                  : target === 'helper'
                    ? '[data-layout-sidebar-main-link]'
                    : '[data-layout-sidebar-toggle]',
              ),
            );
      element.focus();
      shell.removeAttribute('data-layout-header-enhancer-state');
      await waitForCondition(() => state() === 'fallback', 'readiness loss settles');
      expect(root.inert).toBe(false);
      expect(document.activeElement).toBe(target === 'header' ? root : element);
      expect(
        required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]')).hidden,
      ).toBe(true);
    });
  }

  it('normal close returns to a valid external descriptor before clearing it', () => {
    const root = fixture();
    start(root);
    const external = required(shell.querySelector<HTMLElement>('[data-external-focus]'));
    layoutSidebarController.open(undefined, external);
    required(root.querySelector<HTMLElement>('[data-layout-sidebar-main-link]')).focus();
    layoutSidebarController.close(undefined);
    expect(document.activeElement).toBe(external);
    expect(layoutSidebarController.readRuntimeSnapshot().returnFocusDescriptor).toBeNull();
  });
  it('header-only navigation handoff preserves the fixed placement required by selection patches', () => {
    const root = fixture();
    root.setAttribute('presentation', 'fixed');
    start(root);
    const nav = root.querySelector('nav');
    const finish = beforeSidebarShellMutation(required(shell.querySelector('header')), true);
    expect(root.getAttribute('data-mode')).toBe('fixed');
    expect(root.querySelector('nav')).toBe(nav);
    finish();
    expect(root.getAttribute('data-mode')).toBe('fixed');
  });
  it('pre-module branch changes survive stored defaults even after focus left the sidebar', () => {
    const root = fixture();
    required(root.querySelector<HTMLDetailsElement>('[data-sidebar-nav-branch]')).open = false;
    localStorage.setItem(treeKey, JSON.stringify({ expandedIds: ['branch'] }));
    start(root);
    expect(required(root.querySelector<HTMLDetailsElement>('[data-sidebar-nav-branch]')).open).toBe(
      false,
    );
    expect(state()).toBe('fallback');
  });

  it('header-first rollback retirement preserves the provisional runtime descriptor', () => {
    const root = fixture();
    start(root);
    layoutSidebarController.open(
      undefined,
      required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]')),
    );
    const previous = layoutSidebarController.readRuntimeSnapshot();
    event('app-shell:rollback-start', { failedShellCommitId: 1, previousShellCommitId: 0 });
    expect(state()).toBe('staged');
    expect(layoutSidebarController.readRuntimeSnapshot()).toEqual(previous);
  });

  it('a connected non-focusable return target is treated as invalid during close', () => {
    const root = fixture();
    start(root);
    const invalid = document.createElement('div');
    shell.append(invalid);
    layoutSidebarController.open(undefined, invalid);
    required(root.querySelector<HTMLElement>('[data-layout-sidebar-main-link]')).focus();
    layoutSidebarController.close(undefined);
    expect(state()).toBe('active');
    expect(document.activeElement).toBe(shell.querySelector('[data-layout-sidebar-toggle]'));
  });
  it('active overlay omits the helper and fallback retains its native fragment destination', async () => {
    await page.viewport(390, 844);
    await ensureMainCssLoaded();
    const root = fixture();
    const main = document.createElement('main');
    main.id = 'main-content';
    main.tabIndex = -1;
    main.textContent = 'Main destination';
    shell.append(main);
    start(root);
    const button = required(shell.querySelector<HTMLElement>('[data-layout-sidebar-toggle]'));
    await userEvent.click(button);
    const helper = required(root.querySelector<HTMLElement>('[data-layout-sidebar-main-link]'));
    expect(helper.checkVisibility()).toBe(false);
    shell.removeAttribute('data-layout-header-enhancer-state');
    await waitForCondition(() => state() === 'fallback', 'native helper fallback');
    expect(helper.checkVisibility()).toBe(true);
    await userEvent.click(helper);
    expect(document.activeElement).toBe(main);
    expect(
      required(shell.querySelector<HTMLElement>('[data-layout-sidebar-backdrop]')).hidden,
    ).toBe(true);
  });

  for (const rejected of [false, true]) {
    it(`expanded-overlay helper focus handoff ${rejected ? 'failure falls back' : 'succeeds before hiding'}`, async () => {
      await ensureMainCssLoaded();
      const root = fixture();
      root.setAttribute('presentation', 'fixed');
      start(root);
      layoutSidebarController.setOverlayStateWithoutPersisting(undefined, 'expanded');
      const helper = required(root.querySelector<HTMLElement>('[data-layout-sidebar-main-link]'));
      helper.focus();
      const original = root.focus.bind(root);
      const visibleBeforeMoves: boolean[] = [];
      vi.spyOn(root, 'focus').mockImplementation((options) => {
        visibleBeforeMoves.push(helper.checkVisibility());
        if (!rejected) original(options);
      });
      layoutSidebarController.setViewportMode(undefined, 'overlay');
      expect(visibleBeforeMoves[0]).toBe(true);
      expect(root.inert).toBe(false);
      expect(state()).toBe(rejected ? 'fallback' : 'active');
      expect(document.activeElement).toBe(rejected ? helper : root);
      expect(helper.checkVisibility()).toBe(rejected);
      if (rejected)
        expect(
          required(shell.querySelector<HTMLElement>('[data-layout-sidebar-backdrop]')).hidden,
        ).toBe(true);
    });
  }
});
