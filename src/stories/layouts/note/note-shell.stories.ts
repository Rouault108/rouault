import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../../../components/layout/layout-header';
import '../../../components/layout/layout-footer';
import '../../../components/layout/layout-sidebar';
import '../../../components/layout/layout-toc';
import '../../../components/ui/article-header/article-header';
import {
  renderFoundationFrame,
  renderFoundationSection,
} from '../../shared/foundation-story-helpers';

const sidebarSource = [
  {
    kind: 'branch',
    id: 'notes',
    label: 'Notes',
    children: [
      {
        kind: 'leaf',
        id: 'intro-reading',
        label: 'Serene Reading',
        href: '/notes/serene-reading',
      },
      {
        kind: 'leaf',
        id: 'story-shell',
        label: 'Storybook Shell',
        href: '/notes/story-shell',
      },
      { kind: 'leaf', id: 'router-notes', label: 'Router Notes', href: '/notes/router-notes' },
    ],
  },
];

const tocSource = [
  { id: 'intro', text: 'はじめに', level: 2 },
  { id: 'design', text: '設計原則', level: 2 },
  { id: 'layout', text: 'レイアウト契約', level: 3 },
  { id: 'conclusion', text: 'まとめ', level: 2 },
];

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
              <layout-header></layout-header>
              <main id="note-shell-main" tabindex="-1">
                <section class="note-shell">
                  <aside class="layout-sidebar-col" aria-label="ナビゲーション">
                    <layout-sidebar
                      id="story-note-sidebar"
                      source-id="story-note-sidebar-source"
                      selected-id="story-shell"
                      heading="ナビゲーション"
                      fixed-breakpoint="1024"
                    ></layout-sidebar>
                  </aside>

                  <article class="layout-main-col container-reading">
                    <ui-article-header
                      heading="Storybook で読むページ骨格"
                      published="2026-03-10"
                      updated="2026-03-10"
                    ></ui-article-header>
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

                  <aside class="layout-toc-col" aria-label="目次">
                    <layout-toc
                      id="story-note-toc"
                      source-id="story-note-toc-source"
                      content-root-id="story-note-content"
                      home-href="/"
                    ></layout-toc>
                  </aside>
                </section>

                <script type="application/json" id="story-note-sidebar-source">
                  ${JSON.stringify(sidebarSource)}
                </script>
                <script type="application/json" id="story-note-toc-source">
                  ${JSON.stringify(tocSource)}
                </script>
              </main>
              <layout-footer build-label="build abcdef1"></layout-footer>
            </div>
          </div>
        `,
        'sidebar / article / toc を production component そのままで組み合わせます。',
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
NoteLayout 相当の 3 カラム構造を Storybook 上で確認するための story です。

このファイルは **docs / smoke / 手動確認** に限定します。  
note shell の SSR 構造は \`test/ssr/note-layout.test.ts\`、  
実ページ上での sidebar / toc / 読書フローは \`test/e2e/ssr.spec.ts\` と \`test/e2e/toc-tabs.spec.ts\` を正本とします。
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

layout-sidebar や layout-toc の合否判定は Storybook ではなく、SSR / E2E 側を正本とします。
        `,
      },
    },
  },
  render: () => renderNoteShell(),
};
