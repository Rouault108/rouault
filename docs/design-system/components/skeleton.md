# Skeleton

## 概要

本書は、`ui-skeleton` の**長期的に維持する公開契約**を固定するものです。ここでいう契約は、現行実装の詳細を説明するための記述ではなく、将来の実装変更や内部再設計があっても維持すべき**責務境界、意味論、入力モデル、視覚モデル、環境応答**を定義するためのものです。

`ui-skeleton` は、読み込み完了前の最終コンテンツを代替する**非意味論的な視覚プリミティブ**です。責務は、最終コンテンツの**占有領域を予告すること**と、待機状態を**静かに視覚化すること**に限定します。Skeleton 自体は状態通知の主体ではなく、意味論や進捗通知を持ちません。

Rouault における Skeleton は、読書体験への没入を阻害しないことを優先します。したがって、Skeleton は目立つ演出部品ではなく、本文・図版・操作要素が出現するまでのあいだだけ存在する、**静かな予告面**として設計します。

---

## 設計原則

本コンポーネントの長期固定方針は次のとおりです。

- `ui-skeleton` は、意味状態を公開しない**非意味論的な視覚プリミティブ**とします。
- 読み込み中であることの通知や説明は、`ui-skeleton` ではなく**上位コンテナ**が担います。
- `variant` は見た目の差分ではなく、**用途を伴う形状契約**として扱います。
- `animated` は既定で無効とし、**補助的な視覚効果としてのみ opt-in** できるものとします。
- `rectangular` の高さは、コンポーネント側で暗黙補完しません。
- 外部から調整してよい面と、保証しない面を分離し、**公開拡張面**を明確にします。
- 印刷、高コントラスト、Reduced Motion などの環境要請は、利用者入力より優先します。
- 本書は、実装手段ではなく**観測可能な契約**を固定します。したがって、内部 CSS の実現方法、テスト分割、Story 名、警告の細かな実装方式そのものは固定対象に含めません。

---

## 適用範囲

本書は、`ui-skeleton` の次の事項を対象とします。

- 責務境界
- 公開入力
- 正規化規則
- 寸法契約
- 状態モデル
- DOM / Accessibility
- 視覚契約
- トークン契約
- 環境別の振る舞い
- スタイル拡張境界
- 開発時診断の原則
- 境界条件
- 検証観点

一方で、本書は次の事項を扱いません。

- データ取得そのものの状態管理
- 非同期処理の開始・中断・失敗制御
- 読み込み完了後にどの実コンテンツへ置き換えるかという画面設計
- `aria-busy`、`aria-live`、`role="status"` などの読み込み意味論をどのコンテナへ与えるかという上位レイヤ設計
- Skeleton 群の並びや段組みなど、ページ全体のプレースホルダーレイアウト
- 複数行テキスト Skeleton の自動生成を行うレイアウト API
- `article`、`card`、`list-item` などの用途別 preset 群
- `pulse`、`wave`、`bounce` などの複数アニメーション種別
- サーバー描画・ストリーミング・プリフェッチ戦略

これらは画面または上位のローディングパターンの責務であり、`ui-skeleton` 単体の公開契約には含めません。

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

| 名前          | 種別                 | 必須   | 内容             | 契約                                                                                 |
| ------------- | -------------------- | ------ | ---------------- | ------------------------------------------------------------------------------------ |
| `variant`     | property / attribute | いいえ | 用途別形状種別   | `text` / `circular` / `rectangular`。既定値は `rectangular`                          |
| `width`       | property / attribute | いいえ | 幅               | CSS 寸法文字列。前後空白は正規化されます                                             |
| `height`      | property / attribute | いいえ | 高さ             | CSS 寸法文字列。前後空白は正規化されます                                             |
| `aspectRatio` | property / attribute | いいえ | 矩形比率         | `rectangular` の比率指定。property 名は `aspectRatio`、attribute 名は `aspect-ratio` |
| `animated`    | property / attribute | いいえ | Shimmer 表示可否 | 既定値は `false`。`true` の場合のみ Shimmer を許可します                             |

### 属性反映契約

公開入力は property と attribute の両面から操作できます。`animated` は boolean attribute として扱います。`variant`、`width`、`height`、`aspectRatio` は reflect されます。

| property      | attribute      | reflect | 備考                                                 |
| ------------- | -------------- | ------- | ---------------------------------------------------- |
| `variant`     | `variant`      | あり    | 列挙外値は `rectangular` に正規化されます            |
| `width`       | `width`        | あり    | 文字列前後の空白は除去されます                       |
| `height`      | `height`       | あり    | 文字列前後の空白は除去されます                       |
| `aspectRatio` | `aspect-ratio` | あり    | 前後空白は除去されます。空文字は未指定として扱います |
| `animated`    | `animated`     | あり    | boolean attribute として扱います                     |

### 正規化契約

`variant`、`width`、`height`、`aspectRatio` の正規化は、更新サイクル内の確定値に対して適用されます。したがって、property 経由でも attribute 経由でも、最終的に観測される値は同一の正規化規則へ収束しなければなりません（MUST）。

- `variant` に列挙外値が与えられた場合、`rectangular` へ収束します。
- `width`、`height`、`aspectRatio` の前後空白は除去されます。
- `aspectRatio` に空文字が与えられた場合は未指定として扱います。
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

- `width` 指定があれば、それを `inline-size` に用います。
- `height` 指定があれば、それを `block-size` に用います。
- `height` が未指定で `aspectRatio` が指定されている場合、`block-size` の決定はその比率に委ねられます。
- `height` と `aspectRatio` の双方が指定されている場合、明示 `height` を優先します。
- `height` と `aspectRatio` の双方が未指定である場合、コンポーネント側に暗黙の高さフォールバックはありません。

`rectangular` は、`height` または `aspectRatio` のいずれかを与えることを正規運用とします（MUST）。`height` と `aspectRatio` の双方が未指定の入力は**契約外入力**です。実装はその入力を受理し得ますが、視覚成立を保証しません。開発時には診断対象として扱うことができます。

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

### 形状状態

- `text`
- `circular`
- `rectangular`

各状態は、用途別の占有領域を表す描画種別です。

### 寸法状態

寸法状態は、公開入力から導かれる描画成立条件です。

- `text` は `height` 未指定時に `1em` を既定値とします。
- `circular` は片側寸法のみが与えられた場合でも正円を維持します。
- `rectangular` は `height` または `aspectRatio` が与えられている場合に正規入力として成立します。

### アニメーション状態

- `animated=false` の場合、Shimmer は存在しません。
- `animated=true` の場合、Shimmer を描画できます。
- ただし、`forced-colors: active` または `prefers-reduced-motion: reduce` が成立する環境では、`animated=true` であっても Shimmer は停止または非生成となり得ます。

### 支援技術状態

`ui-skeleton` は常に `aria-hidden="true"` を維持します。利用者が `aria-hidden="false"` を与えても、Skeleton を読み上げ対象へ昇格させることはできません。

### 契約外入力

`variant="rectangular"` で `height` と `aspectRatio` の双方が未指定である場合、その入力は契約外です。実装は描画を拒否する必要まではありませんが、視覚成立は保証しません。

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

読み込み状態のアクセシビリティは、`ui-skeleton` の責務ではありません。`role="status"`、`aria-live`、`aria-busy`、待機理由の説明文、完了通知は、必要に応じて**上位コンテナ**が提供しなければなりません（MUST）。

したがって、`ui-skeleton` 自体に読み込み意味論を内包させる設計は採りません。

---

## 視覚契約

`ui-skeleton` の視覚契約は、最終コンテンツの見た目を模倣することではなく、**占有領域を静かに予告すること**にあります。

### 基本外観

- `ui-skeleton` は、単一の連続した占有面として知覚されなければなりません。
- Shimmer を描画する場合でも、その視覚効果は Skeleton 面の範囲内に収まらなければなりません。
- 既定背景は `--bg-fill-neutral` を基準とします。
- 既定角丸は `--radius-sm` を基準とします。
- `circular` は `--radius-full` により完全な円形として知覚されなければなりません。

上記を満たす限り、内部 CSS の実現方法は固定しません。

### Shimmer 表示

`animated=true` の場合、Shimmer を描画できます。Shimmer は Skeleton 面の上に重なる**視覚レイヤ**であり、レイアウト、ヒットテスト、意味論に影響してはなりません（MUST NOT）。

Shimmer は状態の主担い手ではなく、待機状態を弱く補助する視覚効果です。読書面に近い文脈では、**存在は認識できるが本文の主役にならない強さ**に抑えます。`variant` ごとに独自の強い演出差分を導入するべきではありません（SHOULD NOT）。

### 寸法と形状

- `text` は単一行の文字列占有幅を予告する細い帯です。
- `circular` は必ず正円でなければなりません。
- `rectangular` はメディアやブロック領域の比率または高さを予告する矩形面です。

とくに `rectangular` は、高さを暗黙補完しないこと自体が契約です。用途ごとに必要な矩形比率が異なるため、コンポーネント側が恣意的な既定高さを持つべきではありません。

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

`ui-skeleton` は `::part(...)` を公開しません。内部 DOM に依存した拡張面も持ちません。利用者は次の公開拡張面のみを保証対象として使用します。

- `variant` / `width` / `height` / `aspectRatio` / `animated`
- ホスト要素に対する外側レイアウト調整
- CSS Custom Properties による配色・角丸・Shimmer 調整

内部構造を前提にした Shadow DOM 内要素の探索や内部 class への依存を行ってはなりません（MUST NOT）。

### 保証対象内

- 寸法指定
- 比率指定
- マージンなどの外側レイアウト調整
- 配色トークン、角丸トークン、Shimmer 関連トークン

### 保証対象外だが許容

- 周辺コンテナ側での整列
- グリッドやフレックス文脈における配置制御
- ページ固有のレスポンシブ配置

### 保証しない変更

ホストの**基盤描画**や**切り取り**や**形状成立**を直接置き換える変更は、保証対象外です。たとえば `display`、`overflow`、`background`、`border-radius`、`position` などを変更して Skeleton 面そのものの成立条件を変える操作は、その代表例です。

上記の列挙は例示であり、網羅列挙ではありません。判断基準は、Skeleton の占有面、形状、切り取り、Shimmer の視覚レイヤ成立を壊すかどうかです。

---

## 開発時警告契約

`variant="rectangular"` で `height` と `aspectRatio` の双方が実質的に解決されない場合、実装は開発時警告を出すことができます。

この警告は、視覚安定性の不足を知らせる**診断機構**です。描画停止や例外送出は行いません。

警告頻度の細部は実装に委ねますが、同一要素の同一未解決状態に対して反復的にログを氾濫させてはなりません（MUST NOT）。判断基準は、診断として有用であることと、開発体験を不必要に損なわないことです。

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

### `rectangular` の高さ・比率未指定

`variant="rectangular"` で `height` と `aspectRatio` の双方を省略した場合、コンポーネントは高さを暗黙補完しません。この入力は契約外です。実装は描画を拒否する必要まではありませんが、視覚成立を保証しません。

### 不正な `variant`

列挙外の `variant` が与えられた場合、`rectangular` に正規化されます。属性値も最終的に `rectangular` へ反映されます。

### `aria-hidden` の上書き試行

利用者が `aria-hidden="false"` を与えても、実装は `true` に再同期します。Skeleton を読み上げ対象へ昇格させることはできません。

### `width` / `height` / `aspectRatio` の前後空白

`width=" 60% "`、`height=" 1.5em "`、`aspect-ratio=" 16 / 9 "` のような入力は、前後空白が除去されて保持されます。

### アニメーションの opt-in

`animated` は opt-in です。既定では静止表示であり、待機状態を示したい場合にのみ利用側が明示します。

### 環境設定によるアニメーション停止

`animated=true` であっても、`forced-colors: active` または `prefers-reduced-motion: reduce` が成立する環境では Shimmer は停止または非生成となります。利用側入力よりも環境設定が優先されます。

### 印刷時

どの `variant`、寸法、`animated` 状態であっても、印刷時は非表示です。

---

## Storybook 契約

Storybook は見本集ではなく、**契約確認のための検証面**として扱います。ただし、本書が固定するのは Story 名や分割方法ではなく、次の**検証観点**です。

- 既定状態で `aria-hidden="true"` を維持し、既定ではアニメーションしないこと
- `text` / `circular` / `rectangular` の用途別代表状態を描画できること
- `variant` の正規化、寸法文字列の正規化、`circular` の正円維持が成立すること
- `rectangular` で `height` と `aspectRatio` の双方が未指定の場合、契約外入力として診断できること
- 親コンテナの `aria-busy` 遷移と分離され、Skeleton 自体は終始 `aria-hidden="true"` であること
- 暗色トークン差し替え、Reduced Motion、Forced Colors、Print において契約が維持されること
- 公開拡張面と保証外変更の境界が理解可能であること

実際の Story 名、Story 数、分割単位は固定しません。将来の Story 再編は、上記検証観点が維持される限り許容されます。

---

## 不変条件

今後の変更でも、次の点は崩しません。

1. Skeleton 自体を支援技術から隠すこと。
2. `rectangular` の高さをコンポーネント側で暗黙補完しないこと。
3. `animated` を opt-in とし、静止状態を既定に保つこと。
4. `variant` を用途契約として扱うこと。
5. モーション抑制・高コントラスト・印刷への環境応答を維持すること。
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
