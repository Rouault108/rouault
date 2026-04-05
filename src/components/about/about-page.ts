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
    heading: 'Rouaultについて',
    body: [
      html`Rouaultは、個人的に蓄積しているノートを、落ち着いて読める形で整理・公開するためのWebアプリケーションです。一般的なブログのように記事を時系列で積み上げるというよりも、後から読み返し、参照し、必要に応じて再構成できる知識の置き場として設計しています。`,
      html`扱う内容はプログラミング、数学、文学、経済学などにまたがりますが、主題は分野の広さそのものではありません。断片的な情報を消費するためではなく、一定のまとまりを持った文章やノートを、本文中心に読むことを重視しています。`,
      html`そのためRouaultでは、派手な演出や過剰なUIよりも、読みやすい余白、安定したナビゲーション、予測可能な挙動を優先しています。閲覧者にとっては静かな読書体験を、執筆者にとっては長期的に保守しやすい構成を目標としています。`,
    ],
  },
  {
    id: 'writing-policy',
    heading: '公開方針',
    body: [
      html`ここに置く文章は、もともと自分の理解を整理するためのノートを基礎にしています。そのため、入門的な解説よりも、論点の切り分け、定義の確認、実装や読解の過程を重視する場合があります。`,
      html`ただし、公開する以上は個人的な記法に閉じず、できる限り再読しやすく、参照しやすい形に整える方針です。必要に応じて追記・修正・再構成を行うため、個々のページは固定的な完成品というより、長期的に手入れされる記録として扱います。`,
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
      html`個別の注記がある場合は、当該注記を優先します。`,
    ],
  },
  {
    id: 'tech-stack',
    heading: '技術構成',
    body: [
      html`Rouaultは、静的生成を中核に据えつつ、必要な箇所だけに動的な振る舞いを与える構成を採っています。コンテンツはMarkdownを中心に管理し、UIはLitとTypeScriptで実装しています。`,
      html`表示面では、検索、目次、サイドバー、コード表示、数式、画像などを扱いますが、どの機能も本文の可読性を損なわないことを優先しています。実装や検証の詳細は継続的に更新されるため、技術的な正本は<a
          href="https://github.com/Rouault108/rouault"
          >リポジトリー</a
        >のREADMEおよびdocsを参照してください。`,
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
              <h1 class="about-title">個人ノートを、静かに読むためのアプリケーション</h1>
              <p class="about-lead">Rouault の目的と設計方針</p>
            </header>

            <div class="about-summary" aria-label="ページの要約">
              <p class="about-summary-label">Snapshot</p>
              <ul class="about-summary-list">
                <li>個人ノートを読むための Web アプリケーション</li>
                <li>本文を優先し、落ち着いて通読できることを重視</li>
                <li>長期的な整理・再編集・参照を前提に設計</li>
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
