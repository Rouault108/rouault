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

本書は、`ui-sidebar` の次の事項を対象とします。

- 公開 API
- 状態モデル
- スロットとイベント
- DOM / Accessibility
- Visual Contract
- 責務境界
- 境界条件
- Storybook 契約
- 現行実装との差分

一方で、本書は次の事項を対象外とします。

- アプリケーション全体の情報設計
- ツリー項目の生成規則
- ルーティング、URL 同期、履歴管理
- 本文表示の切替ロジック
- 検索、フィルタリング、ソートなどの上位ナビゲーション責務
- データ取得、永続化、サーバ同期

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

`ui-sidebar` は `ui-sidebar-shell` と `ui-file-tree` を利用しますが、公開契約上は**単なる透過ラッパーではありません**。下位契約をそのまま露出するのではなく、sidebar として必要な意味に整理して束ねます。

---

## 公開契約

### 入力契約

`ui-sidebar` は、次の公開入力を持ちます。

| 名前                | 種別                                        | 必須  | 内容                      | 契約                           |
| ----------------- | ----------------------------------------- | --- | ----------------------- | ---------------------------- |
| `state`           | property / attribute (`data-state`)       | いいえ | 開閉状態                    | `expanded` / `collapsed`     |
| `mode`            | property / attribute                      | いいえ | 表示モード                   | `fixed` / `overlay` / `auto` |
| `items`           | property                                  | はい  | ツリー構造データ                | `SidebarTreeNode[]`          |
| `loading`         | property / attribute                      | いいえ | 読み込み状態                  | `true` / `false`             |
| `selectedId`      | property / attribute (`selected-id`)      | いいえ | 現在選択中の項目 ID             | 文字列または未指定                    |
| `focusedId`       | property / attribute (`focused-id`)       | いいえ | 現在フォーカス中の項目 ID          | 文字列または未指定                    |
| `density`         | property / attribute                      | いいえ | ツリー密度                   | `normal` / `compact`         |
| `variant`         | property / attribute                      | いいえ | ツリー見た目                  | `default` / `card`           |
| `label`           | property / attribute                      | いいえ | landmark 名              | 文字列                          |
| `heading`         | property / attribute                      | いいえ | 視覚見出し                   | 文字列                          |
| `headingLevel`    | property / attribute (`heading-level`)    | いいえ | 見出しレベル                  | `2` 〜 `6`                    |
| `fixedBreakpoint` | property / attribute (`fixed-breakpoint`) | いいえ | `auto` 時の fixed 判定閾値    | 正の整数                         |
| `closable`        | property / attribute                      | いいえ | overlay 用の既定 close 導線表示 | `true` / `false`             |

### 既定値

| 名前                | 既定値        |
| ----------------- | ---------- |
| `state`           | `expanded` |
| `mode`            | `auto`     |
| `loading`         | `false`    |
| `density`         | `normal`   |
| `variant`         | `default`  |
| `label`           | `ナビゲーション`  |
| `heading`         | `ナビゲーション`  |
| `headingLevel`    | `2`        |
| `fixedBreakpoint` | `1280`     |
| `closable`        | `true`     |

### 入力値の妥当性契約

列挙値および数値入力は、次の規則で正規化します。

| 名前                | 無効値の扱い                                             |
| ----------------- | -------------------------------------------------- |
| `state`           | `expanded` / `collapsed` 以外は既定値 `expanded` に正規化します |
| `mode`            | `fixed` / `overlay` / `auto` 以外は既定値 `auto` に正規化します |
| `density`         | `normal` / `compact` 以外は既定値 `normal` に正規化します       |
| `variant`         | `default` / `card` 以外は既定値 `default` に正規化します        |
| `headingLevel`    | `2` 〜 `6` 以外は既定値 `2` に正規化します                       |
| `fixedBreakpoint` | 非数値、負値、0、極端に小さい値は既定値 `1280` に正規化します                |

公開 property と反映 attribute は、**常に正規化後の値を表す**ものとします。利用者が与えた値と公開値が乖離しないことを前提とします。

### `SidebarTreeNode` 契約

`items` に渡す各要素は `SidebarTreeNode` とします。

| 名前           | 種別                  | 必須  | 内容           |
| ------------ | ------------------- | --- | ------------ |
| `id`         | string              | はい  | ツリー全体で一意な識別子 |
| `label`      | string              | はい  | 表示ラベル        |
| `icon`       | string              | いいえ | アイコン名        |
| `href`       | string              | いいえ | 遷移先          |
| `children`   | `SidebarTreeNode[]` | いいえ | 子ノード         |
| `isExpanded` | boolean             | いいえ | 展開状態         |
| `isSelected` | boolean             | いいえ | 選択状態         |
| `isDisabled` | boolean             | いいえ | 無効状態         |

`SidebarTreeNode` は**不変入力**として扱います。`ui-sidebar` は受け取った `items` を破壊的に変更してはなりません（MUST NOT）。選択・展開変更はイベントで通知し、利用者が新しい `items` を再入力します。

### スロット契約

| 名前               | 種別         | 内容          |
| ---------------- | ---------- | ----------- |
| `header-actions` | named slot | ヘッダー右側の補助操作 |

`header-actions` は補助操作専用です。主要操作、状態喪失を引き起こす必須操作、fixed でも常時到達可能でなければならない導線を置いてはなりません（MUST NOT）。

close 操作は slot へ委ねず、`closable` により標準導線を提供します。

### 公開メソッド

| 名前                 | 契約                |
| ------------------ | ----------------- |
| `expand(trigger?)` | sidebar を展開します    |
| `collapse()`       | sidebar を格納します    |
| `toggle(trigger?)` | 開閉を反転します          |
| `focusSelected()`  | 選択中項目へフォーカスを移動します |
| `focusFirstItem()` | 先頭項目へフォーカスを移動します  |

公開メソッドは**冪等**です。同じ最終状態に対する重複呼び出しで、不要な状態変化イベントを再発火してはなりません。

アニメーション中または遷移中に複数の開閉命令が来た場合は、**last-write-wins** を採用します。最終入力の意図だけを残し、中間状態を公開契約に含めません。

`trigger` は overlay におけるフォーカス返却先として使用します。fixed では記録してもよいですが、返却先としての意味は持ちません。

### 公開イベント

| 名前                         | detail                   | bubbles | composed | 契約                |
| -------------------------- | ------------------------ | ------- | -------- | ----------------- |
| `ui-sidebar-state-change`  | `{ state }`              | `true`  | `true`   | 開閉状態の変化通知         |
| `ui-sidebar-mode-change`   | `{ mode }`               | `true`  | `true`   | 実効モードの変化通知        |
| `ui-sidebar-select`        | `{ id, node }`           | `true`  | `true`   | 項目選択通知            |
| `ui-sidebar-expand`        | `{ id, expanded, node }` | `true`  | `true`   | 項目展開変更通知          |
| `ui-sidebar-focus-change`  | `{ id, node }`           | `true`  | `true`   | ツリー内フォーカス移動通知     |
| `ui-sidebar-request-close` | `{ reason }`             | `true`  | `true`   | 利用者操作による close 要求 |

### イベント発火順序契約

公開イベントは、**関連 property を更新した後に同期 dispatch** します。したがって、イベントリスナ内で `state`、`mode`、`selectedId`、`focusedId` を読むと、更新後の値を取得できます。

### イベント detail の参照契約

`event.detail` に含まれる `node` は、読み取り専用の意味で公開します。clone であることは保証しませんが、利用者は破壊的変更を行ってはなりません（MUST NOT）。

### 属性反映契約

| property          | attribute          | reflect |
| ----------------- | ------------------ | ------- |
| `state`           | `data-state`       | あり      |
| `mode`            | `mode`             | あり      |
| `loading`         | `loading`          | あり      |
| `selectedId`      | `selected-id`      | あり      |
| `focusedId`       | `focused-id`       | あり      |
| `density`         | `density`          | あり      |
| `variant`         | `variant`          | あり      |
| `label`           | `label`            | なし      |
| `heading`         | `heading`          | なし      |
| `headingLevel`    | `heading-level`    | あり      |
| `fixedBreakpoint` | `fixed-breakpoint` | あり      |
| `closable`        | `closable`         | あり      |

`items` は property 専用です。HTML 属性経由での入力はサポートしません。

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

| 値         | 意味                                                          |
| --------- | ----------------------------------------------------------- |
| `fixed`   | レイアウトに常設される補助面                                              |
| `overlay` | 本文上に重なる一時的補助面                                               |
| `auto`    | `fixedBreakpoint` と viewport に基づき `fixed` / `overlay` を自動選択 |

`mode="auto"` は正規の公開契約です。初期 HTML に属性があるかどうかで特別な挙動を変えてはなりません（MUST NOT）。

### 実効モード

利用者が `mode="auto"` を指定した場合、内部評価により `fixed` または `overlay` が選ばれます。この結果は**実効モード**として扱い、`ui-sidebar-mode-change` で通知します。

### 開閉状態

`state` は `expanded` / `collapsed` を持ちます。

- `expanded`: sidebar が利用可能な状態
- `collapsed`: sidebar が格納済みの状態

`fixed` と `overlay` の両方で `state` は存在しますが、視覚表現と補助動作は `mode` により異なります。

### 選択状態

`selectedId` は現在選択中の項目を表します。本文表示との対応づけに使うのは、この状態です。

### フォーカス状態

`focusedId` は roving focus の現在位置を表します。キーボード移動やフォーカス復元に使うのは、この状態です。

`selectedId` と `focusedId` は一致してもよいですが、常に一致しなければならないわけではありません。

### 読み込み状態

`loading=true` の場合、tree 領域を読み込み状態として扱います。具体的な skeleton 表示の閾値、遅延、アニメーションは `ui-file-tree` 側契約に委譲します。`ui-sidebar` は loading の意味だけを固定し、実装細部を再定義しません。

---

## 制御モデル

### `state` の扱い

`state` は**controlled 契約**を基本とします。内部操作で state を勝手に永続化したり、外部入力と競合する独自状態源を持ったりしません。

利用者操作により close が必要な場合は、`ui-sidebar-request-close` を発火し、利用側が `state="collapsed"` を再入力するのを基本フローとします。

### `mode` の扱い

`mode` は `fixed` / `overlay` / `auto` の入力であり、`auto` の場合に限って内部で実効モードを評価します。`auto` の評価結果は公開されますが、**mode**** 自体の意味は変わりません**。

### `items` の扱い

`items` は不変入力です。`ui-sidebar` は `items` を内部で破壊的に変更しません。選択・展開変更はイベント通知に留め、呼び出し側が新しい `items` を再入力します。

### 永続化責務

開閉状態、選択状態、展開状態、実効モードなどの永続化は、すべて利用側責務です。`ui-sidebar` 自身は localStorage やサーバ保存を行いません。

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

overlay は dialog ではありません。次を契約とします。

- 初回展開時に適切な初期フォーカスを与えること
- 格納時にトリガーへフォーカス返却できること
- Escape による close 要求を出せること
- focus trap を持たないこと

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

| 値         | 意味                 |
| --------- | ------------------ |
| `default` | 背景を持たない静かな表示       |
| `card`    | 独立ウィジェットとして切り出した表示 |

### 参照トークン

本コンポーネントは、次のトークンを参照します。

- `--fg-default`
- `--fg-muted`
- `--bg-surface-2`
- `--border-default`
- `--border-ghost`
- `--border-width`
- `--control-height-lg`
- `--space-2`
- `--space-4`
- `--font-sans`
- `--text-sm`
- `--font-medium`

---

## 環境別の振る舞い

### Reduced Motion

motion は最小化します。具体的な開閉アニメーション抑制は shell 契約、tree の skeleton motion は tree 契約に従います。

### Dark Mode

本文との競合を避ける控えめなコントラストを維持します。

### Forced Colors

landmark と tree の意味論を維持しつつ、システム色へ適応します。

### Print

sidebar の print 方針は既定で**非表示**とします。印刷対象へ含める必要がある場合は、sidebar ではなく別の印刷用ナビゲーション表現を上位レイヤで用意します。

---

## 責務境界

### `ui-sidebar` 固有契約

次は `ui-sidebar` 固有の契約です。

- `mode` / `state` / `selectedId` / `focusedId` の意味
- `label` / `heading` / `headingLevel` の意味
- 公開 method / event の意味
- slot の制約
- print 非表示方針

### shell 継承契約

次は主として `ui-sidebar-shell` に委譲する契約です。

- overlay / fixed の空間表現
- scrim
- 初期フォーカス
- フォーカス返却
- Escape handling

### tree 継承契約

次は主として `ui-file-tree` に委譲する契約です。

- tree role
- roving focus
- 項目描画
- skeleton の具体表示
- empty state の具体表示

`ui-sidebar` はこれらを再実装しませんが、利用者に対する最終的な統合 API は `ui-sidebar` が保証します。

---

## 境界条件

### `mode="auto"`

viewport 変化により実効モードが変わる場合、`ui-sidebar-mode-change` を発火します。mode の変化を `state-change` に混ぜません。

### `state="collapsed"` の初期値

初回描画時から非活性状態として扱います。表示してから閉じる挙動は契約に含めません。

### `selectedId` と `focusedId` の不整合

どちらかが `items` に存在しない場合は、該当状態だけを無効として扱います。もう一方の状態を巻き添えで変更しません。

### 空ツリー

`items=[]` は有効入力です。sidebar は壊れずに描画されなければなりません（MUST）。具体的な empty state 表示は tree 契約へ委譲します。

### `header-actions`

fixed では不可視でもよい補助操作だけを置きます。必須操作は、ここに依存してはなりません。

### rapid toggle

連続開閉では最終命令だけを有効とします。中間の揺れ戻りを公開契約に含めません。

---

## Storybook 契約

各 Story は見本ではなく、契約確認点です。少なくとも次を維持します。

| Story                        | 固定する契約                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| `AutoModeSwitching`          | `mode="auto"` で viewport に応じて実効モードが切り替わり、`ui-sidebar-mode-change` が発火すること |
| `FixedExpandedDefault`       | fixed かつ expanded で tree が利用可能であること                                       |
| `OverlayExpandedClosable`    | overlay かつ closable で標準 close 導線が存在すること                                   |
| `OverlayCollapsedInitial`    | 初期 collapsed で非活性状態から始まること                                                |
| `SelectionAndFocusSeparated` | `selectedId` と `focusedId` が独立に扱われること                                     |
| `ImmutableItemsInput`        | `items` 入力が破壊的変更されないこと                                                    |
| `TreeEventIntegration`       | tree 由来イベントが sidebar イベントへ再公開されること                                        |
| `StateControlledFlow`        | close 要求が request-close として通知され、親が state を再入力することで反映されること                 |
| `MethodIdempotency`          | `expand()` / `collapse()` / `toggle()` が冪等であること                           |
| `OverlayFocusSemantics`      | overlay が初期フォーカスとフォーカス返却を持ち、focus trap を持たないこと                            |
| `PrintHidden`                | print で sidebar が出力されないこと                                                 |

---

## 将来拡張の原則

### 最優先で検討する価値がある機能

#### 1. 標準 close 導線

overlay における close 操作は、毎回 `header-actions` へ個別にボタンを差し込むのではなく、`ui-sidebar` 自身の標準機能として提供する価値があります。

この機能を採用する場合は、次を満たします。

- `closable` により close 導線の有無を制御できること
- close 導線のアクセシブル名を `closeLabel` などで明示できること
- close ボタンの配置規則を固定し、Story ごとにばらつかせないこと
- close 操作は `ui-sidebar-request-close` を発火し、controlled な close フローへ接続すること

この機能は sidebar を重くするためではなく、overlay を**単独で完結する補助面**として成立させるために追加します。

#### 2. 現在項目の reveal API

本文側で現在表示中のノートや章に対応する tree 項目を、sidebar 内で即座に可視化する API は追加価値が高いです。

この機能を採用する場合は、次を満たします。

- `revealItem(id)` のように、任意 ID を可視領域へ導く API を持つこと
- `revealSelected()` のように、現在の `selectedId` を対象とする簡易 API を持てること
- reveal 時に必要な親ノード展開とスクロールを一貫して扱うこと
- reveal は選択変更やフォーカス変更を暗黙に伴わないことを原則とすること

この機能は検索やフィルタではなく、**読書面と移動面の同期**を補助する最小機能として位置づけます。

#### 3. `mode="auto"` の正規化と `ui-sidebar-mode-change`

`auto` を公開契約上の正規モードとして扱い、実効モードの変化を正規イベントで購読できるようにする価値があります。

この機能を採用する場合は、次を満たします。

- `mode` は `fixed` / `overlay` / `auto` の 3 値に固定すること
- 初期属性有無に依存した特別処理を公開契約へ持ち込まないこと
- 実効モードの変化は `ui-sidebar-mode-change` で通知すること
- `state-change` と `mode-change` を混同しないこと

この機能は見た目の追加ではなく、sidebar の**制御モデルをきれいにする API 拡張**です。

#### 4. `selectedId` と `focusedId` の分離

現在選択している項目と、キーボード操作上の現在フォーカス位置は、長期的には別状態として持つ方が明確です。

この機能を採用する場合は、次を満たします。

- `selectedId` は本文表示と対応づく選択状態として扱うこと
- `focusedId` は roving focus の現在位置として扱うこと
- `select` と `focus-change` のイベント意味論を分離すること
- reveal、フォーカス復元、キーボード移動の仕様を `focusedId` 基準で整理すること

この機能は、ツリー操作の意味論を明確にし、sidebar を**読書用ナビゲーションとして誤解なく扱えるようにする**ための拡張です。

### 条件付きで検討価値がある機能

#### 5. 幅のリサイズ

長いファイル名、深い階層、情報量の多い tree を扱う場合に限り、sidebar 幅の調整機能は検討価値があります。

この機能を採用する場合は、次を満たします。

- `resizable`、`width`、`minWidth`、`maxWidth` のような最小限の公開面に留めること
- 永続化は利用側責務とし、sidebar 自身は保存先を持たないこと
- overlay と fixed で幅変更体験が不自然に分岐しないこと
- 本文面の没入感を壊す過剰なドラッグ UI にしないこと

#### 6. landmark 名と見出し制御の拡張

アクセシビリティと文書構造の整合性を高めるため、`label`、`heading`、`headingLevel` をさらに厳密に制御できる拡張は検討価値があります。

この機能を採用する場合は、次を満たします。

- landmark 名と視覚見出しを独立に制御できること
- 必要であれば tree 自体のラベルも分離制御できること
- ページ全体の heading 階層を壊さないこと
- shell 固定のアクセシブル名へ依存しないこと

#### 7. controlled な展開状態 API

`items` を不変入力として保つなら、展開状態も外部制御できる API は長期的に検討価値があります。

この機能を採用する場合は、次を満たします。

- `expandedIds` のような明示的な入力を持つこと
- 展開変更は `ui-sidebar-expand` または専用イベントで通知すること
- `items` 自体へ破壊的に `isExpanded` を書き戻さないこと
- `selected` / `focused` / `expanded` の 3 状態を混線させないこと

#### 8. header 全体差し替えまたは overlay 専用補助領域

複雑なアプリケーション統合が必要な場合は、header 全体差し替え、または overlay 専用の補助操作領域を条件付きで検討できます。

この機能を採用する場合は、次を満たします。

- `heading` と header slot の責務を二重化しないこと
- fixed では見えず overlay でのみ見える要素であることを明示すること
- toolbar 化して本文より強い存在感を持たせないこと
- close 導線など頻出機能を ad hoc な slot 依存に戻さないこと

### 採用しない方針

- sidebar 自体への検索 UI の内蔵
- 本文レイアウト切替責務の吸収
- 他ナビゲーション部品との機能統合
- overlay と fixed の見た目差分の過剰拡大

---

## 現行実装との差分

本節は、本書の契約と現行実装との差分を整理するものです。以下は**将来の修正対象**であり、現時点で実装済みとは限りません。

### 未対応または未整合の事項

- `mode` は現行実装では `fixed` / `overlay` のみであり、`auto` を正規の公開値として持っていません
- `mode` 自動判定は初期属性有無に依存した特別処理を持っており、本書の単純な `auto` 契約とは異なります
- `selectedId` と `focusedId` は現行では `activeId` に統合されており、本書の分離契約とは異なります
- `items` は現行では下位 tree により破壊的に更新され得ます
- 現行入力型は `TreeNode` であり、状態名も `expanded` / `selected` を使用します。本書の `SidebarTreeNode`（`isExpanded` / `isSelected` / `isDisabled`）契約とは一致していません
- `items` は現行では必須入力ではなく、既定値 `[]` で動作します。本書の「必須入力」契約とは一致していません
- `ui-sidebar-mode-change` は現行未実装です
- `ui-sidebar-request-close` による controlled close フローは現行未実装です
- `focusSelected()` と `focusFirstItem()` は現行未実装です
- `ui-sidebar-state-change` は現行では `bubbles: false` / `composed: false` で再送出され、detail も `{ state, mode }` を含みます。本書の公開イベント契約とは一致していません
- `ui-sidebar-expand` と `ui-sidebar-focus-change` の detail は現行では `node` を含まず、本書の detail 契約とは一致していません
- `headingLevel` は現行未実装であり、見出しは固定 `<h2>` です
- `label` による landmark 名制御は現行未実装です。現行の landmark 名は shell 側固定文字列です
- `closable` による標準 close 導線は現行未整備です。slot に置いたボタンも sidebar 標準機能としては配線されません
- `fixedBreakpoint` は現行では shell 側で 320 px 未満を切り上げ、非数値を 1280 へ正規化します。さらに observer により host 側へ逆同期されるため、正規化責務の所在が本書契約と一致していません
- sidebar 自身は永続化を行わない契約ですが、現行実装では shell が state 変化時に localStorage へ書き込みます。`ui-sidebar` 経由では復元は実質無効化される一方、書き込み副作用は残っています
- method の冪等性と rapid toggle の last-write-wins を Storybook 契約として十分固定していません
- print 非表示は現行では結果としてそうなっている側面が強く、sidebar 自身の明示方針としては未固定です

### 実装方針

本書の契約へ合わせる場合は、次の順序で整理します。

1. `mode` を `fixed` / `overlay` / `auto` に再設計する
2. `activeId` を `selectedId` / `focusedId` へ分離する
3. `items` の破壊的更新を廃止し、`SidebarTreeNode` へ入力型を整理する
4. `mode-change` と `request-close` を追加する
5. `ui-sidebar-state-change` を含むイベント境界と detail 形状を本書契約へそろえる
6. `focusSelected()` / `focusFirstItem()` を実装する
7. `label` / `headingLevel` / `closable` を導入する
8. shell 由来の localStorage 書き込み副作用を除去し、永続化責務を利用側へ一本化する
9. `fixedBreakpoint` の正規化責務を host 側へ集約する
10. Storybook を本書の契約確認点へ更新する

### 本節の扱い

本節に記載した事項は、採用されるまでは公開契約として依存してよいものではありません。実装、Storybook、契約書の 3 点をそろえて更新したときにのみ、正式契約として昇格させます。

