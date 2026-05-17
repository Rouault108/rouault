import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { CorpusPageEntry, CorpusPageNoteSummary } from '../../data/corpusPages.js';
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

const toCorpusPageNoteSummary = (value: unknown): CorpusPageNoteSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  const title = normalizeString(value['title']);
  const permalink = normalizeString(value['permalink']);
  const renderHref = normalizeString(value['renderHref']);
  if (title.length === 0 || permalink.length === 0 || renderHref.length === 0) {
    return null;
  }

  return {
    title,
    permalink,
    renderHref,
    description: normalizeString(value['description']),
    date: normalizeString(value['date']),
    slug: normalizeString(value['slug']),
    genres: normalizeStringArray(value['genres']),
  };
};

const toCorpusPageEntry = (value: unknown): CorpusPageEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  const key = normalizeString(value['key']);
  const label = normalizeString(value['label']);
  const href = normalizeString(value['href']);
  if (key.length === 0 || label.length === 0 || href.length === 0) {
    return null;
  }

  const notes = Array.isArray(value['notes'])
    ? value['notes']
        .map((item) => toCorpusPageNoteSummary(item))
        .filter((item): item is CorpusPageNoteSummary => item !== null)
    : [];

  const rawCount = value['noteCount'];
  const noteCount =
    typeof rawCount === 'number' && Number.isFinite(rawCount)
      ? Math.max(0, Math.trunc(rawCount))
      : notes.length;

  const latestUpdatedDate =
    typeof value['latestUpdatedDate'] === 'string' && value['latestUpdatedDate'].trim().length > 0
      ? value['latestUpdatedDate'].trim()
      : null;

  return {
    key,
    label,
    href,
    noteCount,
    latestUpdatedDate,
    notes,
  };
};

@customElement('corpus-page')
export class CorpusPage extends LitElement {
  static override styles = [
    pageShellStyles,
    css`
      .corpus-page__count {
        color: var(--fg-default);
      }

      .corpus-page__updated {
        color: var(--fg-muted);
      }

      .empty-hint {
        min-height: 25vh;
      }
    `,
  ];

  @property({ type: String, attribute: 'corpus-page-json' })
  corpusPageJson = '';

  private get _corpusPageData(): CorpusPageEntry | null {
    const normalized = this.corpusPageJson.trim();
    if (normalized.length === 0) {
      return null;
    }

    try {
      return toCorpusPageEntry(JSON.parse(normalized) as unknown);
    } catch {
      return null;
    }
  }

  private _renderNotes(corpusPage: CorpusPageEntry) {
    if (corpusPage.notes.length === 0) {
      return html`
        <ui-empty-state class="empty-hint" variant="default">
          <span slot="heading">このコーパスの公開ノートはまだありません</span>
          <span slot="description"
            >別のコーパスへ切り替えるか、時間をおいて再度確認してください。</span
          >
        </ui-empty-state>
      `;
    }

    return html`
      <ol class="results-list corpus-page__list">
        ${corpusPage.notes.map(
          (note) => html`
            <li class="corpus-page__item">
              <ui-card class="result-card corpus-page__item-card" clickable variant="outlined">
                <a
                  class="result-link corpus-page__item-link"
                  href=${note.renderHref}
                  data-link-kind="internal-document"
                  data-link-surface="card"
                >
                  <div class="result-path">${note.permalink}</div>
                  <h2 class="result-title corpus-page__item-title">${note.title}</h2>
                  ${note.date.length > 0
                    ? html`<div class="result-meta corpus-page__item-meta">
                        更新日: ${note.date}
                      </div>`
                    : nothing}
                  ${note.description.length > 0
                    ? html`<p class="result-excerpt corpus-page__item-description">
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
    const corpusPage = this._corpusPageData;
    if (corpusPage === null) {
      return nothing;
    }

    return html`
      <section class="corpus-page page-shell" aria-labelledby="corpus-page-title">
        <div class="hero">
          <p class="eyebrow">Corpus</p>
          <h1 id="corpus-page-title" class="heading">${corpusPage.label}</h1>
          <p class="description">
            このコーパスに属する公開ノートを、新しいものから静かに辿れる入口です。
          </p>
          <div class="meta-row corpus-page__meta">
            <span class="corpus-page__count">${corpusPage.noteCount.toString()}件のノート</span>
            ${corpusPage.latestUpdatedDate
              ? html`<span class="corpus-page__updated"
                  >最新更新 ${corpusPage.latestUpdatedDate}</span
                >`
              : nothing}
          </div>
        </div>

        <div class="results-section">${this._renderNotes(corpusPage)}</div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'corpus-page': CorpusPage;
  }
}
