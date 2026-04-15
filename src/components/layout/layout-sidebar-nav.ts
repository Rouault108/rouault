const NAV_SELECTOR = 'nav[data-sidebar-nav]';
const ITEM_SELECTOR = 'li[data-node-id]';
const TYPEAHEAD_RESET_MS = 1000;

interface LayoutSidebarNavItem {
  id: string;
  kind: 'branch' | 'leaf';
  label: string;
  row: HTMLLIElement;
  control: HTMLButtonElement | HTMLAnchorElement;
  parentId: string | null;
}

export interface LayoutSidebarNavSyncOptions {
  selectedId: string | null;
  expandedIds: ReadonlySet<string>;
  activeId: string | null;
}

export interface LayoutSidebarNavInteractionCallbacks {
  onToggle(id: string, expanded: boolean): void;
  onSelect(id: string): void;
  onActiveChange(id: string | null): void;
}

const getItemId = (item: Element): string =>
  item.getAttribute('data-node-id')?.trim() ?? '';

const getItemKind = (item: Element): 'branch' | 'leaf' =>
  item.getAttribute('data-node-kind') === 'branch' ? 'branch' : 'leaf';

const getBranchGroup = (item: Element): HTMLUListElement | null =>
  item.querySelector(':scope > ul');

const getItemControl = (item: Element): HTMLButtonElement | HTMLAnchorElement | null => {
  const control = item.querySelector(':scope > [data-sidebar-nav-control]');
  if (control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement) {
    return control;
  }

  return null;
};

const getParentItem = (item: Element): HTMLLIElement | null => {
  const parentList = item.parentElement;
  if (!(parentList instanceof HTMLUListElement)) {
    return null;
  }

  const parentItem = parentList.closest<HTMLLIElement>(ITEM_SELECTOR);
  return parentItem instanceof HTMLLIElement ? parentItem : null;
};

const getItemLabel = (item: Element): string => {
  const explicitLabel = item.querySelector(':scope > [data-sidebar-nav-control] > [data-sidebar-nav-label]');

  if (explicitLabel instanceof HTMLElement) {
    return explicitLabel.textContent.trim();
  }

  return getItemControl(item)?.textContent.trim() ?? item.textContent.trim();
};

const isBranchVisible = (item: Element): boolean => {
  let current: Element | null = item;

  while (current) {
    if (current instanceof HTMLUListElement && current.hidden) {
      return false;
    }

    if (current.matches(NAV_SELECTOR)) {
      return true;
    }

    current = current.parentElement;
  }

  return true;
};

const toVisibleItems = (nav: HTMLElement): LayoutSidebarNavItem[] =>
  Array.from(nav.querySelectorAll<HTMLLIElement>(ITEM_SELECTOR))
    .filter((row) => isBranchVisible(row))
    .map((row) => {
      const control = getItemControl(row);
      if (!(control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement)) {
        return null;
      }

      const parentItem = getParentItem(row);

      return {
        id: getItemId(row),
        kind: getItemKind(row),
        label: getItemLabel(row),
        row,
        control,
        parentId: parentItem ? getItemId(parentItem) : null,
      } satisfies LayoutSidebarNavItem;
    })
    .filter((item): item is LayoutSidebarNavItem => item !== null && item.id.length > 0);

const findVisibleItem = (nav: HTMLElement, id: string | null): LayoutSidebarNavItem | null => {
  if (typeof id !== 'string' || id.trim().length === 0) {
    return null;
  }

  return toVisibleItems(nav).find((item) => item.id === id) ?? null;
};

const resolveNextActiveId = (
  nav: HTMLElement,
  selectedId: string | null,
  requestedActiveId: string | null,
): string | null => {
  const visibleItems = toVisibleItems(nav);
  if (visibleItems.length === 0) {
    return null;
  }

  const normalizedRequested = requestedActiveId?.trim() ?? null;
  if (normalizedRequested) {
    const activeItem = visibleItems.find((item) => item.id === normalizedRequested);
    if (activeItem) {
      return activeItem.id;
    }
  }

  const normalizedSelected = selectedId?.trim() ?? null;
  if (normalizedSelected) {
    const selectedItem = visibleItems.find((item) => item.id === normalizedSelected);
    if (selectedItem) {
      return selectedItem.id;
    }
  }

  return visibleItems[0]?.id ?? null;
};

const setActiveControl = (nav: HTMLElement, activeId: string | null): void => {
  for (const row of nav.querySelectorAll<HTMLLIElement>(ITEM_SELECTOR)) {
    const control = getItemControl(row);
    if (!(control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement)) {
      continue;
    }

    control.tabIndex = getItemId(row) === activeId ? 0 : -1;
  }
};

export const findLayoutSidebarNav = (root: ParentNode): HTMLElement | null => {
  const nav = root.querySelector(NAV_SELECTOR);
  return nav instanceof HTMLElement ? nav : null;
};

export const syncLayoutSidebarNav = (
  nav: HTMLElement,
  options: LayoutSidebarNavSyncOptions,
): string | null => {
  const normalizedExpanded = options.expandedIds;

  for (const row of nav.querySelectorAll<HTMLLIElement>(ITEM_SELECTOR)) {
    const id = getItemId(row);
    const kind = getItemKind(row);
    const control = getItemControl(row);

    if (kind === 'leaf') {
      if (control instanceof HTMLAnchorElement) {
        if (id === options.selectedId) {
          control.setAttribute('aria-current', 'page');
        } else {
          control.removeAttribute('aria-current');
        }
      }
      continue;
    }

    const expanded = normalizedExpanded.has(id);
    if (control instanceof HTMLButtonElement) {
      control.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    const group = getBranchGroup(row);
    if (group instanceof HTMLUListElement) {
      group.hidden = !expanded;
    }
  }

  const nextActiveId = resolveNextActiveId(nav, options.selectedId, options.activeId);
  setActiveControl(nav, nextActiveId);
  return nextActiveId;
};

export class LayoutSidebarNavInteractionController {
  private nav: HTMLElement | null = null;
  private typeaheadBuffer = '';
  private typeaheadResetTimer: number | null = null;

  constructor(
    private readonly callbacks: LayoutSidebarNavInteractionCallbacks,
  ) {}

  connect(nav: HTMLElement | null): void {
    if (this.nav === nav) {
      return;
    }

    this.disconnect();
    this.nav = nav;

    if (!(nav instanceof HTMLElement)) {
      return;
    }

    nav.addEventListener('click', this.handleClick);
    nav.addEventListener('keydown', this.handleKeydown);
    nav.addEventListener('focusin', this.handleFocusIn);
  }

  disconnect(): void {
    if (this.nav instanceof HTMLElement) {
      this.nav.removeEventListener('click', this.handleClick);
      this.nav.removeEventListener('keydown', this.handleKeydown);
      this.nav.removeEventListener('focusin', this.handleFocusIn);
    }

    this.nav = null;

    if (this.typeaheadResetTimer !== null) {
      window.clearTimeout(this.typeaheadResetTimer);
      this.typeaheadResetTimer = null;
    }
    this.typeaheadBuffer = '';
  }

  private readonly handleClick = (event: Event): void => {
    const nav = this.nav;
    if (!(nav instanceof HTMLElement)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const row = target.closest<HTMLLIElement>(ITEM_SELECTOR);
    if (!(row instanceof HTMLLIElement)) {
      return;
    }

    const id = getItemId(row);
    if (id.length === 0) {
      return;
    }

    const control = getItemControl(row);
    if (
      control instanceof HTMLButtonElement &&
      target.closest('[data-sidebar-nav-control]') === control
    ) {
      const expanded = control.getAttribute('aria-expanded') !== 'true';
      this.callbacks.onToggle(id, expanded);
      return;
    }

    if (
      control instanceof HTMLAnchorElement &&
      target.closest('[data-sidebar-nav-control]') === control
    ) {
      this.callbacks.onSelect(id);
    }
  };

  private readonly handleFocusIn = (event: FocusEvent): void => {
    const nav = this.nav;
    if (!(nav instanceof HTMLElement)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const row = target.closest<HTMLLIElement>(ITEM_SELECTOR);
    if (!(row instanceof HTMLLIElement)) {
      return;
    }

    const id = getItemId(row);
    if (id.length > 0) {
      this.callbacks.onActiveChange(id);
    }
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const nav = this.nav;
    if (!(nav instanceof HTMLElement)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const row = target.closest<HTMLLIElement>(ITEM_SELECTOR);
    if (!(row instanceof HTMLLIElement)) {
      return;
    }

    const id = getItemId(row);
    const visibleItems = toVisibleItems(nav);
    const currentIndex = visibleItems.findIndex((item) => item.id === id);
    if (currentIndex < 0) {
      return;
    }

    const currentItem = visibleItems[currentIndex];

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        visibleItems[Math.min(currentIndex + 1, visibleItems.length - 1)]?.control.focus();
        return;
      case 'ArrowUp':
        event.preventDefault();
        visibleItems[Math.max(currentIndex - 1, 0)]?.control.focus();
        return;
      case 'ArrowRight':
        if (currentItem?.kind === 'branch' && currentItem.control instanceof HTMLButtonElement) {
          event.preventDefault();
          if (currentItem.control.getAttribute('aria-expanded') !== 'true') {
            this.callbacks.onToggle(currentItem.id, true);
          } else {
            const group = getBranchGroup(currentItem.row);
            const firstChild = group ? toVisibleItems(nav).find((item) => item.parentId === currentItem.id) : null;
            firstChild?.control.focus();
          }
        }
        return;
      case 'ArrowLeft':
        if (currentItem?.kind === 'branch' && currentItem.control instanceof HTMLButtonElement) {
          if (currentItem.control.getAttribute('aria-expanded') === 'true') {
            event.preventDefault();
            this.callbacks.onToggle(currentItem.id, false);
            return;
          }
        }
        if (currentItem?.parentId) {
          event.preventDefault();
          findVisibleItem(nav, currentItem.parentId)?.control.focus();
        }
        return;
      case 'Home':
        event.preventDefault();
        visibleItems[0]?.control.focus();
        return;
      case 'End':
        event.preventDefault();
        visibleItems.at(-1)?.control.focus();
        return;
      case 'Enter':
      case ' ':
        if (currentItem?.control instanceof HTMLButtonElement) {
          event.preventDefault();
          this.callbacks.onToggle(
            currentItem.id,
            currentItem.control.getAttribute('aria-expanded') !== 'true',
          );
        }
        return;
      default:
        break;
    }

    if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    this.typeaheadBuffer = `${this.typeaheadBuffer}${event.key.toLowerCase()}`;
    if (this.typeaheadResetTimer !== null) {
      window.clearTimeout(this.typeaheadResetTimer);
    }
    this.typeaheadResetTimer = window.setTimeout(() => {
      this.typeaheadBuffer = '';
      this.typeaheadResetTimer = null;
    }, TYPEAHEAD_RESET_MS);

    const match = visibleItems.find((item) =>
      item.label.trim().toLowerCase().startsWith(this.typeaheadBuffer),
    );
    if (match) {
      event.preventDefault();
      match.control.focus();
    }
  };
}
