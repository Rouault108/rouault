# List

## 概要

本書は、`ui-list` の長期設計に基づく公開契約、状態モデル、アクセシビリティ、および視覚契約を整理するものです。

`ui-list` は、**行内容を外部宣言のまま保持する slot-driven の一覧グリッド**です。列定義に基づいてヘッダーを生成し、`ui-list-item` 群を行ホストとして受け取り、一覧として必要な current 管理、縦方向移動、ソート要求、空状態表示、ページネーション表示を統括します。

本書は現行実装の説明書ではありません。**長期的に採るべき正本契約**を先に固定し、現行実装との差分は末尾に整理します。したがって、現行実装が本書と一致しない箇所があっても、本書では設計のきれいさ、責務分離、保守性を優先します。

Rouault における list は、検索結果、ノート一覧、索引、履歴など、本文へ入る前段の閲覧導線を受け持ちます。したがって、本コンポーネントの契約は、情報密度を保ちつつ、**「没入して読む」ことのできるデザイン**へ静かにつなぐ一覧秩序を維持する方向で定義します。

---

## 適用範囲

本書は、`ui-list` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- current 行の可視範囲復帰
- loading / pending 状態
- 現行実装との差分および未対応事項

一方で、本書は次の事項を扱いません。

- 行内容そのものの描画詳細
- `ui-list-item` 内部の完全なセルレイアウト定義
- 実データの取得、検索、絞り込み、並び替え処理そのもの
- 行クリック後にどの画面へ遷移するかというルーティング設計
- コンテキストメニューやプレビュー UI の具体実装
- typeahead navigation
- section / group header
- 上位画面全体の selection model、バルクアクション、ツールバー連携
- 仮想スクロール
- 列リサイズ、列並べ替え
- 多段ソート / 複合ソート UI

これらは `ui-list-item`、上位画面、または別コンポーネントの責務です。

---

## 設計方針

### slot-driven を正本とします

`ui-list` は data-driven table へ後退しません。**行内容の正本は既定スロットに置かれた `ui-list-item` 群**であり、`ui-list` 自身は行内容を描画しません。

### current は列 ID ベースで扱います

`ui-list` は current を列インデックスではなく、**行 ID と列 ID の組**として扱います。可視列の切替、モバイル圧縮、列再配置に強い契約を優先します。

### 論理列と可視列を分離します

`columns` は**論理列**です。実際に画面へ描画される **可視列** は、`columns` と環境条件から導出されます。`mobile-supplement` は列ではなく補助情報であり、`actions` は補助操作領域であって論理列には含めません。

### interactive state は controlled を原則とします

ソートだけでなく current も、原則として外部制御とします。`ui-list` が要求イベントを発火し、利用側が state を戻す形を正本とします。内部で勝手に正規 state を確定する semi-controlled モデルには依存しません。

### 縦移動は list、横移動は row host が担当します

一覧全体の秩序は `ui-list`、行内セルの詳細移動は `ui-list-item` が担当します。**行間ナビゲーションと行内ナビゲーションを分離**し、責務境界を明確にします。

### actions は補助領域であり、主情報列ではありません

行末操作は閲覧導線を支える補助機能です。データ列や主列と同列には扱いません。ソート、主列判定、current の正本は data column を基準とします。

### pagination は表示行数から逆算しません

ページングは一覧の上位状態です。**現在表示行数から `limit` を推測する方式には依存しません。** ページ情報は明示入力として扱います。

---

## 公開契約

`ui-list` は、`columns`、`currentRowId`、`currentColumnId`、`sort`、`pagination`、`getPageHref`、`loading`、`loadingLabel`、`autoRevealCurrent` を公開入力として扱います。行 DOM は既定スロットに配置される `ui-list-item` 群として受け取ります。

`ui-list` はヘッダー行、空状態、loading 状態、current 同期、縦方向キーボード移動、ソート要求、ページネーション表示、current 行の可視範囲復帰を担当します。各行のセル内容そのものは `ui-list-item` 側の責務です。したがって、`ui-list` は data table ではなく、行内容を外部宣言で受ける current-aware list-grid shell です。

### 入力契約

| 名前                | 種別                                       | 必須   | 内容                                  | 契約                                                       |
| ------------------- | ------------------------------------------ | ------ | ------------------------------------- | ---------------------------------------------------------- |
| `columns`           | property                                   | はい   | 列定義配列                            | 一覧の論理列を定義します                                   |
| `currentRowId`      | property / attribute (`current-row-id`)    | いいえ | 現在行 ID                             | `null` は current 行なしを表します                         |
| `currentColumnId`   | property / attribute (`current-column-id`) | いいえ | 現在列 ID                             | `null` は current 列なしを表します                         |
| `sort`              | property                                   | いいえ | ソート状態                            | `{ key, direction }` を扱います                            |
| `pagination`        | property                                   | いいえ | ページ状態                            | `{ offset, limit, total }` を扱います                      |
| `getPageHref`       | property                                   | いいえ | ページ番号から URL を生成する関数     | `pagination` 使用時のリンク生成に使います                  |
| `loading`           | property / attribute (`loading`)           | いいえ | 読み込み中か                          | `true` の間は空状態と混同しません                          |
| `loadingLabel`      | property / attribute (`loading-label`)     | いいえ | loading 状態の説明文                  | 省略時は既定文言を用いてもかまいません                     |
| `autoRevealCurrent` | property / attribute (`auto-reveal-current`) | いいえ | current 解決後に自動で可視範囲復帰するか | `true` の場合のみ opt-in で current 行を視界へ復帰させます |
| `ariaLabel`         | property / attribute (`aria-label`)        | いいえ | grid 全体の名称                       | 省略時は上位文脈に依存します                               |
| `showActions`       | property / attribute (`show-actions`)      | いいえ | 行末操作領域の有無                    | `true` の場合のみ補助操作列を表示します                    |

### 正本入力の意味

#### `columns`

`columns` は **論理列の正本** です。ヘッダー表示、列順序、モバイル時の可視性、ソート可否、主列判定は `columns` を基準に決定します。

#### `currentRowId` / `currentColumnId`

current は **行 ID と列 ID** の組で表します。`currentColumnId` は `columns.id` のいずれかと一致しなければなりません。`showActions=true` であっても、行末操作領域を current の正本列として扱いません。

#### `sort`

`sort` は `{ key: string | null, direction: 'asc' | 'desc' | null }` を扱います。`ui-list` は要求イベントのみを発火し、実際の並び替えは行いません。**ソート状態は常に外部制御**です。

#### `pagination`

`pagination` は `{ offset: number, limit: number, total: number }` を扱います。`offset` は 0 始まりです。`limit` は 1 ページ当たり件数です。`total` は全件数です。

`ui-list` はページ情報を**現在表示行数から導出しません**。したがって、最後のページ、部分ロード、仮想化、空ロード中状態でもページ意味論を安定して維持できます。

#### `loading` / `loadingLabel`

`loading` は、一覧が**まだ結果未確定である状態**を表す真偽値です。`loading=true` の間、`ui-list` は空状態と loading 状態を混同しません。

`loadingLabel` は loading 状態の説明文です。アクセシブルな状態説明に使います。行内容の placeholder や skeleton は `ui-list-item` 側または上位画面の責務であり、`ui-list` 自体は loading の**意味**だけを持ちます。

#### `autoRevealCurrent`

`autoRevealCurrent` は、current が解決された後に current 行を視界へ復帰させるかを制御する opt-in 入力です。既定では `false` とし、`ui-list` は暗黙に自動スクロールしません。

可視範囲復帰は current の意味を変えません。current の値、列意味、選択状態を補完・変更するための仕組みとしては扱いません。

#### 命令的 API

`ui-list` は current 行の可視範囲復帰のため、次の命令的 API を公開してよいものとします。

| 名前              | 形態     | 契約                                                                 |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `revealCurrent()` | method   | 現在の current 行を視界へ復帰させます。current が解決不能なら no-op です |
| `scrollCurrentIntoView()` | method alias | 互換的な別名を置いてもかまいませんが、正本 API 名は `revealCurrent()` とします |

`revealCurrent()` は current の意味を変更しません。位置だけを補助します。

### 既定値と正規化

| 項目                | 既定値 / 正規化                       | 契約                                                         |
| ------------------- | ------------------------------------- | ------------------------------------------------------------ |
| `currentRowId`      | `null`                                | current 行なしとして扱います                                 |
| `currentColumnId`   | `null`                                | current 列なしとして扱います                                 |
| `sort`              | `{ key: null, direction: null }` 相当 | 非ソート状態として扱います                                   |
| `pagination`        | `null`                                | ページネーション非表示とします                               |
| `getPageHref`       | `null`                                | 未指定時は非リンク表示または既定関数に依存します             |
| `loading`           | `false`                               | 非 loading 状態として扱います                                |
| `loadingLabel`      | `null`                                | 省略時は実装既定の loading 説明文を使ってもかまいません      |
| `autoRevealCurrent` | `false`                               | 自動可視範囲復帰なしとして扱います                           |
| `ariaLabel`         | `null`                                | 上位文脈で十分なら省略できます                               |
| `showActions`       | `false`                               | 操作列なしとして扱います                                     |

`currentRowId` または `currentColumnId` が不正値であっても、`ui-list` は例外を投げることを正本契約としません。ただし、開発時には警告または検証失敗として扱います。

### `items` を正本入力にしません

長期設計では、`items` を `ui-list` の正本入力として扱いません。行メタデータは `ui-list-item` 側へ集約するか、必要であれば上位画面が row registry として管理します。

したがって、`ui-list` が `items` から行 ID を推測する運用には依存しません。**行 ID は各 `ui-list-item` が明示しなければなりません（MUST）。**

### current 成立条件

current は、`currentRowId` と `currentColumnId` の**組**としてのみ成立します。したがって、次を固定契約とします。

- `currentRowId=null` かつ `currentColumnId=null` は「current なし」です。
- `currentRowId` と `currentColumnId` の一方のみが非 `null` の状態は不正入力です。
- `currentRowId` が存在しても該当行が slot 上に存在しない場合、`ui-list` は current を推測・補完しません。
- `currentColumnId` が論理列に存在しない場合、`ui-list` は先頭列へフォールバックしません。

`ui-list` は current を自動補完して一貫性があるように見せることよりも、**不整合を不整合のまま検出可能に保つこと**を優先します。

### 列契約

各列は `ColumnDef` として扱います。

| 名前            | 型        | 必須   | 内容               | 契約                                            |
| --------------- | --------- | ------ | ------------------ | ----------------------------------------------- |
| `id`            | `string`  | はい   | 列識別子           | 一覧内で一意でなければなりません                |
| `label`         | `string`  | はい   | 見出しラベル       | ヘッダー表示に使います                          |
| `width`         | `string`  | はい   | 列幅               | CSS Grid 列幅として解釈可能でなければなりません |
| `sortable`      | `boolean` | いいえ | ソート可能か       | `true` の場合のみヘッダー操作対象です           |
| `sortKey`       | `string`  | いいえ | ソートキー         | `id` と分けたい場合に用います                   |
| `hideOnMobile`  | `boolean` | いいえ | モバイル時非表示か | `true` の場合、モバイルで抑制候補になります     |
| `lead`          | `boolean` | いいえ | 主列か             | モバイルでも保持すべき主列です                  |
| `defaultAction` | `boolean` | いいえ | 行起動先の基準列か | 既定遷移先の解決に用います                      |

### `lead` と `defaultAction` の分離

`lead` は**モバイル時にも保持すべき主列**を表します。`defaultAction` は**行起動先の基準列**を表します。両者を 1 つのフラグへ畳み込むことはしません。

- `lead` は 0 または 1 列に限定します（SHOULD）。
- `defaultAction` は 0 または 1 列に限定します（SHOULD）。
- `lead` と `defaultAction` は同一列でも別列でもかまいません。

### 列集合モデル

列集合は、次の 3 層に分離して扱います。

| 名称         | 正体                                 | current の対象     | `aria-colcount` への算入                |
| ------------ | ------------------------------------ | ------------------ | --------------------------------------- |
| 論理列       | `columns` そのもの                   | はい               | はい                                    |
| 可視列       | 論理列から環境条件で導出された表示列 | 間接的に関与します | はい                                    |
| 補助操作領域 | `actions`                            | いいえ             | `showActions=true` かつ描画時のみ加算します |

`mobile-supplement` は列集合に参加しません。これは可視列から脱落した情報を補助的に再提示する領域です。

`currentColumnId` は常に**論理列 ID**を指します。可視列の順序や有無によって current の意味が変化することには依存しません。

`actions` は補助操作領域であり、**current 列、既定起動先列、主列の判定対象には含めません**。`showActions=false` の場合、`actions` は構造上の列としても扱いません。

### スロット契約

| 名前         | 種別 | 位置づけ | 内容                            |
| ------------ | ---- | -------- | ------------------------------- |
| 既定スロット | slot | 正規入力 | `ui-list-item` 群を受け取ります |

既定スロットに受け取る正規入力は `ui-list-item` です。`ui-list` は slot 直下または flatten 後に見つかった `ui-list-item` を行として収集します。将来別の row host 実装を導入する場合も、本書で定義する row host 契約を満たさない要素は行として管理しません。

### `ui-list-item` 協調インターフェース

`ui-list-item` は、`ui-list` と組み合わせる際の**正規 row host 実装**です。`ui-list` は任意の子要素を暗黙に行として解釈する汎用 container ではありませんが、長期契約上の依存先はタグ名そのものではなく、**row host 契約**です。

現時点で正規にサポートする row host は `ui-list-item` のみとします。ただし、将来 `ui-list-item` 以外の実装を導入する場合でも、次の公開面を満たす要素であれば、**同一 row host 契約に準拠する実装**として扱えます。

| 項目           | 形態                                       | 契約                                                                 |
| -------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| 行識別         | `row-id` attribute または `rowId` property | 安定した行 ID を返さなければなりません                               |
| current 行状態 | `current` property                         | current 行であることを反映できなければなりません                     |
| current 列状態 | `currentColumnId` property                 | current 列 ID を解釈できなければなりません                           |
| 行番号         | `rowIndex` property                        | grid の行番号として反映できなければなりません                        |
| 列定義受領     | `columns` property                         | 親が供給した論理列定義を解釈できなければなりません                   |
| モバイル状態   | `isMobile` property                        | 親が供給した表示モードに従って可視列縮退を反映できなければなりません |
| 操作領域状態   | `showActions` property                     | 親が供給した操作領域表示条件を反映できなければなりません             |
| 行→親通知      | `ui-current-change` event                  | 親へ current row / column の変更要求を通知できなければなりません     |
| セル識別       | `data-column-id`                           | 内部セルは列 ID を識別できなければなりません                         |

親子間で必要になる再同期機構は存在してよいですが、それは**内部協調面**です。`requestListContext()` のような再同期都合を row host の公開契約には含めません。

したがって、`ui-list` の正規入力は**row host 契約を満たす行要素**です。本書時点ではその代表実装を `ui-list-item` とします。`ui-list` は任意子要素対応の汎用 container へ拡張しませんが、将来の差し替え可能性までタグ名に固定する設計は採りません。

### スロット名契約

`ui-list-item` が受け取るセルスロット名は、原則として `columns.id` と一致しなければなりません（MUST）。

予約スロットは次のとおりです。

| スロット名          | 位置づけ         | 契約                                                                 |
| ------------------- | ---------------- | -------------------------------------------------------------------- |
| `<column-id>`       | データセル       | `columns.id` に対応します                                             |
| `actions`           | 補助操作領域     | `showActions=true` の場合に限り描画対象です                           |
| `mobile-supplement` | モバイル補助情報 | 非表示列の要約に限定します                                            |

`actions` は**補助操作領域**であり、data column と同列の意味を持ちません。`showActions=false` の場合、`actions` スロット内容は表示に寄与しません。内部実装都合でプレースホルダーを持つことは妨げませんが、その存在に外部契約は依存しません。

### 属性反映契約

長期設計では、文字列・真偽値の単純入力のみを属性反映対象とします。構造的 state は property を正本とします。

| property          | attribute           | reflect | 備考                           |
| ----------------- | ------------------- | ------- | ------------------------------ |
| `currentRowId`    | `current-row-id`    | あり    | current 行 ID を保持します     |
| `currentColumnId` | `current-column-id` | あり    | current 列 ID を保持します     |
| `ariaLabel`       | `aria-label`        | あり    | grid 名称に使います            |
| `showActions`     | `show-actions`      | あり    | 補助操作領域の有無を制御します |
| `columns`         | なし                | なし    | property 専用です              |
| `sort`            | なし                | なし    | property 専用です              |
| `pagination`      | なし                | なし    | property 専用です              |
| `getPageHref`     | なし                | なし    | property 専用です              |

### 公開イベント契約

`ui-list` は次のイベントを公開します。

| 名前                 | `detail`                                                                                                               | 発火契機                         | 契約                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------ |
| `ui-current-change`  | `{ rowId: string; columnId: string }`                                                                                  | current 行・列の変更要求時       | bubbles / composed / cancelable です |
| `ui-sort-change`     | `{ key: string \| null; direction: 'asc' \| 'desc' \| null }`                                                          | ソート可能ヘッダーを操作したとき | bubbles / composed / cancelable です |
| `ui-preview-request` | `{ rowId: string }`                                                                                                    | `Shift+Space` を押下したとき     | bubbles / composed / cancelable です |
| `ui-context-request` | `{ rowId: string; origin: 'keyboard' \| 'pointer'; anchorPoint?: { x: number; y: number }; anchorRect?: DOMRectLike }` | `Shift+F10` または右クリック時   | bubbles / composed / cancelable です |

`ui-current-change` は要求イベントです。`ui-list` 自身が current state を内部確定することに依存しません。利用側が `currentRowId` と `currentColumnId` を更新することで一覧状態が確定します。

### 要求イベントの意味

本コンポーネントの公開イベントは、通知ではなく**要求**です。したがって、次を固定契約とします。

- `ui-current-change` は「current をこの値へ変更してよいか」の要求です。
- `ui-sort-change` は「このソート状態へ遷移してよいか」の要求です。
- `ui-preview-request` は「この行のプレビューを開いてよいか」の要求です。
- `ui-context-request` は「この行に対するコンテキスト UI を開いてよいか」の要求です。

これらのイベントは `preventDefault()` により拒否できます。`preventDefault()` された場合、`ui-list` はその要求に続く既定動作に依存しません。

### 列挙外値・無効値の扱い

- `sort.direction` は `asc` / `desc` / `null` 以外を受理しません。
- `columns.id` の重複は不正入力です。
- `lead=true` の列に `hideOnMobile=true` を併用する構成は不正入力です。
- `currentColumnId` が `columns.id` のいずれとも一致しない構成は不正入力です。
- `row-id` を持たない `ui-list-item` は不正入力です。
- `currentRowId` と `currentColumnId` の片側のみ指定は不正入力です。

### 違反入力の扱い

違反入力の扱いは、次の 3 類型に固定します。

| 類型           | 例                                                            | 扱い                                                         |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| 構造違反       | `columns.id` 重複、`row-id` 欠落、片側だけの current          | 開発時に必ず検出し、既定では例外または検証失敗として扱います |
| 意味違反       | `lead` と `hideOnMobile` の競合、存在しない `currentColumnId` | 開発時に警告または検証失敗として扱います                     |
| 許容可能な省略 | `sort=null`、`pagination=null`、`showActions=false`           | 正常系として扱います                                         |

不正入力に対して本番で例外を投げるかどうかは実装方針に依存しますが、**開発時には必ず検出可能**でなければなりません（MUST）。

### 責務範囲

責務範囲には、ヘッダー描画、列可視性制御、行状態同期、縦方向 current 管理、ソート要求イベント、プレビュー要求イベント、コンテキスト要求イベント、空状態表示、ページネーション表示を含みます。

一方で、実際の並び替え処理、行削除、複数選択、無限スクロール、列リサイズ、ドラッグ並び替え、プレビュー UI 本体、コンテキストメニュー本体は責務に含めません。

---

## 状態モデル

`ui-list` の主要状態は、**どの列を表示するか**、**どの行・列が current か**、**ソートがどの段階か**、**ページ情報が何か**、**loading か**、**空一覧か**によって読み分けます。

### 基本状態

最小状態は、`columns` が与えられ、スロットに 1 行以上の `ui-list-item` が存在し、`currentRowId=null`、`currentColumnId=null`、`sort.key=null`、`sort.direction=null`、`pagination=null`、`loading=false`、`autoRevealCurrent=false` の状態です。この状態では、静的な一覧グリッドとして振る舞います。

### current 状態

current は `currentRowId` と `currentColumnId` の組で表します。`ui-list` は一致する行へ `current=true` と `currentColumnId` を同期します。

`currentRowId` または `currentColumnId` のどちらか一方だけが設定される構成には依存しません。**current は行と列の組で定義**します。

`currentColumnId` は論理列 ID です。可視列への射影は `ui-list-item` 側で解釈してもよいですが、current の正本意味は変えません。

current 行または current 列が解決できない場合、`ui-list` は代替 current を生成しません。これは入力不整合として扱います。

### current 行の可視範囲復帰状態

`revealCurrent()` は、解決済み current 行を視界へ復帰させる補助操作です。これは current の意味を変更せず、位置だけを補助します。

`autoRevealCurrent=true` の場合、`ui-list` は current 解決後または current が再同期された後に、自動で `revealCurrent()` 相当の処理を行ってもかまいません。一方、既定では `autoRevealCurrent=false` とし、**暗黙の自動スクロールには依存しません**。

current が未解決、該当行が未収集、または loading 中で実行対象行がまだ存在しない場合、可視範囲復帰は no-op でかまいません。

### ソート状態

ソート可能列をクリックまたは Enter / Space で操作した場合、`ui-sort-change` を発火します。状態遷移は既定では三段階循環です。

| 現在                                          | 次                                        |
| --------------------------------------------- | ----------------------------------------- |
| 対象外列または `sort.key !== resolvedSortKey` | `key=resolvedSortKey`, `direction='asc'`  |
| `direction='asc'`                             | `key=resolvedSortKey`, `direction='desc'` |
| `direction='desc'`                            | `key=null`, `direction=null`              |

`resolvedSortKey` は `column.sortKey ?? column.id` です。

### loading 状態

`loading=true` は、一覧内容が未確定である状態を表します。検索結果取得中、ページ切替中、条件変更直後など、一時的に行収集結果が空であっても、**それだけで空状態とは解釈しません**。

loading 中は、次を固定契約とします。

- `ui-list` は空状態と loading 状態を混同しません。
- loading 表示文は `loadingLabel` または実装既定文言で示します。
- 行内容の skeleton や placeholder は `ui-list-item` 側または上位画面の責務です。
- loading 中であっても、既知の current 値そのものは失効しません。ただし該当行が未収集なら可視範囲復帰は no-op でかまいません。

### 空状態

表示対象行が 0 件であり、かつ `loading=false` の場合、空状態メッセージを表示します。このとき、ページネーションは表示してもよいですが、既定では非表示とします。

空状態の判定基準は、**スロット上に収集された `ui-list-item` 数が 0 件であること**です。

### ページネーション状態

`pagination` が与えられている場合、`offset`、`limit`、`total` に基づいてページネーションを表示できます。

- `currentPage = floor(offset / limit) + 1`
- `totalPages = ceil(total / limit)`

`limit` は 1 以上でなければなりません（MUST）。`ui-list` は現在表示行数から `limit` を再推定しません。

### モバイル状態

モバイルでは、`lead=true` の列を優先し、それ以外の列は `hideOnMobile!==true` のものだけを表示対象に含めます。

この状態では、ヘッダー数、グリッド列数、行が受け取る列コンテキストが変化します。`ui-list` は `columns` 自体を変更せず、**可視列集合のみを切り替えます**。

可視列集合の変化は current の意味を変えません。モバイルで current 列が非表示になった場合でも、`currentColumnId` 自体は維持できます。ただし、その視覚表現は `ui-list-item` 側で補助的に再提示するか、上位が current を再設定する責務を負います。

### row host 同期状態

行要素収集後、`ui-list` は各 `ui-list-item` に対して次を同期します。

- `current`
- `currentColumnId`
- `rowIndex`
- 列コンテキスト

`rowIndex` は header row を含む grid 構造と整合する値として付与します。どの index を与えるかは ARIA 方針に従って固定し、行順から場当たり的に推測しません。

### selection 非対応状態

`ui-list` は current を持ちますが、selection を持ちません。したがって、`current` を選択状態の代用として扱いません。複数選択、一括操作、範囲選択を追加する場合は、別の契約として昇格させます。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に `section` と `role="grid"` を持ち、内部にヘッダー rowgroup と body rowgroup を配置します。行本体はスロット経由で外部宣言された `ui-list-item` が担います。

```text
<ui-list>
  #shadow-root
    <section aria-label="...">
      <div role="grid" class="grid">
        <div role="rowgroup" class="header-rowgroup">
          <div role="row" class="header-row">
            <div role="columnheader">...</div>
            ...
            [<div role="columnheader" aria-label="操作"></div>]
          </div>
        </div>
        <div role="rowgroup" class="body-rowgroup">
          <slot></slot>
        </div>
      </div>
      [div.empty-state]
      [ui-pagination]
    </section>
</ui-list>
```

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 一覧全体は `role="grid"` を持ちます。
- ヘッダーは `role="columnheader"` を持ちます。
- `aria-colcount` は**論理列数**に `showActions=true` の場合のみ補助操作列を加えます。
- `aria-rowcount` は `pagination.total` が与えられた場合に総件数を示します。
- ソート可能列は `aria-sort` を持ちます。
- 空状態は `role="status"` と `aria-live="polite"` を持ちます。
- 行ごとの `aria-rowindex`、セルごとの `aria-colindex`、セルフォーカス管理は `ui-list-item` 側との協調で成立します。

本コンポーネントで重要なのは、**表のように見せることではなく、読み上げとキーボード移動の秩序を grid として保つこと**です。

### フォーカス戦略

長期設計では、`aria-activedescendant` には依存しません。**実フォーカスは各行ホスト内の cell 要素へ置く**方針を正本とします。

したがって、`ui-list-item` は次を満たさなければなりません。

- current cell に対応する要素へ focus を移せること
- 各 cell が `data-column-id` を持つこと
- 再描画後も current cell の focus 復帰が可能であること

また、tab stop は一覧全体で無制限に増やしません。初期侵入点、current cell への復帰、行外への離脱順序は `ui-list-item` を含む結合契約として一貫していなければなりません（MUST）。

### キーボード契約

`ui-list` は、行またはセル上で発生した `keydown` を受け、次を処理します。

| キー          | 契約                                                     |
| ------------- | -------------------------------------------------------- |
| `ArrowDown`   | 次行の同列へ current を移動します                        |
| `ArrowUp`     | 前行の同列へ current を移動します                        |
| `Home`        | 先頭行の同列へ current を移動します                      |
| `End`         | 末尾行の同列へ current を移動します                      |
| `PageDown`    | 既定のページステップで下方へ current を移動します        |
| `PageUp`      | 既定のページステップで上方へ current を移動します        |
| `Enter`       | 非インタラクティブターゲット上では既定起動先を要求します |
| `Shift+Space` | `ui-preview-request` を発火します                        |
| `Shift+F10`   | `ui-context-request` を発火します                        |

`ArrowLeft` / `ArrowRight` は `ui-list` の責務ではありません。**横方向セル移動は `ui-list-item` の責務**です。

Space 単体はスクロール用途としてブラウザ既定動作を維持します。`Enter` は、イベントターゲットがリンク・ボタン・フォーム部品などのインタラクティブ要素でない場合にのみ既定起動先を要求します。

### 行起動と抑止条件

`ui-list` における行起動は、**任意の click を遷移へ変換する処理ではありません**。誤起動を避けるため、次の条件では自動起動を抑止します。

| 条件                                                     | 契約           |
| -------------------------------------------------------- | -------------- |
| `metaKey` / `ctrlKey` / `shiftKey` / `altKey` 付き click | 行起動しません |
| 左クリック以外                                           | 行起動しません |
| テキスト選択中                                           | 行起動しません |
| リンク・ボタン・フォーム部品などのインタラクティブ要素上 | 行起動しません |
| 既定起動先未解決                                         | 遷移しません   |

一方で、行起動が抑止されても、current 更新そのものは個別に成立し得ます。したがって、**遷移と current 更新は同一ではありません**。

### 既定起動先解決契約

行起動時の既定起動先は次の順に解決します。

1. `defaultAction=true` の列に対応するセル内の `a[href]`
2. その列セル内にネストされた `a[href]`
3. `slot="actions"` を除く行内の先頭 `a[href]`

`lead` 列と既定起動先列は独立です。既定起動先の正本は `defaultAction` です。

### 既定起動先解決後の順序

既定起動先が解決できた場合、`ui-list` は**current 更新要求と起動要求を組にして扱います**。利用側は、少なくとも次の意味順序に依存できます。

1. 対象行と列を current として要求します。
2. 必要な `ui-current-change` を発火します。
3. 既定起動先の click 委譲または遷移要求を行います。

---

## Visual Contract

`ui-list` の視覚契約は、行ごとの自由な装飾を増やすことではなく、**列見出し、行境界、情報密度、モバイル時の情報圧縮**を安定化させることにあります。

### 情報順位

- ヘッダー行は本文より弱いが、行データよりは高い情報順位を持ちます。
- `lead` 列はモバイルでも保持される基準列です。
- actions 領域は補助操作として末尾に置き、主列には含めません。
- 空状態は中心配置で静かに示し、過剰な注意喚起を行いません。

一覧は本文に入る前段の導線です。したがって、ヘッダーや枠線は、検索結果や索引を素早く走査できる程度の明瞭さを持ちつつ、**本文そのものより強く主張してはなりません**。

### レイアウト

ルートのグリッドは CSS Grid により構成されます。`columns.width` から導出した列幅で構成し、`showActions=true` の場合のみ末尾へ actions 領域を追加します。

`subgrid` が利用可能な環境では rowgroup と header row は `subgrid` を使います。非対応環境では明示的列テンプレートで代替します。

モバイルでは可視列が絞り込まれます。主列は失わず、補助情報は `mobile-supplement` へ退避できます。

### 視覚仕様

- 外枠は 1 px の境界線と中程度の角丸を持ちます。
- ヘッダー rowgroup は本文行群から下境界線で分離します。
- ヘッダーセルは小さめの文字サイズと muted color を持ちます。
- ソート可能ヘッダーは hover と sorted 状態で強調されます。
- 空状態は中央寄せで十分な上下余白を持ちます。
- ページネーションは一覧下部に中央配置されます。

### フォーカス表示

ソート可能ヘッダーは `:focus-visible` 時に outline ベースのフォーカスリングを表示します。行やセルの current / focus 表示そのものは `ui-list-item` 側契約に委ねます。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途             | トークン                                                              |
| ---------------- | --------------------------------------------------------------------- |
| 境界線           | `--border-default`                                                    |
| 角丸             | `--radius-md` / `--radius-sm`                                         |
| 見出し文字色     | `--fg-muted`                                                          |
| 強調文字色       | `--fg-default`                                                        |
| フォーカスリング | `--focus-ring-width` / `--focus-ring-color`                           |
| 余白             | `--space-1` / `--space-3` / `--space-4` / `--space-12` / `--space-20` |
| 文字サイズ       | `--text-xs` / `--text-base`                                           |
| コントロール高さ | `--control-height-md`                                                 |
| アイコンサイズ   | `--icon-sm`                                                           |

---

## 環境別の振る舞い

### モバイル

モバイルでは `lead` 列を優先し、それ以外の `hideOnMobile=true` 列を非表示化します。`lead` 列が未指定の場合は、非表示指定されていない列のみを表示対象とします。

### モバイル補助情報契約

モバイルでは表示可能列が減るため、`ui-list-item` 側が `mobile-supplement` を提供する場合があります。これは単なる追加装飾ではなく、**非表示化された列情報の再提示面**として扱います。

したがって、`mobile-supplement` を使う場合は次を満たします。

- 主列本文の反復ではなく、モバイルで失われる補助情報を要約します。
- デスクトップ表示と意味が矛盾しません。
- 行の既定起動先や actions 領域より視覚優先度を上げません。
- 行ごとに存在有無が異なっても、一覧全体の走査可能性を損ないません。

### 実行環境前提

`ui-list` はブラウザ実行環境を前提とします。特に、`window.matchMedia`、`CSS.supports`、Shadow DOM、Custom Elements、および grid 関連 CSS が利用できる環境を対象とします。

したがって、本コンポーネントは次を公開契約としては保証しません。

- 非ブラウザ環境での完全動作
- `matchMedia` 非対応環境でのモバイル判定
- `CSS.supports` 非対応環境での `subgrid` 判定
- print 向け再構成

### `subgrid` 対応差

`subgrid` 対応環境では列整合を CSS の subgrid によって維持します。非対応環境では明示的列テンプレートで代替します。したがって、列幅文字列の妥当性は両環境で重要です。

### Dark Mode

現行 `ui-list` はダークモード専用スタイル分岐を持たなくてもよく、色差はトークン差し替えで吸収します。したがって、ダークテーマ適用時は `--border-default`、`--fg-muted`、`--fg-default` などの供給品質に依存します。

### Reduced Motion

`ui-list` 自体は固有アニメーションを持たないことを原則とします。reduced motion で特別に停止すべきモーションには依存しません。

### Print

print 契約は本書の正本範囲に含めません。印刷時の扱いは上位レイアウトに依存します。

---

## 関連契約

### `ui-list-item` 連携契約

`ui-list` は row host に対して内部的に強く依存します。現時点でその正規実装は `ui-list-item` です。少なくとも次の連携が成立していなければなりません。

| 項目           | 形態                                       | 契約                                                                 |
| -------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| 行識別         | `row-id` attribute または `rowId` property | 安定した行 ID を返さなければなりません                               |
| current 行状態 | `current` property                         | current 行であることを反映できなければなりません                     |
| current 列状態 | `currentColumnId` property                 | current 列 ID を解釈できなければなりません                           |
| 行番号         | `rowIndex` property                        | grid の行番号として反映できなければなりません                        |
| 列定義受領     | `columns` property                         | 親が供給した論理列定義を解釈できなければなりません                   |
| モバイル状態   | `isMobile` property                        | 親が供給した表示モードに従って可視列縮退を反映できなければなりません |
| 操作領域状態   | `showActions` property                     | 親が供給した操作領域表示条件を反映できなければなりません             |
| 行→親通知      | `ui-current-change` event                  | 親へ current row / column の変更要求を通知できなければなりません     |
| セル識別       | `data-column-id`                           | 内部セルは列 ID を識別できなければなりません                         |

親子間で必要になる再同期機構は存在してよいですが、それは**内部協調面**です。`requestListContext()` のような再同期都合を row host の公開契約には含めません。

このため、`ui-list` は任意の子要素を行として扱う汎用 container ではありません。一方で、依存の正本は `ui-list-item` というタグ名そのものではなく、上記の **row host 契約** です。本書時点の正規組み合わせは `ui-list` と `ui-list-item` ですが、将来別実装を導入する場合も、同一契約を満たすことを条件とします。

### ソート連携契約

`ui-list` はソート UI を提供しますが、データの並び替えは行いません。利用者は `ui-sort-change` を受け、必要に応じて次を更新します。

- 行順
- `sort`
- 必要であれば URL や検索条件

`sort` だけを更新して行順を変えない運用も可能ですが、その場合は**表示上のソート状態のみが変化する**ことになります。

### ページネーション契約

`ui-list` は `ui-pagination` を内包して表示できますが、ページそのものの状態遷移は外部責務です。`getPageHref` はページ番号からリンク先 URL を導出する補助にすぎません。

利用者は、ページ番号と `pagination.offset`、`pagination.limit`、`pagination.total` の整合を保たなければなりません（MUST）。

### コンテキスト・プレビュー契約

`ui-preview-request` と `ui-context-request` は要求イベントであり、UI 本体を内包しません。利用者はこれらを受け、別コンポーネントでプレビューやコンテキストメニューを開きます。

### 選択モデルとの分離

selection を導入する場合は、`ui-list` の current 契約と混同してはなりません。`current` は閲覧位置、`selected` は操作対象です。両者は必ず別 state として定義します。

---

## 境界条件

### `columns` が空

`columns=[]` は不正構成です。`ui-list` は空状態を描画してもかまいませんが、通常運用対象ではありません。

### 行が存在しない

スロット上に `ui-list-item` が存在しない場合、空状態メッセージを表示します。`pagination` が与えられていても、既定ではページネーションを表示しません。

### 行に `row-id` がない

行要素が `row-id` も `rowId` も持たない場合、その行は安定した行 ID を持ちません。この場合、current 一致判定、イベント detail、起動先解決の一貫性が損なわれます。行 ID のない運用には依存してはなりません（MUST NOT）。

### `currentColumnId` が存在しない列を指す

`currentColumnId` が `columns.id` のいずれとも一致しない場合、current 列は解決不能です。開発時には警告または検証失敗として扱います。

### 既定起動先が存在しない

Enter または click による行起動時、既定起動先が見つからない場合、遷移は発生しません。ただし current 更新要求は成立し得ます。

### 修飾キー付きクリック

`metaKey`、`ctrlKey`、`shiftKey`、`altKey` を伴うクリックでは、行起動の自動処理を行いません。テキスト選択中クリックやインタラクティブ要素上クリックも同様です。

### 右クリック

右クリック時は既定のコンテキストメニューを抑止し、対象行を current として要求した上で `ui-context-request` を発火します。

### `lead` と `hideOnMobile`

同一列に `lead=true` と `hideOnMobile=true` が併存する構成は不正です。補正で吸収することに依存しません。

### `showActions=false` と `actions` スロット

`showActions=false` のとき、`actions` スロット内容は**描画に寄与しません**。`actions` は論理列にも current モデルにも参加しません。

内部実装上の整列都合で補助要素を保持することは妨げませんが、外部契約はそれを列として扱いません。したがって、`showActions=false` の状態で action セルの存在、列 index、`aria-colcount`、クリック領域に依存してはなりません。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                        | 固定する契約                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `Default`                    | grid、columnheader、行収集、row-id 同期が成立すること                              |
| `Empty`                      | 空状態で `role="status"` と `aria-live="polite"` を持つこと                        |
| `SortCycle`                  | ソート可能列が `asc → desc → null` の三段階循環を持つこと                          |
| `KeyboardRowNavigation`      | `ArrowDown` により同列の次行へ current が移ること                                  |
| `CellHorizontalNavigation`   | 横方向セル移動契約が `ui-list-item` 連携で成立すること                             |
| `PreviewAndContextRequests`  | `Shift+Space` と `Shift+F10` / `contextmenu` が所定イベントを発火すること          |
| `PaginationContract`         | `offset` / `limit` / `total` に基づいてページ計算が成立すること                    |
| `MobileColumnsAndSupplement` | モバイル時に非表示列が抑制され、補助情報が表示されること                           |
| `SingleRowBoundary`          | 単一行で `ArrowDown` による行移動が発生しないこと                                  |
| `DarkMode`                   | トークン差し替え下でも一覧として読めること                                         |
| `ValidationFailures`         | 構造違反が開発時に検出可能であること                                               |
| `ControlledCurrent`          | `ui-current-change` を受けて外部が state を戻したときにのみ current が確定すること |
| `LoadingState`               | `loading=true` の間、空状態と混同せず状態説明を表示できること                      |
| `RevealCurrent`              | `revealCurrent()` または `autoRevealCurrent` により current 行を視界へ復帰できること |

`CellHorizontalNavigation` は `ui-list` 単体契約ではなく、`ui-list-item` との結合契約を確認する Story として扱います。

---

## 補足

`ui-list` の要点は、ヘッダー付きグリッドを描画すること自体ではありません。**行内容を外部宣言のまま保ちつつ、一覧として必要な移動秩序、列秩序、current 同期、要求イベントを一元化すること**にあります。

したがって、今後の変更でも次の 8 点は崩しません。

1. 行実体は `ui-list-item` への委譲を維持します。
2. current は行 ID と列 ID の組で扱います。
3. interactive state は原則 controlled を維持します。
4. `lead` と `defaultAction` を混同しません。
5. pagination を表示行数から逆算しません。
6. 横移動と縦移動の責務を混同しません。
7. loading と空状態を混同しません。
8. current の意味と可視範囲復帰を混同しません。

---

## 現行実装との差分

本節は、現行の `list.ts` および `list.stories.ts` に対して、本書が正本とする長期契約との差分を整理するものです。

### 公開入力は property 正本へ揃いました

現行実装は `items` を持たず、`columns`、`currentRowId`、`currentColumnId`、`sort`、`pagination`、`getPageHref`、`loading`、`loadingLabel`、`autoRevealCurrent` を正本入力として扱います。行実体は既定スロットの `ui-list-item` に限定します。

### `ariaLabel`

実装は `ariaLabel` を公開入力として受け取り、`grid` と外側 `section` の名称へ反映します。

### current は列 ID ベースです

実装は `currentRowId` と `currentColumnId` を正本とします。`activeRow` と `activeCellIndex` は使いません。

### `lead` / `defaultAction`

実装は `lead` をモバイル保持の基準列、`defaultAction` を Enter 時の既定起動先探索に用います。

### current は controlled です

実装の current 更新は `ui-current-change` 要求イベントを通じて行います。利用側が `currentRowId` と `currentColumnId` を戻すことで一覧状態が確定します。

### pagination は明示入力です

実装は `pagination.offset`、`pagination.limit`、`pagination.total` を正本としてページ番号と `aria-rowcount` を導出します。表示行数から `limit` を逆算しません。

### loading と空状態を分離しています

実装は `loading=true` の間、空状態を表示せず、`loadingLabel` または既定文言で状態説明を出します。

### current 行の可視範囲復帰を備えます

実装は `revealCurrent()` と `scrollCurrentIntoView()` を持ち、`autoRevealCurrent=true` の場合は current 解決後に opt-in で可視範囲復帰を行います。

### actions 列は `showActions` に従います

実装は `showActions=true` の場合にのみ補助操作領域を表示し、`aria-colcount` にもそのときだけ加算します。

### 行 ID は `row-id` です

実装は `row-id` を正本とし、親が `items[index].id` から行 ID を推測しません。

### イベント名は `current` ベースです

実装は `ui-current-change` を正本イベントとして使います。

### 要求イベントの `cancelable` と detail 形状

`ui-current-change`、`ui-sort-change`、`ui-preview-request`、`ui-context-request` はいずれも `cancelable` な要求イベントとして実装されています。`ui-context-request` の detail も `origin`、`anchorPoint`、`anchorRect` を持つ形へ揃えています。

### `ui-list-item` 協調インターフェース

親子協調は `row-id`、`current`、`currentColumnId`、`data-column-id` を前提にします。`ui-list-context-request` は内部協調面として維持します。

---

## 現行実装で未対応の事項

本節は、契約書内で長期設計として固定したが、現時点では未実装、未強制、または `ui-list` 単体では保証されない事項を整理するものです。

### 1. 違反入力の強制レベル

重複列 ID、`row-id` 欠落、`lead` / `hideOnMobile` 競合、片側だけの current などは dev で警告できますが、仕様書にある「例外または検証失敗」まではまだ固定していません。現状は検出可能性を優先し、警告ベースで運用しています。

### 2. 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用または厳密化する場合は、実装、Storybook、関連契約書の 3 点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。
