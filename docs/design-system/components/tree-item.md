# Tree Item

## 概要

本書は、`ui-tree-item` の ``** と整合する安定契約** を定義するものです。

`ui-tree-item` は、階層化された情報を探索するための**行単位コンポーネント**です。ただし、それ単体で tree 全体の意味論を完結させるものではありません。長期的な正規契約としては、`ui-tree-item` は `ui-file-tree` の compound child であり、**表示状態の受け取り**と**低レベルな操作要求の通知**を担います。

したがって、`ui-tree-item` は次を担当します。

- 単一行の描画
- ブランチ / リーフの見た目差分
- `selectedId` / `expandedIds` から導かれた状態の表示
- 左右キー、クリック、Enter、Space に対する**低レベル要求の通知**
- `role="treeitem"` 単位の DOM / Accessibility 契約

一方で、次は `ui-file-tree` または上位責務です。

- 選択状態の所有
- 展開状態の所有
- roving tabindex と `activeId` の所有
- Enter / Space / 左右キーの**最終意味決定**
- `ui-tree-request-select` / `ui-tree-select` / `ui-tree-request-toggle` / `ui-tree-toggle` の発火
- 現在位置ノードの可視化と ancestor 自動展開
- ルーティングや履歴更新

この整理により、`ui-tree-item` は「意味を持つが、状態所有者ではない行要素」として安定化します。

---

## 適用範囲

本書は、`ui-tree-item` の次を対象とします。

- 公開入力
- スロット契約
- 行レベルの integration event 契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- `ui-file-tree` との compound / container integration contract
- 境界条件
- Storybook 契約
- 現行実装との差分

本書は、次を対象としません。

- tree 全体の roving tabindex 戦略
- `Up` / `Down` / `Home` / `End` / type-ahead の全体制御
- `selectedId` / `expandedIds` / `activeId` の所有
- tree root としての公開イベント
- ルーティング、履歴操作、プリフェッチ、スクロール復元
- 非同期ロード、遅延展開、仮想スクロール
- ノート本文の読み込み、表示、履歴管理

これらは `ui-file-tree` または上位アプリケーションの責務です。

---

## `ui-file-tree` との整合方針

`ui-file-tree` の正規契約との整合のため、本書では次を固定します。

1. `** は **`** の **``** から導かれる表示状態とする。**
2. `** は現在位置表示を兼ねるが、**`** / focus とは別概念とする。**
3. `** は **`** の展開状態から与えられる controlled input とする。**
4. ``** は root の公開イベントを直接発火せず、行レベルの integration event を通知する。**
5. **Enter / Space / 左右キーの最終意味決定は **``** が担う。**
6. `** と **`** を同時に持つ状態は正規契約では不正入力とする。**
7. `** は **`** のノードデータと整合するため、string property を安定契約に含める。**
8. ``** は視覚高さ 24px、最小操作領域 44px 以上で固定する。**

ここで重要なのは、`ui-tree-item` の `selected` は**一時フォーカスではなく、**``** に対応する現在位置表示**である点です。一方で、tree 上のキーボード移動対象は `activeId`であり、これは`ui-file-tree` 側が所有します。`ui-file-tree` はこの分離を前提に設計されています。

---

## 公開契約

`ui-tree-item` は、`selected`、`expanded`、`label`、`icon`、`href`、`density` を公開入力として扱います。公開スロットは `children` と `icon` です。

ただし、`ui-tree-item` が通知するイベントは、アプリケーション向けの root 公開イベントではありません。これらは `ui-file-tree` が受け取って解釈する行レベルの integration event です。

### 入力契約

| 名前       | 種別                 | 必須     | 内容               | 契約                                                                                       |
| ---------- | -------------------- | -------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `selected` | property / attribute | いいえ   | 選択表示状態       | `ui-file-tree.selectedId` に対応する現在位置表示です。focus とは別です                     |
| `expanded` | property / attribute | いいえ   | 展開表示状態       | controlled input です。`ui-file-tree` から与えられる展開状態を表示します                   |
| `label`    | property / attribute | **はい** | 主ラベル           | 非空必須です。可視ラベル、リンクテキスト、トランケーション時の補助表示の原文として用います |
| `icon`     | property / attribute | いいえ   | 補助アイコン識別子 | `ui-file-tree` のノードデータと整合する string property です                               |
| `href`     | property / attribute | いいえ   | 遷移先             | リーフ項目のみが持つことを想定します                                                       |
| `density`  | property / attribute | いいえ   | 行密度             | `normal` / `compact` を受理します。既定値は `normal` です                                  |

`label` はプレーンテキスト契約です。HTML 断片やリッチテキストを渡す用途は公開契約に含めません。

`selected` は、単独の transient selection ではなく、`ui-file-tree.selectedId` に対応する現在位置表示です。したがって、`selected` を roving tabindex や一時アクティブ位置の代用として用いてはなりません（MUST NOT）。

`expanded` は controlled input です。`ui-tree-item` 自身が安定契約として展開状態の最終決定権を持つことはありません。

### ノード形状契約

`ui-file-tree` のノード種別契約との整合のため、`ui-tree-item` も次を前提とします。

- **ブランチ**: `children` を持ち、`href` を持ちません。
- **リーフ**: `href` を持ち、`children` を持ちません。
- `href` と `children` を同時に持つ状態は、正規契約では **invalid input** です。

これは、展開操作と遷移操作の意味を 1 行の中で混在させないためです。`ui-file-tree` 側も同じ前提で `branch` と `leaf` を排他的に扱います。

### スロット契約

| 名前       | 種別       | 位置づけ | 内容                                                   |
| ---------- | ---------- | -------- | ------------------------------------------------------ |
| `children` | named slot | 正規入力 | 直接の子要素である `ui-tree-item` を受け取ります       |
| `icon`     | named slot | 補助入力 | `icon` property の代替として補助アイコンを受け取ります |

`children` スロットは、**ツリー構造を DOM ネストで表すための唯一の正規入力**です。データ配列を渡して内部再帰描画する API は公開しません。

`children` スロットの正規入力は、`slot="children"` を持つ **直接の子要素である **`` のみです。ラッパー要素の挿入、任意要素の混在、複数階層をまたぐラッピングは公開契約に含めません。

`icon` property と `icon` スロットが同時に与えられた場合は、`icon` property を優先します。これは `ui-file-tree` のノードデータが `icon?: string` を持つこととの整合のためです。

### integration event 契約

`ui-tree-item` は、次の **行レベルの integration event** を公開します。

| 名前                                  | 発火条件                                          | detail                                    | bubbles / composed | 契約                                                                   |
| ------------------------------------- | ------------------------------------------------- | ----------------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `tree-item-primary-action-request`    | 行クリック、`Enter`、`Space` による主操作要求時   | `{ hasChildren: boolean, href?: string }` | `true` / `true`    | 当該行の主操作要求を通知します。最終意味は `ui-file-tree` が決定します |
| `tree-item-expanded-request`          | 展開アイコン操作、または左右キーによる開閉要求時  | `{ expanded: boolean }`                   | `true` / `true`    | 当該ブランチの展開変更要求を通知します                                 |
| `tree-item-focus-first-child-request` | 展開済みブランチで `ArrowRight` 押下時            | なし                                      | `true` / `true`    | 最初の子へのフォーカス移動要求を通知します                             |
| `tree-item-focus-parent-request`      | 収縮済みブランチまたはリーフで `ArrowLeft` 押下時 | なし                                      | `true` / `true`    | 親へのフォーカス移動要求を通知します                                   |

これらは `ui-file-tree` が受け取るための integration event です。アプリケーションが直接監視すべき root 公開イベントは、`ui-file-tree` 側の `ui-tree-request-select` / `ui-tree-select` / `ui-tree-request-toggle` / `ui-tree-toggle` / `ui-tree-active-change` です。`ui-file-tree` は request / commit の二段階イベントを root で公開する契約を持ちます。

#### イベント順序と意味

- 行クリック時は `tree-item-primary-action-request` を通知します。
- `Enter` と `Space` は `tree-item-primary-action-request` を通知します。
- 展開アイコンのクリック時は `tree-item-expanded-request` のみを通知し、`tree-item-primary-action-request` は通知しません。
- `ArrowRight` は、未展開ブランチなら `tree-item-expanded-request({ expanded: true })`、展開済みブランチなら `tree-item-focus-first-child-request` を通知します。
- `ArrowLeft` は、展開済みブランチなら `tree-item-expanded-request({ expanded: false })`、それ以外なら `tree-item-focus-parent-request` を通知します。

ただし、**Enter / Space / 左右キーの最終意味決定は **``** が担います。** `ui-file-tree` は、leaf に対しては選択要求、branch に対しては展開要求へ変換する責務を持ちます。`ui-file-tree` 側でも、左右キーと Enter / Space の最終意味決定は root が担うと定義されています。

### 公開メソッド

| 名前              | 種別   | 契約                                                                                             |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `focus(options?)` | method | ホスト要素としての `ui-tree-item` へフォーカスを要求した場合、内部の実フォーカス対象へ委譲します |

`ui-file-tree` は root 側で `focus()` / `focusSelected()` / `focusFirst()` を公開する契約を持ちます。`ui-tree-item` 側は行単位の `focus()` のみを安定契約とします。

### 属性反映契約

| property   | attribute  | reflect | 備考                              |
| ---------- | ---------- | ------- | --------------------------------- |
| `selected` | `selected` | あり    | boolean attribute として扱います  |
| `expanded` | `expanded` | あり    | boolean attribute として扱います  |
| `label`    | `label`    | あり    | 非空必須です                      |
| `icon`     | `icon`     | あり    | 補助アイコン識別子です            |
| `href`     | `href`     | あり    | リーフの遷移先です                |
| `density`  | `density`  | あり    | `normal` / `compact` を受理します |

内部用属性は安定契約に含めません。

### 無効値の扱い

- `label=""` は不正入力です。
- `density` の列挙外値は未定義です。
- リーフに対する `expanded=true` は受理しても ``** へ正規化**します。
- `href` と `children` の同時指定は不正入力です。

---

## 状態モデル

### 1. リーフ状態

`children` スロットに direct child の `ui-tree-item` が存在しない場合、当該項目はリーフです。`aria-expanded` は出力せず、`expanded` は常に `false` とみなします。`href` を持つのはリーフのみです。

### 2. ブランチ状態

`children` スロットに direct child の `ui-tree-item` が存在する場合、当該項目はブランチです。`aria-expanded` を持ち、展開アイコンを表示できます。正規契約では `href` を持ちません。

### 3. 収縮状態

`expanded=false` の場合、子要素コンテナは視覚的に閉じ、操作対象から除外されます。これは単なる見た目の折りたたみではなく、**子要素の操作可能性を外す状態**です。

### 4. 展開状態

`expanded=true` の場合、子要素コンテナを表示します。展開アニメーションの有無は環境設定に従います。

### 5. 選択状態

`selected=true` の場合、当該項目は `ui-file-tree.selectedId` に対応する**現在位置表示**として扱います。これは focus / active とは別の状態です。`ui-file-tree` 自体も `selectedId` と `activeId` を分離する契約を持ちます。

祖先経路の強調は `selected` を起点に行います。これは transient focus ではなく、**現在位置の経路を示すための構造強調**です。

### 6. ナビゲーション状態

`href` が与えられたリーフ項目はナビゲーション対象になり得ます。ただし、`ui-tree-item` 自体は遷移を確定しません。主操作時は `tree-item-primary-action-request` を通知し、`ui-file-tree` または上位が選択 / 遷移の実行可否を決定します。

### 7. 密度状態

| `density` 値 | 意味         | 視覚高さ | 最小操作領域 |
| ------------ | ------------ | -------- | ------------ |
| `normal`     | 標準読書密度 | 32px     | 44px 以上    |
| `compact`    | 高密度表示   | 24px     | 44px 以上    |

`compact` は視覚高さを下げても、最小操作領域は 44px 以上を維持します。

### 8. トランケーション状態

長いラベルは 1 行省略します。省略が実際に発生している場合のみ、完全なラベル文字列を補助表示します。

### 9. キーボード状態

| キー         | 行レベルの通知                                                         |
| ------------ | ---------------------------------------------------------------------- |
| `Enter`      | `tree-item-primary-action-request`                                     |
| `Space`      | `tree-item-primary-action-request`                                     |
| `ArrowRight` | 未展開ブランチなら展開要求、展開済みなら最初の子へのフォーカス移動要求 |
| `ArrowLeft`  | 展開済みブランチなら収縮要求、それ以外なら親へのフォーカス移動要求     |

`Up` / `Down` / `Home` / `End` / type-ahead は `ui-tree-item` 単体では扱いません。これは `ui-file-tree` 側の責務です。

---

## DOM / Accessibility

`ui-tree-item` は、外部契約上は**ホスト要素が意味上の主語**です。内部に実フォーカス対象を持ち得ますが、それは実装詳細です。

```text
<ui-tree-item
  role="treeitem"
  aria-level="..."
  [aria-expanded="..."]
  [aria-selected="true|false"]
  [tabindex="0|-1"]>
  #shadow-root
    [internal focusable row]
    [children group]
</ui-tree-item>
```

### Accessibility 契約

- ホスト要素は `role="treeitem"` を持ちます。
- `aria-level` は DOM 上の `ui-tree-item` ネストから自動算出します。
- `aria-expanded` はブランチの場合にのみ付与します。
- `selected=true` の場合、`aria-selected="true"` を付与します。
- 子要素コンテナは `role="group"` を持ちます。
- 収縮中の子要素コンテナはアクセシビリティツリー上も操作対象から除外します。

`aria-current` は安定契約に含めません。compound tree widget における現在位置表示は `selectedId` / `selected` により扱います。

### フォーカス契約

- 外部契約上の focus owner は `ui-tree-item` ホストです。
- 内部に `.item` などの実フォーカス対象を持つことは許容しますが、それは公開契約ではありません。
- `tabindex` はホスト属性として受理し、内部実装へ委譲できます。
- `document.activeElement` の内部詳細に依存してはなりません（MUST NOT）。

### リンク統合契約

`href` は、リーフ項目がナビゲーション先を持つことを表す宣言的入力です。ただし、`ui-tree-item` の主操作はあくまで **行レベルの integration event の通知**であり、遷移そのものは `ui-file-tree` または上位責務です。

---

## Visual Contract

`ui-tree-item` の視覚契約は、階層情報、選択状態、起動可能性を、**静かな差分**として表現することにあります。

### 情報順位

- 展開アイコンはブランチかどうかを示します。
- アイコンは補助表現です。
- ラベルが主情報です。
- `selected` は行背景・文字色・経路強調に反映します。
- 構造線は主役ではなく補助です。

### 行レイアウト

行は、展開アイコン、補助アイコン、ラベルを横並びに配置します。ラベルは残余幅を占有し、1 行省略表示します。

### Selected 表示

- `selected=true` の項目は背景と文字色を selected 用トークンへ切り替えます。
- selected の祖先経路は、構造線または子コンテナ強調によって可視化します。
- selected 表示は hover より優先します。

### 展開表示

展開アイコンは既定で右向き、展開時に 90 度回転します。

リーフでは展開アイコン領域を占有しません。したがって、ブランチとリーフのラベル左端は完全一致を契約しません。

### 密度と操作領域

- `normal` は視覚高さ 32px、操作領域 44px 以上です。
- `compact` は視覚高さ 24px、操作領域 44px 以上です。

### トランケーション補助

長いラベルは省略表示し、必要時のみ補助表示を有効化します。全文の常時表示は契約に含めません。

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、展開・収縮および色変化の遷移時間を極小化します。

### Forced Colors

`forced-colors: active` 環境では、selected 表示、構造線、フォーカス表示をシステムカラーへフォールバックします。

### Print

印刷では、階層構造の可読性を損なわないことを優先します。ただし、印刷制御用の内部属性は stable contract に含めません。

---

## Compound / Container Integration Contract

`ui-tree-item` は単独で tree 全体の状態を所有しません。`ui-file-tree` または上位コンテナとの責務分担は次のとおりです。

| 項目                                        | `ui-tree-item` | `ui-file-tree` / 上位                           |
| ------------------------------------------- | -------------- | ----------------------------------------------- |
| 行描画                                      | 担当           | しない                                          |
| `selected` 表示                             | 担当           | `selectedId` を所有する                         |
| `expanded` 表示                             | 担当           | `expandedIds` / `defaultExpandedIds` を所有する |
| 低レベル操作要求の通知                      | 担当           | 解釈する                                        |
| `ui-tree-request-select` / `ui-tree-select` | しない         | 担当                                            |
| `ui-tree-request-toggle` / `ui-tree-toggle` | しない         | 担当                                            |
| `ui-tree-active-change`                     | しない         | 担当                                            |
| `Up` / `Down` / `Home` / `End` / type-ahead | しない         | 担当                                            |
| roving tabindex                             | 属性受理のみ   | `activeId` を所有し担当                         |
| 現在位置ノードの可視化                      | しない         | 担当                                            |
| ancestor 自動展開                           | しない         | 担当                                            |
| ルーティング確定                            | しない         | 担当                                            |

### `ui-file-tree` から `ui-tree-item` へのマッピング契約

`ui-file-tree` は、各ノードについて少なくとも次を `ui-tree-item` へ写像します。

- `label` ← ノードの `label`
- `icon` ← ノードの `icon`
- `href` ← leaf の `href`
- `selected` ← `selectedId === node.id`
- `expanded` ← branch の展開状態
- `density` ← tree 全体の密度設定
- `tabindex` ← `activeId` に基づく roving tabindex

### 主操作解釈契約

`ui-tree-item` が `tree-item-primary-action-request` を通知した場合、`ui-file-tree` はノード種別に応じて次の意味へ変換します。

- **leaf**: `ui-tree-request-select` → `ui-tree-select`
- **branch**: `ui-tree-request-toggle` → `ui-tree-toggle`

これは、`ui-file-tree` の「leaf の主操作は選択、branch の主操作は展開 / 収縮」という契約と一致します。

### selected ノード可視化契約

- `selected` ノードは常に可視であることを前提とします。
- `selected` ノードを可視に保つための ancestor 展開は `ui-file-tree` または上位責務です。
- `ui-tree-item` はそのための内部自動展開を行いません。

---

## 境界条件

### 1. リーフで `expanded=true`

入力として与えられても `false` に正規化します。

### 2. `label=""`

invalid input です。描画・アクセシビリティ整合は保証しません。

### 3. `children` に wrapper を挿入した場合

公開契約外です。`aria-level`、キーボード移動、見た目整合は保証しません。

### 4. `href` と `children` の同時指定

不正入力です。ブランチとリーフの意味が衝突するため、表示・操作整合は保証しません。

### 5. 行クリック

`tree-item-primary-action-request` を通知します。`ui-tree-item` 単体では選択確定も遷移確定も行いません。

### 6. 展開アイコンクリック

`tree-item-expanded-request` のみを通知します。`tree-item-primary-action-request` は通知しません。

### 7. `Enter` / `Space`

どちらも `tree-item-primary-action-request` を通知します。最終意味は `ui-file-tree` 側が解釈します。

### 8. selected と hover の競合

selected 表示を優先します。

---

## Storybook 契約

各 Story は見本ではなく、`ui-file-tree` と整合した契約確認点として扱います。

| Story                      | 固定する契約                                                                      |
| -------------------------- | --------------------------------------------------------------------------------- |
| `Default`                  | `role="treeitem"` と `aria-level="1"` を持つこと                                  |
| `Selected`                 | `selected=true` で selected 表示と `aria-selected="true"` が成立すること          |
| `WithChildren`             | ブランチで `aria-expanded` を持つこと                                             |
| `DeepNesting`              | direct child ネストに応じて `aria-level` が正しく増加すること                     |
| `Collapsed`                | 収縮時に子要素が操作対象から除外されること                                        |
| `SelectedAndExpanded`      | selected と展開状態を同時に保持できること                                         |
| `LongLabel`                | 省略時のみ補助表示が有効になること                                                |
| `CustomIconSlot`           | `icon` スロットによる補助アイコン表示ができること                                 |
| `LeafNode`                 | リーフでは `aria-expanded` を持たず、`expanded=true` 入力が正規化されること       |
| `PrimaryActionRequest`     | 行クリック、`Enter`、`Space` で `tree-item-primary-action-request` を通知すること |
| `ExpandControlRequest`     | 展開アイコンクリックで `tree-item-expanded-request` のみを通知すること            |
| `KeyboardBranchNavigation` | `ArrowRight` / `ArrowLeft` の integration event 契約が成立すること                |
| `TabIndexDelegation`       | ホスト `tabindex` が実フォーカス対象へ反映されること                              |
| `AllDensities`             | `normal` 32px / `compact` 24px の視覚高さを持つこと                               |
| `CompactTouchTarget`       | `compact` でも最小操作領域が 44px 以上であること                                  |
| `ForcedColorsMode`         | 強制カラー環境で selected 表示とフォーカスが維持されること                        |
| `ReducedMotion`            | reduced motion 相当で遷移時間が極小化されること                                   |
| `RealWorldFileTree`        | selected ノードの経路強調を破綻なく表現できること                                 |

---

## 補足

`ui-tree-item` の要点は、階層を描画すること自体ではありません。`ui-file-tree` が所有する `selectedId` / `expandedIds` / `activeId` を前提に、単一行としての視覚表現と低レベル操作通知を安定化することにあります。`ui-file-tree` は `selectedId` を外部状態、`expandedIds` を controlled / uncontrolled、`activeId` を内部状態として扱う契約を持っています。`ui-tree-item` はこの前提に従属します。

今後も次の 7 点は崩さない方がよいです。

1. `selected` は `selectedId` に由来する表示状態であり、focus とは混同しないこと。
2. `expanded` は controlled input として扱うこと。
3. root-level public event は `ui-file-tree` に集約し、`ui-tree-item` は integration event に留めること。
4. `label` は非空必須であること。
5. `children` は direct child の `ui-tree-item` のみを正規入力とすること。
6. `href` と `children` を同時に許容しないこと。
7. `compact` でも操作領域 44px 以上を維持すること。

---

## 将来拡張の原則

本節は安定契約ではなく、将来追加を検討する場合の設計指針です。

### 優先度が高い拡張

#### 1. `disabled` / `aria-disabled`

操作不能状態を導入する場合は、行起動、展開、フォーカス可否、視覚差分、ARIA を一体で固定します。

この拡張は、`ui-file-tree` が選択・展開の最終意味決定を持つという前提を崩さずに、**行単位で主操作を受け付けない状態**を表現するために有効です。追加する場合は、少なくとも次を固定します。

- `disabled=true` では `tree-item-primary-action-request` を通知しません。
- 展開アイコン操作も抑止するかどうかを明示します。
- `aria-disabled="true"` を付与します。
- `selected` / hover / disabled の視覚優先順位を固定します。

#### 2. `description` / `aria-describedby`

注記や状態説明をスクリーンリーダーへ渡す必要がある場合、`aria-describedby` 相当の公開入力は検討価値があります。

`label` は主ラベルとして非空必須で固定しているため、補助情報まで `label` に混在させるべきではありません。したがって、補助説明は主ラベルと分離した入力面として扱う方が設計上きれいです。

追加する場合は、次のどちらかに固定します。

- `description` のような高水準 property を受け、内部で `aria-describedby` に反映する。
- `aria-describedby` 相当の参照入力を受ける。

利用側の分かりやすさを優先するなら、前者の方が扱いやすいです。

#### 3. 補助情報専用の `end` スロット

件数、同期状態、ドラフト有無など、**主操作を増やさない補助情報**を表示したい場合、末尾補助スロットには検討価値があります。

ただし、このスロットは補助表示専用とし、主要な操作ボタンやメニューの常設には使いません。追加する場合は、少なくとも次を固定します。

- `end` は補助情報専用であり、主操作を置きません。
- `end` 領域は `selected` や現在位置の意味を代替しません。
- キーボードの主操作対象は引き続き行本体です。

#### 4. 外部ハイライト用の `matchRanges`

tree 内検索を内蔵せず、外部で計算した一致区間だけを row に渡して強調表示する入力には価値があります。

これは検索ロジックを `ui-tree-item` に持ち込むものではなく、``** の表示補助だけを担う入力**です。`ui-file-tree` が検索を責務外とする方針とも整合します。

追加する場合は、次のような契約が考えられます。

- `matchRanges: Array<{ start: number; end: number }>` を受ける。
- 一致区間の算出責務は上位に置く。
- `ui-tree-item` は `label` の分割表示と強調だけを担う。

### 条件付きで価値がある拡張

#### 5. 非同期展開状態

子要素の遅延取得が必要になった場合のみ、ローディング中 branch 状態を検討します。ただし、その所有者は引き続き `ui-file-tree` 側に置きます。

この拡張を採る場合、`ui-tree-item` 自身がロードを開始したり再試行責務を持ったりしてはなりません。行側には、たとえば次のような **controlled な表示入力** のみを追加します。

- `childrenLoading`
- `childrenLoadFailed`

#### 6. 展開コントロールのアクセシブル文言

展開アイコンがあるブランチに対して、`expandLabel` / `collapseLabel` のような補助文言を与えられるようにすることには価値があります。

これは主ラベルや `selected` の意味を変えるものではなく、**展開コントロール自体の説明を補強する拡張**です。スクリーンリーダー利用時の理解を改善しつつ、`ui-file-tree` 側の状態所有モデルを壊しません。

### 採用しない方針

- `ui-tree-item` が root-level public event を直接発火すること
- `selected` を active / focus と混同すること
- `href` と `children` の同居を許容すること
- データ配列を受けて内部再帰描画すること
- ルーター固有 API を `ui-tree-item` に持ち込むこと
- ツリー全体の roving tabindex や type-ahead を item 単体へ内蔵すること
- `selectedId` / `activeId` / `expandedIds` 相当の状態所有機能を item 側へ移すこと
- tree 内検索そのものを item 側へ内蔵すること
- 行末へ主要操作ボタンや複合メニューを常設すること

---

## 現行実装との差分

本節は、現行の `tree-item.ts` / `tree-item.stories.ts` と、`ui-file-tree` と整合を取った契約との差分を整理するものです。

### 1. `current` ではなく `selected` を正規状態に戻しました

現行の再固定版では `current` を採用していましたが、`ui-file-tree` 側の `selectedId` 契約と整合させるため、行側は `selected` を正規状態とします。ただし、その意味は transient focus ではなく現在位置表示です。`ui-file-tree` は `selectedId` と `activeId` を分離する契約を持つため、この意味付けが安定します。

### 2. `ui-tree-item` のイベントを root-level public event から分離しました

現行の再固定版では request event を `ui-tree-item` の公開イベントとして強く打ち出していましたが、整合後はそれらを **行レベルの integration event** と位置付けます。root-level の `ui-tree-request-select` / `ui-tree-select` / `ui-tree-request-toggle` / `ui-tree-toggle` / `ui-tree-active-change` は `ui-file-tree` 側の責務です。

### 3. `icon` string property を stable contract へ戻しました

`ui-file-tree` のノードデータが `icon?: string` を持つため、`ui-tree-item` も string property としての `icon` を stable contract に含めます。

### 4. `aria-current` ではなく `aria-selected` を採用します

compound tree widget における現在位置表示は、`selectedId` / `selected` を通じた `aria-selected` として扱います。`aria-current` は stable contract に含めません。

### 5. `href` と `children` の排他を固定しました

`ui-file-tree` の `branch` / `leaf` 契約に合わせ、`ui-tree-item` 側でも `href` と `children` の同居を invalid input とします。

### 6. Enter / Space / 左右キーの最終意味決定を `ui-file-tree` 側へ明示的に戻しました

`ui-tree-item` は低レベル要求のみを通知し、leaf 選択か branch 開閉かの最終判断は `ui-file-tree` が担います。これは `ui-file-tree` 側のキーボード契約と整合します。

### 7. `expanded` は引き続き controlled input とします

`ui-file-tree` 側は `expandedIds` に controlled / uncontrolled の両方を許容しますが、個々の `ui-tree-item` に渡される `expanded` は、描画時点では常に**解決済みの snapshot**であるため、行側の stable contract としては controlled input のままです。
