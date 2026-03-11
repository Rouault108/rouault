import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
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
                <div id="body-text-sample" style="font-size: var(--text-base); line-height: var(--line-height-normal);">
                  UI テキストは静かに、しかし十分に読み取れる必要があります。
                </div>
              `,
            },
            {
              label: '記事本文 `.prose`',
              note: '長文読書向け。段落、リンク、inline code、引用の混在を確認します。',
              containerStyle: {
                minBlockSize: 'auto',
              },
              content: html`
                <div id="prose-sample" class="prose" style="margin-inline: 0;">
                  <p>
                    Rouault は <a id="body-link-sample" href="/notes/serene-reading">静かな読書体験</a>
                    を中心に設計されています。
                  </p>
                  <p>
                    本文中の <code id="inline-code-sample">document.startViewTransition()</code> は
                    記事の流れを壊さない密度で見せます。
                  </p>
                  <blockquote id="blockquote-sample" style="margin: 0; padding-inline-start: var(--space-4); border-inline-start: var(--border-width-thick) solid var(--border-default);">
                    UI は前に出るのではなく、内容の読解を後押しするべきです。
                  </blockquote>
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
  play: ({ canvasElement }) => {
    const prose = canvasElement.querySelector<HTMLElement>('#prose-sample');
    const link = canvasElement.querySelector<HTMLAnchorElement>('#body-link-sample');
    const code = canvasElement.querySelector<HTMLElement>('#inline-code-sample');
    const blockquote = canvasElement.querySelector<HTMLElement>('#blockquote-sample');

    if (!(prose instanceof HTMLElement)) {
      throw new Error('#prose-sample が見つかりません');
    }
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('#body-link-sample が見つかりません');
    }
    if (!(code instanceof HTMLElement)) {
      throw new Error('#inline-code-sample が見つかりません');
    }
    if (!(blockquote instanceof HTMLElement)) {
      throw new Error('#blockquote-sample が見つかりません');
    }

    const proseStyle = getComputedStyle(prose);
    const codeStyle = getComputedStyle(code);
    const linkStyle = getComputedStyle(link);

    if (Number.parseFloat(proseStyle.fontSize) <= 14) {
      throw new Error(`.prose の font-size が小さすぎます: ${proseStyle.fontSize}`);
    }
    if (Number.parseFloat(proseStyle.lineHeight) <= 24) {
      throw new Error(`.prose の line-height が小さすぎます: ${proseStyle.lineHeight}`);
    }
    if (codeStyle.fontFamily.length === 0) {
      throw new Error('inline code に font-family が適用されていません');
    }
    if (linkStyle.textDecorationLine === 'none') {
      throw new Error('本文リンクは下線を持つ必要があります');
    }
    if (!blockquote.textContent.includes('内容の読解')) {
      throw new Error('blockquote の本文が想定どおりではありません');
    }
  },
};
