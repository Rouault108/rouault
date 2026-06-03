import { layoutTocMobileController } from '../../components/layout/layout-toc-mobile-controller.js';
import {
  layoutTocRuntimeStore,
  type LayoutTocRuntimeSnapshot,
} from '../../components/layout/layout-toc-runtime-store.js';
import { readCurrentShellCommitId } from '../../components/app/shell/app-shell-lifecycle.js';
import type {
  AppContentHydrationReadyDetail,
  AppShellRestoredDetail,
  AppShellValidatedDetail,
  RuntimeDomLinkValidationContext,
} from '../../components/app/shell/app-shell-events.js';
import { validateRuntimeDomLinkContractSubtree } from '../../router/dom-link-contract.js';

const HEADER_SELECTOR = 'header[data-layout-header]';
const TOC_TRIGGER_SELECTOR = '[data-toc-trigger]';
const MOBILE_PANEL_SELECTOR = '[data-layout-toc-mobile-panel]';

interface TocBridgeState {
  runtimeId: string | null;
  runtimeCleanup: (() => void) | null;
  mobileCleanup: (() => void) | null;
  validatedShellCommitId: number | null;
  linkValidationContext: RuntimeDomLinkValidationContext | null;
  validationContexts: Map<number, RuntimeDomLinkValidationContext>;
  activationAbortController: AbortController | null;
}

const readRuntimeId = (): string | null => {
  const value = document
    .querySelector<HTMLElement>(HEADER_SELECTOR)
    ?.getAttribute('data-toc-runtime-id')
    ?.trim();
  return value && value.length > 0 ? value : null;
};

const resolveTriggers = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>(`${HEADER_SELECTOR} ${TOC_TRIGGER_SELECTOR}`),
];

const resolveRuntimeMobilePanel = (runtimeId: string): HTMLElement | null => {
  const panel = document.getElementById(`layout-toc-panel-${runtimeId}`);
  return panel instanceof HTMLElement && panel.matches(MOBILE_PANEL_SELECTOR) ? panel : null;
};

const syncRuntimeSnapshot = (snapshot: LayoutTocRuntimeSnapshot): void => {
  const interactive = snapshot.ready && snapshot.hasVisibleHeadings;
  for (const trigger of resolveTriggers()) {
    trigger.setAttribute('data-visible', snapshot.hasVisibleHeadings ? 'true' : 'false');
    trigger.setAttribute('data-toc-hydration-state', snapshot.hydrationState ?? 'unhydrated');
    trigger.setAttribute('data-toc-trigger-interactive', interactive ? 'true' : 'false');
    trigger.setAttribute('aria-disabled', interactive ? 'false' : 'true');
  }
};

const syncMobileSnapshot = (panelOpen: boolean): void => {
  for (const trigger of resolveTriggers()) {
    trigger.setAttribute('aria-expanded', panelOpen ? 'true' : 'false');
    const runtimeId = trigger.getAttribute('data-toc-runtime-id')?.trim();
    const panel = runtimeId && runtimeId.length > 0 ? resolveRuntimeMobilePanel(runtimeId) : null;
    if (panel?.id) trigger.setAttribute('aria-controls', panel.id);
  }
};

const disconnectSubscriptions = (state: TocBridgeState): void => {
  state.runtimeCleanup?.();
  state.mobileCleanup?.();
  state.runtimeCleanup = null;
  state.mobileCleanup = null;
};

const refreshSubscriptions = (state: TocBridgeState): void => {
  const runtimeId = readRuntimeId();
  if (
    runtimeId === state.runtimeId &&
    state.runtimeCleanup !== null &&
    state.mobileCleanup !== null
  ) {
    return;
  }
  disconnectSubscriptions(state);
  state.runtimeId = runtimeId;
  if (runtimeId === null) return;
  state.runtimeCleanup = layoutTocRuntimeStore.subscribe(runtimeId, syncRuntimeSnapshot);
  state.mobileCleanup = layoutTocMobileController.subscribe(runtimeId, (snapshot) => {
    syncMobileSnapshot(snapshot.panelOpen);
  });
};

const isCurrentShellActivation = (
  state: TocBridgeState,
  shellCommitId: number,
  runtimeId: string,
  context: RuntimeDomLinkValidationContext,
): boolean =>
  readCurrentShellCommitId() === shellCommitId &&
  state.validatedShellCommitId === shellCommitId &&
  state.linkValidationContext === context &&
  readRuntimeId() === runtimeId;

const resolveCurrentTocController = (runtimeId: string): HTMLElement | null => {
  const controller = [...document.querySelectorAll<HTMLElement>('layout-toc-controller')].find(
    (candidate) =>
      candidate.isConnected &&
      candidate.ownerDocument === document &&
      document.body.contains(candidate) &&
      candidate.getAttribute('toc-runtime-id') === runtimeId,
  );
  if (!(controller instanceof HTMLElement)) return null;
  const tocRoot = controller.closest('[data-layout-toc-root]');
  if (!(tocRoot instanceof HTMLElement) || !tocRoot.isConnected) return null;
  const contentRootId = controller.getAttribute('content-root-id')?.trim();
  if (contentRootId === undefined || contentRootId.length === 0) return null;
  const contentRoot = document.getElementById(contentRootId);
  if (!(contentRoot instanceof HTMLElement) || !contentRoot.isConnected) return null;
  return controller;
};

const removeRuntimeMobilePanel = (runtimeId: string): void => {
  const panelId = `layout-toc-panel-${runtimeId}`;
  document.querySelectorAll<HTMLElement>(MOBILE_PANEL_SELECTOR).forEach((panel) => {
    if (panel.id === panelId) panel.remove();
  });
};

const removeCurrentRuntimeMobilePanel = (): void => {
  const runtimeId = readRuntimeId();
  if (runtimeId !== null) removeRuntimeMobilePanel(runtimeId);
};

const abortPostValidationActivation = (state: TocBridgeState): void => {
  state.activationAbortController?.abort();
  state.activationAbortController = null;
};

const startPostValidationActivation = (state: TocBridgeState): AbortSignal => {
  abortPostValidationActivation(state);
  const controller = new AbortController();
  state.activationAbortController = controller;
  return controller.signal;
};

const isActiveSignal = (state: TocBridgeState, signal: AbortSignal): boolean =>
  !signal.aborted && state.activationAbortController?.signal === signal;

const releaseAndActivateTocController = async (
  state: TocBridgeState,
  shellCommitId: number,
  signal: AbortSignal,
): Promise<void> => {
  if (!isActiveSignal(state, signal)) return;
  const runtimeId = readRuntimeId();
  const context = state.linkValidationContext;
  if (
    runtimeId === null ||
    context === null ||
    !isActiveSignal(state, signal) ||
    !isCurrentShellActivation(state, shellCommitId, runtimeId, context)
  ) {
    return;
  }
  const module = await import('../../components/layout/layout-toc-controller.js');
  if (
    !isActiveSignal(state, signal) ||
    !isCurrentShellActivation(state, shellCommitId, runtimeId, context)
  ) {
    return;
  }
  const controller = resolveCurrentTocController(runtimeId);
  if (controller === null) return;
  await customElements.whenDefined('layout-toc-controller');
  if (
    !isActiveSignal(state, signal) ||
    !isCurrentShellActivation(state, shellCommitId, runtimeId, context)
  ) {
    return;
  }
  customElements.upgrade(controller);
  await Promise.resolve();
  if (
    !isActiveSignal(state, signal) ||
    !controller.isConnected ||
    !document.body.contains(controller) ||
    !isCurrentShellActivation(state, shellCommitId, runtimeId, context)
  ) {
    return;
  }
  controller.removeAttribute('data-toc-trigger-reserved');
  module.activateLayoutTocController(controller);
  if (
    !isActiveSignal(state, signal) ||
    !isCurrentShellActivation(state, shellCommitId, runtimeId, context)
  ) {
    removeRuntimeMobilePanel(runtimeId);
    return;
  }
  const panel = resolveRuntimeMobilePanel(runtimeId);
  if (panel instanceof HTMLElement) {
    try {
      validateRuntimeDomLinkContractSubtree({
        root: panel,
        sourceLabel: `toc-mobile-panel:${runtimeId}`,
        ...context,
      });
    } catch (error) {
      panel.remove();
      throw error;
    }
  }
  if (
    !isActiveSignal(state, signal) ||
    !isCurrentShellActivation(state, shellCommitId, runtimeId, context)
  ) {
    removeRuntimeMobilePanel(runtimeId);
    return;
  }
  syncMobileSnapshot(layoutTocMobileController.getSnapshot(runtimeId).panelOpen);
  refreshSubscriptions(state);
};

export const enhanceLayoutHeaderTocBridge = (signal: AbortSignal): void => {
  const state: TocBridgeState = {
    runtimeId: null,
    runtimeCleanup: null,
    mobileCleanup: null,
    validatedShellCommitId: null,
    linkValidationContext: null,
    validationContexts: new Map(),
    activationAbortController: null,
  };
  const refresh = (): void => {
    refreshSubscriptions(state);
  };
  refresh();

  document.addEventListener(
    'app-shell:committed',
    () => {
      abortPostValidationActivation(state);
      refresh();
    },
    { signal },
  );
  document.addEventListener(
    'app-shell:rollback-start',
    () => {
      abortPostValidationActivation(state);
      removeCurrentRuntimeMobilePanel();
    },
    { signal },
  );
  document.addEventListener(
    'app-shell:restored',
    (event) => {
      const detail = (event as CustomEvent<AppShellRestoredDetail>).detail;
      abortPostValidationActivation(state);
      state.validatedShellCommitId = detail.restoredShellCommitId;
      state.linkValidationContext =
        state.validationContexts.get(detail.restoredShellCommitId) ?? null;
      refresh();
      if (state.linkValidationContext !== null) {
        const activationSignal = startPostValidationActivation(state);
        void releaseAndActivateTocController(
          state,
          detail.restoredShellCommitId,
          activationSignal,
        ).catch(() => undefined);
      }
    },
    { signal },
  );
  document.addEventListener(
    'app-shell:validated',
    (event) => {
      const detail = (event as CustomEvent<AppShellValidatedDetail>).detail;
      abortPostValidationActivation(state);
      state.validatedShellCommitId = detail.shellCommitId;
      state.linkValidationContext = detail.linkValidationContext;
      state.validationContexts.set(detail.shellCommitId, detail.linkValidationContext);
      refresh();
      const activationSignal = startPostValidationActivation(state);
      void releaseAndActivateTocController(
        state,
        detail.shellCommitId,
        activationSignal,
      ).catch(() => undefined);
    },
    { signal },
  );
  document.addEventListener(
    'app-content:hydration-ready',
    (event) => {
      void (event as CustomEvent<AppContentHydrationReadyDetail>).detail;
      const shellCommitId = state.validatedShellCommitId;
      refresh();
      if (shellCommitId !== null) {
        const activationSignal = startPostValidationActivation(state);
        void releaseAndActivateTocController(state, shellCommitId, activationSignal).catch(
          () => undefined,
        );
      }
    },
    { signal },
  );
  signal.addEventListener(
    'abort',
    () => {
      abortPostValidationActivation(state);
      disconnectSubscriptions(state);
    },
    { once: true },
  );
};

export const toggleHeaderTocPanel = (trigger: HTMLElement): boolean => {
  if (trigger.getAttribute('data-toc-trigger-interactive') !== 'true') return false;
  const runtimeId = trigger.getAttribute('data-toc-runtime-id')?.trim();
  if (!runtimeId) return false;
  layoutTocMobileController.toggle(runtimeId, trigger);
  return true;
};
