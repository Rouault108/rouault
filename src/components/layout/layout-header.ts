import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../ui/header/header.js';
import '../ui/button/button.js';
import '../ui/dropdown/dropdown.js';
import { renderStaticIconTemplate } from '../ui/icon/static-icon-template.js';
import { DEFAULT_LAYOUT_SIDEBAR_ID, layoutSidebarController } from './layout-sidebar-controller.js';
import { layoutTocMobileController } from './layout-toc-mobile-controller.js';
import {
  layoutTocRuntimeStore,
  type LayoutTocRuntimeSnapshot,
} from './layout-toc-runtime-store.js';
import {
  THEME_ATTRIBUTE,
  THEME_CHANGE_EVENT,
  applyThemePreference,
  isThemePreference,
  readAppliedThemePreference,
  type ThemeChangeDetail,
  type ThemePreference,
} from '../../theme/theme-manager.js';
import { decodeHashFragment } from '../../router/url-hash.js';
import type { IconName } from '../../../shared/icons/icon-paths.js';
import type { HeaderShellProjection } from '../../../shared/navigation/shell-projection.js';
import type { TocPresence } from '../../../shared/note/toc-presence.js';
import { createSiteUrlContext } from '../../../shared/site/site-url-context.js';
import { validateCorpusRouteRootHrefForRender } from '../../../shared/link/corpus-link-validation.js';
import {
  createCorpusNavigationProjectionPayload,
  parseCorpusNavigationProjectionPayload,
  type CorpusNavigationProjectionPayload,
} from '../../../shared/navigation/corpus-navigation-projection.js';

interface CorpusNavigationItem {
  key: string;
  label: string;
  href: string;
  renderHref: string;
}

const DEFAULT_CORPUS_ITEMS: readonly CorpusNavigationItem[] = [
  {
    key: 'all',
    label: 'すべてのノート',
    href: '/corpora/',
    renderHref: '/corpora/',
  },
];

const THEME_OPTIONS: Record<
  ThemePreference,
  {
    icon: IconName;
    label: string;
  }
> = {
  light: {
    icon: 'sun',
    label: 'ライト',
  },
  dark: {
    icon: 'moon',
    label: 'ダーク',
  },
  system: {
    icon: 'monitor',
    label: 'OSテーマ',
  },
};

const DEFAULT_TOC_RUNTIME_VIEW: LayoutTocRuntimeSnapshot = {
  ready: false,
  hasVisibleHeadings: false,
  activeId: null,
};

const normalizeOptionalString = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

@customElement('layout-header')
export class LayoutHeader extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: var(--z-page-chrome, var(--z-fixed, 100));
      container-type: inline-size;
      container-name: layout-header-shell;
      --_layout-header-trigger-content-gap-default: var(
        --layout-header-trigger-content-gap-default,
        var(--space-2, 8px)
      );
      --_layout-header-trigger-content-gap-compact: var(
        --layout-header-trigger-content-gap-compact,
        var(--space-1, 4px)
      );
      --_layout-header-trigger-affordance-gap-default: var(
        --layout-header-trigger-affordance-gap-default,
        var(--space-2, 8px)
      );
      --_layout-header-trigger-affordance-gap-compact: var(
        --layout-header-trigger-affordance-gap-compact,
        var(--space-1, 4px)
      );
      --_layout-header-trigger-padding-inline-default: var(
        --layout-header-trigger-padding-inline-default,
        var(--space-3, 12px)
      );
      --_layout-header-trigger-padding-inline-compact: var(
        --layout-header-trigger-padding-inline-compact,
        var(--space-2, 8px)
      );
      --_layout-header-slot-group-gap-requested: var(
        --layout-header-slot-group-gap,
        var(--space-2, 8px)
      );
      --_layout-header-primary-start-offset: var(
        --layout-header-primary-start-offset,
        clamp(var(--space-2, 8px), 2vw, var(--space-6, 24px))
      );
      --_layout-header-sidebar-toggle-visible-size: var(
        --layout-header-sidebar-toggle-visible-size,
        var(--control-height-md, 32px)
      );
      --_layout-header-sidebar-toggle-min-touch-size: 44px;
      --_layout-header-sidebar-toggle-effective-interaction-size: max(
        var(--_layout-header-sidebar-toggle-visible-size),
        var(--_layout-header-sidebar-toggle-min-touch-size)
      );
      --_layout-header-sidebar-toggle-interaction-bleed: var(
        --layout-header-sidebar-toggle-interaction-bleed,
        6px
      );
      --_layout-header-start-slot-group-gap: max(
        var(--_layout-header-slot-group-gap-requested),
        var(--_layout-header-sidebar-toggle-interaction-bleed)
      );
      --_layout-header-end-slot-group-gap: var(--_layout-header-slot-group-gap-requested);
      --_layout-header-start-leading-visual-reserve-min: calc(
        var(--_layout-header-sidebar-toggle-visible-size) +
          var(--_layout-header-start-slot-group-gap)
      );
      --_layout-header-start-leading-visual-reserve: max(
        var(--layout-header-start-leading-visual-reserve, 0px),
        var(--_layout-header-start-leading-visual-reserve-min)
      );
      --_layout-header-center-start-inset-with-sidebar: var(
        --layout-header-center-start-inset-with-sidebar,
        var(--_layout-header-sidebar-toggle-effective-interaction-size)
      );
    }

    :host([narrow-layout]) {
      z-index: var(--z-anchored-overlay, var(--z-popover, 400));
    }

    .layout-header-query-frame {
      inline-size: 100%;
      container-type: inline-size;
      container-name: layout-header-shell;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      color: var(--fg-default);
      text-decoration: none;
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-semibold, 600);
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .brand:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--focus-ring-radius, 4px);
    }

    .context {
      color: var(--fg-muted);
      font-family: var(--font-mono);
      font-size: var(--text-xs, 12px);
      letter-spacing: var(--tracking-wide, 0.05em);
      text-transform: uppercase;
    }

    .slot-group {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      min-inline-size: 0;
      overflow: visible;
    }

    .slot-group > :focus-within {
      position: relative;
      z-index: 1;
    }

    .start-slot-group {
      gap: var(--_layout-header-start-slot-group-gap);
    }

    .end-slot-group {
      gap: var(--_layout-header-end-slot-group-gap);
    }

    ui-header {
      --ui-header-center-start-inset: 0px;
      --ui-header-center-end-inset: 0px;
      --ui-header-max-inline-size: var(
        --app-header-inner-max-width,
        var(--layout-chrome-max-width, 1384px)
      );
      --ui-header-max-inline-size-with-sidebar: var(--ui-header-max-inline-size);
    }

    :host([note-layout][toc-presence='present']) ui-header {
      --ui-header-center-end-inset: clamp(
        184px,
        24vw,
        calc(
          var(--note-toc-width, clamp(15rem, 18vw, 17rem)) +
            var(--note-shell-column-gap, var(--space-8, 32px))
        )
      );
    }

    :host([sidebar-enabled]) ui-header {
      --ui-header-center-start-inset: var(--_layout-header-center-start-inset-with-sidebar);
    }

    .sidebar-toggle {
      display: inline-flex;
      --control-height-md: var(--_layout-header-sidebar-toggle-visible-size);
    }

    .theme-trigger-label,
    .corpus-trigger-label {
      display: inline-flex;
      align-items: center;
      gap: var(--_layout-header-trigger-affordance-gap-default);
      min-inline-size: 0;
      max-inline-size: 100%;
    }

    .theme-trigger-main,
    .corpus-trigger-main {
      display: inline-flex;
      align-items: center;
      gap: var(--_layout-header-trigger-content-gap-default);
      min-inline-size: 0;
      max-inline-size: 100%;
    }

    .corpus-trigger-label {
      color: var(--fg-default);
    }

    .corpus-trigger-main,
    .theme-trigger-main {
      min-inline-size: 0;
    }

    .corpus-trigger-text {
      display: inline-block;
      min-inline-size: 0;
      max-inline-size: min(13rem, 28vw);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .corpus-switcher {
      display: inline-flex;
      min-inline-size: 0;
    }

    .theme-trigger-label {
      color: var(--fg-control-label, var(--fg-muted));
    }

    [data-dropdown='theme'] {
      --ui-dropdown-max-inline-size: 240px;
    }

    .theme-trigger-text {
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .theme-trigger-icon,
    .theme-trigger-chevron,
    .toc-trigger-icon,
    .corpus-trigger-icon {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      flex-shrink: 0;
    }

    .theme-trigger-icon {
      color: var(--fg-control-affordance, var(--fg-subtle));
    }

    .theme-trigger-chevron {
      color: var(--fg-control-affordance, var(--fg-subtle));
    }

    .corpus-trigger-icon {
      color: var(--fg-control-affordance, var(--fg-subtle));
    }

    .toc-trigger {
      display: none;
      align-items: center;
      gap: var(--_layout-header-trigger-content-gap-compact);
      min-inline-size: 0;
      max-inline-size: min(16rem, 42vw);
      block-size: var(--control-height-md, 36px);
      padding-inline: var(--_layout-header-trigger-padding-inline-compact);
      border: none;
      background: transparent;
      color: var(--fg-default);
      border-radius: var(--radius-md, 8px);
      cursor: pointer;
      font: inherit;
    }

    .toc-trigger:hover {
      background: var(--bg-hover, color-mix(in srgb, var(--bg-default) 88%, var(--fg-default) 12%));
    }

    .toc-trigger:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .toc-trigger-text {
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--text-sm, 13px);
    }

    .search-trigger {
      --search-trigger-gap: var(--_layout-header-trigger-content-gap-default);
      --search-trigger-gap-compact: var(--_layout-header-trigger-content-gap-compact);
      --search-trigger-padding-inline: var(--_layout-header-trigger-padding-inline-default);
      --search-trigger-padding-inline-compact: var(--_layout-header-trigger-padding-inline-compact);
      display: inline-flex;
      min-inline-size: 0;
      align-items: center;
      justify-content: flex-start;
      gap: var(--search-trigger-gap);
      min-block-size: var(--control-height-md, 2.25rem);
      padding-block: 0;
      padding-inline: var(--search-trigger-padding-inline);
      border: var(--border-width, 1px) solid var(--border-default);
      border-radius: var(--radius-md, 8px);
      background: var(--bg-control-muted);
      color: var(--fg-default);
      font: inherit;
      cursor: pointer;
    }

    .search-trigger:hover {
      background: var(--bg-hover, color-mix(in srgb, var(--bg-default) 88%, var(--fg-default) 12%));
    }

    .search-trigger:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .search-trigger__icon {
      inline-size: var(--icon-base, 16px);
      block-size: var(--icon-base, 16px);
      font-size: var(--icon-base, 16px);
    }

    .search-trigger__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 960px) {
      .search-trigger {
        gap: var(--search-trigger-gap-compact);
        padding-inline: var(--search-trigger-padding-inline-compact);
      }
    }

    @media (max-width: 639px) {
      .search-trigger {
        justify-content: center;
        padding-inline: 0;
      }
    }

    @container layout-header-shell (width >= 640px) {
      .start-slot-group {
        position: relative;
        padding-inline-start: var(--_layout-header-start-leading-visual-reserve);
      }

      :host([sidebar-enabled]) .start-slot-group {
        min-block-size: var(--_layout-header-sidebar-toggle-effective-interaction-size);
      }

      .start-slot-group > .sidebar-toggle,
      .start-slot-group > .sidebar-toggle:focus-within {
        position: absolute;
        z-index: 1;
        inset-inline-start: 0;
        inset-block-start: 50%;
        transform: translateY(-50%);
      }
    }

    @container layout-header-shell (width >= 1024px) {
      :host([note-layout][toc-presence='present']) ui-header {
        --ui-header-center-end-inset: calc(
          var(--note-toc-width, clamp(15rem, 18vw, 17rem)) +
            var(--note-shell-column-gap, var(--space-8, 32px))
        );
      }

      :host([sidebar-enabled]) ui-header {
        --ui-header-center-start-inset: calc(
          var(--note-sidebar-width, 248px) + var(--note-sidebar-main-gap, 0px)
        );
      }

      .start-slot-group {
        position: relative;
        padding-inline-start: 0;
      }

      :host([sidebar-enabled]) .start-slot-group {
        min-block-size: 0;
      }

      .start-slot-group > .sidebar-toggle,
      .start-slot-group > .sidebar-toggle:focus-within {
        display: none;
        position: static;
        transform: none;
      }

      .corpus-switcher {
        margin-inline-start: var(--_layout-header-primary-start-offset);
      }
    }

    @container layout-header-shell (width < 640px) {
      :host([note-layout][sidebar-enabled]) .corpus-switcher {
        display: none;
      }

      :host([note-layout]) .toc-trigger {
        max-inline-size: min(11rem, 32vw);
      }

      .corpus-trigger-text {
        max-inline-size: min(9rem, 42vw);
      }

      .theme-trigger-text {
        display: none;
      }

      .theme-trigger-label,
      .corpus-trigger-label {
        gap: var(--_layout-header-trigger-affordance-gap-compact);
      }

      .theme-trigger-main,
      .corpus-trigger-main {
        gap: var(--_layout-header-trigger-content-gap-compact);
      }

      .toc-trigger[data-visible='true'] {
        display: inline-flex;
      }
    }

    @container layout-header-shell (width < 400px) {
      .toc-trigger-text {
        display: none;
      }
    }
  `;

  @property({ type: String, attribute: 'corpora-json' })
  corporaJson = '';

  @property({ type: String, attribute: 'current-corpus-key' })
  currentCorpusKey = 'all';

  @property({ type: String, attribute: 'site-origin' })
  siteOrigin = '';

  @property({ type: String, attribute: 'base-path' })
  basePath = '';

  @property({ type: Boolean, reflect: true, attribute: 'note-layout' })
  noteLayout = false;

  @property({ type: Boolean, reflect: true, attribute: 'sidebar-enabled' })
  sidebarEnabled = false;

  @property({ type: String, reflect: true, attribute: 'toc-presence' })
  tocPresence: TocPresence = 'absent';

  @property({ type: String, attribute: 'toc-runtime-id' })
  tocRuntimeId: string | null = '';

  @property({ type: String, attribute: 'data-toc-owner-id' })
  tocOwnerId: string | null = '';

  @property({ type: String, attribute: 'toc-trigger-reserved' })
  tocTriggerReserved = 'auto';

  @property({ type: String, reflect: true, attribute: 'sidebar-id' })
  sidebarId = DEFAULT_LAYOUT_SIDEBAR_ID;

  @state()
  private _headerSidebarReserved = false;

  @state()
  private _sidebarOpen = false;

  @state()
  private _overlaySidebarOpen = false;

  @state()
  private _themePreference: ThemePreference = 'system';

  @state()
  private _tocRuntimeView: LayoutTocRuntimeSnapshot = DEFAULT_TOC_RUNTIME_VIEW;

  @state()
  private _tocPanelOpen = false;

  @state()
  private _isNarrowLayout = false;

  @query('.toc-trigger')
  private _tocTriggerElement!: HTMLButtonElement | null;

  private _sidebarControllerCleanup: (() => void) | null = null;
  private _tocRuntimeCleanup: (() => void) | null = null;
  private _tocMobileCleanup: (() => void) | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _themeAttributeObserver: MutationObserver | null = null;
  private _tocHashSyncFrame: number | null = null;
  private _tocHashSyncTimer: number | null = null;

  applyShellProjection(snapshot: HeaderShellProjection): void {
    this.corporaJson = JSON.stringify(snapshot.corpora);
    this.currentCorpusKey = snapshot.currentCorpusKey;
    this.noteLayout = snapshot.noteLayout;
    this.sidebarEnabled = snapshot.sidebarEnabled;
    this.sidebarId = snapshot.sidebarEnabled ? snapshot.sidebarId : DEFAULT_LAYOUT_SIDEBAR_ID;
    this.tocPresence = snapshot.tocPresence;
    const tocRuntimeId = normalizeOptionalString(snapshot.tocRuntimeId);
    if (tocRuntimeId.length > 0) {
      this.setAttribute('toc-runtime-id', tocRuntimeId);
    } else {
      this.removeAttribute('toc-runtime-id');
    }
    this.tocRuntimeId = tocRuntimeId;

    const tocOwnerId = normalizeOptionalString(snapshot.tocOwnerId);
    if (tocOwnerId.length > 0) {
      this.setAttribute('data-toc-owner-id', tocOwnerId);
    } else {
      this.removeAttribute('data-toc-owner-id');
    }
    this.tocOwnerId = tocOwnerId;
    this._setTocTriggerReserved(snapshot.tocTriggerReserved);
  }

  readShellProjection(): HeaderShellProjection {
    const currentCorpusKey =
      typeof this.currentCorpusKey === 'string' ? this.currentCorpusKey.trim() : '';
    const tocOwnerId = typeof this.tocOwnerId === 'string' ? this.tocOwnerId.trim() : '';

    return {
      corpora: this._parseCorpusPayload() ?? createCorpusNavigationProjectionPayload([]),
      currentCorpusKey: currentCorpusKey || 'all',
      noteLayout: this.noteLayout,
      sidebarEnabled: this.sidebarEnabled,
      sidebarId: this.sidebarEnabled ? this._resolveSidebarId() : DEFAULT_LAYOUT_SIDEBAR_ID,
      tocPresence: this.tocPresence,
      tocRuntimeId: this._readTocRuntimeId(),
      tocOwnerId: tocOwnerId || null,
      tocTriggerReserved: this._isTocTriggerReserved(),
    };
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof window === 'undefined') {
      return;
    }

    this._commitThemePreference(readAppliedThemePreference());
    window.addEventListener(THEME_CHANGE_EVENT, this._handleThemeChange as EventListener);
    this._startThemeAttributeObserver();
    this._connectSidebarController();
    this._connectTocControllers();
    this._syncResponsiveState(this.getBoundingClientRect().width);
    this._startResizeObserver();
    window.addEventListener('hashchange', this._handleTocHashChange);
    window.setTimeout(() => {
      if (!this.isConnected) {
        return;
      }

      this._commitThemePreference(readAppliedThemePreference());
    }, 0);
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('sidebarEnabled') || changedProperties.has('sidebarId')) {
      this._connectSidebarController();
    }

    if (changedProperties.has('tocRuntimeId') || changedProperties.has('tocPresence')) {
      this._connectTocControllers();
    }
  }

  protected override firstUpdated(): void {
    this._commitThemePreference(readAppliedThemePreference());
  }

  override disconnectedCallback(): void {
    this._sidebarControllerCleanup?.();
    this._sidebarControllerCleanup = null;
    this._tocRuntimeCleanup?.();
    this._tocRuntimeCleanup = null;
    this._tocMobileCleanup?.();
    this._tocMobileCleanup = null;
    this._cancelTocHashSync();
    this._stopResizeObserver();
    this._stopThemeAttributeObserver();

    if (typeof window !== 'undefined') {
      window.removeEventListener(THEME_CHANGE_EVENT, this._handleThemeChange as EventListener);
      window.removeEventListener('hashchange', this._handleTocHashChange);
    }
    super.disconnectedCallback();
  }

  private _startResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this._stopResizeObserver();
    this._resizeObserver = new ResizeObserver((entries) => {
      const entry = entries.at(0);
      if (!entry) {
        return;
      }

      this._syncResponsiveState(entry.contentRect.width);
    });
    this._resizeObserver.observe(this);
  }

  private _stopResizeObserver(): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
  }

  private _startThemeAttributeObserver(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this._stopThemeAttributeObserver();
    this._themeAttributeObserver = new MutationObserver(() => {
      this._commitThemePreference(readAppliedThemePreference());
    });
    this._themeAttributeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [THEME_ATTRIBUTE],
    });
  }

  private _stopThemeAttributeObserver(): void {
    this._themeAttributeObserver?.disconnect();
    this._themeAttributeObserver = null;
  }

  private _syncResponsiveState(width: number): void {
    const nextIsNarrowLayout = width > 0 && width < 640;
    if (this._isNarrowLayout !== nextIsNarrowLayout) {
      this._isNarrowLayout = nextIsNarrowLayout;
    }

    this.toggleAttribute('narrow-layout', nextIsNarrowLayout);
  }

  private _connectSidebarController(): void {
    this._sidebarControllerCleanup?.();
    this._sidebarControllerCleanup = null;

    if (!this.sidebarEnabled) {
      this._headerSidebarReserved = false;
      this._sidebarOpen = false;
      this._overlaySidebarOpen = false;
      return;
    }

    this._sidebarControllerCleanup = layoutSidebarController.subscribe(
      this._resolveSidebarId(),
      (snapshot) => {
        this._headerSidebarReserved = !this.noteLayout && snapshot.mode === 'fixed';
        this._sidebarOpen = snapshot.state === 'expanded';
        this._overlaySidebarOpen = snapshot.mode === 'overlay' && snapshot.state === 'expanded';
      },
    );
  }

  private _connectTocControllers(): void {
    this._tocRuntimeCleanup?.();
    this._tocRuntimeCleanup = null;
    this._tocMobileCleanup?.();
    this._tocMobileCleanup = null;

    const runtimeId = this._readTocRuntimeId();
    if (runtimeId === null || this.tocPresence !== 'present' || !this._isTocTriggerReserved()) {
      this._tocRuntimeView = DEFAULT_TOC_RUNTIME_VIEW;
      this._tocPanelOpen = false;
      return;
    }

    this._releaseTocControllerReservationGate(runtimeId);
    window.setTimeout(() => {
      this._releaseTocControllerReservationGate(runtimeId);
    }, 0);
    window.setTimeout(() => {
      this._releaseTocControllerReservationGate(runtimeId);
    }, 160);
    this._scheduleTocHashSync();

    this._tocRuntimeCleanup = layoutTocRuntimeStore.subscribe(runtimeId, (snapshot) => {
      this._tocRuntimeView = snapshot;
    });
    this._tocMobileCleanup = layoutTocMobileController.subscribe(runtimeId, (snapshot) => {
      this._tocPanelOpen = snapshot.panelOpen;
    });
  }

  private _releaseTocControllerReservationGate(runtimeId: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    const controllers = document.querySelectorAll<HTMLElement>('layout-toc-controller');
    for (const controller of controllers) {
      if (controller.getAttribute('toc-runtime-id') !== runtimeId) {
        continue;
      }

      controller.removeAttribute('data-toc-trigger-reserved');
      const activatableController = controller as HTMLElement & {
        activateHydration?: () => void | Promise<void>;
      };
      void activatableController.activateHydration?.();
    }
  }

  private _scheduleTocHashSync(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this._tocHashSyncFrame ??= window.requestAnimationFrame(() => {
      this._tocHashSyncFrame = null;
      this._syncTocActiveLinksFromHash();
    });

    this._tocHashSyncTimer ??= window.setTimeout(() => {
      this._tocHashSyncTimer = null;
      this._syncTocActiveLinksFromHash();
    }, 160);
  }

  private _cancelTocHashSync(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this._tocHashSyncFrame !== null) {
      window.cancelAnimationFrame(this._tocHashSyncFrame);
      this._tocHashSyncFrame = null;
    }

    if (this._tocHashSyncTimer !== null) {
      window.clearTimeout(this._tocHashSyncTimer);
      this._tocHashSyncTimer = null;
    }
  }

  private _syncTocActiveLinksFromHash(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const runtimeId = this._readTocRuntimeId();
    const activeId = decodeHashFragment(window.location.hash);
    if (runtimeId === null || activeId === null || activeId.length === 0) {
      return;
    }

    const controllers = document.querySelectorAll<HTMLElement>('layout-toc-controller');
    for (const controller of controllers) {
      if (controller.getAttribute('toc-runtime-id') !== runtimeId) {
        continue;
      }

      const root = controller.closest<HTMLElement>('[data-layout-toc-root]');
      const panelNav = document.querySelector<HTMLElement>('[data-layout-toc-mobile-nav]');
      const navs = [
        root?.querySelector<HTMLElement>('[data-layout-toc-nav]') ?? null,
        panelNav,
      ].filter((nav): nav is HTMLElement => nav instanceof HTMLElement);

      for (const nav of navs) {
        const links = nav.querySelectorAll<HTMLAnchorElement>('[data-toc-link][data-heading-id]');
        for (const link of links) {
          const isActive = link.getAttribute('data-heading-id') === activeId;
          if (isActive) {
            link.setAttribute('aria-current', 'location');
            link.setAttribute('data-active', 'true');
            link.classList.add('is-active');
          } else {
            link.removeAttribute('aria-current');
            link.removeAttribute('data-active');
            link.classList.remove('is-active');
          }
        }
      }
    }
  }

  private _readTocRuntimeId(): string | null {
    const normalized = normalizeOptionalString(this.tocRuntimeId);
    return normalized.length > 0 ? normalized : null;
  }

  private _resolveSidebarId(): string {
    const normalized = normalizeOptionalString(this.sidebarId);
    return normalized.length > 0 ? normalized : DEFAULT_LAYOUT_SIDEBAR_ID;
  }

  private _handleSidebarToggleClick = (event: Event): void => {
    if (!this.sidebarEnabled) {
      return;
    }

    const trigger = event.currentTarget;
    layoutSidebarController.toggle(
      this._resolveSidebarId(),
      trigger instanceof HTMLElement ? trigger : undefined,
    );
  };

  private _handleTocTriggerClick = (): void => {
    const runtimeId = this._readTocRuntimeId();
    if (runtimeId === null || !this._shouldRenderMobileTocTrigger()) {
      return;
    }

    layoutTocMobileController.toggle(runtimeId, this._tocTriggerElement ?? undefined);
  };

  private _handleSearchTriggerClick = (event: Event): void => {
    const trigger = event.currentTarget;
    document.dispatchEvent(
      new CustomEvent('open-search-dialog', {
        bubbles: true,
        composed: true,
        detail: {
          trigger: trigger instanceof HTMLElement ? trigger : null,
          modality: 'pointer',
        },
      }),
    );
  };

  private _commitThemePreference(preference: ThemePreference): void {
    if (!this.hasUpdated && this._themePreference !== preference) {
      void this.updateComplete.then(() => {
        if (!this.isConnected) {
          return;
        }

        this._themePreference = preference;
        void this.updateComplete.then(() => {
          if (this._themePreference !== preference || !this.isConnected) {
            return;
          }

          this._syncThemeTriggerDom(preference);
        });
      });
      return;
    }

    if (this._themePreference !== preference) {
      this._themePreference = preference;
    }

    // Lit の update 完了直後に同値 state を再代入して不要な update を発生させない。
    // DOM 同期は現在の updateComplete に連結し、theme 表示だけを後段で補正する。
    void this.updateComplete.then(() => {
      if (this._themePreference !== preference || !this.isConnected) {
        return;
      }

      this._syncThemeTriggerDom(preference);
    });
  }

  private _syncThemeTriggerDom(preference: ThemePreference): void {
    const option = THEME_OPTIONS[preference];
    const trigger = this.shadowRoot?.querySelector<HTMLElement>(
      '[data-dropdown="theme"] [slot="trigger"]',
    );

    if (!(trigger instanceof HTMLElement)) {
      return;
    }

    trigger.setAttribute('accessible-name', `テーマ: ${option.label}`);
    trigger.shadowRoot
      ?.querySelector<HTMLButtonElement>('button')
      ?.setAttribute('aria-label', `テーマ: ${option.label}`);

    const main = trigger.querySelector<HTMLElement>('.theme-trigger-main');
    main?.setAttribute('data-theme-preference', preference);

    const label = trigger.querySelector<HTMLElement>('.theme-trigger-text');
    this._syncTextPart(label, option.label);
  }

  private _syncTextPart(container: HTMLElement | null, text: string): void {
    if (!container) {
      return;
    }

    const textNode = [...container.childNodes].find(
      (node): node is Text => node.nodeType === Node.TEXT_NODE,
    );

    if (textNode && textNode.data !== text) {
      textNode.data = text;
    }
  }

  private _handleThemeChange = (event: CustomEvent<Partial<ThemeChangeDetail> | null>): void => {
    const preference = event.detail?.preference;

    if (!isThemePreference(preference)) {
      return;
    }

    this._commitThemePreference(preference);
  };

  private _handleThemeSelect = (event: CustomEvent<{ value?: unknown } | null>): void => {
    const nextPreference = event.detail?.value;

    if (!isThemePreference(nextPreference)) {
      return;
    }

    const detail = applyThemePreference(nextPreference);
    this._commitThemePreference(detail.preference);
  };

  private _handleTocHashChange = (): void => {
    this._scheduleTocHashSync();
  };

  private _readSiteUrlContext() {
    const siteOrigin = this.siteOrigin.trim() || window.location.origin;
    return createSiteUrlContext({ siteOrigin, basePath: this.basePath });
  }

  private _parseCorpusPayload(): CorpusNavigationProjectionPayload | null {
    const normalized = this.corporaJson.trim();
    if (normalized.length === 0) {
      return createCorpusNavigationProjectionPayload(DEFAULT_CORPUS_ITEMS);
    }

    try {
      return parseCorpusNavigationProjectionPayload(JSON.parse(normalized) as unknown);
    } catch {
      return null;
    }
  }

  private get _corpusItems(): CorpusNavigationItem[] {
    const payload = this._parseCorpusPayload();
    if (payload === null) {
      return [];
    }

    const siteUrlContext = this._readSiteUrlContext();
    return payload.items.flatMap((item) => {
      const renderHref = validateCorpusRouteRootHrefForRender({
        href: item.href,
        siteUrlContext,
      });
      return renderHref === null ? [] : [{ ...item, renderHref }];
    });
  }

  private get _currentCorpusItem(): CorpusNavigationItem | null {
    const currentKey =
      typeof this.currentCorpusKey === 'string' ? this.currentCorpusKey.trim() || 'all' : 'all';
    return this._corpusItems.find((item) => item.key === currentKey) ?? null;
  }

  private _shouldRenderMobileTocTrigger(): boolean {
    return (
      this.tocPresence === 'present' &&
      this._isTocTriggerReserved() &&
      this._tocRuntimeView.hydrationState !== 'disposed' &&
      this._tocRuntimeView.ready &&
      this._tocRuntimeView.hasVisibleHeadings
    );
  }

  private _isTocTriggerReserved(): boolean {
    const value = normalizeOptionalString(this.tocTriggerReserved);
    if (value === '' || value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return false;
  }

  private _setTocTriggerReserved(value: boolean): void {
    const serialized = value ? 'true' : 'false';
    this.tocTriggerReserved = serialized;
    this.setAttribute('toc-trigger-reserved', serialized);
  }

  private _readTocTriggerLabel(): string {
    return '目次';
  }

  private _readTocPanelId(): string | null {
    const runtimeId = this._readTocRuntimeId();
    return runtimeId ? `layout-toc-panel-${runtimeId}` : null;
  }

  override render() {
    const sidebarToggleLabel = this._sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く';
    const currentThemeOption = THEME_OPTIONS[this._themePreference];
    const corpusItems = this._corpusItems;
    const currentCorpusLabel = this._currentCorpusItem?.label ?? 'すべてのノート';
    const shouldRenderTocTrigger = this._shouldRenderMobileTocTrigger();
    const isTocTriggerReserved = this._isTocTriggerReserved() && this.tocPresence === 'present';
    const tocTriggerLabel = this._readTocTriggerLabel();
    const tocPanelId = this._readTocPanelId();
    const tocTriggerAriaLabel = this._tocPanelOpen ? '目次を閉じる' : '目次を開く';

    return html`
      <div class="layout-header-query-frame">
        <ui-header
          .sidebarExpanded=${this._headerSidebarReserved}
          .overlaySidebarOpen=${this._overlaySidebarOpen}
        >
          <div slot="start" class="slot-group start-slot-group">
          ${this.sidebarEnabled
            ? html`
                <ui-button
                  class="sidebar-toggle"
                  variant="ghost"
                  icon-only
                  aria-label="${sidebarToggleLabel}"
                  aria-expanded=${String(this._sidebarOpen)}
                  @click=${this._handleSidebarToggleClick}
                >
                  ${renderStaticIconTemplate('panel-left')}
                </ui-button>
              `
            : null}
          <ui-dropdown class="corpus-switcher">
            <ui-button slot="trigger" variant="ghost">
              <span class="corpus-trigger-label">
                <span class="corpus-trigger-main">
                  <span class="corpus-trigger-text">${currentCorpusLabel}</span>
                </span>
                ${renderStaticIconTemplate('chevron-down', 'corpus-trigger-icon')}
              </span>
            </ui-button>
            ${corpusItems.map(
              (item) => html`
                <ui-menu-link
                  href=${item.renderHref}
                  text-value=${item.label}
                  data-link-kind="internal-document"
                  data-link-surface="header"
                >
                  ${item.label}
                </ui-menu-link>
              `,
            )}
          </ui-dropdown>
          </div>

          <div slot="end" class="slot-group end-slot-group">
          <button
            class="toc-trigger"
            type="button"
            data-visible=${String(shouldRenderTocTrigger)}
            data-reserved=${String(isTocTriggerReserved)}
            data-toc-trigger-reserved=${String(isTocTriggerReserved)}
            data-toc-trigger-interactive=${String(shouldRenderTocTrigger)}
            data-toc-hydration-state=${this._tocRuntimeView.hydrationState ?? 'unhydrated'}
            aria-label=${tocTriggerAriaLabel}
            aria-expanded=${String(this._tocPanelOpen)}
            aria-controls=${tocPanelId ?? nothing}
            ?disabled=${!shouldRenderTocTrigger}
            @click=${this._handleTocTriggerClick}
          >
            ${renderStaticIconTemplate('menu', 'toc-trigger-icon')}
            <span class="toc-trigger-text">${tocTriggerLabel}</span>
          </button>

          <button
            class="search-trigger"
            type="button"
            data-search-dialog-trigger
            aria-haspopup="dialog"
            aria-controls="global-search-dialog"
            aria-expanded="false"
            @click=${this._handleSearchTriggerClick}
          >
            ${renderStaticIconTemplate('search', 'search-trigger__icon')}
            <span class="search-trigger__label">検索</span>
          </button>

          <ui-dropdown
            data-dropdown="theme"
            align="end"
            @menu-item-select=${this._handleThemeSelect}
          >
            <ui-button
              slot="trigger"
              variant="ghost"
              accessible-name=${`テーマ: ${currentThemeOption.label}`}
            >
              <span class="theme-trigger-label">
                <span class="theme-trigger-main" data-theme-preference=${this._themePreference}>
                  ${renderStaticIconTemplate(currentThemeOption.icon, 'theme-trigger-icon')}
                  <span class="theme-trigger-text">${currentThemeOption.label}</span>
                </span>
                ${renderStaticIconTemplate('chevron-down', 'theme-trigger-chevron')}
              </span>
            </ui-button>
            ${(
              Object.entries(THEME_OPTIONS) as [
                ThemePreference,
                (typeof THEME_OPTIONS)[ThemePreference],
              ][]
            ).map(([value, option]) => {
              const selected = value === this._themePreference;

              return html`
                <ui-menu-item value=${value} text-value=${option.label} ?data-selected=${selected}>
                  ${renderStaticIconTemplate(selected ? 'check' : option.icon)}
                  ${option.label}
                </ui-menu-item>
              `;
            })}
          </ui-dropdown>
          </div>
        </ui-header>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-header': LayoutHeader;
  }
}
