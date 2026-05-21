import { createManifestLoadedRouteClassificationMode } from '../shared/link/link-annotation.js';
import type { SiteUrlContext } from '../shared/site/site-url-context.js';
import { renderTextLinkHtml } from './layouts/link-html.js';
import { escapeHtmlText, serializeHtmlAttributes } from './layouts/html-output.js';
import { renderStaticArticleHeaderIconHtml } from './layouts/article-header-icon-html.js';

interface AboutRenderData {
  siteUrlContext?: SiteUrlContext | null;
}

interface AboutLinkContext {
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl: string;
}

interface AboutSection {
  id: string;
  heading: string;
  bodyHtml: (context: AboutLinkContext) => readonly string[];
}

const ABOUT_SUMMARY_ITEMS = [
  '個人ノートを読むためのWebアプリケーション',
  '本文を優先し、落ち着いて通読できることを重視',
  '長期的な整理・再編集・参照を前提に設計',
] as const;

const ABOUT_ROUTE_SET = new Set(['/', '/about/', '/search/', '/corpora/']);

const createAboutRouteClassificationMode = () =>
  createManifestLoadedRouteClassificationMode({
    isInternalDocumentPathname: (pathname) => ABOUT_ROUTE_SET.has(pathname),
  });

const renderAboutLink = (
  context: AboutLinkContext,
  href: string,
  label: string,
): string =>
  renderTextLinkHtml({
    href,
    label,
    surface: 'prose',
    siteUrlContext: context.siteUrlContext,
    currentUrl: context.currentUrl,
    routeClassificationMode: createAboutRouteClassificationMode(),
  });

const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    id: 'overview',
    heading: 'Rouaultについて',
    bodyHtml: () => [
      'Rouaultは分野横断的なノートを扱います。ただし目指しているのは、広い知識を素早く見渡すための情報ポータルではありません。プログラミングであれ、数学であれ、文学であれ、一定のまとまりを持った文章を本文中心に読み込める、静かな読書環境を目指しています。',
    ],
  },
  {
    id: 'writing-policy',
    heading: '公開方針',
    bodyHtml: () => [
      'ここに置く文章はあくまで自分の理解を整理するためのノートです。そのため入門的な解説よりも、論点の切り分け、定義の確認、実装や読解の過程を重視する場合があります。',
      'また、必要に応じて追記・修正・再構成も行います。',
    ],
  },
  {
    id: 'copyright',
    heading: '著作権について',
    bodyHtml: (context) => [
      `当サイトの文章は特記がない限り、${renderAboutLink(context, 'https://creativecommons.org/licenses/by/4.0/', 'Creative Commons Attribution 4.0 International License（CC BY 4.0）')}のもとで利用を許諾します。`,
      'ただし引用部分、第三者著作物、外部サイトのスクリーンショット、ロゴ・商標、埋め込みコンテンツその他個別注記のある素材は各権利者に権利が帰属し、上記 CC BY 4.0 の対象外です。',
      '個別の注記がある場合は当該注記を優先します。',
    ],
  },
  {
    id: 'tech-stack',
    heading: '技術構成',
    bodyHtml: (context) => [
      'Rouaultは静的生成を中核に据えつつ、必要な箇所だけに動的な振る舞いを与える構成を採っています。コンテンツはMarkdownを中心に管理し、UIはLitとTypeScriptで実装しています。',
      `表示面では検索、目次、サイドバー、コード表示、数式、画像などを扱いますが、どの機能も本文の可読性を損なわないことを優先しています。実装や検証の詳細については、${renderAboutLink(context, 'https://github.com/Rouault108/rouault', 'GitHubリポジトリ')}のREADMEおよびdocsを参照してください。`,
    ],
  },
  {
    id: 'author',
    heading: '作者について',
    bodyHtml: (context) => [
      'ソフトウェアエンジニア、時々デザイナー。広範な学術的なトピックがあります。',
      '好きなプログラミング言語はRust。使用頻度の高い言語はC++、C#、Java、JavaScript/TypeScript、Pythonです。',
      `ご連絡がある場合は、${renderAboutLink(context, 'mailto:miyaty.ruo@gmail.com', 'メール')}まで。`,
    ],
  },
] as const;

const ABOUT_CONTENT_ROOT_ID = 'about-page-content';

const renderSummaryItems = (): string =>
  ABOUT_SUMMARY_ITEMS.map((item) => `<li>${escapeHtmlText(item)}</li>`).join('');

const resolveAboutLinkContext = (data: AboutRenderData): AboutLinkContext => {
  if (!data.siteUrlContext) {
    throw new Error('AboutPageTemplate requires siteUrlContext.');
  }
  return {
    siteUrlContext: data.siteUrlContext,
    currentUrl: `${data.siteUrlContext.siteOrigin}${data.siteUrlContext.basePath}/about/`,
  };
};

const renderSection = (section: AboutSection, context: AboutLinkContext): string => {
  const headingAttributes = serializeHtmlAttributes([{ name: 'id', value: section.id }]);
  const anchorAttributes = serializeHtmlAttributes([
    { name: 'class', value: 'heading-anchor' },
    { name: 'href', value: `#${section.id}` },
    { name: 'data-link-kind', value: 'internal-fragment' },
    { name: 'data-link-surface', value: 'structural' },
    { name: 'aria-label', value: `「${section.heading}」への固定リンク` },
  ]);

  const body = section.bodyHtml(context).map((paragraph) => `<p>${paragraph}</p>`).join('\n');

  return `
    <h2${headingAttributes}>
      <span class="heading-text">${escapeHtmlText(section.heading)}</span>
      <a${anchorAttributes}>
        ${renderStaticArticleHeaderIconHtml('link', 'heading-anchor-icon')}
      </a>
    </h2>
    ${body}
  `.trim();
};

const renderSections = (context: AboutLinkContext): string =>
  ABOUT_SECTIONS.map((section) => renderSection(section, context)).join('\n');

export class AboutPageTemplate {
  data() {
    return {
      layout: 'base',
      title: 'About',
      permalink: '/about/index.html',
      headerTocPresence: 'absent',
    };
  }

  render(data: AboutRenderData) {
    const linkContext = resolveAboutLinkContext(data);
    return `
      <section class="about-shell">
        <article class="about-main-col">
          <div class="about-content">
            <header class="about-hero">
              <p class="about-eyebrow">About Rouault</p>
              <h1 class="about-title">個人ノートを静かに読むためのアプリケーション</h1>
              <p class="about-lead">Rouaultの目的と設計方針</p>
            </header>

            <div class="about-summary" aria-label="ページの要約">
              <p class="about-summary-label">Snapshot</p>
              <ul class="about-summary-list">
                ${renderSummaryItems()}
              </ul>
            </div>

            <div id="${ABOUT_CONTENT_ROOT_ID}" class="about-prose">
              ${renderSections(linkContext)}
            </div>
          </div>
        </article>
      </section>
    `.trim();
  }
}

export default AboutPageTemplate;
