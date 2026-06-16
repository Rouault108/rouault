import type { CorpusPageEntry, CorpusPageNoteSummary } from '../data/corpusPages.js';
import { renderEmptyStateHtml } from './empty-state-html.js';
import { escapeHtmlAttribute, escapeHtmlText } from './html-output.js';

const renderNote = (note: CorpusPageNoteSummary): string => `
  <li class="corpus-page__item">
    <article class="result-card corpus-page__item-card" data-result-card>
      <a
        class="result-link corpus-page__item-link"
        href="${escapeHtmlAttribute(note.renderHref)}"
        data-link-kind="internal-document"
        data-link-surface="card"
      >
        <div class="result-path">${escapeHtmlText(note.permalink)}</div>
        <h2 class="result-title corpus-page__item-title">${escapeHtmlText(note.title)}</h2>
        ${
          note.date.length > 0
            ? `<div class="result-meta corpus-page__item-meta">更新日: ${escapeHtmlText(
                note.date,
              )}</div>`
            : ''
        }
        ${
          note.description.length > 0
            ? `<p class="result-excerpt corpus-page__item-description">${escapeHtmlText(
                note.description,
              )}</p>`
            : ''
        }
      </a>
    </article>
  </li>
`;

const renderNotes = (corpusPage: CorpusPageEntry): string => {
  if (corpusPage.notes.length === 0) {
    return renderEmptyStateHtml({
      heading: 'このコーパスの公開ノートはまだありません',
      description: '別のコーパスへ切り替えるか、時間をおいて再度確認してください。',
    });
  }

  return `<ol class="results-list corpus-page__list">${corpusPage.notes
    .map((note) => renderNote(note))
    .join('')}</ol>`;
};

export const renderCorpusPageHtml = (corpusPage: CorpusPageEntry): string =>
  `
  <section class="corpus-page page-shell" aria-labelledby="corpus-page-title">
    <div class="hero">
      <p class="eyebrow">Corpus</p>
      <h1 id="corpus-page-title" class="heading">${escapeHtmlText(corpusPage.label)}</h1>
      <p class="description">
        このコーパスに属する公開ノートを、新しいものから静かに辿れる入口です。
      </p>
      <div class="meta-row corpus-page__meta">
        <span class="corpus-page__count">${corpusPage.noteCount.toString()}件のノート</span>
        ${
          corpusPage.latestUpdatedDate
            ? `<span class="corpus-page__updated">最新更新 ${escapeHtmlText(
                corpusPage.latestUpdatedDate,
              )}</span>`
            : ''
        }
      </div>
    </div>
    <div class="results-section">${renderNotes(corpusPage)}</div>
  </section>
`.trim();
