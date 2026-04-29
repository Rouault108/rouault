import type {
  DocumentShellSnapshot,
  PreparedShellUpdate,
  ShellAdapter,
  SidebarShellSnapshot,
} from '../../../router/router.js';
import { DEFAULT_LAYOUT_SIDEBAR_ID } from '../../layout/layout-sidebar-controller.js';
import { NOTE_SIDEBAR_FIXED_BREAKPOINT } from '../../../layout/note-sidebar-breakpoint.js';
import { SAFE_FALLBACK_HEADER_SHELL_PROJECTION } from './layout-header-shell-adapter.js';

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
] as const;

interface SidebarProjectionHost extends HTMLElement {
  applyShellProjection?(snapshot: SidebarShellSnapshot | null): void;
  readShellProjection?(): SidebarShellSnapshot;
}

const toTrimmedString = (value: string | null, fallback = ''): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const toOptionalString = (value: string | null): string | null => {
  const normalized = toTrimmedString(value);
  return normalized.length > 0 ? normalized : null;
};

const toNumber = (value: string | null, fallback: number): number => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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

export const readSidebarShellSnapshot = (sidebar: Element): SidebarShellSnapshot => ({
  present: !(sidebar instanceof HTMLElement && sidebar.hidden),
  sidebarId: toTrimmedString(sidebar.getAttribute('sidebar-id'), DEFAULT_LAYOUT_SIDEBAR_ID),
  stateScopeId: toTrimmedString(sidebar.getAttribute('state-scope-id')),
  selectedId: toOptionalString(sidebar.getAttribute('selected-id')),
  initialExpandedIds: parseStringArrayAttribute(sidebar.getAttribute('initial-expanded-ids')),
  topologyRevision: toOptionalString(sidebar.getAttribute('topology-revision')),
  // fallback 読み取りは SSR / projection 由来 DOM の rollback 復元に限定する。
  navHtml: sidebar.innerHTML.trim() || null,
  heading: toOptionalString(sidebar.getAttribute('heading')),
  fixedBreakpoint: toNumber(
    sidebar.getAttribute('fixed-breakpoint'),
    NOTE_SIDEBAR_FIXED_BREAKPOINT,
  ),
  presentation:
    sidebar.getAttribute('presentation') === 'fixed' ||
    sidebar.getAttribute('presentation') === 'overlay'
      ? (sidebar.getAttribute('presentation') as SidebarShellSnapshot['presentation'])
      : 'auto',
});

export const applySidebarSnapshot = (
  shell: DocumentShellSnapshot | null,
  currentRouter: HTMLElement | null,
  currentSidebarColumn: HTMLElement | null,
  currentSidebar: HTMLElement | null,
): void => {
  const snapshot = shell?.sidebar;
  const normalizedSnapshot = snapshot === null || snapshot?.present === false ? null : snapshot;
  const isPresent = normalizedSnapshot !== null && normalizedSnapshot !== undefined;

  if (currentRouter instanceof HTMLElement) {
    currentRouter.setAttribute('data-sidebar-presence', isPresent ? 'present' : 'absent');
  }

  if (!(currentSidebarColumn instanceof HTMLElement) || !(currentSidebar instanceof HTMLElement)) {
    return;
  }

  currentSidebarColumn.hidden = !isPresent;
  currentSidebar.hidden = !isPresent;

  const projectionSidebar = currentSidebar as SidebarProjectionHost;
  if (typeof projectionSidebar.applyShellProjection === 'function') {
    projectionSidebar.applyShellProjection(normalizedSnapshot ?? null);
    return;
  }

  if (!normalizedSnapshot) {
    for (const attributeName of SIDEBAR_PROJECTION_ATTRIBUTES) {
      currentSidebar.removeAttribute(attributeName);
    }
    if ('presentation' in currentSidebar) {
      (currentSidebar as { presentation?: unknown }).presentation = 'auto';
    }
    if ('fixedBreakpoint' in currentSidebar) {
      (currentSidebar as { fixedBreakpoint?: unknown }).fixedBreakpoint =
        NOTE_SIDEBAR_FIXED_BREAKPOINT;
    }
    currentSidebar.innerHTML = '';
    return;
  }

  currentSidebar.setAttribute('state-scope-id', normalizedSnapshot.stateScopeId);

  if (normalizedSnapshot.selectedId === null) {
    currentSidebar.removeAttribute('selected-id');
  } else {
    currentSidebar.setAttribute('selected-id', normalizedSnapshot.selectedId);
  }

  currentSidebar.setAttribute(
    'initial-expanded-ids',
    JSON.stringify(normalizedSnapshot.initialExpandedIds),
  );

  if (normalizedSnapshot.topologyRevision === null) {
    currentSidebar.removeAttribute('topology-revision');
  } else {
    currentSidebar.setAttribute('topology-revision', normalizedSnapshot.topologyRevision);
  }

  if (normalizedSnapshot.heading === null) {
    currentSidebar.removeAttribute('heading');
  } else {
    currentSidebar.setAttribute('heading', normalizedSnapshot.heading);
  }
  currentSidebar.setAttribute('fixed-breakpoint', String(normalizedSnapshot.fixedBreakpoint));
  currentSidebar.setAttribute('sidebar-id', normalizedSnapshot.sidebarId);
  currentSidebar.setAttribute('presentation', normalizedSnapshot.presentation);

  currentSidebar.innerHTML =
    typeof normalizedSnapshot.navHtml === 'string' ? normalizedSnapshot.navHtml : '';
};

export const createLayoutSidebarShellAdapter = (): ShellAdapter => ({
  prepare(update): PreparedShellUpdate {
    const currentRouter = document.querySelector<HTMLElement>(APP_ROUTER_SELECTOR);
    const currentSidebarColumn = document.querySelector<HTMLElement>(SIDEBAR_COLUMN_SELECTOR);
    const currentSidebar = document.querySelector<SidebarProjectionHost>(SIDEBAR_HOST_SELECTOR);
    const previousShell: DocumentShellSnapshot | null =
      currentSidebar instanceof HTMLElement
        ? {
            header: SAFE_FALLBACK_HEADER_SHELL_PROJECTION,
            sidebar:
              currentSidebarColumn instanceof HTMLElement &&
              !currentSidebarColumn.hidden &&
              !currentSidebar.hidden
                ? typeof currentSidebar.readShellProjection === 'function'
                  ? currentSidebar.readShellProjection()
                  : readSidebarShellSnapshot(currentSidebar)
                : null,
          }
        : null;

    return {
      commit: () => {
        applySidebarSnapshot(update.shell, currentRouter, currentSidebarColumn, currentSidebar);
      },
      rollback: () => {
        applySidebarSnapshot(previousShell, currentRouter, currentSidebarColumn, currentSidebar);
      },
    };
  },
});
