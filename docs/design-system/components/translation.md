# Translation コンポーネント契約書

## 1. 文書の目的

本書は、`ui-translation` と `TranslationOrchestrator` の公開契約を定義するものです。対象は、公開入力、状態モデル、アクセシビリティ、視覚契約、環境別の振る舞い、オーケストレータ連携、境界条件、Storybook による検証観点、および長期的に固定する設計判断です。

`ui-translation` は、本文中の原文と翻訳文の対応を、**読書の流れを切らずに参照できること**を目的として提供するコンポーネントです。単に原文の横に訳文を表示するのではなく、**必要なときだけ軽く開く lookup 的な利用**と、**対訳として継続的に読む parallel 的な利用**を同じ公開面で扱います。

また、本コンポーネントは単体で完結する UI であると同時に、`TranslationOrchestrator` により複数インスタンスを横断して表示方式を統一できます。したがって、本契約は単一要素の開閉や意味論だけでなく、**端末条件、学習モード、永続化、キーボードショートカット**を含む上位制御との境界まで定義します。

Rouault における translation は、注釈や脚注に近い本文補助要素であり、本文そのものより強く主張してはなりません。したがって、本コンポーネントの契約は、**翻訳への即時到達性**と、**「没入して読む」ことのできる静かな視覚秩序**を両立する方向で定義します。

---

## 2. 適用範囲

本書は、`ui-translation` および `TranslationOrchestrator` の**現在の公開契約**を対象とします。対象は次のとおりです。

- 公開入力
- 公開メソッド
- 公開イベント
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- オーケストレータ連携契約
- 関連契約
- 境界条件
- Storybook による検証観点

一方で、本書は次の事項を対象外とします。

- 翻訳文そのものの生成品質
- 機械翻訳エンジンや辞書データの選定
- どの文を翻訳対象にするかという編集判断
- 対訳の永続ストレージ設計全体
- 画面単位での学習モード切り替え UI
- 原文と訳文の意味的整合性評価
- `translated` に plain text 以外の rich content を受け入れる拡張
- `before-open` / `before-close` など open 状態の事前フック
- group 単位のオーケストレーション
- 将来拡張案、未実装事項、移行タスク
- Story 名、テスト構成、Autodocs の編成など検証実装の詳細

また、次の方向は本コンポーネントの公開契約として採りません。

- Trigger を link と button のハイブリッドにすること
- 翻訳生成ロジックをコンポーネントへ内蔵すること
- 常時アニメーションや過度な attention-grabbing effect を加えること
- 訳文側に過剰な装飾や複数アクションを持ち込み、本文より強く主張させること

これらは上位レイヤ、別文書、または将来検討事項として扱います。

---

## 3. 公開契約

### 3.1 概要

`ui-translation` は、`original`、`translated`、`lang`、`targetLang`、`renderMode`、`open` を公開入力として扱います。スロットは持ちません。内部実装は Light DOM に直接描画される `button` と content 要素ですが、利用者は `ui-translation` を契約単位として扱います。

`original` の既定値は空文字です。空の場合、Trigger にはフォールバック文言として `翻訳を表示` を表示します。`translated` の既定値も空文字です。空の場合、翻訳は未提供として扱い、Trigger は非活性化され、content は描画されません。

`targetLang` の既定値は `ja` です。空文字が与えられた場合も `ja` にフォールバックします。`renderMode` の既定値は `popover` です。不正値は `popover` にフォールバックします。

### 3.2 責務分担

`ui-translation` と `TranslationOrchestrator` の責務は分離して扱います。

- `ui-translation` は、単一インスタンスの開閉、意味論、視覚表現、ポインター / フォーカス / キーボード操作を担当します。
- `TranslationOrchestrator` は、複数 `ui-translation` への render mode 配布、intent mode の永続化、端末条件に応じた mode 解決、グローバルショートカットを担当します。

したがって、個別要素の `open` 状態と、集合全体の `intentMode` / `studyMode` は別の状態として扱います。

### 3.3 入力契約

| 名前         | 種別                                 | 必須   | 内容           | 契約                                                                                                                                                                               |
| ------------ | ------------------------------------ | ------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `original`   | property / attribute                 | いいえ | 原文テキスト   | 空の場合は Trigger 文言として `翻訳を表示` を用います                                                                                                                              |
| `translated` | property / attribute                 | いいえ | 翻訳テキスト   | 空の場合、翻訳未提供として扱い Trigger を非活性化します                                                                                                                            |
| `lang`       | property / attribute                 | いいえ | 原文言語コード | 空でも描画は継続しますが、指定を推奨します                                                                                                                                         |
| `targetLang` | property / attribute (`target-lang`) | いいえ | 翻訳言語コード | 既定値は `ja` であり、空文字は `ja` にフォールバックします                                                                                                                         |
| `renderMode` | property / attribute (`render-mode`) | いいえ | 表示方式       | 単体利用時の表示方式入力です。`popover` / `drawer` / `interlinear` を受理し、不正値は `popover` にフォールバックします。`TranslationOrchestrator` 管理下では派生状態として扱います |
| `open`       | property / attribute                 | いいえ | 開閉状態       | `true` の場合に翻訳 content を表示します                                                                                                                                           |

### 3.4 表示方式契約

本コンポーネントでは、**Intent**、**Layout policy**、**Adaptive surface** を分けて扱います。

- Intent は利用意図としての `lookup` / `parallel` です。
- Layout policy は `floating-surface` / `side-surface` / `inline-surface` です。
- Adaptive surface は実際に出現する surface としての `popover` / `bottom-sheet` / `drawer` / `interlinear` です。

`ui-translation` 単体の `renderMode` は、Layout policy と Adaptive surface をまとめた単一入力です。一方、`TranslationOrchestrator` 管理下では、Intent と device profile から解決済み surface が導かれます。

| `renderMode` 値 | Layout policy      | 通常 surface                                            | content の意味論 | 主な用途                  |
| --------------- | ------------------ | ------------------------------------------------------- | ---------------- | ------------------------- |
| `popover`       | `floating-surface` | desktop では `popover`、mobile-like では `bottom-sheet` | `role="note"`    | 文脈を維持した軽い lookup |
| `drawer`        | `side-surface`     | `drawer`                                                | `role="note"`    | 画面端での継続的な参照    |
| `interlinear`   | `inline-surface`   | `interlinear`                                           | `role="note"`    | 原文直下での対訳読書      |

`popover`、`drawer`、`interlinear` は、いずれも**本文補助 surface**として扱い、dialog 的な意味論は採りません。したがって、lookup 系 surface も modal dialog ではなく、読みを補助する note surface です。

### 3.5 公開メソッド

`ui-translation` は、利用側が内部 DOM を直接探索しなくてもよいよう、次の公開メソッドを持ちます。

| 名前                         | 種別   | 契約                                |
| ---------------------------- | ------ | ----------------------------------- |
| `openTranslation()`          | method | 翻訳を開きます                      |
| `closeTranslation()`         | method | 翻訳を閉じます                      |
| `toggleTranslation()`        | method | 翻訳の開閉を反転します              |
| `requestModeToggle(source?)` | method | 上位に mode toggle 要求を送出します |

`requestModeToggle()` の `source` は `keyboard` または `api` を受理します。既定値は `api` です。

`openTranslation()`、`closeTranslation()`、`toggleTranslation()` は、**状態変化が発生しない場合は no-op** として扱います。したがって、翻訳未提供状態での `openTranslation()`、すでに open な状態での `openTranslation()`、すでに closed な状態での `closeTranslation()` は、内部状態を変更せず、`translation-toggle` も発火しません。

### 3.6 公開イベント

| 名前                              | detail                       | bubbles | composed | 契約                                                                                                     |
| --------------------------------- | ---------------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `translation-toggle`              | `{ open, renderMode }`       | あり    | あり     | 単一要素の開閉通知。公開イベントとして扱います                                                           |
| `translation-request-mode-toggle` | `{ source }`                 | あり    | あり     | 上位オーケストレータへの mode toggle 要求。内部連携イベントとして扱い、外部の安定公開 API には含めません |
| `translation-mode-change`         | `{ intentMode, renderMode }` | あり    | あり     | オーケストレータによる集合状態変更通知。公開イベントとして扱います                                       |

`translation-toggle` は `ui-translation` 自身が発火します。`translation-request-mode-toggle` は `ui-translation` 側から送出されますが、これは**内部連携のための要求イベント**であり、外部アプリケーションが安定依存してよい公開 API ではありません。`translation-mode-change` は `TranslationOrchestrator` が発火します。

### 3.7 `TranslationOrchestrator` の公開面

`TranslationOrchestrator` は、`root`、`keyTarget`、`storage`、`storageKey`、`studyMode`、`mobileBreakpoint`、`isMobileViewport` を構成入力として扱います。

| 名前               | 種別               | 必須   | 内容                   | 契約                                                  |
| ------------------ | ------------------ | ------ | ---------------------- | ----------------------------------------------------- |
| `root`             | constructor option | いいえ | 管理対象ルート         | 既定値は `document` です。未解決の場合は例外です      |
| `keyTarget`        | constructor option | いいえ | グローバルキー入力対象 | 既定値は `document` または `root` です                |
| `storage`          | constructor option | いいえ | 永続化先               | `getItem` / `setItem` を持つ Storage 互換を受理します |
| `storageKey`       | constructor option | いいえ | 永続化キー             | 既定値は実装定数に従います。利用側は既定文字列そのものに依存してはなりません |
| `studyMode`        | constructor option | いいえ | 学習モード             | `parallel` を `interlinear` へ解決し得ます            |
| `mobileBreakpoint` | constructor option | いいえ | 互換用モバイル閾値     | 既定判定は実装定数に従います。長期的な正規判定は共通 device profile を優先します |
| `isMobileViewport` | constructor option | いいえ | モバイル判定関数       | 指定時は既定の `matchMedia` 判定を置き換えます        |

`TranslationOrchestrator` は、`start()`、`destroy()`、`setIntentMode()`、`toggleIntentMode()`、`setStudyMode()`、`refresh()` を公開メソッドとして持ちます。

### 3.8 `intentMode` 契約

`TranslationOrchestrator` は、`lookup` と `parallel` の 2 つの `intentMode` を扱います。これは単一要素の `renderMode` とは別概念です。

| `intentMode` | desktop   | mobile-like + `studyMode=false` | mobile-like + `studyMode=true` |
| ------------ | --------- | ------------------------------- | ------------------------------ |
| `lookup`     | `popover` | `popover`                       | `popover`                      |
| `parallel`   | `drawer`  | `popover`                       | `interlinear`                  |

上表が `resolveTranslationRenderMode()` の解決規則です。

### 3.9 Device profile 契約

長期運用上の正規判定は、単なる viewport 幅ではなく、**共通 device profile** により行います。少なくとも次の情報を同一基準で扱います。

- `compactViewport`
- `coarsePointer`
- `hoverless`
- `mobileLike`

`TranslationOrchestrator` の mode 解決と、`ui-translation` の bottom-sheet 化判定は、最終的にこの共通 device profile に従うものとします。したがって、mobile-like 判定は上位と下位で別々に定義してはなりません。

### 3.10 属性反映契約

| property     | attribute     | reflect | 備考                                      |
| ------------ | ------------- | ------- | ----------------------------------------- |
| `lang`       | `lang`        | あり    | 空の場合は Trigger の `lang` を省略します |
| `targetLang` | `target-lang` | あり    | 空文字は `ja` に正規化されます            |
| `renderMode` | `render-mode` | あり    | 不正値は `popover` 扱いです               |
| `open`       | `open`        | あり    | boolean attribute として扱います          |

`original` と `translated` は公開 property / attribute として扱えますが、reflect はしません。表示結果は内部描画へ反映されます。

### 3.11 列挙外値・無効値の扱い

`renderMode` は列挙外文字列を受理しません。列挙外値が与えられた場合、例外ではなく `popover` にフォールバックします。`targetLang` の空文字は `ja` にフォールバックします。`lang` の空文字は描画継続とし、開発時警告にとどめます。

`TranslationOrchestrator` 側の `intentMode` も `lookup` / `parallel` 以外は受理せず、不正値は `lookup` に正規化します。

---

## 4. 状態モデル

`ui-translation` の主要状態は、**翻訳が存在するか**、**どの表示方式か**、**開いているか**、**lookup 的に一時参照するか**、**上位オーケストレータ配下で集合的に切り替わるか**によって読み分けます。

### 4.1 基本状態

最小状態は、`original` と `translated` を持ち、`renderMode="popover"`、`open=false` の状態です。この状態では Trigger のみを表示し、click、hover、focus に応じて翻訳を開けます。

### 4.2 翻訳未提供状態

`translated` が空の場合、翻訳未提供状態として扱います。この状態では Trigger は `disabled` となり、content は描画されません。`open=true` を要求しても開きません。

この状態は、単なる空コンテンツではなく、**翻訳を表示できないことを明示した非活性状態**です。

### 4.3 Lookup 状態

`renderMode` が `popover` または `drawer` の場合、lookup 系 mode として扱います。このとき content は**本文補助 surface**であり、`role="note"` を持ちます。`aria-haspopup` と `aria-modal` は持ちません。

lookup 系 mode では、mouse pointer の `pointerenter`、キーボードフォーカスの `focusin`、Trigger の click により翻訳を開けます。`pointerleave`、`focusout`、Escape、再 click、またはモバイル scrim 操作で閉じます。

### 4.4 Interlinear 状態

`renderMode="interlinear"` の場合、content は原文の直下に挿入される補注として扱います。content は `role="note"` を持ちます。lookup 系と異なり surface の浮動配置を持たず、本文フロー内へ挿入されます。

ただし、interlinear は常時表示ではありません。`open` が `true` のときのみ表示し、`false` のときは `hidden` です。したがって、interlinear は常設対訳ではなく、**行間に展開される対訳表示**として扱います。

### 4.5 Open / Closed 状態

`open` は単一要素の開閉状態です。`open=true` の場合、Trigger の `aria-expanded` は `true` となり、content は `hidden=false` になります。`open=false` の場合は `aria-expanded=false`、`hidden=true` です。

`aria-expanded` は翻訳未提供時も常に出力されますが、その場合は `false` です。`aria-controls` と `aria-details` は翻訳が存在する場合にのみ出力します。

### 4.6 Popover 状態

`renderMode="popover"` の場合、content は viewport 基準の fixed positioned overlay として表示されます。通常は Trigger の近傍に配置し、viewport 端からはみ出さないよう位置調整します。必要に応じて下側優先で表示し、収まらない場合は上側に反転します。

### 4.7 Drawer 状態

`renderMode="drawer"` の場合、content は画面右側の固定パネルとして表示されます。これは modal ではなく、本文を残したまま参照するための side drawer です。

### 4.8 Bottom sheet 状態

`renderMode="popover"` であっても、mobile-like かつ coarse pointer 環境では、lookup content は bottom sheet として表示します。このとき scrim を伴い、下方向スワイプまたは scrim タップで閉じられます。

したがって、`popover` は常に desktop 的な吹き出しを意味しません。**同じ intent でも端末条件により bottom sheet へ変形する**ことを契約とします。

### 4.9 オーケストレータ状態

`TranslationOrchestrator` は、単一要素の `open` ではなく、集合全体の `intentMode` と `studyMode` を持ちます。

- `intentMode` は `lookup` または `parallel` です。
- `studyMode` は boolean です。

`intentMode` は localStorage へ永続化されます。`studyMode` は永続化対象ではなく、現在セッションの構成状態として扱います。

### 4.10 キーボード状態

`TranslationOrchestrator` は次のショートカットを扱います。

| 操作                   | 条件                                                                                                       | 効果                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Ctrl/Cmd + Shift + L` | editable 要素以外、`defaultPrevented` でなく、key repeat でない                                            | `lookup` / `parallel` をグローバル切り替え                 |
| `P`                    | 修飾キーなし、開いている `ui-translation` 上、lookup 系 mode、`defaultPrevented` でなく、key repeat でない | `translation-request-mode-toggle` を経由して mode 切り替え |
| `Escape`               | 開いている `ui-translation` 上                                                                             | 当該翻訳を閉じ、Trigger へフォーカスを戻す                 |

`P` は interlinear では受理しません。したがって、本文内の open な translation から `lookup` / `parallel` の切り替えを文脈的に要求できるのは、lookup 系 mode のときだけです。

### 4.11 複数インスタンス状態

長期契約では、lookup 系 surface は scope 内 single-open とします。したがって、同一 scope 内で新たな `popover` または `drawer` を開く場合、すでに open な他の lookup 系 translation は自動で閉じます。

一方、`interlinear` は本文への局所展開として扱うため、multi-open を許容します。single-open / multi-open の境界は、surface の役割差に基づく契約です。

既定の scope は `TranslationOrchestrator` 単位です。将来 group 単位の管理が導入された場合、その group が scope を構成します。

### 4.12 Mode 再配布時状態

オーケストレータが mode を再配布した場合、個別インスタンスの `open` は維持されます。したがって、mode 切り替えは「閉じてから別方式で開き直す」操作ではなく、**開閉状態を保ったまま表示方式を変える操作**として扱います。

---

## 5. DOM / Accessibility

`ui-translation` は Shadow DOM を使いません。`createRenderRoot()` はホスト自身を返すため、内部構造は Light DOM に直接描画されます。

```text
<ui-translation>
  <span data-part="root">
    <button data-part="trigger">…原文…</button>
    [button data-part="scrim"]
    [div data-part="content"]…翻訳…</div>
  </span>
</ui-translation>
```

`scrim` は bottom sheet 時のみ描画します。`content` は翻訳が存在する場合にのみ描画します。

### 5.1 Trigger 契約

Trigger は常にネイティブ `button` を出力します。`div[role="button"]` や link には置き換えません。

- `type="button"` を持ちます。
- `lang` は `lang` 指定時のみ出力します。
- `aria-expanded` は開閉状態に同期します。
- 翻訳ありの場合、`aria-controls` と `aria-details` は content の ID を参照します。
- 翻訳ありの場合、content は `aria-labelledby` により Trigger を参照します。
- 翻訳なしの場合、`disabled=true` です。

### 5.2 Content 契約

content は翻訳を表す単一要素です。

- すべての surface で `role="note"` を持ちます。
- `lang` は常に `targetLang` の解決値を反映します。
- `aria-labelledby` は Trigger の ID を参照します。
- `data-render-mode` に解決済み mode を出力します。
- `data-open` に現在の `open` 状態を文字列で出力します。
- `hidden` は `open` と逆同期します。

### 5.3 A11y 契約

アクセシビリティ上の重要点は次のとおりです。

- 対話主体は常にネイティブ `button` です。
- lookup 系 surface は dialog ではなく、本文参照を補助する `note` surface として振る舞います。
- interlinear も同様に `role="note"` を持ちますが、浮動 surface ではなく本文フロー内の補注として扱います。
- 原文には `lang`、翻訳には `targetLang` を付与でき、音声読み上げ品質の維持に寄与します。
- Trigger のタッチ領域は疑似要素で最低寸法を補い、本文中でも押しやすさを確保します。
- `aria-controls` と `aria-details` が参照する content ID は、1 インスタンスにつき 1 つに固定され、同一インスタンスの接続中は安定します。
- content には `aria-labelledby` を付与し、対応する Trigger をアクセシブル名の参照元とします。

本コンポーネントで重要なのは、**翻訳 UI を付け足すこと**ではなく、**原文・訳文・補注・参照 surface の意味差を崩さないこと**です。

### 5.4 スタイル契約

`ui-translation` は Light DOM を採用します。必要な共有スタイルは、同一文書内で重複しないよう管理されます。

ただし、style の注入先、注入回数の実現方法、破棄時の撤去戦略は実装詳細であり、利用側が依存してはなりません。利用側が安定依存してよいのは、**本コンポーネントが共有スタイル前提で動作すること**と、**内部 DOM 構造および `[data-part]` が公開テーマ API ではないこと**です。

外部が安定依存してよいスタイリング面は、公開トークンおよび将来別途明示される正式 API に限ります。

---

## 6. Visual Contract

`ui-translation` の視覚契約は、翻訳箇所を本文から浮かせすぎずに示し、必要なときだけ content 側へ注意を移すことにあります。

### 6.1 情報順位

- Trigger は本文と同じ文脈内に置かれます。
- 常時の視覚差分は控えめな下線的シグナルにとどめます。
- 開いた content は surface と elevation により本文から分離します。
- `drawer` は継続参照、`popover` は一時参照、`interlinear` は補注的読書として読み分けます。

### 6.2 Trigger の視覚仕様

Trigger は透明背景の inline button とし、破線状の下線表現で翻訳可能性を示します。hover、focus-visible、`aria-expanded="true"` では、この下線を強め、文字色を既定色へ戻して到達可能性を示します。

これは link 的な強い装飾ではなく、**本文に寄り添う弱い注釈記号**としての強度です。

### 6.3 Content の視覚仕様

`popover` と `drawer` は、境界線、背景面、elevation、上端 inset highlight を持つ elevated content として描画します。`drawer` は画面右端固定、`popover` は Trigger 近傍固定です。

`interlinear` は block 要素として原文直下に出現し、opacity transition により静かに出入りします。本文の流れの中に収まることを優先し、dialog 的な面構造や scrim は持ちません。

### 6.4 Bottom sheet の視覚仕様

モバイル lookup では、`popover` content は bottom sheet 化されます。画面下部に固定され、scrim を伴います。ただし modal dialog としては扱わず、本文補助 surface としての意味論を維持します。

### 6.5 ダークモード追従

本コンポーネントは `prefers-color-scheme` を直接参照して mode 分岐しません。ダークモード追従はトークン差し替えで吸収します。したがって、dark / light の表現差は**コンポーネント内分岐ではなくデザイントークン側契約**に委ねます。

### 6.6 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途         | トークン                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------- |
| 本文文字色   | `--fg-default`                                                                            |
| 補助文字色   | `--fg-muted`                                                                              |
| 境界線       | `--border-default`                                                                        |
| Surface 背景 | `--bg-surface-2`                                                                          |
| Focus ring   | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| 角丸         | `--radius-sm` / `--radius-md` / `--radius-lg`                                             |
| Elevation    | `--elevation-lg`                                                                          |
| 余白         | `--space-*`                                                                               |
| 文字サイズ   | `--text-sm`                                                                               |
| 行高         | `--line-height-relaxed`                                                                   |
| z-index      | `--z-popover`                                                                             |
| モーション   | `--duration-fast` / `--ease-out`                                                          |
| タッチ領域   | `--control-min-touch`                                                                     |

---

## 7. 環境別の振る舞い

### 7.1 Reduced Motion

`prefers-reduced-motion: reduce` 環境では、Trigger と content の transition / animation を極小化します。これは視認性よりも、動きによる注意奪取を抑えることを優先する契約です。

### 7.2 Forced Colors

`forced-colors: active` 環境では、Trigger の background-image を除去し、underline を非色シグナルとして維持します。content は `Canvas` / `CanvasText` と明示的な border で再構成し、box-shadow には依存しません。

### 7.3 Print

`@media print` では、Trigger は下線付きテキストとして残します。一方、`popover` / `drawer` の content は非表示にし、`interlinear` のみ表示します。したがって、印刷可能な翻訳表現は interlinear に一本化されます。

### 7.4 Mobile

mobile-like device profile では、lookup popover は bottom sheet として表示します。判定は viewport 幅だけでなく、pointer / hover 特性を含む共通 device profile に従います。

### 7.5 Desktop

desktop では `parallel` intent が `drawer` に解決され、継続読みに適した side panel を提供します。`lookup` intent は `popover` に解決されます。

---

## 8. オーケストレータ連携契約

`TranslationOrchestrator` は、`root` 配下のすべての `ui-translation` を対象に、解決済み `renderMode` を配布します。既存要素だけでなく、後から追加された要素にも `MutationObserver` で追従します。

### 8.1 起動と破棄

- `start()` はイベント購読、viewport 変化購読、MutationObserver 起動、および現在 mode の適用を行います。
- `destroy()` はこれらを解除します。
- 多重 `start()` / `destroy()` は冪等に扱います。

### 8.2 永続化契約

`intentMode` は localStorage 互換ストレージへ保存します。既定の storage key は `rouault:translation-mode` です。ストレージ利用不可環境では、永続化をスキップして描画だけ継続します。

`setIntentMode()` は既定で永続化を伴いますが、`persist: false` が指定された場合は storage 書き込みを行いません。したがって、利用側は**一時的な mode 変更**と**永続的なユーザー設定変更**を明示的に分けられます。

### 8.3 Mode 解決契約

`setIntentMode()`、`toggleIntentMode()`、`setStudyMode()` は、都度 `resolveTranslationRenderMode()` により `renderMode` を再計算し、配下のすべての `ui-translation` に適用します。

`refresh()` は現在の `intentMode` と `studyMode` を再評価して配下へ再適用するためのメソッドです。これは**再配布専用**であり、`intentMode` 自体を変更しません。また、`refresh()` は `translation-mode-change` の発火や永続化書き込みを伴いません。

### 8.4 管理下の優先順位契約

`TranslationOrchestrator` の管理下では、個別 `ui-translation` の `renderMode` は安定的なソースオブトゥルースではありません。利用側が個別に `renderMode` を設定しても、`start()`、`setIntentMode()`、`toggleIntentMode()`、`setStudyMode()`、`refresh()`、および管理対象追加時の再適用により、**解決済み render mode で上書きされ得ます**。

したがって、オーケストレータ配下で安定的に制御してよい外部入力は、`intentMode`、`studyMode`、および個別要素の `open` です。個別 `renderMode` は管理下では**予約済み派生状態**として扱い、利用側のソースオブトゥルースにしてはなりません。

### 8.5 Single-open 契約

`TranslationOrchestrator` は scope 内で open な lookup 系 translation を 1 つに保ちます。新しい lookup 系 translation が open になると、既存の open な `popover` / `drawer` は自動で close されます。

`interlinear` は本文内の局所展開であるため、この排他制御の対象外です。

### 8.6 Mode 変更時の `open` 維持契約

オーケストレータによる mode 再配布は、`renderMode` を更新しても `open` を自動的には閉じません。したがって、開いている `ui-translation` は、`popover` から `drawer`、または `popover` から `interlinear` のように、**開いたまま表示方式だけが変化し得ます**。

### 8.7 グローバルキー契約

- editable 要素上ではグローバルショートカットを無効とします。
- `defaultPrevented` なキーボードイベント、および key repeat 中のイベントは処理しません。
- `Ctrl/Cmd + Shift + L` は global mode toggle です。
- `P` は修飾キーなしで、開いている translation 文脈上での inline mode toggle です。
- `P` は interlinear では無効です。
- `P` はイベント経路上に open な `ui-translation` が存在する場合にのみ受理します。

### 8.8 入力デバイス契約

長期契約では、少なくとも次の入力行列を固定します。

| 入力種別             | lookup 系                                           | interlinear                          | 備考                                                |
| -------------------- | --------------------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| mouse                | hover open 可、click toggle 可                      | click toggle 可                      | primary button かつ修飾キーなしを正規経路とします   |
| touch                | hover open 不可、tap toggle 可                      | tap toggle 可                        | bottom sheet gesture close を持ちます               |
| pen                  | touch 相当として扱います                            | touch 相当として扱います             | hover 可能デバイスでも参照契約は touch 側へ寄せます |
| keyboard             | focus open、Escape close、`P` で mode toggle 要求可 | focus open、Escape close、`P` 無効   | `P` は lookup 系かつ open 時のみ有効です            |
| assistive technology | button activation を正規経路とします                | button activation を正規経路とします | 独自ジェスチャーには依存しません                    |

### 8.9 永続化優先順位契約

永続化と初期値の優先順位は次の順に固定します。

1. 明示的 runtime call
2. constructor / 初期構成で与えた値
3. persisted value
4. system default

### 8.10 既定オーケストレータ契約

`initTranslationOrchestrator()` は `document` を root とする既定インスタンスを一度だけ生成します。`getTranslationOrchestrator()` はその参照を返します。サーバー環境では `null` を返します。

---

## 9. 関連契約

### 9.1 原文 / 翻訳の言語契約

`lang` と `targetLang` は、翻訳品質そのものではなく、**読み上げ・言語認識の補助情報**として扱います。したがって、本契約は「正しい翻訳か」を保証しませんが、少なくとも原文と翻訳文に異なる言語タグを与えられることを重視します。

`lang` と `targetLang` の妥当性は、単なる空有無だけでなく、**BCP 47 形式として明らかに不正でないこと**を開発時に確認対象とします。ただし、この検証は**形式検証**に留め、翻訳品質保証とは混同しません。

不正または空の言語タグが与えられても、現行契約では描画を停止せず、例外も送出しません。`targetLang` の空文字は `ja` に正規化し、`lang` の空文字は未指定として扱います。不正タグは開発時警告の対象ですが、実行時描画は継続します。

### 9.2 Mode toggle 要求契約

`ui-translation` は `P` キーまたは `requestModeToggle()` を通じて mode toggle を要求できますが、`intentMode` を自分で保持・決定しません。要求を受理し、`renderMode` を再解決して配下へ再配布するのは `TranslationOrchestrator` の責務です。

### 9.3 外部制御契約

`open` と `renderMode` は外部から直接変更できます。したがって、利用者は hover / focus / keyboard だけに依存せず、アプリケーション都合で open / close や mode 配布を制御できます。

ただし、`TranslationOrchestrator` の管理下では `renderMode` は派生状態であり、個別設定値は再適用時に上書きされ得ます。したがって、管理下で安定的に制御できる外部入力は、個別 `renderMode` よりも `intentMode`、`studyMode`、および `open` です。

`translated` の content model は **plain text only** に固定します。rich content、unsafe HTML、構造化注釈入力は現行公開契約に含めません。将来拡張する場合は別 API として導入します。

### 9.4 開発時警告契約

次の事項は開発時警告の対象です。

- `original` が 150 文字を超える
- `lang` が未指定
- `target-lang` が未指定
- `lang` が BCP 47 形式として明らかに不正である
- `target-lang` が BCP 47 形式として明らかに不正である

これらは描画停止や例外送出ではなく、console warning にとどまります。

---

## 10. 境界条件

### 10.1 `original` が空

`original` が空の場合、Trigger 文言は `翻訳を表示` にフォールバックします。空文字のまま button を描画してはなりません。

### 10.2 `translated` が空

`translated` が空の場合、Trigger は `disabled` となり、content は描画しません。`aria-controls` と `aria-details` も出力しません。

### 10.3 `target-lang` が空

空文字は `ja` にフォールバックします。翻訳 content の `lang` も `ja` になります。

### 10.4 `render-mode` が不正

列挙外値は `popover` にフォールバックします。例外停止や unknown mode の描画継続には依存しません。

### 10.5 長文 Trigger

`original` が 150 文字を超える場合でも描画は継続しますが、開発時警告を出します。長文全文を 1 つの translation trigger に詰め込む運用は推奨しません。

### 10.6 Lookup 中の hover / focus

lookup 系 mode では、pointer が内部にあるか、focus が内部にある限り開状態を維持します。双方が離れたときに自動で閉じます。

### 10.7 Escape

開いている translation 上で Escape を押した場合、translation を閉じ、Trigger へフォーカスを戻します。

### 10.8 Bottom sheet gesture

モバイル bottom sheet は、十分な下方向ドラッグ距離または速度があれば閉じます。閾値は内部実装に属し、利用側が数値に依存してはなりません。

### 10.9 `P` キー

`P` は開いている lookup 系 translation 上でのみ mode toggle 要求になります。閉じている状態や interlinear 状態では何もしません。

### 10.10 外部スタイル干渉

本コンポーネントは Light DOM を用いるため、外部 CSS が `[data-part]` 構造へ干渉できます。利用者は公開トークン契約を優先し、外部から内部構造を破壊するスタイル上書きには依存してはなりません。

### 10.11 再配置

open な `popover` は、viewport の resize / scroll に追従して位置を再計算します。したがって、Trigger 近傍配置は初回 open 時だけで固定されず、表示中の viewport 変化にも追従します。

ただし、この配置は **best-effort placement** です。viewport 内 clamp と上下反転は保証対象ですが、他 overlay との衝突回避や複雑レイアウトでの厳密な anchor-aware placement は保証しません。

### 10.12 No-op 呼び出し

翻訳未提供状態での open 要求、同一状態への再設定、または状態変化を伴わない公開メソッド呼び出しは no-op です。この場合、`translation-toggle` は発火しません。

### 10.13 Single-open

同一 scope 内の lookup 系 translation は single-open です。新しい `popover` または `drawer` を開くと、既存の open な lookup 系 translation は閉じます。`interlinear` はこの制約の対象外です。

---

## 11. Storybook 契約

Storybook は見本ではなく、公開契約を継続検証するための確認面です。本書が固定するのは Story 名ではなく、次の検証観点です。

| 検証観点 | 維持する契約 |
| -------- | ------------ |
| 基本状態と A11y | Trigger / Content の基本 A11y 契約、`open` と `aria-expanded` / `hidden` の同期、`translation-toggle` 発火 |
| 表示方式の整合 | `renderMode × open` の意味論整合、lookup 系と interlinear の差分 |
| 境界条件 | 不正 mode フォールバック、空 `target-lang` の `ja` フォールバック、翻訳未提供時の disabled、長文警告 |
| オーケストレータ連携 | 永続化読取、グローバルショートカット、`intentMode` と `renderMode` の対応、`translation-mode-change` 発火 |
| 環境差分 | reduced motion、forced colors、print、mobile bottom-sheet 化 |
| ルックアップ操作 | hover / focus / click / Escape / scrim / gesture の契約 |
| 外部制御 | property / attribute 変更による `open`・`renderMode` 反映、および no-op 時にイベントが増発しないこと |
| 管理境界 | 単体利用時の `renderMode` 入力と、管理下での派生状態との差分 |
| 複数インスタンス | lookup 系 single-open と interlinear multi-open の境界 |
| device profile | mode 解決と bottom-sheet 化判定が同一 device profile に整合すること |
| Accessible naming | Trigger と content の `aria-labelledby` / `aria-controls` / `aria-details` 関係 |
| イベント公開境界 | 公開イベントと内部連携イベントの区別 |

Storybook / Autodocs 上の具体的な Story 名、構成単位、分割方法は検証実装の詳細であり、本契約の固定対象には含めません。

---

## 12. 補足

`ui-translation` の要点は、翻訳を表示できることそのものではありません。**本文に埋め込まれた原文を、読書のリズムを崩さずに参照・比較・対訳化できること**にあります。

したがって、今後の変更でも次の 4 点は崩さない方がよいです。

1. Trigger の実体は常にネイティブ `button` であること。
2. lookup と interlinear の意味論を混同しないこと。
3. モバイル lookup を desktop popover の縮小版ではなく、bottom sheet として扱うこと。
4. 単体要素の `open` 状態と、集合全体の `intentMode` を分離すること。

また、本書では**契約本文を正本**として扱います。現行実装が本文に未追随の事項は、公開契約そのものとして利用者が依存してよいものではなく、実装差分、検証タスク、または issue として別途管理します。未対応状態を残したまま公開契約へ昇格させてはなりません。

---

## 13. 現行実装で未対応の事項

本節は、現行の `translation.ts`、`translation-orchestrator.ts`、`translation.stories.ts` を基準として、**本契約で固定したが、現時点では未実装または未強制の事項**を整理するものです。

### 13.1 共通 Device profile resolver

契約では、mode 解決と bottom-sheet 化判定を共通 device profile に統一します。しかし現時点では、オーケストレータ側とコンポーネント側で判定基準が分かれています。したがって、**共通 resolver は未実装**です。

### 13.2 Lookup 系 single-open の強制

契約では、lookup 系 surface は scope 内 single-open とします。しかし現時点では、複数の `ui-translation` を同時に open にできます。したがって、**single-open の排他制御は未実装**です。

### 13.3 Surface 意味論の `note` への統一

契約では、lookup 系 surface も含めて translation content を本文補助の `note` surface として扱います。しかし現時点の lookup 系 surface は dialog 的意味論で実装されています。したがって、**意味論の統一は未反映**です。

### 13.4 Accessible naming の反映

契約では、content は `aria-labelledby` により対応する Trigger を参照し、Trigger / content の関係がアクセシブル名として結び付けられる前提です。しかし現時点では、Trigger 側 ID と content 側 `aria-labelledby` の組が実装上まだ固定されていません。したがって、**accessible naming 契約は未反映**です。

### 13.5 Trigger 側の dialog 前提属性の整理

契約では、lookup 系 surface を dialog ではなく本文補助の `note` surface として扱います。したがって、Trigger 側も dialog 前提の属性に依存してはなりません。しかし現時点では、lookup 系 surface の意味論変更に対応して Trigger 側属性まで整理し切れていません。したがって、**Trigger 側の意味論調整は未完了**です。

### 13.6 公開イベントと内部イベントの分離

契約では、`translation-request-mode-toggle` を内部連携イベントとして扱います。しかし現時点では、公開面と内部面が実装上明示的に分離されていません。したがって、**イベント可視性の境界は未強制**です。

### 13.7 内部連携イベントの受理条件強化

契約では、内部連携イベントはオーケストレータ連携のための限定的な経路として扱います。しかし現時点では、`translation-request-mode-toggle` の発火元や文脈妥当性を厳密に検証する受理条件は未整備です。したがって、**内部イベントの発火元検証と受理条件強化は未実装**です。

### 13.8 Pen 入力の明示的取り扱い

契約では、pen を touch 相当として扱います。しかし現時点では、その方針が実装上明示的に固定されているわけではありません。したがって、**pen 入力契約は未固定**です。

### 13.9 永続化優先順位の明示的実装

契約では、runtime call、constructor / 初期構成、persisted value、system default の優先順位を固定します。しかし現時点では、この優先順位が仕様として明示的に表現されているわけではありません。したがって、**優先順位の明文化は未完了**です。

### 13.10 Internal DOM 非公開の実装補助

契約では、`[data-part]` を公開 API とみなしません。しかし現時点では Light DOM と共有 style 注入により、外部から内部構造へ比較的容易に到達できます。したがって、**内部構造非公開を補助する仕組みは未整備**です。

### 13.11 Storybook 契約の追加分

契約では、`ManagedVsUnmanagedOwnership`、`SingleOpenPolicy`、`DeviceProfileResolution`、`AccessibleNamingContract`、`EventVisibilityContract` などの独立 Story を前提とします。しかし現時点では、それらは未整備です。

### 13.12 既存 Story / Autodocs の旧契約残存

契約では、lookup 系 surface の意味論や accessible naming などを更新済みの前提で固定しています。しかし現時点では、既存 Story や Autodocs の一部が旧契約を前提にした検証や説明を残しています。したがって、**不足している Story を追加するだけでなく、既存 Story / Autodocs の契約更新も未完了**です。

### 13.13 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、実装、Storybook、契約書の 3 点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。
