import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import '../layout/layout-toc.js';

interface AboutSection {
  id: string;
  heading: string;
  body: readonly string[];
}

const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    id: 'overview',
    heading: 'このページについて',
    body: [
      'Rouault は、個人のメモを落ち着いて読むための専用ビューアとして設計されています。この about ページでは、公開サイトとしての前提と、読書体験を支える考え方を仮置きの文章でまとめています。',
      '内容はダミーですが、ノート本文とは独立した静的ページとして扱い、情報ページの骨格だけを先に固めています。',
    ],
  },
  {
    id: 'principles',
    heading: '設計の原則',
    body: [
      '本文では装飾を抑え、周辺の UI だけで構造を支えることを基本方針とします。読む対象の情報密度を上げ、補助導線は必要なときだけ視界に入るように設計します。',
      'また、Web 標準とアクセシビリティを前提条件とし、挙動の予測可能性と読みやすさを優先します。',
    ],
  },
  {
    id: 'reading-experience',
    heading: '読書体験の方向性',
    body: [
      'ノート一覧や検索は作業の入口ですが、読み始めたあとは本文への集中を妨げないことを重視します。余白、行間、見出しのリズムはそのための器として機能します。',
      'about のような独立ページでも同じ思想を保ちつつ、ノート固有のサイドバー構造には依存しないレイアウトを採用します。',
    ],
  },
  {
    id: 'next-steps',
    heading: '今後の追加予定',
    body: [
      'ここには将来的に、プロジェクトの背景、運用ポリシー、検索やタグ導線の説明、コンテンツ更新の方針などを追加していく想定です。',
      '現時点ではルーティング、SSR、TOC 連携、独立レイアウトの確認を優先し、文章は後から差し替えやすい構成にしています。',
    ],
  },
] as const;

const ABOUT_HEADINGS = ABOUT_SECTIONS.map((section) => ({
  id: section.id,
  text: section.heading,
  level: 2,
}));

@customElement('about-page')
export class AboutPage extends LitElement {
  private _didInitializeFromSsr = false;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    if (!this._didInitializeFromSsr) {
      // 初回接続時のみ SSR のライトDOMを除去し、再描画との二重化を避ける。
      this.replaceChildren();
      this._didInitializeFromSsr = true;
    }

    super.connectedCallback();
  }

  override render() {
    return html`
      <section class="about-shell">
        <article class="layout-main-col container-reading">
          <div class="about-content">
            <header class="about-hero">
              <p class="about-eyebrow">About Rouault</p>
              <h1 class="about-title">静かに読むための、独立したページ骨格</h1>
              <p class="about-lead">
                このページは仮の内容です。ノートの階層やサイドバーとは切り離し、
                説明用ページをどう見せるかだけを先に定義しています。
              </p>
            </header>

            <div class="about-summary" aria-label="ページの要約">
              <p class="about-summary-label">Snapshot</p>
              <ul class="about-summary-list">
                <li>ノートとは独立した静的ページ</li>
                <li>本文と TOC だけの 2 カラム</li>
                <li>内容は後で差し替え可能な仮テキスト</li>
              </ul>
            </div>

            <div class="prose">
              ${ABOUT_SECTIONS.map(
                (section) => html`
                  <section aria-labelledby=${section.id}>
                    <h2 id=${section.id}>${section.heading}</h2>
                    ${section.body.map((paragraph) => html`<p>${paragraph}</p>`)}
                  </section>
                `,
              )}
            </div>
          </div>
        </article>

        <aside class="layout-toc-col" aria-label="目次">
          <layout-toc headings-json=${JSON.stringify(ABOUT_HEADINGS)} home-href="/"></layout-toc>
        </aside>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'about-page': AboutPage;
  }
}
