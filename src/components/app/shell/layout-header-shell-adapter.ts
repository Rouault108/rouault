import type { ShellAdapter } from '../../../router/router.js';

interface BreadcrumbShellItem {
  label: string;
  href?: string;
}

interface CorpusShellItem {
  key: string;
  label: string;
  href: string;
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

export const createLayoutHeaderShellAdapter = (): ShellAdapter => ({
  extract(documentSnapshot: Document) {
    const nextHeader = documentSnapshot.querySelector('layout-header');

    return {
      header: {
        breadcrumbs: parseBreadcrumbs(nextHeader?.getAttribute('breadcrumbs-json') ?? null),
        corpora: parseCorpora(nextHeader?.getAttribute('corpora-json') ?? null),
        currentCorpusKey: (() => {
          const currentCorpusKey = nextHeader?.getAttribute('current-corpus-key')?.trim();
          return currentCorpusKey === '' ? 'all' : (currentCorpusKey ?? 'all');
        })(),
        noteLayout: nextHeader?.hasAttribute('note-layout') ?? false,
        sidebarEnabled: nextHeader?.hasAttribute('sidebar-enabled') ?? false,
      },
    };
  },
  apply(shell) {
    const currentHeader = document.querySelector('layout-header');
    if (!(currentHeader instanceof HTMLElement)) {
      return;
    }

    currentHeader.setAttribute('breadcrumbs-json', JSON.stringify(shell?.header.breadcrumbs ?? []));
    currentHeader.setAttribute('corpora-json', JSON.stringify(shell?.header.corpora ?? []));
    currentHeader.setAttribute('current-corpus-key', shell?.header.currentCorpusKey ?? 'all');
    currentHeader.toggleAttribute('note-layout', shell?.header.noteLayout ?? false);
    currentHeader.toggleAttribute('sidebar-enabled', shell?.header.sidebarEnabled ?? false);
  },
});