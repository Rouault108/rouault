const HEADER_SELECTOR = 'header[data-layout-header]';
const MENU_SELECTOR = 'details[data-header-menu]';
const TRIGGER_SELECTOR = 'summary[data-header-menu-trigger]';
const PANEL_SELECTOR = '[data-header-menu-panel]';
const ITEM_SELECTOR = '[data-header-menu-item]';
const TYPEAHEAD_RESET_MS = 1000;
const APP_SHELL_EVENTS = [
  'app-shell:committed',
  'app-shell:rollback-start',
  'app-shell:restored',
] as const;

type CloseReason =
  | 'dispose'
  | 'escape'
  | 'invariant'
  | 'item-activation'
  | 'outside-pointer'
  | 'scroll'
  | 'shell'
  | 'tab'
  | 'toggle';

interface CloseOptions {
  readonly reason?: CloseReason;
  readonly restoreFocus?: boolean;
}

const isHTMLElement = (value: EventTarget | null): value is HTMLElement =>
  value instanceof HTMLElement;

const resolveMenuFromTriggerEvent = (event: Event): HTMLDetailsElement | null => {
  const target = event.target;
  if (!isHTMLElement(target)) {
    return null;
  }
  const trigger = target.closest<HTMLElement>(TRIGGER_SELECTOR);
  const menu = trigger?.closest<HTMLDetailsElement>(MENU_SELECTOR) ?? null;
  const header = menu?.closest(HEADER_SELECTOR) ?? null;
  if (header === null) {
    return null;
  }
  return menu;
};

const resolveTrigger = (menu: HTMLDetailsElement): HTMLElement | null =>
  menu.querySelector<HTMLElement>(TRIGGER_SELECTOR);

const resolvePanel = (menu: HTMLDetailsElement): HTMLElement | null =>
  menu.querySelector<HTMLElement>(PANEL_SELECTOR);

const readSeed = (element: HTMLElement, attributeName: string): string | null => {
  const value = element.getAttribute(attributeName)?.trim();
  return value === undefined || value === '' ? null : value;
};

export class StaticHeaderMenuController {
  private readonly listenerController = new AbortController();
  private readonly suppressedTriggerClicks = new WeakSet<HTMLElement>();
  private readonly suppressionTimers = new Set<number>();
  private ignoreScrollUntil = 0;
  private typeaheadBuffer = '';
  private typeaheadTimer: number | null = null;

  constructor() {
    this.syncMenus(document);
    this.bindListeners();
  }

  dispose(): void {
    this.closeAll(undefined, 'dispose');
    this.resetTypeahead();
    for (const timer of this.suppressionTimers) {
      window.clearTimeout(timer);
    }
    this.suppressionTimers.clear();
    this.listenerController.abort();
  }

  private bindListeners(): void {
    const { signal } = this.listenerController;
    document.addEventListener('click', (event) => { this.handleClick(event); }, { signal });
    document.addEventListener('keydown', (event) => { this.handleKeydown(event); }, { signal });
    document.addEventListener('pointerdown', (event) => { this.handlePointerdown(event); }, {
      signal,
    });
    document.addEventListener('scroll', (event) => { this.handleScroll(event); }, {
      capture: true,
      signal,
    });
    window.addEventListener('scroll', (event) => { this.handleScroll(event); }, {
      capture: true,
      signal,
    });
    for (const eventName of APP_SHELL_EVENTS) {
      document.addEventListener(eventName, () => { this.closeAll(undefined, 'shell'); }, { signal });
    }
    document.addEventListener('toggle', (event) => { this.handleToggle(event); }, {
      capture: true,
      signal,
    });
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
      this.toggle(menu, 'toggle');
      return;
    }

    if (isHTMLElement(event.target)) {
      const item = event.target.closest<HTMLElement>(ITEM_SELECTOR);
      if (item?.closest(MENU_SELECTOR) !== null) {
        this.closeAll(undefined, 'item-activation');
      }
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    const menu = resolveMenuFromTriggerEvent(event);
    if (menu !== null) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const trigger = resolveTrigger(menu);
        if (trigger !== null) {
          this.suppressNextTriggerClick(trigger);
        }
        this.toggle(menu, 'toggle');
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.resetTypeahead();
        this.open(menu);
        const items = this.resolveMenuItems(menu);
        if (event.key === 'ArrowDown') {
          this.focusFirstItem(items);
        } else {
          this.focusLastItem(items);
        }
        return;
      }
    }

    if (this.handleMenuFocusKeydown(event)) {
      return;
    }

    if (event.key === 'Tab') {
      const openMenu = this.resolveOpenMenuForEvent(event);
      if (openMenu !== null) {
        this.close(openMenu, { reason: 'tab' });
      }
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
    this.close(openMenu, { reason: 'escape', restoreFocus: true });
  }

  private handlePointerdown(event: PointerEvent): void {
    if (!isHTMLElement(event.target)) {
      return;
    }
    if (event.target.closest(MENU_SELECTOR) !== null) {
      return;
    }
    this.closeAll(undefined, 'outside-pointer');
  }

  private handleScroll(event: Event): void {
    if (window.performance.now() < this.ignoreScrollUntil) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest(PANEL_SELECTOR) !== null) {
      return;
    }
    if (
      document.activeElement instanceof Element &&
      document.activeElement.closest(PANEL_SELECTOR) !== null
    ) {
      return;
    }
    this.closeAll(undefined, 'scroll');
  }

  private handleToggle(event: Event): void {
    const menu = event.target instanceof HTMLDetailsElement ? event.target : null;
    if (menu?.matches(`${HEADER_SELECTOR} ${MENU_SELECTOR}`) !== true) {
      return;
    }

    if (menu.open) {
      this.closeAll(menu, 'invariant');
    }
    this.syncMenu(menu);
  }

  private toggle(menu: HTMLDetailsElement, reason: CloseReason): void {
    if (menu.open) {
      this.close(menu, { reason });
      return;
    }
    this.open(menu);
  }

  private open(menu: HTMLDetailsElement): void {
    this.closeAll(menu, 'invariant');
    menu.open = true;
    this.syncMenu(menu);
  }

  private close(menu: HTMLDetailsElement, options: CloseOptions = {}): void {
    menu.open = false;
    this.resetTypeahead();
    this.syncMenu(menu);
    if (options.restoreFocus === true) {
      resolveTrigger(menu)?.focus({ preventScroll: true });
    }
  }

  private closeAll(except?: HTMLDetailsElement, reason: CloseReason = 'toggle'): void {
    this.resetTypeahead();
    for (const menu of document.querySelectorAll<HTMLDetailsElement>(
      `${HEADER_SELECTOR} ${MENU_SELECTOR}`,
    )) {
      if (menu !== except && menu.open) {
        this.close(menu, { reason });
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
    const trigger = resolveTrigger(menu);
    const panel = resolvePanel(menu);
    if (trigger === null) {
      return;
    }

    const trimmedTriggerId = trigger.id.trim();
    const triggerId =
      trimmedTriggerId === '' ? readSeed(trigger, 'data-header-menu-trigger-id') : trimmedTriggerId;
    if (trigger.id.trim() === '' && triggerId !== null) {
      trigger.id = triggerId;
    }

    const trimmedPanelId = panel?.id.trim() ?? null;
    const panelSeedId = panel === null ? null : readSeed(panel, 'data-header-menu-panel-id');
    const panelId =
      trimmedPanelId !== null && trimmedPanelId !== ''
        ? trimmedPanelId
        : (panelSeedId ?? readSeed(trigger, 'aria-controls'));
    if (panel !== null && panel.id.trim() === '' && panelId !== null) {
      panel.id = panelId;
    }

    trigger.setAttribute('aria-expanded', menu.open ? 'true' : 'false');
    if (panelId !== null) {
      trigger.setAttribute('aria-controls', panelId);
    }
    if (panel !== null && triggerId !== null) {
      panel.setAttribute('aria-labelledby', triggerId);
    }
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
        this.focusFirstItem(items);
        return true;
      case 'End':
        event.preventDefault();
        this.resetTypeahead();
        this.focusLastItem(items);
        return true;
      default:
        return this.handleTypeaheadKeydown(event, items);
    }
  }

  private resolveMenuItems(menu: HTMLDetailsElement): HTMLElement[] {
    return Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
      (item) =>
        !item.hasAttribute('disabled') &&
        item.getAttribute('aria-disabled') !== 'true' &&
        item.tabIndex >= 0,
    );
  }

  private focusFirstItem(items: readonly HTMLElement[]): void {
    this.focusItem(items[0]);
  }

  private focusLastItem(items: readonly HTMLElement[]): void {
    this.focusItem(items.at(-1));
  }

  private focusItem(item: HTMLElement | undefined): void {
    if (item === undefined) {
      return;
    }
    this.ignoreScrollUntil = window.performance.now() + TYPEAHEAD_RESET_MS;
    item.focus({ preventScroll: true });
  }

  private focusRelativeItem(items: readonly HTMLElement[], offset: 1 | -1): void {
    const activeElement = document.activeElement;
    const currentIndex = activeElement instanceof HTMLElement ? items.indexOf(activeElement) : -1;
    const fallbackIndex = offset > 0 ? -1 : 0;
    const nextIndex = (currentIndex >= 0 ? currentIndex : fallbackIndex) + offset;
    const wrappedIndex = (nextIndex + items.length) % items.length;
    this.focusItem(items[wrappedIndex]);
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
    this.focusItem(match);
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
