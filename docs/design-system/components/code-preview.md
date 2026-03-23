# Code Preview

## 概要

本書は、`ui-code-preview` の複合表示契約を定義します。

`ui-code-preview` は、preview 面と code 面を 1 つの読書単位として束ねるためのコンポーネントです。責務は、preview と code を上下に並べることではありません。**見出し、preview 面、code 面、補助操作、built-in controls、印刷時や小画面時の退行方針**を含めて、ひとまとまりの読書体験を成立させることにあります。

本設計では、`ui-code-preview` は **子コンポーネントの公開意味状態を所有しません**。  
したがって、親が子へ `embedded` のような属性を付与・除去して契約を成立させる方式は採りません。複合表示の視覚統合は、親自身の外枠設計と CSS Custom Properties により扱います。

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
- 契約違反時の扱い
- Storybook 契約

一方で、本書は次の事項を扱いません。

- preview スロット内で描画する個別 UI の業務ロジック
- code 面のコード文字列生成規則
- `ui-code-block` / `ui-code-group` 自体の copy や tab 契約
- URL 同期、永続化、分析イベント送信の最終方針
- 実行系 preview や sandbox の責務
- authoring lint / CI の最終判定基準

これらは上位レイヤまたは `code-composition.md` の責務です。

---

## 2. 設計原則

### 2.1 二面構成を正規利用とします

`ui-code-preview` の **正規利用** は、preview 面と code 面の両方を持つ構成です。  
片側だけが存在する構成は、表示できても正規契約成立とはみなしません。

### 2.2 見出しと code metadata を混同しません

preview ヘッダー左側の見出しは `heading` で表します。  
これは `ui-code-block` の `filename` や `ui-code-group` の `tabLabel` とは別概念です。

### 2.3 親が子の公開属性を所有しません

`ui-code-preview` は `ui-code-block` / `ui-code-group` へ `embedded` のような属性を付与・除去しません。  
子の意味状態は子自身の契約に属し、preview はそれを上書きしません。

### 2.4 視覚統合はスタイル合成で扱います

複合表示の一体感は、親外枠の設計と CSS Custom Properties により実現します。  
意味状態の移譲ではなく、視覚統合として扱います。

### 2.5 部分描画と契約成立を区別します

「片側が欠けても何かは出る」ことと、「コンポーネント契約が成立している」ことは別です。  
本書では、**正規構成**と**非正規縮退**を明確に分けて定義します。

### 2.6 built-in controls の状態変化は外部へ観測可能でなければなりません

`ui-code-preview` 自身は URL や永続化を所有しません。  
ただし、built-in controls による `preview-*` の変更は、外部オーケストレーション層が観測できなければなりません。

---

## 3. 公開契約

## 3.1 公開入力

| property | attribute | 必須 | 既定値 | 内容 |
| --- | --- | --- | --- | --- |
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

## 3.2 スロット契約

| 名前 | 種別 | 必須 | 個数 | 内容 |
| --- | --- | --- | --- | --- |
| `preview` | named slot | 正規構成では必須 | ちょうど 1 | preview 面の root を受け取ります。 |
| 既定スロット | slot | 正規構成では必須 | ちょうど 1 | `ui-code-block` または `ui-code-group` を直接受け取ります。 |
| `toolbar` | named slot | いいえ | 0 個以上 | ヘッダー右側の補助操作を受け取ります。 |

## 3.3 正規構成

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

## 3.4 code root との合成契約

`ui-code-preview` は code root の公開属性を設定・除去しません。  
ただし、次の構成を推奨します。

- code root が `ui-code-block` の場合は `layout="inline"` を用いる
- code root が `ui-code-group` の場合は group 側の標準外装を用いる

### 契約

- preview は子の意味状態を強制変更しません。
- 視覚統合が必要な場合、CSS Custom Properties により外装を寄せます。
- 子が standalone 外装のまま描画されても、それは authoring 上の構成問題であり、preview が隠蔽しません。

## 3.5 `controls` の公開文法

`controls` は空白区切り文字列です。受理する値は次の 3 種のみです。

- `theme`
- `surface`
- `viewport`

### 契約

- 不正トークンは無視します。
- 重複トークンは 1 回として扱います。
- トークン順は意味を持ちません。
- built-in controls の内部表示順は公開 API として固定しません。

## 3.6 built-in controls の意味

| control | 対象属性 | 選択肢 | 効果 |
| --- | --- | --- | --- |
| `theme` | `preview-theme` | `page` / `light` / `dark` | preview 面のテーマを切り替えます。 |
| `surface` | `preview-surface` | `surface` / `canvas` / `muted` | preview 面の背景文脈を切り替えます。 |
| `viewport` | `preview-viewport` | `full` / `tablet` / `mobile` | preview frame の幅を切り替えます。 |

### 契約

- これらは preview 面だけに作用します。
- code 面の配色や copy 契約には影響しません。
- built-in controls は `preview-*` 属性の編集 UI です。

## 3.7 公開イベント

### `ui-code-preview-state-change`

built-in controls または公開 property 更新により preview の公開状態が変化した場合に送出します。

| 項目 | 内容 |
| --- | --- |
| 名前 | `ui-code-preview-state-change` |
| `detail` | `{ keys: Array<'previewTheme' \| 'previewSurface' \| 'previewViewport'>, state: { previewTheme, previewSurface, previewViewport }, userInitiated }` |
| bubbles | `true` |
| composed | `true` |

### 契約

- `userInitiated=true` は、built-in controls のユーザー操作による変化を指します。
- 外部からの属性更新でも、実際の公開状態が変化した場合は `userInitiated=false` で通知してよいです。
- `heading` や `controls` の変化は、原則としてこのイベントの対象に含めません。
- URL 同期、永続化、分析イベント送信はこのイベントを利用して上位層が行います。

---

## 4. 状態モデル

`ui-code-preview` は、attribute-driven な複合コンポーネントとして扱います。

### 状態分類

1. **入力状態**  
   `heading`、`controls`、`preview-*`
2. **派生状態**  
   ヘッダー表示有無、built-in controls の有効集合、preview frame の見え方
3. **内部一時状態**  
   built-in controls の UI 内部状態など
4. **縮退状態**  
   code 面のみ、preview 面のみ、ヘッダー省略

### 契約

- 真の公開状態は `heading`、`controls`、`preview-*` にあります。
- `ui-code-preview` は URL 同期や永続化を所有しません。
- ただし、`preview-*` の変化は外部が観測できなければなりません。

---

## 5. DOM / Accessibility 契約

## 5.1 ヘッダー

ヘッダーは、`heading`、built-in controls、`toolbar` のいずれかが存在する場合に成立します。

### 契約

- `heading` がなくても built-in controls または `toolbar` があればヘッダーは成立します。
- `heading`、built-in controls、`toolbar` がすべて空であれば、ヘッダーは省略され得ます。

## 5.2 見出しの意味

`heading` は、preview と code の読書単位を表す見出しです。  
`ui-code-group` のタブラベルや `ui-code-block` のファイル名の代替ではありません。

## 5.3 toolbar

`toolbar` は補助操作用です。

### 契約

- preview / code の主内容を `toolbar` へ置きません。
- icon-only 要素を置く場合はアクセシブル名を与えなければなりません。

## 5.4 preview 面と code 面

- preview 面と code 面は、読書上まとまりのある 1 単位として認識できなければなりません。
- preview 面の状態変化は、code 面の意味状態を暗黙に変えてはなりません。

---

## 6. Visual Contract

## 6.1 視覚統合の原則

`ui-code-preview` は、preview 面と code 面を 1 つの外枠に束ねます。  
ただし、そのために子の意味状態を変更しません。

## 6.2 合成用 CSS Custom Properties

`ui-code-preview` は、`code-composition.md` に定義される共通トークンを descendant の code root へ渡してよいです。  
代表例は次のとおりです。

- `--ui-code-surface-radius-top`
- `--ui-code-surface-breakout-width`
- `--ui-code-preview-divider-color`

### 契約

- これらは視覚合成用であり、意味状態ではありません。
- これらを与えても、code root の公開 API は変化しません。

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
- 視覚統合は CSS Custom Properties で補助し得ます。

## 8.2 `ui-code-group` との契約

- preview は group の選択状態や公開属性を所有しません。
- group を code root としてそのまま組み込みます。
- 必要な外部同期は `ui-code-group-change` を上位層が受けて行います。

## 8.3 `code-composition.md` との関係

- URL 同期、永続化、分析イベント、authoring lint、違反の重大度分類は `code-composition.md` に従います。
- 本書は preview 単体の公開契約だけを定義します。

---

## 9. 境界条件

| 入力異常 | 挙動 |
| --- | --- |
| `preview` スロットが空 | code 面のみ残してよいです。正規契約は不成立です。 |
| 既定スロットが空 | preview 面のみ残してよいです。正規契約は不成立です。 |
| 複数 code root | 最初の有効 root だけを描画してもよいですが、その挙動は公開保証しません。正規契約は不成立です。 |
| wrapper 越し code root | code 面は描画できても、正規保証対象にはしません。 |
| 無関係要素混在 | 統合対象に含めません。必要に応じて開発時警告の対象としてよいです。 |

---

## 10. 契約違反時の扱い

### 10.1 重大違反

次は **重大違反** として扱います。

- code root が複数ある
- code root が直接子として解決できない
- `preview` / code のどちらが主内容か判別できない

#### 契約

- 重大違反時は、外枠としての完全な複合表示成立を主張してはなりません。
- 可能なら部分描画で情報喪失を防ぎます。

### 10.2 軽微違反

次は **軽微違反** として扱います。

- `heading` 欠落
- 不正な `controls` トークン
- `layout="inline"` 推奨に未追従だが code 面自体は成立している

#### 契約

- 軽微違反は、既定値フォールバックまたは見た目上の不統一として処理してよいです。
- ただし、外部へ露出する意味状態を改変して帳尻を合わせてはなりません。

---

## 11. Storybook 契約

少なくとも次を検証対象に含めます。

- `ui-code-block` を code root とする正規構成
- `ui-code-group` を code root とする正規構成
- `heading` あり / なし
- `controls` の各組み合わせ
- `ui-code-preview-state-change` の送出
- `preview` 空時の部分描画
- code root 空時の部分描画
- Print
- Reduced Motion
- No-JS 相当構造保持

---

## 12. 補足

本設計の要点は次の 5 点です。

1. 二面構成を正規利用とし、部分描画と契約成立を区別すること
2. `heading` を code metadata から独立させること
3. 親が子の意味状態を所有しないこと
4. `preview-*` の変更を外部観測可能にすること
5. URL 同期や永続化の責務を preview 自身に押し込まないこと

これにより、`ui-code-preview` は「きれいな見た目の箱」ではなく、長期運用に耐える複合表示コンポーネントとして扱えます。
