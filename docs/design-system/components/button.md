# Button

## 概要

本書は、`ui-button` の公開契約、状態モデル、アクセシビリティ、および視覚契約を整理するものです。

`ui-button` は、アクションの優先度を視覚的な重さで制御するコンポーネントです。単に押下可能な要素を描画するのではなく、**どの操作を主要操作として見せるか**、**どの状態を非活性または処理中として扱うか**、**フォーム送信やリセットを Shadow DOM 境界越しにどのように成立させるか**を公開契約として固定します。

また、バリアント、サイズ、フォーカス表示、モーション抑制、高コントラスト対応は、コンポーネント固有の都度調整ではなく、**トークン契約と状態契約**によって成立させます。

Rouault における button は、操作要素であると同時に、**本文、見出し、注記の読書リズムを不必要に断ち切らないこと**を求めます。したがって、本コンポーネントの契約は、押下可能性の明示と、**「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 適用範囲

本書は、`ui-button` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 開発時警告と非強制項目

一方で、本書は次の事項を扱いません。

- 画面単位でのアクション優先度設計全体
- どの画面で `primary` を何個まで許可するかというプロダクト判断
- アイコンセット自体の供給
- `start-icon` / `end-icon` のような名前付きアイコンスロットの公開契約
- `name` / `value` / `formNoValidate` のような submitter 拡張
- `href` を持たせて link と button を混在させること
- `pressed` の自動反転によって制御モデルを二重化すること
- `fullWidth` / `block` のようなレイアウト責務
- フォームバリデーション結果の生成
- 送信先 API や操作結果の通知設計
- 確認ダイアログ、ショートカット、ルーティングやダイアログ統合など上位レイヤの制御

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 公開契約

`ui-button` は、`variant`、`size`、`iconOnly`、`ariaLabel`、`accessibleName`、`pressed`、`loading`、`disabled`、`type`、`form`、`ariaExpanded`、`ariaControls`、`ariaHasPopup`、`ariaDescribedBy` を公開入力として扱います。スロットは既定スロットと `spinner` スロットを持ちます。内部実装はネイティブ `<button>` ですが、利用者は `ui-button` を契約単位として扱います。

`variant` の既定値は `secondary` です。`size` の既定値は `md` です。`type` の既定値は `button` です。これはネイティブ `<button>` の既定値とは異なるため、フォーム送信に用いる場合は `type="submit"` を明示しなければなりません（MUST）。

`iconOnly` を `true` にする場合、既定スロットはアイコン単独入力のみを正規入力とし、アクセシブル名として `aria-label` または `accessible-name` を与えなければなりません（MUST）。実装上は開発時警告にとどまる箇所がありますが、公開契約としては必須です。

`ariaLabel` は後方互換のために維持しますが、意味論上は `iconOnly=true` の場合にのみ用います。可視テキストを持つ通常の button のアクセシブル名は既定スロット内の可視ラベルから決定し、`ariaLabel` による上書き運用には依存しません。可視ラベルを持つ状態でアクセシブル名を明示したい場合は `accessibleName` を使用します。

`ariaLabel` は `iconOnly=true` の場合にのみ用います。可視テキストを持つ通常の button のアクセシブル名は既定スロット内の可視ラベルから決定し、`ariaLabel` による上書き運用には依存しません。可視ラベルを持つ状態で `ariaLabel` を併用する構成はサポート対象外です。

`ariaExpanded`、`ariaControls`、`ariaHasPopup`、`ariaDescribedBy` は、button を trigger として使用する場合の関係属性です。これらは内部ネイティブ button に反映しますが、属性の存在だけで独自アイコン、独自アニメーション、独自配置変更を自動的に発生させません。

### 入力契約

| 名前              | 種別                                      | 必須   | 内容               | 契約                                                                                                              |
| ----------------- | ----------------------------------------- | ------ | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `variant`         | property / attribute                      | いいえ | 視覚的強度         | `primary` / `secondary` / `outline` / `ghost` / `danger`                                                          |
| `size`            | property / attribute                      | いいえ | ボタンサイズ       | `sm` / `md`。既定値は `md` です                                                                                   |
| `iconOnly`        | property / attribute (`icon-only`)        | いいえ | アイコンのみ表示   | `true` の場合、既定スロットはアイコン単独入力のみを正規入力とし、`aria-label` または `accessible-name` が必須です |
| `ariaLabel`       | property / attribute (`aria-label`)       | いいえ | アクセシブル名     | 後方互換のために維持します。`iconOnly=true` の場合にのみ使用します                                                |
| `accessibleName`  | property / attribute (`accessible-name`)  | いいえ | 明示アクセシブル名 | 可視ラベルとは独立して内部 button にアクセシブル名を与えたい場合に使用します                                      |
| `pressed`         | property / attribute                      | いいえ | トグル押下状態     | 外部制御専用です。与えた場合のみ `aria-pressed` を出力し、自動反転は行いません                                    |
| `loading`         | property / attribute                      | いいえ | 処理中状態         | `true` の場合は内部 button を非活性化し、`aria-busy="true"` を付与します                                          |
| `disabled`        | property / attribute                      | いいえ | 不活性状態         | `true` の場合は内部 button を非活性化します                                                                       |
| `type`            | property / attribute                      | いいえ | フォーム動作種別   | `button` / `submit` / `reset`。既定値は `button` です                                                             |
| `form`            | property / attribute                      | いいえ | フォーム所有者     | フォーム外配置時に関連付けできます                                                                                |
| `ariaExpanded`    | property / attribute (`aria-expanded`)    | いいえ | 開閉状態           | trigger 用途の関係属性として内部 button に反映します                                                              |
| `ariaControls`    | property / attribute (`aria-controls`)    | いいえ | 関連要素 ID        | trigger 用途の関係属性として内部 button に反映します                                                              |
| `ariaHasPopup`    | property / attribute (`aria-haspopup`)    | いいえ | popup 種別         | trigger 用途の関係属性として内部 button に反映します                                                              |
| `ariaDescribedBy` | property / attribute (`aria-describedby`) | いいえ | 説明要素 ID        | trigger 用途の関係属性として内部 button に反映します                                                              |

### スロット契約

| 名前         | 種別       | 位置づけ | 内容                                                 |
| ------------ | ---------- | -------- | ---------------------------------------------------- |
| 既定スロット | slot       | 正規入力 | ラベル、アイコン、またはその組み合わせを受け取ります |
| `spinner`    | named slot | 補助入力 | ローディング中の既定スピナーを置き換えます           |

既定スロットはラベル、アイコン、またはその組み合わせを受け取ります。`spinner` スロットは `loading=true` の場合にのみ描画へ参加します。`loading=false` の場合、`spinner` スロット内容は表示に寄与しません。

`iconOnly=true` の場合、既定スロットはアイコン単独入力のみを正規入力とします。`iconOnly=true` でテキストを併置する構成は契約違反です。

### 公開メソッド

`ui-button` は、ホスト要素に対する基本操作を内部 button へ委譲するため、次の公開メソッドを持ちます。

| 名前              | 種別   | 契約                                 |
| ----------------- | ------ | ------------------------------------ |
| `focus(options?)` | method | 内部 button にフォーカスを委譲します |
| `blur()`          | method | 内部 button からフォーカスを外します |
| `click()`         | method | 内部 button の click を起動します    |

これらは Shadow DOM 内部実装を利用側に露出させないための公開面です。利用者は Shadow DOM を直接探索せず、これらの公開メソッドを使用します。

### 属性反映契約

公開入力のうち、`variant`、`size`、`iconOnly`、`ariaLabel`、`accessibleName`、`pressed`、`loading`、`disabled`、`type`、`form`、`ariaExpanded`、`ariaControls`、`ariaHasPopup`、`ariaDescribedBy` は property と attribute の両面から操作できます。`ariaLabel` の HTML 属性名は `aria-label`、`accessibleName` の HTML 属性名は `accessible-name`、`iconOnly` の HTML 属性名は `icon-only` です。boolean 値は attribute の有無で反映します。ARIA 関連属性は host に与えられた値を内部ネイティブ button に pass-through します。

| property          | attribute          | reflect | 備考                                                           |
| ----------------- | ------------------ | ------- | -------------------------------------------------------------- |
| `variant`         | `variant`          | あり    | 列挙値以外は未サポートです                                     |
| `size`            | `size`             | あり    | `lg` は非推奨です                                              |
| `iconOnly`        | `icon-only`        | あり    | boolean attribute として扱います                               |
| `ariaLabel`       | `aria-label`       | あり    | 後方互換のために維持し、`iconOnly=true` の場合にのみ使用します |
| `accessibleName`  | `accessible-name`  | あり    | 内部 button へ明示アクセシブル名を与えます                     |
| `pressed`         | `pressed`          | あり    | 定義時のみ `aria-pressed` を出力します                         |
| `loading`         | `loading`          | あり    | boolean attribute として扱います                               |
| `disabled`        | `disabled`         | あり    | boolean attribute として扱います                               |
| `type`            | `type`             | あり    | 既定値は `button` です                                         |
| `form`            | `form`             | あり    | 外部フォーム所有者を指定できます                               |
| `ariaExpanded`    | `aria-expanded`    | あり    | 内部 button に pass-through します                             |
| `ariaControls`    | `aria-controls`    | あり    | 内部 button に pass-through します                             |
| `ariaHasPopup`    | `aria-haspopup`    | あり    | 内部 button に pass-through します                             |
| `ariaDescribedBy` | `aria-describedby` | あり    | 内部 button に pass-through します                             |

### 列挙外値・無効値の扱い

`variant`、`size`、`type` は公開上は列挙値を契約とします。HTML 属性として列挙外文字列を与えること自体は可能ですが、`variant` と `size` の列挙外値は表示未定義、`type` の列挙外値は動作未定義として扱います。とくに `type` はフォーム副作用に直結するため、`button` / `submit` / `reset` 以外の値を使用してはなりません（MUST NOT）。利用者は列挙外値に依存してはなりません（MUST NOT）。

### 責務範囲

責務範囲には、内部 button の描画、状態に応じた属性反映、ローディング中のスピナー表示、フォーム送信・リセットの橋渡し、キーボード操作の正規化、`pressed` の意味状態と視覚状態の対応維持、および trigger 用途で必要な ARIA 関連属性の付与を含みます。

一方で、クリック後に何を実行するか、破壊的操作前に確認ダイアログを出すか、`primary` の数を画面単位でどう制約するか、ローディング文言をどう変更するか、trigger 固有の独自アイコンや独自アニメーションをどう見せるかは責務に含めません。

---

## 状態モデル

`ui-button` の主要状態は、見た目の種別ではなく、**入力可能か、処理中か、フォーム動作を持つか、名前を持つか**によって読み分けます。

### 1. 基本状態

最小状態は、ラベルを持ち、`variant="secondary"`、`size="md"`、`type="button"`、`disabled=false`、`loading=false` の状態です。この状態では通常の押下可能ボタンとして振る舞います。

### 2. バリアント状態

`variant` は視覚的強度のみを切り替えます。意味は次表のとおりです。

| `variant` 値 | 意味         | 想定用途                              |
| ------------ | ------------ | ------------------------------------- |
| `primary`    | 最も強い強調 | 画面内の主要操作                      |
| `secondary`  | 標準操作     | 通常の決定、保存、確認                |
| `outline`    | 軽量な明示   | カード内、モーダル内、補助操作        |
| `ghost`      | 最小限の主張 | ツールバー、高密度 UI、アイコンボタン |
| `danger`     | 破壊的操作   | 削除、リセット、破棄                  |

`variant` は操作意味を補助しますが、意味そのものを保証しません。たとえば `danger` は視覚的警告を与えますが、確認ダイアログや undo の有無は別契約です。

### 3. サイズ状態

`size` は `sm`、`md`、`lg` を受理します。`sm` と `md` は通常運用対象です。`lg` は実装上は利用可能ですが、非推奨状態として扱います。`iconOnly=true` の場合は各サイズごとに正方形寸法へ切り替わります。

### 4. 不活性状態

`disabled=true` の場合、内部 button は `disabled` となり、ポインター操作を受け付けません。視覚上は不透明度低下とカーソル変化を伴います。

### 5. ローディング状態

`loading=true` の場合、内部 button は `disabled` となり、`aria-busy="true"` を持ちます。ラベルはレイアウト幅を保ったまま `visibility: hidden` で不可視化し、中央にスピナーを重ねて表示します。

このとき、`loading` は単なる装飾状態ではなく、**再操作を抑止する排他的状態**です。`disabled` と同様に操作を受け付けません。

### 6. トグル状態

`pressed` は外部制御専用のトグル状態です。`ui-button` 自身はクリックに応じて `pressed` を自動反転しません。トグル動作を成立させる場合、利用側は起動に応じて `pressed` を更新しなければなりません（MUST）。

`pressed` が `true` または `false` の場合に限り、内部 button へ `aria-pressed` を出力します。`pressed` が `undefined` の場合、トグルボタンとしては扱いません。

`pressed` が定義される場合、視覚差分は意味状態と一致しなければなりません。差分は `secondary`、`outline`、`ghost` を中心に、背景のわずかな濃度差、境界線の強弱差、文字色の補正など、**静かで継続的に読める差分**にとどめます。`primary` と `danger` では、読書面での常時強調を増やさないため、pressed 差分を必要最小限に抑えます。

`pressed` は toggle button の状態表現にのみ用います。選択中タブ、現在ページ、ナビゲーション current state の表現には用いません。これらは別契約です。

### 7. フォーム状態

`type="submit"` の場合、関連付けられたフォームに対して `requestSubmit()` を実行します。`type="reset"` の場合、関連付けられたフォームに対して `reset()` を実行します。`type="button"` はフォーム副作用を持ちません。

フォーム所有者の決定は HTML の標準規則に準拠します。`form` 属性が有効なフォーム要素を指す場合はそのフォームを優先し、`form` 属性がない場合は最も近い祖先フォームを関連付け対象とします。`form` 属性が無効な ID を指す場合は外部フォーム所有者を持ちません。

利用者は、祖先フォームと `form` 属性の両方を与える場合、`form` 属性による明示指定を優先規則として扱います。フォーム所有者の動的変更はプラットフォームの再関連付け規則に従います。

### 8. キーボード状態

Enter は `keydown` で click に正規化します。Space は `keydown` で押下状態のみ記録し、`keyup` で click に正規化します。これはネイティブ button と同等の起動タイミングを成立させるためです。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に単一のネイティブ `<button>` を持ち、その内部に `.label` と `.spinner` を配置します。

```text
<ui-button>
  #shadow-root
    <button part="button">
      <span class="label" part="label">
        <slot></slot>
      </span>
      [span.spinner part="spinner"]
    </button>
</ui-button>
```

`ui-button` は `delegatesFocus: true` を有効にしており、ホストへのフォーカス要求は内部 button に委譲されます。公開メソッド `focus()`、`blur()`、`click()` も内部 button に委譲されます。

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 対話主体はネイティブ `<button>` です。
- `iconOnly=true` の場合、既定スロットはアイコン単独入力のみを正規入力とし、アクセシブル名を `aria-label` または `accessible-name` で提供しなければなりません（MUST）。
- 可視テキストを持つ通常の button では、アクセシブル名は可視ラベルから決定します。可視ラベルとは別のアクセシブル名が必要な場合に限り `accessibleName` を使用します。`aria-label` による上書き運用には依存しません。
- `loading=true` の場合、内部 button に `aria-busy="true"` を付与します。
- `pressed` が定義される場合、内部 button に `aria-pressed` を付与します。
- `aria-expanded`、`aria-controls`、`aria-haspopup`、`aria-describedby` が与えられた場合、内部 button にそのまま反映します。
- これらの ARIA 関連属性は意味関係の付与を目的とし、属性の存在だけで独自アイコン、独自アニメーション、独自配置変更を発生させません。
- フォーカス可視表示は `:focus-visible` で扱います。
- 最低 44×44 px のタッチ領域を疑似要素で補います。

本コンポーネントで重要なのは、**見た目上ボタンらしく見せることではなく、実体として button を維持すること**です。疑似リンクや `div[role="button"]` には依存しません。

---

## Visual Contract

`ui-button` の視覚契約は、優先度の差を**塗り、境界線、影、文字色、ホバー反応**の差として表現することにあります。

### 情報順位

- `primary` は最も強い視覚重量を持ちます。
- `secondary` は標準操作として背景と境界線を持ちます。
- `outline` は境界線中心で軽く見せます。
- `ghost` は背景を持たず、密な UI でのノイズを抑えます。
- `danger` は破壊的操作として警告色を帯びます。

本文近傍、注釈近傍、カード内補助操作では、読書の主役が本文であることを優先します。したがって、`primary` と `danger` は画面遷移点、確定操作、破壊的操作など、読書の流れを意図的に切り替える局面に限定して用います。継続読書中の軽操作には `secondary`、`outline`、`ghost` を優先します。

### レイアウト

ルートは `inline-flex` です。内部 button は `inline-flex` で中央配置します。ラベルとアイコンはギャップを持って横並びに配置します。`iconOnly=true` の場合、横幅は各サイズの高さと同値に固定し、正方形にします。

### 視覚仕様

- `primary` は塗り背景、明るい文字色、内側ハイライト、立体シャドウを持ちます。
- `secondary` は面と境界線を持ち、標準操作として最も中立的です。
- `outline` は透明背景と境界線を持ちます。
- `ghost` は通常時透明、hover 時のみ淡い背景を持ちます。
- `danger` は通常時に淡い警告背景、hover 時に強い警告面へ反転します。

`pressed` が定義される場合、視覚差分は `aria-pressed` と一致しなければなりません。差分は `secondary`、`outline`、`ghost` を中心に静かな強度で定義し、本文近傍で過剰に強い selected 表現を持ち込みません。`primary` と `danger` では常時強調を増やさないため、pressed 差分を必要最小限に抑えます。

button は可読本文より強く主張してはなりません。とくに article / prose 文脈では、hover、focus、pressed などの状態差分は、可視性を確保しつつも、見出しや本文の視線誘導を奪わない強度に抑えます。常時アニメーション、過度な発光、持続的な高コントラスト強調には依存しません。

### ローディング表示

ローディング中はラベルの占有幅を保持します。これにより、処理開始前後でボタン幅が変化しません。スピナーは中央オーバーレイとして重なります。

### フォーカス表示

フォーカスリングは `outline` と `outline-offset` で描画します。これは box-shadow に依存したフォーカスリングではありません。押下中は `transform: scale(...)` により、軽いタクタイルシグナルを与えます。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途                 | トークン                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Primary 背景         | `--primary`                                                                               |
| Primary hover        | `--primary-hover`                                                                         |
| Primary 文字色       | `--on-primary`                                                                            |
| Secondary 背景       | `--bg-surface-2`                                                                          |
| Secondary hover 背景 | `--bg-fill-muted`                                                                         |
| Ghost hover 背景     | `--bg-hover`                                                                              |
| Danger 背景          | `--bg-danger-subtle`                                                                      |
| Danger 境界線        | `--border-danger`                                                                         |
| Danger 文字色        | `--danger`                                                                                |
| Danger hover 文字色  | `--on-danger`                                                                             |
| 既定境界線           | `--border-default`                                                                        |
| 既定文字色           | `--fg-default`                                                                            |
| 控えめ文字色         | `--fg-muted`                                                                              |
| 角丸                 | `--radius-md`                                                                             |
| 高さ                 | `--control-height-sm` / `--control-height-md` / `--control-height-lg`                     |
| 余白                 | `--space-*`                                                                               |
| アイコンサイズ       | `--icon-sm` / `--icon-base` / `--icon-md`                                                 |
| 影                   | `--elevation-sm` / `--elevation-md`                                                       |
| 遷移時間             | `--duration-fast`                                                                         |
| イージング           | `--ease-out`                                                                              |
| 押下スケール         | `--scale-pressed`                                                                         |
| フォーカスリング     | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、スピナーの回転アニメーションを停止します。button の transition 時間は極小化します。フォーカス時アニメーションも停止します。

### Dark Mode

`prefers-color-scheme: dark` 環境では、`secondary` に上端 inset shadow を追加し、暗背景上でエッジを読み取りやすくします。その他の色差はトークン差し替えで吸収します。

### Forced Colors

`forced-colors: active` 環境では、システムカラーを優先します。`Highlight`、`HighlightText`、`CanvasText` を使用し、box-shadow は除去します。`primary` と `danger` は独自色ではなくシステム色へフォールバックします。

`pressed` が定義される場合、Forced Colors でも `aria-pressed` と視覚差分の対応を維持します。`aria-selected` や独自 `.active` class には依存せず、内部 button に出力される `aria-pressed` を基準に状態差分を表現します。

### Print

`@media print` では `:host` 自体を非表示にします。`ui-button` は印刷時に意味を失うインタラクティブ要素であり、印刷対象に含めません。

---

## 関連契約

### 起動・フォームイベント契約

`ui-button` は独自の起動イベント名を公開しません。起動はネイティブ button の `click` を基準とし、必要に応じてフォーム送信またはリセットへ橋渡しします。

- ポインター操作による起動は内部 button の `click` に従います。
- Enter は `keydown` で起動します。
- Space は `keydown` で押下状態のみ記録し、`keyup` で起動します。
- `disabled=true` または `loading=true` の場合、起動しません。
- `type="button"` は追加副作用を持ちません。
- `type="submit"` かつフォーム関連付けありの場合、起動時に `requestSubmit()` を実行します。
- `type="reset"` かつフォーム関連付けありの場合、起動時に `reset()` を実行します。
- フォーム関連付けが存在しない場合、`submit` / `reset` の副作用は発生しません。

公開イベント面は button の通常起動に限定します。利用者は独自カスタムイベント、独自 detail payload、独自キャンセル契約を期待してはなりません（MUST NOT）。

起動の起点は内部 button ですが、利用者は `ui-button` を button 相当の起動主体として扱ってよいです。一方で、外部 click 監視とフォーム副作用の厳密な順序、または外部 `click` の `preventDefault()` による `submit` / `reset` 抑止には依存してはなりません。フォーム副作用の抑止が必要な場合は、`type="button"` を選ぶか、フォーム側の契約で制御します。

### フォーム関連付け契約

`ui-button` は Form Associated Custom Elements として実装されています。したがって、内部 button が Shadow DOM 内にあっても、フォーム送信およびリセットをコンポーネント外のフォームへ橋渡しできます。

| 条件                                     | 振る舞い                               |
| ---------------------------------------- | -------------------------------------- |
| `type="button"`                          | フォーム副作用を持ちません             |
| `type="submit"` かつフォーム関連付けあり | `requestSubmit()` を実行します         |
| `type="reset"` かつフォーム関連付けあり  | `reset()` を実行します                 |
| `form` 属性あり                          | フォーム外配置でも関連付けを維持します |
| 祖先フォームと `form` 属性が併存         | `form` 属性による明示指定を優先します  |
| `form` 属性が無効 ID                     | 外部フォーム所有者を持ちません         |

利用者はフォーム所有者決定を `ui-button` 独自規則ではなく、HTML 標準に準拠した関連付けとして扱います。

### スタイル拡張契約

`ui-button` は外部スタイル拡張を全面自由とはしません。公開するのは、CSS Custom Properties と `::part(...)` に限定される拡張面です。

| part 名   | 役割                  |
| --------- | --------------------- |
| `button`  | 内部ネイティブ button |
| `label`   | ラベル表示領域        |
| `spinner` | ローディング表示領域  |

利用者は `::part(button)`、`::part(label)`、`::part(spinner)` に対して装飾調整を行えます。ただし、意味を変更するための display 構造破壊やインタラクション破壊は行ってはなりません（MUST NOT）。

色、余白、寸法、フォーカス、モーションは CSS Custom Properties を通じて調整できます。これらはテーマ差し替えやブランド適用のための公開面です。

内部 class 名、状態 class、Shadow DOM 内部の細部構造は公開契約に含みません。たとえば `.variant-*`、`.size-*`、`.spinner-default`、`.pressed` などの内部識別子には依存してはなりません（MUST NOT）。将来変更時に互換性を保証しません。

### アクセシビリティ補助契約

`defineButtonA11yContract()` は、特に `iconOnly` と `ariaLabel` の組み合わせを型レベルで補助するための補助手段です。実行時強制ではなく、**利用側で不正な組み合わせを作りにくくするための補助契約**として位置付けます。

### 開発時警告契約

次の 2 点は開発時にのみ警告します。

- `iconOnly=true` かつ `aria-label` / `accessible-name` 欠落

### 開発時警告と本番時保証

これらの警告は開発時補助であり、実行時に例外を投げて停止する契約ではありません。本番時も描画自体は継続し得ますが、アクセシビリティまたは設計品質は損なわれます。したがって、運用品質は Storybook、レビュー、テストで補完しなければなりません。

---

## 境界条件

### 1. ラベルのみ

既定スロットにテキストのみを与えた場合、通常のボタンとして描画します。

### 2. アイコン + ラベル

既定スロットにアイコンとテキストを併置した場合、同一行に並べて描画します。アイコンにはボタンサイズに応じた寸法を適用します。

### 3. icon-only

`iconOnly=true` かつ `aria-label` あり、かつ既定スロットがアイコン単独入力である場合、正方形ボタンとして描画します。`aria-label` がない場合でも実装は描画を継続し得ますが、契約違反です。`iconOnly=true` でテキストを併置する構成も契約違反です。

### 4. `loading` と `disabled` の併存

`loading=true` の時点で内部 button は無条件に非活性化されます。`disabled=true` を同時に与えても追加差分はありません。操作不能である点は同じです。

### 5. フォーム未関連付け

`type="submit"` または `type="reset"` でも、フォーム関連付けが存在しない場合、フォーム副作用は発生しません。button 自体は描画を継続します。

### 6. `pressed` 未定義

`pressed` が未定義の場合、`aria-pressed` は出力されません。通常ボタンとして扱います。

### 7. `pressed` 定義時

`pressed` を定義した場合、`ui-button` は toggle button として扱います。ただし、状態更新は利用側責務であり、`ui-button` 自身は自動反転しません。

### 8. 可視ラベルと `ariaLabel` / `accessibleName`

可視テキストを持つ状態で `ariaLabel` を併用する構成はサポート対象外です。アクセシブル名の決定は可視ラベルに一本化します。可視ラベルとは独立した明示アクセシブル名が必要な wrapper だけが `accessibleName` を使用できます。

### 9. 印刷時

どの `variant`、`size`、`state` であっても、印刷時は非表示です。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                      | 固定する契約                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Default`                  | 既定 `variant` が `secondary`、既定 `type` が `button` であること                                       |
| `AllVariants`              | 5 つの視覚バリアントが存在すること                                                                      |
| `AllSizes`                 | `sm` / `md` を描画できること                                                                            |
| `Primary`                  | 主要操作用の強い視覚重量を持つこと                                                                      |
| `Outline`                  | `secondary` より軽い補助操作として成立すること                                                          |
| `Ghost`                    | 高密度 UI 向けの最小主張スタイルを持つこと                                                              |
| `Danger`                   | `danger` variant が受理されること                                                                       |
| `Loading`                  | `aria-busy="true"`、disabled 化、スピナー表示を行うこと                                                 |
| `Disabled`                 | disabled 状態で内部 button が不活性であること                                                           |
| `WithIcon`                 | アイコンとラベルを併置できること                                                                        |
| `IconOnly`                 | `iconOnly` と `aria-label` の組み合わせが成立すること                                                   |
| `FormSubmit`               | `type="submit"` が Enter / Space 操作でも送信されること                                                 |
| `FormReset`                | `type="reset"` がフォーム値を初期値へ戻すこと                                                           |
| `ExternalFormOwnerSubmit`  | `form` 属性によりフォーム外配置でも送信できること                                                       |
| `DialogExample`            | ダイアログ内のアクション優先度表現に使用できること                                                      |
| `ToolbarExample`           | `ghost` の icon-only が高密度 UI で成立すること                                                         |
| `CardExample`              | `outline` / `ghost` がカード内補助操作として成立すること                                                |
| `FocusState`               | 公開 `focus()` が内部 button に到達すること                                                             |
| `IconOnlyWithoutAriaLabel` | 契約違反例を明示できること                                                                              |
| `ForcedColorsMode`         | 強制カラー環境で構造が維持されること                                                                    |
| `DarkMode`                 | ダークモードで `secondary` の edge highlight を確認できること                                           |
| `ReducedMotion`            | reduced motion でアニメーションが抑制されること                                                         |
| `PrintStyles`              | 印刷時に非表示となること                                                                                |
| `PressedState`             | `pressed` と視覚差分および `aria-pressed` の対応が一致すること                                          |
| `AriaExpandedTrigger`      | `aria-expanded` / `aria-controls` / `aria-haspopup` / `aria-describedby` が内部 button に反映されること |

---

## 補足

`ui-button` の要点は、見た目のバリエーション数にあるのではありません。**button としての意味を失わずに、フォーム、状態、環境差分を吸収したうえで、アクション優先度の視覚秩序を維持すること**にあります。

したがって、今後の変更でも次の 4 点は崩さない方がよいです。

1. 実体は常にネイティブ `<button>` であること。
2. `type` の既定値は `button` として明示維持すること。
3. `iconOnly` とアクセシブル名の契約を緩めないこと。
4. `loading` を単なる装飾ではなく、操作抑止状態として扱うこと。

---

## 開発時警告と非強制項目

本コンポーネントは、公開契約のすべてを実行時例外で強制するわけではありません。次の項目は、**描画継続を優先しつつ、開発時警告と Storybook 契約で品質を担保する領域**として扱います。

### 1. `iconOnly` とアクセシブル名

`iconOnly=true` かつ `aria-label` / `accessible-name` 欠落は契約違反です。実装は開発時に警告しますが、描画停止や例外送出は行いません。

### 2. `ariaLabel` と `accessibleName` の利用範囲

`ariaLabel` は `iconOnly=true` の場合にのみサポートします。可視ラベルを持つ通常 button で `ariaLabel` が与えられた場合、実装は開発時に警告し、内部 button には反映しません。可視ラベルとは独立した明示アクセシブル名が必要な場合は `accessibleName` を使用します。

### 3. slot 内容の厳格強制

`iconOnly=true` でテキストを併置する構成は契約違反ですが、現時点では slot 内容を実行時に厳格検証しません。利用側は Storybook とレビューで契約を守らなければなりません。
