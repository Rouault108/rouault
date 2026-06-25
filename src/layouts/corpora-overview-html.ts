import type { CorporaOverviewCorpusItem, CorporaOverviewData } from '../data/corporaOverview.js';
import { renderEmptyStateHtml } from './empty-state-html.js';
import { escapeHtmlAttribute, escapeHtmlText } from './html-output.js';

const renderDate = (value: string | null): string =>
  value ? `<time datetime="${escapeHtmlAttribute(value)}">${escapeHtmlText(value)}</time>` : '—';

const renderCorpora = (corpora: readonly CorporaOverviewCorpusItem[]): string => {
  if (corpora.length === 0) {
    return renderEmptyStateHtml({
      heading: '公開コーパスはまだありません',
      description: 'コーパス対象のノートが公開されると、ここにコーパス一覧が表示されます。',
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
                <span>${corpus.noteCount.toLocaleString('ja-JP')}件のノート</span>
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

export const renderCorporaOverviewHtml = (overview: CorporaOverviewData): string =>
  `
  <section class="corpora-overview page-shell" aria-labelledby="corpora-overview-title">
    <div class="hero">
      <p class="eyebrow">Corpora</p>
      <h1 id="corpora-overview-title" class="heading">コーパスから辿る</h1>
      <p class="description">
        公開ノートを、コーパスというまとまりごとに辿るための索引です。
      </p>
      <div class="meta-row corpora-overview__meta">
        <span class="corpora-overview__summary">${overview.corpusCount.toLocaleString('ja-JP')}件のコーパス</span>
        <span class="corpora-overview__summary">${overview.noteCount.toLocaleString('ja-JP')}件のノート</span>
        ${
          overview.latestUpdatedDate
            ? `<span>最新更新 ${renderDate(overview.latestUpdatedDate)}</span>`
            : '<span>最新更新なし</span>'
        }
      </div>
    </div>
    <section class="results-section corpora-overview__section" aria-labelledby="corpora-list-title">
      <header class="corpora-overview__section-header">
        <h2 id="corpora-list-title" class="corpora-overview__section-title">公開コーパス</h2>
        <p class="corpora-overview__section-description">
          閲覧単位を選び、そのまとまりに属するノートへ進みます。
        </p>
      </header>
      ${renderCorpora(overview.corpora)}
    </section>
  </section>
`.trim();
