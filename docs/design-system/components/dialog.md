# Dialog

## 1. 概要

本書は、`ui-dialog`の公開契約、状態モデル、アクセシビリティ、および視覚契約を定義するものです。

本書は、現行実装の逐語的説明ではなく、**長期保守に耐える正規契約**を定義します。現行実装と一致しない点がある場合は、本書の契約を上位に置きます。実装が未追従の事項は末尾に明示します。

`ui-dialog`は、重要な意思決定や補助情報を、本文や周辺UIから一時的に切り出して提示するためのコンポーネントです。単にオーバーレイを描画するのではなく、**モーダル／非モーダルの意味差**、**初期フォーカスの決定規則**、**Escによるキャンセル経路**、**トリガーへのフォーカス返却**、**開閉イベントの発火順序**を公開契約として固定します。

また、`ui-dialog`はネイティブ`<dialog>`を基盤としますが、利用者はShadow DOMの内部構造に依存せず、**開閉状態を制御する／名前と説明を与える／内容を配置する／閉鎖理由を観測する**という契約単位で利用します。

Rouaultにおけるdialogは、本文の流れを断ち切るための過剰な装置であってはなりません。したがって本コンポーネントの契約は、重要な確認・補助情報を確実に提示しつつ、**「没入して読む」ことのできるデザイン**を乱さない範囲で定義します。

---

## 2. 適用範囲

本書は、`ui-dialog`の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook契約
- 現行実装で未対応の事項

一方で、本書は次の事項を扱いません。

- ダイアログの文言設計、情報設計、意思決定フロー全体
- どの画面でdialogを使うべきかというプロダクト判断
- ダイアログ内部のフォーム送信やAPI実行の成否管理
- backdrop clickによるclose可否など、現時点で未公開の閉じ方ポリシー
- ダイアログ起動ボタンや起動導線の上位画面設計
- 複数ダイアログをどの場面で許可するかという画面単位の運用設計

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 3. 公開契約

`ui-dialog`は、`opened`、`modal`、`titleId`、`descriptionId`、`ariaLabelText`を公開入力として扱います。スロットは`title`スロット、既定スロット、`actions`スロットを持ちます。内部実装はネイティブ`<dialog>`ですが、利用者は`ui-dialog`を契約単位として扱います。

`opened`の既定値は`false`です。`modal`の既定値は`true`です。`titleId`、`descriptionId`、`ariaLabelText`は省略できますが、**開く時点では`title-id`または`aria-label`のいずれかによりアクセシブルネームを提供しなければなりません（MUST）**。どちらも与えない場合、openは成立しません。

`modal=true`は、背景操作を抑止するモーダル対話を表します。`modal=false`は、背景操作を抑止しない非モーダル対話を表します。両者は単なる見た目の差ではなく、**背景操作可否、bodyスクロールロック、`aria-modal`、Escの処理位置、フォーカス拘束**が異なります。

### 3.1 入力契約

| 名前            | 種別                                    | 必須   | 内容           | 契約                                                                                                                               |
| --------------- | --------------------------------------- | ------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `opened`        | property / attribute                    | いいえ | 開閉状態       | 唯一の公開開閉状態です。`true`で開き、`false`で閉じます。既定値は`false`です                                                   |
| `modal`         | property / attribute                    | いいえ | モーダル種別   | `true`は背景抑止付きのモーダル対話、`false`は背景操作可能な非モーダル対話です。既定値は`true`です                              |
| `titleId`       | property / attribute (`title-id`)       | いいえ | ラベル要素ID  | `title`スロット内の単一要素IDを参照し、`aria-labelledby`に反映します。開く場合は`aria-label`と合わせていずれか一方が必須です |
| `descriptionId` | property / attribute (`description-id`) | いいえ | 説明要素ID    | 既定スロット内の説明要素ID、または空白区切りのID群を参照し、`aria-describedby`に反映します                                     |
| `ariaLabelText` | property / attribute (`aria-label`)     | いいえ | アクセシブル名 | 可視titleを置かない場合のアクセシブルネームです                                                                                  |

### 3.2 スロット契約

| 名前         | 種別       | 位置づけ   | 内容                                             |
| ------------ | ---------- | ---------- | ------------------------------------------------ |
| `title`      | named slot | 見出し領域 | ダイアログ題名を受け取ります                     |
| 既定スロット | slot       | 本文領域   | ダイアログ本文、説明、フォームなどを受け取ります |
| `actions`    | named slot | 操作領域   | 確認、キャンセルなどの操作群を受け取ります       |

`title`スロットは見出し表示のための領域です。`title-id`を使う場合、その参照先はこのスロット内に存在しなければなりません（MUST）。`actions`スロットは操作領域として扱います。既定スロットは本文領域であり、内部スクロールの対象になります。

`actions`スロットは省略できます。この場合、初期フォーカスは右上のclose buttonにフォールバックします。`title`スロットも省略できますが、その場合は`aria-label`によるアクセシブルネームを与えなければなりません（MUST）。

### 3.3 状態制御契約

`opened`は、`ui-dialog`の唯一の公開開閉状態です。利用側は、dialogが開いているかどうかを`opened`によって判断しなければなりません（MUST）。`open()` / `close()`はconvenience APIであり、独立した状態機械ではありません。

したがって、`open()`は「`opened=true`を要求し、必要であればtriggerを記録する命令」、`close()`は「`opened=false`を要求する命令」として解釈します。開閉完了の観測には`opened`の値だけでなく、`ui-dialog-opened` / `ui-dialog-closed`を用います。

### 3.4 アクセシブルネーム / 説明参照契約

`title-id`を指定する場合、その参照先は`title`スロット内の単一要素でなければなりません（MUST）。実在しないID、または`title`スロット外の要素を指す`title-id`は無効入力です。`aria-label`は、可視titleを置かない場合の代替契約であり、可視titleが存在する構成では`title-id`を優先します。

`description-id`は省略できます。指定する場合、その参照先は既定スロット内の説明要素でなければなりません。複数説明を与える場合は、空白区切りのID群を用います。`description-id`の参照不整合は無効入力ですが、dialog自体のopen成否は`title-id` / `aria-label`と異なり、説明参照だけでは決まりません。

### 3.5 Dismiss Policy 契約

`ui-dialog`の閉鎖導線は、長期契約として次に固定します。

- close buttonによるcloseを常に許可します。
- Escによるcloseを常に許可します。
- backdrop clickやoutside pressによるcloseは許可しません。
- close抑止フックは持ちません。

これらは用途ごとの運用判断ではなく、`ui-dialog`の基底契約です。別のdismiss policyが必要な場合は、派生コンポーネントまたは別コンポーネントとして切り分けます。

### 3.6 公開メソッド

`ui-dialog`は、開閉制御をShadow DOMの内部実装から分離するため、次の公開メソッドを持ちます。

| 名前             | 種別   | 契約                                                                                                |
| ---------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `open(trigger?)` | method | ダイアログを開きます。`trigger`を省略した場合は現在の`activeElement`を開閉元候補として採用します |
| `close()`        | method | ダイアログを閉じます                                                                                |

`open(trigger?)`は、`trigger`が与えられた場合、その要素をフォーカス返却先として保持します。省略時は`document.activeElement`を基準に自動採用します。`open()`を既に開いている状態で再度呼んだ場合はno-opです。`close()`を閉じている状態で呼んだ場合もno-opです。

`open()` / `close()`は状態更新要求であり、成功可否や完了時刻を戻り値で表しません。完了観測はイベント契約に委ねます。

### 3.7 Open 失敗時の契約

`open()`、または`opened=true`によるopen要求は、常にopen成立を意味しません。アクセシブルネームが解決できない場合、またはネイティブ`<dialog>`の`showModal()` / `show()`が失敗する場合、実装はopenを中止し、`opened=false`に戻します。

openに失敗した場合、`ui-dialog-opened`は発火しません。現行契約では、open未成立を`ui-dialog-closed`によって補償通知することもしません。したがって、利用側は **open要求** と **open成立** を区別して扱わなければなりません（MUST）。open成立の観測には`ui-dialog-opened`を用います。

### 3.8 公開イベント

`ui-dialog`は、開閉、キャンセル、およびモード切替の契約を次のイベントで公開します。

| 名前                     | 種別                                  | 発火契約                                |
| ------------------------ | ------------------------------------- | --------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `ui-dialog-opened`       | `CustomEvent<{ trigger: HTMLElement   | null }>`                                | 開くアニメーション完了後に発火します |
| `ui-dialog-cancel`       | `CustomEvent<{ reason: 'escape' }>`   | Esc経路でcloseに入る直前に発火します |
| `ui-dialog-closed`       | `CustomEvent<{ reason: 'close-button' | 'cancel-escape'                         | 'programmatic'                       | 'attribute-sync' }>`                                                 | 閉じ処理が完了し、ネイティブdialogが閉じた後に発火します |
| `ui-dialog-mode-changed` | `CustomEvent<{ previous: 'modal'      | 'non-modal'; current: 'modal'           | 'non-modal' }>`                      | open中に`modal`が切り替わり、新モード同期が完了した後に発火します |

`ui-dialog-opened`の`detail.trigger`は、`open(trigger)`に与えた要素、または`open()`時に自動採用した要素です。`ui-dialog-cancel`はEsc起因の通知であり、閉鎖を抑止するcancelable eventではありません。`ui-dialog-closed`の`detail.reason`は、close button、Esc、公開`close()`、`opened=false`のいずれが入口だったかを区別します。

`modal`の切り替えは、論理的close/openではなく、**開状態のまま別モードへ遷移する状態変化**として扱います。したがって、open中の`modal`切り替えでは`ui-dialog-closed` / `ui-dialog-opened`を再発火せず、`ui-dialog-mode-changed`を用いて観測します。

### 3.9 イベント伝播契約

`ui-dialog-opened`、`ui-dialog-cancel`、`ui-dialog-closed`、`ui-dialog-mode-changed`は、いずれもhostから発火する`CustomEvent`です。現行契約では、これらのイベントは **bubblesしません**、**composedしません**、**cancelableではありません**。したがって、利用側はhost自身に対して購読しなければなりません（MUST）。親要素やdocumentでのイベント委譲を前提にしてはなりません（MUST NOT）。

### 3.10 属性反映契約

公開入力のうち、`opened`、`modal`、`titleId`、`descriptionId`、`ariaLabelText`はpropertyとattributeの両面から操作できます。`titleId`のHTML属性名は`title-id`、`descriptionId`のHTML属性名は`description-id`、`ariaLabelText`のHTML属性名は`aria-label`です。boolean値はattributeの有無で反映します。

| property        | attribute        | reflect | 備考                                                         |
| --------------- | ---------------- | ------- | ------------------------------------------------------------ |
| `opened`        | `opened`         | あり    | boolean attributeとして扱います                             |
| `modal`         | `modal`          | あり    | boolean attributeとして扱います                             |
| `titleId`       | `title-id`       | あり    | `aria-labelledby`に反映します                               |
| `descriptionId` | `description-id` | あり    | `aria-describedby`に反映します                              |
| `ariaLabelText` | `aria-label`     | あり    | `aria-labelledby`未指定時のアクセシブルネームとして使います |

### 3.11 列挙外値・無効値の扱い

`opened`と`modal`はboolean契約です。`title-id`、`description-id`、`aria-label`は文字列契約ですが、空文字列または空白のみの値は未指定として扱います。`title-id`と`aria-label`の両方が未指定のまま開こうとする構成には依存してはなりません（MUST NOT）。

`title-id`は、実在し、かつ`title`スロット内にある単一要素を参照しなければなりません（MUST）。この条件を満たさない場合、openは不成立です。`description-id`は省略可能ですが、指定する場合は既定スロット内の実在要素を参照しなければなりません。存在しないIDを与えた場合の支援技術上の読み上げ結果には依存してはなりません（MUST NOT）。

### 3.12 責務範囲

責務範囲には、ネイティブ`<dialog>`の開閉、モーダル／非モーダルの同期、初期フォーカスの決定、Esc経路の正規化、トリガーへのフォーカス返却、モーダル時のbodyスクロールロック、開閉イベントの発火、モード切替イベントの発火、およびアクセシビリティ属性の付与を含みます。

一方で、ダイアログ内でどの操作を主要操作にするか、確認ボタン押下後に何を実行するか、backdrop clickで閉じるべきかという用途別ポリシーの上書き、複数ダイアログの積層管理、confirm/cancelフローの業務意味づけは責務に含めません。

---

## 4. 状態モデル

`ui-dialog`の主要状態は、見た目の種別ではなく、**開いているか、モーダルか、名前を持つか、どこへフォーカスを返すか**によって読み分けます。

### 4.1 基本状態

最小状態は、`opened=false`、`modal=true`、アクセシブルネーム未解決、内容未表示の状態です。この状態ではネイティブdialogは閉じており、bodyスクロールロックも持ちません。

### 4.2 開状態

`opened=true`になると、内部`<dialog>`を開く処理へ入ります。既にネイティブdialogが開いている場合は、その状態を再利用しつつ、Esc監視、初期フォーカス、`ui-dialog-opened`発火を同期します。

開いた直後ではなく、**開くアニメーション完了後**に`ui-dialog-opened`を発火する点が重要です。利用者は「表示要求時刻」ではなく「表示完了時刻」をイベント契約として扱います。

### 4.3 モーダル状態

`modal=true`の場合、`showModal()`により開きます。このとき`aria-modal="true"`を付与し、ネイティブdialogのモーダル挙動を利用します。Escによるネイティブ`cancel`を捕捉し、`ui-dialog-cancel`を発火したうえでcloseに進みます。

モーダル状態では、背景との同時操作を前提にしません。dialogを画面上の最前面の意思決定領域として扱います。bodyスクロールロックは、モーダル状態でのみ有効です。

### 4.4 非モーダル状態

`modal=false`の場合、`show()`により開きます。このとき`aria-modal`は付与しません。ネイティブdialogの`cancel`に依存できないため、dialog自身がEscを正規化してcloseに進みます。

非モーダル状態はFocus Trapを持ちません。dialog外へフォーカスを移せます。背景クリックで自動的に閉じる契約も持ちません。非モーダル状態ではbodyスクロールロックを行いません。

### 4.5 名前解決状態

`ui-dialog`は、開く時点でアクセシブルネームを持たなければなりません。`title-id`と`aria-label`のいずれかが正規入力です。両方とも解決できない場合、実装はエラーを出力して`opened`を`false`に戻し、開く処理を継続しません。

このため、`opened=true`を与えれば常に開くという契約ではありません。**アクセシブルネームを満たした場合に限って開く**という、前提条件付きの状態遷移です。

### 4.6 初期フォーカス状態

開いた直後の初期フォーカスは、既定戦略として`actions`スロット内の最初のfocusable要素を優先します。該当要素が存在しない場合、右上のclose buttonにフォールバックします。本文領域やtitleには自動フォーカスしません。

初期フォーカス探索の対象は、`actions`スロットに割り当てられた要素とその子孫に限定します。既定スロット本文や`title`スロットは初期フォーカス探索対象に含みません。探索順はDOM順です。`disabled`要素、`tabindex="-1"`要素、hidden inputなど、通常のキーボード移動対象にならない要素には依存しません。

この既定戦略は、意味的最適解を常に保証するものではありません。フォーム主体のdialogや破壊的確認dialogなど、意味に応じた初期フォーカス戦略が必要な場合は、将来の明示APIで扱う前提とし、現時点では`actions-first`を正規契約として固定します。

### 4.7 閉状態

`opened=false`になると、閉じアニメーションを経てネイティブ`dialog.close()`を実行します。`ui-dialog-closed`はネイティブclose完了後に発火します。閉じた後は、Esc監視解除、必要に応じたbodyスクロールロック解除、トリガーへのフォーカス返却を行います。

close button、Esc、公開`close()`、または外部からの`opened=false`のいずれでも、最終的な閉状態の処理はこの共通経路に収束します。

### 4.8 キャンセル状態

Esc経路では、必ず`ui-dialog-cancel`を先に発火し、その後closeに進みます。したがって、Escによる閉鎖は`cancel -> closed`の順序で観測されます。

ただし、`ui-dialog-cancel`はcancelableではありません。利用者はこのイベントを「閉鎖要求の通知」として扱い、閉鎖抑止のフックとして期待してはなりません（MUST NOT）。

### 4.9 再入安全状態

`ui-dialog`は、開閉処理を内部キューで直列化します。これにより、`open()` / `close()`の連続呼び出し、`close()`中の再`open()`、`modal`切り替え中の再描画などが、単純な競合ではなく順序付き操作として扱われます。

たとえばclose中に再度`open()`した場合、閉鎖を打ち消して開状態を維持し、不要な`ui-dialog-closed`を発火しません。利用者は、**連続操作に対してイベントが重複発火しない**ことを契約として扱えます。

### 4.10 動的モード切り替え状態

open中に`modal`を変更した場合、dialogは開状態のまま別モードへ遷移します。内部実装としてネイティブdialogの再同期が必要な場合でも、契約上は`closed -> opened`ではなく、**単一のmode change** として扱います。

この遷移では`ui-dialog-mode-changed`を発火し、`aria-modal`、Esc経路、bodyスクロールロック、必要に応じた初期フォーカス再評価を同期します。`modal`の切り替えは見た目だけの切り替えではなく、**dialogの意味論とプラットフォーム挙動を丸ごと切り替える状態遷移**です。

---

## 5. DOM / Accessibility

ルートは`:host`です。Shadow DOM内部に単一のネイティブ`<dialog>`を持ち、その内部にtitle / body / actions / close buttonという**意味上の領域**を持ちます。内部DOMの具体的なclass名やwrapper要素の有無は公開契約ではありません。

```text
<ui-dialog>
  #shadow-root
    <dialog>
      [title region]
        <slot name="title"></slot>
      [close button]
      [body region]
        <slot></slot>
      [actions region]
        <slot name="actions"></slot>
    </dialog>
</ui-dialog>
```

### 5.1 Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 対話主体はネイティブ`<dialog>`です。
- 開く時点でアクセシブルネームを持たなければなりません（MUST）。
- `title-id`を与える場合、`aria-labelledby`に反映します。
- `description-id`を与える場合、`aria-describedby`に反映します。
- `title-id`が未指定の場合のみ`aria-label`を使用します。
- `modal=true`の場合のみ`aria-modal="true"`を付与します。
- close buttonは常に`aria-label="閉じる"`を持ちます。
- 初期フォーカスは`actions`内の最初のfocusable要素、なければclose buttonです。
- close後はトリガーへフォーカスを返却します。

### 5.2 Close Button 契約

現行実装では、close buttonは常に描画される公開契約です。これは単なる装飾ではなく、`actions`未指定時の初期フォーカスfallbackと、最低限の閉鎖導線を担う構造要素です。利用側はclose buttonの不存在や非表示を前提にしてはなりません（MUST NOT）。

また、close buttonは補助的な閉鎖導線であり、主要操作の代替ではありません。主要な確認・送信・承認などの操作は`actions`スロット側で表現します。

本コンポーネントで重要なのは、**dialogらしく見せることではなく、dialogとして意味づけられたネイティブ要素を使い、名前・説明・フォーカスの契約を崩さないこと**です。単なる`div`オーバーレイや独自role構成には依存しません。

### 5.3 フォーカス契約

初期フォーカス探索に用いる対象は、`actions`スロットに割り当てられた要素、およびその子孫にある通常のfocusable要素です。優先順はDOM順です。focusable要素が存在しない場合、close buttonを利用して最低限の閉鎖導線を確保します。

close時のフォーカス返却先は、`open(trigger)`に与えた要素、または`open()`時点の`document.activeElement`です。これにより、キーボード操作利用者は起点へ戻れます。

返却先がclose時点で存在しない、focus不可、または接続解除済みである場合は、返却を試みません。この場合、dialogは任意要素へフォーカスを飛ばしてはなりません（MUST NOT）。フォーカス返却失敗時のアプリケーション固有fallbackは、上位レイヤの責務です。

### 5.4 キーボード契約

- `modal=true`ではネイティブ`cancel`を通じてEscを処理します。
- `modal=false`ではopen中のdialogがdocument keydownでEscを正規化します。
- Esc経路では`ui-dialog-cancel`を発火し、その後closeに進みます。
- `modal=false`ではdialog外へフォーカス移動できます。

複数dialogの最前面解決は`ui-dialog`自身の責務ではありません。積層が必要な場合のEscルーティングは、上位のdialog managerが扱います。

### 5.5 Body スクロールロック契約

bodyスクロールロックは、`modal=true`の場合にのみ有効です。`modal=false`ではbodyスクロールロックを行いません。これにより、`modal`の意味と背景操作可否を一致させます。

実装は`body`に`data-ui-dialog-open`属性を付与しても構いませんが、その有無自体は公開契約ではありません。公開契約は、**モーダル時のみ背景スクロールを抑止し、非モーダル時は抑止しない**ことです。

---

## 6. Visual Contract

`ui-dialog`の視覚契約は、重要な内容を一時的に前景化しつつ、本文との階層差を明確にすることにあります。

### 6.1 情報順位

- dialog本体は通常の面より高いelevationを持ちます。
- `modal=true`の場合、scrimとblurによって背景を後景化します。
- titleはheader内で最上位の情報として扱います。
- actionsはfooterで右寄せし、意思決定の終端として扱います。
- close buttonは補助的な閉鎖導線であり、主要操作の代替ではありません。

本文近傍でdialogを使う場合でも、常時強い発光や過剰な境界装飾には依存しません。dialogは本文を破壊するノイズではなく、**一時的な判断面**として読める必要があります。

### 6.2 レイアウト

dialog本体は、header / body / footerの3段構成として解釈できるレイアウトを持ちます。bodyは`minmax(0, 1fr)`を用いた可変領域であり、内部スクロールを持ちます。headerとfooterは固定領域です。

サイズはCSS Custom Propertiesで制御し、既定では次のような制約を持ちます。

- 最小幅: `--ui-dialog-min-width`
- 最大幅: `--ui-dialog-max-width`
- 最大高さ: `--ui-dialog-max-height`

既定値は、本文を読める最低限の横幅と、ビューポートに収まる最大サイズを両立する方向に設定されています。

### 6.3 視覚仕様

- dialog本体は角丸矩形です。
- 背景色と前景色はテーマトークンに従います。
- 開く時はscale + fadeのenter animationを持ちます。
- 閉じる時は`data-closing`によるexit animationを持ちます。
- modal時のbackdropはfade animationを持ちます。
- bodyは縦スクロール可能で、内容が長くてもheader / footerは分離されます。
- close buttonは`ghost` / `sm`相当の軽量操作として表示します。

### 6.4 フォーカス表示

close button自体のフォーカス表示は`ui-button`側契約に委ねます。dialog自体は初期フォーカス先を定めますが、dialogコンテナ全体に独自のフォーカスリングを描く契約は持ちません。

### 6.5 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途               | トークン                          |
| ------------------ | --------------------------------- |
| 背景               | `--bg-default` / `--bg-surface-3` |
| 前景色             | `--fg-default`                    |
| 角丸               | `--radius-xl`                     |
| 影                 | `--elevation-xl`                  |
| 余白               | `--space-*`                       |
| スクリム不透明度   | `--opacity-scrim`                 |
| ブラー             | `--blur-lg`                       |
| アニメーション時間 | `--duration-slower`               |
| イージング         | `--ease-out` / `--ease-in`        |
| 開始スケール       | `--scale-enter`                   |
| 枠線幅             | `--border-width`                  |

---

## 7. 環境別の振る舞い

### 7.1 Reduced Motion

`prefers-reduced-motion: reduce`環境では、dialog本体およびbackdropのanimation時間を極小化します。これにより、視覚的な移動量を最小に抑えます。

### 7.2 Dark Mode

`prefers-color-scheme: dark`環境では、dialog背景を`--bg-surface-3`に切り替え、境界線のエッジハイライトを追加します。暗背景上でもdialogの輪郭を判読できる必要があります。

### 7.3 Forced Colors

`forced-colors: active`環境では、dialog背景を`Canvas`、境界線を`CanvasText`に切り替え、box-shadowを除去します。close buttonもシステム色前提に寄せます。独自色だけに依存して視認性を確保する設計にはしません。

### 7.4 Print

`@media print`ではdialog本体およびbackdropを非表示にします。dialogは印刷文脈では一時的な対話面であり、印刷対象の恒久コンテンツとして扱いません。

---

## 8. 関連契約

### 8.1 起動・閉鎖契約

`ui-dialog`は、自身で起動ボタンを持ちません。開閉の入口は公開`open()` / `close()`、または`opened` propertyの外部制御です。したがって、dialogの存在と起動導線は分離されています。

- `opened`は唯一の公開開閉状態です。
- `open(trigger?)`は`opened=true`を要求し、必要に応じて開閉元要素を保存します。
- `close()`は`opened=false`を要求します。
- close buttonは内部で`close()`を呼びます。
- Escは`ui-dialog-cancel`を発火した後にclose経路へ入ります。

### 8.2 閉鎖経路差分契約

閉鎖経路は最終的に共通のclose完了処理へ収束しますが、入口ごとの差分は次のとおりです。

| 経路                | `ui-dialog-cancel` | `ui-dialog-closed` | フォーカス返却 | 備考                                 |
| ------------------- | ------------------ | ------------------ | -------------- | ------------------------------------ |
| close button        | 発火しません       | 発火します         | 行います       | `reason='close-button'`を用います   |
| Esc (`modal=true`)  | 発火します         | 発火します         | 行います       | `reason='cancel-escape'`を用います  |
| Esc (`modal=false`) | 発火します         | 発火します         | 行います       | `reason='cancel-escape'`を用います  |
| 公開`close()`      | 発火しません       | 発火します         | 行います       | `reason='programmatic'`を用います   |
| `opened=false`      | 発火しません       | 発火します         | 行います       | `reason='attribute-sync'`を用います |

利用側は、Esc経路だけが`ui-dialog-cancel`を伴うこと、`ui-dialog-closed`が`detail.reason`により閉鎖理由を区別することを前提にできます。

### 8.3 ネイティブ Dialog 依存契約

`ui-dialog`は、ネイティブ`<dialog>`に依存します。したがって、開閉は独自のCSS表示切り替えではなく、`showModal()` / `show()` / `close()`によって成立します。

この契約により、dialogの意味論、backdrop、ネイティブopen状態、cancel経路はプラットフォームに寄せられます。一方で、`showModal()` / `show()`が失敗する環境ではopenに失敗し得ます。その場合、実装は`opened=false`に戻して継続不能を表します。

### 8.4 単一 Dialog 契約

`ui-dialog`は、長期契約として **単一dialog単位の対話**のみを扱います。複数dialogの積層順序、Escの最前面解決、bodyロックの参照カウント管理は、このコンポーネント自身の責務ではありません。

複数dialogの積層が必要な場合は、上位のdialog managerまたは別コンポーネントが扱います。したがって、`ui-dialog`単体に対して複数openの安定動作を期待してはなりません（MUST NOT）。

### 8.5 スタイル拡張契約

`ui-dialog`は、CSS Custom Propertiesによるサイズ・色・アニメーション調整を許容しますが、Shadow DOM内部のclass名やDOM構造の細部には依存できません。header / body / footerの内部classは公開拡張面ではありません。

現行実装は`::part(...)`を公開していません。したがって、局所要素へのスタイル介入を公開安定APIとして期待してはなりません（MUST NOT）。公開スタイル面として扱うのは、hostに対する外部スタイルと、本書で列挙したCSS Custom Propertiesです。

利用者は内部DOMを直接探索して構造変更を前提にしてはなりません（MUST NOT）。スタイル調整は、外部ホストスタイルまたはトークン差し替えを主に用います。

---

## 9. 境界条件

### 9.1 `title-id` と `aria-label` の両方が未指定

アクセシブルネームが欠落しているため、dialogは開きません。実装はエラーを出力し、`opened=false`に戻します。

### 9.2 `title-id` が存在しない、または `title` スロット外を参照する

ラベル参照契約に反するため、dialogは開きません。`aria-label`を併用していても、可視titleを置く構成では`title-id`を正しく解決しなければなりません。

### 9.3 `title` スロット省略 + `aria-label` 指定

titleを表示しないdialogであっても、`aria-label`によりアクセシブルネームを提供できます。この場合、`aria-labelledby`は出力しません。

### 9.4 `actions` スロット未指定

初期フォーカス先はclose buttonになります。close buttonが最低限の閉鎖導線を担います。

### 9.5 `modal=true` の Esc

ネイティブcancelを捕捉し、`ui-dialog-cancel`を発火した後にcloseします。`cancel -> closed`の順序を維持し、`ui-dialog-closed`の`reason`は`cancel-escape`です。

### 9.6 `modal=false` の Esc

dialog外へフォーカスを移した状態でも、Esc closeが成立します。背景クリックで自動closeはしません。`ui-dialog-closed`の`reason`は`cancel-escape`です。

### 9.7 trigger 省略で `open()`

`document.activeElement`をフォーカス返却先として自動採用します。close後はその要素へ戻ることを試みます。

### 9.8 多重 `open()` / `close()`

既に開いている状態での`open()`、既に閉じている状態での`close()`はno-opです。イベント重複発火には依存しません。

### 9.9 Open 失敗時

アクセシブルネーム未解決、`title-id`参照不整合、またはネイティブ`<dialog>` open失敗時には、open要求は不成立になります。この場合、`opened`は`false`に戻り、`ui-dialog-opened`は発火しません。`ui-dialog-closed`による代替通知も行いません。

### 9.10 close 中の再 open

close中に再度`open()`した場合、閉鎖を打ち消して開状態を維持します。この場合、不要な`ui-dialog-closed`は発火しません。

### 9.11 open 中の `modal` 切り替え

`ui-dialog-closed` / `ui-dialog-opened`は再発火せず、`ui-dialog-mode-changed`により観測します。bodyスクロールロックと`aria-modal`は新モードに同期します。

### 9.12 フォーカス返却先が無効化されている

返却先が接続解除済み、focus不可、または不可視である場合は、返却を行いません。dialog自身が任意の別要素へフォーカスを飛ばして補償することはしません。

### 9.13 複数 dialog 同時 open

`ui-dialog`単体の公開契約では扱いません。安定動作を期待してはなりません。

### 9.14 外部からの `opened` 制御

`opened=true` / `false`を直接変更しても、公開メソッド経由と同じ状態契約に従います。イベントは、状態遷移の成否に応じて発火します。

---

## 10. Storybook 契約

各Storyは見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                                 | 固定する契約                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ModalCriticalDecision`               | モーダルな基本構成がtitle / description / actionsとともに成立すること                                         |
| `ModalCriticalDecisionOpenClose`      | `open()` / `close()`、`aria-modal`、ラベル／説明付与、初期フォーカス、scroll lock、フォーカス返却が成立すること |
| `ModalCriticalDecisionCloseButton`    | close buttonの実経路で閉じられること                                                                           |
| `ModalEscCancelSequence`              | モーダルEscで`cancel -> closed`の順序を維持すること                                                         |
| `NonModalLightweightInfo`             | `modal=false`で`aria-modal`を持たず、Escで閉じ、背景クリックでは閉じないこと                                |
| `NoActionsInitialFocusFallback`       | `actions`未提供時にclose buttonへ初期フォーカスすること                                                      |
| `TriggerFallbackAndReentrancySafety`  | trigger自動採用、多重open / closeの再入安全性、不要イベント非発火が成立すること                              |
| `AriaLabelFallback`                   | `aria-labelledby`を使わず`aria-label`だけで名前付けできること                                                |
| `MultiDialogScrollLockReferenceCount` | 現行実装の互換確認です。長期契約として複数openを保証するものではありません                                    |
| `AttributeDrivenOpenState`            | `opened`属性駆動でも開閉とイベントが成立すること                                                               |
| `LiveModalModeSwitching`              | open中の`modal`切り替えで`aria-modal`、bodyロック、モード変更イベントが同期すること                        |
| `VisualDarkMode`                      | ダークモード相当トークンで視覚破綻しないこと                                                                    |
| `VisualForcedColors`                  | forced-colors相当で境界と可読性を維持すること                                                                  |
| `VisualReducedMotion`                 | reduced motion相当で開閉契約が維持されること                                                                   |

---

## 11. 補足

`ui-dialog`の要点は、オーバーレイを出すことそのものではありません。**dialogの意味論、フォーカス、Esc、アニメーション完了後イベント、bodyロックを、ネイティブ`<dialog>`の上で一貫させること**にあります。

したがって、今後の変更でも次の5点は崩さない方がよいです。

1. 実体は常にネイティブ`<dialog>`であること。
2. `opened`を唯一の公開開閉状態として扱うこと。
3. 開く前提としてアクセシブルネーム必須を緩めないこと。
4. 初期フォーカスとトリガー返却の契約を崩さないこと。
5. Esc・close button・属性制御の各閉鎖経路を`detail.reason`付きの`closed`契約へ収束させること。

---

## 12. 将来拡張の原則

本節は現行実装の公開契約ではなく、将来追加を検討する場合の設計指針です。追加機能は、dialogを多機能化するためではなく、**意味論・操作性・観測可能性を明確にしつつ読書の没入を壊さない場合に限って**採用します。

### 12.1 最優先で検討する価値がある機能

#### 12.1.1 初期フォーカス対象の明示指定

現行契約の既定戦略は`actions-first`ですが、これは意味的最適解を常に保証しません。フォーム主体のdialog、破壊的確認dialog、入力開始を優先したいdialogでは、最初にfocusすべき要素が`actions`内にない場合があります。そのため、初期フォーカス対象を明示指定できる機能は、最優先で検討価値があります。

この機能を採用する場合、次を満たします。

- 既定戦略は維持し、指定がある場合のみ上書きします。
- Shadow DOM内部要素ではなく、利用側が与えられる公開契約面で指定します。
- 任意selector依存を避け、IDまたは意味づけ可能な参照方式を優先します。
- autofocusの乱立で読書や操作の流れを壊しません。

#### 12.1.2 Open 失敗イベント

現行契約では、open失敗時は`opened=false`に戻り、`ui-dialog-opened`も`ui-dialog-closed`も発火しません。この挙動自体は整合していますが、利用側からは失敗理由を観測しにくいという欠点があります。そのため、open不成立を明示通知するイベントは、最優先で検討価値があります。

この機能を採用する場合、次を満たします。

- 失敗は専用イベントで通知し、`closed`で代替しません。
- reasonは列挙値で固定し、自由文字列にしません。
- `missing-accessible-name`、`invalid-title-reference`、`native-open-failed`など、原因粒度を必要十分に保ちます。
- console errorの有無とは独立して、公開イベントだけで観測可能にします。

#### 12.1.3 初期フォーカス戦略の列挙化

個別のfocus target指定とは別に、戦略自体を列挙値として公開する機能も検討価値があります。これは個別指定より抽象度が高く、dialog群全体でUXを揃えやすいという利点があります。

この機能を採用する場合、次を満たします。

- 既定戦略は`actions-first`とします。
- `close-button`、`none`など、意味が明確な列挙だけを追加します。
- target指定機能と責務を重複させません。
- DOM順への暗黙依存をAPI名に持ち込みません。

### 12.2 条件付きで検討価値がある機能

#### 12.2.1 Dismiss Policy の公開

backdrop clickで閉じるか、Escを無効化するか、close buttonを隠せるかといったdismiss policyは、用途によっては価値があります。ただし、dialogの意味を曖昧にしやすいため、基底コンポーネントに安易に導入するべきではありません。必要性が明確な場合に限って検討します。

この機能を採用する場合、次を満たします。

- `modal`とdismiss可否を混同しません。
- booleanを増やさず、enumまたはpolicy objectで扱います。
- close不能dialogを導入する場合は代替導線を必須にします。
- backdrop click許可時も、フォーカス返却とイベント順序を壊しません。

#### 12.2.2 Header / Footer の構造切り替え

現行契約はtitle / body / actions / close buttonの意味境界を重視しています。一方で、補助的dialogやミニマルdialogの要求が増える場合、footer非表示やclose button位置変更などの構造切り替えが有効なことがあります。ただし、見た目都合で導入すると責務が濁るため、条件付きでのみ検討します。

この機能を採用する場合、次を満たします。

- 構造差分がアクセシビリティ契約を壊さないこと。
- close導線を消す場合は代替導線を必須にすること。
- title / body / actionsの意味境界を曖昧にしないこと。
- 単なるpadding調整のために構造APIを追加しません。

#### 12.2.3 `::part(...)` による限定的なスタイル公開

現行契約は内部DOM非公開を基本方針としますが、実運用ではclose buttonやbody領域だけを局所的に調整したい要件が出る可能性があります。その場合、限定的な`::part(...)`公開は検討価値があります。

この機能を採用する場合、次を満たします。

- partは最小限に限定します。
- 一度公開したpartは長期安定APIとして扱います。
- CSS Custom Propertiesでは表現しにくい局所調整に限って導入します。
- 内部DOMの全面公開には寄せません。

#### 12.2.4 close 前の同期ガード

未保存入力や破壊的操作の途中でdialogが閉じることを防ぎたい場合、close前に同期的な拒否判定を行う機能は条件付きで価値があります。ただし、dialogをフロー制御装置へ肥大化させやすいため、慎重に扱います。

この機能を採用する場合、次を満たします。

- 非同期フックは導入しません。
- close抑止が必要な理由を用途側で明確に持ちます。
- `cancel` / `closed`のイベント意味論を壊しません。
- 基底dialogではなく、必要に応じて派生コンポーネントでの採用も検討します。

### 12.3 採用しない方針

次の方向は、dialogの責務を曖昧にしやすいため採りません。

- 複数dialog積層の本格サポートを`ui-dialog`自身に持ち込むこと
- 独自position systemやanchor追従をdialogに統合すること
- `confirm` / `destructive` / `info`などのvariantを基底dialogのAPIに乱立させること
- トースト、popover、tooltipなど異なる意味のUIをdialogに統合すること
- 任意副作用フックや非同期closeフックを増設すること
- 画面全体のroutingや状態管理をdialog自身に持ち込むこと

---

## 13. 実装追従メモ

本節は、現行の`dialog.ts`および`dialog.stories.ts`を基準として、**本書が定義する契約へどこまで追従済みか**、および **なお整理途上の事項は何か**を記録するものです。

2026-03-24時点で、次の事項は実装とStorybookが本書へ追従済みです。

- `opened`を唯一の公開開閉状態として扱う整理
- `modal=false`時にbodyスクロールロックを行わない契約
- `title-id`の参照整合性検証
- `description-id`の既定スロット参照検証
- `ui-dialog-closed.detail.reason`の公開
- `ui-dialog-cancel.detail.reason='escape'`の公開
- `ui-dialog-mode-changed`の公開
- open中の`modal`切り替えで`opened` / `closed`を再発火しないイベント意味論
- close button / Esc / `close()` / `opened=false`の閉鎖理由の区別

一方で、次の事項は依然として整理途上です。

### 13.1 単一 dialog 契約

本書では複数dialogの積層管理を`ui-dialog`自身の責務から外しました。一方、現行実装は非モーダルEscの最前面判定のために静的open dialogリストを保持しています。これは互換性維持のための実装詳細であり、長期契約としては扱いません。

### 13.2 disconnect 時の意味論

`disconnectedCallback()`における破棄時処理は実装されていますが、破棄をcloseと同一視するか、イベントやフォーカス返却をどう観測するかという契約面は本書でまだ固定していません。

### 13.3 Storybook の body 属性名依存

本書では`data-ui-dialog-open`のようなbody属性名自体を公開契約として扱いません。しかし現行Storybookには、この属性名を直接検証する回帰確認が残っています。これは公開契約確認ではなく、実装互換確認として読みます。

### 13.4 Storybook の内部 DOM / class 名依存

本書では内部DOM構造、wrapper要素、class名を公開契約から外しました。一方、現行Storybookは`.close-button`やshadowRoot内の`dialog`探索を含みます。これは回帰確認としては有効ですが、公開契約の検証としては限定的です。

### 13.5 複数 dialog 互換 Story の残存

`MultiDialogScrollLockReferenceCount`は長期契約ではなく、現行互換を確認するStoryとして残しています。本書の単一dialog契約と混同しないよう、将来的には互換Storyの分離または削除を検討します。

### 13.6 本節の扱い

本節は、現時点で依存可能な公開契約と、なお整理途上の実装詳細を切り分けるためのメモです。未整理事項を公開契約へ昇格させる場合は、実装、Storybook、契約書の3点を同時に更新します。

---

## 14. Static Shell Dialog

Global search dialogのようなstatic shell dialogは、`ui-dialog`の派生componentではありません。final HTMLにnative `<dialog>`をlight DOMとして保持し、Shadow DOM componentに依存しません。static global search dialogの詳細契約は`docs/contracts/search.md`を正本とします。

### 14.1 Controller Boundary

- close button、Esc、backdropなどの閉鎖導線はstatic DOM controllerが正規化します。
- SVG / path clickはcomposed pathとclosest boundaryによりbuttonまたはrowの操作へ正規化します。
- pseudo-element、icon、SVGはpointer targetを奪ってはなりません。
- body scroll lockはcontroller-owned stateとし、close completionで必ず解除します。
- native closeとcontroller起因closeはgenerationで区別し、cleanupとfocus returnを重複発火させません。

### 14.2 Focus And Disposal

- focus returnはclose reasonに応じて制御します。
- selection closeではreading flowを優先し、triggerへのfocus returnを行いません。
- dispose中およびdispose後のnative closeはuser-facing focus-return eventを発火させません。
- close pending / closing中のopen-requestは破棄し、close完了後に自動再実行しません。

### 14.3 Environment Contract

- `prefers-reduced-motion: reduce`ではdialog、closing dialog、backdrop、closing backdrop、spinner、操作buttonのanimation / transitionを抑制します。
- `forced-colors: active`ではdialogに`Canvas` / `CanvasText`、fieldに`Field` / `FieldText`、buttonに`ButtonText`を使い、spinnerのtransparent border sideを維持します。

`ui-dialog`の一般dismiss policyとstatic search dialogのbackdrop close policyは別契約です。static shell dialog固有の挙動を`ui-dialog`の一般契約へ逆流させてはなりません。
