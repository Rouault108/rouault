import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './table';
import type { Table } from './table';

/**
 * ## テーブル (Table) `<ui-table>`
 *
 * 構造化されたデータを比較・閲覧するためのビューです。
 * ネイティブ `<table>` のセマンティクスを壊さずに、
 * スクロール制御・密度切替・アクセシビリティ補助を提供します。
 *
 * ### 設計思想
 *
 * - **横線のみ**: 縦線を排除して視線の水平移動（Scanning）を助けます。
 * - **Active Ruler**: `pointer: fine` デバイスでのみホバー行を強調します。
 * - **グローバルスタイル注入**: `connectedCallback` 時にドキュメントへスタイルを注入し、
 *   Shadow DOM の `::slotted()` 制限（孫要素への非適用）を回避します。
 *
 * ### アクセシビリティ
 *
 * - スクロール領域に `role="region"` / `tabindex="0"` を付与し、
 *   キーボード操作によるスクロールを保証します。
 * - `aria-label` 属性でスクロール領域のアクセシブルネームを提供します。
 * - `th` に `scope="col"` / `scope="row"` を明示することを推奨します。
 * - `<caption>` でテーブルタイトルを提供することを推奨します。
 *
 * ### density の使い分け
 *
 * - `normal`（デフォルト）: 12px 16px パディング、14px フォント
 * - `compact`: 8px 16px パディング、13px フォント
 */
const meta: Meta<Table> = {
  title: 'Components/Table',
  component: 'ui-table',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
テーブルコンポーネントは、構造化されたデータを比較・閲覧するための表示ビューです。

## 使用方法

\`\`\`html
<ui-table density="normal" aria-label="売上データ">
  <table>
    <caption>2024年 四半期別売上</caption>
    <thead>
      <tr>
        <th scope="col">四半期</th>
        <th scope="col" align="right">売上高</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Q1</td><td align="right">¥1,234,000</td></tr>
    </tbody>
  </table>
</ui-table>
\`\`\`

## 注意事項

- **\`aria-label\` は必須ではないが強く推奨**: 横スクロールが発生しうる \`role="region"\` には
  アクセシブルネームを設定してください。
- **レイアウト目的での使用禁止**: 本コンポーネントはデータ表示専用です。
- **Long Table Strategy**: 行数が多い場合は意味のまとまりごとに \`<tbody>\` を分割してください。
  \`tbody\` 間の境界線が強調され、意味的なまとまり（Chunking）を視覚化します。
`,
      },
    },
  },
  argTypes: {
    density: {
      control: 'select',
      options: ['normal', 'compact'],
      description: '行の高さ密度',
      table: {
        type: { summary: "'compact' | 'normal'" },
        defaultValue: { summary: "'normal'" },
      },
    },
    ariaLabel: {
      control: 'text',
      description: 'スクロール領域のアクセシブルネーム',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'null' } },
    },
  },
};

export default meta;
type Story = StoryObj<Table>;

// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * デフォルト（density="normal"）の基本的なデータテーブル。
 *
 * 最も一般的な使用例です。横線のみの区切り、
 * ヘッダーセルと本文セルのコントラスト差で構造を表現します。
 */

export const Default: Story = {
  render: () => html`
    <ui-table id="default-table" aria-label="メンバー一覧">
      <table>
        <thead>
          <tr>
            <th scope="col">名前</th>
            <th scope="col">役割</th>
            <th scope="col">所属</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>田中 太郎</td>
            <td>エンジニア</td>
            <td>開発部</td>
          </tr>
          <tr>
            <td>鈴木 花子</td>
            <td>デザイナー</td>
            <td>デザイン部</td>
          </tr>
          <tr>
            <td>山田 一郎</td>
            <td>PM</td>
            <td>企画部</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
};

// ──────────────────────────────────────────────
// コンパクト密度
// ──────────────────────────────────────────────

/**
 * コンパクト密度（density="compact"）。
 *
 * パディングを 8px 16px に削減し、フォントサイズも 13px に縮小します。
 * 多行表示や比較用途など、より多くの情報を一覧したい場合に使用します。
 */

export const Compact: Story = {
  render: () => html`
    <ui-table id="compact-table" density="compact" aria-label="コンパクトテーブル">
      <table>
        <thead>
          <tr>
            <th scope="col">名前</th>
            <th scope="col">役割</th>
            <th scope="col">所属</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>田中 太郎</td>
            <td>エンジニア</td>
            <td>開発部</td>
          </tr>
          <tr>
            <td>鈴木 花子</td>
            <td>デザイナー</td>
            <td>デザイン部</td>
          </tr>
          <tr>
            <td>山田 一郎</td>
            <td>PM</td>
            <td>企画部</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
};

// ──────────────────────────────────────────────
// キャプション付き
// ──────────────────────────────────────────────

/**
 * `<caption>` 要素付きのテーブル。
 *
 * テーブルの内容を説明するタイトルを提供します。スクリーンリーダーは
 * テーブルモードに入る前に caption を読み上げ、ユーザーの理解を助けます。
 * `caption-side: top` で左寄せ配置されます。
 */

export const WithCaption: Story = {
  render: () => html`
    <ui-table id="caption-table" aria-label="四半期売上データ">
      <table>
        <caption>
          2024年 四半期別売上実績
        </caption>
        <thead>
          <tr>
            <th scope="col">四半期</th>
            <th scope="col" align="right">売上高</th>
            <th scope="col" align="right">前期比</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Q1（1〜3月）</td>
            <td align="right">¥12,340,000</td>
            <td align="right">+8.2%</td>
          </tr>
          <tr>
            <td>Q2（4〜6月）</td>
            <td align="right">¥14,120,000</td>
            <td align="right">+14.4%</td>
          </tr>
          <tr>
            <td>Q3（7〜9月）</td>
            <td align="right">¥11,890,000</td>
            <td align="right">-15.8%</td>
          </tr>
          <tr>
            <td>Q4（10〜12月）</td>
            <td align="right">¥16,500,000</td>
            <td align="right">+38.8%</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
};

// ──────────────────────────────────────────────
// tfoot（サマリー行）付き
// ──────────────────────────────────────────────

/**
 * `<tfoot>` を使用したサマリー・合計行のテーブル。
 *
 * サマリー行はネイティブ `<tfoot>` 要素を使用します。
 * `tfoot` の先頭行には太めのボーダー（2px）が自動適用され、
 * 合計行として視覚的に区別されます。
 */

export const HorizontalScroll: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '列数が多く横スクロールが必要なテーブル。コンテナにフォーカスしてキーボードでスクロールできます。',
      },
    },
  },
  render: () => html`
    <div style="max-width: 500px;">
      <ui-table id="scroll-table" aria-label="月次パフォーマンスデータ（横スクロール）">
        <table>
          <thead>
            <tr>
              <th scope="col">指標</th>
              <th scope="col" align="right">1月</th>
              <th scope="col" align="right">2月</th>
              <th scope="col" align="right">3月</th>
              <th scope="col" align="right">4月</th>
              <th scope="col" align="right">5月</th>
              <th scope="col" align="right">6月</th>
              <th scope="col" align="right">7月</th>
              <th scope="col" align="right">8月</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>売上高</td>
              <td align="right">1,234</td>
              <td align="right">1,456</td>
              <td align="right">1,678</td>
              <td align="right">1,234</td>
              <td align="right">1,890</td>
              <td align="right">2,100</td>
              <td align="right">1,980</td>
              <td align="right">2,340</td>
            </tr>
            <tr>
              <td>訪問者数</td>
              <td align="right">12,345</td>
              <td align="right">13,456</td>
              <td align="right">14,567</td>
              <td align="right">15,678</td>
              <td align="right">16,789</td>
              <td align="right">17,890</td>
              <td align="right">18,901</td>
              <td align="right">20,012</td>
            </tr>
          </tbody>
        </table>
      </ui-table>
    </div>
  `,
};

// ──────────────────────────────────────────────
// 境界条件: aria-label なし
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: `aria-label` が設定されていないテーブル。
 *
 * `role="region"` にアクセシブルネームがない場合、スクリーンリーダーによっては
 * リージョンとして認識されない場合があります（WAI-ARIA 1.1仕様）。
 * 横スクロールが発生しうる場合は、`aria-label` の設定を強く推奨します。
 */

export const AllStates: Story = {
  render: () => html`
    <style>
      .states-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 3rem;
        max-width: 960px;
      }

      .state-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .state-label {
        font-size: 11px;
        font-weight: 500;
        color: var(--fg-muted, oklch(48% 0 0));
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>

    <div class="states-grid">
      <div class="state-group">
        <div class="state-label">Normal（デフォルト）</div>
        <ui-table aria-label="Normal density">
          <table>
            <thead>
              <tr>
                <th scope="col">名前</th>
                <th scope="col">役割</th>
                <th scope="col" align="right">金額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>田中 太郎</td>
                <td>エンジニア</td>
                <td align="right">¥500,000</td>
              </tr>
              <tr>
                <td>鈴木 花子</td>
                <td>デザイナー</td>
                <td align="right">¥450,000</td>
              </tr>
            </tbody>
          </table>
        </ui-table>
      </div>

      <div class="state-group">
        <div class="state-label">Compact</div>
        <ui-table density="compact" aria-label="Compact density">
          <table>
            <thead>
              <tr>
                <th scope="col">名前</th>
                <th scope="col">役割</th>
                <th scope="col" align="right">金額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>田中 太郎</td>
                <td>エンジニア</td>
                <td align="right">¥500,000</td>
              </tr>
              <tr>
                <td>鈴木 花子</td>
                <td>デザイナー</td>
                <td align="right">¥450,000</td>
              </tr>
            </tbody>
          </table>
        </ui-table>
      </div>

      <div class="state-group">
        <div class="state-label">Caption + tfoot</div>
        <ui-table aria-label="Caption and tfoot example">
          <table>
            <caption>
              サンプルデータ
            </caption>
            <thead>
              <tr>
                <th scope="col">項目</th>
                <th scope="col" align="right">金額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>項目A</td>
                <td align="right">¥10,000</td>
              </tr>
              <tr>
                <td>項目B</td>
                <td align="right">¥20,000</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>合計</td>
                <td align="right">¥30,000</td>
              </tr>
            </tfoot>
          </table>
        </ui-table>
      </div>

      <div class="state-group">
        <div class="state-label">Multiple tbody（Long Table Strategy）</div>
        <ui-table aria-label="Multiple tbody example">
          <table>
            <thead>
              <tr>
                <th scope="col">タスク</th>
                <th scope="col">状態</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>要件定義</td>
                <td>完了</td>
              </tr>
              <tr>
                <td>設計</td>
                <td>完了</td>
              </tr>
            </tbody>
            <tbody>
              <tr>
                <td>実装</td>
                <td>進行中</td>
              </tr>
              <tr>
                <td>テスト</td>
                <td>未着手</td>
              </tr>
            </tbody>
          </table>
        </ui-table>
      </div>
    </div>
  `,
};

/**
 * `.prose` 統合時のブレークアウト確認ストーリー
 */

export const DarkMode: Story = {
  tags: ['manual-only'],
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story:
          'ui-table の dark surface / semantic token の合否は SSR 側 CSS 構造検査を正本とします。この story は手動確認専用です。',
      },
    },
  },
  render: () => html`
    <ui-table id="dark-table" aria-label="Dark mode table">
      <table>
        <caption>
          Dark Surface
        </caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col" align="right">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Primary</td>
            <td align="right">120</td>
          </tr>
          <tr>
            <td>Secondary</td>
            <td align="right">80</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td align="right">200</td>
          </tr>
        </tfoot>
      </table>
    </ui-table>
  `,
};

export const VisualAccessibility: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
Reduced Motion / Forced Colors / Active Ruler に関する **CSS 構造契約** は
test/ssr/css-structure-contracts.test.ts へ移送済みです。
この story は **手動確認専用** です。

### 手動確認
- Reduced Motion 環境で hover transition が過剰でないこと
- Forced Colors で境界線が消えないこと
- pointer: fine で Active Ruler が視認できること
        `,
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <div>
        <div
          style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;"
        >
          Reduced Motion / Forced Colors / Active Ruler のテスト
        </div>
        <ui-table aria-label="視覚アクセシビリティ検証">
          <table>
            <thead>
              <tr>
                <th scope="col">行をホバーして</th>
                <th scope="col">Active Ruler を</th>
                <th scope="col">確認してください</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>行 1</td>
                <td>ホバー時に背景色が変わる</td>
                <td>pointer: fine のみ</td>
              </tr>
              <tr>
                <td>行 2</td>
                <td>トランジション 70ms</td>
                <td>Reduced Motion では 0.01ms</td>
              </tr>
              <tr>
                <td>行 3</td>
                <td>Forced Colors では CanvasText</td>
                <td>行ボーダー確認</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>tfoot 境界線</td>
                <td>2px 太線</td>
                <td>Forced Colors: CanvasText</td>
              </tr>
            </tfoot>
          </table>
        </ui-table>
      </div>
    </div>
  `,
};
