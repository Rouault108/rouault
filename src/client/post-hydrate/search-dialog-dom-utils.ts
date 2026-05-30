export const closestFromEvent = (
  boundary: Element,
  event: Event,
  selector: string,
): Element | null => {
  for (const target of event.composedPath()) {
    if (!(target instanceof Element)) continue;
    const match = target.closest(selector);
    if (match !== null && boundary.contains(match)) return match;
  }
  return null;
};

export const getSearchDialogOptionId = (itemId: string): string => `search-option-${itemId}`;

export const getSearchDialogOptionElementById = (
  ownerDocument: Document,
  resultsList: HTMLElement,
  optionId: string,
): HTMLElement | null => {
  const element = ownerDocument.getElementById(optionId);
  return element instanceof HTMLElement && resultsList.contains(element) ? element : null;
};

export const focusDialogControl = (element: HTMLElement | null): void => {
  element?.focus({ preventScroll: true });
};
