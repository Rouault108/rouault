import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import '../file-tree/file-tree';
import type { FileTreeVariant, TreeItemDensity, TreeNode } from '../file-tree/file-tree';
import '../sidebar-shell/sidebar-shell';
import type {
  SidebarMode,
  SidebarState,
  UiSidebarShell,
  UiSidebarStateChangeDetail,
} from '../sidebar-shell/sidebar-shell';

export interface UiSidebarSelectDetail {
  id: string;
  node: TreeNode;
}

export interface UiSidebarExpandDetail {
  id: string;
  expanded: boolean;
}

export interface UiSidebarFocusChangeDetail {
  id: string;
}

@customElement('ui-sidebar')
export class UiSidebar extends LitElement {
  static override styles = css`
    :host {
      display: block;
      min-block-size: 0;
      color: var(--fg-default, oklch(24% 0.01 250));
    }

    .sidebar-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2, 8px);
      min-block-size: var(--control-height-lg, 40px);
      padding: var(--space-2, 8px) var(--space-4, 16px);
      border-bottom: var(--border-width, 1px) solid
        var(--border-default, oklch(20% 0.03 250 / 0.12));
      background: var(--bg-surface-2, oklch(100% 0 0));
    }

    .heading {
      margin: 0;
      font-family: var(--font-sans);
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      letter-spacing: 0.01em;
      color: var(--fg-muted, oklch(42% 0.01 250));
    }

    .tree-wrap {
      display: block;
      min-block-size: 0;
    }

    .footer {
      display: block;
      padding: var(--space-2, 8px) var(--space-4, 16px);
      border-top: var(--border-width, 1px) solid
        var(--border-ghost, oklch(20% 0.03 250 / 0.04));
    }

    @media (prefers-color-scheme: dark) {
      .sidebar-head {
        border-bottom-color: var(--border-ghost, oklch(90% 0.01 250 / 0.08));
      }

      .footer {
        border-top-color: var(--border-ghost, oklch(90% 0.01 250 / 0.08));
      }
    }

    @media (forced-colors: active) {
      .sidebar-head,
      .footer {
        border-color: CanvasText;
        background: Canvas;
      }

      .heading {
        color: CanvasText;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .sidebar-head,
      .footer {
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

  @property({ type: String, attribute: 'active-id' })
  activeId = '';

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

  protected override firstUpdated(): void {
    this._syncStateFromShell();
    this._attachShellObserver();
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (this._syncFromShellInProgress) {
      return;
    }

    if (
      changedProperties.has('state')
      || changedProperties.has('mode')
      || changedProperties.has('fixedBreakpoint')
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

  private _syncStateFromShell(): void {
    if (!this._shellElement) {
      return;
    }

    const nextState = this._shellElement.state;
    const nextMode = this._shellElement.mode;
    const nextFixedBreakpoint = this._shellElement.fixedBreakpoint;

    if (
      nextState === this.state
      && nextMode === this.mode
      && nextFixedBreakpoint === this.fixedBreakpoint
    ) {
      return;
    }

    this._syncFromShellInProgress = true;
    this.state = nextState;
    this.mode = nextMode;
    this.fixedBreakpoint = nextFixedBreakpoint;
    this._syncFromShellInProgress = false;
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
    this.activeId = detail.id;

    this.dispatchEvent(
      new CustomEvent<UiSidebarSelectDetail>('ui-sidebar-select', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  };

  private _onTreeExpand = (event: CustomEvent<UiSidebarExpandDetail>): void => {
    this.dispatchEvent(
      new CustomEvent<UiSidebarExpandDetail>('ui-sidebar-expand', {
        bubbles: true,
        composed: true,
        detail: event.detail,
      }),
    );
  };

  private _onTreeFocusChange = (event: CustomEvent<UiSidebarFocusChangeDetail>): void => {
    this.activeId = event.detail.id;

    this.dispatchEvent(
      new CustomEvent<UiSidebarFocusChangeDetail>('ui-sidebar-focus-change', {
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
          mode=${this.mode}
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
            .activeId=${this.activeId}
            .density=${this.density}
            .variant=${this.variant}
            @ui-tree-select=${this._onTreeSelect}
            @ui-tree-expand=${this._onTreeExpand}
            @ui-tree-focus-change=${this._onTreeFocusChange}
          ></ui-file-tree>
        </div>

        <div class="footer">
          <slot name="footer"></slot>
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
