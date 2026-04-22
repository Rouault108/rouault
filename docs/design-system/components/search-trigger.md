# Search Trigger

## 概要

本書は、`ui-search-trigger` の公開契約、状態モデル、アクセシビリティ、視覚契約、および関連する統合条件を整理するものです。

`ui-search-trigger` は、ヘッダーやツールバーに配置される、**検索ダイアログの起動要求を通知する stateless launcher** です。見た目は検索入力欄に近い外形を取りますが、実体はネイティブ `<button>` であり、文字入力、検索語保持、ダイアログ状態保持は行いません。

したがって、本コンポーネントの契約は、**検索入力のように見えること**ではなく、**検索ダイアログの起動主体として誤解なく機能すること**を優先します。Input-like な外形は二次的な visual idiom にとどまり、意味論の中心は launcher にあります。Rouault においては、読書中の視線を過度に乱さず、必要なときに検索へ移行できる静かな導線として扱います。

---

## 適用範囲

本書は、`ui-search-trigger` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 現行実装で未対応または未整合の事項

一方で、本書は次の事項を扱いません。

- 検索インデックスの生成
- 検索クエリの入力、補完、履歴管理
- `ui-search-dialog` 自体の描画と状態管理
- グローバルショートカットの登録
- 検索結果の表示やナビゲーション
- アプリケーション全体の検索体験設計
- ショートカット hint や `kbd` 表示の責務決定
- icon-only 時の補助ラベルや tooltip 的 UI の設計
- trigger 自身に検索入力値を保持させること
- trigger 自身にダイアログ表示状態を内蔵すること
- `placeholder` に検索スコープやアクセシブル名の責務を兼務させること
- 検索候補や最近使った検索語を trigger 内へ持ち込むこと
- グローバルショートカット登録を trigger 内で自動化すること
- OS 判定やキーマップ差分吸収を trigger 内で完結させること
- 通常 button と同じ強い主張の視覚表現へ寄せること

これらは上位レイヤ、別コンポーネント、または control 系共通契約の責務です。

---

## 設計の基本方針

`ui-search-trigger` は、検索ダイアログの起動要求を通知する stateless launcher です。
本コンポーネントは input control ではなく、検索語、ダイアログ開閉状態、グローバルショートカット、フォーカス復元の真実源泉を持ちません。

本書では次を固定します。

- 実体はネイティブ `<button>` とします。
- `open-search-dialog` は request event とし、ダイアログ表示そのものは上位レイヤが担います。
- `placeholder` は視覚表示専用の文字列とし、アクセシブル名、検索語初期値、検索スコープとしては解釈しません。
- Input-like な外形は visual idiom であり、意味論の中心ではありません。
- 親レイアウトの局所事情は直接読まず、必要な composition 調整は公開 style input で受け取ります。

---

## 公開契約

`ui-search-trigger` は、`placeholder` と `disabled` を公開入力として扱います。内部実装は `ui-button` を用いますが、利用者は `ui-search-trigger` を契約単位として扱います。

`placeholder` の既定値は `"検索..."` です。これは **視覚表示用のラベル** であり、アクセシブル名、検索対象スコープ、検索語初期値を兼ねません。アクセシブル名は button の `aria-label` により独立して与えます。

`disabled=true` の場合、内部 button は無効化され、ユーザー操作およびプログラム的起動の結果として `open-search-dialog` を発火しません。

### 入力契約

`ui-search-trigger` は、`placeholder`、`disabled`、`density` を公開入力として扱います。

| 名前          | 種別                 | 必須   | 内容             | 契約                                                                                                                          |
| ------------- | -------------------- | ------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `placeholder` | property / attribute | いいえ | 視覚表示用ラベル | 既定値は `"検索..."` です。アクセシブル名、検索語初期値、検索スコープには使用しません。                                       |
| `disabled`    | property / attribute | いいえ | 無効状態         | `true` の場合、内部 button を無効化し、起動しません。                                                                         |
| `density`     | property / attribute | いいえ | 視覚密度         | `auto` / `default` / `compact` / `icon-only` を受け付けます。既定値は `auto` です。意味論は変えず、視覚密度だけを制御します。 |

加えて、アクセシビリティおよびダイアログ関係の補助入力として、次を受け付けます。

- `aria-label` は、内部 button のアクセシブル名を外部から明示上書きするために使用できます。
- `aria-controls` は、関連する検索ダイアログの id を外部から与えるために使用できます。
- `aria-expanded` は、上位レイヤが保持するダイアログ開状態を外部から反映するために使用できます。

`placeholder` という名称は公開 API 上の名前であり、HTML input の placeholder と同一の意味は持ちません。
本コンポーネントにおける `placeholder` は、検索起動導線であることを視覚的に示すラベルです。

`placeholder` という名称は `ui-search-field` と同名ですが、意味は異なります。`ui-search-field` では検索 input の補助文言を指し、`ui-search-trigger` では launcher の視覚ラベルを指します。両者を相互代替として扱いません。

`density` は意味論の切り替えではなく、同一 launcher をどの密度で表示するかを指定する視覚入力です。`icon-only` であっても button 性、アクセシブル名、起動契約は変化しません。

### 入力値正規化契約

`placeholder` は次の規則で解釈します。

- 属性未指定、`undefined`、property 未設定時は既定値 `"検索..."` を使用します。
- 空文字 `""` は有効値として受理します。
- 改行を含む文字列は 1 行表示へ正規化し、表示上は省略記号に吸収します。
- 長文は省略表示し、複数行化しません。
- `placeholder` は視覚表示専用であり、アクセシブル名、検索語初期値、検索スコープとして解釈しません。

### 公開イベント契約

`ui-search-trigger` は、明示的なアクティベーション時に `open-search-dialog` を発火します。

| 名前                 | 発火条件                                 | bubbles | composed | cancelable | detail |
| -------------------- | ---------------------------------------- | ------- | -------- | ---------- | ------ |
| `open-search-dialog` | click または button 既定のキーボード起動 | `true`  | `true`   | `false`    | なし   |

このイベントは、検索ダイアログを **自動で開く command** ではなく、**上位レイヤに起動要求を通知する request event** です。利用側はこのイベントを監視し、`ui-search-dialog` の表示制御へ橋渡しします。

加えて、次を固定します。

- イベントは内部 button ではなく、**ホスト要素 `ui-search-trigger` の公開契約**として扱います。
- 1 回のアクティベーションに対して、`open-search-dialog` は 1 回だけ発火します。
- pointer 操作、Enter / Space による button 起動、公開 `click()` は同一の起動契約へ合流します。
- `detail` は持たず、追加のペイロードに依存しません。

### 公開メソッド

`ui-search-trigger` は、ホスト要素に対する基本操作を内部 button へ委譲するため、次の公開メソッドを持ちます。

| 名前              | 種別   | 契約                                   |
| ----------------- | ------ | -------------------------------------- |
| `focus(options?)` | method | 内部 button にフォーカスを委譲します。 |
| `blur()`          | method | 内部 button からフォーカスを外します。 |
| `click()`         | method | 内部 button の click を起動します。    |

これらは Shadow DOM 内部実装を利用側に露出させないための公開面です。利用者は Shadow DOM を直接探索せず、これらの公開メソッドを使用します。

加えて、長期契約として次を固定します。

- `click()` はユーザー click と同じ起動契約へ合流します。
- `focus()` と `blur()` は内部 DOM 詳細を隠蔽するための便宜 API であり、検索状態の変更を伴いません。
- これらの API は launcher の意味論を補助するものであり、内部構造への依存点を増やすためのものではありません。

### 属性反映契約

`placeholder`、`disabled`、`density` は property と attribute の両面から操作できます。`disabled` は boolean attribute として扱います。

| property      | attribute     | reflect | 備考                                                   |
| ------------- | ------------- | ------- | ------------------------------------------------------ |
| `placeholder` | `placeholder` | あり    | 既定値は `"検索..."` です。                            |
| `disabled`    | `disabled`    | あり    | boolean attribute として扱います。                     |
| `density`     | `density`     | あり    | 既定値は `auto` です。無効値は `auto` として扱います。 |

`aria-label`、`aria-controls`、`aria-expanded` は、ホスト上の補助入力として受理し、内部 button のアクセシビリティ属性へ委譲します。これらは trigger 自身を stateful widget に変えるためのものではありません。

したがって、次を固定します。

- `aria-label` は内部 button のアクセシブル名を上書きできます。
- `aria-controls` は関連ダイアログの id を示すために使用できます。
- `aria-expanded` は上位レイヤが保持する開状態を反映するために使用できます。
- `aria-expanded` を受け取っても、trigger 自身は open / closed の真実源泉になりません。

### CSS Parts 契約

現行実装が公開している `part` は次のとおりです。

| part 名       | 役割                     |
| ------------- | ------------------------ |
| `button`      | 内部 `ui-button` surface |
| `icon`        | 検索アイコンのラッパー   |
| `placeholder` | プレースホルダー表示領域 |

利用者は `::part(...)` に対して装飾調整を行えます。ただし、意味を変更するための display 構造破壊、button 性の喪失、アクセシビリティ属性の破壊は行いません。

### 公開 Style Input 契約

`ui-search-trigger` は、親文脈から次の custom property を受け付けます。

| 名前                                     | 役割 |
| ---------------------------------------- | ---- |
| `--search-trigger-gap`                   | default 時の icon と placeholder の距離 |
| `--search-trigger-gap-compact`           | compact 相当時の icon と placeholder の距離 |
| `--search-trigger-padding-inline`        | default 時の左右余白 |
| `--search-trigger-padding-inline-compact` | compact 相当時の左右余白 |

これらは `ui-search-trigger` 自身の公開 style input です。`layout-header` のような親 adapter はこの入力へ値を注入できますが、`ui-search-trigger` 自身は親専用 token を直接読みません。

したがって、header 文脈で rhythm をそろえる場合も、surface の意味論や launcher としての責務は `ui-search-trigger` 側に残り、composition の調整だけを外部から行います。

### 非対応公開面契約

次のものは、現行の公開契約に含めません。

- `slot` と slot-based composition
- 子ノードの描画や透過表示
- `name` `value` `form` などのフォーム参加属性
- form-associated custom element としての振る舞い
- 内部 `ui-button` の Shadow DOM 詳細への依存
- 内部 class 名や未公開 `part` への依存

したがって、利用者は `ui-search-trigger` を **単一責務の検索起動ボタン** として扱い、入力コントロールやフォームコントロールとしては扱いません。

### 責務範囲

責務範囲には、内部 `ui-button` の描画と制御、状態に応じた属性反映、検索 trigger としての視覚表現、アクティベーション時の `open-search-dialog` 発火、レスポンシブ時の icon-only 表示、および必要なアクセシビリティ属性の付与を含みます。

一方で、検索ダイアログの開閉状態を保持すること、グローバルショートカットを監視すること、入力値を管理すること、検索結果を表示することは責務に含めません。フォーム送信、値の保持、バリデーション参加、候補提示も責務に含めません。

要するに、本コンポーネントは **検索機能そのもの** ではなく、**検索機能への入口** だけを責務とします。

---

## 状態モデル

`ui-search-trigger` は open / closed の内部状態を持ちません。
本節では、**対話状態**、**環境条件**、**境界入力** を分けて定義します。

### 対話状態

#### 既定状態

`disabled=false` の状態です。検索アイコンと視覚ラベルを持つ検索起動導線として振る舞います。

#### 無効状態

`disabled=true` の場合、内部 button は起動対象になりません。視覚上は操作不能であることが判別できなければなりません。

#### フォーカス可視状態

`focus-visible` 時は、起動可能状態であることが判別できる視覚強調を与えます。これは入力準備状態ではなく、button が現在の対話対象であることを示す状態です。フォーカス取得だけでは `open-search-dialog` を発火しません。

#### 押下状態

`active` 時は、押下中であることが分かる一時的な視覚変化を与えます。押下状態は保持状態ではありません。

### 環境条件

#### 密度条件

`ui-search-trigger` は、意味論を変えずに視覚密度だけを切り替えられます。密度は `density` 入力または利用可能幅により決まり、次の 4 形態を取ります。

- `auto`: 配置幅と環境条件に応じて `default` / `compact` / `icon-only` を自動選択します。
- `default`: 検索アイコンと視覚ラベルを通常密度で表示します。
- `compact`: 検索アイコンと視覚ラベルを維持しつつ、余白と占有幅を抑えます。
- `icon-only`: 視覚ラベルを省略し、検索アイコンのみで表示します。

いずれの密度でも、button としての意味、アクセシブル名、起動領域、起動契約は維持しなければなりません。`icon-only` は意味論ではなく視覚密度の差です。

#### 狭幅縮退

狭い画面または狭い配置幅では、`density="auto"` の場合に `icon-only` へ縮退できます。これは対話状態ではなく、利用可能幅に応じた表示条件です。

現行実装では `max-width: 639px` を契機としますが、公開契約の中心は特定の閾値そのものではなく、狭幅時に icon-only へ縮退できることにあります。内部実装は `ui-button[data-density]` と `::part(button)` を介してこれを成立させます。

### 境界入力

#### 空文字 `placeholder`

`placeholder=""` は有効値として受理します。この場合でも button としての意味、アクセシブル名、起動契約は維持されなければなりません。ただし、視覚説明力は低下するため、通常運用で積極的には推奨しません。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に単一のネイティブ `<button>` を持ち、その内部にアイコンとプレースホルダーを配置します。

```text
<ui-search-trigger>
  #shadow-root
    <button part="button" type="button">
      <span class="icon" part="icon" aria-hidden="true">
        <ui-icon name="search" aria-hidden="true"></ui-icon>
      </span>
      <span class="placeholder" part="placeholder" aria-hidden="true">
        検索...
      </span>
    </button>
</ui-search-trigger>
```

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 対話主体はネイティブ `<button>` です。
- `type="button"` を明示し、フォーム送信の副作用を持ちません。
- button は、検索ダイアログ起動を説明するアクセシブル名を持たなければなりません。
- アクセシブル名の既定値として `"検索ダイアログを開く"` を使用してよいですが、公開契約の本質は固定日本語文字列そのものではなく、適切なアクセシブル名を持つことにあります。
- 利用者は `aria-label` により、内部 button のアクセシブル名を外部から明示上書きできます。
- button は `aria-haspopup="dialog"` を持ちます。
- `aria-controls` と `aria-expanded` は、上位レイヤが関連ダイアログとの関係および開状態を外部から反映する場合にのみ使用します。
- `aria-keyshortcuts` は、同一文脈で実際に有効なショートカットが存在する場合に限って付与できます。ショートカットが実装または有効化されていない環境では、公開契約として要求しません。
- アイコンおよび視覚ラベルは `aria-hidden="true"` とし、アクセシブル名の計算に参加させません。
- `placeholder` は視覚表示専用であり、アクセシブル名の代替手段ではありません。

本コンポーネントで重要なのは、入力欄に似た見た目であっても、実体として button を維持することです。

### フォーム文脈契約

`ui-search-trigger` はフォーム文脈に配置できますが、フォームコントロールにはなりません。次を固定します。

- `type="button"` により、form submit の起点になりません。
- 値を持つコントロールとして扱いません。
- 制約検証、送信データ構築、既定値復元の対象になりません。
- `name` `value` `form` などのフォーム参加 API は公開しません。

この契約により、見た目が入力欄に近くても、フォーム入力部品として誤用しません。

---

## Visual Contract

`ui-search-trigger` の視覚契約は、**検索導線として静かに認識できること** と、**実際には入力不可の launcher であること** を同時に伝えることにあります。検索入力欄に似た見た目は採りますが、それは launcher の性質を補助する visual idiom であり、契約の中心ではありません。

### Input-like visual idiom

本コンポーネントは検索入力欄に近い外形を取りますが、意味論は button です。したがって、視覚契約では「静かな導線」と「クリック可能性」の両立を優先します。入力欄らしさは補助的表現であり、clickability を曖昧にしてはなりません。

通常時のカーソルは、clickability を損なわない値を用います。`cursor: default` を公開契約として固定しません。

### レイアウト

- ルートおよび内部 button は `inline-flex` を用います。
- block-size は control 系トークンに従います。
- inline-size は内容とレイアウト文脈に応じて決まり、固定 `120px` は公開契約に含めません。
- 既定表示は「検索アイコン + 視覚ラベル」です。
- 狭幅環境では icon-only 表示へ縮退できます。
- icon-only 時も起動領域は維持しなければなりません。
- icon-only 時の通常状態は、面背景を常設せず、他のヘッダー操作と同程度の静かな視覚トーンへ落としてよいものとします。

### 占有レイアウト契約

`ui-search-trigger` は、親レイアウトの残余幅を埋める検索欄ではなく、独立した inline-level trigger として扱います。親コンテナ幅への自動伸長は前提にしません。

一方で、最終的な inline-size の調整は CSS Custom Properties と外部レイアウトで許容します。したがって、本コンポーネントは「常に固定幅であること」を契約せず、「独立した trigger として読めること」を契約します。

### 視覚仕様

- 通常時は控えめな面背景を持ちます。ただし `icon-only` 時は、静かなヘッダー操作として読めることを優先し、通常背景を透明にしてよいものとします。
- hover 時はインタラクティブであることを示します。ラベル付き状態では境界線を明示し、`icon-only` 時は過剰な面強調を避けつつ軽い hover 背景で反応を返します。
- `focus-visible` 時はアウトラインで起動可能状態を明示します。必要に応じて軽い背景変化を併用してよいものとします。
- `active` 時は軽い縮小で押下感を与えます。
- `disabled` 時は不透明度を下げ、操作不能を示します。
- 検索アイコンの視覚寸法は `--icon-base` に従います。アイコン枠の `inline-size` / `block-size` と、`ui-icon` の描画基準 `font-size` は同一トークンへ揃え、枠寸法と実グリフ寸法を一致させます。
- `ui-icon` 自体は汎用の `1em` ベース描画を維持します。`ui-search-trigger` は利用側責務として必要寸法をローカルに明示し、button 文字サイズへの偶発的な従属を持ち込みません。

### プレースホルダー表示

プレースホルダーは `white-space: nowrap`、`overflow: hidden`、`text-overflow: ellipsis` を用い、長文時にも 1 行内で省略表示します。プレースホルダーは **入力値** でも **検索スコープ表示** でもなく、launcher の視覚説明補助です。

### Forced Colors での扱い

`forced-colors: active` では、システムカラーを使用し、境界線と背景を強制的に可視化します。これは本コンポーネントが「Input に見える Button」であるため、背景や境界が失われると意味判別が難しくなるためです。

### 外部スタイル介入の上限

外部スタイルは、見た目の調整には使用できますが、意味論や動作モデルの変更には使用しません。特に次は公開契約に含めません。

- `::part(button)` に対する `display` の意味変更
- `pointer-events` の無効化やイベントモデルの改変
- 疑似要素による代替ラベルや代替アイコンの常設
- `position` 調整に依存した内部レイアウト再構成
- 内部構造を前提にした descendant selector

見た目を整えるための拡張は許容しますが、button としての意味、可視ラベルの責務、起動契約は外部 CSS で再定義しません。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途                  | トークン                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------- |
| 通常背景              | `--bg-fill-muted`                                                                         |
| フォーカス / 押下背景 | `--bg-default`                                                                            |
| 境界線幅              | `--border-width`                                                                          |
| 境界線色              | `--border-default`                                                                        |
| 高さ                  | `--control-height-md`                                                                     |
| 角丸                  | `--radius-md`                                                                             |
| 余白                  | `--space-2` / `--space-3`                                                                 |
| アイコンサイズ        | `--icon-base`                                                                             |
| アイコン色            | `--fg-subtle`                                                                             |
| プレースホルダー色    | `--fg-subtle`                                                                             |
| フォントサイズ        | `--text-base`                                                                             |
| フォントウェイト      | `--font-normal`                                                                           |
| 押下スケール          | `--scale-pressed`                                                                         |
| 遷移時間              | `--duration-fast`                                                                         |
| イージング            | `--ease-out`                                                                              |
| フォーカスリング      | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| 無効時不透明度        | `--opacity-disabled`                                                                      |
| 最低タッチサイズ      | `--control-min-touch`                                                                     |

---

## 環境別の振る舞い

### モバイル

狭い画面では視覚ラベルを省略し、検索アイコンのみの表示へ縮退できます。縮退の目的は横幅節約であり、起動領域の縮小ではありません。

本コンポーネントは具体的な px 値を独自に固定しませんが、起動領域は control 系共通契約で定義される最低サイズを下回ってはなりません。`search-trigger` はその共通契約に従属し、独自の数値規範を重複定義しません。

### テーマ差し替え

暗色系テーマそのものに対する専用メディアクエリは持ちませんが、背景色、境界線色、文字色は CSS Custom Properties により差し替え可能です。したがって、ダークモード相当の配色はトークン差し替えで成立させます。

### Forced Colors

`forced-colors: active` では、背景、境界線、フォーカスアウトライン、内部アイコン色、プレースホルダー色をシステムカラーへフォールバックします。box-shadow に依存せず、実線の境界とアウトラインで判別可能性を維持します。

### Reduced Motion

`prefers-reduced-motion: reduce` では、transform と animation に依存する押下演出を無効化または実質 0 にします。状態差は、色、境界線、outline などの**静的な視覚差**で表現します。

したがって、Reduced Motion 環境において次を固定します。

- 押下時の縮小表現に依存しません。
- 画面遷移的な motion を trigger 単体で持ち込みません。
- 判別可能性は motion ではなく、静的な状態表現で維持します。

---

## 関連契約

### 検索ダイアログ統合契約

`ui-search-trigger` は検索ダイアログそのものではありません。起動時に `open-search-dialog` を発火するだけであり、実際のダイアログ表示、フォーカストラップ、閉じる操作、検索語入力は `ui-search-dialog` または上位レイヤが担います。

`open-search-dialog` は request event であり、trigger 自身は open / closed の真実源泉になりません。したがって、開状態に応じた再入抑止、既存ダイアログへのフォーカス復帰、重複表示抑止は上位レイヤで扱います。

加えて、ダイアログとの関係を意味論として補強するため、上位レイヤは次を外部制御できます。

- `aria-controls` により、関連する検索ダイアログの id を trigger に与えられます。
- `aria-expanded` により、上位レイヤが保持する開状態を trigger に反映できます。

ただし、これらは関係属性の外部制御であり、trigger 自身が状態保持主体へ拡張されることを意味しません。`ui-search-trigger` は最後まで stateless launcher のままです。

`open-search-dialog` は launcher から上位統合層へ送る外部起動要求です。
`ui-search-dialog-open-requested` は dialog 自身から上位状態へ送る component-local request event です。
両者は同義ではなく、統合層は両者を区別して扱わなければなりません。

### グローバルショートカット統合契約

ショートカットの登録、OS 別表示、文脈別有効化は上位レイヤの責務です。`ui-search-trigger` 自身はショートカットの真実源泉になりません。

上位レイヤが実際に `Ctrl+K` / `Cmd+K` などを有効化している場合は、その文脈と整合する範囲で visual hint や `aria-keyshortcuts` を付与できます。逆に、実際のショートカットが存在しない環境では、通知だけを固定契約に含めません。

ショートカットハンドラから起動する場合、利用者は `ui-search-trigger.click()` を使用して既存の起動契約へ合流します。

グローバルショートカットから起動する場合も、上位統合層は `open-search-dialog` と同等の起動要求として扱い、最終的な `opened` 更新と focus return の責務を一元管理しなければなりません。
shortcut 起動時に物理的な trigger 要素が存在しない場合、起動元参照は `null` でよいものとします。

### フォーカス移譲契約

`ui-search-trigger` 自身は、起動後および close 後の focus 管理を自律的に決定しません。次を固定します。

- 起動後の初期 focus は、統合先の `ui-search-dialog` または上位レイヤの契約に従います。
- close 後の focus 復帰先の決定と実行は、`ui-search-dialog` の close 契約に従います。
- 上位レイヤは、必要に応じて trigger 参照を `ui-search-dialog` へ引き渡せます。
- trigger 自身はフォーカストラップや focus 復元を実装しません。

したがって、本コンポーネントは **起動の起点** であり、focus 管理の真実源泉ではありません。

### スタイル拡張契約

外部スタイル拡張は、CSS Custom Properties と `::part(button)`、`::part(icon)`、`::part(placeholder)` に限定します。内部 class 名、Shadow DOM 内部構造、未公開 part には依存しません。

---

## 境界条件

### フォーカスのみでは起動しない

button がフォーカスを得ても、`open-search-dialog` は発火しません。起動には click、Enter、Space、または公開 `click()` の呼び出しが必要です。

### disabled 時は起動しない

`disabled=true` の場合、ユーザー操作でもプログラム的 `click()` でも `open-search-dialog` は発火しません。

### 1 アクティベーションにつき 1 回だけ発火する

単一の click、Enter、または Space に対して `open-search-dialog` は 1 回だけ発火します。1 回の操作から重複発火する実装には依存しません。

### 連続クリックでは連続発火する

連続クリック時、`open-search-dialog` はクリック回数に応じて複数回発火します。ダイアログの重複表示抑止は上位レイヤの責務です。

### 空プレースホルダーでもアクセシビリティは維持する

`placeholder=""` を指定しても button のアクセシブル名は固定 `aria-label` で維持されます。ただし、視覚説明力は低下します。

### 長文プレースホルダーは省略表示する

長い `placeholder` は 1 行で省略表示されます。複数行化や自動折り返しには依存しません。

### モバイルでは icon-only 表示へ縮退する

狭い画面ではプレースホルダーを非表示にします。モバイル時の説明力は視覚ラベルではなく、アイコンとアクセシブル名に依存します。

---

## Storybook 契約

Storybook は公開契約の検証手段です。個々の Story 名一覧そのものを公開契約には含めません。将来変更時も、少なくとも次の観点を検証できなければなりません。

| 観点                   | 固定する契約                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Semantic / ARIA        | ネイティブ button、`type="button"`、アクセシブル名、`aria-haspopup="dialog"` が維持されること |
| Input Reflection       | `placeholder` と `disabled` が property / attribute の両面から反映されること                  |
| Activation             | click、Enter、Space、公開 `click()` が同一の起動契約へ合流すること                            |
| Disabled / Form Safety | `disabled` 時に起動しないこと、form 内でも submit の起点にならないこと                        |
| Boundary               | 空文字 `placeholder` でも意味論が維持されること、長文が 1 行で省略表示されること              |
| Visual Density         | 通常表示と狭幅時の icon-only 表示で意味と起動領域が維持されること                             |
| Environment            | Forced Colors 等の強い環境条件で判別可能性が維持されること                                    |

---

## 実装反映状況

本節は、`search-trigger.ts` と `search-trigger.stories.ts` が本書の契約に対して現在どこまで反映されているかを整理するものです。

### 1. 反映済みの事項

次の事項は、現行実装と Storybook に反映済みです。

- ショートカットバッジ前提の説明を削除し、DOM を `icon + placeholder` の契約へ揃えています。
- 未使用だった `kbd` 依存を除去しています。
- `aria-keyshortcuts` を既定出力から外し、ショートカット有効化の責務を上位レイヤへ戻しています。
- `open-search-dialog` を request event として扱い、「即座にモーダルを開く」という過剰な説明を除去しています。
- `density="auto" | "default" | "compact" | "icon-only"` を公開入力として実装し、Storybook でも検証しています。
- `aria-label`、`aria-controls`、`aria-expanded` をホストから内部 `ui-button` 経由で内部 button へ委譲できるようにしています。

### 2. 引き続き固定しない事項

次のものは、引き続き公開契約として固定しません。

- ショートカット hint、`kbd` 表示、`aria-keyshortcuts` の既定出力
- モバイルでの特定ピクセル値によるタッチターゲット規範
- ダークモード専用メディアクエリ

ダークテーマ相当の見た目は、引き続きトークン差し替えで成立させます。

### 3. 実装上の留意点

アクセシブル名の既定値は現在 `"検索ダイアログを開く"` ですが、公開契約の中心は固定文言ではなく、検索ダイアログ起動を適切に説明するアクセシブル名を持つことです。`placeholder` の変更によってアクセシブル名は変化しません。

環境別の専用最適化は、狭幅時の icon-only 縮退、Forced Colors、Reduced Motion に限ります。これら以外の環境差分を公開契約へ追加する場合は、実装、Storybook、契約書を同時に更新します。
