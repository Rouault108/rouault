import { loadHomeData, type HomePageData } from './data/home.js';
import { escapeHtmlText, serializeHtmlAttributes } from './layouts/html-output.js';

interface HomePageTemplateData {
  home?: HomePageData;
}

const renderTime = (value: string | null): string =>
  value
    ? `<time${serializeHtmlAttributes([{ name: 'datetime', value }])}>${escapeHtmlText(value)}</time>`
    : '—';

const renderGenres = (genres: readonly string[]): string =>
  genres.length > 0 ? genres.map((genre) => escapeHtmlText(genre)).join(' / ') : '—';

const renderHomeEntry = (entry: HomePageData['notes'][number]): string => `
  <li class="home-feed-item">
    <a${serializeHtmlAttributes([
      { name: 'class', value: 'home-entry' },
      { name: 'href', value: entry.permalink },
      { name: 'data-link-kind', value: 'internal-document' },
      { name: 'data-link-surface', value: 'card' },
    ])}>
      <div class="home-entry__date">${renderTime(entry.date)}</div>
      <div class="home-entry__body">
        <p class="home-entry__path">${escapeHtmlText(entry.pathLabel)}</p>
        <h3 class="home-entry__title">${escapeHtmlText(entry.title)}</h3>
        ${entry.summary.length > 0 ? `<p class="home-entry__summary">${escapeHtmlText(entry.summary)}</p>` : ''}
        <p class="home-entry__genre">${renderGenres(entry.genres)}</p>
      </div>
    </a>
  </li>
`;

export class HomePageTemplate {
  data() {
    return {
      layout: 'base',
      description: 'Rouaultの公開ノートを静かに読むためのトップページ。',
      permalink: '/index.html',
    };
  }

  render(data: HomePageTemplateData) {
    const home = data.home ?? loadHomeData();
    const noteCount = home.publicNoteCount.toLocaleString('ja-JP');
    const latestUpdatedDate = renderTime(home.latestUpdatedDate);

    return `
      <section class="home-shell">
        <article class="home-content">
          <header class="home-hero">
            <p class="home-eyebrow">Rouault</p>
            <h1 class="home-title">調べたこと、考えたこと、読み返したいこと。</h1>
            <p class="home-lead">ソフトウェア、計算機科学、設計、読書から得た理解を、後から辿れる形で整理しています。</p>
            <p${serializeHtmlAttributes([
              { name: 'class', value: 'home-meta' },
              { name: 'aria-label', value: '公開ノートの概要' },
            ])}>
              <span class="home-meta-item">最終更新 ${latestUpdatedDate}</span>
              <span class="home-meta-separator" aria-hidden="true">・</span>
              <a class="home-meta-link link-text link-text--muted" href="/about/" data-link-kind="internal-document" data-link-surface="metadata">このサイトについて</a>
            </p>
          </header>

          <section aria-labelledby="home-feed-heading" class="home-feed-section">
            <div class="home-feed-header">
              <h2 id="home-feed-heading" class="home-feed-title">新着一覧</h2>
              <p class="home-feed-meta">${escapeHtmlText(noteCount)}件</p>
            </div>
            ${
              home.notes.length > 0
                ? `
                <ol class="home-feed-list">
                  ${home.notes.map((entry) => renderHomeEntry(entry)).join('')}
                </ol>
              `
                : '<p class="home-empty">公開ノートはまだありません。</p>'
            }
          </section>
        </article>
      </section>
    `.trim();
  }
}

export default HomePageTemplate;
