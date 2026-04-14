import type {
  DocumentShellSnapshot,
  PreparedShellUpdate,
  ShellAdapter,
  SidebarShellSnapshot,
} from '../../../router/router.js';
import { DEFAULT_LAYOUT_SIDEBAR_ID } from '../../layout/layout-sidebar-controller.js';

const APP_ROUTER_SELECTOR = 'app-router';
const SIDEBAR_COLUMN_SELECTOR = '[data-app-shell-sidebar-host]';
const SIDEBAR_HOST_SELECTOR = `${SIDEBAR_COLUMN_SELECTOR} layout-sidebar`;

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
  present: true,
  sidebarId: toTrimmedString(sidebar.getAttribute('sidebar-id'), DEFAULT_LAYOUT_SIDEBAR_ID),
  stateScopeId: toTrimmedString(sidebar.getAttribute('state-scope-id')),
  selectedId: toOptionalString(sidebar.getAttribute('selected-id')),
  structuralExpandedIds: parseStringArrayAttribute(sidebar.getAttribute('structural-expanded-ids')),
  topologyRevision: toOptionalString(sidebar.getAttribute('topology-revision')),
  navHtml: sidebar.innerHTML.trim() || null,
  heading: toTrimmedString(sidebar.getAttribute('heading'), 'ナビゲーション'),
  fixedBreakpoint: toNumber(sidebar.getAttribute('fixed-breakpoint'), 1024),
  itemsJson: sidebar.getAttribute('items-json') ?? '',
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
  const isPresent = snapshot?.present ?? false;

  if (currentRouter instanceof HTMLElement) {
    currentRouter.setAttribute('data-sidebar-presence', isPresent ? 'present' : 'absent');
  }

  if (!(currentSidebarColumn instanceof HTMLElement) || !(currentSidebar instanceof HTMLElement)) {
    return;
  }

  currentSidebarColumn.hidden = !isPresent;
  currentSidebar.hidden = !isPresent;

  if (!snapshot) {
    return;
  }

  const projectionSidebar = currentSidebar as SidebarProjectionHost;
  if (typeof projectionSidebar.applyShellProjection === 'function') {
    projectionSidebar.applyShellProjection(snapshot);
  } else {
    currentSidebar.setAttribute('state-scope-id', snapshot.stateScopeId);

    if (snapshot.selectedId === null) {
      currentSidebar.removeAttribute('selected-id');
    } else {
      currentSidebar.setAttribute('selected-id', snapshot.selectedId);
    }

    currentSidebar.setAttribute(
      'structural-expanded-ids',
      JSON.stringify(snapshot.structuralExpandedIds),
    );

    if (snapshot.topologyRevision === null) {
      currentSidebar.removeAttribute('topology-revision');
    } else {
      currentSidebar.setAttribute('topology-revision', snapshot.topologyRevision);
    }

    currentSidebar.setAttribute('items-json', snapshot.itemsJson);
    currentSidebar.setAttribute('heading', snapshot.heading);
    currentSidebar.setAttribute('fixed-breakpoint', String(snapshot.fixedBreakpoint));
    currentSidebar.setAttribute('sidebar-id', snapshot.sidebarId);
    currentSidebar.setAttribute('presentation', snapshot.presentation);

    if (typeof snapshot.navHtml === 'string') {
      currentSidebar.innerHTML = snapshot.navHtml;
    }
  }
};

export const createLayoutSidebarShellAdapter = (): ShellAdapter => ({
  prepare(update): PreparedShellUpdate {
    const currentRouter = document.querySelector<HTMLElement>(APP_ROUTER_SELECTOR);
    const currentSidebarColumn = document.querySelector<HTMLElement>(SIDEBAR_COLUMN_SELECTOR);
    const currentSidebar = document.querySelector<SidebarProjectionHost>(SIDEBAR_HOST_SELECTOR);
    const previousShell: DocumentShellSnapshot | null =
      currentSidebar instanceof HTMLElement
        ? {
            header: {
              breadcrumbs: [],
              corpora: [],
              currentCorpusKey: 'all',
              noteLayout: false,
              sidebarEnabled: false,
              tocPresence: 'absent',
            },
            sidebar:
              currentSidebarColumn instanceof HTMLElement && !currentSidebarColumn.hidden
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
