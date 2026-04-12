# File Tree

## 概要

本書は、`ui-file-tree` の安定契約を定義するものです。ここでいう契約は、現行実装の偶然的な振る舞いを説明するためのものではなく、将来にわたって設計のきれいさと保守性を維持するための基準です。

ただし、2026-04 の note sidebar 移行以降、**note sidebar の正本は `layout-sidebar` light DOM 内の server-first navigation** です。`ui-file-tree` は design-system component として維持しますが、note sidebar の core correctness を直接担う正規経路ではありません。

`ui-file-tree` は、階層化された構造を表示するだけの一覧ではありません。**現在位置の提示**、**展開状態の管理**、**tree としてのキーボード移動**、**本文読解を妨げない視覚表現**を一体として提供する、補助ナビゲーション用コンポーネントです。

Rouault における file tree は、本文より強く主張してはなりません。一方で、読者が現在位置を見失わないだけの一貫性と操作性は保持しなければなりません（MUST）。このため、本契約では**構造データ**と**UI 状態**を分離し、**ノード種別**と**親子責務**を明確に定義します。

本書で規定する内容と現行実装が一致しない場合、**長期的な正規契約としては本書を優先**します。現行実装との差分は末尾に整理します。

---

## 適用範囲

本書は、`ui-file-tree` の次の事項を対象とします。

- 公開契約
- データモデル
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 現行実装との差分

本書は、次の事項を対象外とします。

- ノート階層そのものの生成規則
- slug 正規化や router の上位設計
- `ui-tree-item` 単体の詳細契約
- 検索、仮想化、遅延ロード、ドラッグアンドドロップ
- `reveal(id)` / `revealSelected()` のような可視化専用公開 API
- `expandAll()` / `collapseAll()` のような一括補助操作
- 印刷時の追加オプション入力（例: `printExpandBehavior`）
- 複数選択
- インライン rename
- tree 内検索の内蔵
- サーバーサイドのデータ取得戦略
- 永続化形式や保存先の仕様

これらは上位レイヤ、別契約、または別コンポーネントとして扱うべき事項です。

---

## 設計原則

`ui-file-tree` は、次の原則に従って設計します。

- **構造データは不変入力として扱います。** コンポーネントは入力ノードをインプレースで変更しません。
- **構造と UI 状態を分離します。** ノード自身は `selected` や `expanded` を持ちません。
- **ノード種別を型で表現します。** 葉ノードと親ノードを曖昧な optional field の組み合わせで表現しません。
- **選択状態とフォーカス状態を分離します。** 現在位置と一時フォーカスは別概念として扱います。
- **tree ルートが判断し、tree item は通知します。** 階層移動の意味決定は `ui-file-tree` 側の責務です。
- **視覚上のバリアントと意味上の挙動を分離します。** 印刷可否や選択可否を `variant` に埋め込みません。
- **読書体験を優先します。** 過度なアニメーション、不要な視覚強調、誤操作しやすい複合操作面は採用しません。

---

## 規範語彙

本書では、要求水準を次の語で表します。

- **MUST**: 必須要件です。満たさない実装は本契約に準拠しません。
- **MUST NOT**: 禁止要件です。これに反する実装は本契約に準拠しません。
- **SHOULD**: 推奨要件です。特段の理由がない限り従うべきです。
- **SHOULD NOT**: 非推奨要件です。特段の理由がない限り採用すべきではありません。
- **MAY**: 任意要件です。採用してもしなくても構いません。

本書における叙述文は、特段の明示がない限り説明または注記であり、単独では拘束力を持ちません。拘束力を持つ要件は、原則として上記の規範語を用いて記述します。

既定値を示す場合は「既定値は ... です」ではなく、「... を指定しない場合、... でなければなりません（MUST）」の形式で記述します。

無効値の扱いを示す場合は「無視します」「扱います」ではなく、「... の場合、... しなければなりません（MUST）」または「... してはなりません（MUST NOT）」の形式で記述します。

---

## 公開契約

`ui-file-tree` は、**不変の構造入力**と、**外部から与えられる選択・展開状態**、および**内部で管理されるアクティブ状態**から構成されます。

### データモデル契約

`items` は、次の `TreeNode` 配列を受け取ります。

```ts
type TreeIcon = string;

interface TreeNodeBase {
  id: string;
  label: string;
  icon?: TreeIcon;
}

interface BranchNode extends TreeNodeBase {
  kind: 'branch';
  children: readonly TreeNode[];
  href?: never;
}

interface LeafNode extends TreeNodeBase {
  kind: 'leaf';
  href: string;
  children?: never;
}

type TreeNode = BranchNode | LeafNode;
```

#### TreeNode 契約

| 名前       | 種別                  | 必須            | 内容         | 契約                                                           |
| ---------- | --------------------- | --------------- | ------------ | -------------------------------------------------------------- |
| `kind`     | `'branch' \| 'leaf'`  | はい            | ノード種別   | `branch` と `leaf` を明示的に区別しなければなりません（MUST）  |
| `id`       | string                | はい            | ノード識別子 | tree 全体で一意かつ安定でなければなりません（MUST）            |
| `label`    | string                | はい            | 表示ラベル   | type-ahead の照合対象です                                      |
| `icon`     | `TreeIcon`            | いいえ          | アイコン表現 | 現時点では string を受理します。意味解釈は視覚補助に限定します |
| `children` | `readonly TreeNode[]` | `branch` で必須 | 子ノード列   | `branch` のみが持ちます                                        |
| `href`     | string                | `leaf` で必須   | 遷移先       | `leaf` のみが持ちます                                          |

### ノード種別契約

- `branch` と `leaf` は排他的でなければなりません（MUST）。
- `href` と `children` を同時に持つノードは不正入力として扱わなければなりません（MUST）。
- `leaf` は子ノードを持ってはなりません（MUST NOT）。
- `branch` は直接遷移先を持ってはなりません（MUST NOT）。

#### Rouault 固有制約

本契約は、一般的な tree UI の完全な汎用契約ではなく、Rouault におけるノート木を前提としたコンポーネント契約です。したがって、次の制約を Rouault 固有制約として採用します。

- `branch` は 1 件以上の `children` を持たなければなりません（MUST）。
- `children=[]` の `branch` は不正入力として扱わなければなりません（MUST）。
- 空ディレクトリ、未ロード branch、カテゴリページ branch を表したい場合は、将来の別契約で明示的に拡張しなければなりません（MUST）。

### 入力契約

| 名前                 | 種別                                      | 必須   | 内容                          | 契約                                                       |
| -------------------- | ----------------------------------------- | ------ | ----------------------------- | ---------------------------------------------------------- |
| `items`              | property                                  | はい   | 不変の tree 構造              | `readonly TreeNode[]` として与えなければなりません（MUST） |
| `selectedId`         | property / attribute (`selected-id`)      | いいえ | 現在位置に対応する葉ノード ID | 選択なしは `null` で表さなければなりません（MUST）         |
| `expandedIds`        | property                                  | いいえ | 展開中 branch の ID 集合      | `ReadonlySet<string>` として与えなければなりません（MUST） |
| `defaultExpandedIds` | property                                  | いいえ | 初期展開 branch の ID 集合    | `ReadonlySet<string>` として与えなければなりません（MUST） |
| `variant`            | property / attribute                      | いいえ | 視覚バリアント                | `default` または `card` のみを受理します                   |
| `density`            | property / attribute                      | いいえ | 行密度                        | `normal` または `compact` のみを受理します                 |
| `loading`            | property / attribute                      | いいえ | ローディング状態              | boolean として解釈しなければなりません（MUST）             |
| `loadingStrategy`    | property / attribute (`loading-strategy`) | いいえ | ローディング時の表示戦略      | `retain` または `replace` のみを受理します                 |
| `printable`          | property / attribute                      | いいえ | 印刷対象とするか              | boolean として解釈しなければなりません（MUST）             |
| `aria-label`         | attribute                                 | いいえ | tree のアクセシブル名         | `aria-labelledby` がない場合のみ利用されます               |
| `aria-labelledby`    | attribute                                 | いいえ | tree のアクセシブル名参照     | `aria-label` より優先されます                              |

### 状態主導権契約

- `selectedId` は外部状態でなければなりません（MUST）。
- `expandedIds` は controlled / uncontrolled の両方式を許容しても構いません（MAY）。
- `activeId` は内部状態でなければなりません（MUST）。公開入力として扱ってはなりません（MUST NOT）。
- 選択表示は `selectedId` のみに基づいて決定しなければなりません（MUST）。
- `activeId` は roving tabindex 用の内部フォーカス位置であり、選択意味を持ってはなりません（MUST NOT）。

### controlled / uncontrolled 契約

- `expandedIds` が与えられている場合、展開状態は controlled として扱わなければなりません（MUST）。
- `expandedIds` が与えられておらず、`defaultExpandedIds` のみが与えられている場合、展開状態は uncontrolled として扱わなければなりません（MUST）。
- `expandedIds` と `defaultExpandedIds` が同時に与えられた場合、`expandedIds` を優先しなければなりません（MUST）。

### 公開イベント

`ui-file-tree` は、要求イベントと確定イベントを区別しなければなりません（MUST）。

| 名前                     | detail                              | cancelable | 発火条件                   |
| ------------------------ | ----------------------------------- | ---------- | -------------------------- |
| `ui-tree-request-select` | `{ id: string }`                    | はい       | 葉ノード選択要求時         |
| `ui-tree-select`         | `{ id: string }`                    | いいえ     | 葉ノード選択確定後         |
| `ui-tree-request-toggle` | `{ id: string, expanded: boolean }` | はい       | branch 展開変更要求時      |
| `ui-tree-toggle`         | `{ id: string, expanded: boolean }` | いいえ     | branch 展開変更確定後      |
| `ui-tree-active-change`  | `{ id: string }`                    | いいえ     | アクティブ項目が変化した時 |

- すべての公開イベントは `bubbles: true` かつ `composed: true` で発火しなければなりません（MUST）。
- 公開イベントの `detail` に実ノード参照を含めてはなりません（MUST NOT）。
- 公開イベントの `detail` は最小限の snapshot のみを含めなければなりません（MUST）。

### 公開メソッド契約

`ui-file-tree` は、次のメソッドを公開しなければなりません（MUST）。

| 名前              | 内容                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `focus()`         | 現在のアクティブ項目へフォーカスを移します                                                |
| `focusSelected()` | `selectedId` に一致する項目へフォーカスを移します。一致がない場合は先頭可視項目へ移します |
| `focusFirst()`    | 先頭可視項目へフォーカスを移します                                                        |

- 外部利用者は Shadow DOM 内部構造の探索に依存してフォーカスを与えてはなりません（MUST NOT）。

### 属性反映契約

| property             | attribute          | reflect | 備考                                 |
| -------------------- | ------------------ | ------- | ------------------------------------ |
| `items`              | なし               | なし    | property 専用です                    |
| `selectedId`         | `selected-id`      | なし    | attribute は string のみを受理します |
| `expandedIds`        | なし               | なし    | property 専用です                    |
| `defaultExpandedIds` | なし               | なし    | property 専用です                    |
| `variant`            | `variant`          | あり    | `default` / `card`                   |
| `density`            | `density`          | あり    | `normal` / `compact`                 |
| `loading`            | `loading`          | あり    | boolean attribute として扱います     |
| `loadingStrategy`    | `loading-strategy` | あり    | `retain` / `replace`                 |
| `printable`          | `printable`        | あり    | boolean attribute として扱います     |

#### attribute から property への変換規則

- boolean attribute は、属性が存在する場合に `true`、存在しない場合に `false` と解釈しなければなりません（MUST）。
- `selected-id` attribute は、trim 後の非空文字列のみを有効値として扱わなければなりません（MUST）。
- `selected-id` attribute が空文字列または空白のみである場合、`selectedId = null` として扱わなければなりません（MUST）。
- `variant`、`density`、`loading-strategy` attribute は、trim 後の小文字文字列として解釈しなければなりません（MUST）。
- 列挙外の attribute 値を受け取った場合、対応する property は既定値へフォールバックしなければなりません（MUST）。
- 列挙外値を受け取った事実は、開発時に警告しても構いません（MAY）。

### ローカライズ契約

- `aria-label` または `aria-labelledby` によりアクセシブル名を外部から制御できなければなりません（MUST）。
- Empty State の表示文言は公開 API に含めてはなりません（MUST NOT）。
- 利用者は Empty State 文言の完全一致に依存してはなりません（MUST NOT）。

### 列挙外値・無効値の扱い

- `variant`、`density`、`loadingStrategy` は列挙値のみを正とし、列挙外値は既定値へフォールバックしなければなりません（MUST）。
- `selectedId` が存在しない `id`、または `branch` の `id` を指す場合、選択表示を行ってはなりません（MUST NOT）。
- `expandedIds` または `defaultExpandedIds` に `leaf` ノード ID が含まれている場合、その要素は無視しなければなりません（MUST）。
- `id` 重複は不正入力です。少なくとも開発時には検出し、警告しなければなりません（SHOULD）。
- `href` と `children` を同時に持つノード、`kind` と実体形状が一致しないノード、`children=[]` の `branch` は不正入力として扱わなければなりません（MUST）。
- 開発時には、少なくとも次の契約違反を検出し、警告または例外で報告すべきです（SHOULD）。
  - `id` 重複
  - `branch` / `leaf` の不正形状
  - `selectedId` が `leaf` を指していない状態
  - `expandedIds` または `defaultExpandedIds` に `leaf` が含まれる状態
  - 不明な列挙値

### 責務範囲

責務範囲には、tree ルートとしてのアクセシビリティ属性付与、可視ノード列の算出、展開状態の反映、ロービング tabindex によるフォーカス管理、type-ahead を含むキーボードナビゲーション、初期選択ノードへのスクロール、ローディング表示、印刷時の例外処理を含みます。

一方で、ノード永続化、URL 同期、検索、仮想化、ルーティング、右クリックメニュー、複数選択、ドラッグアンドドロップは責務に含みません。

---

## 状態モデル

`ui-file-tree` の主要状態は、**可視ノード列**、**選択状態**、**展開状態**、**アクティブ状態**、**ローディング状態**の組み合わせで定まります。

### 基本状態

最小状態は、`items` に 1 件以上のノードを持ち、`variant="default"`、`density="normal"`、`loading=false` の状態です。

### 選択状態

`selectedId` は、tree 上の**現在位置に対応する選択状態**を表します。

- `selectedId` は、`leaf` ノードのみを指します。
- 同時に複数選択を持ちません。
- `selectedId` が未指定でも描画は成立します。

### 展開状態

展開状態は `branch` ノード単位で管理します。

- controlled 利用時は `expandedIds` を正とします。
- uncontrolled 利用時は `defaultExpandedIds` を初期値として内部管理します。
- `selectedId` を可視化するための親パス自動展開は、**表示補助としてのみ**行います。外部 controlled 状態を暗黙に書き換えてはなりません（MUST NOT）。
- controlled 利用時に選択項目の可視化が必要な場合、外部の `expandedIds` とは別に、内部の補助的な可視化用展開集合（例: `effectiveExpandedIds`）を導出して扱います。外部状態そのものを変更してはなりません（MUST NOT）。

### アクティブ状態

`activeId` は内部状態であり、roving tabindex の対象を表します。

- `activeId` は `selectedId` と独立です。
- Arrow 操作では原則として `activeId` のみ変化します。
- `Enter` または `Space` により、アクティブ項目に対する選択または展開が確定します。

### ローディング状態

ローディング中の表示戦略は `loadingStrategy` により決まります。

| 戦略      | 内容                                           |
| --------- | ---------------------------------------------- |
| `retain`  | 既存の tree を維持したまま busy 状態を表します |
| `replace` | tree を skeleton へ置き換えます                |

既定値は `retain` です。読書中の位置認識を失わせにくいためです。

### Empty State

`loading=false` かつ `items.length===0` の場合、Empty State を表示します。Empty State は補助情報であり、操作主体ではありません。

### 印刷状態

`printable=true` の場合、印刷時には tree を表示対象に含めなければなりません（MUST）。

- 印刷時には、現在位置および階層構造が判読可能でなければなりません（MUST）。
- 印刷時の展開方針は公開契約に含めません。
- 実装は、全展開表示、選択パス展開、現状維持のいずれを採っても構いません（MAY）。
- ただし、選択項目が存在する場合、その項目が印刷結果から消失してはなりません（MUST NOT）。
- 印刷可否は `variant` と独立でなければなりません（MUST）。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内に tree コンテナを持ち、可視ノード列に応じて `ui-tree-item` 群を描画します。

```text
<ui-file-tree role="tree" aria-orientation="vertical">
  #shadow-root
    <div class="container">
      [ui-tree-item ...]*
      または
      <div class="skeleton">...</div>
      または
      <div class="empty-state" role="status">…</div>
    </div>
</ui-file-tree>
```

### Accessibility 契約

- ルートホストは常に `role="tree"` を持たなければなりません（MUST）。
- ルートホストは常に `aria-orientation="vertical"` を持たなければなりません（MUST）。
- アクセシブル名は、利用者が `aria-label` または `aria-labelledby` により提供しなければなりません（MUST）。
- `aria-label` と `aria-labelledby` のどちらも与えられていない場合、コンポーネントはアクセシブル名を自動生成してはなりません（MUST NOT）。
- `loadingStrategy="retain"` かつ `loading=true` の場合、ルートホストに `aria-busy="true"` を付与しなければなりません（MUST）。
- Empty State は `role="status"` を持たなければなりません（MUST）。
- アクティブ項目は roving tabindex で一意に管理しなければなりません（MUST）。
- 選択状態は `selectedId` に一致する項目にのみ反映しなければなりません（MUST）。
- `activeId` は内部フォーカス位置であり、選択意味を持ってはなりません（MUST NOT）。

### キーボード契約

`ui-file-tree` は tree ルートとして次のキーボード意味論を持たなければなりません（MUST）。

| キー         | 振る舞い                                                |
| ------------ | ------------------------------------------------------- |
| `ArrowDown`  | 次の可視項目へ移動                                      |
| `ArrowUp`    | 前の可視項目へ移動                                      |
| `ArrowRight` | `branch` なら展開し、展開済みなら先頭子へ移動           |
| `ArrowLeft`  | `branch` なら収縮し、収縮済みまたは `leaf` なら親へ移動 |
| `Home`       | 最初の可視項目へ移動                                    |
| `End`        | 最後の可視項目へ移動                                    |
| `Enter`      | アクティブ項目の主操作を確定                            |
| `Space`      | アクティブ項目の主操作を確定                            |
| 文字入力     | type-ahead による前方一致検索                           |

- `leaf` に対する主操作は選択でなければなりません（MUST）。
- `branch` に対する主操作は展開 / 収縮でなければなりません（MUST）。
- `branch` を選択対象として扱ってはなりません（MUST NOT）。
- `Enter` と `Space` は同一の主操作確定キーとして扱わなければなりません（MUST）。

### type-ahead 契約

- 一定時間内の連続文字入力をバッファ連結し、前方一致検索を行わなければなりません（MUST）。
- 検索開始位置は現在のアクティブ項目の次でなければなりません（MUST）。
- 一周して一致がなければ移動してはなりません（MUST NOT）。
- 比較前に Unicode 正規化を行わなければなりません（MUST）。
- 大文字 / 小文字の差は比較時に無視しなければなりません（MUST）。
- 前後空白は比較前に除去しなければなりません（MUST）。

#### 日本語ラベルに対する追加契約

Rouault は日本語ノートを主要対象とするため、実装は少なくとも次を考慮しなければなりません（SHOULD）。

- 全角 / 半角の差
- かな / カナの差
- 濁点結合の差

これらを完全一致で扱えない場合でも、少なくとも Unicode 正規化と前後空白除去は必須です（MUST）。

### フォーカス復帰契約

- `Escape` による外部要素へのフォーカス復帰は、標準 tree の必須契約には含めません。
- Rouault の製品方針として採用する場合でも、任意機能として扱わなければなりません（MAY）。
- 採用する場合、対象要素が DOM 上に存在し、かつ programmatic focus 可能な場合にのみ復帰を試みても構いません（MAY）。
- 復帰失敗を理由に例外を送出してはなりません（MUST NOT）。

---

## Visual Contract

`ui-file-tree` の視覚契約は、本文読解を妨げない補助ナビゲーションであることにあります。したがって、本節では印象語ではなく、状態差分と検証可能な表現差を定義します。

### 視覚状態の優先順位

- 通常状態は基底状態です。
- 選択状態は通常状態より高い視認優先度を持たなければなりません（MUST）。
- アクティブ状態は、キーボード操作中にのみ明確に知覚できれば足ります。
- 選択状態とアクティブ状態が同時に成立する場合、両者を識別できなければなりません（MUST）。
- Empty State および Skeleton は主操作面として見えてはなりません（MUST NOT）。

### コンテナ仕様

#### `variant="default"`

- 背景は transparent でなければなりません（MUST）。
- 常設 border を持ってはなりません（MUST NOT）。
- 余白は最小限でなければなりません（MUST）。

#### `variant="card"`

- 背景を持たなければなりません（MUST）。
- 境界線を持たなければなりません（MUST）。
- 角丸を持たなければなりません（MUST）。
- 影は任意ですが、付与する場合でも 1 層に限定すべきです（SHOULD）。
- `variant` の違いは視覚差に限られ、意味論を変更してはなりません（MUST NOT）。

### 選択状態

- 選択状態は通常状態と視認上区別できなければなりません（MUST）。
- 選択状態の識別は、色差だけに依存してはなりません（MUST NOT）。
- 選択状態は、背景・前景・境界・ウェイトのうち少なくとも 2 要素で差を持つべきです（SHOULD）。

### アクティブ状態

- アクティブ状態は、roving tabindex に対応するフォーカスリングまたは同等の非色依存表現で示さなければなりません（MUST）。
- アクティブ状態の表現は、通常状態および選択状態と識別可能でなければなりません（MUST）。
- ポインター操作のみの利用時に常時強調してはなりません（SHOULD NOT）。

### Empty State

- Empty State は中央寄せでなければなりません（MUST）。
- Empty State は補助前景色で表示しなければなりません（MUST）。
- CTA、装飾アイコン、アニメーションを必須としてはなりません（MUST NOT）。

### Loading

- `retain` では既存 tree を可視のまま維持しなければなりません（MUST）。
- `replace` では tree を skeleton に置き換えなければなりません（MUST）。
- Skeleton は複数行の縦積みでなければなりません（MUST）。
- Skeleton の各行高は通常行高と概ね一致しなければなりません（SHOULD）。
- `prefers-reduced-motion: reduce` ではアニメーションを停止または極小化しなければなりません（MUST）。

### 密度契約

- `density="normal"` と `density="compact"` は視認可能な行高差を持たなければなりません（MUST）。
- ただし `compact` であっても、キーボードフォーカスリングと選択状態が判読不能になってはなりません（MUST NOT）。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途           | トークン                                |
| -------------- | --------------------------------------- |
| フォント       | `--font-sans`                           |
| 基本文字サイズ | `--text-sm`                             |
| 基本前景色     | `--fg-muted`                            |
| 補助前景色     | `--fg-subtle`                           |
| Card 背景      | `--bg-surface-2`                        |
| 境界線         | `--border-default`                      |
| 境界線幅       | `--border-width`                        |
| 角丸           | `--radius-md` / `--radius-sm`           |
| シャドウ       | `--elevation-md`                        |
| 余白           | `--space-2` / `--space-4` / `--space-8` |
| Skeleton 背景  | `--skeleton-bg`                         |
| Skeleton 高さ  | `--control-height-md`                   |

### スタイル拡張契約

- `ui-file-tree` は `::part(...)` を公開しません。
- 外部拡張は CSS Custom Properties、ホスト属性、配置コンテナ側スタイルに限定します。
- 内部 class 名や DOM 構造への依存は公開契約外です。

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、移動時スクロールおよびローディング表現を、動きに依存しない表現へ切り替えなければなりません（MUST）。

### Dark Mode

`prefers-color-scheme: dark` 環境では、通常状態、選択状態、アクティブ状態の識別が維持されなければなりません（MUST）。  
識別は色差のみに依存してはなりません（MUST NOT）。

### Forced Colors

`forced-colors: active` 環境では、システムカラーを優先します。

- 背景は `Canvas`、前景は `CanvasText` を正とします。
- box-shadow は装飾ではなく可読性を阻害するため、除去します。

### Print

`@media print` では、`printable=true` の tree のみ表示対象としなければなりません（MUST）。

- 背景色とシャドウは、可読性を阻害する場合には除去すべきです（SHOULD）。
- 境界線中心の表現へ切り替えても構いません（MAY）。
- 印刷可否は `variant` と独立でなければなりません（MUST）。
- 印刷時の展開アルゴリズムは本契約では固定しません。

---

## 関連契約

### データ更新契約

`items` 更新時には、次の順序で内部状態を再計算します。

1. 可視ノード列を再計算
2. `selectedId` の可視性を確認
3. 内部 `activeId` を妥当な可視ノードへ補正
4. 初期スクロール条件を再判定

構造更新は、選択状態や展開状態を書き戻す契機ではありません。

### 選択変更契約

`leaf` への選択要求時には `ui-tree-request-select` を発火し、キャンセルされなければ `ui-tree-select` を発火します。`selectedId` 自体の更新主導権は外部側にあります。

### 展開変更契約

`branch` の展開変更要求時には `ui-tree-request-toggle` を発火し、キャンセルされなければ `ui-tree-toggle` を発火します。controlled 利用時は外部 state 更新により再描画されます。

### スクロール契約

- アクティブ項目または選択項目が不可視である場合、利用者が現在位置を認識できるよう可視化しなければなりません（MUST）。
- 可視化は、対象項目が表示領域内に入ることを結果として保証すれば足ります。
- どのスクロールコンテナを利用するか、どの API を用いるかは公開契約に含めません。
- 初期可視化では、アニメーションよりも位置認識の確実性を優先しなければなりません（SHOULD）。
- 利用者操作に伴う可視化では、通常環境でアニメーションを用いても構いません（MAY）。
- `prefers-reduced-motion: reduce` 環境では、アニメーションに依存してはなりません（MUST NOT）。

### `ui-tree-item` との責務分界契約

- `ui-file-tree` は階層意味論、可視ノード列、フォーカス移動、選択 / 展開の判断を担います。
- `ui-tree-item` は単一行の表示と、ユーザー操作の通知を担います。
- 左右キー、Enter、Space の最終意味決定は `ui-file-tree` 側が担います。
- `ui-file-tree` は、branch の子ノード列を `ui-tree-item` の `children` スロットに対する `slot="children"` 付きの**直接の `ui-tree-item` 子要素**として構成しなければなりません（MUST）。
- ラッパー要素の挿入、任意要素の混在、複数階層をまたぐラッピングは公開契約に含めません。
- `ui-tree-item` は、`ui-file-tree` の compound child として扱います。`ui-file-tree` が tree 全体の意味論と状態を所有し、`ui-tree-item` は単一行の表示と low-level な操作通知を担います。

#### `integration event` から root 公開イベントへの橋渡し契約

- `ui-file-tree` は、`ui-tree-item` から受け取った integration event の発火元を event target となった `ui-tree-item` host から特定し、対応する node の `id` を解決しなければなりません（MUST）。
- `ui-tree-item` が `tree-item-primary-action-request` を通知した場合、`ui-file-tree` はノード種別に応じて意味を決定します。
- `leaf` に対する `tree-item-primary-action-request` は、`ui-tree-request-select` を経て、キャンセルされなければ `ui-tree-select` へ橋渡しします。
- `branch` に対する `tree-item-primary-action-request` は、`ui-tree-request-toggle` を経て、キャンセルされなければ `ui-tree-toggle` へ橋渡しします。
- `ui-tree-item` が `tree-item-expanded-request` を通知した場合、`ui-file-tree` は発火元 branch の `id` を解決したうえで、`ui-tree-request-toggle` / `ui-tree-toggle` へ橋渡しします。
- `ui-tree-item` が `tree-item-focus-first-child-request` または `tree-item-focus-parent-request` を通知した場合、`ui-file-tree` は発火元行を基点に移動先 `id` を解決し、`activeId` を更新し、必要に応じて `ui-tree-active-change` を発火します。

---

## 境界条件

### 空配列入力

`items=[]` かつ `loading=false` の場合、Empty State を表示します。

### 無効な `selectedId`

`selectedId` が存在しない、または `leaf` を指さない場合、選択表示は成立しません。コンポーネントは自動で別 ID を選びません。

### 無効な `expandedIds`

`expandedIds` または `defaultExpandedIds` に `leaf` ノード ID が含まれている場合、その要素は無視します。

### ID 重複

`id` 重複は不正入力です。少なくとも開発時には検出し、警告しなければなりません（SHOULD）。

### 不正なノード形状

次のノード形状は不正入力です。

- `href` と `children` を同時に持つノード
- `kind='leaf'` で `href` を欠くノード
- `kind='branch'` で `children` を欠くノード
- `kind` と実体形状が一致しないノード

少なくとも開発時には検出し、警告または例外で報告すべきです（SHOULD）。

### `branch` の空配列子

`children=[]` の `branch` は不正入力です。正規契約では、`branch` は 1 件以上の子ノードを持たなければなりません（MUST）。未ロード状態の表現にも用いません。

### `printable=false`

`printable=false` の場合、`variant` にかかわらず印刷対象にしません。

### ローディング戦略 `retain`

`retain` では既存 tree を維持するため、Empty State と Skeleton を同時表示しません。

### ローディング戦略 `replace`

`replace` では既存 tree を skeleton に置き換えるため、選択可視性は一時的に失われます。

### 開発時バリデーションの扱い

開発時バリデーションは、利用者入力の誤りを早期に発見するための補助契約です。  
本番環境で同一水準の検証を必須とはしませんが、開発時には少なくとも契約違反を沈黙させない実装が望まれます（SHOULD）。

---

## Storybook 契約

Storybook は見本集ではなく、契約確認のための検証面を提供しなければなりません（MUST）。  
本契約で固定するのは Story 名ではなく、次の**検証観点**です。

### 必須検証観点

1. ルート意味論
   - `role="tree"` と `aria-orientation="vertical"` が成立すること。

2. 視覚バリアント
   - `variant="default"` と `variant="card"` の視覚差分が成立すること。

3. 密度差分
   - `density="normal"` と `density="compact"` の行高差が成立すること。

4. Empty State
   - `items=[]` かつ `loading=false` で `role="status"` を持つ Empty State が描画されること。

5. Loading
   - `loadingStrategy="retain"` で既存 tree を維持したまま busy 表示できること。
   - `loadingStrategy="replace"` で skeleton に置き換わること。

6. 深い階層
   - 深い階層でも `selectedId` に対応する現在位置を視認できること。

7. 多数項目
   - 多数項目でも基本操作が破綻しないこと。

8. イベント
   - request / commit 系イベントを監視できること。
   - `detail` が最小 snapshot に限定されていること。

9. キーボード
   - Arrow、Home、End、Enter、Space、type-ahead によるナビゲーションが成立すること。

10. 公開メソッド
    - `focus()`、`focusSelected()`、`focusFirst()` が動作すること。

11. Forced Colors
    - forced colors 環境で構造認識が維持されること。

12. Reduced Motion
    - reduced motion 環境でモーション依存が除去されること。

13. Print
    - `printable=true` の場合のみ印刷対象となること。

### Story 構成方針

- 上記観点を 1 Story 1 観点で分けても、複数観点を matrix 化しても構いません（MAY）。
- Story 名、Story 数、ファイル構成は公開契約に含めません。
- ただし、上記検証観点が失われてはなりません（MUST NOT）。

---

## 補足

`ui-file-tree` の要点は、見た目の木構造そのものではありません。**不変の構造入力**、**外部が主導する選択 / 展開状態**、**内部が主導するアクティブ状態**を分離しながら、読書のための補助ナビゲーションとして一貫させることにあります。

特に重要なのは次の 5 点です。

1. `items` を不変構造として扱うこと。
2. `branch` と `leaf` を型で分けること。
3. `selectedId` と `activeId` を分離すること。
4. request / commit の二段階イベントで外部制御しやすくすること。
5. 視覚バリアントと印刷可否を独立させること。

---

## 実装追従メモ

2026-04 時点で、`ui-file-tree` の主要移行項目は本書へ追従済みです。

- `selectedId` / `expandedIds` / `activeId` の主導権は分離されています。
- `selectedId` 可視化のための補助展開は、controlled `expandedIds` を破壊せずに内部導出されます。
- `ui-tree-item` からは `tree-item-primary-action-request` / `tree-item-expanded-request` / focus request を受け、`ui-file-tree` が root 公開イベントへ橋渡しします。
- `activeId` は内部状態として保持され、可視ノード更新時には妥当な可視ノードへ補正されます。
- `focus()` / `focusSelected()` / `focusFirst()`、`loadingStrategy="retain" | "replace"`、`printable` の契約は実装と browser test により固定されています。

この節の役割は未完了差分の管理ではなく、実装が本書へ追従していることの確認にあります。将来差分が発生した場合は、ここへ暫定 TODO を蓄積するのではなく、browser test と該当契約節を先に更新してください。
- 遅延展開 / 非同期 branch ロード
- 印刷時の追加オプション入力
- 複数選択
- インライン rename
- tree 内検索の内蔵

これらは `ui-file-tree` の正規契約へ直ちに含めるべき機能ではなく、必要になった場合でも上位レイヤ、別契約、または別コンポーネントとして分離して扱うことを優先します。

### 本節の扱い

本節に記載した差分は、将来の実装修正対象です。正規契約へ合わせる場合は、実装、Storybook、契約書を同時に更新する必要があります。

### 本節の扱い

本節に記載した差分は、将来の実装修正対象です。正規契約へ合わせる場合は、実装、Storybook、契約書を同時に更新する必要があります。
