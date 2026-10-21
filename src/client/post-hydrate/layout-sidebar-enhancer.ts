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
import type { SidebarMode, SidebarState } from '../../../shared/navigation/sidebar-presentation.js';
import {
  connectSidebarPresentationOwner,
  readSidebarHeaderPort,
  type SidebarHeaderPort,
} from '../../components/layout/sidebar-presentation-coordination.js';

export const enhanceLayoutSidebar = (root: HTMLElement, signal: AbortSignal): void => {
  const shell = root.closest<HTMLElement>(APP_SHELL_ROOT_SELECTOR);
  const host = shell?.querySelector<HTMLElement>('[data-app-shell-sidebar-host]');
  const overlay = shell?.querySelector<HTMLElement>('[data-app-shell-sidebar-overlay-layer]');
  const backdrop = overlay?.querySelector<HTMLElement>('[data-layout-sidebar-backdrop]');
  if (signal.aborted || !shell || !host || !overlay || !backdrop) return;
  const listeners = new AbortController();
  const origin = new SidebarDisclosureOrigin();
  let generation = readCurrentShellCommitId();
  let state: SidebarEnhancementState = 'fallback';
  let validated = false;
  let reconciling = false;
  let unsubscribe: (() => void) | null = null;
  let sidebarId = root.getAttribute('sidebar-id') ?? 'note-primary';
  let scopeId = root.getAttribute('state-scope-id') ?? 'note-navigation';
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
  interface FocusReceipt {
    readonly element: HTMLElement | null;
    readonly owned: boolean;
    readonly header: boolean;
    readonly sidebarId: string;
    readonly generation: number;
  }
  let effectiveMode: SidebarMode | null = null;
  let effectiveState: SidebarState | null = null;
  let maintainingFocus = 0;
  let mutationDepth = 0;
  let cleanupPending = false;
  let disconnectOwner: (() => void) | null = null;
  const pendingRepairs: FocusReceipt[] = [];
  const retiring: { receipt: FocusReceipt; clear: () => void }[] = [];
  const capture = (port = readSidebarHeaderPort(shell)): FocusReceipt => {
    const element = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return {
      element,
      owned: element !== null && (root.contains(element) || element === port?.button),
      header: element !== null && element === port?.button,
      sidebarId,
      generation,
    };
  };
  const usable = (element: HTMLElement | null): element is HTMLElement => {
    if (!element?.isConnected || !element.checkVisibility() || element.closest('[inert]'))
      return false;
    if (element.matches(':disabled, [aria-disabled="true"]')) return false;
    for (let parent = element.parentElement; parent; parent = parent.parentElement)
      if (
        parent instanceof HTMLDetailsElement &&
        !parent.open &&
        !parent.querySelector(':scope > summary')?.contains(element)
      )
        return false;
    return true;
  };
  const focus = (element: HTMLElement): boolean => {
    maintainingFocus++;
    try {
      element.focus({ preventScroll: true });
      return document.activeElement === element && usable(element);
    } catch {
      return false;
    } finally {
      maintainingFocus--;
    }
  };
  const sameOwner = (receipt: FocusReceipt): boolean =>
    receipt.sidebarId === sidebarId &&
    receipt.generation === generation &&
    generation === readCurrentShellCommitId() &&
    root.isConnected &&
    !root.hidden &&
    root.closest(APP_SHELL_ROOT_SELECTOR) === shell &&
    root.getAttribute('sidebar-id') === sidebarId;
  const repair = (receipt: FocusReceipt): void => {
    if (!receipt.owned || !sameOwner(receipt)) return;
    const current = document.activeElement;
    if (current === receipt.element && usable(receipt.element) && !receipt.header) return;
    // 新しい外部focusやページ側の引渡し先を、古いreceiptで取り戻さない。
    if (
      current instanceof HTMLElement &&
      current !== document.body &&
      current !== receipt.element &&
      usable(current)
    )
      return;
    if (focus(root)) engaged.add(generation);
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
      /* nav ownerがroving stateを反映する。 */
    },
  });
  const moveRoot = (destination: HTMLElement, receipt: FocusReceipt): void => {
    if (root.parentElement === destination) return;
    destination.append(root);
    if (
      receipt.owned &&
      receipt.element &&
      root.contains(receipt.element) &&
      usable(receipt.element) &&
      document.activeElement === document.body
    )
      focus(receipt.element);
  };
  const quiesce = (receipt = capture(), handoff = false): void => {
    navInteraction.disconnect();
    detachSticky?.();
    detachSticky = null;
    backdrop.hidden = true;
    root.inert = false;
    root.removeAttribute('data-mode');
    root.removeAttribute('data-state');
    if (root.isConnected) moveRoot(host, receipt);
    if (!handoff) repair(receipt);
    effectiveMode = null;
    effectiveState = null;
    const port = readSidebarHeaderPort(shell);
    port?.render({
      mode: layoutSidebarController.getSnapshot(sidebarId).mode,
      state: 'expanded',
      active: false,
      triggerVisible: document.activeElement === port.button,
    });
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
  const settleFallback = (receipt: FocusReceipt, provisional = false): void => {
    publish(provisional ? 'staged' : root.hidden ? 'dormant' : 'fallback');
    quiesce(receipt, root.hidden);
    if (provisional) return;
    if (layoutSidebarController.readRuntimeSnapshot(sidebarId).overlayState !== 'collapsed')
      layoutSidebarController.setOverlayStateWithoutPersisting(sidebarId, 'collapsed');
    fallbackOverrides.add(generation);
    if (!restored) layoutSidebarController.clearReturnFocusDescriptor(sidebarId);
  };
  const eligiblePort = (port: SidebarHeaderPort | undefined): port is SidebarHeaderPort =>
    !!port &&
    port === readSidebarHeaderPort(shell) &&
    port.generation === generation &&
    port.sidebarId === sidebarId &&
    port.header.isConnected &&
    port.header.closest(APP_SHELL_ROOT_SELECTOR) === shell &&
    shell.querySelector('header[data-layout-header]') === port.header &&
    shell.getAttribute(HEADER_ENHANCER_STATE) === 'ready' &&
    shell.getAttribute(HEADER_READY_COMMIT_ID) === String(generation);
  const reconcile = (): void => {
    if (listeners.signal.aborted || !root.isConnected) return;
    if (reconciling) {
      queueReconcile();
      return;
    }
    reconciling = true;
    const receipt =
      retiring.find((item) => item.receipt.owned)?.receipt ??
      pendingRepairs.find((item) => item.owned) ??
      capture();
    pendingRepairs.length = 0;
    try {
      if (generation !== readCurrentShellCommitId()) return;
      const port = readSidebarHeaderPort(shell);
      if (!validated || mutationDepth > 0) {
        settleFallback(receipt, true);
        return;
      }
      if (root.hidden || !eligiblePort(port) || engaged.has(generation) || retiring.length > 0) {
        settleFallback(receipt);
        return;
      }
      const snapshot = layoutSidebarController.getSnapshot(sidebarId);
      const surface = root.querySelector('[data-layout-sidebar-surface]');
      const nav = surface?.querySelector<HTMLElement>('nav[data-sidebar-nav]') ?? null;
      const helper = root.querySelector<HTMLElement>('[data-layout-sidebar-main-link]');
      const current = (): boolean => {
        const latest = layoutSidebarController.getSnapshot(sidebarId);
        return (
          !signal.aborted &&
          !listeners.signal.aborted &&
          mutationDepth === 0 &&
          validated &&
          sameOwner(receipt) &&
          eligiblePort(port) &&
          root.querySelector('[data-layout-sidebar-surface]') === surface &&
          root.querySelector('nav[data-sidebar-nav]') === nav &&
          root.querySelector('[data-layout-sidebar-main-link]') === helper &&
          !!nav &&
          latest.mode === snapshot.mode &&
          latest.state === snapshot.state
        );
      };
      if (!current()) {
        settleFallback(receipt);
        return;
      }
      const closing =
        effectiveMode === 'overlay' &&
        effectiveState === 'expanded' &&
        snapshot.mode === 'overlay' &&
        snapshot.state === 'collapsed';
      const opening =
        effectiveState === 'collapsed' &&
        snapshot.mode === 'overlay' &&
        snapshot.state === 'expanded';
      if (snapshot.mode === 'overlay') {
        // 隠す前に、header ownerが実際にfocus可能な操作口を同期準備する。
        port.render({ ...snapshot, active: true, triggerVisible: true });
        const button = port.button;
        if (!button || !usable(button) || !current()) {
          settleFallback(receipt);
          return;
        }
        const returnTarget = snapshot.returnFocusTarget;
        if (
          closing &&
          usable(returnTarget) &&
          (returnTarget.tabIndex >= 0 ||
            returnTarget.hasAttribute('tabindex') ||
            returnTarget.isContentEditable) &&
          !root.contains(returnTarget)
        ) {
          if (!focus(returnTarget)) {
            settleFallback(receipt);
            return;
          }
        }
        if (snapshot.state === 'collapsed' && root.contains(document.activeElement)) {
          if (!focus(button)) {
            settleFallback(receipt);
            return;
          }
        }
        if (!current()) {
          settleFallback(capture(port));
          return;
        }
        root.setAttribute('data-mode', snapshot.mode);
        root.setAttribute('data-state', snapshot.state);
        root.inert = false;
        // :focusの静的guardでlinkを維持したまま、可視asideへ先にfocusを渡す。
        // reparentでlinkのfocusが失われるより前に済ませる。
        if (
          snapshot.state === 'expanded' &&
          helper &&
          document.activeElement === helper &&
          !focus(root)
        ) {
          settleFallback(receipt);
          return;
        }
        if (!current()) {
          settleFallback(capture(port));
          return;
        }
        moveRoot(overlay, capture(port));
        root.inert = snapshot.state === 'collapsed';
      } else {
        // 消えるheader buttonからの復帰先を先に可視・操作可にする。
        root.inert = false;
        root.setAttribute('data-mode', 'fixed');
        root.setAttribute('data-state', 'expanded');
        moveRoot(host, receipt);
        if (document.activeElement === port.button && !focus(root)) {
          settleFallback(capture(port));
          return;
        }
        if (!current()) {
          settleFallback(capture(port));
          return;
        }
        port.render({ ...snapshot, active: true, triggerVisible: false });
      }
      if (!current()) {
        settleFallback(capture(port));
        return;
      }
      if (snapshot.mode === 'fixed' && detachSticky === null)
        detachSticky = attachStickyFooterBoundary(host, { minWidth: 640 });
      if (snapshot.mode !== 'fixed') {
        detachSticky?.();
        detachSticky = null;
      }
      backdrop.hidden = snapshot.mode !== 'overlay' || snapshot.state !== 'expanded';
      navInteraction.connect(nav);
      rove(
        document.activeElement instanceof HTMLElement && root.contains(document.activeElement)
          ? document.activeElement
          : undefined,
      );
      publish('active');
      effectiveMode = snapshot.mode;
      effectiveState = snapshot.state;
      if (opening && snapshot.returnFocusTarget && !root.contains(document.activeElement))
        focus(controls()[0] ?? root);
      if (closing) layoutSidebarController.clearReturnFocusDescriptor(sidebarId);
    } catch {
      // 操作口の準備やfocusが例外でもnative surfaceを隠したままにしない。
      settleFallback(capture());
    } finally {
      for (const item of retiring.splice(0)) {
        repair(item.receipt);
        item.clear();
      }
      reconciling = false;
      if (cleanupPending) cleanup();
    }
  };
  const queueReconcile = (): void => {
    if (queued || listeners.signal.aborted) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      reconcile();
    });
  };
  const beforeMutation = (handoff: boolean, preservePlacement: boolean): (() => void) => {
    const receipt = capture();
    mutationDepth++;
    // headerだけを交換する文書commitでは、後続の選択属性patchが照合する
    // fixed placementとnav実体をここで壊さない。focus receiptは交換前に保持する。
    if (!preservePlacement) {
      if (!reconciling) {
        reconciling = true;
        try {
          publish('staged');
          quiesce(receipt, handoff);
        } finally {
          reconciling = false;
        }
      } else queueReconcile();
    }
    return () => {
      mutationDepth--;
      if (!handoff) {
        if (reconciling) pendingRepairs.push(receipt);
        else repair(receipt);
      }
      queueReconcile();
    };
  };
  const bind = (): void => {
    sidebarId = root.getAttribute('sidebar-id') ?? 'note-primary';
    scopeId = root.getAttribute('state-scope-id') ?? 'note-navigation';
    const previousSubscription = unsubscribe;
    unsubscribe = layoutSidebarController.subscribe(sidebarId, () => {
      if (!validated || state !== 'active') return;
      reconcile();
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
    const receipt = capture();
    generation = id;
    validated = false;
    publish('staged');
    origin.clear();
    quiesce(receipt, true);
  };
  const observer = new MutationObserver(queueReconcile);
  const connectionObserver = new MutationObserver(() => {
    if (!root.isConnected) cleanup();
  });
  const cleanup = (): void => {
    if (listeners.signal.aborted) return;
    if (reconciling) {
      cleanupPending = true;
      return;
    }
    cleanupPending = false;
    const receipt = capture();
    publish('fallback');
    quiesce(receipt, !root.isConnected || root.hidden);
    listeners.abort();
    observer.disconnect();
    connectionObserver.disconnect();
    unsubscribe?.();
    disconnectOwner?.();
    origin.clear();
    pending.clear();
    shell.removeAttribute(SIDEBAR_ENHANCEMENT_STATE);
    shell.removeAttribute(SIDEBAR_ENHANCEMENT_COMMIT_ID);
  };
  signal.addEventListener('abort', cleanup, { once: true });
  try {
    // module開始前のnative操作はlistenerで観測できないため、SSRの初期展開と照合する。
    let changedBeforeActivation = false;
    try {
      const initial: unknown = JSON.parse(root.getAttribute('initial-expanded-ids') ?? '[]');
      changedBeforeActivation =
        !Array.isArray(initial) ||
        initial.some((id: unknown) => typeof id !== 'string') ||
        [...root.querySelectorAll<HTMLDetailsElement>('[data-sidebar-nav-branch]')].some(
          (branch) =>
            branch.open !==
            initial.includes(branch.parentElement?.getAttribute('data-node-id') ?? ''),
        );
    } catch {
      changedBeforeActivation = true;
    }
    if (changedBeforeActivation || root.contains(document.activeElement)) engaged.add(generation);
    disconnectOwner = connectSidebarPresentationOwner(shell, {
      refresh: reconcile,
      beforeMutation,
      retireHeader(port, clear) {
        retiring.push({ receipt: capture(port), clear });
        reconcile();
      },
    });
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
        if (state !== 'active' && maintainingFocus === 0) engaged.add(generation);
        else if (
          state === 'active' &&
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
