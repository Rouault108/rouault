# List Item

## 概要

本書は、`ui-list-item`の長期契約を定義します。

`ui-list-item`は、`ui-list`配下で1行を構成する従属コンポーネントです。独立した一覧部品ではありません。責務は、**行セルの構成、主列と補助列の視覚階層、モバイル時の可視列縮退、行内セル移動、行アクティブ状態の表示**に限定します。

本書では、現行実装の振る舞いをそのまま追認しません。`ui-list-item`を長期的に保守しやすい形へ収束させるため、**責務境界が明確で、意味論が一貫し、親`ui-list`と衝突しにくい契約**を採用します。

---

## 適用範囲

本書は、`ui-list-item`の次の事項を対象とします。

- 位置づけ
- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook契約
- 現行実装との差分

本書は次の事項を扱いません。

- 一覧全体の並び順、ソート、フィルタリング、ページネーション
- 行選択結果の永続化
- 行遷移、ルーティング、ダイアログ起動
- 列定義の最終決定
- 各セル内部の個別UIコンポーネント契約
- データ取得
- action表示ポリシーの切替
- 説明行、集計行、区切り行などの非アクティブ行モード

これらは`ui-list`または上位レイヤの責務です。

---

## 位置づけ

`ui-list-item`は、`ui-list`が供給する列定義と表示モードに従って描画される行部品です。独立利用は正式サポート対象に含めません。

親`ui-list`が存在しない場合でも、描画が即座に破綻してはなりません。ただし、これは**障害耐性のための境界条件**であり、通常運用の契約ではありません。外部利用者は、単体利用時のDOM、視覚、操作性に依存してはなりません。

この位置づけにより、`ui-list-item`は次を行いません。

- 自身で列定義を所有しません。
- 自身で主遷移を決定しません。
- 自身で選択状態を永続化しません。
- 自身で行操作の意味を決定しません。

`ui-list-item`は、**親が決定した一覧構造を1行へ正確に投影する部品**です。

---

## 公開契約

### 前提契約

`ui-list-item`は`ui-list`配下で使用します。親`ui-list`は、列定義、モバイル状態、操作領域の表示可否、論理行index、現在行状態、およびcurrent列状態を子へ供給します。

`ui-list-item`単体は、列定義スキーマを決定しません。列定義の正当性検証は親`ui-list`側契約で扱います。

`ui-list-item`自身は、現在行やcurrent列を決定しません。親が決定した状態を1行へ反映するだけです。

selection modelは本コンポーネントのbase契約に含めません。選択状態を導入する場合は、`ui-list`側で別契約として昇格させます。

### 入力契約

`ui-list-item`の長期契約として公開する入力は次のとおりです。

| 名前              | 種別                                       | 必須   | 内容                   | 契約                                                                    |
| ----------------- | ------------------------------------------ | ------ | ---------------------- | ----------------------------------------------------------------------- |
| `rowId`           | property / attribute (`row-id`)            | はい   | 行ID                  | `ui-current-change`の識別子です。空文字列は許可しません                |
| `current`         | property / attribute                       | いいえ | 現在行か               | `true`の場合、その行は親`ui-list`が決定した**現在行**です            |
| `currentColumnId` | property / attribute (`current-column-id`) | いいえ | current列ID          | `columns.id`のいずれか、または`null`を取ります                       |
| `rowIndex`        | property / attribute (`row-index`)         | いいえ | 1-basedの論理行index | 指定時に`aria-rowindex`を出力します                                   |
| `leadLineClamp`   | property / attribute (`lead-line-clamp`)   | いいえ | 主列の最大表示行数     | `1`または`2`を許可します。既定値は`1`です。lead列だけに適用します |

`current`は**現在行**を意味します。選択済み状態、編集状態、主遷移可否を意味しません。

`currentColumnId`は**論理列ID**です。可視セル順indexではありません。`ui-list-item`はこの値を受け取り、親が与えた論理列意味を1行へ反映します。

`leadLineClamp`は一覧読書面としての可読性を調整する入力であり、行の意味論やcurrentモデルを変更しません。

### 非契約入力

次の表面は現行実装に存在していても、長期契約には含めません。

| 名前                   | 扱い   | 理由                                                      |
| ---------------------- | ------ | --------------------------------------------------------- |
| `href`                 | 非契約 | 主遷移責務は`ui-list-item`が持たないためです            |
| `managed`              | 非契約 | 親管理下かどうかは接続関係で決まるためです                |
| `rowId`                | 非契約 | 長期正本は`rowId`へ統一するためです                     |
| `current`              | 非契約 | 長期正本は`current`へ統一するためです                   |
| `selected`             | 非契約 | selectionはbase契約外とするためです                    |
| `currentCellIndex`     | 非契約 | 可視indexは長期正本にしないためです                     |
| `leadLineClamp`        | 非契約 | 長期正本は`leadLineClamp`へ統一するためです             |
| `requestListContext()` | 非契約 | 再同期機構は内部協調面であり、公開APIに含めないためです |

これらは将来削除または内部化してよく、外部利用者は依存しません。

### スロット契約

| 名前                | 種別       | 内容                 | 契約                                              |
| ------------------- | ---------- | -------------------- | ------------------------------------------------- |
| 列ID対応スロット  | named slot | 各列のセル内容       | `columns[].id`と一致するslot名だけを受理します |
| `actions`           | named slot | 行末操作群           | `showActions=true`の場合に限り描画対象です       |
| `mobile-supplement` | named slot | モバイル時の補助情報 | 非表示化したメタ情報の要約再掲だけに使います      |

既定スロットは通常運用の公開入力ではありません。親未接続時のフォールバックに限って存在してよいですが、外部利用者は正規入力として依存しません。

### 未知スロット契約

列定義に存在しないnamed slotは描画に寄与しません。既知列のslotが未提供の場合は、空セルとして描画します。

未知slotの検出時は、**開発時に限り**警告してよいです。警告方法は`console.warn`を既定とし、本番利用時の公開動作契約には含めません。

開発時診断としては、少なくとも次を警告対象にしてよいです。

- 未知slotの指定
- 同一`columns.id`の重複
- `lead`の複数指定
- `lead`列への`hideOnMobile=true`指定
- `currentColumnId`が`columns.id`に存在しない状態
- 非action領域内の自然tab stop要素の混入

### 親コンテキスト契約

`ui-list-item`は親`ui-list`から、列定義、モバイル状態、操作領域の表示可否、現在行状態、およびcurrent列状態を受け取る前提で動作します。

| 名前          | 内容                 | 契約                                                     |
| ------------- | -------------------- | -------------------------------------------------------- |
| `columns`     | 列定義配列           | `id`は一意であり、slot名として有効でなければなりません |
| `isMobile`    | モバイル表示かどうか | 真の場合はmobile縮退契約を適用します                   |
| `showActions` | 操作領域を表示するか | 真の場合に限り`actions`領域を描画対象にします          |

列定義には次の不変条件を課します。

- `id`は一意です。
- `lead`は高々1つです。
- `lead`列は`hideOnMobile=true`を許可しません。
- action領域は`columns`に含めません。
- `columns`が空の場合、`ui-list-item`は正規動作しません。

lead指定がない場合、先頭可視列をlead列とみなします。

上記の不変条件に反する場合、親`ui-list`側契約違反です。`ui-list-item`は安全側へ倒れてもよいですが、その補正結果を公開契約として固定しません。

### 親子協調契約

`ui-list`は、子`ui-list-item`に対して少なくとも次を供給します。

- `rowId`
- `rowIndex`
- `current`
- `currentColumnId`
- 列定義
- モバイル状態
- 操作領域表示状態

`ui-list-item`は、親が決定したこれらの状態を1行へ反映します。現在行とcurrent列の最終決定責務は親`ui-list`が持ちます。

### 非公開協調面

親子間で使う`ui-list-context-request`および同種の再同期機構は、**`ui-list`と`ui-list-item`の内部協調契約**です。一般利用者向け公開APIとしては扱いません。

同様に、`requestListContext()`は長期契約では公開メソッドとみなしません。再同期の駆動責務は親`ui-list`側に置きます。

### 責務範囲

`ui-list-item`の責務は次に限定します。

- 行セルの構成
- lead列 / 補助列 / 補助操作領域の視覚階層
- 現在行状態の表示
- current列状態の反映
- 行内セル移動要求の送出
- モバイル時の可視列縮退
- 一覧読書面として、主情報の可読性を損なう視覚ノイズの抑制

次は責務に含めません。

- 主遷移の実行
- 行編集開始
- ダイアログ起動
- Space / Enterの意味付け
- 列定義の妥当性決定
- 現在行状態の最終決定
- current列状態の最終決定
- selectionの決定および永続化

---

## 状態モデル

### 基本状態

最小状態は、親から正当な列定義を受け取り、`rowId`、`current`、`currentColumnId`、`rowIndex`を持つ状態です。

`current`は現在行を表します。`currentColumnId`は現在列を表します。両者の意味は親`ui-list`が決定し、`ui-list-item`はそれを反映します。

### lead 列状態

lead列は`columns`のうち`lead=true`の列です。指定がない場合は先頭可視列です。lead列は、行の意味を代表する列であり、モバイル縮退時にも保持される基準列です。

lead列は`leadLineClamp`に従って1行または2行まで表示してよいです。既定値は1行です。

lead列の複数行表示は、一覧密度を不必要に崩さずに主情報の意味保持を改善するための表示契約であり、current状態や行内セル移動契約には影響しません。

### 補助列状態

lead列以外の列は補助列です。補助列は、lead列の理解を助ける補足情報を表示します。補助列はlead列より高い視覚強度を持ってはなりません。

### 補助操作領域状態

補助操作領域は、`showActions=true`の場合に限り表示対象です。`actions`スロットが未提供または空の場合、補助操作領域は表示しなくてかまいません。

補助操作領域はdata columnではありません。current列、lead列、既定起動先列の意味論には参加しません。

### current 行状態

`current=true`の場合、その行は親`ui-list`が決定した**現在行**です。`ui-list-item`は、この状態に対して視覚強調を適用してよいです。

`current=false`の場合、その行は現在行ではありません。

### current 列状態

`currentColumnId`は **論理列ID**です。`ui-list-item`は、描画中のセルのうち`data-column-id`が一致するセルをcurrent列として扱ってよいです。

`currentColumnId`が未解決、または現在の表示モードで非表示列を指している場合、`ui-list-item`は**代替列を推測してcurrentを移し替えてはなりません**。その場合でもcurrent行の視覚状態は維持してかまいませんが、visible cellのcurrent表示は省略してよいです。

### 行内移動状態

`ui-list-item`は、行内移動要求を列IDベースで扱います。左右矢印または契約上有効なclickにより、隣接する**表示中data column** へcurrent変更要求を送出してよいです。

行内移動要求のdetailは、可視indexではなく`columnId`を正本とします。

### モバイル状態

`isMobile=true`の場合、`hideOnMobile=true`の補助列はDOMから抑制します。lead列は常時表示します。

`mobile-supplement`は、非表示になった補助情報の要約だけをlead領域へ再掲できます。これは明示的スロット入力であり、desktopに存在しない独立コンテンツをmobileのみへ追加してはなりません。

モバイル時は、可視列だけで新しいグリッドを構成します。非表示列は、視覚上だけでなくDOMとアクセシビリティ上も存在しません。

### フォールバック状態

親`ui-list`が存在しない場合でも、描画は壊れてはなりません。ただしこの状態は正式運用契約ではなく、**障害耐性のための境界条件**です。単体フォールバックのDOMや操作性に外部利用者は依存しません。

---

## DOM / Accessibility

ルートは`:host`です。ホストは`role="row"`を持ち、その内部にdata cellを持ちます。各data cellは`role="gridcell"`を持ち、`data-column-id`により論理列IDを識別できます。

補助操作領域を描画する場合、それはdata columnとは別意味の末尾領域です。表示時には`role="gridcell"`を持ってよいですが、current列モデルには参加しません。

```text
<ui-list-item role="row" aria-rowindex="...">
  #shadow-root
    <div class="cell cell--lead" role="gridcell" aria-colindex="1" data-column-id="title">
      <div class="cell-content">
        <slot name="title"></slot>
        [mobile-supplement]
      </div>
    </div>

    <div class="cell cell--meta" role="gridcell" aria-colindex="2" data-column-id="updatedAt">
      <slot name="updatedAt"></slot>
    </div>

    <div class="cell cell--actions" role="gridcell" aria-colindex="3">
      <div class="actions">
        <slot name="actions"></slot>
      </div>
    </div>
</ui-list-item>
```

### アクセシビリティ契約

- ホストは常に`role="row"`を持ちます。
- 各data cellは常に`role="gridcell"`を持ちます。
- `rowIndex`指定時のみ`aria-rowindex`を出力します。
- `aria-colindex`は**描画中セル順**に基づいて付与してよいですが、currentの正本は`currentColumnId`です。
- `data-column-id`はdata cellに対してのみ付与します。
- 補助操作領域はcurrent列、lead列、既定起動先列の意味論に参加しません。
- selectionはbase契約に含めないため、`aria-selected`は既定出力として要求しません。
- 行内タブ停止はセル主体で扱います。
- フォーカス可視表示はセル単位で扱います。

### フォーカスモデル契約

`ui-list-item`は、**セル主体のロービングフォーカス**を採用します。

したがって、次を契約とします。

- 非actionセル内には、逐次Tab移動の対象となる自然tab stopを置きません。
- 主列セル内に`a[href]`を含める場合、その要素は`tabindex="-1"`などにより**逐次Tab移動の対象から外れていなければなりません**。
- 非actionセル内の対話要素は、行内セル移動より優先する独自キーボード操作を持ってはなりません。
- actionセル内の対話要素だけを、個別操作用の自然フォーカス対象として許可します。

これにより、行読み取りの操作系と、個別操作の操作系を衝突させません。

### current / selected の分離

`ui-list-item`は、現在行状態を表すために`aria-selected`を流用しません。

現在行は`current`、選択状態は`selected`で表します。`ui-list-item`は選択状態を自律決定せず、親が供給した`selected`を反映します。

### 非採用の補助 ARIA 属性

`aria-haspopup`、`aria-keyshortcuts`、`aria-description`は、`ui-list-item`の一般契約に含めません。

これらは、上位の一覧操作モデルが明示的に必要と判断した場合にのみ、親側で追加する補助面です。`ui-list-item`自体は、dialog起動やSpace / Enterの意味付けを持ちません。

---

## Visual Contract

`ui-list-item`は、主情報、補助情報、操作を同一行内に整理して配置し、一覧読書面としての可読性を維持しなければなりません。

### 情報順位

- 主列は、補助列以上の視覚強度で表示しなければなりません。
- 補助列は、主列より強い視覚強度を持ってはなりません。
- actionセルは、通常時に主列より強く視認されてはなりません。
- アクティブ行の識別は、hover状態より明確でなければなりません。

### レイアウト契約

- ホストはグリッドコンテナです。
- 列テンプレートは親`ui-list`と整合しなければなりません。
- `ui-list-item`単体は列幅体系を所有しません。
- 各セルは同一行内で整列し、可読性を損なわない余白を持たなければなりません。
- `actions`スロットが空でも、actionセルの構造は維持します。
- 主列は`leadLineClamp`に応じて1行または2行まで表示してよいです。
- 補助列は、主列より強い情報密度を持たない範囲で整列しなければなりません。

### 視覚状態契約

- 通常時の行背景は非強調状態です。
- `selected`時は、通常時より明確だが`current`より弱い選択強調を適用してよいです。
- hoverおよび`:focus-within`時は、通常時より弱い補助強調を適用します。
- `current`時は、hoverより明確な現在行強調を適用します。
- `current && selected`の場合、現在行であり、かつ選択済みであることが判別できなければなりません。
- action操作群は通常時には主情報の読書を妨げず、hover、`:focus-within`、`current`時に視認可能性を高めてよいです。
- 視覚的に隠しているaction操作群は、同時に意図せず操作可能状態だけが露出してはなりません。

### テキスト選択契約

本文読書面としての性格を優先し、**テキスト選択はselection-neutral** とします。テキスト選択操作は行アクティブ変更を引き起こしません。

### スタイル拡張契約

`ui-list-item`はCSS Custom Propertiesによる基本トークン差し替えを許可します。一方で、内部class、内部データ属性、Shadow DOM構造、内部グリッド変数は公開APIではありません。`::part(...)`も公開しません。

---

## 環境別の振る舞い

### Mobile

モバイルでは`hideOnMobile=true`の補助列をDOMから抑制します。主列は常時表示します。`mobile-supplement`はhidden metadataの要約再掲に限定します。

### Reduced Motion

`prefers-reduced-motion: reduce`環境では、行背景やaction群の遷移時間を極小化します。

### Forced Colors

`forced-colors: current`環境では、アクティブ左アクセントとフォーカス輪郭をシステム色へ置き換え、境界と選択可視性を維持します。

### Print

印刷では、アクティブ背景とaction群を除去します。行情報は残し、操作ノイズだけを削除します。

---

## 関連契約

### current 変更要求契約

`ui-list-item`は、**契約上有効なclick** と **左右矢印キー** により`ui-current-change`を送出します。

`detail`は`{ rowId: string; columnId: string }`を正本とします。可視indexは公開detailに含める必要はありません。

#### click の有効条件

`click`は、次のすべてを満たす場合に限り、current変更入力として扱います。

- 対象が意味上のdata cellとして特定できること
- 補助操作領域内操作ではないこと
- 主ボタン由来の単純活性化であること
- `Alt`、`Ctrl`、`Meta`、`Shift`修飾付きではないこと
- テキスト選択操作の完了直後ではないこと
- drag / long-press由来の疑似clickではないこと
- 右クリック、中クリック、補助ボタン操作ではないこと

touch由来であっても、上記条件に実質的に等価な単純活性化である場合に限り、有効なclickとみなしてよいです。

| 入力         | 前提                             | 結果                                                      |
| ------------ | -------------------------------- | --------------------------------------------------------- |
| `click`      | 上記の有効条件をすべて満たすこと | 対象セルの`columnId`で`ui-current-change`を送出します |
| `ArrowLeft`  | 左境界でないこと                 | 1つ前の**表示中data column** の`columnId`を送出します |
| `ArrowRight` | 右境界でないこと                 | 1つ次の**表示中data column** の`columnId`を送出します |

`focusin`は状態遷移の正規トリガーに含めません。フォーカス追従は表示整合のために存在してよいですが、外部契約上の状態変化源としては扱いません。

### selection 非依存契約

selection modelは`ui-list-item`のbase契約に含めません。したがって、`ui-list-item`自身は、click、focus、hover、行内移動を理由に選択状態を決定または変更してはなりません。

将来selectionを導入する場合は、`ui-list`側でcurrentとの分離、`aria-selected`の出力条件、複数選択可否、バルクアクション連携を明示した上で、別契約として昇格させます。

### action セル契約

actionセル内操作は **selection-neutral** です。actionセル内の`button`や`a`の操作は、行アクティブ変更も選択状態変更も暗黙に伴いません。行アクティブ変更、選択状態変更、個別操作は別契約として分離します。

### 主列リンク契約

主列セル内に`a[href]`を置くことは許可します。ただし、それは行の意味を表す内容要素であり、行ロービングフォーカスの主体ではありません。主遷移の実行責務は`ui-list-item`が持ちません。

### モバイル補助情報契約

`mobile-supplement`は、hidden metadataの要約再掲専用です。desktopに存在しない独立コンテンツをmobileのみへ追加しません。

明示的な`mobile-supplement`スロットが未提供であり、親列定義がモバイル再掲対象を示している場合、`ui-list-item`はhidden metadataの一部を自動合成して再掲してよいです。

明示的な`mobile-supplement`スロットが提供された場合、その内容を正規入力として扱い、自動合成結果より優先します。

この契約により、mobile補助情報のsource of truthはdesktop側の補助列内容と親列定義に置かれ、二重管理を避けます。

### 親再同期契約

列構成、モバイル状態、または操作領域表示条件が変化したときの再同期責務は親`ui-list`が持ちます。`ui-list-item`は、再同期後の新しい表示条件に従って描画結果と`aria-colindex`を更新します。

ただし、`ui-list-item`は**論理currentを別列へ自動移送してはなりません**。`currentColumnId`が新しい表示条件で非表示列を指す場合、その不整合は親が解決すべきです。子はvisible cellのcurrent表示を省略してよいですが、暗黙フォールバックには依存しません。

---

## 境界条件

### 列定義不正

`columns`が空、`id`が重複、`lead`が複数、またはleadがmobile hiddenの場合、親`ui-list`側契約違反です。`ui-list-item`はできる限り安全側へ倒れてもよいですが、その状態を正式契約として扱いません。

開発時は、これらを警告対象として扱ってよいです。開発時診断の目的は、公開APIを増やさずに契約違反を早期発見することです。

### スロット未提供

既知列のslotが未提供であっても、セル構造は維持します。未提供列は空セルです。

### 未知スロット

未知slotは描画に寄与しません。開発時は`console.warn`による警告対象として扱ってよいですが、本番挙動の一部としては扱いません。

### action セル空

`actions`スロットが空でもactionセルは維持します。これにより、可視セルindex、列整列、および行構造を安定させます。

ただし、actionセルが空である場合、そのセルは追加の可読名や追加の操作可能要素を持ってはなりません。空のactionセル自体を個別Tab停止対象として扱いません。

### モバイル縮退

モバイル時の非表示列はDOMに存在しません。したがって、スクリーンリーダー、キーボード移動、index計算の対象にも含めません。

### 単体フォールバック

親未接続時の描画破綻は避けますが、この状態は通常運用契約ではありません。外部利用者は、単体フォールバック時のDOM、視覚、操作、アクセシビリティに依存してはなりません。

---

## Storybook 契約

本節では、**現行で存在するStoryにより確認できる契約**を記述します。

### 現行 Story で確認する契約

各Storyは見本ではなく、現時点で成立している契約確認点です。

| Story                             | 現時点で確認する契約                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `DefaultInList`                   | `ui-list`配下で`role="row"`、`role="gridcell"`、lead列 / 補助列 / 補助操作領域の構造が成立すること |
| `CurrentColumnProjection`         | `currentColumnId`に一致するdata cellだけがcurrent列として扱われること                            |
| `EmitsCurrentChangeOnArrow`       | 左右矢印キーにより`ui-current-change`が`{ rowId, columnId }`で送出されること                      |
| `EdgeBoundaryStopsByColumnId`     | 左右境界でcurrent列変更要求が停止すること                                                           |
| `MissingSlotBoundary`             | 既知列slot未提供時もcell構造を維持すること                                                        |
| `HiddenCurrentColumnBoundary`     | 非表示列が`currentColumnId`に指定されても、子が勝手に別列へcurrentを移し替えないこと              |
| `ActionRegionExcludedFromCurrent` | 補助操作領域がcurrent列モデルに参加しないこと                                                       |
| `UnknownSlotIgnoredWithWarning`   | 未知slotが描画に寄与せず、開発時警告対象になること                                                  |
| `MobileSupplement`                | モバイル時にhidden metadataの要約だけがlead領域へ再掲されること                                   |
| `StandaloneFallback`              | 親未接続時でも即時破綻しないこと                                                                      |
| `DarkMode`                        | ダークモードで可読性と状態識別が維持されること                                                        |

selection modelはbase契約に含めないため、`SelectedState`、`ActiveWithoutSelected`、`SelectedWithoutActive`、`ActiveAndSelected`、`AriaSelectedFromSelectedOnly`、`SelectedVisualPriority`、`SelectedAriaFalsePolicy`は本節から削除します。selectionを将来導入する場合は、`ui-list`側で別契約として昇格させた後に追加します。

### Story 命名規則

Story名は、視覚見本名ではなく**契約名**で付けます。状態組合せを検証するStoryには、`SelectedState`、`currentWithoutSelected`、`currentAndSelected`のように、検証対象が名前だけで分かる命名を用います。

### Storybook 上で禁止する誤読

- `current`を選択状態の代用として扱うStoryを作ってはなりません。
- `aria-selected`を`current`から導く期待値を書いてはなりません。
- actionセル操作を、行選択または現在行変更の近道として扱ってはなりません。
- 現在行と選択済み状態を区別できない視覚例を正例Storyにしてはなりません。

### Storybook と実装差分の扱い

Storybookに存在する観測項目であっても、本文契約へ昇格していないものは公開契約として扱いません。一方で、本文契約へ昇格した観測点はStorybookでも継続的に確認します。

`selected`契約を検証するStoryを追加する場合は、少なくとも`SelectedState`、`currentWithoutSelected`、`SelectedWithoutcurrent`、`currentAndSelected`、`AriaSelectedFromSelectedOnly`を優先追加対象とします。

---

## 補足

`ui-list-item`で守るべき核心は次のとおりです。

1. `ui-list-item`は`ui-list`の従属行であり、独立一覧部品ではありません。
2. 外部契約上のindexは **可視セル順 + actionセル** に統一します。
3. actionセルは **selection-neutral** です。
4. 非actionセルはセル主体フォーカスを崩しません。
5. `current`は現在行、`selected`は選択結果であり、両者を混同しません。
6. `aria-selected`は`selected`からのみ導きます。
7. 主遷移、dialog起動、Space / Enterの意味付け、および現在行・選択結果の最終決定は親側責務です。
8. モバイル縮退ではhidden列をDOM / A11y / indexのすべてから除外します。

---

## 現行実装との差分

本節は、現行実装が本契約へまだ一致していない可能性がある点を記録します。

### `href`

実装は`href`を公開入力として持ちません。主遷移責務は`ui-list-item`に持たせません。

### `requestListContext()` は内部協調面です

現行実装に公開メソッドが存在していても、長期契約では一般利用者向け公開APIとみなしません。再同期責務は親`ui-list`が持ち、子`ui-list-item`は親から供給された`columns`、`isMobile`、`showActions`、`currentColumnId`を反映します。

したがって、`requestListContext()`は存在していても**内部協調面**にとどめます。外部利用者は、その存在、呼び出し時機、戻り値に依存してはなりません。

### `focusin` による `ui-current-change`

実装は`focusin`を状態変化トリガーとして扱いません。状態遷移の正規トリガーはclickと左右矢印だけです。

### `data-row-id` の Storybook 期待値

Storybookは`data-row-id`のような内部観測面に依存しません。行識別の公開面は`row-id`に一本化します。

### selection model は base 契約に含めません

現行実装に選択状態関連の表面が存在していても、長期契約では`ui-list-item`のbase契約へ昇格させません。`ui-list-item`はcurrent行とcurrent列の投影に集中し、selectionの決定、反映、永続化を担いません。

したがって、`selected`は長期公開入力として採用せず、`aria-selected`も既定出力として要求しません。selectionを将来導入する場合は、`ui-list`側でcurrentとの分離、複数選択可否、`aria-selected`出力条件を定義したうえで、別契約として昇格させます。

### current 変更要求と selection を混同しません

実装が扱うのは、`ui-current-change`によるcurrent行 / current列の変更要求だけです。

selectionはbase契約に含めないため、current変更要求から選択状態を推測または更新してはなりません。

### テキスト選択と行活性化の衝突

テキスト選択はselection-neutralです。実装は選択文字列があるclickをcurrent変更要求として扱いません。

### 非セルクリックと疑似要素クリック

現行実装が`.cell`に属さないclickでも、現在indexへ正規化して`ui-current-change`を送出している場合、本契約では採用しません。行活性化は、意味上のセルを特定できる入力に限定します。

### action 群の opacity のみでの隠蔽

実装はaction群を`opacity`だけでなく`visibility`と`pointer-events`でも制御し、「視覚的に隠れているが操作可能である」状態を既定にしません。

### `aria-haspopup` / `aria-keyshortcuts` / `aria-description`

現行実装がこれらを常時付与していても、本契約では一般行契約として採用しません。必要なら親側のopt-inに移します。

### `content-visibility` / `contain-intrinsic-height` / 最小タッチ領域疑似要素

現行実装が`content-visibility: auto`、`contain-intrinsic-height`、および最小タッチ領域を補う疑似要素を持っていても、これらは現時点では実装最適化面です。公開契約としては固定せず、性能特性とポインタ挙動の両面を整理したうえで必要なら昇格させます。

### current の正本は列 ID です

長期契約の正本は`currentColumnId`と`data-column-id`です。

`aria-colindex`は描画中セル順に従ってよいですが、公開意味論の正本にはしません。補助操作領域もcurrent列モデルには参加しません。

### 単体フォールバック

現行実装に単体描画が存在していても、本契約では通常運用面に昇格させません。障害耐性のための境界条件にとどめます。
