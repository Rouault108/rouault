export const resolveTocSourceLookupRoot = (host: Element | null): ParentNode | null => {
  if (host?.ownerDocument instanceof Document) {
    return host.ownerDocument;
  }

  if (typeof document !== 'undefined') {
    return document;
  }

  return null;
};

export const findTocSourceScript = (
  root: ParentNode | null,
  sourceId: string,
): HTMLScriptElement | null => {
  const normalizedSourceId = sourceId.trim();
  if (root === null || normalizedSourceId.length === 0) {
    return null;
  }

  const source =
    root instanceof Document
      ? root.getElementById(normalizedSourceId)
      : root.querySelector(`#${CSS.escape(normalizedSourceId)}`);

  return source instanceof HTMLScriptElement ? source : null;
};
