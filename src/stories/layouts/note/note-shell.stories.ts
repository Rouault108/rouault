import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../../../components/layout/layout-header';
import '../../../components/layout/layout-footer';
import '../../../components/layout/layout-sidebar';
import '../../../components/layout/layout-toc';
import '../../../components/ui/article-header/article-header';
import type { LayoutSidebar } from '../../../components/layout/layout-sidebar';
import type { LayoutToc } from '../../../components/layout/layout-toc';
import type { UiSidebar } from '../../../components/ui/sidebar/sidebar';
import type { Toc } from '../../../components/ui/toc/toc';
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

const meta: Meta = {
  title: 'Layouts/Note/Note Shell',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'NoteLayout 相当の 3 カラム構造を Storybook 上で確認するためのストーリーです。',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () =>
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
                        fixed-breakpoint="768"
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
                          desktop では 3 カラム、tablet では本文 + TOC、mobile
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
                <layout-footer revision="abcdef1" year="2026"></layout-footer>
              </div>
            </div>
          `,
          'sidebar / article / toc を production component そのままで組み合わせます。',
        )}
      `,
    ),
  play: async ({ canvasElement }) => {
    const sidebarHost = canvasElement.querySelector<LayoutSidebar>('#story-note-sidebar');
    const tocHost = canvasElement.querySelector<LayoutToc>('#story-note-toc');
    const main = canvasElement.querySelector<HTMLElement>('#note-shell-main');
    const sidebarSourceElement = canvasElement.querySelector<HTMLScriptElement>(
      '#story-note-sidebar-source',
    );
    const tocSourceElement =
      canvasElement.querySelector<HTMLScriptElement>('#story-note-toc-source');

    if (!sidebarHost || !tocHost) {
      throw new Error('layout component が見つかりません');
    }
    if (!(main instanceof HTMLElement)) {
      throw new Error('#note-shell-main が見つかりません');
    }
    if (
      !(sidebarSourceElement instanceof HTMLScriptElement) ||
      !(tocSourceElement instanceof HTMLScriptElement)
    ) {
      throw new Error('JSON source script が見つかりません');
    }

    await sidebarHost.updateComplete;
    await tocHost.updateComplete;

    const sidebar = sidebarHost.shadowRoot?.querySelector<UiSidebar>('ui-sidebar');
    const tocInstances = tocHost.shadowRoot?.querySelectorAll<Toc>('ui-toc');
    if (!sidebar) {
      throw new Error('layout-sidebar 内に ui-sidebar が見つかりません');
    }
    if (!tocInstances || tocInstances.length === 0) {
      throw new Error('layout-toc 内に ui-toc が見つかりません');
    }

    await sidebar.updateComplete;
    await Promise.all(Array.from(tocInstances).map((item) => item.updateComplete));

    if (sidebar.items.length !== 1) {
      throw new Error(`sidebar の root item 数が不正です: ${String(sidebar.items.length)}`);
    }
    if (tocInstances[0]?.headers.length !== tocSource.length) {
      throw new Error('toc source の見出し数が正しく読み込まれていません');
    }
    if (!main.querySelector('.note-shell')) {
      throw new Error('.note-shell が見つかりません');
    }
    if (main.getAttribute('tabindex') !== '-1') {
      throw new Error('main には tabindex="-1" が必要です');
    }
  },
};
