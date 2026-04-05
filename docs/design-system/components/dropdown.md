# Dropdown

## 概要

本書は、`ui-dropdown`、`ui-menu-item`、`ui-menu-separator` から構成される **command menu family** の公開契約、状態モデル、アクセシビリティ、視覚契約を定義するものです。

`ui-dropdown` は、値入力 UI でも、任意コンテンツを収める popover でも、ナビゲーションリンク群でもありません。`ui-dropdown` は、**操作コマンドを一時的に提示し、選択させるための menu button 系コンポーネント** です。

Rouault における dropdown は、本文読書の流れを恒常的に分断しないことを前提に、必要な局面でのみ操作密度を局所的に上げるための UI として位置付けます。したがって、本コンポーネントの契約は、単に開閉できることではなく、**意味、構成、フォーカス、選択、閉鎖条件を一貫した規則として固定すること**を目的とします。

また、`ui-menu-item` と `ui-menu-separator` は、`ui-dropdown` と協調して command menu を構成するための family 要素です。これらは描画可能な汎用箱としてではなく、dropdown 文脈において選択、区切り、フォーカス移動、アクセシビリティ関係を成立させる構成要素として扱います。family 外での単独使用は妨げませんが、その場合に dropdown 文脈と同一の公開保証が成立するとはみなしません。

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
- menubar、command palette、listbox など別 family 全体の設計
- `ui-menu-item` に command 以外の意味を混在させる拡張
- `ui-menu-item` の trailing 側 shortcut / meta 表示 API の設計
- group label / section heading の要素設計
- `close` reason の公開設計
- submenu の設計
- trigger 幅追従のような視覚オプション設計
- アイコンセット自体の供給

また、本書では次の方向を採りません。

- 任意コンテンツ popover 全般を dropdown に持ち込むこと
- フォーム、検索欄、複雑なレイアウトを menu 内の正規入力とすること
- trigger slot の複数起点を同時に正式サポートすること
- command item に link、selection、submenu の意味を混在させること
- ナビゲーションメニューを `ui-menu-item` の亜種で済ませること
- loading / pending / confirm を item 自体に抱え込むこと
- `closeOnSelect=false` のような振る舞い変更を汎用 option として安易に追加すること

これらは上位レイヤまたは別コンポーネントの責務であり、本書の公開契約には含めません。

---

## 設計原則

本コンポーネントは、次の原則に従います。

- command menu と navigation menu を混在させません。
- 1 種の item に複数の意味を混在させません。
- 意味値、表示ラベル、補助表示を分離します。
- 開閉、フォーカス、閉鎖条件を安定した規則として扱います。
- 本文や見出しより dropdown 自体が主役にならないよう、浮上は一時的かつ静かな表現にとどめます。

---

### 公開イベント

#### `ui-dropdown`

| 名前               | 発火条件                                        | `detail`                           |
| ------------------ | ----------------------------------------------- | ---------------------------------- |
| `menu-item-select` | `ui-menu-item` が選択されたとき                 | `{ value: string, label: string }` |
| `open`             | 実効開状態が `false` から `true` へ変わったとき | なし                               |
| `close`            | 実効開状態が `true` から `false` へ変わったとき | なし                               |

`menu-item-select` は、クリック選択または Enter / Space による選択で発火します。

`open` と `close` は、**状態遷移通知**です。これらは「開閉状態が変わった」という事実を通知するものであり、配置計算、フォーカス移動、スクロール監視の確立または解除までが完了したことを意味しません。

したがって、`open` / `close` を完了通知として扱ってはなりません（MUST NOT）。開閉後の副作用を観測したい場合は、必要に応じて次の更新サイクルまたは利用側の後続処理で扱います。

また、`open` / `close` は **状態変更の入口に依存せず**、`opened` の変更、`open()` / `close()` / `toggle()`、選択、Escape、Tab / Shift+Tab、外側クリック、scroll などにより実効状態が変化した場合に同一意味で発火します。

### イベント伝播契約

公開イベント `open`、`close`、`menu-item-select` は、コンポーネント外部で観測できる公開イベントです。

一方、`ui-menu-item` の `menu-item-click` は family 内部の連携イベントであり、外部 API には含めません。利用側は `menu-item-click` ではなく `menu-item-select` を購読しなければなりません（MUST）。

また、公開イベントは結果通知であり、キャンセルによって内部状態遷移を差し止める契約は持ちません。選択前介入や閉鎖前介入は公開契約に含めません。

### 閉鎖理由契約

`close` イベントは、閉じたという事実だけを通知します。**なぜ閉じたか**という reason は `detail` として公開しません。

したがって、項目選択、Escape、Tab / Shift+Tab、外側クリック、scroll、または `toggle()` による反転は、すべて `close` という同一イベント面に収束します。利用側は `close` だけから閉鎖理由を識別できる前提に依存してはなりません（MUST NOT）。

閉鎖理由に応じた分岐が必要な場合は、`menu-item-select`、キーボード処理、外側クリック検知などを上位レイヤで別途扱います。

### 公開メソッド

| 名前                         | 種別   | 契約                                                                    |
| ---------------------------- | ------ | ----------------------------------------------------------------------- |
| `open()`                     | method | 無効状態でなく、かつ既閉状態のときに開きます                            |
| `close(restoreFocus = true)` | method | 既開状態のときに閉じます。既定では trigger へのフォーカス復帰を試みます |
| `toggle()`                   | method | 無効状態でないとき、現在状態を反転します                                |

`open()` / `close()` / `toggle()` は、`opened` を介した状態変更の公開ショートハンドです。これらは新しい意味を持つ別系統 API ではありません。

`close()` の `restoreFocus` 引数は公開面として扱います。`false` を指定した場合、閉鎖後のフォーカス復帰先には依存しません。

### 制御モデル契約

`ui-dropdown` の開閉状態は `opened` によって表し、**`opened` が唯一の公開状態値**です。`open()` / `close()` / `toggle()` は、この公開状態値を規則どおりに遷移させるための補助 API です。

- `opened=true` は開状態、`opened=false` は閉状態を表します。
- `open()` / `close()` / `toggle()` は、`opened` を正規規則に従って変更します。
- `opened` を外部から変更した場合も、実効開閉状態の変更として扱います。
- `open` / `close` は、状態遷移の入口ではなく、**実効状態変化そのもの**に対応して発火します。

したがって、本コンポーネントにおいて `opened` とメソッド群は矛盾する二重 API ではありません。利用側は宣言的には `opened` を、命令的には `open()` / `close()` / `toggle()` を用いてよく、どちらを入口にしても公開状態機械は同一です。

ただし、本コンポーネントは React 的な controlled component 用語法における「親が唯一の真実源で、内部が一切状態を持たない」ことを保証するものではありません。ここで固定するのは、**公開状態値と状態遷移規則が一貫していること**です。

### 属性反映契約

`opened`、`side`、`align`、`disabled`、`value`、`variant`、`text-value` は reflect されます。boolean 値は attribute の有無で反映します。

| 要素           | property    | attribute    | reflect | 備考                                |
| -------------- | ----------- | ------------ | ------- | ----------------------------------- |
| `ui-dropdown`  | `opened`    | `opened`     | あり    | boolean attribute                   |
| `ui-dropdown`  | `side`      | `side`       | あり    | `top` / `right` / `bottom` / `left` |
| `ui-dropdown`  | `align`     | `align`      | あり    | `start` / `center` / `end`          |
| `ui-dropdown`  | `disabled`  | `disabled`   | あり    | boolean attribute                   |
| `ui-menu-item` | `value`     | `value`      | あり    | 文字列、必須                        |
| `ui-menu-item` | `variant`   | `variant`    | あり    | `default` / `danger`                |
| `ui-menu-item` | `disabled`  | `disabled`   | あり    | boolean attribute                   |
| `ui-menu-item` | `textValue` | `text-value` | あり    | type-ahead とラベル正規化に使います |

### 入力正規化と非対応値契約

`side` の正規入力は `top` / `right` / `bottom` / `left` です。`align` の正規入力は `start` / `center` / `end` です。`variant` の正規入力は `default` / `danger` です。

`ui-dropdown` の配置入力は `side` と `align` で表します。`placement` のような単一文字列へ side と align を詰め込む API は、公開契約の一次表現としては採りません。

したがって、利用側は `top-start`、`bottom-end` のような複合 placement 文字列を前提とした設計に依存してはなりません（MUST NOT）。配置の正式入力は `side` と `align` です。

`ui-menu-item` の `text-value` は、type-ahead と機械可読ラベルを安定化させるための **正式入力**です。`text-value` は convenience ではなく、表示内容が装飾、icon、補助表示、複数言語表記を含む場合にも検索性と機械可読性を保つための契約入力として扱います。

したがって、type-ahead の一次情報源は `text-value` です。`textContent.trim()` は `text-value` 未指定時の fallback に限ります。複雑な表示構成で安定した検索文字列が必要な場合、利用側は `text-value` を与えるべきです（SHOULD）。

また、本契約書に列挙していない値、または `ui-menu-item` / `ui-menu-separator` 以外を前提とした item 種別は、将来の拡張余地であって現行の公開契約ではありません。描画や型受理が成立しても、公開保証へは昇格しません。

### 項目種別契約

現行の `ui-menu-item` は **command item 専用**です。したがって、`ui-menu-item` に selection、navigation、submenu trigger など別の意味を混在させません。

選択状態付き item を将来導入する場合は、`menuitemcheckbox` または `menuitemradio` 相当の意味を `ui-menu-item` に後付けせず、`ui-menu-checkbox`、`ui-menu-radio` のように **型を分離して追加**します。

この原則は、単なる実装方針ではなく公開契約上の境界です。したがって、利用側は `ui-menu-item` を command item 以外の意味で解釈してはなりません（MUST NOT）。

また、将来別型を追加する場合も、少なくとも次を満たさなければなりません（MUST）。

- command item と selection item を型と ARIA の両面で分離すること
- `aria-checked` 等の意味論を視覚差分だけで代用しないこと
- type-ahead、矢印移動、Enter / Space の既存契約を壊さないこと
- 単一選択と複数選択を曖昧に混在させないこと

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

`variant="danger"` は、単なる色差ではなく、**誤操作時の損失が通常項目より大きい command** を表す意味属性です。典型例は、削除、破棄、リセット、解除、切断などです。

`danger` は視覚的警告を伴ってよいですが、その本質は色ではなく意味区別にあります。したがって、利用側は「赤く見せたい項目」を `danger` にするのではなく、**通常項目とは異なる注意水準を要する操作**に限って用いなければなりません（SHOULD）。

なお、`danger` は確認ダイアログ、二段階確認、undo の提供までは保証しません。これらの要否は上位レイヤの責務です。

### 空メニュー状態

項目が 0 件でも `ui-dropdown` は描画可能です。メニューは開きますが、フォーカス移動先は存在せず、選択操作も成立しません。これは境界状態であり、通常運用の推奨構成ではありません。

### 全項目無効状態

全項目が `disabled` の場合もメニューは開きます。ただし、初期フォーカス先、矢印移動先、type-ahead 一致先は存在しません。開状態であっても実質的には観察専用の panel となります。

### フォーカス復帰状態

閉鎖後のフォーカス復帰は、**閉鎖契機ごとに一律ではなく、利用者の次の操作を妨げないこと**を優先して扱います。

- キーボードによる項目選択、Escape、または `close(true)` による閉鎖では、dropdown は trigger へのフォーカス復帰を試みます。
- ポインターによる項目選択では、不要な focus ring の残留を避けるため、trigger への復帰を保証しません。
- `Tab` / `Shift+Tab` による閉鎖では、ブラウザーの通常の逐次フォーカス移動を優先します。
- 外側クリックおよび scroll による閉鎖では、その時点のユーザー操作文脈を優先し、trigger への復帰を保証しません。

したがって、利用側は「閉じたら常に trigger に戻る」ことを前提にしてはなりません（MUST NOT）。閉鎖後のフォーカス先が重要なユースケースでは、閉鎖契機と `close()` 呼び出し引数を明示的に設計しなければなりません（MUST）。

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

アクセシビリティ上の公開契約は、特定属性の機械的列挙ではなく、**trigger / menu / menuitem の関係が外部から一貫して知覚できること**にあります。

- 開状態の panel は menu として公開されます。
- 閉状態の panel は、アクセシビリティツリーおよび逐次フォーカス移動の対象外でなければなりません（MUST）。
- trigger は、自身が menu を開閉する操作起点であること、および現在の展開状態を外部へ示さなければなりません（MUST）。
- 各 `ui-menu-item` は、選択可能項目として menu 内に公開されなければなりません（MUST）。
- roving focus において、開状態でキーボード到達対象となる項目は 1 個だけでなければなりません（MUST）。

これらを実現するために `aria-haspopup`、`aria-expanded`、`aria-controls`、`aria-labelledby`、`role="menu"`、`role="menuitem"`、`inert`、`aria-hidden` などを用いることはありますが、**公開契約は属性名そのものではなく、達成すべき意味関係**です。

### Trigger 契約

trigger は **menu button として操作可能な単一要素**です。正規入力としては、ネイティブ `<button>`、または利用側が button 相当の操作性をすでに与えた要素を置きます。

- trigger は 1 個だけを正規 trigger とします。
- trigger はポインターおよびキーボードから開閉起点として操作可能でなければなりません（MUST）。
- `a[href]` を trigger の正規入力としては扱いません。
- trigger 自体の視覚設計や内部 DOM は dropdown が規定しません。

非ネイティブ要素を trigger に使う場合、**button としての基礎操作性の一次責任は利用側**にあります。dropdown は menu button として必要な関連付けを与えますが、任意要素を完全な button へ再定義することまでは保証しません。

### Trigger 所有権契約

trigger は利用側が供給する要素ですが、dropdown は menu button として必要な最低限の関連付けを所有します。

- trigger の選定は dropdown が行います。
- menu との関連付けに必要な状態表現は dropdown が管理します。
- trigger に識別子が必要な場合、その関連付けは dropdown が担います。
- trigger が非ネイティブ要素であっても、dropdown が保証するのは **menu button 関係の付与**であり、button の全既定挙動の再現ではありません。

したがって、`ui-dropdown[disabled]` は **dropdown としての開閉無効化契約**です。供給された trigger 要素そのものが native `disabled` と同等に振る舞うことまでは意味しません。

### キーボード契約

本コンポーネントのキーボード操作は、**開状態では roving focus により 1 個の現在項目だけが到達可能である**ことを前提に定義します。

ここでいう **現在項目** とは、開状態の menu 内でキーボード移動の基準となる有効な `ui-menu-item` を指します。現在項目は、内部の実フォーカス対象である menuitem 要素と一致します。separator、無効項目、正規構成外の要素は現在項目になりません。

開状態で有効項目が 1 件以上ある場合、現在項目は常に高々 1 件です。現在項目以外の有効項目は roving focus 上の非到達状態に置かれます。

| キー        | trigger 上での動作                             | panel 上での動作                                    |
| ----------- | ---------------------------------------------- | --------------------------------------------------- |
| `Enter`     | 閉状態なら開く                                 | 現在項目を選択                                      |
| `Space`     | 閉状態なら開く                                 | 現在項目を選択                                      |
| `ArrowDown` | 閉状態なら開き、最初の有効項目を現在項目にする | 次の有効項目へ移動。末尾では先頭へ循環してよい      |
| `ArrowUp`   | 閉状態なら開き、最後の有効項目を現在項目にする | 前の有効項目へ移動。先頭では末尾へ循環してよい      |
| `Home`      | なし                                           | 最初の有効項目へ移動                                |
| `End`       | なし                                           | 最後の有効項目へ移動                                |
| `Escape`    | なし                                           | 閉じる。既定では trigger へのフォーカス復帰を試みる |
| `Tab`       | 通常の逐次フォーカス移動                       | 閉じたうえで、通常の逐次フォーカス移動を妨げない    |
| `Shift+Tab` | 通常の逐次フォーカス移動                       | 閉じたうえで、逆方向の逐次フォーカス移動を妨げない  |
| 文字キー    | なし                                           | type-ahead により一致する有効項目へ移動             |

現在項目の初期決定規則は次のとおりです。

- `Enter` / `Space` / `ArrowDown` 起点で開いた場合は、最初の有効項目を現在項目にします。
- `ArrowUp` 起点で開いた場合は、最後の有効項目を現在項目にします。
- 有効項目が存在しない場合、現在項目は成立しません。

また、`Tab` / `Shift+Tab` による閉鎖後の次フォーカス先はブラウザーの通常規則に従います。dropdown は、閉鎖後の「次要素」または「前要素」を独自に仮想化しません。

### Type-ahead 契約

type-ahead は 1 秒バッファで動作します。入力文字列は小文字化して扱い、**有効項目の `text-value`、未指定時は `textContent.trim()`** を正規化元として前方一致検索します。

検索の基準点は現在項目です。現在項目がある場合、検索はその次の有効項目から循環的に開始してよく、一致が見つからなければ状態を変えません。

したがって、type-ahead の対象は次の要素に限られます。

- `ui-menu-item` であること
- `disabled` でないこと
- 正規構成内にあること

separator、正規構成外の要素、補助表示専用の要素は type-ahead の対象に含めません。

装飾テキスト、不可視テキスト、複数言語表記、icon と補助表示が混在する場合は、利用側は `text-value` に安定した検索文字列を与えるべきです（SHOULD）。`textContent.trim()` は fallback であって、複雑構成に対する一次契約ではありません。

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

| 用途               | トークン                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------- |
| panel 背景         | `--bg-surface-2`                                                                          |
| panel 境界線       | `--border-default` / `--border-width`                                                     |
| panel 角丸         | `--radius-md`                                                                             |
| item 角丸          | `--radius-sm`                                                                             |
| panel 影           | `--elevation-lg`                                                                          |
| Z 軸               | `--z-popover`                                                                             |
| item 高さ          | `--control-height-md`                                                                     |
| タッチ補助高さ     | `--control-min-touch`                                                                     |
| 余白               | `--space-1` / `--space-2` / `--space-3`                                                   |
| 文字色             | `--fg-default` / `--fg-subtle`                                                            |
| 通常 hover 背景    | `--bg-surface-active`                                                                     |
| danger 文字色      | `--danger`                                                                                |
| danger hover 背景  | `--bg-danger-subtle`                                                                      |
| disabled 不透明度  | `--opacity-disabled`                                                                      |
| icon 寸法          | `--icon-base`                                                                             |
| アニメーション時間 | `--duration-normal` / `--duration-instant` / `--duration-fast`                            |
| イージング         | `--ease-out`                                                                              |
| 初期 scale         | `--scale-enter`                                                                           |
| フォーカスリング   | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| separator          | `--border-muted`                                                                          |

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

開状態の menu は、次の契機で閉じます。

- 項目選択
- Escape
- Tab / Shift+Tab
- ドキュメント外側クリック
- window scroll
- `opened=false` への状態変更
- `close()` または `toggle()` による閉鎖

ただし、閉鎖後のフォーカス復帰は契機ごとに同一ではありません。キーボードによる項目選択、Escape、`close(true)` では trigger への復帰を試みますが、ポインターによる項目選択、Tab 移動、外側クリック、scroll ではユーザーの次操作を優先し、trigger への復帰を保証しません。

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

非ネイティブ要素を trigger に用いること自体は妨げませんが、公開契約上の正規入力は **button 相当の操作性をすでに備えた単一要素**です。

したがって、非 button trigger で成立が期待できるのは、menu button としての最低限の関連付けと開閉操作までです。dropdown は任意要素を完全な native button と同等に変換する契約を持ちません。

利用側が非ネイティブ trigger を採る場合は、少なくとも次を満たさなければなりません（MUST）。

- フォーカス可能であること
- ポインター操作で開閉起点になれること
- Enter / Space による起動意味が破綻しないこと
- trigger 自身のアクセシブルネームが安定していること

これらが満たされない場合、その trigger は描画できても正規入力とは見なしません。

### 空メニュー

項目 0 件でも開状態は成立しますが、選択先はありません。通常運用では避ける方がよい構成です。

### 区切りのみのメニュー

`ui-menu-separator` のみが並ぶ構成は描画上は成立し得ますが、操作メニューとしての意味は成立しません。公開契約として推奨しません。

### 複数 trigger 要素

trigger slot に複数要素を与えた場合、その構成自体が契約外です。残余要素の挙動には依存してはなりません。

### Family 境界契約

`ui-dropdown`、`ui-menu-item`、`ui-menu-separator` は、**dropdown family として協調動作すること**を前提に契約されます。

- `ui-menu-item` は dropdown 配下で command item として使われるときに、選択、roving focus、type-ahead、ARIA 関係の保証対象になります。
- `ui-menu-separator` は dropdown 配下でグループ境界を示すときに、separator としての意味を持ちます。
- これらの要素を family 外で単独使用しても描画自体は成立し得ますが、dropdown family において保証されるキーボード、選択、関連付け契約は成立しません。

したがって、`ui-menu-item` と `ui-menu-separator` は family 外でも無条件に同一意味を保つ汎用 primitive ではありません。公開保証は **dropdown family の文脈内**に限ります。

---

## Storybook 契約

各 Story は見本ではなく、契約確認点として扱います。将来変更時には、少なくとも次の契約を維持します。

| Story                        | 固定する契約                                                         |
| ---------------------------- | -------------------------------------------------------------------- |
| `Default`                    | 既定状態が閉であり、`open()` / `close()` が動作すること              |
| `DefaultVariantNormal`       | `role="menu"` と通常 command item 群が成立すること                   |
| `DangerVariantNormal`        | `variant="danger"` 項目が視覚的警告項目として存在できること          |
| `DefaultVariantDisabledItem` | 無効項目が内部 button の `disabled` と `aria-disabled` を持つこと    |
| `DangerVariantDisabledItem`  | `danger` と `disabled` を併用できること                              |
| `DropdownDisabled`           | dropdown 自体の `disabled` で開閉を禁止できること                    |
| `WithIcons`                  | アイコン付き項目を並べられること                                     |
| `WithSeparators`             | separator が `role="separator"` を持つこと                           |
| `EventHandling`              | `menu-item-select` の `detail` が取得でき、選択後に閉じること        |
| `KeyboardNavigation`         | WAI-ARIA menu pattern 相当の移動と閉鎖が成立すること                 |
| `AllItemsDisabled`           | 全項目無効の境界状態を扱えること                                     |
| `SingleItem`                 | 単一項目でも成立すること                                             |
| `ManyItems`                  | 多数項目時に panel がスクロールすること                              |
| `LongLabels`                 | 長いラベルでも panel 幅が暴走しないこと                              |
| `ProgrammaticControl`        | `open()` / `close()` / `toggle()` が冪等に扱えること                 |
| `AriaAttributes`             | trigger / panel / item の ARIA 関係が成立すること                    |
| `SideTop`                    | `side="top"` による辺指定が反映されること                            |
| `ContextMenuExample`         | 行内 command menu として使えること                                   |
| `ForcedColorsMode`           | 強制カラー環境で構造が失われないこと                                 |
| `ReducedMotion`              | reduced motion 環境で開閉が成立すること                              |
| `ClickOutsideClose`          | 外側クリックで閉じること                                             |
| `ScrollClose`                | スクロールで閉じること                                               |
| `TypeaheadNavigation`        | type-ahead が前方一致で動作すること                                  |
| `NonButtonTriggerAria`       | 非 button trigger に `role="button"` と `aria-disabled` を補えること |
| `DarkModeSurface`            | 暗背景上で panel の可読性を維持できること                            |
| `EmptyMenu`                  | 空メニューの境界状態でも破綻しないこと                               |

`NavigationExample` は command menu family の公開契約から外します。ナビゲーション用途を示す Story は別 family に移すか、参考例から削除します。

---

## 現行実装で未対応または未整合の事項

本節は、現行の `dropdown.ts` および `dropdown.stories.ts` を基準として、**本書で定義した長期契約に対して、現時点では未実装、未強制、または未整合である事項**を整理するものです。

### `value` が必須化されていない

本書では command item の `value` を必須としましたが、現行実装は optional です。したがって、**意味値の安定性がまだ公開面として強制されていません**。

### trigger を button 相当に限定していない

本書では trigger を button 相当要素へ寄せましたが、現行実装は link や広義の button-like 要素まで許容しています。したがって、**trigger の正規入力範囲がまだ広く、責務境界が緩いままです**。

### trigger 複数要素の正式扱い

trigger slot に複数要素が入った場合、現行実装は最初の 1 要素だけを使用します。複数 trigger を明示的に禁止も警告もしていません。したがって、**実装上は受理されるが、契約上は未強制**です。

### 任意スロット内容の検証

既定スロットに `ui-menu-item` / `ui-menu-separator` 以外の要素を置いても描画自体は可能です。しかし、それらは roving focus や type-ahead の対象外です。現行実装には構成検証や開発時警告がありません。

### 空メニューの実行時警告

空メニューは境界状態として許容されますが、通常利用では意味が薄い構成です。現行実装は空状態を警告しません。

### trigger の native disabled 同期

`ui-dropdown[disabled]` は dropdown の開閉を止めますが、スロットされたネイティブ button やカスタム要素内部 button に `disabled` を同期付与する設計ではありません。したがって、**trigger 自体の native disabled と dropdown の disabled は同一ではありません**。

### command item 以外の item 種別

本書では `ui-menu-item` を command item 専用に固定しました。checkbox item、radio item、submenu trigger は現行 family の公開契約に含みません。したがって、**型分離原則は本文に存在するが、対応する別型コンポーネントは未導入**です。

### Shortcut / meta 表示領域

本書では、主ラベルと分離された trailing 側の shortcut / meta 表示 API を適用範囲の対象外としています。現行実装の `ui-menu-item` は既定スロットのみを持ち、主ラベルと補助表示を構造的に分離する API を公開していません。したがって、**補助表示を契約的に扱うための構造は現行 family の対象外**です。

### Group label / section heading

本書では、group label / section heading を適用範囲の対象外としています。現行実装には非選択・非フォーカスの group label 要素が存在しません。したがって、**グループ意味を separator 以外で表す機能は現行 family の公開契約に含みません**。

### `close` reason の公開

本書では、`close` は閉じたという事実のみを通知し、reason は公開しません。現行 `close` イベントも detail を持たず、`select` / `escape` / `tab` / `outside` / `scroll` / `programmatic` を識別できません。したがって、**閉鎖契機の機械可読な識別は現行契約に含みません**。

### Trigger 幅追従

本書では、trigger 幅追従を適用範囲の対象外としています。現行 panel は `min-width: 180px` と `max-width: 280px` を持つ固定系の幅契約であり、trigger 幅への追従 option はありません。したがって、**toolbar などで必要になる幅同期機能は現行 family の公開契約に含みません**。

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

また、本節には **現行実装が本書の長期契約とまだ噛み合っていない事項** と、**適用範囲では除外したが、将来別文書または別 family として整理し得る事項** の両方を含みます。したがって、単なる TODO 一覧ではなく、公開契約との距離を明示する差分一覧として扱います。
