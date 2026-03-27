import { html, LitElement, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

interface AboutSection {
  id: string;
  heading: string;
  body: readonly TemplateResult[];
}

const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    id: 'overview',
    heading: 'このページについて',
    body: [
      html`Rouaultは、 Ruo
      Miyataの個人的なメモ帳です。プログラミングから文学や経済学など様々なコンテンツをまとめるために存在しています。`,
      html`基本的に私自身が理解できるような形で記述しますが、
      Webサイトとして公開する以上閲覧しやすいように記述する予定です。`,
    ],
  },
  {
    id: 'copyright',
    heading: '著作権について',
    body: [
      html`当サイトの文章は特記がない限り、<a href="https://creativecommons.org/licenses/by/4.0/"
          >Creative Commons Attribution 4.0 International License（CC BY 4.0）</a
        >のもとで利用を許諾します。`,
      html`ただし、引用部分、第三者著作物、外部サイトのスクリーンショット、ロゴ・商標、埋め込みコンテンツその他個別注記のある素材は、各権利者に権利が帰属し、上記
      CC BY 4.0 の対象外です。`,
      html`個別の注記がある場合は、当該注記を優先します`,
    ],
  },
  {
    id: 'tech-stack',
    heading: '技術詳細',
    body: [
      html`このサイトは、個人的な知的蓄積を長期的に整理・公開するためのナレッジベースとして設計されています。構成の中核には静的生成を据え、コンテンツの可搬性と配信時の軽量性を確保しつつ、必要な箇所にのみ動的な振る舞いを与える方針を採っています。基盤には
        <a href="https://www.11ty.dev/">Eleventy</a> 、コンテンツ管理には
        <a href="https://velite.js.org/">Velite</a> 、UI実装には
        <a href="https://lit.dev/">Lit</a> と
        <a href="https://www.typescriptlang.org/">TypeScript</a> を用いています。`,
      html`レンダリングは、単純な静的HTML配信にとどまるものではありません。ビルド時には Eleventy
      によって各ページを生成し、その過程で @lit-labs/ssr を通じてLit製の Web Components
      を事前描画しています。これにより、初期表示時には静的サイトとしての応答性を保ちながら、閲覧後に必要となる操作性のみをクライアント側で補完する構成を実現しています。静的生成の安定性と、コンポーネント指向UIの柔軟性を両立させるための設計です。`,
      html`コンテンツは Markdown
        を中心に管理しつつ、数式、コード、対訳、楽譜など、専門的な記述形式に対応できるよう拡張しています。コードハイライトは
        <a href="https://shiki.matsu.io/">Shiki</a> によりビルド時に生成し、検索には
        <a href="https://pagefind.app/">Pagefind</a> を採用しています。また、日本語検索においては
        Intl.Segmenter
        を前処理に利用することで、英語圏中心の既定挙動に依存しない検索体験を整えています。`,
      html`開発環境と品質保証においても、責務は比較的明確に分離しています。コンポーネントの開発・検証には
        <a href="https://storybook.js.org/">Storybook</a> と
        <a href="https://vitest.dev/">Vitest</a> を、よりブラウザ寄りの検証には
        <a href="https://modern-web.dev/docs/test-runner/overview/">Web Test Runner</a> を、E2E
        テストには <a href="https://playwright.dev/">Playwright</a> を用いています。加えて、<a
          href="https://eslint.org/"
          >ESLint</a
        >
        と
        <a href="https://prettier.io/">Prettier</a> により記述の一貫性を保ち、ビルドおよびデプロイは
        GitHub Actions を介して Cloudflare Pages
        へ接続しています。UI設計、実装、検証、配信までを、できる限り一続きの再現可能な工程として扱うことを重視しています。`,
      html`ホスティングは Cloudflare Pages を中心とし、必要に応じて Cloudflare R2
      をアーカイブ用途に組み合わせる構成を視野に入れています。そのため、このサイトは一般的なブログのように単発の記事を時系列で積み上げるというよりも、永続的な参照、再編集、再構成に耐える知識基盤として設計されています。結果として、執筆者にとっては拡張しやすく、閲覧者にとっては高速で予測可能かつ安定した読書体験を提供することを目標としています。`,
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
        <article class="layout-main-col container-reading about-main-col">
          <div class="about-content">
            <header class="about-hero">
              <p class="about-eyebrow">About Rouault</p>
              <h1 class="about-title">静かに読むための、独立したページ骨格</h1>
              <p class="about-lead">Rouaultはどういうものなのか</p>
            </header>

            <div class="about-summary" aria-label="ページの要約">
              <p class="about-summary-label">Snapshot</p>
              <ul class="about-summary-list">
                <li>個人的なメモ帳</li>
                <li>Litを本格的に使うために作成したサイト</li>
              </ul>
            </div>

            <div id="about-page-content" class="about-prose">
              ${ABOUT_SECTIONS.flatMap((section) => [
                html`
                  <h2 id=${section.id}>
                    <span class="heading-text">${section.heading}</span>
                    <a
                      class="heading-anchor"
                      href=${`#${section.id}`}
                      aria-label=${`「${section.heading}」への固定リンク`}
                    >
                      <ui-icon name="link" aria-hidden="true"></ui-icon>
                    </a>
                  </h2>
                `,
                ...section.body.map((paragraph) => html`<p>${paragraph}</p>`),
              ])}
            </div>
          </div>
        </article>

        <aside class="layout-toc-col" aria-label="目次">
          <layout-toc
            headings-json=${JSON.stringify(ABOUT_HEADINGS)}
            content-root-id="about-page-content"
            home-href="/"
          ></layout-toc>
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
