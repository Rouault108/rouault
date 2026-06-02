const isInvalidTarget = (target: string): boolean =>
  target.length === 0 || (target !== '_blank' && target !== '_self');

const hasPreviewSandboxAncestor = (event: Event): boolean =>
  event.composedPath().some(
    (item) =>
      item instanceof Element &&
      item.getAttribute('data-link-contract-sandbox') === 'preview',
  );

const hasInteractiveElementBeforeAnchor = (event: Event, anchor: HTMLAnchorElement): boolean => {
  for (const pathItem of event.composedPath()) {
    if (pathItem === anchor) return false;
    if (!(pathItem instanceof Element)) continue;
    if (
      pathItem instanceof HTMLButtonElement ||
      pathItem instanceof HTMLInputElement ||
      pathItem instanceof HTMLSelectElement ||
      pathItem instanceof HTMLTextAreaElement ||
      (pathItem instanceof HTMLElement && pathItem.isContentEditable) ||
      (pathItem instanceof HTMLElement && pathItem.getAttribute('role') === 'button') ||
      (pathItem instanceof HTMLElement && pathItem.localName === 'summary')
    ) {
      return true;
    }
  }
  return false;
};

export const resolveAnchorFromActivationEvent = (event: Event): HTMLAnchorElement | null => {
  for (const pathItem of event.composedPath()) {
    if (pathItem instanceof HTMLAnchorElement) return pathItem;
  }
  return event.target instanceof Element ? event.target.closest('a') : null;
};

export const isPlainPrimaryAnchorActivation = (
  event: MouseEvent,
  anchor: HTMLAnchorElement,
): boolean => {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return false;
  if (hasInteractiveElementBeforeAnchor(event, anchor) || hasPreviewSandboxAncestor(event)) return false;
  const target = anchor.getAttribute('target');
  if (target !== null && (target === '_blank' || isInvalidTarget(target))) return false;
  if (anchor.hasAttribute('download')) return false;
  return !anchor.relList.contains('external');
};
