import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  ABOUT_PAGE_HREF,
  NOT_FOUND_PAGE_DESCRIPTION,
  NOT_FOUND_PAGE_TITLE,
  SEARCH_PAGE_HREF,
} from '../../not-found/not-found-page.js';

@customElement('not-found-page')
export class NotFoundPage extends LitElement {
  static override styles = css`
    :host {
      display: block;
      color: var(--fg-default);
    }

    .not-found-page {
      box-sizing: border-box;
      width: min(100%, 72rem);
      margin: 0 auto;
      padding:
        clamp(var(--space-12, 48px), 12vh, 8rem)
        var(--space-4, 16px)
        clamp(var(--space-16, 64px), 18vh, 10rem);
    }

    .not-found-page__inner {
      inline-size: min(100%, 42rem);
      display: grid;
      gap: var(--space-6, 24px);
    }

    .eyebrow {
      margin: 0;
      color: var(--fg-muted);
      font-family: var(--font-mono);
      font-size: var(--text-xs, 12px);
      letter-spacing: var(--tracking-wider, 0.03em);
      line-height: var(--line-height-none, 1);
      text-transform: uppercase;
    }

    .title {
      margin: 0;
      color: var(--fg-default);
      font-family: var(--font-sans);
      font-size: clamp(var(--text-2xl, 24px), 2.4vw, var(--text-3xl, 30px));
      font-weight: var(--font-semibold, 600);
      letter-spacing: var(--tracking-tight, -0.015em);
      line-height: var(--line-height-tight, 1.25);
      text-wrap: balance;
    }

    .description {
      margin: 0;
      max-inline-size: 40rem;
      color: var(--fg-muted);
      font-size: var(--text-base, 14px);
      line-height: var(--line-height-relaxed, 1.75);
      text-wrap: pretty;
    }

    .meta {
      margin: 0;
      padding-top: var(--space-4, 16px);
      border-top: var(--border-width, 1px) solid var(--border-muted);
    }

    .meta-row {
      display: grid;
      gap: var(--space-2, 8px);
      margin: 0;
    }

    .meta-label {
      margin: 0;
      color: var(--fg-muted);
      font-size: var(--text-xs, 12px);
      line-height: var(--line-height-normal, 1.5);
    }

    .meta-value {
      margin: 0;
      color: var(--fg-default);
      font-family: var(--font-mono);
      font-size: var(--text-xs, 12px);
      line-height: var(--line-height-normal, 1.5);
      word-break: break-all;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3, 12px);
      align-items: center;
    }

    .action-link,
    .action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-block-size: var(--control-min-touch, 44px);
      padding-inline: var(--space-4, 16px);
      border-radius: var(--radius-full, 9999px);
      font-family: var(--font-sans);
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      line-height: 1;
      transition:
        background-color var(--duration-fast, 120ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)),
        border-color var(--duration-fast, 120ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)),
        color var(--duration-fast, 120ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1));
    }

    .action-link {
      border: var(--border-width, 1px) solid var(--border-muted);
      background: transparent;
      color: var(--fg-default);
      text-decoration: none;
    }

    .action-link:hover {
      background: var(--bg-surface-1);
      border-color: var(--border-default);
    }

    .action-link--primary {
      background: var(--bg-surface-1);
      border-color: var(--border-default);
    }

    .action-button {
      border: none;
      background: transparent;
      color: var(--fg-muted);
      cursor: pointer;
    }

    .action-button:hover {
      background: var(--bg-surface-1);
      color: var(--fg-default);
    }

    .action-link:focus-visible,
    .action-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    @keyframes not-found-page-enter {
      from {
        opacity: 0;
        transform: translateY(var(--space-2, 8px));
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: no-preference) {
      .not-found-page__inner {
        animation: not-found-page-enter var(--duration-normal, 180ms)
          var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) both;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .action-link,
      .action-button,
      .not-found-page__inner {
        transition: none;
        animation: none;
      }
    }

    @media (forced-colors: active) {
      .meta,
      .action-link {
        border-color: CanvasText;
      }

      .action-link,
      .action-button {
        forced-color-adjust: auto;
      }

      .action-link:focus-visible,
      .action-button:focus-visible {
        outline-color: Highlight;
      }
    }

    @media (max-width: 640px) {
      .not-found-page {
        padding-inline: var(--space-3, 12px);
      }

      .actions {
        align-items: stretch;
      }

      .action-link,
      .action-button {
        inline-size: 100%;
      }
    }
  `;

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

  private _handleBackClick = (): void => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(SEARCH_PAGE_HREF);
  };

  override render() {
    const requestedPath = this._resolvedRequestedPath;

    return html`
      <section class="not-found-page" aria-labelledby="not-found-page-title">
        <div class="not-found-page__inner">
          <p class="eyebrow">404</p>

          <h1 id="not-found-page-title" class="title">
            ${NOT_FOUND_PAGE_TITLE}
          </h1>

          <p class="description">
            ${NOT_FOUND_PAGE_DESCRIPTION}
          </p>

          ${requestedPath.length > 0
            ? html`
                <dl class="meta">
                  <div class="meta-row">
                    <dt class="meta-label">要求されたパス</dt>
                    <dd class="meta-value">
                      <code>${requestedPath}</code>
                    </dd>
                  </div>
                </dl>
              `
            : nothing}

          <nav class="actions" aria-label="404 navigation">
            <a class="action-link action-link--primary" href=${SEARCH_PAGE_HREF}>
              検索ページへ
            </a>
            <a class="action-link" href=${ABOUT_PAGE_HREF}>
              このサイトについて
            </a>
            <button class="action-button" type="button" @click=${this._handleBackClick}>
              前のページへ戻る
            </button>
          </nav>
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