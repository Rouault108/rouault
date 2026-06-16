import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';

export interface UnsafeLinkClickGuardHandle {
  readonly dispose: () => void;
}

const findAnchor = (event: Event): HTMLAnchorElement | null => {
  for (const item of event.composedPath()) {
    if (item instanceof HTMLAnchorElement) return item;
  }
  const target = event.target;
  return target instanceof Element ? target.closest('a[href]') : null;
};

const blockUnsafeClick = (event: Event): void => {
  const anchor = findAnchor(event);
  if (!anchor) return;
  const result = detectUnsafeHref(anchor.getAttribute('href'));
  if (!result.ok) event.preventDefault();
};

export const attachUnsafeLinkClickGuard = (
  root: Document | ShadowRoot,
): UnsafeLinkClickGuardHandle => {
  root.addEventListener('click', blockUnsafeClick, { capture: true });
  root.addEventListener('auxclick', blockUnsafeClick, { capture: true });
  return {
    dispose: () => {
      root.removeEventListener('click', blockUnsafeClick, { capture: true });
      root.removeEventListener('auxclick', blockUnsafeClick, { capture: true });
    },
  };
};
