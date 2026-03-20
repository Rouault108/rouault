# File Tree

## 概要

本書は、`ui-file-tree` の**長期的な正規契約**を定義するものです。ここでいう契約は、現行実装の偶然的な振る舞いを説明するためのものではなく、将来にわたって設計のきれいさと保守性を維持するための基準です。

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
- サーバーサイドのデータ取得戦略
- 永続化形式や保存先の仕様

これらは上位レイヤまたは別契約の責務です。

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

## 公開契約

`ui-file-tree` は、**不変の構造入力**と、**外部から与えられる選択・展開状態**、および**内部で管理されるアクティブ状態**から構成されます。

### データモデル契約

`items` は、次の `TreeNode` 配列を受け取ります。

```ts
interface TreeNodeBase {
  id: string;
  label: string;
  icon?: string;
}

interface BranchNode extends TreeNodeBase {
  kind: 'branch';
  children: TreeNode[];
}

interface LeafNode extends TreeNodeBase {
  kind: 'leaf';
  href: string;
}

type TreeNode = BranchNode | LeafNode;
```

#### TreeNode 契約

| 名前 | 種別 | 必須 | 内容 | 契約 |
| --- | --- | --- | --- | --- |
| `kind` | `'branch' \| 'leaf'` | はい | ノード種別 | `branch` と `leaf` を明示的に区別します |
| `id` | string | はい | ノード識別子 | tree 全体で一意、かつ安定でなければなりません（MUST） |
| `label` | string | はい | 表示ラベル | type-ahead の照合対象です |
| `icon` | string | いいえ | アイコン名 | 視覚補助用です |
| `children` | `TreeNode[]` | `branch` で必須 | 子ノード列 | 空配列を許容しますが、遅延ロード状態の表現には使いません |
| `href` | string | `leaf` で必須 | 遷移先 | 葉ノードのみが持ちます |

### ノード種別契約

`branch` と `leaf` は排他的です。

- `branch` は展開可能ですが、直接遷移先を持ちません。
- `leaf` は遷移先を持ちますが、子ノードを持ちません。
- `href` と `children` を同時に持つノードは、正規契約では**不正入力**です。

これにより、展開操作と遷移操作の意味を 1 行の中で混在させません。

### 入力契約

| 名前 | 種別 | 必須 | 内容 | 契約 |
| --- | --- | --- | --- | --- |
| `items` | property | はい | 不変の tree 構造 | 入力ノードはインプレースで変更されません |
| `selectedId` | property / attribute (`selected-id`) | いいえ | 現在選択中の葉ノード ID | 現在位置を表します。`null` 相当を許容します |
| `expandedIds` | property | いいえ | 展開中 branch の ID 集合 | controlled 利用時に与えます |
| `defaultExpandedIds` | property | いいえ | 初期展開 branch の ID 集合 | uncontrolled 利用時の初期値です |
| `variant` | property / attribute | いいえ | 視覚バリアント | `default` / `card` |
| `density` | property / attribute | いいえ | 行密度 | `normal` / `compact` |
| `loading` | property / attribute | いいえ | ローディング状態 | 既定値は `false` です |
| `loadingStrategy` | property / attribute (`loading-strategy`) | いいえ | ローディング時の表示戦略 | `retain` / `replace`。既定値は `retain` です |
| `printable` | property / attribute | いいえ | 印刷対象とするか | `variant` とは独立です |
| `aria-label` | attribute | いいえ | tree のアクセシブル名 | `aria-labelledby` がない場合に使用できます |
| `aria-labelledby` | attribute | いいえ | tree のアクセシブル名参照 | `aria-label` より優先されます |

### 状態主導権契約

`ui-file-tree` は、次の主導権分離を前提とします。

- `selectedId` は**外部状態**です。
- `expandedIds` は controlled / uncontrolled の両方を許容します。
- `activeId` は**内部状態**です。公開入力として扱いません。

したがって、`ui-file-tree` は `selectedId` に基づいて現在位置を描画しますが、roving tabindex 用の一時フォーカス位置は内部で保持します。

### controlled / uncontrolled 契約

展開状態は、次の 2 方式を許容します。

- **controlled**: `expandedIds` を与え、変更通知を受けて外部 state を更新します。
- **uncontrolled**: `defaultExpandedIds` を与え、以後はコンポーネント内部で展開状態を保持します。

`expandedIds` と `defaultExpandedIds` を同時に与える場合、`expandedIds` を優先します。

### 公開イベント

`ui-file-tree` は、要求イベントと確定イベントを区別します。

| 名前 | detail | cancelable | 発火条件 |
| --- | --- | --- | --- |
| `ui-tree-request-select` | `{ id: string }` | はい | 葉ノード選択要求時 |
| `ui-tree-select` | `{ id: string }` | いいえ | 葉ノード選択確定後 |
| `ui-tree-request-toggle` | `{ id: string, expanded: boolean }` | はい | branch 展開変更要求時 |
| `ui-tree-toggle` | `{ id: string, expanded: boolean }` | いいえ | branch 展開変更確定後 |
| `ui-tree-active-change` | `{ id: string }` | いいえ | アクティブ項目が変化した時 |

これらのイベントは `bubbles: true` かつ `composed: true` で発火します。公開イベントの `detail` は**最小限の snapshot**に限定し、実ノード参照は渡しません。

### 公開メソッド契約

`ui-file-tree` は、次のメソッドを公開します。

| 名前 | 内容 |
| --- | --- |
| `focus()` | 現在のアクティブ項目へフォーカスを移します |
| `focusSelected()` | `selectedId` に一致する項目へフォーカスを移します。一致がない場合は先頭可視項目へ移します |
| `focusFirst()` | 先頭可視項目へフォーカスを移します |

外部利用者は、Shadow DOM 内部構造を探索してフォーカスを与えることに依存してはなりません（MUST NOT）。

### 属性反映契約

| property | attribute | reflect | 備考 |
| --- | --- | --- | --- |
| `items` | なし | なし | property 専用です |
| `selectedId` | `selected-id` | なし | property を正とします |
| `expandedIds` | なし | なし | property 専用です |
| `defaultExpandedIds` | なし | なし | property 専用です |
| `variant` | `variant` | あり | `default` / `card` |
| `density` | `density` | あり | `normal` / `compact` |
| `loading` | `loading` | あり | boolean attribute として扱います |
| `loadingStrategy` | `loading-strategy` | あり | `retain` / `replace` |
| `printable` | `printable` | あり | boolean attribute として扱います |

### ローカライズ契約

- `aria-label` / `aria-labelledby` によりアクセシブル名を外部から制御できます。
- Empty State の表示文言は公開 API に含めません。
- 利用者は Empty State 文言の完全一致に依存してはなりません（MUST NOT）。

### 列挙外値・無効値の扱い

- `variant`、`density`、`loadingStrategy` は列挙値のみを正とします。
- `selectedId` が `leaf` ノードを指さない場合、選択表示は成立しません。
- `expandedIds` に `leaf` ノード ID が含まれていても無視します。
- `id` 重複は不正入力です。開発時には検出・警告すべきです（SHOULD）。

### 責務範囲

責務範囲には、tree ルートとしてのアクセシビリティ属性付与、可視ノード列の算出、展開状態の反映、ロービング tabindex によるフォーカス管理、type-ahead を含むキーボードナビゲーション、初期選択ノードへのスクロール、ローディング表示、印刷時の例外処理を含みます。

一方で、ノード永続化、URL 同期、検索、仮想化、ルーティング、右クリックメニュー、複数選択、ドラッグアンドドロップは責務に含みません。

---

## 状態モデル

`ui-file-tree` の主要状態は、**可視ノード列**、**選択状態**、**展開状態**、**アクティブ状態**、**ローディング状態**の組み合わせで定まります。

### 基本状態

最小状態は、`items` に 1 件以上のノードを持ち、`variant="default"`、`density="normal"`、`loading=false` の状態です。

### 選択状態

`selectedId` は、現在位置としての**選択状態**を表します。

- `selectedId` は、`leaf` ノードのみを指します。
- 同時に複数選択を持ちません。
- `selectedId` が未指定でも描画は成立します。

### 展開状態

展開状態は `branch` ノード単位で管理します。

- controlled 利用時は `expandedIds` を正とします。
- uncontrolled 利用時は `defaultExpandedIds` を初期値として内部管理します。
- `selectedId` を可視化するための親パス自動展開は、**表示補助としてのみ**行います。外部 controlled 状態を暗黙に書き換えてはなりません（MUST NOT）。

### アクティブ状態

`activeId` は内部状態であり、roving tabindex の対象を表します。

- `activeId` は `selectedId` と独立です。
- Arrow 操作では原則として `activeId` のみ変化します。
- `Enter` または `Space` により、アクティブ項目に対する選択または展開が確定します。

### ローディング状態

ローディング中の表示戦略は `loadingStrategy` により決まります。

| 戦略 | 内容 |
| --- | --- |
| `retain` | 既存の tree を維持したまま busy 状態を表します |
| `replace` | tree を skeleton へ置き換えます |

既定値は `retain` です。読書中の位置認識を失わせにくいためです。

### Empty State

`loading=false` かつ `items.length===0` の場合、Empty State を表示します。Empty State は補助情報であり、操作主体ではありません。

### 印刷状態

`printable=true` の場合、印刷時には tree を表示対象とします。印刷時の展開挙動は次のとおりです。

- 既定では、可視性を優先して**全展開表示**します。
- 印刷後には、画面用の展開状態へ復帰します。
- 印刷可否は `variant` と独立です。

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

- ルートホストは常に `role="tree"` を持ちます。
- ルートホストは常に `aria-orientation="vertical"` を持ちます。
- `aria-label` と `aria-labelledby` のどちらも未指定の場合、既定のアクセシブル名を設定します。
- `loadingStrategy="retain"` かつ `loading=true` の場合は `aria-busy="true"` を付与します。
- Empty State は `role="status"` を持ちます。
- アクティブ項目はロービング tabindex で一意に管理します。
- `Escape` により、直前の tree 外フォーカス要素へ復帰を試みます。

### キーボード契約

`ui-file-tree` は、tree ルートとして次のキーボード意味論を持ちます。

| キー | 振る舞い |
| --- | --- |
| `ArrowDown` | 次の可視項目へ移動 |
| `ArrowUp` | 前の可視項目へ移動 |
| `ArrowRight` | `branch` なら展開、展開済みなら先頭子へ移動 |
| `ArrowLeft` | `branch` なら収縮、収縮済みまたは `leaf` なら親へ移動 |
| `Home` | 最初の可視項目へ移動 |
| `End` | 最後の可視項目へ移動 |
| `Enter` | アクティブ項目の主操作を確定 |
| `Space` | アクティブ項目の補助操作または主操作を確定 |
| `Escape` | 直前の tree 外フォーカス要素へ復帰 |
| 文字入力 | type-ahead による前方一致検索 |

### 主操作契約

- `leaf` に対する主操作は**選択**です。
- `branch` に対する主操作は**展開 / 収縮**です。
- `branch` は直接遷移先を持たないため、選択対象として扱いません。

### type-ahead 契約

- 一定時間内の連続文字入力をバッファ連結し、前方一致検索を行います。
- 検索開始位置は現在のアクティブ項目の次です。
- 一周して一致がなければ移動しません。
- 大文字・小文字は区別しません。

### フォーカス復帰契約

tree 外部から tree 内へフォーカスが入ったとき、直前の外部要素を保持します。`Escape` 時は、その要素が DOM 上に残っていればそこへフォーカスを戻します。

---

## Visual Contract

`ui-file-tree` の視覚契約は、本文読解を妨げない補助ナビゲーションであることにあります。

### 情報順位

- `default` は背景を持たず、構造の存在を静かに示します。
- `card` は独立した補助ウィジェットとして認識しやすい表現を持ちます。
- 選択状態は、本文より強すぎないが見失わない程度の強度で示します。
- アクティブ状態は、キーボード利用時にのみ明確に知覚できれば足ります。
- Skeleton や Empty State は補助情報として控えめに表現します。

### コンテナ仕様

- `default` は transparent 背景、border なし、最小限の余白を持ちます。
- `card` は背景、境界線、角丸、必要最小限の影を持ちます。
- 視覚バリアントは意味論を変えません。

### Empty State

- 中央寄せです。
- 控えめな前景色を用います。
- CTA や装飾的アイコンを必須としません。

### Loading

- `retain` では既存 tree を維持しつつ busy 状態を示します。
- `replace` では縦積み skeleton を表示します。
- `prefers-reduced-motion: reduce` ではアニメーションを停止または極小化します。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途 | トークン |
| --- | --- |
| フォント | `--font-sans` |
| 基本文字サイズ | `--text-sm` |
| 基本前景色 | `--fg-muted` |
| 補助前景色 | `--fg-subtle` |
| Card 背景 | `--bg-surface-2` |
| 境界線 | `--border-default` |
| 境界線幅 | `--border-width` |
| 角丸 | `--radius-md` / `--radius-sm` |
| シャドウ | `--elevation-md` |
| 余白 | `--space-2` / `--space-4` / `--space-8` |
| 遷移時間 | `--duration-fast` |
| イージング | `--ease-out` |
| Skeleton 背景 | `--skeleton-bg` |
| Skeleton 高さ | `--control-height-md` |

### スタイル拡張契約

- `ui-file-tree` は `::part(...)` を公開しません。
- 外部拡張は CSS Custom Properties、ホスト属性、配置コンテナ側スタイルに限定します。
- 内部 class 名や DOM 構造への依存は公開契約外です。

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、移動時スクロールとローディングアニメーションを抑制します。

### Dark Mode

`prefers-color-scheme: dark` 環境では、境界認識を補助する最小限のハイライトを許容します。

### Forced Colors

`forced-colors: active` 環境では、システムカラーを優先します。

- 背景は `Canvas`、前景は `CanvasText` を正とします。
- box-shadow は装飾ではなく可読性を阻害するため、除去します。

### Print

`@media print` では、`printable=true` の tree のみ表示対象とします。

- 印刷時は全展開表示を既定とします。
- 背景色とシャドウは除去し、境界線中心の表現へ切り替えます。
- 印刷可否は `variant` と独立です。

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

アクティブ項目または選択項目の可視化には、最も近いスクロール可能祖先を探索して用います。

- tree 自身がスクロールコンテナであることは保証しません。
- 初期可視化は即時反映を優先します。
- ユーザー移動時は通常環境では smooth scroll を用います。
- `prefers-reduced-motion: reduce` 環境では即時反映へ切り替えます。

### `ui-tree-item` との責務分界契約

- `ui-file-tree` は階層意味論、可視ノード列、フォーカス移動、選択 / 展開の判断を担います。
- `ui-tree-item` は単一行の表示と、ユーザー操作の通知を担います。
- 左右キー、Enter、Space の最終意味決定は `ui-file-tree` 側が担います。

---

## 境界条件

### 空配列入力

`items=[]` かつ `loading=false` の場合、Empty State を表示します。

### 無効な `selectedId`

`selectedId` が存在しない、または `leaf` を指さない場合、選択表示は成立しません。コンポーネントは自動で別 ID を選びません。

### 無効な `expandedIds`

`expandedIds` に `leaf` ノード ID が含まれていても無視します。

### ID 重複

`id` 重複は不正入力です。開発時には警告または例外で検出することが望まれます（SHOULD）。

### `branch` の空配列子

`children=[]` の `branch` は許容します。ただし、未ロード状態の表現には用いません。

### `printable=false`

`printable=false` の場合、`variant` にかかわらず印刷対象にしません。

### ローディング戦略 `retain`

`retain` では既存 tree を維持するため、Empty State と Skeleton を同時表示しません。

### ローディング戦略 `replace`

`replace` では既存 tree を skeleton に置き換えるため、選択可視性は一時的に失われます。

---

## Storybook 契約

各 Story は見本ではなく、契約確認点として扱います。

| Story | 固定する契約 |
| --- | --- |
| `Default` | `role="tree"`、`aria-orientation="vertical"`、既定 `variant="default"` を満たすこと |
| `CardVariant` | `variant="card"` が受理されること |
| `CompactDensity` | `density="compact"` が受理されること |
| `EmptyState` | 空入力時に `role="status"` を持つ empty state を描画すること |
| `LoadingRetain` | `loadingStrategy="retain"` で既存 tree を保ったまま busy 表示できること |
| `LoadingReplace` | `loadingStrategy="replace"` で skeleton に置き換わること |
| `DeepNested` | `selectedId` に対応する現在位置を視認できること |
| `ManyItems` | 多数項目でも基本操作が成立すること |
| `VariantComparison` | `default` / `card` の視覚差分が成立すること |
| `DensityComparison` | `normal` / `compact` の密度差が成立すること |
| `EventHandling` | request / commit 系イベントを監視できること |
| `ForcedColorsMode` | forced colors 環境で構造が維持されること |
| `ReducedMotion` | reduced motion 環境でモーションが抑制されること |
| `PrintStyles` | `printable=true` の場合のみ印刷表示されること |
| `KeyboardNavigation` | Arrow、Home、End、Enter、Space、type-ahead、Escape によるナビゲーションが成立すること |
| `FocusMethods` | `focus()` / `focusSelected()` / `focusFirst()` が動作すること |

---

## 追加を検討する価値がある機能

本節は、`ui-file-tree` に将来的に追加を検討する価値がある機能を整理するものです。ここでいう「価値がある」とは、機能数を増やすこと自体ではなく、**契約を明確にし、外部制御しやすくし、読書体験を損なわないこと**を指します。

### 最優先で検討する価値がある機能

#### 公開フォーカスメソッド

次の公開メソッドは、最優先で検討する価値があります。

- `focus()`
- `focusSelected()`
- `focusFirst()`

現行実装では、外部から適切にフォーカスを入れるために Shadow DOM 内部構造へ依存しやすい状態です。公開メソッドを追加することで、内部 DOM 依存を避けながら、フォーカス導線を契約として固定できます。

#### 選択状態・展開状態の外部制御 API

次の入力面は、正式に追加または昇格させる価値があります。

- `selectedId`
- `expandedIds`
- `defaultExpandedIds`

これは機能追加であると同時に、構造入力と UI 状態を分離するための基盤です。router、sidebar、breadcrumb、URL 同期などの上位レイヤとの整合を取りやすくなります。

#### 可視化補助 API

深い階層を持つ tree では、現在位置や指定項目を確実に可視化する機能が重要です。次のような API は追加価値があります。

- `reveal(id: string)`
- `revealSelected()`

これらは、必要に応じて親パスを展開し、対象項目をスクロールコンテナ内へ可視化するための補助 API です。読者が現在位置を見失いにくくなるため、Rouault の文脈と整合します。

#### `loadingStrategy` の正式化

ローディング時の表示戦略を正式な公開機能として固定する価値があります。

- `retain`: 既存 tree を維持したまま busy 状態を示します。
- `replace`: tree を skeleton に置き換えます。

読書体験の観点では `retain` を既定とする方が自然です。一方で、完全更新を優先したい場面では `replace` に意味があります。戦略を明示的に選べるようにすることで、ローディング時の体験をページ特性に応じて調整できます。

#### 開発時バリデーション

開発時に次の不正状態を検出する機能は、追加価値が高いです。

- `id` 重複
- `branch` / `leaf` の不正形状
- `selectedId` が `leaf` を指していない状態
- `expandedIds` に `leaf` が含まれる状態
- 不明な列挙値

これは見た目の機能ではありませんが、契約違反を早期に発見し、利用側の誤用を抑止するうえで非常に有効です。

### 条件付きで検討する価値がある機能

#### 全展開・全収縮 API

次の公開メソッドは、条件付きで検討する価値があります。

- `expandAll()`
- `collapseAll()`

設定画面、デバッグ、印刷前確認などでは有用です。ただし、通常の読書体験において常用する中核機能ではありません。公開する場合も、主操作ではなく補助操作として扱います。

#### 遅延展開 / 非同期 branch ロード

大規模な tree を扱う場合、branch 単位で遅延ロードを行う機能は検討価値があります。ただし、これはデータモデルとローディング契約を拡張するため、ノート数や階層深度が実際に問題化した場合に限って採用するのが適切です。

採用する場合でも、次の点を別契約として明確化する必要があります。

- 未ロード branch の表現
- 読み込み中 branch の表現
- 失敗時の表示
- 再試行の責務

#### 印刷挙動の追加オプション

`printable` に加えて、印刷時の展開方針を選べる入力は条件付きで検討価値があります。

- `printExpandBehavior="expanded"`
- `printExpandBehavior="preserve"`

ただし、印刷は主機能ではないため、導入優先度は高くありません。まずは `printable` の意味契約を安定させる方を優先します。

### 追加を推奨しない機能

次の機能は、少なくとも現在の Rouault の文脈では追加を推奨しません。

- 複数選択
- ドラッグアンドドロップ
- インライン rename
- tree 内検索の内蔵
- 過度な装飾アニメーション

これらは file tree を作業主体の UI へ寄せやすく、本文読解を補助する静かなナビゲーションという役割から外れやすいためです。必要になった場合でも、`ui-file-tree` そのものではなく、上位機能または別コンポーネントとして分離する方が望まれます。

### 優先順位

長期的な観点では、追加優先順位は次の順が妥当です。

1. 公開フォーカスメソッド
2. 選択状態・展開状態の外部制御 API
3. 可視化補助 API
4. `loadingStrategy` の正式化
5. 開発時バリデーション
6. 全展開・全収縮 API
7. 遅延展開 / 非同期 branch ロード
8. 印刷挙動の追加オプション

この順であれば、機能追加がそのまま契約の整理につながりやすく、設計を不必要に複雑化しません。

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

## 現行実装との差分

本節は、現行の `file-tree.ts` および `file-tree.stories.ts` と本書の正規契約との差分を、**実装優先度順**に並べたものです。ここでいう優先度は、見た目の差分量ではなく、**後続の設計整理を可能にする土台であるか**、**他の差分の前提になるか**を基準に定めます。

### 優先度 1: 構造モデルと状態モデルの分離

#### 構造入力の可変性

現行実装は `items` 内の `selected` と `expanded` をインプレースで更新します。本書では、構造入力を不変とし、UI 状態を外部または内部 state に分離します。

#### ノード種別

現行実装の `TreeNode` は `href`、`children`、`selected`、`expanded` を optional field として同居させています。本書では `branch` / `leaf` の discriminated union を正とします。

#### `href` と `children` の両立

現行実装は `href` と `children` の同居を許容します。本書では誤操作を避けるため、両立を不正入力とします。

#### `items` の必須性

現行実装は `items` を省略可能な property として持ち、既定値 `[]` を用います。本書では、構造入力を常に明示的に与える前提で `items` を必須入力として扱います。

### 優先度 2: 選択・展開・アクティブ状態の主導権整理

#### `activeId` の扱い

現行実装は `activeId` を半制御入力として公開します。本書では `activeId` を内部状態とし、公開入力から外します。

#### 選択とフォーカスの関係

現行実装は選択時に `activeId` も同時更新します。本書では `selectedId` と `activeId` を別概念として分離します。

#### 葉ノード専用選択の未強制

現行実装は `selected-change` を受けたノードをそのまま選択状態にするため、`branch` を選択対象から除外していません。本書では、選択対象は `leaf` のみとし、`branch` の主操作は展開 / 収縮に限定します。

#### `activeId` の妥当性補正

現行実装は、`items` 更新時に `activeId` が空文字列である場合のみ selected 項目または先頭可視項目を採用します。既存の `activeId` が新しい可視ノード集合に存在しない場合でも、自動補正は行いません。本書では、内部 `activeId` は妥当な可視ノードへ補正される前提です。

### 優先度 3: イベント設計と責務分界の整理

#### イベント設計

現行実装は状態更新後の通知イベントを中心とし、一部で実ノード参照を detail に含みます。本書では request / commit を分離し、detail は最小 snapshot に限定します。

#### `ui-tree-focus-change` の発火条件

現行実装の `ui-tree-focus-change` は、主として root 側のキーボード移動で `_moveFocus()` が呼ばれた時にのみ発火します。選択操作に伴う `activeId` 更新、初期化時の `activeId` 決定、外部からの `activeId` 変更では、同等の通知を必ずしも行いません。本書では、アクティブ状態変更の通知意味論を一貫させる前提です。

#### キーボード責務の分離

現行実装は、上下移動・Home / End・Escape・type-ahead を `ui-file-tree` 側で処理し、展開 / 収縮および Enter / Space に伴う選択確定の一部を `ui-tree-item` 側のイベントに依存しています。本書では、最終的な意味決定を `ui-file-tree` 側へより明確に集約する前提です。

### 優先度 4: 公開操作面と可視化挙動の整理

#### フォーカス API

現行実装は専用の公開フォーカスメソッドを持ちません。本書では `focus()`、`focusSelected()`、`focusFirst()` を公開します。

#### ローディング戦略

現行実装は 500ms 閾値を持つ skeleton 置換中心です。本書では `retain` を既定戦略とし、読書体験に合わせて既存 tree の可視性維持を優先します。

#### ローディング閾値未満の表示

現行実装は、ローディング中でも 500ms の閾値を超えるまでは通常描画パスを通ります。したがって、`items` が存在すれば tree を描画し、`items=[]` であれば Empty State を描画します。閾値未満のローディング専用表示は持ちません。本書では、`retain` / `replace` を意味契約として明確に分離します。

#### `aria-busy` の付与条件

現行実装は、`aria-busy` をローディング中常時ではなく、`showSkeleton=true` の時にのみ `true` として付与します。短時間ローディングでは `loading=true` であっても `aria-busy="false"` のままです。本書では、ローディング戦略に応じた busy 意味論をより明示的に扱います。

#### 印刷契約

現行実装は `variant="card"` と `data-printable="true"` の組み合わせに印刷可否を結び付けています。本書では `printable` を独立した意味契約として扱います。

#### `data-printable` の真偽値意味

現行実装は `data-printable` の属性値そのものではなく、属性の存在のみを見て印刷対象かどうかを判定します。したがって、`data-printable="false"` のような値であっても、属性が存在する限り printable とみなされます。本書では、`printable` を明示的な boolean 契約として扱います。

### 優先度 5: 開発時安全性と検証

#### 開発時検証

現行実装は `id` 重複や不正ノード形状を実行時に厳密検証しません。本書では、少なくとも開発時には検出・警告する方向を推奨します。

### 優先度 6: 契約追従のための Storybook 更新

#### Storybook カバレッジ

現行 Storybook は、可変 `TreeNode`、`activeId` 公開、`ui-tree-select` / `ui-tree-expand` / `ui-tree-focus-change` といった現行契約を前提に構成されています。本書で想定する `selectedId` / `expandedIds`、request / commit 系イベント、公開フォーカスメソッド、`loadingStrategy="retain"` / `"replace"` といった正規契約に対応した Story は、まだ整備されていません。

### 優先度 7: 追加検討機能の未実装

#### 追加検討機能の現行未対応

「追加を検討する価値がある機能」で列挙した次の機能は、現行実装では未対応です。

- 公開フォーカスメソッド
- `selectedId` / `expandedIds` / `defaultExpandedIds`
- `reveal(id)` / `revealSelected()`
- `loadingStrategy`
- 開発時バリデーション
- `expandAll()` / `collapseAll()` の公開 API
- 遅延展開 / 非同期 branch ロード
- 印刷挙動の追加オプション

### 本節の扱い

本節に記載した差分は、将来の実装修正対象です。正規契約へ合わせる場合は、実装、Storybook、契約書を同時に更新する必要があります。

