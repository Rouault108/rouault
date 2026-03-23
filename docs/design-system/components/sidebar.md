# Sidebar

## 文書の目的

本書は、`ui-sidebar` の**長期的に維持すべき公開契約**を定義するものです。ここでいう契約とは、現行実装の偶発的な都合ではなく、Rouault において sidebar がどのような責務を持つべきかを基準に固定したものを指します。

`ui-sidebar` は、本文を読むための主面に対して、ノート・章・ファイルへ移動するための補助面を提供する統合コンポーネントです。内部的には `ui-sidebar-shell` と `ui-file-tree` を組み合わせますが、利用側が依存すべき対象はそれらの内部詳細ではなく、`ui-sidebar` の公開契約です。

本契約は、次の原則に基づきます。

- sidebar は**本文より一段低い存在感**を保つ補助面であること
- 開閉制御、表示モード、ツリー選択、フォーカス移動の責務を**混線させない**こと
- shell 由来の空間制御と tree 由来の移動制御を、利用側から見て**一貫した API**へ統合すること
- 現行実装に未対応の事項があっても、長期的に整っていて保守しやすい契約を優先すること

---

## 適用範囲

本書は、`ui-sidebar` の**現在の正式な公開契約**のみを対象とします。対象とするのは次の事項です。

- 公開 API
- 状態モデル
- スロットとイベント
- DOM / Accessibility
- Visual Contract
- 責務境界
- 境界条件
- Storybook 契約
- 現行実装との差分

また、本書には次の内容を**正式契約として本文へ取り込み済み**です。

- overlay における標準 close 導線
- `mode="auto"` を含む requested mode / effective mode の区別
- `ui-sidebar-mode-change` による実効モード変化通知
- `selectedId` と `focusedId` の分離
- `label` / `heading` / `headingLevel` による landmark 名と視覚見出しの制御

一方で、本書は次の事項を対象外とします。

- アプリケーション全体の情報設計
- ツリー項目の生成規則
- ルーティング、URL 同期、履歴管理
- 本文表示の切替ロジック
- 検索、フィルタリング、ソートなどの上位ナビゲーション責務
- データ取得、永続化、サーバ同期
- 現在項目を sidebar 内で可視化する reveal API
- sidebar 幅のリサイズ
- `expandedIds` などによる controlled な展開状態 API
- tree 自体のラベルを sidebar とは別に分離制御する拡張
- header 全体差し替え、または overlay 専用補助領域の導入

上記の対象外項目は、将来的な検討候補であっても、本書の**現時点の公開契約**には含めません。これらを正式契約へ昇格させる場合は、実装、Storybook、本文契約の 3 点をそろえて改めて追加します。

---

## 設計原則

### `ui-sidebar` の責務

`ui-sidebar` の責務は、次の 4 点に限定します。

- **空間制御**: `fixed` / `overlay` の切替、および開閉
- **移動制御**: ツリー項目の選択、展開、フォーカス移動の再公開
- **統合 API**: shell と tree を横断した公開 property / method / event の提供
- **静かな視覚表現**: 本文を侵食しない補助面としての見た目の維持

### `ui-sidebar` の責務に含めないもの

次の事項は、`ui-sidebar` の責務に含めません。

- `items` の生成、整形、永続化
- ツリー状態の業務的意味づけ
- 本文側のページ遷移
- 検索 UI やフィルタ UI の内蔵
- breadcrumb、tabs、dialog など他ナビゲーション責務の吸収

### 下位コンポーネントとの関係

`ui-sidebar` は `ui-sidebar-shell` と `ui-file-tree` を利用しますが、公開契約上は**透過ラッパーではありません**。下位契約をそのまま露出するのではなく、sidebar として必要な意味に整理して束ねます。

`ui-sidebar` と `ui-sidebar-shell` の統合規則は、次のとおりです。

- `ui-sidebar` は shell を**controlled な開閉コンポーネント**として利用します。`ui-sidebar` が公開する `state` が唯一の開閉状態源です
- `ui-sidebar` は shell に対して `persist=false` を固定し、shell 由来の永続化責務を公開契約へ持ち込みません
- `ui-sidebar` は shell に対して `closeOnNavigation=false` を固定し、navigation 確定による自動格納を標準契約に含めません
- `ui-sidebar` は shell の `resolvedMode` を内部で利用しますが、これを read-only property として再公開しません。利用者へ公開するのは `ui-sidebar-mode-change` に含まれる `effectiveMode` のみです
- `ui-sidebar` は shell の `defaultState`、`persist`、`persistenceKey`、`closeOnNavigation`、`initialFocusPolicy`、`restoreFocusPolicy`、`header` slot、shell 固有イベントを公開 API として再公開しません
- `ui-sidebar` は shell の `header` slot を内部実装として利用してよいですが、その内部構成は公開契約に含めません。利用者に公開する補助差し込み面は `header-actions` のみです
- `ui-sidebar` の公開イベントは wrapper が再構成した最終イベントです。利用者は shell 由来イベントへ直接依存してはなりません（MUST NOT）

したがって、`ui-sidebar` の利用者が依存してよい対象は、常に本書で定義する `ui-sidebar` の公開 property / method / event のみです。

---

## 公開契約

### 入力契約

`ui-sidebar` は、次の公開入力を持ちます。

| 名前              | 種別                                      | 必須   | 内容                            | 契約                         |
| ----------------- | ----------------------------------------- | ------ | ------------------------------- | ---------------------------- |
| `state`           | property / attribute (`data-state`)       | いいえ | 開閉状態                        | `expanded` / `collapsed`     |
| `mode`            | property / attribute                      | いいえ | 表示モード                      | `fixed` / `overlay` / `auto` |
| `items`           | property                                  | いいえ | ツリー構造データ                | `SidebarTreeNode[]`          |
| `loading`         | property / attribute                      | いいえ | 読み込み状態                    | `true` / `false`             |
| `selectedId`      | property / attribute (`selected-id`)      | いいえ | 現在選択中の項目 ID             | 文字列または未指定           |
| `focusedId`       | property / attribute (`focused-id`)       | いいえ | 現在フォーカス中の項目 ID       | 文字列または未指定           |
| `density`         | property / attribute                      | いいえ | ツリー密度                      | `normal` / `compact`         |
| `variant`         | property / attribute                      | いいえ | ツリー見た目                    | `default` / `card`           |
| `label`           | property / attribute                      | いいえ | landmark 名                     | 文字列                       |
| `heading`         | property / attribute                      | いいえ | 視覚見出し                      | 文字列                       |
| `headingLevel`    | property / attribute (`heading-level`)    | いいえ | 見出しレベル                    | `2` 〜 `6`                   |
| `fixedBreakpoint` | property / attribute (`fixed-breakpoint`) | いいえ | `auto` 時の fixed 判定閾値      | 正の整数                     |
| `closable`        | property / attribute                      | いいえ | overlay 用の既定 close 導線表示 | `true` / `false`             |

### 既定値

| 名前              | 既定値                         |
| ----------------- | ------------------------------ |
| `state`           | `expanded`                     |
| `mode`            | `auto`                         |
| `items`           | `[]`                           |
| `loading`         | `false`                        |
| `density`         | `normal`                       |
| `variant`         | `default`                      |
| `label`           | `サイドバー ナビゲーション`    |
| `heading`         | `目次`                         |
| `headingLevel`    | `2`                            |
| `fixedBreakpoint` | `1280`                         |
| `closable`        | `true`                         |

`label` と `heading` の既定値は便宜上のフォールバックです。アプリケーション統合では、ページ内の他 landmark や見出しとの重複を避けるため、文脈に応じた値を明示指定することを推奨します。

### 入力値の妥当性契約

列挙値および数値入力は、次の規則で正規化します。

| 名前              | 無効値の扱い                                                                  |
| ----------------- | ----------------------------------------------------------------------------- |
| `state`           | `expanded` / `collapsed` 以外は既定値 `expanded` に正規化します               |
| `mode`            | `fixed` / `overlay` / `auto` 以外は既定値 `auto` に正規化します               |
| `density`         | `normal` / `compact` 以外は既定値 `normal` に正規化します                     |
| `variant`         | `default` / `card` 以外は既定値 `default` に正規化します                      |
| `headingLevel`    | `2` 〜 `6` 以外は既定値 `2` に正規化します                                    |
| `fixedBreakpoint` | 非有限値は `1280` に正規化し、`320` 未満の値は `320` に切り上げて正規化します |

`fixedBreakpoint` の正規化規則は shell と同一とします。`ui-sidebar` は host 独自規則を追加せず、shell と矛盾する再正規化を行ってはなりません（MUST NOT）。

公開 property と反映 attribute は、**常に正規化後の値を表す**ものとします。利用者が与えた値と公開値が乖離しないことを前提とします。

### `SidebarTreeNode` 契約

`items` に渡す各要素は `SidebarTreeNode` とします。

| 名前         | 種別                | 必須   | 内容                     |
| ------------ | ------------------- | ------ | ------------------------ |
| `id`         | string              | はい   | ツリー全体で一意な識別子 |
| `label`      | string              | はい   | 表示ラベル               |
| `icon`       | string              | いいえ | アイコン名               |
| `href`       | string              | いいえ | 遷移先                   |
| `children`   | `SidebarTreeNode[]` | いいえ | 子ノード                 |
| `isExpanded` | boolean             | いいえ | 展開状態                 |
| `isDisabled` | boolean             | いいえ | 無効状態                 |

`SidebarTreeNode` は**不変入力**として扱います。`ui-sidebar` は受け取った `items` を破壊的に変更してはなりません（MUST NOT）。

選択状態は `selectedId` を唯一の公開状態源とします。`SidebarTreeNode` に選択状態を重複保持してはなりません（MUST NOT）。

フォーカス状態は `focusedId` を唯一の公開状態源とします。`SidebarTreeNode` にフォーカス状態を埋め込んではなりません（MUST NOT）。

展開状態は現時点では `items` 内の `isExpanded` を状態源とします。展開変更はイベントで通知し、利用者が `isExpanded` を更新した新しい `items` を再入力します。

### スロット契約

| 名前             | 種別       | 内容                   |
| ---------------- | ---------- | ---------------------- |
| `header-actions` | named slot | ヘッダー右側の補助操作 |

`header-actions` は補助操作専用です。主要操作、状態喪失を引き起こす必須操作、fixed でも常時到達可能でなければならない導線を置いてはなりません（MUST NOT）。

`ui-sidebar` は内部実装として shell の `header` slot を利用してよいですが、その構成は公開契約に含めません。利用者に公開する差し込み面は `header-actions` のみです。

close 操作は slot へ委ねず、`closable` により標準導線を提供します。

### 公開メソッド

| 名前               | 契約                                                         |
| ------------------ | ------------------------------------------------------------ |
| `expand(trigger?)` | `state` を `expanded` に設定します                           |
| `collapse()`       | `state` を `collapsed` に設定します                          |
| `toggle(trigger?)` | 現在の `state` を反転します                                  |
| `focusSelected()`  | 現在の `selectedId` に対応する項目へフォーカスを移動します   |
| `focusFirstItem()` | 現在表示中の tree における先頭項目へフォーカスを移動します   |

公開メソッドは **imperative API** です。呼び出しにより対象状態が実際に変化する場合、対応する公開 property を同期更新し、その後に対応イベントを dispatch します。

公開メソッドは**冪等**です。同じ最終状態に対する重複呼び出しで、不要な状態変化イベントを再発火してはなりません。

アニメーション中または遷移中に複数の開閉命令が来た場合は、**last-write-wins** を採用します。最終入力の意図だけを残し、中間状態を公開契約に含めません。

`trigger` は overlay におけるフォーカス返却先の記録にのみ用います。fixed では保持してもよいですが、返却先としての意味は持ちません。

`ui-sidebar` は shell の `collapse(reason?)` を公開 API として再公開しません。close reason の公開面は `ui-sidebar-request-close` に限定します。

### 公開イベント

| 名前                       | detail                           | bubbles | composed | 契約                               |
| -------------------------- | -------------------------------- | ------- | -------- | ---------------------------------- |
| `ui-sidebar-state-change`  | `{ state }`                      | `true`  | `true`   | 開閉状態の変化通知                 |
| `ui-sidebar-mode-change`   | `{ effectiveMode }`              | `true`  | `true`   | 実効モードの変化通知               |
| `ui-sidebar-select`        | `{ id }`                         | `true`  | `true`   | 項目選択通知                       |
| `ui-sidebar-expand`        | `{ id, expanded }`               | `true`  | `true`   | 項目展開変更通知                   |
| `ui-sidebar-focus-change`  | `{ id }`                         | `true`  | `true`   | ツリー内フォーカス移動通知         |
| `ui-sidebar-request-close` | `{ reason }`                     | `true`  | `true`   | 利用者操作による close 要求        |

### イベント発火順序契約

公開イベントは、**当該イベントが表す公開状態が実際に更新済みである場合に限り、更新後に同期 dispatch** します。

- `ui-sidebar-state-change` は `state` 更新後に dispatch します
- `ui-sidebar-mode-change` は `effectiveMode` の再評価後に dispatch します
- `ui-sidebar-select` は `selectedId` 更新後に dispatch します
- `ui-sidebar-focus-change` は `focusedId` 更新後に dispatch します

`ui-sidebar-request-close` は**要求イベント**であり、`state` 更新を前提としません。request-close の dispatch だけでは `state` は変化しません。

`ui-sidebar-request-close.detail.reason` は `close-button` / `scrim` / `escape` のいずれかとします。navigation 確定、mode 変化、API 呼び出しは本イベントの reason に含めません。

### イベント detail 契約

公開イベントの `detail` には、可変オブジェクト参照を含めません。`detail` は文字列・真偽値・数値などの安定したスカラー値のみで構成します。

`effectiveMode` は shell の `resolvedMode` に対応する `ui-sidebar` 側の公開名です。`ui-sidebar` は `resolvedMode` という名前の property や event を公開しません。

追加情報が必要な場合、利用者は自身が保持する `items` を `id` により再解決します。`ui-sidebar` はイベント detail を通じて内部データ参照を外部へ貸し出しません。

shell 由来イベントの伝播方式、detail 形状、発火時相は `ui-sidebar` の公開契約へそのまま持ち込みません。利用者が依存してよいのは、本節で定義した wrapper 再構成後の公開イベントのみです。

### 属性反映契約

| property          | attribute          | reflect |
| ----------------- | ------------------ | ------- |
| `state`           | `data-state`       | あり    |
| `mode`            | `mode`             | あり    |
| `loading`         | `loading`          | あり    |
| `selectedId`      | `selected-id`      | あり    |
| `focusedId`       | `focused-id`       | あり    |
| `density`         | `density`          | あり    |
| `variant`         | `variant`          | あり    |
| `label`           | `label`            | なし    |
| `heading`         | `heading`          | なし    |
| `headingLevel`    | `heading-level`    | あり    |
| `fixedBreakpoint` | `fixed-breakpoint` | あり    |
| `closable`        | `closable`         | あり    |

`items` は property 専用です。HTML 属性経由での入力はサポートしません。

`state` の反映 attribute に `data-state` を用いるのは、状態表現を CSS 用フックとして明示し、意味属性との混同を避けるためです。公開 API 名は `state` で一貫しており、attribute 名の差異は意味差を表しません。

---

## 状態モデル

### 基本方針

`ui-sidebar` の状態は、次の 4 層に分けます。

- **空間状態**: `mode`
- **開閉状態**: `state`
- **選択状態**: `selectedId`
- **フォーカス状態**: `focusedId`

これらを 1 つの曖昧な「アクティブ状態」に混ぜません。

### モード状態

`mode` は `fixed`、`overlay`、`auto` を持ちます。

| 値        | 意味                                                                  |
| --------- | --------------------------------------------------------------------- |
| `fixed`   | レイアウトに常設される補助面                                          |
| `overlay` | 本文上に重なる一時的補助面                                            |
| `auto`    | `fixedBreakpoint` と viewport に基づき `fixed` / `overlay` を自動選択 |

`mode="auto"` は正規の公開契約です。初期 HTML に属性があるかどうかで特別な挙動を変えてはなりません（MUST NOT）。

### 実効モード

`ui-sidebar` は、**requested mode** と **effective mode** を区別します。

- requested mode: 利用者が入力する公開 property `mode`
- effective mode: 実際に適用されている内部評価後のモード

`mode="fixed"` または `mode="overlay"` の場合、requested mode と effective mode は一致します。

`mode="auto"` の場合、`fixedBreakpoint` と viewport に基づいて effective mode を `fixed` または `overlay` に決定します。effective mode の変化は `ui-sidebar-mode-change` により通知します。

### 開閉状態

`state` は `expanded` / `collapsed` を持ちます。

- `expanded`: sidebar が利用可能な状態
- `collapsed`: sidebar が格納済みの状態

`fixed` と `overlay` の両方で `state` は存在しますが、視覚表現と補助動作は `mode` により異なります。

### 選択状態

`selectedId` は現在選択中の項目を表します。本文表示との対応づけに使うのは、この状態です。

`selectedId` は選択状態の唯一の公開状態源です。`items` 内の各ノードに選択状態を重複保持してはなりません（MUST NOT）。

`selectedId` が `items` 内に存在しない場合、選択なしとして扱います。他の状態を巻き添えで変更しません。

### フォーカス状態

`focusedId` は roving focus の現在位置を表します。キーボード移動、フォーカス復元、`focusSelected()` の補助判断に使うのは、この状態です。

`focusedId` はフォーカス状態の唯一の公開状態源です。`selectedId` と一致してもよいですが、常に一致しなければならないわけではありません。

`focusedId` が `items` 内に存在しない場合、そのフォーカス状態だけを無効として扱います。`selectedId` を暗黙に変更してはなりません（MUST NOT）。

### 読み込み状態

`loading=true` の場合、tree 領域を読み込み状態として扱います。具体的な skeleton 表示の閾値、遅延、アニメーションは `ui-file-tree` 側契約に委譲します。`ui-sidebar` は loading の意味だけを固定し、実装細部を再定義しません。

---

## 制御モデル

### `state` の扱い

`state` は、外部から読み書き可能な公開状態です。利用者は property / attribute の更新、または公開メソッドの呼び出しにより `state` を制御できます。

`ui-sidebar` は内部で `ui-sidebar-shell` を利用しますが、開閉については shell を**controlled** として扱います。したがって、shell 側の内部判断が `ui-sidebar` の公開 `state` を自律的に変更してはなりません（MUST NOT）。

一方で、close ボタン、scrim click、Escape などの**利用者操作由来の close** は、`ui-sidebar-request-close` を dispatch する要求導線として扱います。これらの操作は、自動で `state` を変更しません。

したがって、`ui-sidebar` の開閉制御には次の 2 系統があります。

- **直接制御**: property / attribute 更新、または `expand()` / `collapse()` / `toggle()`
- **要求通知**: `ui-sidebar-request-close`

両者を混同しません。

navigation 確定による自動格納は `ui-sidebar` の標準契約に含めません。`ui-sidebar` は shell に対して `closeOnNavigation=false` を前提として統合します。navigation に応じた格納が必要な場合は、利用側が `ui-sidebar-request-close` または `state` 制御を用いて明示的に扱います。

### `mode` の扱い

`mode` は requested mode を表す公開入力です。`auto` の場合に限り、内部で effective mode を導出します。

`mode` 自体の意味は requested mode として固定されます。`mode="auto"` のときでも、公開上の `mode` は `auto` のままであり、effective mode と混同してはなりません。

`effectiveMode` は内部で shell の `resolvedMode` から導出しますが、`ui-sidebar` はそれを read-only property として再公開しません。利用者が観測できるのは `ui-sidebar-mode-change` の `detail.effectiveMode` のみです。

初期 HTML に属性があるかどうかで特別な挙動を変えてはなりません（MUST NOT）。

### `items` の扱い

`items` は不変入力です。`ui-sidebar` は `items` を内部で破壊的に変更しません。選択・展開変更はイベント通知に留め、呼び出し側が新しい `items` を再入力します。

### 永続化責務

開閉状態、選択状態、展開状態、実効モードなどの永続化は、すべて利用側責務です。`ui-sidebar` 自身は localStorage やサーバ保存を行いません。

`ui-sidebar` は内部で利用する shell に対して `persist=false` を固定します。したがって、shell 由来の `persist`、`persistenceKey`、復元順位は `ui-sidebar` の公開契約に含めません。

---

## DOM / Accessibility

### DOM 構造

`ui-sidebar` は Shadow DOM 内に `ui-sidebar-shell` を 1 つ持ち、その内部に見出し領域と `ui-file-tree` を配置します。

```text
<ui-sidebar>
  #shadow-root
    <ui-sidebar-shell>
      <header>
        <hN>…</hN>
        <slot name="header-actions"></slot>
      </header>
      <ui-file-tree></ui-file-tree>
    </ui-sidebar-shell>
</ui-sidebar>
```

### landmark 契約

sidebar の landmark 名は `label` で決定します。landmark のアクセシブル名を shell 固定文言に依存させません。

### 視覚見出し契約

`heading` は視覚見出しです。landmark 名と同一である必要はありません。

### 見出しレベル契約

`headingLevel` に応じて `<h2>` 〜 `<h6>` を使い分けます。固定 `<h2>` にはしません。ページ全体の見出し体系と整合できるようにするためです。

### tree の意味論

`role="tree"`、各項目のキーボードナビゲーション、roving focus は tree 側が担います。ただし、利用者に対する最終的なアクセシビリティ統合責務は `ui-sidebar` が持ちます。

### overlay のアクセシビリティ

overlay は **non-modal な補助面** であり、dialog ではありません。次を契約とします。

- `role="dialog"` を自動付与しないこと
- `aria-modal="true"` を自動付与しないこと
- 背景コンテンツを `inert` 化しないこと
- 背景コンテンツをアクセシビリティ tree から除去しないこと
- 初回展開時に適切な初期フォーカスを与えること
- 格納時に trigger へフォーカス返却できること
- Escape により `ui-sidebar-request-close` を dispatch できること
- focus trap を持たないこと

背景操作を全面的に禁止するかどうかは、アプリケーション全体の modal policy の責務です。`ui-sidebar` 自身は non-modal 契約を越えて背景制御を強制しません。

### 内部詳細への非依存

`ui-sidebar` は `::part(...)` を公開しません。内部 class 名、DOM 構造、下位コンポーネント内部 DOM に依存してはなりません（MUST NOT）。

---

## Visual Contract

### 情報順位

- 本文が主役であり、sidebar は補助面です。
- fixed は静かな常設面として振る舞います。
- overlay は一時的に前景化しますが、dialog のような強い遮断 UI にはしません。
- 選択・展開・フォーカスの視覚化は主として tree 側に委譲します。

### ヘッダー表現

ヘッダーは sidebar の存在を説明するための控えめな帯です。操作ツールバーへ肥大化させません。

### バリアント

`variant` は sidebar 独自の装飾ではなく、tree 領域の見た目切替です。

| 値        | 意味                                 |
| --------- | ------------------------------------ |
| `default` | 背景を持たない静かな表示             |
| `card`    | 独立ウィジェットとして切り出した表示 |

### 視覚意味契約

本コンポーネントは、次の視覚意味を満たさなければなりません。

- 本文より低い視覚優先度を保つこと
- fixed では静かな常設面として振る舞うこと
- overlay では一時的に前景化してよいが、dialog のような強い遮断 UI にしないこと
- ヘッダーは説明的な帯に留め、操作ツールバーへ肥大化させないこと
- `variant="card"` の場合に限り、独立した補助面としての輪郭表現を強めてよいこと

具体的なデザイントークン名、トークン分解、テーマ実装上の参照先は本契約の固定対象に含めません。ここで固定するのは視覚意味であり、トークン名ではありません。

---

## 環境別の振る舞い

### Reduced Motion

motion は最小化します。具体的な開閉アニメーション抑制は shell 契約、tree の skeleton motion は tree 契約に従います。

### Dark Mode

本文との競合を避ける控えめなコントラストを維持します。

### Forced Colors

landmark と tree の意味論を維持しつつ、システム色へ適応します。

### Print

sidebar は既定で print 出力に含めません。

印刷時にナビゲーション情報が必要な場合、上位レイヤで印刷専用の表現を追加してもよいものとします。ただし、そのために sidebar 自身へ印刷専用責務を逆流させてはなりません（MUST NOT）。

---

## 責務境界

### `ui-sidebar` 固有契約

次は `ui-sidebar` 固有の契約です。

- `mode` / `state` / `selectedId` / `focusedId` の意味
- `effectiveMode` を `ui-sidebar-mode-change` で通知する統合観測面
- `label` / `heading` / `headingLevel` の意味
- `header-actions` の制約
- `closable` による標準 close 導線
- `ui-sidebar-request-close` を用いた要求通知モデル
- shell / tree の内部イベントを最終公開イベントへ再構成すること
- print 非表示方針

### shell 継承契約

次は主として `ui-sidebar-shell` に委譲しつつ、`ui-sidebar` が**意味を絞って継承する**契約です。

- overlay / fixed の空間表現
- overlay を非モーダル drawer として扱うこと
- scrim
- 初期フォーカス
- フォーカス返却
- Escape handling
- `mode="auto"` 時の実効モード導出
- `fixedBreakpoint` の正規化規則

ただし、次は shell の公開契約であっても `ui-sidebar` は継承しません。

- `defaultState`
- `persist`
- `persistenceKey`
- `closeOnNavigation`
- `initialFocusPolicy`
- `restoreFocusPolicy`
- `resolvedMode` という名前の read-only property
- shell 固有イベント
- `header` slot
- `collapse(reason?)`
- `notifyNavigationCommit()`

### tree 継承契約

次は主として `ui-file-tree` に委譲する契約です。

- tree role
- roving focus
- 項目描画
- skeleton の具体表示
- empty state の具体表示

`ui-sidebar` は shell と tree を再実装しませんが、利用者に対する**最終的な公開 property / method / event の一貫性**は `ui-sidebar` が保証します。

---

## 境界条件

### `mode="auto"`

viewport 条件の変化により effective mode が変わる場合、`ui-sidebar-mode-change` を発火します。`detail` は `{ effectiveMode }` とします。

requested mode である `mode` の変化と、derived state である effective mode の変化は別概念です。effective mode の変化を `ui-sidebar-state-change` に混ぜてはなりません（MUST NOT）。

### `state="collapsed"` の初期値

初回描画時から非活性状態として扱います。表示してから閉じる挙動は契約に含めません。

### `selectedId` と `focusedId` の不整合

どちらかが `items` に存在しない場合は、該当状態だけを無効として扱います。もう一方の状態を巻き添えで変更しません。

### 空ツリー

`items=[]` は有効入力です。sidebar は壊れずに描画されなければなりません（MUST）。

empty state の具体表示、文言、アイコン、skeleton との切替閾値は tree 契約へ委譲します。`ui-sidebar` は、空入力を異常扱いしないことだけを固定します。

### `header-actions`

`header-actions` には、補助操作だけを配置できます。主要操作、状態喪失を引き起こす必須操作、fixed でも常時到達可能でなければならない導線を置いてはなりません（MUST NOT）。

`header-actions` に置かれた要素は DOM 順に tab 到達できることを前提とします。fixed では不可視、overlay でのみ可視という条件付き表示は許容しますが、表示有無によって主要操作の有無が変わってはなりません（MUST NOT）。

`ui-sidebar` は内部実装として `header-actions` を shell の `header` slot 内へ配置してよいですが、その DOM 構成や slot 配線は公開契約に含めません。

close 操作は slot へ委ねず、`closable` による標準導線を優先します。

### rapid toggle

連続開閉では最終命令だけを有効とします。中間の揺れ戻りを公開契約に含めません。

---

## Storybook 契約

Storybook は、個別 Story 名を固定する場ではなく、**公開契約の検証観点**を維持する場とします。少なくとも次の観点を継続的に検証しなければなりません。

- `mode="auto"` で viewport 条件に応じて effective mode が切り替わること
- fixed / overlay の両方で `state` の意味が一貫していること
- overlay において標準 close 導線と `ui-sidebar-request-close` が成立すること
- `selectedId` と `focusedId` が独立して扱われること
- `items` 入力が破壊的変更されないこと
- tree 由来イベントが sidebar の公開イベントとして再構成されること
- `expand()` / `collapse()` / `toggle()` が冪等であること
- rapid toggle が last-write-wins で収束すること
- overlay が non-modal であり、初期フォーカスとフォーカス返却を持ち、focus trap を持たないこと
- print 既定が非表示であること

Story 名、ファイル分割、境界 Story と通常 Story の配分は固定契約に含めません。検証観点が維持される限り、Story 構成の再編を許容します。

---

## 現行実装との差分

本節は、本書の契約と現行実装との差分を整理するものです。以下は**将来の修正対象**であり、現時点で実装済みとは限りません。

### 未対応事項

- `mode` は現行実装では `fixed` / `overlay` のみであり、`auto` を正規の公開値として持っていません
- `mode` 自動判定は初期属性有無に依存した特別処理を持っており、本書の `auto` 契約に未追随です
- `selectedId` と `focusedId` は現行では `activeId` に統合されており、本書の分離契約に未追随です
- `items` は現行では下位 tree により破壊的に更新され得ます
- 現行入力型は `TreeNode` であり、本書の `SidebarTreeNode` 契約に未追随です
- `ui-sidebar-mode-change` は現行未実装です
- `ui-sidebar-request-close` による要求通知モデルは現行未実装です
- `focusSelected()` と `focusFirstItem()` は現行未実装です
- `ui-sidebar-state-change` は現行では shell 由来 detail を引きずっており、本書の公開イベント detail 契約に未追随です
- `headingLevel` は現行未実装であり、見出しは固定 `<h2>` です
- `label` による landmark 名制御は現行未実装です
- `closable` による標準 close 導線は現行未整備です
- `ui-sidebar` は永続化しない契約ですが、現行実装では shell 由来の localStorage 書き込み副作用が残っています
- `fixedBreakpoint` の正規化規則は現行実装が本書契約へ未追随です
- method の冪等性と rapid toggle の last-write-wins を Storybook 契約として十分固定していません
- print 非表示は現行では結果としてそうなっている側面が強く、sidebar 自身の明示方針としては未固定です

### 実装方針

本書の契約へ合わせる場合は、次の順序で整理します。

1. `mode` を `fixed` / `overlay` / `auto` に再設計する
2. `activeId` を `selectedId` / `focusedId` へ分離する
3. `items` の破壊的更新を廃止し、`SidebarTreeNode` へ入力型を整理する
4. `closable` と `ui-sidebar-request-close` を導入し、close ボタン / scrim / Escape を要求通知へ統一する
5. shell / tree 由来イベントを `ui-sidebar` の公開イベントへ再構成する
6. `ui-sidebar-mode-change` を実装し、shell の `resolvedMode` を `effectiveMode` として再公開する
7. `fixedBreakpoint` の正規化規則を shell と一致させる
8. shell を controlled + `persist=false` + `closeOnNavigation=false` で統合し、永続化副作用を除去する
9. `label` / `headingLevel` / `closable` を実装する
10. `focusSelected()` / `focusFirstItem()` を実装する
11. Storybook を本書の契約確認点へ更新する

### 本節の扱い

本節に記載した事項は、採用されるまでは公開契約として依存してよいものではありません。実装、Storybook、契約書の 3 点をそろえて更新したときにのみ、正式契約として昇格させます。
