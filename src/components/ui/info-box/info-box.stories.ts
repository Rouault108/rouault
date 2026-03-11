import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../article-header/article-header';
import './info-box';
import { InfoBox, type InfoBoxVariant } from './info-box';
import {
  renderFoundationFrame,
  renderFoundationSection,
} from '../../../stories/shared/foundation-story-helpers';

interface VariantMatrixCase {
  readonly id: string;
  readonly variant: InfoBoxVariant;
  readonly heading: string;
  readonly icon: string;
  readonly landmark: boolean;
  readonly expectedRole: 'region' | 'note';
  readonly expectsHeader: boolean;
}

const VARIANT_MATRIX_CASES: readonly VariantMatrixCase[] = [
  {
    id: 'matrix-default-region',
    variant: 'default',
    heading: '作品情報',
    icon: 'music',
    landmark: true,
    expectedRole: 'region',
    expectsHeader: true,
  },
  {
    id: 'matrix-default-note',
    variant: 'default',
    heading: '補足情報',
    icon: 'book-open',
    landmark: false,
    expectedRole: 'note',
    expectsHeader: true,
  },
  {
    id: 'matrix-filled-note',
    variant: 'filled',
    heading: 'この章のポイント',
    icon: 'clipboard-list',
    landmark: false,
    expectedRole: 'note',
    expectsHeader: true,
  },
  {
    id: 'matrix-filled-region',
    variant: 'filled',
    heading: 'filled region',
    icon: 'shield',
    landmark: true,
    expectedRole: 'region',
    expectsHeader: true,
  },
  {
    id: 'matrix-filled-no-heading',
    variant: 'filled',
    heading: '   ',
    icon: 'shield',
    landmark: true,
    expectedRole: 'note',
    expectsHeader: false,
  },
];

const normalizeColor = (value: string): string => value.replace(/\s+/g, '').toLowerCase();

const getHost = (canvasElement: Element, id: string): InfoBox => {
  const host = canvasElement.querySelector<InfoBox>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getContainer = (infoBox: InfoBox): HTMLElement => {
  const container = infoBox.shadowRoot?.querySelector<HTMLElement>('.info-box');
  if (!container) throw new Error('.info-box が見つかりません');
  return container;
};

const getHeader = (infoBox: InfoBox): HTMLElement | null =>
  infoBox.shadowRoot?.querySelector<HTMLElement>('.header') ?? null;

const getHeading = (infoBox: InfoBox): HTMLElement => {
  const heading = infoBox.shadowRoot?.querySelector<HTMLElement>('.heading');
  if (!heading) throw new Error('.heading が見つかりません');
  return heading;
};

const getIcon = (infoBox: InfoBox): HTMLElement | null =>
  infoBox.shadowRoot?.querySelector<HTMLElement>('iconify-icon.icon') ?? null;

const meta: Meta<InfoBox> = {
  title: 'Components/InfoBox',
  component: 'ui-info-box',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
価値中立な参照情報を構造化する静的コンテナです。
- \`heading\` があるときだけヘッダーを描画
- \`landmark=true\` かつ \`heading\` ありのときだけ \`role="region"\`
- それ以外は \`role="note"\` にフォールバック
- \`variant="filled"\` は \`--bg-fill-muted\` を使用
        `,
      },
    },
  },
  argTypes: {
    heading: {
      control: 'text',
      description: 'ヘッダーラベル',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    icon: {
      control: 'text',
      description: 'ヘッダーアイコン名（lucide プレフィックス不要）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    headingLevel: {
      control: 'number',
      description: 'ヘッダーの aria-level（1-6）',
      table: {
        type: { summary: 'number | undefined' },
      },
    },
    landmark: {
      control: 'boolean',
      description: 'heading ありの場合に region ランドマーク化する',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    variant: {
      control: 'inline-radio',
      options: ['default', 'filled'],
      description: 'スタイルバリアント',
      table: {
        type: { summary: "'default' | 'filled'" },
        defaultValue: { summary: "'default'" },
      },
    },
  },
};

export default meta;
type Story = StoryObj<InfoBox>;

/**
 * 基本ケース:
 * heading + icon + heading-level + landmark の組み合わせ。
 */
export const Default: Story = {
  args: {
    heading: '作品情報',
    icon: 'music',
    headingLevel: 3,
    landmark: true,
    variant: 'default',
  },
  render: (args) => html`
    <ui-info-box
      id="info-box-default"
      heading="${args.heading}"
      icon="${args.icon}"
      heading-level="${ifDefined(args.headingLevel !== undefined ? String(args.headingLevel) : undefined)}"
      ?landmark="${args.landmark}"
      variant="${args.variant}"
    >
      <dl style="display: grid; gap: 0.5rem; margin: 0;">
        <dt>作曲</dt>
        <dd style="margin: 0;">クロード・ドビュッシー</dd>
        <dt>作品番号</dt>
        <dd style="margin: 0;">L. 75</dd>
      </dl>
    </ui-info-box>
  `,
  play: async ({ canvasElement }) => {
    const infoBox = getHost(canvasElement, 'info-box-default');
    await infoBox.updateComplete;

    const container = getContainer(infoBox);
    const heading = getHeading(infoBox);
    const icon = getIcon(infoBox);

    if (container.getAttribute('data-variant') !== 'default') {
      throw new Error('default バリアントの data-variant が不正です');
    }
    if (infoBox.getAttribute('role') !== 'region') {
      throw new Error('landmark=true + heading ありは role="region" である必要があります');
    }
    if (infoBox.getAttribute('aria-labelledby') !== heading.id) {
      throw new Error('aria-labelledby が heading id と一致していません');
    }
    if (heading.getAttribute('role') !== 'heading') {
      throw new Error('heading-level 指定時に role="heading" が必要です');
    }
    if (heading.getAttribute('aria-level') !== '3') {
      throw new Error('heading-level=3 の aria-level が設定されていません');
    }
    if (!icon) {
      throw new Error('icon が描画されていません');
    }
    if (icon.getAttribute('icon') !== 'lucide:music') {
      throw new Error('icon 名が期待値と一致しません');
    }
    if (icon.getAttribute('aria-hidden') !== 'true') {
      throw new Error('装飾アイコンは aria-hidden="true" である必要があります');
    }
  },
};

/**
 * 閲覧用:
 * 「読む前提条件」を info-box で見せるときの文言と配置パターン。
 */
export const ReadingPrerequisitePlacements: Story = {
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          '「読む前提条件」を article header に混ぜず、info-box としてどこに置くかを比較する閲覧用ストーリーです。',
      },
    },
  },
  render: () =>
    renderFoundationFrame(
      {
        title: 'Reading Prerequisite Placements',
        description:
          '前提条件は記事メタデータではなく、読むための補助情報として独立させます。推奨は article header 直下、その次に本文導入内、必要なら特定セクション直前で再提示します。',
      },
      html`
        <style>
          .reading-patterns {
            display: grid;
            gap: var(--space-5, 1.25rem);
          }

          .reading-patterns-grid {
            display: grid;
            gap: var(--space-4, 1rem);
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          }

          .reading-preview {
            display: grid;
            gap: var(--space-5, 1.25rem);
            max-width: min(100%, 76ch);
            margin: 0 auto;
          }

          .reading-preview--narrow {
            max-width: min(100%, 64ch);
          }

          .reading-prose {
            display: grid;
            gap: var(--space-4, 1rem);
            color: var(--fg-default, oklch(20% 0 0));
          }

          .reading-prose > * {
            margin: 0;
          }

          .reading-prose h2 {
            font-size: var(--text-xl, 1.25rem);
            line-height: var(--line-height-tight, 1.25);
          }

          .reading-prose p,
          .reading-prose li,
          .reading-prose dd {
            font-size: var(--text-sm, 0.875rem);
            line-height: var(--line-height-relaxed, 1.8);
          }

          .reading-prose ul,
          .reading-prose dl {
            margin: 0;
          }

          .reading-prose ul {
            padding-inline-start: 1.25rem;
          }

          .reading-prose dl {
            display: grid;
            gap: var(--space-2, 0.5rem);
          }

          .reading-prose dt {
            font-size: var(--text-xs, 0.75rem);
            font-weight: var(--font-semibold, 600);
            letter-spacing: var(--tracking-wide, 0.025em);
            color: var(--fg-muted, oklch(48% 0 0));
          }

          .reading-prose dd {
            margin: 0;
          }

          .pattern-note {
            margin: 0;
            font-size: var(--text-xs, 0.75rem);
            line-height: var(--line-height-relaxed, 1.75);
            color: var(--fg-muted, oklch(48% 0 0));
          }
        </style>

        ${renderFoundationSection(
          '推奨配置',
          html`
            <div class="foundation-stage">
              <article class="reading-preview" id="placement-recommended">
                <ui-article-header
                  heading="設計メモを読むときの前提共有"
                  published="2026-03-11"
                  updated="2026-03-11"
                ></ui-article-header>

                <ui-info-box
                  id="prerequisite-global"
                  heading="このサイトを読む前に"
                  icon="scan-search"
                  heading-level="2"
                  landmark
                  variant="filled"
                >
                  <div class="reading-prose">
                    <p>
                      このサイトのノートは、入門よりも判断の記録を優先します。
                      定義や背景を一から説明しない箇所があります。
                    </p>
                    <ul>
                      <li>結論、判断理由、未解決点を先に書きます。</li>
                      <li>固有名詞や過去の文脈は、関連ノートの存在を前提に省略することがあります。</li>
                      <li>導入解説や完全な手順が必要な場合は、本文中の出典や関連ノートを併読してください。</li>
                    </ul>
                  </div>
                </ui-info-box>

                <div class="reading-prose">
                  <p>
                    本文に入る前に読み方の前提を切り出しておくと、ヘッダーの責務を崩さずに済みます。
                    読者はタイトルと記事状態を見たあと、どの粒度で読めばよいかを自然に理解できます。
                  </p>
                </div>
              </article>
            </div>
          `,
          'article header の直下に 1 回だけ置くパターンです。記事メタデータと混線せず、本文へ入る前の認知切り替えを作れます。',
        )}

        ${renderFoundationSection(
          '代替配置',
          html`
            <div class="reading-patterns-grid">
              <div class="foundation-stage">
                <article class="reading-preview reading-preview--narrow" id="placement-inline">
                  <ui-article-header
                    heading="導入の中で前提を短く差し込む"
                    published="2026-03-11"
                  ></ui-article-header>

                  <div class="reading-prose">
                    <p>
                      冒頭で背景を一段だけ説明したあと、読む姿勢を短く合わせたいケースです。
                    </p>

                    <ui-info-box
                      id="prerequisite-inline"
                      heading="読み方の目印"
                      icon="bookmark"
                      heading-level="2"
                    >
                      <dl>
                        <div>
                          <dt>想定</dt>
                          <dd>このノートは結論と判断理由を追える読者を想定します。</dd>
                        </div>
                        <div>
                          <dt>扱わないもの</dt>
                          <dd>用語の網羅的な定義と、導入からの手順説明は省略します。</dd>
                        </div>
                      </dl>
                    </ui-info-box>

                    <p>
                      条件が軽い場合は、このくらいの短いボックスで十分です。本文の流れを止めずに、
                      省略の前提だけ明示できます。
                    </p>
                  </div>
                </article>
              </div>

              <div class="foundation-stage">
                <article class="reading-preview reading-preview--narrow" id="placement-section">
                  <ui-article-header
                    heading="難所だけ局所前提を再提示する"
                    published="2026-03-11"
                  ></ui-article-header>

                  <div class="reading-prose">
                    <p>
                      先頭では全体方針だけを出し、特定の章だけ前提が重くなる場合に再提示するパターンです。
                    </p>

                    <ui-info-box
                      id="prerequisite-section"
                      heading="この章の前提"
                      icon="waypoints"
                      heading-level="2"
                      variant="default"
                    >
                      <div class="reading-prose">
                        <p>
                          ここから先は、過去の実装ログと Storybook のコンポーネント契約を把握している前提で進めます。
                        </p>
                      </div>
                    </ui-info-box>

                    <h2>状態遷移の分解</h2>
                    <p>
                      全読者向けではない条件を局所化できるため、ページ冒頭のノイズを増やさずに済みます。
                    </p>
                  </div>
                </article>
              </div>
            </div>
          `,
          '前提条件の重さに応じて、本文導入内の短い提示か、特定セクション直前の再提示へ縮退させます。',
        )}

        ${renderFoundationSection(
          '文言の指針',
          html`
            <div class="reading-patterns">
              <p class="pattern-note">
                見出しは「このサイトを読む前に」「読み方の目印」「この章の前提」のように、
                読者が何を調整すべきかを即座に理解できる名詞句にします。
              </p>
              <p class="pattern-note">
                本文は「想定読者」「省略するもの」「併読先」の 3 点に絞ると、
                ルール説明ではなく読む補助として機能します。
              </p>
              <p class="pattern-note">
                ステータスや更新日と混ぜないことで、article header は記事の現在地、
                info-box は読むための前提という役割分担を保てます。
              </p>
            </div>
          `,
        )}
      `,
    ),
  play: async ({ canvasElement }) => {
    const recommendedBox = getHost(canvasElement, 'prerequisite-global');
    const inlineBox = getHost(canvasElement, 'prerequisite-inline');
    const sectionBox = getHost(canvasElement, 'prerequisite-section');
    await Promise.all([recommendedBox.updateComplete, inlineBox.updateComplete, sectionBox.updateComplete]);

    const recommendedStage = canvasElement.querySelector<HTMLElement>('#placement-recommended');
    if (!recommendedStage) {
      throw new Error('推奨配置ステージが見つかりません');
    }

    const recommendedChildren = Array.from(recommendedStage.children);
    if (recommendedChildren[0]?.tagName.toLowerCase() !== 'ui-article-header') {
      throw new Error('推奨配置は article header から始まる必要があります');
    }
    if (recommendedChildren[1]?.id !== 'prerequisite-global') {
      throw new Error('推奨配置では article header 直下に前提 info-box を置く必要があります');
    }
    if (recommendedChildren[2]?.className !== 'reading-prose') {
      throw new Error('推奨配置では前提 info-box の後に本文導入が続く必要があります');
    }

    if (recommendedBox.getAttribute('role') !== 'region') {
      throw new Error('全体前提の推奨配置は landmark region として公開する必要があります');
    }

    const recommendedHeading = getHeading(recommendedBox);
    if (recommendedHeading.textContent.trim() !== 'このサイトを読む前に') {
      throw new Error('推奨配置の見出し文言が期待値と一致しません');
    }

    const inlineProse = canvasElement.querySelector<HTMLElement>('#placement-inline .reading-prose');
    if (!inlineProse) {
      throw new Error('導入内配置の本文コンテナが見つかりません');
    }

    const inlineChildren = Array.from(inlineProse.children);
    if (inlineChildren[1]?.id !== 'prerequisite-inline') {
      throw new Error('導入内配置では最初の説明文の直後に前提 info-box を置く必要があります');
    }

    if (inlineBox.getAttribute('role') !== 'note') {
      throw new Error('導入内の短い前提は note として扱う必要があります');
    }

    const sectionProse = canvasElement.querySelector<HTMLElement>('#placement-section .reading-prose');
    if (!sectionProse) {
      throw new Error('局所前提配置の本文コンテナが見つかりません');
    }

    const sectionChildren = Array.from(sectionProse.children);
    if (sectionChildren[1]?.id !== 'prerequisite-section' || sectionChildren[2]?.tagName.toLowerCase() !== 'h2') {
      throw new Error('局所前提は対象セクション見出しの直前に配置する必要があります');
    }
  },
};

/**
 * 意味のある組み合わせ:
 * variant × heading 有無 × landmark の主要な分岐を検証。
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.75rem;
      }
      .matrix-cell {
        display: grid;
        gap: 0.375rem;
      }
      .matrix-label {
        margin: 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--fg-muted, #6e7781);
      }
    </style>
    <div class="matrix">
      ${VARIANT_MATRIX_CASES.map(
        (item) => html`
          <div class="matrix-cell">
            <p class="matrix-label">${item.id}</p>
            <ui-info-box
              id="${item.id}"
              variant="${item.variant}"
              heading="${item.heading}"
              icon="${item.icon}"
              ?landmark="${item.landmark}"
              style="
                --bg-fill-muted: rgb(230, 231, 232);
                --fg-muted: rgb(70, 71, 72);
                --fg-default: rgb(20, 21, 22);
              "
            >
              <p style="margin: 0;">${item.variant} / landmark=${String(item.landmark)}</p>
            </ui-info-box>
          </div>
        `,
      )}
    </div>
  `,
  play: async ({ canvasElement }) => {
    for (const testCase of VARIANT_MATRIX_CASES) {
      const infoBox = getHost(canvasElement, testCase.id);
      await infoBox.updateComplete;

      const container = getContainer(infoBox);
      const header = getHeader(infoBox);

      if (container.getAttribute('data-variant') !== testCase.variant) {
        throw new Error(`${testCase.id}: data-variant が一致しません`);
      }
      if (infoBox.getAttribute('role') !== testCase.expectedRole) {
        throw new Error(`${testCase.id}: role が期待値と一致しません`);
      }

      if (testCase.expectsHeader) {
        if (!header) throw new Error(`${testCase.id}: header が必要です`);
        const heading = getHeading(infoBox);
        if (testCase.expectedRole === 'region') {
          if (infoBox.getAttribute('aria-labelledby') !== heading.id) {
            throw new Error(`${testCase.id}: region の aria-labelledby が heading id と一致しません`);
          }
        } else if (infoBox.hasAttribute('aria-labelledby')) {
          throw new Error(`${testCase.id}: note では aria-labelledby を出力しません`);
        }

        const expectedHeaderColor = testCase.variant === 'filled' ? 'rgb(20, 21, 22)' : 'rgb(70, 71, 72)';
        const actualHeaderColor = normalizeColor(getComputedStyle(header).color);
        if (actualHeaderColor !== normalizeColor(expectedHeaderColor)) {
          throw new Error(`${testCase.id}: ヘッダー色の切り替えが不正です`);
        }
      } else {
        if (header) throw new Error(`${testCase.id}: heading なしでは header を描画しません`);
        if (infoBox.hasAttribute('aria-labelledby')) {
          throw new Error(`${testCase.id}: heading なしでは aria-labelledby を出力しません`);
        }
        if (getIcon(infoBox)) {
          throw new Error(`${testCase.id}: heading なしでは icon を描画しません`);
        }
      }

      const expectedBackground = testCase.variant === 'filled' ? 'rgb(230, 231, 232)' : 'rgba(0, 0, 0, 0)';
      const actualBackground = normalizeColor(getComputedStyle(container).backgroundColor);
      if (actualBackground !== normalizeColor(expectedBackground)) {
        throw new Error(`${testCase.id}: バリアント背景色の切り替えが不正です`);
      }
    }
  },
};

/**
 * 境界条件:
 * heading-level の許容値（1-6）と無効値の扱い。
 */
export const HeadingLevelBoundaries: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-info-box id="heading-valid" heading="有効レベル" heading-level="1">heading-level=1</ui-info-box>
      <ui-info-box id="heading-zero" heading="無効レベル0" heading-level="0">heading-level=0</ui-info-box>
      <ui-info-box id="heading-seven" heading="無効レベル7" heading-level="7">heading-level=7</ui-info-box>
      <ui-info-box id="heading-decimal" heading="無効レベル2.5" heading-level="2.5">heading-level=2.5</ui-info-box>
      <ui-info-box id="heading-no-title" heading-level="4">heading なし + heading-level=4</ui-info-box>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const valid = getHost(canvasElement, 'heading-valid');
    const zero = getHost(canvasElement, 'heading-zero');
    const seven = getHost(canvasElement, 'heading-seven');
    const decimal = getHost(canvasElement, 'heading-decimal');
    const noTitle = getHost(canvasElement, 'heading-no-title');
    await Promise.all([valid.updateComplete, zero.updateComplete, seven.updateComplete, decimal.updateComplete, noTitle.updateComplete]);

    const validHeading = getHeading(valid);
    if (validHeading.getAttribute('role') !== 'heading' || validHeading.getAttribute('aria-level') !== '1') {
      throw new Error('heading-level=1 で role/aria-level が正しく付与されていません');
    }

    const zeroHeading = getHeading(zero);
    if (zeroHeading.hasAttribute('role') || zeroHeading.hasAttribute('aria-level')) {
      throw new Error('heading-level=0 は無効値として role/aria-level を出力しません');
    }

    const sevenHeading = getHeading(seven);
    if (sevenHeading.hasAttribute('role') || sevenHeading.hasAttribute('aria-level')) {
      throw new Error('heading-level=7 は無効値として role/aria-level を出力しません');
    }

    const decimalHeading = getHeading(decimal);
    if (decimalHeading.hasAttribute('role') || decimalHeading.hasAttribute('aria-level')) {
      throw new Error('heading-level=2.5 は無効値として role/aria-level を出力しません');
    }

    if (getHeader(noTitle)) {
      throw new Error('heading なしではヘッダーは描画されません');
    }
    if (noTitle.getAttribute('role') !== 'note') {
      throw new Error('heading なしのフォールバック role は note です');
    }
  },
};

/**
 * 境界条件:
 * landmark=true でも heading が空なら note へフォールバックする。
 */
export const LandmarkRequiresHeadingBoundary: Story = {
  render: () => html`
    <ui-info-box id="landmark-without-heading" heading="   " icon="music" landmark>
      heading 空文字時は landmark を無効化します。
    </ui-info-box>
  `,
  play: async ({ canvasElement }) => {
    const infoBox = getHost(canvasElement, 'landmark-without-heading');
    await infoBox.updateComplete;

    if (infoBox.getAttribute('role') !== 'note') {
      throw new Error('heading が空の場合は role="note" へフォールバックする必要があります');
    }
    if (infoBox.hasAttribute('aria-labelledby')) {
      throw new Error('heading が空の場合は aria-labelledby を出力しません');
    }
    if (getHeader(infoBox)) {
      throw new Error('heading が空の場合は header を描画しません');
    }
  },
};

/**
 * 境界条件:
 * icon は heading があるときのみ描画し、装飾扱いで aria-hidden を持つ。
 */
export const IconRenderingBoundary: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-info-box id="icon-with-heading" heading="アイコン付き" icon="music">icon を表示します</ui-info-box>
      <ui-info-box id="icon-without-heading" icon="music">heading なしでは icon を表示しません</ui-info-box>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const withHeading = getHost(canvasElement, 'icon-with-heading');
    const withoutHeading = getHost(canvasElement, 'icon-without-heading');
    await Promise.all([withHeading.updateComplete, withoutHeading.updateComplete]);

    const icon = getIcon(withHeading);
    if (!icon) throw new Error('heading ありで icon が描画されていません');
    if (icon.getAttribute('icon') !== 'lucide:music') {
      throw new Error('icon 名が一致しません');
    }
    if (icon.getAttribute('aria-hidden') !== 'true') {
      throw new Error('icon は aria-hidden=true が必要です');
    }

    if (getIcon(withoutHeading)) {
      throw new Error('heading なしでは icon を描画してはいけません');
    }
  },
};

/**
 * 境界条件:
 * 不正 variant は default にフォールバックする。
 */
export const InvalidVariantFallback: Story = {
  render: () => html`
    <ui-info-box id="invalid-variant" variant="unknown" heading="不正バリアント">
      invalid variant fallback
    </ui-info-box>
  `,
  play: async ({ canvasElement }) => {
    const infoBox = getHost(canvasElement, 'invalid-variant');
    await infoBox.updateComplete;

    const container = getContainer(infoBox);
    if (container.getAttribute('data-variant') !== 'default') {
      throw new Error('不正 variant は default へフォールバックする必要があります');
    }
  },
};

/**
 * 境界条件:
 * 有効な要素/テキストノードがない場合は描画しない。
 */
export const EmptySlotDoesNotRender: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-info-box id="empty-slot"></ui-info-box>
      <ui-info-box id="whitespace-only">   </ui-info-box>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const empty = getHost(canvasElement, 'empty-slot');
    const whitespaceOnly = getHost(canvasElement, 'whitespace-only');
    await Promise.all([empty.updateComplete, whitespaceOnly.updateComplete]);

    if (empty.shadowRoot?.querySelector('.info-box')) {
      throw new Error('空スロットでは .info-box を描画してはいけません');
    }
    if (whitespaceOnly.shadowRoot?.querySelector('.info-box')) {
      throw new Error('空白のみのスロットでは .info-box を描画してはいけません');
    }
  },
};

/**
 * スタイル契約:
 * 受け入れ基準にあるトークンと forced-colors ブロックを保持していることを検証。
 */
export const StyleContracts: Story = {
  render: () => html`
    <ui-info-box id="style-contracts" heading="Style Contracts" variant="filled" icon="palette" heading-level="2" landmark>
      style contract checks
    </ui-info-box>
  `,
  play: async ({ canvasElement }) => {
    const infoBox = getHost(canvasElement, 'style-contracts');
    await infoBox.updateComplete;

    const styles = String(InfoBox.styles);

    if (!styles.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors スタイルが定義されていません');
    }
    if (!styles.includes('var(--bg-fill-muted')) {
      throw new Error('filled 背景トークン --bg-fill-muted が使用されていません');
    }
    if (!styles.includes('var(--font-semibold')) {
      throw new Error('Small Text Rule: --font-semibold が適用されていません');
    }
    if (!styles.includes('var(--tracking-wide')) {
      throw new Error('Small Text Rule: --tracking-wide が適用されていません');
    }
    if (!styles.includes('var(--icon-xs')) {
      throw new Error('アイコンサイズトークン --icon-xs が使用されていません');
    }
    if (!styles.includes('var(--border-style-subtle')) {
      throw new Error('境界線トークン --border-style-subtle が使用されていません');
    }
  },
};

/**
 * Dark Mode 契約:
 * prefers-color-scheme 分岐を持たず、セマンティックトークンで Light/Dark を追従する。
 */
export const DarkModeTokenContract: Story = {
  render: () => html`
    <ui-info-box id="dark-mode-contract" heading="Dark Mode Contract" variant="filled" icon="moon" heading-level="2" landmark>
      semantic token contract checks
    </ui-info-box>
  `,
  play: async ({ canvasElement }) => {
    const infoBox = getHost(canvasElement, 'dark-mode-contract');
    await infoBox.updateComplete;

    const styles = String(InfoBox.styles);
    if (styles.includes('prefers-color-scheme')) {
      throw new Error('info-box は prefers-color-scheme 分岐を持たずトークンでモード追従する必要があります');
    }
    if (!styles.includes('var(--bg-fill-muted, oklch(96% 0 0))')) {
      throw new Error('--bg-fill-muted の参照が不足しています');
    }
    if (!styles.includes('var(--fg-muted,') || !styles.includes('var(--fg-default,')) {
      throw new Error('ヘッダー配色のトークン参照が不足しています');
    }
  },
};
