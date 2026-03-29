# Code Block

## 概要

本書は、コード表示の基底契約を定義します。

読者向けの正規出力は `pre[data-code-block] > code[data-lang]` です。`ui-code-block` は Storybook や実験用 preview で使ってよい dev/demo adapter として残しますが、production Markdown 出力と note 本文の正規経路では前提にしません。

本書では、単一の論理コード片を表示・参照・複写するための基底契約を、**静的 DOM 契約を正本**として定義します。責務は、単に `pre/code` を囲って装飾することではありません。**コード本文の提示、文脈メタデータ、copy 値の取得、横スクロール時のアクセシビリティ、印刷や高コントラスト時の成立性**を、一貫した公開契約として扱います。

本書では、`ui-code-block` の契約を次の 3 層に分けて定義します。

1. **基底契約**  
   単体の code block として成立するための契約です。
2. **group item 契約**  
   `ui-code-group` 配下で比較対象として扱われるときにのみ意味を持つ追加契約です。
3. **互換契約**  
   既存利用からの移行を支えるために受理してよいが、新規利用では推奨しない契約です。

---

## 1. 適用範囲

本書は、静的 code block 契約と `ui-code-block` adapter の次の事項を対象とします。

- 基底公開契約
- group item 契約
- 互換契約
- スロット入力契約
- 公開メソッド / イベント契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- 契約違反時の扱い
- Storybook 契約

一方で、本書は次の事項を扱いません。

- シンタックスハイライト生成そのもの
- テーマトークン定義そのもの
- コード実行環境や sandbox 制御
- code group の選択制御
- code preview の preview 面制御
- URL 同期、永続化、分析イベント送信
- Markdown 変換層が `pre[data-code-block] > code[data-lang]` をどう生成するかという詳細実装

これらは上位レイヤまたは別文書の責務です。

---

## 2. 設計原則

### 2.1 コード本文の正本は slotted `pre` / `code` です

一次情報の正本は `pre[data-code-block] > code[data-lang]` です。`ui-code-block` を使う場合も、この静的 code root を既定スロットへ与える adapter として扱います。  
copy 値、行番号、行強調、スクロール補助は、この入力を基準に解決します。

### 2.2 単体契約と比較契約を混同しません

`ui-code-block` 単体で必要な契約と、`ui-code-group` 配下で比較対象として必要な契約は分離します。  
`ui-code-group` は、block 側の基底契約全体や互換入力に依存してはなりません。

### 2.3 親が子の意味状態を所有しません

`ui-code-preview` などの親コンポーネントは、code block の意味状態を表す公開属性を所有しません。  
複合表示の視覚統合は、公開属性の付与ではなく CSS Custom Properties による合成で扱います。

### 2.4 同じ語を複数意味で使いません

曖昧な `label` を主要 API に置きません。  
比較 UI 用のタブラベルは `tabLabel`、copy 文脈用ラベルは `copyLabel` と分離します。

### 2.5 copy UI と copy 可否を分離します

copy button を見せるかどうかと、実際に copy 可能かどうかは別概念です。  
したがって、`copyMode` と `copyable` を分離して扱います。

### 2.6 DOM 形状の安定と意味の安定を区別します

本コンポーネントが安定して保証するのは、**意味内容、公開 API、アクセシビリティ上の役割**です。  
内部装飾のための descendant 構造、補助要素、`part` の細分化は、明示的に公開したものを除き長期安定 API に含めません。

---

## 3. 公開契約

## 3.1 基底契約

読者向けの正規入力は `pre[data-code-block]` 上の `data-code-*` 属性です。`ui-code-block` を使う場合は、次の入力を static 契約へ写像できなければなりません。

| property | attribute | 必須 | 既定値 | 内容 |
| --- | --- | --- | --- | --- |
| `filename` | `filename` | いいえ | 空文字 | ヘッダー表示や copy 文脈の補助に用いるファイル名です。 |
| `lang` | `lang` | いいえ | 空文字 | 言語識別子です。表示ラベルや `data-lang` に用います。 |
| `intent` | `intent` | いいえ | `neutral` | `neutral` / `valid` / `invalid` を受理します。 |
| `showLineNumbers` | `show-line-numbers` | いいえ | `false` | 行番号を表示します。 |
| `copyMode` | `copy-mode` | いいえ | `auto` | `auto` / `always` / `hidden` を受理します。 |
| `copyable` | `copyable` | いいえ | `true` | copy 操作を公開上許可するかどうかを表します。 |
| `wrap` | `wrap` | いいえ | `false` | 長い行を折り返すかどうかを表します。 |
| `highlightLines` | `highlight-lines` | いいえ | 空文字 | `1,3-5` のような論理行範囲指定です。 |
| `layout` | `layout` | いいえ | `standalone` | `standalone` / `inline` を受理します。 |

### 契約

- `filename`、`lang` は自由文字列を受理します。
- `intent` の列挙外値は `neutral` にフォールバックします。
- `copyMode` の列挙外値は `auto` にフォールバックします。
- `layout` の列挙外値は `standalone` にフォールバックします。
- `copyMode="auto"` は、copy 値が解決できる場合にのみ copy UI を表示します。
- `copyMode="always"` は、copy 値が空でも copy UI 自体は表示してよいですが、その場合は disabled とします。
- `copyable=false` の場合、`getCodeContent()` が値を返せても公開上は copy 不可として扱います。
- `highlightLines` の解釈不能断片は無視し、解釈可能な範囲のみ採用します。

## 3.2 group item 契約

次の入力は、`section[data-code-group]` 配下で比較対象として使われるときにのみ意味を持ちます。`ui-code-block` adapter を使う場合も、最終的には同じ metadata として静的 DOM へ落ちなければなりません。

| property | attribute | 必須 | 既定値 | 内容 |
| --- | --- | --- | --- | --- |
| `groupKey` | `group-key` | 条件付き必須 | 空文字 | group 内で一意な安定識別子です。`ui-code-group` 配下では必須です。 |
| `tabLabel` | `tab-label` | いいえ | 空文字 | 比較 UI における可視タブラベルです。 |
| `copyLabel` | `copy-label` | いいえ | 空文字 | copy 文脈ラベルです。 |

### 契約

- `groupKey` は、code group の比較対象として扱われる場合に限り必須です。
- `groupKey` は可視ラベルや copy 文言の自動フォールバックには用いません。
- `tabLabel` と `copyLabel` は別概念です。意味が異なる場合は両方を明示します。
- `ui-code-block` 単体では、これらの値を表示のために解釈しません。

## 3.3 互換契約

次の入力は受理してもよいですが、**新規利用では推奨しません**。

| 名前 | 種別 | 移行先 |
| --- | --- | --- |
| `headless` | property / attribute | 明示的なメタデータ省略と `copyMode` / `layout` の組み合わせへ移行します。 |
| `embedded` | property / attribute | `layout="inline"` へ移行します。 |
| `initialCode` | property / attribute (`initial-code`) | slotted `pre` / `code` を正本とする設計へ移行します。 |
| `label` | property / attribute | `tabLabel` / `copyLabel` / 上位側の `heading` へ分解します。 |
| `data-wrap="true"` | host または `pre` | `wrap=true` へ移行します。 |
| `data-raw` | slotted `pre` | slotted 本文を正本に統一します。 |

### 契約

- 互換入力は受理してもよいが、主要 API ではありません。
- 互換入力に依存した新規設計は行いません。
- `embedded` は親所有の意味状態ではなく、`layout="inline"` 相当の旧入力として扱います。
- `label` は本契約では意味を持たず、新設計では解釈しません。

---

## 4. スロット入力契約

### 4.1 既存 line markup の受理

Shiki 等の syntax highlighter により、`pre > code` 直下へ `.line` 要素列が既に与えられていてもよいです。

#### 契約

- 実装は、sibling 間の whitespace text node に論理改行の意味を持たせてはなりません。
- 論理行の単位は `.line` 要素列により解決します。
- 空行は空の `.line` 要素として保持してよいです。
- 行番号表示、行強調、copy 値復元は、既存 `.line` 要素列に対しても成立しなければなりません。

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
- `.line` 要素列が存在する場合、返却値はその論理行列から復元し、DOM 上の whitespace text node の有無に依存してはなりません。

## 5.2 公開イベント

### `ui-code-block-change`

`ui-code-block` adapter を使う場合に、`ui-code-group` などの上位コンポーネントが再評価すべき状態変化を通知します。読者向けの静的本文では runtime event を前提にしません。

| 項目 | 内容 |
| --- | --- |
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

読者向けの code block は attribute-driven な静的 DOM として扱います。`ui-code-block` はその契約を模倣する adapter として扱います。

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
- `layout` は表示文脈を表しますが、意味状態の所有権移譲ではありません。

---

## 7. DOM / Accessibility 契約

## 7.1 本文領域

- 本文は `pre` 相当のコード読書面として成立しなければなりません。
- 行番号を表示する場合も、コード本文自体の読書順を破壊してはなりません。
- 実装が `.line` 要素を block 化する場合でも、視覚上の行区切りと copy 値の行区切りが二重化してはなりません。

## 7.2 横スクロール

- 横スクロールが必要な場合のみ、フォーカス可能なスクロール領域として扱ってよいです。
- 横スクロールが不要な場合は、不要な tab stop を増やしてはなりません。

## 7.3 copy button

- `copyMode="hidden"` の場合、copy UI を表示しません。
- `copyMode="auto"` の場合、copy 値が解決できるときだけ copy UI を表示します。
- `copyable=false` の場合、表示しても disabled でなければなりません。
- copy 成功・失敗の通知方式そのものは本書の対象外です。

## 7.4 ヘッダー

- `filename` や `lang` の提示は任意です。
- ただし、提示する場合は本文の意味情報を誤認させない構造でなければなりません。

---

## 8. Visual Contract

## 8.1 `layout`

### 値

- `standalone`  
  独立した code block として振る舞います。
- `inline`  
  複合コンポーネント内に埋め込まれる前提の外装へ寄せます。

### 契約

- `layout` は視覚文脈を表します。
- `layout` の変更は、copy 契約、group item 契約、コード本文の正本を変えません。

## 8.2 合成用 CSS Custom Properties

`pre[data-code-block]` および `ui-code-block` adapter は、`code-composition.md` に定義される共通トークンを受け入れてよいです。  
代表例は次のとおりです。

- `--ui-code-surface-radius-top`
- `--ui-code-surface-radius-bottom`
- `--ui-code-surface-padding`
- `--ui-code-surface-breakout-width`
- `--ui-code-surface-breakout-margin`
- `--ui-code-header-display`

### 契約

- 親はこれらの値を上書きしてもよいです。
- これらは視覚合成用であり、意味状態ではありません。
- 親がこれらを与えても、`ui-code-block` の公開 API は変化しません。

## 8.3 非公開の内部 DOM

- 行番号ラッパ、強調用要素、補助 span、内部 `part` の増減は、明示的に公開しない限り安定 API ではありません。
- テストや上位コンポーネントは、内部 DOM 形状に依存してはなりません。

---

## 9. 環境別の振る舞い

## 9.1 小画面

- 長い行は横スクロールまたは折り返しで処理します。
- copy UI が本文可読性を損なわないようにします。

## 9.2 Forced Colors

- 色差だけに依存せず、境界と構造で意味が伝わるようにします。
- システムカラーへ確実にフォールバックします。

## 9.3 Print

- コード本文は印刷対象として残します。
- copy UI などの操作部は印刷時に省略し得ます。
- 強調行やファイル名など、静的理解に資する情報は保持します。

## 9.4 No-JS

- `pre[data-code-block] > code[data-lang]` 自体が完成形なので、JavaScript 未実行時でも本文読書は成立しなければなりません。
- copy button や overflow 補助のような enhancer 由来 UI は省略されてよいです。

---

## 10. 関連契約

## 10.1 `ui-code-group` との契約

読者向けの code group は、code block の **group item 契約**を `data-code-*` metadata として参照します。`ui-code-group` adapter を使う場合も依存面は同じです。  
すなわち、`groupKey`、`tabLabel`、`copyLabel`、`copyable`、`getCodeContent()`、`ui-code-block-change` が group 側の参照面です。

`ui-code-group` は、`ui-code-block` の互換入力や単体表示専用契約に依存してはなりません。

## 10.2 `ui-code-preview` との契約

`ui-code-preview` は、静的 code root または `ui-code-block` adapter の公開属性を付与・除去して合成を成立させません。  
視覚統合は `data-code-layout="inline"` 相当の出力と CSS Custom Properties により扱います。

---

## 11. 境界条件

| 条件 | 扱い |
| --- | --- |
| code root が空 | 正規契約不成立です。描画できても保証対象外です。 |
| `pre` が複数ある | 正規契約不成立です。最初の 1 件だけを採っても公開保証しません。 |
| `pre` なしで `code` のみ | 正規契約不成立です。 |
| `copyable=false` | `getCodeContent()` が値を返しても公開上は copy 不可です。 |
| `groupKey` が空 | 単体利用では問題ありません。`ui-code-group` 配下では契約違反です。 |
| `label` が指定される | 互換入力として受理してもよいですが、新設計では意味づけしません。 |

---

## 12. 契約違反時の扱い

- 契約違反を検知しても、可能な限り本文読書は維持してよいです。
- ただし、正規契約不成立の入力を「正常入力」として振る舞っているかのように文書化してはなりません。
- 開発時警告の有無、文言、発火回数は実装詳細です。
- 契約違反の CI / lint 判定基準は `code-composition.md` に従います。

---

## 13. Storybook 契約

少なくとも次を検証対象に含めます。

- `layout="standalone"` と `layout="inline"` の差分
- `copyMode` の 3 値
- `copyable=false`
- `groupKey` / `tabLabel` / `copyLabel` を持つ group item 契約
- 横スクロール時のみ focusable になること
- Forced Colors
- Print
- No-JS 相当構造保持
- Shiki 由来の `.line` 要素列を受けた場合に、二重空行が発生しないこと
- `.line` 要素列を受けた場合でも `getCodeContent()` が論理改行を保持すること

---

## 14. 補足

本設計の要点は次の 5 点です。

1. コード本文の正本を `pre[data-code-block] > code[data-lang]` に固定すること
2. code group が依存する比較契約を block 文書内で正式化すること
3. `embedded` や `label` を主要 API から外すこと
4. 親子合成を公開属性の付与ではなく `layout` と CSS Custom Properties で扱うこと
5. 意味の安定と内部 DOM 形状の安定を明確に分離すること

この 5 点を崩さない限り、静的 code block 契約と `ui-code-block` adapter は単体・比較・プレビュー合成のいずれにおいても責務境界を保ったまま保守できます。
