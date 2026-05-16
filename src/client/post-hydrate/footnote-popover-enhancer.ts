import {
  canonicalizeFootnoteId,
  parseFootnoteBackrefHref,
} from '../../../shared/footnotes/footnote-id.js';

const FOOTNOTE_SELECTOR = 'a[data-footnote-ref="true"][role="doc-noteref"]';
const SCOPE_SELECTOR = '[data-footnote-scope], article, [role="article"], [data-note-root], main';
const POPOVER_MARGIN = 12;
const POPOVER_OFFSET = 8;

type PopoverElement = HTMLElement & {
  showPopover?: () => void;
  hidePopover?: () => void;
};

let popoverSequence = 0;

const escapeCssIdentifier = (value: string): string => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/gu, '\\$&');
};

const resolveScope = (anchor: HTMLElement): ParentNode => {
  return anchor.closest<HTMLElement>(SCOPE_SELECTOR) ?? document;
};

const isFalseFootnoteBackrefMarker = (value: string | null): boolean => {
  const normalized = value?.trim().toLowerCase();
  return (
    normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no'
  );
};

const isRemovableFootnoteCloneLink = (anchor: HTMLAnchorElement): boolean => {
  if (
    anchor.closest('[data-footnote-popover], ui-footnote') &&
    anchor.classList.contains('footnote-list-link')
  ) {
    return true;
  }

  const parsed = parseFootnoteBackrefHref(anchor.getAttribute('href') ?? '');
  if (parsed.kind !== 'canonical' && parsed.kind !== 'legacy-user-content-fnref') {
    return false;
  }

  const marker = anchor.getAttribute('data-footnote-backref');
  if (marker !== null && !isFalseFootnoteBackrefMarker(marker)) {
    return true;
  }
  if (anchor.getAttribute('role') === 'doc-backlink') {
    return true;
  }
  if (anchor.classList.contains('data-footnote-backref')) {
    return true;
  }

  return true;
};

const removeFootnoteCloneLinks = (root: HTMLElement): boolean => {
  if (root instanceof HTMLAnchorElement && isRemovableFootnoteCloneLink(root)) {
    return true;
  }

  for (const anchor of Array.from(
    root.querySelectorAll<HTMLAnchorElement>(
      'a[href], a[role], a[data-footnote-backref], a.data-footnote-backref, a.footnote-list-link',
    ),
  )) {
    if (isRemovableFootnoteCloneLink(anchor)) {
      anchor.remove();
    }
  }

  return false;
};

const cloneFootnoteBody = (scope: ParentNode, refId: string): HTMLElement | null => {
  const canonicalRefId = canonicalizeFootnoteId(refId);
  if (canonicalRefId === null) {
    return null;
  }

  const item = scope.querySelector<HTMLElement>(
    `section[role="doc-endnotes"] > h2#footnote-label + ol > li#${escapeCssIdentifier(canonicalRefId)}`,
  );
  if (!(item instanceof HTMLLIElement)) {
    return null;
  }

  const body = document.createElement('div');
  body.className = 'footnote-popover-body';

  for (const node of Array.from(item.childNodes)) {
    const cloned = node.cloneNode(true);

    if (cloned instanceof HTMLElement && removeFootnoteCloneLinks(cloned)) {
      continue;
    }

    body.append(cloned);
  }

  return body.childNodes.length > 0 ? body : null;
};

let activePopover: HTMLElement | null = null;
let activeTrigger: HTMLElement | null = null;

const closeActivePopover = (): void => {
  if (!activePopover || !activeTrigger) {
    activePopover = null;
    activeTrigger = null;
    return;
  }

  if (typeof (activePopover as PopoverElement).hidePopover === 'function') {
    (activePopover as PopoverElement).hidePopover();
  }

  activePopover.hidden = true;
  activeTrigger.classList.remove('is-active-trigger');
  activeTrigger.removeAttribute('aria-expanded');

  activePopover = null;
  activeTrigger = null;
};

const resetPopoverPlacement = (popover: HTMLElement): void => {
  popover.style.position = 'fixed';
  popover.style.inset = 'auto';
  popover.style.right = 'auto';
  popover.style.bottom = 'auto';
  popover.style.margin = '0';
};

const placePopover = (anchor: HTMLElement, popover: HTMLElement): void => {
  resetPopoverPlacement(popover);

  const anchorRect = anchor.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  const maxLeft = Math.max(POPOVER_MARGIN, viewportWidth - POPOVER_MARGIN - popoverRect.width);
  const left = Math.min(Math.max(POPOVER_MARGIN, anchorRect.left), maxLeft);

  const belowTop = anchorRect.bottom + POPOVER_OFFSET;
  const aboveTop = anchorRect.top - POPOVER_OFFSET - popoverRect.height;

  let top = belowTop;
  if (
    belowTop + popoverRect.height > viewportHeight - POPOVER_MARGIN &&
    aboveTop >= POPOVER_MARGIN
  ) {
    top = aboveTop;
  }

  const maxTop = Math.max(POPOVER_MARGIN, viewportHeight - POPOVER_MARGIN - popoverRect.height);
  top = Math.min(Math.max(POPOVER_MARGIN, top), maxTop);

  popover.style.left = `${Math.round(left).toString()}px`;
  popover.style.top = `${Math.round(top).toString()}px`;
};

const updateActivePopoverPlacement = (): void => {
  if (!activePopover || !activeTrigger) {
    return;
  }
  placePopover(activeTrigger, activePopover);
};

const ensurePopover = (anchor: HTMLElement): HTMLElement | null => {
  const controlledId = anchor.getAttribute('aria-controls');
  if (controlledId) {
    const existing = document.getElementById(controlledId);
    if (existing instanceof HTMLElement) {
      return existing;
    }
  }

  const refId = anchor.getAttribute('data-footnote-id');
  const canonicalRefId = refId ? canonicalizeFootnoteId(refId) : null;
  if (canonicalRefId === null) {
    return null;
  }

  const scope = resolveScope(anchor);
  const body = cloneFootnoteBody(scope, canonicalRefId);
  if (!body) {
    return null;
  }

  const popoverId = `footnote-popover-${(++popoverSequence).toString()}`;
  const popover = document.createElement('div');

  popover.id = popoverId;
  popover.setAttribute('data-footnote-popover', 'true');
  popover.setAttribute('popover', 'manual');
  popover.hidden = true;

  const footer = document.createElement('footer');
  footer.className = 'footnote-popover-footer';

  const link = document.createElement('a');
  link.className = 'footnote-list-link';
  link.href = `#${canonicalRefId}`;
  link.setAttribute('data-footnote-fallback-trigger', 'true');
  link.textContent = '脚注一覧で見る';

  footer.append(link);
  popover.append(body);
  popover.append(footer);

  anchor.setAttribute('aria-controls', popoverId);
  document.body.append(popover);

  return popover;
};

const enhanceAnchor = (anchor: HTMLElement): void => {
  if (anchor.dataset['footnoteEnhanced'] === 'true') {
    return;
  }

  const popover = ensurePopover(anchor);
  if (!popover || typeof (popover as PopoverElement).showPopover !== 'function') {
    anchor.dataset['footnoteEnhanced'] = 'true';
    return;
  }

  anchor.addEventListener('click', (event) => {
    event.preventDefault();

    if (activeTrigger === anchor) {
      closeActivePopover();
      return;
    }

    closeActivePopover();

    resetPopoverPlacement(popover);
    popover.hidden = false;
    popover.style.visibility = 'hidden';
    popover.style.pointerEvents = 'none';

    (popover as PopoverElement).showPopover();
    placePopover(anchor, popover);

    popover.style.removeProperty('visibility');
    popover.style.removeProperty('pointer-events');

    anchor.classList.add('is-active-trigger');
    anchor.setAttribute('aria-expanded', 'true');

    activePopover = popover;
    activeTrigger = anchor;
  });

  anchor.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeTrigger === anchor) {
      event.preventDefault();
      closeActivePopover();
      anchor.focus();
    }
  });

  anchor.dataset['footnoteEnhanced'] = 'true';
};

if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (
      activePopover &&
      activeTrigger &&
      !activePopover.contains(target) &&
      !activeTrigger.contains(target)
    ) {
      closeActivePopover();
    }
  });

  document.addEventListener(
    'scroll',
    () => {
      updateActivePopoverPlacement();
    },
    true,
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    updateActivePopoverPlacement();
  });
}

export const enhanceFootnotePopovers = (root: ParentNode): void => {
  const anchors = Array.from(root.querySelectorAll<HTMLElement>(FOOTNOTE_SELECTOR));
  for (const anchor of anchors) {
    enhanceAnchor(anchor);
  }
};
