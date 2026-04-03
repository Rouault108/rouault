import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../file-tree/file-tree.js';
import type { FileTreeVariant, TreeItemDensity, TreeNode } from '../file-tree/file-tree.js';
import '../sidebar-shell/sidebar-shell.js';
import type {
  SidebarMode,
  SidebarState,
  UiSidebarShell,
  UiSidebarStateChangeDetail,
} from '../sidebar-shell/sidebar-shell.js';

const STORAGE_KEY = 'rouault.sidebar.state';
const MIN_BREAKPOINT = 320;

export interface UiSidebarSelectDetail {
  id: string;
}

export interface UiSidebarToggleDetail {
  id: string;
  expanded: boolean;
}

export interface UiSidebarActiveChangeDetail {
  id: string;
}

@customElement('ui-sidebar')
export class UiSidebar extends LitElement {
  static override styles = css`
    :host {
      display: block;
      min-block-size: 0;
      color: var(--fg-default, oklch(24% 0 0));
    }

    .sidebar-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2, 8px);
      min-block-size: var(--control-height-lg, 40px);
      padding: var(--space-2, 8px) var(--space-4, 16px);
      border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(20% 0 0 / 0.12));
      background: var(--bg-surface-2, oklch(100% 0 0));
    }

    .heading {
      margin: 0;
      font-family: var(--font-sans);
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      letter-spacing: 0.01em;
      color: var(--fg-muted, oklch(42% 0 0));
    }

    .tree-wrap {
      display: block;
      min-block-size: 0;
    }

    @media (prefers-color-scheme: dark) {
      .sidebar-head {
        border-bottom-color: var(--border-ghost, oklch(90% 0 0 / 0.08));
      }
    }

    @media (forced-colors: active) {
      .sidebar-head {
        border-color: CanvasText;
        background: Canvas;
      }

      .heading {
        color: CanvasText;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .sidebar-head {
        transition-duration: 0.01ms !important;
      }
    }
  `;

  @property({ reflect: true, attribute: 'data-state' })
  state: SidebarState = 'expanded';

  @property({ reflect: true })
  mode: SidebarMode = 'fixed';

  @property({ type: Array })
  items: TreeNode[] = [];

  @property({ type: Boolean, reflect: true })
  loading = false;

  @property({ type: String, attribute: 'selected-id' })
  selectedId: string | null = null;

  @property({ attribute: false })
  expandedIds: ReadonlySet<string> = new Set();

  @property({ type: String, reflect: true })
  density: TreeItemDensity = 'normal';

  @property({ type: String, reflect: true })
  variant: FileTreeVariant = 'default';

  @property({ type: String })
  heading = 'ナビゲーション';

  @property({ type: Number, reflect: true, attribute: 'fixed-breakpoint' })
  fixedBreakpoint = 1280;

  @query('ui-sidebar-shell')
  private _shellElement!: UiSidebarShell | null;

  private _syncFromShellInProgress = false;

  private _shellObserver: MutationObserver | null = null;

  override disconnectedCallback(): void {
    this._detachShellObserver();
    super.disconnectedCallback();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._restoreState();
    this._initModeFromMediaQuery();
  }

  protected override firstUpdated(): void {
    this._attachShellObserver();
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (this._syncFromShellInProgress) {
      return;
    }

    if (
      changedProperties.has('state') ||
      changedProperties.has('mode') ||
      changedProperties.has('fixedBreakpoint')
    ) {
      this._syncStateToShell();
    }
  }

  expand(trigger?: HTMLElement): void {
    this._shellElement?.expand(trigger);
  }

  collapse(): void {
    this._shellElement?.collapse();
  }

  toggle(trigger?: HTMLElement): void {
    this._shellElement?.toggle(trigger);
  }

  private _attachShellObserver(): void {
    this._detachShellObserver();

    if (!this._shellElement) {
      return;
    }

    this._shellObserver = new MutationObserver(() => {
      this._syncStateFromShell();
    });

    this._shellObserver.observe(this._shellElement, {
      attributes: true,
      attributeFilter: ['mode', 'data-state', 'fixed-breakpoint'],
    });
  }

  private _detachShellObserver(): void {
    this._shellObserver?.disconnect();
    this._shellObserver = null;
  }

  private _syncStateFromShell(): void {
    if (!this._shellElement) {
      return;
    }

    const shell = this._shellElement;
    this._syncFromShellInProgress = true;

    if (this.state !== shell.state) {
      this.state = shell.state;
    }

    if (this.mode !== shell.mode) {
      this.mode = shell.mode;
    }

    if (this.fixedBreakpoint !== shell.fixedBreakpoint) {
      this.fixedBreakpoint = shell.fixedBreakpoint;
    }

    this._syncFromShellInProgress = false;
  }

  private _syncStateToShell(): void {
    if (!this._shellElement) {
      return;
    }

    if (this._shellElement.state !== this.state) {
      this._shellElement.state = this.state;
    }

    if (this._shellElement.mode !== this.mode) {
      this._shellElement.mode = this.mode;
    }

    if (this._shellElement.fixedBreakpoint !== this.fixedBreakpoint) {
      this._shellElement.fixedBreakpoint = this.fixedBreakpoint;
    }
  }

  private _restoreState(): void {
    if (this.hasAttribute('data-state')) {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'expanded' || stored === 'collapsed') {
        this.state = stored;
      }
    } catch {
      /* localStorage が使えない環境では復元を諦める */
    }
  }

  private _initModeFromMediaQuery(): void {
    if (this.hasAttribute('mode')) {
      return;
    }

    const resolvedBreakpoint = this._resolveFixedBreakpoint(this.fixedBreakpoint);
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const isFixed = window.matchMedia(`(min-width: ${String(resolvedBreakpoint)}px)`).matches;
    this.mode = isFixed ? 'fixed' : 'overlay';
  }

  private _resolveFixedBreakpoint(value: number): number {
    if (!Number.isFinite(value)) {
      return 1280;
    }

    const normalized = Math.trunc(value);
    return normalized >= MIN_BREAKPOINT ? normalized : MIN_BREAKPOINT;
  }

  private _onShellStateChange = (event: CustomEvent<UiSidebarStateChangeDetail>): void => {
    this._syncFromShellInProgress = true;
    this.state = event.detail.state;
    this.mode = event.detail.mode;
    this._syncFromShellInProgress = false;

    this.dispatchEvent(
      new CustomEvent<UiSidebarStateChangeDetail>('ui-sidebar-state-change', {
        bubbles: false,
        composed: false,
        detail: {
          state: event.detail.state,
          mode: event.detail.mode,
        },
      }),
    );
  };

  private _onTreeSelect = (event: CustomEvent<UiSidebarSelectDetail>): void => {
    const detail = event.detail;
    this.dispatchEvent(
      new CustomEvent<UiSidebarSelectDetail>('ui-sidebar-select', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  };

  private _onTreeToggle = (event: CustomEvent<UiSidebarToggleDetail>): void => {
    this.dispatchEvent(
      new CustomEvent<UiSidebarToggleDetail>('ui-sidebar-toggle', {
        bubbles: true,
        composed: true,
        detail: event.detail,
      }),
    );
  };

  private _onTreeActiveChange = (event: CustomEvent<UiSidebarActiveChangeDetail>): void => {
    this.dispatchEvent(
      new CustomEvent<UiSidebarActiveChangeDetail>('ui-sidebar-active-change', {
        bubbles: true,
        composed: true,
        detail: event.detail,
      }),
    );
  };

  override render() {
    return html`
      <ui-sidebar-shell
        data-state=${this.state}
        mode=${ifDefined(this.mode)}
        .fixedBreakpoint=${this.fixedBreakpoint}
        @ui-sidebar-state-change=${this._onShellStateChange}
      >
        <div class="sidebar-head" slot="header">
          <h2 class="heading">${this.heading}</h2>
          <slot name="header-actions"></slot>
        </div>

        <div class="tree-wrap">
          <ui-file-tree
            .items=${this.items}
            .loading=${this.loading}
            .selectedId=${this.selectedId}
            .expandedIds=${this.expandedIds}
            .density=${this.density}
            .variant=${this.variant}
            @ui-tree-select=${this._onTreeSelect}
            @ui-tree-toggle=${this._onTreeToggle}
            @ui-tree-active-change=${this._onTreeActiveChange}
          ></ui-file-tree>
        </div>
      </ui-sidebar-shell>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-sidebar': UiSidebar;
  }
}
