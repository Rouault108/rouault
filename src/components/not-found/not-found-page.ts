import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { navigateToUrl } from '../../lib/search/navigation.js';
import {
  ABOUT_PAGE_HREF,
  NOT_FOUND_PAGE_DESCRIPTION,
  NOT_FOUND_PAGE_TITLE,
  SEARCH_PAGE_HREF,
} from '../../lib/not-found-page.js';
import { pageShellStyles } from '../page/page-shell-styles.js';
import '../ui/empty-state/empty-state.js';
import '../ui/button/button.js';

@customElement('not-found-page')
export class NotFoundPage extends LitElement {
  static override styles = [
    pageShellStyles,
    css`
      .empty-hint {
        min-block-size: min(24rem, 50vh);
        padding-block: clamp(var(--space-6, 24px), 6vw, var(--space-10, 40px));
      }

      .requested-path-label {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--space-2, 8px);
        min-width: 0;
      }

      .requested-path-value {
        font-family: var(--font-mono);
        color: var(--fg-default);
        font-size: var(--text-xs, 12px);
        word-break: break-all;
      }
    `,
  ];

  @property({ type: String, attribute: 'requested-path' })
  requestedPath = '';

  private _didClearFallback = false;

  override connectedCallback(): void {
    if (!this._didClearFallback) {
      const fallback = this.querySelector('[data-not-found-fallback]');
      if (fallback) {
        this.replaceChildren();
      }
      this._didClearFallback = true;
    }

    super.connectedCallback();
  }

  private get _resolvedRequestedPath(): string {
    const normalized = this.requestedPath.trim();
    if (normalized.length > 0) {
      return normalized;
    }

    if (typeof window === 'undefined') {
      return '';
    }

    const currentPath =
      `${window.location.pathname}${window.location.search}${window.location.hash}`.trim();
    return currentPath === '/404.html' ? '' : currentPath;
  }

  private _handleSearchClick = (): void => {
    void navigateToUrl(SEARCH_PAGE_HREF);
  };

  private _handleAboutClick = (): void => {
    void navigateToUrl(ABOUT_PAGE_HREF);
  };

  private _handleBackClick = (): void => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    void navigateToUrl(SEARCH_PAGE_HREF);
  };

  override render() {
    const requestedPath = this._resolvedRequestedPath;

    return html`
      <section class="not-found-page page-shell" aria-labelledby="not-found-page-title">
        <div class="hero">
          <p class="eyebrow">404 / Not Found</p>
          <h1 id="not-found-page-title" class="heading">${NOT_FOUND_PAGE_TITLE}</h1>
          <p class="description">${NOT_FOUND_PAGE_DESCRIPTION}</p>

          ${requestedPath.length > 0
            ? html`
                <div class="meta-row">
                  <span class="requested-path-label">
                    <span>要求されたパス:</span>
                    <code class="requested-path-value">${requestedPath}</code>
                  </span>
                </div>
              `
            : nothing}
        </div>

        <div class="results-section">
          <ui-empty-state class="empty-hint" variant="default">
            <iconify-icon slot="icon" icon="lucide:file-search" aria-hidden="true"></iconify-icon>
            <span slot="heading">このページには到達できませんでした</span>
            <span slot="description">
              目的の情報が別の場所へ移動している可能性があります。検索ページ、About
              ページ、または前のページからお探しください。
            </span>

            <ui-button slot="action" variant="primary" @click=${this._handleSearchClick}>
              検索ページへ
            </ui-button>
            <ui-button slot="action" variant="secondary" @click=${this._handleAboutClick}>
              このサイトについて
            </ui-button>
            <ui-button slot="action" variant="ghost" @click=${this._handleBackClick}>
              前のページへ戻る
            </ui-button>
          </ui-empty-state>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'not-found-page': NotFoundPage;
  }
}
