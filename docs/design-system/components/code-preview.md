# Code Preview

## 1. 概要

本書は、`ui-code-preview` の公開契約、状態モデル、アクセシビリティ、および視覚契約を整理するものです。

`ui-code-preview` は、**レンダリング結果を先に見せ、その直後に実装コードを読ませる**ための複合コンポーネントです。単に preview と code を上下に並べるのではなく、**ひとつのまとまりとして読む**ための枠組み、見出し、プレビュー面、コード面、およびそれらの境界条件を公開契約として固定します。

また、本コンポーネントは `ui-code-block` / `ui-code-group` との合成を前提としており、子コンポーネント側の breakout や角丸を無効化し、親側の外枠へ統合します。したがって、契約は単体コンポーネントに閉じず、**preview 面と code 面をひとつの視覚単位として成立させること**までを含みます。

Rouault における code preview は、単なるデモ領域ではなく、**「See it, then understand it」****という読書順を支える要素です。したがって、本コンポーネントの契約は、インタラクティブな検証補助と、****「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 2. 適用範囲

本書は、`ui-code-preview` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 追加を検討する価値がある機能
- 現行実装で未対応または未整合の事項

一方で、本書は次の事項を扱いません。

- preview スロットに何を描画するかという個別 UI 設計
- code 面に表示するコード文字列の生成規則
- `ui-code-block` / `ui-code-group` 自体の copy、tab、syntax highlight 契約
- Storybook や Markdown ディレクティブからどのように入力を構成するかという上位レイヤの組み立て
- preview 内部で起動されるボタンやフォームの業務ロジック
- 永続化、URL 同期、ローカル設定保存

これらは上位レイヤまたは関連コンポーネントの責務です。

---

## 3. 公開契約

`ui-code-preview` は、`label`、`controls`、`previewPadding`、`previewAlign`、`previewTheme`、`previewSurface`、`previewViewport` を公開入力として扱います。スロットは `preview`、既定スロット、`toolbar` を持ちます。

本コンポーネントは、**preview 面と code 面をひとつの読書単位として束ねること**を責務とします。したがって、公開契約は「何を表示できるか」だけでなく、**どのような入力構造を正規構成とするか**まで含めて定義します。

### 3.1 公開設計方針

長期的な保守性を優先し、本契約では `ui-code-preview` を **厳格な二面構成コンポーネント** として扱います。すなわち、preview 面と code 面はどちらも意味上必須であり、片側だけを見せる用途には使いません。

また、`ui-code-preview` は code 面の子要素へ `embedded` を付与して視覚統合を行うため、code 面の入力構造も厳密に定義します。描画できることよりも、**読書単位として壊れないこと**を優先します。

### 3.2 入力契約

| 名前                | 種別                                        | 必須  | 内容                    | 契約                                               |
| ----------------- | ----------------------------------------- | --- | --------------------- | ------------------------------------------------ |
| `label`           | property / attribute                      | いいえ | ヘッダー左側ラベル             | trim 後に非空の場合、視覚ラベルおよび group 名の基準になります            |
| `controls`        | property / attribute                      | いいえ | built-in controls の指定 | 空白区切りで `theme` / `surface` / `viewport` を受け取ります  |
| `previewPadding`  | property / attribute (`preview-padding`)  | いいえ | preview 面の内部余白        | `normal` / `compact` / `none`。既定値は `normal` です   |
| `previewAlign`    | property / attribute (`preview-align`)    | いいえ | preview 面内の配置         | `center` / `start` / `stretch`。既定値は `center` です  |
| `previewTheme`    | property / attribute (`preview-theme`)    | いいえ | preview 面にだけ適用するテーマ   | `page` / `light` / `dark`。既定値は `page` です         |
| `previewSurface`  | property / attribute (`preview-surface`)  | いいえ | preview 面の背景コンテキスト    | `surface` / `canvas` / `muted`。既定値は `surface` です |
| `previewViewport` | property / attribute (`preview-viewport`) | いいえ | preview 面のフレーム幅       | `full` / `tablet` / `mobile`。既定値は `full` です      |

### 3.3 スロット契約

| 名前        | 種別         | 位置づけ    | 個数                            | 内容                                           |
| --------- | ---------- | ------- | ----------------------------- | -------------------------------------------- |
| `preview` | named slot | 必須の正規入力 | ちょうど 1 つの preview root を想定します | レンダリング結果を含む preview 用 root を受け取ります           |
| 既定スロット    | slot       | 必須の正規入力 | ちょうど 1 つの code root を想定します    | `ui-code-block` または `ui-code-group` を直接配置します |
| `toolbar` | named slot | 任意の補助入力 | 0 個以上                         | ヘッダー右側の補助操作を受け取ります                           |

### 3.4 正規構成

本契約における **正規構成** は、次の条件をすべて満たす入力です。

1. `preview` スロットに preview root が 1 つあること。
2. 既定スロットに code root が 1 つあること。
3. code root は `ui-code-block` または `ui-code-group` であること。
4. code root は `ui-code-preview` の直接子要素であること。
5. `toolbar` は補助操作のみを受け持ち、preview / code の主内容を置かないこと。

したがって、次の構成は正規構成に含みません。

- preview スロットが空である構成
- 既定スロットが空である構成
- 複数の code root を並べる構成
- wrapper 要素越しに `ui-code-block` / `ui-code-group` を置く構成
- 既定スロットに無関係な要素を混在させる構成

これらを実装が描画できる場合でも、公開契約上は **非正規構成** として扱います。

### 3.5 必須性と非正規構成の扱い

| 項目             | 契約                                                  |
| -------------- | --------------------------------------------------- |
| `preview` スロット | 意味上必須です。正規利用では空にしません                                |
| 既定スロット         | 意味上必須です。正規利用では空にしません                                |
| code root      | `ui-code-block` または `ui-code-group` のいずれか 1 つに限定します |
| wrapper 越し配置   | 非正規構成です。`embedded` 合成を保証しません                        |
| 複数 code root   | 非正規構成です。読書単位としての保証対象外です                             |

### 3.6 `controls` の公開文法

`controls` は空白区切り文字列です。受理する値は `theme`、`surface`、`viewport` の 3 種のみです。

- 不正トークンは無視します。
- 重複トークンは 1 回に正規化します。
- 出力順は入力順ではなく、常に `theme surface viewport` の順に正規化します。
- 空文字または空白のみの場合、built-in controls は表示しません。

したがって、`controls="viewport theme viewport unknown"` のような入力は、公開面では `theme viewport` と等価です。

### 3.7 built-in controls の意味

built-in controls は、preview 面の見え方を切り替えるための内蔵 UI です。意味は次のとおりです。

| control    | 対象属性               | 選択肢                            | 効果                          |
| ---------- | ------------------ | ------------------------------ | --------------------------- |
| `theme`    | `preview-theme`    | `page` / `light` / `dark`      | preview 面に適用する色トークン群を切り替えます |
| `surface`  | `preview-surface`  | `surface` / `canvas` / `muted` | preview 面の背景コンテキストを切り替えます   |
| `viewport` | `preview-viewport` | `full` / `tablet` / `mobile`   | preview-frame の最大幅を切り替えます   |

これらの controls は **preview 面だけ** に作用します。code 面の色トークン、コード表示スタイル、copy 機能、構造には影響しません。

### 3.8 状態モデルの原則

`ui-code-preview` は **attribute-driven な controlled component** として扱います。すなわち、真の状態は host の property / attribute にあり、built-in controls はその編集 UI にすぎません。

したがって、公開契約として固定するのは次の事項です。

- `preview-*` の現在値が preview 面の見え方を決定します。
- built-in controls は対応する `preview-*` 属性を書き換えます。
- `ui-code-preview` 自身は独自の public custom event を公開しません。
- 永続化、URL 同期、外部状態ストア連携は責務に含みません。

### 3.9 属性反映契約

公開入力のうち、`label`、`controls`、`previewPadding`、`previewAlign`、`previewTheme`、`previewSurface`、`previewViewport` は、property と attribute の両面から操作できます。

| property          | attribute          | reflect | 備考                       |
| ----------------- | ------------------ | ------- | ------------------------ |
| `label`           | `label`            | あり      | trim 後に空の場合、ラベルなしとして扱います |
| `controls`        | `controls`         | あり      | 正規化後の値が反映されます            |
| `previewPadding`  | `preview-padding`  | あり      | 不正値は `normal` に戻します      |
| `previewAlign`    | `preview-align`    | あり      | 不正値は `center` に戻します      |
| `previewTheme`    | `preview-theme`    | あり      | 不正値は `page` に戻します        |
| `previewSurface`  | `preview-surface`  | あり      | 不正値は `surface` に戻します     |
| `previewViewport` | `preview-viewport` | あり      | 不正値は `full` に戻します        |

### 3.10 列挙外値・無効値の扱い

`previewPadding`、`previewAlign`、`previewTheme`、`previewSurface`、`previewViewport` は列挙値のみを公開契約とします。列挙外値が与えられた場合、次の既定値へフォールバックします。

| 入力                     | フォールバック   |
| ---------------------- | --------- |
| 不正な `preview-padding`  | `normal`  |
| 不正な `preview-align`    | `center`  |
| 不正な `preview-theme`    | `page`    |
| 不正な `preview-surface`  | `surface` |
| 不正な `preview-viewport` | `full`    |

`controls` は列挙外トークンを保持しません。無効トークンは除外して再反映します。

### 3.11 ヘッダー表示契約

ヘッダーは常時表示ではありません。表示条件は次の論理和です。

1. `label` が trim 後に非空であること。
2. `controls` の正規化結果に有効トークンが 1 つ以上あること。
3. `toolbar` スロットに **有効な補助操作** が 1 つ以上あること。

本契約における「有効な補助操作」とは、少なくとも次を満たすものを指します。

- 補助操作として意味を持つ要素ノードであること。
- 視覚的に出現し、または支援技術向けに意味を持つこと。
- `hidden`、空白テキストのみ、または実質的に無意味なノードでないこと。

単に要素ノードであるだけでは、長期的な意味での「有効な補助操作」とはみなしません。

### 3.12 動的更新契約

`ui-code-preview` は、初期描画だけでなく、属性変更と slot 内容変更にも追従しなければなりません（MUST）。少なくとも次の変更に追従します。

| 変更対象                                                                                           | 追従内容                                      |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `label`                                                                                        | ヘッダー表示、視覚ラベル、group 名を再評価します               |
| `controls`                                                                                     | 正規化、built-in controls の表示有無、ヘッダー表示を再評価します |
| `preview-padding` / `preview-align` / `preview-theme` / `preview-surface` / `preview-viewport` | preview 面の見え方に再反映します                      |
| `toolbar` スロット内容                                                                               | 有効な補助操作の有無を再評価し、ヘッダー表示を更新します              |
| 既定スロット内容                                                                                       | `embedded` 合成の対象集合を再評価します                 |

### 3.13 責務範囲

責務範囲には、ヘッダー表示条件の解決、preview 面と code 面の視覚統合、preview 専用テーマトークンの供給、built-in controls による preview 属性更新、および `ui-code-block` / `ui-code-group` の埋め込み統合を含みます。

一方で、preview 内容の意味論、code 文字列の生成、copy ボタンの機能そのもの、Markdown ディレクティブの構文制約、永続設定保存は責務に含めません。

### 3.14 ローカライズ契約

現行実装において、`label` 未指定時の fallback 名や built-in controls の表示文言は実装内で解決されます。ただし、これらの **文言そのもの** は公開 API として固定しません。公開契約として固定するのは、次の事項です。

- group にアクセシブル名が必ず与えられること
- built-in controls が識別可能なラベルを持つこと
- icon-only 操作を無名のまま残さないこと

したがって、表示言語や文言の細部は将来のローカライズ方針に応じて変更し得ます。利用者は、内部文言の完全一致に依存してはなりません（MUST NOT）。

---

## 4. 状態モデル

`ui-code-preview` の主要状態は、**ヘッダーが出るか、preview 面がどの文脈で見えるか、code 面をどのように統合するか**によって読み分けます。

### 4.1 基本状態

最小状態は、`label=""`、`controls=""`、`preview-padding="normal"`、`preview-align="center"`、`preview-theme="page"`、`preview-surface="surface"`、`preview-viewport="full"` の状態です。

この状態ではヘッダーは表示されず、preview 面と code 面だけが 1 枚の枠内に描画されます。

### 4.2 ヘッダー状態

ヘッダー状態は、表示有無とラベル有無で読み分けます。

| 状態          | 条件                                 | 振る舞い                             |
| ----------- | ---------------------------------- | -------------------------------- |
| 非表示         | `label` 空、`controls` 空、`toolbar` 空 | 表示に参加しません                        |
| ラベルのみ       | `label` 非空                         | 左側にラベルを表示します                     |
| toolbar のみ  | `toolbar` 有効                       | ラベルなしでもヘッダーを表示します                |
| controls のみ | `controls` 有効                      | ラベルなしでも built-in controls を表示します |
| 複合          | 上記の複数が同時成立                         | ラベル左、controls 右、toolbar 最右で共存します |

### 4.3 `previewPadding` 状態

`previewPadding` は preview 面の内部余白を制御します。

| 値         | 意味           | 振る舞い                   |
| --------- | ------------ | ---------------------- |
| `normal`  | 既定           | `--space-4` 相当の余白を与えます |
| `compact` | 密度高          | `--space-3` 相当の余白を与えます |
| `none`    | edge-to-edge | 余白を 0 にします             |

ヘッダー表示時は、header と preview-area の間で上下パディングが二重にならないよう、preview 面の上パディングを除去します。

### 4.4 `previewAlign` 状態

`previewAlign` は preview 面内での配置を制御します。

| 値         | 意味    | 振る舞い                                                                                         |
| --------- | ----- | -------------------------------------------------------------------------------------------- |
| `center`  | 中央配置  | `align-items: center; justify-content: center;`                                              |
| `start`   | 左上配置  | `align-items: flex-start; justify-content: flex-start;`                                      |
| `stretch` | 幅いっぱい | `align-items: stretch; justify-content: flex-start;` および preview スロット要素に `inline-size: 100%` |

### 4.5 `previewTheme` 状態

`previewTheme` は preview 面専用の色トークン群を切り替えます。

| 値       | 意味    | 振る舞い                       |
| ------- | ----- | -------------------------- |
| `page`  | ページ継承 | 周囲のテーマトークンを継承します           |
| `light` | 強制ライト | preview 面でライト色系トークンに切り替えます |
| `dark`  | 強制ダーク | preview 面でダーク色系トークンに切り替えます |

`page` は環境継承状態であり、preview 面だけを無理に別テーマへ固定しません。`light` / `dark` は局所的な showcase 状態として扱います。

### 4.6 `previewSurface` 状態

`previewSurface` は preview 面の背景コンテキストを制御します。

| 値         | 意味   | 振る舞い                               |
| --------- | ---- | ---------------------------------- |
| `surface` | 通常面  | preview 面を surface 背景として扱います       |
| `canvas`  | ページ面 | preview 面を page / canvas 背景として扱います |
| `muted`   | 控えめ面 | preview 面を muted 背景として扱います         |

この切り替えは preview スロット内部へ供給する `--bg-default` 等にも反映されます。

### 4.7 `previewViewport` 状態

`previewViewport` は `.preview-frame` の最大幅を制御します。

| 値        | 意味     | 振る舞い    |
| -------- | ------ | ------- |
| `full`   | 親幅     | `100%`  |
| `tablet` | タブレット幅 | `768px` |
| `mobile` | モバイル幅  | `375px` |

この状態は preview スロット表示のフレーム幅だけを変えます。code 面の幅や host 幅そのものは変更しません。

### 4.8 code 面の埋め込み状態

既定スロットに直接割り当てられた `ui-code-block` / `ui-code-group` には、初回描画時および slotchange 時に `embedded` 属性を付与します。これにより、子側は親コンテナへ視覚的に埋め込まれた状態として描画されます。

この埋め込み化は、**親子の視覚統合を成立させるための合成状態**であり、`ui-code-preview` の重要な責務です。

---

## 5. DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に `.root` を持ち、その中に `.header`、`.preview-area`、`.code-area` を配置します。

```text
<ui-code-preview>
  #shadow-root
    <div class="root" role="group" aria-labelledby="..." aria-label="...">
      <div class="header">
        <span class="header-label" id="...">...</span>
        <div class="header-tools">
          [built-in controls]
          <div class="header-toolbar">
            <slot name="toolbar"></slot>
          </div>
        </div>
      </div>

      <div class="preview-area">
        <div class="preview-frame">
          <slot name="preview"></slot>
        </div>
      </div>

      <div class="code-area">
        <slot></slot>
      </div>
    </div>
</ui-code-preview>
```

### 5.1 Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- ルートは `role="group"` を持ちます。
- 視覚ラベルが存在する場合、group 名は ``** を優先**して解決します。
- 視覚ラベルが存在しない場合のみ、locale-aware な fallback 名を `aria-label` で与えます。
- `toolbar` スロット内の操作要素は、最低操作サイズを持つようにスタイル補助されます。
- built-in controls はキーボード操作可能な UI として成立しなければなりません（MUST）。
- preview スロット内容は light DOM に残るため、JavaScript 未実行時でも構造上は内容を保持します。

本コンポーネントで重要なのは、preview と code をひとつの group として読ませることです。したがって、視覚ラベルがある場合はそのラベルをそのままアクセシブル名の根拠に使い、ラベルがない場合も無名の group を残しません。

### 5.2 アクセシブル名の解決順序

長期的な整合性を優先し、アクセシブル名の解決順序は次のとおりとします。

1. 視覚ラベルが表示される場合は `aria-labelledby`
2. 視覚ラベルがない場合は locale-aware な fallback `aria-label`

この方針により、視覚ラベルと支援技術向けラベルの二重管理を避けます。

### 5.3 ツールバー操作サイズ契約

`toolbar` スロットに入る要素は、最低でも **coarse pointer で 44px 相当、fine pointer で 24px 相当** の操作サイズを満たすことを目標とします。長期契約としては、coarse pointer 環境で 44px 相当を満たす設計を正規とします。

現行実装やトークン供給の都合によりこの値を下回る場合は、実装側の未整合として扱います。

### 5.4 toolbar スロットのアクセシビリティ契約

`toolbar` スロットは、ヘッダー右側に置く **補助操作** のための拡張面です。公開契約上、次を満たします。

- `toolbar` に入る操作要素は、キーボード操作可能でなければなりません（MUST）。
- icon-only 操作を置く場合、アクセシブル名を与えなければなりません（MUST）。
- `toolbar` は preview 内容そのものを置き換える主表示面ではなく、補助操作面として使います（SHOULD）。
- `toolbar` 内に複数要素を置くことはできますが、built-in controls より前に出ることは保証しません。

現行実装のサイズ補助セレクタは `button[slot='toolbar']`、`a[slot='toolbar']`、`[role='button'][slot='toolbar']` を直接対象とします。したがって、すべての custom element に一律で最低サイズ補助が掛かるわけではありません。`ui-button` のような custom element を置く場合は、当該要素側のサイズ契約も併せて満たす必要があります。

---

## 6. Visual Contract

`ui-code-preview` の視覚契約は、preview 面と code 面を**同じ枠の中で異なる階層として見せること**にあります。

### 6.1 情報順位

- 外枠は 1 つの読書単位として見えます。
- header は preview 面と同じ surface 文脈に属します。
- preview 面は UI を観察するための面です。
- code 面はその下に続く実装読解面です。
- code 面は子 `ui-code-block` / `ui-code-group` の個別外枠ではなく、親外枠へ統合されます。

### 6.2 レイアウト

ルートは block 要素です。全体幅は `--ui-code-preview-breakout-width`、左右マージンは `--ui-code-preview-breakout-margin` に従います。既定値はいずれも breakout なしの `100%` / `0` です。

外枠は `border`、`border-radius`、`overflow: hidden` を持ち、preview 面と code 面をひとつのカードとして切り出します。preview 面の下には境界線を置き、preview と code の視覚的切れ目を作ります。

### 6.3 preview 面の視覚文脈

preview 面および header は `--_ui-code-preview-surface-bg` を背景として共有します。既定では preview surface 文脈に従い、拡張トークン `--ui-code-preview-preview-bg` により上書きできます。

また、preview スロットには次のトークン群を供給します。

- 色系: `--primary`、`--danger`、`--bg-default`、`--fg-default`、`--border-default` など
- 影系: `--elevation-sm`、`--elevation-md`、`--elevation-lg`
- RGB 系: `--bg-default-rgb`、`--bg-surface-2-rgb`

これにより、preview 内部のコンポーネントはページ全体テーマとは独立に、preview 専用の局所テーマで描画できます。

### 6.4 子 code コンポーネントの統合

本コンポーネントは、子 `ui-code-block` / `ui-code-group` の breakout と外枠を無効化し、親外枠へ統合します。主な統合内容は次のとおりです。

- `--ui-code-block-breakout-width: 100%`
- `--ui-code-block-breakout-margin: 0`
- `--ui-code-block-radius-top: 0`
- `--ui-code-group-width: 100%`
- `--ui-code-group-margin-inline: 0`
- `ui-code-block` / `ui-code-group` の上側角丸を親と連続させます。

これにより、preview と code が別カードに見える状態を防ぎます。

### 6.5 フレーム幅切り替え

`.preview-frame` は `previewViewport` に応じて `100%` / `768px` / `375px` へ切り替わります。切り替えは短い transition を持ち、極端な視覚ノイズを出さずに showcase できます。

### 6.6 preview 領域のサイズ・overflow 契約

preview 面は任意の HTML を受け取るため、サイズと overflow の責務境界を先に固定します。

- `previewViewport` は `.preview-frame` の最大幅だけを制御します。
- host 全体幅、code 面の幅、ページレイアウト全体の幅は変更しません。
- `previewPadding` は preview 面の内側余白だけを制御します。
- `previewAlign="stretch"` は preview スロット内容を **幅いっぱいに置けるよう補助** しますが、内部コンテンツが独自の固定幅や overflow を持つことまでは抑制しません。
- preview 内部コンテンツの横スクロール、縦方向のはみ出し、独自の overflow 制御は preview スロット内容側の責務です。

したがって、`ui-code-preview` は preview 面を **収める枠** は提供しますが、preview 内容の内部レイアウトを強制的に正規化する責務は持ちません。

### 6.7 拡張トークン

`ui-code-preview` は主として次の CSS Custom Properties を公開面として扱います。

| 用途            | トークン                                   |
| ------------- | -------------------------------------- |
| 全体幅           | `--ui-code-preview-breakout-width`     |
| 左右マージン        | `--ui-code-preview-breakout-margin`    |
| 外枠角丸          | `--ui-code-preview-radius`             |
| preview 背景上書き | `--ui-code-preview-preview-bg`         |
| preview 最小高さ  | `--ui-code-preview-preview-min-height` |

これらは外部からのレイアウト統合や showcase 用調整のための拡張面です。内部 class 名や内部 data 属性は公開スタイル契約に含みません。

### 6.8 トークン露出範囲契約

preview 面には、preview 内容が局所テーマの中で描画できるよう複数の色・影・RGB トークンを供給します。ただし、公開契約として保証するのは **供給の存在とカテゴリ** であり、内部計算に使う一時トークン名や導出途中の変数名までは保証しません。

整理は次のとおりです。

| 区分                            | 扱い                     |
| ----------------------------- | ---------------------- |
| `--ui-code-preview-*`         | 公開拡張面として扱います           |
| preview スロットへ供給する意味カテゴリのトークン  | preview 専用テーマ供給として扱います |
| `--_...` から始まる内部導出トークン        | 内部実装詳細であり公開契約に含めません    |
| Shadow DOM 内部 class / data 属性 | 公開スタイル契約に含めません         |

とくに `--ui-code-preview-preview-bg` は、header と preview-area が共有する preview surface 背景の上書きとして扱います。ただし、現行実装の適用範囲は常に一様ではありません。`preview-surface="surface"` では `--ui-code-preview-preview-bg` による上書きが有効ですが、`preview-surface="canvas"` および `preview-surface="muted"` では、それぞれの面コンテキストが優先されます。したがって、このトークンは **任意の surface mode を横断して常に勝つ上書きトークン** ではなく、主として surface mode に対する拡張面として扱います。

---

## 7. 環境別の振る舞い

### 7.1 Forced Colors

`forced-colors: active` 環境では、root border と preview 境界線に `CanvasText` を用い、背景は `Canvas`、文字色は `CanvasText` に寄せます。preview と code の境界は通常時より太い線で描き、構造差を保持します。

### 7.2 Print

`@media print` では、全体幅を `100%`、左右マージンを `0` に固定し、背景は透明化、境界線は黒に寄せます。`header-tools` と `header-toolbar` は非表示にし、インタラクティブな切り替え UI は印刷面に出しません。

preview 面自体と code 面自体は印刷対象に残します。したがって、本コンポーネントは **印刷時に完全消去するのではなく、静的資料として残す** 方向を取ります。

印刷時の情報保持順位は次のとおりです。

1. label は残します。
2. preview 面は残します。
3. code 面は残します。
4. built-in controls は残しません。
5. `toolbar` の補助操作は残しません。

### 7.3 Reduced Motion

`ui-code-preview` の視覚変化は、主として preview-frame 幅切り替えなどの補助的 transition に限ります。これらは情報伝達の必須要素ではありません。

したがって、将来的に `prefers-reduced-motion: reduce` を適用する場合は、**transition を縮退または無効化しても意味情報が失われない構造**を維持します。現行契約では reduced motion 専用スタイルの存在自体は必須化しませんが、導入時は preview 切り替えを静的に成立させる方針と整合させます。

### 7.4 No-JS 構造保持

本コンポーネントは slot ベースの構造を採るため、preview 内容と code 内容は light DOM に残ります。JavaScript 未実行時でも構造上の内容は保持され、少なくとも情報そのものが失われる契約ではありません。

---

## 8. 関連契約

### 8.1 `ui-code-block` / `ui-code-group` 合成契約

`ui-code-preview` は、既定スロットへ直接割り当てられた `ui-code-block` / `ui-code-group` に対し `embedded` 属性を付与します。これは親外枠との一体表示を成立させるための合成契約です。

したがって、`ui-code-block` / `ui-code-group` 側は `embedded` 属性を受け取ったとき、独立カードとしての breakout や上端角丸に依存しません。

### 8.2 `embedded` の所有権契約

`embedded` は、利用者が任意に意味付けする公開状態ではなく、**親 **``** が所有し管理する合成属性**です。

整理は次のとおりです。

- `embedded` の付与・除去の責務は `ui-code-preview` にあります。
- `embedded` の付与対象は、既定スロットへ **直接割り当てられた唯一の code root** に限ります。
- wrapper 越し要素、複数 code root、無関係要素には付与しません。
- 利用者は `embedded` の手動付与・手動除去に依存してはなりません（MUST NOT）。
- `embedded` の主目的は、親外枠への視覚統合であり、code 内容の意味や機能切り替えではありません。

### 8.3 `embedded` のライフサイクル契約

`embedded` を付与する主体が `ui-code-preview` である以上、そのライフサイクルも `ui-code-preview` が整合的に管理しなければなりません（MUST）。

したがって、次を契約として固定します。

- 正規対象が code root として接続されたとき、`embedded` を付与します。
- 対象が code root でなくなったとき、または直接子要素条件を失ったとき、`embedded` を除去します。
- slot 構造の再評価により、`embedded` の付与対象は常に最新状態へ同期します。

この契約は、「親が付けた属性は親が片付ける」という所有権原則に基づきます。

### 8.4 built-in controls と外部 toolbar の共存契約

built-in controls と `toolbar` スロット内容は同時に表示できます。この場合、順序は次のとおりです。

1. built-in controls
2. `toolbar` スロット

利用者は、外部 toolbar が built-in controls より前へ出ることを前提にしてはなりません（MUST NOT）。

### 8.5 preview 専用テーマ契約

`preview-theme`、`preview-surface`、`preview-viewport` の変更は preview 側の見え方にのみ作用し、code 面には影響しません。この分離は重要な契約です。

したがって、code 面を含めた全体テーマ切り替えが必要な場合は、`ui-code-preview` 単体ではなく上位レイヤで全体コンテキストを切り替えます。

### 8.6 `previewTheme="page"` の契約

`previewTheme="page"` は「何もしない」という意味ではなく、**ページ文脈の semantic theme token を preview 面へ継承するモード**を意味します。

一方、`light` / `dark` は preview 面に対する局所 override mode です。したがって、`page` と `light` / `dark` は単なる見た目差ではなく、**継承モードか局所上書きモードか**という意味差を持ちます。

### 8.7 スタイル拡張契約

外部スタイル拡張は、主として CSS Custom Properties を通じて行います。内部 Shadow DOM 構造の class 名や内部 data 属性への依存は公開契約に含みません。

とくに `data-show-header`、`data-has-label` は内部導出状態であり、外部利用の公開状態名として扱いません。将来変更時に互換性を保証しません。

### 8.8 公開状態と内部状態の境界

`ui-code-preview` には、公開状態として扱うものと、内部導出状態としてのみ扱うものがあります。

| 種別       | 項目                                               | 扱い          |
| -------- | ------------------------------------------------ | ----------- |
| 公開入力状態   | `label`、`controls`、`preview-*`                   | 公開 API です   |
| 公開合成結果   | ヘッダー表示、preview 面の見え方、`embedded` 付与結果             | 公開挙動として扱います |
| 内部導出属性   | `data-show-header`、`data-has-label` など           | 内部実装詳細です    |
| 内部 UI 構造 | built-in controls を構成する Shadow DOM / 内部 selector | 公開契約に含みません  |

したがって、利用者や上位レイヤは **公開入力と公開挙動** に依存し、内部導出属性や内部 DOM 形状には依存しません。

---

## 9. 境界条件

### 9.1 ヘッダー完全非表示

`label` が空、`controls` が空、`toolbar` に有効な補助操作がない場合、ヘッダーは表示しません。`.header` 要素自体が DOM に存在するかどうかは公開契約の本質ではなく、**表示結果**のみを保証します。

### 9.2 ラベルのみ

`label` だけを設定した場合、ヘッダーは表示され、左側にラベルだけが出ます。group 名は視覚ラベルへ結び付きます。

### 9.3 toolbar のみ

`toolbar` だけを設定した場合、ラベルなしでもヘッダーは表示されます。ただし、`toolbar` に有効な補助操作があることが前提です。

### 9.4 controls のみ

`controls` に有効トークンが 1 つ以上ある場合、ラベルなしでもヘッダーは表示されます。

### 9.5 `controls` の不正入力

不正トークンは無視します。結果が空になれば built-in controls は表示しません。重複は 1 回に正規化します。

### 9.6 `toolbar` の空白ノード

`toolbar` に空白だけのテキストノードしかない場合、ヘッダー表示条件には数えません。

### 9.7 `toolbar` の無効要素

`toolbar` に単なる飾り要素しかなく、補助操作として意味を持たない場合、それは有効な補助操作として数えません。将来的には `hidden`、非表示、無意味ノードを除外して解釈します。

### 9.8 invalid preview 値

`preview-padding`、`preview-align`、`preview-theme`、`preview-surface`、`preview-viewport` に不正値を与えた場合、既定値へ戻します。無効値を保持し続ける契約ではありません。

### 9.9 既定スロットが空

既定スロットが空の状態は正規利用に含みません。描画できる場合でも、`ui-code-preview` の契約を満たしません。

### 9.10 preview スロットが空

preview スロットが空の状態は正規利用に含みません。コードだけを提示する用途は `ui-code-block` / `ui-code-group` 側で扱います。

### 9.11 既定スロットに wrapper を挟む場合

`ui-code-block` / `ui-code-group` を wrapper 要素の内側へ入れた場合、その要素は code root ではありません。したがって、親子統合と `embedded` 管理の保証対象外です。

### 9.12 複数 code root

複数の `ui-code-block` / `ui-code-group` を既定スロットへ並べる構成は正規利用に含みません。比較やタブ切り替えは `ui-code-group` に集約します。

### 9.13 built-in controls への不正値入力

built-in controls は列挙済みの値に対してのみ対応する `preview-*` 属性を書き換えます。列挙外値は公開契約に含みません。

- property / attribute からの不正値は既定値へフォールバックします。
- `controls` の不正トークンは除外して再正規化します。
- built-in controls 経由で想定外値が与えられた場合、それを公開状態として保持することは保証しません。
- 無効値入力に対して例外送出を公開契約としません。

### 9.14 toolbar の icon-only 要素

`toolbar` に icon-only 操作要素を置くこと自体は可能ですが、アクセシブル名がない状態は正規利用に含みません。

### 9.15 preview 内部の overflow

preview 内容が自身の内部で固定幅や独自 overflow を持つ場合、`ui-code-preview` はそれを自動補正しません。`stretch` を指定しても、preview 内容側の CSS が優先される場合があります。

### 9.16 built-in controls の UI 形状

built-in controls が dropdown、button、あるいはその内部 selector をどのように構成するかは公開契約に含みません。保証するのは、該当 control が存在し、対応する `preview-*` 状態を変更できることまでです。

---

## 10. Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

### 10.1 Storybook と公開契約の関係

Storybook は契約確認のための重要な検証面ですが、**Story 内で参照している selector や内部属性のすべてが、そのまま公開 API を意味するわけではありません**。

したがって、Storybook の読み方は次のとおりです。

- Story が検証している **挙動そのもの** は公開契約候補になり得ます。
- Story 内で使われる内部 selector、内部 data 属性、内部 DOM 形状は、そのまま公開契約に昇格しません。
- 公開契約へ昇格させる事項は、実装・契約書・Storybook の 3 点で明示的一致を取ります。

とくに `data-show-header`、`data-has-label`、内部 dropdown 構造のような項目は、Storybook が検証に利用していても、公開 API として固定したことにはなりません。

### 10.2 Story 一覧と固定契約

| Story                             | 固定する契約                                                       |
| --------------------------------- | ------------------------------------------------------------ |
| `BasicWithCodeBlock`              | preview と code が基本構成として共存し、無ラベル時はフォールバック名を使うこと               |
| `BasicWithCodeGroup`              | `ui-code-group` を code 面の正規構成として受け取れること                      |
| `HeaderWithLabelOnly`             | `label` のみでヘッダーが表示され、group 名に反映されること                         |
| `HeaderWithToolbarOnly`           | `toolbar` だけでヘッダーが表示されること                                    |
| `HeaderWithLabelAndToolbar`       | ラベルと toolbar が共存できること                                        |
| `HeaderWithBuiltInControlsOnly`   | built-in controls だけでヘッダーが表示されること                            |
| `BuiltInShowcaseControlsContract` | theme / surface / viewport が preview 側だけを変えること               |
| `BuiltInControlsWithToolbarSlot`  | built-in controls が toolbar より前に並ぶこと                         |
| `HeaderHiddenBoundary`            | label / controls / toolbar がすべて空ならヘッダーが出ないこと                 |
| `PreviewPaddingVariants`          | `normal` / `compact` / `none` が正しく余白を変えること                   |
| `InvalidPaddingFallback`          | 不正な `preview-padding` が `normal` に戻ること                       |
| `InvalidAlignFallback`            | 不正な `preview-align` が `center` に戻ること                         |
| `ToolbarTargetSizeContract`       | toolbar 要素の最小サイズ指定が CSS に存在すること                              |
| `PreviewAlignVariants`            | `center` / `start` / `stretch` が正しく配置を変えること                  |
| `ChildBreakoutNeutralization`     | 子 code コンポーネントの breakout 無効化変数が供給されること                       |
| `A11yGroupRoleContract`           | `role="group"` とアクセシブル名のフォールバックが成立すること                       |
| `LabelDynamicUpdate`              | `label` の動的変更にヘッダーとアクセシブル名が追従すること                            |
| `ForcedColorsContract`            | forced-colors 用 CSS が存在すること                                  |
| `PrintStyleContract`              | print 用 CSS が存在し、ヘッダーツールが非表示になること                            |
| `VisualHierarchyContract`         | header / preview と root の階層差が維持されること                         |
| `DarkThemePreviewBackground`      | `--ui-code-preview-preview-bg` で preview surface 背景を上書きできること |
| `ToolbarDynamicSlotDetection`     | toolbar の動的追加・削除にヘッダー表示が追従すること                               |
| `CopyFunctionalityPreservation`   | slotted code child 側の copy 機能が損なわれないこと                       |
| `NoJsContentIntegrity`            | preview / code 内容が light DOM に残ること                           |

---

## 11. 追加を検討する価値がある機能

本節は、`ui-code-preview` の責務を壊さずに追加検討できる機能を整理するものです。前提として、追加機能は **preview 面だけに閉じること**、**code 面の責務を侵食しないこと**、**「See it, then understand it」の読書順を壊さないこと**を満たさなければなりません（MUST）。

### 11.1 最優先で検討する価値がある機能

#### 1. preview リセット

preview 面がインタラクティブである以上、読者が操作後に初期状態へ戻せることには高い価値があります。

- 目的は preview 面の再読性と再試行容易性の確保です。
- reset は preview 面にだけ作用し、code 面の状態や構造は変更しません。
- built-in controls の状態を reset 対象に含めるかどうかは、preview の見え方と demo の内容を同時に初期化したいかで分けて定義します。
- UI としては header toolbar の補助操作、または opt-in の built-in action が候補です。

長期的には、preview reset は **読書補助機能** として扱い、アプリケーション状態管理機能へ拡張しません。

#### 2. preview の expanded / isolated 表示

現行の `preview-viewport` は幅切り替えに留まりますが、複雑な demo では一時的に preview 面を広く観察したい需要があります。

- expanded / isolated 表示は preview 面の観察性向上を目的とします。
- code 面は引き続き同一読書単位に属しますが、必要に応じて preview 面だけを一時的に強調表示できます。
- overlay、dialog、inline expand のいずれを採る場合でも、preview 面だけに閉じた機能として定義します。
- print、forced-colors、reduced-motion 環境でも意味が破綻しない構造を維持します。

長期的には、expanded は **preview の観察補助** であり、別画面遷移や独立アプリ表示とは区別します。

#### 3. preview failure fallback

interactive demo が失敗した場合でも、code 面まで読めなくなるべきではありません。したがって、preview failure fallback には高い価値があります。

- preview failure は preview 面の局所的失敗として扱います。
- failure 時も code 面は保持し、読書単位全体は破棄しません。
- fallback は preview 面の中で説明と復帰導線を提供します。
- reset と組み合わせる場合でも、失敗処理の責務は preview 面に留めます。

長期的には、error boundary 的な扱いを導入する場合でも、`ui-code-preview` は preview 実行基盤そのものにはなりません。

### 11.2 条件付きで検討価値がある機能

#### 1. preview caption / note

短い注記や前提条件を preview に添えたい場合、軽量な caption / note 領域は有効です。

- 目的は demo の前提条件や読み方を補足することです。
- header を多段化しすぎず、preview 面の補助文脈として扱います。
- 長文説明や仕様本文を入れる用途には拡張しません。

導入する場合は、小さな補助テキスト用 slot として整理する方が保守しやすいです。

#### 2. built-in controls の限定拡張

`theme / surface / viewport` と同じ原則で、preview 面だけに作用する限定的 control を追加する余地はあります。

候補は次のように整理できます。

- `direction`: LTR / RTL の切り替え
- `density`: 密度差の簡易確認
- `reduced-motion`: motion 縮退時の見え方確認

ただし、次の条件を満たさない限り追加しません。

- preview 面だけに作用すること
- code 面へ副作用を漏らさないこと
- header を常設ノイズにしないこと
- 既存の `theme / surface / viewport` より説明優先度が高いこと

#### 3. preview の明示的 min-height policy

`--ui-code-preview-preview-min-height` は既に拡張トークンとして存在するため、preview 高さの扱いを公開機能として整理する余地があります。

- 目的は複数 preview の視覚リズム統一、または空状態の安定化です。
- property を増やす前に、まずはトークンの意味と推奨利用を明確化します。
- 固定高さが preview 内容の切断や過剰空白を招かないようにします。

これは新規 property 追加より、既存拡張面の契約強化として検討する方が自然です。

### 11.3 追加しない方がよい機能

次の機能は、`ui-code-preview` の責務を汚しやすいため、原則として追加しません。

- 永続化、URL 同期、外部状態ストア連携
- code 面の copy / tab / comparison / syntax など、子 code コンポーネントの責務吸収
- header を過度に操作中心へ寄せる重量級機能

これらは `ui-code-preview` を読書補助コンポーネントではなく、状態管理ハブや複合アプリケーション容器へ変質させやすいためです。

---

## 12. 補足

`ui-code-preview` の要点は、プレビューを派手に見せることではありません。**見せる UI と読むコードを、ひとつの静かな読書単位として束ねること**にあります。

したがって、今後の変更でも次の原則は崩さない方がよいです。

1. preview 側だけを切り替え、code 側へ副作用を漏らさないこと。
2. header は必要なときだけ出し、不要な常設ノイズにしないこと。
3. `ui-code-block` / `ui-code-group` を親外枠へ統合し、二重カード化しないこと。
4. group 名を常に解決し、無名の複合 UI を残さないこと。
5. 正規構成と非正規構成の境界を曖昧にしないこと。
6. 内部導出状態を安易に公開 API 化しないこと。

---

## 13. 現行実装で未対応または未整合の事項

本節は、現行の `code-preview.ts` と `code-preview.stories.ts` を基準として、**本契約で明確化した設計と現在実装の差分**を整理するものです。

### 13.1 正規構成の実行時強制

本契約では preview root 1 個と code root 1 個を正規構成としますが、現行実装は空スロット、複数 code root、wrapper 越し構成を実行時に拒否しません。

### 13.2 `embedded` の完全所有権管理

本契約では `embedded` の付与・除去を `ui-code-preview` が管理することを定義しましたが、現行実装が付与中心で除去まで完全管理していない場合、この契約とは未整合です。

### 13.3 アクセシブル名の解決方式

本契約では視覚ラベルがある場合に `aria-labelledby` を優先する方針を定義しました。現行実装が常に `aria-label` ベースで解決している場合、この点は移行対象です。

### 13.4 `toolbar` の有効操作判定

本契約では「要素ノードであること」ではなく「有効な補助操作であること」をヘッダー表示条件に採用しました。現行実装が単純なノード存在判定に留まる場合、この点は未整合です。

### 13.5 coarse pointer 時の操作サイズ

本契約では coarse pointer 環境で 44px 相当を正規とします。現行実装の fallback が 24px の場合、この点は設計目標との差分です。

### 13.6 Storybook の内部 selector 依存

本契約では内部 selector や内部 data 属性を公開契約に含めません。Storybook が内部構造へ強く依存している場合、検証方法の整理が必要です。

### 13.7 `--ui-code-preview-preview-bg` の説明範囲

本契約では `--ui-code-preview-preview-bg` を header と preview-area が共有する preview surface 背景上書きとして定義しました。Storybook や補助文書の説明が header 専用になっている場合は修正対象です。

### 13.8 `previewTheme="page"` の意味の明文化

本契約では `page` を継承モード、`light` / `dark` を局所 override mode と整理しました。実装・Storybook・文書の 3 点でこの意味差が揃っていない場合は補正が必要です。

### 13.9 preview / code の必須性

本契約では両面必須を採用しました。現行実装が片側欠落を黙認する場合、その扱いは将来的にバリデーションまたは開発時警告へ寄せる余地があります。

### 13.10 `--ui-code-preview-preview-bg` の実効範囲

本契約では `--ui-code-preview-preview-bg` を preview surface 背景の上書きトークンとして整理しましたが、現行実装では `preview-surface="surface"` で有効性が高く、`canvas` / `muted` では各面コンテキストが優先されます。したがって、トークンの作用範囲は surface mode 依存であることを補記しなければ誤読の余地があります。

### 13.11 toolbar ターゲットサイズ補助の selector 範囲

本契約では toolbar 操作要素に対するサイズ要件を整理しましたが、現行実装の CSS 補助は `button` / `a` / `[role='button']` の直接 slotted 要素に限定されています。任意の custom element へ一律適用されるわけではないため、この点は文書と実装の対応関係を補足する必要があります。

### 13.12 Breakout Pattern Story との未整合

`code-preview.stories.ts` には、mobile / desktop breakout デフォルト値の存在を前提にする `BreakoutPatternContract` が残っていますが、現行実装の `ui-code-preview` 自体は breakout 既定値として `100%` / `0` を採り、当該 Story が期待する `calc(100% + var(--space-8, 2rem))` や `@media (min-width: 768px)` ベースの breakout 定義を持ちません。したがって、この Story は現行実装と未整合です。

### 13.13 Storybook の A11y 説明と契約のずれ

Storybook 側の説明および一部 play function は `aria-label` を前提に記述されています。一方、本契約では長期方針として `aria-labelledby` 優先へ整理しています。したがって、A11y 方針を移行する際は Storybook の説明文と検証内容も同時に更新する必要があります。

### 13.14 ローカライズ方針の実装上の混在

現行実装では fallback 名や control button の `aria-label` は日本語である一方、built-in option label / shortLabel は `Page` / `Light` / `Dark` など英語です。本契約では文言固定を避けていますが、現行 UI は言語混在状態にあるため、将来的にローカライズを整えるならここも整理対象です。

### 13.15 本節の扱い

本節に記載した差分は、本契約の否定ではなく **今後そろえるべき移行項目** です。実装、Storybook、契約書の 3 点を同時に更新し、設計のきれいさと保守性が一致した状態へ寄せます。

