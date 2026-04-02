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

本書は、次の 2 層で構成します。

- **Normative**: 実装と利用者が依存してよい公開契約
- **Rationale**: その契約を採る理由

以後、**Normative** と明記した節のみを正式契約として扱います。

将来拡張の候補は独立節としては持たず、**採用するものは本文へ吸収し、採用しないものは適用範囲で対象外として明記**します。

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
- mode 自動切替時の state 解決規則
- ナビゲーション確定時の自動格納規則
- フォーカス契約
- イベント契約
- DOM / Accessibility 契約
- Visual Contract
- 環境差分
- 責務境界

### Normative

本書は次を対象外とします。

- サイドバー内部の情報設計
- ルーティングそのもの
- 現在地の決定ロジック
- 親レイアウトの列幅決定
- 開閉トリガー UI の描画
- 完全モーダル統合
- 子要素側の roving tabindex や tree 操作モデル
- `dismissPolicy` のような包括的 dismiss 抽象
- `ui-sidebar-layout` の個別契約
- `sizePreset` / `widthPolicy` のような幅 preset 入力
- `initialFocusTarget` のような明示ターゲット指定入力
- shell 自身が router を知ること
- child navigation semantics の内包

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

| 名前                   | 公開面                                      | 既定値                        | 内容                                   | 契約                                                            |
| ---------------------- | ------------------------------------------- | ----------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| `state`                | property / attribute (`data-state`)         | なし                          | controlled な開閉状態                  | `expanded` / `collapsed`                                        |
| `defaultState`         | property / attribute (`default-state`)      | `expanded`                    | uncontrolled 初期状態                  | `expanded` / `collapsed`                                        |
| `mode`                 | property / attribute                        | `auto`                        | モード指定                             | `fixed` / `overlay` / `auto`                                    |
| `fixedBreakpoint`      | property / attribute (`fixed-breakpoint`)   | `1280`                        | `mode="auto"` 時の切替幅               | 数値。非有限値は `1280`、`320` 未満は `320` に正規化            |
| `modeTransitionPolicy` | property / attribute (`mode-transition-policy`) | `collapse-on-overlay-entry` | `resolvedMode` 変化時の state 解決方針 | `preserve` / `collapse-on-overlay-entry`                        |
| `persist`              | property / attribute                        | `true`                        | state 永続化可否                       | `true` / `false`                                                |
| `persistenceKey`       | property / attribute (`persistence-key`)    | 実装既定値                    | 永続化キー                             | 文字列                                                          |
| `navLabel`             | property / attribute (`nav-label`)          | なし                          | `nav` の accessible name               | 文字列。未指定時は `aria-label` または `aria-labelledby` で補う |
| `closeOnNavigation`    | property / attribute (`close-on-navigation`) | `overlay-only`               | navigation 確定時の自動格納方針        | `true` / `false` / `overlay-only`                               |
| `initialFocusPolicy`   | property / attribute (`initial-focus-policy`) | `current-item`              | Overlay 展開時の初期フォーカス方針     | `current-item` / `header-action` / `first-interactive` / `none` |
| `restoreFocusPolicy`   | property / attribute (`restore-focus-policy`) | `trigger`                   | Overlay 格納時のフォーカス復帰方針     | `trigger` / `previous-active-element` / `none`                  |

### 公開観測値

#### Normative

`ui-sidebar-shell` は次の公開観測値を持ちます。

| 名前           | 公開面             | 内容       | 契約                |
| -------------- | ------------------ | ---------- | ------------------- |
| `resolvedMode` | read-only property | 実効モード | `fixed` / `overlay` |

#### Normative

`state` が明示されている場合、本コンポーネントは **controlled** として振る舞います。このとき、内部状態は `state` を上書きしてはなりません（MUST NOT）。

#### Normative

`state` が明示されていない場合、本コンポーネントは **uncontrolled** として振る舞います。このとき、初期状態は次の優先順位で決定します。

1. 永続化復元値（`persist=true` の場合）
2. `defaultState`
3. `expanded`

#### Normative

`mode` は利用者入力であり、`resolvedMode` は実効値です。`mode="auto"` のときのみ、`fixedBreakpoint` により `resolvedMode` を自動決定します。

#### Normative

`modeTransitionPolicy` は、**`mode="auto"` による `resolvedMode` 変化時の uncontrolled state 解決**にのみ適用します。controlled state では、`resolvedMode` の変化は通知してよいですが、state 自体の決定は外部所有者が行います。

#### Normative

`closeOnNavigation` は、shell 自身が router を知ることを意味しません。shell は **navigation 確定通知を受けたときに限り**、本方針に従って格納判定を行います。

#### Normative

`persist` は **uncontrolled state** にのみ適用します。controlled state に対しては、コンポーネント自身が永続化を主導してはなりません（MUST NOT）。

#### Normative

同一時点で property と attribute の両方が与えられている場合、**property を正規の入力ソース・オブ・トゥルース**として扱わなければなりません（MUST）。attribute は文字列表現として受理してよいですが、競合時に property を上書きしてはなりません（MUST NOT）。

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

| 名前                       | 種別   | 契約                                                                 |
| -------------------------- | ------ | -------------------------------------------------------------------- |
| `expand(trigger?)`         | method | 展開要求を行います                                                   |
| `collapse(reason?)`        | method | 格納要求を行います                                                   |
| `toggle(trigger?)`         | method | 現在の state に応じて展開・格納要求を切り替えます                    |
| `focusInitialTarget()`     | method | 現在の `initialFocusPolicy` に従って初期フォーカスを再実行します     |
| `notifyNavigationCommit()` | method | navigation 確定通知を受け取り、`closeOnNavigation` に従って格納判定を行います |

#### Normative

`expand(trigger?)` と `toggle(trigger?)` は、`restoreFocusPolicy="trigger"` の場合に備えて返却先候補を更新できます。状態変化が起きない場合でも、返却先候補の更新だけは成立してよいです。

#### Normative

`notifyNavigationCommit()` は routing を内包しません。これは、上位レイヤまたは子要素アダプタが **「navigation が確定した」** という事実だけを shell へ通知するための入口です。

#### Normative

`closeOnNavigation` の解釈は次のとおりです。

- `false`: `notifyNavigationCommit()` を受けても自動格納しません
- `true`: `resolvedMode` にかかわらず `collapse(reason='navigation')` を行います
- `overlay-only`: `resolvedMode='overlay'` の場合に限り `collapse(reason='navigation')` を行います

#### Normative

`collapse(reason?)` の `reason` は `api` / `scrim` / `escape` / `navigation` / `mode-transition` / `unknown` のいずれかとします。これにより、上位レイヤは格納理由に応じた副作用分岐を行えます。

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
- Focus Trap は提供しません
- 背景へフォーカス移動できること自体は許容します
- ただし、フォーカス移動は予測可能でなければならず、Overlay の開閉と無関係な不意の逸脱を継続的に生じさせてはなりません（MUST NOT）
- scrim は視覚的前景化と pointer による close affordance を担います

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

attribute と property が競合する場合、**property を正規の入力ソース・オブ・トゥルース**として扱わなければなりません（MUST）。attribute は初期 HTML 記述および文字列表現のために受理してよいですが、競合時に property を上書きしてはなりません（MUST NOT）。

### `resolvedMode` 変化時の state 解決

#### Normative

`mode="auto"` により `resolvedMode` が変化した場合、uncontrolled state の解決は `modeTransitionPolicy` に従います。

| 値                           | 契約                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `preserve`                   | `resolvedMode` 変化前の state を維持します                           |
| `collapse-on-overlay-entry`  | `fixed -> overlay` へ遷移した時に限り `collapsed` へ正規化します     |

#### Normative

`modeTransitionPolicy='collapse-on-overlay-entry'` では、`overlay -> fixed` の遷移時に自動展開してはなりません（MUST NOT）。Fixed での展開有無は、その時点の state をそのまま引き継ぎます。

#### Normative

`modeTransitionPolicy` による state 変化は、**uncontrolled state にのみ**適用します。controlled state では、`resolvedMode` の変化を通知してよいですが、state を内部で変更してはなりません（MUST NOT）。

#### Normative

`modeTransitionPolicy` により `collapsed` へ遷移した場合、その格納理由は `mode-transition` として扱います。

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

選択された復帰先が未接続、無効、または非対話状態である場合は、次の共通代替順を適用します。

1. もう一方の標準候補（`trigger` または `previous-active-element`）
2. host 内の最初の対話要素
3. フォーカス復帰なし

#### Normative

`restoreFocusPolicy="none"` の場合を除き、実装は**可能な限り予測可能な復帰先**を与えることを優先しなければなりません（SHOULD）。単に復帰を省略してよいのは、上記候補がいずれも成立しない場合に限ります。

#### Rationale

初期フォーカスや復帰先を DOM 探索順だけに依存すると、ナビゲーション構造や `header` スロットの役割が増えた時点で壊れやすくなります。方針を enum 化し、さらに無効候補時の代替順まで固定しておく方が、長期保守に向きます。

---

## イベント契約

#### Normative

本コンポーネントは、少なくとも次の公開イベントを持ちます。

| イベント名                              | 内容                                      | cancelable |
| --------------------------------------- | ----------------------------------------- | ---------- |
| `ui-sidebar-state-request-accepted`     | state 変更要求が受理されたことを示します  | いいえ     |
| `ui-sidebar-state-change`               | 論理状態変更が確定したことを示します      | いいえ     |
| `ui-sidebar-state-settled`              | 主視覚遷移が完了したことを示します        | いいえ     |
| `ui-sidebar-resolved-mode-change`       | `resolvedMode` が変化したことを示します   | いいえ     |

#### Normative

`ui-sidebar-state-request-accepted`、`ui-sidebar-state-change`、`ui-sidebar-state-settled` の detail は、少なくとも次を持たなければなりません（MUST）。

- `state`
- `resolvedMode`
- `reason`
- `controlled`

#### Normative

`reason` は `api` / `scrim` / `escape` / `navigation` / `mode-transition` / `unknown` のいずれかとします。

#### Normative

`ui-sidebar-state-change` は**論理状態の確定通知**であり、視覚遷移完了通知ではありません。視覚遷移完了は `ui-sidebar-state-settled` で通知します。

#### Normative

`ui-sidebar-resolved-mode-change` は `mode` 入力変化通知ではなく、**実効モード変化通知**です。

#### Normative

利用者は host 要素からイベントを直接購読することを前提とします。親要素でのイベント委譲や Shadow DOM 境界越えの伝播方式に依存してはなりません（MUST NOT）。

#### Normative

イベントの伝播方式は公開契約の本体ではありません。実装は `bubbles=false` および `composed=false` を採ってよいですが、公開契約として固定するのは**host 直接購読で安定して観測できること**に限ります。

#### Normative

同値 no-op は `ui-sidebar-state-request-accepted`、`ui-sidebar-state-change`、`ui-sidebar-state-settled` を発火しません。

#### Rationale

非 cancelable な事前通知に `will-change` という名前を与えると、取り消し可能であるという期待を誘発しやすくなります。ここでは「要求が受理された」という意味をイベント名に直接反映し、命名と意味のずれを避けます。

---

## 再入安全性

#### Normative

展開・格納要求は再入安全でなければなりません（MUST）。連続要求が来た場合でも、外部から観測される状態遷移は破綻してはならず、最終状態は要求列と整合していなければなりません（MUST）。

#### Normative

再入安全性の達成手段は公開契約に含めません。逐次実行キュー、最新要求優先、内部トランザクション化など、どの方式を採るかは実装に委ねます。ただし、外部観測面として次を満たさなければなりません（MUST）。

- 同一時相で state が相互矛盾するように観測されないこと
- `ui-sidebar-state-change` と `ui-sidebar-state-settled` の順序が崩れないこと
- focus 復帰候補の記録が連続要求で破綻しないこと

#### Normative

同一状態への要求は no-op として扱ってよいですが、`restoreFocusPolicy="trigger"` のための返却先候補更新だけは成立してよいです。

---

## DOM / Accessibility 契約

#### Normative

主要ランドマークはネイティブ `<nav>` とします。`role="navigation"` を重ねて付与する必要はありません。

#### Normative

`nav` の accessible name は `navLabel`、`aria-label`、または `aria-labelledby` のいずれかにより供給できなければなりません（MUST）。コンポーネント内で固定文言を埋め込むことは推奨しません（SHOULD NOT）。

#### Normative

格納状態では、ナビゲーション面を `inert` とし、加えて視覚的にも非表示状態へ短い遷移で移行させなければなりません（MUST）。

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
- **Overlay**: 一時前景化面。必要時だけ手前に出る。大きなスライドではなく、短いフェードで静かに現れる

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

`prefers-reduced-motion: reduce` では主遷移を即時反映します。ただし、state semantics は変えません。

#### Normative

`forced-colors: active` では現在地表現が失われないことを優先します。`aria-current="page"` を持つ slotted 要素は、明示的に知覚可能でなければなりません。

#### Normative

印刷時は shell 全体を非表示にしてよいです。

---

## Storybook 契約

#### Normative

Storybook は見本ではなく契約検証です。少なくとも、次の契約群を独立に検証できなければなりません（MUST）。

- controlled / uncontrolled の状態所有権
- `mode="auto"` と `resolvedMode` の分離
- Overlay の非モーダル性
- scrim close と Esc close
- 初期フォーカスと復帰フォーカス
- `ui-sidebar-state-change` と `ui-sidebar-state-settled` の時相分離
- `collapsed` が到達可能性停止を意味し、親レイアウトの幅解放を保証しないこと
- reduced motion / forced colors
- rapid toggle に対する再入安全性

#### Normative

Story 名、Story 数、個別 Story の粒度、周辺テーマ検証の詳細は公開契約に含めません。これらは契約検証マトリクスまたは Storybook 実装側で管理します。

#### Rationale

契約書に Story の細目まで列挙すると、検証観点の増減だけで仕様書の更新が必要になります。本文では**何を検証すべきか**だけを固定し、**何本の Story でどう分割するか**は検証文書へ分離した方が保守しやすくなります。

---

## 設計判断の根拠

### 非モーダル Overlay を採る理由

Rouault の sidebar は、本文を読む行為を補助するための導線であり、常に dialog 相当の強い遮断性は不要です。Overlay を非モーダルに固定すると、操作の意味が軽くなり、読書文脈との整合も取りやすくなります。

### state / mode を二層化する理由

状態とその解決結果を分離しない設計は、controlled / uncontrolled / responsive auto 切替が混ざった時点で壊れやすくなります。`mode` と `resolvedMode` を分け、`state` と `defaultState` を分ける方が API として明快です。

### layout 責務を分ける理由

レイアウト列幅とナビゲーション到達可能性は別概念です。これを 1 コンポーネントに押し込むと、`collapsed` の意味が画面ごとに変わります。shell は面の意味を守り、layout は幅を扱う方が保守しやすくなります。

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
- 現行は `ui-sidebar-state-change` のみですが、本書では `state-request-accepted`、`change`、`settled`、`resolved-mode-change` へ分離しています。
- 現行は Esc 処理が局所的ですが、本書では host 単位での一貫性を推奨しています。
- 現行は `collapsed` とレイアウト解放が Story 上で近接していますが、本書では両者を明確に分離しています。

---

## 現行実装を基準にした未対応・未固定項目

本節は参考情報であり、Normative ではありません。本節の目的は、**本書で提示した契約や追加候補のうち、現行 `sidebar-shell.ts` と `sidebar-shell.stories.ts` を基準にして、まだ実装されていないもの、または現行では別挙動のものを記述漏れなく列挙すること**です。

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

- `ui-sidebar-state-request-accepted`
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
5. イベントは `state-request-accepted` / `change` / `settled` / `resolved-mode-change` に分離すること。
6. フォーカス開始位置と復帰方針を policy として公開入力化すること。
7. 永続化は uncontrolled state に限定すること。
8. 読書面の主役性を壊さないこと。
