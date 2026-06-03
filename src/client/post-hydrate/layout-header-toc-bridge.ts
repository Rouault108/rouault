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
    const panel = document.querySelector<HTMLElement>(MOBILE_PANEL_SELECTOR);
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

const releaseAndActivateTocController = async (
  state: TocBridgeState,
  shellCommitId: number,
): Promise<void> => {
  const runtimeId = readRuntimeId();
  const context = state.linkValidationContext;
  if (runtimeId === null || context === null || state.validatedShellCommitId !== shellCommitId)
    return;
  const module = await import('../../components/layout/layout-toc-controller.js');
  if (readCurrentShellCommitId() !== shellCommitId && shellCommitId !== 0) return;
  const controller = [...document.querySelectorAll<HTMLElement>('layout-toc-controller')].find(
    (candidate) => candidate.getAttribute('toc-runtime-id') === runtimeId,
  );
  if (!(controller instanceof HTMLElement)) return;
  await customElements.whenDefined('layout-toc-controller');
  customElements.upgrade(controller);
  await Promise.resolve();
  controller.removeAttribute('data-toc-trigger-reserved');
  module.activateLayoutTocController(controller);
  const panel = document.querySelector<HTMLElement>(MOBILE_PANEL_SELECTOR);
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
  refreshSubscriptions(state);
};

export const enhanceLayoutHeaderTocBridge = (signal: AbortSignal): void => {
  const state: TocBridgeState = {
    runtimeId: null,
    runtimeCleanup: null,
    mobileCleanup: null,
    validatedShellCommitId: null,
    linkValidationContext: null,
  };
  const refresh = (): void => {
    refreshSubscriptions(state);
  };
  refresh();

  document.addEventListener('app-shell:committed', refresh, { signal });
  document.addEventListener(
    'app-shell:restored',
    (event) => {
      const detail = (event as CustomEvent<AppShellRestoredDetail>).detail;
      state.validatedShellCommitId = detail.restoredShellCommitId;
      state.linkValidationContext = null;
      refresh();
    },
    { signal },
  );
  document.addEventListener(
    'app-shell:validated',
    (event) => {
      const detail = (event as CustomEvent<AppShellValidatedDetail>).detail;
      state.validatedShellCommitId = detail.shellCommitId;
      state.linkValidationContext = detail.linkValidationContext;
      refresh();
      void releaseAndActivateTocController(state, detail.shellCommitId).catch(() => undefined);
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
        void releaseAndActivateTocController(state, shellCommitId).catch(() => undefined);
      }
    },
    { signal },
  );
  signal.addEventListener(
    'abort',
    () => {
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
