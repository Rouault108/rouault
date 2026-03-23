# Popover

## 概要

本書は、`ui-popover` の公開契約、状態モデル、アクセシビリティ、視覚契約、および移行方針を整理するものです。

`ui-popover` は、**anchor に対して content を一時的に配置するための非モーダル popover shell** です。`ui-popover` 自体は意味論付き overlay ではありません。すなわち、本コンポーネントの責務は、**配置**、**開閉**、**dismiss**、**trigger / content の関係維持**に限定し、`dialog`、`menu`、`tooltip`、`listbox` などの意味論は上位ラッパーまたは content 側契約へ分離します。

Rouault における popover は、本文の流れを断ち切るモーダルではなく、**読書の補助線として短く開き、短く閉じること**を前提に扱います。したがって、本コンポーネントの契約は、補足情報の可用性と、**「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 適用範囲

本書は、`ui-popover` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 現行実装との差分と移行方針

一方で、本書は次の事項を扱いません。

- `dialog`、`menu`、`tooltip`、`listbox` など role 固有の意味論およびキーボードモデル
- focus trap や modal dialog 相当の閉域制御
- link fallback を含む脚注・注釈・恒久リンクの情報設計
- popover 表示と遷移を併用する dual-access wrapper の契約
- `ui-info-popover`、`ui-footnote-popover`、`ui-annotation-popover` など上位 semantic wrapper の契約
- arrow 表現、キャレット表現、origin 表現、個別アニメーション演出の設計
- anchor 幅追従、幅ポリシー、再配置戦略など用途拡張向けの付加 API
- 複数 overlay の積層規則、dismiss controller、document 単位 style 供給基盤など overlay foundation の設計
- ルーティング、脚注遷移、タブ連動など上位レイヤの制御

これらは上位レイヤ、別コンポーネント、または別基盤の責務です。

---

## 公開契約

`ui-popover` は、**意味論を持たない shell** として扱います。内部実装は Lit、Floating UI、および Popover API を利用しても構いませんが、利用者が依存できるのは本書の公開契約だけです。

### 設計方針

`ui-popover` は次の方針に従います。

- content の既定 `role` を持ちません。
- 開状態は **controlled** と **uncontrolled** を分離して扱います。
- 起動主体は **anchored mode** と **controller mode** の 2 系統に分けて扱います。
- link fallback は shell 本体の責務に含めません。
- 公開イベントは、変更要求と変更結果を分離します。

### 入力契約

| 名前            | 種別                 | 必須   | 内容                    | 契約                                                                             |
| --------------- | -------------------- | ------ | ----------------------- | -------------------------------------------------------------------------------- |
| `variant`       | property / attribute | いいえ | 視覚バリアント          | `default` / `subtle` / `inverse`                                                 |
| `placement`     | property / attribute | いいえ | 配置位置                | Floating UI の `Placement` を受理します。既定値は `bottom-start` です            |
| `offset`        | property / attribute | いいえ | anchor からの距離       | 非負の有限数を受理します。既定値は `8`、負数は `0` に正規化します                |
| `opened`        | property / attribute | いいえ | controlled 開状態       | 外部制御の単一真実源です。`defaultOpened` と同時指定してはなりません（MUST NOT） |
| `defaultOpened` | property             | いいえ | uncontrolled 初期開状態 | 初期値としてのみ使用します。初期化後の単一真実源にはなりません                   |
| `disabled`      | property / attribute | いいえ | 不活性状態              | `true` の場合は新規に開かず、開状態なら閉じます                                  |

`variant` の既定値は `default` です。`placement` の既定値は `bottom-start` です。`offset` の既定値は `8` です。`opened`、`defaultOpened`、`disabled` の既定値は `false` です。

### 動作モード契約

`ui-popover` は次の 2 つの起動モードを持ちます。

| モード          | 契約                                                             |
| --------------- | ---------------------------------------------------------------- |
| anchored mode   | `slot="trigger"` に与えた trigger を唯一の起動主体として扱います |
| controller mode | `openForTrigger()` に渡した要素を明示的な起動主体として扱います  |

anchored mode が既定です。controller mode は共有 trigger や外部制御のための明示的モードであり、暗黙挙動として扱いません。

### スロット契約

| 名前      | 種別       | 位置づけ                 | 内容                                                    |
| --------- | ---------- | ------------------------ | ------------------------------------------------------- |
| `trigger` | named slot | anchored mode の正規入力 | 開閉起点となる単一の interactive element を受け取ります |
| `content` | named slot | 全モード共通の正規入力   | 浮遊表示される単一の HTMLElement を受け取ります         |

各スロットは **単一の `HTMLElement`** を正規入力とします。複数要素を同一スロットへ与える構成、またはテキストノードのみを与える構成は契約違反です。契約違反は、**開発環境では `console.warn` により顕在化しなければなりません（MUST）**。**本番環境では例外送出を既定挙動とせず、当該構成を no-op として扱います。**

本書における **interactive element** とは、少なくとも次のいずれかを満たす `HTMLElement` を指します。

- 有効な `button`
- `href` を持つ `a`
- 有効な form control（`input`、`select`、`textarea` など）
- 利用者が keyboard / pointer 起動責務を与え、`tabIndex >= 0` を持つ `HTMLElement`

`trigger` は interactive element でなければなりません（MUST）。`content` は全モードで必須です。anchored mode では `trigger` も必須です。controller mode では `slot="trigger"` を省略しても構いませんが、その場合は `openForTrigger()` 呼び出しごとに起動主体を明示しなければなりません（MUST）。

### 公開メソッド

`ui-popover` は、開閉を外部から制御するため、次の公開メソッドを持ちます。

| 名前                                | 種別   | 契約                                                                 |
| ----------------------------------- | ------ | -------------------------------------------------------------------- |
| `openForTrigger(trigger, options?)` | method | 指定 trigger を active trigger として開きます                        |
| `close(options?)`                   | method | `reason='programmatic'` で閉じます                                   |
| `toggleForTrigger(trigger?)`        | method | 解決された trigger を基準に、open / close または active trigger 切替を行います |

`openForTrigger()` は controller mode の正規 API です。anchored mode であっても、共有 trigger を明示的に扱う場合はこのメソッドを使用します。

#### `openForTrigger(trigger, options?)`

`trigger` は interactive element でなければなりません（MUST）。無効要素、切断済み要素、または interactive element でない要素が渡された場合、**開発環境では `console.warn` により顕在化し、本番環境では no-op** とします。

`openForTrigger()` は次のとおり振る舞います。

- 現在が closed である場合:
  - `reason='trigger'`、`nextOpen=true` の `ui-popover-open-change-request` を発火します。
  - request が受理された場合、open を成立させ、指定 trigger を active trigger に設定します。
- 現在が open であり、指定 trigger が現在の active trigger と同一である場合:
  - open 状態は変化しません。
  - `ui-popover-open-change-request` / `ui-popover-open-change` は再発火しません。
  - 必要であれば位置再計算だけを行って構いません。
- 現在が open であり、指定 trigger が現在の active trigger と異なる場合:
  - open 状態は維持したまま、active trigger を新しい trigger へ切り替えます。
  - `aria-expanded` と `aria-controls` は旧 active trigger から解除し、新 active trigger へ移管しなければなりません（MUST）。
  - この切替は open 真偽値の変更ではないため、`ui-popover-open-change-request` / `ui-popover-open-change` の発火対象に含めません。

#### `close(options?)`

`close(options?)` は `reason='programmatic'` による close を行います。`returnFocus` を省略した場合の既定値は `false` です。

- 現在が open である場合:
  - `reason='programmatic'`、`nextOpen=false` の `ui-popover-open-change-request` を発火します。
  - request が受理された場合、close を成立させます。
- 現在が closed である場合:
  - no-op とし、event は発火しません。

#### `toggleForTrigger(trigger?)`

`toggleForTrigger()` は `trigger` を省略した場合、anchored mode では owner trigger、controller mode では現在の active trigger を使用します。解決後の trigger が存在しない場合は、**開発環境では `console.warn`、本番環境では no-op** とします。

`toggleForTrigger()` は次のとおり振る舞います。

- 現在が closed である場合:
  - 解決された trigger を用いて `openForTrigger()` と同じ契約で開きます。
- 現在が open であり、解決された trigger が現在の active trigger と同一である場合:
  - `reason='trigger'` により閉じます。
  - `returnFocus` の既定値は `true` です。
- 現在が open であり、解決された trigger が現在の active trigger と異なる場合:
  - close は行わず、active trigger のみを切り替えます。
  - この切替は open 真偽値の変更ではないため、`ui-popover-open-change-request` / `ui-popover-open-change` の発火対象に含めません。

#### メソッド起点の `reason`

公開メソッド起点の `reason` は次のとおり固定します。

| 起点                                                        | `reason`         |
| ----------------------------------------------------------- | ---------------- |
| `openForTrigger()` による closed → open                     | `trigger`        |
| `toggleForTrigger()` による open → close                    | `trigger`        |
| `close()` による close                                      | `programmatic`   |
| `disabled=true` への遷移に伴う強制 close                    | `disabled`       |
| slot 差し替えにより必要要素を失った場合の close             | `slot-invalidated` |
| disconnect に伴う close                                     | `disconnected`   |

### trigger 所有権契約

`ui-popover` は、slot に与えられた **owner trigger** と、実際に現在 open 状態の責任主体となる **active trigger** を区別します。両者は同一であってもよく、controller mode では異なっても構いません。

この契約において、次を固定します。

- `aria-expanded="true"` は active trigger にのみ反映します。
- owner trigger と active trigger が異なる場合、owner trigger は展開中であっても `aria-expanded="false"` を維持します。
- close 後の focus return は owner trigger ではなく active trigger を基準とします。
- active trigger を持たない close は focus return を行いません。

### 公開イベント

`ui-popover` は、変更要求と変更結果を分離したイベントを発火します。すべて `bubbles: true` かつ `composed: true` です。

| 名前                             | cancelable | detail                                            | 契約                   |
| -------------------------------- | ---------- | ------------------------------------------------- | ---------------------- |
| `ui-popover-open-change-request` | はい       | `{ nextOpen, reason, trigger, content }`          | 状態変更前に発火します |
| `ui-popover-open-change`         | いいえ     | `{ open, reason, trigger, content, returnFocus }` | 状態変更後に発火します |

`reason` は少なくとも次を取ります。

- `trigger`
- `escape`
- `outside-pointer`
- `disabled`
- `slot-invalidated`
- `disconnected`
- `programmatic`

`ui-popover-open-change-request` が `preventDefault()` された場合、状態変更は成立しません。`ui-popover-open-change` は監視用イベントであり、制御点ではありません。

### 属性反映契約

| property    | attribute   | reflect | 備考                                            |
| ----------- | ----------- | ------- | ----------------------------------------------- |
| `variant`   | `variant`   | あり    | 列挙外値は `default` へ正規化します             |
| `placement` | `placement` | あり    | 無効値は `bottom-start` へ正規化します          |
| `offset`    | `offset`    | あり    | 非有限値は既定値、負数は `0` へ正規化します     |
| `opened`    | `opened`    | あり    | controlled モードでのみ単一真実源として扱います |
| `disabled`  | `disabled`  | あり    | boolean attribute として扱います                |

`defaultOpened` は初期化専用 property です。属性反映の安定契約に含めません。

### 属性所有権契約

content および trigger に対する属性所有権は次のとおりです。

| 区分               | 属性                                                                                    | 契約                                                                         |
| ------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| コンポーネント専有 | `popover` / `hidden` / `data-open` / `data-variant` / `aria-expanded` / `aria-controls` | 表示制御と shell 状態のためにコンポーネントが管理します                      |
| 利用者専有         | `role` / `aria-modal` / `aria-labelledby` / `aria-describedby`                          | 意味論は利用者または上位ラッパーが管理します                                 |
| 共有               | `id`                                                                                    | 未指定時はコンポーネントが自動採番し、利用者指定がある場合はそれを尊重します |

`popover`、`hidden`、`data-open` など表示制御系属性はコンポーネント専有とします。利用者はこれらへ安定依存してはなりません（MUST NOT）。`role` と関連 ARIA は shell 本体の責務に含めません。

### 列挙外値・無効値の扱い

`variant` に列挙外値を与えた場合、`default` に正規化します。`placement` に無効値を与えた場合、`bottom-start` に正規化します。`offset` が非有限値である場合は既定値 `8` に、負数である場合は `0` に正規化します。

利用者は、列挙外値や無効値に依存してはなりません（MUST NOT）。

### 責務範囲

責務範囲には、anchor と content の関係維持、開閉状態の管理、Floating UI による位置計算、Popover API と fallback の吸収、最低限の ARIA 反映、および環境別スタイルの提供を含みます。

一方で、次は責務に含めません。

- 既定 `role` の提供
- role 固有のキーボードモデル
- focus trap
- link fallback
- arrow 描画
- 複数 overlay の競合解決

---

## 状態モデル

`ui-popover` の主要状態は、**開いているか**だけでなく、**制御モード**、**起動モード**、**どの trigger が active か**、**Popover API を使うか fallback を使うか**によって読み分けます。

### anchored mode / controller mode

anchored mode では slot trigger が唯一の起動主体です。controller mode では `openForTrigger()` に渡した要素が起動主体です。shared trigger を扱う場合は controller mode として読みます。

### controlled / uncontrolled

controlled モードでは `opened` が単一真実源です。内部状態は `opened` を直接上書きしません。状態変更が必要な場合は `ui-popover-open-change-request` を発火し、外部が `opened` を更新して確定します。

uncontrolled モードでは `defaultOpened` を初期値として内部状態を持ちます。以後の単一真実源は内部状態です。

### 開状態 / 閉状態

内部状態は `open` / `closed` の 2 状態です。必要要素が欠ける場合や `disabled=true` になった場合は、`open` を維持しません。

### active trigger 状態

`ui-popover` は現在の起動主体を `active trigger` として持ちます。`aria-expanded="true"` は active trigger にのみ反映します。共有 trigger 運用では、owner trigger と active trigger を同時に展開状態へしてはなりません（MUST NOT）。active trigger が切り替わる場合、旧 active trigger に残っていた `aria-expanded` と `aria-controls` は解除し、新 active trigger へ同一状態更新として移管しなければなりません（MUST）。

### dismiss reason 状態

close には reason を持ちます。少なくとも、`trigger`、`escape`、`outside-pointer`、`disabled`、`slot-invalidated`、`disconnected`、`programmatic` を区別します。

`returnFocus` の既定値は reason によって決まります。

| reason             | 既定 `returnFocus`                 |
| ------------------ | ---------------------------------- |
| `trigger`          | `true`                             |
| `escape`           | `true`                             |
| `outside-pointer`  | `false`                            |
| `disabled`         | `false`                            |
| `slot-invalidated` | `false`                            |
| `disconnected`     | `false`                            |
| `programmatic`     | 呼び出し側指定。未指定時は `false` |

### Popover API 状態

Popover API 対応環境では、content に `popover` を付与し、`showPopover()` / `hidePopover()` を使用します。Popover API 非対応環境では `hidden` と `data-open` を用いて表示状態を管理します。

outside dismiss の等価性は完全一致を保証しません。本コンポーネントが保証する最小契約は、**outside primary pointer 相当で閉じること**です。

### disabled 状態

`disabled=true` の場合、新規 open は成立しません。すでに開いている場合は `reason='disabled'` で close します。

### slot 再同期状態

`ui-popover` は、初期接続時だけでなく、slot 内容の差し替え後も trigger / content の参照を再同期します。必要要素が欠けた場合、`reason='slot-invalidated'` で close します。

### focus モデル

shell 契約として、open 時に focus を content へ自動移動しません。focus 初期配置が必要な場合は、上位ラッパーまたは content 側契約で扱います。close 後の focus return は active trigger と `returnFocus` に従います。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部には 2 つの slot のみを持ちます。表示される trigger と content は light DOM 側の実要素です。

```text
<ui-popover>
  #shadow-root
    <slot name="trigger"></slot>
    <slot name="content"></slot>
</ui-popover>
```

content は shadow 内に複製されません。

### グローバル副作用契約

`ui-popover` は Shadow DOM 内だけでは完結しません。表示に必要な style は document 単位で供給します。本書の公開契約は、必要なスタイル供給が document 単位で存在することまでを固定し、注入方式や所有主体などの実装詳細は固定しません。

公開契約として固定するのは次の点だけです。

- shell の見た目は Shadow DOM 内だけでは完結しません。
- document 単位のスタイル供給が必要です。
- style 注入の具体的な実装方式は公開契約に含めません。

### Trigger semantics

trigger 要素には次を反映します。

- `aria-expanded`
- `aria-controls`

`aria-haspopup` は shell 本体の既定契約に含めません。popup の意味論が必要な場合は上位ラッパーが付与します。

### Content semantics

content 要素には次を反映します。

- `data-open`
- `data-variant`
- `popover` または `hidden`

`role` と関連 ARIA は content 側の意味論契約に含めます。`ui-popover` は既定 `role` を提供しません。

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- trigger の対話主体は、利用者が供給した interactive element です。本書における interactive element は、`button`、`a[href]`、有効な form control、または利用者が keyboard 起動責務を与えた `tabIndex >= 0` の `HTMLElement` を指します。
- `aria-expanded` は active trigger にのみ反映します。owner trigger と active trigger が異なる場合、owner trigger は `aria-expanded="false"` を維持します。
- `aria-controls` は active trigger から current content の `id` を参照しなければなりません（MUST）。content に `id` が存在しない場合は、コンポーネントが安定した `id` を補います。
- content 要素の差し替え、content `id` の変化、または active trigger の切替が起きた場合、`aria-controls` の参照先は同一状態更新で再同期しなければなりません（MUST）。旧 active trigger に `aria-controls` が残留してはなりません（MUST NOT）。
- open 時に focus を content へ自動移動しません。
- focus trap は提供しません。
- `Escape` による close は、open 中に同一 `Document` 上で発生した未修飾 `keydown` を監視して提供します。`event.key === 'Escape'` かつ `event.defaultPrevented === false` の場合、`reason='escape'` の close 要求を行います。
- content 内部の widget 等が `Escape` を独自処理したい場合は、当該 `keydown` を `preventDefault()` することで shell dismiss を抑止できます。
- close 後のフォーカス復帰は `reason` と `returnFocus` に従います。

本コンポーネントで重要なのは、**popover 自身が対話主体ではなく、anchor / content 関係を補助すること**です。意味論付き popup を必要とする場合は、上位ラッパーで role と keyboard model を別途与えなければなりません（MUST）。

---

## Visual Contract

`ui-popover` の視覚契約は、補足情報を**本文より一段だけ強い面**として浮かせることにあります。モーダルのような遮断感は持たせず、本文近傍に短時間現れる補助面として扱います。

### 情報順位

- `default` は標準的な補足面です。
- `subtle` は注記や軽い説明向けの控えめな面です。
- `inverse` は暗い面で強めの区別を与えます。

本文、見出し、脚注近傍では、popover は本文を上書きする主役ではありません。したがって、背景、影、境界線、アニメーションは、可視性を確保しつつも過剰な主張を避けます。

### レイアウト

content は **viewport 基準の浮遊面** として anchor 近傍へ配置します。配置方向は `placement` に従い、viewport 端では反転または押し戻しにより表示領域外への逸脱を避けなければなりません（MUST）。最大幅と最大高は公開トークンにより調整可能でなければならず、長文 content でも viewport を越えて表示不能になってはなりません（MUST NOT）。縦方向 overflow は scroll 可能でなければなりません。

### 開閉表示

開状態では、content は視認可能かつ操作可能でなければなりません（MUST）。閉状態では、content は視認不可であり、pointer hit target およびキーボードフォーカス移動対象として機能してはなりません（MUST NOT）。実装は `opacity`、`transform`、`visibility`、`hidden`、Popover API など任意の手段を使用して構いませんが、具体的な CSS 値は公開契約に含めません。遷移を設ける場合、その長さは短く、読書のテンポを阻害しない範囲に固定します。

### Trigger 視覚状態

active trigger には背景と小さな角丸を与えます。ただし、この active 表現は trigger の可用性を補助する範囲にとどめ、selected/current のような恒常状態表現には昇格させません。

### 視覚仕様

- `default` は明るい面、通常境界線、既定文字色、比較的強い shadow を持ちます。
- `subtle` は軽い背景、控えめな文字色、薄い境界線、弱めの shadow を持ちます。
- `inverse` は暗い背景、明るい文字色、暗背景上でも識別できる境界線を持ちます。

### 参照トークン

本コンポーネントは主として次のトークンに依存します。

| 用途                | トークン                            |
| ------------------- | ----------------------------------- |
| z-index             | `--z-popover`                       |
| 最大幅              | `--ui-popover-max-width`            |
| 最大高              | `--ui-popover-max-height`           |
| 余白                | `--ui-popover-padding`              |
| 境界線幅            | `--border-width`                    |
| 既定境界線          | `--border-default`                  |
| 控えめ境界線        | `--border-ghost`                    |
| 既定背景            | `--bg-surface-2`                    |
| subtle 背景         | `--bg-fill-neutral`                 |
| active trigger 背景 | `--bg-active`                       |
| 既定文字色          | `--fg-default`                      |
| 控えめ文字色        | `--fg-muted`                        |
| inverse 背景参照    | `--fg-default`                      |
| inverse 文字色参照  | `--bg-default`                      |
| 角丸                | `--radius-md` / `--radius-sm`       |
| 影                  | `--elevation-md` / `--elevation-lg` |
| 行送り              | `--line-height-relaxed`             |
| 遷移時間            | `--duration-fast`                   |
| 即時時間            | `--duration-instant`                |
| イージング          | `--ease-out` / `--ease-in`          |
| 間隔                | `--space-3` / `--space-4`           |

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、transform アニメーションを停止し、transition duration を即時に近い値へ落とします。

### Dark Mode

専用の dark mode CSS 分岐は持ちません。dark mode はトークン差し替えと `inverse` variant により吸収します。したがって、暗背景下でも `default` と `inverse` が識別可能でなければなりません（MUST）。

### Forced Colors

`forced-colors: active` 環境では、content は system color にフォールバックし、背景・文字色・境界線が識別可能でなければなりません（MUST）。shadow は除去します。trigger は link 風表現へ固定せず、**テキスト可読性、focus indicator、active 状態の識別**が system color 上で失われないことを契約とします。

### Print

`@media print` では content を非表示にします。popover は印刷対象の常設情報ではなく、一時的な補足表示であるためです。

---

## 関連契約

### 起動契約

primary click のみを open / close 契約対象とします。修飾キー付き click、中 click、その他の click は open / close の正規起動として扱いません。したがって、それらを `preventDefault()` してはなりません。

### Link fallback 非採用方針

link fallback は shell 本体の責務に含めません。**「表示できれば popover、できなければ遷移」** という二重アクセスが必要な場合は、別ラッパーコンポーネントで定義します。

### 位置計算契約

位置計算は Floating UI に委ねます。戦略は `fixed` です。middleware は offset、flip、shift を使用し、viewport edge padding は `8px` です。利用者は、content を通常フロー内要素として扱ってはなりません（MUST NOT）。

### Outside close 契約

Popover API 対応環境では、outside interaction による close は UA と Popover API の振る舞いに委ねます。非対応環境では、fallback により close を再現します。

本契約が保証するのは **outside primary pointer 相当で閉じること** までであり、環境間の完全等価性は保証しません。

### スタイル拡張契約

`ui-popover` は `::part(...)` を公開しません。表示面は light DOM 側の実要素であるため、拡張面は主として CSS Custom Properties と、利用者が供給する trigger / content 自体のスタイルに限定されます。

### 公開スタイル面と非公開スタイル面の境界

本コンポーネントにおける公開スタイル面は、次に限定します。

- CSS Custom Properties
- `variant`、`placement`、`offset`、`opened`、`disabled` による意味上の状態差分
- `aria-*`、`popover`、`hidden` など意味契約に含まれる属性

一方で、次は非公開スタイル面として扱います。

- `data-open`
- `data-variant`
- 実装内部の class 名、selector、document 単位スタイル供給の詳細構造

非公開スタイル面は実装識別子であり、外部から安定依存してはなりません（MUST NOT）。

---

## 境界条件

### anchored mode で trigger あり / content あり

正規構成です。click で開閉し、`aria-controls` と `content.id` が一致します。

### anchored mode で trigger なし

popover は成立しません。anchored mode として開いてはなりません（MUST NOT）。

### controller mode で trigger slot なし

正規構成です。ただし、`openForTrigger()` 呼び出し時に active trigger を毎回明示しなければなりません（MUST）。

### content なし

全モードで不正構成です。open は成立しません。

### invalid `variant`

列挙外の `variant` は `default` へ正規化します。

### invalid `placement`

無効な `placement` は `bottom-start` へ正規化します。

### invalid `offset`

負数は `0`、非有限値は既定値 `8` に正規化します。

### disabled 中の click

`disabled=true` では click に反応してはなりません。すでに開いている場合は `reason='disabled'` で close します。

### shared trigger

`openForTrigger()` により slot 外 trigger を active trigger にできます。このとき、active trigger の `aria-expanded` は `true`、owner trigger の `aria-expanded` は `false` を維持します。

### open 中に同一 trigger へ `openForTrigger()`

現在が open であり、指定 trigger が現在の active trigger と同一である場合、open 状態は変化しません。`ui-popover-open-change-request` / `ui-popover-open-change` は再発火しません。必要であれば位置再計算だけを行って構いません。

### open 中に別 trigger へ `openForTrigger()`

現在が open であり、指定 trigger が現在の active trigger と異なる場合、close は行いません。open 状態を維持したまま active trigger を切り替え、`aria-expanded` と `aria-controls` を新しい trigger へ移管します。この切替は open 真偽値の変更ではないため、`ui-popover-open-change-request` / `ui-popover-open-change` の発火対象に含めません。

### 無効な trigger を渡した `openForTrigger()` / `toggleForTrigger()`

無効要素、切断済み要素、または interactive element でない要素が渡された場合、開発環境では `console.warn` により顕在化し、本番環境では no-op とします。例外送出は既定契約に含めません。

### `opened` と `defaultOpened` の同時指定

契約違反です。開発環境では `console.warn` により顕在化しなければなりません（MUST）。本番環境では `opened` を優先し、`defaultOpened` は無視します。例外送出は既定契約に含めません。

### reconnect

再接続後は slot 同期と listener 再接続により、以後の open / close が再び成立しなければなりません（MUST）。disconnect 自体は `reason='disconnected'` の close として扱います。

### 長文 content

content は `overflow-y: auto` と `max-height` により、viewport を超える場合でも表示不能になってはなりません（MUST NOT）。

### 初期非表示

初期状態では content は非表示でなければなりません（MUST）。Popover API 対応環境では `:popover-open` 不成立、非対応環境では `hidden=true` により非表示を表現します。

### 複数 slot 子要素

同一スロットへ複数要素を与える構成は契約違反です。静かな先頭採用へ依存してはなりません（MUST NOT）。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、少なくとも次の確認点を維持します。

| 確認点                     | 固定する契約                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 基本開閉                   | anchored mode の open / close、`aria-controls`、`aria-expanded` が成立すること                                 |
| request cancel             | `ui-popover-open-change-request` を `preventDefault()` した場合、内部状態、属性反映、`aria-*` が変化しないこと |
| 制御モデル                 | controlled / uncontrolled が分離して振る舞うこと                                                               |
| dismiss reason             | `escape`、`outside-pointer`、`disabled`、`programmatic` が区別されること                                       |
| 公開メソッド冪等性         | open 状態で同一 trigger へ `openForTrigger()` を再度呼んでも no-op であり、event が再発火しないこと           |
| active trigger 切替        | open 中に別 trigger へ切り替えた場合、open を維持したまま `aria-expanded` / `aria-controls` が移管されること  |
| shared trigger             | owner trigger / active trigger の責務分離と focus return 先が成立すること                                      |
| controller mode            | trigger slot なし構成でも `openForTrigger()` / `close()` / focus return が契約どおり成立すること              |
| slot 再同期                | slot 差し替え時に参照再同期が行われ、必要要素喪失時は `reason='slot-invalidated'` で close すること            |
| event 順序                 | 状態変更が成立する場合は request → change の順で発火し、拒否時は request のみで終わること                     |
| reconnect                  | reconnect 後に open / close が再び成立し、controller mode の active trigger を暗黙に owner trigger へ巻き戻さないこと |
| 境界条件                   | invalid 値正規化、要素欠如時の非起動、長文 content 境界、単一要素制約が成立すること                            |
| 環境差分                   | Reduced Motion / Forced Colors / Print が成立すること                                                          |
| visual variant             | `default` / `subtle` / `inverse` の差分が維持されること                                                        |

---

## 補足

`ui-popover` の要点は、anchor と content の関係を崩さず、環境差を吸収しつつ、本文の近くで静かに補足を提示することにあります。したがって、今後の変更でも次の方針は維持しなければなりません（MUST）。

1. `ui-popover` は意味論を持たない shell として維持すること。
2. controlled / uncontrolled を混在させないこと。
3. anchored mode / controller mode を正式な起動モードとして維持すること。
4. role と keyboard model は shell 本体へ持ち込まないこと。
5. link fallback、dual-access、脚注・注釈固有の情報設計は別ラッパーの責務として維持すること。
6. overlay stack、dismiss controller、document 単位 style 供給基盤は shell 本体へ抱え込まず、必要であれば別基盤で扱うこと。
7. active state を本文上の恒常状態表示へ転用しないこと。

要するに、本コンポーネントで増やしてよいのは **anchor / content 関係の維持、開閉、dismiss、最小限の状態反映** に直接必要な契約だけです。意味論、遷移設計、基盤化、用途拡張は、`ui-popover` 本体ではなく別責務として扱います。

---

## 現行実装との差分と移行方針

本節は、設計のきれいさと保守性を優先して本書で確定した契約と、現行の `popover.ts` / `popover.stories.ts` との主要差分を整理するものです。

### 移行の判断基準

差分を実装へ反映する際は、次の基準で優先順位を決めます。

- **契約の基準面を先に固定すること**
- **外部 API を分岐させる変更を先に行うこと**
- **意味論と状態管理の混線を先にほどくこと**
- **見た目だけの差分より、責務境界の差分を優先すること**
- **後続変更の前提になるものを先に行うこと**

この基準に従うと、移行は単純な番号順ではなく、**基盤整理 → API 整理 → 派生切り出し**の順で進めるのが最も整います。

### 優先順位

#### 優先度 A: 先に固定しなければならない差分

これらは他の差分の前提であり、後回しにすると API、Storybook、実装の全てで二重管理が発生します。

1. **制御モデルの分離**
   - `opened` と `defaultOpened` の役割を分離します。
   - controlled 時に内部から `opened` を書き換えないようにします。
   - request event を導入し、状態確定の責務を外部へ返します。

2. **イベントモデルの再定義**
   - request / result の二段イベントへ整理します。
   - `reason` を安定 detail に昇格します。
   - 既存の `ui-popover-toggle` / `ui-popover-opened` / `ui-popover-closed` は互換レイヤとして一時維持する場合でも、中心契約から外します。

3. **shell 既定意味論の除去**
   - content への既定 `role="dialog"` と `aria-modal="false"` を廃止します。
   - trigger への既定 `aria-haspopup="dialog"` も廃止します。
   - `ui-popover` を意味論なし shell として固定します。

この 3 点は同一変更群として扱うとして扱います。理由は、**状態変更 API、イベント、意味論**が同時に更新されないと、利用者から見たコンポーネント像が中途半端になるためです。

#### 優先度 B: A の直後に追随させる差分

これらは A の方針が固まれば自然に整理でき、放置すると内部実装だけが旧設計を引きずります。

4. **単一要素制約の強制**
   - 複数 slot 子要素を warning または例外で顕在化します。
   - 静かな先頭採用を縮退させます。

5. **trigger モデルの明示化**
   - anchored mode / controller mode を実装上も読み分けられるようにします。
   - owner trigger / active trigger の責務境界をコード上でも明確化します。
   - 現在は任意の `HTMLElement` に click listener を付与できるため、trigger 入力を interactive element へ厳格化します。
   - slot 再同期や再接続後に controller mode の active trigger が owner trigger へ暗黙に巻き戻らないようにします。

6. **outside dismiss の保証範囲の固定**
   - fallback 実装は最小保証に絞ります。
   - 環境間完全等価を目指すコードを shell 側へ持ち込み過ぎないようにします。

この変更群は、A のあとに着手することで、**状態管理と責務境界に整合した挙動整理**として実装できます。

#### 優先度 C: 別コンポーネントまたは基盤へ切り出す差分

これらは shell 単体で抱え続けるより、別責務へ分離した方が長期保守に有利です。

7. **link fallback の切り出し**
   - `keepLinkFallback` は非推奨化し、脚注・注釈・恒久リンク用ラッパーへ移します。
   - `ui-popover` 本体はリンク遷移契約を持たないようにします。

8. **document スタイル供給の基盤化**
   - document 単位 style 注入を overlay foundation または stylesheet provider へ移します。
   - `ui-popover` 本体は「style 供給が必要」という事実だけを契約に残します。

この変更群は重要ですが、A と B を先に整理してからの方が、切り出し先の責務が明瞭になります。

### 推奨実装順序

実装順序は次の 4 段階に整理するとよいです。

#### 第1段階: API の骨格を更新する

- controlled / uncontrolled の分離
- request / result event の導入
- `reason` の導入
- 既定 `role` の除去

#### 第2段階: 入力と状態遷移を厳格化する

- 単一要素制約の強制
- anchored mode / controller mode の明示化
- owner trigger / active trigger の整理
- `returnFocus` の既定値を reason ごとに固定

#### 第3段階: shell から余分な責務を外す

- `keepLinkFallback` の非推奨化
- link fallback 用 wrapper の準備
- outside dismiss の最小保証化

#### 第4段階: 基盤へ寄せる

- document スタイル供給の切り出し
- overlay foundation との責務境界の固定

### 一括で変更するべき単位

差分は個別にばらばらに反映するより、次の単位でまとめて変更するとして扱います。

| 変更単位     | 含める項目                                        |
| ------------ | ------------------------------------------------- |
| API 再設計   | 制御モデル、イベントモデル、reason、既定意味論    |
| 入力厳格化   | 単一要素制約、trigger モード、active trigger 契約 |
| 責務切り出し | link fallback、outside dismiss の保証範囲         |
| 基盤分離     | document スタイル供給、overlay foundation 連携    |

とくに **API 再設計** と **入力厳格化** は同一マイルストーンで扱う方が望ましいです。これらを分離すると、Storybook と利用側コードが一時的に二重仕様になります。

### 今すぐやらない方がよい変更

次の変更は、見た目の改善余地があっても優先しません。

- arrow / origin 表現の追加
- 複雑な shared trigger ヘルパー API の追加
- role ごとのキーボードモデルの本体内実装
- overlay 間の高度なスタック調停

これらは shell 契約を安定化した後でなければ、責務を再び混線させます。

### 受け入れ条件

各段階の変更は、少なくとも次を満たしたときに完了とみなします。

- 契約書の該当章が更新されていること
- Storybook が新契約の確認点に置き換わっていること
- 旧契約に依存する API が明示的に非推奨化または削除されていること
- 実装が新契約と矛盾しないこと

この受け入れ条件を満たさない変更は、部分修正であっても移行完了とはみなしません。

### 個別差分と移行方針

#### shell 既定意味論

本書では、`ui-popover` を意味論を持たない shell として定義しました。したがって、content への既定 `role="dialog"` と `aria-modal="false"`、および trigger への既定 `aria-haspopup="dialog"` は長期契約に含めません。

**移行方針**：既定 role / `aria-modal` / `aria-haspopup` の付与は削除し、必要な意味論は semantic wrapper へ移します。

#### 制御モデル

本書では、controlled と uncontrolled を分離し、`opened` と `defaultOpened` を両立させない方針にしました。

**移行方針**：内部から `opened` を直接書き換える設計をやめ、controlled 時は request event を経由させます。

#### イベントモデル

本書では、変更要求イベントと変更結果イベントを分離しました。

**移行方針**：既存の `ui-popover-toggle` / `ui-popover-opened` / `ui-popover-closed` は互換期間を設けて段階的に縮退し、`ui-popover-open-change-request` / `ui-popover-open-change` へ寄せます。現行 detail には `reason` が含まれないため、監視系の利用側は reason 非依存へいったん寄せた上で、新 detail へ移行します。

#### link fallback

本書では、link fallback を shell 本体の責務から外しました。

**移行方針**：`keepLinkFallback` は非推奨とし、脚注・注釈・恒久リンク用ラッパーへ切り出します。

#### 単一要素制約

本書では、同一スロットへの複数要素入力を契約違反として明示しました。

**移行方針**：静かな先頭採用をやめ、開発時 warning または例外を追加します。あわせて、trigger は任意 `HTMLElement` ではなく interactive element を正規入力として扱う方向へ寄せます。

#### document スタイル供給

本書では、document 単位スタイル供給の必要性は公開契約に残しつつ、具体的注入方式は long-term contract から外しました。

**移行方針**：段階的に overlay foundation または stylesheet provider へ責務を移します。現行実装はグローバル `document.head` へ singleton style を直接注入しており、`ownerDocument` 単位の分離、cleanup、ref-count は持ちません。これらは基盤側へ寄せて明確化します。

#### outside dismiss の保証範囲

本書では、環境間の完全等価ではなく、outside primary pointer 相当までを最小保証としました。

**移行方針**：fallback 実装はこの最小保証を満たすことを優先し、それ以上の厳密等価は overlay 基盤側で扱います。

#### `popover` 属性所有権

本書では、`popover` を表示制御系のコンポーネント専有属性として扱いました。

**移行方針**：現行実装は利用者が事前に与えた `popover="manual"` / `popover="auto"` を温存しますが、長期的には ownership を整理し、shell 本体が管理する属性として明確化します。必要であれば manual 運用は別 wrapper または別モードへ分離します。

#### controller mode 再接続時の active trigger 維持

本書では、controller mode を anchored mode とは独立した正規モードとして定義しました。

**移行方針**：現行実装は slot 再同期時に `opened=true` かつ `_openState=false` の場合、owner trigger を基準に reopen するため、controller mode の外部 active trigger を保持しません。長期的には、controller mode の active trigger を暗黙に owner trigger へ巻き戻さないように整理します。

### 本節の扱い

本節の差分は、単なる TODO ではありません。`ui-popover` を長期的に **意味論を持たない shell** として保つための移行境界です。実装、Storybook、契約書は、この方針に沿って同時に更新しなければなりません（MUST）。
