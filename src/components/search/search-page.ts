import { css, html, LitElement, nothing, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '../../lib/icons';
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
import { pagefindSearchAdapter, type SearchResultItem } from '../../lib/search/pagefind-search.js';
import { navigateToUrl } from '../../lib/search/navigation.js';
import {
  DEFAULT_SEARCH_SORT_MODE,
  buildSearchHref,
  normalizeSearchTags,
  parseSearchStateFromUrl,
  type SearchSortMode,
} from '../../lib/search/search-url.js';

const SEARCH_DEBOUNCE_MS = 150;
const SEARCH_SORT_OPTIONS: SelectOption[] = [
  { value: DEFAULT_SEARCH_SORT_MODE, label: '関連度順' },
  { value: 'date-desc', label: '新しい順' },
];

type SearchControlTarget = EventTarget & { value: unknown };

interface GenreFilterEntry {
  tag: string;
  count: number;
  selected: boolean;
  disabled: boolean;
}

@customElement('search-page')
export class SearchPage extends LitElement {
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
        margin: 0 0 0 var(--space-2, 8px);
      }

      .sort-field {
        display: grid;
        grid-template-columns: auto minmax(10rem, auto);
        align-items: center;
        gap: var(--space-2, 8px);
        color: var(--fg-muted);
        font-size: var(--text-sm, 13px);
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
        --search-filter-option-selected-accent: oklch(
          55% var(--chroma-high, 0.2) var(--hue-blue, 230)
        );
        /* 無彩色との mix で Hue が赤側へ回り込むのを避けるため、選択色は明示的に青系で固定する */
        --search-filter-option-selected-border: oklch(84% 0.07 var(--hue-blue, 230));
        --search-filter-option-selected-bg: oklch(97% 0.018 var(--hue-blue, 230));
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
            var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
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
          margin-left: 0;
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

  @state()
  private _query = '';

  @state()
  private _selectedTags: string[] = [];

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
  private _genreCounts: Record<string, number> = {};

  @state()
  private _allGenreCounts: Record<string, number> = {};

  @state()
  private _filterQuery = '';

  @state()
  private _filtersOpen = false;

  private _searchTimerId: number | undefined;
  private _requestToken = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('popstate', this._onPopState);
    this._syncStateFromLocation();
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

    this._query = state.query;
    this._selectedTags = state.tags;
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
      const result = await pagefindSearchAdapter.search(
        this._query,
        this._selectedTags,
        this._sortMode,
      );
      if (currentToken !== this._requestToken) {
        return;
      }

      this._results = result.items;
      this._genreCounts = result.genreCounts;
      this._allGenreCounts = result.allGenreCounts;
      this._loaded = true;
    } catch (error: unknown) {
      if (currentToken !== this._requestToken) {
        return;
      }

      this._results = [];
      this._genreCounts = {};
      this._errorMessage =
        error instanceof Error ? error.message : '検索の読み込みに失敗しました。';
      this._loaded = true;
    } finally {
      if (currentToken === this._requestToken) {
        this._loading = false;
      }
    }
  }

  private _replaceUrl(): void {
    const nextUrl = buildSearchHref({
      query: this._query,
      tags: this._selectedTags,
      sort: this._sortMode,
    });

    if (nextUrl === `${window.location.pathname}${window.location.search}`) {
      return;
    }

    history.replaceState(history.state, '', nextUrl);
  }

  private _pushUrl(): void {
    const nextUrl = buildSearchHref({
      query: this._query,
      tags: this._selectedTags,
      sort: this._sortMode,
    });

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

  private _onResultClick = (event: MouseEvent, url: string): void => {
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
    void navigateToUrl(url);
  };

  private _buildGenreFilterEntries(): GenreFilterEntry[] {
    const map = new Map<string, number>(Object.entries(this._allGenreCounts));

    for (const [tag, count] of Object.entries(this._genreCounts)) {
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

    return `${this._selectedTags.length.toString()}タグ選択中`;
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
    if (entries.length === 0) {
      return nothing;
    }

    const visibleEntries = this._visibleGenreFilterEntries();

    return html`
      <ui-details
        class="filter-details"
        aria-label="タグフィルターを開閉"
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

            ${visibleEntries.length > 0
              ? html`
                  <div class="filter-list" role="list">
                    ${repeat(
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
                    )}
                  </div>
                `
              : html`<p class="filter-empty">一致するタグはありません。</p>`}
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
              >ヘッダーのダイアログは即時検索、ここでは結果を一覧で比較できます。</span
            >
          </ui-empty-state>
        `;
      }

      return html`
        <ui-empty-state class="empty-hint" variant="search">
          <span slot="heading">一致するメモが見つかりません</span>
          <span slot="description">検索語を変えるか、タグの組み合わせを緩めてください。</span>
        </ui-empty-state>
      `;
    }

    return html`
      <ol class="results-list">
        ${this._results.map((item) => {
          const secondaryText = item.excerptHtml.length > 0 ? item.excerptHtml : item.description;

          return html`
            <li>
              <ui-card class="result-card" clickable variant="outlined">
                <a
                  class="result-link"
                  href=${item.url}
                  @click=${(event: MouseEvent) => {
                    this._onResultClick(event, item.url);
                  }}
                >
                  <div class="result-path">${item.path}</div>
                  <h2 class="result-title">${item.title}</h2>
                  ${item.date.length > 0
                    ? html`<div class="result-meta">更新日: ${item.date}</div>`
                    : nothing}
                  ${secondaryText.length > 0
                    ? html`<p class="result-excerpt">${unsafeHTML(secondaryText)}</p>`
                    : nothing}
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

    return html`
      <section class="search-page page-shell" aria-label="検索結果">
        <div class="hero">
          <p class="eyebrow">Search / Filter</p>
          <h1 class="heading">検索</h1>
          <p class="description">
            genre をタグとして扱い、キーワード検索と AND 条件で絞り込みます。
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
}

declare global {
  interface HTMLElementTagNameMap {
    'search-page': SearchPage;
  }
}
