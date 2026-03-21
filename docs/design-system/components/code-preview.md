# Code Preview

## 概要

本書は、`ui-code-preview` の**複合表示契約**を定義します。

`ui-code-preview` は、**preview 面と code 面を 1 つの読書単位として束ねる**ためのコンポーネントです。責務は、preview と code を上下に並べることではありません。**見出し、preview 面、code 面、補助操作、印刷時や小画面時の退行方針**を含めて、ひとまとまりの読書体験を成立させることにあります。

本設計では、`ui-code-preview` は **子コンポーネントの公開意味状態を所有しません**。  
したがって、従来の `embedded` のように、親が子へ属性を付与・除去して契約を成立させる方式は採りません。複合表示の視覚統合は、**親自身の外枠設計**と、**継承される CSS Custom Properties** により扱います。

また、見出し入力には `label` ではなく **`heading`** を用います。  
これにより、`ui-code-block` の旧 `label` や `ui-code-group` のラベル解決と衝突しない語彙へ整理します。

---

## 1. 適用範囲

本書は、`ui-code-preview` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約

一方で、本書は次の事項を扱いません。

- preview スロット内で描画する個別 UI の業務ロジック
- code 面のコード文字列生成規則
- `ui-code-block` / `ui-code-group` 自体の copy や tab 契約
- URL 同期、永続化、ローカル設定保存
- 実行系 preview や sandbox の責務

---

## 2. 設計原則

### 2.1 `ui-code-preview` は厳格な二面構成です

preview 面と code 面はどちらも意味上必須です。  
片側だけを見せる用途には使いません。

### 2.2 見出しと code metadata を混同しません

preview ヘッダー左側の見出しは `heading` で表します。  
これは `ui-code-block` の `filename` や `tabLabel` とは別概念です。

### 2.3 親が子の公開属性を所有しません

`ui-code-preview` は `ui-code-block` / `ui-code-group` へ `embedded` のような属性を付与・除去しません。  
子の意味状態は子自身の契約に属し、preview はそれを上書きしません。

### 2.4 視覚統合はスタイル合成で扱います

複合表示の一体感は、親外枠の設計と継承 CSS 変数により実現します。  
意味状態の移譲ではなく、視覚統合として扱います。

### 2.5 非正規入力時も何を残すかを固定します

「保証しない」だけではなく、**何を残し、どこで退行するか**を明示します。

---

## 3. 公開契約

## 3.1 公開入力

| property | attribute | 必須 | 既定値 | 内容 |
| -------- | --------- | ---- | ------ | ---- |
| `heading` | `heading` | いいえ | 空文字 | ヘッダー左側に表示する見出しです。 |
| `controls` | `controls` | いいえ | 空文字 | built-in controls を空白区切りで指定します。 |
| `previewPadding` | `preview-padding` | いいえ | `normal` | `normal` / `compact` / `none` を受理します。 |
| `previewAlign` | `preview-align` | いいえ | `center` | `center` / `start` / `stretch` を受理します。 |
| `previewTheme` | `preview-theme` | いいえ | `page` | `page` / `light` / `dark` を受理します。 |
| `previewSurface` | `preview-surface` | いいえ | `surface` | `surface` / `canvas` / `muted` を受理します。 |
| `previewViewport` | `preview-viewport` | いいえ | `full` | `full` / `tablet` / `mobile` を受理します。 |

### 契約

- `heading` は trim 後に空なら「見出しなし」として扱います。
- `controls` は `theme` / `surface` / `viewport` のみを有効トークンとして受理します。
- 不正トークンは無視します。
- `preview-*` の列挙外値はそれぞれ既定値へフォールバックします。

## 3.2 互換契約

次の入力は互換のために受理してもよいですが、新規利用では推奨しません。

| 名前 | 種別 | 移行先 |
| ---- | ---- | ------ |
| `label` | property / attribute | `heading` |
| 子要素への `embedded` 依存 | 設計上の旧前提 | 視覚統合は親外枠と継承 CSS 変数へ移行 |

### 契約

- `label` を受理する場合でも、内部では `heading` へ正規化して扱います。
- `embedded` を前提とする親子合成は長期契約に含めません。

## 3.3 スロット契約

| 名前 | 種別 | 必須 | 個数 | 内容 |
| ---- | ---- | ---- | ---- | ---- |
| `preview` | named slot | はい | ちょうど 1 | preview 面の root を受け取ります。 |
| 既定スロット | slot | はい | ちょうど 1 | `ui-code-block` または `ui-code-group` を直接受け取ります。 |
| `toolbar` | named slot | いいえ | 0 個以上 | ヘッダー右側の補助操作を受け取ります。 |

## 3.4 正規構成

本契約における正規構成は、次の条件をすべて満たす入力です。

1. `preview` スロットに preview root が 1 つあること
2. 既定スロットに code root が 1 つあること
3. code root は `ui-code-block` または `ui-code-group` であること
4. code root は `ui-code-preview` の直接子要素であること
5. `toolbar` は補助操作のみを受け持つこと

### 正規構成に含まれないもの

- `preview` スロットが空
- 既定スロットが空
- 複数の code root
- wrapper 越しの code root
- 既定スロットへの無関係要素混在

## 3.5 code root との合成契約

`ui-code-preview` は code root の公開属性を設定・除去しません。  
ただし、次の構成を**推奨**します。

- code root が `ui-code-block` の場合は `layout="inline"` を用いる
- code root が `ui-code-group` の場合は group 側の既定合成外装を用いる

### 契約

- preview は子の意味状態を強制変更しません。
- 視覚統合が必要な場合、継承 CSS 変数により外装を寄せます。
- 子が standalone 外装のまま描画されても、それは authoring 上の構成問題であり、preview が隠蔽しません。

## 3.6 `controls` の公開文法

`controls` は空白区切り文字列です。受理する値は次の 3 種のみです。

- `theme`
- `surface`
- `viewport`

### 契約

- 不正トークンは無視します。
- 重複トークンは 1 回として扱います。
- トークン順は意味を持ちません。
- built-in controls の内部表示順は公開 API として固定しません。

## 3.7 built-in controls の意味

| control | 対象属性 | 選択肢 | 効果 |
| ------- | -------- | ------ | ---- |
| `theme` | `preview-theme` | `page` / `light` / `dark` | preview 面のテーマを切り替えます。 |
| `surface` | `preview-surface` | `surface` / `canvas` / `muted` | preview 面の背景文脈を切り替えます。 |
| `viewport` | `preview-viewport` | `full` / `tablet` / `mobile` | preview frame の幅を切り替えます。 |

### 契約

- これらは preview 面だけに作用します。
- code 面の配色や copy 契約には影響しません。
- built-in controls は `preview-*` 属性の編集 UI です。

---

## 4. 状態モデル

`ui-code-preview` は、**attribute-driven な複合コンポーネント**として扱います。

### 状態分類

1. **入力状態**  
   `heading`、`controls`、`preview-*`
2. **派生状態**  
   ヘッダー表示有無、built-in controls の有効集合、preview frame の見え方
3. **内部一時状態**  
   built-in controls の UI 内部状態など

### 契約

- 真の公開状態は `heading`、`controls`、`preview-*` にあります。
- `ui-code-preview` 自身は独自の public custom event を公開しません。
- 永続化や URL 同期は責務に含みません。

---

## 5. DOM / Accessibility 契約

## 5.1 ヘッダー

ヘッダーは、`heading`、built-in controls、`toolbar` のいずれかが存在する場合に成立します。

### 契約

- `heading` がなくても built-in controls または `toolbar` があればヘッダーは成立します。
- 逆に、`heading`、built-in controls、`toolbar` がすべて空であれば、ヘッダーは省略され得ます。

## 5.2 見出しの意味

`heading` は、preview と code の読書単位を表す見出しです。  
`ui-code-group` のタブラベルや `ui-code-block` のファイル名の代替ではありません。

## 5.3 toolbar

`toolbar` は補助操作用です。

### 契約

- preview / code の主内容を `toolbar` へ置きません。
- icon-only 要素を置く場合は、アクセシブル名を与えなければなりません。

---

## 6. Visual Contract

## 6.1 視覚統合の原則

`ui-code-preview` は、preview 面と code 面を 1 つの外枠に束ねます。  
ただし、そのために子の意味状態を変更しません。

## 6.2 合成用 CSS Custom Properties

`ui-code-preview` は、必要に応じて descendant の code root へ継承される CSS Custom Properties を与えてよいです。  
典型的には次のような変数を扱います。

- `--ui-code-block-radius-top`
- `--ui-code-block-breakout-width`
- `--ui-code-group-radius-top`

### 契約

- これらは**視覚統合用のスタイル変数**であり、意味状態ではありません。
- 子コンポーネントは、これらを受け取って外装を静かに寄せてよいです。
- preview がこれらを与えても、子の公開 API は変化しません。

---

## 7. 環境別の振る舞い

## 7.1 小画面

- preview 面と code 面は縦方向の読書順を維持します。
- built-in controls が過密になる場合、情報密度を下げる方向で退行します。

## 7.2 Print

- 全体幅は `100%` に寄せます。
- preview 面と code 面は静的資料として残します。
- built-in controls と `toolbar` の補助操作は印刷面に出しません。
- `heading` は印刷時にも残します。

## 7.3 Reduced Motion

- transition は意味情報の必須要素ではありません。
- reduced motion では静的表示へ縮退しても、意味情報を失いません。

## 7.4 No-JS

- slot ベースの構造のため、preview 内容と code 内容は light DOM に残ります。
- JavaScript 未実行時でも、少なくとも情報そのものは失われません。

---

## 8. 関連契約

## 8.1 `ui-code-block` との契約

- preview は block の公開属性を設定・除去しません。
- block を code root として用いる場合、author は `layout="inline"` を選ぶべきです。
- 視覚統合は継承 CSS 変数で補助し得ます。

## 8.2 `ui-code-group` との契約

- preview は group の選択状態や公開属性を所有しません。
- group を code root としてそのまま組み込みます。

---

## 9. 境界条件

## 9.1 退行表

| 入力異常 | 挙動 |
| ------- | ---- |
| `preview` スロットが空 | code 面のみ残し、preview 面は描画しません。正規契約は不成立です。 |
| 既定スロットが空 | preview 面のみ残し、code 面は描画しません。正規契約は不成立です。 |
| 複数 code root | 最初の有効 root だけを描画してもよいですが、その挙動は公開保証しません。実装上は開発時警告の対象とします。 |
| wrapper 越し code root | code 面は描画できても、複合表示の正規保証対象にはしません。 |
| 無関係要素混在 | その要素は統合対象に含めません。必要に応じて開発時警告の対象とします。 |

## 9.2 `controls` の不正値

- 列挙外トークンは無視します。
- 不正値に対して例外送出を公開契約としません。

## 9.3 `heading` が空

見出しなしとして扱います。  
他のヘッダー要素がなければヘッダー全体を省略し得ます。

---

## 10. Storybook 契約

少なくとも次を検証対象に含めます。

- `heading` の有無
- `controls` の 3 種
- `previewPadding` / `previewAlign` / `previewTheme` / `previewSurface` / `previewViewport`
- `ui-code-block` を code root とする場合
- `ui-code-group` を code root とする場合
- 小画面
- Print
- Reduced Motion
- No-JS 相当構造保持
- 非正規構成時の退行表

---

## 11. 補足

本設計の要点は次の 4 点です。

1. preview ヘッダーの見出しを `heading` に固定すること
2. 子へ `embedded` を付与して契約を成立させないこと
3. 視覚統合を外枠設計と継承 CSS 変数へ寄せること
4. 非正規入力時に何を残すかを退行表で固定すること

この 4 点を固定することで、`ui-code-preview` は `ui-code-block` / `ui-code-group` の責務を侵食せず、複合表示の責務だけに集中できます。