import { css, html, LitElement, nothing, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '../../components/ui/button/button.js';
import '../../components/ui/card/card.js';
import '../../components/ui/empty-state/empty-state.js';
import '../../components/ui/search-field/search-field.js';
import '../../components/ui/select/select.js';
import '../../components/ui/spinner/spinner.js';
import type { SelectOption } from '../../components/ui/select/select.js';
import { HIGHLIGHT_RULE_TEMPLATE } from '../ui/highlight/highlight.js';
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

@customElement('search-page')
export class SearchPage extends LitElement {
  static override styles = css`
    :host {
      display: block;
      color: var(--fg-default);
    }

    .search-page {
      box-sizing: border-box;
      width: min(100%, 72rem);
      margin: 0 auto;
      padding: clamp(var(--space-6, 24px), 4vw, var(--space-10, 40px)) var(--space-4, 16px) var(--space-12, 48px);
    }

    .hero {
      display: grid;
      gap: var(--space-4, 16px);
      padding-bottom: var(--space-6, 24px);
      border-bottom: var(--border-width, 1px) solid var(--border-default);
    }

    .eyebrow {
      margin: 0;
      color: var(--fg-muted);
      font-family: var(--font-mono);
      font-size: var(--text-xs, 12px);
      letter-spacing: var(--tracking-wide, 0.06em);
      text-transform: uppercase;
    }

    .heading {
      margin: 0;
      font-size: clamp(var(--text-2xl, 24px), 4vw, var(--text-4xl, 36px));
      line-height: var(--line-height-tight, 1.2);
    }

    .description {
      margin: 0;
      color: var(--fg-muted);
      font-size: var(--text-base, 14px);
      line-height: var(--line-height-relaxed, 1.7);
    }

    .search-controls {
      display: grid;
      gap: var(--space-4, 16px);
      margin-top: var(--space-6, 24px);
    }

    .search-input-control {
      --ui-search-field-height: 3rem;
      --ui-search-field-radius: var(--radius-lg, 12px);
      --ui-search-field-bg: var(--bg-surface-2);
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3, 12px);
      align-items: center;
      color: var(--fg-muted);
      font-size: var(--text-sm, 13px);
    }

    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4, 16px);
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

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2, 8px);
    }

    .filter-chip {
      --radius-md: 999px;
      --control-height-sm: 2rem;
      --space-2: var(--space-3, 12px);
      --space-1: var(--space-1, 4px);
      --elevation-sm: none;
    }

    .filter-chip-count {
      color: var(--fg-muted);
    }

    .filter-chip[data-selected='true'] .filter-chip-count {
      color: inherit;
    }

    .results-section {
      margin-top: var(--space-8, 32px);
    }

    .loading {
      display: flex;
      align-items: center;
      gap: var(--space-3, 12px);
      color: var(--fg-muted);
      font-size: var(--text-sm, 13px);
    }

    .results-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: var(--space-3, 12px);
    }

    .result-card {
      --radius-md: var(--radius-lg, 12px);
      --space-4: var(--space-5, 20px);
      background: var(--bg-surface-2);
    }

    .result-link {
      display: grid;
      gap: var(--space-2, 8px);
      color: inherit;
      text-decoration: none;
      min-width: 0;
    }

    .result-link:focus-visible {
      outline: none;
    }

    .result-title {
      margin: 0;
      font-size: var(--text-lg, 16px);
      line-height: var(--line-height-tight, 1.3);
    }

    .result-path,
    .result-meta {
      color: var(--fg-muted);
      font-size: var(--text-xs, 12px);
    }

    .result-excerpt {
      margin: 0;
      color: var(--fg-default);
      font-size: var(--text-sm, 13px);
      line-height: var(--line-height-relaxed, 1.7);
    }

    ${unsafeCSS(HIGHLIGHT_RULE_TEMPLATE('.result-excerpt :where(mark)'))}

    .empty-hint {
      margin-top: var(--space-8, 32px);
    }

    @media (max-width: 768px) {
      .search-page {
        padding-inline: var(--space-3, 12px);
      }
    }
  `;

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
      this._errorMessage = error instanceof Error ? error.message : '検索の読み込みに失敗しました。';
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

  private _sortedGenreEntries(): [string, number][] {
    const map = new Map<string, number>(Object.entries(this._allGenreCounts));

    for (const [tag, count] of Object.entries(this._genreCounts)) {
      map.set(tag, count);
    }

    for (const tag of this._selectedTags) {
      if (!map.has(tag)) {
        map.set(tag, 0);
      }
    }

    return [...map.entries()].sort((left, right) => {
      const leftSelected = this._selectedTags.includes(left[0]) ? 1 : 0;
      const rightSelected = this._selectedTags.includes(right[0]) ? 1 : 0;

      if (leftSelected !== rightSelected) {
        return rightSelected - leftSelected;
      }

      return left[0].localeCompare(right[0], 'ja');
    });
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
            <span slot="description">ヘッダーのダイアログは即時検索、ここでは結果を一覧で比較できます。</span>
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
                <a class="result-link" href=${item.url} @click=${(event: MouseEvent) => { this._onResultClick(event, item.url); }}>
                  <div class="result-path">${item.path}</div>
                  <h2 class="result-title">${item.title}</h2>
                  ${item.date.length > 0 ? html`<div class="result-meta">更新日: ${item.date}</div>` : nothing}
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
    const filters = this._sortedGenreEntries();
    const activeCount = this._results.length;

    return html`
      <section class="search-page" aria-label="検索結果">
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
              ${this._selectedTags.length > 0
                ? html`<span>選択中: ${this._selectedTags.join(' / ')}</span>`
                : nothing}
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

          ${filters.length > 0
            ? html`
                <div class="filters" aria-label="タグフィルター">
                  ${filters.map(([tag, count]) => {
                    const selected = this._selectedTags.includes(tag);
                    const disabled = !selected && count === 0;

                    return html`
                      <ui-button
                        class="filter-chip"
                        size="sm"
                        variant=${selected ? 'secondary' : 'outline'}
                        type="button"
                        data-selected=${selected ? 'true' : 'false'}
                        aria-pressed=${selected ? 'true' : 'false'}
                        ?disabled=${disabled}
                        @click=${() => { this._toggleTag(tag); }}
                      >
                        <span>#${tag}</span>
                        <span class="filter-chip-count">${count.toString()}</span>
                      </ui-button>
                    `;
                  })}
                </div>
              `
            : nothing}
        </div>

        <div class="results-section">
          ${this._renderResults()}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'search-page': SearchPage;
  }
}
