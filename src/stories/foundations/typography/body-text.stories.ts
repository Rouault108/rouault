import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../../../components/ui/ul/ul';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSampleGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const meta: Meta = {
  title: 'Foundations/Typography/Body Text',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '本文タイポグラフィと `.prose` コンテナ内の要素リズムを確認するためのストーリーです。',
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
        title: 'Body Text',
        description:
          '本文では `--text-lg` と `--line-height-relaxed` を使い、読みのリズムを優先します。',
      },
      html`
        ${renderFoundationSection(
          'Body / Prose Preview',
          renderTokenSampleGrid([
            {
              label: '通常本文',
              note: 'body の基準。注釈や UI テキストの基準にもなります。',
              content: html`
                <div
                  id="body-text-sample"
                  style="font-size: var(--text-base); line-height: var(--line-height-normal);"
                >
                  UI テキストは静かに、しかし十分に読み取れる必要があります。
                </div>
              `,
            },
            {
              label: '記事本文 `.prose`',
              note: '長文読書向け。見出し、段落、リスト、補助ブロックの縦リズムを確認します。',
              containerStyle: {
                minBlockSize: 'auto',
              },
              content: html`
                <div id="prose-sample" class="prose" style="margin-inline: 0;">
                  <h2 id="prose-h2">静かな読書体験</h2>
                  <p id="prose-intro">
                    Rouault は
                    <a id="body-link-sample" href="/notes/serene-reading">静かな読書体験</a>
                    を中心に設計されています。
                  </p>
                  <h3 id="prose-h3">余白の設計</h3>
                  <p id="prose-body">
                    本文中の <code id="inline-code-sample">document.startViewTransition()</code> は
                    記事の流れを壊さない密度で見せます。
                  </p>
                  <ul id="prose-list">
                    <li>段落間は標準間隔を維持する。</li>
                    <li>節の切り替えでは少し大きく呼吸させる。</li>
                  </ul>
                  <aside
                    id="prose-callout"
                    data-callout
                    data-callout-kind="tip"
                    data-callout-heading="余白は構造である"
                  >
                    <p>境界線ではなくスペーシングで章の切り替わりを示します。</p>
                  </aside>
                </div>
              `,
            },
          ]),
          '本文の基準サイズと記事本文の読み幅・要素間コントラストを同時に確認します。',
        )}
        ${renderFoundationSection(
          'Typography Tokens',
          renderTokenValueList([
            { label: 'Body size', token: '--text-base' },
            { label: 'Prose size', token: '--text-lg' },
            { label: 'Body line-height', token: '--line-height-normal' },
            { label: 'Prose line-height', token: '--line-height-relaxed' },
            { label: 'Reading width', token: '--width-reading' },
            { label: 'Mono font', token: '--font-mono' },
          ]),
          '本文と code のトークン関係を明示します。',
        )}
      `,
    ),
};
