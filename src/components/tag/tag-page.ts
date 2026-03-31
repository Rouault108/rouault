import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TagPageEntry, TagPageNoteSummary } from '../../data/tagPages.js';
import { navigateToUrl } from '../../search/navigation.js';
import { DEFAULT_SEARCH_SORT_MODE, buildUrlForSearchState } from '../../../shared/search/search-url.js';
import { pageShellStyles } from '../page/page-shell-styles.js';
import '../ui/card/card.js';
import '../ui/empty-state/empty-state.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const toTagPageNoteSummary = (value: unknown): TagPageNoteSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  const title = normalizeString(value['title']);
  const permalink = normalizeString(value['permalink']);
  if (title.length === 0 || permalink.length === 0) {
    return null;
  }

  return {
    title,
    permalink,
    description: normalizeString(value['description']),
    date: normalizeString(value['date']),
    slug: normalizeString(value['slug']),
    genres: normalizeStringArray(value['genres']),
  };
};

const toTagPageEntry = (value: unknown): TagPageEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  const tag = normalizeString(value['tag']);
  if (tag.length === 0) {
    return null;
  }

  const notes = Array.isArray(value['notes'])
    ? value['notes']
        .map((item) => toTagPageNoteSummary(item))
        .filter((item): item is TagPageNoteSummary => item !== null)
    : [];

  const rawCount = value['noteCount'];
  const noteCount =
    typeof rawCount === 'number' && Number.isFinite(rawCount)
      ? Math.max(0, Math.trunc(rawCount))
      : notes.length;

  return {
    tag,
    noteCount,
    notes,
  };
};

@customElement('tag-page')
export class TagPage extends LitElement {
  static override styles = [
    pageShellStyles,
    css`
      .tag-page__count {
        color: var(--fg-default);
      }

      .tag-page__search-link {
        color: var(--fg-muted);
        text-decoration: none;
        border-radius: var(--radius-xs, 4px);
        outline: var(--focus-ring-width, 2px) solid transparent;
        outline-offset: var(--focus-ring-offset, 2px);
        transition:
          color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
          outline-color var(--duration-normal, 150ms)
            var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
      }

      .tag-page__search-link:hover {
        color: var(--fg-default);
      }

      .tag-page__search-link:focus-visible {
        color: var(--fg-default);
        outline-color: var(--focus-ring-color, oklch(60% 0.15 250));
      }

      .empty-hint {
        min-height: 25vh;
      }
    `,
  ];

  @property({ type: String, attribute: 'tag-page-json' })
  tagPageJson = '';

  private get _tagPageData(): TagPageEntry | null {
    const normalized = this.tagPageJson.trim();
    if (normalized.length === 0) {
      return null;
    }

    try {
      return toTagPageEntry(JSON.parse(normalized) as unknown);
    } catch {
      return null;
    }
  }

  private _onLinkClick = (event: MouseEvent, url: string): void => {
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

  private _renderNotes(tagPage: TagPageEntry) {
    if (tagPage.notes.length === 0) {
      return html`
        <ui-empty-state class="empty-hint" variant="default">
          <span slot="heading">このタグの公開ノートはまだありません</span>
          <span slot="description">別のタグから辿るか、検索ページで横断的に探してください。</span>
        </ui-empty-state>
      `;
    }

    return html`
      <ol class="results-list tag-page__list">
        ${tagPage.notes.map(
          (note) => html`
            <li class="tag-page__item">
              <ui-card class="result-card tag-page__item-card" clickable variant="outlined">
                <a
                  class="result-link tag-page__item-link"
                  href=${note.permalink}
                  @click=${(event: MouseEvent) => {
                    this._onLinkClick(event, note.permalink);
                  }}
                >
                  <div class="result-path">${note.permalink}</div>
                  <h2 class="result-title tag-page__item-title">${note.title}</h2>
                  ${note.date.length > 0
                    ? html`<div class="result-meta tag-page__item-meta">更新日: ${note.date}</div>`
                    : nothing}
                  ${note.description.length > 0
                    ? html`<p class="result-excerpt tag-page__item-description">
                        ${note.description}
                      </p>`
                    : nothing}
                </a>
              </ui-card>
            </li>
          `,
        )}
      </ol>
    `;
  }

  override render() {
    const tagPage = this._tagPageData;
    if (tagPage === null) {
      return nothing;
    }

    const searchHref = buildUrlForSearchState({
      q: '',
      tags: [tagPage.tag],
      tagMode: 'or',
      sort: DEFAULT_SEARCH_SORT_MODE,
    });

    return html`
      <section class="tag-page page-shell" aria-labelledby="tag-page-title">
        <div class="hero">
          <p class="eyebrow">Tag / Archive</p>
          <h1 id="tag-page-title" class="heading">#${tagPage.tag}</h1>
          <p class="description">このタグに属する公開ノートを新しい順で一覧します。</p>
          <div class="meta-row tag-page__meta">
            <span class="tag-page__count">${tagPage.noteCount.toString()}件のノート</span>
            <a
              class="tag-page__search-link"
              href=${searchHref}
              @click=${(event: MouseEvent) => {
                this._onLinkClick(event, searchHref);
              }}
            >
              このタグで検索へ
            </a>
          </div>
        </div>

        <div class="results-section">${this._renderNotes(tagPage)}</div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tag-page': TagPage;
  }
}
