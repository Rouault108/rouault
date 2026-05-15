import { escapeHtmlText, serializeHtmlAttributes } from '../../../src/layouts/html-output.js';

export const SEARCH_PAGE_HREF = '/search/';
export const ABOUT_PAGE_HREF = '/about/';

export const NOT_FOUND_PAGE_TITLE = 'このページは見つかりませんでした';
export const NOT_FOUND_PAGE_DESCRIPTION =
  'リンク先が移動したか、いまは公開されていないようです。検索またはサイト情報から辿り直してください。';
export const NOT_FOUND_PAGE_META_DESCRIPTION =
  'リンク先が移動したか、公開が終了したため、このページは見つかりませんでした。検索またはサイト情報から辿り直してください。';

export interface BuildNotFoundPageMarkupOptions {
  requestedPath?: string;
}

const renderRequestedPath = (requestedPath: string): string => {
  const normalized = requestedPath.trim();
  if (normalized.length === 0) {
    return '';
  }

  return `
      <dl class="not-found-page-fallback__meta">
        <div class="not-found-page-fallback__meta-row">
          <dt class="not-found-page-fallback__meta-label">要求されたパス</dt>
          <dd class="not-found-page-fallback__meta-value">
            <code>${escapeHtmlText(normalized)}</code>
          </dd>
        </div>
      </dl>
    `;
};

export const buildNotFoundPageMarkup = (options: BuildNotFoundPageMarkupOptions = {}): string => {
  const requestedPath = options.requestedPath?.trim() ?? '';
  const hostAttributes = serializeHtmlAttributes([
    { name: 'requested-path', value: requestedPath.length > 0 ? requestedPath : null },
  ]);

  return `
<not-found-page${hostAttributes}>
  <style>
    not-found-page {
      display: block;
      color: var(--fg-default);
    }

    .not-found-page-fallback:not(.home-shell) {
      box-sizing: border-box;
      width: min(100%, 72rem);
      margin: 0 auto;
      padding:
        var(--home-shell-padding-block-start, var(--page-content-padding-block-start, var(--space-8, 32px)))
        var(--page-shell-padding-inline, clamp(var(--space-4, 16px), 2vw, var(--space-6, 24px)))
        var(--home-shell-padding-block-end, var(--space-12, 48px));
    }

    .not-found-page-fallback__inner {
      inline-size: min(100%, 42rem);
      display: grid;
      gap: var(--space-6, 24px);
    }

    .not-found-page-fallback__eyebrow {
      margin: 0;
      color: var(--fg-muted);
      font-family: var(--font-mono);
      font-size: var(--text-xs, 12px);
      letter-spacing: var(--tracking-wider, 0.03em);
      line-height: var(--line-height-none, 1);
      text-transform: uppercase;
    }

    .not-found-page-fallback__title {
      margin: 0;
      color: var(--fg-default);
      font-family: var(--font-sans);
      font-size: clamp(var(--text-2xl, 24px), 2.4vw, var(--text-3xl, 30px));
      font-weight: var(--font-semibold, 600);
      letter-spacing: var(--tracking-tight, -0.015em);
      line-height: var(--line-height-tight, 1.25);
      text-wrap: balance;
    }

    .not-found-page-fallback__description {
      margin: 0;
      max-inline-size: 40rem;
      color: var(--fg-muted);
      font-size: var(--text-base, 14px);
      line-height: var(--line-height-relaxed, 1.75);
      text-wrap: pretty;
    }

    .not-found-page-fallback__meta {
      margin: 0;
      padding-top: var(--space-4, 16px);
      border-top: var(--border-width, 1px) solid var(--border-muted);
    }

    .not-found-page-fallback__meta-row {
      display: grid;
      gap: var(--space-2, 8px);
      margin: 0;
    }

    .not-found-page-fallback__meta-label {
      margin: 0;
      color: var(--fg-muted);
      font-size: var(--text-xs, 12px);
      line-height: var(--line-height-normal, 1.5);
    }

    .not-found-page-fallback__meta-value {
      margin: 0;
      color: var(--fg-default);
      font-family: var(--font-mono);
      font-size: var(--text-xs, 12px);
      line-height: var(--line-height-normal, 1.5);
      word-break: break-all;
    }

    .not-found-page-fallback__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3, 12px);
      align-items: center;
    }

    .not-found-page-fallback__link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-block-size: var(--control-min-touch, 44px);
      padding-inline: var(--space-4, 16px);
      border: var(--border-width, 1px) solid var(--border-muted);
      border-radius: var(--radius-full, 9999px);
      background: transparent;
      color: var(--fg-default);
      font-size: var(--text-sm, 13px);
      line-height: 1;
      text-decoration: none;
      transition:
        background-color var(--duration-fast, 120ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)),
        border-color var(--duration-fast, 120ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)),
        color var(--duration-fast, 120ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1));
    }

    .not-found-page-fallback__link[href] {
      color: var(--fg-default);
      text-decoration: none;
      text-decoration-line: none;
    }

    .not-found-page-fallback__link[href]:visited {
      color: var(--fg-default);
    }

    .not-found-page-fallback__link:hover {
      background: var(--bg-surface-1);
      border-color: var(--border-default);
    }

    .not-found-page-fallback__link:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .not-found-page-fallback__link--primary {
      background: var(--bg-surface-1);
      border-color: var(--border-default);
    }

    @media (prefers-reduced-motion: reduce) {
      .not-found-page-fallback__link {
        transition: none;
      }
    }

    @media (forced-colors: active) {
      .not-found-page-fallback__meta,
      .not-found-page-fallback__link {
        border-color: CanvasText;
      }

      .not-found-page-fallback__link:focus-visible {
        outline-color: Highlight;
      }
    }

    @media (max-width: 639px) {
      .not-found-page-fallback:not(.home-shell) {
        padding-inline: var(--space-3, 12px);
      }

      .not-found-page-fallback__actions {
        align-items: stretch;
      }

      .not-found-page-fallback__link {
        inline-size: 100%;
      }
    }
  </style>

  <section
    data-not-found-fallback
    class="home-shell not-found-page-fallback"
    aria-labelledby="not-found-page-title"
  >
    <div class="not-found-page-fallback__inner">
      <p class="not-found-page-fallback__eyebrow">404</p>
      <h1 id="not-found-page-title" class="not-found-page-fallback__title">
        ${NOT_FOUND_PAGE_TITLE}
      </h1>
      <p class="not-found-page-fallback__description">
        ${NOT_FOUND_PAGE_DESCRIPTION}
      </p>
      ${renderRequestedPath(requestedPath)}
      <nav class="not-found-page-fallback__actions" aria-label="404 navigation">
        <a
          class="not-found-page-fallback__link not-found-page-fallback__link--primary"
          href="${SEARCH_PAGE_HREF}"
        >
          検索ページへ
        </a>
        <a class="not-found-page-fallback__link" href="${ABOUT_PAGE_HREF}">
          このサイトについて
        </a>
      </nav>
    </div>
  </section>
</not-found-page>
  `.trim();
};
