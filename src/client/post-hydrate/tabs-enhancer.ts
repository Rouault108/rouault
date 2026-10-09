import type { HydrationActivationResult } from '../../../shared/hydration/hydration-activation.js';
import { resolveKeyNavigation, resolveSelectedIndex } from '../../components/ui/tabs/tabs-model.js';
import { TabsUrlSyncController } from '../../components/ui/tabs/tabs-url-sync-controller.js';
import { TabsIndicatorController } from '../../components/ui/tabs/tabs-indicator-controller.js';
import { scrollTabElementIntoView } from '../../components/ui/tabs/tabs-dom.js';
import type {
  TabsOrientation,
  UiTabChangeDetail,
  UrlHistoryMode,
} from '../../components/ui/tabs/tabs.types.js';

const controllers = new WeakMap<HTMLElement, TabsController>();
export type TabsSelectionResult = 'not-enhanced' | 'invalid-value' | 'selected' | 'unchanged';

export const selectTabsValue = (
  root: HTMLElement,
  value: string,
  options: { historyMode: UrlHistoryMode },
): TabsSelectionResult =>
  controllers.get(root)?.select(value, options.historyMode) ?? 'not-enhanced';

export const readTabsSelection = (root: HTMLElement): string | null =>
  controllers.get(root)?.getActiveValue() ?? null;

class TabsController {
  private readonly tabs: HTMLAnchorElement[];
  private readonly panels: HTMLElement[];
  private readonly nav: HTMLElement;
  private readonly orientation: TabsOrientation;
  private readonly automatic: boolean;
  private readonly urlSync: boolean;
  private readonly defaultValue: string | null;
  private selectedValue: string | null;
  private activeIndex = -1;
  private focusedIndex = -1;
  private readonly url = new TabsUrlSyncController(this);
  private readonly indicator = new TabsIndicatorController(this);

  constructor(
    private readonly root: HTMLElement,
    signal: AbortSignal,
  ) {
    const nav = root.querySelector<HTMLElement>(':scope > [data-tabs-static-nav]');
    if (!nav) throw new Error('[tabs] native navigation が必要です');
    this.nav = nav;
    this.tabs = Array.from(nav.querySelectorAll<HTMLAnchorElement>(':scope > a[data-tab]'));
    this.panels = Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-tab-panel]'));
    if (!this.tabs.length || this.tabs.length !== this.panels.length)
      throw new Error('[tabs] native tab / panel が不正です');
    this.orientation = root.dataset['tabsOrientation'] === 'vertical' ? 'vertical' : 'horizontal';
    this.automatic = root.hasAttribute('data-tabs-automatic-activation');
    this.urlSync = root.hasAttribute('data-tabs-url-sync');
    this.defaultValue = root.getAttribute('data-tabs-default-selected-value');
    this.selectedValue = root.getAttribute('data-tabs-initial-selected-value');
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-orientation', this.orientation);
    for (const [index, tab] of this.tabs.entries()) {
      const panel = this.panels[index];
      if (!panel) continue;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      tab.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          this.commit(index, 'push', true);
        },
        { signal },
      );
      tab.addEventListener(
        'keydown',
        (event) => {
          const next = resolveKeyNavigation({
            key: event.key,
            currentIndex: index,
            count: this.tabs.length,
            orientation: this.orientation,
          });
          if (next.kind === 'none' || next.nextIndex === null) return;
          event.preventDefault();
          if (next.kind === 'activate-focused') {
            this.commit(next.nextIndex, 'push', true);
          } else {
            this.focusedIndex = next.nextIndex;
            this.project();
            this.tabs[next.nextIndex]?.focus({ preventScroll: true });
            this.scroll(next.nextIndex);
            if (this.automatic) this.commit(next.nextIndex, 'replace', true);
          }
        },
        { signal },
      );
    }
    this.indicator.hostConnected();
    this.resolve(false);
    this.url.hostConnected();
    root.setAttribute('data-tabs-enhanced', '');
  }

  getHostElement(): HTMLElement {
    return this.root;
  }
  isUrlSyncEnabled(): boolean {
    return this.urlSync;
  }
  getActiveValue(): string | null {
    return this.tabs[this.activeIndex]?.getAttribute('data-tab-value') ?? null;
  }
  getOrientation(): TabsOrientation {
    return this.orientation;
  }
  getIndicatorElement(): HTMLElement | null {
    return this.nav.querySelector(':scope > [data-tabs-indicator]');
  }
  getTablistElement(): HTMLElement {
    return this.nav;
  }
  getTablistContainerElement(): HTMLElement {
    return this.nav;
  }
  getActiveTabElement(): HTMLElement | null {
    return this.tabs[this.activeIndex] ?? null;
  }
  clearControlledSelection(): void {
    this.selectedValue = null;
  }
  onUrlStateChanged(): void {
    this.resolve(true);
  }
  resolveTabValueForHash(hash: string): string | null {
    const target = this.root.ownerDocument.getElementById(hash);
    if (target?.closest('[data-tabs-root]') !== this.root) return null;
    const panel = target.closest<HTMLElement>('[data-tab-panel]');
    return panel?.parentElement === this.root ? panel.getAttribute('data-tab-value') : null;
  }

  select(value: string, historyMode: UrlHistoryMode): TabsSelectionResult {
    const index = this.tabs.findIndex((tab) => tab.dataset['tabValue'] === value);
    if (index < 0) return 'invalid-value';
    const changed = index !== this.activeIndex;
    this.commit(index, historyMode, true);
    return changed ? 'selected' : 'unchanged';
  }

  private resolve(emit: boolean): void {
    if (!this.url.canSync()) return;
    const location = this.url.resolveUrlDrivenValue();
    const resolved = resolveSelectedIndex(
      {
        selectedValue: this.selectedValue,
        defaultSelectedValue: this.defaultValue,
        currentActiveIndex: this.activeIndex,
        initialized: this.activeIndex >= 0,
        count: this.tabs.length,
        urlValue: location.value,
        urlSource: location.source,
      },
      (value) => this.tabs.findIndex((tab) => tab.dataset['tabValue'] === value),
    );
    const previous = this.activeIndex;
    this.commit(resolved.index, 'none', false);
    this.url.normalizeActiveValue(location.source, this.getActiveValue());
    if (emit && previous !== this.activeIndex) this.notify(previous);
  }

  private commit(index: number, historyMode: UrlHistoryMode, emit: boolean): void {
    if (!this.url.beginSelection(historyMode)) return;
    const value = this.tabs[index]?.getAttribute('data-tab-value') ?? null;
    if (this.activeIndex === index && this.focusedIndex === index && this.selectedValue === value) {
      this.url.writeSelectedValue(value, historyMode);
      return;
    }
    const previous = this.activeIndex;
    this.activeIndex = index;
    this.focusedIndex = index;
    this.selectedValue = this.getActiveValue();
    this.project();
    this.url.writeSelectedValue(this.selectedValue, historyMode);
    this.indicator.hostUpdated();
    this.scroll(index);
    if (emit && previous !== index) this.notify(previous);
  }

  private project(): void {
    this.tabs.forEach((tab, index) => {
      tab.tabIndex = index === this.focusedIndex ? 0 : -1;
      tab.setAttribute('aria-selected', String(index === this.activeIndex));
      const panel = this.panels[index];
      if (panel) {
        panel.hidden = index !== this.activeIndex;
        panel.setAttribute('aria-hidden', String(index !== this.activeIndex));
        panel.tabIndex = index === this.activeIndex ? 0 : -1;
      }
    });
    this.root.dataset['selectedValue'] = this.getActiveValue() ?? '';
  }

  private scroll(index: number): void {
    const tab = this.tabs[index];
    if (tab) scrollTabElementIntoView(this.nav, tab, this.orientation);
  }

  private notify(previous: number): void {
    const detail: UiTabChangeDetail = {
      index: this.activeIndex,
      value: this.getActiveValue(),
      prevIndex: previous,
      scopeId: this.root.getAttribute('data-toc-scope')?.trim() ?? null,
    };
    this.root.dispatchEvent(
      new CustomEvent('ui-tab-change', { detail, bubbles: true, composed: true }),
    );
  }

  destroy(): void {
    this.url.hostDisconnected();
    this.indicator.hostDisconnected();
    this.root.removeAttribute('data-tabs-enhanced');
    this.root.removeAttribute('data-selected-value');
    this.nav.removeAttribute('role');
    this.nav.removeAttribute('aria-orientation');
    for (const tab of this.tabs) {
      for (const name of ['role', 'aria-selected', 'aria-controls', 'tabindex'])
        tab.removeAttribute(name);
    }
    for (const panel of this.panels) {
      panel.hidden = false;
      panel.removeAttribute('role');
      panel.removeAttribute('aria-hidden');
      panel.removeAttribute('tabindex');
    }
    controllers.delete(this.root);
  }
}

export const activateTabs = (root: HTMLElement, signal: AbortSignal): HydrationActivationResult => {
  if (signal.aborted) return { status: 'aborted' };
  if (controllers.has(root)) return { status: 'skipped', reason: 'already-activated' };
  const lifetime = new AbortController();
  const controller = new TabsController(root, lifetime.signal);
  controllers.set(root, controller);
  const cleanup = (): void => {
    if (lifetime.signal.aborted) return;
    lifetime.abort();
    controller.destroy();
    signal.removeEventListener('abort', cleanup);
  };
  signal.addEventListener('abort', cleanup, { once: true });
  return { status: 'activated', cleanup };
};
