import type {
  PayloadDocumentShellSnapshot,
  PreparedShellUpdate,
  RuntimeDocumentShellSnapshot,
  RuntimeSidebarShellSnapshot,
  ShellAdapter,
} from '../../../router/router.js';
import {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT,
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_PRESENTATION,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from '../../../../shared/navigation/sidebar-shell-defaults.js';
import {
  createCanonicalAbsentRuntimeSidebarProjection,
} from '../../../../shared/navigation/sidebar-shell-projection-contract.js';
import {
  validateRuntimeSidebarProjection,
} from '../../../../shared/navigation/shell-projection-validator.js';
import { layoutSidebarController } from '../../layout/layout-sidebar-controller.js';

const APP_ROUTER_SELECTOR = 'app-router';
const SIDEBAR_COLUMN_SELECTOR = '[data-app-shell-sidebar-host]';
const SIDEBAR_HOST_SELECTOR = `${SIDEBAR_COLUMN_SELECTOR} layout-sidebar`;
const SIDEBAR_PROJECTION_ATTRIBUTES = [
  'state-scope-id',
  'selected-id',
  'initial-expanded-ids',
  'topology-revision',
  'heading',
  'fixed-breakpoint',
  'presentation',
  'sidebar-id',
] as const;

interface SidebarProjectionHost extends HTMLElement {
  applyShellProjection?(snapshot: RuntimeSidebarShellSnapshot | null): void;
  readShellProjection?(): RuntimeSidebarShellSnapshot;
}

const readRequiredAttribute = (element: Element, attributeName: string): string => {
  const value = element.getAttribute(attributeName);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`visible layout-sidebar requires ${attributeName}.`);
  }
  return value.trim();
};

const toOptionalString = (value: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toNumber = (value: string | null, fallback: number): number => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};


const readCurrentSidebarIdForFallback = (sidebar: HTMLElement): string => {
  const propertyValue = (sidebar as { sidebarId?: unknown }).sidebarId;
  if (typeof propertyValue === 'string' && propertyValue.trim().length > 0) {
    return propertyValue.trim();
  }

  const attributeValue = sidebar.getAttribute('sidebar-id');
  if (typeof attributeValue === 'string' && attributeValue.trim().length > 0) {
    return attributeValue.trim();
  }

  return DEFAULT_SIDEBAR_ID;
};

const parseStringArrayAttribute = (value: string | null): string[] => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
};

export const readSidebarShellSnapshot = (sidebar: Element): RuntimeSidebarShellSnapshot => {
  if (sidebar instanceof HTMLElement && sidebar.hidden) {
    return createCanonicalAbsentRuntimeSidebarProjection();
  }

  const presentationAttribute = sidebar.getAttribute('presentation');
  const presentation =
    presentationAttribute === 'fixed' || presentationAttribute === 'overlay'
      ? presentationAttribute
      : DEFAULT_SIDEBAR_PRESENTATION;

  return validateRuntimeSidebarProjection({
    present: true,
    sidebarId: readRequiredAttribute(sidebar, 'sidebar-id'),
    stateScopeId: readRequiredAttribute(sidebar, 'state-scope-id'),
    selectedId: toOptionalString(sidebar.getAttribute('selected-id')),
    initialExpandedIds: parseStringArrayAttribute(sidebar.getAttribute('initial-expanded-ids')),
    topologyRevision: readRequiredAttribute(sidebar, 'topology-revision'),
    navHtml: sidebar.innerHTML,
    heading: toOptionalString(sidebar.getAttribute('heading')),
    fixedBreakpoint: toNumber(
      sidebar.getAttribute('fixed-breakpoint'),
      DEFAULT_SIDEBAR_FIXED_BREAKPOINT,
    ),
    presentation,
  });
};

const applyRuntimeSidebarSnapshot = (
  snapshot: RuntimeSidebarShellSnapshot | null,
  currentRouter: HTMLElement | null,
  currentSidebarColumn: HTMLElement | null,
  currentSidebar: HTMLElement | null,
): void => {
  const runtimeSnapshot = snapshot ?? createCanonicalAbsentRuntimeSidebarProjection();
  const validated = validateRuntimeSidebarProjection(runtimeSnapshot);
  const isPresent = validated.present;

  if (currentRouter instanceof HTMLElement) {
    currentRouter.setAttribute('data-sidebar-presence', isPresent ? 'present' : 'absent');
  }

  if (!(currentSidebarColumn instanceof HTMLElement) || !(currentSidebar instanceof HTMLElement)) {
    return;
  }

  currentSidebarColumn.hidden = !isPresent;

  const projectionSidebar = currentSidebar as SidebarProjectionHost;
  if (typeof projectionSidebar.applyShellProjection === 'function') {
    projectionSidebar.applyShellProjection(validated);
    return;
  }

  currentSidebar.hidden = !isPresent;

  if (!isPresent) {
    const previousSidebarId = readCurrentSidebarIdForFallback(currentSidebar);
    layoutSidebarController.close(previousSidebarId);

    for (const attributeName of SIDEBAR_PROJECTION_ATTRIBUTES) {
      currentSidebar.removeAttribute(attributeName);
    }
    if ('sidebarId' in currentSidebar) {
      (currentSidebar as { sidebarId?: unknown }).sidebarId = DEFAULT_SIDEBAR_ID;
    }
    if ('stateScopeId' in currentSidebar) {
      (currentSidebar as { stateScopeId?: unknown }).stateScopeId = DEFAULT_SIDEBAR_STATE_SCOPE_ID;
    }
    if ('initialExpandedIdsJson' in currentSidebar) {
      (currentSidebar as { initialExpandedIdsJson?: unknown }).initialExpandedIdsJson = '[]';
    }
    if ('presentation' in currentSidebar) {
      (currentSidebar as { presentation?: unknown }).presentation = DEFAULT_SIDEBAR_PRESENTATION;
    }
    if ('fixedBreakpoint' in currentSidebar) {
      (currentSidebar as { fixedBreakpoint?: unknown }).fixedBreakpoint =
        DEFAULT_SIDEBAR_FIXED_BREAKPOINT;
    }
    currentSidebar.innerHTML = '';
    return;
  }

  currentSidebar.setAttribute('state-scope-id', validated.stateScopeId);

  if (validated.selectedId === null) {
    currentSidebar.removeAttribute('selected-id');
  } else {
    currentSidebar.setAttribute('selected-id', validated.selectedId);
  }

  currentSidebar.setAttribute('initial-expanded-ids', JSON.stringify(validated.initialExpandedIds));
  currentSidebar.setAttribute('topology-revision', validated.topologyRevision);

  if (validated.heading === null) {
    currentSidebar.removeAttribute('heading');
  } else {
    currentSidebar.setAttribute('heading', validated.heading);
  }
  currentSidebar.setAttribute('fixed-breakpoint', String(validated.fixedBreakpoint));
  currentSidebar.setAttribute('sidebar-id', validated.sidebarId);
  currentSidebar.setAttribute('presentation', validated.presentation);
  currentSidebar.innerHTML = validated.navHtml;
};

export const applyPayloadShellSnapshot = (
  shell: PayloadDocumentShellSnapshot | null,
  currentRouter: HTMLElement | null,
  currentSidebarColumn: HTMLElement | null,
  currentSidebar: HTMLElement | null,
): void => {
  applyRuntimeSidebarSnapshot(
    shell?.sidebarProjection ?? createCanonicalAbsentRuntimeSidebarProjection(),
    currentRouter,
    currentSidebarColumn,
    currentSidebar,
  );
};

export const applyRuntimeSidebarSnapshotForRollback = (
  shell: RuntimeDocumentShellSnapshot | null,
  currentRouter: HTMLElement | null,
  currentSidebarColumn: HTMLElement | null,
  currentSidebar: HTMLElement | null,
): void => {
  applyRuntimeSidebarSnapshot(
    shell?.sidebar ?? createCanonicalAbsentRuntimeSidebarProjection(),
    currentRouter,
    currentSidebarColumn,
    currentSidebar,
  );
};

/** @deprecated Use applyPayloadShellSnapshot for commit path. */
export const applySidebarSnapshot = applyPayloadShellSnapshot;

export const createLayoutSidebarShellAdapter = (): ShellAdapter => ({
  prepare(update): PreparedShellUpdate {
    const currentRouter = document.querySelector<HTMLElement>(APP_ROUTER_SELECTOR);
    const currentSidebarColumn = document.querySelector<HTMLElement>(SIDEBAR_COLUMN_SELECTOR);
    const currentSidebar = document.querySelector<SidebarProjectionHost>(SIDEBAR_HOST_SELECTOR);
    const previousRuntimeSidebar =
      currentSidebar instanceof HTMLElement
        ? typeof currentSidebar.readShellProjection === 'function'
          ? currentSidebar.readShellProjection()
          : readSidebarShellSnapshot(currentSidebar)
        : createCanonicalAbsentRuntimeSidebarProjection();
    const previousShell: RuntimeDocumentShellSnapshot | null =
      currentSidebar instanceof HTMLElement
        ? {
            headerHtml: '',
            sidebar: previousRuntimeSidebar,
          }
        : null;

    return {
      commit: () => {
        applyPayloadShellSnapshot(update.shell, currentRouter, currentSidebarColumn, currentSidebar);
      },
      rollback: () => {
        applyRuntimeSidebarSnapshotForRollback(
          previousShell,
          currentRouter,
          currentSidebarColumn,
          currentSidebar,
        );
      },
    };
  },
});
