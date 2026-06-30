# Code Preview

## 概要

本書は、`ui-code-preview`の複合表示契約を定義します。

`ui-code-preview`は、preview面とcode面を1つの読書単位として束ねるためのコンポーネントです。責務は、previewとcodeを上下に並べることではありません。**見出し、preview面、code面、補助操作、built-in controls、印刷時や小画面時の退行方針**を含めて、ひとまとまりの読書体験を成立させることにあります。

本設計では、`ui-code-preview`は **子コンポーネントの公開意味状態を所有しません**。  
したがって、親が子へ`embedded`のような属性を付与・除去して契約を成立させる方式は採りません。複合表示の視覚統合は、親自身の外枠設計とCSS Custom Propertiesにより扱います。

---

## 1. 適用範囲

本書は、`ui-code-preview`の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- 契約違反時の扱い
- Storybook契約

一方で、本書は次の事項を扱いません。

- previewスロット内で描画する個別UIの業務ロジック
- code面のコード文字列生成規則
- static code rootやdev/demo adapter自体のcopyやtab契約
- URL同期、永続化、分析イベント送信の最終方針
- 実行系previewやsandboxの責務
- authoring lint / CIの最終判定基準

これらは上位レイヤまたは`docs/contracts/code-surfaces.md`の責務です。

---

## 2. 設計原則

### 2.1 二面構成を正規利用とします

`ui-code-preview`の **正規利用** は、preview面とcode面の両方を持つ構成です。  
片側だけが存在する構成は、表示できても正規契約成立とはみなしません。

### 2.2 見出しと code metadata を混同しません

previewヘッダー左側の見出しは`heading`で表します。  
これはcode blockの`filename`やcode groupの`tabLabel`とは別概念です。

### 2.3 親が子の公開属性を所有しません

`ui-code-preview`は静的code rootやdev/demo adapterへ`embedded`のような属性を付与・除去しません。  
子の意味状態は子自身の契約に属し、previewはそれを上書きしません。

### 2.4 視覚統合はスタイル合成で扱います

複合表示の一体感は、親外枠の設計とCSS Custom Propertiesにより実現します。  
意味状態の移譲ではなく、視覚統合として扱います。

### 2.5 部分描画と契約成立を区別します

「片側が欠けても何かは出る」ことと、「コンポーネント契約が成立している」ことは別です。  
本書では、**正規構成**と**非正規縮退**を明確に分けて定義します。

### 2.6 built-in controls の状態変化は外部へ観測可能でなければなりません

`ui-code-preview`自身はURLや永続化を所有しません。  
ただし、built-in controlsによる`preview-*`の変更は、外部オーケストレーション層が観測できなければなりません。

---

## 3. 公開契約

## 3.1 公開入力

| property          | attribute          | 必須   | 既定値    | 内容                                          |
| ----------------- | ------------------ | ------ | --------- | --------------------------------------------- |
| `heading`         | `heading`          | いいえ | 空文字    | ヘッダー左側に表示する見出しです。            |
| `controls`        | `controls`         | いいえ | 空文字    | built-in controlsを空白区切りで指定します。  |
| `previewPadding`  | `preview-padding`  | いいえ | `normal`  | `normal` / `compact` / `none`を受理します。  |
| `previewAlign`    | `preview-align`    | いいえ | `center`  | `center` / `start` / `stretch`を受理します。 |
| `previewTheme`    | `preview-theme`    | いいえ | `page`    | `page` / `light` / `dark`を受理します。      |
| `previewSurface`  | `preview-surface`  | いいえ | `surface` | `surface` / `canvas` / `muted`を受理します。 |
| `previewViewport` | `preview-viewport` | いいえ | `full`    | `full` / `tablet` / `mobile`を受理します。   |

### 契約

- `heading`はtrim後に空なら「見出しなし」として扱います。
- `controls`は`theme` / `surface` / `viewport`のみを有効トークンとして受理します。
- 不正トークンは無視します。
- `preview-*`の列挙外値はそれぞれ既定値へフォールバックします。

### 3.1.1 非公開 profile 注入

`ui-code-preview`には、build / layout側が内部的に`preview-profile`を注入してよいものとします。これはauthor向け公開APIではありません。

- `preview-profile`は`reader` / `demo`を内部値として扱います。
- authoring記法やmarkdown directiveから直接指定することは想定しません。
- `reader` profileは静的読書用です。
- `demo` profileはcontrolsとtoolbarを伴うdemo用です。
- profileの選択責務はnote kindを知っているbuild / layout側にあります。

### 3.1.2 static-first 境界

`ui-code-preview`はstateful allowlist componentとして維持します。viewport / theme / surface control、toolbar、focus制御、keyboard操作、内部Shadow DOM CSSはcomponentが所有し、static component CSSや`note-static-surface-enhancer`へ移しません。

note SSRではhostと公開Light DOMのpreview / code root / toolbar fallbackを保持します。default slotのcode rootは`figure[data-code-block-root]`と`section[data-code-group]`だけを正規契約とし、旧`pre[data-code-block]`直置きは廃止仕様です。

## 3.2 スロット契約

| 名前         | 種別       | 必須             | 個数       | 内容                                                                                  |
| ------------ | ---------- | ---------------- | ---------- | ------------------------------------------------------------------------------------- |
| `preview`    | named slot | 正規構成では必須 | ちょうど1 | preview面のrootを受け取ります。                                                    |
| 既定スロット | slot       | 正規構成では必須 | ちょうど1 | `figure[data-code-block-root]`または`section[data-code-group]`を直接受け取ります。 |
| `toolbar`    | named slot | いいえ           | 0個以上   | ヘッダー右側の補助操作を受け取ります。                                                |

## 3.3 正規構成

本契約における正規構成は、次の条件をすべて満たす入力です。

1. `preview`スロットにpreview rootが1つあること
2. 既定スロットにcode rootが1つあること
3. code rootは`figure[data-code-block-root]`または`section[data-code-group]`であること
4. code rootは`ui-code-preview`の直接子要素であること
5. `toolbar`は補助操作のみを受け持つこと

### 正規構成に含まれないもの

- `preview`スロットが空
- 既定スロットが空
- 複数のcode root
- wrapper越しのcode root
- `pre[data-code-block]`の直置き
- raw `pre > code`の直置き
- 既定スロットへの無関係要素混在

## 3.4 code root との合成契約

`ui-code-preview`はcode rootの公開属性を設定・除去しません。  
ただし、次の構成を推奨します。

- code rootが単体blockの場合は`data-code-layout="inline"`をbuild-timeで反映する
- code rootがgroupの場合は`section[data-code-group]`の標準外装をそのまま用いる

### 契約

- previewは子の意味状態を強制変更しません。
- 視覚統合が必要な場合、CSS Custom Propertiesにより外装を寄せます。
- 子がstandalone外装のまま描画されても、それはauthoring上の構成問題であり、previewが隠蔽しません。

## 3.5 `controls` の公開文法

`controls`は空白区切り文字列です。受理する値は次の3種のみです。

- `theme`
- `surface`
- `viewport`

### 契約

- 不正トークンは無視します。
- 重複トークンは1回として扱います。
- トークン順は意味を持ちません。
- built-in controlsの内部表示順は公開APIとして固定しません。

## 3.6 built-in controls の意味

| control    | 対象属性           | 選択肢                         | 効果                                 |
| ---------- | ------------------ | ------------------------------ | ------------------------------------ |
| `theme`    | `preview-theme`    | `page` / `light` / `dark`      | preview面のテーマを切り替えます。   |
| `surface`  | `preview-surface`  | `surface` / `canvas` / `muted` | preview面の背景文脈を切り替えます。 |
| `viewport` | `preview-viewport` | `full` / `tablet` / `mobile`   | preview frameの幅を切り替えます。   |

### 契約

- これらはpreview面だけに作用します。
- code面の配色やcopy契約には影響しません。
- built-in controlsは`preview-*`属性の編集UIです。

## 3.7 公開イベント

### `ui-code-preview-state-change`

built-in controlsまたは公開property更新によりpreviewの公開状態が変化した場合に送出します。

| 項目     | 内容                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 名前     | `ui-code-preview-state-change`                                                                                                                      |
| `detail` | `{ keys: Array<'previewTheme' \| 'previewSurface' \| 'previewViewport'>, state: { previewTheme, previewSurface, previewViewport }, userInitiated }` |
| bubbles  | `true`                                                                                                                                              |
| composed | `true`                                                                                                                                              |

### 契約

- `userInitiated=true`は、built-in controlsのユーザー操作による変化を指します。
- 外部からの属性更新でも、実際の公開状態が変化した場合は`userInitiated=false`で通知してよいです。
- `heading`や`controls`の変化は、原則としてこのイベントの対象に含めません。
- URL同期、永続化、分析イベント送信はこのイベントを利用して上位層が行います。

---

## 4. 状態モデル

`ui-code-preview`は、attribute-drivenな複合コンポーネントとして扱います。

### 状態分類

1. **入力状態**  
   `heading`、`controls`、`preview-*`
2. **派生状態**  
   ヘッダー表示有無、built-in controlsの有効集合、preview frameの見え方
3. **内部一時状態**  
   built-in controlsのUI内部状態など
4. **縮退状態**  
   code面のみ、preview面のみ、ヘッダー省略

### 契約

- 真の公開状態は`heading`、`controls`、`preview-*`にあります。
- `ui-code-preview`はURL同期や永続化を所有しません。
- ただし、`preview-*`の変化は外部が観測できなければなりません。

---

## 5. DOM / Accessibility 契約

## 5.1 ヘッダー

ヘッダーは、`heading`、built-in controls、`toolbar`のいずれかが存在する場合に成立します。

### 契約

- `heading`がなくてもbuilt-in controlsまたは`toolbar`があればヘッダーは成立します。
- `heading`、built-in controls、`toolbar`がすべて空であれば、ヘッダーは省略され得ます。

## 5.2 見出しの意味

`heading`は、previewとcodeの読書単位を表す見出しです。  
静的code groupのタブラベルや静的code blockのファイル名の代替ではありません。

## 5.3 toolbar

`toolbar`は補助操作用です。

### 契約

- preview / codeの主内容を`toolbar`へ置きません。
- icon-only要素を置く場合はアクセシブル名を与えなければなりません。
- `reader` profileでは`toolbar`が与えられていても描画対象に含めません。

## 5.4 preview 面と code 面

- preview面とcode面は、読書上まとまりのある1単位として認識できなければなりません。
- preview面の状態変化は、code面の意味状態を暗黙に変えてはなりません。

---

## 6. Visual Contract

## 6.1 視覚統合の原則

`ui-code-preview`は、preview面とcode面を1つの外枠に束ねます。  
ただし、そのために子の意味状態を変更しません。

## 6.2 合成用 CSS Custom Properties

`ui-code-preview`は、`docs/contracts/code-surfaces.md`に定義されるcode surfaceの静的HTML契約を上書きしない範囲で、descendantのcode rootへ合成用tokenを渡してよいです。  
代表例は次のとおりです。

- `--ui-code-surface-radius-top`
- `--ui-code-surface-breakout-width`
- `--ui-code-preview-divider-color`

### 契約

- これらは視覚合成用であり、意味状態ではありません。
- これらを与えても、code rootの公開APIは変化しません。

---

## 7. 環境別の振る舞い

## 7.1 小画面

- preview面とcode面は縦方向の読書順を維持します。
- built-in controlsが過密になる場合、情報密度を下げる方向で退行します。

## 7.2 Print

- 全体幅は`100%`に寄せます。
- preview面とcode面は静的資料として残します。
- built-in controlsと`toolbar`の補助操作は印刷面に出しません。
- `heading`は印刷時にも残します。

## 7.3 Reduced Motion

- transitionは意味情報の必須要素ではありません。
- reduced motionでは静的表示へ縮退しても、意味情報を失いません。

## 7.4 No-JS

- slotベースの構造のため、preview内容とstatic code rootはlight DOMに残ります。
- JavaScript未実行時でも、少なくともpreviewとcodeの本文情報は失われません。

## 7.5 Note Kind 統合

- `kind: reader`のnoteでは、build-timeに`controls`と`slot="toolbar"`を禁止してよいものとします。
- `kind: testing`や`demo`相当の配信面では、build / layout側が`preview-profile="demo"`を注入してcontrolsを有効化してよいです。
- `kind: reader`では、build / layout側が`preview-profile="reader"`を注入し、hydrationを伴わない静的表示経路へ固定してよいです。
- これらはnote配信面との統合契約であり、`ui-code-preview`単体のauthor-facing APIではありません。

---

## 8. 関連契約

## 8.1 単体 code block との契約

- previewはblockの公開属性を設定・除去しません。
- blockをcode rootとして用いる場合、authoring / build-timeは`data-code-layout="inline"`相当へ正規化すべきです。
- 視覚統合はCSS Custom Propertiesで補助し得ます。

## 8.2 code group との契約

- previewはgroupの選択状態や公開属性を所有しません。
- groupをstatic code rootとしてそのまま組み込みます。
- static code group enhancerは`data-code-group-sync-scope`による同一enhance root内同期をcode group内部契約として扱います。previewはその同期scopeを拡張、再解釈、外部公開しません。
- static code group enhancerは外部同期用の変更イベントを提供しません。外部同期イベントが必要になった場合は、旧custom event互換ではなく別Request / Decisionとして扱います。

## 8.3 `docs/contracts/code-surfaces.md` との関係

- code root、copy、tab、code groupの静的HTML正本契約は`docs/contracts/code-surfaces.md`に従います。
- 本書はpreview単体の公開契約だけを定義し、code surface contractを上書きしません。

---

## 9. 境界条件

| 入力異常               | 挙動                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `preview`スロットが空 | code面のみ残してよいです。正規契約は不成立です。                                              |
| 既定スロットが空       | preview面のみ残してよいです。正規契約は不成立です。                                           |
| 複数code root         | 最初の有効rootだけを描画してもよいですが、その挙動は公開保証しません。正規契約は不成立です。 |
| wrapper越しcode root | code面は描画できても、正規保証対象にはしません。                                              |
| 無関係要素混在         | 統合対象に含めません。必要に応じて開発時警告の対象としてよいです。                             |

---

## 10. 契約違反時の扱い

### 10.1 重大違反

次は **重大違反** として扱います。

- code rootが複数ある
- code rootが直接子として解決できない
- `preview` / codeのどちらが主内容か判別できない

#### 契約

- 重大違反時は、外枠としての完全な複合表示成立を主張してはなりません。
- 可能なら部分描画で情報喪失を防ぎます。

### 10.2 軽微違反

次は **軽微違反** として扱います。

- `heading`欠落
- 不正な`controls`トークン
- `layout="inline"`推奨に未追従だがcode面自体は成立している

#### 契約

- 軽微違反は、既定値フォールバックまたは見た目上の不統一として処理してよいです。
- ただし、外部へ露出する意味状態を改変して帳尻を合わせてはなりません。

---

## 11. Storybook 契約

少なくとも次を検証対象に含めます。

- `figure[data-code-block-root]`をcode rootとする正規構成
- `section[data-code-group]`をcode rootとする正規構成
- `heading`あり / なし
- `controls`の各組み合わせ
- `ui-code-preview-state-change`の送出
- `preview`空時の部分描画
- code root空時の部分描画
- Print
- Reduced Motion
- No-JS相当構造保持

---

## 12. 補足

本設計の要点は次の5点です。

1. 二面構成を正規利用とし、部分描画と契約成立を区別すること
2. `heading`をcode metadataから独立させること
3. 親が子の意味状態を所有しないこと
4. `preview-*`の変更を外部観測可能にすること
5. URL同期や永続化の責務をpreview自身に押し込まないこと

これにより、`ui-code-preview`は「きれいな見た目の箱」ではなく、長期運用に耐える複合表示コンポーネントとして扱えます。
