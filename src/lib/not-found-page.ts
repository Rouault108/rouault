const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeAttr = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const NOT_FOUND_PAGE_TITLE = 'ページが見つかりません';
export const NOT_FOUND_PAGE_META_DESCRIPTION =
  'ページが見つかりません。検索またはサイト情報から再度辿ってください。';
export const NOT_FOUND_PAGE_DESCRIPTION =
  'URLが変更されたか、公開を終了したか、リンク先が誤っている可能性があります。検索またはサイト情報から再度辿ってください。';

export const SEARCH_PAGE_HREF = '/search/';
export const ABOUT_PAGE_HREF = '/about/';

export interface BuildNotFoundPageMarkupOptions {
  requestedPath?: string;
}

export function buildNotFoundPageMarkup(
  options: BuildNotFoundPageMarkupOptions = {},
): string {
  const requestedPath =
    typeof options.requestedPath === 'string' ? options.requestedPath.trim() : '';

  const requestedPathAttribute =
    requestedPath.length > 0
      ? ` requested-path="${escapeAttr(requestedPath)}"`
      : '';

  const requestedPathFallback =
    requestedPath.length > 0
      ? `<p class="not-found-page-fallback__path">要求されたパス: <code>${escapeHtml(requestedPath)}</code></p>`
      : '';

  return `
<not-found-page${requestedPathAttribute}>
  <div data-not-found-fallback class="not-found-page-fallback" role="status" aria-live="polite">
    <p class="not-found-page-fallback__eyebrow">404 / Not Found</p>
    <h1 class="not-found-page-fallback__title">${NOT_FOUND_PAGE_TITLE}</h1>
    <p class="not-found-page-fallback__description">${NOT_FOUND_PAGE_DESCRIPTION}</p>
    ${requestedPathFallback}
    <p class="not-found-page-fallback__links">
      <a href="${SEARCH_PAGE_HREF}">検索ページへ</a>
      <span aria-hidden="true">・</span>
      <a href="${ABOUT_PAGE_HREF}">このサイトについて</a>
    </p>
  </div>
</not-found-page>
  `.trim();
}