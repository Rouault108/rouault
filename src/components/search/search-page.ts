import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '../../lib/icons.js';
import '../../components/ui/empty-state/empty-state.js';
import '../../components/ui/spinner/spinner.js';
import { pagefindSearchAdapter, type SearchResultItem } from '../../lib/search/pagefind-search.js';
import { navigateToUrl } from '../../lib/search/navigation.js';
import {
  buildSearchHref,
  normalizeSearchTags,
  parseSearchStateFromUrl,
} from '../../lib/search/search-url.js';

const SEARCH_DEBOUNCE_MS = 150;

@customElement('search-page')
export class SearchPage extends LitElement {
  static override styles = css`
    :host {
      display: block;
      color: var(--fg-default);
    }

    .search-page {
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
      max-width: 56ch;
      color: var(--fg-muted);
      font-size: var(--text-base, 14px);
      line-height: var(--line-height-relaxed, 1.7);
    }

    .search-controls {
      display: grid;
      gap: var(--space-4, 16px);
      margin-top: var(--space-6, 24px);
    }

    .search-field {
      position: relative;
      display: flex;
      align-items: center;
      min-height: 3rem;
      border: var(--border-width, 1px) solid var(--border-default);
      border-radius: var(--radius-lg, 12px);
      background: var(--bg-surface-2);
      box-shadow: var(--elevation-sm);
    }

    .search-field:focus-within {
      border-color: var(--focus-ring-color);
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) color-mix(in oklch, var(--focus-ring-color) 32%, transparent);
    }

    .search-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding-inline-start: var(--space-4, 16px);
      color: var(--fg-muted);
    }

    .search-input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      color: var(--fg-default);
      font: inherit;
      font-size: var(--text-lg, 16px);
      padding: var(--space-3, 12px) var(--space-4, 16px);
      outline: none;
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3, 12px);
      align-items: center;
      color: var(--fg-muted);
      font-size: var(--text-sm, 13px);
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2, 8px);
    }

    .filter-button {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
      min-height: 2rem;
      border: var(--border-width, 1px) solid var(--border-default);
      border-radius: 999px;
      background: var(--bg-default);
      color: var(--fg-default);
      font: inherit;
      font-size: var(--text-sm, 13px);
      padding: 0 var(--space-3, 12px);
      cursor: pointer;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out),
        border-color var(--duration-fast, 70ms) var(--ease-out),
        color var(--duration-fast, 70ms) var(--ease-out);
    }

    .filter-button[aria-pressed='true'] {
      border-color: color-mix(in oklch, var(--fg-default) 28%, var(--border-default));
      background: var(--bg-surface-3);
      color: var(--fg-default);
    }

    .filter-button:disabled {
      opacity: 0.48;
      cursor: not-allowed;
    }

    .filter-button:focus-visible,
    .result-link:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset, 2px);
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

    .result-item {
      border: var(--border-width, 1px) solid var(--border-default);
      border-radius: var(--radius-lg, 12px);
      background: var(--bg-surface-2);
      overflow: hidden;
    }

    .result-link {
      display: grid;
      gap: var(--space-2, 8px);
      padding: var(--space-5, 20px);
      color: inherit;
      text-decoration: none;
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

    .result-excerpt :where(mark) {
      background: transparent;
      color: inherit;
      box-shadow: inset 0 -0.5em 0 color-mix(in oklch, var(--accent-soft, oklch(92% 0.03 95)) 88%, transparent);
    }

    .empty-hint {
      margin-top: var(--space-8, 32px);
    }

    @media (max-width: 768px) {
      .search-page {
        padding-inline: var(--space-3, 12px);
      }
    }
  `;

  @property({ type: String, attribute: 'initial-tag' })
  initialTag = '';

  @state()
  private _query = '';

  @state()
  private _selectedTags: string[] = [];

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

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (typeof window !== 'undefined') {
      return;
    }

    if (
      changedProperties.has('initialTag') &&
      this._query.length === 0 &&
      this._selectedTags.length === 0
    ) {
      const initialTag = this.initialTag.trim();
      this._selectedTags = initialTag.length > 0 ? [initialTag] : [];
    }
  }

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
    const initialTag = this.initialTag.trim();

    this._query = state.query;
    this._selectedTags = state.tags.length > 0 ? state.tags : initialTag.length > 0 ? [initialTag] : [];
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
      const result = await pagefindSearchAdapter.search(this._query, this._selectedTags);
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
    });

    if (nextUrl === `${window.location.pathname}${window.location.search}`) {
      return;
    }

    history.pushState(history.state, '', nextUrl);
  }

  private _onInput = (event: Event): void => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this._query = input.value;
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

  private _sortedGenreEntries(): Array<[string, number]> {
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
            <li class="result-item">
              <a class="result-link" href=${item.url} @click=${(event: MouseEvent) => { this._onResultClick(event, item.url); }}>
                <div class="result-path">${item.path}</div>
                <h2 class="result-title">${item.title}</h2>
                ${item.date.length > 0 ? html`<div class="result-meta">更新日: ${item.date}</div>` : nothing}
                ${secondaryText.length > 0
                  ? html`<p class="result-excerpt">${unsafeHTML(secondaryText)}</p>`
                  : nothing}
              </a>
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
          <label class="search-field">
            <span class="search-icon" aria-hidden="true">
              <iconify-icon icon="lucide:search"></iconify-icon>
            </span>
            <input
              class="search-input"
              type="search"
              placeholder="メモを検索"
              .value=${this._query}
              @input=${this._onInput}
            />
          </label>

          <div class="meta-row">
            <span>${activeCount.toString()} 件の結果</span>
            ${this._selectedTags.length > 0
              ? html`<span>選択中: ${this._selectedTags.join(' / ')}</span>`
              : nothing}
          </div>

          ${filters.length > 0
            ? html`
                <div class="filters" aria-label="タグフィルター">
                  ${filters.map(([tag, count]) => {
                    const selected = this._selectedTags.includes(tag);
                    const disabled = !selected && count === 0;

                    return html`
                      <button
                        class="filter-button"
                        type="button"
                        aria-pressed=${selected ? 'true' : 'false'}
                        ?disabled=${disabled}
                        @click=${() => { this._toggleTag(tag); }}
                      >
                        <span>#${tag}</span>
                        <span>${count.toString()}</span>
                      </button>
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
