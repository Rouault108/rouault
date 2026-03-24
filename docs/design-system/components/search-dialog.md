# Search Dialog

## 概要

本書は、`ui-search-dialog` の**目標契約**を定義するものです。ここでいう目標契約とは、現行実装の偶発的な挙動を説明するための文書ではなく、長期的に保守しやすく、上位レイヤとの責務分離が明快で、Storybook と test によって固定しやすい公開仕様を指します。

`ui-search-dialog` は、記事、ノート、見出し、断片への移動を支援する**探索用 dialog** です。主目的は、本文の読書体験を壊さずに目的の場所へ短時間で到達させることです。したがって、本コンポーネントは検索 UI 自体を主役にせず、**開く・探す・選ぶ・閉じる**を静かに成立させることを契約の中心に置きます。

本書では、次の設計判断を明示的に採用します。

- 開閉状態と query は **外部が所有する controlled state** として扱います。
- 検索結果の選択は **通知のみ**を行い、遷移は内蔵しません。
- 検索失敗と空結果は **別状態**として扱います。
- 検索結果項目は **安定 ID** を持つものとして扱います。
- DOM 構造は仮想化の影響を受け得るため、**DOM そのものを公開契約にしません**。

現行実装が未追従の項目は末尾で切り分けますが、本書の本文は原則として**今後固定したい契約**を優先します。

## 実装注記（2026-03）

- 検索意味論、URL 状態、ランキング、diagnostics の正本は [`docs/search-specification.md`](../../search-specification.md) とし、実装は shared `search-core` を介して `ui-search-dialog` と `search-page` の両方で共有します。
- `ui-search-dialog` は検索意味論を持たず、現行の安定 runtime API は `opened`、`query`、`loading`、`items`、`searcher` を中心とした UI shell です。
- 本書は dialog の公開 UI 契約を扱い、query 正規化、tag 意味論、`DocumentCanonicalUrl`、`SearchStateUrl` などの検索仕様を上書きしません。

---

## 適用範囲

本書は、`ui-search-dialog` の**公開契約**を対象とします。対象は次のとおりです。

- 設計原則
- 入力・出力・公開イベント・公開メソッド
- 状態モデル
- 検索契約
- 選択契約
- Accessibility 契約
- キーボード契約
- Visual Contract
- 環境別の振る舞い
- 境界条件
- Storybook / test で固定すべき契約
- 現行実装で未対応の事項

一方で、本書は次の事項を扱いません。

- 検索インデックス自体の生成方法
- ルーター、履歴、URL 同期の実装詳細
- 検索 API やバックエンドの責務
- 権限判定や非公開コンテンツ制御
- `ui-search-field`、`ui-spinner`、`ui-highlight` の内部実装詳細
- 検索ランキングアルゴリズムの高度化全般
- 最近見た項目、お気に入り、個人化の設計
- 将来機能の列挙そのもの

将来拡張は、本文の各契約に**拡張余地として織り込む**のであり、独立した機能要望一覧としては扱いません。これにより、採用済み契約と未採用案の混在を避けます。

---

## 設計原則

### 状態の所有権を外部へ寄せる

`ui-search-dialog` は、dialog の開閉状態と query を自律的に真実源として保持しません。**上位が状態を所有し、コンポーネントは要求と結果を通知する**構成を基本とします。これにより、URL 同期、履歴保存、ページ遷移後の復元、複数コンポーネント間の整合が取りやすくなります。

### 選択と遷移を分離する

結果選択は `selected` 通知までが責務です。`location.href` の変更、router の呼び出し、スクロール位置の復元は行いません。これにより、検索 UI とナビゲーション責務を分離します。

### 検索経路によって意味を変えない

同期検索、非同期検索、Worker 利用の有無によって、一致対象面や選択規則を変えません。検索経路は最適化手段であり、**結果の意味論**ではありません。

### 結果は ID を主キーとして扱う

検索結果は `url + title` のような便宜的合成キーではなく、**安定 ID** で識別します。重複除去、active option、選択 detail、分析、復元のすべてを ID 基準で扱います。

### 読書を妨げる機能を持ち込まない

検索 dialog は補助面です。永続個人化、サイドプレビュー、自動遷移、過剰なアニメーションなど、検索面自体を主役化する方向は採りません。

---

## 公開契約

### 制御モデル

`ui-search-dialog` は **controlled component** として扱います。

- `opened` は外部が所有する開閉状態です。
- `query` は外部が所有する入力状態です。
- コンポーネント自身は、`opened` と `query` を最終的な真実源として確定しません。
- 内部操作は request event を通じて外部へ通知し、外部更新によって最終状態を反映します。

この契約により、開閉・入力・検索結果を単一の上位状態機械へ接続できます。

### 入力契約

| 名前          | 種別                 | 必須     | 内容             | 契約                                                                       |
| ------------- | -------------------- | -------- | ---------------- | -------------------------------------------------------------------------- |
| `opened`      | property / attribute | はい     | 開閉状態         | `true` で開き、`false` で閉じます。唯一の開閉真実源です                    |
| `query`       | property / attribute | はい     | 入力文字列       | 表示値であり、検索キーでもあります。検索評価時は `trim()` 後の値を使います |
| `items`       | property             | 条件付き | ローカル検索対象 | `searcher` を使わない場合の検索対象です                                    |
| `searcher`    | property             | 条件付き | 外部検索関数     | `items` の代わりに検索を完全外部化するための入力です                       |
| `messages`    | property             | いいえ   | 文言セット       | ラベル、loading、empty、error などの文言です                               |
| `matchFields` | property             | いいえ   | 一致対象面       | 既定では `title` / `path` / `keywords` です                                |

`items` と `searcher` は同時に必須ではありませんが、**どちらか一方**を検索ソースとして与えます。両方が与えられた場合、公開契約では**設定エラー**として扱い、暗黙優先は設けません。責務の明快さを優先し、ローカル検索と外部検索の同時混在は認めません。

`opened` と `query` は controlled state であるため、内部操作だけでは最終状態は変わりません。たとえば close button を押した場合でも、最終的に閉じるには外部が `opened=false` を反映する必要があります。

### 検索項目契約

検索結果項目は `UiSearchDialogItem` として扱います。

```ts
interface UiSearchDialogItem {
  id: string;
  title: string;
  url: string;
  path?: string;
  keywords?: readonly string[];
}
```

| 名前       | 必須   | 内容         | 契約                                            |
| ---------- | ------ | ------------ | ----------------------------------------------- |
| `id`       | はい   | 安定識別子   | 重複除去、option 識別、選択 detail の主キーです |
| `title`    | はい   | 主表示       | 空文字は正規結果として扱いません                |
| `url`      | はい   | 遷移先識別値 | 選択通知に含める主値です                        |
| `path`     | いいえ | 補助表示     | 人間が読むための補助ラベルです                  |
| `keywords` | いいえ | 補助一致対象 | 既定一致対象面に含みます                        |

`path` は**表示専用ラベル**として扱います。`url` の正規化表示と同一視しません。`path` の自動導出を行う場合でも、それは convenience であり、公開契約の中心ではありません。

### 検索関数契約

`searcher` は、次の文脈付きシグネチャを持つものとして扱います。

```ts
interface UiSearchDialogSearchContext {
  query: string;
  signal: AbortSignal;
  limit?: number;
  locale?: string;
}

interface UiSearchDialogSearchError {
  code: string;
  message?: string;
  retryable?: boolean;
}

interface UiSearchDialogSearchResult {
  items: readonly UiSearchDialogItem[];
  total?: number;
  isPartial?: boolean;
  error?: UiSearchDialogSearchError;
}

type UiSearchDialogSearcher = (
  context: UiSearchDialogSearchContext,
) => Promise<UiSearchDialogSearchResult> | UiSearchDialogSearchResult;
```

この契約では、`searcher` は query 文字列だけでなく、中断、件数上限、locale を受け取れます。戻り値は `items` だけでなく、必要に応じて `total`、`isPartial`、`error` を返せます。

追加で、次を固定します。

* `searcher` が **例外を送出した場合**、コンポーネントはその検索を `error` 状態として扱います
* `searcher` が **`error` を含む構造化結果**を返した場合、コンポーネントはその検索を `error` 状態として扱います
* 例外送出と構造化エラー結果は、UI 上は同一の `error` 状態へ正規化します
* `signal.aborted === true` に起因する中断は `error` とみなさず、**破棄された旧検索**として扱います
* `error.retryable === true` の場合でも、再試行は内部で自律実行しません。再試行は、同一 query に対する再検索要求として上位から駆動します

これにより、通信失敗、検索器内部失敗、構造化エラー、旧検索中断を同一レイヤで整理できます。

### 公開イベント契約

#### 要求イベント

| イベント名                         | detail                               | 契約                   |
| ---------------------------------- | ------------------------------------ | ---------------------- |
| `ui-search-dialog-open-requested`  | `{ trigger: HTMLElement \| null }`   | 開く要求を通知します   |
| `ui-search-dialog-close-requested` | `{ reason: CloseReason }`            | 閉じる要求を通知します |
| `ui-search-dialog-query-changed`   | `{ query: string }`                  | 入力変更を通知します   |

```ts
type CloseReason = 'selection' | 'escape' | 'backdrop' | 'close-button' | 'programmatic';
```

要求イベントは、**状態更新要求**を外部へ伝えるためのイベントです。`opened` と `query` を controlled に保つため、内部操作はこのイベント経由で上位へ通知します。

`ui-search-dialog-open-requested` の `detail.trigger` は、起動元要素を外部へ引き渡すための補助情報です。主用途は、close 後の focus 復帰先の決定です。起動元が存在しない場合は `null` とします。

#### ライフサイクルイベント

| イベント名                | detail                             | 契約                             |
| ------------------------- | ---------------------------------- | -------------------------------- |
| `ui-search-dialog-opened` | `{ trigger: HTMLElement \| null }` | 開状態が成立したあとに発火します |
| `ui-search-dialog-closed` | `{ reason: CloseReason }`          | 閉状態が成立したあとに発火します |

#### 選択イベント

| イベント名                  | detail                         | 契約                   |
| --------------------------- | ------------------------------ | ---------------------- |
| `ui-search-dialog-selected` | `UiSearchDialogSelectedDetail` | 結果選択時に発火します |

```ts
interface UiSearchDialogSelectedDetail {
  id: string;
  url: string;
  title: string;
  query: string;
  index: number;
  item: UiSearchDialogItem;
  selectionMethod: 'keyboard' | 'pointer';
}
```

`ui-search-dialog-selected` は選択通知のみを担います。コンポーネント自身は遷移を行いません。

#### イベント送出特性

公開イベントは次の特性を持ちます。

| 項目         | 契約             |
| ------------ | ---------------- |
| `bubbles`    | `true`           |
| `composed`   | `true`           |
| `cancelable` | event ごとに定義 |

要求イベントと選択イベントは、上位層で委譲購読しやすいように `bubbles=true`、`composed=true` を採用します。

`ui-search-dialog-close-requested` と `ui-search-dialog-selected` は既定では `cancelable=false` とします。閉じることや選択を抑止したい場合は、将来必要になった時点で `before-close` / `before-select` を別途追加します。既定イベントに抑止責務を持ち込みません。

### 公開メソッド

| 名前                     | 種別   | 契約                                                                 |
| ------------------------ | ------ | -------------------------------------------------------------------- |
| `focusInput()`           | method | 検索入力へフォーカスを移します。内部的には `ui-search-field.focus()` に委譲します。 |
| `focusClearButton()`     | method | clear button が利用可能な場合のみ、clear button へフォーカスを移します。利用不能時は no-op です。 |
| `requestOpen(trigger?)`  | method | 開く要求を通知します。`trigger` を与えた場合、その参照を open request の detail に含めます。 |
| `requestClose(reason?)`  | method | 閉じる要求を通知します。reason 未指定時は `programmatic` として扱います。 |

`open()` / `close()` のような**強制状態変更メソッド**は、controlled 契約とは相性が悪いため採りません。公開メソッドは request ベースに寄せます。

また、本コンポーネントは **入力欄に主フォーカスを保持し、結果一覧の active state を `aria-activedescendant` で表現するモデル**を採るため、active result へ直接フォーカスを移す公開メソッドは持ちません。

### 文言契約

文言は固定文字列ではなく、`messages` から供給されるものとして扱います。

```ts
interface UiSearchDialogMessages {
  dialogLabel: string;
  closeLabel: string;
  clearLabel: string;
  loadingHeading: string;
  loadingDescription: string;
  emptyHeading: string;
  emptyDescription: string;
  errorHeading: string;
  errorDescription: string;
  keyboardHint: string;
}
```

契約は次のとおりです。

* `messages` は**部分指定**を許容します
* 未指定キーはコンポーネント既定文言へフォールバックします
* `messages` に含まれる各キーは、空文字列を許容しません
* `dialogLabel`、`closeLabel`、`clearLabel` は、視覚文言だけでなくアクセシビリティ名の供給元にもなります
* `errorDescription` は、検索器が返した `error.message` をそのまま露出することを必須としません。既定では安全側に要約表示してよく、詳細露出は上位判断とします

これにより、差し替え可能性を維持しつつ、公開契約としての文言供給面を固定します。

### 責務範囲

責務範囲には、次を含みます。

- dialog 表示
- query 入力の受理
- 検索実行の調停
- loading / empty / error / result の表示
- active result 制御
- キーボード操作
- フォーカス復帰
- 選択通知
- body scroll lock

一方で、次は含みません。

- 選択後のナビゲーション
- URL 更新
- 永続検索履歴
- 複数検索ソースの統合
- 複雑なランキング最適化
- 検索 API の責務全般

---

## 状態モデル

`ui-search-dialog` の状態は、開閉状態と検索状態を分けて読みます。

### 開閉状態

- `closed`
- `open`

`opened=false` なら `closed`、`opened=true` なら `open` です。

### 検索状態

- `idle`
- `loading`
- `success`
- `empty`
- `error`

#### idle

trim 後 query が空です。検索を行いません。結果一覧も empty state も表示しません。

#### loading

非空 query に対する検索中です。入力継続は許可しますが、結果はまだ確定しません。

#### success

非空 query に対して 1 件以上の結果があります。結果一覧を listbox として表示します。

#### empty

非空 query に対して 0 件です。empty state を表示します。

#### error

検索器エラーまたは検索実行失敗です。empty と視覚的・意味論的に区別します。

### 遷移原則

- `idle` と `empty` は別状態です。
- `empty` と `error` は別状態です。
- 古い query に対する応答は `success` / `empty` / `error` のいずれにも遷移させません。
- 状態遷移は常に**現在の trim 済み query**に整合する応答だけで確定します。

---

## 検索契約

### 検索ソースの排他性

`items` と `searcher` は排他的です。

- `items` はローカル検索用です。
- `searcher` は検索責務を完全に外部化します。
- 両方を同時に与えて暗黙マージすることはありません。

### 一致対象面

既定一致対象面は次の 3 面です。

- `title`
- `path`
- `keywords`

`url` は表示上の path 導出に使うことはあっても、既定一致対象面には含めません。読書用途では URL 一致はノイズになりやすいためです。必要なら `matchFields` を通じて opt-in で追加します。

### 正規化規則

検索評価とハイライト評価は、同一の正規化規則に従います。

- 前後空白を除去します。
- 大小文字差を無視します。
- Unicode 正規化は実施対象とします。
- 将来の言語別正規化は、locale 契約を追加した上で拡張します。

これにより、「検索できるのにハイライトされない」「ハイライトされるのに検索対象ではない」というずれを抑えます。

### 順序契約

- ローカル検索では、**元配列の安定順序**を保持します
- 外部 `searcher` 利用時は、**返却順を最終順位**として尊重します
- コンポーネント側で独自再ソートは行いません
- 重複除去が発生した場合も、**最初に採用された項目の順序**を保持します

### latest query wins

非同期検索中に query が変わった場合、古い query に対する応答は採用しません。`searcher` には `AbortSignal` を渡し、可能なら検索器側でも中断を受け付けます。

### 正規結果の条件

次を満たさない項目は正規結果として扱いません。

- `id` が非空文字列であること
- `title` が非空文字列であること
- `url` が非空文字列であること

重複除去は `id` 基準で行います。重複が複数件ある場合は、**最初に出現した項目を採用し、以後の同一 `id` 項目は破棄**します。

### latest query wins

非同期検索中に query が変わった場合、古い query に対する応答は採用しません。`searcher` には `AbortSignal` を渡し、可能なら検索器側でも中断を受け付けます。

---

## 選択契約

### active result

結果一覧表示中は `activeId` を持ちます。active result は index ではなく ID 基準で扱います。

- 初期 active は先頭結果です
- `ArrowDown` / `ArrowUp` で循環移動します
- 結果集合が差し替わった場合、同一 `id` が残っていれば active を維持します
- 同一 `id` が存在しなければ先頭へ戻します

### 選択方法

選択は次の経路で行います。

- 入力欄上での `Enter`
- 結果行 click

本コンポーネントは、**入力欄に主フォーカスを保持したまま `aria-activedescendant` で active result を表現するモデル**を採ります。したがって、公開契約としては**結果行への直接フォーカス移動を要求しません**。

選択時は `ui-search-dialog-selected` を発火します。選択イベントはナビゲーションを意味しません。上位が必要に応じて遷移します。

### close reason

dialog の close reason は少なくとも次を区別します。

- `selection`
- `escape`
- `backdrop`
- `close-button`
- `programmatic`

この reason は `ui-search-dialog-close-requested` と `ui-search-dialog-closed` の detail に含めます。

### フォーカス復帰

close 後の focus 復帰は、**`ui-search-dialog` の close 契約**として扱います。

- 直近の open 要求または open 成立時に `trigger` 参照がある場合、close 後はその要素へ focus を戻します。
- `trigger` が `null`、未接続、`disabled`、または focus 不可能な場合は、上位が与える fallback focus policy に従います。
- 検索面を閉じたあとに focus が消失する状態は許容しません。

`ui-search-trigger` は起動の起点ではありますが、close 後の focus 復帰を自律的に決定・実行する主体ではありません。

### 選択と close の順序

選択によって閉じる場合のイベント順序は、次のとおり固定します。

1. `ui-search-dialog-selected`
2. `ui-search-dialog-close-requested` with `reason='selection'`
3. 外部が `opened=false` を反映
4. `ui-search-dialog-closed` with `reason='selection'`

外部が `opened=false` を反映しない限り、`ui-search-dialog-closed` は発火しません。

---

## DOM / Accessibility

ルートは `:host` です。内部実装は Shadow DOM を前提としてよいですが、**内部要素の階層や class 名そのものは公開契約に含めません**。

### Accessibility 契約

- 対話主体はネイティブ `<dialog>` です
- dialog は `aria-modal="true"` と適切なラベルを持ちます
- 検索入力は combobox として listbox に結び付きます
- 結果一覧は `role="listbox"`、各結果行は `role="option"` を持ちます
- active option は `aria-activedescendant` で入力に結び付きます
- loading / empty / error は live region または `role="status"` 相当として適切に読み上げられます
- footer のキーバインド説明は補助情報であり、既定では `aria-hidden="true"` とします

### フォーカスモデル

本コンポーネントの主フォーカスは、検索入力にあります。結果一覧の active state は `aria-activedescendant` で表現し、**roving tabindex による結果行直接フォーカスモデルは公開契約に採りません**。

### DOM 安定性契約

仮想化を行うため、次は公開契約に含めません。

- 全件の option が常に DOM 上に存在すること
- DOM 上の option 数が結果総数と一致すること
- DOM 順序だけで active item を復元できること
- 内部スクロールコンテナの具体階層や要素名

公開契約として重要なのは、**意味論が仮想化の有無で変わらないこと**です。

追加で、次を固定します。

- `aria-activedescendant` が指す active option は、**active である間 DOM 上に存在しなければなりません**
- 仮想化を行う場合でも、active option を DOM から消したまま `aria-activedescendant` だけを残すことは許容しません

### `ui-search-field` 依存境界

search dialog が `ui-search-field` に依存してよいのは、内部 DOM ではなく**公開契約**に限ります。依存してよい公開面は次のとおりです。

- `focus(options?)`
- `focusClearButton()`
- `clearButtonVisible`
- `value`
- `input` event
- `inputRole`
- `inputAriaControls`
- `inputAriaExpanded`
- `inputAriaAutocomplete`
- `inputAriaActivedescendant`
- `inputAriaBusy`
- `inputAriaDescribedby`

依存先コンポーネントの内部 DOM、内部 button ノード、内部 input ノード、class 名、Shadow DOM 階層には直接依存しません。

`ui-search-field` は primitive 単体としては自己管理型 input ですが、`ui-search-dialog` との統合時には、**controlled な `query` の表示面**として接続してよいものとします。このとき、`ui-search-dialog` は外部から与えられた `query` を `ui-search-field.value` へ反映し、ユーザー編集は `input` event を介して上位の controlled state へ橋渡しします。

統合時の更新経路は次のとおり固定します。

1. ユーザーが `ui-search-field` を編集する
2. `ui-search-field` は同期済み `value` を伴って `input` を通知する
3. `ui-search-dialog` は `ui-search-dialog-query-changed` を発火する
4. 上位が `query` を更新する
5. 更新後の `query` が `ui-search-dialog` から `ui-search-field.value` へ再反映される

したがって、`ui-search-field` の自己管理は primitive 単体時の所有モデルであり、`ui-search-dialog` 統合時の controlled query 契約と矛盾しません。

---

## キーボード契約

| キー        | 契約                                                                 |
| ----------- | -------------------------------------------------------------------- |
| `ArrowDown` | active result を次へ進めます。末尾の次は先頭へ循環します             |
| `ArrowUp`   | active result を前へ戻します。先頭の前は末尾へ循環します             |
| `Enter`     | 入力欄上で active result が存在する場合、その結果を選択します        |
| `Esc`       | `ui-search-dialog-close-requested` を `reason='escape'` で通知します |
| `Tab`       | 入力欄、clear control、close button 間の秩序を維持します             |

追加で、次を固定します。

- IME composition 中の `Enter` は結果選択に使いません
- `loading` 中は active move や選択を行いません
- 古い結果一覧を操作可能なまま残すことは公開契約に含めません
- 結果行に直接フォーカスしたときの追加キーバインドは、将来の内部実装で持ち得ても、公開契約には含めません

---

## Visual Contract

`ui-search-dialog` の視覚契約は、**検索面であることを明確にしつつ、本文面を押しのけないこと**にあります。

### 情報順位

- 最上位情報は検索入力です。
- 次に結果一覧です。
- close button は補助操作です。
- loading / empty / error は一時状態として静かに表示します。
- footer のキーバインド説明は学習補助であり、主役ではありません。

### レイアウト

dialog は画面上部寄りに配置し、中央へ寄せます。最大幅は読みやすい範囲に制限し、body はヘッダーとフッターに挟まれた縦方向レイアウトを取ります。

結果一覧は body の残余領域を使用するスクロール領域です。結果が多くても dialog 全体の高さは制限内に保ちます。

### 結果表示

- 主表示は常に `title` です。
- `path` は補助表示です。
- 一致箇所は局所的な highlight で示します。
- active result は背景差分で示します。
- error state は empty state と視覚的に区別します。

### 操作ノイズ抑制

次の方向は採りません。

- 常時アニメーション
- 強い発光や脈動
- 自動 preview 展開
- loading 中の派手な演出

### デザイントークンとの関係

本コンポーネントは、個別トークン名の固定よりも、**意味カテゴリへの依存**を公開契約とします。少なくとも次のカテゴリが供給されていることを前提とします。

- surface
- foreground
- muted foreground
- border
- active / hover background
- focus ring
- spacing
- radius
- elevation
- motion
- z-index

具体的なトークン名の選定と配線はデザインシステム層の責務です。本書では、個別トークン名そのものを互換性の基準にしません。

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` では enter / exit animation を最小化します。状態変化の即時性を優先します。

### Dark Mode

主としてトークン差し替えで吸収します。dialog、text、border、backdrop が dark token でも読めることを契約とします。

### Forced Colors

`forced-colors: active` では system color を優先し、装飾影は除去します。active result は Highlight 系へフォールバックします。

### Print

印刷時は dialog と backdrop を表示しません。検索 UI は印刷対象に含めません。

---

## 境界条件

### 空 query

trim 後 query が空なら検索は行わず、状態は `idle` です。empty / error は表示しません。

### 空白のみ query

表示上の空白は保持できますが、検索評価では空 query として扱います。

### 不正結果

`id`、`title`、`url` のいずれかが空なら結果として採用しません。

### stale response

古い query に対する応答は破棄します。表示結果を巻き戻しません。

### 選択後の遷移

選択通知後も自動遷移しません。上位未接続で画面が変わらないことは契約違反ではありません。

### 仮想化

仮想化の有無で意味論を変えません。DOM 常駐件数には依存しません。

---

## Storybook 契約

各 Story は見本ではなく、**観測可能な契約確認点**として扱います。

| Story                             | 固定する契約                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `ControlledOpenedContract`        | 内部操作だけでは最終開閉状態が確定せず、外部の `opened` 反映で確定すること   |
| `ControlledQueryContract`         | 入力変更が `ui-search-dialog-query-changed` を経由して外部へ返ること         |
| `FocusReturnContract`             | close 成立後に trigger へ focus が戻ること                                   |
| `LoadingStateEditableInput`       | loading 中でも入力継続ができ、旧検索結果を操作対象にしないこと               |
| `EmptyStateContract`              | 非空 query かつ 0 件で empty を表示すること                                  |
| `ErrorStateContract`              | search failure を empty と区別し、error UI が表示されること                  |
| `KeyboardLoopAndEnterSelection`   | Arrow key 循環移動と Enter 選択が成立すること                                |
| `StableItemIdentityContract`      | 結果更新時に ID 基準で active を維持できること                               |
| `CloseReasonContract`             | `escape` / `backdrop` / `close-button` / `selection` / `programmatic` を区別できること |
| `SelectionEventOrderContract`     | 選択時に `selected` → `close-requested` → 外部反映 → `closed` の順になること |
| `MatchingSemanticsContract`       | 一致対象面とハイライト規則が一致すること                                     |
| `VirtualizationSemanticsContract` | 仮想化の有無で意味論が変わらず、active option が常にアクセシブルであること   |
| `DarkModeTokenContract`           | dark token でも視認性が維持されること                                        |

---

## 補足

`ui-search-dialog` の要点は、検索機能を多く持つことではありません。**外部が状態を持ち、dialog は探索面としてふるまい、結果を通知して静かに閉じること**にあります。

今後の変更でも、少なくとも次は崩しません。

- `opened` と `query` は controlled state として扱うこと
- 選択と遷移を分離すること
- empty と error を分離すること
- 結果項目を安定 ID で扱うこと
- 仮想化しても意味論を変えないこと
- close 後の focus return を維持すること

将来拡張は、本文契約を壊さない範囲でのみ扱います。拡張案がある場合でも、まず本文契約へ吸収できるかを検討し、吸収できないものだけを別文書で管理します。

---

## 現行実装で未対応の事項

本節は、現行実装がまだ上記目標契約へ追従していない点を整理するものです。本節の内容は、現行公開契約として依存してよいことを意味しません。

### 1. controlled state と request model への未追従

現行実装は `opened` / `query` を内部でも直接変更します。`open()` / `close()` も `opened` を直接変更し、入力イベントでは `this.query = value` を行います。request event を介して外部へ状態変更要求を返す controlled 契約には未追従です。fileciteturn21file0

### 2. imperative API の残存

目標契約では `requestOpen()` / `requestClose()`、`focusInput()`、`focusActiveResult()` のような request / utility API を想定していますが、現行公開メソッドは `open(trigger?)` と `close()` です。強制状態変更メソッド中心の API からはまだ移行していません。Storybook も `dialog.open(trigger)` と `dialog.close()` を直接呼んでいます。fileciteturn21file0 fileciteturn22file9

### 3. 検索結果項目の安定 ID と activeId モデルの未導入

現行 `UiSearchDialogItem` は `id` を持たず、`UiSearchDialogSelectedDetail` も `{ url, title }` に限られます。選択モデルと描画は `activeIndex` と `data-index` を前提にしており、option 識別も index 基準です。ID を主キーにした重複除去、active 維持、選択 detail、`aria-activedescendant` には未追従です。fileciteturn22file0 fileciteturn20file6 fileciteturn21file0

### 4. `searcher` 契約の単純形

現行 `searcher` は `query: string => results` の最小形です。`AbortSignal`、`limit`、`locale`、構造化された `SearchResult`、`error` / `total` / `isPartial` には未追従です。内部では stale response を破棄しますが、検索器自体の中断契約や構造化結果契約はありません。fileciteturn22file0 fileciteturn22file7

### 5. 検索ソース設定バリデーションの未対応

目標契約では `items` と `searcher` を排他的に扱い、両方同時指定を設定エラーとみなします。現行実装ではこの検証はなく、`searcher` が関数なら `items` を暗黙に無視します。また、両方未指定でも設定エラーにはならず、結果 0 件として扱われます。fileciteturn22file7

### 6. `messages` / `matchFields` の未対応

目標契約で導入した `messages` と `matchFields` は、現行実装には存在しません。文言は定数固定であり、一致対象面も公開入力では変更できません。fileciteturn20file5 fileciteturn22file18

### 7. error state / retry 導線の未分離

現行実装は検索失敗を empty 相当に吸収し得ます。`render-search-dialog.ts` に error state 表示分岐はなく、文言定数も loading / empty までしか持ちません。retry 導線もありません。`idle` / `empty` / `error` の 3 分離には未追従です。fileciteturn22file7 fileciteturn22file18 fileciteturn20file5

### 8. request event / close reason / detail 拡張の不足

目標契約の `ui-search-dialog-open-requested`、`ui-search-dialog-close-requested`、`ui-search-dialog-query-changed` は未実装です。`ui-search-dialog-closed` には reason がなく、`ui-search-dialog-selected` にも `id`、`query`、`index`、`item`、`selectionMethod` は含まれません。opened / closed / selected の detail は現状でも最小限です。fileciteturn21file0 fileciteturn22file0

### 9. bubbling / composed 前提のイベント送出未対応

現行 `CustomEvent` は detail のみを与えて生成しており、`bubbles` / `composed` は既定値のままです。したがって、目標契約で想定した委譲購読しやすいイベント送出特性には未追従です。fileciteturn21file0

### 10. 一致対象面と正規化規則の未整合

目標契約では検索評価とハイライト評価を同一正規化規則に寄せ、既定一致対象面を `title` / `path` / `keywords` に固定します。現行実装では、ローカル検索は `title` / `path` / `keywords` のみですが、Worker 検索は `url` も一致対象に含みます。さらに、検索とハイライトの正規化は `trim() + toLowerCase()` にとどまり、Unicode 正規化には未追従です。fileciteturn22file7 fileciteturn21file2 fileciteturn21file1

### 11. `path` 解決と表示補助の整理不足

現行実装は `path` 未指定時に `url` から `pathname + search + hash` を導出して表示します。これは convenience としては妥当ですが、`path` を表示専用ラベルとして明確に切り分けた目標契約とはまだ整理し切れていません。`path` 自動導出は実装上存在しますが、公開型や入力契約でその意味を十分に固定してはいません。fileciteturn21file1

### 12. `ui-search-field` 依存境界の抽象化未了

目標契約では `focusInput()`、`hasClearControl()`、`focusClearControl()` のような抽象操作に寄せる方針を採っています。現行選択モデルは `SearchField` 具象型、`clearButtonVisible`、`focusClearButton()` に依存しており、依存境界の抽象化には未追従です。fileciteturn20file6

### 13. Storybook / test が目標契約へ未追従

現行 Storybook と test は、現在の imperative API と最小 detail を前提にしています。`open()` / `close()` を直接呼び、query 内部更新を前提とし、error state、request event、close reason、stable identity、`messages`、`matchFields`、構造化 `searcher` 契約を固定していません。目標契約に対応する Story / test はまだ不足しています。fileciteturn22file9 fileciteturn22file17 fileciteturn18file16 fileciteturn18file11

### 14. 内部調整値と意味論の分離の未整理

virtualization threshold、row height、overscan、debounce は定数として実装されていますが、どこまでが内部調整値で、どこからが公開意味論かの境界は Storybook / test まで含めてまだ十分には固定されていません。とくに virtualization は index 基準の option 識別と結び付いています。fileciteturn20file5 fileciteturn20file17

### 15. 本節の扱い

これらを採用する場合は、実装、Storybook、test、契約書を同時に更新し、目標契約と実装契約のずれを長期放置しません。
