# Sidebar Shell

## 概要

本書は、`ui-sidebar-shell` の**長期保守性を優先した再構成版コンポーネント契約書**です。現行実装の説明書ではなく、Rouault における sidebar shell を、今後どのような責務境界と公開面で維持するべきかを定義します。

`ui-sidebar-shell` は、本文の左側に置かれる補助ナビゲーション面を提供するコンポーネントです。ただし、本質は単なる「横から出るパネル」ではありません。**読書面の主従関係を壊さず、必要なときだけ確実に到達できる補助導線を成立させること**が責務です。

本書では、特に次の論点を先に固定します。

- **状態の所有権**
- **モードの所有権**
- **Overlay の意味論（非モーダル drawer として扱うこと）**
- **レイアウト占有とナビゲーション到達可能性を分離すること**
- **イベント時相を分離すること**

本書は、実装詳細よりも**設計の一貫性、拡張容易性、誤用しにくさ**を優先します。

---

## この文書の読み方

本書は、次の 3 層で構成します。

- **Normative**: 今後の実装と利用者が依存してよい公開契約
- **Rationale**: その契約を採る理由
- **Future Considerations**: 将来検討事項。現時点では依存禁止

以後、**Normative** と明記した節のみを正式契約として扱います。

---

## 設計原則

### 1. 読書面が主であり、サイドバーは従である

sidebar shell は本文の補助導線であり、本文の主役性を侵食してはなりません。固定表示でも Overlay 表示でも、常時強く主張する UI にはしません。

### 2. レイアウト責務とナビゲーション責務を分離する

sidebar shell は**ナビゲーション面そのもの**を担当します。親レイアウトの Grid Track 解放や 2 カラム構成の決定は、上位レイアウトコンポーネントの責務です。

### 3. controlled / uncontrolled を混在させない

内部状態、外部状態、永続化復元を暗黙に混在させません。状態所有権は公開 API で明示します。

### 4. Overlay は既定で非モーダルとする

Rouault の通常の読書文脈では、Overlay は dialog ではなく、**一時展開型の非モーダル drawer**として扱います。完全モーダル性が必要な場合は、上位パターンで実現します。

### 5. 見た目より到達可能性を優先する

展開・格納の遷移では、見た目のアニメーションよりも `inert`、`visibility`、フォーカス復帰などの意味論を優先します。

---

## 適用範囲

### Normative

本書は `ui-sidebar-shell` の次を対象とします。

- 公開 API
- 状態モデル
- Overlay / Fixed の意味論
- フォーカス契約
- イベント契約
- DOM / Accessibility 契約
- Visual Contract
- 環境差分
- 責務境界

### Normative

本書は次を対象外とします。

- サイドバー内部の情報設計
- ルーティング
- 現在地の決定ロジック
- 親レイアウトの列幅決定
- 開閉トリガー UI の描画
- 完全モーダル統合
- 子要素側の roving tabindex や tree 操作モデル

---

## コンポーネントの位置づけ

### Normative

`ui-sidebar-shell` は、**ナビゲーション面を提供する shell**です。layout shell ではありません。したがって、本コンポーネントが保証するのは次の 2 点です。

- サイドバー面の到達可能性と表示モード
- 補助ナビゲーションとしての一貫した振る舞い

一方で、本コンポーネントは次を保証しません。

- `collapsed` 時に親レイアウトの列幅が `0` になること
- Overlay 時に背景全体が操作不能になること
- 開閉トリガーが自動生成されること

---

## 公開契約

### 公開入力

#### Normative

`ui-sidebar-shell` は次の公開入力を持ちます。

| 名前                 | 種別                                          | 必須   | 内容                               | 契約                                                            |
| -------------------- | --------------------------------------------- | ------ | ---------------------------------- | --------------------------------------------------------------- |
| `state`              | property / attribute (`data-state`)           | いいえ | controlled な開閉状態              | `expanded` / `collapsed`                                        |
| `defaultState`       | property / attribute (`default-state`)        | いいえ | uncontrolled 初期状態              | `expanded` / `collapsed`。既定値は `expanded`                   |
| `mode`               | property / attribute                          | いいえ | モード指定                         | `fixed` / `overlay` / `auto`。既定値は `auto`                   |
| `resolvedMode`       | read-only property                            | はい   | 実効モード                         | `fixed` / `overlay`                                             |
| `fixedBreakpoint`    | property / attribute (`fixed-breakpoint`)     | いいえ | `mode="auto"` 時の切替幅           | 数値。既定値は `1280`                                           |
| `persist`            | property / attribute                          | いいえ | state 永続化可否                   | `true` / `false`。既定値は `true`                               |
| `persistenceKey`     | property / attribute (`persistence-key`)      | いいえ | 永続化キー                         | 文字列。既定値は `rouault.sidebar.state`                        |
| `navLabel`           | property / attribute (`nav-label`)            | いいえ | `nav` の accessible name           | 文字列。既定値はローカライズ層で供給                            |
| `initialFocusPolicy` | property / attribute (`initial-focus-policy`) | いいえ | Overlay 展開時の初期フォーカス方針 | `current-item` / `header-action` / `first-interactive` / `none` |
| `restoreFocusPolicy` | property / attribute (`restore-focus-policy`) | いいえ | Overlay 格納時のフォーカス復帰方針 | `trigger` / `previous-active-element` / `none`                  |

#### Normative

`state` が明示されている場合、本コンポーネントは **controlled** として振る舞います。このとき、内部状態は `state` を上書きしてはなりません（MUST NOT）。

#### Normative

`state` が明示されていない場合、本コンポーネントは **uncontrolled** として振る舞います。このとき、初期状態は次の優先順位で決定します。

1. 永続化復元値（`persist=true` の場合）
2. `defaultState`
3. 既定値 `expanded`

#### Normative

`mode` は利用者入力であり、`resolvedMode` は実効値です。`mode="auto"` のときのみ、`fixedBreakpoint` により `resolvedMode` を自動決定します。

#### Normative

`fixedBreakpoint` は数値として解釈し、非有限値は `1280` とします。`320` 未満は `320` に正規化します。

#### Normative

`persist` は **uncontrolled state** にのみ適用します。controlled state に対しては、コンポーネント自身が永続化を主導してはなりません（MUST NOT）。

### スロット契約

#### Normative

`ui-sidebar-shell` は次のスロットを持ちます。

| 名前         | 種別       | 位置づけ         | 内容                         |
| ------------ | ---------- | ---------------- | ---------------------------- |
| 既定スロット | slot       | 正規入力         | ナビゲーション本文           |
| `header`     | named slot | Overlay 補助入力 | Overlay 表示時の補助ヘッダー |

#### Normative

既定スロットはナビゲーション項目群を受け取ります。`header` スロットは Overlay 表示時にのみ表示に参加します。Fixed 表示では `header` を描画対象に含めません。

#### Normative

`header` スロットは、**Overlay における補助領域**です。主用途は次に限定します。

- 閉じる操作
- 現在コンテキストの提示
- Overlay 専用の軽量な補助操作

`header` スロットに本文ナビゲーションの主構造を置くことは推奨しません（SHOULD NOT）。

### 公開メソッド

#### Normative

`ui-sidebar-shell` は次の公開メソッドを持ちます。

| 名前                   | 種別   | 契約                                                             |
| ---------------------- | ------ | ---------------------------------------------------------------- |
| `expand(trigger?)`     | method | 展開要求を行います                                               |
| `collapse(reason?)`    | method | 格納要求を行います                                               |
| `toggle(trigger?)`     | method | 現在の state に応じて展開・格納要求を切り替えます                |
| `focusInitialTarget()` | method | 現在の `initialFocusPolicy` に従って初期フォーカスを再実行します |

#### Normative

`expand(trigger?)` と `toggle(trigger?)` は、`restoreFocusPolicy="trigger"` の場合に備えて返却先候補を更新できます。状態変化が起きない場合でも、返却先候補の更新だけは成立してよいです。

#### Normative

`collapse(reason?)` の `reason` は `api` / `scrim` / `escape` / `navigation` / `unknown` のいずれかとします。これにより、上位レイヤは格納理由に応じた副作用分岐を行えます。

---

## 状態モデル

### 状態軸

#### Normative

本コンポーネントの公開状態軸は、次の 3 つです。

- **Visibility State**: `expanded` / `collapsed`
- **Mode Input**: `fixed` / `overlay` / `auto`
- **Resolved Mode**: `fixed` / `overlay`

#### Normative

`collapsed` は**到達可能性の停止**を意味します。これはレイアウト占有の解放を意味しません。レイアウト占有の有無は、上位レイアウトが決めます。

#### Normative

Overlay は**非モーダル drawer**です。すなわち、次を満たします。

- 背景全面の inert 化は要求しません
- Focus Trap を要求しません
- 背景へのフォーカス移動を不具合とみなしません
- scrim は視覚的前景化と pointer close affordance を担います

#### Normative

Fixed は**常設補助ナビゲーション**です。常時表示を前提としますが、`collapsed` のときは到達不能かつ視覚的に退避した状態を取ります。

### 初期化優先順位

#### Normative

初期化時の優先順位は次のとおりです。

##### state

1. 明示 `state`
2. uncontrolled + `persist=true` の復元値
3. `defaultState`
4. `expanded`

##### mode

1. 明示 `mode` が `fixed` または `overlay`
2. `mode="auto"` に基づく自動判定
3. `fixed`

#### Normative

attribute と property が競合する場合、**直近で設定されたもの**を優先してよいですが、少なくとも「property が最終ソース・オブ・トゥルース」であることを推奨します。

---

## フォーカス契約

#### Normative

Overlay 展開時の初期フォーカスは `initialFocusPolicy` に従います。

| 値                  | 契約                                            |
| ------------------- | ----------------------------------------------- |
| `current-item`      | `aria-current="page"` を持つ要素を優先します    |
| `header-action`     | `header` スロット内の最初の対話要素を優先します |
| `first-interactive` | shell 内の最初の対話要素を優先します            |
| `none`              | 自動フォーカス移動を行いません                  |

#### Normative

いずれの方針でも候補が見つからない場合は、次のフォールバック順とします。

1. 既定スロット内の最初の対話要素
2. `header` スロット内の最初の対話要素
3. フォーカス移動なし

#### Normative

Overlay 格納時のフォーカス復帰は `restoreFocusPolicy` に従います。

| 値                        | 契約                                  |
| ------------------------- | ------------------------------------- |
| `trigger`                 | 直近の開閉トリガー候補へ復帰します    |
| `previous-active-element` | 展開前の `activeElement` へ復帰します |
| `none`                    | 自動復帰を行いません                  |

#### Normative

復帰先が未接続である場合は、代替探索を行わず、フォーカス復帰を省略してよいです。

#### Rationale

初期フォーカスや復帰先を DOM 探索順だけに依存すると、ナビゲーション構造や `header` スロットの役割が増えた時点で壊れやすくなります。方針を enum 化しておく方が、長期保守に向きます。

---

## イベント契約

#### Normative

本コンポーネントは、少なくとも次の公開イベントを持ちます。

| イベント名                        | 内容                                    | cancelable |
| --------------------------------- | --------------------------------------- | ---------- |
| `ui-sidebar-state-will-change`    | state 変更が受理されたことを示します    | いいえ     |
| `ui-sidebar-state-change`         | 論理状態変更が確定したことを示します    | いいえ     |
| `ui-sidebar-state-settled`        | 主視覚遷移が完了したことを示します      | いいえ     |
| `ui-sidebar-resolved-mode-change` | `resolvedMode` が変化したことを示します | いいえ     |

#### Normative

`ui-sidebar-state-change` の detail は、少なくとも次を持ちます。

- `state`
- `resolvedMode`
- `reason`
- `controlled`

#### Normative

`ui-sidebar-state-change` は**論理状態の確定通知**であり、視覚遷移完了通知ではありません。視覚遷移完了は `ui-sidebar-state-settled` で通知します。

#### Normative

`ui-sidebar-resolved-mode-change` は `mode` 入力変化通知ではなく、**実効モード変化通知**です。

#### Normative

イベントは host 要素から直接購読することを前提とし、親要素でのイベント委譲を前提にしません。`bubbles=false`、`composed=false` を既定とします。

#### Normative

同値 no-op は `ui-sidebar-state-will-change`、`ui-sidebar-state-change`、`ui-sidebar-state-settled` を発火しません。

---

## 再入安全性

#### Normative

展開・格納要求は再入安全でなければなりません（MUST）。連続要求が来た場合、本コンポーネントは逐次実行キューまたは等価な仕組みで状態遷移を直列化します。

#### Normative

同一状態への要求は no-op として扱ってよいですが、`restoreFocusPolicy` のための返却先候補更新だけは成立してよいです。

---

## DOM / Accessibility 契約

#### Normative

主要ランドマークはネイティブ `<nav>` とします。`role="navigation"` を重ねて付与する必要はありません。

#### Normative

`nav` の accessible name は `navLabel`、`aria-label`、または `aria-labelledby` のいずれかにより供給できなければなりません（MUST）。コンポーネント内で固定文言を埋め込むことは推奨しません（SHOULD NOT）。

#### Normative

格納状態では、ナビゲーション面を `inert` とし、加えて視覚的にも非表示状態へ遷移させなければなりません（MUST）。

#### Normative

Overlay は非モーダルであるため、`aria-modal="true"` を直接担ってはなりません（MUST NOT）。完全モーダル化は上位統合の責務です。

#### Normative

本コンポーネントは、子要素に対して次のみを要求します。

- 現在地表現には `aria-current="page"` を使用できること
- 子要素自身のキーボード操作モデルは子コンポーネントが定義すること
- shell 自身は tree / list / menu のいずれかを強制しないこと

#### Normative

Esc による格納は Overlay 時に有効です。Esc の監視対象は host 内に限定してもよいですが、採る場合は**host 全体で一貫して有効**でなければなりません。`nav` 内限定のような局所契約は推奨しません。

#### Rationale

Overlay が非モーダルである一方、Esc だけが局所的にしか効かない設計は期待とずれやすく、運用上の例外が増えます。非モーダルであっても、「Overlay が開いている限り host では Esc が効く」とした方が分かりやすくなります。

---

## Visual Contract

#### Normative

Visual Contract の目的は、sidebar shell を**本文の補助面として静かに存在させること**です。

#### Normative

Fixed と Overlay の視覚意味は、次のとおりです。

- **Fixed**: 常設補助面。本文の横に静かに存在する
- **Overlay**: 一時前景化面。必要時だけ手前に出る

#### Normative

`collapsed` の視覚意味は「本文へ主役を戻す」であって、「レイアウトから完全消滅する」ではありません。

#### Normative

Overlay の scrim は、次の意味だけを持ちます。

- Overlay が前景にあることの視覚化
- pointer で閉じられることの明示

scrim は dialog のような厳格な遮断層を意味しません。

#### Normative

視覚拡張は CSS Custom Properties を主要経路とします。`::part(...)` を公開する場合でも、`panel`、`scrim`、`header`、`content` の少数に限定します。

#### Rationale

完全非公開の Shadow DOM は保守しやすい一方で、長期的にはテーマ要求を受け止めにくくなります。公開面を少数の part に限定すると、厳格さと拡張性の均衡が取りやすくなります。

---

## レイアウト契約

#### Normative

`:host` は `display: block` を基本とし、高さ制約を持つ親レイアウト内で安定して配置できることを要求します。

#### Normative

本コンポーネントは親レイアウトの track 幅を自動変更しません。Fixed × `collapsed` 時も、親レイアウトの幅解放は保証しません。

#### Normative

親レイアウトの幅解放が必要な場合は、`ui-sidebar-layout` 相当の上位コンポーネントまたはレイアウト規約で扱います。

#### Rationale

「到達不能状態」と「列幅 0」は別概念です。これらを 1 コンポーネントに抱え込むと、画面ごとに `collapsed` の意味が変質しやすくなります。

---

## キーボード契約

#### Normative

Esc は Overlay 時の閉じる操作として予約します。

#### Normative

Tab 循環制御および Focus Trap は提供しません。これは、Overlay を非モーダル drawer と定義することに対応します。

#### Normative

Arrow key、Home / End、typeahead などのナビゲーション操作は shell の責務ではありません。必要な場合は、子要素コンポーネントが定義します。

---

## 永続化契約

#### Normative

永続化対象は uncontrolled state のみです。

#### Normative

永続化失敗は描画失敗理由にしてはなりません（MUST NOT）。Storage へアクセスできない環境では、永続化なしで継続動作します。

#### Normative

`persistenceKey` は明示入力で上書き可能でなければなりません。固定キーを暗黙の公開契約として扱うことは推奨しません。

---

## トークン・レイヤー契約

#### Normative

本コンポーネントは、次の種類の設計トークンを参照します。

- 面色
- 境界線色
- ヘッダー高
- サイドバー幅
- scrim opacity
- duration / easing
- layer order

#### Normative

z-index は数値そのものではなく、次の**相対順序**を満たさなければなりません（MUST）。

1. document content
2. fixed app header
3. sidebar scrim
4. sidebar panel
5. dialog / stronger modal surfaces
6. toast / emergency overlays

#### Rationale

相対順序を先に決めておくと、複数コンポーネント間で z-index 値の偶然一致に依存しなくて済みます。

---

## 環境別の振る舞い

#### Normative

`prefers-reduced-motion: reduce` では主遷移時間を極小化します。ただし、state semantics は変えません。

#### Normative

`forced-colors: active` では現在地表現が失われないことを優先します。`aria-current="page"` を持つ slotted 要素は、明示的に知覚可能でなければなりません。

#### Normative

印刷時は shell 全体を非表示にしてよいです。

---

## Storybook 契約

#### Normative

Storybook は見本ではなく契約検証です。少なくとも、次を独立した Story として維持します。

- controlled state
- uncontrolled state
- persistence on / off
- `mode="auto"` と `resolvedMode`
- Overlay 非モーダル性
- Esc close
- scrim close
- `initialFocusPolicy` の各分岐
- `restoreFocusPolicy` の各分岐
- state event と settled event の分離
- parent layout が track を解放しないこと
- forced-colors / reduced-motion
- rapid toggle に対する再入安全性
- attribute 変更と property 変更の双方向同期
- implicit auto mode 判定と mode 属性反映
- `header` スロットの mode 依存可視性
- `inert` / `visibility` の切替タイミング
- dark mode 面の維持
- scrim opacity パブリックトークンの上書き

#### Rationale

現行実装の Storybook / Boundary Story は、通常の見た目確認より広く、**属性反映、永続化、`header` スロット可視性、`inert` 戦略タイミング、dark mode、forced colors、reduced motion、scrim token** まで検証対象に含めています。したがって、契約書側もこれらの存在を明示しておいた方が、現行実装との対応関係が崩れにくくなります。

---

## 設計判断の根拠

### 非モーダル Overlay を採る理由

Rouault の sidebar は、本文を読む行為を補助するための導線であり、常に dialog 相当の強い遮断性は不要です。Overlay を非モーダルに固定すると、操作の意味が軽くなり、読書文脈との整合も取りやすくなります。

### state / mode を二層化する理由

状態とその解決結果を分離しない設計は、controlled / uncontrolled / responsive auto 切替が混ざった時点で壊れやすくなります。`mode` と `resolvedMode` を分け、`state` と `defaultState` を分ける方が API として明快です。

### layout 責務を分ける理由

レイアウト列幅とナビゲーション到達可能性は別概念です。これを 1 コンポーネントに押し込むと、`collapsed` の意味が画面ごとに変わります。shell は面の意味を守り、layout は幅を扱う方が保守しやすくなります。

---

## 新規で追加を検討する価値がある機能

本節は現時点の公開契約ではありません。ここに記載した事項へ依存してはなりません（MUST NOT）。

本節では、`ui-sidebar-shell` に新規で追加する価値がある機能を、**読書面の主役性を壊さず、責務境界を濁らせず、契約として意味を持たせられるか**という観点で整理します。

追加候補は「便利そうだから」ではなく、次の基準で選別します。

- 既存契約の穴を埋めるか
- state / mode / focus / dismiss の意味論を明瞭にするか
- 読書面への復帰を速くするか
- layout、routing、child semantics の責務を不必要に抱え込まないか

### 最優先で検討する価値がある機能

#### 1. `closeOnNavigation`

Overlay でナビゲーション項目を選択した後に自動で格納するかどうかを制御する入力です。モバイルや小画面では、遷移後も drawer が残ると本文への復帰が遅れやすいため、読書導線の観点から価値が高いです。

**狙い**

- ナビゲーション選択後の本文復帰を速くする
- 画面ごとに「閉じる / 閉じない」がぶれるのを防ぐ
- `collapse(reason='navigation')` と一貫した意味論を与える

**望ましい契約**

- `closeOnNavigation: boolean | 'overlay-only'`
- 既定値は `overlay-only`
- shell 自身は router を知りません
- 子要素または上位レイヤが navigation 完了または選択イベントを通知し、shell はそれを受けて格納します

**採用理由**

これは単なる便利機能ではなく、Rouault の「没入して読む」体験に対し、**本文へ戻りやすくするための基礎機能**です。

#### 2. `modeTransitionPolicy`

`resolvedMode` が `fixed` と `overlay` の間で変化したときに、`state` をどのように扱うかを定義する入力です。レスポンシブ境界で `expanded` / `collapsed` をどう引き継ぐかは、現状のままだと画面ごとにばらつきやすい論点です。

**狙い**

- ブレークポイント跨ぎの state 挙動を安定化する
- persistence と responsive auto 判定の競合を減らす
- Storybook 上で mode 切替時の期待値を固定しやすくする

**望ましい契約**

- `modeTransitionPolicy: 'preserve-state' | 'expand-on-fixed' | 'collapse-on-overlay'`
- 既定値候補は `preserve-state` または `expand-on-fixed`
- `ui-sidebar-resolved-mode-change` と整合すること

**採用理由**

これは見た目の機能ではなく、**状態機械の境界条件を仕様化する機能**です。長期的な保守性に直接効きます。

#### 3. `dismissPolicy`

Overlay の閉じ方を、個別フラグではなく 1 つの方針入力で整理するための入力です。`closeOnOutsideClick`、`closeOnEscape`、`closeOnNavigation` などを個別追加していくと、仕様が断片化しやすくなります。

**狙い**

- non-modal drawer の意味論を一段上の抽象で整理する
- scrim、Esc、navigation、outside-focus などの閉じ方を一貫して扱う
- 画面固有の if 文で挙動が増殖するのを防ぐ

**望ましい契約**

- `dismissPolicy: 'explicit-only' | 'scrim-and-escape' | 'passive-auto'`
- `explicit-only`: トリガーまたは API による明示操作でのみ閉じる
- `scrim-and-escape`: scrim と Esc で閉じる
- `passive-auto`: navigation や outside-focus を含めて受動的に閉じ得る

**採用理由**

Overlay の意味論を今後も非モーダル drawer として維持するなら、dismiss の整理は核になります。個別フラグを増やすより、**契約の抽象度を上げる方が設計としてきれい**です。

### 条件付きで検討する価値がある機能

#### 4. `ui-sidebar-layout` との正式分離

これは `ui-sidebar-shell` 自体への機能追加ではなく、責務分割を明示するための相方コンポーネント導入です。親レイアウトの track 幅解放や Zen Mode 的な 2 カラム制御を正規に扱いたい場合に価値があります。

**狙い**

- `collapsed` を到達可能性停止として純化する
- 列幅解放を shell の責務から切り離す
- layout と shell の責務混線を防ぐ

**望ましい契約**

- `ui-sidebar-shell` は面の意味だけを扱う
- `ui-sidebar-layout` は sidebar track の予約 / 解放だけを扱う
- 両者は疎結合に保つ

**採用理由**

これは shell を肥大化させずに設計をきれいに保つための分離策です。複数画面で Zen Mode や列幅制御が必要になった段階で価値が高まります。

#### 5. `sizePreset` / `widthPolicy`

サイドバー幅を意味的な preset として制御するための入力です。ノート一覧主体、目次主体、補助メタデータ主体など、サイドバーの情報密度に応じて適正幅が変わる場合に有効です。

**狙い**

- 幅を単なる CSS 値ではなく意味的な契約にする
- overlay と fixed で適正幅を変えやすくする
- 画面ごとの ad-hoc な幅指定を減らす

**望ましい契約**

- `sizePreset: 'compact' | 'default' | 'wide'`
- 必要なら `fixedSizePreset` と `overlaySizePreset` に分離
- 自由ドラッグリサイズは当面採らない

**採用理由**

幅の意味を preset に寄せると、デザイン整合性と保守性を両立しやすくなります。ただし責務を増やし過ぎないため、まずは preset に留める方がよいです。

#### 6. `initialFocusTarget`

`initialFocusPolicy` に加えて、必要なときだけ明示的な初期フォーカス先を指定するための入力です。複雑なナビゲーション構造や、header action を強く優先したい文脈で価値があります。

**狙い**

- policy だけでは表現しにくい初期フォーカス要求に対応する
- DOM 探索順への依存を減らす
- 構造変更後もフォーカス開始位置を固定しやすくする

**望ましい契約**

- `initialFocusTarget?: string`
- selector より `id` や slot ベースの安全な解決を優先する
- 見つからない場合は `initialFocusPolicy` にフォールバックする

**採用理由**

必要な画面では有効ですが、常用すると構造依存が増えるため、導入は限定的であるべきです。

#### 7. `restoreFocusFallback`

格納時の復帰先が未接続または無効であった場合に、どこへフォーカスを戻すかを追加制御する入力です。ルート遷移や条件付きレンダリングが多い画面で有効です。

**狙い**

- フォーカスロスト感を減らす
- close reason ごとに復帰戦略を整えやすくする
- 予期しない focus nowhere 状態を減らす

**望ましい契約**

- `restoreFocusFallback: 'none' | 'host' | 'first-trigger-in-document'`
- 既定値は `none`
- `restoreFocusPolicy` より優先度は低く、補助手段として扱う

**採用理由**

通常は不要ですが、上位ルーティングや条件付き描画が強い環境では有効です。必要になるまで本体契約へ昇格させない方がきれいです。

### 採用を推奨しない方向

以下は一見便利に見えても、`ui-sidebar-shell` の責務を濁らせやすいため、採用を推奨しません。

#### 1. shell 自身が router を知ること

navigation close を実現したいとしても、router 依存を本体へ入れるべきではありません。routing 層への依存は再利用性を大きく落とします。

#### 2. Focus Trap の常設化

Overlay を非モーダル drawer と定義した設計と衝突します。完全モーダル性が必要なら、上位統合で扱う方がよいです。

#### 3. 自由ドラッグによる幅変更

一見有用ですが、永続化、レスポンシブ、読書面との干渉、タッチ環境対応などを一気に複雑化させます。まずは preset で十分です。

#### 4. child navigation semantics の内包

tree / list / menu のキーボード責務まで shell が抱えるべきではありません。子要素側コンポーネントへ委譲した方が、設計は明瞭です。

---

## Future Considerations

本節は現時点の公開契約ではありません。ここに記載した事項へ依存してはなりません（MUST NOT）。

### 1. `header` スロット名の見直し

将来的には `header` を `overlay-header` へ改名した方が責務は明確になります。ただし、互換性のため、現時点では即時変更対象としません。

### 2. 限定的な `::part(...)` 公開

テーマ要求が増えた場合、`panel`、`scrim`、`header`、`content` のみを part として限定公開する余地があります。

### 3. 完全モーダル統合

検索や設定など、強い前景化が必要な文脈では、上位コンポーネント側で `aria-modal` 相当の統合を行う余地があります。ただし、sidebar shell 単体の責務にはしません。

### 4. close reason の拡張

将来的には `route-change`、`viewport-change`、`outside-focus` などを追加する可能性があります。

---

## 現行実装との差分整理

本節は参考情報であり、Normative ではありません。

現行実装との差分は主に次のとおりです。

- 現行は `state` / `mode` / `fixedBreakpoint` 中心ですが、本書では `defaultState`、`persist`、`persistenceKey`、`resolvedMode`、各種 focus policy を追加しています。
- 現行は `mode` 未指定時に auto 判定されますが、本書では `mode="auto"` を明示値として要求します。
- 現行は LocalStorage 永続化を内部で持ちますが、本書では uncontrolled state に限定しています。
- 現行は `ui-sidebar-state-change` のみですが、本書では `will-change`、`change`、`settled`、`resolved-mode-change` へ分離しています。
- 現行は Esc 処理が局所的ですが、本書では host 単位での一貫性を推奨しています。
- 現行は `collapsed` とレイアウト解放が Story 上で近接していますが、本書では両者を明確に分離しています。

---

## 現行実装を基準にした未対応・未固定項目

本節は参考情報であり、Normative ではありません。本節の目的は、**本書で提示した契約や追加候補のうち、現行 `sidebar-shell.ts` と `sidebar-shell.stories.ts` / `sidebar-shell-boundary.stories.ts` を基準にして、まだ実装されていないもの、または現行では別挙動のものを記述漏れなく列挙すること**です。

### 公開入力で未対応のもの

現行実装が公開入力として持つのは、`state`、`mode`、`fixedBreakpoint` のみです。したがって、次の入力は**現行未対応**です。

- `defaultState`
- `resolvedMode`（read-only property）
- `persist`
- `persistenceKey`
- `navLabel`
- `initialFocusPolicy`
- `restoreFocusPolicy`

現行では `mode` は `fixed | overlay` の 2 値のみであり、`auto` は**attribute 未指定時の暗黙動作**としてのみ存在します。また、`nav` の accessible name は公開入力ではなく、日本語固定ラベルです。

### 公開メソッドで未対応のもの

現行実装が持つ公開メソッドは `expand(trigger?)`、`collapse()`、`toggle(trigger?)` のみです。したがって、次は**現行未対応**です。

- `collapse(reason?)`
- `focusInitialTarget()`

また、`collapse()` は close reason を受け取らず、`scrim` / `escape` / `api` の区別を detail や内部状態として残しません。

### イベント契約で未対応のもの

現行実装が発火する公開イベントは `ui-sidebar-state-change` のみです。detail も `{ state, mode }` に限定されます。したがって、次は**現行未対応**です。

- `ui-sidebar-state-will-change`
- `ui-sidebar-state-settled`
- `ui-sidebar-resolved-mode-change`
- `detail.reason`
- `detail.controlled`
- `detail.resolvedMode`

また、現行の `ui-sidebar-state-change` は**論理状態変更通知と視覚遷移完了通知を兼ねている**ため、本書で意図した時相分離は未対応です。

### state 所有権まわりで未対応・未固定のもの

本書では controlled / uncontrolled を分離しましたが、現行実装はそこまで分離していません。特に次は**未対応または現行挙動が異なる**点です。

- `state` と `defaultState` の分離
- controlled state に対する永続化無効化
- `persist=false` による永続化 opt-out
- `persistenceKey` の差し替え

現行では `data-state` attribute が明示されている場合に限り復元を抑制しますが、状態変更後の永続化自体は引き続き行います。したがって、**controlled state では永続化を主導しない**という本書の契約は、現行未対応です。

### mode 所有権まわりで未対応・未固定のもの

本書では `mode` と `resolvedMode` を分離しましたが、現行実装では `mode` 自体が実効モードでもあります。したがって、次は**現行未対応**です。

- `mode="auto"` という明示値
- `resolvedMode` の読み取り専用公開
- `resolvedMode` 変化通知イベント
- `modeTransitionPolicy`

現行では `mode` attribute がなければ `matchMedia` により `mode` を直接書き換えます。このため、入力値と実効値の分離はまだ行われていません。

### フォーカス契約で未対応・未固定のもの

本書では初期フォーカスと復帰フォーカスを policy 化しましたが、現行実装は固定アルゴリズムです。したがって、次は**現行未対応**です。

- `initialFocusPolicy`
- `restoreFocusPolicy`
- `initialFocusTarget`
- `restoreFocusFallback`

現行の初期フォーカスは **`header` スロット優先 → 既定スロット** の固定順です。復帰先は `trigger` または当時の `activeElement` を内部記録したものに固定され、選択肢化されていません。

### キーボード / dismiss 契約で未対応・未固定のもの

本書および追加検討節で整理した dismiss 系の抽象化は、現行未対応です。

- `dismissPolicy`
- `closeOnNavigation`
- close reason の公開
- host 全体で一貫した Esc 監視

現行の Esc は `nav` 要素に対する `keydown` に限られます。また、scrim click と Esc と API close の差は、イベント detail に出ません。

### スタイル拡張面で未対応・未固定のもの

本書では将来的な限定 `::part(...)` 公開可能性に触れていますが、現行実装は次の状態です。

- `part` attribute は Shadow DOM 内に存在しません
- `::part(...)` 公開はありません
- 拡張面は CSS Custom Properties に事実上限定されます

したがって、`panel`、`scrim`、`header`、`content` の part 公開は**現行未対応**です。

### Storybook 契約上の未整理点

現行 Storybook / Boundary Story は、次の事項をすでに検証していますが、旧版の契約書では列挙漏れがありました。本書では Storybook 契約節へ追記済みです。

- attribute 変更と property 変更の双方向同期
- LocalStorage 永続化
- implicit auto mode 判定
- `header` スロットの mode 依存可視性
- `inert` / `visibility` の切替タイミング
- dark mode 面の維持
- scrim opacity パブリックトークン上書き
- forced colors と reduced motion / print の CSS 契約

### 現行実装に存在し、依存してよい挙動

逆に、次は現行実装に**すでに存在し、記述漏れなく依存対象として扱ってよい**挙動です。

- `data-state` と property の双方向同期
- `fixedBreakpoint` の数値正規化（非有限値は `1280`、`320` 未満は `320`）
- `data-state` 明示時の復元抑制
- LocalStorage 失敗時のフォールトトレラント動作
- `ui-sidebar-state-change` の `bubbles=false` / `composed=false`
- 高速トグル時の再入安全性
- `collapsed` 時の `inert` と `visibility: hidden`
- Overlay 展開時の `header` 優先フォーカス
- Overlay 格納時の trigger フォーカス復帰
- Fixed での `header` 非表示
- scrim opacity のパブリックトークン `--ui-sidebar-scrim-opacity`

### 本節の読み替え

本節に挙げた未対応・未固定項目は、今すぐ実装すべきという意味ではありません。重要なのは、**本書で提示した将来契約と、現行実装で実際に存在する公開面を混同しないこと**です。今後契約へ昇格させる場合は、実装、Storybook、契約書の 3 点を同時に更新します。

---

## 現時点で依存してよい核となる契約

### Normative

最後に、特に重要な核を再掲します。

1. `ui-sidebar-shell` はナビゲーション面の shell であり、layout shell ではないこと。
2. `collapsed` は到達可能性停止を意味し、レイアウト解放を意味しないこと。
3. Overlay は既定で非モーダル drawer であること。
4. `state` / `defaultState`、`mode` / `resolvedMode` を分離すること。
5. イベントは `will-change` / `change` / `settled` / `resolved-mode-change` に分離すること。
6. フォーカス開始位置と復帰方針を policy として公開入力化すること。
7. 永続化は uncontrolled state に限定すること。
8. 読書面の主役性を壊さないこと。
