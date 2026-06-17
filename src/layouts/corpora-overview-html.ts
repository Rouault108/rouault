import type { HomeNoteItem } from '../data/home.js';
import type { CorporaOverviewCorpusItem, CorporaOverviewData } from '../data/corporaOverview.js';
import { renderEmptyStateHtml } from './empty-state-html.js';
import { escapeHtmlAttribute, escapeHtmlText } from './html-output.js';

const renderDate = (value: string | null): string =>
  value ? `<time datetime="${escapeHtmlAttribute(value)}">${escapeHtmlText(value)}</time>` : '—';

const renderCorpora = (corpora: readonly CorporaOverviewCorpusItem[]): string => {
  if (corpora.length === 0) {
    return renderEmptyStateHtml({
      heading: '公開コーパスはまだありません',
      description: 'ノートが公開されると、ここにコーパス一覧が表示されます。',
    });
  }

  return `<ol class="results-list corpora-overview__corpus-grid">${corpora
    .map(
      (corpus) => `
        <li class="corpora-overview__corpus-item">
          <article class="result-card" data-result-card>
            <a
              class="result-link"
              href="${escapeHtmlAttribute(corpus.renderHref)}"
              data-link-kind="internal-document"
              data-link-surface="card"
            >
              <div class="result-path">${escapeHtmlText(corpus.href)}</div>
              <h2 class="result-title">${escapeHtmlText(corpus.label)}</h2>
              <div class="result-meta corpora-overview__corpus-meta">
                <span>${corpus.noteCount.toString()}件のノート</span>
                ${
                  corpus.latestUpdatedDate
                    ? `<span>最新更新 ${renderDate(corpus.latestUpdatedDate)}</span>`
                    : ''
                }
              </div>
            </a>
          </article>
        </li>
      `,
    )
    .join('')}</ol>`;
};

const renderRecentNotes = (recentNotes: readonly HomeNoteItem[]): string => {
  if (recentNotes.length === 0) {
    return renderEmptyStateHtml({
      heading: '公開ノートはまだありません',
      description: 'ノートが公開されると、ここに最近更新した項目が表示されます。',
    });
  }

  return `<ol class="results-list corpora-overview__recent-list">${recentNotes
    .map(
      (note) => `
        <li class="corpora-overview__recent-item">
          <article class="result-card" data-result-card>
            <a
              class="result-link"
              href="${escapeHtmlAttribute(note.renderHref)}"
              data-link-kind="internal-document"
              data-link-surface="card"
            >
              <div class="result-path corpora-overview__note-path">${escapeHtmlText(
                note.pathLabel,
              )}</div>
              <h2 class="result-title">${escapeHtmlText(note.title)}</h2>
              <div class="result-meta corpora-overview__note-meta">
                <span>更新日: ${renderDate(note.date)}</span>
                ${
                  note.genres.length > 0
                    ? `<span class="corpora-overview__genres">${escapeHtmlText(
                        note.genres.join(' / '),
                      )}</span>`
                    : ''
                }
              </div>
              ${
                note.summary.length > 0
                  ? `<p class="result-excerpt corpora-overview__note-summary">${escapeHtmlText(
                      note.summary,
                    )}</p>`
                  : ''
              }
            </a>
          </article>
        </li>
      `,
    )
    .join('')}</ol>`;
};

export const renderCorporaOverviewHtml = (overview: CorporaOverviewData): string =>
  `
  <section class="corpora-overview page-shell" aria-labelledby="corpora-overview-title">
    <div class="hero">
      <p class="eyebrow">Corpora / Overview</p>
      <h1 id="corpora-overview-title" class="heading">すべてのノート</h1>
      <p class="description">
        公開しているコーパスと最近更新したノートを、ひとつの入口から横断して辿るための一覧です。
      </p>
      <div class="meta-row corpora-overview__meta">
        <span class="corpora-overview__summary">${overview.corpusCount.toString()}件のコーパス</span>
        <span class="corpora-overview__summary">${overview.noteCount.toString()}件のノート</span>
        ${
          overview.latestUpdatedDate
            ? `<span>最新更新 ${renderDate(overview.latestUpdatedDate)}</span>`
            : ''
        }
      </div>
    </div>
    <section class="results-section corpora-overview__section" aria-labelledby="corpora-list-title">
      <header class="corpora-overview__section-header">
        <h2 id="corpora-list-title" class="corpora-overview__section-title">コーパスから辿る</h2>
        <p class="corpora-overview__section-description">
          個別の閲覧単位としてコーパスを選び、そのまとまりに属するノートへ入ります。
        </p>
      </header>
      ${renderCorpora(overview.corpora)}
    </section>
    <section class="corpora-overview__section" aria-labelledby="recent-notes-title">
      <header class="corpora-overview__section-header">
        <h2 id="recent-notes-title" class="corpora-overview__section-title">最近更新したノート</h2>
        <p class="corpora-overview__section-description">
          コーパスを横断して、最近更新した公開ノートから読み始められます。
        </p>
      </header>
      ${renderRecentNotes(overview.recentNotes)}
    </section>
  </section>
`.trim();
