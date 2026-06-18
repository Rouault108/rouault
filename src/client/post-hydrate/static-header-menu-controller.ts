const HEADER_SELECTOR = 'header[data-layout-header]';
const MENU_SELECTOR = 'details[data-header-menu]';
const TRIGGER_SELECTOR = 'summary[data-header-menu-trigger]';
const PANEL_SELECTOR = '[data-header-menu-panel]';
const ITEM_SELECTOR = '[data-header-menu-item]';
const TYPEAHEAD_RESET_MS = 700;
const APP_SHELL_EVENTS = [
  'app-shell:committed',
  'app-shell:rollback-start',
  'app-shell:restored',
] as const;

type CloseOptions = {
  readonly restoreFocus?: boolean;
};

const isHTMLElement = (value: EventTarget | null): value is HTMLElement =>
  value instanceof HTMLElement;

const resolveMenuFromTriggerEvent = (event: Event): HTMLDetailsElement | null => {
  const target = event.target;
  if (!isHTMLElement(target)) {
    return null;
  }
  const trigger = target.closest<HTMLElement>(TRIGGER_SELECTOR);
  const menu = trigger?.closest<HTMLDetailsElement>(MENU_SELECTOR) ?? null;
  if (menu === null || menu.closest(HEADER_SELECTOR) === null) {
    return null;
  }
  return menu;
};

const resolveTrigger = (menu: HTMLDetailsElement): HTMLElement | null =>
  menu.querySelector<HTMLElement>(TRIGGER_SELECTOR);

export class StaticHeaderMenuController {
  private readonly listenerController = new AbortController();
  private readonly suppressedTriggerClicks = new WeakSet<HTMLElement>();
  private readonly suppressionTimers = new Set<number>();
  private typeaheadBuffer = '';
  private typeaheadTimer: number | null = null;

  constructor() {
    this.syncMenus(document);
    this.bindListeners();
  }

  dispose(): void {
    this.closeAll();
    this.resetTypeahead();
    for (const timer of this.suppressionTimers) {
      window.clearTimeout(timer);
    }
    this.suppressionTimers.clear();
    this.listenerController.abort();
  }

  private bindListeners(): void {
    const { signal } = this.listenerController;
    document.addEventListener('click', (event) => this.handleClick(event), { signal });
    document.addEventListener('keydown', (event) => this.handleKeydown(event), { signal });
    document.addEventListener('pointerdown', (event) => this.handlePointerdown(event), {
      signal,
    });
    document.addEventListener('scroll', (event) => this.handleScroll(event), {
      capture: true,
      signal,
    });
    window.addEventListener('scroll', (event) => this.handleScroll(event), {
      capture: true,
      signal,
    });
    for (const eventName of APP_SHELL_EVENTS) {
      document.addEventListener(eventName, () => this.closeAll(), { signal });
    }
  }

  private handleClick(event: MouseEvent): void {
    const menu = resolveMenuFromTriggerEvent(event);
    if (menu !== null) {
      event.preventDefault();
      const trigger = resolveTrigger(menu);
      if (trigger !== null && this.suppressedTriggerClicks.has(trigger)) {
        this.suppressedTriggerClicks.delete(trigger);
        return;
      }
      this.toggle(menu);
      return;
    }

    if (isHTMLElement(event.target)) {
      const item = event.target.closest<HTMLElement>(ITEM_SELECTOR);
      if (item?.closest(MENU_SELECTOR) !== null) {
        this.closeAll();
      }
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    const menu = resolveMenuFromTriggerEvent(event);
    if (menu !== null && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const trigger = resolveTrigger(menu);
      if (trigger !== null) {
        this.suppressNextTriggerClick(trigger);
      }
      this.toggle(menu);
      return;
    }

    if (this.handleMenuFocusKeydown(event)) {
      return;
    }

    if (event.key !== 'Escape') {
      return;
    }

    const openMenu = this.resolveOpenMenuForEvent(event);
    if (openMenu === null) {
      return;
    }
    event.preventDefault();
    this.close(openMenu, { restoreFocus: true });
  }

  private handlePointerdown(event: PointerEvent): void {
    if (!isHTMLElement(event.target)) {
      return;
    }
    if (event.target.closest(MENU_SELECTOR) !== null) {
      return;
    }
    this.closeAll();
  }

  private handleScroll(event: Event): void {
    const target = event.target;
    if (target instanceof Element && target.closest(PANEL_SELECTOR) !== null) {
      return;
    }
    this.closeAll();
  }

  private toggle(menu: HTMLDetailsElement): void {
    if (menu.open) {
      this.close(menu);
      return;
    }
    this.open(menu);
  }

  private open(menu: HTMLDetailsElement): void {
    this.closeAll(menu);
    menu.open = true;
    this.syncMenu(menu);
  }

  private close(menu: HTMLDetailsElement, options: CloseOptions = {}): void {
    menu.open = false;
    this.resetTypeahead();
    this.syncMenu(menu);
    if (options.restoreFocus === true) {
      resolveTrigger(menu)?.focus();
    }
  }

  private closeAll(except?: HTMLDetailsElement): void {
    this.resetTypeahead();
    for (const menu of document.querySelectorAll<HTMLDetailsElement>(
      `${HEADER_SELECTOR} ${MENU_SELECTOR}`,
    )) {
      if (menu !== except && menu.open) {
        this.close(menu);
      } else {
        this.syncMenu(menu);
      }
    }
  }

  private syncMenus(root: ParentNode): void {
    for (const menu of root.querySelectorAll<HTMLDetailsElement>(
      `${HEADER_SELECTOR} ${MENU_SELECTOR}`,
    )) {
      this.syncMenu(menu);
    }
  }

  private syncMenu(menu: HTMLDetailsElement): void {
    resolveTrigger(menu)?.setAttribute('aria-expanded', menu.open ? 'true' : 'false');
  }

  private resolveOpenMenuForEvent(event: Event): HTMLDetailsElement | null {
    if (isHTMLElement(event.target)) {
      const currentMenu = event.target.closest<HTMLDetailsElement>(MENU_SELECTOR);
      if (currentMenu?.open === true) {
        return currentMenu;
      }
    }
    return document.querySelector<HTMLDetailsElement>(`${HEADER_SELECTOR} ${MENU_SELECTOR}[open]`);
  }

  private suppressNextTriggerClick(trigger: HTMLElement): void {
    this.suppressedTriggerClicks.add(trigger);
    const timer = window.setTimeout(() => {
      this.suppressedTriggerClicks.delete(trigger);
      this.suppressionTimers.delete(timer);
    }, 0);
    this.suppressionTimers.add(timer);
  }

  private handleMenuFocusKeydown(event: KeyboardEvent): boolean {
    const openMenu = this.resolveOpenMenuForEvent(event);
    if (openMenu === null) {
      return false;
    }

    const items = this.resolveMenuItems(openMenu);
    if (items.length === 0) {
      return false;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.resetTypeahead();
        this.focusRelativeItem(items, 1);
        return true;
      case 'ArrowUp':
        event.preventDefault();
        this.resetTypeahead();
        this.focusRelativeItem(items, -1);
        return true;
      case 'Home':
        event.preventDefault();
        this.resetTypeahead();
        items[0]?.focus();
        return true;
      case 'End':
        event.preventDefault();
        this.resetTypeahead();
        items.at(-1)?.focus();
        return true;
      default:
        return this.handleTypeaheadKeydown(event, items);
    }
  }

  private resolveMenuItems(menu: HTMLDetailsElement): HTMLElement[] {
    return Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
      (item) => !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true',
    );
  }

  private focusRelativeItem(items: readonly HTMLElement[], offset: 1 | -1): void {
    const activeElement = document.activeElement;
    const currentIndex = activeElement instanceof HTMLElement ? items.indexOf(activeElement) : -1;
    const fallbackIndex = offset > 0 ? -1 : 0;
    const nextIndex = (currentIndex >= 0 ? currentIndex : fallbackIndex) + offset;
    const wrappedIndex = (nextIndex + items.length) % items.length;
    items[wrappedIndex]?.focus();
  }

  private handleTypeaheadKeydown(event: KeyboardEvent, items: readonly HTMLElement[]): boolean {
    if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) {
      return false;
    }

    const normalizedKey = event.key.toLocaleLowerCase();
    const bufferedQuery = `${this.typeaheadBuffer}${normalizedKey}`;
    let nextBuffer = bufferedQuery;
    let match = this.resolveTypeaheadMatch(items, bufferedQuery);

    if (match === null && this.typeaheadBuffer !== '') {
      nextBuffer = normalizedKey;
      match = this.resolveTypeaheadMatch(items, normalizedKey);
    }

    if (match === null) {
      this.resetTypeahead();
      return false;
    }

    event.preventDefault();
    this.typeaheadBuffer = nextBuffer;
    this.scheduleTypeaheadReset();
    match.focus();
    return true;
  }

  private resolveTypeaheadMatch(items: readonly HTMLElement[], buffer: string): HTMLElement | null {
    const activeElement = document.activeElement;
    const activeIndex = activeElement instanceof HTMLElement ? items.indexOf(activeElement) : -1;
    const startIndex = activeIndex >= 0 ? activeIndex + 1 : 0;

    for (let offset = 0; offset < items.length; offset += 1) {
      const item = items[(startIndex + offset) % items.length];
      const label = item?.getAttribute('data-header-menu-text')?.trim().toLocaleLowerCase() ?? '';
      if (label.startsWith(buffer)) {
        return item ?? null;
      }
    }

    return null;
  }

  private scheduleTypeaheadReset(): void {
    if (this.typeaheadTimer !== null) {
      window.clearTimeout(this.typeaheadTimer);
    }
    this.typeaheadTimer = window.setTimeout(() => {
      this.typeaheadBuffer = '';
      this.typeaheadTimer = null;
    }, TYPEAHEAD_RESET_MS);
  }

  private resetTypeahead(): void {
    this.typeaheadBuffer = '';
    if (this.typeaheadTimer !== null) {
      window.clearTimeout(this.typeaheadTimer);
      this.typeaheadTimer = null;
    }
  }
}

export const createStaticHeaderMenuController = (): StaticHeaderMenuController =>
  new StaticHeaderMenuController();
