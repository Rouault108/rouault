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
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#default-table');
		if (!table) throw new Error('ui-table が見つかりません');
		await table.updateComplete;

		// テスト: .table-container が存在する
		const container = table.shadowRoot?.querySelector('.table-container');
		if (!container) throw new Error('Shadow Root 内に .table-container が見つかりません');

		// テスト: role="region" が設定されている
		if (container.getAttribute('role') !== 'region') {
			throw new Error(
				`role="region" を期待していましたが、実際には "${container.getAttribute('role') ?? 'null'}" でした`,
			);
		}

		// テスト: tabindex="0" が設定されている
		if (container.getAttribute('tabindex') !== '0') {
			throw new Error(
				`tabindex="0" を期待していましたが、実際には "${container.getAttribute('tabindex') ?? 'null'}" でした`,
			);
		}

		// テスト: aria-label がコンテナに反映されている
		if (container.getAttribute('aria-label') !== 'メンバー一覧') {
			throw new Error(
				`aria-label="メンバー一覧" を期待していましたが、実際には "${container.getAttribute('aria-label') ?? 'null'}" でした`,
			);
		}

		// テスト: デフォルト density が 'normal'
		if (table.density !== 'normal') {
			throw new Error(`density="normal" を期待していましたが、実際には "${table.density}" でした`);
		}

		// テスト: ドキュメントにグローバルスタイルが注入されている
		const injectedStyle = document.getElementById('ui-table-document-styles');
		if (!injectedStyle) throw new Error('グローバルスタイルがドキュメントに注入されていません');

		// テスト: slotted な <table> が存在する
		const slottedTable = table.querySelector('table');
		if (!slottedTable) throw new Error('スロットされた <table> が見つかりません');

		// テスト: thead > tr > th が 3 つある
		const headers = table.querySelectorAll('thead th');
		if (headers.length !== 3) {
			throw new Error(`3つの th 要素を期待していましたが、実際には ${String(headers.length)}個でした`);
		}

		// テスト: tbody > tr が 3 行ある
		const rows = table.querySelectorAll('tbody tr');
		if (rows.length !== 3) {
			throw new Error(`3つのデータ行を期待していましたが、実際には ${String(rows.length)}行でした`);
		}
	},
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
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#compact-table');
		if (!table) throw new Error('ui-table が見つかりません');
		await table.updateComplete;

		// テスト: density プロパティが 'compact'
		if (table.density !== 'compact') {
			throw new Error(`density="compact" を期待していましたが、実際には "${table.density}" でした`);
		}

		// テスト: density 属性がホスト要素に反映されている（CSS セレクター動作の前提）
		if (table.getAttribute('density') !== 'compact') {
			throw new Error(
				`density="compact" 属性を期待していましたが、実際には "${table.getAttribute('density') ?? 'null'}" でした`,
			);
		}

		// テスト: .table-container が正しく設定されている
		const container = table.shadowRoot?.querySelector('.table-container');
		if (!container) throw new Error('.table-container が見つかりません');

		if (container.getAttribute('role') !== 'region') {
			throw new Error('role="region" を期待していましたが、実際には異なっていました');
		}

		if (container.getAttribute('tabindex') !== '0') {
			throw new Error('tabindex="0" を期待していましたが、実際には異なっていました');
		}
	},
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
				<caption>2024年 四半期別売上実績</caption>
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
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#caption-table');
		if (!table) throw new Error('ui-table が見つかりません');
		await table.updateComplete;

		// テスト: <caption> 要素が存在する
		const caption = table.querySelector('caption');
		if (!caption) throw new Error('<caption> 要素が見つかりません');

		// テスト: caption のテキストが正しい
		const captionText = caption.textContent;
		if (!captionText.includes('2024年')) {
			throw new Error(`キャプションに "2024年" が含まれることを期待していましたが、実際には "${captionText}" でした`);
		}

		// テスト: 4 行のデータがある
		const rows = table.querySelectorAll('tbody tr');
		if (rows.length !== 4) {
			throw new Error(`4つのデータ行を期待していましたが、実際には ${String(rows.length)}行でした`);
		}

		// テスト: align="right" の td が存在する
		const rightAlignedCells = table.querySelectorAll('td[align="right"]');
		if (rightAlignedCells.length === 0) {
			throw new Error('右揃えのセルが見つかりません');
		}
	},
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
export const WithTfoot: Story = {
	render: () => html`
		<ui-table id="tfoot-table" aria-label="経費レポート">
			<table>
				<thead>
					<tr>
						<th scope="col">項目</th>
						<th scope="col" align="right">金額</th>
						<th scope="col">備考</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>交通費</td>
						<td align="right">¥23,500</td>
						<td>新幹線往復</td>
					</tr>
					<tr>
						<td>宿泊費</td>
						<td align="right">¥18,000</td>
						<td>ホテル2泊</td>
					</tr>
					<tr>
						<td>会議費</td>
						<td align="right">¥8,400</td>
						<td>懇親会</td>
					</tr>
				</tbody>
				<tfoot>
					<tr>
						<td>合計</td>
						<td align="right">¥49,900</td>
						<td></td>
					</tr>
				</tfoot>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#tfoot-table');
		if (!table) throw new Error('ui-table が見つかりません');
		await table.updateComplete;

		// テスト: <tfoot> 要素が存在する
		const tfoot = table.querySelector('tfoot');
		if (!tfoot) throw new Error('<tfoot> 要素が見つかりません');

		// テスト: tfoot に行が 1 つある
		const tfootRows = tfoot.querySelectorAll('tr');
		if (tfootRows.length !== 1) {
			throw new Error(`1つの tfoot 行を期待していましたが、実際には ${String(tfootRows.length)}行でした`);
		}

		// テスト: tfoot の合計セルが正しいテキストを持つ
		const totalCell = tfoot.querySelector('td');
		if (!totalCell?.textContent.includes('合計')) {
			throw new Error(`tfoot に "合計" が含まれることを期待していましたが、実際には "${totalCell?.textContent ?? ''}" でした`);
		}

		// テスト: tbody に 3 行ある
		const tbodyRows = table.querySelectorAll('tbody tr');
		if (tbodyRows.length !== 3) {
			throw new Error(`3つの tbody 行を期待していましたが、実際には ${String(tbodyRows.length)}行でした`);
		}
	},
};

// ──────────────────────────────────────────────
// 複数 tbody（Long Table Strategy）
// ──────────────────────────────────────────────

/**
 * 複数の `<tbody>` を使用した Long Table Strategy。
 *
 * 意味のまとまりごとに `<tbody>` を分割することで、
 * `tbody` 間の境界線が強調（2px）され、
 * スクリーンリーダーの読み上げとビジュアルの「Chunking」を両立します。
 */
export const MultipleTbody: Story = {
	render: () => html`
		<ui-table id="multi-tbody-table" aria-label="プロジェクト管理タスク">
			<table>
				<thead>
					<tr>
						<th scope="col">タスク</th>
						<th scope="col">担当者</th>
						<th scope="col">ステータス</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>要件定義</td>
						<td>山田</td>
						<td>完了</td>
					</tr>
					<tr>
						<td>設計書作成</td>
						<td>田中</td>
						<td>完了</td>
					</tr>
				</tbody>
				<tbody>
					<tr>
						<td>フロントエンド実装</td>
						<td>鈴木</td>
						<td>進行中</td>
					</tr>
					<tr>
						<td>バックエンド実装</td>
						<td>佐藤</td>
						<td>進行中</td>
					</tr>
				</tbody>
				<tbody>
					<tr>
						<td>テスト</td>
						<td>高橋</td>
						<td>未着手</td>
					</tr>
					<tr>
						<td>デプロイ</td>
						<td>山田</td>
						<td>未着手</td>
					</tr>
				</tbody>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#multi-tbody-table');
		if (!table) throw new Error('ui-table が見つかりません');
		await table.updateComplete;

		// テスト: tbody が 3 つある
		const tbodies = table.querySelectorAll('tbody');
		if (tbodies.length !== 3) {
			throw new Error(`3つの tbody 要素を期待していましたが、実際には ${String(tbodies.length)}個でした`);
		}

		// テスト: 各 tbody に 2 行ずつある
		tbodies.forEach((tbody, idx) => {
			const rows = tbody.querySelectorAll('tr');
			if (rows.length !== 2) {
				throw new Error(
					`tbody[${String(idx)}] 内に 2つの行を期待していましたが、実際には ${String(rows.length)}行でした`,
				);
			}
		});

		// テスト: 全行合計で 6 行
		const allRows = table.querySelectorAll('tbody tr');
		if (allRows.length !== 6) {
			throw new Error(`合計 6つのデータ行を期待していましたが、実際には ${String(allRows.length)}行でした`);
		}
	},
};

// ──────────────────────────────────────────────
// colspan / rowspan
// ──────────────────────────────────────────────

/**
 * `colspan` および `rowspan` を使用した複合セル構造。
 *
 * HTML テーブルモデルの colspan / rowspan をサポートします。
 * `rowspan` を多用する場合は、意味のまとまりごとに `<tbody>` を分割する
 * Long Table Strategy を推奨します。
 */
export const ColspanRowspan: Story = {
	render: () => html`
		<ui-table id="colspan-table" aria-label="週次スケジュール">
			<table>
				<caption>2024年 第1週 スケジュール</caption>
				<thead>
					<tr>
						<th scope="col">時間</th>
						<th scope="col">月曜日</th>
						<th scope="col">火曜日</th>
						<th scope="col">水曜日</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<th scope="row">09:00</th>
						<td colspan="2">全社朝礼（オンライン）</td>
						<td>1on1 ミーティング</td>
					</tr>
					<tr>
						<th scope="row">10:00</th>
						<td>スプリント計画</td>
						<td rowspan="2">設計レビュー</td>
						<td>コーディング</td>
					</tr>
					<tr>
						<th scope="row">11:00</th>
						<td>コーディング</td>
						<td>コーディング</td>
					</tr>
				</tbody>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#colspan-table');
		if (!table) throw new Error('ui-table が見つかりません');
		await table.updateComplete;

		// テスト: colspan="2" のセルが存在する
		const colspanCell = table.querySelector('td[colspan="2"]');
		if (!colspanCell) throw new Error('td[colspan="2"] が見つかりません');

		if (!colspanCell.textContent.includes('全社朝礼')) {
			throw new Error(
				`colspan セルに "全社朝礼" が含まれることを期待していましたが、実際には "${colspanCell.textContent}" でした`,
			);
		}

		// テスト: rowspan="2" のセルが存在する
		const rowspanCell = table.querySelector('td[rowspan="2"]');
		if (!rowspanCell) throw new Error('td[rowspan="2"] が見つかりません');

		if (!rowspanCell.textContent.includes('設計レビュー')) {
			throw new Error(
				`rowspan セルに "設計レビュー" が含まれることを期待していましたが、実際には "${rowspanCell.textContent}" でした`,
			);
		}

		// テスト: scope="row" の th が存在する
		const rowHeaders = table.querySelectorAll('th[scope="row"]');
		if (rowHeaders.length !== 3) {
			throw new Error(`3つの行ヘッダー (scope="row") を期待していましたが、実際には ${String(rowHeaders.length)}個でした`);
		}
	},
};

// ──────────────────────────────────────────────
// 数値データ（等幅数値フォント）
// ──────────────────────────────────────────────

/**
 * 右揃え数値データ。`align="right"` で `font-feature-settings: "tnum"` が自動適用されます。
 *
 * `align="right"` が指定された `<td>` には自動的に等幅数値フォント（tnum）が
 * 適用されます。クラス指定なしで縦方向の数値の位置揃えが実現します。
 */
export const NumericData: Story = {
	render: () => html`
		<ui-table id="numeric-table" aria-label="財務データ">
			<table>
				<thead>
					<tr>
						<th scope="col">項目</th>
						<th scope="col" align="right">2022年</th>
						<th scope="col" align="right">2023年</th>
						<th scope="col" align="right">2024年</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>売上高</td>
						<td align="right">¥1,234,567</td>
						<td align="right">¥1,456,789</td>
						<td align="right">¥1,678,901</td>
					</tr>
					<tr>
						<td>営業利益</td>
						<td align="right">¥123,456</td>
						<td align="right">¥234,567</td>
						<td align="right">¥345,678</td>
					</tr>
					<tr>
						<td>純利益</td>
						<td align="right">¥98,765</td>
						<td align="right">¥187,654</td>
						<td align="right">¥276,543</td>
					</tr>
				</tbody>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#numeric-table');
		if (!table) throw new Error('ui-table が見つかりません');
		await table.updateComplete;

		// テスト: align="right" の td が存在する
		const rightCells = table.querySelectorAll('td[align="right"]');
		if (rightCells.length === 0) {
			throw new Error('td[align="right"] が見つかりません');
		}

		// テスト: 数値データが含まれている
		const firstNumericCell = rightCells[0];
		if (!firstNumericCell?.textContent.includes('¥')) {
			throw new Error('数値セルに "¥" 記号が含まれることを期待していましたが、実際には含まれていませんでした');
		}

		// テスト: 9 つの数値セルがある（3行 × 3列）
		if (rightCells.length !== 9) {
			throw new Error(`9つの右揃えセルを期待していましたが、実際には ${String(rightCells.length)}個でした`);
		}
	},
};

// ──────────────────────────────────────────────
// 配置サポート（left / center / right）
// ──────────────────────────────────────────────

/**
 * `align` 属性による左・中央・右の配置サポート（Markdown 互換）。
 *
 * `align` 属性は HTML5 では非推奨ですが、Markdown 生成コンテンツとの
 * 互換性のために例外的にサポートします。
 * 新規実装では CSS クラス（`.text-left`, `.text-center`, `.text-right`）の
 * 使用を推奨します。
 */
export const AlignmentSupport: Story = {
	render: () => html`
		<ui-table id="alignment-table" aria-label="アライメントデモ">
			<table>
				<thead>
					<tr>
						<th scope="col" align="left">左揃え（デフォルト）</th>
						<th scope="col" align="center">中央揃え</th>
						<th scope="col" align="right">右揃え（数値向け）</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td align="left">テキストコンテンツ</td>
						<td align="center">カテゴリ</td>
						<td align="right">¥1,234,567</td>
					</tr>
					<tr>
						<td align="left">長いテキストのサンプル</td>
						<td align="center">ラベル</td>
						<td align="right">¥9,876,543</td>
					</tr>
				</tbody>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#alignment-table');
		if (!table) throw new Error('ui-table が見つかりません');
		await table.updateComplete;

		// テスト: align="left" セルが存在する
		const leftCells = table.querySelectorAll('[align="left"]');
		if (leftCells.length === 0) throw new Error('align="left" のセルが見つかりません');

		// テスト: align="center" セルが存在する
		const centerCells = table.querySelectorAll('[align="center"]');
		if (centerCells.length === 0) throw new Error('align="center" のセルが見つかりません');

		// テスト: align="right" セルが存在する
		const rightCells = table.querySelectorAll('[align="right"]');
		if (rightCells.length === 0) throw new Error('align="right" のセルが見つかりません');
	},
};

// ──────────────────────────────────────────────
// 横スクロール（列数が多いテーブル）
// ──────────────────────────────────────────────

/**
 * 横スクロールが必要なワイドなテーブル。
 *
 * `.table-container` に `overflow-x: auto` が適用され、
 * `tabindex="0"` / `role="region"` によりキーボードでのスクロールが可能です。
 * フォーカス時にアウトラインが表示されます。
 */
export const HorizontalScroll: Story = {
	parameters: {
		docs: {
			description: {
				story: '列数が多く横スクロールが必要なテーブル。コンテナにフォーカスしてキーボードでスクロールできます。',
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
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#scroll-table');
		if (!table) throw new Error('ui-table が見つかりません');
		await table.updateComplete;

		// テスト: .table-container が存在する
		const container = table.shadowRoot?.querySelector('.table-container');
		if (!container) throw new Error('.table-container が見つかりません');

		// テスト: tabindex="0" によりキーボードフォーカス可能
		if (container.getAttribute('tabindex') !== '0') {
			throw new Error('コンテナはtabindex="0"でなければなりません');
		}

		// テスト: 8 列のヘッダーがある
		const headers = table.querySelectorAll('thead th');
		if (headers.length !== 9) {
			// 指標列 + 8ヶ月列
			throw new Error(`期待されるヘッダー数は9ですが、実際には ${String(headers.length)}個でした`);
		}

		// テスト: aria-label がコンテナに設定されている（スクロール可能リージョンのラベル）
		if (!container.getAttribute('aria-label')) {
			throw new Error('コンテナにはaria-labelが設定されていません');
		}

		// テーブルが実際に横スクロール対象であること
		if (container.scrollWidth <= container.clientWidth) {
			throw new Error(
				`期待される横スクロール対象ですが、実際には scrollWidth=${String(container.scrollWidth)} clientWidth=${String(container.clientWidth)}でした`,
			);
		}

		// キーボードフォーカス可能であること
		// Shadow DOM 内の要素へのフォーカスは document.activeElement ではホスト要素を指すため、
		// shadowRoot.activeElement でコンテナにフォーカスが当たっていることを確認する
		(container as HTMLElement).focus();
		if (table.shadowRoot?.activeElement !== container) {
			throw new Error('コンテナはキーボードフォーカスを受ける必要があります');
		}
	},
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
export const BoundaryNoAriaLabel: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: `aria-label` が未設定。`role="region"` にアクセシブルネームがない状態。横スクロールが発生する場合は必ず設定してください。',
			},
		},
	},
	render: () => html`
		<ui-table id="no-label-table">
			<table>
				<thead>
					<tr>
						<th scope="col">名前</th>
						<th scope="col">値</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>項目A</td>
						<td>100</td>
					</tr>
				</tbody>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#no-label-table');
		if (!table) throw new Error('ui-tableが見つかりません');
		await table.updateComplete;

		// テスト: ariaLabel プロパティは未指定のまま
		if (table.ariaLabel !== null) {
			throw new Error(`ariaLabelがnullでなければなりませんが、実際には "${table.ariaLabel}"でした`);
		}

		// テスト: フォールバックラベルが適用される
		const container = table.shadowRoot?.querySelector('.table-container');
		if (!container) throw new Error('.table-containerが見つかりません');

		if (!container.hasAttribute('aria-label')) {
			throw new Error('コンテナにはaria-labelが設定されていません');
		}

		const resolvedLabel = container.getAttribute('aria-label');
		if (resolvedLabel !== 'Data table') {
			throw new Error(`aria-label="Data table"を期待していましたが、実際には "${resolvedLabel ?? 'null'}"でした`);
		}

		// テスト: role="region" と tabindex="0" は維持される
		if (container.getAttribute('role') !== 'region') {
			throw new Error('role="region"が維持されるべきです');
		}

		if (container.getAttribute('tabindex') !== '0') {
			throw new Error('aria-labelが設定されていないにもかかわらず、tabindex="0"が維持されるべきです');
		}
	},
};

// ──────────────────────────────────────────────
// 境界条件: 1 行のみ
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: データ行が 1 行のみ。
 *
 * 最小限のデータ量でも正常にレンダリングされることを確認します。
 * ヘッダーと単一データ行のテーブルは有効なユースケースです。
 */
export const BoundarySingleRow: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: データ行が 1 行のみ。最小限のテーブルが正常にレンダリングされることを確認します。',
			},
		},
	},
	render: () => html`
		<ui-table id="single-row-table" aria-label="単一行テーブル">
			<table>
				<thead>
					<tr>
						<th scope="col">設定項目</th>
						<th scope="col">値</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>タイムゾーン</td>
						<td>Asia/Tokyo (UTC+9)</td>
					</tr>
				</tbody>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#single-row-table');
		if (!table) throw new Error('ui-tableが見つかりません');
		await table.updateComplete;

		// テスト: tbody に 1 行のみある
		const rows = table.querySelectorAll('tbody tr');
		if (rows.length !== 1) {
			throw new Error(`1つのデータ行を期待していましたが、実際には ${String(rows.length)}個でした`);
		}

		// テスト: 2 つのセルがある
		const cells = table.querySelectorAll('tbody td');
		if (cells.length !== 2) {
			throw new Error(`2つのセルを期待していましたが、実際には ${String(cells.length)}個でした`);
		}

		// テスト: コンポーネントが正常にレンダリングされている
		const container = table.shadowRoot?.querySelector('.table-container');
		if (!container) throw new Error('.table-containerが見つかりません');
	},
};

// ──────────────────────────────────────────────
// 境界条件: ヘッダーのみ（データ行なし）
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: `<thead>` のみで `<tbody>` にデータ行がないテーブル。
 *
 * 検索結果が 0 件の場合や、データがロード中の状態などで発生します。
 * 空の `<tbody>` でも構造が崩れないことを確認します。
 */
export const BoundaryHeaderOnly: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: `<tbody>` に行がない空テーブル。検索結果0件などの状態に対応します。',
			},
		},
	},
	render: () => html`
		<ui-table id="header-only-table" aria-label="空のデータテーブル">
			<table>
				<thead>
					<tr>
						<th scope="col">名前</th>
						<th scope="col">日付</th>
						<th scope="col">ステータス</th>
					</tr>
				</thead>
				<tbody>
					<!-- データなし -->
				</tbody>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#header-only-table');
		if (!table) throw new Error('ui-tableが見つかりません');
		await table.updateComplete;

		// テスト: thead が存在する
		const thead = table.querySelector('thead');
		if (!thead) throw new Error('theadが見つかりません');

		// テスト: tbody が存在するが行が 0 件
		const tbody = table.querySelector('tbody');
		if (!tbody) throw new Error('tbodyが見つかりません');

		const rows = tbody.querySelectorAll('tr');
		if (rows.length !== 0) {
			throw new Error(`データ行が0件であることを期待していましたが、実際には ${String(rows.length)}件でした`);
		}

		// テスト: ヘッダーセルが 3 つある（構造は正常）
		const headers = table.querySelectorAll('thead th');
		if (headers.length !== 3) {
			throw new Error(`3つのヘッダーセルを期待していましたが、実際には ${String(headers.length)}個でした`);
		}

		// テスト: コンテナは正常に存在する
		const container = table.shadowRoot?.querySelector('.table-container');
		if (!container) throw new Error('.table-containerが見つかりません');
	},
};

// ──────────────────────────────────────────────
// 密度の動的切り替え
// ──────────────────────────────────────────────

/**
 * density プロパティの動的切り替え。
 *
 * `density` を変更すると HTML 属性が更新され（`reflect: true`）、
 * CSS セレクター `ui-table[density="compact"]` のスタイルが即座に適用されます。
 * JS フレームワークや Storybook Controls で density を変更してご確認ください。
 */
export const DensityToggle: Story = {
	args: {
		density: 'normal',
	},
	render: (args) => html`
		<ui-table id="density-toggle-table" density="${args.density}" aria-label="密度切り替えテスト">
			<table>
				<thead>
					<tr>
						<th scope="col">コンポーネント</th>
						<th scope="col">バージョン</th>
						<th scope="col">ライセンス</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Lit</td>
						<td>3.x</td>
						<td>BSD-3-Clause</td>
					</tr>
					<tr>
						<td>TypeScript</td>
						<td>5.x</td>
						<td>Apache-2.0</td>
					</tr>
					<tr>
						<td>Vitest</td>
						<td>1.x</td>
						<td>MIT</td>
					</tr>
					<tr>
						<td>Storybook</td>
						<td>8.x</td>
						<td>MIT</td>
					</tr>
				</tbody>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#density-toggle-table');
		if (!table) throw new Error('ui-tableが見つかりません');
		await table.updateComplete;

		// テスト: 初期状態（density="normal"）
		if (table.density !== 'normal') {
			throw new Error(`初期状態は density="normal" でなければなりませんが、実際には "${table.density}" でした`);
		}

		// テスト: density を compact に変更
		const densityBefore = table.getAttribute('density');
		table.density = 'compact';
		await table.updateComplete;

		const densityAfter = table.getAttribute('density');
		if (densityBefore === densityAfter) {
			throw new Error(`密度が変更されなければなりませんが、実際には "${densityAfter ?? 'null'}" でした`);
		}

		// テスト: HTML 属性が更新されている（CSS セレクター動作の確認）
		if (densityAfter !== 'compact') {
			throw new Error(
				`密度が compact になるはずですが、実際には "${densityAfter ?? 'null'}" でした`,
			);
		}

		// テスト: normal に戻す
		table.density = 'normal';
		await table.updateComplete;

		if (table.getAttribute('density') !== 'normal') {
			throw new Error('密度が normal に戻るべきです');
		}
	},
};

// ──────────────────────────────────────────────
// アクセシビリティ構造確認
// ──────────────────────────────────────────────

/**
 * アクセシビリティ: ARIA 構造の確認。
 *
 * スクリーンリーダーが正しく解釈できる構造を検証します:
 * - `role="region"` + `aria-label`: スクロール可能領域として認識
 * - `tabindex="0"`: キーボードフォーカス可能
 * - `<caption>`: テーブルタイトルの提供
 * - `scope="col"` / `scope="row"`: 軸の明示
 * - `<thead>` / `<tbody>` / `<tfoot>`: セマンティックな構造
 */
export const AccessibilityStructure: Story = {
	render: () => html`
		<ui-table id="a11y-table" aria-label="アクセシビリティ検証テーブル">
			<table>
				<caption>スクリーンリーダー検証用テーブル</caption>
				<thead>
					<tr>
						<th scope="col">列見出し1</th>
						<th scope="col">列見出し2</th>
						<th scope="col">列見出し3</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<th scope="row">行見出しA</th>
						<td>データ A-2</td>
						<td>データ A-3</td>
					</tr>
					<tr>
						<th scope="row">行見出しB</th>
						<td>データ B-2</td>
						<td>データ B-3</td>
					</tr>
				</tbody>
				<tfoot>
					<tr>
						<td>合計</td>
						<td>—</td>
						<td>—</td>
					</tr>
				</tfoot>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#a11y-table');
		if (!table) throw new Error('ui-tableが見つかりません');
		await table.updateComplete;

		const shadow = table.shadowRoot;
		if (!shadow) throw new Error('shadowRootが見つかりません');

		const container = shadow.querySelector('.table-container');
		if (!container) throw new Error('.table-containerが見つかりません');

		// テスト: role="region"
		if (container.getAttribute('role') !== 'region') {
			throw new Error(`role="region"を期待していましたが、実際には "${container.getAttribute('role') ?? 'null'}" でした`);
		}

		// テスト: tabindex="0"
		if (container.getAttribute('tabindex') !== '0') {
			throw new Error(`tabindex="0"を期待していましたが、実際には "${container.getAttribute('tabindex') ?? 'null'}" でした`);
		}

		// テスト: aria-label がコンテナに正しく反映されている
		const ariaLabel = container.getAttribute('aria-label');
		if (ariaLabel !== 'アクセシビリティ検証テーブル') {
			throw new Error(`aria-label="アクセシビリティ検証テーブル"を期待していましたが、実際には "${ariaLabel ?? 'null'}" でした`);
		}

		// テスト: <caption> が存在する
		const caption = table.querySelector('caption');
		if (!caption) throw new Error('captionが見つかりません');

		// テスト: scope="col" の th が 3 つある
		const colHeaders = table.querySelectorAll('th[scope="col"]');
		if (colHeaders.length !== 3) {
			throw new Error(`Expected 3 scope="col" headers, got ${String(colHeaders.length)}`);
		}

		// テスト: scope="row" の th が 2 つある
		const rowHeaders = table.querySelectorAll('th[scope="row"]');
		if (rowHeaders.length !== 2) {
			throw new Error(`scope="row" のヘッダーが2つあることを期待していましたが、${String(rowHeaders.length)}個でした`);
		}

		// テスト: <thead> / <tbody> / <tfoot> が存在する
		if (!table.querySelector('thead')) throw new Error('theadが見つかりません');
		if (!table.querySelector('tbody')) throw new Error('tbodyが見つかりません');
		if (!table.querySelector('tfoot')) throw new Error('tfootが見つかりません');
	},
};

// ──────────────────────────────────────────────
// 全状態一覧
// ──────────────────────────────────────────────

/**
 * 全バリアントの一覧。
 *
 * すべての主要バリアントを一覧で確認できます。
 * デザインレビューやビジュアルリグレッションテストに使用します。
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
							<tr><td>田中 太郎</td><td>エンジニア</td><td align="right">¥500,000</td></tr>
							<tr><td>鈴木 花子</td><td>デザイナー</td><td align="right">¥450,000</td></tr>
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
							<tr><td>田中 太郎</td><td>エンジニア</td><td align="right">¥500,000</td></tr>
							<tr><td>鈴木 花子</td><td>デザイナー</td><td align="right">¥450,000</td></tr>
						</tbody>
					</table>
				</ui-table>
			</div>

			<div class="state-group">
				<div class="state-label">Caption + tfoot</div>
				<ui-table aria-label="Caption and tfoot example">
					<table>
						<caption>サンプルデータ</caption>
						<thead>
							<tr>
								<th scope="col">項目</th>
								<th scope="col" align="right">金額</th>
							</tr>
						</thead>
						<tbody>
							<tr><td>項目A</td><td align="right">¥10,000</td></tr>
							<tr><td>項目B</td><td align="right">¥20,000</td></tr>
						</tbody>
						<tfoot>
							<tr><td>合計</td><td align="right">¥30,000</td></tr>
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
							<tr><td>要件定義</td><td>完了</td></tr>
							<tr><td>設計</td><td>完了</td></tr>
						</tbody>
						<tbody>
							<tr><td>実装</td><td>進行中</td></tr>
							<tr><td>テスト</td><td>未着手</td></tr>
						</tbody>
					</table>
				</ui-table>
			</div>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const tables = canvasElement.querySelectorAll<Table>('ui-table');
		await Promise.all([...tables].map((t) => t.updateComplete));

		// テスト: 4 つのテーブルが存在する
		if (tables.length !== 4) {
			throw new Error(`4つの ui-table コンポーネントを期待していましたが、実際には ${String(tables.length)}個でした`);
		}

		// テスト: 1 番目（Normal）の density が 'normal'
		const normalTable = tables[0];
		if (!normalTable) throw new Error('1番目のテーブルが見つかりません');
		if (normalTable.density !== 'normal') {
			throw new Error(`First table should have density="normal", got "${normalTable.density}"`);
		}

		// テスト: 2 番目（Compact）の density が 'compact'
		const compactTable = tables[1];
		if (!compactTable) throw new Error('2番目のテーブルが見つかりません');
		if (compactTable.density !== 'compact') {
			throw new Error(`2番目のテーブルは density="compact" でなければなりませんが、実際には "${compactTable.density}" でした`);
		}

		// テスト: 3 番目（Caption + tfoot）が caption と tfoot を持つ
		const captionTable = tables[2];
		if (!captionTable) throw new Error('3番目のテーブルが見つかりません');
		if (!captionTable.querySelector('caption')) {
			throw new Error('3番目のテーブルには caption が含まれている必要があります');
		}
		if (!captionTable.querySelector('tfoot')) {
			throw new Error('3番目のテーブルには tfoot が含まれている必要があります');
		}

		// テスト: 4 番目（Multiple tbody）が 2 つの tbody を持つ
		const multiTable = tables[3];
		if (!multiTable) throw new Error('4番目のテーブルが見つかりません');
		const tbodies = multiTable.querySelectorAll('tbody');
		if (tbodies.length !== 2) {
			throw new Error(`4番目のテーブルには2つの tbody を持つ必要がありますが、実際には ${String(tbodies.length)}個でした`);
		}
	},
};

/**
 * `.prose` 統合時のブレークアウト確認ストーリー
 */
export const ProseIntegration: Story = {
	render: () => html`
		<style>
			.prose {
				max-width: 720px;
				margin: 0 auto;
			}

			.prose table {
				max-width: none;
				width: calc(100% + var(--space-8, 2rem));
				margin-inline: var(--space-n4, -1rem);
			}

			@media (min-width: 768px) {
				.prose table {
					width: calc(100% + var(--space-16, 4rem));
					margin-inline: var(--space-n8, -2rem);
				}
			}
		</style>

		<div class="prose" id="prose-wrapper">
			<p>本文テキストの前段です。</p>
			<ui-table id="prose-table" aria-label="本文内テーブル">
				<table>
					<thead>
						<tr>
							<th scope="col">列</th>
							<th scope="col" align="right">値</th>
						</tr>
					</thead>
					<tbody>
						<tr><td>A</td><td align="right">100</td></tr>
						<tr><td>B</td><td align="right">200</td></tr>
					</tbody>
				</table>
			</ui-table>
			<p>本文テキストの後段です。</p>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const wrapper = canvasElement.querySelector<HTMLElement>('#prose-wrapper');
		const table = canvasElement.querySelector<Table>('#prose-table');
		if (!wrapper) throw new Error('prose-wrapperが見つかりません');
		if (!table) throw new Error('ui-tableが見つかりません');
		await table.updateComplete;

		const lightDomTable = table.querySelector('table');
		if (!lightDomTable) throw new Error('slotted tableが見つかりません');

		// ブレークアウト指定が効く前提のスタイルが適用されていること
		const widthValue = getComputedStyle(lightDomTable).width;
		if (!widthValue) {
			throw new Error('prose tableの幅のスタイルが解決されませんでした');
		}

		const container = table.shadowRoot?.querySelector('.table-container');
		if (!container) throw new Error('.table-containerが見つかりません');
	},
};

/**
 * ダーク背景での可読性確認ストーリー
 */
export const DarkMode: Story = {
	parameters: {
		backgrounds: { default: 'dark' },
	},
	render: () => html`
		<ui-table id="dark-table" aria-label="Dark mode table">
			<table>
				<caption>Dark Surface</caption>
				<thead>
					<tr>
						<th scope="col">Name</th>
						<th scope="col" align="right">Value</th>
					</tr>
				</thead>
				<tbody>
					<tr><td>Primary</td><td align="right">120</td></tr>
					<tr><td>Secondary</td><td align="right">80</td></tr>
				</tbody>
				<tfoot>
					<tr><td>Total</td><td align="right">200</td></tr>
				</tfoot>
			</table>
		</ui-table>
	`,
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('#dark-table');
		if (!table) throw new Error('ui-tableが見つかりません');
		await table.updateComplete;

		const header = table.querySelector('th');
		const cell = table.querySelector('td');
		if (!header || !cell) throw new Error('tableのセルが見つかりません');

		const headerColor = getComputedStyle(header).color;
		const cellColor = getComputedStyle(cell).color;
		if (!headerColor || !cellColor) {
			throw new Error('ダークモードでテキストカラーが解決されませんでした');
		}
	},
};

// ──────────────────────────────────────────────
// Reduced Motion / Forced Colors（手動確認）
// ──────────────────────────────────────────────

/**
 * Reduced Motion および Forced Colors Mode の手動確認。
 *
 * 自動化できない視覚的テストのための参照ストーリーです。
 *
 * **確認方法**:
 * - **Reduced Motion**: OS 設定でアニメーション削減を有効化し、
 *   行ホバー時のトランジションが `0.01ms` になることを確認してください。
 * - **Forced Colors**: Chrome DevTools の Rendering タブから
 *   `forced-colors: active` をエミュレートし、行ボーダーが `CanvasText` で
 *   表示されることを確認してください。
 * - **Active Ruler**: `@media (hover: hover) and (pointer: fine)` のデバイスで
 *   tbody の行をホバーし、背景色が `--bg-table-ruler` で強調されることを確認してください。
 */
export const VisualAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story: `
**Reduced Motion** と **Forced Colors Mode** の手動確認ストーリーです。

### Reduced Motion の確認
- Windows: 設定 > アクセシビリティ > 視覚効果 > アニメーション効果をオフ
- macOS: システム設定 > アクセシビリティ > ディスプレイ > 視差効果を減らす
- 行ホバー時の \`background-color\` トランジションが \`0.01ms\` になることを確認

### Forced Colors Mode の確認
- Chrome DevTools: Rendering > Emulate CSS media feature \`forced-colors: active\`
- 行ボーダーが \`1px solid CanvasText\` で表示されることを確認
- \`tfoot\` / \`tbody + tbody\` の境界線が \`2px solid CanvasText\` になることを確認

### Active Ruler の確認
- pointer: fine デバイスで tbody の行にホバーし、\`--bg-table-ruler\` で背景色が変わることを確認
- touch デバイスでは hover が無効化されることを確認
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
	play: async ({ canvasElement }) => {
		const table = canvasElement.querySelector<Table>('ui-table');
		if (!table) throw new Error('ui-tableが見つかりません');
		await table.updateComplete;

		const injectedStyle = document.getElementById('ui-table-document-styles');
		if (!injectedStyle?.textContent) {
			throw new Error('視覚アクセシビリティルールのグローバルスタイル注入が行われていません');
		}

		if (!injectedStyle.textContent.includes('@media (prefers-reduced-motion: reduce)')) {
			throw new Error('注入されたスタイルに prefers-reduced-motion メディアクエリが含まれていません');
		}

		if (!injectedStyle.textContent.includes('@media (forced-colors: active)')) {
			throw new Error('注入されたスタイルに forced-colors メディアクエリが含まれていません');
		}

		if (!injectedStyle.textContent.includes('@media (hover: hover) and (pointer: fine)')) {
			throw new Error('注入されたスタイルにホバー用のメディアクエリが含まれていません');
		}
	},
};
