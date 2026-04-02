const FOOTNOTE_SELECTOR = 'a[data-footnote-ref]';
const SCOPE_SELECTOR = '[data-footnote-scope], article, [role="article"], [data-note-root], main';

const resolveScope = (anchor: HTMLElement): ParentNode => {
  return anchor.closest<HTMLElement>(SCOPE_SELECTOR) ?? document;
};

const cloneFootnoteBody = (scope: ParentNode, refId: string): HTMLElement | null => {
  const item = scope.querySelector<HTMLElement>(
    `section[role="doc-endnotes"] #${CSS.escape(refId)}`,
  );
  if (!item) {
    return null;
  }

  const body = document.createElement('div');
  body.className = 'footnote-popover-body';

  for (const node of Array.from(item.childNodes)) {
    const cloned = node.cloneNode(true);

    if (cloned instanceof HTMLElement) {
      cloned.querySelectorAll('a[data-footnote-backref]').forEach((backref) => {
        backref.remove();
      });
      if (cloned.matches('a[data-footnote-backref]')) {
        continue;
      }
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

  if ('hidePopover' in activePopover) {
    (activePopover as HTMLElement & { hidePopover(): void }).hidePopover();
  } else {
    (activePopover as HTMLElement & { hidden: boolean }).hidden = true;
  }

  activeTrigger.classList.remove('is-active-trigger');
  activeTrigger.removeAttribute('aria-expanded');

  activePopover = null;
  activeTrigger = null;
};

const positionPopover = (anchor: HTMLElement, popover: HTMLElement): void => {
  const rect = anchor.getBoundingClientRect();
  popover.style.position = 'fixed';
  popover.style.left = `${Math.max(12, rect.left).toString()}px`;
  popover.style.top = `${(rect.bottom + 8).toString()}px`;
};

const ensurePopover = (anchor: HTMLElement): HTMLElement | null => {
  let popover = anchor.parentElement?.querySelector<HTMLElement>('[data-footnote-popover]');
  if (popover) {
    return popover;
  }

  const refId = anchor.getAttribute('data-footnote-id');
  if (!refId) {
    return null;
  }

  const scope = resolveScope(anchor);
  const body = cloneFootnoteBody(scope, refId);
  if (!body) {
    return null;
  }

  popover = document.createElement('div');
  popover.setAttribute('data-footnote-popover', 'true');
  popover.setAttribute('popover', 'manual');
  popover.hidden = true;

  const footer = document.createElement('footer');
  footer.className = 'footnote-popover-footer';

  const link = document.createElement('a');
  link.className = 'footnote-list-link';
  link.href = `#${refId}`;
  link.textContent = '脚注一覧で見る';

  footer.append(link);
  popover.append(body);
  popover.append(footer);

  anchor.insertAdjacentElement('afterend', popover);
  return popover;
};

const enhanceAnchor = (anchor: HTMLElement): void => {
  if (anchor.dataset['footnoteEnhanced'] === 'true') {
    return;
  }

  const popover = ensurePopover(anchor);
  if (
    !popover ||
    typeof (popover as HTMLElement & { showPopover?: () => void }).showPopover !== 'function'
  ) {
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
    positionPopover(anchor, popover);

    (popover as HTMLElement & { showPopover(): void }).showPopover();
    popover.hidden = false;

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
}

export const enhanceFootnotePopovers = (root: ParentNode): void => {
  const anchors = Array.from(root.querySelectorAll<HTMLElement>(FOOTNOTE_SELECTOR));
  for (const anchor of anchors) {
    enhanceAnchor(anchor);
  }
};
