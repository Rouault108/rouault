import { APP_SHELL_ROOT_SELECTOR } from '../../../shared/app-shell/app-shell-root-contract.js';
import { attachStickyFooterBoundary } from '../../layout/sticky-footer-boundary.js';
import {
  HEADER_ENHANCER_STATE,
  HEADER_READY_COMMIT_ID,
  SIDEBAR_ENHANCEMENT_STATE,
  SIDEBAR_ENHANCEMENT_COMMIT_ID,
  type SidebarEnhancementState,
} from '../../../shared/navigation/sidebar-enhancement-contract.js';
import { readCurrentShellCommitId } from '../../components/app/shell/app-shell-lifecycle.js';
import type {
  AppShellCommittedDetail,
  AppShellValidatedDetail,
  AppShellRollbackStartDetail,
  AppShellRestoredDetail,
} from '../../components/app/shell/app-shell-events.js';
import { layoutSidebarController } from '../../components/layout/layout-sidebar-controller.js';
import {
  readLayoutSidebarTreeState,
  writeLayoutSidebarTreeState,
} from '../../components/layout/layout-sidebar-tree-state.js';
import {
  LayoutSidebarNavInteractionController,
  visibleLayoutSidebarControls,
  roveLayoutSidebarNav,
} from '../../components/layout/sidebar-native-navigation.js';
import { SidebarDisclosureOrigin } from '../../components/layout/sidebar-disclosure-origin.js';

export const enhanceLayoutSidebar = (root: HTMLElement, signal: AbortSignal): void => {
  const shell = root.closest<HTMLElement>(APP_SHELL_ROOT_SELECTOR);
  const host = shell?.querySelector<HTMLElement>('[data-app-shell-sidebar-host]');
  const overlay = shell?.querySelector<HTMLElement>('[data-app-shell-sidebar-overlay-layer]');
  const backdrop = overlay?.querySelector<HTMLElement>('[data-layout-sidebar-backdrop]');
  const disclosure = root.querySelector<HTMLDetailsElement>('[data-layout-sidebar-disclosure]');
  const summary = root.querySelector<HTMLElement>('[data-layout-sidebar-static-trigger]');
  if (signal.aborted || !shell || !host || !overlay || !backdrop || !disclosure || !summary) return;
  const listeners = new AbortController();
  const origin = new SidebarDisclosureOrigin();
  let generation = readCurrentShellCommitId();
  let state: SidebarEnhancementState = 'fallback';
  let validated = false;
  let reconciling = false;
  let unsubscribe: (() => void) | null = null;
  let sidebarId = root.getAttribute('sidebar-id') ?? 'note-primary';
  let scopeId = root.getAttribute('state-scope-id') ?? 'note-navigation';
  let previousOverlayState = 'collapsed';
  let restored = false;
  let queued = false;
  const engaged = new Set<number>();
  const fallbackOverrides = new Set<number>();
  let detachSticky: (() => void) | null = null;
  const pending = new Map<
    number,
    { sidebarId: string; stateScopeId: string; expandedIds: string[] }
  >();
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    /* 保存不可でもnative navigationを維持する。 */
  }
  const publish = (next: SidebarEnhancementState): void => {
    state = next;
    shell.setAttribute(SIDEBAR_ENHANCEMENT_COMMIT_ID, String(generation));
    shell.setAttribute(SIDEBAR_ENHANCEMENT_STATE, next);
  };
  const controls = (): HTMLElement[] => visibleLayoutSidebarControls(root);
  const rove = (target?: HTMLElement): void => {
    roveLayoutSidebarNav(root, target);
  };
  const navInteraction = new LayoutSidebarNavInteractionController({
    onToggle(id, open, trusted) {
      const branch = [
        ...root.querySelectorAll<HTMLDetailsElement>('[data-sidebar-nav-branch]'),
      ].find((details) => details.parentElement?.getAttribute('data-node-id') === id);
      if (branch) origin.write(branch, open, generation, trusted === true);
    },
    onSelect() {
      layoutSidebarController.close(sidebarId);
    },
    onActiveChange() {
      /* nav owner自身がroving stateを反映する。 */
    },
  });
  const moveRoot = (destination: HTMLElement): void => {
    if (root.parentElement === destination) return;
    const focused = root.contains(document.activeElement) ? document.activeElement : null;
    destination.append(root);
    if (focused instanceof HTMLElement && focused.checkVisibility())
      focused.focus({ preventScroll: true });
  };
  const quiesce = (): void => {
    navInteraction.disconnect();
    detachSticky?.();
    detachSticky = null;
    backdrop.hidden = true;
    root.inert = false;
    root.removeAttribute('data-mode');
    root.removeAttribute('data-state');
    summary.hidden = false;
    if (root.isConnected) moveRoot(host);
  };
  const persist = (): void => {
    const expandedIds = [
      ...root.querySelectorAll<HTMLDetailsElement>('details[data-sidebar-nav-branch]'),
    ]
      .filter((branch) => branch.open)
      .map((branch) => branch.parentElement?.getAttribute('data-node-id') ?? '');
    if (!validated) pending.set(generation, { sidebarId, stateScopeId: scopeId, expandedIds });
    else
      writeLayoutSidebarTreeState(storage, { expandedIds }, { sidebarId, stateScopeId: scopeId });
  };
  const prepareVisual = (): void => {
    const snapshot = layoutSidebarController.getSnapshot(sidebarId);
    const runtime = layoutSidebarController.readRuntimeSnapshot(sidebarId);
    if (runtime.returnFocusDescriptor !== null && snapshot.returnFocusTarget === null) {
      layoutSidebarController.setOverlayStateWithoutPersisting(sidebarId, 'collapsed');
      layoutSidebarController.clearReturnFocusDescriptor(sidebarId);
    }
    const current = layoutSidebarController.getSnapshot(sidebarId);
    summary.hidden = true;
    root.setAttribute('data-mode', current.mode);
    root.setAttribute('data-state', current.state);
    const destination = current.mode === 'overlay' ? overlay : host;
    moveRoot(destination);
    if (current.mode === 'fixed' && detachSticky === null)
      detachSticky = attachStickyFooterBoundary(host, { minWidth: 640 });
    if (current.mode !== 'fixed') {
      detachSticky?.();
      detachSticky = null;
    }
    root.inert = current.mode === 'overlay' && current.state === 'collapsed';
    backdrop.hidden = current.mode !== 'overlay' || current.state !== 'expanded';
    navInteraction.connect(root.querySelector('nav[data-sidebar-nav]'));
    rove();
    previousOverlayState = layoutSidebarController.readRuntimeSnapshot(sidebarId).overlayState;
  };
  const reconcile = (): void => {
    if (
      reconciling ||
      listeners.signal.aborted ||
      !validated ||
      generation !== readCurrentShellCommitId()
    )
      return;
    reconciling = true;
    try {
      if (root.hidden) {
        publish('dormant');
        quiesce();
        layoutSidebarController.setOverlayStateWithoutPersisting(sidebarId, 'collapsed');
        fallbackOverrides.add(generation);
        if (!restored) layoutSidebarController.clearReturnFocusDescriptor(sidebarId);
        return;
      }
      const ready =
        shell.getAttribute(HEADER_ENHANCER_STATE) === 'ready' &&
        shell.getAttribute(HEADER_READY_COMMIT_ID) === String(generation);
      if (!ready || !disclosure.open || engaged.has(generation)) {
        const wasActive = state === 'active';
        const previousFocus = document.activeElement;
        publish('fallback');
        quiesce();
        if (wasActive) {
          origin.write(disclosure, true, generation, false);
          if (
            previousFocus instanceof HTMLElement &&
            (previousFocus.matches('[data-layout-sidebar-toggle]') ||
              (root.contains(previousFocus) && !previousFocus.checkVisibility()))
          ) {
            summary.focus({ preventScroll: true });
            engaged.add(generation);
          }
        }
        layoutSidebarController.setOverlayStateWithoutPersisting(sidebarId, 'collapsed');
        fallbackOverrides.add(generation);
        if (!restored) layoutSidebarController.clearReturnFocusDescriptor(sidebarId);
        return;
      }
      prepareVisual();
      publish('active');
    } finally {
      reconciling = false;
    }
  };
  const queueReconcile = (): void => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      reconcile();
    });
  };
  const bind = (): void => {
    sidebarId = root.getAttribute('sidebar-id') ?? 'note-primary';
    scopeId = root.getAttribute('state-scope-id') ?? 'note-navigation';
    const previousSubscription = unsubscribe;
    unsubscribe = layoutSidebarController.subscribe(sidebarId, () => {
      if (state !== 'active' || reconciling) return;
      const snapshot = layoutSidebarController.getSnapshot(sidebarId);
      const overlayState = layoutSidebarController.readRuntimeSnapshot(sidebarId).overlayState;
      const opening =
        snapshot.mode === 'overlay' &&
        previousOverlayState === 'collapsed' &&
        overlayState === 'expanded';
      const closing =
        snapshot.mode === 'overlay' &&
        previousOverlayState === 'expanded' &&
        overlayState === 'collapsed';
      const returnTarget = snapshot.returnFocusTarget;
      reconciling = true;
      try {
        prepareVisual();
      } finally {
        reconciling = false;
      }
      if (opening && returnTarget) controls()[0]?.focus({ preventScroll: true });
      if (closing) {
        returnTarget?.focus({ preventScroll: true });
        layoutSidebarController.clearReturnFocusDescriptor(sidebarId);
      }
    });
    previousSubscription?.();
    const presentation = root.getAttribute('presentation');
    layoutSidebarController.initialize(sidebarId, {
      presentation: presentation === 'fixed' || presentation === 'overlay' ? presentation : 'auto',
      fixedBreakpoint: Number(root.getAttribute('fixed-breakpoint') ?? 1024),
      storage,
    });
    if (!engaged.has(generation)) {
      const stored = readLayoutSidebarTreeState(storage, { sidebarId, stateScopeId: scopeId });
      if (stored)
        for (const branch of root.querySelectorAll<HTMLDetailsElement>(
          'details[data-sidebar-nav-branch]',
        )) {
          origin.write(
            branch,
            stored.expandedIds.includes(branch.parentElement?.getAttribute('data-node-id') ?? ''),
            generation,
            false,
          );
        }
    }
  };
  const stage = (id: number): void => {
    generation = id;
    validated = false;
    publish('staged');
    origin.clear();
    quiesce();
  };
  const observer = new MutationObserver(queueReconcile);
  const connectionObserver = new MutationObserver(() => {
    if (!root.isConnected) cleanup();
  });
  const cleanup = (): void => {
    if (listeners.signal.aborted) return;
    const wasActive = state === 'active';
    const previousFocus = document.activeElement;
    publish('fallback');
    quiesce();
    if (wasActive) {
      origin.write(disclosure, true, generation, false);
      if (
        root.isConnected &&
        previousFocus instanceof HTMLElement &&
        (previousFocus.matches('[data-layout-sidebar-toggle]') ||
          (root.contains(previousFocus) && !previousFocus.checkVisibility()))
      ) {
        summary.focus({ preventScroll: true });
      }
    }
    listeners.abort();
    observer.disconnect();
    connectionObserver.disconnect();
    unsubscribe?.();
    origin.clear();
    pending.clear();
    shell.removeAttribute(SIDEBAR_ENHANCEMENT_STATE);
    shell.removeAttribute(SIDEBAR_ENHANCEMENT_COMMIT_ID);
  };
  signal.addEventListener('abort', cleanup, { once: true });
  try {
    if (!disclosure.open || root.contains(document.activeElement)) engaged.add(generation);
    bind();
    observer.observe(shell, {
      attributes: true,
      attributeFilter: [HEADER_ENHANCER_STATE, HEADER_READY_COMMIT_ID],
    });
    connectionObserver.observe(document, { childList: true, subtree: true });
    document.addEventListener(
      'app-shell:committed',
      (event) => {
        const detail = (event as CustomEvent<AppShellCommittedDetail>).detail;
        if (detail.shellCommitId !== readCurrentShellCommitId()) return;
        restored = false;
        stage(detail.shellCommitId);
        bind();
      },
      { signal: listeners.signal },
    );
    document.addEventListener(
      'app-shell:validated',
      (event) => {
        const detail = (event as CustomEvent<AppShellValidatedDetail>).detail;
        if (detail.shellCommitId !== generation || generation !== readCurrentShellCommitId())
          return;
        validated = true;
        if (!fallbackOverrides.has(generation) && fallbackOverrides.size > 0)
          layoutSidebarController.restorePersistedOverlayState(sidebarId);
        for (const id of fallbackOverrides) if (id !== generation) fallbackOverrides.delete(id);
        for (const id of engaged) if (id !== generation) engaged.delete(id);
        const staged = pending.get(generation);
        if (staged?.sidebarId === sidebarId && staged.stateScopeId === scopeId)
          writeLayoutSidebarTreeState(storage, staged, staged);
        pending.clear();
        reconcile();
      },
      { signal: listeners.signal },
    );
    document.addEventListener(
      'app-shell:rollback-start',
      (event) => {
        const detail = (event as CustomEvent<AppShellRollbackStartDetail>).detail;
        const current = readCurrentShellCommitId();
        if (
          detail.failedShellCommitId !== current &&
          !(detail.previousShellCommitId === current && detail.failedShellCommitId > current)
        )
          return;
        pending.delete(detail.failedShellCommitId);
        engaged.delete(detail.failedShellCommitId);
        fallbackOverrides.delete(detail.failedShellCommitId);
        stage(detail.failedShellCommitId);
      },
      { signal: listeners.signal },
    );
    document.addEventListener(
      'app-shell:restored',
      (event) => {
        const detail = (event as CustomEvent<AppShellRestoredDetail>).detail;
        if (detail.restoredShellCommitId !== readCurrentShellCommitId()) return;
        stage(detail.restoredShellCommitId);
        restored = true;
        bind();
        validated = true;
        queueReconcile();
      },
      { signal: listeners.signal },
    );
    root.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const control = target.closest('summary');
        const details = control?.parentElement;
        if (details instanceof HTMLDetailsElement) origin.native(details, event, generation);
        if (state !== 'active' && event.isTrusted) engaged.add(generation);
      },
      { signal: listeners.signal },
    );
    root.addEventListener(
      'pointerdown',
      (event) => {
        if (state !== 'active' && event.isTrusted) engaged.add(generation);
      },
      { signal: listeners.signal },
    );
    root.addEventListener(
      'toggle',
      (event) => {
        const details = event.target;
        if (!(details instanceof HTMLDetailsElement)) return;
        if (origin.consume(details, event, generation)) {
          if (state !== 'active') engaged.add(generation);
          if (details.matches('[data-sidebar-nav-branch]')) persist();
        }
        if (state === 'active')
          rove(document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
      },
      { capture: true, signal: listeners.signal },
    );
    root.addEventListener(
      'focusin',
      (event) => {
        if (state !== 'active') engaged.add(generation);
        else if (
          event.target instanceof HTMLElement &&
          event.target.matches('[data-sidebar-nav-control]')
        )
          rove(event.target);
      },
      { signal: listeners.signal },
    );
    root.addEventListener(
      'keydown',
      (event) => {
        if (state !== 'active') {
          if (event.isTrusted) engaged.add(generation);
          return;
        }
        if (event.key === 'Escape') layoutSidebarController.close(sidebarId);
      },
      { signal: listeners.signal },
    );
    backdrop.addEventListener(
      'click',
      () => {
        if (state === 'active') layoutSidebarController.close(sidebarId);
      },
      { signal: listeners.signal },
    );
    publish('staged');
  } catch (error) {
    cleanup();
    throw error;
  }
};
