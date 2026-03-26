import { html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { tabsStyles } from './tabs.styles.js';
import {
  applyTabsAria,
  readTabsSnapshot,
  scrollTabElementIntoView,
  switchPanels,
  validateTabsSnapshot,
} from './tabs-dom.js';
import { findTabIndexByValue, resolveKeyNavigation, resolveSelectedIndex } from './tabs-model.js';
import { TabsIndicatorController } from './tabs-indicator-controller.js';
import { TabsUrlSyncController, type TabsUrlSyncHost } from './tabs-url-sync-controller.js';
import type {
  CommitActiveIndexOptions,
  DevImportMeta,
  ResolveAndCommitOptions,
  TabsOrientation,
  TabsSnapshot,
  UiTabChangeDetail,
  UrlHistoryMode,
} from './tabs.types.js';
import { nextTabsUid } from './tabs.types.js';

@customElement('ui-tabs')
export class Tabs extends LitElement implements TabsUrlSyncHost {
  static override styles = tabsStyles;

  private readonly uid = nextTabsUid();

  @property({ type: String, attribute: 'selected-value', reflect: true })
  selectedValue: string | null = null;

  @property({ type: String, attribute: 'default-selected-value' })
  defaultSelectedValue: string | null = null;

  @property({ type: String, reflect: true })
  orientation: TabsOrientation = 'horizontal';

  @property({ type: Boolean, attribute: 'automatic-activation', reflect: true })
  automaticActivation = false;

  @property({ type: Boolean, attribute: 'url-sync', reflect: true })
  urlSync = false;

  @state() private activeIndex = 0;
  @state() private focusedIndex = 0;
  @state() private snapshot: TabsSnapshot = {
    tabs: [],
    panels: [],
    interactiveCount: 0,
  };

  private readonly tabClickHandlers = new Map<HTMLElement, EventListener>();
  private readonly panelHideFallbackTimers = new Map<HTMLElement, number>();

  private initialized = false;
  private _selectionResyncScheduled = false;

  private readonly urlController = new TabsUrlSyncController(this);
  private readonly indicatorController = new TabsIndicatorController(this);

  // ─────────────────────────────────────────────────
  // TabsUrlSyncHost
  // ─────────────────────────────────────────────────

  getHostElement(): HTMLElement {
    return this;
  }

  isUrlSyncEnabled(): boolean {
    return this.urlSync;
  }

  getActiveValue(): string | null {
    return this.snapshot.tabs[this.activeIndex]?.getAttribute('value') ?? null;
  }

  createHistoryStateForUrl(url: string): Record<string, unknown> {
    const currentState =
      typeof history.state === 'object' && history.state !== null
        ? (history.state as Record<string, unknown>)
        : {};

    const parsed = new URL(url, window.location.origin);

    return {
      ...currentState,
      __routerUrl: `${parsed.pathname}${parsed.search}${parsed.hash}`,
      __routerPath: parsed.pathname,
    };
  }

  onUrlStateChanged(): void {
    if (this.snapshot.interactiveCount === 0) {
      return;
    }
  
    this.urlController.withSuppressedWrite(() => {
      this.resolveAndCommit({
        emitEvent: true,
        historyMode: 'none',
        normalizeUrl: true,
      });
    });
  }

  // ─────────────────────────────────────────────────
  // Indicator Host
  // ─────────────────────────────────────────────────

  getOrientation(): TabsOrientation {
    return this.orientation;
  }

  getIndicatorElement(): HTMLElement | null {
    return this.renderRoot.querySelector('.indicator');
  }

  getTablistElement(): HTMLElement | null {
    return this.renderRoot.querySelector('[role="tablist"]');
  }

  getTablistContainerElement(): HTMLElement | null {
    return this.renderRoot.querySelector('.tablist-container');
  }

  getActiveTabElement(): HTMLElement | null {
    return this.snapshot.tabs[this.activeIndex] ?? null;
  }

  // ─────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanupTabListeners();
    this.clearPanelHideFallbackTimers();
  }

  override firstUpdated(_changedProperties: PropertyValues<this>): void {
    super.firstUpdated(_changedProperties);

    this.syncSnapshotFromSlots();

    if (this.snapshot.interactiveCount > 0) {
      if (this.urlSync) {
        this.urlController.withSuppressedWrite(() => {
          this.resolveAndCommit({
            emitEvent: false,
            historyMode: 'none',
            normalizeUrl: true,
          });
        });
      } else {
        this.resolveAndCommit({
          emitEvent: false,
          historyMode: 'none',
          normalizeUrl: false,
        });
      }
    }

    this.setAttribute('hydrated', '');
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('orientation')) {
      this.indicatorController.scheduleReposition();
    }

    if (
      changedProperties.has('selectedValue') ||
      changedProperties.has('defaultSelectedValue') ||
      changedProperties.has('urlSync')
    ) {
      this._scheduleSelectionResync();
    }
  }

  private _scheduleSelectionResync(): void {
    if (this._selectionResyncScheduled) {
      return;
    }

    this._selectionResyncScheduled = true;

    queueMicrotask(() => {
      this._selectionResyncScheduled = false;

      if (!this.isConnected) {
        return;
      }

      if (this.snapshot.interactiveCount === 0) {
        return;
      }

      if (this.urlSync) {
        this.urlController.withSuppressedWrite(() => {
          this.resolveAndCommit({
            emitEvent: false,
            historyMode: 'none',
            normalizeUrl: true,
          });
        });
      } else {
        this.resolveAndCommit({
          emitEvent: false,
          historyMode: 'none',
          normalizeUrl: false,
        });
      }
    });
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('orientation')) {
      if (this.orientation !== 'horizontal') {
        this.orientation = 'horizontal';
      }
    }
  }

  // ─────────────────────────────────────────────────
  // Slot handling
  // ─────────────────────────────────────────────────

  private readonly onTabSlotChange = (): void => {
    this.onSlotChange();
  };

  private readonly onPanelSlotChange = (): void => {
    this.onSlotChange();
  };

  private onSlotChange(): void {
    this.initialized = false;
    this.syncSnapshotFromSlots();

    if (this.snapshot.interactiveCount === 0) {
      this.cleanupTabListeners();
      return;
    }

    if (this.urlSync) {
      this.urlController.withSuppressedWrite(() => {
        this.resolveAndCommit({
          emitEvent: false,
          historyMode: 'none',
          normalizeUrl: true,
        });
      });
    } else {
      this.resolveAndCommit({
        emitEvent: false,
        historyMode: 'none',
        normalizeUrl: false,
      });
    }

    void this.updateComplete.then(() => {
      this.indicatorController.scheduleReposition();
      this.scrollActiveTabIntoView();
    });
  }

  private syncSnapshotFromSlots(): void {
    const tabSlot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="tab"]') ?? null;
    const panelSlot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="panel"]') ?? null;

    this.snapshot = readTabsSnapshot(tabSlot, panelSlot);
    validateTabsSnapshot(this.snapshot, this.warnDev);
  }

  // ─────────────────────────────────────────────────
  // Resolution / Commit
  // ─────────────────────────────────────────────────

  private resolveAndCommit(options: ResolveAndCommitOptions = {}): void {
    const { emitEvent = false, historyMode = 'none', normalizeUrl = true } = options;

    const count = this.snapshot.interactiveCount;
    if (count === 0) {
      return;
    }

    const urlResolution = this.urlSync
      ? this.urlController.resolveUrlDrivenValue()
      : ({ value: null, source: null } as const);

    const resolved = resolveSelectedIndex(
      {
        selectedValue: this.selectedValue,
        defaultSelectedValue: this.defaultSelectedValue,
        currentActiveIndex: this.activeIndex,
        initialized: this.initialized,
        count,
        urlValue: urlResolution.value,
        urlSource: urlResolution.source,
      },
      (value) => findTabIndexByValue(this.snapshot.tabs, value, count),
    );

    if (resolved.warning !== null) {
      this.warnDev(resolved.warning);
    }

    const shouldUpdate = !this.initialized || resolved.index !== this.activeIndex;

    this.initialized = true;

    if (shouldUpdate) {
      this.commitActiveIndex(resolved.index, {
        emitEvent,
        historyMode,
      });
    }

    if (this.urlSync && normalizeUrl) {
      this.urlController.normalizeActiveValue(
        urlResolution.source,
        this.getTabValueAt(this.activeIndex),
      );
    }
  }

  private commitActiveIndex(index: number, options: CommitActiveIndexOptions = {}): void {
    const { emitEvent = true, historyMode = 'none' } = options;

    if (index < 0 || index >= this.snapshot.interactiveCount) {
      return;
    }

    const prevIndex = this.activeIndex;
    const newValue = this.getTabValueAt(index);

    const stateChanged =
      this.activeIndex !== index || this.focusedIndex !== index || this.selectedValue !== newValue;

    if (!stateChanged) {
      if (this.urlSync) {
        this.urlController.writeSelectedValue(newValue, historyMode);
      }
      return;
    }

    this.activeIndex = index;
    this.focusedIndex = index;

    this.applyDomState(prevIndex);

    if (this.selectedValue !== newValue) {
      this.selectedValue = newValue;
    }

    if (this.urlSync) {
      this.urlController.writeSelectedValue(newValue, historyMode);
    }

    void this.updateComplete.then(() => {
      this.indicatorController.scheduleReposition();
      this.scrollActiveTabIntoView();
    });

    if (emitEvent && prevIndex !== index) {
      const detail: UiTabChangeDetail = {
        index,
        value: newValue,
        prevIndex,
      };

      this.dispatchEvent(
        new CustomEvent<UiTabChangeDetail>('ui-tab-change', {
          detail,
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private applyDomState(prevIndex: number): void {
    applyTabsAria(this.snapshot, this.uid, this.activeIndex, this.focusedIndex);

    this.bindTabClickListeners();

    switchPanels(this.snapshot.panels, this.activeIndex, prevIndex, this.panelHideFallbackTimers);
  }

  // ─────────────────────────────────────────────────
  // Focus / selection
  // ─────────────────────────────────────────────────

  private selectTab(index: number, options: CommitActiveIndexOptions = {}): void {
    if (index < 0 || index >= this.snapshot.interactiveCount) {
      return;
    }

    this.commitActiveIndex(index, {
      emitEvent: options.emitEvent ?? true,
      historyMode: options.historyMode ?? 'none',
    });
  }

  private focusTab(index: number): void {
    if (index < 0 || index >= this.snapshot.interactiveCount) {
      return;
    }

    this.focusedIndex = index;

    applyTabsAria(this.snapshot, this.uid, this.activeIndex, this.focusedIndex);

    const tabEl = this.snapshot.tabs[index];
    const tablist = this.getTablistElement();

    if (tabEl && tablist) {
      tabEl.focus({ preventScroll: true });
      scrollTabElementIntoView(tablist, tabEl, this.orientation);
    }

    if (this.automaticActivation) {
      this.selectTab(index, {
        emitEvent: true,
        historyMode: this.urlSync ? 'replace' : 'none',
      });
    }
  }

  private scrollActiveTabIntoView(): void {
    const tablist = this.getTablistElement();
    const activeTab = this.snapshot.tabs[this.activeIndex];

    if (!tablist || !activeTab) {
      return;
    }

    scrollTabElementIntoView(tablist, activeTab, this.orientation);
  }

  // ─────────────────────────────────────────────────
  // Keyboard
  // ─────────────────────────────────────────────────

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const target = e.composedPath()[0] as HTMLElement;
    const tabIndex = this.snapshot.tabs.indexOf(target);

    if (tabIndex === -1 || tabIndex >= this.snapshot.interactiveCount) {
      return;
    }

    const result = resolveKeyNavigation({
      key: e.key,
      currentIndex: tabIndex,
      count: this.snapshot.interactiveCount,
      orientation: this.orientation,
    });

    if (result.kind === 'none' || result.nextIndex === null) {
      return;
    }

    e.preventDefault();

    if (result.kind === 'move-focus') {
      this.focusTab(result.nextIndex);
      return;
    }

    this.selectTab(this.focusedIndex, {
      emitEvent: true,
      historyMode: this.urlSync ? 'push' : 'none',
    });
  };

  // ─────────────────────────────────────────────────
  // Click listeners
  // ─────────────────────────────────────────────────

  private bindTabClickListeners(): void {
    this.cleanupTabListeners();

    const count = this.snapshot.interactiveCount;

    this.snapshot.tabs.forEach((tab, i) => {
      const handler: EventListener = () => {
        if (i < count) {
          this.selectTab(i, {
            emitEvent: true,
            historyMode: this.urlSync ? 'push' : 'none',
          });
        }
      };

      this.tabClickHandlers.set(tab, handler);
      tab.addEventListener('click', handler);
    });
  }

  private cleanupTabListeners(): void {
    for (const [tab, handler] of this.tabClickHandlers) {
      tab.removeEventListener('click', handler);
    }
    this.tabClickHandlers.clear();
  }

  private clearPanelHideFallbackTimers(): void {
    for (const timer of this.panelHideFallbackTimers.values()) {
      clearTimeout(timer);
    }
    this.panelHideFallbackTimers.clear();
  }

  // ─────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────

  select(
    value: string,
    options: {
      historyMode?: UrlHistoryMode;
      emitEvent?: boolean;
    } = {},
  ): void {
    const index = findTabIndexByValue(this.snapshot.tabs, value, this.snapshot.interactiveCount);

    if (index === -1) {
      this.warnDev(`[ui-tabs]: select("${value}") に一致する value を持つ tab がありません。`);
      return;
    }

    this.selectTab(index, {
      emitEvent: options.emitEvent ?? true,
      historyMode: options.historyMode ?? (this.urlSync ? 'replace' : 'none'),
    });
  }

  // ─────────────────────────────────────────────────
  // Utils
  // ─────────────────────────────────────────────────

  private getTabValueAt(index: number): string | null {
    return this.snapshot.tabs[index]?.getAttribute('value') ?? null;
  }

  private readonly warnDev = (message: string): void => {
    const isDev = (import.meta as DevImportMeta).env?.DEV === true;
    if (!isDev) {
      return;
    }
    console.warn(message, this);
  };

  // ─────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────

  override render() {
    const isVertical = this.orientation === 'vertical';

    return html`
      <div class="${classMap({ root: true, 'orient-vertical': isVertical })}">
        <div class="tablist-container">
          <div
            role="tablist"
            part="tablist"
            aria-orientation="${this.orientation}"
            @keydown="${this.onKeyDown}"
          >
            <slot name="tab" @slotchange="${this.onTabSlotChange}"></slot>
          </div>
          <div class="indicator" part="indicator" aria-hidden="true"></div>
        </div>

        <div class="panels" part="panels">
          <slot name="panel" @slotchange="${this.onPanelSlotChange}"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-tabs': Tabs;
  }
}
