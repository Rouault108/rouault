# Code Block

## 概要

本書は、`ui-code-block` の**基底契約**を定義します。

`ui-code-block` は、単一の論理コード片を表示・参照・複写するための基礎コンポーネントです。責務は、単に `pre/code` を囲って装飾することではありません。**コード本文の提示、文脈メタデータ、コピー値の取得、横スクロール時のアクセシビリティ、印刷や高コントラスト時の成立性**を、一貫した公開契約として扱います。

本書では、`ui-code-block` の契約を次の 3 層に分けて定義します。

1. **基底契約**  
   単体の code block として成立するための契約です。
2. **group item 契約**  
   `ui-code-group` 配下で比較対象として扱われるときにのみ意味を持つ追加契約です。
3. **互換契約**  
   既存利用からの移行を支えるために受理するが、新規利用では推奨しない契約です。

この分離により、`ui-code-group` や `ui-code-preview` が `ui-code-block` に何を要求してよいかを、文書上で明示します。

---

## 1. 適用範囲

本書は、`ui-code-block` の次の事項を対象とします。

- 基底公開契約
- group item 契約
- 互換契約
- スロット入力契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約

一方で、本書は次の事項を扱いません。

- シンタックスハイライト生成そのもの
- Shiki テーマ定義そのもの
- コード実行環境や sandbox 制御
- code group の選択制御
- code preview のプレビュー面制御
- Markdown 変換層がどのように `ui-code-block` を出力するかという上位規則

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 2. 設計原則

### 2.1 コード本文の正本は slotted `pre` / `code` です

本コンポーネントの一次情報は、既定スロットへ与えられる `pre` または `pre > code` です。  
copy 値、行番号、行強調、スクロール補助は、この入力を基準に解決します。

### 2.2 単体契約と比較契約を混同しません

`ui-code-block` 単体で必要な契約と、`ui-code-group` 配下で比較対象として必要な契約は分離します。  
これにより、group 側が block 側の未定義面へ依存することを防ぎます。

### 2.3 親が子の意味状態を所有しません

`ui-code-preview` などの親コンポーネントは、`ui-code-block` の**意味状態を表す公開属性**を所有しません。  
複合表示のための視覚統合は、**継承される CSS Custom Properties による合成**で扱います。親が子へ `embedded` のような意味属性を付与して契約を成立させる設計は採りません。

### 2.4 同じ語を複数意味で使いません

`label` のような曖昧な語は、基底契約には置きません。  
比較 UI 用のタブラベルは `tabLabel`、コピー文脈用ラベルは `copyLabel` と分離します。

### 2.5 表示状態と copy 可否を分離します

copy button を見せるかどうかと、実際に copy 可能かどうかは別概念です。  
したがって、`copyMode` と `copyable` を分離して扱います。

---

## 3. 公開契約

## 3.1 基底契約

`ui-code-block` の主要公開入力は次のとおりです。

| property          | attribute            | 必須   | 既定値        | 内容 |
| ----------------- | -------------------- | ------ | ------------- | ---- |
| `filename`        | `filename`           | いいえ | 空文字        | ヘッダー表示や copy 文脈の補助に用いるファイル名です。 |
| `lang`            | `lang`               | いいえ | 空文字        | 言語識別子です。表示ラベルや `data-lang` 生成に使います。 |
| `intent`          | `intent`             | いいえ | `neutral`     | `neutral` / `valid` / `invalid` を受理します。 |
| `showLineNumbers` | `show-line-numbers`  | いいえ | `false`       | 行番号を表示します。 |
| `copyMode`        | `copy-mode`          | いいえ | `auto`        | `auto` / `always` / `hidden` を受理します。 |
| `copyable`        | `copyable`           | いいえ | `true`        | copy 操作を公開上許可するかどうかを表します。 |
| `wrap`            | `wrap`               | いいえ | `false`       | 長い行を折り返すかどうかを表します。 |
| `highlightLines`  | `highlight-lines`    | いいえ | 空文字        | `1,3-5` のような論理行範囲指定です。 |
| `layout`          | `layout`             | いいえ | `standalone`  | `standalone` / `inline` を受理します。 |

### 契約

- `filename`、`lang` は自由文字列を受理します。
- `intent` の列挙外値は `neutral` にフォールバックします。
- `copyMode` の列挙外値は `auto` にフォールバックします。
- `layout` の列挙外値は `standalone` にフォールバックします。
- `copyable=false` の場合、`getCodeContent()` が値を返せても公開上は copy 不可として扱います。
- `highlightLines` の解釈不能断片は無視し、解釈可能な範囲のみ採用します。

## 3.2 group item 契約

次の入力は、`ui-code-group` 配下で比較対象として使われるときにのみ意味を持ちます。

| property     | attribute      | 必須 | 既定値 | 内容 |
| ------------ | -------------- | ---- | ------ | ---- |
| `groupKey`   | `group-key`    | 条件付き必須 | 空文字 | group 内で一意な安定識別子です。`ui-code-group` 配下では必須です。 |
| `tabLabel`   | `tab-label`    | いいえ | 空文字 | 比較 UI における可視タブラベルです。 |
| `copyLabel`  | `copy-label`   | いいえ | 空文字 | copy 文脈ラベルです。 |

### 契約

- `groupKey` は、`ui-code-group` 配下にある場合に限り必須です。
- `groupKey` は可視ラベルや copy 文言の自動フォールバックには用いません。
- `tabLabel` と `copyLabel` は別概念です。意味が異なる場合は両方を明示します。
- `ui-code-block` 単体では、これらの値を表示のために解釈しません。

## 3.3 互換契約

次の入力は受理してもよいですが、**新規利用では推奨しません**。

| 名前 | 種別 | 移行先 |
| ---- | ---- | ------ |
| `headless` | property / attribute | 明示的なメタデータ省略と `copyMode` / `layout` の組み合わせへ移行します。 |
| `embedded` | property / attribute | `layout="inline"` へ移行します。 |
| `initialCode` | property / attribute (`initial-code`) | slotted `pre` / `code` を正本とする設計へ移行します。 |
| `label` | property / attribute | `tabLabel` / `copyLabel` / 上位コンポーネント側の `heading` へ分解します。 |
| `data-wrap="true"` | host または `pre` | `wrap=true` へ移行します。 |
| `data-raw` | slotted `pre` | slotted 本文を正本に統一します。 |

### 契約

- 互換入力は**受理してもよい**が、主要 API ではありません。
- 互換入力に依存した新規設計は行いません。
- `embedded` は親所有の意味状態ではなく、単に `layout="inline"` 相当の旧入力として扱います。
- `label` は本契約では意味を持たず、新設計では解釈しません。

---

## 4. スロット入力契約

本コンポーネントの正規入力は、既定スロットへ与えられる **1 つの論理コード片**です。

### 正規構成

- `pre`
- `pre > code`

### 契約

- `ui-code-block` は empty shell として使ってはなりません。
- 複数の独立したコード片を 1 つの `ui-code-block` に混在させてはなりません。
- `pre` が複数ある場合、それは正規利用に含みません。
- `code` が存在しても `pre` がない構成は正規利用に含みません。
- 実装が描画できても、公開契約上の保証対象にはしません。

---

## 5. 公開メソッド / イベント契約

## 5.1 公開メソッド

### `getCodeContent(): string`

copy 用の文字列を返します。

#### 契約

- 返す値は、表示装飾を除いた論理コード本文です。
- `copyable=false` でも値を返し得ますが、その場合でも copy 可能とはみなしません。
- 返却値の正本は slotted `pre` / `code` です。
- 互換入力 `data-raw` や `initialCode` は、新規設計では正本として扱いません。

## 5.2 公開イベント

### `ui-code-block-change`

`ui-code-group` などの上位コンポーネントが再評価すべき状態変化を通知します。

| 項目 | 内容 |
| ---- | ---- |
| 名前 | `ui-code-block-change` |
| 発火条件 | コンテンツまたはメタデータが変化し、上位が再評価を要する場合 |
| `detail` | `{ kinds: Array<'content' \| 'metadata'>, affectsCopyValue: boolean }` |
| bubbles | `true` |
| composed | `true` |

#### 契約

- `content` は、copy 値または表示本文に影響する変化を指します。
- `metadata` は、`filename`、`lang`、`tabLabel`、`copyLabel`、`copyable` などに影響する変化を指します。
- 同期都合による内部再計算だけでイベントを濫発しません。
- 旧 `ui-code-block-metadata-change` / `ui-code-block-content-change` は互換イベントとして残してもよいですが、長期契約では `ui-code-block-change` に統一します。

---

## 6. 状態モデル

`ui-code-block` は、**attribute-driven な宣言的コンポーネント**として扱います。

### 状態分類

1. **入力状態**  
   `filename`、`lang`、`intent`、`copyMode`、`copyable`、`wrap`、`layout` など
2. **派生状態**  
   言語表示ラベル、横スクロール有無、行強調集合など
3. **内部一時状態**  
   copy button の一時表示、測定結果など

### 契約

- 真の公開状態は host の property / attribute にあります。
- 横スクロール有無や focusability は派生状態であり、外部 API ではありません。
- `layout` は表示文脈の一次状態です。
- `headless` / `embedded` は一次状態ではなく互換入力です。

---

## 7. DOM / Accessibility 契約

## 7.1 ヘッダー

ヘッダーは、文脈メタデータまたは copy 操作が存在するときにのみ成立します。

### 契約

- `filename`、`lang`、`intent`、copy button のいずれもない場合、ヘッダーは省略され得ます。
- `label` はヘッダー文言に使用しません。
- `tabLabel` / `copyLabel` は単体表示ヘッダーに使用しません。

## 7.2 スクロール領域

横スクロールが必要な場合に限り、`pre` はフォーカス可能スクロール領域となり得ます。

### 契約

- 常時 `tabindex=0` を強制しません。
- 横スクロール不要時は追加フォーカス停止点を増やしません。
- `aria-label` または `aria-description` は、必要な場合に限って付与します。

## 7.3 light DOM への限定的介入

本コンポーネントは slotted `pre` / `code` に対して、表示・操作・A11y のための限定的な属性付与を行い得ます。

### 契約

- `part="pre"`、`part="code"` を付与し得ます。
- 行番号や強調のための補助構造を整備し得ます。
- コード本文の意味内容そのものは書き換えません。
- 利用側は「slot に渡した DOM が一切変化しない」ことを前提にしてはなりません。

---

## 8. Visual Contract

## 8.1 `layout`

`layout` は、`ui-code-block` が単体カードとして振る舞うか、複合読書単位の一部として静かに振る舞うかを表します。

### 値

- `standalone`  
  独立した code block として振る舞います。
- `inline`  
  複合コンポーネント内に埋め込まれる前提の外装へ寄せます。

## 8.2 合成用 CSS Custom Properties

親コンポーネントは、**公開属性を書き換えるのではなく**、継承される CSS Custom Properties により視覚統合を行います。

重要な公開変数は次のとおりです。

- `--ui-code-block-breakout-width`
- `--ui-code-block-breakout-margin`
- `--ui-code-block-padding`
- `--ui-code-block-radius-top`
- `--ui-code-block-radius-bottom`
- `--ui-code-block-header-display`

### 契約

- 親はこれらの値を上書きしてもよいです。
- これらは視覚合成用であり、意味状態ではありません。
- 親がこれらを与えても、`ui-code-block` の公開 API は変化しません。

---

## 9. 環境別の振る舞い

## 9.1 小画面

- 長い行は横スクロールまたは折り返しで処理します。
- copy button が本文可読性を損なわないようにします。

## 9.2 Forced Colors

- 色差だけに依存せず、境界と構造で意味が伝わるようにします。
- システムカラーへ確実にフォールバックします。

## 9.3 Print

- コード本文は印刷対象として残します。
- copy UI などの操作部は印刷時に省略し得ます。
- 強調行やファイル名など、静的理解に資する情報は保持します。

## 9.4 No-JS

- light DOM に本文が残るため、最低限の情報は失われません。
- JavaScript 未実行時の完全な装飾成立は保証対象外です。

---

## 10. 関連契約

## 10.1 `ui-code-group` との契約

`ui-code-group` は、`ui-code-block` の**group item 契約**のみに依存します。  
すなわち、`groupKey`、`tabLabel`、`copyLabel`、`copyable`、`getCodeContent()`、`ui-code-block-change` が group 側の参照面です。

`ui-code-group` は、`ui-code-block` の互換入力や単体表示専用の契約に依存してはなりません。

## 10.2 `ui-code-preview` との契約

`ui-code-preview` は、`ui-code-block` の公開属性を付与・除去して合成を成立させません。  
視覚統合は `layout="inline"` と継承 CSS 変数により扱います。

---

## 11. 境界条件

### 11.1 スロットが空

正規利用に含みません。描画できても契約成立とはみなしません。

### 11.2 `pre` が複数ある

正規利用に含みません。最初のものだけを採る実装であっても、その挙動は公開保証しません。

### 11.3 `copyable=false`

copy button は disabled または非表示とし得ます。  
`getCodeContent()` が値を返しても、公開上は copy 不可です。

### 11.4 `groupKey` が空

単体利用では問題ありません。`ui-code-group` 配下では契約違反です。

### 11.5 `label` が指定される

互換入力として受理してもよいですが、新設計では意味づけしません。

---

## 12. Storybook 契約

少なくとも次を検証対象に含めます。

- `layout="standalone"` と `layout="inline"` の差分
- `copyMode` の 3 値
- `copyable=false`
- `groupKey` / `tabLabel` / `copyLabel` を持つ group item 契約
- 横スクロール時のみ focusable になること
- Forced Colors
- Print
- No-JS 相当構造保持

---

## 13. 補足

本設計の要点は次の 4 点です。

1. コード本文の正本を slotted `pre` / `code` に固定すること
2. `ui-code-group` が依存する比較契約を block 文書内で正式化すること
3. `embedded` や `label` を主要 API から外すこと
4. 親子合成を公開属性の付与ではなく、`layout` と継承 CSS 変数で扱うこと

この 4 点を崩さない限り、`ui-code-block` は単体・比較・プレビュー合成のいずれにおいても、責務境界を保ったまま保守できます。