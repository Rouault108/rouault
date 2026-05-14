import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '../../../components/layout/layout-header';
import '../../../components/layout/layout-footer';
import '../../../components/layout/layout-sidebar';
import '../../../components/layout/layout-toc-controller';
import { renderArticleHeaderHtml } from '../../../layouts/article-header-html.js';
import { renderTocHtml } from '../../../layouts/toc-html.js';
import {
  renderFoundationFrame,
  renderFoundationSection,
} from '../../shared/foundation-story-helpers';

const sidebarNavMarkup = `
<nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="story:note-shell">
  <ul>
    <li data-node-id="notes" data-node-kind="branch" data-node-depth="0">
      <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="true" aria-controls="story-note-shell-notes">
        <span data-sidebar-nav-label>Notes</span>
        <span data-sidebar-nav-disclosure aria-hidden="true"></span>
      </button>
      <ul id="story-note-shell-notes">
        <li data-node-id="intro-reading" data-node-kind="leaf" data-node-depth="1">
          <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/serene-reading"><span data-sidebar-nav-label>Serene Reading</span></a>
        </li>
        <li data-node-id="story-shell" data-node-kind="leaf" data-node-depth="1">
          <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/story-shell" aria-current="page"><span data-sidebar-nav-label>Storybook Shell</span></a>
        </li>
        <li data-node-id="router-notes" data-node-kind="leaf" data-node-depth="1">
          <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/router-notes"><span data-sidebar-nav-label>Router Notes</span></a>
        </li>
      </ul>
    </li>
  </ul>
</nav>
`.trim();

const tocSource = [
  { id: 'intro', text: 'はじめに', level: 2 },
  { id: 'design', text: '設計原則', level: 2 },
  { id: 'layout', text: 'レイアウト契約', level: 3 },
  { id: 'conclusion', text: 'まとめ', level: 2 },
];

const articleHeaderMarkup = renderArticleHeaderHtml({
  heading: 'Storybook で読むページ骨格',
  breadcrumbs: [
    { label: 'Notes', href: '/notes/' },
    { label: 'Storybook Shell', href: '/notes/story-shell/' },
  ],
  published: '2026-03-10',
  updated: '2026-03-10',
  genres: ['Storybook', 'Reading UI'],
});

const tocMarkup = renderTocHtml({
  sourceId: 'story-note-toc-source',
  runtimeId: 'story-note-toc-source',
  ownerId: 'story-note-toc-owner',
  scopeId: 'note-toc',
  headings: tocSource,
  capabilities: {
    activeTracking: true,
    dynamicScopes: false,
    mobilePanel: true,
  },
  contentRootId: 'story-note-content',
  homeHref: '/',
  shouldHydrate: true,
});

const renderNoteShell = () =>
  renderFoundationFrame(
    {
      title: 'Note Shell',
      description:
        'sidebar、article header、prose、toc を組み合わせて、読むためのページ骨格を Storybook 上で再現します。',
    },
    html`
      ${renderFoundationSection(
        'NoteLayout Preview',
        html`
          <div class="foundation-stage" style="padding: 0; overflow: clip;">
            <div class="app-root">
              <layout-header
                note-layout
                sidebar-enabled
                toc-presence="present"
                toc-runtime-id="story-note-toc-source"
                data-toc-owner-id="story-note-toc-owner"
                toc-trigger-reserved="true"
              ></layout-header>
              <main id="note-shell-main" tabindex="-1">
                <section class="note-shell" data-toc-presence="present">
                  <aside class="layout-sidebar-col" aria-label="ナビゲーション">
                    <layout-sidebar
                      id="story-note-sidebar"
                      state-scope-id="note-navigation"
                      selected-id="story-shell"
                      fixed-breakpoint="1024"
                      >${unsafeHTML(sidebarNavMarkup)}</layout-sidebar
                    >
                  </aside>

                  <article class="layout-main-col container-reading">
                    ${unsafeHTML(articleHeaderMarkup)}
                    <div id="story-note-content" class="prose">
                      <h2 id="intro">はじめに</h2>
                      <p>
                        Note shell はコンテンツ、ナビゲーション、現在地を同時に提示しつつ、
                        本文の集中を崩さないことを目的とします。
                      </p>
                      <h2 id="design">設計原則</h2>
                      <p>補助 UI には細い境界だけを与え、本文面は過剰に囲いません。</p>
                      <h3 id="layout">レイアウト契約</h3>
                      <p>
                        desktop では 3 カラム、1024px 未満では本文 + TOC、mobile
                        では本文優先へ縮退します。
                      </p>
                      <h2 id="conclusion">まとめ</h2>
                      <p>
                        Storybook 上では構造と読み味を同時に確認し、詳細な breakpoints
                        はブラウザ幅変更で見ます。
                      </p>
                    </div>
                  </article>

                  ${unsafeHTML(tocMarkup)}
                </section>

                <script type="application/json" id="story-note-toc-source">
                  ${JSON.stringify(tocSource)}
                </script>
              </main>
              <layout-footer build-label="build abcdef1"></layout-footer>
            </div>
          </div>
        `,
        'sidebar / article / toc を production の SSR light DOM 契約に寄せて組み合わせます。',
      )}
    `,
  );

const meta: Meta = {
  title: 'Layouts/Note/Note Shell',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
NoteLayout 相当の本文構造と周辺 chrome を Storybook 上で確認するための story です。

production の sidebar host は BaseLayout の app shell が所有します。この story は本文 / sidebar / TOC を同時に眺める docs / smoke 用の合成表示です。

このファイルは **docs / smoke / 手動確認** に限定します。  
NoteLayout の SSR 構造は \`test/ssr/note-layout.test.ts\`、app shell の sidebar host 契約は \`test/ssr/base-layout.test.ts\`、  
実ページ上での sidebar / toc / 読書フローは \`test/e2e/no-js-baseline.spec.ts\` と \`test/e2e/router.spec.ts\` を正本とします。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  tags: ['smoke'],
  render: () => renderNoteShell(),
};

export const ResponsiveObservationManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- 3 カラムの読み味
- sidebar / article / toc の視覚的な均衡
- 幅変更時の見え方

layout-sidebar や layout-toc-controller の合否判定は Storybook ではなく、SSR / E2E 側を正本とします。
        `,
      },
    },
  },
  render: () => renderNoteShell(),
};
