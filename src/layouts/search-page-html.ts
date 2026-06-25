import type { SearchState, StaticExploreSearchResponse } from '../../shared/search/search-types.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { buildSearchResultRenderHref } from '../search/normalize-search-result-url.js';
import { renderStaticIconHtml } from '../../shared/icons/render-static-icon-html.js';
import {
  createStaticRenderIdContext,
  type StaticRenderIdContext,
} from '../../shared/static-render-id-context.js';
import { escapeHtmlAttribute, escapeHtmlText, serializeHtmlAttributes } from './html-output.js';

const sortOptions = [
  ['relevance', '関連度順'],
  ['date-desc', '新しい順'],
] as const;

const tagModeOptions = [
  ['or', 'いずれか'],
  ['and', 'すべて'],
] as const;

const optionLabel = (
  options: readonly (readonly [string, string])[],
  selectedValue: string,
): string => options.find(([value]) => value === selectedValue)?.[1] ?? options[0]?.[1] ?? '';

const renderSearchChoiceMenu = (options: {
  readonly name: 'tagMode' | 'sort';
  readonly label: string;
  readonly selectedValue: string;
  readonly items: readonly (readonly [string, string])[];
  readonly ids: {
    readonly label: string;
    readonly current: string;
    readonly panel: string;
  };
  readonly valueDataAttribute: 'data-search-tag-mode-value' | 'data-search-sort-value';
}): string => {
  const currentLabel = optionLabel(options.items, options.selectedValue);
  const choiceKind = options.name === 'tagMode' ? 'tag-mode' : 'sort';
  return `
    <div class="search-choice-field" data-search-choice="${choiceKind}">
      <span id="${options.ids.label}" class="sort-label">${escapeHtmlText(options.label)}</span>
      <input
        type="hidden"
        name="${options.name}"
        value="${escapeHtmlAttribute(options.selectedValue)}"
        data-search-choice-value
        ${options.valueDataAttribute}
      >
      <details class="static-choice-menu search-choice-menu" data-static-choice-menu data-search-choice-menu="${choiceKind}">
        <summary
          class="static-choice-menu__trigger"
          aria-labelledby="${options.ids.label} ${options.ids.current}"
          aria-controls="${options.ids.panel}"
          aria-expanded="false"
          data-static-choice-trigger
        >
          <span id="${options.ids.current}" class="static-choice-menu__current" data-static-choice-current-label>${escapeHtmlText(currentLabel)}</span>
          ${renderStaticIconHtml('chevron-down', 'static-choice-menu__chevron')}
        </summary>
        <div
          id="${options.ids.panel}"
          class="static-choice-menu__panel"
          role="group"
          aria-labelledby="${options.ids.label}"
          data-static-choice-panel
        >
          <ul class="static-choice-menu__list">
            ${options.items
              .map(([value, label]) => {
                const selected = value === options.selectedValue;
                return `
                  <li>
                    <button
                      type="button"
                      class="static-choice-menu__item"
                      data-static-choice-item
                      data-value="${escapeHtmlAttribute(value)}"
                      data-selected="${String(selected)}"
                      aria-pressed="${String(selected)}"
                    >${escapeHtmlText(label)}</button>
                  </li>
                `;
              })
              .join('')}
          </ul>
        </div>
      </details>
    </div>
  `;
};

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

  const entries = [...allTags.entries()].sort((left, right) => {
    const leftSelected = selectedTags.includes(left[0]);
    const rightSelected = selectedTags.includes(right[0]);
    if (leftSelected !== rightSelected) {
      return leftSelected ? -1 : 1;
    }
    if (left[1] !== right[1]) {
      return right[1] - left[1];
    }
    return left[0].localeCompare(right[0], 'ja');
  });
  if (entries.length === 0) {
    return '<p class="filter-empty">選択できるタグはまだありません。</p>';
  }

  return entries
    .map(([tag, count]) => {
      const selected = selectedTags.includes(tag);
      const disabled = !selected && count === 0;
      return `
        <div
          class="filter-option"
          role="listitem"
          data-selected="${String(selected)}"
          data-disabled="${String(disabled)}"
          data-filter-option
          data-filter-tag="${escapeHtmlAttribute(tag)}"
          data-filter-count="${count.toString()}"
        >
          <label class="filter-option-checkbox">
            <input
              class="filter-option-checkbox__input"
              type="checkbox"
              name="tag"
              value="${escapeHtmlAttribute(tag)}"
              ${selected ? 'checked' : ''}
              ${disabled ? 'disabled' : ''}
              data-search-tag-checkbox
            >
            <span class="filter-option-checkbox__control" aria-hidden="true">
              ${renderStaticIconHtml('check', 'filter-option-checkbox__icon')}
            </span>
            <span class="filter-option-label">${escapeHtmlText(tag)}</span>
          </label>
          <span class="filter-option-count">${count.toString()}件</span>
        </div>
      `;
    })
    .join('');
};

const renderSelectedTags = (selectedTags: readonly string[]): string => {
  if (selectedTags.length === 0) {
    return '<p class="filter-empty" data-selected-tags-empty>まだタグは選択されていません。</p>';
  }
  return selectedTags
    .map(
      (tag) => `
        <span class="selected-tag" data-selected-tag="${escapeHtmlAttribute(tag)}">
          <span class="selected-tag__label">${escapeHtmlText(tag)}</span>
          <button
            class="selected-tag__remove"
            type="button"
            aria-label="${escapeHtmlAttribute(`${tag}を解除`)}"
            data-search-selected-tag-remove="${escapeHtmlAttribute(tag)}"
          >${renderStaticIconHtml('x', 'selected-tag__remove-icon')}</button>
        </span>
      `,
    )
    .join('');
};

const renderFilterSummaryDetail = (selectedTags: readonly string[]): string => {
  if (selectedTags.length === 0) {
    return '必要な時だけ展開して絞り込めます。';
  }
  const head = selectedTags.slice(0, 2).join(' / ');
  const rest = selectedTags.length > 2 ? ` / ほか${String(selectedTags.length - 2)}件` : '';
  return `${head}${rest}`;
};

const renderEmptyState = (state: SearchState): string => {
  const hasConditions = state.q.length > 0 || state.tags.length > 0;
  const heading = hasConditions
    ? '一致するメモが見つかりません'
    : 'キーワードまたはタグで絞り込めます';
  const description = hasConditions
    ? '検索語を変えるか、タグの組み合わせや演算子を見直してください。'
    : 'ヘッダーのダイアログは即時検索、ここではタグ演算子も含めて一覧で比較できます。';
  return `
    <section class="empty-hint" data-empty-state data-search-empty-state data-empty-variant="search">
      <div class="empty-hint__message" data-announce="off">
        <div class="empty-hint__illustration" aria-hidden="true" hidden></div>
        <div class="empty-hint__icon" aria-hidden="true" hidden></div>
        <h2 class="empty-hint__heading">${escapeHtmlText(heading)}</h2>
        <p class="empty-hint__description">${escapeHtmlText(description)}</p>
      </div>
      <div class="empty-hint__actions" hidden></div>
    </section>
  `.trim();
};

const renderSnippetHtml = (item: StaticExploreSearchResponse['items'][number]): string => {
  if (item.snippet) {
    return item.snippet.segments
      .map((segment) =>
        segment.matched
          ? `<mark>${escapeHtmlText(segment.text)}</mark>`
          : escapeHtmlText(segment.text),
      )
      .join('');
  }
  return escapeHtmlText(item.description);
};

const renderResults = (
  response: StaticExploreSearchResponse,
  state: SearchState,
  siteUrlContext: SiteUrlContext,
): string => {
  if (response.items.length === 0) {
    return renderEmptyState(state);
  }

  return `<ol class="results-list" data-search-results>${response.items
    .map((item) => {
      const href = buildSearchResultRenderHref({
        canonicalPathname: item.canonicalPathname,
        siteUrlContext,
      });
      const description = renderSnippetHtml(item);
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
              ${description.trim().length > 0 ? `<p class="result-excerpt">${description}</p>` : ''}
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
  readonly siteUrlContext: SiteUrlContext;
  readonly loading?: boolean;
  readonly idContext?: StaticRenderIdContext;
}): string => {
  const { initialState, initialResponse, siteUrlContext, loading = false } = options;
  const idContext = options.idContext ?? createStaticRenderIdContext('page:search');
  const queryInputId = idContext.reserveId('search-page', 'search-page-query');
  const tagModeLabelId = idContext.reserveId('search-page', 'search-page-tag-mode-label');
  const tagModeCurrentId = idContext.reserveId('search-page', 'search-page-tag-mode-current');
  const tagModePanelId = idContext.reserveId('search-page', 'search-page-tag-mode-panel');
  const sortLabelId = idContext.reserveId('search-page', 'search-page-sort-label');
  const sortCurrentId = idContext.reserveId('search-page', 'search-page-sort-current');
  const sortPanelId = idContext.reserveId('search-page', 'search-page-sort-panel');
  const selectedTagsHeadingId = idContext.reserveId('search-page', 'selected-tags-heading');
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
              : 'タグとキーワードを組み合わせ、複数タグはOR / ANDを切り替えて探索します。'
          }</p>
        </div>

        <form class="search-controls" role="search" data-search-page-form>
          <label class="sr-only" for="${queryInputId}">検索</label>
          <div class="search-input-field" data-static-search-field>
            ${renderStaticIconHtml('search', 'search-input-field__icon')}
            <input
              id="${queryInputId}"
              class="search-input-control"
              type="search"
              name="q"
              autocomplete="off"
              placeholder="メモを検索"
              value="${escapeHtmlAttribute(initialState.q)}"
              data-search-query-input
            >
            <button class="search-input-clear" type="button" aria-label="検索語をクリア" hidden data-search-query-clear>
              ${renderStaticIconHtml('x', 'search-input-clear__icon')}
            </button>
          </div>

          <div class="toolbar-row">
            <div class="meta-row"><span data-search-page-result-count>${initialResponse.total.toString()}件の結果</span></div>
            ${renderSearchChoiceMenu({
              name: 'tagMode',
              label: 'タグ演算子',
              selectedValue: initialState.tagMode,
              items: tagModeOptions,
              ids: {
                label: tagModeLabelId,
                current: tagModeCurrentId,
                panel: tagModePanelId,
              },
              valueDataAttribute: 'data-search-tag-mode-value',
            })}
            ${renderSearchChoiceMenu({
              name: 'sort',
              label: '並び順',
              selectedValue: initialState.sort,
              items: sortOptions,
              ids: {
                label: sortLabelId,
                current: sortCurrentId,
                panel: sortPanelId,
              },
              valueDataAttribute: 'data-search-sort-value',
            })}
          </div>

          <details class="filter-details" data-details data-variant="bordered">
            <summary class="filter-details__summary">
              <span class="filter-summary">
                <span class="filter-summary-main"><span>タグで絞り込む</span></span>
                <span class="filter-summary-meta">
                  <span class="filter-summary-state">${
                    initialState.tags.length > 0
                      ? `${initialState.tags.length.toString()}タグ選択中 / ${initialState.tagMode === 'and' ? 'すべて' : 'いずれか'}`
                      : 'すべてのタグ'
                  }</span>
                  <span class="filter-summary-detail">${escapeHtmlText(renderFilterSummaryDetail(initialState.tags))}</span>
                </span>
              </span>
              ${renderStaticIconHtml('chevron-right', 'filter-details__chevron')}
            </summary>
            <div class="filter-panel" aria-label="タグフィルター">
              <section class="filter-section" aria-labelledby="${selectedTagsHeadingId}">
                <div class="filter-section-header">
                  <h2 id="${selectedTagsHeadingId}" class="filter-section-title">選択中タグ</h2>
                  <span class="filter-section-meta" data-selected-tags-count>${initialState.tags.length.toString()}件</span>
                </div>
                <div class="selected-tags" data-selected-tags>${renderSelectedTags(initialState.tags)}</div>
              </section>
              <section class="filter-section" aria-labelledby="filter-list-heading">
                <div class="filter-list-header">
                  <h2 id="filter-list-heading" class="filter-section-title">タグを絞り込む</h2>
                  <span class="filter-section-meta" data-filter-visible-count>${Object.keys(initialResponse.allTagCounts).length.toString()} / ${Object.keys(initialResponse.allTagCounts).length.toString()}タグ</span>
                </div>
                <label class="sr-only" for="search-page-filter-query">タグを絞り込む</label>
                <div class="filter-search-field" data-static-search-field>
                  ${renderStaticIconHtml('search', 'filter-search-field__icon')}
                  <input id="search-page-filter-query" class="filter-search-control" type="search" autocomplete="off" placeholder="タグ名で絞り込む" data-search-filter-input>
                  <button class="filter-search-field__clear" type="button" aria-label="タグ絞り込みをクリア" hidden data-search-filter-clear>
                    ${renderStaticIconHtml('x', 'filter-search-field__clear-icon')}
                  </button>
                </div>
                <div class="filter-list" role="list" data-search-filter-list>${renderTagCheckboxes(initialResponse, initialState.tags)}</div>
                <p class="filter-empty" hidden data-search-filter-empty>一致するタグはありません。</p>
              </section>
            </div>
          </details>
        </form>

        <div class="search-page__loading" role="status" aria-live="polite" ${loading ? '' : 'hidden'} data-search-page-loading>
          <span class="search-page__spinner" aria-hidden="true"></span>
          <span class="search-page__loading-label">検索インデックスを照会しています...</span>
        </div>
        <div class="search-page__error" role="status" aria-live="polite" hidden data-search-page-error></div>
        <div class="search-page__unavailable" role="status" aria-live="polite" hidden data-search-page-unavailable></div>
        <div class="results-section" data-search-page-results-section>${renderResults(initialResponse, initialState, siteUrlContext)}</div>
      </div>
    </section>
  `.trim();
};
