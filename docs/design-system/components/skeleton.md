# Skeleton

## 概要

本書は、`ui-skeleton` の**長期的に維持する公開契約**を固定するものです。ここでいう契約は、現行実装の詳細を説明するための記述ではなく、将来の実装変更や内部再設計があっても維持すべき**責務境界、意味論、入力モデル、視覚モデル、環境応答**を定義するためのものです。

`ui-skeleton` は、読み込み完了前の最終コンテンツを代替する**非意味論的な視覚プリミティブ**です。責務は、最終コンテンツの**占有領域を予告すること**と、待機状態を**静かに視覚化すること**に限定します。Skeleton 自体は状態通知の主体ではなく、意味論や進捗通知を持ちません。

Rouault における Skeleton は、読書体験への没入を阻害しないことを優先します。したがって、Skeleton は目立つ演出部品ではなく、本文・図版・操作要素が出現するまでのあいだだけ存在する、**静かな予告面**として設計します。

---

## 設計原則

本コンポーネントの長期固定方針は次のとおりです。

- `ui-skeleton` は**non-semantic visual primitive** とする。
- 読み込み状態の意味論は `ui-skeleton` ではなく、**上位の loading container** が担う。
- `variant` は単なる見た目ではなく、**用途を伴う形状契約**として扱う。
- `animated` は既定で無効とし、**視覚補助としてのみ opt-in** できる。
- `rectangular` の高さはコンポーネント側で恣意的に補完しない。
- 利用者が壊してよい面と壊してはならない面を分離し、**外部 CSS の保証境界**を明確にする。
- 印刷、高コントラスト、Reduced Motion といった環境要請は、利用者入力より優先する。

これらは、現行実装よりも優先して維持すべき設計原則です。

---

## 適用範囲

本書は、`ui-skeleton` の次の事項を対象とします。

- 責務境界
- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- トークン契約
- 環境別の振る舞い
- スタイル拡張境界
- 境界条件
- Storybook 契約
- 現行実装との差分

一方で、本書は次の事項を扱いません。

- データ取得そのものの状態管理
- 非同期処理の開始・中断・失敗制御
- 読み込み完了後にどの実コンテンツへ置き換えるかという画面設計
- `aria-busy` や `aria-live` をどのコンテナへ与えるかという上位レイヤ設計
- Skeleton 群の並びや段組みなど、ページ全体のプレースホルダーレイアウト
- サーバー描画・ストリーミング・プリフェッチ戦略

これらは画面または上位の loading pattern の責務です。

---

## 契約の結論

`ui-skeleton` は、**意味論を持たないプレースホルダー面**です。Skeleton 自体は常に支援技術から隠され、読み込み中であることの通知、進捗率の表現、状態説明、完了通知は担いません。

`ui-skeleton` は、`text`、`circular`、`rectangular` という 3 種の用途別 `variant` と、任意の寸法指定、および opt-in の Shimmer により表現を切り替えます。ただし、寸法は視覚安定性のための入力であり、状態意味論ではありません。

本コンポーネントの中心は、**何を読み上げるか**ではなく、**どの領域が後で現れるかを静かに予告するか**にあります。

---

## 公開契約

### コンポーネントの位置づけ

`ui-skeleton` は、将来の実コンテンツを置くための**占有領域予告面**です。ボタン、入力欄、画像、テキストなどの意味論を代替しません。Skeleton 単体で読み込み状態を完結させることはできず、またそのように使ってはなりません（MUST NOT）。

### 公開入力

| 名前       | 種別                 | 必須   | 内容           | 契約                                                        |
| ---------- | -------------------- | ------ | -------------- | ----------------------------------------------------------- |
| `variant`  | property / attribute | いいえ | 用途別形状種別 | `text` / `circular` / `rectangular`。既定値は `rectangular` |
| `width`    | property / attribute | いいえ | 幅             | CSS 寸法文字列。前後空白は正規化されます                    |
| `height`   | property / attribute | いいえ | 高さ           | CSS 寸法文字列。前後空白は正規化されます                    |
| `animated` | property / attribute | いいえ | Shimmer 表示   | 既定値は `false`。`true` の場合のみ Shimmer を許可します    |

### 属性反映契約

公開入力は property と attribute の両面から操作できます。`animated` は boolean attribute として扱います。`variant`、`width`、`height` は reflect されます。

| property   | attribute  | reflect | 備考                                      |
| ---------- | ---------- | ------- | ----------------------------------------- |
| `variant`  | `variant`  | あり    | 列挙外値は `rectangular` に正規化されます |
| `width`    | `width`    | あり    | 文字列前後の空白は除去されます            |
| `height`   | `height`   | あり    | 文字列前後の空白は除去されます            |
| `animated` | `animated` | あり    | boolean attribute として扱います          |

### 正規化契約

`variant`、`width`、`height` の正規化は、更新サイクル内の確定値に対して適用されます。したがって、property 経由でも attribute 経由でも、最終的に観測される値は同一の正規化規則へ収束しなければなりません（MUST）。

- `variant` に列挙外値が与えられた場合、`rectangular` へ収束します。
- `width` と `height` の前後空白は除去されます。
- 正規化後の値が reflect 対象であるため、属性値として観測される内容も最終的には正規化済み値になります。

### 列挙外値・無効値の扱い

`variant` は `text` / `circular` / `rectangular` のみを正規入力とします。列挙外値が与えられた場合、`rectangular` にフォールバックします。利用者は列挙外値による独自表示に依存してはなりません（MUST NOT）。

`width` と `height` は CSS 文字列として受け入れます。`length`、百分率、`calc()`、`var()`、`min()`、`max()`、`clamp()` なども受け入れますが、構文妥当性そのものはコンポーネント側で検証しません。したがって、**値の受理**と**描画成立の保証**は別です。

- コンポーネントは CSS 文字列を受理できます。
- ただし、描画結果は CSS 解決系と親レイアウトに依存します。
- 自己完結的に解決できない値の結果は、コンポーネント契約の主保証対象ではありません。

寸法値の妥当性は利用者側が保証しなければなりません（MUST）。

### 用途別 `variant` 契約

#### `text`

`text` は**単一行テキストの占有幅予告**に用いる `variant` です。本文、見出し、短いラベルなど、最終的に一行として表出される文字列のために使います。`text` は、単に細長い矩形を得るための汎用 `variant` ではありません。

#### `circular`

`circular` は**円形メディアの占有領域予告**に用いる `variant` です。アバター、円形アイコン、円形サムネイルなどに使います。`circular` は必ず正円として成立しなければなりません（MUST）。

#### `rectangular`

`rectangular` は**非テキストの矩形領域予告**に用いる `variant` です。カード、画像、図版、ブロック領域、サムネイルなどに使います。`rectangular` は文字行の代替として使うべきではありません（SHOULD NOT）。

### 寸法契約

`ui-skeleton` は、用途別 `variant` ごとに寸法解決規則を持ちます。

#### `text`

- `width` 指定があれば、それを `inline-size` に用います。
- `height` 未指定時、`block-size` は `1em` です。
- `height` 指定時、`block-size` はその値です。

`text` は単一行 placeholder として扱うため、複数行表現は単一要素の引き伸ばしではなく、複数の Skeleton を積むことで表現するのを原則とします。

#### `circular`

- `width` 指定があれば、それを `inline-size` に用います。
- `width` 未指定かつ `height` 指定があれば、`inline-size` は `height` と同値です。
- `height` 未指定かつ `width` 指定時、`block-size` は `width` と同値です。
- `width` と `height` の双方が未指定の場合、`inline-size` と `block-size` はともに `1em` です。

ただし、長期運用上は `circular` に明示寸法を与えることを推奨します（SHOULD）。`1em` の既定サイズは互換上の下限であり、推奨サイズ戦略そのものではありません。

#### `rectangular`

- `width` 指定があれば、それを `inline-size` に用います。
- `height` 指定があれば、それを `block-size` に用います。
- `height` 未指定時、暗黙の高さフォールバックは持ちません。
- `aspect-ratio` が与えられている場合、`rectangular` の高さ決定はその比率に委ねられます。

`rectangular` は高さ情報なしに使うべきではありません。`height` または `aspect-ratio` のいずれかを与えることを正規運用とします（MUST）。高さ情報なしの `rectangular` は**invalid-but-renderable** として扱います。すなわち、描画自体は許容され得ますが、正規契約入力ではありません。

### 公開メソッド・スロット・Part

`ui-skeleton` は独自の公開メソッドを持ちません。スロットも持ちません。`::part(...)` による公開スタイル面も持ちません。

外部からの拡張は、ホスト要素に対する通常の CSS 適用と CSS Custom Properties に限定します。

### 責務範囲

責務範囲には、用途別プレースホルダー面の描画、寸法解決、`aria-hidden` の強制、Shimmer 表示、環境別フォールバック、および印刷時の非表示を含みます。

一方で、読み込み中であるという意味論の公開、進捗率の提示、読み込み完了通知、コンテンツ差し替え、コンテナ全体の `aria-busy` 管理、複数 Skeleton のレイアウト設計は責務に含めません。

---

## 状態モデル

`ui-skeleton` の状態は、意味状態ではなく**描画状態**として定義します。

### 基本状態

最小状態は、`variant="rectangular"`、`animated=false`、`width=""`、`height=""` です。この状態は描画可能ではありますが、正規運用としては不完全です。`rectangular` に高さ情報がないため、長期契約上は invalid-but-renderable に分類されます。

### `text` 状態

`text` は単一行テキスト予告面です。高さ既定値は `1em` で、周囲の文字サイズに追従します。用途は本文行、見出し行、ラベル行です。

### `circular` 状態

`circular` は円形メディア予告面です。片側寸法のみが与えられても正円を維持します。

### `rectangular` 状態

`rectangular` は非テキスト矩形予告面です。高さは暗黙補完されません。利用側が `height` または `aspect-ratio` を与えて寸法責務を負います。

### アニメーション状態

`animated=true` の場合、Shimmer を描画できます。`animated=false` の場合、Shimmer は存在しません。ただし、環境設定によっては `animated=true` でも Shimmer は停止します。

### 支援技術状態

`ui-skeleton` は常に `aria-hidden="true"` を維持します。利用者が `aria-hidden="false"` を与えても、Skeleton を読み上げ対象へ昇格させることはできません。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM は存在しても、公開意味論は持ちません。ホスト自体の背景、角丸、サイズ、および疑似要素によって見た目を構成します。

```text
<ui-skeleton aria-hidden="true" variant="..." width="..." height="..." animated>
  #shadow-root
    [rendered contentなし]
</ui-skeleton>
```

### Accessibility 契約

- `ui-skeleton` 自体は支援技術から隠されます。
- ホストは常に `aria-hidden="true"` を維持します。
- 読み込み中であることの通知は Skeleton 自身ではなく親コンテナ側で担います。
- `aria-busy="true"`、`aria-live`、`aria-label` などの待機状態通知は、必要に応じてコンテナへ付与しなければなりません（MUST）。
- Skeleton は意味を持つコンテンツの代替読み上げ要素ではありません。

### 上位レイヤとの責務分離

長期的には、読み込み状態のアクセシビリティは `ui-skeleton` に混在させず、**別の loading container 契約**として定義するのが望ましいです。したがって、`ui-skeleton` に `role="status"`、`aria-live`、`aria-busy` のような意味論を内包させる設計は採りません。

---

## Visual Contract

`ui-skeleton` の視覚契約は、最終コンテンツの見た目を模倣することではなく、**占有領域を静かに予告すること**にあります。

### 基本外観

- ホストは `display: block` です。
- `overflow: hidden` により、Shimmer はホスト境界内で切り取られます。
- 既定背景は `--bg-fill-neutral` を基準とします。
- 既定角丸は `--radius-sm` を基準とします。
- `circular` では `--radius-full` により完全な円形へ切り替えます。

### Shimmer 表示

`animated=true` の場合、`::after` に線形グラデーションを持つ Shimmer を描画します。アニメーション時間は `--shimmer-duration`、ハイライト色は `--skeleton-shimmer` を最上位入力として解決し、内部的には `--shimmer-highlight` を介して描画します。

Shimmer はホスト面の上に重なる**視覚レイヤ**であり、レイアウトには寄与しません。また、入力やクリック対象にもなりません。したがって、Shimmer の有無は寸法計算、ヒットテスト、意味論に影響してはなりません（MUST NOT）。

Shimmer は状態の主担い手ではなく、待機状態を弱く補助する視覚効果です。読書面に近い文脈では、**存在は認識できるが本文の主役にならない強さ**に抑えます。`variant` ごとに独自の強い演出差分を導入するべきではありません（SHOULD NOT）。

### 寸法とレイアウト

- `text` は単一行の文字列占有幅を予告する細い帯です。
- `circular` は必ず正円でなければなりません。
- `rectangular` はメディアやブロック領域の比率を予告するため、高さ情報を必須とします。

とくに `rectangular` は、高さを暗黙補完しないこと自体が契約です。これは、用途ごとに必要な矩形比率が異なり、コンポーネント側が恣意的な既定高さを持つべきではないためです。

---

## トークン契約

本コンポーネントは、主として次のトークンに依存します。

| 用途                  | トークン             |
| --------------------- | -------------------- |
| 既定背景              | `--bg-fill-neutral`  |
| テキスト系 / 既定角丸 | `--radius-sm`        |
| 円形角丸              | `--radius-full`      |
| Shimmer ハイライト    | `--skeleton-shimmer` |
| Shimmer 時間          | `--shimmer-duration` |
| 強制カラー境界線幅    | `--border-width`     |

トークンの解決優先順位は次のとおりです。

- 背景面は `--bg-fill-neutral` を基準とします。
- 既定角丸は `--radius-sm`、円形時は `--radius-full` を優先します。
- Shimmer ハイライトは `--skeleton-shimmer` が最上位入力であり、内部描画では `--shimmer-highlight` に束ねて使用します。
- Shimmer 時間は `--shimmer-duration` を単一入力とします。
- 強制カラー時の境界線幅は `--border-width` を用います。

長期的には、必要に応じて text-line / media / shimmer-intensity の粒度へ分離できますが、本契約では上記を最小安定集合とします。

---

## 環境別の振る舞い

### 環境優先順位

利用者が `animated=true` を指定していても、ユーザー環境設定の方が優先されます。したがって、アニメーション有効化は**常時アニメーションの保証**ではありません。

優先順位は次のとおりです。

- `forced-colors: active`
- `prefers-reduced-motion: reduce`
- コンポーネント入力としての `animated`

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、`animated=true` であっても Shimmer を描画しません。疑似要素自体を生成しないことで、モーションを完全に除去します。

### Forced Colors

`forced-colors: active` 環境では、背景を `Canvas`、境界線を `CanvasText` とし、システムカラーへフォールバックします。Shimmer も停止します。`forced-color-adjust: auto` を維持し、高コントラスト環境の可読性を優先します。

### Dark Mode

`ui-skeleton` 自体は `prefers-color-scheme` に依存した固有分岐を持ちません。ダークテーマ時の見え方は、背景トークンおよび Shimmer トークンの差し替えで吸収します。

### Print

`@media print` では `:host` 自体を非表示にします。Skeleton は印刷成果物に残さない一時要素です。印刷時の代替表現は上位レイヤの責務です。

---

## スタイル拡張境界

`ui-skeleton` は `::part(...)` を公開しません。内部 DOM に依存した拡張面も持ちません。利用者は次の拡張面のみを使用します。

- ホスト要素に対する通常の CSS
- `width` / `height` 属性または property
- `style` 属性による `aspect-ratio` 指定
- CSS Custom Properties による配色・角丸・Shimmer 時間調整

内部構造が空であることを前提に、Shadow DOM 内の要素探索や内部 class への依存を行ってはなりません（MUST NOT）。

また、ホスト自体が Skeleton 面であるため、外部 CSS 上書きには保証境界があります。

### 保証対象内

- 寸法指定
- `aspect-ratio`
- マージンなどの外側レイアウト調整
- 配色トークン、角丸トークン、Shimmer 関連トークン

### 保証対象外だが許容

- 周辺コンテナ側での整列
- グリッドやフレックス文脈における配置制御
- ページ固有のレスポンシブ配置

### 契約破壊的な上書き

- `display`
- `overflow`
- `position`
- `background`
- `border-radius`

これらを直接上書きすると、視覚契約または Shimmer の切り取り契約を壊し得ます。利用者がホスト基盤スタイルを直接置き換える場合、その結果はコンポーネント契約の保証対象外とみなします。

---

## 開発時警告契約

`variant="rectangular"` で `height` も `aspect-ratio` も与えられていない場合、実装は開発時警告を出すことができます。判定にはインライン指定された `aspect-ratio` だけでなく、計算済みスタイルとして解決される `aspect-ratio` も含みます。

この警告は CLS 防止のための診断機構であり、描画停止や例外送出は行いません。また、同一の未解決状態に対しては連続更新ごとに繰り返し警告するのではなく、**未解決期間につき一度**を原則とします。いったん条件が解消された後に再び未解決状態へ戻った場合は、改めて警告し得ます。

---

## 境界条件

### `text` の既定高さ

`variant="text"` で `height` を省略した場合、高さは `1em` です。これは周囲の文字サイズに追従します。

### `text` の複数行表現

複数行 placeholder を単一の `text` で表現することは正規運用ではありません。複数行は複数の Skeleton を積むことで表現します。

### `circular` の片側寸法指定

`variant="circular"` で `width` のみ、または `height` のみを与えた場合でも、未指定側は指定側と同値に補完され、正円を維持します。

### `circular` の無寸法状態

`variant="circular"` で寸法を省略した場合、互換上の既定サイズとして `1em` を使えますが、正規運用では明示寸法を与えることを推奨します。

### `rectangular` の高さ未指定

`variant="rectangular"` で `height` と `aspect-ratio` の双方を省略した場合、高さの暗黙フォールバックはありません。見た目上の高さは 0 になり得ます。この状態は invalid-but-renderable です。

### 不正な `variant`

列挙外の `variant` が与えられた場合、`rectangular` に正規化されます。属性値も最終的に `rectangular` へ反映されます。

### `aria-hidden` の上書き試行

利用者が `aria-hidden="false"` を与えても、実装は `true` に再同期します。Skeleton を読み上げ対象へ昇格させることはできません。

### `width` / `height` の前後空白

`width=" 60% "`、`height=" 1.5em "` のような入力は、前後空白が除去されて保持されます。

### アニメーションの opt-in

`animated` は opt-in です。既定では静止表示であり、待機状態を示したい場合にのみ利用側が明示します。

### 環境設定によるアニメーション停止

`animated=true` であっても、`forced-colors: active` または `prefers-reduced-motion: reduce` が成立する環境では Shimmer は停止します。利用側入力よりも環境設定が優先されます。

### 印刷時

どの `variant`、寸法、`animated` 状態であっても、印刷時は非表示です。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                   | 固定する契約                                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Default`               | `text` の既定高さが `1em` であり、`aria-hidden="true"` を維持し、既定ではアニメーションしないこと                                                                     |
| `VariantStateMatrix`    | `text` / `circular` / `rectangular` の用途別代表状態を描画できること                                                                                                  |
| `BoundaryConditions`    | 不正 `variant` の正規化、`aria-hidden` 強制、`circular` の正円補完、`rectangular` の高さ未補完、寸法文字列の trim、環境設定優先によるアニメーション停止が成立すること |
| `RectangularGuard`      | `rectangular` で高さ未指定かつ `aspect-ratio` もない場合、開発時警告が未解決期間につき一度だけ観測できること                                                          |
| `BusyStateTransitions`  | 親コンテナの `aria-busy` が `true` から `false` へ遷移でき、Skeleton 自体は終始 `aria-hidden="true"` であること                                                       |
| `DarkMode`              | 暗色トークン差し替え下でも形状とアニメーション契約が維持されること                                                                                                    |
| `StyleOverrideBoundary` | 推奨上書きと契約破壊的上書きの境界が理解可能であること                                                                                                                |

---

## 追加を検討する価値がある機能

本節は、`ui-skeleton` の責務境界を維持したまま、将来的に追加を検討する価値がある機能を整理するものです。ここでいう「検討価値」は、単なる利便性ではなく、**契約の一貫性を崩さず、長期保守性を上げるかどうか**を基準に判断します。

### 最優先で検討する価値がある機能

#### `aspectRatio` の正式公開入力化

現行契約では、`rectangular` の正規運用に `height` または `aspect-ratio` を要求しています。しかし `aspect-ratio` は現時点で CSS 側へ委ねられており、公開入力としては固定されていません。

長期的には、`aspectRatio` を property / attribute として正式公開する価値があります。これにより、矩形 Skeleton の主要な寸法責務が API 面へ昇格し、`rectangular` の正規入力がより明確になります。

期待される効果は次のとおりです。

- `rectangular` の高さ安定性を API として表現できる。
- CLS 防止のための入力経路が明確になる。
- `width` / `height` は公開入力だが比率だけ CSS 依存、という中途半端さを解消できる。
- Storybook とテストで、比率指定を正式契約として検証しやすくなる。

本機能は、設計のきれいさ、利用側の理解容易性、実装の一貫性のいずれにも寄与するため、最優先候補とします。

#### 用途別角丸トークンの分離

現行契約では、既定角丸を `--radius-sm`、円形のみ `--radius-full` としています。しかし長期的には、`text` と `rectangular` の視覚的役割差をトークンレベルで分離できる余地があります。

追加候補としては、次のような分離が考えられます。

- `--skeleton-text-radius`
- `--skeleton-rect-radius`

これにより、本文行 placeholder とメディア placeholder の角丸を無理なく分けられます。一方で、property として角丸バリエーションを増やすのではなく、まずはトークン分離で吸収する方が保守的です。

#### Shimmer 強度の限定的制御

現行契約では、Shimmer は有無と時間、およびハイライト色を中心に制御します。長期的には、読書面に近い文脈とメディア寄りの文脈で、Shimmer の目立ち方を微調整したくなる可能性があります。

ただし、`ui-skeleton` は演出コンポーネントではないため、アニメーション種別を増やすべきではありません。検討価値があるのは、強度に限定した制御です。

追加候補としては、次のようなものが考えられます。

- `--skeleton-shimmer-opacity`
- `--skeleton-shimmer-intensity`

本機能は、状態の主張を強めるためではなく、**静かな視覚補助としての強度を画面文脈に合わせて下げる**ために検討するものです。

### 条件付きで検討価値がある機能

#### `circular` の既定寸法トークン化

現行契約では、`circular` は無寸法時に互換上の下限として `1em` を使えます。一方で、アバターや円形メディアの placeholder としては、`1em` は意味的にやや弱い既定値です。

そのため、必要になった場合に限り、既定寸法をトークンで与える余地があります。たとえば、`--skeleton-circular-default-size` のようなトークンです。

ただし、本契約は `circular` に明示寸法を与える運用を推奨しているため、本機能は本体 API の中心ではありません。需要が実際に発生した場合にのみ検討します。

#### 限定的な表示モード切り替え

現行契約では、ホストは `display: block` を前提としています。本文中の短い要素やラベル的要素で Skeleton を使いたい場面では、将来的に限定的な `inline-block` 的表示モードが欲しくなる可能性があります。

ただし、表示モードを正式 API にすると、視覚契約と外部 CSS 境界が複雑になります。そのため、実需要が明確に確認されるまでは導入しません。

必要になった場合でも、自由な `display` 指定ではなく、厳しく制限された表示モード切り替えとしてのみ検討します。

### 本体に含めない方がよい機能

`ui-skeleton` の責務境界を維持するため、次の機能は本体へ含めない方針を採ります。

#### 読み込み意味論の内包

`aria-busy`、`aria-live`、`role="status"` などは、`ui-skeleton` 本体に内包しません。読み込み状態の意味論は、上位の loading container が担います。

#### 複数行テキスト Skeleton の自動生成

`lines` のような API によって複数行 placeholder を自動生成する設計は、`ui-skeleton` を単体 primitive からレイアウト部品へ変質させます。複数行は複数の Skeleton を積むか、別コンポーネントとして扱います。

#### Preset 群の内包

`article`、`card`、`list-item` などの用途別 preset を `ui-skeleton` 本体へ内包しません。これらは上位レイヤまたは別コンポーネントで扱う方が責務分離に適合します。

#### アニメーション種別の追加

`pulse`、`wave`、`bounce` など、複数のアニメーション種別を導入しません。`ui-skeleton` は演出部品ではなく、静かな予告面であるべきです。Shimmer は単一の補助表現として維持します。

---

## 補足

`ui-skeleton` の要点は、凝ったローディング演出にあるのではありません。**最終コンテンツの占有領域を静かに予告し、待機状態を視覚化しつつ、意味論は上位レイヤへ委ねること**にあります。

したがって、今後の変更でも次の点は崩しません。

1. Skeleton 自体を支援技術から隠すこと。
2. `rectangular` の高さをコンポーネント側で恣意的に自動補完しないこと。
3. `animated` を opt-in とし、静止状態を既定に保つこと。
4. `variant` を用途契約として扱うこと。
5. モーション抑制・高コントラスト・印刷へのフォールバックを維持すること。
6. 読み込み意味論を `ui-skeleton` に混在させないこと。

---

## 現行実装との差分

本節は、現行の `skeleton.ts` および `skeleton.stories.ts` を基準として、**本契約で固定した方針と、現時点の実装がまだ完全には追従していない点**を整理するものです。

### 1. `rectangular` の正規運用強制

本契約では `rectangular` に `height` または `aspect-ratio` を与えることを正規運用として固定しました。一方、現行実装は描画自体を拒否せず、開発時警告にとどまります。したがって、実装側ではまだ invalid-but-renderable の診断止まりです。

### 2. `text` の単一行性

本契約では `text` を単一行テキスト placeholder として固定しました。一方、現行実装は `height` を任意に上書きできるため、複数行風の使い方も技術的には可能です。本契約は、それを正規用法とはみなしません。

### 3. `circular` の寸法方針

本契約では `circular` に明示寸法を与える運用を推奨しました。一方、現行実装は無寸法時に `1em` を既定として成立させます。これは互換上の下限として残りますが、推奨サイズ戦略そのものではありません。

### 4. 上位 loading container 契約の分離

本契約は、読み込み意味論を `ui-skeleton` から分離し、上位コンテナ責務として明確化しました。一方、現行実装はその責務を外へ委ねているものの、専用の loading container 契約まではまだ明文化されていません。

### 5. スタイル上書き境界の formal 化

本契約では、保証対象内・保証対象外だが許容・契約破壊的上書きの三層に分けて固定しました。一方、現行実装は host CSS を直接上書きできるため、実運用ではまだ運用規律に依存する部分があります。

### 6. Storybook の設計意図検証

本契約では `StyleOverrideBoundary` など、設計意図そのものを検証する Story を追加対象として位置づけました。一方、現行 Story 群は主に実装回帰確認が中心であり、設計境界の検証はまだ十分ではありません。
