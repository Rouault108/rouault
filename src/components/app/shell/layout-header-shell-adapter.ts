import type {
  HeaderShellSnapshot,
  PreparedShellUpdate,
  ShellAdapter,
} from '../../../router/router.js';
import { TOC_TRIGGER_RESERVED_ATTRIBUTE } from '../../../toc/toc-mobile-panel-dom-css-contract.js';
import { DEFAULT_SIDEBAR_ID } from '../../../../shared/navigation/sidebar-shell-defaults.js';

interface CorpusShellItem {
  key: string;
  label: string;
  href: string;
}

type TocPresence = 'present' | 'absent';

interface HeaderProjectionHost extends HTMLElement {
  applyShellProjection?(snapshot: HeaderShellSnapshot): void;
  readShellProjection?(): HeaderShellSnapshot;
}

export const SAFE_FALLBACK_HEADER_SHELL_PROJECTION: HeaderShellSnapshot = {
  corpora: [],
  currentCorpusKey: 'all',
  noteLayout: false,
  sidebarEnabled: false,
  sidebarId: DEFAULT_SIDEBAR_ID,
  tocPresence: 'absent',
  tocRuntimeId: null,
  tocOwnerId: null,
  tocTriggerReserved: false,
};

const parseCorpora = (value: string | null): CorpusShellItem[] => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }

        const record = item as Record<string, unknown>;
        const key = typeof record['key'] === 'string' ? record['key'].trim() : '';
        const label = typeof record['label'] === 'string' ? record['label'].trim() : '';
        const href = typeof record['href'] === 'string' ? record['href'].trim() : '';
        if (key.length === 0 || label.length === 0 || href.length === 0) {
          return null;
        }

        return { key, label, href };
      })
      .filter((item): item is CorpusShellItem => item !== null);
  } catch {
    return [];
  }
};

const readCurrentCorpusKey = (header: Element): string => {
  const currentCorpusKey = header.getAttribute('current-corpus-key')?.trim();
  return currentCorpusKey === '' ? 'all' : (currentCorpusKey ?? 'all');
};

const readTocPresence = (header: Element): TocPresence =>
  header.getAttribute('toc-presence') === 'present' ? 'present' : 'absent';

const readTocRuntimeId = (header: Element): string | null => {
  const tocRuntimeId = header.getAttribute('toc-runtime-id')?.trim();
  return tocRuntimeId && tocRuntimeId.length > 0 ? tocRuntimeId : null;
};

const readTocOwnerId = (header: Element): string | null => {
  const tocOwnerId = header.getAttribute('data-toc-owner-id')?.trim();
  return tocOwnerId && tocOwnerId.length > 0 ? tocOwnerId : null;
};

const readTocTriggerReserved = (header: Element): boolean => {
  const value = header.getAttribute(TOC_TRIGGER_RESERVED_ATTRIBUTE);
  return value === '' || value === 'true';
};

const readSidebarId = (header: Element): string => {
  const sidebarId = header.getAttribute('sidebar-id')?.trim() ?? '';
  return sidebarId.length > 0 ? sidebarId : DEFAULT_SIDEBAR_ID;
};

export const readHeaderSnapshot = (header: Element): HeaderShellSnapshot => {
  const sidebarEnabled = header.hasAttribute('sidebar-enabled');

  return {
    corpora: parseCorpora(header.getAttribute('corpora-json') ?? null),
    currentCorpusKey: readCurrentCorpusKey(header),
    noteLayout: header.hasAttribute('note-layout'),
    sidebarEnabled,
    sidebarId: sidebarEnabled ? readSidebarId(header) : DEFAULT_SIDEBAR_ID,
    tocPresence: readTocPresence(header),
    tocRuntimeId: readTocRuntimeId(header),
    tocOwnerId: readTocOwnerId(header),
    tocTriggerReserved: readTocTriggerReserved(header),
  };
};

export const applyHeaderSnapshot = (
  header: HTMLElement,
  shell: { header: HeaderShellSnapshot } | null,
): void => {
  const snapshot = shell?.header ?? SAFE_FALLBACK_HEADER_SHELL_PROJECTION;
  const projectionHeader = header as HeaderProjectionHost;

  if (typeof projectionHeader.applyShellProjection === 'function') {
    projectionHeader.applyShellProjection(snapshot);
    return;
  }

  header.setAttribute('corpora-json', JSON.stringify(snapshot.corpora));
  header.setAttribute('current-corpus-key', snapshot.currentCorpusKey);
  header.toggleAttribute('note-layout', snapshot.noteLayout);
  header.toggleAttribute('sidebar-enabled', snapshot.sidebarEnabled);
  header.setAttribute(
    'sidebar-id',
    snapshot.sidebarEnabled ? snapshot.sidebarId : DEFAULT_SIDEBAR_ID,
  );
  header.setAttribute('toc-presence', snapshot.tocPresence);
  header.toggleAttribute(TOC_TRIGGER_RESERVED_ATTRIBUTE, snapshot.tocTriggerReserved === true);
  header.setAttribute(
    'toc-trigger-reserved',
    snapshot.tocTriggerReserved === true ? 'true' : 'false',
  );

  const tocRuntimeId = snapshot.tocRuntimeId?.trim();
  if (tocRuntimeId && tocRuntimeId.length > 0) {
    header.setAttribute('toc-runtime-id', tocRuntimeId);
  } else {
    header.removeAttribute('toc-runtime-id');
  }

  const tocOwnerId = snapshot.tocOwnerId?.trim();
  if (tocOwnerId && tocOwnerId.length > 0) {
    header.setAttribute('data-toc-owner-id', tocOwnerId);
  } else {
    header.removeAttribute('data-toc-owner-id');
  }
};

export const createLayoutHeaderShellAdapter = (): ShellAdapter => ({
  prepare(update): PreparedShellUpdate {
    const currentHeader = document.querySelector<HeaderProjectionHost>('layout-header');
    const previousShell: { header: HeaderShellSnapshot; sidebar: null } | null =
      currentHeader instanceof HTMLElement
        ? {
            header:
              typeof currentHeader.readShellProjection === 'function'
                ? currentHeader.readShellProjection()
                : readHeaderSnapshot(currentHeader),
            sidebar: null,
          }
        : null;
    const nextShell = update.shell;

    return {
      commit: () => {
        if (!(currentHeader instanceof HTMLElement)) {
          return;
        }

        applyHeaderSnapshot(currentHeader, nextShell);
      },
      rollback: () => {
        if (!(currentHeader instanceof HTMLElement)) {
          return;
        }

        applyHeaderSnapshot(currentHeader, previousShell);
      },
    };
  },
});
