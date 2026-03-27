import { loadHomeData, type HomePageData } from './data/home.js';

interface HomePageTemplateData {
  home?: HomePageData;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderTime = (value: string | null): string =>
  value ? `<time datetime="${escapeHtml(value)}">${escapeHtml(value)}</time>` : '—';

const renderGenres = (genres: readonly string[]): string =>
  genres.length > 0 ? genres.map((genre) => escapeHtml(genre)).join(' / ') : '—';

const renderHomeEntry = (entry: HomePageData['notes'][number]): string => `
  <li class="home-feed-item">
    <a class="home-entry" href="${escapeHtml(entry.permalink)}">
      <div class="home-entry__date">${renderTime(entry.date)}</div>
      <div class="home-entry__body">
        <p class="home-entry__path">${escapeHtml(entry.pathLabel)}</p>
        <h3 class="home-entry__title">${escapeHtml(entry.title)}</h3>
        <p class="home-entry__summary">${escapeHtml(entry.summary || '—')}</p>
        <p class="home-entry__genre">${renderGenres(entry.genres)}</p>
      </div>
    </a>
  </li>
`;

export class HomePageTemplate {
  data() {
    return {
      layout: 'base',
      description: 'Rouault の公開ノートを静かに読むためのトップページ。',
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
            <h1 class="home-title">静かに入り、静かに読み進める。</h1>
            <p class="home-lead">
              公開している個人ノートを、余白と細い罫線だけで整えた導入部にまとめています。
              入口は静かに、一覧は新しい順で、必要なものだけを辿れる構成です。
            </p>
            <dl class="home-meta" aria-label="公開ノートの概要">
              <div class="home-meta-item">
                <dt class="home-meta-label">公開ノート件数</dt>
                <dd class="home-meta-value">${escapeHtml(noteCount)}件</dd>
              </div>
              <div class="home-meta-item">
                <dt class="home-meta-label">最新更新日</dt>
                <dd class="home-meta-value">${latestUpdatedDate}</dd>
              </div>
            </dl>
            <nav class="home-actions" aria-label="ホームの導線">
              <a class="home-action" href="/about/">このサイトについて</a>
            </nav>
          </header>

          <section class="home-feed-section" aria-labelledby="home-feed-heading">
            <div class="home-feed-header">
              <h2 id="home-feed-heading" class="home-feed-title">新着一覧</h2>
            </div>
            ${home.notes.length > 0
              ? `
                <ol class="home-feed-list">
                  ${home.notes.map((entry) => renderHomeEntry(entry)).join('')}
                </ol>
              `
              : '<p class="home-empty">公開ノートはまだありません。</p>'}
          </section>
        </article>
      </section>
    `.trim();
  }
}

export default HomePageTemplate;
