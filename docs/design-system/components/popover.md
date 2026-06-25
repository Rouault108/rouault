# Popover

## 概要

本書は、`ui-popover`の公開契約、状態モデル、アクセシビリティ、視覚契約、および移行方針を整理するものです。

`ui-popover`は、**anchorに対してcontentを一時的に配置するための非モーダルpopover shell** です。`ui-popover`自体は意味論付きoverlayではありません。すなわち、本コンポーネントの責務は、**配置**、**開閉**、**dismiss**、**trigger / contentの関係維持**に限定し、`dialog`、`menu`、`tooltip`、`listbox`などの意味論は上位ラッパーまたはcontent側契約へ分離します。

Rouaultにおけるpopoverは、本文の流れを断ち切るモーダルではなく、**読書の補助線として短く開き、短く閉じること**を前提に扱います。したがって、本コンポーネントの契約は、補足情報の可用性と、**「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 適用範囲

本書は、`ui-popover`の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook契約
- 現行実装との差分と移行方針

一方で、本書は次の事項を扱いません。

- `dialog`、`menu`、`tooltip`、`listbox`などrole固有の意味論およびキーボードモデル
- focus trapやmodal dialog相当の閉域制御
- link fallbackを含む脚注・注釈・恒久リンクの情報設計
- popover表示と遷移を併用するdual-access wrapperの契約
- `ui-info-popover`、`ui-footnote-popover`、`ui-annotation-popover`など上位semantic wrapperの契約
- arrow表現、キャレット表現、origin表現、個別アニメーション演出の設計
- anchor幅追従、幅ポリシー、再配置戦略など用途拡張向けの付加API
- 複数overlayの積層規則、dismiss controller、document単位style供給基盤などoverlay foundationの設計
- ルーティング、脚注遷移、タブ連動など上位レイヤの制御

これらは上位レイヤ、別コンポーネント、または別基盤の責務です。

---

## 公開契約

`ui-popover`は、**意味論を持たないshell** として扱います。内部実装はLit、Floating UI、およびPopover APIを利用しても構いませんが、利用者が依存できるのは本書の公開契約だけです。

### 設計方針

`ui-popover`は次の方針に従います。

- contentの既定`role`を持ちません。
- 開状態は **controlled** と **uncontrolled** を分離して扱います。
- 起動主体は **anchored mode** と **controller mode** の2系統に分けて扱います。
- link fallbackはshell本体の責務に含めません。
- 公開イベントは、変更要求と変更結果を分離します。

### 入力契約

| 名前            | 種別                 | 必須   | 内容                    | 契約                                                                             |
| --------------- | -------------------- | ------ | ----------------------- | -------------------------------------------------------------------------------- |
| `variant`       | property / attribute | いいえ | 視覚バリアント          | `default` / `subtle` / `inverse`                                                 |
| `placement`     | property / attribute | いいえ | 配置位置                | Floating UIの`Placement`を受理します。既定値は`bottom-start`です            |
| `offset`        | property / attribute | いいえ | anchorからの距離       | 非負の有限数を受理します。既定値は`8`、負数は`0`に正規化します                |
| `opened`        | property / attribute | いいえ | controlled開状態       | 外部制御の単一真実源です。`defaultOpened`と同時指定してはなりません（MUST NOT） |
| `defaultOpened` | property             | いいえ | uncontrolled初期開状態 | 初期値としてのみ使用します。初期化後の単一真実源にはなりません                   |
| `disabled`      | property / attribute | いいえ | 不活性状態              | `true`の場合は新規に開かず、開状態なら閉じます                                  |

`variant`の既定値は`default`です。`placement`の既定値は`bottom-start`です。`offset`の既定値は`8`です。`opened`、`defaultOpened`、`disabled`の既定値は`false`です。

### 動作モード契約

`ui-popover`は次の2つの起動モードを持ちます。

| モード          | 契約                                                             |
| --------------- | ---------------------------------------------------------------- |
| anchored mode   | `slot="trigger"`に与えたtriggerを唯一の起動主体として扱います |
| controller mode | `openForTrigger()`に渡した要素を明示的な起動主体として扱います  |

anchored modeが既定です。controller modeは共有triggerや外部制御のための明示的モードであり、暗黙挙動として扱いません。

### スロット契約

| 名前      | 種別       | 位置づけ                 | 内容                                                    |
| --------- | ---------- | ------------------------ | ------------------------------------------------------- |
| `trigger` | named slot | anchored modeの正規入力 | 開閉起点となる単一のinteractive elementを受け取ります |
| `content` | named slot | 全モード共通の正規入力   | 浮遊表示される単一のHTMLElementを受け取ります         |

各スロットは **単一の`HTMLElement`** を正規入力とします。複数要素を同一スロットへ与える構成、またはテキストノードのみを与える構成は契約違反です。契約違反は、**開発環境では`console.warn`により顕在化しなければなりません（MUST）**。**本番環境では例外送出を既定挙動とせず、当該構成をno-opとして扱います。**

本書における **interactive element** とは、少なくとも次のいずれかを満たす`HTMLElement`を指します。

- 有効な`button`
- `href`を持つ`a`
- 有効なform control（`input`、`select`、`textarea`など）
- 利用者がkeyboard / pointer起動責務を与え、`tabIndex >= 0`を持つ`HTMLElement`

`trigger`はinteractive elementでなければなりません（MUST）。`content`は全モードで必須です。anchored modeでは`trigger`も必須です。controller modeでは`slot="trigger"`を省略しても構いませんが、その場合は`openForTrigger()`呼び出しごとに起動主体を明示しなければなりません（MUST）。

### 公開メソッド

`ui-popover`は、開閉を外部から制御するため、次の公開メソッドを持ちます。

| 名前                                | 種別   | 契約                                                                           |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `openForTrigger(trigger, options?)` | method | 指定triggerをactive triggerとして開きます                                  |
| `close(options?)`                   | method | `reason='programmatic'`で閉じます                                             |
| `toggleForTrigger(trigger?)`        | method | 解決されたtriggerを基準に、open / closeまたはactive trigger切替を行います |

`openForTrigger()`はcontroller modeの正規APIです。anchored modeであっても、共有triggerを明示的に扱う場合はこのメソッドを使用します。

#### `openForTrigger(trigger, options?)`

`trigger`はinteractive elementでなければなりません（MUST）。無効要素、切断済み要素、またはinteractive elementでない要素が渡された場合、**開発環境では`console.warn`により顕在化し、本番環境ではno-op** とします。

`openForTrigger()`は次のとおり振る舞います。

- 現在がclosedである場合:
  - `reason='trigger'`、`nextOpen=true`の`ui-popover-open-change-request`を発火します。
  - requestが受理された場合、openを成立させ、指定triggerをactive triggerに設定します。
- 現在がopenであり、指定triggerが現在のactive triggerと同一である場合:
  - open状態は変化しません。
  - `ui-popover-open-change-request` / `ui-popover-open-change`は再発火しません。
  - 必要であれば位置再計算だけを行って構いません。
- 現在がopenであり、指定triggerが現在のactive triggerと異なる場合:
  - open状態は維持したまま、active triggerを新しいtriggerへ切り替えます。
  - `aria-expanded`と`aria-controls`は旧active triggerから解除し、新active triggerへ移管しなければなりません（MUST）。
  - この切替はopen真偽値の変更ではないため、`ui-popover-open-change-request` / `ui-popover-open-change`の発火対象に含めません。

#### `close(options?)`

`close(options?)`は`reason='programmatic'`によるcloseを行います。`returnFocus`を省略した場合の既定値は`false`です。

- 現在がopenである場合:
  - `reason='programmatic'`、`nextOpen=false`の`ui-popover-open-change-request`を発火します。
  - requestが受理された場合、closeを成立させます。
- 現在がclosedである場合:
  - no-opとし、eventは発火しません。

#### `toggleForTrigger(trigger?)`

`toggleForTrigger()`は`trigger`を省略した場合、anchored modeではowner trigger、controller modeでは現在のactive triggerを使用します。解決後のtriggerが存在しない場合は、**開発環境では`console.warn`、本番環境ではno-op** とします。

`toggleForTrigger()`は次のとおり振る舞います。

- 現在がclosedである場合:
  - 解決されたtriggerを用いて`openForTrigger()`と同じ契約で開きます。
- 現在がopenであり、解決されたtriggerが現在のactive triggerと同一である場合:
  - `reason='trigger'`により閉じます。
  - `returnFocus`の既定値は`true`です。
- 現在がopenであり、解決されたtriggerが現在のactive triggerと異なる場合:
  - closeは行わず、active triggerのみを切り替えます。
  - この切替はopen真偽値の変更ではないため、`ui-popover-open-change-request` / `ui-popover-open-change`の発火対象に含めません。

#### メソッド起点の `reason`

公開メソッド起点の`reason`は次のとおり固定します。

| 起点                                            | `reason`           |
| ----------------------------------------------- | ------------------ |
| `openForTrigger()`によるclosed → open         | `trigger`          |
| `toggleForTrigger()`によるopen → close        | `trigger`          |
| `close()`によるclose                          | `programmatic`     |
| `disabled=true`への遷移に伴う強制close        | `disabled`         |
| slot差し替えにより必要要素を失った場合のclose | `slot-invalidated` |
| disconnectに伴うclose                         | `disconnected`     |

### trigger 所有権契約

`ui-popover`は、slotに与えられた **owner trigger** と、実際に現在open状態の責任主体となる **active trigger** を区別します。両者は同一であってもよく、controller modeでは異なっても構いません。

この契約において、次を固定します。

- `aria-expanded="true"`はactive triggerにのみ反映します。
- owner triggerとactive triggerが異なる場合、owner triggerは展開中であっても`aria-expanded="false"`を維持します。
- close後のfocus returnはowner triggerではなくactive triggerを基準とします。
- active triggerを持たないcloseはfocus returnを行いません。

### 公開イベント

`ui-popover`は、変更要求と変更結果を分離したイベントを発火します。すべて`bubbles: true`かつ`composed: true`です。

| 名前                             | cancelable | detail                                            | 契約                   |
| -------------------------------- | ---------- | ------------------------------------------------- | ---------------------- |
| `ui-popover-open-change-request` | はい       | `{ nextOpen, reason, trigger, content }`          | 状態変更前に発火します |
| `ui-popover-open-change`         | いいえ     | `{ open, reason, trigger, content, returnFocus }` | 状態変更後に発火します |

`reason`は少なくとも次を取ります。

- `trigger`
- `escape`
- `outside-pointer`
- `disabled`
- `slot-invalidated`
- `disconnected`
- `programmatic`

`ui-popover-open-change-request`が`preventDefault()`された場合、状態変更は成立しません。`ui-popover-open-change`は監視用イベントであり、制御点ではありません。

### 属性反映契約

| property    | attribute   | reflect | 備考                                            |
| ----------- | ----------- | ------- | ----------------------------------------------- |
| `variant`   | `variant`   | あり    | 列挙外値は`default`へ正規化します             |
| `placement` | `placement` | あり    | 無効値は`bottom-start`へ正規化します          |
| `offset`    | `offset`    | あり    | 非有限値は既定値、負数は`0`へ正規化します     |
| `opened`    | `opened`    | あり    | controlledモードでのみ単一真実源として扱います |
| `disabled`  | `disabled`  | あり    | boolean attributeとして扱います                |

`defaultOpened`は初期化専用propertyです。属性反映の安定契約に含めません。

### 属性所有権契約

contentおよびtriggerに対する属性所有権は次のとおりです。

| 区分               | 属性                                                                                    | 契約                                                                         |
| ------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| コンポーネント専有 | `popover` / `hidden` / `data-open` / `data-variant` / `aria-expanded` / `aria-controls` | 表示制御とshell状態のためにコンポーネントが管理します                      |
| 利用者専有         | `role` / `aria-modal` / `aria-labelledby` / `aria-describedby`                          | 意味論は利用者または上位ラッパーが管理します                                 |
| 共有               | `id`                                                                                    | 未指定時はコンポーネントが自動採番し、利用者指定がある場合はそれを尊重します |

`popover`、`hidden`、`data-open`など表示制御系属性はコンポーネント専有とします。利用者はこれらへ安定依存してはなりません（MUST NOT）。`role`と関連ARIAはshell本体の責務に含めません。

### 列挙外値・無効値の扱い

`variant`に列挙外値を与えた場合、`default`に正規化します。`placement`に無効値を与えた場合、`bottom-start`に正規化します。`offset`が非有限値である場合は既定値`8`に、負数である場合は`0`に正規化します。

利用者は、列挙外値や無効値に依存してはなりません（MUST NOT）。

### 責務範囲

責務範囲には、anchorとcontentの関係維持、開閉状態の管理、Floating UIによる位置計算、Popover APIとfallbackの吸収、最低限のARIA反映、および環境別スタイルの提供を含みます。

一方で、次は責務に含めません。

- 既定`role`の提供
- role固有のキーボードモデル
- focus trap
- link fallback
- arrow描画
- 複数overlayの競合解決

---

## 状態モデル

`ui-popover`の主要状態は、**開いているか**だけでなく、**制御モード**、**起動モード**、**どのtriggerがactiveか**、**Popover APIを使うかfallbackを使うか**によって読み分けます。

### anchored mode / controller mode

anchored modeではslot triggerが唯一の起動主体です。controller modeでは`openForTrigger()`に渡した要素が起動主体です。shared triggerを扱う場合はcontroller modeとして読みます。

### controlled / uncontrolled

controlledモードでは`opened`が単一真実源です。内部状態は`opened`を直接上書きしません。状態変更が必要な場合は`ui-popover-open-change-request`を発火し、外部が`opened`を更新して確定します。

uncontrolledモードでは`defaultOpened`を初期値として内部状態を持ちます。以後の単一真実源は内部状態です。

### 開状態 / 閉状態

内部状態は`open` / `closed`の2状態です。必要要素が欠ける場合や`disabled=true`になった場合は、`open`を維持しません。

### active trigger 状態

`ui-popover`は現在の起動主体を`active trigger`として持ちます。`aria-expanded="true"`はactive triggerにのみ反映します。共有trigger運用では、owner triggerとactive triggerを同時に展開状態へしてはなりません（MUST NOT）。active triggerが切り替わる場合、旧active triggerに残っていた`aria-expanded`と`aria-controls`は解除し、新active triggerへ同一状態更新として移管しなければなりません（MUST）。

### dismiss reason 状態

closeにはreasonを持ちます。少なくとも、`trigger`、`escape`、`outside-pointer`、`disabled`、`slot-invalidated`、`disconnected`、`programmatic`を区別します。

`returnFocus`の既定値はreasonによって決まります。

| reason             | 既定`returnFocus`                 |
| ------------------ | ---------------------------------- |
| `trigger`          | `true`                             |
| `escape`           | `true`                             |
| `outside-pointer`  | `false`                            |
| `disabled`         | `false`                            |
| `slot-invalidated` | `false`                            |
| `disconnected`     | `false`                            |
| `programmatic`     | 呼び出し側指定。未指定時は`false` |

### Popover API 状態

Popover API対応環境では、contentに`popover`を付与し、`showPopover()` / `hidePopover()`を使用します。Popover API非対応環境では`hidden`と`data-open`を用いて表示状態を管理します。

outside dismissの等価性は完全一致を保証しません。本コンポーネントが保証する最小契約は、**outside primary pointer相当で閉じること**です。

### disabled 状態

`disabled=true`の場合、新規openは成立しません。すでに開いている場合は`reason='disabled'`でcloseします。

### slot 再同期状態

`ui-popover`は、初期接続時だけでなく、slot内容の差し替え後もtrigger / contentの参照を再同期します。必要要素が欠けた場合、`reason='slot-invalidated'`でcloseします。

### focus モデル

shell契約として、open時にfocusをcontentへ自動移動しません。focus初期配置が必要な場合は、上位ラッパーまたはcontent側契約で扱います。close後のfocus returnはactive triggerと`returnFocus`に従います。

---

## DOM / Accessibility

ルートは`:host`です。Shadow DOM内部には2つのslotのみを持ちます。表示されるtriggerとcontentはlight DOM側の実要素です。

```text
<ui-popover>
  #shadow-root
    <slot name="trigger"></slot>
    <slot name="content"></slot>
</ui-popover>
```

contentはshadow内に複製されません。

### グローバル副作用契約

`ui-popover`はShadow DOM内だけでは完結しません。表示に必要なstyleはdocument単位で供給します。本書の公開契約は、必要なスタイル供給がdocument単位で存在することまでを固定し、注入方式や所有主体などの実装詳細は固定しません。

公開契約として固定するのは次の点だけです。

- shellの見た目はShadow DOM内だけでは完結しません。
- document単位のスタイル供給が必要です。
- style注入の具体的な実装方式は公開契約に含めません。

### Trigger semantics

trigger要素には次を反映します。

- `aria-expanded`
- `aria-controls`

`aria-haspopup`はshell本体の既定契約に含めません。popupの意味論が必要な場合は上位ラッパーが付与します。

### Content semantics

content要素には次を反映します。

- `data-open`
- `data-variant`
- `popover`または`hidden`

`role`と関連ARIAはcontent側の意味論契約に含めます。`ui-popover`は既定`role`を提供しません。

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- triggerの対話主体は、利用者が供給したinteractive elementです。本書におけるinteractive elementは、`button`、`a[href]`、有効なform control、または利用者がkeyboard起動責務を与えた`tabIndex >= 0`の`HTMLElement`を指します。
- `aria-expanded`はactive triggerにのみ反映します。owner triggerとactive triggerが異なる場合、owner triggerは`aria-expanded="false"`を維持します。
- `aria-controls`はactive triggerからcurrent contentの`id`を参照しなければなりません（MUST）。contentに`id`が存在しない場合は、コンポーネントが安定した`id`を補います。
- content要素の差し替え、content `id`の変化、またはactive triggerの切替が起きた場合、`aria-controls`の参照先は同一状態更新で再同期しなければなりません（MUST）。旧active triggerに`aria-controls`が残留してはなりません（MUST NOT）。
- open時にfocusをcontentへ自動移動しません。
- focus trapは提供しません。
- `Escape`によるcloseは、open中に同一`Document`上で発生した未修飾`keydown`を監視して提供します。`event.key === 'Escape'`かつ`event.defaultPrevented === false`の場合、`reason='escape'`のclose要求を行います。
- content内部のwidget等が`Escape`を独自処理したい場合は、当該`keydown`を`preventDefault()`することでshell dismissを抑止できます。
- close後のフォーカス復帰は`reason`と`returnFocus`に従います。

本コンポーネントで重要なのは、**popover自身が対話主体ではなく、anchor / content関係を補助すること**です。意味論付きpopupを必要とする場合は、上位ラッパーでroleとkeyboard modelを別途与えなければなりません（MUST）。

---

## Visual Contract

`ui-popover`の視覚契約は、補足情報を**本文より一段だけ強い面**として浮かせることにあります。モーダルのような遮断感は持たせず、本文近傍に短時間現れる補助面として扱います。

### 情報順位

- `default`は標準的な補足面です。
- `subtle`は注記や軽い説明向けの控えめな面です。
- `inverse`は暗い面で強めの区別を与えます。

本文、見出し、脚注近傍では、popoverは本文を上書きする主役ではありません。したがって、背景、影、境界線、アニメーションは、可視性を確保しつつも過剰な主張を避けます。

### レイアウト

contentは **viewport基準の浮遊面** としてanchor近傍へ配置します。配置方向は`placement`に従い、viewport端では反転または押し戻しにより表示領域外への逸脱を避けなければなりません（MUST）。最大幅と最大高は公開トークンにより調整可能でなければならず、長文contentでもviewportを越えて表示不能になってはなりません（MUST NOT）。縦方向overflowはscroll可能でなければなりません。

### 開閉表示

開状態では、contentは視認可能かつ操作可能でなければなりません（MUST）。閉状態では、contentは視認不可であり、pointer hit targetおよびキーボードフォーカス移動対象として機能してはなりません（MUST NOT）。実装は`opacity`、`transform`、`visibility`、`hidden`、Popover APIなど任意の手段を使用して構いませんが、具体的なCSS値は公開契約に含めません。遷移を設ける場合、その長さは短く、読書のテンポを阻害しない範囲に固定します。

### Trigger 視覚状態

active triggerには背景と小さな角丸を与えます。ただし、このactive表現はtriggerの可用性を補助する範囲にとどめ、selected/currentのような恒常状態表現には昇格させません。

### 視覚仕様

- `default`は明るい面、通常境界線、既定文字色、比較的強いshadowを持ちます。
- `subtle`は軽い背景、控えめな文字色、薄い境界線、弱めのshadowを持ちます。
- `inverse`は暗い背景、明るい文字色、暗背景上でも識別できる境界線を持ちます。

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
| subtle背景         | `--bg-fill-neutral`                 |
| active trigger背景 | `--bg-active`                       |
| 既定文字色          | `--fg-default`                      |
| 控えめ文字色        | `--fg-muted`                        |
| inverse背景参照    | `--fg-default`                      |
| inverse文字色参照  | `--bg-default`                      |
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

`prefers-reduced-motion: reduce`環境では、transformアニメーションを停止し、transition durationを即時に近い値へ落とします。

### Dark Mode

専用のdark mode CSS分岐は持ちません。dark modeはトークン差し替えと`inverse` variantにより吸収します。したがって、暗背景下でも`default`と`inverse`が識別可能でなければなりません（MUST）。

### Forced Colors

`forced-colors: active`環境では、contentはsystem colorにフォールバックし、背景・文字色・境界線が識別可能でなければなりません（MUST）。shadowは除去します。triggerはlink風表現へ固定せず、**テキスト可読性、focus indicator、active状態の識別**がsystem color上で失われないことを契約とします。

### Print

`@media print`ではcontentを非表示にします。popoverは印刷対象の常設情報ではなく、一時的な補足表示であるためです。

---

## 関連契約

### 起動契約

primary clickのみをopen / close契約対象とします。修飾キー付きclick、中click、その他のclickはopen / closeの正規起動として扱いません。したがって、それらを`preventDefault()`してはなりません。

### Link fallback 非採用方針

link fallbackはshell本体の責務に含めません。**「表示できればpopover、できなければ遷移」** という二重アクセスが必要な場合は、別ラッパーコンポーネントで定義します。

### 位置計算契約

位置計算はFloating UIに委ねます。戦略は`fixed`です。middlewareはoffset、flip、shiftを使用し、viewport edge paddingは`8px`です。利用者は、contentを通常フロー内要素として扱ってはなりません（MUST NOT）。

### Outside close 契約

Popover API対応環境では、outside interactionによるcloseはUAとPopover APIの振る舞いに委ねます。非対応環境では、fallbackによりcloseを再現します。

本契約が保証するのは **outside primary pointer相当で閉じること** までであり、環境間の完全等価性は保証しません。

### スタイル拡張契約

`ui-popover`は`::part(...)`を公開しません。表示面はlight DOM側の実要素であるため、拡張面は主としてCSS Custom Propertiesと、利用者が供給するtrigger / content自体のスタイルに限定されます。

### 公開スタイル面と非公開スタイル面の境界

本コンポーネントにおける公開スタイル面は、次に限定します。

- CSS Custom Properties
- `variant`、`placement`、`offset`、`opened`、`disabled`による意味上の状態差分
- `aria-*`、`popover`、`hidden`など意味契約に含まれる属性

一方で、次は非公開スタイル面として扱います。

- `data-open`
- `data-variant`
- 実装内部のclass名、selector、document単位スタイル供給の詳細構造

非公開スタイル面は実装識別子であり、外部から安定依存してはなりません（MUST NOT）。

---

## 境界条件

### anchored mode で trigger あり / content あり

正規構成です。clickで開閉し、`aria-controls`と`content.id`が一致します。

### anchored mode で trigger なし

popoverは成立しません。anchored modeとして開いてはなりません（MUST NOT）。

### controller mode で trigger slot なし

正規構成です。ただし、`openForTrigger()`呼び出し時にactive triggerを毎回明示しなければなりません（MUST）。

### content なし

全モードで不正構成です。openは成立しません。

### invalid `variant`

列挙外の`variant`は`default`へ正規化します。

### invalid `placement`

無効な`placement`は`bottom-start`へ正規化します。

### invalid `offset`

負数は`0`、非有限値は既定値`8`に正規化します。

### disabled 中の click

`disabled=true`ではclickに反応してはなりません。すでに開いている場合は`reason='disabled'`でcloseします。

### shared trigger

`openForTrigger()`によりslot外triggerをactive triggerにできます。このとき、active triggerの`aria-expanded`は`true`、owner triggerの`aria-expanded`は`false`を維持します。

### open 中に同一 trigger へ `openForTrigger()`

現在がopenであり、指定triggerが現在のactive triggerと同一である場合、open状態は変化しません。`ui-popover-open-change-request` / `ui-popover-open-change`は再発火しません。必要であれば位置再計算だけを行って構いません。

### open 中に別 trigger へ `openForTrigger()`

現在がopenであり、指定triggerが現在のactive triggerと異なる場合、closeは行いません。open状態を維持したままactive triggerを切り替え、`aria-expanded`と`aria-controls`を新しいtriggerへ移管します。この切替はopen真偽値の変更ではないため、`ui-popover-open-change-request` / `ui-popover-open-change`の発火対象に含めません。

### 無効な trigger を渡した `openForTrigger()` / `toggleForTrigger()`

無効要素、切断済み要素、またはinteractive elementでない要素が渡された場合、開発環境では`console.warn`により顕在化し、本番環境ではno-opとします。例外送出は既定契約に含めません。

### `opened` と `defaultOpened` の同時指定

契約違反です。開発環境では`console.warn`により顕在化しなければなりません（MUST）。本番環境では`opened`を優先し、`defaultOpened`は無視します。例外送出は既定契約に含めません。

### reconnect

再接続後はslot同期とlistener再接続により、以後のopen / closeが再び成立しなければなりません（MUST）。disconnect自体は`reason='disconnected'`のcloseとして扱います。

### 長文 content

contentは`overflow-y: auto`と`max-height`により、viewportを超える場合でも表示不能になってはなりません（MUST NOT）。

### 初期非表示

初期状態ではcontentは非表示でなければなりません（MUST）。Popover API対応環境では`:popover-open`不成立、非対応環境では`hidden=true`により非表示を表現します。

### 複数 slot 子要素

同一スロットへ複数要素を与える構成は契約違反です。静かな先頭採用へ依存してはなりません（MUST NOT）。

---

## Storybook 契約

各Storyは見本ではなく、**契約確認点**として扱います。将来変更時には、少なくとも次の確認点を維持します。

| 確認点              | 固定する契約                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 基本開閉            | anchored modeのopen / close、`aria-controls`、`aria-expanded`が成立すること                                        |
| request cancel      | `ui-popover-open-change-request`を`preventDefault()`した場合、内部状態、属性反映、`aria-*`が変化しないこと        |
| 制御モデル          | controlled / uncontrolledが分離して振る舞うこと                                                                      |
| dismiss reason      | `escape`、`outside-pointer`、`disabled`、`programmatic`が区別されること                                              |
| 公開メソッド冪等性  | open状態で同一triggerへ`openForTrigger()`を再度呼んでもno-opであり、eventが再発火しないこと                   |
| active trigger切替 | open中に別triggerへ切り替えた場合、openを維持したまま`aria-expanded` / `aria-controls`が移管されること          |
| shared trigger      | owner trigger / active triggerの責務分離とfocus return先が成立すること                                             |
| controller mode     | trigger slotなし構成でも`openForTrigger()` / `close()` / focus returnが契約どおり成立すること                      |
| slot再同期         | slot差し替え時に参照再同期が行われ、必要要素喪失時は`reason='slot-invalidated'`でcloseすること                   |
| event順序          | 状態変更が成立する場合はrequest → changeの順で発火し、拒否時はrequestのみで終わること                             |
| reconnect           | reconnect後にopen / closeが再び成立し、controller modeのactive triggerを暗黙にowner triggerへ巻き戻さないこと |
| 境界条件            | invalid値正規化、要素欠如時の非起動、長文content境界、単一要素制約が成立すること                                   |
| 環境差分            | Reduced Motion / Forced Colors / Printが成立すること                                                                 |
| visual variant      | `default` / `subtle` / `inverse`の差分が維持されること                                                               |

---

## 補足

`ui-popover`の要点は、anchorとcontentの関係を崩さず、環境差を吸収しつつ、本文の近くで静かに補足を提示することにあります。したがって、今後の変更でも次の方針は維持しなければなりません（MUST）。

1. `ui-popover`は意味論を持たないshellとして維持すること。
2. controlled / uncontrolledを混在させないこと。
3. anchored mode / controller modeを正式な起動モードとして維持すること。
4. roleとkeyboard modelはshell本体へ持ち込まないこと。
5. link fallback、dual-access、脚注・注釈固有の情報設計は別ラッパーの責務として維持すること。
6. overlay stack、dismiss controller、document単位style供給基盤はshell本体へ抱え込まず、必要であれば別基盤で扱うこと。
7. active stateを本文上の恒常状態表示へ転用しないこと。

要するに、本コンポーネントで増やしてよいのは **anchor / content関係の維持、開閉、dismiss、最小限の状態反映** に直接必要な契約だけです。意味論、遷移設計、基盤化、用途拡張は、`ui-popover`本体ではなく別責務として扱います。

---

## 現行実装の整合状況と残課題

本節は、現行の`popover.ts` / `popover.stories.ts`が本書とどう整合しているか、および互換維持のために残している項目を整理するものです。

### 現在整合している項目

現行実装では、少なくとも次を本書どおりに扱います。

- `ui-popover`を既定`role`なしのshellとして扱うこと
- `opened`と`defaultOpened`を分離し、controlled / uncontrolledを読み分けること
- `ui-popover-open-change-request`と`ui-popover-open-change`を中心契約とすること
- `reason`を`trigger` / `escape` / `outside-pointer` / `disabled` / `slot-invalidated` / `disconnected` / `programmatic`として区別すること
- owner trigger / active triggerを分離し、`aria-expanded`と`aria-controls`をactive triggerへ移管すること
- 複数slot子要素や無効triggerを開発時warning + no-opとして扱うこと
- `Escape`、outside primary pointer、`disabled=true`、slot再同期によるdismissを区別すること
- Storybookを契約確認点として維持し、request cancel、controlled / uncontrolled、controller mode、slot再同期、visual contractを検証すること

### 互換維持のために残している項目

次の項目は長期契約には含めませんが、関連コンポーネント移行のため一時的に残しています。

- `ui-popover-toggle` / `ui-popover-opened` / `ui-popover-closed`
  - 既存利用側の移行猶予として発火を継続します。
  - 新規利用は`ui-popover-open-change-request` / `ui-popover-open-change`を使用しなければなりません（MUST）。

### 今後の残課題

本書との整合をさらに高める上で、残る課題は次です。

1. 旧イベント群への依存を段階的に削除し、新イベントへ集約すること。
2. document単位style供給をoverlay foundationまたはstylesheet providerへ切り出すこと。

これらは本体shellの責務を増やすためではなく、**公開契約をさらに明確化し、互換レイヤを縮退させるための整理**として扱います。
