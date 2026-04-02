import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../article-header/article-header';
import './info-box';
import { InfoBox, type InfoBoxDensity, type InfoBoxVariant } from './info-box';
import {
  renderFoundationFrame,
  renderFoundationSection,
} from '../../../stories/shared/foundation-story-helpers';
import type { IconName } from '../../../../shared/icons/icons-catalog.js';

interface VariantMatrixCase {
  readonly id: string;
  readonly variant: InfoBoxVariant;
  readonly heading: string;
  readonly icon: IconName;
  readonly headingLevel?: number;
  readonly landmark: boolean;
  readonly expectedRole: 'region' | null;
  readonly expectsHeader: boolean;
}

const VARIANT_MATRIX_CASES: readonly VariantMatrixCase[] = [
  {
    id: 'matrix-default-region',
    variant: 'default',
    heading: '作品情報',
    icon: 'music',
    headingLevel: 3,
    landmark: true,
    expectedRole: 'region',
    expectsHeader: true,
  },
  {
    id: 'matrix-default-note',
    variant: 'default',
    heading: '補足情報',
    icon: 'book-open',
    headingLevel: 3,
    landmark: false,
    expectedRole: null,
    expectsHeader: true,
  },
  {
    id: 'matrix-filled-note',
    variant: 'filled',
    heading: 'この章のポイント',
    icon: 'clipboard-list',
    headingLevel: 3,
    landmark: false,
    expectedRole: null,
    expectsHeader: true,
  },
  {
    id: 'matrix-filled-region',
    variant: 'filled',
    heading: 'filled region',
    icon: 'shield',
    headingLevel: 4,
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
    expectedRole: null,
    expectsHeader: false,
  },
  {
    id: 'matrix-landmark-invalid-level',
    variant: 'default',
    heading: '見出しレベル未指定',
    icon: 'book-marked',
    landmark: true,
    expectedRole: null,
    expectsHeader: true,
  },
];

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
- \`landmark=true\` かつ \`heading\` / \`headingLevel\` / 非空本文ありのときだけ \`role="region"\`
- それ以外は追加の意味ロールを公開しない
- \`variant="filled"\` は \`--bg-fill-muted\` を使用
- \`density\` は余白とヘッダー密度のみを切り替える
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
    density: {
      control: 'inline-radio',
      options: ['comfortable', 'compact'],
      description: '視覚密度。余白とヘッダー密度のみを切り替える',
      table: {
        type: { summary: "'comfortable' | 'compact'" },
        defaultValue: { summary: "'comfortable'" },
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

const movedToBrowserDocs = (story: string): Pick<Story, 'tags' | 'parameters'> => ({
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story,
      },
    },
  },
});

/**
 * 基本ケース:
 * heading + icon + heading-level + landmark の組み合わせ。
 */
export const Default: Story = {
  tags: ['smoke'],
  args: {
    heading: '作品情報',
    icon: 'music',
    headingLevel: 3,
    landmark: true,
    variant: 'default',
    density: 'comfortable',
  },
  render: (args) => html`
    <ui-info-box
      id="info-box-default"
      heading="${args.heading}"
      icon="${args.icon}"
      heading-level="${ifDefined(
        args.headingLevel !== undefined ? String(args.headingLevel) : undefined,
      )}"
      ?landmark=${args.landmark}
      variant="${args.variant}"
      density="${args.density}"
    >
      <dl style="display: grid; gap: 0.5rem; margin: 0;">
        <dt>作曲</dt>
        <dd style="margin: 0;">クロード・ドビュッシー</dd>
        <dt>作品番号</dt>
        <dd style="margin: 0;">L. 75</dd>
      </dl>
    </ui-info-box>
  `,
};

/**
 * 閲覧用:
 * 「読む前提条件」を info-box で見せるときの文言と配置パターン。
 */
export const ReadingPrerequisitePlacements: Story = {
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
                      <li>
                        固有名詞や過去の文脈は、関連ノートの存在を前提に省略することがあります。
                      </li>
                      <li>
                        導入解説や完全な手順が必要な場合は、本文中の出典や関連ノートを併読してください。
                      </li>
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
                    <p>冒頭で背景を一段だけ説明したあと、読む姿勢を短く合わせたいケースです。</p>

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
                          ここから先は、過去の実装ログと Storybook
                          のコンポーネント契約を把握している前提で進めます。
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
                ステータスや更新日と混ぜないことで、article header は記事の現在地、 info-box
                は読むための前提という役割分担を保てます。
              </p>
            </div>
          `,
        )}
      `,
    ),
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
              heading-level="${ifDefined(
                item.headingLevel !== undefined ? String(item.headingLevel) : undefined,
              )}"
              ?landmark=${item.landmark}
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
};

/**
 * 境界条件:
 * heading-level の許容値（1-6）と無効値の扱い。
 */
export const HeadingLevelBoundaries: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-info-box id="heading-valid" heading="有効レベル" heading-level="1"
        >heading-level=1</ui-info-box
      >
      <ui-info-box id="heading-zero" heading="無効レベル0" heading-level="0"
        >heading-level=0</ui-info-box
      >
      <ui-info-box id="heading-seven" heading="無効レベル7" heading-level="7"
        >heading-level=7</ui-info-box
      >
      <ui-info-box id="heading-decimal" heading="無効レベル2.5" heading-level="2.5"
        >heading-level=2.5</ui-info-box
      >
      <ui-info-box id="heading-no-title" heading-level="4"
        >heading なし + heading-level=4</ui-info-box
      >
    </div>
  `,
};

/**
 * 境界条件:
 * landmark=true でも heading が空なら region を公開しない。
 */
export const LandmarkRequiresHeadingExample: Story = {
  render: () => html`
    <ui-info-box id="landmark-without-heading" heading="   " icon="music" landmark>
      heading 空文字時は landmark を無効化します。
    </ui-info-box>
  `,
};

/**
 * 密度契約:
 * comfortable / compact は余白のみを切り替え、セマンティクスは変えない。
 */
export const DensityStateMatrix: Story = {
  ...movedToBrowserDocs(
    'density / role / header-body の契約は test/browser/info-box.browser.test.ts で検査します。この story は docs / 手動確認専用です。',
  ),
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-info-box
        id="density-comfortable"
        heading="Comfortable"
        heading-level="2"
        density="comfortable"
        landmark
      >
        comfortable density
      </ui-info-box>
      <ui-info-box
        id="density-compact"
        heading="Compact"
        heading-level="2"
        density="compact"
        landmark
      >
        compact density
      </ui-info-box>
    </div>
  `,
};

/**
 * 境界条件:
 * icon は heading があるときのみ描画し、装飾扱いで aria-hidden を持つ。
 */
export const IconRenderingExamples: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-info-box id="icon-with-heading" heading="アイコン付き" icon="music"
        >icon を表示します</ui-info-box
      >
      <ui-info-box id="icon-without-heading" icon="music"
        >heading なしでは icon を表示しません</ui-info-box
      >
    </div>
  `,
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
};

/**
 * 境界条件:
 * 不正 density は comfortable にフォールバックする。
 */
export const InvalidDensityFallback: Story = {
  render: () => html`
    <ui-info-box id="invalid-density" density="unknown" heading="不正 density">
      invalid density fallback
    </ui-info-box>
  `,
};

/**
 * 境界条件:
 * 有効な要素/テキストノードがない場合は描画しない。
 */
export const EmptySlotDoesNotRender: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-info-box id="empty-slot"></ui-info-box>
      <ui-info-box id="whitespace-only"> </ui-info-box>
    </div>
  `,
};

/**
 * スタイル契約:
 * 受け入れ基準にあるトークンと forced-colors ブロックを保持していることを検証。
 */
export const StyleManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-info-box
      id="style-contracts"
      heading="Style Contracts"
      variant="filled"
      icon="palette"
      heading-level="2"
      landmark
    >
      style contract checks
    </ui-info-box>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'info-box の forced-colors / token / density に関する CSS 構造契約は test/ssr/css-structure-contracts.test.ts へ移送済みです。この story は手動確認専用です。',
      },
    },
  },
};

/**
 * Dark Mode 契約:
 * prefers-color-scheme 分岐を持たず、セマンティックトークンで Light/Dark を追従する。
 */
export const DarkModeManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-info-box
      id="dark-mode-contract"
      heading="Dark Mode Contract"
      variant="filled"
      icon="moon"
      heading-level="2"
      landmark
    >
      semantic token contract checks
    </ui-info-box>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'info-box の dark-mode token 参照契約は test/ssr/css-structure-contracts.test.ts へ移送済みです。この story は手動確認専用です。',
      },
    },
  },
};

/**
 * Print 契約:
 * 印刷時も背景に依存せず情報塊として識別できること。
 */
export const PrintManual: Story = {
  tags: ['manual-only'],
  args: {
    heading: 'Print Contract',
    icon: 'printer',
    headingLevel: 2,
    landmark: true,
    variant: 'filled',
    density: 'comfortable',
  } satisfies {
    heading: string;
    icon: IconName;
    headingLevel: number;
    landmark: boolean;
    variant: InfoBoxVariant;
    density: InfoBoxDensity;
  },
  render: (args) => html`
    <ui-info-box
      id="print-contract"
      heading="${args.heading}"
      icon="${args.icon}"
      heading-level="${String(args.headingLevel)}"
      ?landmark=${args.landmark}
      variant="${args.variant}"
      density="${args.density}"
    >
      print contract checks
    </ui-info-box>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'info-box の print CSS 構造契約は test/ssr/css-structure-contracts.test.ts へ移送済みです。この story では header / body の可視構造だけを確認します。',
      },
    },
  },
};
