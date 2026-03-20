# Toast コンポーネント契約書

## 1. 目的

本書は、`ui-toast` を **一時通知を表示するホスト**、`ToastManager` を **通知制御の正規入口** として定義し、公開契約、責務分離、状態モデル、アクセシビリティ、視覚契約、および将来拡張の境界を整理するものです。

Rouault における toast は、読書や閲覧を遮断せず、必要な変化だけを静かに伝える補助 UI でなければなりません。したがって、本コンポーネントの契約は、**通知の可視性** と **「没入して読む」ことのできるデザイン** の両立を目的として定義します。

本書では、従来は「契約が不明瞭である箇所」として分離していた論点のうち、現行契約へ昇格させるべきものを本文へ統合しています。特に、**正規 API の境界、複数 host の扱い、`id` の不透明性、寿命ポリシー、公開面と内部面の分離、overlay 内での相対位置づけ** を中核契約として扱います。

---

## 2. 適用範囲

本書は、`ui-toast` および `ToastManager` の次の事項を対象とします。

- 公開契約
- 責務分離
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 境界条件
- Storybook 契約
- 新規追加を検討する価値がある機能
- 現行実装で未対応の事項

一方で、本書は次の事項を扱いません。

- 通知を出すべき業務判断そのもの
- 通知本文の文言設計全体
- 通知履歴の永続保存
- ページ遷移やセッションをまたぐ再表示
- 通知 action、undo、複合操作
- サーバーイベント配信や WebSocket 接続
- 画面ごとの通知優先度ポリシー全体
- overlay 階層全体の横断仕様

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 3. 役割と責務

### 3.1 基本アーキテクチャ

- `ToastManager` は通知制御の正規 API です。
- `ui-toast` は通知群を購読して描画する host です。
- `ui-toast` の instance method / static method は convenience API であり、正規制御 API ではありません。

### 3.2 責務に含むもの

- 通知の生成
- 通知のスタック管理
- 重複統合
- 自動消滅
- hover / focus / visibility による寿命一時停止
- 通知の退出遷移
- `variant` に応じた live region 強度の切り替え
- 手動で閉じる操作の提供

### 3.3 責務に含めないもの

- 通知 action の実行
- undo フロー
- 履歴パネルとの責務混在
- 任意 HTML 注入
- 表示位置の任意指定
- blocking modal としての利用

---

## 4. 公開契約

### 4.1 正規 API 契約

通常の利用では、`ToastManager.show()`、`ToastManager.dismiss()`、`ToastManager.clear()` を通知制御の正規 API として扱います。

`ui-toast` 自身も `show()` / `dismiss()` / `clear()` を持ちますが、これらは host 既定値を用いる convenience API です。利用者は、通知制御の主契約を host インスタンスへ依存させてはなりません（SHOULD NOT）。

### 4.2 host 既定値契約

`ui-toast` の `variant`、`duration`、`dismissible` は、**host 自身の表示状態を直接変えるものではなく**、instance method `show(message, options?)` を呼ぶ際の既定値です。既存通知の状態は変更しません。

| 名前 | 種別 | 必須 | 内容 | 契約 |
| --- | --- | --- | --- | --- |
| `variant` | property / attribute | いいえ | 既定 variant | 既定値は `info` です |
| `duration` | property / attribute | いいえ | 既定 duration | 既定値は `4000` ms です |
| `dismissible` | property / attribute | いいえ | 既定 dismissible | 既定値は `true` です |

### 4.3 host 配置契約

`ToastManager` は文書内で共有される単一ストアです。各 `ui-toast` はそのストアを購読して同じ通知群を描画します。

したがって、**1 document あたり 1 host** を正規構成とします。同一文書に複数の `ui-toast` を配置した場合、同じ通知群が各 host に重複描画されます。利用者は、複数 host を置いても通知が自動的に一箇所へだけ表示されると期待してはなりません（MUST NOT）。

複数 host は、意図的なミラー表示という明示的な要件がある場合に限って許容します。

### 4.4 入力契約（`ToastManager.show(options)`）

| 名前 | 種別 | 必須 | 内容 | 契約 |
| --- | --- | --- | --- | --- |
| `message` | string | はい | 通知本文 | 空白正規化後に空文字列となる場合は通知を生成しません |
| `variant` | property | いいえ | 通知種別 | `success` / `info` / `warning` / `danger`。後方互換で `error` を受理します |
| `duration` | number | いいえ | 自動消滅までの時間 | 有限数なら 0 以上の整数へ丸めます。未指定または無効値は既定値へフォールバックします |
| `dismissible` | boolean | いいえ | 手動クローズ可否 | `duration > 0` の場合のみ任意指定できます。`duration = 0` の場合は常に `true` です |

### 4.5 列挙値契約

`variant` の公開正規値は次の 4 種です。

| 値 | 意味 | live region |
| --- | --- | --- |
| `info` | 情報通知 | `status` |
| `success` | 正常完了通知 | `status` |
| `warning` | 注意喚起 | `alert` |
| `danger` | 失敗・重大警告 | `alert` |

後方互換値として `error` を受理しますが、公開契約上は非推奨です。利用者は `danger` を使用しなければなりません（SHOULD）。

`error` 以外の未知値または無効値は、表示不能にせず `info` にフォールバックします。ただし、未知値の扱いそのものは公開契約ではありません。利用者は列挙外値の挙動へ依存してはなりません（MUST NOT）。

### 4.6 寿命ポリシー契約

本書では `duration` を単なる時間値ではなく、**通知寿命の表現** として扱います。

- `duration > 0` は timed 通知です。
- `duration = 0` は persistent 通知です。
- timed 通知のみ自動消滅します。
- persistent 通知は手動で閉じる導線を必ず持ちます。

既定値は次のとおりです。

| 条件 | 解決値 |
| --- | --- |
| `variant = danger` かつ `duration` 未指定または無効 | `6000` ms |
| 上記以外で `duration` 未指定または無効 | `4000` ms |
| `duration` に有限数を指定 | `Math.max(0, trunc(duration))` |

### 4.7 重複統合契約

現行契約における重複判定キーは `variant + normalizedMessage` です。

- 空白正規化後の本文が一致する場合、同一通知として統合します。
- `variant` が異なれば本文が同じでも統合しません。
- 同一通知の再発行は、件数追加ではなく **replace + refresh-duration** として扱います。

具体的には、既存通知へ次を適用します。

- `message` を新しい入力で置き換えます。
- `duration` を新値へ更新します。
- `dismissible` を新値へ更新します。
- 退出中であれば `visible` 状態へ戻します。
- 自動消滅タイマーを再計算します。

将来、意味キーによる統合へ拡張する余地はありますが、現行契約では採用しません。

### 4.8 スタック契約

- 新着は先頭へ積みます（newest-first）。
- 最大保持件数は 3 件です。
- 4 件目以降の追加時は最古を即時削除します。
- 上限超過時の戦略は oldest-drop です。

`danger` や persistent toast を自動保護する優先度ルールは、現行契約には含めません。必要になった時点で明示追加します。

### 4.9 `id` 契約

`ToastManager.show()` が返す `id` は、通知を `dismiss()` するための **不透明ハンドル** です。

- 同値比較や一時保持には用いてよいです。
- 文字列の内部形式、時刻埋め込み、連番規則、長さ、接頭辞に依存してはなりません（MUST NOT）。
- 表示用識別子でも永続化キーでもありません。
- 当該実行文脈内でのみ有効です。
- 永続化、外部公開、意味解釈の対象にしてはなりません（MUST NOT）。

### 4.10 公開メソッド

#### `ui-toast`

| 名前 | 種別 | 契約 |
| --- | --- | --- |
| `show(message, options?)` | method | host 既定値を用いて通知を追加します |
| `dismiss(id)` | method | 指定 ID の通知を閉じます |
| `clear()` | method | すべての通知を即時消去します |
| `UiToast.show(options)` | static method | `ToastManager.show()` へ委譲します |
| `UiToast.dismiss(id)` | static method | `ToastManager.dismiss()` へ委譲します |
| `UiToast.clear()` | static method | `ToastManager.clear()` へ委譲します |

#### `ToastManager`

| 名前 | 種別 | 契約 |
| --- | --- | --- |
| `show(options)` | function | 通知を追加し、生成された `id` を返します。生成しなかった場合は `null` を返します |
| `dismiss(id)` | function | 指定通知を退出状態へ移し、存在しない場合は `false` を返します |
| `clear()` | function | すべての通知・タイマー・退出タイマーを即時破棄します |
| `subscribe(subscriber)` | function | 読み取り専用スナップショットの購読を開始し、解除関数を返します。購読開始時には現在スナップショットを直ちに 1 回通知します |
| `getSnapshot()` | function | 読み取り専用スナップショットを複製して返します |

`pause()`、`resume()`、`setVisibilityPaused()` は内部制御またはテスト補助のための API とみなし、本書では公開主契約へ含めません。

### 4.11 公開スナップショット契約

公開スナップショットは **read-only view** として扱います。利用者は返却配列や返却要素を書き換えても、内部状態を変更できません。

公開面として保証するのは、少なくとも次の意味情報です。

- `id`
- `variant`
- `message`
- `dismissible`
- `state`（`visible` または `exiting`）

実装が内部補助情報を返したとしても、それらは公開契約に含めません。特に重複統合キーやタイマー管理上の補助情報へ依存してはなりません（MUST NOT）。

### 4.12 属性反映契約

`ui-toast` の `variant`、`duration`、`dismissible` は property と attribute の両面から操作できます。boolean 値は attribute の有無で反映します。

| property | attribute | reflect | 備考 |
| --- | --- | --- | --- |
| `variant` | `variant` | あり | host 既定値 |
| `duration` | `duration` | あり | host 既定値 |
| `dismissible` | `dismissible` | あり | host 既定値 |

---

## 5. 状態モデル

`ui-toast` の主要状態は、見た目のバリアントではなく、**通知が存在するか、退出中か、自動消滅対象か、一時停止中か** によって読み分けます。

### 5.1 基本状態

通知が 0 件のとき、host は固定配置された空コンテナとして存在します。画面占有は最小で、ポインターイベントは発生しません。

### 5.2 追加状態

`ToastManager.show()` により通知が追加されると、新しい通知が先頭へ挿入されます。`message` は空白を単一スペースへ正規化し、前後空白を除去した値として扱います。

### 5.3 重複統合状態

同一 `variant + normalizedMessage` の通知が既存に存在する場合、新規項目は追加せず既存通知を更新します。再通知は件数追加ではなく、**通知寿命の延長と再アクティブ化** として扱います。

### 5.4 スタック上限状態

保持件数は最大 3 件です。4 件目追加時には最古通知を即時削除します。これは退出アニメーション付きの閉鎖ではなく、ストアからの即時除去です。

### 5.5 timed / persistent 状態

- `duration > 0` の通知は timed 状態であり、自動消滅タイマーを持ちます。
- `duration = 0` の通知は persistent 状態であり、自動消滅しません。

### 5.6 一時停止状態

自動消滅タイマーは、現行実装では少なくとも次の契機で停止します。

- 非 touch ポインターが toast 上に入ったとき
- toast 内にフォーカスが入ったとき
- `document.visibilityState === 'hidden'` のとき

ただし、**現行実装における物理的な停止状態管理は `pausedByInteraction` と `pausedByVisibility` の 2 フラグです。** hover と focus は個別 reason としては保持されず、どちらも interaction 停止へ合流します。

したがって、現行契約として保証するのは「hover 中に停止すること」「focus 中に停止すること」「hidden 中に停止すること」までです。**hover と focus が重なった場合に、それぞれを独立理由として参照カウント管理することは現行実装では未対応です。** この厳密化は将来拡張の対象です。

### 5.7 退出状態

`dismiss(id)` が呼ばれると、その通知は `exiting` 状態になります。自動消滅タイマーは停止し、その後 `150` ms の退出タイマーを経てストアから除去されます。

### 5.8 clear 状態

`clear()` は `dismiss()` と異なり、退出状態を経由せず、すべての通知とタイマーを即時破棄します。`clear()` は管理上の即時破棄であり、通常の個別終了とは意味が異なります。

### 5.9 文書可視性状態

host 接続中、`document.visibilitychange` を監視します。文書が hidden の間は全タイマーを停止し、visible に戻ると再開します。

### 5.10 後方互換状態

`variant = 'error'` は内部で `danger` に正規化されます。開発時には非推奨警告を出し得ますが、描画は継続します。

---

## 6. DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に `.toast-container` を持ち、その中へ各通知を描画します。

```text
<ui-toast>
  #shadow-root
    <div class="toast-container">
      <toast-item role="status|alert">
        <icon aria-hidden="true"></icon>
        <message>...</message>
        [close button]
      </toast-item>
    </div>
</ui-toast>
```

上記は **意味構造の模式図** であり、内部要素種別そのものを契約化するものではありません。

### 6.1 Accessibility 契約

- `success` / `info` は `role="status"` を用います。
- `warning` / `danger` は `role="alert"` を用います。
- 閉じるボタンのアクセシブル名は、現行契約では常に `通知を閉じる` です。
- アイコンは `aria-hidden="true"` として扱います。
- toast は非モーダルであり、フォーカスを奪いません。
- toast 全体を 1 単位の通知として扱います。
- 強制フォーカス移動を行いません。
- persistent 通知でも閉じる操作を必ず提供します。

### 6.2 閉じる操作契約

- `dismissible = true` のときのみ閉じるボタンを描画します。
- `duration > 0` かつ `dismissible = false` の通知では閉じるボタンを描画しません。
- `duration = 0` の通知は内部で `dismissible = true` に強制されるため、閉じるボタンを必ず描画します。

### 6.3 DOM 公開面と非公開面

公開契約に含めるのは、`role`、通知本文、閉じる操作、live region 強度、非モーダル性です。

一方で、Shadow DOM 内部の class 名、`data-*` 属性、内部要素種別、内部構造の細部は原則として非公開面です。利用者はそれらへ依存してはなりません（MUST NOT）。

### 6.4 イベント契約

`ui-toast` は通知起動専用の独自カスタムイベントを公開しません。通知の生成と消去は `ToastManager` または convenience API によって行います。

---

## 7. Visual Contract

`ui-toast` の視覚契約は、通知を本文より前景化しすぎず、それでも見落とされないことにあります。

### 7.1 情報順位

- `info` は中立的な補足通知です。
- `success` は完了を穏やかに示します。
- `warning` は対応が必要な可能性を示します。
- `danger` は失敗または重大警告を示します。

`warning` と `danger` は live region も強くなりますが、画面全体を覆う遮断 UI にはしません。

### 7.2 配置契約

- 通常幅では右上固定です。
- 狭い画面幅では下端固定へ切り替えます。
- 新着は視覚上も最上段に積みます。
- 配置は公開設定にしません。
- 任意配置は現行契約に含めません。

### 7.3 overlay 内での相対位置づけ

toast は **通常文書より上、blocking modal より下** を最低限の相対契約とします。完全な overlay hierarchy は別の横断契約で定義します。

### 7.4 視覚仕様

- 各 toast は背景、境界線、角丸、影を持つ面として表示します。
- icon は variant ごとの意味色を持ちます。
- 本文は `text-sm` 相当で折り返し可能です。
- container 自体は `pointer-events: none`、各 toast のみ `pointer-events: auto` です。
- 退出時は縮小フェードアウトします。
- 閉じるボタンは透明背景を基本とし、hover / focus-visible で反応します。

### 7.5 視覚状態の優先順位

- `exiting` は操作可能状態より優先し、退出中は新たな対話前提を置きません。
- `focus-visible` は `hover` より強い可視焦点を維持します。
- `forced-colors` では意味色よりシステム互換を優先します。
- `dark mode` でも最低限のコントラストを崩しません。

### 7.6 モーション

通常環境では、toast 追加時に右からの slide-in、消去時に scale + fade-out を用います。これは、通知追加を知覚可能にするための最小限のモーションです。

### 7.7 参照トークン

本コンポーネントは主として次のトークンに依存します。

| 用途 | トークン |
| --- | --- |
| 位置余白 | `--space-4` / `--space-8` |
| スタック間隔 | `--space-2` |
| 内部余白 | `--space-3` / `--space-4` |
| 最大幅 | `--toast-max-width` |
| z-index | `--z-toast` |
| 既定背景 | `--bg-surface-2` |
| success 背景 | `--bg-success-subtle` |
| warning 背景 | `--bg-warning-subtle` |
| danger 背景 | `--bg-danger-subtle` |
| 既定文字色 | `--fg-default` |
| 控えめ文字色 | `--fg-muted` |
| info 色 | `--fg-info` / `--primary` |
| success 色 | `--fg-success` |
| warning 色 | `--fg-warning` |
| danger 色 | `--fg-danger` |
| 境界線 | `--border-default` / `--border-width` |
| 角丸 | `--radius-md` / `--radius-sm` |
| 影 | `--elevation-lg` |
| アイコン寸法 | `--icon-base` / `--icon-sm` |
| 文字寸法 | `--text-sm` |
| 行高 | `--line-height-normal` |
| フォーカス | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| モーション時間 | `--duration-fast` / `--duration-normal` / `--duration-slow` |
| イージング | `--ease-out` / `--ease-in` |
| タッチ領域 | `--control-min-touch` |

---

## 8. 環境別の振る舞い

### 8.1 Browser Runtime

本コンポーネントは browser runtime を前提とする表示基盤です。`window` と `document` を利用するため、非 browser 環境は公開契約の対象外です。

### 8.2 Mobile

`max-width: 640px` では、表示位置を右上固定から下端固定へ切り替えます。横方向は左右余白付きの全面寄せとし、可読性を優先します。

### 8.3 Reduced Motion

`prefers-reduced-motion: reduce` 環境では、追加アニメーションを slide-in から fade-in に切り替え、退出も fade-out のみに簡略化します。

### 8.4 Forced Colors

`forced-colors: active` 環境では、背景を `Canvas`、境界線と文字を `CanvasText` に寄せ、box-shadow を除去します。独自色で意味を表現するのではなく、システムカラー互換を優先します。

### 8.5 Print

`@media print` では `:host` 自体を非表示にします。toast は一時通知であり、印刷対象に含めません。

---

## 9. 境界条件

### 9.1 空文字メッセージ

`message` が空文字、または空白正規化後に空になる場合、通知は生成されず `null` を返します。

### 9.2 既定 duration

`duration` を省略した場合、`danger` は `6000` ms、それ以外は `4000` ms です。

### 9.3 無効 duration

`duration` が有限数でない場合も、既定 duration へフォールバックします。

### 9.4 列挙外 variant

`variant = "error"` は `danger` に正規化されます。これ以外の未知値または無効値は `info` にフォールバックします。

### 9.5 `duration = 0`

自動消滅しません。この場合、`dismissible: false` を明示しても閉じるボタンは表示されます。

### 9.6 同一文言の再通知

同一 `variant + normalizedMessage` の再通知は統合され、件数は増えません。退出中だった場合も再アクティブ化されます。

### 9.7 variant 違いの同一文言

同一本文でも variant が違えば別通知です。統合してはなりません。

### 9.8 上限超過

4 件目追加時には最古を即時削除します。古い通知の退出演出は保証しません。

### 9.9 hover 停止

マウス等では hover 中にタイマー停止しますが、touch pointer では停止しません。

### 9.10 focus 移動

toast 内部でフォーカス移動している限りタイマーは再開しません。toast 外へフォーカスが出た時点で再開します。

### 9.11 非存在 ID の dismiss

存在しない ID を `dismiss(id)` した場合は `false` を返します。

### 9.12 退出中 ID の dismiss

すでに退出中の ID に対しては `true` を返し、追加副作用は発生しません。

### 9.13 非 dismissible 通知

`duration > 0` かつ `dismissible = false` の通知では、閉じるボタンは描画されません。

### 9.14 複数 host

同一文書に複数の `ui-toast` が接続されている場合、同じ通知群が各 host に描画されます。

### 9.15 後から接続された host

host が通知生成後に接続された場合でも、未消滅の通知は初回同期により描画されます。

### 9.16 `id` の形式

`id` は `dismiss()` 用の不透明ハンドルです。文字列形式や生成規則に依存してはなりません。

### 9.17 `clear()` の意味

`clear()` は退出演出付き全消去ではなく、即時破棄です。

### 9.18 印刷時

通知の有無にかかわらず非表示です。

---

## 10. Storybook 契約

本節では、**現行確認済みの Story** と **追加予定の確認点** を分離します。両者を混在させません。

### 10.1 現行確認済みの Story

| Story | 固定する契約 |
| --- | --- |
| `Default` | success 通知が描画され、`role="status"` と閉じるボタンの `aria-label` が成立すること |
| `VariantStateCombinations` | `success/info` は `status`、`warning/danger` は `alert` であること。`danger` の既定 duration が 6000 ms であること |
| `OverflowAndOrderIntegrity` | 新着が先頭に積まれ、4 件目で最古が削除され、最大 3 件で保たれること |
| `DuplicateMergeAndDurationReset` | 同一 duplicate key は統合され、再通知で duration がリセットされること |
| `HoverPauseAndResumeTimer` | hover 中はタイマー停止、hover 解除後に再開すること |
| `FocusPauseAndResumeTimer` | focus 中はタイマー停止、focusout 後に再開すること |
| `VisibilityPauseAndResumeTimer` | hidden 中はタイマー停止、visible 復帰後に再開すること |
| `DuplicateKeyRespectsVariant` | 同一本文でも variant が異なれば統合しないこと |
| `DarkModeAndStyleContracts` | ダーク背景で toast 背景が透明化せず、forced-colors / reduced-motion / print 契約が CSS に存在すること |
| `LegacyErrorVariantMapping` | `variant="error"` が `danger` に内部マッピングされ、`role="alert"` になること |

### 10.2 追加予定の確認点

次の確認点は契約上重要ですが、現行 Storybook ではまだ独立 Story として固定していません。契約へ昇格させる際は、Storybook と同期して追加します。

- 複数 host が同じストアをミラー表示すること
- 未知 variant が `info` にフォールバックすること
- `dismissible = false` のとき閉じるボタンが描画されないこと
- 遅れて接続された host が現在スナップショットを初回同期で受け取ること
- `clear()` が退出演出ではなく即時破棄であること
- hover と focus が重なった場合に、片方だけ解除してもタイマーが再開しないこと

---

## 11. 新規追加を検討する価値がある機能

本節は、toast を過剰に肥大化させず、**通知基盤として長期的に価値がある追加機能** を整理するものです。ここでいう「価値がある」とは、見た目の選択肢を増やすことではなく、**通知の意味づけ、寿命制御、外部連携、保守性** を強くすることを指します。

toast は機能を盛るほど責務が崩れやすいため、追加候補は多くありません。本コンポーネントで優先すべきなのは、UI の複雑化ではなく **制御モデルの改善** です。

### 11.1 優先度が高い機能

#### 11.1.1 意味キーによる重複統合（`dedupeKey` / `key`）

最も追加価値が高い機能です。現行の `variant + normalizedMessage` による重複統合は、表示文言に依存するため、文言修正、ローカライズ、補足差し込みによって統合挙動がぶれやすいという弱点があります。

この機能を追加する価値は次のとおりです。

- 通知の **意味** と **表示文言** を分離できます。
- 文言変更が通知寿命や統合挙動へ波及しにくくなります。
- 非同期更新、再試行通知、状態遷移型の通知と整合しやすくなります。

推奨する契約方向は次のとおりです。

- `dedupeKey` 指定時はその値で重複統合します。
- `dedupeKey` 未指定時のみ、後方互換として `variant + normalizedMessage` を用います。
- 表示文言は dedupe の主キーにしません。

#### 11.1.2 既存 toast の更新 API（`update(id, patch)`）

非常に価値が高い機能です。これは単なる convenience API ではなく、toast を「短命な表示」から「短い進行状態の表示」へ広げるための最小機能です。

有効な例は次のとおりです。

- 保存中 → 保存完了
- 同期中 → 失敗
- エクスポート中 → 完了

この機能がない場合、persistent toast を出して後から消し、新しい toast を出し直す必要があり、通知が冗長になります。

推奨する契約方向は次のとおりです。

- `ToastManager.update(id, patch)` を追加します。
- `patch` では `message`、`variant`、`duration`、`dismissible` の更新を許可します。
- `id` は新規生成せず既存通知を更新します。
- 更新時の寿命ポリシーは `replace + refresh-duration` を基本とします。

#### 11.1.3 明示的な寿命ポリシー（`lifetime`）

これは新機能というより API 改良ですが、長期価値があります。現行の `duration = 0` を persistent と読む契約は実用上問題ありませんが、数値に意味を持たせすぎています。

長期的には、通知寿命は単なる数値ではなく、**寿命ポリシー** として表現した方がきれいです。

推奨する契約方向は次のとおりです。

- `duration` は当面維持してもよいです。
- 将来的には `lifetime = auto | timed(ms) | persistent` のような概念へ寄せます。
- `action` や `update` を導入した際にも、寿命を一貫した言葉で扱えるようにします。

#### 11.1.4 消去理由の観測（`reason`）

価値は高いですが、UI 機能というより通知基盤機能です。現状の通知消去には少なくとも次の経路があります。

- timeout
- user close
- clear
- overflow eviction

これを観測できるようにすると、undo、分析、ログ、テスト、非同期処理との整合が取りやすくなります。

推奨する契約方向は次のとおりです。

- `onDismiss(reason)` 形式の callback を追加する、または別のイベント購読 API を定義します。
- `reason` は `timeout | dismiss | clear | overflow` 程度の閉じた列挙から始めます。

### 11.2 条件付きで検討する価値がある機能

#### 11.2.1 単一 action ボタン

一定の価値があります。ただし、toast を小型ダイアログ化しないという制約が前提です。

有効なのは次のようなケースです。

- 再試行
- 元に戻す
- 開く

推奨する制約は次のとおりです。

- action は 1 つまでとします。
- ラベルは短く保ちます。
- action 付き toast は寿命ポリシーを別途再検証します。
- 複数 action、フォーム、複雑な対話は許可しません。

#### 11.2.2 close label のローカライズ

多言語展開を視野に入れるなら検討価値があります。ただし、通知ごとに自由文言を与える方向は避けます。

推奨する契約方向は次のとおりです。

- グローバルな label provider、またはコンポーネント全体設定で供給します。
- 各 toast 単位での自由設定は許可しません。
- アクセシビリティ文言の一貫性を保ちます。

#### 11.2.3 queue / backlog

一定の価値はありますが、既定動作としては推奨しません。読書中心 UI では通知滞留が騒音になりやすいためです。

採る場合は、次のような限定用途を想定します。

- developer mode
- diagnostics
- optional setting
- 管理画面専用挙動

### 11.3 現時点では見送る方がよい機能

次の方向は、追加コストに対して長期価値が低いか、toast の責務を崩しやすいため、現時点では採用しません。

- 任意配置
- 複数 action
- rich content / 任意 HTML
- 履歴パネルとの統合
- blocking 化

### 11.4 推奨する優先順位

実際に追加を検討する場合、優先順位は次のとおりです。

1. `dedupeKey`
2. `update(id, patch)`
3. 明示的な寿命ポリシー
4. 消去理由の観測
5. 単一 action
6. close label のローカライズ
7. queue / backlog

この順序であれば、toast を過度に肥大化させずに、通知基盤としての意味だけを強化できます。

### 11.5 本節の要点

本コンポーネントにおいて価値が高い追加機能は、**見た目の選択肢** ではなく、**通知モデルの安定化** と **状態遷移の明確化** に寄与するものです。

したがって、今後も次の原則を維持します。

- 表示文言依存を減らすこと
- 状態遷移を API として明示すること
- 寿命を制御しやすくすること
- 外部連携可能性を必要最小限で確保すること
- toast を複雑な対話 UI へ逸脱させないこと

---

## 12. 現行実装で未対応の事項

本節は、前節の **「新規追加を検討する価値がある機能」** との重複を避けるため、設計説明の再掲は行わず、現行実装における **未対応状況のみ** を簡潔に整理します。

### 12.1 優先追加候補に対する未対応状況

| 項目 | 現行状況 |
| --- | --- |
| `dedupeKey` | 未対応。重複統合は `variant + normalizedMessage` に依存します |
| `update(id, patch)` | 未対応。既存 toast の更新 API はありません |
| 明示的な寿命ポリシー | 未対応。寿命表現は `duration` 数値に依存します |
| 消去理由の観測 | 未対応。`timeout` / `dismiss` / `clear` / `overflow` の区別を外部観測できません |
| 単一 action | 未対応。通知本文と閉じるボタンのみです |
| close label のローカライズ | 未対応。`通知を閉じる` 固定です |
| queue / backlog | 未対応。上限超過時は最古を即時削除します |

### 12.2 そのほかの未対応事項

次の項目は前節の優先追加候補には含めていませんが、将来厳密化や拡張の余地があります。

| 項目 | 現行状況 |
| --- | --- |
| 停止理由の個別管理 | 未対応。タイマー停止は `pausedByInteraction` と `pausedByVisibility` の 2 フラグで管理され、hover と focus は個別 reason として保持されません |
| 内部制御 API の物理分離 | 未対応。`pause` / `resume` / `setVisibilityPaused` は実装上 `ToastManager` から export されており、内部用 API として物理分離されていません |
| 複数 host の重複警告 | 未対応。正規構成は 1 document 1 host ですが、重複 host を検出して警告または抑止する仕組みはありません |
| 表示文字列と dedupe 用正規化の分離 | 未対応。`normalizeMessage()` の結果が表示文言と重複統合キーの両方に使われます |
| title / description の構造化 | 未対応。本文は単一の `message` 文字列です |
| 配置の公開切り替え | 未対応。通常時右上・狭幅時下端に固定されています |
| 公開スナップショットの型分離 | 未対応。公開契約上は内部補助情報に依存不可ですが、型の物理的分離は未実施です |
| `part` 公開 | 未対応。外部スタイル拡張は CSS Custom Properties 中心です |
| rich content | 未対応。HTML コンテンツや任意スロットは受け付けません |
| 通知スコープ / チャネル分離 | 未対応。通知は単一グローバルストアで管理され、`scope` / `channel` / `hostId` のような分離キーを持ちません |
| overflow 時の保護 / pinning / priority 保持 | 未対応。上限超過時は常に最古を削除し、persistent toast や高重要度通知を保護する仕組みはありません |
| live region の詳細制御 | 未対応。`role` の切り替えはありますが、`aria-live` / `aria-atomic` / `aria-relevant` などの詳細制御や公開設定面はありません |

### 12.3 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、**実装、Storybook、契約書** の 3 点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。

---

## 13. 補足

`ui-toast` の要点は、通知をたくさん出せることではありません。**必要な変化だけを非遮断で提示し、読書や操作の主文脈を壊さないこと** にあります。

したがって、今後の変更でも次の 5 点は崩さない方がよいです。

1. 通知制御の正規入口は `ToastManager` に維持すること。
2. 新着先頭・最大 3 件・重複統合の基本秩序を崩さないこと。
3. `warning` / `danger` と `info` / `success` の live region 強度差を維持すること。
4. hover / focus / visibility による寿命一時停止を、読み取り補助契約として維持すること。
5. toast を blocking UI や小型ダイアログへ逸脱させないこと。

