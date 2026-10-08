import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

import { AboutPageTemplate } from '../../src/about.11ty.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];
type TextNode = DefaultTreeAdapterMap['textNode'];

interface ParentLike {
  readonly childNodes: readonly ChildNode[];
}

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;
const isTextNode = (node: ChildNode): node is TextNode => node.nodeName === '#text';

const getAttribute = (node: ElementNode, name: string): string | null =>
  node.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const collectElements = (
  node: ParentLike,
  predicate: (element: ElementNode) => boolean,
  matches: ElementNode[] = [],
): ElementNode[] => {
  for (const child of node.childNodes) {
    if (!isElementNode(child)) continue;
    if (predicate(child)) matches.push(child);
    collectElements(child, predicate, matches);
  }
  return matches;
};

const textContent = (node: ParentLike): string =>
  node.childNodes
    .map((child) => {
      if (isTextNode(child)) return child.value;
      if (isElementNode(child)) return textContent(child);
      return '';
    })
    .join('');

describe('AboutPageTemplate', () => {
  it('about 専用の TOC absent 静的ページ設定を返すこと', () => {
    const template = new AboutPageTemplate();
    const data = template.data();

    expect(data.layout).toBe('base');
    expect(data.title).toBe('このサイトについて');
    expect(data.description).toBe(
      'Rouaultは、ソフトウェア、計算機科学、設計、読書を通じて調べたことや考えたことを、後から辿れる形で残す個人の公開ノートです。一定のまとまりを持った文章を本文中心に読み込める、静かな読書環境を目指しています。',
    );
    expect(data.permalink).toBe('/about/index.html');
    expect(data.headerTocPresence).toBe('absent');
    expect(data).not.toHaveProperty('headerTocRuntimeId');
    expect(data).not.toHaveProperty('headerTocOwnerId');
    expect(data).not.toHaveProperty('headerTocShouldHydrate');
  });

  it('about を TOC なしの静的紹介ページとして描画すること', () => {
    const template = new AboutPageTemplate();
    const rendered = template.render({ siteUrlContext: DEFAULT_SITE_URL_CONTEXT });

    expect(rendered).toContain('<section class="about-shell">');
    expect(rendered).toContain('<article class="about-main-col">');
    expect(rendered).toContain('<header class="about-hero">');
    expect(rendered).toContain('<h1 id="overview" class="about-title">このサイトについて</h1>');
    expect(rendered).toContain(
      '<p class="about-lead">Rouaultは、ソフトウェア、計算機科学、設計、読書を通じて調べたことや考えたことを、後から辿れる形で残す個人の公開ノートです。一定のまとまりを持った文章を本文中心に読み込める、静かな読書環境を目指しています。</p>',
    );
    expect(rendered).toContain('id="about-page-content" class="about-prose"');

    const fragment = parseFragment(rendered);
    const paragraphs = collectElements(fragment, (element) => element.tagName === 'p').map(
      (paragraph) => textContent(paragraph),
    );
    expect(paragraphs).toEqual([
      'Rouaultは、ソフトウェア、計算機科学、設計、読書を通じて調べたことや考えたことを、後から辿れる形で残す個人の公開ノートです。一定のまとまりを持った文章を本文中心に読み込める、静かな読書環境を目指しています。',
      'ここに置く文章は、自分の理解を整理するために書いています。論点を切り分け、言葉の定義を確かめながら、実装や読解の過程を残していきます。',
      'ノートは、必要に応じて追記・修正・再構成します。書いた内容を後から読み返し、理解の変化に合わせて整理し直すことも、このサイトの使い方の一つです。',
      '最近更新したノートはトップページに掲載しています。コーパスの一覧では、ノートを「コーパス」というまとまりごとに辿れます。',
      '探したい言葉や話題があるときは、検索を利用できます。ノートを開いた後は、目次やサイドバーも読む場所を探す手がかりになります。',
      'ソフトウェアエンジニア、時々デザイナー。',
      '好きなプログラミング言語はRust。使用頻度の高い言語はC++、C#、Java、JavaScript/TypeScript、Pythonです。',
      'ご連絡がある場合は、miyaty.ruo@gmail.comまで。',
      'ノートはMarkdownを中心に管理し、静的なHTMLとして公開しています。本文やリンクを基本に、検索などの操作に必要な機能をJavaScriptで加える構成です。',
      '目次、サイドバー、コード表示、数式、画像などを扱う際も、本文の読みやすさを優先しています。文章を通して読むことと、必要な箇所へ戻って参照することの両方を支えられるように設計しています。',
      '技術構成や実装・検証の詳しい内容は、GitHubリポジトリのREADMEおよびdocsを参照してください。',
      '当サイトの文章は特記がない限り、Creative Commons Attribution 4.0 International License（CC BY 4.0）のもとで利用を許諾します。',
      'ただし引用部分、第三者著作物、外部サイトのスクリーンショット、ロゴ・商標、埋め込みコンテンツその他個別注記のある素材は各権利者に権利が帰属し、上記CC BY 4.0の対象外です。',
      '個別の注記がある場合は当該注記を優先します。',
    ]);

    const sectionIds = [...rendered.matchAll(/<h2 id="([^"]+)">/g)].map((match) => match[1]);
    expect(sectionIds).toEqual([
      'writing-policy',
      'finding-notes',
      'author',
      'tech-stack',
      'copyright',
    ]);
    for (const heading of [
      'ノートについて',
      'ノートの探し方',
      '作者について',
      'このサイトのつくり',
      '利用について',
    ]) {
      expect(rendered).toContain(`<span class="heading-text">${heading}</span>`);
    }

    expect(rendered).toContain(
      'ここに置く文章は、自分の理解を整理するために書いています。論点を切り分け、言葉の定義を確かめながら、実装や読解の過程を残していきます。',
    );
    expect(rendered).toContain(
      'ノートは、必要に応じて追記・修正・再構成します。書いた内容を後から読み返し、理解の変化に合わせて整理し直すことも、このサイトの使い方の一つです。',
    );
    expect(rendered).toContain('ソフトウェアエンジニア、時々デザイナー。');
    expect(rendered).toContain(
      '好きなプログラミング言語はRust。使用頻度の高い言語はC++、C#、Java、JavaScript/TypeScript、Pythonです。',
    );
    expect(rendered).toContain(
      'ノートはMarkdownを中心に管理し、静的なHTMLとして公開しています。本文やリンクを基本に、検索などの操作に必要な機能をJavaScriptで加える構成です。',
    );
    expect(rendered).toContain(
      'ただし引用部分、第三者著作物、外部サイトのスクリーンショット、ロゴ・商標、埋め込みコンテンツその他個別注記のある素材は各権利者に権利が帰属し、上記CC BY 4.0の対象外です。',
    );
    expect(rendered).toContain('個別の注記がある場合は当該注記を優先します。');

    for (const [href, label] of [
      ['/', 'トップページ'],
      ['/corpora/', 'コーパスの一覧'],
      ['/search/', '検索'],
    ]) {
      expect(rendered).toMatch(
        new RegExp(
          `<a[^>]+href="${href}"[^>]+data-link-kind="internal-document"[^>]*>${label}</a>`,
        ),
      );
    }
    expect(rendered).toMatch(
      /<a[^>]+href="mailto:miyaty\.ruo@gmail\.com"[^>]*>miyaty\.ruo@gmail\.com<\/a>/,
    );
    expect(rendered).toMatch(
      /<a[^>]+href="https:\/\/github\.com\/Rouault108\/rouault"[^>]+data-link-kind="external-web"[^>]*>GitHubリポジトリ[\s\S]*?<\/a>/,
    );
    expect(rendered).toMatch(
      /<a[^>]+href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0"[^>]+data-link-kind="external-web"[^>]*>Creative Commons Attribution 4\.0 International License（CC BY 4\.0）[\s\S]*?<\/a>/,
    );

    expect(rendered).not.toContain('layout-main-col');
    expect(rendered).not.toContain('container-reading');
    expect(rendered).not.toContain('layout-toc-col');
    expect(rendered).not.toContain('data-layout-toc-nav');
    expect(rendered).not.toContain('toc-source-about');
    expect(rendered).not.toContain('data-layout-toc-source');
    expect(rendered).not.toContain('<layout-toc-controller');
    expect(rendered).not.toContain('data-toc-owner-id="about-page-toc-owner"');
    expect(rendered).not.toContain('data-toc-runtime-id');
    expect(rendered).not.toContain('data-hydration-scope="about-toc"');
    expect(rendered).not.toContain('data-hydration-deferred="toc-trigger"');
    expect(rendered).not.toContain('data-toc-trigger-reserved');
    expect(rendered).not.toContain('<about-page');
    expect(rendered).not.toContain('<layout-sidebar');
    expect(rendered).not.toContain('<search-page');
    expect(rendered).not.toContain('about-summary');
    expect(rendered).not.toContain('about-lead__keep');
  });

  it('basePath 付き環境でも内部導線だけを同一サイトの文書リンクとして正規化すること', () => {
    const rendered = new AboutPageTemplate().render({
      siteUrlContext: { siteOrigin: 'https://rouault.page', basePath: '/nested' },
    });
    const fragment = parseFragment(rendered);
    const links = collectElements(fragment, (element) => element.tagName === 'a');
    const linksByLabel = new Map(links.map((link) => [textContent(link).trim(), link]));
    const requireLink = (label: string): ElementNode => {
      const link = linksByLabel.get(label);
      if (!link) throw new Error(`Missing about link: ${label}`);
      return link;
    };

    for (const [label, href] of [
      ['トップページ', '/nested/'],
      ['コーパスの一覧', '/nested/corpora/'],
      ['検索', '/nested/search/'],
    ] as const) {
      const link = requireLink(label);
      expect(getAttribute(link, 'href')).toBe(href);
      expect(getAttribute(link, 'data-link-kind')).toBe('internal-document');
    }

    expect(getAttribute(requireLink('miyaty.ruo@gmail.com'), 'href')).toBe(
      'mailto:miyaty.ruo@gmail.com',
    );
    expect(getAttribute(requireLink('GitHubリポジトリ'), 'data-link-kind')).toBe('external-web');
  });
});
