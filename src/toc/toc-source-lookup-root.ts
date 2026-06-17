import { MAIN_CONTENT_ID } from '../../shared/navigation/main-landmark-contract.js';

export type TocSourceLookupRootResult =
  | { readonly status: 'boundary-root'; readonly root: ParentNode }
  | { readonly status: 'main-root'; readonly root: ParentNode }
  | { readonly status: 'document-fallback'; readonly root: Document };

const createMainSelector = (): string => {
  const escape =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape
      : (value: string): string => value.replace(/"/g, '\\"');
  return `main#${escape(MAIN_CONTENT_ID)}`;
};

const escapeSelectorIdent = (value: string): string =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/"/g, '\\"');

export const resolveTocSourceLookupRoot = (host: Element): TocSourceLookupRootResult => {
  const boundaryRoot = host.closest('[data-layout-toc-root]');
  if (boundaryRoot !== null) {
    return { status: 'boundary-root', root: boundaryRoot };
  }

  const mainRoot = host.closest(createMainSelector());
  if (mainRoot !== null) {
    return { status: 'main-root', root: mainRoot };
  }

  return { status: 'document-fallback', root: host.ownerDocument };
};

export const findTocSourceScript = (
  root: ParentNode | TocSourceLookupRootResult | null,
  sourceId: string,
): HTMLScriptElement | null => {
  const normalizedSourceId = sourceId.trim();
  if (root === null || normalizedSourceId.length === 0) {
    return null;
  }
  const lookupRoot = 'status' in root ? root.root : root;
  const fallbackDocument = 'status' in root ? root.root.ownerDocument : null;

  const source =
    lookupRoot instanceof Document
      ? lookupRoot.getElementById(normalizedSourceId)
      : (lookupRoot.querySelector(`#${escapeSelectorIdent(normalizedSourceId)}`) ??
        (fallbackDocument !== null ? fallbackDocument.getElementById(normalizedSourceId) : null));

  return source instanceof HTMLScriptElement ? source : null;
};
