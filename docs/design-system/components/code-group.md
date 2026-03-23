# Code Group

## 概要

本書は、`ui-code-group` の合成契約を定義します。

`ui-code-group` は、複数の `ui-code-block` を比較可能な単一提示面へ束ねるコンポーネントです。責務は、単に block をタブ化することではありません。**比較対象の識別、選択状態の安定化、copy 文脈の同期、比較 UI の成立条件、入力違反時の退行規則**を、一貫した公開契約として提供することにあります。

本設計では、`ui-code-group` は `ui-code-block` 本体契約全体には依存しません。  
依存するのは、`ui-code-block` 文書に定義された **group item 契約**だけです。

---

## 1. 適用範囲

本書は、`ui-code-group` の次の事項を対象とします。

- 公開契約
- 入力文法
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- 契約違反時の扱い
- Storybook 契約

一方で、本書は次の事項を扱いません。

- `ui-code-block` 単体のコード表示契約
- シンタックスハイライト生成
- コピー成功通知文言の最終設計
- preview 面を伴う複合表示
- URL ルーティング仕様全体
- 実行系 preview や sandbox の責務
- authoring lint / CI の最終判定基準

これらは上位レイヤまたは `code-composition.md` の責務です。

---

## 2. 設計原則

### 2.1 比較対象は stable key で識別します

選択状態、イベント、動的更新後の再解決は、並び順 index ではなく `groupKey` を主識別子として扱います。

### 2.2 依存先は `ui-code-block` の group item 契約に限定します

`ui-code-group` が子に要求してよいのは、`groupKey`、`tabLabel`、`copyLabel`、`copyable`、`getCodeContent()`、`ui-code-block-change` だけです。  
block 側の互換入力や単体表示専用入力には依存しません。

### 2.3 可視ラベルと copy 文脈ラベルを分離します

比較 UI のタブラベルと copy 文脈ラベルは別概念です。  
したがって、`tabLabel` と `copyLabel` を分離して扱います。

### 2.4 `label` を解決候補に使いません

曖昧な補助識別子 `label` は、本設計では group のラベル解決に用いません。  
可視ラベルは `tabLabel`、`filename`、`lang` だけで解決します。

### 2.5 比較 UI の成立条件を曖昧にしません

比較 UI は「複数あるから出す」のではなく、**比較対象として有効な child が 2 件以上あるときのみ**成立します。

### 2.6 読書維持と比較成立を分けて扱います

契約違反があっても、可能な限りコード本文の読書は維持してよいです。  
ただし、比較 UI の正規成立とは区別します。

---

## 3. 公開契約

## 3.1 正規入力

`ui-code-group` の正規入力は、**host 直下の `ui-code-block` 要素列**です。  
これらの child は、`ui-code-block` 文書に定義された **group item 契約**を満たしていなければなりません。

### child に要求する契約

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `groupKey` / `group-key` | はい | group 内で一意な安定識別子です。 |
| `getCodeContent()` | はい | copy 用文字列を返します。 |
| `copyable` | いいえ | copy 可否を表します。既定は `true` とみなします。 |
| `tabLabel` / `tab-label` | いいえ | タブラベルです。 |
| `copyLabel` / `copy-label` | いいえ | copy 文脈ラベルです。 |
| `filename` | いいえ | タブまたは copy 文脈の補助解決に使います。 |
| `lang` | いいえ | タブまたは copy 文脈の補助解決に使います。 |
| `ui-code-block-change` | いいえ | 子の再評価通知です。 |

## 3.2 受理対象の子要素

- 比較対象として収集するのは、**host 直下の `ui-code-block` 要素ノードのみ**です。
- テキストノード、コメントノードは比較対象判定に影響しません。
- wrapper 要素配下の `ui-code-block` は比較対象に含めません。
- `ui-code-block` 以外の直下要素が混在する場合、その構成は比較 UI の正規入力に含みません。

### 補足

- 上記は runtime の公開契約です。
- authoring 時に wrapper を許すかどうか、lint でどこまで禁止するかは `code-composition.md` に従います。
- 本コンポーネントは wrapper を辿ることを長期保証しません。

## 3.3 公開 property / attribute

| property | attribute | reflect | 既定値 | 内容 |
| --- | --- | --- | --- | --- |
| `selectedValue` | `selected-value` | あり | なし | controlled mode における現在選択値です。 |
| `defaultSelectedValue` | `default-selected-value` | なし | なし | uncontrolled mode における初期選択値です。 |
| `activation` | `activation` | あり | `auto` | `auto` / `manual` を受理します。 |

### 契約

- `selected-value` が与えられる場合、controlled mode として扱います。
- `selected-value` が与えられない場合、uncontrolled mode として扱います。
- `activation="auto"` では、フォーカス移動に追従して選択を変えます。
- `activation="manual"` では、フォーカス移動だけでは選択を変えず、確定操作でのみ選択を変えます。

## 3.4 選択値の解決

選択値は `groupKey` を基準に解決します。

### 契約

- `selectedValue` が有効な `groupKey` を指す場合、その項目を選択します。
- 非制御時に `defaultSelectedValue` が有効な `groupKey` を指す場合、その項目を初期選択します。
- いずれも解決できない場合、最初の有効項目を選択します。
- child 再解決後も、同じ `groupKey` が存在する限り選択状態を維持します。
- index は補助情報であり、主識別子ではありません。

## 3.5 タブラベル決定契約

可視タブラベルは、次の優先順で決定します。

1. `tabLabel`
2. `filename`
3. `lang`

### 契約

- `label` は参照しません。
- `groupKey` は内部識別子であり、可視ラベルには使いません。
- 上記のいずれでも解決できない場合、その child は比較 UI 上の有効比較対象に含めません。
- 比較軸がファイル名や言語名と異なる場合、利用側は `tabLabel` を明示しなければなりません。

## 3.6 copy 文脈決定契約

copy 文脈ラベルは、次の優先順で決定します。

1. `copyLabel`
2. `filename`
3. `lang`
4. `tabLabel`

上記のいずれでも解決できない場合、既定ラベル `コード` を使います。

### 契約

- `groupKey` は copy 文脈ラベルに用いません。
- `copyLabel` を指定すれば、タブラベルと copy 文脈ラベルを分離できます。

## 3.7 比較 UI の有効条件

- **2 件以上の有効な比較対象**がある場合にのみ、比較 UI を有効化します。
- **1 件のみ**の場合、タブ UI を生成せず、単一表示へ退行します。
- **0 件**の場合、fallback content をそのまま表示します。

有効な比較対象とは、少なくとも次を満たす child です。

- `groupKey` が空でない
- `groupKey` が重複していない
- タブラベルを解決できる

## 3.8 公開メソッド

### `focusSelectedTab(): void`

現在選択中の tab へフォーカスを移します。

### `refresh(): void`

child list と child metadata を再評価し、選択状態・copy 状態・ラベル解決を再同期します。

## 3.9 公開イベント

### `ui-code-group-change`

選択状態が変化した場合に送出します。

| 項目 | 内容 |
| --- | --- |
| 名前 | `ui-code-group-change` |
| `detail` | `{ value, prevValue, index, prevIndex, userInitiated }` |
| bubbles | `true` |
| composed | `true` |

### 契約

- uncontrolled mode では、実際に選択が変わったときのみ発火します。
- controlled mode では、ユーザー操作によって外部へ選択変更要求が発生したときに発火します。
- `userInitiated=true` は、ポインタまたはキーボード操作による発火を指します。
- 属性更新や `refresh()` による再解決では `userInitiated=false` とします。
- `value` / `prevValue` が主識別子です。`index` / `prevIndex` は補助情報です。

---

## 4. 状態モデル

`ui-code-group` は、stable key による選択状態を管理する合成コンポーネントです。

### 状態分類

1. **入力状態**  
   `selectedValue`、`defaultSelectedValue`、`activation`
2. **子由来状態**  
   `groupKey`、`tabLabel`、`copyLabel`、`copyable`、`getCodeContent()`
3. **派生状態**  
   現在選択 child、copy 文脈ラベル、tab 集合、disabled 状態
4. **縮退状態**  
   比較 UI 無効、単一表示、fallback 表示

### 契約

- child の source order は表示順の基準です。
- child 再順序付け時も、同じ `groupKey` が存在する限り選択状態を維持します。
- child metadata 変化は `ui-code-block-change` により再評価し得ます。

---

## 5. DOM / Accessibility 契約

## 5.1 タブ UI

比較 UI が有効な場合、`ui-code-group` は tablist / tab / tabpanel パターンを形成します。

### 契約

- tablist はアクセシブル名を持たなければなりません。
- アクセシブル名の優先順は `aria-labelledby` → `aria-label` → 既定名 `コードグループ` です。
- 選択状態は `aria-selected` に反映します。
- tab と panel は一意な対応関係を持ちます。

## 5.2 比較 UI が無効な場合

比較対象が 1 件以下、または入力違反により比較 UI を有効化できない場合、tablist / tab / tabpanel を形成しません。  
単純表示へ退行します。

## 5.3 copy button

group が copy button を内包する場合、active item に応じて次を同期します。

- `value`
- `label`
- `disabled`

### 契約

- `copyable=false` の child が active のとき、copy button は disabled とします。
- `getCodeContent()` を提供しない child は copy 不可として扱います。
- active item 切替時には、一時状態を初期化してよいです。

---

## 6. Visual Contract

## 6.1 group 自体に `embedded` 状態を持ちません

本設計では、`ui-code-group` 自体は `embedded` のような親所有前提の公開状態を持ちません。  
複合表示時の視覚統合は、CSS Custom Properties により行います。

## 6.2 合成用 CSS Custom Properties

`ui-code-group` は、`code-composition.md` に定義される共通トークンを受け入れてよいです。  
代表例は次のとおりです。

- `--ui-code-surface-radius-top`
- `--ui-code-surface-radius-bottom`
- `--ui-code-tablist-border`
- `--ui-code-panel-padding`

### 契約

- これらは視覚合成用であり、意味状態ではありません。
- 親がこれらを与えても、`selectedValue`、`activation`、イベント契約は変化しません。

---

## 7. 環境別の振る舞い

## 7.1 小画面

- tablist は横スクロールしてよいです。
- 比較 UI を成立させることが本文可読性を損なう場合、情報密度を下げる方向で退行してよいです。

## 7.2 Print

- 印刷時に複数 tab をどう展開するかは実装設計によります。
- ただし、印刷結果が selected item しか示さないのか、全 item を展開するのかは実装内で一貫していなければなりません。
- copy UI は印刷面に出しません。

## 7.3 No-JS

- light DOM に child block が残るため、最低限のコード本文は失われません。
- タブ UI の完全成立は保証対象外です。

---

## 8. 関連契約

## 8.1 `ui-code-block` との契約

`ui-code-group` は、`ui-code-block` の group item 契約のみに依存します。

## 8.2 `ui-code-preview` との契約

`ui-code-preview` は `ui-code-group` の選択状態を所有しません。  
必要な外部同期は `ui-code-group-change` を通じて上位オーケストレーション層が担います。

## 8.3 `code-composition.md` との関係

URL 同期、永続化、分析イベント、authoring lint、違反の重大度分類は `code-composition.md` に従います。  
本書は group 単体の公開契約だけを定義します。

---

## 9. 境界条件

| 条件 | 扱い |
| --- | --- |
| child が 0 件 | fallback content をそのまま表示します。 |
| child が 1 件 | 比較 UI を生成せず単一表示へ退行します。 |
| `groupKey` 欠落 | その child は有効比較対象に含めません。 |
| `groupKey` 重複 | 重複集合は有効比較対象に含めません。 |
| タブラベル未解決 | その child は有効比較対象に含めません。 |
| `ui-code-block` 以外の直下要素混在 | 正規契約不成立です。比較 UI を無効化してよいです。 |
| wrapper 越し child | 正規契約不成立です。比較対象に含めません。 |

---

## 10. 契約違反時の扱い

### 10.1 重大違反

次は **重大違反** として扱います。

- `groupKey` 重複
- `ui-code-block` 以外の直下要素混在により比較対象集合が不明瞭になる場合
- wrapper 越し child に依存しないと比較対象を確定できない場合

#### 契約

- 重大違反時は比較 UI を成立させてはなりません。
- 可能であれば本文読書だけを残す単純表示へ退行します。

### 10.2 軽微違反

次は **軽微違反** として扱います。

- `tabLabel` 欠落だが `filename` または `lang` で代替可能
- `copyLabel` 欠落
- 一部 child のみ比較対象から脱落するが、残余集合で比較 UI が成立する場合

#### 契約

- 軽微違反時は、問題の child を除外して残余集合で比較 UI を成立させてよいです。
- このとき、選択値が無効化された child を指していた場合は再解決します。

---

## 11. Storybook 契約

少なくとも次を検証対象に含めます。

- controlled / uncontrolled の両モード
- `activation="auto"` と `activation="manual"`
- `groupKey` による再解決
- `tabLabel` / `copyLabel` の分離
- `filename` / `lang` フォールバック
- `groupKey` 重複時の重大違反処理
- 1 件時の単一表示
- Forced Colors
- Print
- No-JS 相当構造保持

---

## 12. 補足

本設計の要点は次の 4 点です。

1. 比較対象の主識別子を `groupKey` に固定すること
2. `ui-code-block` への依存面を group item 契約に限定すること
3. 比較 UI 成立条件を「有効比較対象 2 件以上」に固定すること
4. 重大違反と軽微違反を区別し、静かな劣化を減らすこと

これにより、`ui-code-group` は block 実装の内部都合に引きずられず、長期保守しやすい比較コンポーネントとして成立します。