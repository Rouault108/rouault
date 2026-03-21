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

---

## 適用範囲

本書は、`ui-search-dialog` の次の事項を対象とします。

- 設計原則
- 公開契約
- 状態モデル
- 検索契約
- 選択契約
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- Storybook 契約
- 追加を検討する価値がある機能
- 現行実装で未対応の事項

一方で、本書は次の事項を扱いません。

- 検索インデックス自体の生成方法
- ルーター、履歴、URL 同期の実装詳細
- 検索 API やバックエンドの責務
- 権限判定や非公開コンテンツ制御
- `ui-search-field`、`ui-spinner`、`ui-search-highlight` の内部実装詳細
- 検索ランキングアルゴリズムの高度化全般
- 最近見た項目、お気に入り、個人化の設計

これらは上位レイヤ、または別コンポーネント／別契約の責務です。

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

interface UiSearchDialogSearchResult {
  items: readonly UiSearchDialogItem[];
  total?: number;
  isPartial?: boolean;
  error?: {
    code: string;
    message?: string;
    retryable?: boolean;
  };
}

type UiSearchDialogSearcher = (
  context: UiSearchDialogSearchContext,
) => Promise<UiSearchDialogSearchResult> | UiSearchDialogSearchResult;
```

この契約では、`searcher` は query 文字列だけでなく、中断、件数上限、locale を受け取れます。戻り値は `items` だけでなく、必要に応じて `total`、`isPartial`、`error` を返せます。

### 公開イベント契約

#### 要求イベント

| イベント名                         | detail                    | 契約                   |
| ---------------------------------- | ------------------------- | ---------------------- |
| `ui-search-dialog-open-requested`  | なし                      | 開く要求を通知します   |
| `ui-search-dialog-close-requested` | `{ reason: CloseReason }` | 閉じる要求を通知します |
| `ui-search-dialog-query-changed`   | `{ query: string }`       | 入力変更を通知します   |

```ts
type CloseReason = 'selection' | 'escape' | 'backdrop' | 'close-button' | 'programmatic';
```

要求イベントは、**状態更新要求**を外部へ伝えるためのイベントです。`opened` と `query` を controlled に保つため、内部操作はこのイベント経由で上位へ通知します。

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

| 名前                    | 種別   | 契約                                     |
| ----------------------- | ------ | ---------------------------------------- |
| `focusInput()`          | method | 入力欄へフォーカスを移します             |
| `focusActiveResult()`   | method | active result がある場合にそこへ移します |
| `requestOpen(trigger?)` | method | 開く要求を通知します                     |
| `requestClose(reason?)` | method | 閉じる要求を通知します                   |

`open()` / `close()` のような**強制状態変更メソッド**は、controlled 契約とは相性が悪いため採りません。公開メソッドは request ベースに寄せます。

### 文言契約

文言は固定文字列ではなく、`messages` から供給されるものとして扱います。最低限、次のキーを持ちます。

- `dialogLabel`
- `closeLabel`
- `clearLabel`
- `loadingHeading`
- `loadingDescription`
- `emptyHeading`
- `emptyDescription`
- `errorHeading`
- `errorDescription`
- `keyboardHint`

これにより、日本語固定 UI として閉じるか、差し替え可能な UI とするかを上位で選べます。

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

- ローカル検索では、**元配列の安定順序**を保持します。
- 外部 `searcher` 利用時は、**返却順を最終順位**として尊重します。
- コンポーネント側で独自再ソートは行いません。

### latest query wins

非同期検索中に query が変わった場合、古い query に対する応答は採用しません。`searcher` には `AbortSignal` を渡し、可能なら検索器側でも中断を受け付けます。

### 正規結果の条件

次を満たさない項目は正規結果として扱いません。

- `id` が非空文字列であること
- `title` が非空文字列であること
- `url` が非空文字列であること

重複除去は `id` 基準で行います。

---

## 選択契約

### active result

結果一覧表示中は `activeId` を持ちます。active result は index ではなく ID 基準で扱います。

- 初期 active は先頭結果です。
- `ArrowDown` / `ArrowUp` で循環移動します。
- 結果集合が差し替わった場合、同一 `id` が残っていれば active を維持します。
- 同一 `id` が存在しなければ先頭へ戻します。

### 選択方法

次の経路で選択できます。

- 入力欄上での `Enter`
- 結果行上での `Enter`
- 結果行 click
- 結果行上での `Space`

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

close 後は trigger へフォーカスを戻します。trigger がなければ、上位が与える fallback focus policy に従います。検索面を閉じたあとに focus が消失する状態は許容しません。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部では、dialog、live region、header、body、footer を持ちます。

```text
<ui-search-dialog>
  #shadow-root
    <dialog aria-modal="true" ...>
      <div aria-live="polite" aria-atomic="true">...</div>
      <div class="header">
        <ui-search-field ...></ui-search-field>
        <button type="button">...</button>
      </div>
      <div class="body">
        [loading-state]
        [empty-state]
        [error-state]
        [result-list]
      </div>
      <div class="footer" aria-hidden="true">...</div>
    </dialog>
</ui-search-dialog>
```

### Accessibility 契約

- 対話主体はネイティブ `<dialog>` です。
- dialog は `aria-modal="true"` と適切なラベルを持ちます。
- 検索入力は combobox として listbox に結び付きます。
- 結果一覧は `role="listbox"`、各結果行は `role="option"` を持ちます。
- active option は `aria-activedescendant` で入力に結び付きます。
- loading / empty / error は live region または status として適切に読み上げられます。
- footer のキーバインド説明は補助情報であり、既定では `aria-hidden="true"` とします。

### DOM 安定性契約

仮想化を行うため、次は公開契約に含めません。

- 全件の option が常に DOM 上に存在すること
- DOM 上の option 数が結果総数と一致すること
- DOM 順序だけで active item を復元できること

公開契約として重要なのは、**意味論が仮想化の有無で変わらないこと**です。

### `ui-search-field` 依存境界

search dialog が `ui-search-field` に要求するのは内部 DOM ではなく、次の抽象操作です。

- `focusInput()`
- `hasClearControl()`
- `focusClearControl()`

依存先コンポーネントの内部 DOM に直接依存しません。

---

## キーボード契約

| キー        | 契約                                                     |
| ----------- | -------------------------------------------------------- |
| `ArrowDown` | active result を次へ進めます。末尾の次は先頭へ循環します |
| `ArrowUp`   | active result を前へ戻します。先頭の前は末尾へ循環します |
| `Enter`     | 入力欄上では active result を選択します                  |
| `Esc`       | `close-requested` を `reason='escape'` で通知します      |
| `Tab`       | 入力欄、clear control、close button 間の秩序を維持します |
| `Space`     | 結果行に直接フォーカスしている場合は選択に使えます       |

`loading` 中は active move や選択を行いません。古い結果一覧を操作可能なまま残すことは公開契約に含めません。

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

### 参照トークン

本コンポーネントは主として次のトークンに依存します。

| 用途            | トークン                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------- |
| dialog 背景     | `--bg-surface-3`                                                                          |
| 既定文字色      | `--fg-default`                                                                            |
| 控えめ文字色    | `--fg-muted` / `--fg-subtle`                                                              |
| 既定境界線      | `--border-default`                                                                        |
| 角丸            | `--radius-xl` / `--radius-md` / `--radius-sm`                                             |
| 影              | `--elevation-xl`                                                                          |
| scrim opacity   | `--opacity-scrim`                                                                         |
| blur            | `--blur-lg`                                                                               |
| active row 背景 | `--bg-surface-active`                                                                     |
| hover 背景      | `--bg-hover`                                                                              |
| 入力背景        | `--bg-fill-muted`                                                                         |
| focus ring      | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| 余白            | `--space-*`                                                                               |
| 文字サイズ      | `--text-xs` / `--text-sm` / `--text-base` / `--text-lg` / `--text-xl`                     |
| アイコンサイズ  | `--icon-base`                                                                             |
| モーション      | `--duration-fast` / `--duration-normal` / `--ease-in` / `--ease-out`                      |
| z-index         | `--z-modal` / `--z-backdrop`                                                              |

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

各 Story は見本ではなく、**契約確認点**として扱います。

| Story                             | 固定する契約                                   |
| --------------------------------- | ---------------------------------------------- |
| `ControlledOpenedContract`        | `opened` が外部制御であること                  |
| `ControlledQueryContract`         | `query` が外部制御であること                   |
| `FocusReturnContract`             | close 後に trigger へ focus が戻ること         |
| `LoadingStateEditableInput`       | loading 中でも入力継続ができること             |
| `EmptyStateContract`              | 非空 query かつ 0 件で empty を表示すること    |
| `ErrorStateContract`              | search failure を empty と区別できること       |
| `KeyboardLoopAndEnterSelection`   | Arrow key 循環移動と Enter 選択が成立すること  |
| `StableItemIdentityContract`      | 結果更新時に ID 基準で active を維持できること |
| `CloseReasonContract`             | close reason が区別されること                  |
| `MatchingSemanticsContract`       | 一致対象面とハイライト規則が一致すること       |
| `VirtualizationSemanticsContract` | 仮想化の有無で意味論が変わらないこと           |
| `DarkModeTokenContract`           | dark token でも視認性が維持されること          |

---

## 追加を検討する価値がある機能

本節は、`ui-search-dialog` に将来追加する価値がある機能を、**責務の明確化に寄与するもの**と、**探索効率を上げるもの**に分けて整理するものです。ここでいう「価値がある」とは、単に機能数を増やせるという意味ではなく、読書体験を壊さずに検索面の完成度を上げられることを意味します。

### 最優先で検討する価値がある機能

#### 1. 明示的な error state と retry 導線

現行の検索 UI において、最も優先度が高い追加機能は error state の明示化です。zero result と検索失敗を区別できない構成は、利用者にも上位実装にも不利益が大きいためです。

この機能を追加する場合は、少なくとも次を満たします。

- `empty` と `error` を別状態として扱う
- `errorHeading` と `errorDescription` を文言契約に含める
- `retryable` な失敗には再試行導線を用意する
- retry は内部再実行ではなく、要求イベントまたは `searcher` 再実行として扱う

#### 2. 検索結果項目の安定 ID

結果項目の安定 ID は、検索体験を派手に変える機能ではありませんが、契約の強度を大きく上げます。active result の維持、重複除去、分析、履歴保存、将来の grouped result に必要なためです。

この機能を追加する場合は、次を満たします。

- `UiSearchDialogItem.id` を必須化する
- 重複除去を `id` 基準へ統一する
- option 識別と `aria-activedescendant` も ID 基準に寄せる
- 選択 detail に `id` を含める

#### 3. 選択 detail の拡張

選択イベントに `url` と `title` だけを含める設計は最小限ではありますが、上位でのナビゲーション、分析、履歴保存には情報が不足します。

この機能を追加する場合は、次の情報を含める方がよいです。

- `id`
- `query`
- `index`
- `item`
- `selectionMethod`

これにより、選択時の文脈を追加の状態参照なしに上位へ渡せます。

#### 4. request event と close reason の強化

controlled 契約を採る場合、内部状態変更よりも request event の明確化が重要です。とくに close reason を構造化すると、Esc、backdrop、close button、selection、programmatic を区別でき、上位状態機械が組みやすくなります。

この機能を追加する場合は、次を満たします。

- `ui-search-dialog-open-requested` を正式な公開イベントとして固定する
- `ui-search-dialog-close-requested` に `reason` を必須 detail として含める
- `ui-search-dialog-closed` にも同じ reason を引き継ぐ
- `query` 更新は `ui-search-dialog-query-changed` で外部へ返す

#### 5. `searcher` 契約の拡張

検索責務を外部化する設計を採るなら、`searcher` は単純な `query => results` から、文脈付き契約へ拡張する価値があります。非同期検索、中断、部分結果、locale、エラー情報を扱えるためです。

この機能を追加する場合は、次を満たします。

- `AbortSignal` を渡す
- 必要なら `limit` と `locale` を渡す
- `items` だけでなく `error`、`total`、`isPartial` を返せるようにする
- stale response を UI が採用しないことを維持する

### 条件付きで検討する価値がある機能

#### 6. 文言外部化と locale 対応

Rouault を日本語中心で維持するなら必須ではありませんが、文体統一、差し替え、アクセシビリティ改善を柔軟に行いたい場合には価値があります。

この機能を追加する場合は、次を満たします。

- `messages` を公開入力として扱う
- loading / empty / error / close / clear などの文言を外部化する
- locale を `searcher` 契約や正規化規則と接続できるようにする

#### 7. 一致対象面の明示設定

検索対象が将来増える場合、`matchFields` による opt-in 設定は価値があります。`excerpt`、`tags`、`aliases` を追加したい場面で有効です。

この機能を追加する場合は、次を満たします。

- 既定一致対象面は狭く保つ
- 追加面は opt-in とする
- ハイライト規則も同じ対象面・正規化規則に従わせる

#### 8. 結果グルーピング

検索対象が単一種別であるうちは不要ですが、記事、ノート、見出し、注釈など複数種別を横断する場合には価値があります。

この機能を追加する場合は、次を満たします。

- グループ見出しが keyboard navigation を壊さない
- active result はグループをまたいでも一貫して扱える
- 視覚情報量を増やしすぎず、本文より検索面が主役にならない

### 原則として優先しない機能

次の機能は便利に見えても、読書の没入や責務分離を損ないやすいため、原則として優先しません。

- 常時表示の preview pane
- 選択時の自動遷移内蔵
- 最近の検索履歴や頻出項目の複雑な個人化
- 複数検索ソースの暗黙マージ
- 派手なアニメーションや進捗演出

これらは探索効率よりも検索面の主役化につながりやすいため、別コンポーネントまたは別レイヤで扱う方が適切です。

### 優先順位の要約

優先順位をまとめると次の順です。

1. 明示的な error state と retry 導線
2. 検索結果項目の安定 ID
3. 選択 detail の拡張
4. request event と close reason の強化
5. `searcher` 契約の拡張
6. 文言外部化と locale 対応
7. 一致対象面の明示設定
8. 結果グルーピング

この順序は、見た目の豊かさではなく、**契約の強度、責務分離、探索効率**を優先して定めます。

## 補足

`ui-search-dialog` の要点は、検索機能を多く持つことではありません。**外部が状態を持ち、dialog は探索面としてふるまい、結果を通知して静かに閉じること**にあります。

今後の変更でも、少なくとも次は崩さない方がよいです。

- `opened` と `query` は controlled state として扱うこと
- 選択と遷移を分離すること
- empty と error を分離すること
- 結果項目を安定 ID で扱うこと
- 仮想化しても意味論を変えないこと
- close 後の focus return を維持すること

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
