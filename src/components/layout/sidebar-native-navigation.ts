const CONTROL = '[data-sidebar-nav-control]';
const ROW = 'li[data-node-id]';
export interface LayoutSidebarNavInteractionCallbacks {
  onToggle(id: string, expanded: boolean, trusted?: boolean): void;
  onSelect(id: string): void;
  onActiveChange(id: string | null): void;
}
export const visibleLayoutSidebarControls = (nav: HTMLElement): HTMLElement[] =>
  [...nav.querySelectorAll<HTMLElement>(CONTROL)].filter((element) => {
    let parent = element.parentElement;
    while (parent && parent !== nav) {
      if (
        parent instanceof HTMLDetailsElement &&
        !parent.open &&
        element !== parent.querySelector(':scope > summary')
      )
        return false;
      parent = parent.parentElement;
    }
    return true;
  });
const idOf = (control: Element): string | null =>
  control.closest(ROW)?.getAttribute('data-node-id') ?? null;
export const deactivateLayoutSidebarNav = (nav: HTMLElement): void => {
  for (const control of nav.querySelectorAll(CONTROL)) control.removeAttribute('tabindex');
};
export const roveLayoutSidebarNav = (nav: HTMLElement, target?: HTMLElement): string | null => {
  const visible = visibleLayoutSidebarControls(nav);
  const active =
    target && visible.includes(target)
      ? target
      : (visible.find((item) => item.getAttribute('aria-current') === 'page') ??
        [...visible]
          .reverse()
          .find((item) => item.closest(ROW)?.getAttribute('data-current-branch') === 'true') ??
        visible[0]);
  for (const control of nav.querySelectorAll<HTMLElement>(CONTROL))
    control.tabIndex = control === active ? 0 : -1;
  return active ? idOf(active) : null;
};
export class LayoutSidebarNavInteractionController {
  private nav: HTMLElement | null = null;
  private abort: AbortController | null = null;
  private buffer = '';
  private lastKey = 0;
  constructor(private readonly callbacks: LayoutSidebarNavInteractionCallbacks) {}
  connect(nav: HTMLElement | null): void {
    if (nav === this.nav) return;
    this.disconnect();
    if (!nav) return;
    this.nav = nav;
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    nav.addEventListener(
      'focusin',
      (event) => {
        if (event.target instanceof HTMLElement && event.target.matches(CONTROL)) {
          this.callbacks.onActiveChange(roveLayoutSidebarNav(nav, event.target));
        }
      },
      options,
    );
    nav.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const link = target.closest('a[data-sidebar-nav-control]');
        if (link && event.isTrusted) this.callbacks.onSelect(idOf(link) ?? '');
      },
      options,
    );
    nav.addEventListener(
      'keydown',
      (event) => {
        this.keydown(event);
      },
      options,
    );
  }
  disconnect(): void {
    this.abort?.abort();
    if (this.nav) deactivateLayoutSidebarNav(this.nav);
    this.nav = null;
    this.abort = null;
    this.buffer = '';
  }
  private keydown(event: KeyboardEvent): void {
    const nav = this.nav;
    const target = event.target;
    if (!nav || !(target instanceof HTMLElement) || !target.matches(CONTROL)) return;
    const visible = visibleLayoutSidebarControls(nav);
    const index = visible.indexOf(target);
    const branch = target.parentElement instanceof HTMLDetailsElement ? target.parentElement : null;
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowDown') next = visible[Math.min(index + 1, visible.length - 1)];
    else if (event.key === 'ArrowUp') next = visible[Math.max(index - 1, 0)];
    else if (event.key === 'Home') next = visible[0];
    else if (event.key === 'End') next = visible.at(-1);
    else if (event.key === 'ArrowRight' && branch) {
      if (!branch.open) this.callbacks.onToggle(idOf(target) ?? '', true, event.isTrusted);
      else next = visible[index + 1];
    } else if (event.key === 'ArrowLeft') {
      if (branch?.open) this.callbacks.onToggle(idOf(target) ?? '', false, event.isTrusted);
      else
        next =
          target
            .closest(ROW)
            ?.parentElement?.closest('details')
            ?.querySelector<HTMLElement>(':scope > summary') ?? undefined;
    } else if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      this.buffer = `${Date.now() - this.lastKey < 1000 ? this.buffer : ''}${event.key.toLowerCase()}`;
      this.lastKey = Date.now();
      next = visible.find((item) => item.textContent.trim().toLowerCase().startsWith(this.buffer));
    } else return;
    // Enter/Space/clickのactivationはnative summaryだけが所有する。
    event.preventDefault();
    next?.focus({ preventScroll: true });
  }
}
