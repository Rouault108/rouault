import { createManifestLoadedRouteClassificationMode } from '../shared/link/link-annotation.js';
import type { SiteUrlContext } from '../shared/site/site-url-context.js';
import { applyBasePathToRenderHref } from '../shared/url/normalize-rouault-url.js';
import { renderTextLinkHtml } from './layouts/link-html.js';
import { escapeHtmlText, serializeHtmlAttributes } from './layouts/html-output.js';
import { renderStaticIconHtml } from '../shared/icons/render-static-icon-html.js';

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

const ABOUT_DESCRIPTION =
  'Rouaultは、ソフトウェア、計算機科学、設計、読書を通じて調べたことや考えたことを、後から辿れる形で残す個人の公開ノートです。一定のまとまりを持った文章を本文中心に読み込める、静かな読書環境を目指しています。';

const ABOUT_ROUTE_SET = new Set(['/', '/about/', '/search/', '/corpora/']);

const createAboutRouteClassificationMode = () =>
  createManifestLoadedRouteClassificationMode({
    isInternalDocumentPathname: (pathname) => ABOUT_ROUTE_SET.has(pathname),
  });

const renderAboutLink = (context: AboutLinkContext, href: string, label: string): string =>
  renderTextLinkHtml({
    href,
    label,
    surface: 'prose',
    siteUrlContext: context.siteUrlContext,
    currentUrl: context.currentUrl,
    routeClassificationMode: createAboutRouteClassificationMode(),
  });

const renderAboutInternalLink = (
  context: AboutLinkContext,
  pathname: string,
  label: string,
): string =>
  renderAboutLink(
    context,
    applyBasePathToRenderHref({ pathname, siteUrlContext: context.siteUrlContext }),
    label,
  );

const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    id: 'writing-policy',
    heading: 'ノートについて',
    bodyHtml: () => [
      'ここに置く文章は、自分の理解を整理するために書いています。論点を切り分け、言葉の定義を確かめながら、実装や読解の過程を残していきます。',
      'ノートは、必要に応じて追記・修正・再構成します。書いた内容を後から読み返し、理解の変化に合わせて整理し直すことも、このサイトの使い方の一つです。',
    ],
  },
  {
    id: 'finding-notes',
    heading: 'ノートの探し方',
    bodyHtml: (context) => [
      `最近更新したノートは${renderAboutInternalLink(context, '/', 'トップページ')}に掲載しています。${renderAboutInternalLink(context, '/corpora/', 'コーパスの一覧')}では、ノートを「コーパス」というまとまりごとに辿れます。`,
      `探したい言葉や話題があるときは、${renderAboutInternalLink(context, '/search/', '検索')}を利用できます。ノートを開いた後は、目次やサイドバーも読む場所を探す手がかりになります。`,
    ],
  },
  {
    id: 'author',
    heading: '作者について',
    bodyHtml: (context) => [
      'ソフトウェアエンジニア、時々デザイナー。',
      '好きなプログラミング言語はRust。使用頻度の高い言語はC++、C#、Java、JavaScript/TypeScript、Pythonです。',
      `ご連絡がある場合は、${renderAboutLink(context, 'mailto:miyaty.ruo@gmail.com', 'miyaty.ruo@gmail.com')}まで。`,
    ],
  },
  {
    id: 'tech-stack',
    heading: 'このサイトのつくり',
    bodyHtml: (context) => [
      'ノートはMarkdownを中心に管理し、静的なHTMLとして公開しています。本文やリンクを基本に、検索などの操作に必要な機能をJavaScriptで加える構成です。',
      '目次、サイドバー、コード表示、数式、画像などを扱う際も、本文の読みやすさを優先しています。文章を通して読むことと、必要な箇所へ戻って参照することの両方を支えられるように設計しています。',
      `技術構成や実装・検証の詳しい内容は、${renderAboutLink(context, 'https://github.com/Rouault108/rouault', 'GitHubリポジトリ')}のREADMEおよびdocsを参照してください。`,
    ],
  },
  {
    id: 'copyright',
    heading: '利用について',
    bodyHtml: (context) => [
      `当サイトの文章は特記がない限り、${renderAboutLink(context, 'https://creativecommons.org/licenses/by/4.0/', 'Creative Commons Attribution 4.0 International License（CC BY 4.0）')}のもとで利用を許諾します。`,
      'ただし引用部分、第三者著作物、外部サイトのスクリーンショット、ロゴ・商標、埋め込みコンテンツその他個別注記のある素材は各権利者に権利が帰属し、上記CC BY 4.0の対象外です。',
      '個別の注記がある場合は当該注記を優先します。',
    ],
  },
] as const;

const ABOUT_CONTENT_ROOT_ID = 'about-page-content';

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

  const body = section
    .bodyHtml(context)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('\n');

  return `
    <h2${headingAttributes}>
      <span class="heading-text">${escapeHtmlText(section.heading)}</span>
      <a${anchorAttributes}>
        ${renderStaticIconHtml('link', 'heading-anchor-icon')}
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
      title: 'このサイトについて',
      description: ABOUT_DESCRIPTION,
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
              <h1 id="overview" class="about-title">このサイトについて</h1>
              <p class="about-lead">${escapeHtmlText(ABOUT_DESCRIPTION)}</p>
            </header>

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
