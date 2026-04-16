import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '../ui/sidebar-shell/sidebar-shell.js';
import type {
  SidebarMode,
  SidebarState,
  UiSidebarRequestCloseDetail,
} from '../ui/sidebar-shell/sidebar-shell.js';

@customElement('layout-sidebar-surface')
export class LayoutSidebarSurface extends LitElement {
  static override styles = css`
    :host {
      display: block;
      block-size: 100%;
      min-block-size: 0;
      overflow: visible;
    }

    ui-sidebar-shell {
      display: block;
      block-size: 100%;
      min-block-size: 0;
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
  `;

  @property({ type: String })
  heading = 'ナビゲーション';

  @property({ attribute: false })
  navMarkup = '';

  @property({ type: String })
  state: SidebarState = 'expanded';

  @property({ type: String })
  mode: SidebarMode = 'fixed';

  @property({ attribute: false })
  returnFocusTarget: HTMLElement | null = null;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private _onSidebarRequestClose = (event: CustomEvent<UiSidebarRequestCloseDetail>): void => {
    event.stopPropagation();

    this.dispatchEvent(
      new CustomEvent<UiSidebarRequestCloseDetail>('layout-sidebar-surface-request-close', {
        detail: event.detail,
        bubbles: false,
        composed: false,
      }),
    );
  };

  override render() {
    const normalizedHeading = this.heading.trim();

    return html`
      <ui-sidebar-shell
        data-state=${this.state}
        mode=${this.mode}
        .state=${this.state}
        .mode=${this.mode}
        .returnFocusTarget=${this.returnFocusTarget}
        @ui-sidebar-request-close=${this._onSidebarRequestClose}
      >
        <div class="sidebar-head" slot="header">
          <h2 class="heading">${normalizedHeading}</h2>
        </div>
        ${unsafeHTML(this.navMarkup)}
      </ui-sidebar-shell>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-sidebar-surface': LayoutSidebarSurface;
  }
}