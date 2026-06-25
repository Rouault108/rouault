# Toast コンポーネント契約書

## 1. 目的

本書は、`ui-toast`を **一時通知を表示するホスト**、`ToastManager`を **通知制御の正規入口** として定義し、公開契約、責務分離、状態モデル、アクセシビリティ、視覚契約、および将来拡張の境界を整理するものです。

Rouaultにおけるtoastは、読書や閲覧を遮断せず、必要な変化だけを静かに伝える補助UIでなければなりません。したがって、本コンポーネントの契約は、**通知の可視性** と **「没入して読む」ことのできるデザイン** の両立を目的として定義します。

本書では、従来は「契約が不明瞭である箇所」として分離していた論点のうち、現行契約へ昇格させるべきものを本文へ統合しています。特に、**正規APIの境界、複数hostの扱い、`id`の不透明性、寿命ポリシー、公開面と内部面の分離、overlay内での相対位置づけ** を中核契約として扱います。

---

## 2. 適用範囲

本書は、`ui-toast`および`ToastManager`の次の事項を対象とします。

- 公開契約
- 責務分離
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 境界条件
- Storybook契約
- 現行実装で未対応の事項

一方で、本書は次の事項を扱いません。

- 通知を出すべき業務判断そのもの
- 通知本文の文言設計全体
- 通知履歴の永続保存
- ページ遷移やセッションをまたぐ再表示
- 明示的な寿命ポリシー型（`lifetime`など）の公開導入
- 消去理由の外部観測API（`reason` / `onDismiss`など）
- 通知action、undo、複合操作
- close labelの通知単位カスタマイズ、およびアプリケーション全体のi18n供給方式
- queue / backlogを既定動作として扱うこと
- サーバーイベント配信やWebSocket接続
- 画面ごとの通知優先度ポリシー全体
- overlay階層全体の横断仕様

これらは上位レイヤ、別コンポーネント、または将来の別契約の責務です。

---

## 3. 役割と責務

### 3.1 基本アーキテクチャ

- `ToastManager`は通知制御の正規APIです。
- `ui-toast`は通知群を購読して描画するhostです。
- `ui-toast`のinstance method / static methodはconvenience APIであり、正規制御APIではありません。

### 3.2 責務に含むもの

- 通知の生成
- 通知のスタック管理
- 重複統合
- 自動消滅
- hover / focus / visibilityによる寿命一時停止
- 通知の退出遷移
- `variant`に応じたlive region強度の切り替え
- 手動で閉じる操作の提供

### 3.3 責務に含めないもの

- 通知actionの実行
- undoフロー
- 履歴パネルとの責務混在
- 任意HTML注入
- 表示位置の任意指定
- blocking modalとしての利用

---

## 4. 公開契約

### 4.1 正規 API 契約

通常の利用では、`ToastManager.show()`、`ToastManager.dismiss()`、`ToastManager.clear()`を通知制御の正規APIとして扱います。

`ui-toast`自身も`show()` / `dismiss()` / `clear()`を持ちますが、これらはhost既定値を用いるconvenience APIです。利用者は、通知制御の主契約をhostインスタンスへ依存させてはなりません（SHOULD NOT）。

### 4.2 host 既定値契約

`ui-toast`の`variant`、`duration`、`dismissible`は、**host自身の表示状態を直接変えるものではなく**、instance method `show(message, options?)`を呼ぶ際の既定値です。既存通知の状態は変更しません。

| 名前          | 種別                 | 必須   | 内容             | 契約                    |
| ------------- | -------------------- | ------ | ---------------- | ----------------------- |
| `variant`     | property / attribute | いいえ | 既定variant     | 既定値は`info`です    |
| `duration`    | property / attribute | いいえ | 既定duration    | 既定値は`4000` msです |
| `dismissible` | property / attribute | いいえ | 既定dismissible | 既定値は`true`です    |

### 4.3 host 配置契約

`ToastManager`は文書内で共有される単一ストアです。各`ui-toast`はそのストアを購読して同じ通知群を描画します。

したがって、**1 documentあたり1 host** を正規構成とします。同一文書に複数の`ui-toast`を配置した場合、同じ通知群が各hostに重複描画されます。利用者は、複数hostを置いても通知が自動的に一箇所へだけ表示されると期待してはなりません（MUST NOT）。

複数hostは、意図的なミラー表示という明示的な要件がある場合に限って許容します。

### 4.4 入力契約（`ToastManager.show(options)`）

| 名前          | 種別     | 必須   | 内容               | 契約                                                                                         |
| ------------- | -------- | ------ | ------------------ | -------------------------------------------------------------------------------------------- |
| `message`     | string   | はい   | 通知本文           | 空白正規化後に空文字列となる場合は通知を生成しません                                         |
| `variant`     | property | いいえ | 通知種別           | `success` / `info` / `warning` / `danger`。後方互換で`error`を受理します                   |
| `duration`    | number   | いいえ | 自動消滅までの時間 | 有限数なら0以上の整数へ丸めます。未指定または無効値は既定値へフォールバックします          |
| `dismissible` | boolean  | いいえ | 手動クローズ可否   | `duration > 0`の場合のみ任意指定できます。`duration = 0`の場合は常に`true`です           |
| `dedupeKey`   | string   | いいえ | 重複統合の意味キー | 非空文字列なら重複統合キーとして優先使用します。空文字列または空白のみは未指定として扱います |

`dedupeKey`は、表示文言とは独立した **通知の意味単位** を表す任意キーです。再試行通知、進行状態通知、同一処理の再発火など、文言差分に依存せず同一通知として扱いたい場合に用います。

### 4.5 列挙値契約

`variant`の公開正規値は次の4種です。

| 値        | 意味           | live region |
| --------- | -------------- | ----------- |
| `info`    | 情報通知       | `status`    |
| `success` | 正常完了通知   | `status`    |
| `warning` | 注意喚起       | `alert`     |
| `danger`  | 失敗・重大警告 | `alert`     |

未知値または無効値は、表示不能にせず`info`にフォールバックします。ただし、未知値の扱いそのものは公開契約ではありません。利用者は列挙外値の挙動へ依存してはなりません（MUST NOT）。

### 4.6 寿命ポリシー契約

本書では`duration`を単なる時間値ではなく、**通知寿命の表現** として扱います。

- `duration > 0`はtimed通知です。
- `duration = 0`はpersistent通知です。
- timed通知のみ自動消滅します。
- persistent通知は手動で閉じる導線を必ず持ちます。

既定値は次のとおりです。

| 条件                                                | 解決値                         |
| --------------------------------------------------- | ------------------------------ |
| `variant = danger`かつ`duration`未指定または無効 | `6000` ms                      |
| 上記以外で`duration`未指定または無効              | `4000` ms                      |
| `duration`に有限数を指定                           | `Math.max(0, trunc(duration))` |

### 4.7 重複統合契約

重複判定キーは次の優先順位で解決します。

1. `dedupeKey`が指定されている場合は、その値を重複判定キーとして用います。
2. `dedupeKey`が未指定の場合のみ、後方互換として`variant + normalizedMessage`を重複判定キーとして用います。

現行契約では、重複判定キーが一致する場合、同一通知として統合します。

- `dedupeKey`指定時は、本文やvariantが変化しても同一通知として更新できます。
- `dedupeKey`未指定時は、空白正規化後の本文が一致する場合に統合します。
- `dedupeKey`未指定時は、`variant`が異なれば本文が同じでも統合しません。
- 同一通知の再発行は、件数追加ではなく **replace + refresh-duration** として扱います。

具体的には、既存通知へ次を適用します。

- `message`を新しい入力で置き換えます。
- `variant`を新しい入力で置き換えます。
- `duration`を新値へ更新します。
- `dismissible`を新値へ更新します。
- 退出中であれば`visible`状態へ戻します。
- 自動消滅タイマーを再計算します。

利用者は、`dedupeKey`を用いない場合の重複統合が表示文言に依存する後方互換経路であることを理解しなければなりません（SHOULD）。

### 4.8 スタック契約

- 新着は先頭へ積みます（newest-first）。
- 最大保持件数は3件です。
- 4件目以降の追加時は最古を即時削除します。
- 上限超過時の戦略はoldest-dropです。

`danger`やpersistent toastを自動保護する優先度ルールは、現行契約には含めません。必要になった時点で明示追加します。

### 4.9 `id` 契約

`ToastManager.show()`が返す`id`は、通知を`dismiss()`するための **不透明ハンドル** です。

- 同値比較や一時保持には用いてよいです。
- 文字列の内部形式、時刻埋め込み、連番規則、長さ、接頭辞に依存してはなりません（MUST NOT）。
- 表示用識別子でも永続化キーでもありません。
- 当該実行文脈内でのみ有効です。
- 永続化、外部公開、意味解釈の対象にしてはなりません（MUST NOT）。

### 4.10 公開メソッド

#### `ui-toast`

| 名前                      | 種別          | 契約                                  |
| ------------------------- | ------------- | ------------------------------------- |
| `show(message, options?)` | method        | host既定値を用いて通知を追加します   |
| `dismiss(id)`             | method        | 指定IDの通知を閉じます              |
| `clear()`                 | method        | すべての通知を即時消去します          |
| `UiToast.show(options)`   | static method | `ToastManager.show()`へ委譲します    |
| `UiToast.dismiss(id)`     | static method | `ToastManager.dismiss()`へ委譲します |
| `UiToast.clear()`         | static method | `ToastManager.clear()`へ委譲します   |

#### `ToastManager`

| 名前                    | 種別     | 契約                                                                                                                      |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `show(options)`         | function | 通知を追加し、生成された`id`を返します。生成しなかった場合は`null`を返します                                          |
| `update(id, patch)`     | function | 指定通知を更新します。対象が存在しない場合は`false`を返します。更新に成功した場合は`true`を返します                   |
| `dismiss(id)`           | function | 指定通知を退出状態へ移し、存在しない場合は`false`を返します                                                             |
| `clear()`               | function | すべての通知・タイマー・退出タイマーを即時破棄します                                                                      |
| `subscribe(subscriber)` | function | 読み取り専用スナップショットの購読を開始し、解除関数を返します。購読開始時には現在スナップショットを直ちに1回通知します |
| `getSnapshot()`         | function | 読み取り専用スナップショットを複製して返します                                                                            |

`ToastManager.update(id, patch)`では、`message`、`variant`、`duration`、`dismissible`の更新のみを許可します。`id`は変更しません。`dedupeKey`は生成時の統合キーであり、更新APIでは変更対象に含めません。

更新時は **replace + refresh-duration** を基本とします。すなわち、更新後の`duration`に基づいてtimed / persistentを再評価し、自動消滅タイマーを再計算します。対象が`exiting`状態であった場合は`visible`状態へ戻します。

`pause()`、`resume()`、`setVisibilityPaused()`は内部制御またはテスト補助のためのAPIとみなし、本書では公開主契約へ含めません。

### 4.11 公開スナップショット契約

公開スナップショットは **read-only view** として扱います。利用者は返却配列や返却要素を書き換えても、内部状態を変更できません。

公開面として保証するのは、少なくとも次の意味情報です。

- `id`
- `variant`
- `message`
- `dismissible`
- `state`（`visible`または`exiting`）

実装が内部補助情報を返したとしても、それらは公開契約に含めません。特に重複統合キーやタイマー管理上の補助情報へ依存してはなりません（MUST NOT）。

### 4.12 属性反映契約

`ui-toast`の`variant`、`duration`、`dismissible`はpropertyとattributeの両面から操作できます。boolean値はattributeの有無で反映します。

| property      | attribute     | reflect | 備考        |
| ------------- | ------------- | ------- | ----------- |
| `variant`     | `variant`     | あり    | host既定値 |
| `duration`    | `duration`    | あり    | host既定値 |
| `dismissible` | `dismissible` | あり    | host既定値 |

---

## 5. 状態モデル

`ui-toast`の主要状態は、見た目のバリアントではなく、**通知が存在するか、退出中か、自動消滅対象か、一時停止中か** によって読み分けます。

### 5.1 基本状態

通知が0件のとき、hostは固定配置された空コンテナとして存在します。画面占有は最小で、ポインターイベントは発生しません。

### 5.2 追加状態

`ToastManager.show()`により通知が追加されると、新しい通知が先頭へ挿入されます。`message`は空白を単一スペースへ正規化し、前後空白を除去した値として扱います。

### 5.3 重複統合状態

同一通知キーの通知が既存に存在する場合、新規項目は追加せず既存通知を更新します。通知キーは、`dedupeKey`指定時はその値、未指定時は後方互換として`variant + normalizedMessage`です。

再通知は件数追加ではなく、**通知寿命の延長と再アクティブ化** として扱います。`variant`や`message`が変化していても、同一`dedupeKey`が与えられている場合は同一通知の更新として処理します。

また、`ToastManager.update(id, patch)`は、重複統合とは別経路で既存通知を更新する正規APIです。これは通知件数を増やさず、対象`id`の通知だけを更新します。対象が退出中であれば`visible`状態へ戻し、寿命を再計算します。

### 5.4 スタック上限状態

保持件数は最大3件です。4件目追加時には最古通知を即時削除します。これは退出アニメーション付きの閉鎖ではなく、ストアからの即時除去です。

### 5.5 timed / persistent 状態

- `duration > 0`の通知はtimed状態であり、自動消滅タイマーを持ちます。
- `duration = 0`の通知はpersistent状態であり、自動消滅しません。

### 5.6 一時停止状態

自動消滅タイマーは、現行実装では少なくとも次の契機で停止します。

- 非touchポインターがtoast上に入ったとき
- toast内にフォーカスが入ったとき
- `document.visibilityState === 'hidden'`のとき

ただし、**現行実装における物理的な停止状態管理は`pausedByInteraction`と`pausedByVisibility`の2フラグです。** hoverとfocusは個別reasonとしては保持されず、どちらもinteraction停止へ合流します。

したがって、現行契約として保証するのは「hover中に停止すること」「focus中に停止すること」「hidden中に停止すること」までです。**hoverとfocusが重なった場合に、それぞれを独立理由として参照カウント管理することは現行実装では未対応です。** この厳密化は将来拡張の対象です。

### 5.7 退出状態

`dismiss(id)`が呼ばれると、その通知は`exiting`状態になります。自動消滅タイマーは停止し、その後`150` msの退出タイマーを経てストアから除去されます。

### 5.8 clear 状態

`clear()`は`dismiss()`と異なり、退出状態を経由せず、すべての通知とタイマーを即時破棄します。`clear()`は管理上の即時破棄であり、通常の個別終了とは意味が異なります。

### 5.9 文書可視性状態

host接続中、`document.visibilitychange`を監視します。文書がhiddenの間は全タイマーを停止し、visibleに戻ると再開します。

## 6. DOM / Accessibility

ルートは`:host`です。Shadow DOM内部に`.toast-container`を持ち、その中へ各通知を描画します。

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

- `success` / `info`は`role="status"`を用います。
- `warning` / `danger`は`role="alert"`を用います。
- 閉じるボタンのアクセシブル名は、現行契約では常に`通知を閉じる`です。
- アイコンは`aria-hidden="true"`として扱います。
- toastは非モーダルであり、フォーカスを奪いません。
- toast全体を1単位の通知として扱います。
- 強制フォーカス移動を行いません。
- persistent通知でも閉じる操作を必ず提供します。

### 6.2 閉じる操作契約

- `dismissible = true`のときのみ閉じるボタンを描画します。
- `duration > 0`かつ`dismissible = false`の通知では閉じるボタンを描画しません。
- `duration = 0`の通知は内部で`dismissible = true`に強制されるため、閉じるボタンを必ず描画します。

### 6.3 DOM 公開面と非公開面

公開契約に含めるのは、`role`、通知本文、閉じる操作、live region強度、非モーダル性です。

一方で、Shadow DOM内部のclass名、`data-*`属性、内部要素種別、内部構造の細部は原則として非公開面です。利用者はそれらへ依存してはなりません（MUST NOT）。

### 6.4 イベント契約

`ui-toast`は通知起動専用の独自カスタムイベントを公開しません。通知の生成と消去は`ToastManager`またはconvenience APIによって行います。

---

## 7. Visual Contract

`ui-toast`の視覚契約は、本文読解を遮断せずに通知の存在を認知できることです。

### 7.1 情報順位

- `info`は通常の情報通知として表示します。
- `success`は正常完了通知として表示します。
- `warning`は注意喚起として表示します。
- `danger`は失敗または重大警告として表示します。
- `warning`と`danger`は`info` / `success`より強い注意喚起として扱います。
- いずれのvariantも、画面全体を覆う遮断UIとして表示してはなりません（MUST NOT）。

### 7.2 配置契約

- 通常幅では右上固定に配置します。
- 狭い画面幅では下端固定に切り替えます。
- 新着は視覚上も先頭に積みます。
- 配置は公開設定に含めません。
- 任意配置は現行契約に含めません。

### 7.3 overlay 内での相対位置づけ

toastは **通常文書より上、blocking modalより下** に表示されなければなりません（MUST）。完全なoverlay hierarchyは別の横断契約で定義します。

### 7.4 視覚仕様

- 各toastは、背景、境界線、角丸、影を持つ独立面として表示します。
- iconはvariantに対応する視覚的差異を持たなければなりません（MUST）。
- 本文は複数行へ折り返し可能でなければなりません（MUST）。
- container自体は`pointer-events: none`、各toastのみ`pointer-events: auto`とします。
- dismissibleな通知では、閉じる操作が視覚的に認知可能でなければなりません（MUST）。
- 退出中の通知は、残留表示ではなく終了過程にあることが判別できなければなりません（MUST）。

### 7.5 視覚状態の優先順位

- `exiting`は`hover`、`focus-visible`、通常表示より優先します。
- `focus-visible`は`hover`より優先します。
- `forced-colors`では独自の意味色よりシステム色互換を優先します。
- `dark mode`では背景・文字・境界線の識別可能性を維持しなければなりません（MUST）。

### 7.6 モーション

- 通常環境では、追加時と消去時に状態変化を知覚できるモーションを用います。
- `prefers-reduced-motion: reduce`環境では、移動量の大きいモーションを用いてはなりません（MUST NOT）。
- モーションの有無によって、通知順序、dismissの意味、寿命計算、操作可能性が変化してはなりません（MUST NOT）。

### 7.7 参照トークン

本コンポーネントは主として次のトークンに依存します。

| 用途           | トークン                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| 位置余白       | `--space-4` / `--space-8`                                                                 |
| スタック間隔   | `--space-2`                                                                               |
| 内部余白       | `--space-3` / `--space-4`                                                                 |
| 最大幅         | `--toast-max-width`                                                                       |
| z-index        | `--z-toast`                                                                               |
| 既定背景       | `--bg-surface-2`                                                                          |
| success背景   | `--bg-success-subtle`                                                                     |
| warning背景   | `--bg-warning-subtle`                                                                     |
| danger背景    | `--bg-danger-subtle`                                                                      |
| 既定文字色     | `--fg-default`                                                                            |
| 控えめ文字色   | `--fg-muted`                                                                              |
| info色        | `--fg-info` / `--primary`                                                                 |
| success色     | `--fg-success`                                                                            |
| warning色     | `--fg-warning`                                                                            |
| danger色      | `--fg-danger`                                                                             |
| 境界線         | `--border-default` / `--border-width`                                                     |
| 角丸           | `--radius-md` / `--radius-sm`                                                             |
| 影             | `--elevation-lg`                                                                          |
| アイコン寸法   | `--icon-base` / `--icon-sm`                                                               |
| 文字寸法       | `--text-sm`                                                                               |
| 行高           | `--line-height-normal`                                                                    |
| フォーカス     | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| モーション時間 | `--duration-fast` / `--duration-normal` / `--duration-slow`                               |
| イージング     | `--ease-out` / `--ease-in`                                                                |
| タッチ領域     | `--control-min-touch`                                                                     |

---

## 8. 環境別の振る舞い

### 8.1 Browser Runtime

本コンポーネントはbrowser runtimeを前提とする表示基盤です。`window`と`document`を利用するため、非browser環境は公開契約の対象外です。

### 8.2 Mobile

`max-width: 639px`では、表示位置を右上固定から下端固定へ切り替えます。横方向は左右余白を保った幅で表示し、本文と閉じる操作が欠けずに視認できなければなりません（MUST）。

### 8.3 Reduced Motion

`prefers-reduced-motion: reduce`環境では、追加・消去のモーションは移動量を抑えたものへ切り替えます。reduced motionは視覚効果の抑制であり、通知順序、寿命、dismissの意味を変更してはなりません（MUST NOT）。

### 8.4 Forced Colors

`forced-colors: active`環境では、背景、文字、境界線、フォーカス表示がシステム色で識別可能でなければなりません（MUST）。独自色による意味表現は補助であり、識別の唯一の手段にしてはなりません（MUST NOT）。box-shadowは保証しません。

### 8.5 Print

`@media print`では`:host`自体を非表示にします。toastは一時通知であり、印刷対象に含めません。

---

## 9. 境界条件

### 9.1 空文字メッセージ

`message`が空文字、または空白正規化後に空になる場合、通知は生成されず`null`を返します。

### 9.2 既定 duration

`duration`を省略した場合、`danger`は`6000` ms、それ以外は`4000` msです。

### 9.3 無効 duration

`duration`が有限数でない場合も、既定durationへフォールバックします。

### 9.4 列挙外 variant

`variant = "error"`は`danger`に正規化されます。これ以外の未知値または無効値は`info`にフォールバックします。

### 9.5 `duration = 0`

自動消滅しません。この場合、`dismissible: false`を明示しても閉じるボタンは表示されます。

### 9.6 同一キーの再通知

同一`dedupeKey`の再通知は統合され、件数は増えません。`dedupeKey`未指定の場合のみ、同一`variant + normalizedMessage`の再通知が統合されます。退出中だった場合も再アクティブ化されます。

### 9.7 variant 違いの同一文言

`dedupeKey`未指定時は、同一本文でもvariantが違えば別通知です。統合してはなりません。

ただし、同一`dedupeKey`が明示されている場合は、variantが変化しても同一通知の更新対象になり得ます。

### 9.8 上限超過

4件目追加時には最古を即時削除します。古い通知の退出演出は保証しません。

### 9.9 hover 停止

マウス等ではhover中にタイマー停止しますが、touch pointerでは停止しません。

### 9.10 focus 移動

toast内部でフォーカス移動している限りタイマーは再開しません。toast外へフォーカスが出た時点で再開します。

### 9.11 非存在 ID の dismiss

存在しないIDを`dismiss(id)`した場合は`false`を返します。

### 9.12 退出中 ID の dismiss

すでに退出中のIDに対しては`true`を返し、追加副作用は発生しません。

### 9.13 非 dismissible 通知

`duration > 0`かつ`dismissible = false`の通知では、閉じるボタンは描画されません。

### 9.14 複数 host と遅延接続 host

複数hostの扱いは4.3に従います。境界条件として、通知生成後に接続されたhostも、未消滅通知の現在スナップショットを初回同期で受け取ります。

### 9.15 `id` の形式

`id`の形式と意味は4.9に従います。境界条件として追加の例外はありません。

### 9.16 `clear()` の意味

`clear()`の意味は5.8に従います。境界条件として追加の例外はありません。

### 9.17 印刷時

印刷時の扱いは8.5に従います。

### 9.18 優先順位衝突時の原則

複数の状態や要因が同時に成立する場合、現行契約では次の優先順位で解決します。

1. `clear()`は最優先です。退出演出、個別dismiss、hover / focus / visibilityによる停止状態より優先し、すべてを即時破棄します。
2. `exiting`は表示中状態より優先します。退出中の通知は、新たな操作可能状態として扱いません。
3. 寿命停止条件は加算的に扱います。`hover`、`focus`、`document.visibilityState === 'hidden'`のいずれかが成立している間、timed通知の自動消滅は再開してはなりません（MUST NOT）。
4. `forced-colors`は通常のvariant色より優先します。意味色が保持できない場合でも、文字・境界線・フォーカス表示の識別可能性を優先します。
5. `focus-visible`は`hover`より優先します。両方が成立する場合、可視焦点を弱めてはなりません（MUST NOT）。
6. スタック上限超過時はoldest-dropを優先します。`danger`またはpersistent通知であっても、現行契約では自動保護しません。
7. 同一duplicate keyの再通知は、新規追加より既存通知の更新を優先します。

---

## 10. Storybook 契約

本節では、**現行確認済みのStory** と **追加予定の確認点** を分離します。両者を混在させません。

### 10.1 現行確認済みの Story

| Story                            | 固定する契約                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Default`                        | success通知が描画され、`role="status"`と閉じるボタンの`aria-label`が成立すること                                                                                                            |
| `VariantStateCombinations`       | `success/info`は`status`、`warning/danger`は`alert`であること。`danger`の既定durationが6000 msであること                                                                              |
| `OverflowAndOrderIntegrity`      | 新着が先頭に積まれ、4件目で最古が削除され、最大3件で保たれること                                                                                                                             |
| `DuplicateMergeAndDurationReset` | 同一duplicate keyは統合され、再通知でdurationがリセットされること                                                                                                                           |
| `HoverPauseAndResumeTimer`       | hover中はタイマー停止、hover解除後に再開すること                                                                                                                                              |
| `FocusPauseAndResumeTimer`       | focus中はタイマー停止、focusout後に再開すること                                                                                                                                               |
| `VisibilityPauseAndResumeTimer`  | hidden中はタイマー停止、visible復帰後に再開すること                                                                                                                                           |
| `DuplicateKeyRespectsVariant`    | `dedupeKey`未指定時は、同一本文でもvariantが異なれば統合しないこと                                                                                                                           |
| `DarkModeAndStyleContracts`      | dark modeで背景・文字・境界線の識別可能性が維持されること。forced-colorsでシステム色により可読性が保たれること。reduced-motionで過大な移動モーションを用いないこと。printで非表示になること |

### 10.2 追加予定の確認点

次の項目は、**本文で定義済みの契約のうち**、現行Storybookでまだ独立Storyとして固定していないものです。ここでは契約本文の再定義は行わず、確認対象のみを列挙します。

- 複数hostと遅延接続hostの同期
- 未知variantの`info`フォールバック
- `dismissible = false`時の閉じるボタン非表示
- `clear()`の即時破棄
- hoverとfocusの重畳時の停止継続
- `dedupeKey`指定時に、文言差分やvariant変化があっても同一通知として更新されること
- `update(id, patch)`により既存通知が更新され、durationが再計算されること

---

## 11. 現行実装で未対応の事項

本節は、前節の **「新規追加を検討する価値がある機能」** との重複を避けるため、設計説明の再掲は行わず、現行実装における **未対応状況のみ** を簡潔に整理します。

### 11.1 優先追加候補に対する未対応状況

| 項目                       | 現行状況                                                                        |
| -------------------------- | ------------------------------------------------------------------------------- |
| `dedupeKey`                | 未対応。重複統合は`variant + normalizedMessage`に依存します                   |
| `update(id, patch)`        | 未対応。既存toastの更新APIはありません                                      |
| 明示的な寿命ポリシー       | 未対応。寿命表現は`duration`数値に依存します                                  |
| 消去理由の観測             | 未対応。`timeout` / `dismiss` / `clear` / `overflow`の区別を外部観測できません |
| 単一action                | 未対応。通知本文と閉じるボタンのみです                                          |
| close labelのローカライズ | 未対応。`通知を閉じる`固定です                                                 |
| queue / backlog            | 未対応。上限超過時は最古を即時削除します                                        |

### 11.2 そのほかの未対応事項

次の項目は前節の優先追加候補には含めていませんが、将来厳密化や拡張の余地があります。

| 項目                                        | 現行状況                                                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 停止理由の個別管理                          | 未対応。タイマー停止は`pausedByInteraction`と`pausedByVisibility`の2フラグで管理され、hoverとfocusは個別reasonとして保持されません |
| 内部制御APIの物理分離                     | 未対応。`pause` / `resume` / `setVisibilityPaused`は実装上`ToastManager`からexportされており、内部用APIとして物理分離されていません    |
| 複数hostの重複警告                        | 未対応。正規構成は1 document 1 hostですが、重複hostを検出して警告または抑止する仕組みはありません                                         |
| 表示文字列とdedupe用正規化の分離          | 未対応。`normalizeMessage()`の結果が表示文言と重複統合キーの両方に使われます                                                                 |
| title / descriptionの構造化                | 未対応。本文は単一の`message`文字列です                                                                                                     |
| 配置の公開切り替え                          | 未対応。通常時右上・狭幅時下端に固定されています                                                                                              |
| 公開スナップショットの型分離                | 未対応。公開契約上は内部補助情報に依存不可ですが、型の物理的分離は未実施です                                                                  |
| `part`公開                                 | 未対応。外部スタイル拡張はCSS Custom Properties中心です                                                                                     |
| rich content                                | 未対応。HTMLコンテンツや任意スロットは受け付けません                                                                                         |
| 通知スコープ / チャネル分離                 | 未対応。通知は単一グローバルストアで管理され、`scope` / `channel` / `hostId`のような分離キーを持ちません                                     |
| overflow時の保護 / pinning / priority保持 | 未対応。上限超過時は常に最古を削除し、persistent toastや高重要度通知を保護する仕組みはありません                                             |
| live regionの詳細制御                      | 未対応。`role`の切り替えはありますが、`aria-live` / `aria-atomic` / `aria-relevant`などの詳細制御や公開設定面はありません                   |

### 11.3 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、**実装、Storybook、契約書** の3点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。

---

## 12. 補足

`ui-toast`は、必要な変化だけを非遮断で提示し、主文脈を壊さないための補助UIです。以後の変更でも、通知制御の正規入口を`ToastManager`に保つこと、通知寿命・重複統合・スタック秩序を崩さないこと、live region強度差と非blocking性を維持することを固定原則とします。
