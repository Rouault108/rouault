# Dropdown

## 概要

本書は、`ui-dropdown`、`ui-menu-item`、`ui-menu-separator` から構成される **command menu family** の公開契約、状態モデル、アクセシビリティ、視覚契約を定義するものです。

`ui-dropdown` は、値入力 UI でも、任意コンテンツを収める popover でも、ナビゲーションリンク群でもありません。`ui-dropdown` は、**操作コマンドを一時的に提示し、選択させるための menu button 系コンポーネント** です。

Rouault における dropdown は、本文読書の流れを恒常的に分断しないことを前提に、必要な局面でのみ操作密度を局所的に上げるための UI として位置付けます。したがって、本コンポーネントの契約は、単に開閉できることではなく、**意味、構成、フォーカス、選択、閉鎖条件を一貫した規則として固定すること**を目的とします。

また、`ui-menu-item` と `ui-menu-separator` は `ui-dropdown` から独立した汎用コンテナではありません。これらは dropdown family の構成要素として扱い、単体再解釈には依存しません。

---

## 適用範囲

本書は、`ui-dropdown` 群の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 現行実装で未対応または未整合の事項

一方で、本書は次の事項を対象としません。

- コマンド選択後に何を実行するかというアプリケーションロジック
- ルーティング、ダイアログ起動、削除確認など上位レイヤの副作用
- ナビゲーションメニュー、リンクリスト、サイトメニュー全体の設計
- コンテキストメニュー以外の任意 popover / arbitrary overlay
- 選択状態を保持する menubar / command palette / listbox への拡張設計全体
- アイコンセット自体の供給

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 設計原則

本コンポーネントは、次の原則に従います。

- command menu と navigation menu を混在させません。
- 1 種の item に複数の意味を混在させません。
- 意味値、表示ラベル、補助表示を分離します。
- 開閉、フォーカス、閉鎖条件を安定した規則として扱います。
- 本文や見出しより dropdown 自体が主役にならないよう、浮上は一時的かつ静かな表現にとどめます。

---

## 公開契約

`ui-dropdown` は、トリガー 1 個とメニュー本体 1 個を持つ command menu コンポーネントです。メニュー本体には、正規入力として `ui-menu-item` と `ui-menu-separator` を配置します。

`ui-dropdown` の公開入力は `opened`、`side`、`align`、`disabled` です。公開イベントは `menu-item-select`、`open`、`close` です。公開メソッドは `open()`、`close()`、`toggle()` です。

`ui-menu-item` の公開入力は `value`、`variant`、`disabled`、`text-value` です。`ui-menu-separator` は公開入力を持ちません。

### 入力契約

#### `ui-dropdown`

| 名前 | 種別 | 必須 | 内容 | 契約 |
| --- | --- | --- | --- | --- |
| `opened` | property / attribute | いいえ | 開閉状態 | `true` で開、`false` で閉。既定値は `false` です |
| `side` | property / attribute | いいえ | 出現する辺 | `top` / `right` / `bottom` / `left`。既定値は `bottom` です |
| `align` | property / attribute | いいえ | 交差軸方向の整列 | `start` / `center` / `end`。既定値は `start` です |
| `disabled` | property / attribute | いいえ | 開閉操作の無効化 | `true` の場合、dropdown は開閉操作を受け付けません |

#### `ui-menu-item`

| 名前 | 種別 | 必須 | 内容 | 契約 |
| --- | --- | --- | --- | --- |
| `value` | property / attribute | **はい** | 選択値 | `menu-item-select` の `detail.value` に入る安定した意味値です |
| `variant` | property / attribute | いいえ | 項目の意味強度 | `default` / `danger`。既定値は `default` です |
| `disabled` | property / attribute | いいえ | 項目の無効化 | `true` の場合、選択できず、キーボード移動でもスキップされます |
| `text-value` | property / attribute | いいえ | type-ahead およびテキスト名の正規化値 | 未指定時は `textContent.trim()` を使います |

### スロット契約

#### `ui-dropdown`

| 名前 | 種別 | 位置付け | 内容 |
| --- | --- | --- | --- |
| `trigger` | named slot | 正規入力 | 開閉起点となる単一トリガー要素 |
| 既定スロット | slot | 正規入力 | `ui-menu-item` および `ui-menu-separator` を並べます |

`trigger` スロットには **単一トリガー**を置きます。複数要素を割り当てる構成は公開契約に含めません。

既定スロットの正規入力は `ui-menu-item` と `ui-menu-separator` です。任意要素を配置した場合でも描画自体は行われ得ますが、ロービングフォーカス、type-ahead、選択イベント、ARIA の整合などのキーボード・選択契約には含めません。

#### `ui-menu-item`

| 名前 | 種別 | 位置付け | 内容 |
| --- | --- | --- | --- |
| 既定スロット | slot | 正規入力 | 項目ラベル、またはアイコンとラベルの組み合わせ |

`ui-menu-item` のラベルは既定スロット内容、または `text-value` から決定します。`menu-item-select` の `detail.label` は表示ラベルとして扱い、意味値の一次情報源にはしません。

### 構成制約契約

`ui-dropdown` の正規構成は、**trigger 1 個**と、既定スロット内の **`ui-menu-item` / `ui-menu-separator` 列**です。描画可能であることと、正規入力として契約されることは同一ではありません。

次の構成は、描画自体が成立し得ても、正規入力としては扱いません。

- `trigger` slot に複数要素を入れる構成
- 既定スロットに任意要素を混在させる構成
- `ui-menu-separator` のみで構成されるメニュー
- 空メニューを通常運用の基本形として使う構成
- `href` やページ遷移を前提とする navigation item を `ui-menu-item` として表現する構成

したがって、利用側は「表示できた」ことをもって構成が契約内であると判断してはなりません（MUST NOT）。キーボード移動、type-ahead、選択イベント、ARIA の整合を前提にする場合は、正規構成に従わなければなりません（MUST）。

### 項目種別契約

現行 family における `ui-menu-item` は **command item** です。これは操作の発火対象であり、リンク、選択状態付き項目、submenu trigger を兼務しません。

したがって、次の意味は `ui-menu-item` に持ち込みません。

- リンク遷移
- 単一選択 / 複数選択の保持
- submenu 展開起点
- 現在位置表示

将来これらが必要な場合は、`ui-menu-link`、`ui-menu-checkbox`、`ui-menu-radio`、`ui-submenu-trigger` のように **型を分けて追加**します。1 種の item に複数意味を混在させません。

### 公開イベント

#### `ui-dropdown`

| 名前 | 発火条件 | `detail` |
| --- | --- | --- |
| `menu-item-select` | `ui-menu-item` が選択されたとき | `{ value: string, label: string }` |
| `open` | `open()` により開いたとき | なし |
| `close` | `close()` により閉じたとき | なし |

`menu-item-select` はクリック選択、または Enter / Space による選択で発火します。

`open` と `close` は、`open()` / `close()` を経由した場合に発火します。`opened` property を外部から直接書き換えた場合、表示状態は変化し得ますが、`open` / `close` イベント発火までは公開保証しません。イベント観測に依存する場合は、`opened` の直接代入ではなく公開メソッドを用いなければなりません（MUST）。

### イベント伝播契約

公開イベント `open`、`close`、`menu-item-select` は、コンポーネント外部で観測できるイベントとして扱います。これらは dropdown family 内部の局所イベントではなく、利用側が依存してよい公開イベントです。

一方、`ui-menu-item` の `menu-item-click` は内部イベントです。これは family 内連携のために使うものであり、外部 API には含めません。利用側は `menu-item-click` ではなく `menu-item-select` を購読しなければなりません（MUST）。

また、公開イベントは結果通知であり、キャンセルによって内部状態遷移を差し止める契約は持ちません。選択前介入や閉鎖前介入は公開契約に含めません。

### 閉鎖理由契約

`close` イベントは、閉じたという事実だけを通知します。**なぜ閉じたか**という reason は `detail` として公開しません。

したがって、項目選択、Escape、Tab / Shift+Tab、外側クリック、scroll、または `toggle()` による反転は、すべて `close` という同一イベント面に収束します。利用側は `close` だけから閉鎖理由を識別できる前提に依存してはなりません（MUST NOT）。

閉鎖理由に応じた分岐が必要な場合は、`menu-item-select`、キーボード処理、外側クリック検知などを上位レイヤで別途扱います。

### 公開メソッド

| 名前 | 種別 | 契約 |
| --- | --- | --- |
| `open()` | method | 無効状態でなく、かつ未展開時のみ開きます |
| `close(restoreFocus = true)` | method | 展開時のみ閉じます。既定ではトリガーへフォーカスを戻します |
| `toggle()` | method | 開閉を反転します |

`close()` の `restoreFocus` 引数は公開面として扱います。`false` を指定した場合、閉鎖後のフォーカス復帰には依存しません。

### 制御モデル契約

`ui-dropdown` の制御モデルは、**状態変更の正規 API としての `open()` / `close()` / `toggle()`** と、**現在状態の反映面としての `opened`** の二層から成ります。

- `open()` / `close()` / `toggle()` は状態変更の正規 API です。
- `opened` は現在状態を表す公開 property / attribute です。
- `opened` の直接代入は表示制御には使えますが、イベント整合、閉鎖理由、フォーカス復帰までを一括保証する API ではありません。

したがって、本コンポーネントは完全 controlled component としては扱いません。外部制御を行う場合でも、**状態遷移を公開契約どおりに発生させたいときはメソッドを用います**。`opened` は状態の投影面であり、単独では完全な状態遷移 API ではありません。

### 属性反映契約

`opened`、`side`、`align`、`disabled`、`value`、`variant`、`text-value` は reflect されます。boolean 値は attribute の有無で反映します。

| 要素 | property | attribute | reflect | 備考 |
| --- | --- | --- | --- | --- |
| `ui-dropdown` | `opened` | `opened` | あり | boolean attribute |
| `ui-dropdown` | `side` | `side` | あり | `top` / `right` / `bottom` / `left` |
| `ui-dropdown` | `align` | `align` | あり | `start` / `center` / `end` |
| `ui-dropdown` | `disabled` | `disabled` | あり | boolean attribute |
| `ui-menu-item` | `value` | `value` | あり | 文字列、必須 |
| `ui-menu-item` | `variant` | `variant` | あり | `default` / `danger` |
| `ui-menu-item` | `disabled` | `disabled` | あり | boolean attribute |
| `ui-menu-item` | `textValue` | `text-value` | あり | type-ahead とラベル正規化に使います |

### 入力正規化と非対応値契約

`side` の正規入力は `top` / `right` / `bottom` / `left` です。`align` の正規入力は `start` / `center` / `end` です。`variant` の正規入力は `default` / `danger` です。

`ui-dropdown` の配置入力は `side` と `align` で表します。`placement` のような単一文字列へ side と align を詰め込む API は、公開契約の一次表現としては採りません。

したがって、利用側は `top-start`、`bottom-end` のような複合 placement 文字列を前提とした設計に依存してはなりません（MUST NOT）。配置の正式入力は `side` と `align` です。

また、本契約書に列挙していない値、または `ui-menu-item` / `ui-menu-separator` 以外を前提とした item 種別は、将来の拡張余地であって現行の公開契約ではありません。描画や型受理が成立しても、公開保証へは昇格しません。

### 配置解決契約

`side` と `align` は独立に扱います。

- `side` は、`top` / `right` / `bottom` / `left` の **辺**を決めます。
- `align` は、`start` / `center` / `end` の **整列**を決めます。
- 実効配置は、`side` と `align` の組み合わせから決まります。

したがって、配置指定の一次入力は常に `side` と `align` です。内部実装が Floating UI や別の配置ライブラリを用いるかどうかは公開契約に含めません。

### 責務範囲

`ui-dropdown` の責務範囲には、トリガーとの関連付け、開閉状態管理、浮動配置、外側クリックによる閉鎖、スクロールによる閉鎖、キーボード移動、type-ahead、選択イベント再送出、必要な ARIA 属性付与を含みます。

一方で、項目選択後にページ遷移するか、確認ダイアログを挟むか、どの項目が現在選択中か、アイコンにどの意味を与えるかは責務に含めません。

---

## 状態モデル

`ui-dropdown` 群の主要状態は、単なる見た目差分ではなく、**開閉可能か、選択可能か、フォーカスがどこへ遷移するか**によって整理します。

### 閉状態

既定状態は `opened=false` です。この状態では panel は非表示であり、`aria-hidden="true"` かつ `inert` です。panel は DOM から除去されず、非対話状態として保持されます。

### 開状態

`opened=true` の場合、panel は可視化され、`aria-hidden="false"` となります。開く際には、初期フォーカス規則に従って最初または最後の有効項目へフォーカスを移します。

通常の展開では最初の有効項目へ、`ArrowUp` 起点の展開では最後の有効項目へフォーカスします。

### Dropdown 無効状態

`disabled=true` の場合、dropdown はトリガー操作を受け付けません。ポインター操作は停止し、キーボード起点の `open()` / `toggle()` も無効です。

ただし、無効化契約は dropdown 側の開閉無効化です。スロットされた trigger 自体の native `disabled` 属性までを保証する契約ではありません。

### Menu Item 通常状態

`ui-menu-item` は通常状態で選択可能です。クリックまたはキーボード選択により `menu-item-click` を内部発火し、`ui-dropdown` がこれを `menu-item-select` として再送出します。

### Menu Item 無効状態

`ui-menu-item[disabled]` は内部 button を `disabled` にし、選択不可とします。キーボード移動、Home / End、循環移動、type-ahead の対象からも除外します。

### Danger 項目状態

`variant="danger"` は視覚的警告を表す状態です。削除、リセット、破棄など破壊的操作に用います。これは意味を補助するものであり、確認ダイアログや undo の有無までは保証しません。

### 空メニュー状態

項目が 0 件でも `ui-dropdown` は描画可能です。メニューは開きますが、フォーカス移動先は存在せず、選択操作も成立しません。これは境界状態であり、通常運用の推奨構成ではありません。

### 全項目無効状態

全項目が `disabled` の場合もメニューは開きます。ただし、初期フォーカス先、矢印移動先、type-ahead 一致先は存在しません。開状態であっても実質的には観察専用の panel となります。

### フォーカス復帰状態

`close(true)`、Escape による閉鎖、選択による閉鎖では、既定で trigger へフォーカスを戻します。

一方、外側クリック、スクロール、Tab / Shift+Tab による閉鎖では `close(false)` を通るため、trigger へのフォーカス復帰には依存しません。

---

## DOM / Accessibility

`ui-dropdown` の Shadow DOM には、trigger slot と panel を持ちます。panel 内部に既定スロットを置き、`ui-menu-item` / `ui-menu-separator` を受け入れます。

```text
<ui-dropdown>
  #shadow-root
    <slot name="trigger"></slot>
    <div class="panel" role="menu">
      <slot class="menu-slot"></slot>
    </div>
</ui-dropdown>
```

`ui-menu-item` は Shadow DOM 内部に単一のネイティブ `<button>` を持ちます。

```text
<ui-menu-item>
  #shadow-root
    <button role="menuitem" tabindex="-1">
      <slot></slot>
    </button>
</ui-menu-item>
```

`ui-menu-separator` は視覚線と `role="separator"` を持つ単純要素です。

```text
<ui-menu-separator>
  #shadow-root
    <div class="separator" role="separator"></div>
</ui-menu-separator>
```

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- panel は `role="menu"` を持ちます。
- panel は trigger の ID を `aria-labelledby` で参照します。
- trigger は `aria-haspopup="menu"`、`aria-expanded`、`aria-controls` を持ちます。
- `ui-menu-item` の内部 button は `role="menuitem"`、`tabindex="-1"` を持ちます。
- 閉状態の panel は `aria-hidden="true"` かつ `inert` です。
- 非ネイティブ trigger には `role="button"` と `tabindex` を補います。
- 無効な非ネイティブ trigger には `aria-disabled="true"` と `tabindex="-1"` を付与します。

本コンポーネントで重要なのは、**見た目が menu らしいことではなく、trigger / menu / menuitem の関係を実体として成立させること**です。

### Trigger 契約

trigger は **button 相当の操作要素**です。正規入力としては、ネイティブ `<button>`、または button semantics を適切に提供するカスタム要素を置きます。

- trigger は 1 個だけを正規 trigger とします。
- 非ネイティブ trigger の場合、dropdown 側が `role="button"` と `tabindex` を補います。
- trigger 自体の視覚設計や内部 DOM は dropdown が規定しません。
- `a[href]` を trigger の正規入力としては扱いません。

### Trigger 所有権契約

trigger は利用側が供給する要素ですが、dropdown は開閉コンポーネントとして必要な最低限の関連付けを所有します。

- trigger の選定は dropdown が行います。
- `aria-haspopup`、`aria-expanded`、`aria-controls` などの関連属性は dropdown が管理します。
- trigger に ID が必要な場合、その関連付けは dropdown が担います。
- 非ネイティブ trigger に対する `role="button"` と `tabindex` の補完は dropdown の責務です。

一方で、trigger の視覚設計、内部 DOM、native `disabled` 属性の完全同期、button としての全既定挙動の再現は dropdown の責務に含めません。したがって、`ui-dropdown[disabled]` は **開閉無効化契約**であり、供給された trigger 要素そのものの完全な native disabled 化を意味しません。

### キーボード契約

| キー | trigger 上での動作 | panel 上での動作 |
| --- | --- | --- |
| `Enter` | 開閉を反転 | 現在項目を選択 |
| `Space` | 開閉を反転 | 現在項目を選択 |
| `ArrowDown` | 閉状態なら開き、最初の有効項目へ | 次の有効項目へ |
| `ArrowUp` | 閉状態なら開き、最後の有効項目へ | 前の有効項目へ |
| `Home` | なし | 最初の有効項目へ |
| `End` | なし | 最後の有効項目へ |
| `Escape` | なし | 閉じて trigger に戻す |
| `Tab` | 通常のフォーカス移動 | 閉じて次へ進む |
| `Shift+Tab` | 通常のフォーカス移動 | 閉じて前へ戻る |
| 文字キー | なし | type-ahead により前方一致検索 |

### Type-ahead 契約

type-ahead は 1 秒バッファで動作します。入力文字列を小文字化し、**有効項目の `text-value` または `textContent.trim().toLowerCase()` に対する前方一致**で最初の一致項目へフォーカスします。

このため、type-ahead の品質は項目ラベルのテキスト構造に依存します。装飾テキスト、不可視テキスト、複数言語表記などを混在させる場合は、`text-value` によって安定した先頭文字列を与えなければなりません（SHOULD）。

### アクセシブルネーム契約

trigger と各 menu item は、視覚的に存在するだけでは不十分であり、**安定したアクセシブルネーム**を持たなければなりません。

- icon-only trigger を使う場合、利用側は trigger 側でアクセシブルネームを与えなければなりません（MUST）。
- panel は trigger を `aria-labelledby` で参照するため、trigger の名前付けが曖昧であってはなりません。
- `ui-menu-item` の表示ラベルは既定スロット内容から決まりますが、type-ahead と機械的ラベル正規化には `text-value` を優先できます。
- 視覚装飾専用の icon や補助要素だけでは、安定したラベル源になりません。

したがって、機械可読な意味値と表示ラベルを分離したい場合は `value` と `text-value` を明示し、視覚上の装飾はラベル文字列の代替にしてはなりません（MUST NOT）。

---

## Visual Contract

`ui-dropdown` の視覚契約は、本文を主役にしたまま、**操作群を局所的に浮かび上がらせること**にあります。

### 情報順位

- trigger は通常時に本文より強く主張しません。
- panel は必要時のみ浮上し、操作対象を短時間だけ集中表示します。
- `danger` 項目は通常項目より強い警告色を持ちます。
- separator は情報グループを静かに区切ります。

### Panel 契約

panel は次の視覚条件を持ちます。

- `position: fixed` による浮動 panel です。
- `min-width: 180px`、`max-width: 280px` を持ちます。
- 最大高さは `calc(var(--control-height-md) * 10)` です。
- 開状態では opacity と scale で穏やかに入ります。
- 閉状態では非表示かつ `pointer-events: none` です。

panel は画面上に一時的に現れる補助面であり、恒常的な card や本文 box の代替ではありません。

### Menu Item 契約

`ui-menu-item` は一列の command item です。高さ、左右余白、アイコン間隔、hover 背景、danger 時の色差を持ちます。項目内の icon は補助要素であり、ラベルより主張してはなりません。

### フォーカス表示

項目のフォーカスは `:focus-visible` で示します。outline は要素外にはみ出しにくいよう内寄りに描画されます。dropdown 全体ではなく、**現在操作対象の項目**が明確になることを優先します。

### スクロール契約

項目数が 10 件を超える場合、panel 自体がスクロールします。panel の高さを無制限に伸ばして本文面を覆うことには依存しません。

### 参照トークン

本コンポーネントは主として次のトークンに依存します。

| 用途 | トークン |
| --- | --- |
| panel 背景 | `--bg-surface-2` |
| panel 境界線 | `--border-default` / `--border-width` |
| panel 角丸 | `--radius-md` |
| item 角丸 | `--radius-sm` |
| panel 影 | `--elevation-lg` |
| Z 軸 | `--z-popover` |
| item 高さ | `--control-height-md` |
| タッチ補助高さ | `--control-min-touch` |
| 余白 | `--space-1` / `--space-2` / `--space-3` |
| 文字色 | `--fg-default` / `--fg-subtle` |
| 通常 hover 背景 | `--bg-surface-active` |
| danger 文字色 | `--danger` |
| danger hover 背景 | `--bg-danger-subtle` |
| disabled 不透明度 | `--opacity-disabled` |
| icon 寸法 | `--icon-base` |
| アニメーション時間 | `--duration-normal` / `--duration-instant` / `--duration-fast` |
| イージング | `--ease-out` |
| 初期 scale | `--scale-enter` |
| フォーカスリング | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| separator | `--border-muted` |

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、panel と item の transition 時間を極小化します。開閉はほぼ瞬時に行い、継続的な視覚移動に依存しません。

### Dark Mode

`prefers-color-scheme: dark` 環境では、panel の shadow と inset highlight を強め、暗背景上で面境界を読み取りやすくします。色差の詳細はトークン差し替えで吸収します。

### Forced Colors

`forced-colors: active` 環境では、trigger、panel、item をシステムカラーへ寄せます。`danger` 項目も独自色への依存を弱め、構造と意味が失われないことを優先します。

### Print

`@media print` では panel を非表示にします。trigger は薄く残り得ますが、印刷時の主役ではありません。dropdown は印刷で利用する UI ではないため、印刷上の完全再現には依存しません。

---

## 関連契約

### 開閉契約

`ui-dropdown` は `opened` を公開しますが、**状態変更の正規 API は `open()` / `close()` / `toggle()`** です。

- `open()` は `disabled` または既開状態では何もしません。
- `close()` は既閉状態では何もしません。
- `toggle()` は現在状態を反転します。
- `opened` の直接書き換えは見た目制御には使えますが、イベント整合までを保証しません。

### 選択契約

`ui-menu-item` の内部 `menu-item-click` は family 内の内部イベントです。利用側が依存すべき公開イベントは `ui-dropdown` から再送出される `menu-item-select` です。

`detail.value` は項目の `value` property、`detail.label` は表示ラベルです。意味値の一次情報源は `value` です。したがって、command item では `value` を省略してはなりません（MUST NOT）。

### 配置契約

配置は見切れ回避と最低限の余白維持を責務に含みます。ただし、最終位置の厳密ピクセル値や viewport 端での挙動細部は内部配置実装に委ねます。利用側は生の `left` / `top` 数値や内部 middleware 順序に依存してはなりません（MUST NOT）。

### 閉鎖契約

開状態の menu は次の契機で閉じます。

- 項目選択
- Escape
- Tab / Shift+Tab
- ドキュメント外側クリック
- window scroll

一方で、Enter / Space の trigger 操作は、閉状態からの展開と、開状態での反転に使われます。

### フォーカス契約

開時には有効項目へ、閉時には原則として trigger へフォーカスを戻します。ただし、外側クリック、スクロール、Tab 移動では `restoreFocus=false` となるため、常に trigger へ戻るとは限りません。

### スタイル拡張契約

公開された主な拡張面は CSS Custom Properties です。`::part(...)` は公開していません。したがって、外部スタイル拡張はトークン調整、ホスト属性、trigger 側のスタイルにより行います。

Shadow DOM 内部 class 名、DOM 順序、内部 `button` の実装細部は公開契約に含みません。`.panel`、`.separator`、内部 `button` などへ直接依存してはなりません（MUST NOT）。

---

## 境界条件

### 単一項目

項目が 1 件でも動作します。ArrowDown / ArrowUp による循環後も同一項目に戻ります。

### 全項目無効

全項目が `disabled` の場合、展開は可能ですが、フォーカス移動と選択は成立しません。

### 多数項目

10 件超の項目では panel がスクロール可能になります。画面全体を覆う縦伸長には依存しません。

### 長いラベル

長いラベルは項目内で省略表示され得ます。panel は `max-width: 280px` を超えません。

### 非 button trigger

button semantics を補える非ネイティブ trigger でも最低限の操作性は成立します。ただし、button の完全互換ではなく、native button の既定挙動すべてを置換する契約ではありません。

### 空メニュー

項目 0 件でも開状態は成立しますが、選択先はありません。通常運用では避ける方がよい構成です。

### 区切りのみのメニュー

`ui-menu-separator` のみが並ぶ構成は描画上は成立し得ますが、操作メニューとしての意味は成立しません。公開契約として推奨しません。

### 複数 trigger 要素

trigger slot に複数要素を与えた場合、その構成自体が契約外です。残余要素の挙動には依存してはなりません。

---

## Storybook 契約

各 Story は見本ではなく、契約確認点として扱います。将来変更時には、少なくとも次の契約を維持します。

| Story | 固定する契約 |
| --- | --- |
| `Default` | 既定状態が閉であり、`open()` / `close()` が動作すること |
| `DefaultVariantNormal` | `role="menu"` と通常 command item 群が成立すること |
| `DangerVariantNormal` | `variant="danger"` 項目が視覚的警告項目として存在できること |
| `DefaultVariantDisabledItem` | 無効項目が内部 button の `disabled` と `aria-disabled` を持つこと |
| `DangerVariantDisabledItem` | `danger` と `disabled` を併用できること |
| `DropdownDisabled` | dropdown 自体の `disabled` で開閉を禁止できること |
| `WithIcons` | アイコン付き項目を並べられること |
| `WithSeparators` | separator が `role="separator"` を持つこと |
| `EventHandling` | `menu-item-select` の `detail` が取得でき、選択後に閉じること |
| `KeyboardNavigation` | WAI-ARIA menu pattern 相当の移動と閉鎖が成立すること |
| `AllItemsDisabled` | 全項目無効の境界状態を扱えること |
| `SingleItem` | 単一項目でも成立すること |
| `ManyItems` | 多数項目時に panel がスクロールすること |
| `LongLabels` | 長いラベルでも panel 幅が暴走しないこと |
| `ProgrammaticControl` | `open()` / `close()` / `toggle()` が冪等に扱えること |
| `AriaAttributes` | trigger / panel / item の ARIA 関係が成立すること |
| `SideTop` | `side="top"` による辺指定が反映されること |
| `ContextMenuExample` | 行内 command menu として使えること |
| `ForcedColorsMode` | 強制カラー環境で構造が失われないこと |
| `ReducedMotion` | reduced motion 環境で開閉が成立すること |
| `ClickOutsideClose` | 外側クリックで閉じること |
| `ScrollClose` | スクロールで閉じること |
| `TypeaheadNavigation` | type-ahead が前方一致で動作すること |
| `NonButtonTriggerAria` | 非 button trigger に `role="button"` と `aria-disabled` を補えること |
| `DarkModeSurface` | 暗背景上で panel の可読性を維持できること |
| `EmptyMenu` | 空メニューの境界状態でも破綻しないこと |

`NavigationExample` は command menu family の公開契約から外します。ナビゲーション用途を示す Story は別 family に移すか、参考例から削除します。

---

## 将来拡張の原則

本節は現行実装の公開契約ではなく、将来追加を検討する場合の設計指針です。追加機能は、dropdown を肥大化させるためではなく、**意味の明確化と操作の一貫性向上**に資する場合に限って採用します。

### 最優先で検討する価値がある機能

#### 選択状態付き item の型分離

現行の `ui-menu-item` は command item です。`menuitemcheckbox` または `menuitemradio` 相当の選択状態を導入する場合は、`ui-menu-checkbox` / `ui-menu-radio` のように型を分けます。

この拡張を採用する場合、次を満たします。

- command item と selection item を型と ARIA の両面で明確に分離します。
- 視覚差分だけでなく、`aria-checked` 等の意味論を伴わせます。
- type-ahead、矢印移動、Enter / Space の契約を壊しません。
- 単一選択と複数選択を曖昧に混在させません。

#### Shortcut / meta 表示領域

command menu では、項目ラベルとは別にキーボードショートカットや補助情報を静かに提示したい場合があります。そのため、`ui-menu-item` に trailing 側の補助表示領域を追加する価値があります。

この機能を採用する場合、次を満たします。

- 表示ラベルと shortcut / meta 表示を分離します。
- type-ahead と `detail.label` は主ラベルだけを対象とします。
- shortcut 表示はアクセシブルネームの一次情報源にしません。
- 補助表示は command の意味を補うものであり、主ラベルを置き換えません。

実装形態は、`slot="meta"`、`slot="shortcut"`、またはそれに準ずる trailing 領域として設計します。単なる装飾文字列ではなく、**主ラベルとは別の意味面**として扱います。

#### `text-value` の正式実装

本書では `text-value` を導入しています。これは単なる便利属性ではなく、type-ahead と機械可読ラベルを安定化させるための基盤機能です。

この機能を採用する場合、次を満たします。

- type-ahead の一次情報源として `text-value` を優先します。
- `detail.label` の生成規則と `text-value` の役割を分離します。
- icon、補助テキスト、複数言語表記を含む項目でも検索性を安定化させます。
- `textContent.trim()` 依存は fallback としてだけ残します。

`text-value` は新しい意味を足す機能ではなく、既存 family の操作品質を高めるための機能です。そのため、拡張というより **目標契約に近づけるための優先実装項目** として扱います。

### 条件付きで検討する価値がある機能

#### Group label / section heading

大きな menu では、separator だけでなくセクションラベルを持つ価値があります。ただし、装飾見出しではなく、グループ意味を補う場合に限ります。

この機能を採用する場合、次を満たします。

- 選択不可、非フォーカスの補助要素として扱います。
- group label は command item と視覚的に明確に区別します。
- separator だけでは意味が弱い大きめの menu に限定して用います。

#### `close` reason の公開

現行の `close` は、閉じたという事実のみを通知します。利用側で閉鎖契機に応じた分岐が頻発する場合は、`reason` を公開する価値があります。

この機能を採用する場合、次を満たします。

- `reason` は列挙値で固定します。
- 少なくとも `select` / `escape` / `tab` / `outside` / `scroll` / `programmatic` を候補とします。
- 追加後に後方互換が揺れないよう、列挙集合を安易に拡張しません。

これは API を一段重くするため、明確な利用要件がある場合に限って採用します。

#### Submenu

階層的コマンド群が必要な場合、submenu は検討価値があります。ただし、本文読書の流れを乱しやすく、キーボード契約も複雑化するため、優先度は高くありません。

この機能を採用する場合、次を満たします。

- 単層 menu の契約を壊さず、別型として段階的に追加します。
- フォーカス遷移、外側クリック、親子 close chain を明示的に定義します。
- submenu trigger と command item を同型にしません。

#### Trigger 幅追従

toolbar や密度の高い操作面では、panel 幅を trigger 幅にそろえたい場合があります。この用途に限り、`match-trigger-width` のような視覚オプションは検討価値があります。

ただし、Rouault における dropdown は常設選択 UI ではなく局所的 command menu であるため、既定機能としては扱いません。必要性が明確な場面に限って追加します。

### 採用しない方針

次の方向は dropdown の責務を汚しやすいため採りません。

- 任意コンテンツ popover 全般を dropdown に持ち込むこと
- フォーム、検索欄、複雑なレイアウトを menu 内の正規入力とすること
- trigger slot の複数起点を同時に正式サポートすること
- command item に link、selection、submenu の意味を混在させること
- ナビゲーションメニューを `ui-menu-item` の亜種で済ませること
- loading / pending / confirm を item 自体に抱え込むこと
- `closeOnSelect=false` のような振る舞い変更を汎用 option として安易に追加すること

### 将来拡張を採用する場合の確認点

将来拡張を採用する場合、Storybook と契約書では少なくとも次を追加確認対象とします。

- `MenuCheckbox` / `MenuRadio` 相当 Story による選択状態確認
- `MenuItemWithShortcut` 相当 Story による主ラベルと補助表示の分離確認
- `TextValueTypeahead` 相当 Story による機械可読ラベルの確認
- `GroupedMenu` によるグループラベルの意味確認
- `CloseReason` による閉鎖理由の安定性確認
- `Submenu` によるキーボード遷移確認
- `MatchTriggerWidth` による幅追従時の視覚整合確認

---

## 現行実装で未対応または未整合の事項

本節は、現行の `dropdown.ts` および `dropdown.stories.ts` を基準として、**本書で定義した長期契約に対して、現時点では未実装、未強制、または未整合である事項**を整理するものです。

### `side` ではなく `placement` を公開している

本書では公開語彙を `side` と `align` に整理しましたが、現行実装は `placement` を公開しています。したがって、**現行 API と目標契約は一致していません**。

### `value` が必須化されていない

本書では command item の `value` を必須としましたが、現行実装は optional です。したがって、**意味値の安定性がまだ公開面として強制されていません**。

### `text-value` が未実装である

本書では type-ahead とラベル正規化のために `text-value` を導入しましたが、現行実装は `textContent.trim()` に依存しています。したがって、**複雑な item 内容に対する機械可読性が未整備です**。

### trigger を button 相当に限定していない

本書では trigger を button 相当要素へ寄せましたが、現行実装は link や広義の button-like 要素まで許容しています。したがって、**trigger の正規入力範囲がまだ広く、責務境界が緩いままです**。

### navigation 用 Story が残っている

本書では command menu と navigation menu を分離しましたが、現行 Storybook には `NavigationExample` が存在します。したがって、**公開意味論と Story の語り口がまだ一致していません**。

### `opened` 直接代入時の `open` / `close` イベント整合

現行実装では、`opened` property を直接変更すると描画状態は更新されますが、`open` / `close` イベントは `open()` / `close()` を通った場合にしか発火しません。したがって、**外部制御とイベント契約は完全には一致していません**。

### trigger 複数要素の正式扱い

trigger slot に複数要素が入った場合、現行実装は最初の 1 要素だけを使用します。複数 trigger を明示的に禁止も警告もしていません。したがって、**実装上は受理されるが、契約上は未強制**です。

### 任意スロット内容の検証

既定スロットに `ui-menu-item` / `ui-menu-separator` 以外の要素を置いても描画自体は可能です。しかし、それらは roving focus や type-ahead の対象外です。現行実装には構成検証や開発時警告がありません。

### 空メニューの実行時警告

空メニューは境界状態として許容されますが、通常利用では意味が薄い構成です。現行実装は空状態を警告しません。

### trigger の native disabled 同期

`ui-dropdown[disabled]` は dropdown の開閉を止めますが、スロットされたネイティブ button やカスタム要素内部 button に `disabled` を同期付与する設計ではありません。したがって、**trigger 自体の native disabled と dropdown の disabled は同一ではありません**。

### command item 以外の item 種別

現行 `ui-menu-item` は command item のみを扱います。checkbox item、radio item、submenu trigger は未対応です。

### Shortcut / meta 表示領域

本書では、主ラベルと分離された trailing 側の shortcut / meta 表示領域を将来機能として位置付けています。しかし、現行実装の `ui-menu-item` は既定スロットのみを持ち、主ラベルと補助表示を構造的に分離する API を公開していません。したがって、**shortcut 表示を契約的に扱うための構造が未対応**です。

### Group label / section heading

本書では、separator だけでは意味が弱い大きめの menu に対して group label の導入余地を残しています。しかし、現行実装には非選択・非フォーカスの group label 要素が存在しません。したがって、**グループ意味を視覚線以外で表す機能は未対応**です。

### `close` reason の公開

本書では、条件付きで `close` reason を公開する可能性を整理しています。しかし、現行 `close` イベントは detail を持たず、`select` / `escape` / `tab` / `outside` / `scroll` / `programmatic` を識別できません。したがって、**閉鎖契機の機械可読な識別は未対応**です。

### Trigger 幅追従

本書では、条件付き機能として trigger 幅追従を検討対象にしています。しかし、現行 panel は `min-width: 180px` と `max-width: 280px` を持つ固定系の幅契約であり、trigger 幅への追従 option はありません。したがって、**toolbar などで必要になる幅同期機能は未対応**です。

### `open` / `close` イベントの発火タイミング

現行実装では、`open()` / `close()` は `opened` を変更した直後に `open` / `close` イベントを同期的に dispatch し、その後の更新サイクルで `_onOpen()` / `_onClose()` が走ります。したがって、**イベント発火時点では配置計算、フォーカス移動、cleanup / setup が完了しているとは限りません**。

本書は状態遷移 API としての意味を整理していますが、イベントのタイミングについてはまだ十分に固定していません。これは現行実装依存の振る舞いであり、契約化するか、更新完了後へ寄せるかを将来決める必要があります。

### trigger 未提供時の ARIA 参照

本書では trigger 1 個を正規構成としていますが、現行実装は trigger 不在を実行時に禁止しません。この場合、panel は `aria-labelledby` に内部生成 ID を保持し得ますが、その ID を持つ実トリガー要素は存在しません。したがって、**trigger 不在時の ARIA 関係は未整合になり得ます**。

### 開状態で `disabled=true` へ遷移した場合の扱い

現行実装では、`disabled` 変更時に trigger ARIA は更新されますが、開状態から強制的に閉じる規則はありません。したがって、**開いた menu がそのまま残った状態で dropdown だけが disabled になる遷移**を取り得ます。

本書では disabled を開閉無効化契約として整理していますが、開状態から disabled へ入るときの状態遷移規則はまだ固定していません。

### 開状態での trigger 差し替え

現行実装は slotchange 時に trigger listener と ARIA を同期しますが、開状態で trigger 要素が差し替わったときに floating の基準要素を再確立することまでは保証していません。したがって、**open 中に trigger を差し替えた場合の再配置と追従は未整備**です。

### 公開スタイル拡張面の限定

現行実装は CSS Custom Properties による調整を前提とし、`::part(...)` を公開していません。細かな内部部品単位の外部スタイリングは正式サポートしていません。

### 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用または是正する場合は、実装、Storybook、契約書の 3 点を同時に更新し、未整合状態を残したまま公開契約へ昇格させません。

また、本節には **将来拡張節で明示したが現行実装には未導入の機能** と、**現行実装が本書の長期契約とまだ噛み合っていない事項** の両方を含みます。したがって、単なる TODO 一覧ではなく、公開契約へ昇格させる前に整理すべき差分一覧として扱います。

