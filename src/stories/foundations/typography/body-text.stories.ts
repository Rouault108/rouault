import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../../../components/ui/callout/callout';
import '../../../components/ui/ul/ul';
import {
  renderFoundationFrame,
  renderFoundationSection,
  renderTokenSampleGrid,
  renderTokenValueList,
} from '../../shared/foundation-story-helpers';

const toPx = (value: string): number => {
  const trimmed = value.trim();
  if (trimmed.endsWith('rem')) {
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const remValue = Number.parseFloat(trimmed);
    return Number.isFinite(rootFontSize) && Number.isFinite(remValue)
      ? remValue * rootFontSize
      : 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readTokenPx = (element: HTMLElement, tokenName: string): number => {
  const value = getComputedStyle(element).getPropertyValue(tokenName).trim();
  return toPx(value);
};

const isNearlyEqual = (actual: number, expected: number, tolerance = 0.75): boolean =>
  Math.abs(actual - expected) <= tolerance;

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
              note: '長文読書向け。見出し、段落、リスト、補助ブロックの縦リズムを確認します。',
              containerStyle: {
                minBlockSize: 'auto',
              },
              content: html`
                <div id="prose-sample" class="prose" style="margin-inline: 0;">
                  <h2 id="prose-h2">静かな読書体験</h2>
                  <p id="prose-intro">
                    Rouault は <a id="body-link-sample" href="/notes/serene-reading">静かな読書体験</a>
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
                  <ui-callout id="prose-callout" variant="tip" title="余白は構造である">
                    境界線ではなくスペーシングで章の切り替わりを示します。
                  </ui-callout>
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
    const h2 = canvasElement.querySelector<HTMLHeadingElement>('#prose-h2');
    const intro = canvasElement.querySelector<HTMLElement>('#prose-intro');
    const h3 = canvasElement.querySelector<HTMLHeadingElement>('#prose-h3');
    const body = canvasElement.querySelector<HTMLElement>('#prose-body');
    const list = canvasElement.querySelector<HTMLUListElement>('#prose-list');
    const callout = canvasElement.querySelector<HTMLElement>('#prose-callout');

    if (!(prose instanceof HTMLElement)) {
      throw new Error('#prose-sample が見つかりません');
    }
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('#body-link-sample が見つかりません');
    }
    if (!(code instanceof HTMLElement)) {
      throw new Error('#inline-code-sample が見つかりません');
    }
    if (!(h2 instanceof HTMLHeadingElement)) {
      throw new Error('#prose-h2 が見つかりません');
    }
    if (!(intro instanceof HTMLElement)) {
      throw new Error('#prose-intro が見つかりません');
    }
    if (!(h3 instanceof HTMLHeadingElement)) {
      throw new Error('#prose-h3 が見つかりません');
    }
    if (!(body instanceof HTMLElement)) {
      throw new Error('#prose-body が見つかりません');
    }
    if (!(list instanceof HTMLUListElement)) {
      throw new Error('#prose-list が見つかりません');
    }
    if (!(callout instanceof HTMLElement)) {
      throw new Error('#prose-callout が見つかりません');
    }

    const proseStyle = getComputedStyle(prose);
    const codeStyle = getComputedStyle(code);
    const linkStyle = getComputedStyle(link);
    const h2Style = getComputedStyle(h2);
    const introStyle = getComputedStyle(intro);
    const h3Style = getComputedStyle(h3);
    const bodyStyle = getComputedStyle(body);
    const listStyle = getComputedStyle(list);
    const calloutStyle = getComputedStyle(callout);
    const proseFlowSpace = readTokenPx(prose, '--space-4');
    const proseSectionSpace = readTokenPx(prose, '--space-8');
    const proseSubsectionSpace = readTokenPx(prose, '--space-6');

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
    if (!isNearlyEqual(toPx(h2Style.marginTop), 0)) {
      throw new Error(`.prose 先頭の h2 は余白なしである必要があります: ${h2Style.marginTop}`);
    }
    if (!isNearlyEqual(toPx(introStyle.marginTop), proseFlowSpace)) {
      throw new Error(`p の margin-top は --space-4 を期待していましたが、実際には ${introStyle.marginTop} でした`);
    }
    if (!isNearlyEqual(toPx(h3Style.marginTop), proseSubsectionSpace)) {
      throw new Error(`h3 の margin-top は --space-6 を期待していましたが、実際には ${h3Style.marginTop} でした`);
    }
    if (!isNearlyEqual(toPx(bodyStyle.marginTop), proseFlowSpace)) {
      throw new Error(`h3 後の p は --space-4 を期待していましたが、実際には ${bodyStyle.marginTop} でした`);
    }
    if (!isNearlyEqual(toPx(listStyle.marginTop), proseFlowSpace)) {
      throw new Error(`ul の margin-top は --space-4 を期待していましたが、実際には ${listStyle.marginTop} でした`);
    }
    if (!isNearlyEqual(toPx(calloutStyle.marginTop), proseFlowSpace)) {
      throw new Error(`ui-callout の margin-top は --space-4 を期待していましたが、実際には ${calloutStyle.marginTop} でした`);
    }
    if (!isNearlyEqual(readTokenPx(prose, '--prose-flow-space'), proseFlowSpace)) {
      throw new Error('`--prose-flow-space` が `--space-4` と一致していません');
    }
    if (!isNearlyEqual(readTokenPx(prose, '--prose-section-space'), proseSectionSpace)) {
      throw new Error('`--prose-section-space` が `--space-8` と一致していません');
    }
    if (!isNearlyEqual(readTokenPx(prose, '--prose-subsection-space'), proseSubsectionSpace)) {
      throw new Error('`--prose-subsection-space` が `--space-6` と一致していません');
    }
  },
};
