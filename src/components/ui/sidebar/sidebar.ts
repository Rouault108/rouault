import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../file-tree/file-tree.js';
import type { FileTreeVariant, TreeItemDensity, TreeNode } from '../file-tree/file-tree.js';
import '../sidebar-shell/sidebar-shell.js';
import type {
  SidebarMode,
  SidebarState,
  UiSidebarRequestCloseDetail,
  UiSidebarStateChangeDetail,
} from '../sidebar-shell/sidebar-shell.js';

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

export interface UiSidebarRequestCloseEventDetail {
  reason: UiSidebarRequestCloseDetail['reason'];
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

  @property({ attribute: false })
  returnFocusTarget: HTMLElement | null = null;

  expand(trigger?: HTMLElement): void {
    if (trigger instanceof HTMLElement) {
      this.returnFocusTarget = trigger;
    }

    if (this.state === 'expanded') {
      return;
    }

    this.state = 'expanded';
  }

  collapse(): void {
    if (this.state === 'collapsed') {
      return;
    }

    this.state = 'collapsed';
  }

  toggle(trigger?: HTMLElement): void {
    if (trigger instanceof HTMLElement) {
      this.returnFocusTarget = trigger;
    }

    if (this.state === 'expanded') {
      this.collapse();
      return;
    }

    this.expand(trigger);
  }

  private _hasOverlayHeaderActions(): boolean {
    const lightDomChildren =
      'children' in this
        ? Array.from((this as typeof this & { children?: ArrayLike<Element> }).children)
        : [];

    return lightDomChildren.some((child) => child.getAttribute('slot') === 'header-actions');
  }

  private _onShellStateChange = (event: CustomEvent<UiSidebarStateChangeDetail>): void => {
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

  private _onShellRequestClose = (
    event: CustomEvent<UiSidebarRequestCloseEventDetail>,
  ): void => {
    this.dispatchEvent(
      new CustomEvent<UiSidebarRequestCloseEventDetail>('ui-sidebar-request-close', {
        bubbles: true,
        composed: true,
        detail: event.detail,
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
    const normalizedHeading = this.heading.trim();
    const hasHeading = normalizedHeading.length > 0;
    const hasOverlayHeaderActions = this._hasOverlayHeaderActions();

    return html`
      <ui-sidebar-shell
        data-state=${this.state}
        mode=${this.mode}
        .state=${this.state}
        .mode=${this.mode}
        .returnFocusTarget=${this.returnFocusTarget}
        @ui-sidebar-state-change=${this._onShellStateChange}
        @ui-sidebar-request-close=${this._onShellRequestClose}
      >
        ${hasOverlayHeaderActions
          ? html`
              <div class="sidebar-head" slot="header">
                ${hasHeading ? html`<h2 class="heading">${normalizedHeading}</h2>` : null}
                <slot name="header-actions"></slot>
              </div>
            `
          : null}

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
