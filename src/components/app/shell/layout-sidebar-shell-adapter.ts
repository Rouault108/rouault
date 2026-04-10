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

export const readSidebarShellSnapshot = (sidebar: Element): SidebarShellSnapshot => ({
  present: true,
  sidebarId: toTrimmedString(sidebar.getAttribute('sidebar-id'), DEFAULT_LAYOUT_SIDEBAR_ID),
  sourceId: toTrimmedString(sidebar.getAttribute('source-id')),
  selectedId: toOptionalString(sidebar.getAttribute('selected-id')),
  heading: toTrimmedString(sidebar.getAttribute('heading'), 'ナビゲーション'),
  fixedBreakpoint: toNumber(sidebar.getAttribute('fixed-breakpoint'), 1024),
  itemsJson: sidebar.getAttribute('items-json') ?? '',
  presentation:
    sidebar.getAttribute('presentation') === 'fixed' ||
    sidebar.getAttribute('presentation') === 'overlay'
      ? (sidebar.getAttribute('presentation') as SidebarShellSnapshot['presentation'])
      : 'auto',
});

export const extractSidebarShellSnapshot = (
  documentSnapshot: Document,
): SidebarShellSnapshot | null => {
  const sidebar = documentSnapshot.querySelector(SIDEBAR_HOST_SELECTOR);
  if (!(sidebar instanceof Element)) {
    return null;
  }

  const host = sidebar.closest(SIDEBAR_COLUMN_SELECTOR);
  if (host instanceof HTMLElement && host.hidden) {
    return null;
  }

  return readSidebarShellSnapshot(sidebar);
};

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

  currentSidebar.setAttribute('source-id', snapshot.sourceId);

  if (snapshot.selectedId === null) {
    currentSidebar.removeAttribute('selected-id');
  } else {
    currentSidebar.setAttribute('selected-id', snapshot.selectedId);
  }

  currentSidebar.setAttribute('items-json', snapshot.itemsJson);
  currentSidebar.setAttribute('heading', snapshot.heading);
  currentSidebar.setAttribute('fixed-breakpoint', String(snapshot.fixedBreakpoint));
  currentSidebar.setAttribute('sidebar-id', snapshot.sidebarId);
  currentSidebar.setAttribute('presentation', snapshot.presentation);
};

export const createLayoutSidebarShellAdapter = (): ShellAdapter => ({
  extract(_documentSnapshot: Document) {
    return null;
  },

  prepare(update): PreparedShellUpdate {
    const currentRouter = document.querySelector<HTMLElement>(APP_ROUTER_SELECTOR);
    const currentSidebarColumn = document.querySelector<HTMLElement>(SIDEBAR_COLUMN_SELECTOR);
    const currentSidebar = document.querySelector<HTMLElement>(SIDEBAR_HOST_SELECTOR);
    const previousShell: DocumentShellSnapshot | null =
      currentSidebar instanceof HTMLElement
        ? {
            header: {
              breadcrumbs: [],
              corpora: [],
              currentCorpusKey: 'all',
              noteLayout: false,
              sidebarEnabled: false,
            },
            sidebar:
              currentSidebarColumn instanceof HTMLElement && !currentSidebarColumn.hidden
                ? readSidebarShellSnapshot(currentSidebar)
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
