const HEADER_SELECTOR = 'header[data-layout-header]';
const MENU_SELECTOR = 'details[data-header-menu]';
const TRIGGER_SELECTOR = 'summary[data-header-menu-trigger]';
const PANEL_SELECTOR = '[data-header-menu-panel]';
const ITEM_SELECTOR = '[data-header-menu-item]';
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

  constructor() {
    this.syncMenus(document);
    this.bindListeners();
  }

  dispose(): void {
    this.closeAll();
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
    this.syncMenu(menu);
    if (options.restoreFocus === true) {
      resolveTrigger(menu)?.focus();
    }
  }

  private closeAll(except?: HTMLDetailsElement): void {
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
}

export const createStaticHeaderMenuController = (): StaticHeaderMenuController =>
  new StaticHeaderMenuController();
