import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../ui/header/header';

@customElement('layout-header')
export class LayoutHeader extends LitElement {
  static override styles = css`
    :host {
      display: block;
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
      outline: var(--focus-ring-width, 2px) solid
        var(--focus-ring-color, oklch(60% 0.15 250));
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
  `;

  @state()
  private _sidebarExpanded = true;

  private _mediaQuery: MediaQueryList | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof window === 'undefined') {
      return;
    }

    this._mediaQuery = window.matchMedia('(min-width: 768px)');
    this._syncFromMediaQuery();
    this._mediaQuery.addEventListener('change', this._onMediaQueryChange);
  }

  override disconnectedCallback(): void {
    this._mediaQuery?.removeEventListener('change', this._onMediaQueryChange);
    this._mediaQuery = null;
    super.disconnectedCallback();
  }

  private _syncFromMediaQuery(): void {
    this._sidebarExpanded = this._mediaQuery?.matches ?? true;
  }

  private _onMediaQueryChange = (): void => {
    this._syncFromMediaQuery();
  };

  override render() {
    return html`
      <ui-header .sidebarExpanded=${this._sidebarExpanded}>
        <a slot="start" class="brand" href="/">Rouault</a>
        <span slot="center" class="context">Personal Notes</span>
      </ui-header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-header': LayoutHeader;
  }
}
