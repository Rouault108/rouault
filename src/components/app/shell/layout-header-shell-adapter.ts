import type {
  DocumentShellSnapshot,
  HeaderShellSnapshot,
  PreparedShellUpdate,
  ShellAdapter,
} from '../../../router/router.js';

interface BreadcrumbShellItem {
  label: string;
  href?: string;
}

interface CorpusShellItem {
  key: string;
  label: string;
  href: string;
}

interface HeaderProjectionHost extends HTMLElement {
  applyShellProjection?(snapshot: HeaderShellSnapshot): void;
  readShellProjection?(): HeaderShellSnapshot;
}

const parseBreadcrumbs = (value: string | null): BreadcrumbShellItem[] => {
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
        const label = typeof record['label'] === 'string' ? record['label'].trim() : '';
        const href = typeof record['href'] === 'string' ? record['href'].trim() : '';
        if (label.length === 0) {
          return null;
        }

        return href.length > 0 ? { label, href } : { label };
      })
      .filter((item): item is BreadcrumbShellItem => item !== null);
  } catch {
    return [];
  }
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

export const readHeaderSnapshot = (header: Element): HeaderShellSnapshot => ({
  breadcrumbs: parseBreadcrumbs(header.getAttribute('breadcrumbs-json') ?? null),
  corpora: parseCorpora(header.getAttribute('corpora-json') ?? null),
  currentCorpusKey: readCurrentCorpusKey(header),
  noteLayout: header.hasAttribute('note-layout'),
  sidebarEnabled: header.hasAttribute('sidebar-enabled'),
});

export const applyHeaderSnapshot = (
  header: HTMLElement,
  shell: DocumentShellSnapshot | null,
): void => {
  const snapshot = shell?.header;
  const projectionHeader = header as HeaderProjectionHost;

  if (snapshot && typeof projectionHeader.applyShellProjection === 'function') {
    projectionHeader.applyShellProjection(snapshot);
    return;
  }

  header.setAttribute('breadcrumbs-json', JSON.stringify(snapshot?.breadcrumbs ?? []));
  header.setAttribute('corpora-json', JSON.stringify(snapshot?.corpora ?? []));
  header.setAttribute('current-corpus-key', snapshot?.currentCorpusKey ?? 'all');
  header.toggleAttribute('note-layout', snapshot?.noteLayout ?? false);
  header.toggleAttribute('sidebar-enabled', snapshot?.sidebarEnabled ?? false);
};

export const createLayoutHeaderShellAdapter = (): ShellAdapter => ({
  prepare(update): PreparedShellUpdate {
    const currentHeader = document.querySelector<HeaderProjectionHost>('layout-header');
    const previousShell =
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
