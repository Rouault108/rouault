# Tree Item

## 概要

本書は、`ui-tree-item` の `ui-file-tree` と整合する安定契約を定義するものです。

ただし、2026-04 の note sidebar 移行以降、note sidebar の正本は `ui-file-tree` compound child 構造ではありません。`ui-tree-item` は引き続き design-system component として扱いますが、note sidebar の server-first navigation 契約とは切り分けて解釈します。

`ui-tree-item` は、階層化された情報を探索するための**行単位コンポーネント**です。ただし、それ単体で tree 全体の意味論を完結させるものではありません。長期的な正規契約としては、`ui-tree-item` は `ui-file-tree` の compound child であり、**表示状態の受け取り**と**低レベルな操作要求の通知**を担います。

したがって、`ui-tree-item` は次を担当します。

- 単一行の描画
- ブランチ / リーフの見た目差分
- `selectedId` / `expandedIds` から導かれた状態の表示
- 左右キー、クリック、Enter、Space に対する**低レベル要求の通知**
- `role="treeitem"` 単位の DOM / Accessibility 契約

一方で、次は `ui-file-tree` または上位アプリケーションの責務です。

- 選択状態の所有
- 展開状態の所有
- roving tabindex と `activeId` の所有
- Enter / Space / 左右キーの**最終意味決定**
- `ui-tree-request-select` / `ui-tree-select` / `ui-tree-request-toggle` / `ui-tree-toggle` / `ui-tree-active-change` の発火
- 現在位置ノードの可視化と ancestor 自動展開
- 選択確定後のルーティング、履歴更新、プリフェッチ、スクロール復元

このうち、tree としての意味決定、公開イベント、現在位置の可視化は `ui-file-tree` が担います。ルーティング、履歴更新、プリフェッチ、スクロール復元は上位アプリケーションの責務です。

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
- `disabled` / `aria-disabled` を含む到達性制御と active navigation の全体方針
- 非同期ロード、遅延展開、仮想スクロール
- 展開コントロール専用のアクセシブル文言 API
- tree 内検索そのものの実行や一致区間の算出
- ノート本文の読み込み、表示、履歴管理

これらは `ui-file-tree` または上位アプリケーションの責務です。

---

## `ui-file-tree` との整合方針

`ui-file-tree` の正規契約との整合のため、本書では次を固定します。

1. `selected` は `ui-file-tree.selectedId` から導かれる表示状態とします。
2. `selected` は現在位置表示を担いますが、`activeId` や focus とは別概念とします。
3. `expanded` は `ui-file-tree` 側の展開状態から与えられる controlled input とします。
4. `ui-tree-item` は root の公開イベントを直接発火せず、行レベルの integration event のみを通知します。
5. `Enter` / `Space` / 左右キーの最終意味決定は `ui-file-tree` が担います。
6. `href` と `children` を同時に持つ状態は正規契約では不正入力とします。
7. `icon` は `ui-file-tree` のノードデータと整合する string property として安定契約に含めます。
8. `compact` は視覚高さ 24px、最小操作領域 44px 以上で固定します。

ここで重要なのは、`ui-tree-item` の `selected` は一時フォーカスではなく、`ui-file-tree.selectedId` に対応する現在位置表示である点です。一方、tree 上のキーボード移動対象は `activeId` であり、これは `ui-file-tree` 側が所有します。`ui-file-tree` はこの分離を前提に設計されています。

---

## 公開契約

`ui-tree-item` は、`selected`、`expanded`、`label`、`description`、`icon`、`href`、`density`、`matchRanges` を公開入力として扱います。公開スロットは `children`、`icon`、`end` です。

ただし、`ui-tree-item` が通知するイベントは、アプリケーション向けの root 公開イベントではありません。これらは `ui-file-tree` が受け取って解釈する行レベルの integration event です。

### 入力契約

| 名前          | 種別                 | 必須     | 内容                 | 契約                                                                                                      |
| ------------- | -------------------- | -------- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| `selected`    | property / attribute | いいえ   | 選択表示状態         | `ui-file-tree.selectedId` に対応する現在位置表示です。focus とは別です                                    |
| `expanded`    | property / attribute | いいえ   | 展開表示状態         | controlled input です。`ui-file-tree` から与えられる展開状態を表示します                                  |
| `label`       | property / attribute | **はい** | 主ラベル             | 非空必須です。可視ラベル、リンクテキスト、トランケーション時の補助表示の原文として用います                |
| `description` | property / attribute | いいえ   | 補助説明             | 主ラベルとは別の補助説明です。存在する場合、アクセシビリティ上の補助説明へ反映します                      |
| `icon`        | property / attribute | いいえ   | 補助アイコン識別子   | `ui-file-tree` のノードデータと整合する string property です                                              |
| `href`        | property / attribute | いいえ   | 遷移先               | リーフ項目のみが持つことを想定します                                                                      |
| `density`     | property / attribute | いいえ   | 行密度               | `normal` / `compact` を受理します。既定値は `normal` です                                                 |
| `matchRanges` | property             | いいえ   | ラベル内一致区間配列 | `label` の表示補助だけを担う入力です。一致区間の算出責務は上位に置き、`ui-tree-item` は強調だけを担います |

`label` はプレーンテキスト契約です。HTML 断片やリッチテキストを渡す用途は公開契約に含めません。

`description` は補助説明であり、主ラベルの代替ではありません。主たる識別は常に `label` が担います。

`selected` は、単独の transient selection ではなく、`ui-file-tree.selectedId` に対応する現在位置表示です。したがって、`selected` を roving tabindex や一時アクティブ位置の代用として用いてはなりません（MUST NOT）。

`expanded` は controlled input です。`ui-tree-item` 自身が安定契約として展開状態の最終決定権を持つことはありません。

`matchRanges` は検索 API ではありません。tree 内検索そのものの責務は持たず、与えられた区間に従って `label` を分割表示・強調表示することだけを担います。

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
| `end`      | named slot | 補助入力 | 件数、状態、注記などの補助情報を受け取ります           |

`children` スロットは、**ツリー構造を DOM ネストで表すための唯一の正規入力**です。データ配列を渡して内部再帰描画する API は公開しません。

`children` スロットの正規入力は、`slot="children"` を持つ **直接の子要素である `ui-tree-item` のみ**です。ラッパー要素の挿入、任意要素の混在、複数階層をまたぐラッピングは公開契約に含めません。

`icon` property と `icon` スロットが同時に与えられた場合は、`icon` property を優先します。これは `ui-file-tree` のノードデータが `icon?: string` を持つこととの整合のためです。

`end` スロットは補助情報専用です。主要な操作ボタン、複合メニュー、選択や現在位置の意味を代替する UI は置きません。キーボードの主操作対象は引き続き行本体です。

### integration event 契約

`ui-tree-item` は、次の **行レベルの integration event** を公開します。

| 名前                                  | 発火条件                                          | detail                                    | bubbles / composed | 契約                                                                   |
| ------------------------------------- | ------------------------------------------------- | ----------------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `tree-item-primary-action-request`    | 行クリック、`Enter`、`Space` による主操作要求時   | `{ hasChildren: boolean, href?: string }` | `true` / `true`    | 当該行の主操作要求を通知します。最終意味は `ui-file-tree` が決定します |
| `tree-item-expanded-request`          | 展開アイコン操作、または左右キーによる開閉要求時  | `{ expanded: boolean }`                   | `true` / `true`    | 当該ブランチの展開変更要求を通知します                                 |
| `tree-item-focus-first-child-request` | 展開済みブランチで `ArrowRight` 押下時            | なし                                      | `true` / `true`    | 最初の子へのフォーカス移動要求を通知します                             |
| `tree-item-focus-parent-request`      | 収縮済みブランチまたはリーフで `ArrowLeft` 押下時 | なし                                      | `true` / `true`    | 親へのフォーカス移動要求を通知します                                   |

これらは `ui-file-tree` が受け取るための integration event です。これらの event の発火元識別子は `detail` に含めません。`ui-file-tree` は、event target となった `ui-tree-item` host から発火元行を特定し、対応する node の `id` を解決しなければなりません（MUST）。

アプリケーションが直接監視すべき root 公開イベントは、`ui-file-tree` 側の `ui-tree-request-select` / `ui-tree-select` / `ui-tree-request-toggle` / `ui-tree-toggle` / `ui-tree-active-change` です。`ui-file-tree` は request / commit の二段階イベントを root で公開する契約を持ちます。

#### イベント順序と意味

- 行クリック時は `tree-item-primary-action-request` を通知します。
- `Enter` と `Space` は `tree-item-primary-action-request` を通知します。
- 展開アイコンのクリック時は `tree-item-expanded-request` のみを通知し、`tree-item-primary-action-request` は通知しません。
- `ArrowRight` は、未展開ブランチなら `tree-item-expanded-request({ expanded: true })`、展開済みブランチなら `tree-item-focus-first-child-request` を通知します。
- `ArrowLeft` は、展開済みブランチなら `tree-item-expanded-request({ expanded: false })`、それ以外なら `tree-item-focus-parent-request` を通知します。

ただし、Enter / Space / 左右キーの最終意味決定は `ui-file-tree` が担います。`ui-tree-item` は行レベルの要求を通知するだけであり、`ui-file-tree` は leaf に対しては選択要求へ、branch に対しては展開要求へ変換する責務を持ちます。

### 公開メソッド

| 名前              | 種別   | 契約                                                                                             |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `focus(options?)` | method | ホスト要素としての `ui-tree-item` へフォーカスを要求した場合、内部の実フォーカス対象へ委譲します |

`ui-file-tree` は root 側で `focus()` / `focusSelected()` / `focusFirst()` を公開する契約を持ちます。`ui-tree-item` 側は行単位の `focus()` のみを安定契約とします。

### 属性反映契約

| property      | attribute     | reflect | 備考                                                   |
| ------------- | ------------- | ------- | ------------------------------------------------------ |
| `selected`    | `selected`    | あり    | boolean attribute として扱います                       |
| `expanded`    | `expanded`    | あり    | boolean attribute として扱います                       |
| `label`       | `label`       | あり    | 非空必須です                                           |
| `description` | `description` | あり    | 補助説明です                                           |
| `icon`        | `icon`        | あり    | 補助アイコン識別子です                                 |
| `href`        | `href`        | あり    | リーフの遷移先です                                     |
| `density`     | `density`     | あり    | `normal` / `compact` を受理します                      |
| `matchRanges` | なし          | なし    | 構造化データであるため property のみを安定契約とします |

内部用属性は安定契約に含めません。

### 無効値の扱い

- `label=""` は不正入力です。
- `description=""` は未指定と同等に扱います。
- `density` の列挙外値を受け取った場合、`normal` へフォールバックしなければなりません（MUST）。
- `density` の列挙外値を受け取った事実は、開発時に警告しても構いません（MAY）。
- リーフに対する `expanded=true` は受理しても `false` へ正規化します。
- `href` と `children` の同時指定は不正入力です。
- `matchRanges` に範囲外値、逆順、重複、未ソート区間が含まれる場合、強調表示の整合は保証しません。

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
  [aria-describedby="..."]
  [tabindex="0|-1"]>
  #shadow-root
    [internal focusable row]
    [internal description]
    [children group]
</ui-tree-item>
```

### Accessibility 契約

- ホスト要素は `role="treeitem"` を持ちます。
- `aria-level` は DOM 上の `ui-tree-item` ネストから自動算出します。
- `aria-expanded` はブランチの場合にのみ付与します。
- `selected=true` の場合、`aria-selected="true"` を付与します。
- `description` が与えられた場合、補助説明をアクセシビリティ上参照可能にします。
- 子要素コンテナは `role="group"` を持ちます。
- 収縮中の子要素コンテナはアクセシビリティツリー上も操作対象から除外します。

`aria-current` は安定契約に含めません。compound tree widget における現在位置表示は `selectedId` / `selected` により扱います。

`description` の内部 ID 生成方式や補助説明ノードの DOM 構造は実装詳細であり、安定契約に含めません。

### フォーカス契約

- 外部契約上の focus owner は `ui-tree-item` ホストです。
- 内部に `.item` などの実フォーカス対象を持つことは許容しますが、それは公開契約ではありません。
- `tabindex` はホスト属性として受理し、内部実装へ委譲できます。
- `document.activeElement` の内部詳細に依存してはなりません（MUST NOT）。

### リンク統合契約

`href` は、リーフ項目がナビゲーション先を持つことを表す宣言的入力です。ただし、`ui-tree-item` の主操作はあくまで **行レベルの integration event の通知**であり、遷移そのものは `ui-file-tree` または上位責務です。

---

## Visual Contract

`ui-tree-item` の視覚契約は、階層情報、現在位置表示、起動可能性を、読書体験を阻害しない範囲で識別可能に表現することにあります。

### 情報順位

- 展開アイコンはブランチかどうかを示します。
- アイコンは補助表現です。
- ラベルが主情報です。
- `description` は主ラベルに従属する補助情報です。
- `end` 領域は件数や状態などの補助情報を示します。
- `selected` は行背景・文字色・経路強調に反映します。
- 構造線は主役ではなく補助です。

### 行レイアウト

行は、展開アイコン、補助アイコン、ラベル領域、末尾補助領域を横並びに配置します。ラベル領域は主ラベルを中心とし、必要に応じて補助説明と一致強調を含みます。`end` 領域は残余情報を収める補助面であり、主操作面を置き換えません。

行本体の一次レイアウト責務は `ui-tree-item` 自身が持たなければなりません（MUST）。  
tooltip、popover、menu trigger などの補助 UI 用 wrapper が、行全体の幅解決・flex 参加・インデント基準の主語になってはなりません（MUST NOT）。

補助 UI を導入する場合は、行全体ではなく主ラベル領域または末尾補助領域のような局所領域に限定して適用します。これにより、tree row の横幅計算、トランケーション、子グループのインデント整合を安定化します。

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

`matchRanges` が与えられた場合、`ui-tree-item` は `label` の一致区間だけを視覚的に強調できます。ただし、強調は主ラベルの可読性を壊してはなりません。

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
| ルーティング確定                            | しない         | 上位アプリケーションが担当                      |

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

### 9. 行全体を補助 UI wrapper で包んだ場合

公開契約外です。tooltip、popover、menu trigger などの補助 UI wrapper が行全体の幅解決主体になってはなりません。行本体の一次レイアウト責務は `ui-tree-item` 自身が持たなければなりません（MUST）。

補助 UI を導入する場合は、主ラベル領域または末尾補助領域のような局所領域に限定します。行全体を wrapper で包んだ場合、ラベルのトランケーション、行背景、選択表示、子グループのインデント整合は保証しません。

---

## Storybook 契約

各 Story は見本ではなく、`ui-file-tree` と整合した契約確認点として扱います。

| Story                      | 固定する契約                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Default`                  | `role="treeitem"` と `aria-level="1"` を持つこと                                                                     |
| `Selected`                 | `selected=true` で selected 表示と `aria-selected="true"` が成立すること                                             |
| `WithChildren`             | ブランチで `aria-expanded` を持つこと                                                                                |
| `DeepNesting`              | direct child ネストに応じて `aria-level` が正しく増加すること                                                        |
| `Collapsed`                | 収縮時に子要素が操作対象から除外されること                                                                           |
| `SelectedAndExpanded`      | selected と展開状態を同時に保持できること                                                                            |
| `LongLabel`                | 省略時のみ補助表示が有効になること                                                                                   |
| `WithDescription`          | `description` が補助説明として表現され、主ラベルを代替しないこと                                                     |
| `CustomIconSlot`           | `icon` スロットによる補助アイコン表示ができること                                                                    |
| `EndSlot`                  | `end` スロットが補助情報専用として表示され、主操作面を侵食しないこと                                                 |
| `MatchRanges`              | `matchRanges` により `label` の一致区間だけを強調できること                                                          |
| `LeafNode`                 | リーフでは `aria-expanded` を持たず、`expanded=true` 入力が正規化されること                                          |
| `PrimaryActionRequest`     | 行クリック、`Enter`、`Space` で `tree-item-primary-action-request` を通知すること                                    |
| `ExpandControlRequest`     | 展開アイコンクリックで `tree-item-expanded-request` のみを通知すること                                               |
| `KeyboardBranchNavigation` | `ArrowRight` / `ArrowLeft` の integration event 契約が成立すること                                                   |
| `TabIndexDelegation`       | ホスト `tabindex` が実フォーカス対象へ反映されること                                                                 |
| `AllDensities`             | `normal` 32px / `compact` 24px の視覚高さを持つこと                                                                  |
| `CompactTouchTarget`       | `compact` でも最小操作領域が 44px 以上であること                                                                     |
| `ForcedColorsMode`         | 強制カラー環境で selected 表示、補助説明、フォーカスが維持されること                                                 |
| `ReducedMotion`            | reduced motion 相当で遷移時間が極小化されること                                                                      |
| `RealWorldFileTree`        | selected ノードの経路強調、補助情報、ラベル強調が同居しても破綻なく表現できること                                    |
| `RowLayoutIsolation`       | tooltip 等の補助 UI を併用しても、行本体が幅解決の主語であり、ラベル位置・末尾補助情報・子グループ位置が崩れないこと |

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
