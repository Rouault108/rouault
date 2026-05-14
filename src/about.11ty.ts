import { escapeHtmlText, serializeHtmlAttributes } from './layouts/html-output.js';
import { renderTocChromeHtml } from './layouts/toc-html.js';
import type { TocChromeProjection } from '../shared/toc/toc-chrome-projection.js';

interface AboutSection {
  id: string;
  heading: string;
  bodyHtml: readonly string[];
}

const ABOUT_SUMMARY_ITEMS = [
  '個人ノートを読むための Web アプリケーション',
  '本文を優先し、落ち着いて通読できることを重視',
  '長期的な整理・再編集・参照を前提に設計',
] as const;

const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    id: 'overview',
    heading: 'Rouaultについて',
    bodyHtml: [
      'Rouaultは、Ruo Miyataが個人的に蓄積しているノートを、落ち着いて読める形で整理・公開するためのWebアプリケーションです。一般的なブログのように記事を時系列で積み上げるというよりも、後から読み返し、参照し、必要に応じて再構成できる知識の置き場として設計しています。',
      '扱う内容はプログラミング、数学、文学、経済学などにまたがりますが、主題は分野の広さそのものではありません。断片的な情報を消費するためではなく、一定のまとまりを持った文章やノートを、本文中心に読むことを重視しています。',
      'そのためRouaultでは、派手な演出や過剰なUIよりも、読みやすい余白、安定したナビゲーション、予測可能な挙動を優先しています。閲覧者にとっては静かな読書体験を、執筆者にとっては長期的に保守しやすい構成を目標としています。',
    ],
  },
  {
    id: 'writing-policy',
    heading: '公開方針',
    bodyHtml: [
      'ここに置く文章は、もともと自分の理解を整理するためのノートを基礎にしています。そのため、入門的な解説よりも、論点の切り分け、定義の確認、実装や読解の過程を重視する場合があります。',
      'ただし、公開する以上は個人的な記法に閉じず、できる限り再読しやすく、参照しやすい形に整える方針です。必要に応じて追記・修正・再構成を行うため、個々のページは固定的な完成品というより、長期的に手入れされる記録として扱います。',
    ],
  },
  {
    id: 'copyright',
    heading: '著作権について',
    bodyHtml: [
      '当サイトの文章は特記がない限り、<a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License（CC BY 4.0）</a>のもとで利用を許諾します。',
      'ただし、引用部分、第三者著作物、外部サイトのスクリーンショット、ロゴ・商標、埋め込みコンテンツその他個別注記のある素材は、各権利者に権利が帰属し、上記 CC BY 4.0 の対象外です。',
      '個別の注記がある場合は、当該注記を優先します。',
    ],
  },
  {
    id: 'tech-stack',
    heading: '技術構成',
    bodyHtml: [
      'Rouaultは、静的生成を中核に据えつつ、必要な箇所だけに動的な振る舞いを与える構成を採っています。コンテンツはMarkdownを中心に管理し、UIはLitとTypeScriptで実装しています。',
      '表示面では、検索、目次、サイドバー、コード表示、数式、画像などを扱いますが、どの機能も本文の可読性を損なわないことを優先しています。実装や検証の詳細は継続的に更新されるため、技術的な正本は<a href="https://github.com/Rouault108/rouault">GitHub Repository</a>のREADMEおよびdocsを参照してください。',
    ],
  },
  {
    id: 'author',
    heading: '作者について',
    bodyHtml: [
      'ソフトウェアエンジニア、時々デザイナー。広範な学術的なトピックに興味あり、最近は経済学史、特にケネス・アローについて学習しています。元々は哲学、文学、音楽に関心がありました。',
      'ご連絡がある場合は、<a href="mailto:miyaty.ruo@gmail.com">メール</a>まで。'
    ],
  }
] as const;

const ABOUT_HEADINGS = ABOUT_SECTIONS.map((section) => ({
  id: section.id,
  text: section.heading,
  level: 2,
}));

const ABOUT_TOC_SOURCE_ID = 'toc-source-about';
const ABOUT_TOC_RUNTIME_ID = 'about-page-toc';
const ABOUT_TOC_OWNER_ID = 'about-page-toc-owner';
const ABOUT_TOC_SCOPE_ID = 'about-toc';
const ABOUT_CONTENT_ROOT_ID = 'about-page-content';

const ABOUT_TOC_CAPABILITIES = {
  activeTracking: true,
  dynamicScopes: false,
  mobilePanel: true,
} as const;

const ABOUT_TOC = {
  sourceId: ABOUT_TOC_SOURCE_ID,
  runtimeId: ABOUT_TOC_RUNTIME_ID,
  ownerId: ABOUT_TOC_OWNER_ID,
  scopeId: ABOUT_TOC_SCOPE_ID,
  headings: ABOUT_HEADINGS,
  capabilities: ABOUT_TOC_CAPABILITIES,
  contentRootId: ABOUT_CONTENT_ROOT_ID,
  homeHref: '/',
  shouldHydrate: true,
} as const satisfies TocChromeProjection;

const renderSummaryItems = (): string =>
  ABOUT_SUMMARY_ITEMS.map((item) => `<li>${escapeHtmlText(item)}</li>`).join('');

const renderSection = (section: AboutSection): string => {
  const headingAttributes = serializeHtmlAttributes([{ name: 'id', value: section.id }]);
  const anchorAttributes = serializeHtmlAttributes([
    { name: 'class', value: 'heading-anchor' },
    { name: 'href', value: `#${section.id}` },
    { name: 'aria-label', value: `「${section.heading}」への固定リンク` },
  ]);

  const body = section.bodyHtml.map((paragraph) => `<p>${paragraph}</p>`).join('\n');

  return `
    <h2${headingAttributes}>
      <span class="heading-text">${escapeHtmlText(section.heading)}</span>
      <a${anchorAttributes}>
        <ui-icon name="link" aria-hidden="true"></ui-icon>
      </a>
    </h2>
    ${body}
  `.trim();
};

const renderSections = (): string =>
  ABOUT_SECTIONS.map((section) => renderSection(section)).join('\n');

export class AboutPageTemplate {
  data() {
    return {
      layout: 'base',
      title: 'About',
      permalink: '/about/index.html',
      headerTocPresence: 'present',
      headerTocRuntimeId: ABOUT_TOC_RUNTIME_ID,
      headerTocOwnerId: ABOUT_TOC_OWNER_ID,
      headerTocShouldHydrate: true,
    };
  }

  render() {
    return `
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
                ${renderSummaryItems()}
              </ul>
            </div>

            <div id="${ABOUT_CONTENT_ROOT_ID}" class="about-prose">
              ${renderSections()}
            </div>
          </div>
        </article>

        ${renderTocChromeHtml(ABOUT_TOC)}
      </section>
    `.trim();
  }
}

export default AboutPageTemplate;
