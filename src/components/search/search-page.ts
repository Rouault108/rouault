import { css, html, LitElement, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import '../ui/icon/icon';
import '../../components/ui/card/card.js';
import '../../components/ui/checkbox/checkbox.js';
import '../../components/ui/details/details.js';
import '../../components/ui/empty-state/empty-state.js';
import '../../components/ui/search-field/search-field.js';
import '../../components/ui/select/select.js';
import '../../components/ui/spinner/spinner.js';
import '../../components/ui/tag/tag.js';
import type { SelectOption } from '../../components/ui/select/select.js';
import { HIGHLIGHT_RULE_TEMPLATE } from '../ui/highlight/highlight.js';
import { pageShellStyles } from '../page/page-shell-styles.js';
import type { SearchCore } from '../../search/search-core.js';
import { getInitializedSearchCore, getInitializedSearchRoutePredicate } from '../../search/bootstrap.js';
import { buildSearchResultRenderHref } from '../../search/normalize-search-result-url.js';
import { createSearchJsonParseDiagnosticSink } from '../../../shared/search/search-diagnostics.js';
import { parseStaticExploreSearchResponseJson } from '../../../shared/search/search-json-artifact-parser.js';
import { navigateInternalDocument } from '../../router/navigate-internal-document.js';
import {
  DEFAULT_SEARCH_SORT_MODE,
  DEFAULT_SEARCH_TAG_MODE,
  buildUrlForSearchState,
  isSingleTagDefaultState,
  normalizeSearchTags,
  parseSearchStateFromUrl,
  type SearchState,
  type SearchTagMode,
  type SearchSortMode,
} from '../../../shared/search/search-url.js';
import type {
  ExploreSearchResponse,
  SearchResultItem,
  SearchSnippet,
} from '../../../shared/search/search-types.js';
import { createSiteUrlContext, type SiteUrlContext } from '../../../shared/site/site-url-context.js';

const SEARCH_DEBOUNCE_MS = 150;
const SEARCH_SORT_OPTIONS: SelectOption[] = [
  { value: DEFAULT_SEARCH_SORT_MODE, label: '関連度順' },
  { value: 'date-desc', label: '新しい順' },
];
const SEARCH_TAG_MODE_OPTIONS: SelectOption[] = [
  { value: 'or', label: 'いずれか' },
  { value: 'and', label: 'すべて' },
];

type SearchControlTarget = EventTarget & { value: unknown };

interface GenreFilterEntry {
  tag: string;
  count: number;
  selected: boolean;
  disabled: boolean;
}

function isSameSearchState(left: SearchState, right: SearchState): boolean {
  return (
    left.q === right.q &&
    left.tagMode === right.tagMode &&
    left.sort === right.sort &&
    left.tags.length === right.tags.length &&
    left.tags.every((tag, index) => tag === right.tags[index])
  );
}

@customElement('search-page')
export class SearchPage extends LitElement {
  private _searchRuntime: SearchCore | null = null;
  private _siteUrlContext: SiteUrlContext | null = null;

  static override styles = [
    pageShellStyles,
    css`
      .search-controls {
        display: grid;
        gap: var(--space-4, 16px);
        margin-top: var(--space-6, 24px);
      }

      .search-input-control {
        --ui-search-field-height: 3rem;
        --ui-search-field-radius: var(--radius-lg, 12px);
        --ui-search-field-bg: var(--bg-surface-2);
        --ui-search-field-border-width: var(--border-width, 1px);
        --ui-search-field-border-color: var(--border-default);
      }

      .toolbar-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4, 16px);
        margin: 0;
      }

      .sort-label {
        color: var(--fg-muted);
      }

      .sort-label {
        color: var(--fg-default);
      }

      .sort-select {
        min-inline-size: 10rem;
        --control-height-md: 2.25rem;
      }

      .filter-details {
        display: block;
        --ui-details-icon-align-self: center;
        --ui-details-icon-offset-block-start: 0px;
      }

      .filter-details::part(trigger) {
        padding: var(--space-3, 12px) var(--space-4, 16px);
      }

      .filter-details::part(summary) {
        display: block;
        inline-size: 100%;
      }

      .filter-details::part(content) {
        margin-left: 0;
        padding: 0 var(--space-4, 16px) var(--space-4, 16px);
      }

      .filter-summary {
        inline-size: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--space-3, 12px);
      }

      .filter-summary-main {
        min-width: 0;
        display: inline-flex;
        align-items: center;
        gap: var(--space-1, 4px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default);
      }

      .filter-summary-meta {
        min-width: 0;
        display: grid;
        justify-items: end;
        gap: 2px;
        color: var(--fg-muted);
        text-align: right;
      }

      .filter-summary-state {
        color: var(--fg-default);
        font-size: var(--text-sm, 13px);
        line-height: 1.3;
      }

      .filter-summary-detail {
        font-size: var(--text-xs, 12px);
        line-height: 1.3;
        white-space: normal;
        max-inline-size: min(24rem, 100%);
      }

      .filter-panel {
        display: grid;
        gap: var(--space-5, 20px);
        padding-top: var(--space-2, 8px);
      }

      .filter-section {
        display: grid;
        gap: var(--space-3, 12px);
      }

      .filter-section-header,
      .filter-list-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2, 8px);
      }

      .filter-section-title {
        margin: 0;
        color: var(--fg-default);
        font-size: var(--text-sm, 13px);
        font-weight: var(--font-medium, 500);
        line-height: 1.4;
      }

      .filter-section-meta {
        color: var(--fg-muted);
        font-size: var(--text-xs, 12px);
        line-height: 1.4;
      }

      .selected-tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2, 8px);
      }

      .selected-tag {
        --radius-sm: 999px;
      }

      .filter-empty {
        margin: 0;
        color: var(--fg-muted);
        font-size: var(--text-sm, 13px);
        line-height: 1.6;
      }

      .filter-search-field {
        --ui-search-field-height: 2.5rem;
        --ui-search-field-radius: var(--radius-md, 8px);
        --ui-search-field-bg: var(--bg-surface-2);
        --ui-search-field-border-width: var(--border-width, 1px);
        --ui-search-field-border-color: var(--border-default);
        --ui-search-field-font-size: var(--text-base, 14px);
      }

      .filter-list {
        display: grid;
        gap: var(--space-2, 8px);
        max-block-size: min(22rem, 50vh);
        padding-right: var(--space-1, 4px);
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .filter-option {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--space-3, 12px);
        padding: var(--space-3, 12px);
        border: var(--border-width, 1px) solid var(--border-default);
        border-radius: var(--radius-md, 8px);
        background: var(--bg-surface-2);
        transition:
          border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
          background-color var(--duration-fast, 70ms)
            var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
          color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
      }

      .filter-option[data-selected='true'] {
        border-color: var(--border-info-subtle);
        background: var(--bg-info-subtle);
      }

      .filter-option[data-selected='true'] .filter-option-count {
        color: var(--fg-info);
      }

      @media (prefers-color-scheme: dark) {
        .filter-option {
          --search-filter-option-selected-accent: oklch(
            65% var(--chroma-high, 0.2) var(--hue-blue, 230)
          );
          --search-filter-option-selected-border: oklch(45% 0.07 var(--hue-blue, 230));
          --search-filter-option-selected-bg: oklch(25% 0.03 var(--hue-blue, 230));
        }
      }

      :host-context([data-theme='dark']) .filter-option {
        --search-filter-option-selected-accent: oklch(
          65% var(--chroma-high, 0.2) var(--hue-blue, 230)
        );
        --search-filter-option-selected-border: oklch(45% 0.07 var(--hue-blue, 230));
        --search-filter-option-selected-bg: oklch(25% 0.03 var(--hue-blue, 230));
      }

      .filter-option[data-selected='true'] {
        border-color: var(--search-filter-option-selected-border);
        background: var(--search-filter-option-selected-bg);
      }

      .filter-option[data-disabled='true'] {
        opacity: 0.68;
      }

      .filter-option-checkbox {
        inline-size: 100%;
      }

      .filter-option-count {
        color: var(--fg-muted);
        font-size: var(--text-sm, 13px);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .loading {
        display: flex;
        align-items: center;
        gap: var(--space-3, 12px);
        color: var(--fg-muted);
        font-size: var(--text-sm, 13px);
      }

      ${unsafeCSS(HIGHLIGHT_RULE_TEMPLATE('.result-excerpt :where(mark)'))}

      .empty-hint {
        min-height: 25vh;
      }

      @media (max-width: 768px) {
        .toolbar-row {
          margin: 0;
        }

        .sort-field {
          width: 100%;
          grid-template-columns: 1fr;
        }

        .sort-select {
          min-inline-size: 0;
        }

        .filter-summary-meta {
          max-inline-size: 100%;
          justify-items: start;
          text-align: left;
        }

        .filter-summary {
          grid-template-columns: 1fr;
        }

        .filter-list {
          max-block-size: min(18rem, 45vh);
        }
      }
    `,
  ];

  @property({ type: String, attribute: 'initial-search-state-json' })
  initialSearchStateJson = '';

  @property({ type: String, attribute: 'initial-search-response-json' })
  initialSearchResponseJson = '';

  @state()
  private _query = '';

  @state()
  private _selectedTags: string[] = [];

  @state()
  private _tagMode: SearchTagMode = DEFAULT_SEARCH_TAG_MODE;

  @state()
  private _sortMode: SearchSortMode = DEFAULT_SEARCH_SORT_MODE;

  @state()
  private _results: SearchResultItem[] = [];

  @state()
  private _loading = false;

  @state()
  private _loaded = false;

  @state()
  private _errorMessage = '';

  @state()
  private _tagCounts: Record<string, number> = {};

  @state()
  private _allTagCounts: Record<string, number> = {};

  @state()
  private _filterQuery = '';

  @state()
  private _filtersOpen = false;

  private _searchTimerId: number | undefined;
  private _requestToken = 0;
  private _didApplyInitialPayload = false;

  protected override willUpdate(_changedProperties: PropertyValues): void {
    if (this._didApplyInitialPayload) {
      return;
    }

    const initialState = this._parseInitialState();
    const initialResponse = this._parseInitialResponse();

    if (initialState) {
      this._query = initialState.q;
      this._selectedTags = initialState.tags;
      this._tagMode = initialState.tagMode;
      this._sortMode = initialState.sort;
    }

    if (initialResponse?.mode === 'explore') {
      this._results = initialResponse.items;
      this._tagCounts = initialResponse.tagCounts;
      this._allTagCounts = initialResponse.allTagCounts;
      this._loaded = true;
    }

    this._didApplyInitialPayload = true;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('popstate', this._onPopState);
    this._syncStateFromLocation();
    if (this._canUseInitialPayload()) {
      return;
    }
    void this._refreshResults();
  }

  override disconnectedCallback(): void {
    window.removeEventListener('popstate', this._onPopState);
    if (typeof this._searchTimerId === 'number') {
      window.clearTimeout(this._searchTimerId);
      this._searchTimerId = undefined;
    }
    super.disconnectedCallback();
  }

  private _onPopState = (): void => {
    this._syncStateFromLocation();
    void this._refreshResults();
  };

  private _syncStateFromLocation(): void {
    const url = new URL(window.location.href);
    const state = parseSearchStateFromUrl(url);

    this._query = state.q;
    this._selectedTags = state.tags;
    this._tagMode = state.tagMode;
    this._sortMode = state.sort;
  }

  private _scheduleRefresh(): void {
    if (typeof this._searchTimerId === 'number') {
      window.clearTimeout(this._searchTimerId);
    }

    this._searchTimerId = window.setTimeout(() => {
      void this._refreshResults();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async _refreshResults(): Promise<void> {
    const currentToken = ++this._requestToken;
    this._loading = true;
    this._errorMessage = '';

    try {
      const result = await this._getSearchRuntime().search({
        mode: 'explore',
        q: this._query,
        tags: this._selectedTags,
        tagMode: this._tagMode,
        sort: this._sortMode,
      });
      if (currentToken !== this._requestToken) {
        return;
      }

      if (result.mode !== 'explore') {
        throw new Error('explore モードの検索応答が必要です。');
      }

      this._results = result.items;
      this._tagCounts = result.tagCounts;
      this._allTagCounts = result.allTagCounts;
      this._loaded = true;
      if (result.diagnostics.degraded) {
        console.warn('[search-page] 検索結果が縮退状態です', result.diagnostics);
      }
    } catch (error: unknown) {
      if (currentToken !== this._requestToken) {
        return;
      }

      this._results = [];
      this._tagCounts = {};
      this._errorMessage =
        error instanceof Error ? error.message : '検索の読み込みに失敗しました。';
      this._loaded = true;
    } finally {
      if (currentToken === this._requestToken) {
        this._loading = false;
      }
    }
  }

  private _currentSearchState(): SearchState {
    return {
      q: this._query,
      tags: this._selectedTags,
      tagMode: this._tagMode,
      sort: this._sortMode,
    };
  }

  private _canUseInitialPayload(): boolean {
    const initialState = this._parseInitialState();
    const initialResponse = this._parseInitialResponse();
    if (initialState === null || initialResponse?.mode !== 'explore') {
      return false;
    }

    return isSameSearchState(initialState, this._currentSearchState());
  }

  private _replaceUrl(): void {
    const nextUrl = buildUrlForSearchState(this._currentSearchState());

    if (nextUrl === `${window.location.pathname}${window.location.search}`) {
      return;
    }

    history.replaceState(history.state, '', nextUrl);
  }

  private _pushUrl(): void {
    const nextUrl = buildUrlForSearchState(this._currentSearchState());

    if (nextUrl === `${window.location.pathname}${window.location.search}`) {
      return;
    }

    history.pushState(history.state, '', nextUrl);
  }

  private _readControlValue(target: EventTarget | null): string | null {
    if (target === null || typeof target !== 'object' || !('value' in target)) {
      return null;
    }

    const { value } = target as SearchControlTarget;
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return null;
  }

  private _onInput = (event: Event): void => {
    const nextValue = this._readControlValue(event.currentTarget ?? event.target);
    if (nextValue === null) {
      return;
    }

    this._query = nextValue;
    this._replaceUrl();
    this._scheduleRefresh();
  };

  private _onFilterInput = (event: Event): void => {
    const nextValue = this._readControlValue(event.currentTarget ?? event.target);
    if (nextValue === null) {
      return;
    }

    this._filterQuery = nextValue;
  };

  private _toggleTag(tag: string): void {
    const normalized = normalizeSearchTags(
      this._selectedTags.includes(tag)
        ? this._selectedTags.filter((value) => value !== tag)
        : [...this._selectedTags, tag],
    );

    this._selectedTags = normalized;
    this._pushUrl();
    void this._refreshResults();
  }

  private _onSelectedTagRemove = (event: CustomEvent<{ value: string }>): void => {
    event.stopPropagation();
    this._toggleTag(event.detail.value);
  };

  private _onFiltersToggle = (event: CustomEvent<{ open: boolean }>): void => {
    this._filtersOpen = event.detail.open;
  };

  private _onSortChange = (event: Event): void => {
    const { value } = (event as CustomEvent<{ value: string | number }>).detail;
    const selectedValue = typeof value === 'string' ? value : String(value);
    const nextSortMode: SearchSortMode =
      selectedValue === 'date-desc' ? 'date-desc' : DEFAULT_SEARCH_SORT_MODE;
    if (nextSortMode === this._sortMode) {
      return;
    }

    this._sortMode = nextSortMode;
    this._pushUrl();
    void this._refreshResults();
  };

  private _onTagModeChange = (event: Event): void => {
    const { value } = (event as CustomEvent<{ value: string | number }>).detail;
    const selectedValue = typeof value === 'string' ? value : String(value);
    const nextTagMode: SearchTagMode = selectedValue === 'and' ? 'and' : DEFAULT_SEARCH_TAG_MODE;
    if (nextTagMode === this._tagMode) {
      return;
    }

    this._tagMode = nextTagMode;
    this._pushUrl();
    void this._refreshResults();
  };


  private _getSearchRuntime(): SearchCore {
    const runtime = this._searchRuntime ?? getInitializedSearchCore();
    if (runtime === null) {
      throw new Error('SearchPage requires initialized search runtime.');
    }
    this._searchRuntime = runtime;
    return runtime;
  }

  private _readSiteUrlContext(): SiteUrlContext {
    if (this._siteUrlContext) {
      return this._siteUrlContext;
    }
    if (typeof document === 'undefined') {
      throw new Error('SearchPage requires document metadata to build render hrefs.');
    }
    const siteOrigin = document
      .querySelector<HTMLMetaElement>('meta[name="rouault-site-origin"]')
      ?.getAttribute('content');
    const basePath = document
      .querySelector<HTMLMetaElement>('meta[name="rouault-base-path"]')
      ?.getAttribute('content') ?? '';
    if (!siteOrigin || siteOrigin.trim().length === 0) {
      throw new Error('SearchPage requires rouault-site-origin meta to build render hrefs.');
    }
    this._siteUrlContext = createSiteUrlContext({ siteOrigin, basePath });
    return this._siteUrlContext;
  }

  private _renderHrefForItem(item: SearchResultItem): string {
    if (typeof item.renderHref === 'string' && item.renderHref.length > 0) {
      return item.renderHref;
    }

    return buildSearchResultRenderHref({
      canonicalPathname: item.canonicalPathname,
      siteUrlContext: this._readSiteUrlContext(),
    });
  }

  private _onResultClick = (event: MouseEvent, renderHref: string): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    void navigateInternalDocument(renderHref);
  };

  private _buildGenreFilterEntries(): GenreFilterEntry[] {
    const map = new Map<string, number>(Object.entries(this._allTagCounts));

    for (const [tag, count] of Object.entries(this._tagCounts)) {
      map.set(tag, count);
    }

    for (const tag of this._selectedTags) {
      if (!map.has(tag)) {
        map.set(tag, 0);
      }
    }

    return [...map.entries()]
      .map(([tag, count]) => {
        const selected = this._selectedTags.includes(tag);
        return {
          tag,
          count,
          selected,
          disabled: !selected && count === 0,
        } satisfies GenreFilterEntry;
      })
      .sort((left, right) => {
        const leftSelected = left.selected ? 1 : 0;
        const rightSelected = right.selected ? 1 : 0;

        if (leftSelected !== rightSelected) {
          return rightSelected - leftSelected;
        }

        if (left.count !== right.count) {
          return right.count - left.count;
        }

        return left.tag.localeCompare(right.tag, 'ja');
      });
  }

  private _normalizedFilterQuery(): string {
    return this._filterQuery.trim().toLocaleLowerCase('ja');
  }

  private _visibleGenreFilterEntries(): GenreFilterEntry[] {
    const normalizedFilterQuery = this._normalizedFilterQuery();
    const entries = this._buildGenreFilterEntries();
    if (normalizedFilterQuery.length === 0) {
      return entries;
    }

    return entries.filter((entry) =>
      entry.tag.toLocaleLowerCase('ja').includes(normalizedFilterQuery),
    );
  }

  private _filterSummaryState(): string {
    if (this._selectedTags.length === 0) {
      return 'すべてのタグ';
    }

    const modeLabel = this._tagMode === 'and' ? 'すべて' : 'いずれか';
    return `${this._selectedTags.length.toString()}タグ選択中 / ${modeLabel}`;
  }

  private _filterSummaryDetail(): string {
    if (this._selectedTags.length === 0) {
      return '必要な時だけ展開して絞り込めます。';
    }

    const previewTags = this._selectedTags.slice(0, 2);
    const remainder = this._selectedTags.length - previewTags.length;
    return remainder > 0
      ? `${previewTags.join(' / ')} ほか ${remainder.toString()} 件`
      : previewTags.join(' / ');
  }

  private _renderSelectedTags(): unknown {
    if (this._selectedTags.length === 0) {
      return html`<p class="filter-empty">まだタグは選択されていません。</p>`;
    }

    return html`
      <div class="selected-tags">
        ${this._selectedTags.map(
          (tag) => html`
            <ui-tag
              class="selected-tag"
              variant="outline"
              color="blue"
              removable
              @ui-tag-remove=${this._onSelectedTagRemove}
            >
              ${tag}
            </ui-tag>
          `,
        )}
      </div>
    `;
  }

  private _renderFilterPanel(): unknown {
    const entries = this._buildGenreFilterEntries();
    const visibleEntries = this._visibleGenreFilterEntries();

    return html`
      <ui-details
        class="filter-details"
        variant="bordered"
        region
        ?open=${this._filtersOpen}
        @toggle=${this._onFiltersToggle}
      >
        <div slot="summary" class="filter-summary">
          <div class="filter-summary-main">
            <span>タグで絞り込む</span>
          </div>

          <div class="filter-summary-meta">
            <span class="filter-summary-state">${this._filterSummaryState()}</span>
            <span class="filter-summary-detail">${this._filterSummaryDetail()}</span>
          </div>
        </div>

        <div class="filter-panel" aria-label="タグフィルター">
          <section class="filter-section" aria-labelledby="selected-tags-heading">
            <div class="filter-section-header">
              <h2 id="selected-tags-heading" class="filter-section-title">選択中タグ</h2>
              <span class="filter-section-meta">${this._selectedTags.length.toString()} 件</span>
            </div>
            ${this._renderSelectedTags()}
          </section>

          <section class="filter-section" aria-labelledby="filter-list-heading">
            <div class="filter-list-header">
              <h2 id="filter-list-heading" class="filter-section-title">タグを絞り込む</h2>
              <span class="filter-section-meta">
                ${visibleEntries.length.toString()} / ${entries.length.toString()} タグ
              </span>
            </div>

            <ui-search-field
              class="filter-search-field"
              label="タグを絞り込む"
              hide-label
              autocomplete="off"
              placeholder="タグ名で絞り込む"
              .value=${this._filterQuery}
              @input=${this._onFilterInput}
            ></ui-search-field>

            <div class="filter-list" role="list">
              ${visibleEntries.length > 0
                ? repeat(
                    visibleEntries,
                    (entry) => entry.tag,
                    (entry) => html`
                      <div
                        class="filter-option"
                        role="listitem"
                        data-selected=${entry.selected ? 'true' : 'false'}
                        data-disabled=${entry.disabled ? 'true' : 'false'}
                      >
                        <ui-checkbox
                          class="filter-option-checkbox"
                          .checked=${live(entry.selected)}
                          .disabled=${entry.disabled}
                          .label=${entry.tag}
                          @change=${() => {
                            this._toggleTag(entry.tag);
                          }}
                        ></ui-checkbox>
                        <span class="filter-option-count">${entry.count.toString()}件</span>
                      </div>
                    `,
                  )
                : html`<p class="filter-empty">一致するタグはありません。</p>`}
            </div>
          </section>
        </div>
      </ui-details>
    `;
  }

  private _renderResults(): unknown {
    if (this._loading) {
      return html`
        <div class="loading" aria-live="polite">
          <ui-spinner size="sm" aria-hidden="true"></ui-spinner>
          <span>検索インデックスを照会しています...</span>
        </div>
      `;
    }

    if (this._errorMessage.length > 0) {
      return html`
        <ui-empty-state class="empty-hint" variant="error">
          <span slot="heading">検索を表示できません</span>
          <span slot="description">${this._errorMessage}</span>
        </ui-empty-state>
      `;
    }

    if (!this._loaded) {
      return nothing;
    }

    if (this._results.length === 0) {
      if (this._query.length === 0 && this._selectedTags.length === 0) {
        return html`
          <ui-empty-state class="empty-hint" variant="default">
            <span slot="heading">キーワードまたはタグで絞り込めます</span>
            <span slot="description"
              >ヘッダーのダイアログは即時検索、ここではタグ演算子も含めて一覧で比較できます。</span
            >
          </ui-empty-state>
        `;
      }

      return html`
        <ui-empty-state class="empty-hint" variant="search">
          <span slot="heading">一致するメモが見つかりません</span>
          <span slot="description"
            >検索語を変えるか、タグの組み合わせや演算子を見直してください。</span
          >
        </ui-empty-state>
      `;
    }

    return html`
      <ol class="results-list">
        ${this._results.map((item) => {
          const renderHref = this._renderHrefForItem(item);
          return html`
            <li>
              <ui-card class="result-card" clickable variant="outlined">
                <a
                  class="result-link"
                  href=${renderHref}
                  data-link-kind="internal-document"
                  data-link-surface="card"
                  @click=${(event: MouseEvent) => {
                    this._onResultClick(event, renderHref);
                  }}
                >
                  <div class="result-path">${item.pathLabel}</div>
                  <h2 class="result-title">${item.title}</h2>
                  ${item.date.original
                    ? html`<div class="result-meta">更新日: ${item.date.original}</div>`
                    : nothing}
                  ${this._renderResultSecondaryText(item.snippet, item.description)}
                </a>
              </ui-card>
            </li>
          `;
        })}
      </ol>
    `;
  }

  override render() {
    const activeCount = this._results.length;
    const currentState = this._currentSearchState();
    const isTagDefaultView = isSingleTagDefaultState(currentState);
    const singleTag = isTagDefaultView ? (currentState.tags[0] ?? '') : '';

    return html`
      <section class="search-page page-shell" aria-label="検索結果">
        <div class="hero">
          <p class="eyebrow">${isTagDefaultView ? 'Tag / Explore' : 'Search / Filter'}</p>
          <h1 class="heading">${isTagDefaultView ? `#${singleTag}` : '検索'}</h1>
          <p class="description">
            ${isTagDefaultView
              ? 'このタグに属するノートを起点に、検索語や追加タグで探索を広げられます。'
              : 'タグとキーワードを組み合わせ、複数タグは OR / AND を切り替えて探索します。'}
          </p>
        </div>

        <div class="search-controls">
          <ui-search-field
            class="search-input-control"
            label="検索"
            hide-label
            autocomplete="off"
            placeholder="メモを検索"
            .value=${this._query}
            @input=${this._onInput}
          ></ui-search-field>

          <div class="toolbar-row">
            <div class="meta-row">
              <span>${activeCount.toString()} 件の結果</span>
            </div>

            <div class="sort-field">
              <span class="sort-label">タグ演算子</span>
              <ui-select
                class="sort-select"
                label="タグ演算子"
                hide-label
                variant="outline"
                .modelValue=${this._tagMode}
                .options=${SEARCH_TAG_MODE_OPTIONS}
                @change=${this._onTagModeChange}
              ></ui-select>
            </div>

            <div class="sort-field">
              <span class="sort-label">並び順</span>
              <ui-select
                class="sort-select"
                label="並び順"
                hide-label
                variant="outline"
                .modelValue=${this._sortMode}
                .options=${SEARCH_SORT_OPTIONS}
                @change=${this._onSortChange}
              ></ui-select>
            </div>
          </div>

          ${this._renderFilterPanel()}
        </div>

        <div class="results-section">${this._renderResults()}</div>
      </section>
    `;
  }

  private _renderResultSecondaryText(snippet: SearchSnippet | null, description: string): unknown {
    const normalizedDescription = description.trim();
    const sourceSegments = snippet?.segments.length
      ? snippet.segments
      : normalizedDescription.length > 0
        ? [{ text: normalizedDescription, matched: false }]
        : [];

    if (sourceSegments.length === 0) {
      return nothing;
    }

    return html`
      <p class="result-excerpt">
        ${sourceSegments.map((segment) =>
          segment.matched ? html`<mark>${segment.text}</mark>` : segment.text,
        )}
      </p>
    `;
  }

  private _parseInitialState(): SearchState | null {
    const normalized = this.initialSearchStateJson.trim();
    if (normalized.length === 0) {
      return null;
    }

    try {
      const parsed = JSON.parse(normalized) as Partial<SearchState>;
      return {
        q: typeof parsed.q === 'string' ? parsed.q : '',
        tags: normalizeSearchTags(Array.isArray(parsed.tags) ? parsed.tags : []),
        tagMode: parsed.tagMode === 'and' ? 'and' : DEFAULT_SEARCH_TAG_MODE,
        sort: parsed.sort === 'date-desc' ? 'date-desc' : DEFAULT_SEARCH_SORT_MODE,
      };
    } catch {
      return null;
    }
  }

  private _parseInitialResponse(): ExploreSearchResponse | null {
    const normalized = this.initialSearchResponseJson.trim();
    if (normalized.length === 0) {
      return null;
    }

    const isInternalDocumentPathname = getInitializedSearchRoutePredicate();
    if (isInternalDocumentPathname === null) {
      return null;
    }

    const mutableDiagnostics = { issues: [] };
    const diagnostics = createSearchJsonParseDiagnosticSink(mutableDiagnostics);

    try {
      const parsed = parseStaticExploreSearchResponseJson({
        value: JSON.parse(normalized),
        siteUrlContext: this._readSiteUrlContext(),
        isInternalDocumentPathname,
        diagnostics,
      });
      if (!parsed.ok) {
        return null;
      }

      return {
        ...parsed.response,
        items: parsed.response.items.map((item) => ({
          ...item,
          renderHref: buildSearchResultRenderHref({
            canonicalPathname: item.canonicalPathname,
            siteUrlContext: this._readSiteUrlContext(),
          }),
        })),
      };
    } catch {
      return null;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'search-page': SearchPage;
  }
}
