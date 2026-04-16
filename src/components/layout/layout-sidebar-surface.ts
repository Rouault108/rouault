import { html, LitElement } from 'lit';
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

  /**
   * overlay layer へ portal される light DOM surface。
   * 見た目の規約は global CSS（main.css）で管理する。
   */
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