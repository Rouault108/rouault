/**
 * Restore focus without allowing the browser to adjust page scroll.
 *
 * This is required for fixed/overlay UI close flows where plain focus()
 * can override an in-progress programmatic page scroll on iOS WebKit.
 */
export const focusWithoutScroll = (element: HTMLElement): void => {
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
};
