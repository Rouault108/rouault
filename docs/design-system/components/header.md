# Header

## 概要

本書は、`ui-header` の公開契約、状態モデル、アクセシビリティ、および視覚契約を整理するものです。

`layout-header` は `ui-header` の上位 adapter として、Rouault の page chrome に必要な start / end 領域を供給します。特に note page では `toc-presence="present|absent"` を受け、本文側の TOC 列契約と同じ presence 信号で center-end reserve を切り替えます。

ただし、Rouault の現在の `layout-header` は breadcrumb を所有しません。note 文脈の breadcrumb 正本は本文先頭の SSR light DOM `header.article-header` が所有し、`layout-header` は移動・補助操作・TOC トリガー・corpus 切替・theme 切替に専念します。

`ui-header` は、アプリケーションシェル上部に配置するヘッダーコンポーネントです。単にヘッダーらしい見た目を描画するのではなく、**アプリ全体のナビゲーション開始点をどこに置くか**、**文脈表示をどの位置に固定するか**、**`sidebarExpanded` という現名称の layout 同期入力を start 幅予約へどう反映するか**、**その状態変化をどのイベント面で通知するか**を公開契約として固定します。

また、`ui-header` は `display: contents` により外側のアプリシェルレイアウトへ透過的に参加します。そのため、本コンポーネントの契約は、単体の箱として完結することよりも、**アプリシェル内での位置づけを崩さないこと**を優先します。

Rouault における header は、本文を主役とする読書体験を妨げずに、**移動、文脈把握、補助操作**だけを静かに支える必要があります。したがって、本コンポーネントの契約は、存在感を過剰に高めることではなく、**「没入して読む」ことのできるデザイン**を保ちながらアプリシェルの秩序を維持する方向で定義します。

本書は、長期保守性を後段の補助方針として別置きするのではなく、**公開契約そのものに織り込んで記述します**。したがって、責務境界、意味論、適用文脈、非目標は、各節の本文中で直接固定します。

### 本書における強度表現

本書では、強度表現を次の意味で統一します。

- **MUST / MUST NOT**: 互換性、成立条件、責務境界の維持に必須の規則です。
- **SHOULD / SHOULD NOT**: 推奨構成または優先度の高い運用規則です。正当な理由がある場合に限り逸脱し得ますが、既定の判断としては採りません。

---

## 適用範囲

本書は、`ui-header` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 上の公開契約試験
- 視覚回帰確認
- 参考使用例
- 現行実装を踏まえて契約や機能で未だ対応していないもの

一方で、本書は次の事項を扱いません。

- サイドバー本体の開閉実装
- パンくずリストや検索トリガーなど、各スロット内容の生成ロジック
- アプリシェル全体の Grid 定義そのもの
- ヘッダー内に置く操作の情報設計全体
- テーマ切り替え、検索ダイアログ、ユーザーメニューなど上位機能の振る舞い
- 画面ごとのナビゲーション方針や導線設計
- `sidebarExpanded` に代わる layout 指向 API の再編
- slot 単位の表示ポリシー入力
- landmark の明示ラベル入力
- 外部入力型の scroll-state 反映
- slot presence 状態の公開
- 狭幅時の代替表示モード切り替え
- wrapper 前提の環境対応補助

これらは上位レイヤ、foundation、または内部実装改善の責務です。

---

## 公開契約

本節は、`ui-header` の **採用済みの最終公開契約**を定義します。  
ここで定義する内容は、現行実装や現行 Storybook がまだ未追従であっても、将来維持すべき公開面として扱います。実装・Story 側の追従状況は `## 現行実装を踏まえて契約や機能で未だ対応していないもの` で管理します。

したがって、本節は **「現行実装がいま何を持っているか」** を記述する場ではなく、**「`ui-header` を今後どの契約で維持するか」** を記述する場です。現行実装と差分がある場合でも、利用者は本節を契約の正本として読まなければなりません（MUST）。

`ui-header` は、`sidebarExpanded` を唯一の公開状態入力として扱います。あわせて、`start`、`center`、`compact-center`、`end` の 4 スロットを公開入力面として持ちます。内部実装はネイティブ `<header>` を持つ Shadow DOM 構造ですが、利用者は `ui-header` を **app-shell の上端レイアウト単位**として扱います。

`sidebarExpanded` の既定値は `true` です。`true` の場合、start ゾーンは `--sidebar-width` 分の幅を予約します。`false` の場合、start ゾーンは内容幅まで縮退します。ここで変化するのは **header 内のレイアウト予約**であり、サイドバー本体の開閉そのものではありません。

`sidebarExpanded` という名称は互換のため維持しますが、公開契約上の意味は一貫して **start ゾーンの予約幅を切り替える layout 入力**です。利用者は、この入力をサイドバー本体状態の source of truth として扱ってはなりません（MUST NOT）。

`ui-header` は `sidebarExpanded` の変化時に `ui-header-sidebar-toggle` イベントを発火します。ただし、このイベントは利用者による変更要求イベントではなく、**反映済み状態の局所通知**です。コンポーネント内部にトグル UI は含まず、状態の source of truth は外部にあります。

### 入力契約

| 名前              | 種別                                      | 必須   | 内容                                              | 契約                                                                                                 |
| ----------------- | ----------------------------------------- | ------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `sidebarExpanded` | property / attribute (`sidebar-expanded`) | いいえ | start ゾーンを sidebar 列へ同期させる layout 入力 | `true` の場合は `--sidebar-width` を予約し、`false` の場合は内容幅へ縮退します。既定値は `true` です |

### スロット契約

| スロット名       | 内容                                                   | 契約                                                                                                                                    |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `start`          | ナビゲーション開始点、軽い文脈切替、サイドバートリガー | 左寄せで表示します。主要ナビゲーションの開始点として扱います                                                                            |
| `center`         | 通常幅での文脈表示                                     | 視覚的中央に固定されます。低密度な文脈表示専用であり、狭幅では非表示になり得ます                                                        |
| `compact-center` | 狭幅時専用の簡略文脈表示                               | 狭幅時にのみ `center` の代替として表示されます。`center` と同時表示してはなりません（MUST NOT）。主操作を置いてはなりません（MUST NOT） |
| `end`            | 補助操作群                                             | 右寄せで表示します。検索トリガー、テーマ切替、補助アクションなどを置く領域です                                                          |

### `sidebarExpanded` の意味

`sidebarExpanded` は、名称上は sidebar 状態を連想させますが、公開契約上の意味は次に固定します。

- `sidebarExpanded` はサイドバー本体の source of truth ではありません。
- `sidebarExpanded` は start ゾーンの予約幅を切り替える入力です。
- `sidebarExpanded=true` は「sidebar が開いている」ことを一般化して表しません。
- sidebar 側に overlay、rail、collapsed、hidden など複数モードが存在しても、header はそれらを解釈しません。

利用者は、sidebar 側の複数状態を `sidebarExpanded` へ安易に射影して意味を増やしてはなりません（MUST NOT）。必要であれば、上位レイヤで別の layout 状態へ正規化してから header へ渡さなければなりません（MUST）。

### start / center / compact-center / end の配置規範

各スロットは、単に左右中央へ内容を置くための空き領域ではありません。`ui-header` は 4 スロットの意味秩序を持ちます。ただし、header 自体はスロット内容の意味を機械的に検証しません。したがって、本節は **公開 API の成立条件**ではなく、利用者が従うべき **配置規範**として扱います。

推奨配置は次のとおりです。

- `start`: ナビゲーション開始点、サイドバートリガー、ロゴ、文脈切替
- `center`: 通常幅でのパンくず、現在地、軽い文脈ラベル
- `compact-center`: 狭幅時専用の簡略文脈表示
- `end`: 検索トリガー、テーマ切替、補助アクション

利用者は、次の構成を既定判断として採るべきです（SHOULD）。

- `start` には、ナビゲーション開始点または軽い文脈切替を置くべきです。
- `center` には、通常幅での受動的で低密度な文脈表示を置くべきです。
- `compact-center` には、狭幅時専用の短い代替文脈表示を置くべきです。
- `end` には、補助操作を置くべきです。

利用者は、次の構成を避けるべきです（SHOULD NOT）。

- `start` に primary CTA、常設入力フォーム、大きな検索入力、長文説明を置くこと
- `center` に主操作群、複数ボタン列、編集可能入力、複数行前提の内容を置くこと
- `compact-center` に主操作群、編集可能入力、複数ボタン列、通常幅向けの長い文脈表示を置くこと
- `end` に主要ナビゲーションの主系列、長大な文脈表示、ページ本文の要約を置くこと
- `center` と `compact-center` を同時に可視前提で設計すること
- いずれのスロットにも、固定高さと単一行前提を壊す縦長コンテンツを常設すること
- header 全体を「何でも置ける横一列」として利用すること

固定高さ内に収まらない内容、折り返しや切り詰めが必要な内容を置く場合は、スロット内容側で制御しなければなりません（MUST）。

### center / compact-center スロット内容契約

`center` は、文脈表示を静かに載せるための通常幅スロットです。本文理解を補助する情報を置く場所であり、主操作群を常設する場所としては設計しません。

`compact-center` は、狭幅時に `center` の代替として用いる簡略文脈表示スロットです。これは `center` の責務を拡張するものではなく、**狭幅で文脈表示が完全消失することを避けるための補助手段**です。

利用者は、次の制約を前提に `center` と `compact-center` を使用します。

- `center` の内容は 1 行で収まる密度に保たなければなりません（MUST）。
- `compact-center` の内容は、`center` よりも短く簡略化された文脈表示でなければなりません（MUST）。
- `center` に長大なタイトル列、複数ボタン列、複数行折り返しを前提とした内容を置いてはなりません（MUST NOT）。
- `compact-center` に主操作群、編集可能入力、複数ボタン列を置いてはなりません（MUST NOT）。
- 狭幅で非表示になっては困る重要操作は、`center` に置いてはなりません（MUST NOT）。
- 狭幅専用の代替文脈表示であっても、`compact-center` を主操作の退避先として用いてはなりません（MUST NOT）。
- 内容が長い場合の省略、truncate、短縮表示は、各スロット内容側で解決しなければなりません（MUST）。

`center` は視覚的中央に固定されるため、内部では絶対配置されます。header 自身は、`center` の幅上限、折り返し制御、左右内容との衝突解決を肩代わりしません。必要な場合は、利用側が次のいずれかで調整しなければなりません（MUST）。

- `center` 内容の幅を抑える
- `--ui-header-center-start-inset` を与える
- `--ui-header-center-end-inset` を与える
- 狭幅時に `center` 内容を `compact-center` 向けへ簡略化する

また、`center` および `compact-center` にインタラクティブ要素を置く場合は、**直接 slot assignment される根要素**として与えるべきです（SHOULD）。これは `pointer-events` の戻し先が direct-slotted root であるためです。

### 公開イベント

| 名前                       | 型                                   | 発火条件                                              | 契約                                                                                       |
| -------------------------- | ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `ui-header-sidebar-toggle` | `CustomEvent<{ expanded: boolean }>` | 初回レンダリング後に `sidebarExpanded` が変化したとき | `detail.expanded` に反映後の状態を含む局所通知です。`bubbles=false`、`composed=false` です |

`ui-header-sidebar-toggle` という名称は互換のため維持しますが、公開契約上の意味は **toggle 要求**ではなく **反映済み状態の局所通知**です。利用者はこのイベントを、「開閉ボタンが押された通知」「header 自身がトグル操作を起点に発火するイベント」「状態更新の要求イベント」として扱ってはなりません（MUST NOT）。

本書は、このイベントの rename や alias 追加を現時点では規定しません。ただし、将来的に名称変更があったとしても、**反映済み通知**という意味論を変えてはなりません（MUST NOT）。

同一値への再設定では、状態変化が起こらない限りイベントは発火しません。初期値の適用時にもイベントは発火しません。

### イベント時序契約

`ui-header-sidebar-toggle` は、`sidebarExpanded` の反映後に発火する通知イベントです。次の時序を固定します。

- `sidebarExpanded` の新しい値がコンポーネント状態へ反映された後に発火します。
- `detail.expanded` は、発火時点での反映済み状態を表します。
- 初回描画では発火しません。
- 同一値の再設定では発火しません。
- property 経由の変更と attribute 経由の変更は、いずれも同じ意味の通知として扱います。

また、このイベントの局所性は公開契約です。利用者は、アプリ全体へ自然伝播する境界イベントとして期待してはなりません（MUST NOT）。利用者は host を直接参照できる文脈でのみ観測する前提を採らなければなりません（MUST）。状態管理は外部が保持し、このイベントは **反映結果の観測**として扱うべきです（SHOULD）。

### 公開トークン

`ui-header` は、外部から上書き可能な CSS Custom Properties として次を公開します。

| 名前                             | 既定値 | 用途                                   |
| -------------------------------- | ------ | -------------------------------------- |
| `--ui-header-backdrop-saturate`  | `0.5`  | Glassmorphism 背景の `saturate()` 強度 |
| `--ui-header-center-start-inset` | `0px`  | center ゾーンの開始側インセット        |
| `--ui-header-center-end-inset`   | `0px`  | center ゾーンの終了側インセット        |

### `layout-header` の note shell 契約

- `layout-header` は `ui-header` の上位 adapter です
- `layout-header[note-layout][toc-presence='present']` は TOC 列幅に応じた `--ui-header-center-end-inset` を与えます
- `layout-header[note-layout]` は desktop では `toc-presence` にかかわらず `present` と同じ `--ui-header-center-end-inset` を維持し、note shell の外形契約とそろえます
- start 側 reserve は従来どおり `sidebar-enabled` で決め、TOC presence と混在させません
- Rouault の `layout-header` は breadcrumb を所有しません
- note 文脈の breadcrumb は SSR light DOM `header.article-header` が所有します
- Rouault の `layout-header` は現在 `center` / `compact-center` を使いません
- TOC trigger は `end` slot の補助導線であり、現在位置表示要素ではありません
- TOC trigger の幅契約は viewport ではなく `layout-header` host の container inline-size で決まります
- TOC trigger は 640px 以上で非表示、400px 以上 639px 以下で `目次`、399px 以下で icon-only とします
- Rouault の `layout-header` では、corpus trigger と theme trigger の両方に dropdown affordance として chevron を表示します
- `corpus-switcher` が表示される場合、狭幅でも corpus 側の chevron を維持します

これらは、`ui-header` の 4 slot 公開契約を削減するものではありません。`center` / `compact-center` は `ui-header` の汎用公開面として維持されますが、Rouault アプリケーションの `layout-header` は現行運用としてそれらへ本文文脈表示を供給しません。

### 公開トークンの値域と無効値

公開トークンは次の値域で扱います。

| 名前                             | 想定する値型                                     | 既定動作                         | 無効値の扱い                                                           |
| -------------------------------- | ------------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------- |
| `--ui-header-backdrop-saturate`  | CSS の `<number>`                                | `saturate(0.5)` として評価します | 無効値は当該宣言が無効になり、UA の CSS 評価結果に従います             |
| `--ui-header-center-start-inset` | CSS の `<length-percentage>` を含む inset 相当値 | `0px`                            | 無効値は当該宣言が無効になり、既定値または他宣言へフォールバックします |
| `--ui-header-center-end-inset`   | CSS の `<length-percentage>` を含む inset 相当値 | `0px`                            | 無効値は当該宣言が無効になり、既定値または他宣言へフォールバックします |

利用者は、`--ui-header-center-start-inset` および `--ui-header-center-end-inset` に `calc(...)` を与えてかまいません。負値も CSS としては与えられますが、header 契約としては与えるべきではありません（SHOULD NOT）。

また、無効値を与えた場合に header が独自に補正して安全値へ丸める契約は持ちません。値の妥当性は利用側が担保しなければなりません（MUST）。

### 依存トークン

`ui-header` は、公開トークンとは別に、app-shell または foundation 側のトークンへ依存します。これらは **header 固有の長期安定 API** ではなく、外部方針に従属する dependency token です。

| 用途           | 依存トークン                          |
| -------------- | ------------------------------------- |
| ヘッダー高さ   | `--header-height`                     |
| z-index        | `--z-fixed`                           |
| 背景           | `--glass-panel` / `--bg-default`      |
| 境界線         | `--border-width` / `--border-default` |
| 文字色         | `--fg-default`                        |
| フォントサイズ | `--text-base`                         |
| blur 強度      | `--blur-md`                           |
| 最大幅         | `--bp-xl`                             |
| 左右余白       | `--space-4`                           |
| zone ギャップ  | `--space-2`                           |
| サイドバー幅   | `--sidebar-width`                     |

利用者は、これらの dependency token を header 固有の public token と誤読してはなりません（MUST NOT）。header 側が長期安定を保証するのは `--ui-header-*` 系の public token であり、上表は app-shell または foundation 側の契約に従属する依存面です。

狭幅条件の閾値も同様に app-shell 側の responsive policy に従属します。現行実装では **639px 以下を狭幅、640px 以上を通常幅開始**として扱いますが、これは header 私有の長期安定値ではありません。利用者は境界値そのものではなく、**狭幅では `center` が失われ得る**という挙動契約へ依存しなければなりません（MUST）。

### 属性反映契約

| property          | attribute          | reflect | 備考                             |
| ----------------- | ------------------ | ------- | -------------------------------- |
| `sidebarExpanded` | `sidebar-expanded` | あり    | boolean attribute として扱います |

### 公開しないもの

`ui-header` は、公開メソッドを持ちません。また、`part` 属性を公開しません。したがって、Shadow DOM 内部要素への `::part(...)` によるスタイル拡張には対応しません。

内部 class 名、Shadow DOM 内部構造の細部、zone ごとの class 名、`header` 直下の配置順序などは公開契約に含みません。利用者はこれらに依存してはなりません（MUST NOT）。

### 責務範囲

責務範囲には、sticky header の描画、**4 スロット（`start` / `center` / `compact-center` / `end`）への配置**、`sidebarExpanded` の属性反映、背景表現、通常幅と狭幅に応じた文脈表示面の切替、および状態変化通知を含みます。

ここでいう文脈表示面の切替とは、通常幅では `center` を、狭幅では必要に応じて `compact-center` を用いることを指します。`ui-header` は、この切替を app-shell 側 responsive policy に従って扱う **layout host** です。

一方で、次の事項は責務に含めません。

- サイドバー開閉ロジックそのもの
- サイドバー状態機械そのもの
- `center` と `start` / `end` の衝突自動解消
- 各スロット内容のアクセシブル名生成
- トグルボタンや検索ボタンなど個別操作の意味付け
- グローバルナビゲーション設計そのもの
- overlay や layer policy の全体管理
- 検索、テーマ、ユーザーメニューなど具体機能の内蔵
- `compact-center` に何を表示するかという情報設計そのもの

したがって、`ui-header` は **app-shell 上端の container / layout host** であり、アプリ機能の集積点ではありません。利用者は、slot content の意味論やアクセシビリティ、サイドバーの source of truth、overlay 序列の全体管理を header へ持ち込んではなりません（MUST NOT）。

---

## 状態モデル

`ui-header` の状態は、1 つの連続した状態機械としてではなく、**入力状態**、**派生表示状態**、**内容充足状態**、**通知状態**の 4 軸で読み分けます。

### 1. 入力状態

入力状態は `sidebarExpanded` の値によって決まります。

#### 1.1 予約状態

- `sidebarExpanded=true` の場合、start ゾーンの `inline-size` は `var(--sidebar-width, 240px)` になります。
- `sidebarExpanded=false` の場合、start ゾーンは固定幅を持たず、内容幅に縮退します。

ここで変化するのはサイドバー本体状態ではなく、**start ゾーンのレイアウト予約**です。

### 2. 派生表示状態

派生表示状態は、主として viewport 条件から導かれます。

#### 2.1 通常幅状態

- 狭幅条件を満たさない場合、`center` ゾーンは表示されます。
- 狭幅条件を満たさない場合、`compact-center` ゾーンは表示されません。

#### 2.2 狭幅状態

- 狭幅条件を満たす場合、`center` ゾーンは非表示になります。
- 狭幅条件を満たす場合、`compact-center` に内容が存在するときは、その代替文脈表示を用いることができます。
- 狭幅条件を満たす場合でも、`compact-center` が空であれば文脈表示は存在しません。

`center` と `compact-center` は、同時表示してはなりません（MUST NOT）。したがって、通常幅では `center`、狭幅では `compact-center` を代替的に用いる構成を既定とします。

また、`center` スロットまたは `compact-center` スロットに要素が存在していても、可視状態は viewport 条件に従います。したがって、**スロット充足と zone 可視性は独立**しています。

### 3. 内容充足状態

内容充足状態は、各スロットに内容が存在するかどうかで決まります。

- `start`、`center`、`compact-center`、`end` の 4 スロットはいずれも空を許容します。
- `center` が空であっても、`start` と `end` のみでヘッダーは成立します。
- `compact-center` は、狭幅時の代替文脈表示用スロットであり、通常幅で必須ではありません。
- `center` と `compact-center` がともに空であっても、`start` と `end` のみでヘッダーは成立します。
- すべて空であっても、ヘッダー構造自体は描画されます。

ただし、ここでいう「成立」は **構造上 valid** であることを意味するだけであり、推奨構成であることを意味しません。設計上の既定判断としては、通常幅で表示される `center`、または狭幅時の代替となる `compact-center` のいずれかを含めて、少なくとも 1 つの意味ある文脈表示面を持つ構成を採るべきです（SHOULD）。

`ui-header` は空構成を自動拒否しません。また、空構成を自動補完しません。したがって、文脈表示面を持たない構成を常用するページでは、header 自体が不要でないかを利用側が再検討するべきです（SHOULD）。

なお、`center` と `compact-center` の **内容充足** と **実際の可視性** は一致しません。可視性は viewport 条件に従うため、内容が存在していても通常幅では `compact-center` が表示されず、狭幅では `center` が表示されないことがあります。

### 4. 属性同期状態

`sidebarExpanded` は property と attribute の両面から操作できます。いずれかの面で変更された場合、他方へ反映されます。初回レンダリング時の既定値適用ではイベントを発火しません。

### 5. 通知状態

`ui-header-sidebar-toggle` は、`sidebarExpanded` が実際に変化したときにのみ発火します。

- 有効な状態変化 1 回につき 1 回発火します。
- 同一値の再設定では発火しません。
- 初回描画では発火しません。

したがって、本コンポーネントの状態は、イベント駆動の内部状態機械としてではなく、**外部入力に対するレイアウト反映と観測通知**として理解するべきです。

---

## DOM / Accessibility

ルートは `:host` です。ホストは `display: contents` を採用し、自身のボックスを持ちません。Shadow DOM 内部には単一のネイティブ `<header>` を持ち、その内部に `.inner` と 4 つの公開スロット領域を配置します。

```text
<ui-header sidebar-expanded?>
  #shadow-root
    <header>
      <div class="inner">
        <div class="zone-start">
          <slot name="start"></slot>
        </div>
        <div class="zone-center">
          <slot name="center"></slot>
        </div>
        <div class="zone-compact-center">
          <slot name="compact-center"></slot>
        </div>
        <div class="zone-end">
          <slot name="end"></slot>
        </div>
      </div>
    </header>
</ui-header>
```

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 内部ルートはネイティブ `<header>` です。
- `ui-header` は app-shell 上端の **top-level header** を構成する前提で用います。
- `ui-header` 自体はフォーカス対象ではありません。
- `ui-header` 自体はキーボード操作を持ちません。
- スクリーンリーダー上の意味付けの大半は、スロットへ渡す子要素側の責務です。
- `start`、`center`、`compact-center`、`end` に置くインタラクティブ要素は、それぞれ自前でアクセシブル名と役割を満たさなければなりません（MUST）。

`ui-header` は、アプリ全体で 1 個の top-level header を構成する用途を前提にします。複数の top-level header を一般化する用途には用いるべきではありません（SHOULD NOT）。局所的な見出しやカード見出しが必要な場合は、別コンポーネントを用いるべきです（SHOULD）。

`center` および `compact-center` の zone は内部コンテナに `pointer-events: none` を持ち、対応する `slot::slotted(*)` に対して `pointer-events: auto` を戻す前提で扱います。したがって、これらにインタラクティブ要素を置く場合は、**直接割り当てられる根要素**として与えるべきです（SHOULD）。

一方で、`start` と `end` には wrapper を介した構成を許容します。これらの zone では、header 自体が wrapper 内部のボタン群やドロップダウン群に追加の役割補正を行う契約は持ちません。

`ui-header` は、landmark の存在、固定高さの単一行レイアウト、視覚的中央固定、および狭幅時の代替文脈表示面という container 契約を担保しますが、slot content の意味論やアクセシビリティを肩代わりしません。利用者は、landmark の一意性や child content のアクセシビリティ責務を header 側へ転嫁してはなりません（MUST NOT）。

### DOM 契約

- `:host` は `display: contents` です。
- 内部の `header` が sticky 表示と背景表現の主体です。
- `part` は公開しません。
- Shadow DOM 内部 class は公開面ではありません。

したがって、利用者は `ui-header` を通常の箱モデル要素として扱って margin、background、border をホスト側へ付与する前提には依存しません。箱としての見た目は内部 `header` に存在します。

---

## Visual Contract

`ui-header` の視覚契約は、上部ナビゲーションを**画面上部へ静かに固定しつつ、本文より強く主張しないこと**にあります。

### レイアウト

- 内部 `header` は `position: sticky`、`top: 0` です。
- `grid-column: 1 / -1` により、アプリシェル Grid 全幅へ参加します。
- `block-size` は `var(--header-height, 48px)` です。
- `.inner` は `max-inline-size: var(--bp-xl, 1280px)` を持ち、中央寄せされます。
- `.inner` の左右パディングは `var(--space-4, 1rem)` です。
- `start` は左寄せ、`center` は視覚的中央、`end` は右寄せです。
- header は単一行レイアウトであり、内容に応じて自動で高さを増やしません。
- sticky の基準は CSS の通常規則に従い、もっとも近いスクロールコンテナまたはビューポートに対して成立します。header 自身はスクロールコンテナを所有しません。

### start / center / end の秩序

- `start` はナビゲーション開始点として左側に置きます。
- `center` はヘッダー全体に対する視覚的中央に固定します。
- `end` は補助操作群として右端に寄せます。

ここで重要なのは、`center` が **start / end の残余空間に対して中央寄せされるのではなく、ヘッダー全体に対して中央寄せされる**ことです。したがって、左右内容が大きい場合の衝突回避は自動ではありません。

### 背景表現

非対応環境では `var(--glass-panel, var(--bg-default))` を背景として使用します。`backdrop-filter` 対応環境では、`var(--bg-default)` に 0.85 の透過を与えた背景と blur / saturate を組み合わせ、Glassmorphism として描画します。

### ダークモード時のエッジ

ダークモードでは境界線色を `--ui-header-edge-highlight` へ寄せ、`backdrop-filter` 対応環境では inset shadow を強めます。これは暗背景でヘッダー境界が沈み込みすぎないようにするためです。

#### モバイル時の簡素化

狭幅環境では、`ui-header` の一般契約として `center` が非表示になり得ます。ただし、これは `ui-header` 自体の汎用レイアウト契約であり、Rouault の `layout-header` が狭幅時に `compact-center` へ breadcrumb を退避することを意味しません。

Rouault の現行 `layout-header` は、mobile note で compact breadcrumb を表示しません。代わりに、start / end の操作性と TOC trigger の縮退を優先します。したがって、狭幅で note 文脈を保持する責務は本文先頭の SSR light DOM `header.article-header` が担い、header 側は page chrome と補助操作に専念します。

また、Rouault の TOC trigger は現在見出しや進捗を header 上へ持ち込みません。mobile TOC panel header は視覚上 close-only とし、current heading は `ui-toc` の active item 強調で把握します。`目次` という意味付けは `ui-toc` の navigation label が保持し、header 側は安定した開閉導線に限定します。

### 視覚仕様上の注意

`ui-header` は強い塗り分けや大きな影で注意を奪う設計にはしません。読書面に対しては、**存在は認識できるが視線を奪いすぎない**ことを優先します。したがって、過度な装飾、常時強い発光、派手なモーションには依存しません。

### 依存トークンと responsive policy

本コンポーネントは、header 固有の公開トークンとは別に、app-shell または foundation 側のトークンへ依存します。これらは header 自身が長期安定を約束する API ではなく、外部方針に従属する依存面です。

| 用途           | 依存トークン                          |
| -------------- | ------------------------------------- |
| ヘッダー高さ   | `--header-height`                     |
| z-index        | `--z-fixed`                           |
| 背景           | `--glass-panel` / `--bg-default`      |
| 境界線         | `--border-width` / `--border-default` |
| 文字色         | `--fg-default`                        |
| フォントサイズ | `--text-base`                         |
| blur 強度      | `--blur-md`                           |
| 最大幅         | `--bp-xl`                             |
| 左右余白       | `--space-4`                           |
| zone ギャップ  | `--space-2`                           |
| サイドバー幅   | `--sidebar-width`                     |

`center` の狭幅時非表示は responsive policy に従属します。現行実装では **639px 以下で非表示、640px 以上で通常表示** ですが、将来的な breakpoint 再編は app-shell 側 policy によって行うべきであり、header 単独で私有 breakpoint を増やすべきではありません。

また、利用者は dependency token の値体系を header 固有の public contract と誤読してはなりません（MUST NOT）。foundation 再編時は、まず外部依存の変更として扱うべきであり、header 自身の public token 変更と混同してはなりません。

---

## 環境別の振る舞い

### Backdrop Filter 非対応環境

`backdrop-filter` 非対応環境では blur / saturate を使わず、通常背景と境界線のみで描画します。Glassmorphism は Progressive Enhancement です。

### Dark Mode

`prefers-color-scheme: dark` 環境では、境界線と inset shadow を強め、背景境界を読み取りやすくします。色差の主調整はトークン差し替えに委ねます。

### Forced Colors

`forced-colors: active` 環境では、背景を `Canvas`、境界線を `CanvasText` に切り替え、`backdrop-filter` と box-shadow を無効化します。見た目の特殊効果より、システム色との整合を優先します。

header が forced-colors 環境で担保する責務は、**container としての背景、境界、レイアウト成立**までです。slot content の見え方や child component 内部の forced-colors 最適化までは肩代わりしません。

現行実装では、補助的な境界補正は direct-slotted の `button` および `[role='button']` に対してのみ与えます。wrapper 配下の子孫要素や、他の child component 内部までは header が救済しません。

したがって、次を契約とします。

- `start` と `end` に wrapper を介した構成を与えること自体は有効です。
- ただし、wrapper 配下の child content に対する forced-colors 最適化は、header の公開責務には含めません。
- child content の forced-colors 対応は、各子コンポーネント契約または利用側スタイルで担保しなければなりません（MUST）。
- 利用者は、wrapper を用いたことを理由に header 側の包括的救済を期待してはなりません（MUST NOT）。

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、`header`、`.zone-start`、`.zone-end` の transition duration を極小化します。

ただし、本コンポーネントは reduced motion 環境で「動きを抑える」こと以前に、**本質的に強いモーションへ依存しない**ことを前提に設計します。したがって、header をアニメーション表現の主体として扱うべきではありません（SHOULD NOT）。

将来的にモーションを追加する場合でも、可読性や操作性を損なう演出を持ち込まず、reduced-motion 環境で意味成立が崩れないことを優先しなければなりません（MUST）。

### Print

印刷時は内部 `header` を非表示にします。`ui-header` は画面操作導線であり、印刷対象に含めません。

---

## 関連契約

### アプリシェル契約

`ui-header` は、外側のアプリシェルレイアウトへ透過的に参加するコンポーネントです。`display: contents` と `grid-column: 1 / -1` を前提としているため、**単体カードや独立パネルの汎用ヘッダー**としては設計していません。

外側に Grid がない環境でも描画自体は可能ですが、全幅参加や列整列の意味は薄れます。したがって、利用者は `ui-header` をアプリシェル文脈で使うべきです（SHOULD）。

### サイドバー契約

`sidebarExpanded` は、サイドバー状態の**反映先**ではあっても**起点**ではありません。サイドバー本体、トグルボタン、永続化、URL 同期などは別契約です。

`ui-header-sidebar-toggle` も同様に、サイドバー操作要求イベントではなく、反映済み状態の通知です。状態管理は外部が持たなければなりません（MUST）。

### center / compact-center 配置契約

`center` は視覚的中央へ固定する通常幅契約です。その代わり、左右内容との衝突解決は持ち込みません。左右幅が大きいレイアウトでは、利用側が次のいずれかで調整しなければなりません（MUST）。

- `center` 内容の幅を抑える
- `--ui-header-center-start-inset` を与える
- `--ui-header-center-end-inset` を与える
- `center` 内容を狭幅時に `compact-center` 向けへ簡略化する

`compact-center` は、狭幅時に `center` の責務を縮約して引き受ける代替文脈表示面です。これは `center` の拡張モードではなく、**パンくず列を残さずに現在地だけを短く示すための限定的な補助手段**です。

したがって、`compact-center` は次を満たさなければなりません。

- `center` と同時表示してはなりません（MUST NOT）。
- 主操作の退避先として用いてはなりません（MUST NOT）。
- 通常幅で恒常表示することを前提にしてはなりません（MUST NOT）。

### スタイル拡張契約

スタイル拡張は CSS Custom Properties に限定します。`part` は公開しません。内部 class 名に依存するスタイル上書きは公開契約外です。

### 重なり順序 / オーバーレイ契約

`ui-header` は `--z-fixed` によって通常本文より前面に表示される固定ヘッダーです。ただし、本コンポーネントはアプリケーション全体の最前面レイヤを占有するためのものではありません。

したがって、次を契約とします。

- `ui-header` は通常の本文、背景、サイドバー本文より前面に表示されてよいです。
- modal、dialog、global overlay、popover layer など、明確に一時前景として設計されたレイヤより前面に出ることを前提にしません。
- `ui-header` 自身は overlay の stacking policy を管理しません。
- `--z-fixed` の上書きは可能ですが、アプリ全体のレイヤ秩序を壊さない範囲で行わなければなりません（MUST）。

overlay 序列は、header 単独ではなく app 全体の layer policy に従属します。利用者は、header を常に最上位へ固定するために局所的な `z-index` 競争へ参加させる方針を採るべきではありません（SHOULD NOT）。header は固定ナビゲーション層であり、全局オーバーレイ層ではありません。

### スロット内容契約

`ui-header` は slot host であり、slot content の意味論や操作は内蔵しません。したがって、パンくず、検索トリガー、テーマボタン、ドロップダウンなどは、それぞれのコンポーネント契約に従います。

---

## 境界条件

### 1. `center` スロットが空

`center` が空でもヘッダーは成立します。通常幅で中央文脈表示を持たない構成は許容されますが、文脈把握を必要とする画面では推奨しません。必要であれば、狭幅時専用の代替文脈表示として `compact-center` を用いることができます。

### 2. 4 スロットがすべて空

`start`、`center`、`compact-center`、`end` がすべて空でも、内部 `header` と各 zone は描画されます。これは構造上は有効ですが、実際の利用価値は限定的です。常用するべき構成ではありません。

### 3. `sidebarExpanded` の属性除去

`sidebar-expanded` 属性を除去すると `sidebarExpanded=false` へ反映され、状態通知イベントが発火します。逆に property を `true` へ戻すと属性が復活します。

### 4. 同一値の再設定

`sidebarExpanded` を同じ値へ再設定しても、イベントは重複発火しません。

### 5. 高速連続変更

`false -> true -> false` のような高速連続変更では、**有効な状態変化ごとに 1 回**イベントが発火します。

### 6. スロット内容の動的差し替え

スロット内容は動的に差し替え可能です。差し替え後も zone 構造は維持されます。`compact-center` を実装した後は、この性質は `start`、`center`、`compact-center`、`end` の全スロットに対して成立しなければなりません（MUST）。

### 7. 狭幅ビューポート

狭幅では通常幅向けの `center` は非表示になり得ます。`center` に重要操作やパンくず列を置く構成には依存してはなりません（MUST NOT）。`compact-center` が存在する場合は、狭幅時の短い現在地ラベルとしてのみ用います。`center` と `compact-center` は同時表示してはなりません（MUST NOT）。

### 8. スロット内容が固定高さを超える場合

header は固定高さであり、自動伸長しません。`start`、`center`、`compact-center`、`end` のいずれであっても、内容が 1 行を超える場合や、縦方向に大きい要素を入れた場合の見え方は未定義です。利用者は、固定高さ内に収まる内容を渡さなければなりません（MUST）。

### 9. 左右内容が大きい場合

`center` は視覚的中央へ固定されるため、左右内容が大きい場合は重なり得ます。現行契約では自動解消しません。必要な場合は、`center` 内容の短縮、inset 調整、または狭幅時の `compact-center` への簡略化で対処しなければなりません（MUST）。

### 10. `compact-center` が空の狭幅状態

狭幅で `center` が非表示となり、かつ `compact-center` が空である場合、文脈表示面は存在しません。この状態は構造上許容されますが、狭幅時にも文脈保持が必要な画面では推奨しません。

### 11. 印刷時

どの状態であっても、印刷時は非表示です。

---

## Storybook 上の公開契約試験

本節では、Storybook 上の Story のうち、**公開契約として将来変更時にも維持しなければならないもの**だけを列挙します。ここに含める Story は、見本や雰囲気確認ではなく、property、attribute、slot、event、状態遷移などの契約面を確認するものに限定します。

本節に列挙する Story は、単なる参考表示ではなく **契約試験**として扱います。CI または同等の自動検証系に載せる前提で維持しなければなりません（MUST）。

### 公開契約試験

| Story              | 固定する契約                                                                   |
| ------------------ | ------------------------------------------------------------------------------ |
| `DefaultExpanded`  | 4 zone、4 slot、sticky header、`sidebarExpanded=true` の基本構造が成立すること |
| `ZenModeCollapsed` | `sidebarExpanded=false` で start ゾーン幅が縮退すること                        |
| `EmptySlots`       | `center` と `compact-center` が空でもレイアウト構造が維持されること            |

これらの Story は、現行実装が追従している公開面に対する契約試験です。削除または意味変更を行う場合は、対応する公開契約または実装の変更を先に明示しなければなりません（MUST）。

## 視覚回帰確認

本節では、**公開 API そのものではなく、見え方や環境別描画の回帰を確認する Story** を列挙します。これらは重要ですが、契約試験と同じ強度の公開面としては扱いません。

本節に列挙する Story は、視覚破綻、環境差分、token 差し替え影響の検知を目的とする **回帰確認用 Story** です。公開契約試験の代替にはなりません。レビュー強度は高く保つべきですが、本文契約を直接成立させる根拠としては扱ってはなりません（MUST NOT）。

| Story                        | 確認目的                                                          |
| ---------------------------- | ----------------------------------------------------------------- |
| `ResponsiveVisualComparison` | 異なる幅での start / center / end の見え方を比較すること          |
| `ForcedColorsMode`           | 強制カラー環境で header 構造と境界線が視認可能であること          |
| `ReducedMotion`              | reduced motion 環境で過度なモーションに依存せず描画が成立すること |
| `PrintStyles`                | 印刷時に非表示となること                                          |
| `DarkModeGlassmorphism`      | ダークモードで背景表現と境界の見え方が破綻しないこと              |
| `CustomBackdropSaturate`     | `--ui-header-backdrop-saturate` 上書き時の見え方を比較できること  |

これらの Story は、視覚回帰や環境対応確認のために維持します。ただし、個々の見え方は foundation token や app-shell policy の変更に伴って更新され得ます。

## 参考使用例

本節では、利用者に構成イメージを伝える Story を扱います。参考使用例は、公開契約試験や視覚回帰確認とは異なり、**使用例としての説明価値**を主目的とします。

本節に属する Story は、推奨構成を伝えるための **reference-only** の扱いとします。これらは CI 上の契約ゲートとしては扱いません。また、参考使用例を根拠に本文契約を推定してはなりません（MUST NOT）。

現行の Story 群では、`DefaultExpanded` と `ZenModeCollapsed` が使用例としても読めますが、本書ではこれらをまず公開契約試験として扱います。Storybook の例示は `compact-center` を使わず、`start` / `center` / `end` に限定します。したがって、現時点で reference-only の Story は必須としていません。

---

## 現行実装を踏まえて契約や機能で未だ対応していないもの

本節は、**本文で採用済みの公開契約のうち、現行実装にまだ反映されていないものだけ**を整理するものです。  
適用文脈、運用前提、非目標、component が自動保証しない利用規範はここに含めません。それらは各本文節の契約として扱います。

現時点では、`compact-center` を含む公開契約、状態モデル、Visual Contract は `header.ts` に反映済みです。一方、`header.stories.ts` の例示は `compact-center` を使わない方針に揃えています。したがって、本節に列挙すべき未対応項目はありません。

## 補足

`ui-header` の核は、多機能な操作バーを作ることではありません。**app-shell 上で `start` / `center` / `compact-center` / `end` の意味秩序を固定し、状態は外部管理のまま、読書体験を乱さずに支えること**にあります。

ここで `center` と `compact-center` は、2 種類の中央スロットではありません。`center` は通常幅での視覚的中央に置く文脈表示面であり、`compact-center` は狭幅時にだけ用いる **代替文脈表示面**です。両者は同時表示せず、同じ責務を異なる表示条件で引き受ける補完関係として扱います。

また、`sidebarExpanded` は sidebar 本体状態を表すのではなく、あくまで start ゾーンの予約幅を切り替える layout 入力です。`ui-header-sidebar-toggle` も操作要求ではなく、反映済み状態の局所通知として解釈します。

したがって、今後の修正でも次の点は維持します。

1. `ui-header` を app-shell 文脈で使うこと
2. 通常幅では `center` を視覚的中央へ固定すること
3. 狭幅では必要に応じて `compact-center` を代替文脈表示面として扱うこと
4. `center` と `compact-center` を同時表示しないこと
5. sidebar 状態機械を header へ持ち込まないこと
6. header を layout host として保つこと
7. child content の意味論とアクセシビリティを肩代わりしないこと
