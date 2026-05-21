import type { SearchState } from '../../shared/search/search-types.js';
import type { StaticExploreSearchResponse } from '../../build/search/build-static-explore-response.js';
import { buildSearchResultRenderHref } from '../search/normalize-search-result-url.js';
import { createSiteUrlContext } from '../../shared/site/site-url-context.js';
import { escapeHtmlAttribute, escapeHtmlText, serializeHtmlAttributes } from './html-output.js';

const sortOptions = [
  ['relevance', '関連度順'],
  ['date-desc', '新しい順'],
] as const;

const tagModeOptions = [
  ['or', 'いずれか'],
  ['and', 'すべて'],
] as const;

const renderOption = (value: string, label: string, selectedValue: string): string =>
  `<option value="${escapeHtmlAttribute(value)}"${value === selectedValue ? ' selected' : ''}>${escapeHtmlText(
    label,
  )}</option>`;

const renderTagCheckboxes = (
  response: StaticExploreSearchResponse,
  selectedTags: readonly string[],
): string => {
  const allTags = new Map<string, number>(Object.entries(response.allTagCounts));
  for (const [tag, count] of Object.entries(response.tagCounts)) {
    allTags.set(tag, count);
  }
  for (const tag of selectedTags) {
    if (!allTags.has(tag)) {
      allTags.set(tag, 0);
    }
  }

  const entries = [...allTags.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja'));
  if (entries.length === 0) {
    return '<p class="filter-empty">選択できるタグはまだありません。</p>';
  }

  return entries
    .map(([tag, count]) => {
      const selected = selectedTags.includes(tag);
      return `
        <label class="filter-option" data-selected="${String(selected)}">
          <span>
            <input type="checkbox" name="tag" value="${escapeHtmlAttribute(tag)}"${
              selected ? ' checked' : ''
            } data-search-tag-checkbox>
            ${escapeHtmlText(tag)}
          </span>
          <span class="filter-option-count">${count.toString()}件</span>
        </label>
      `;
    })
    .join('');
};

const renderResults = (response: StaticExploreSearchResponse): string => {
  if (response.items.length === 0) {
    return `
      <section class="empty-hint" data-search-empty-state>
        <h2>キーワードまたはタグで絞り込めます</h2>
        <p>ヘッダーのダイアログは即時検索、ここではタグ演算子も含めて一覧で比較できます。</p>
      </section>
    `.trim();
  }

  const siteUrlContext = createSiteUrlContext({ siteOrigin: 'https://rouault.invalid', basePath: '' });
  return `<ol class="results-list" data-search-results>${response.items
    .map((item) => {
      const href = buildSearchResultRenderHref({
        canonicalPathname: item.canonicalPathname,
        siteUrlContext,
      });
      const description = item.snippet?.segments.map((segment) => segment.text).join('') ?? item.description;
      return `
        <li>
          <article class="result-card" data-search-result-card>
            <a class="result-link" href="${escapeHtmlAttribute(href)}" data-link-kind="internal-document" data-link-surface="card">
              <div class="result-path">${escapeHtmlText(item.pathLabel)}</div>
              <h2 class="result-title">${escapeHtmlText(item.title)}</h2>
              ${
                item.date.original
                  ? `<div class="result-meta">更新日: ${escapeHtmlText(item.date.original)}</div>`
                  : ''
              }
              ${description.trim().length > 0 ? `<p class="result-excerpt">${escapeHtmlText(description)}</p>` : ''}
            </a>
          </article>
        </li>
      `;
    })
    .join('')}</ol>`;
};

export const renderSearchPageHtml = (options: {
  readonly initialState: SearchState;
  readonly initialResponse: StaticExploreSearchResponse;
}): string => {
  const { initialState, initialResponse } = options;
  const isTagDefaultView =
    initialState.q.length === 0 &&
    initialState.tags.length === 1 &&
    initialState.tagMode === 'or' &&
    initialState.sort === 'relevance';
  const title = isTagDefaultView ? `#${initialState.tags[0] ?? ''}` : '検索';

  return `
    <noscript>
      <p class="noscript-notice">検索・フィルタ機能にはJavaScriptが必要です。</p>
    </noscript>
    <section data-hydration-scope="search-page">
      <div
        class="search-page page-shell"
        aria-label="検索結果"
        data-search-page-root
        data-hydration-key="search-page-enhancer"
        ${serializeHtmlAttributes([
          { name: 'initial-search-state-json', value: initialState, kind: 'json' },
          { name: 'initial-search-response-json', value: initialResponse, kind: 'json' },
          { name: 'data-hydration-capability', value: 'interactive' },
          { name: 'data-hydration-trigger', value: 'initial' },
        ])}
      >
        <div class="hero">
          <p class="eyebrow">${isTagDefaultView ? 'Tag / Explore' : 'Search / Filter'}</p>
          <h1 class="heading">${escapeHtmlText(title)}</h1>
          <p class="description">${
            isTagDefaultView
              ? 'このタグに属するノートを起点に、検索語や追加タグで探索を広げられます。'
              : 'タグとキーワードを組み合わせ、複数タグは OR / AND を切り替えて探索します。'
          }</p>
        </div>

        <form class="search-controls" role="search" data-search-page-form>
          <label class="sr-only" for="search-page-query">検索</label>
          <input
            id="search-page-query"
            class="search-input-control"
            type="search"
            name="q"
            autocomplete="off"
            placeholder="メモを検索"
            value="${escapeHtmlAttribute(initialState.q)}"
            data-search-query-input
          >

          <div class="toolbar-row">
            <div class="meta-row"><span>${initialResponse.total.toString()} 件の結果</span></div>
            <label class="sort-field">
              <span class="sort-label">タグ演算子</span>
              <select class="sort-select" name="tagMode" data-ui-select data-search-tag-mode-select>
                ${tagModeOptions.map(([value, label]) => renderOption(value, label, initialState.tagMode)).join('')}
              </select>
            </label>
            <label class="sort-field">
              <span class="sort-label">並び順</span>
              <select class="sort-select" name="sort" data-ui-select data-search-sort-select>
                ${sortOptions.map(([value, label]) => renderOption(value, label, initialState.sort)).join('')}
              </select>
            </label>
          </div>

          <details class="filter-details" data-details>
            <summary>
              <span>タグで絞り込む</span>
              <span>${initialState.tags.length.toString()} 件選択中</span>
            </summary>
            <div class="filter-panel" aria-label="タグフィルター">
              <div class="filter-list" role="list">${renderTagCheckboxes(initialResponse, initialState.tags)}</div>
            </div>
          </details>
        </form>

        <div class="results-section">${renderResults(initialResponse)}</div>
      </div>
    </section>
  `.trim();
};
