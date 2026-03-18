import type {
  ReactiveController,
  ReactiveControllerHost,
} from 'lit';
import type { TabsOrientation } from './tabs.types.js';

export interface TabsIndicatorHost {
  getOrientation(): TabsOrientation;
  getIndicatorElement(): HTMLElement | null;
  getTablistElement(): HTMLElement | null;
  getTablistContainerElement(): HTMLElement | null;
  getActiveTabElement(): HTMLElement | null;
}

export class TabsIndicatorController implements ReactiveController {
  private readonly host: ReactiveControllerHost & TabsIndicatorHost;
  private resizeObserver?: ResizeObserver | undefined;
  private observedTablist: HTMLElement | null = null;
  private observedContainer: HTMLElement | null = null;
  private observedActiveTab: HTMLElement | null = null;
  private rafId: number | null = null;

  constructor(host: ReactiveControllerHost & TabsIndicatorHost) {
    this.host = host;
    this.host.addController(this);
  }

  hostConnected(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleReposition();
    });
  }

  hostDisconnected(): void {
    this.detachBindings();

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  hostUpdated(): void {
    this.syncBindings();
    this.scheduleReposition();
  }

  scheduleReposition(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.repositionNow();
    });
  }

  repositionNow(): void {
    const indicator = this.host.getIndicatorElement();
    const container = this.host.getTablistContainerElement();
    const activeTab = this.host.getActiveTabElement();

    if (!indicator || !container || !activeTab) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const tabStyle = window.getComputedStyle(activeTab);
    const paddingInlineStart =
      Number.parseFloat(tabStyle.paddingInlineStart) || 0;
    const paddingInlineEnd =
      Number.parseFloat(tabStyle.paddingInlineEnd) || 0;

    if (this.host.getOrientation() === 'horizontal') {
      const indicatorBleed = Math.min(4, paddingInlineStart, paddingInlineEnd);
      const labelLeft =
        tabRect.left - containerRect.left + paddingInlineStart;
      const labelWidth = Math.max(
        0,
        tabRect.width - paddingInlineStart - paddingInlineEnd,
      );

      indicator.style.left = `${String(labelLeft - indicatorBleed)}px`;
      indicator.style.width = `${String(labelWidth + indicatorBleed * 2)}px`;
      indicator.style.removeProperty('top');
      indicator.style.removeProperty('height');
    } else {
      const top = tabRect.top - containerRect.top;
      indicator.style.top = `${String(top)}px`;
      indicator.style.height = `${String(tabRect.height)}px`;
      indicator.style.removeProperty('left');
      indicator.style.removeProperty('width');
    }
  }

  private syncBindings(): void {
    const tablist = this.host.getTablistElement();
    const container = this.host.getTablistContainerElement();
    const activeTab = this.host.getActiveTabElement();

    if (this.observedTablist !== tablist) {
      this.observedTablist?.removeEventListener('scroll', this.onTablistScroll);
      this.observedTablist = tablist;
      this.observedTablist?.addEventListener('scroll', this.onTablistScroll, {
        passive: true,
      });
    }

    if (this.resizeObserver) {
      if (this.observedContainer !== container) {
        if (this.observedContainer) {
          this.resizeObserver.unobserve(this.observedContainer);
        }
        this.observedContainer = container;
        if (this.observedContainer) {
          this.resizeObserver.observe(this.observedContainer);
        }
      }

      if (this.observedTablist !== tablist) {
        // no-op: listener は上で張り替え済み
      }

      if (tablist && tablist !== this.observedTablist) {
        this.observedTablist = tablist;
      }

      if (this.observedActiveTab !== activeTab) {
        if (this.observedActiveTab) {
          this.resizeObserver.unobserve(this.observedActiveTab);
        }
        this.observedActiveTab = activeTab;
        if (this.observedActiveTab) {
          this.resizeObserver.observe(this.observedActiveTab);
        }
      }

      if (tablist) {
        this.resizeObserver.observe(tablist);
      }
    }
  }

  private detachBindings(): void {
    this.observedTablist?.removeEventListener('scroll', this.onTablistScroll);
    this.observedTablist = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    this.observedContainer = null;
    this.observedActiveTab = null;
  }

  private readonly onTablistScroll = (): void => {
    this.scheduleReposition();
  };
}