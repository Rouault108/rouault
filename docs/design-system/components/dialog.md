# Dialog

## 1. 概要

本書は、`ui-dialog` の公開契約、状態モデル、アクセシビリティ、および視覚契約を定義するものです。

本書は、現行実装の逐語的説明ではなく、**長期保守に耐える正規契約**を定義します。現行実装と一致しない点がある場合は、本書の契約を上位に置きます。実装が未追従の事項は末尾に明示します。

`ui-dialog` は、重要な意思決定や補助情報を、本文や周辺 UI から一時的に切り出して提示するためのコンポーネントです。単にオーバーレイを描画するのではなく、**モーダル／非モーダルの意味差**、**初期フォーカスの決定規則**、**Esc によるキャンセル経路**、**トリガーへのフォーカス返却**、**開閉イベントの発火順序**を公開契約として固定します。

また、`ui-dialog` はネイティブ `<dialog>` を基盤としますが、利用者は Shadow DOM の内部構造に依存せず、**開閉状態を制御する／名前と説明を与える／内容を配置する／閉鎖理由を観測する**という契約単位で利用します。

Rouault における dialog は、本文の流れを断ち切るための過剰な装置であってはなりません。したがって本コンポーネントの契約は、重要な確認・補助情報を確実に提示しつつ、**「没入して読む」ことのできるデザイン**を乱さない範囲で定義します。

---

## 2. 適用範囲

本書は、`ui-dialog` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 現行実装で未対応の事項

一方で、本書は次の事項を扱いません。

- ダイアログの文言設計、情報設計、意思決定フロー全体
- どの画面で dialog を使うべきかというプロダクト判断
- ダイアログ内部のフォーム送信や API 実行の成否管理
- backdrop click による close 可否など、現時点で未公開の閉じ方ポリシー
- ダイアログ起動ボタンや起動導線の上位画面設計
- 複数ダイアログをどの場面で許可するかという画面単位の運用設計

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 3. 公開契約

`ui-dialog` は、`opened`、`modal`、`titleId`、`descriptionId`、`ariaLabelText` を公開入力として扱います。スロットは `title` スロット、既定スロット、`actions` スロットを持ちます。内部実装はネイティブ `<dialog>` ですが、利用者は `ui-dialog` を契約単位として扱います。

`opened` の既定値は `false` です。`modal` の既定値は `true` です。`titleId`、`descriptionId`、`ariaLabelText` は省略できますが、**開く時点では `title-id` または `aria-label` のいずれかによりアクセシブルネームを提供しなければなりません（MUST）**。どちらも与えない場合、open は成立しません。

`modal=true` は、背景操作を抑止するモーダル対話を表します。`modal=false` は、背景操作を抑止しない非モーダル対話を表します。両者は単なる見た目の差ではなく、**背景操作可否、body スクロールロック、`aria-modal`、Esc の処理位置、フォーカス拘束**が異なります。

### 3.1 入力契約

| 名前            | 種別                                    | 必須   | 内容           | 契約                                                                                                                               |
| --------------- | --------------------------------------- | ------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `opened`        | property / attribute                    | いいえ | 開閉状態       | 唯一の公開開閉状態です。`true` で開き、`false` で閉じます。既定値は `false` です                                                   |
| `modal`         | property / attribute                    | いいえ | モーダル種別   | `true` は背景抑止付きのモーダル対話、`false` は背景操作可能な非モーダル対話です。既定値は `true` です                              |
| `titleId`       | property / attribute (`title-id`)       | いいえ | ラベル要素 ID  | `title` スロット内の単一要素 ID を参照し、`aria-labelledby` に反映します。開く場合は `aria-label` と合わせていずれか一方が必須です |
| `descriptionId` | property / attribute (`description-id`) | いいえ | 説明要素 ID    | 既定スロット内の説明要素 ID、または空白区切りの ID 群を参照し、`aria-describedby` に反映します                                     |
| `ariaLabelText` | property / attribute (`aria-label`)     | いいえ | アクセシブル名 | 可視 title を置かない場合のアクセシブルネームです                                                                                  |

### 3.2 スロット契約

| 名前         | 種別       | 位置づけ   | 内容                                             |
| ------------ | ---------- | ---------- | ------------------------------------------------ |
| `title`      | named slot | 見出し領域 | ダイアログ題名を受け取ります                     |
| 既定スロット | slot       | 本文領域   | ダイアログ本文、説明、フォームなどを受け取ります |
| `actions`    | named slot | 操作領域   | 確認、キャンセルなどの操作群を受け取ります       |

`title` スロットは見出し表示のための領域です。`title-id` を使う場合、その参照先はこのスロット内に存在しなければなりません（MUST）。`actions` スロットは操作領域として扱います。既定スロットは本文領域であり、内部スクロールの対象になります。

`actions` スロットは省略できます。この場合、初期フォーカスは右上の close button にフォールバックします。`title` スロットも省略できますが、その場合は `aria-label` によるアクセシブルネームを与えなければなりません（MUST）。

### 3.3 状態制御契約

`opened` は、`ui-dialog` の唯一の公開開閉状態です。利用側は、dialog が開いているかどうかを `opened` によって判断しなければなりません（MUST）。`open()` / `close()` は convenience API であり、独立した状態機械ではありません。

したがって、`open()` は「`opened=true` を要求し、必要であれば trigger を記録する命令」、`close()` は「`opened=false` を要求する命令」として解釈します。開閉完了の観測には `opened` の値だけでなく、`ui-dialog-opened` / `ui-dialog-closed` を用います。

### 3.4 アクセシブルネーム / 説明参照契約

`title-id` を指定する場合、その参照先は `title` スロット内の単一要素でなければなりません（MUST）。実在しない ID、または `title` スロット外の要素を指す `title-id` は無効入力です。`aria-label` は、可視 title を置かない場合の代替契約であり、可視 title が存在する構成では `title-id` を優先します。

`description-id` は省略できます。指定する場合、その参照先は既定スロット内の説明要素でなければなりません。複数説明を与える場合は、空白区切りの ID 群を用います。`description-id` の参照不整合は無効入力ですが、dialog 自体の open 成否は `title-id` / `aria-label` と異なり、説明参照だけでは決まりません。

### 3.5 Dismiss Policy 契約

`ui-dialog` の閉鎖導線は、長期契約として次に固定します。

- close button による close を常に許可します。
- Esc による close を常に許可します。
- backdrop click や outside press による close は許可しません。
- close 抑止フックは持ちません。

これらは用途ごとの運用判断ではなく、`ui-dialog` の基底契約です。別の dismiss policy が必要な場合は、派生コンポーネントまたは別コンポーネントとして切り分けます。

### 3.6 公開メソッド

`ui-dialog` は、開閉制御を Shadow DOM の内部実装から分離するため、次の公開メソッドを持ちます。

| 名前             | 種別   | 契約                                                                                                |
| ---------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `open(trigger?)` | method | ダイアログを開きます。`trigger` を省略した場合は現在の `activeElement` を開閉元候補として採用します |
| `close()`        | method | ダイアログを閉じます                                                                                |

`open(trigger?)` は、`trigger` が与えられた場合、その要素をフォーカス返却先として保持します。省略時は `document.activeElement` を基準に自動採用します。`open()` を既に開いている状態で再度呼んだ場合は no-op です。`close()` を閉じている状態で呼んだ場合も no-op です。

`open()` / `close()` は状態更新要求であり、成功可否や完了時刻を戻り値で表しません。完了観測はイベント契約に委ねます。

### 3.7 Open 失敗時の契約

`open()`、または `opened=true` による open 要求は、常に open 成立を意味しません。アクセシブルネームが解決できない場合、またはネイティブ `<dialog>` の `showModal()` / `show()` が失敗する場合、実装は open を中止し、`opened=false` に戻します。

open に失敗した場合、`ui-dialog-opened` は発火しません。現行契約では、open 未成立を `ui-dialog-closed` によって補償通知することもしません。したがって、利用側は **open 要求** と **open 成立** を区別して扱わなければなりません（MUST）。open 成立の観測には `ui-dialog-opened` を用います。

### 3.8 公開イベント

`ui-dialog` は、開閉、キャンセル、およびモード切替の契約を次のイベントで公開します。

| 名前                     | 種別                                  | 発火契約                                |
| ------------------------ | ------------------------------------- | --------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `ui-dialog-opened`       | `CustomEvent<{ trigger: HTMLElement   | null }>`                                | 開くアニメーション完了後に発火します |
| `ui-dialog-cancel`       | `CustomEvent<{ reason: 'escape' }>`   | Esc 経路で close に入る直前に発火します |
| `ui-dialog-closed`       | `CustomEvent<{ reason: 'close-button' | 'cancel-escape'                         | 'programmatic'                       | 'attribute-sync' }>`                                                 | 閉じ処理が完了し、ネイティブ dialog が閉じた後に発火します |
| `ui-dialog-mode-changed` | `CustomEvent<{ previous: 'modal'      | 'non-modal'; current: 'modal'           | 'non-modal' }>`                      | open 中に `modal` が切り替わり、新モード同期が完了した後に発火します |

`ui-dialog-opened` の `detail.trigger` は、`open(trigger)` に与えた要素、または `open()` 時に自動採用した要素です。`ui-dialog-cancel` は Esc 起因の通知であり、閉鎖を抑止する cancelable event ではありません。`ui-dialog-closed` の `detail.reason` は、close button、Esc、公開 `close()`、`opened=false` のいずれが入口だったかを区別します。

`modal` の切り替えは、論理的 close/open ではなく、**開状態のまま別モードへ遷移する状態変化**として扱います。したがって、open 中の `modal` 切り替えでは `ui-dialog-closed` / `ui-dialog-opened` を再発火せず、`ui-dialog-mode-changed` を用いて観測します。

### 3.9 イベント伝播契約

`ui-dialog-opened`、`ui-dialog-cancel`、`ui-dialog-closed`、`ui-dialog-mode-changed` は、いずれも host から発火する `CustomEvent` です。現行契約では、これらのイベントは **bubbles しません**、**composed しません**、**cancelable ではありません**。したがって、利用側は host 自身に対して購読しなければなりません（MUST）。親要素や document でのイベント委譲を前提にしてはなりません（MUST NOT）。

### 3.10 属性反映契約

公開入力のうち、`opened`、`modal`、`titleId`、`descriptionId`、`ariaLabelText` は property と attribute の両面から操作できます。`titleId` の HTML 属性名は `title-id`、`descriptionId` の HTML 属性名は `description-id`、`ariaLabelText` の HTML 属性名は `aria-label` です。boolean 値は attribute の有無で反映します。

| property        | attribute        | reflect | 備考                                                         |
| --------------- | ---------------- | ------- | ------------------------------------------------------------ |
| `opened`        | `opened`         | あり    | boolean attribute として扱います                             |
| `modal`         | `modal`          | あり    | boolean attribute として扱います                             |
| `titleId`       | `title-id`       | あり    | `aria-labelledby` に反映します                               |
| `descriptionId` | `description-id` | あり    | `aria-describedby` に反映します                              |
| `ariaLabelText` | `aria-label`     | あり    | `aria-labelledby` 未指定時のアクセシブルネームとして使います |

### 3.11 列挙外値・無効値の扱い

`opened` と `modal` は boolean 契約です。`title-id`、`description-id`、`aria-label` は文字列契約ですが、空文字列または空白のみの値は未指定として扱います。`title-id` と `aria-label` の両方が未指定のまま開こうとする構成には依存してはなりません（MUST NOT）。

`title-id` は、実在し、かつ `title` スロット内にある単一要素を参照しなければなりません（MUST）。この条件を満たさない場合、open は不成立です。`description-id` は省略可能ですが、指定する場合は既定スロット内の実在要素を参照しなければなりません。存在しない ID を与えた場合の支援技術上の読み上げ結果には依存してはなりません（MUST NOT）。

### 3.12 責務範囲

責務範囲には、ネイティブ `<dialog>` の開閉、モーダル／非モーダルの同期、初期フォーカスの決定、Esc 経路の正規化、トリガーへのフォーカス返却、モーダル時の body スクロールロック、開閉イベントの発火、モード切替イベントの発火、およびアクセシビリティ属性の付与を含みます。

一方で、ダイアログ内でどの操作を主要操作にするか、確認ボタン押下後に何を実行するか、backdrop click で閉じるべきかという用途別ポリシーの上書き、複数ダイアログの積層管理、confirm/cancel フローの業務意味づけは責務に含めません。

---

## 4. 状態モデル

`ui-dialog` の主要状態は、見た目の種別ではなく、**開いているか、モーダルか、名前を持つか、どこへフォーカスを返すか**によって読み分けます。

### 4.1 基本状態

最小状態は、`opened=false`、`modal=true`、アクセシブルネーム未解決、内容未表示の状態です。この状態ではネイティブ dialog は閉じており、body スクロールロックも持ちません。

### 4.2 開状態

`opened=true` になると、内部 `<dialog>` を開く処理へ入ります。既にネイティブ dialog が開いている場合は、その状態を再利用しつつ、Esc 監視、初期フォーカス、`ui-dialog-opened` 発火を同期します。

開いた直後ではなく、**開くアニメーション完了後**に `ui-dialog-opened` を発火する点が重要です。利用者は「表示要求時刻」ではなく「表示完了時刻」をイベント契約として扱います。

### 4.3 モーダル状態

`modal=true` の場合、`showModal()` により開きます。このとき `aria-modal="true"` を付与し、ネイティブ dialog のモーダル挙動を利用します。Esc によるネイティブ `cancel` を捕捉し、`ui-dialog-cancel` を発火したうえで close に進みます。

モーダル状態では、背景との同時操作を前提にしません。dialog を画面上の最前面の意思決定領域として扱います。body スクロールロックは、モーダル状態でのみ有効です。

### 4.4 非モーダル状態

`modal=false` の場合、`show()` により開きます。このとき `aria-modal` は付与しません。ネイティブ dialog の `cancel` に依存できないため、dialog 自身が Esc を正規化して close に進みます。

非モーダル状態は Focus Trap を持ちません。dialog 外へフォーカスを移せます。背景クリックで自動的に閉じる契約も持ちません。非モーダル状態では body スクロールロックを行いません。

### 4.5 名前解決状態

`ui-dialog` は、開く時点でアクセシブルネームを持たなければなりません。`title-id` と `aria-label` のいずれかが正規入力です。両方とも解決できない場合、実装はエラーを出力して `opened` を `false` に戻し、開く処理を継続しません。

このため、`opened=true` を与えれば常に開くという契約ではありません。**アクセシブルネームを満たした場合に限って開く**という、前提条件付きの状態遷移です。

### 4.6 初期フォーカス状態

開いた直後の初期フォーカスは、既定戦略として `actions` スロット内の最初の focusable 要素を優先します。該当要素が存在しない場合、右上の close button にフォールバックします。本文領域や title には自動フォーカスしません。

初期フォーカス探索の対象は、`actions` スロットに割り当てられた要素とその子孫に限定します。既定スロット本文や `title` スロットは初期フォーカス探索対象に含みません。探索順は DOM 順です。`disabled` 要素、`tabindex="-1"` 要素、hidden input など、通常のキーボード移動対象にならない要素には依存しません。

この既定戦略は、意味的最適解を常に保証するものではありません。フォーム主体の dialog や破壊的確認 dialog など、意味に応じた初期フォーカス戦略が必要な場合は、将来の明示 API で扱う前提とし、現時点では `actions-first` を正規契約として固定します。

### 4.7 閉状態

`opened=false` になると、閉じアニメーションを経てネイティブ `dialog.close()` を実行します。`ui-dialog-closed` はネイティブ close 完了後に発火します。閉じた後は、Esc 監視解除、必要に応じた body スクロールロック解除、トリガーへのフォーカス返却を行います。

close button、Esc、公開 `close()`、または外部からの `opened=false` のいずれでも、最終的な閉状態の処理はこの共通経路に収束します。

### 4.8 キャンセル状態

Esc 経路では、必ず `ui-dialog-cancel` を先に発火し、その後 close に進みます。したがって、Esc による閉鎖は `cancel -> closed` の順序で観測されます。

ただし、`ui-dialog-cancel` は cancelable ではありません。利用者はこのイベントを「閉鎖要求の通知」として扱い、閉鎖抑止のフックとして期待してはなりません（MUST NOT）。

### 4.9 再入安全状態

`ui-dialog` は、開閉処理を内部キューで直列化します。これにより、`open()` / `close()` の連続呼び出し、`close()` 中の再 `open()`、`modal` 切り替え中の再描画などが、単純な競合ではなく順序付き操作として扱われます。

たとえば close 中に再度 `open()` した場合、閉鎖を打ち消して開状態を維持し、不要な `ui-dialog-closed` を発火しません。利用者は、**連続操作に対してイベントが重複発火しない**ことを契約として扱えます。

### 4.10 動的モード切り替え状態

open 中に `modal` を変更した場合、dialog は開状態のまま別モードへ遷移します。内部実装としてネイティブ dialog の再同期が必要な場合でも、契約上は `closed -> opened` ではなく、**単一の mode change** として扱います。

この遷移では `ui-dialog-mode-changed` を発火し、`aria-modal`、Esc 経路、body スクロールロック、必要に応じた初期フォーカス再評価を同期します。`modal` の切り替えは見た目だけの切り替えではなく、**dialog の意味論とプラットフォーム挙動を丸ごと切り替える状態遷移**です。

---

## 5. DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に単一のネイティブ `<dialog>` を持ち、その内部に title / body / actions / close button という**意味上の領域**を持ちます。内部 DOM の具体的な class 名や wrapper 要素の有無は公開契約ではありません。

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

- 対話主体はネイティブ `<dialog>` です。
- 開く時点でアクセシブルネームを持たなければなりません（MUST）。
- `title-id` を与える場合、`aria-labelledby` に反映します。
- `description-id` を与える場合、`aria-describedby` に反映します。
- `title-id` が未指定の場合のみ `aria-label` を使用します。
- `modal=true` の場合のみ `aria-modal="true"` を付与します。
- close button は常に `aria-label="閉じる"` を持ちます。
- 初期フォーカスは `actions` 内の最初の focusable 要素、なければ close button です。
- close 後はトリガーへフォーカスを返却します。

### 5.2 Close Button 契約

現行実装では、close button は常に描画される公開契約です。これは単なる装飾ではなく、`actions` 未指定時の初期フォーカス fallback と、最低限の閉鎖導線を担う構造要素です。利用側は close button の不存在や非表示を前提にしてはなりません（MUST NOT）。

また、close button は補助的な閉鎖導線であり、主要操作の代替ではありません。主要な確認・送信・承認などの操作は `actions` スロット側で表現します。

本コンポーネントで重要なのは、**dialog らしく見せることではなく、dialog として意味づけられたネイティブ要素を使い、名前・説明・フォーカスの契約を崩さないこと**です。単なる `div` オーバーレイや独自 role 構成には依存しません。

### 5.3 フォーカス契約

初期フォーカス探索に用いる対象は、`actions` スロットに割り当てられた要素、およびその子孫にある通常の focusable 要素です。優先順は DOM 順です。focusable 要素が存在しない場合、close button を利用して最低限の閉鎖導線を確保します。

close 時のフォーカス返却先は、`open(trigger)` に与えた要素、または `open()` 時点の `document.activeElement` です。これにより、キーボード操作利用者は起点へ戻れます。

返却先が close 時点で存在しない、focus 不可、または接続解除済みである場合は、返却を試みません。この場合、dialog は任意要素へフォーカスを飛ばしてはなりません（MUST NOT）。フォーカス返却失敗時のアプリケーション固有 fallback は、上位レイヤの責務です。

### 5.4 キーボード契約

- `modal=true` ではネイティブ `cancel` を通じて Esc を処理します。
- `modal=false` では open 中の dialog が document keydown で Esc を正規化します。
- Esc 経路では `ui-dialog-cancel` を発火し、その後 close に進みます。
- `modal=false` では dialog 外へフォーカス移動できます。

複数 dialog の最前面解決は `ui-dialog` 自身の責務ではありません。積層が必要な場合の Esc ルーティングは、上位の dialog manager が扱います。

### 5.5 Body スクロールロック契約

body スクロールロックは、`modal=true` の場合にのみ有効です。`modal=false` では body スクロールロックを行いません。これにより、`modal` の意味と背景操作可否を一致させます。

実装は `body` に `data-ui-dialog-open` 属性を付与しても構いませんが、その有無自体は公開契約ではありません。公開契約は、**モーダル時のみ背景スクロールを抑止し、非モーダル時は抑止しない**ことです。

---

## 6. Visual Contract

`ui-dialog` の視覚契約は、重要な内容を一時的に前景化しつつ、本文との階層差を明確にすることにあります。

### 6.1 情報順位

- dialog 本体は通常の面より高い elevation を持ちます。
- `modal=true` の場合、scrim と blur によって背景を後景化します。
- title は header 内で最上位の情報として扱います。
- actions は footer で右寄せし、意思決定の終端として扱います。
- close button は補助的な閉鎖導線であり、主要操作の代替ではありません。

本文近傍で dialog を使う場合でも、常時強い発光や過剰な境界装飾には依存しません。dialog は本文を破壊するノイズではなく、**一時的な判断面**として読める必要があります。

### 6.2 レイアウト

dialog 本体は、header / body / footer の 3 段構成として解釈できるレイアウトを持ちます。body は `minmax(0, 1fr)` を用いた可変領域であり、内部スクロールを持ちます。header と footer は固定領域です。

サイズは CSS Custom Properties で制御し、既定では次のような制約を持ちます。

- 最小幅: `--ui-dialog-min-width`
- 最大幅: `--ui-dialog-max-width`
- 最大高さ: `--ui-dialog-max-height`

既定値は、本文を読める最低限の横幅と、ビューポートに収まる最大サイズを両立する方向に設定されています。

### 6.3 視覚仕様

- dialog 本体は角丸矩形です。
- 背景色と前景色はテーマトークンに従います。
- 開く時は scale + fade の enter animation を持ちます。
- 閉じる時は `data-closing` による exit animation を持ちます。
- modal 時の backdrop は fade animation を持ちます。
- body は縦スクロール可能で、内容が長くても header / footer は分離されます。
- close button は `ghost` / `sm` 相当の軽量操作として表示します。

### 6.4 フォーカス表示

close button 自体のフォーカス表示は `ui-button` 側契約に委ねます。dialog 自体は初期フォーカス先を定めますが、dialog コンテナ全体に独自のフォーカスリングを描く契約は持ちません。

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

`prefers-reduced-motion: reduce` 環境では、dialog 本体および backdrop の animation 時間を極小化します。これにより、視覚的な移動量を最小に抑えます。

### 7.2 Dark Mode

`prefers-color-scheme: dark` 環境では、dialog 背景を `--bg-surface-3` に切り替え、境界線のエッジハイライトを追加します。暗背景上でも dialog の輪郭を判読できる必要があります。

### 7.3 Forced Colors

`forced-colors: active` 環境では、dialog 背景を `Canvas`、境界線を `CanvasText` に切り替え、box-shadow を除去します。close button もシステム色前提に寄せます。独自色だけに依存して視認性を確保する設計にはしません。

### 7.4 Print

`@media print` では dialog 本体および backdrop を非表示にします。dialog は印刷文脈では一時的な対話面であり、印刷対象の恒久コンテンツとして扱いません。

---

## 8. 関連契約

### 8.1 起動・閉鎖契約

`ui-dialog` は、自身で起動ボタンを持ちません。開閉の入口は公開 `open()` / `close()`、または `opened` property の外部制御です。したがって、dialog の存在と起動導線は分離されています。

- `opened` は唯一の公開開閉状態です。
- `open(trigger?)` は `opened=true` を要求し、必要に応じて開閉元要素を保存します。
- `close()` は `opened=false` を要求します。
- close button は内部で `close()` を呼びます。
- Esc は `ui-dialog-cancel` を発火した後に close 経路へ入ります。

### 8.2 閉鎖経路差分契約

閉鎖経路は最終的に共通の close 完了処理へ収束しますが、入口ごとの差分は次のとおりです。

| 経路                | `ui-dialog-cancel` | `ui-dialog-closed` | フォーカス返却 | 備考                                 |
| ------------------- | ------------------ | ------------------ | -------------- | ------------------------------------ |
| close button        | 発火しません       | 発火します         | 行います       | `reason='close-button'` を用います   |
| Esc (`modal=true`)  | 発火します         | 発火します         | 行います       | `reason='cancel-escape'` を用います  |
| Esc (`modal=false`) | 発火します         | 発火します         | 行います       | `reason='cancel-escape'` を用います  |
| 公開 `close()`      | 発火しません       | 発火します         | 行います       | `reason='programmatic'` を用います   |
| `opened=false`      | 発火しません       | 発火します         | 行います       | `reason='attribute-sync'` を用います |

利用側は、Esc 経路だけが `ui-dialog-cancel` を伴うこと、`ui-dialog-closed` が `detail.reason` により閉鎖理由を区別することを前提にできます。

### 8.3 ネイティブ Dialog 依存契約

`ui-dialog` は、ネイティブ `<dialog>` に依存します。したがって、開閉は独自の CSS 表示切り替えではなく、`showModal()` / `show()` / `close()` によって成立します。

この契約により、dialog の意味論、backdrop、ネイティブ open 状態、cancel 経路はプラットフォームに寄せられます。一方で、`showModal()` / `show()` が失敗する環境では open に失敗し得ます。その場合、実装は `opened=false` に戻して継続不能を表します。

### 8.4 単一 Dialog 契約

`ui-dialog` は、長期契約として **単一 dialog 単位の対話**のみを扱います。複数 dialog の積層順序、Esc の最前面解決、body ロックの参照カウント管理は、このコンポーネント自身の責務ではありません。

複数 dialog の積層が必要な場合は、上位の dialog manager または別コンポーネントが扱います。したがって、`ui-dialog` 単体に対して複数 open の安定動作を期待してはなりません（MUST NOT）。

### 8.5 スタイル拡張契約

`ui-dialog` は、CSS Custom Properties によるサイズ・色・アニメーション調整を許容しますが、Shadow DOM 内部の class 名や DOM 構造の細部には依存できません。header / body / footer の内部 class は公開拡張面ではありません。

現行実装は `::part(...)` を公開していません。したがって、局所要素へのスタイル介入を公開安定 API として期待してはなりません（MUST NOT）。公開スタイル面として扱うのは、host に対する外部スタイルと、本書で列挙した CSS Custom Properties です。

利用者は内部 DOM を直接探索して構造変更を前提にしてはなりません（MUST NOT）。スタイル調整は、外部ホストスタイルまたはトークン差し替えを主に用います。

---

## 9. 境界条件

### 9.1 `title-id` と `aria-label` の両方が未指定

アクセシブルネームが欠落しているため、dialog は開きません。実装はエラーを出力し、`opened=false` に戻します。

### 9.2 `title-id` が存在しない、または `title` スロット外を参照する

ラベル参照契約に反するため、dialog は開きません。`aria-label` を併用していても、可視 title を置く構成では `title-id` を正しく解決しなければなりません。

### 9.3 `title` スロット省略 + `aria-label` 指定

title を表示しない dialog であっても、`aria-label` によりアクセシブルネームを提供できます。この場合、`aria-labelledby` は出力しません。

### 9.4 `actions` スロット未指定

初期フォーカス先は close button になります。close button が最低限の閉鎖導線を担います。

### 9.5 `modal=true` の Esc

ネイティブ cancel を捕捉し、`ui-dialog-cancel` を発火した後に close します。`cancel -> closed` の順序を維持し、`ui-dialog-closed` の `reason` は `cancel-escape` です。

### 9.6 `modal=false` の Esc

dialog 外へフォーカスを移した状態でも、Esc close が成立します。背景クリックで自動 close はしません。`ui-dialog-closed` の `reason` は `cancel-escape` です。

### 9.7 trigger 省略で `open()`

`document.activeElement` をフォーカス返却先として自動採用します。close 後はその要素へ戻ることを試みます。

### 9.8 多重 `open()` / `close()`

既に開いている状態での `open()`、既に閉じている状態での `close()` は no-op です。イベント重複発火には依存しません。

### 9.9 Open 失敗時

アクセシブルネーム未解決、`title-id` 参照不整合、またはネイティブ `<dialog>` open 失敗時には、open 要求は不成立になります。この場合、`opened` は `false` に戻り、`ui-dialog-opened` は発火しません。`ui-dialog-closed` による代替通知も行いません。

### 9.10 close 中の再 open

close 中に再度 `open()` した場合、閉鎖を打ち消して開状態を維持します。この場合、不要な `ui-dialog-closed` は発火しません。

### 9.11 open 中の `modal` 切り替え

`ui-dialog-closed` / `ui-dialog-opened` は再発火せず、`ui-dialog-mode-changed` により観測します。body スクロールロックと `aria-modal` は新モードに同期します。

### 9.12 フォーカス返却先が無効化されている

返却先が接続解除済み、focus 不可、または不可視である場合は、返却を行いません。dialog 自身が任意の別要素へフォーカスを飛ばして補償することはしません。

### 9.13 複数 dialog 同時 open

`ui-dialog` 単体の公開契約では扱いません。安定動作を期待してはなりません。

### 9.14 外部からの `opened` 制御

`opened=true` / `false` を直接変更しても、公開メソッド経由と同じ状態契約に従います。イベントは、状態遷移の成否に応じて発火します。

---

## 10. Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                                 | 固定する契約                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ModalCriticalDecision`               | モーダルな基本構成が title / description / actions とともに成立すること                                         |
| `ModalCriticalDecisionOpenClose`      | `open()` / `close()`、`aria-modal`、ラベル／説明付与、初期フォーカス、scroll lock、フォーカス返却が成立すること |
| `ModalCriticalDecisionCloseButton`    | close button の実経路で閉じられること                                                                           |
| `ModalEscCancelSequence`              | モーダル Esc で `cancel -> closed` の順序を維持すること                                                         |
| `NonModalLightweightInfo`             | `modal=false` で `aria-modal` を持たず、Esc で閉じ、背景クリックでは閉じないこと                                |
| `NoActionsInitialFocusFallback`       | `actions` 未提供時に close button へ初期フォーカスすること                                                      |
| `TriggerFallbackAndReentrancySafety`  | trigger 自動採用、多重 open / close の再入安全性、不要イベント非発火が成立すること                              |
| `AriaLabelFallback`                   | `aria-labelledby` を使わず `aria-label` だけで名前付けできること                                                |
| `MultiDialogScrollLockReferenceCount` | 現行実装の互換確認です。長期契約として複数 open を保証するものではありません                                    |
| `AttributeDrivenOpenState`            | `opened` 属性駆動でも開閉とイベントが成立すること                                                               |
| `LiveModalModeSwitching`              | open 中の `modal` 切り替えで `aria-modal`、body ロック、モード変更イベントが同期すること                        |
| `VisualDarkMode`                      | ダークモード相当トークンで視覚破綻しないこと                                                                    |
| `VisualForcedColors`                  | forced-colors 相当で境界と可読性を維持すること                                                                  |
| `VisualReducedMotion`                 | reduced motion 相当で開閉契約が維持されること                                                                   |

---

## 11. 補足

`ui-dialog` の要点は、オーバーレイを出すことそのものではありません。**dialog の意味論、フォーカス、Esc、アニメーション完了後イベント、body ロックを、ネイティブ `<dialog>` の上で一貫させること**にあります。

したがって、今後の変更でも次の 5 点は崩さない方がよいです。

1. 実体は常にネイティブ `<dialog>` であること。
2. `opened` を唯一の公開開閉状態として扱うこと。
3. 開く前提としてアクセシブルネーム必須を緩めないこと。
4. 初期フォーカスとトリガー返却の契約を崩さないこと。
5. Esc・close button・属性制御の各閉鎖経路を `detail.reason` 付きの `closed` 契約へ収束させること。

---

## 12. 将来拡張の原則

本節は現行実装の公開契約ではなく、将来追加を検討する場合の設計指針です。追加機能は、dialog を多機能化するためではなく、**意味論・操作性・観測可能性を明確にしつつ読書の没入を壊さない場合に限って**採用します。

### 12.1 最優先で検討する価値がある機能

#### 12.1.1 初期フォーカス対象の明示指定

現行契約の既定戦略は `actions-first` ですが、これは意味的最適解を常に保証しません。フォーム主体の dialog、破壊的確認 dialog、入力開始を優先したい dialog では、最初に focus すべき要素が `actions` 内にない場合があります。そのため、初期フォーカス対象を明示指定できる機能は、最優先で検討価値があります。

この機能を採用する場合、次を満たします。

- 既定戦略は維持し、指定がある場合のみ上書きします。
- Shadow DOM 内部要素ではなく、利用側が与えられる公開契約面で指定します。
- 任意 selector 依存を避け、ID または意味づけ可能な参照方式を優先します。
- autofocus の乱立で読書や操作の流れを壊しません。

#### 12.1.2 Open 失敗イベント

現行契約では、open 失敗時は `opened=false` に戻り、`ui-dialog-opened` も `ui-dialog-closed` も発火しません。この挙動自体は整合していますが、利用側からは失敗理由を観測しにくいという欠点があります。そのため、open 不成立を明示通知するイベントは、最優先で検討価値があります。

この機能を採用する場合、次を満たします。

- 失敗は専用イベントで通知し、`closed` で代替しません。
- reason は列挙値で固定し、自由文字列にしません。
- `missing-accessible-name`、`invalid-title-reference`、`native-open-failed` など、原因粒度を必要十分に保ちます。
- console error の有無とは独立して、公開イベントだけで観測可能にします。

#### 12.1.3 初期フォーカス戦略の列挙化

個別の focus target 指定とは別に、戦略自体を列挙値として公開する機能も検討価値があります。これは個別指定より抽象度が高く、dialog 群全体で UX を揃えやすいという利点があります。

この機能を採用する場合、次を満たします。

- 既定戦略は `actions-first` とします。
- `close-button`、`none` など、意味が明確な列挙だけを追加します。
- target 指定機能と責務を重複させません。
- DOM 順への暗黙依存を API 名に持ち込みません。

### 12.2 条件付きで検討価値がある機能

#### 12.2.1 Dismiss Policy の公開

backdrop click で閉じるか、Esc を無効化するか、close button を隠せるかといった dismiss policy は、用途によっては価値があります。ただし、dialog の意味を曖昧にしやすいため、基底コンポーネントに安易に導入するべきではありません。必要性が明確な場合に限って検討します。

この機能を採用する場合、次を満たします。

- `modal` と dismiss 可否を混同しません。
- boolean を増やさず、enum または policy object で扱います。
- close 不能 dialog を導入する場合は代替導線を必須にします。
- backdrop click 許可時も、フォーカス返却とイベント順序を壊しません。

#### 12.2.2 Header / Footer の構造切り替え

現行契約は title / body / actions / close button の意味境界を重視しています。一方で、補助的 dialog やミニマル dialog の要求が増える場合、footer 非表示や close button 位置変更などの構造切り替えが有効なことがあります。ただし、見た目都合で導入すると責務が濁るため、条件付きでのみ検討します。

この機能を採用する場合、次を満たします。

- 構造差分がアクセシビリティ契約を壊さないこと。
- close 導線を消す場合は代替導線を必須にすること。
- title / body / actions の意味境界を曖昧にしないこと。
- 単なる padding 調整のために構造 API を追加しません。

#### 12.2.3 `::part(...)` による限定的なスタイル公開

現行契約は内部 DOM 非公開を基本方針としますが、実運用では close button や body 領域だけを局所的に調整したい要件が出る可能性があります。その場合、限定的な `::part(...)` 公開は検討価値があります。

この機能を採用する場合、次を満たします。

- part は最小限に限定します。
- 一度公開した part は長期安定 API として扱います。
- CSS Custom Properties では表現しにくい局所調整に限って導入します。
- 内部 DOM の全面公開には寄せません。

#### 12.2.4 close 前の同期ガード

未保存入力や破壊的操作の途中で dialog が閉じることを防ぎたい場合、close 前に同期的な拒否判定を行う機能は条件付きで価値があります。ただし、dialog をフロー制御装置へ肥大化させやすいため、慎重に扱います。

この機能を採用する場合、次を満たします。

- 非同期フックは導入しません。
- close 抑止が必要な理由を用途側で明確に持ちます。
- `cancel` / `closed` のイベント意味論を壊しません。
- 基底 dialog ではなく、必要に応じて派生コンポーネントでの採用も検討します。

### 12.3 採用しない方針

次の方向は、dialog の責務を曖昧にしやすいため採りません。

- 複数 dialog 積層の本格サポートを `ui-dialog` 自身に持ち込むこと
- 独自 position system や anchor 追従を dialog に統合すること
- `confirm` / `destructive` / `info` などの variant を基底 dialog の API に乱立させること
- トースト、popover、tooltip など異なる意味の UI を dialog に統合すること
- 任意副作用フックや非同期 close フックを増設すること
- 画面全体の routing や状態管理を dialog 自身に持ち込むこと

---

## 13. 実装追従メモ

本節は、現行の `dialog.ts` および `dialog.stories.ts` を基準として、**本書が定義する契約へどこまで追従済みか**、および **なお整理途上の事項は何か**を記録するものです。

2026-03-24 時点で、次の事項は実装と Storybook が本書へ追従済みです。

- `opened` を唯一の公開開閉状態として扱う整理
- `modal=false` 時に body スクロールロックを行わない契約
- `title-id` の参照整合性検証
- `description-id` の既定スロット参照検証
- `ui-dialog-closed.detail.reason` の公開
- `ui-dialog-cancel.detail.reason='escape'` の公開
- `ui-dialog-mode-changed` の公開
- open 中の `modal` 切り替えで `opened` / `closed` を再発火しないイベント意味論
- close button / Esc / `close()` / `opened=false` の閉鎖理由の区別

一方で、次の事項は依然として整理途上です。

### 13.1 単一 dialog 契約

本書では複数 dialog の積層管理を `ui-dialog` 自身の責務から外しました。一方、現行実装は非モーダル Esc の最前面判定のために静的 open dialog リストを保持しています。これは互換性維持のための実装詳細であり、長期契約としては扱いません。

### 13.2 disconnect 時の意味論

`disconnectedCallback()` における破棄時処理は実装されていますが、破棄を close と同一視するか、イベントやフォーカス返却をどう観測するかという契約面は本書でまだ固定していません。

### 13.3 Storybook の body 属性名依存

本書では `data-ui-dialog-open` のような body 属性名自体を公開契約として扱いません。しかし現行 Storybook には、この属性名を直接検証する回帰確認が残っています。これは公開契約確認ではなく、実装互換確認として読みます。

### 13.4 Storybook の内部 DOM / class 名依存

本書では内部 DOM 構造、wrapper 要素、class 名を公開契約から外しました。一方、現行 Storybook は `.close-button` や shadowRoot 内の `dialog` 探索を含みます。これは回帰確認としては有効ですが、公開契約の検証としては限定的です。

### 13.5 複数 dialog 互換 Story の残存

`MultiDialogScrollLockReferenceCount` は長期契約ではなく、現行互換を確認する Story として残しています。本書の単一 dialog 契約と混同しないよう、将来的には互換 Story の分離または削除を検討します。

### 13.6 本節の扱い

本節は、現時点で依存可能な公開契約と、なお整理途上の実装詳細を切り分けるためのメモです。未整理事項を公開契約へ昇格させる場合は、実装、Storybook、契約書の 3 点を同時に更新します。
