# Code Group

## 概要

本書は、`ui-code-group` の**目標契約**を定義するものです。ここでいう目標契約とは、現行実装の偶発的な都合ではなく、長期的に維持すべき公開面、状態遷移、アクセシビリティ、視覚上の責務境界を指します。

`ui-code-group` は、複数の `ui-code-block` を比較可能な単一提示面へ統合するコンポーネントです。責務は、コードブロック列を機械的にタブ化することではありません。**比較対象の識別**、**選択状態の安定化**、**コピー文脈の同期**、**読書体験を壊さない退行**を、一貫した契約として提供することにあります。

Rouault における code group は、比較可能性の向上と「没入して読む」ことのできる静かな UI の両立を目的とします。そのため、本契約は、**識別子は index ではなく安定 key で扱うこと**、**light DOM を author input として尊重すること**、**比較 UI が不要な場合は安全に退行すること**を原則として定義します。

---

## 適用範囲

本書は、`ui-code-group` の次の事項を対象とします。

- 公開契約
- 入力文法
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- 契約違反時の扱い
- 検証すべき契約
- 新規で追加を検討する価値がある機能
- 現行実装との差分
- 現行実装で未対応の事項

一方で、本書は次の事項を扱いません。

- `ui-code-block` 自体の構文ハイライト仕様
- コード文字列生成規則そのもの
- コピー成功通知文言の最終デザイン
- Markdown 変換層でどのように `ui-code-group` を生成するかという上位規則
- URL ルーティング仕様全体
- 実行系プレビューや sandbox の責務

---

## 設計原則

### 比較対象は stable key で識別します

選択状態、変更イベント、動的更新時の再解決は、並び順 index ではなく**安定識別子**を基準に扱います。

### light DOM は author input として保持します

`ui-code-group` は host 直下の子要素順や authored 属性を公開契約の一部として尊重します。比較 UI のために host の light DOM を再構成しません。

### 比較 UI は必要なときだけ有効化します

比較対象が 2 件未満のときは、比較用タブ UI を無理に表示しません。単一コードは単一コードとして静かに表示します。

### 意味の異なるラベルを混同しません

可視タブラベル、コピー文脈ラベル、ファイル名、言語名は別概念です。必要に応じて別入力面を持ち、暗黙フォールバックに過度に依存しません。

### 更新同期は明示的に扱います

動的更新は、「たまたま監視している属性」に依存しません。子要素の追加・削除・メタデータ変更・内容変更の同期条件を、公開契約として定義します。

---

## 公開契約

### 入力文法

`ui-code-group` の正規入力は、**直下の **``** 列**です。比較対象となる各 `ui-code-block` は、少なくとも次の情報を公開します。

| 名前         | 種別                 | 必須   | 内容                           |
| ------------ | -------------------- | ------ | ------------------------------ |
| `group-key`  | attribute / property | はい   | group 内で一意な安定識別子です |
| `tab-label`  | attribute / property | いいえ | タブ表示用ラベルです           |
| `copy-label` | attribute / property | いいえ | コピー文脈用ラベルです         |
| `filename`   | attribute / property | いいえ | ファイル名メタデータです       |
| `lang`       | attribute / property | いいえ | 言語名メタデータです           |

`group-key` は `ui-code-group` 内で一意でなければなりません。同一 group 内での重複は契約違反です。

### 受理対象の子要素

- 受理対象は host 直下の `ui-code-block` のみです。
- 入れ子要素配下の `ui-code-block` は比較対象に含めません。
- `ui-code-block` 以外の直下子要素は正規入力ではありません。
- 比較 UI が有効な場合、直下子要素は `ui-code-block` のみで構成されている必要があります。

### 比較 UI の有効条件

- **2 件以上の有効な **`` がある場合にのみ、比較 UI を有効化します。
- **1 件のみ**の場合は、tab UI を生成せず、単一 code block 表示へ退行します。
- **0 件**の場合は、比較 UI を生成せず、fallback content をそのまま表示します。

### 公開 property / attribute 契約

| property               | attribute                | reflect | 既定値  | 内容                              |
| ---------------------- | ------------------------ | ------- | ------- | --------------------------------- |
| `embedded`             | `embedded`               | あり    | `false` | 埋め込み表示モードです            |
| `selectedValue`        | `selected-value`         | あり    | なし    | 外部制御用の現在選択値です        |
| `defaultSelectedValue` | `default-selected-value` | なし    | なし    | 非制御時の初期選択値です          |
| `activation`           | `activation`             | あり    | `auto`  | `auto` または `manual` を取ります |

`selected-value` が与えられる場合、本コンポーネントは **controlled mode** として振る舞います。与えられない場合は **uncontrolled mode** として内部状態を保持します。

### アクセシブル名入力契約

タブリストのアクセシブル名は、次の優先順で決定します。

1. `aria-labelledby`
2. `aria-label`
3. 既定名 `コードグループ`

`aria-labelledby` が有効な参照を持つ場合、それを優先します。`aria-label` は補助手段として扱います。

### 選択値の解決契約

選択値は `group-key` を基準に解決します。

- `selected-value` が有効な key を指す場合、その項目を選択します。
- 非制御時に `default-selected-value` が有効な key を指す場合、その項目を初期選択します。
- いずれも解決できない場合は、最初の有効項目を選択します。
- child list 変化後も、可能な限り同じ `group-key` を維持します。

### タブラベル決定契約

可視タブラベルは、次の優先順で決定します。

1. `tab-label`
2. `label`
3. `filename`
4. `lang`
5. `group-key`

比較軸がファイル名や言語名と異なる場合、利用側は `tab-label` を明示します。

### コピー文脈決定契約

コピー文脈ラベルは、次の優先順で決定します。

1. `copy-label`
2. `filename`
3. `lang`
4. `tab-label`
5. `group-key`

比較軸ラベルとコピー文脈ラベルを分離したい場合、利用側は `tab-label` と `copy-label` の両方を指定します。

### 公開イベント契約

選択状態が変化した場合、`ui-code-group` は次のイベントを送出します。

| 名前                   | 発火条件                   | `detail`                                                |
| ---------------------- | -------------------------- | ------------------------------------------------------- |
| `ui-code-group-change` | 実際に選択値が変化したとき | `{ value, prevValue, index, prevIndex, userInitiated }` |

イベントは次の特性を持ちます。

- `bubbles: true`
- `composed: true`

### 公開メソッド契約

| メソッド             | 内容                                                |
| -------------------- | --------------------------------------------------- |
| `refresh()`          | child list、メタデータ、コピー文脈を再評価します    |
| `focusSelectedTab()` | 比較 UI 有効時に現在選択中の tab へフォーカスします |

`refresh()` は、動的更新を明示的に同期させるための公開手段です。利用側は、内容変更が自動追従条件に含まれない場合、このメソッドで同期できます。

### 責務範囲

責務範囲には、次を含みます。

- 比較対象列の正規化
- 選択状態の安定維持
- tab UI の提示
- panel 切替
- copy button への文脈同期
- keyboard navigation
- 小画面、印刷、強制カラーでの安全な退行

一方で、次は責務に含めません。

- コード内容生成
- syntax highlighting の詳細
- URL 同期全体
- コピー成功通知の最終表現
- 比較意味論そのものの決定

---

## 状態モデル

### Fallback 状態

有効な `ui-code-block` が 0 件の場合です。

- 比較 UI を表示しません。
- default slot content をそのまま表示します。
- copy button を表示しません。
- 選択状態は成立しません。

### Single Item 状態

有効な `ui-code-block` が 1 件の場合です。

- tablist を表示しません。
- 単一 panel のみを表示します。
- 比較 UI 専用ヘッダーは表示しません。
- copy 操作は `ui-code-block` 単体契約に委ねるか、group 側で簡易表示します。

本コンポーネントの比較責務は、2 件以上で初めて成立します。

### Comparison 状態

有効な `ui-code-block` が 2 件以上の場合です。

- tablist を表示します。
- 1 件のみを active panel として提示します。
- copy button は active panel に同期します。
- 選択状態は stable key で保持します。

### Controlled 状態

`selected-value` が指定されている場合です。

- 内部状態は公開選択値に従います。
- ユーザー操作で選択要求が発生しても、表示反映は外部からの `selected-value` 更新に従います。
- `ui-code-group-change` は要求通知として発火します。

### Uncontrolled 状態

`selected-value` が指定されていない場合です。

- 初期値は `default-selected-value` から解決します。
- 以後は内部状態で選択を保持します。
- child 変化時は stable key 優先で再解決します。

### Activation 状態

`activation` は `auto` または `manual` を取ります。

- `auto`: Arrow key によるフォーカス移動と同時に選択を変更します。
- `manual`: Arrow key はフォーカスのみ移動し、`Enter` / `Space` で選択を確定します。

### Copy 文脈状態

copy button は、常に active panel の文脈を表します。

- `value`: active item の `getCodeContent()` の返り値
- `label`: コピー文脈決定契約に従うラベル
- `disabled`: active item が copy 不可である場合は `true`

選択対象が変わった場合、copy button の一時状態は初期状態へ戻します。

### 動的更新状態

`ui-code-group` は、次の契約で再同期します。

- child の追加・削除: 自動再評価します。
- item metadata の変更: child からの通知イベント、または `refresh()` により再評価します。
- item content の変更: child からの通知イベント、または `refresh()` により再評価します。

この契約により、更新同期は `MutationObserver` 依存の偶発仕様ではなく、明示的な再評価モデルとして扱います。

---

## DOM / Accessibility

### DOM 所有権契約

`ui-code-group` は host の light DOM を **author input** として扱います。比較 UI のために host 直下へ button を挿入したり、child 順序を並べ替えたりしません。

- light DOM: author が与える入力です。
- shadow DOM: `ui-code-group` が所有する表示・操作 UI です。

### child 属性の所有権契約

`ui-code-group` は child `ui-code-block` の authored 属性を上書きしません。特に、次の authored 属性は child 所有とし、group は乗っ取りません。

- `id`
- `role`
- `slot`
- `aria-*`
- `embedded`
- その他 author が明示した属性

比較 UI に必要な tab / panel semantics は、shadow DOM 内の wrapper または内部関連付けで実現します。

### 推奨 DOM 構造

```text
<ui-code-group>
  <ui-code-block group-key="ts" ...></ui-code-block>
  <ui-code-block group-key="js" ...></ui-code-block>

  #shadow-root
    <div class="root">
      <div class="header">
        <div class="tab-list" role="tablist" aria-labelledby="... or aria-label=...">
          <button role="tab" ...>TypeScript</button>
          <button role="tab" ...>JavaScript</button>
        </div>
        <ui-copy-button></ui-copy-button>
      </div>
      <div class="panels">
        <div role="tabpanel" ...>
          <slot name="item-0"></slot>
        </div>
        <div role="tabpanel" ... hidden>
          <slot name="item-1"></slot>
        </div>
      </div>
    </div>
</ui-code-group>
```

上記は意味構造の例であり、内部 class 名や slot 名は公開 API ではありません。

### Accessibility 契約

- 比較 UI 有効時、tablist は `role="tablist"` を持ちます。
- 各 tab は `role="tab"` を持ちます。
- 各 panel は `role="tabpanel"` を持ちます。
- tab と panel は内部生成 ID により関連付けます。
- child authored `id` は panel 関連付け ID として流用しません。
- roving tabindex を採用します。
- `Tab` キーは通常のフォーカス遷移を妨げません。

### 内部 ID 契約

内部関連付け ID は、child authored `id` と分離した内部 ID とします。したがって、author は child の `id` を文書上の恒久識別子として自由に利用できます。

### キーボード契約

| キー                       | `activation="auto"`             | `activation="manual"`         |
| -------------------------- | ------------------------------- | ----------------------------- |
| `ArrowLeft` / `ArrowRight` | フォーカス移動と同時に選択      | フォーカスのみ移動            |
| `Home` / `End`             | 先頭 / 末尾へ移動し、同時に選択 | 先頭 / 末尾へフォーカス移動   |
| `Enter` / `Space`          | 現在フォーカス中の tab を選択   | 現在フォーカス中の tab を選択 |
| `Tab`                      | 抑止しません                    | 抑止しません                  |

### 書字方向契約

本コンポーネントは `dir` に従います。RTL 環境では、左右矢印の意味とスクロール補正は**論理方向**に従って解釈します。

---

## Visual Contract

### 情報順位

- 主役は code content です。
- tab は比較対象の切替導線です。
- copy button は補助操作です。
- 比較に不要なメタ情報は常設しません。

### 比較 UI の出現条件

- 2 件以上の比較対象がある場合のみ、tab header を表示します。
- 1 件のみの場合、比較 UI らしい枠組みは抑制します。
- 0 件の場合、group UI は表示しません。

### group 外観

- 比較 UI 有効時のみ、単一コンテナとしてのまとまりを示します。
- `embedded=true` では外枠を抑制します。
- 読書面との視覚競合を避けるため、境界と余白は控えめに保ちます。

### tab 外観

- 選択状態は、背景の強い塗りではなく、文字色と下線を主に用いて示します。
- hover は補助的変化にとどめます。
- focus-visible は確実に視認可能でなければなりません。
- タブ数が多い場合でも、active tab の視認性を保ちます。

### body 外観

- panel 背景は group 背景と競合しません。
- panel 内 code block の既存意味論を壊しません。
- `ui-code-group` は `ui-code-block` の内部 DOM class や `pre` 背景そのものに依存しません。

### copy button 外観

- copy button は、active panel に対する操作であることが常に分かる位置に置きます。
- copy 不可時は disabled を視覚的・意味的に示します。
- copy button の存在が tab 可視域を侵食しないよう補償します。

### スタイル API の境界

#### 外部調整面

| 変数                                  | 意味                   |
| ------------------------------------- | ---------------------- |
| `--ui-code-group-width`               | group 全体の幅         |
| `--ui-code-group-margin-inline`       | group の横方向マージン |
| `--ui-code-group-body-padding-block`  | body の上下 padding    |
| `--ui-code-group-body-padding-inline` | body の左右 padding    |

#### 内部実装変数

次は内部実装変数であり、外部公開 API ではありません。

- ヘッダーツール領域補償のための内部寸法変数
- レスポンシブ補償のための内部表示制御変数
- `ui-code-block` 内部表示を横断制御する一時変数

利用側は、これら内部変数への恒久依存を行いません。

---

## 環境別の振る舞い

### 小画面

- tablist が横スクロール可能な場合でも、active tab の視認性を維持します。
- copy button により active tab が隠れません。
- 比較 UI が過密になる場合は、情報密度を下げる方向で退行します。

### Forced Colors

- システムカラーへ確実にフォールバックします。
- 色差だけに依存せず、境界と構造で意味が伝わります。

### Print

- tab header は、印刷時に比較操作 UI としては不要です。
- 印刷時は、すべての比較対象を縦方向に展開します。
- hidden panel は印刷時に展開表示します。
- 各 panel は相互に識別可能な間隔を持ちます。

---

## 関連契約

### `ui-code-block` との契約

`ui-code-group` が比較対象として扱う `ui-code-block` は、少なくとも次の公開面を持ちます。

| 項目                                             | 必須   | 内容                     |
| ------------------------------------------------ | ------ | ------------------------ |
| `group-key`                                      | はい   | group 内の安定識別子です |
| `getCodeContent()`                               | はい   | コピー用文字列を返します |
| `copyable`                                       | いいえ | copy 可否を返します      |
| `tab-label` / `copy-label` / `filename` / `lang` | いいえ | 表示・文脈決定に使います |
| `ui-code-block-metadata-change`                  | いいえ | メタデータ更新通知です   |
| `ui-code-block-content-change`                   | いいえ | 内容更新通知です         |

`getCodeContent()` は、比較 UI における copy 契約の前提です。

### `ui-copy-button` との契約

`ui-code-group` は、active panel に応じて次を `ui-copy-button` へ渡します。

- `value`
- `label`
- `disabled`

また、選択対象変更時には、copy button の一時状態を初期化できます。

### URL 同期との境界

`ui-code-group` 自体は URL 同期の責務を持ちません。ただし、stable key を公開することにより、上位レイヤが URL 同期を構成できるようにします。

---

## 境界条件

### `group-key` 重複

同一 group 内で `group-key` が重複する場合は契約違反です。

- 開発時は警告します。
- 比較 UI は有効化しません。
- source order のまま安全に退行表示します。

### `group-key` 欠落

`group-key` を持たない `ui-code-block` は有効比較対象とみなしません。開発時警告の対象です。

### 1 件のみ

比較 UI は有効化しません。単一 code block 表示へ退行します。

### 0 件

fallback content を表示します。

### `selected-value` が不正

存在しない key を指す場合は無効として扱い、最初の有効項目へ退行します。

### child 再順序付け

比較対象の順序が変化しても、同じ `group-key` が存在する限り選択状態は維持します。

### copy 不可状態

active item が `copyable=false`、または `getCodeContent()` を有効に提供しない場合、copy button は disabled とします。

### 非正規入力の混在

`ui-code-block` 以外の直下子要素が混在する場合は契約違反です。開発時警告を出し、比較 UI は有効化しません。

---

## 契約違反時の扱い

契約違反時の基本方針は、**開発時警告 + 本番安全退行**です。

- 例外を常時投げることを前提としません。
- 比較 UI の破綻よりも、単純表示への退行を優先します。
- 開発時には原因が識別できる警告を出します。

この方針により、利用側は障害時でも読書面を失いません。

---

## 検証すべき契約

各 Story やテストは見本ではなく、契約確認点として設計します。

| 名称                          | 固定する契約                                                     |
| ----------------------------- | ---------------------------------------------------------------- |
| `ComparisonPair`              | 2 件以上で比較 UI が有効化すること                               |
| `SingleItemPassthrough`       | 1 件時に tab header を出さず、単一表示へ退行すること             |
| `FallbackBoundary`            | 0 件時に fallback content を表示すること                         |
| `StableKeySelection`          | child 再順序付け後も同じ `group-key` を維持すること              |
| `ControlledSelectionContract` | `selected-value` により外部制御できること                        |
| `ManualActivationContract`    | `activation="manual"` でフォーカス移動と選択確定が分離されること |
| `LabelResolutionContract`     | `tab-label` と `copy-label` の解決順序が成立すること             |
| `CopyDisabledContract`        | copy 不可状態で disabled が反映されること                        |
| `InvalidInputFallback`        | key 重複や非正規入力混在時に安全退行すること                     |
| `PrintExpansionContract`      | 印刷時に全 panel が縦展開されること                              |
| `ForcedColorsContract`        | 強制カラーで意味が維持されること                                 |
| `RTLContract`                 | RTL で論理方向に従うこと                                         |

---

## 補足

`ui-code-group` の要点は、タブを描画することではありません。**比較対象の識別と選択を安定化し、比較文脈とコピー文脈を分離しつつ、読書面に不要な DOM 介入を持ち込まないこと**にあります。

したがって、今後の変更でも次の 5 点は崩しません。

1. 正規入力は stable key を持つ直下 `ui-code-block` 列であること。
2. 選択状態は stable key で扱うこと。
3. light DOM を再構成しないこと。
4. 比較 UI は 2 件以上でのみ有効化すること。
5. 契約違反時は安全退行すること。

---

## 新規で追加を検討する価値がある機能

本節は、`ui-code-group` に対して新規で追加を検討する価値が高い機能を整理するものです。ここで扱う機能は、利便性のための拡張ではなく、**比較対象の識別、選択、同期、操作意味論をきれいにするための機能**に限定します。

### 最優先で検討する価値がある機能

#### stable key ベースの選択 API

選択状態を index ではなく stable key で扱うため、次の公開面を追加する価値があります。

- `selected-value`
- `default-selected-value`
- `ui-code-group-change` の `detail.value` / `detail.prevValue`

この機能により、child の再順序付け、差し替え、条件付き表示変更があっても、意味的に同じ比較対象を維持できます。比較 UI の長期保守性を支える最重要機能です。

追加する場合は、次を同時に固定します。

- 選択状態の一次表現は `group-key` であること。
- index は補助情報であり、主識別子ではないこと。
- controlled と uncontrolled の両方で同じ解決規則を用いること。
- key が解決できない場合の退行規則を明示すること。

#### `activation="manual"` を含む activation モード

キーボード操作の意味を明確にするため、`activation` を公開入力とする価値があります。

- `activation="auto"`: 矢印キーでフォーカス移動と同時に選択します。
- `activation="manual"`: 矢印キーではフォーカスのみ移動し、`Enter` / `Space` で選択を確定します。

この機能は、比較 UI が読み物の途中に現れる場合に特に有効です。`manual` を持つことで、フォーカス探索と本文切替を分離できます。

追加する場合は、次を同時に固定します。

- `auto` を既定値とするか、`manual` を既定値とするか。
- `Home` / `End` の挙動を activation モードごとに定義すること。
- roving tabindex と矛盾しないこと。
- スクリーンリーダー利用時にも意味が一貫すること。

#### copy disabled 契約

copy button の意味を明確にするため、copy 可能性を公開契約へ昇格させる価値があります。

- active item が `copyable=false` の場合は disabled にします。
- `getCodeContent()` が有効に提供されない場合は disabled にします。
- copy 不可時のラベル、`aria-disabled`、視覚表現を固定します。

この機能により、「ボタンはあるが空文字列をコピーし得る」という曖昧な状態を排除できます。操作意味論の明確化として価値が高いです。

追加する場合は、次を同時に固定します。

- `copyable` の優先順位
- `getCodeContent()` の返り値が空文字列である場合の扱い
- disabled 時の tooltip や補助文言の扱い
- `ui-copy-button` 側の disabled 契約との整合

#### 明示同期 API

動的更新を偶発的な DOM 監視に依存させないため、明示同期 API を追加する価値があります。

- `refresh()`
- `ui-code-block-metadata-change`
- `ui-code-block-content-change`

この機能により、child の内容変更、メタデータ更新、遅延レンダリング、非同期差し替えに対して、意図したタイミングで group を再評価できます。

追加する場合は、次を同時に固定します。

- `refresh()` が再評価する範囲
- イベント受信時に再解決する対象
- `selected-value` を保持したまま再評価するかどうか
- 高頻度更新時の再評価コストをどう抑えるか

### 本節の位置付け

本節の 4 項目は、単なる将来案ではありません。`ui-code-group` を **index 駆動の実装依存コンポーネント** から、**stable key と明示同期に基づく比較コーディネータ**へ整理するための中核機能です。

したがって、今後 `ui-code-group` を拡張する場合は、見た目の追加より先に本節の機能を優先して検討します。

---

## 現行実装との差分

本節は、現行実装に対して本契約が追加または変更を要求する主要差分を整理するものです。

### index ベース選択から stable key ベース選択への変更

現行実装が index 中心であっても、本契約では `group-key` に基づく選択維持を要求します。

### light DOM 再構成の禁止

現行実装が host 直下へ tab button を挿入している場合でも、本契約では light DOM を author input として保持し、比較 UI は shadow DOM 内で完結させます。

### child 属性上書きの禁止

現行実装が child の `slot`、`role`、`aria-*`、`headless` などを直接変更している場合でも、本契約では child authored 属性を乗っ取りません。

### `selected-value` / `default-selected-value` / `activation` の追加

外部制御と manual activation は、本契約では公開面として扱います。

### `aria-labelledby` 優先の命名モデル

アクセシブル名は `aria-labelledby` を優先し、`aria-label` は補助とします。

### 1 件時の退行

現行実装が 1 件でも比較 UI を出している場合でも、本契約では単一表示へ退行します。

### copy 不可状態の明示

本契約では、copy button の disabled 状態を公開契約に含めます。

### 契約違反時の方針明文化

本契約では、重複 key、欠落 key、非正規入力混在時の動作を明示します。

### 明示同期モデルの導入

本契約では、動的更新同期を `refresh()` と child update notification により扱います。偶発的な DOM 監視のみに依存しません。

---

## 現行実装で未対応の事項

本節は、現行の `code-group.ts` および `code-group.stories.ts` を基準として、**本契約または新規追加候補として本文中に記載したが、現時点では未実装、未強制、未検証、または現行 Storybook 契約に未反映である事項**を整理するものです。

### stable key ベースの識別と公開入力

本契約では `group-key`、`selected-value`、`default-selected-value` を公開面として扱っていますが、現行実装にはこれらが存在しません。現行の選択状態は `_activeIndex` のみで保持され、変更イベントも index ベースです。

したがって、**stable key に基づく選択維持、外部制御、初期選択の安定解決は未実装**です。

### `tab-label` / `copy-label` の明示入力

本契約では、比較軸ラベルとコピー文脈ラベルの分離のために `tab-label` と `copy-label` を導入しています。しかし現行実装は `label`、`filename`、`lang` のみを読み取り、copy 文脈も `filename > lang > コード` に固定されています。

したがって、**表示ラベルとコピーラベルを明示的に分ける入力面は未実装**です。

### controlled / uncontrolled 契約

本契約では controlled mode と uncontrolled mode を区別していますが、現行実装には制御状態を外部から与える API がありません。

したがって、**controlled / uncontrolled の公開契約は未実装**です。

### `activation="manual"` を含む activation モード

本契約では `activation` を公開入力として扱っていますが、現行実装の Arrow key は常に focus と selection を同時に変更します。manual activation は存在しません。

したがって、**activation モード切替は未実装**です。

### `refresh()` と明示同期モデル

本契約では `refresh()` と child update notification による再同期を想定しています。しかし現行実装は `MutationObserver` による `childList` と `label` / `filename` / `lang` 属性監視に依存しており、公開メソッド `refresh()` も、`ui-code-block-metadata-change` / `ui-code-block-content-change` も存在しません。

したがって、**明示同期 API は未実装**です。

### `aria-labelledby` 優先のアクセシブル名解決

本契約では `aria-labelledby` を優先しますが、現行実装は host の `aria-label` のみを参照し、未指定時は既定名 `コードグループ` へフォールバックします。

したがって、``** による命名モデルは未実装**です。

### 2 件以上でのみ比較 UI を有効化する契約

本契約では、比較 UI を 2 件以上でのみ有効化し、1 件時は単一表示へ退行します。しかし現行実装は `ui-code-block` が 1 件でも `data-ready` を付与し、tab button と group header を生成します。

したがって、**Single Item 退行契約は未実装**です。

### light DOM 非再構成契約

本契約では host の light DOM を再構成しないことを要求しています。しかし現行実装は `button[slot="tab"]` を host 直下へ生成し、Storybook も `button[slot="tab"]` を直接探索してこの前提に依存しています。

したがって、**light DOM を汚さない契約は未実装であり、Storybook 契約も未移行**です。

### child authored 属性を乗っ取らない契約

本契約では child の `id`、`role`、`slot`、`aria-*`、`embedded` などを group が乗っ取らない方針を採っています。しかし現行実装は `slot="panel"`、`role="tabpanel"`、`aria-labelledby`、`headless`、`hidden`、`aria-hidden`、`data-panel-after-first`、場合によっては `embedded` を child 側へ直接付与または削除します。

したがって、**child 所有属性を保全する契約は未実装**です。

### authored `embedded` の保全

本契約では child authored 属性を保全しますが、現行実装は group の `embedded=false` 時に child の `embedded` を無条件に取り除きます。

したがって、**child 側で明示された **``** を維持する契約は未実装**です。

### copy disabled 契約

本契約では copy 不可状態を `disabled` として表現します。しかし現行実装は `ui-copy-button` へ `disabled` を渡さず、`getCodeContent()` が存在しない場合も `_copyValue` を空文字列に設定するだけです。

したがって、**copy disabled 状態の公開契約は未実装**です。

### 公開イベント detail の拡張

本契約では `ui-code-group-change` の `detail` に `{ value, prevValue, index, prevIndex, userInitiated }` を含めます。しかし現行実装は `{ index, prevIndex }` のみを送出します。

したがって、**stable key と user initiated 情報を含むイベント detail は未実装**です。

### 公開メソッド `focusSelectedTab()`

本契約では `focusSelectedTab()` を公開メソッドとして扱います。しかし現行実装にそのような公開メソッドはありません。

したがって、**選択 tab へのフォーカスを明示的に要求する API は未実装**です。

### 契約違反時の開発時警告

本契約では、`group-key` 重複、`group-key` 欠落、非正規入力混在などに対して開発時警告を出す方針を取っています。しかし現行実装には、これらに相当する runtime 警告や診断出力はありません。

したがって、**契約違反時の開発時警告と安全退行ポリシーの実装は未着手**です。

### `group-key` 重複・欠落・非正規入力混在の実行時強制

本契約では、重複 key や非正規入力混在を契約違反として扱います。しかし現行実装は `group-key` 自体を持たず、直下 `ui-code-block` 以外の子要素が混在しても、`ui-code-block` だけを収集して group 化を継続します。

したがって、**入力文法違反の検出・拒否・退行制御は未実装**です。

### RTL の論理方向対応

本契約では `dir` に従い、RTL でも論理方向に従って Arrow key と可視域補正を解釈します。しかし現行実装のスクロール補正は `left` / `right` と `scrollLeft` の物理方向で計算されています。

したがって、**RTL 契約は未実装**です。

### Storybook 契約の未移行

本契約では `SingleItemPassthrough`、`StableKeySelection`、`ControlledSelectionContract`、`ManualActivationContract`、`CopyDisabledContract`、`InvalidInputFallback`、`RTLContract` などを検証対象にしています。しかし現行 Storybook は `data-ready`、`button[slot="tab"]`、`ui-code-block[slot="panel"]`、`headless` 付与、旧イベント detail、旧ラベル解決前提に依存しています。

したがって、**本契約に対応する Storybook 契約への移行は未完了**です。

### スタイル API 境界の未移行

本契約では `--header-tools-width` などを内部実装変数として扱います。しかし現行 Storybook には `style="--header-tools-width: 120px;"` のように、内部変数へ直接依存する検証があります。

したがって、**公開スタイル面と内部変数の境界は Storybook 側でまだ未整理**です。

### `ui-code-block` との必須公開面の未整備

本契約では `group-key`、`getCodeContent()`、必要に応じて `copyable`、metadata/content change event を `ui-code-block` 側の公開面として想定しています。しかし現行 `ui-code-group` は `getCodeContent?()` に対する optional 依存しか持たず、他は暗黙属性参照にとどまります。

したがって、**比較対象 child の interface 契約は未整備**です。

### 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、**実装、Storybook、契約書**の 3 点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。
