import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { HomeNoteItem } from '../../data/home.js';
import type { CorporaOverviewCorpusItem, CorporaOverviewData } from '../../data/corporaOverview.js';
import { navigateInternalDocument } from '../../search/navigation.js';
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

const normalizeCount = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(value));
};

const toCorporaOverviewCorpusItem = (value: unknown): CorporaOverviewCorpusItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  const key = normalizeString(value['key']);
  const label = normalizeString(value['label']);
  const href = normalizeString(value['href']);
  if (key.length === 0 || label.length === 0 || href.length === 0) {
    return null;
  }

  const latestUpdatedDate = normalizeString(value['latestUpdatedDate']);

  return {
    key,
    label,
    href,
    noteCount: normalizeCount(value['noteCount'], 0),
    latestUpdatedDate: latestUpdatedDate.length > 0 ? latestUpdatedDate : null,
  };
};

const toHomeNoteItem = (value: unknown): HomeNoteItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  const title = normalizeString(value['title']);
  const permalink = normalizeString(value['permalink']);
  if (title.length === 0 || permalink.length === 0) {
    return null;
  }

  const date = normalizeString(value['date']);

  return {
    title,
    permalink,
    summary: normalizeString(value['summary']),
    date: date.length > 0 ? date : null,
    pathLabel: normalizeString(value['pathLabel']) || '—',
    genres: normalizeStringArray(value['genres']),
  };
};

const toCorporaOverviewData = (value: unknown): CorporaOverviewData | null => {
  if (!isRecord(value)) {
    return null;
  }

  const corpora = Array.isArray(value['corpora'])
    ? value['corpora']
        .map((item) => toCorporaOverviewCorpusItem(item))
        .filter((item): item is CorporaOverviewCorpusItem => item !== null)
    : [];

  const recentNotes = Array.isArray(value['recentNotes'])
    ? value['recentNotes']
        .map((item) => toHomeNoteItem(item))
        .filter((item): item is HomeNoteItem => item !== null)
    : [];

  const latestUpdatedDate = normalizeString(value['latestUpdatedDate']);

  return {
    corpusCount: normalizeCount(value['corpusCount'], corpora.length),
    noteCount: normalizeCount(value['noteCount'], recentNotes.length),
    latestUpdatedDate: latestUpdatedDate.length > 0 ? latestUpdatedDate : null,
    corpora,
    recentNotes,
  };
};

const renderDate = (value: string | null) =>
  value ? html`<time datetime=${value}>${value}</time>` : html`—`;

@customElement('corpora-overview-page')
export class CorporaOverviewPage extends LitElement {
  static override styles = [
    pageShellStyles,
    css`
      .corpora-overview__summary {
        color: var(--fg-default);
      }

      .corpora-overview__section + .corpora-overview__section {
        margin-top: var(--space-10, 40px);
      }

      .corpora-overview__section-header {
        display: grid;
        gap: var(--space-2, 8px);
        margin-bottom: var(--space-4, 16px);
      }

      .corpora-overview__section-title {
        margin: 0;
        font-size: var(--text-xl, 20px);
        line-height: var(--line-height-tight, 1.3);
      }

      .corpora-overview__section-description {
        margin: 0;
        color: var(--fg-muted);
        font-size: var(--text-sm, 13px);
        line-height: var(--line-height-relaxed, 1.7);
      }

      .corpora-overview__corpus-grid {
        grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
      }

      .corpora-overview__corpus-meta,
      .corpora-overview__note-meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2, 8px);
        align-items: center;
      }

      .corpora-overview__note-path,
      .corpora-overview__genres {
        color: var(--fg-muted);
        font-size: var(--text-xs, 12px);
      }

      .corpora-overview__note-summary {
        margin: 0;
      }

      .empty-hint {
        min-height: 20vh;
      }
    `,
  ];

  @property({ type: String, attribute: 'corpora-overview-json' })
  corporaOverviewJson = '';

  private get _overviewData(): CorporaOverviewData | null {
    const normalized = this.corporaOverviewJson.trim();
    if (normalized.length === 0) {
      return null;
    }

    try {
      return toCorporaOverviewData(JSON.parse(normalized) as unknown);
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
    void navigateInternalDocument(url);
  };

  private _renderCorpora(corpora: readonly CorporaOverviewCorpusItem[]) {
    if (corpora.length === 0) {
      return html`
        <ui-empty-state class="empty-hint" variant="default">
          <span slot="heading">公開コーパスはまだありません</span>
          <span slot="description">ノートが公開されると、ここにコーパス一覧が表示されます。</span>
        </ui-empty-state>
      `;
    }

    return html`
      <ol class="results-list corpora-overview__corpus-grid">
        ${corpora.map(
          (corpus) => html`
            <li class="corpora-overview__corpus-item">
              <ui-card clickable variant="outlined" class="result-card">
                <a
                  class="result-link"
                  href=${corpus.href}
                  data-link-kind="internal-document"
                  data-link-surface="card"
                  @click=${(event: MouseEvent) => {
                    this._onLinkClick(event, corpus.href);
                  }}
                >
                  <div class="result-path">${corpus.href}</div>
                  <h2 class="result-title">${corpus.label}</h2>
                  <div class="result-meta corpora-overview__corpus-meta">
                    <span>${corpus.noteCount.toString()}件のノート</span>
                    ${corpus.latestUpdatedDate
                      ? html`<span>最新更新 ${renderDate(corpus.latestUpdatedDate)}</span>`
                      : nothing}
                  </div>
                </a>
              </ui-card>
            </li>
          `,
        )}
      </ol>
    `;
  }

  private _renderRecentNotes(recentNotes: readonly HomeNoteItem[]) {
    if (recentNotes.length === 0) {
      return html`
        <ui-empty-state class="empty-hint" variant="default">
          <span slot="heading">公開ノートはまだありません</span>
          <span slot="description"
            >ノートが公開されると、ここに最近更新した項目が表示されます。</span
          >
        </ui-empty-state>
      `;
    }

    return html`
      <ol class="results-list corpora-overview__recent-list">
        ${recentNotes.map(
          (note) => html`
            <li class="corpora-overview__recent-item">
              <ui-card clickable variant="outlined" class="result-card">
                <a
                  class="result-link"
                  href=${note.permalink}
                  data-link-kind="internal-document"
                  data-link-surface="card"
                  @click=${(event: MouseEvent) => {
                    this._onLinkClick(event, note.permalink);
                  }}
                >
                  <div class="result-path corpora-overview__note-path">${note.pathLabel}</div>
                  <h2 class="result-title">${note.title}</h2>
                  <div class="result-meta corpora-overview__note-meta">
                    <span>更新日: ${renderDate(note.date)}</span>
                    ${note.genres.length > 0
                      ? html`<span class="corpora-overview__genres"
                          >${note.genres.join(' / ')}</span
                        >`
                      : nothing}
                  </div>
                  ${note.summary.length > 0
                    ? html`<p class="result-excerpt corpora-overview__note-summary">
                        ${note.summary}
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
    const overview = this._overviewData;
    if (overview === null) {
      return nothing;
    }

    return html`
      <section class="corpora-overview page-shell" aria-labelledby="corpora-overview-title">
        <div class="hero">
          <p class="eyebrow">Corpora / Overview</p>
          <h1 id="corpora-overview-title" class="heading">すべてのノート</h1>
          <p class="description">
            公開しているコーパスと最近更新したノートを、ひとつの入口から横断して辿るための一覧です。
          </p>
          <div class="meta-row corpora-overview__meta">
            <span class="corpora-overview__summary"
              >${overview.corpusCount.toString()}件のコーパス</span
            >
            <span class="corpora-overview__summary"
              >${overview.noteCount.toString()}件のノート</span
            >
            ${overview.latestUpdatedDate
              ? html`<span>最新更新 ${renderDate(overview.latestUpdatedDate)}</span>`
              : nothing}
          </div>
        </div>

        <section
          class="results-section corpora-overview__section"
          aria-labelledby="corpora-list-title"
        >
          <header class="corpora-overview__section-header">
            <h2 id="corpora-list-title" class="corpora-overview__section-title">
              コーパスから辿る
            </h2>
            <p class="corpora-overview__section-description">
              個別の閲覧単位としてコーパスを選び、そのまとまりに属するノートへ入ります。
            </p>
          </header>
          ${this._renderCorpora(overview.corpora)}
        </section>

        <section class="corpora-overview__section" aria-labelledby="recent-notes-title">
          <header class="corpora-overview__section-header">
            <h2 id="recent-notes-title" class="corpora-overview__section-title">
              最近更新したノート
            </h2>
            <p class="corpora-overview__section-description">
              コーパスを横断して、最近更新した公開ノートから読み始められます。
            </p>
          </header>
          ${this._renderRecentNotes(overview.recentNotes)}
        </section>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'corpora-overview-page': CorporaOverviewPage;
  }
}
