# Switch

## 概要

本書は、`ui-switch` の **目標契約** を定義するものです。ここでいう目標契約とは、現行実装の細部を追認するものではなく、Rouault において長期的に維持しやすく、利用者が安定して依存できる公開面を固定したものです。

`ui-switch` は、設定や表示オプションのような **二値の即時切替** を担う atomic control です。責務は、二値状態の表示、入力受付、アクセシブルな状態通知、最小限の視覚表現に限定します。設定行全体の見出し、説明文、永続化、フォーム送信は本コンポーネントの責務に含めません。

本契約では、次の設計原則を採用します。

- `ui-switch` は **二値 control** であり、設定行全体の複合 UI ではない
- **状態所有権はコンポーネント自身** にある
- 外部との連携は **単一の意味論を持つイベント** で行う
- 可視ラベルと外部ラベルを区別し、**アクセシブル名の決定規則を固定**する
- `disabled` と `readonly` を分離し、**操作不能** と **変更不能** を混同しない
- スタイル拡張面は最小限に絞り、**内部構造への依存を防ぐ**

---

## 適用範囲

本書は、`ui-switch` の次の事項を対象とします。

- 公開入力
- 公開イベント
- 公開メソッド
- 状態モデル
- キーボード / ポインター契約
- Accessibility 契約
- Visual Contract
- スタイル拡張面
- 境界条件
- 開発時適合性
- Storybook 契約

本書は、次の事項を扱いません。

- 設定値の永続化
- API 呼び出し
- 設定行全体のレイアウト
- 説明文やエラー文の描画
- エラー表示
- バリデーション
- フォーム送信値の生成
- FormData 参加
- reset 参加
- 監査ログや権限制御
- 非同期 pending / loading 表示
- 三値状態 / indeterminate
- `click()` 公開メソッド
- `before-checked-change`
- 現行実装への追従を目的とした互換イベントの常設保証

これらは上位レイヤまたは別コンポーネントの責務、あるいは本コンポーネントの正式公開契約の外側にあります。

---

## コンポーネントの位置付け

`ui-switch` は **単独で完結する二値切替子** です。設定項目全体を表現するコンポーネントではありません。

したがって、長期的には次の責務分離を前提とします。

- `ui-switch`: 二値 control 本体
- `ui-setting-row`: 見出し、説明、補助文、エラー文、control の配置
- `ui-form-switch`: フォーム参加が必要な場合の別コンポーネント

`ui-switch` 自体は、設定行の見出しや複数行説明を内部に抱え込みません。単体 control としての一貫性を優先します。

---

## 公開契約

### 責務

`ui-switch` の責務は次に限定します。

- 現在値が ON か OFF かを表示すること
- 利用者操作により値を反転できること
- 現在値をアクセシブルに通知すること
- `disabled` / `readonly` を区別して扱うこと
- 最小限の視覚差分で状態変化を伝えること

次は責務に含めません。

- 設定値の保存
- 外部説明文の描画
- エラー表示
- バリデーション
- フォーム参加
- 複数 switch の依存制御

### 状態所有権

`ui-switch` は **self-updating component** です。利用者操作が成立した場合、コンポーネント自身が `checked` を更新し、その結果をイベントで通知します。

したがって、公開契約上の状態所有権はコンポーネントにあります。外部は `checked` を上書きできますが、**ユーザー操作のたびに外部が値を確定しなければ表示が更新されない controlled component ではありません**。

この方針を採る理由は次のとおりです。

- Web Component 単体で自然に動作すること
- 利用者が最小構成で使えること
- 外部状態管理の有無にかかわらず一貫した操作感を持つこと

---

## 公開入力

### 入力一覧

| 名前          | 種別                 | 既定値      | 契約                                                                 |
| ------------- | -------------------- | ----------- | -------------------------------------------------------------------- |
| `checked`     | property / attribute | `false`     | 現在値。`true` で ON、`false` で OFF                                 |
| `disabled`    | property / attribute | `false`     | 完全に非操作化する。Tab 移動対象から外れる                           |
| `readonly`    | property / attribute | `false`     | 値は表示するが変更は受け付けない。Tab 移動対象には残る               |
| `label`       | property / attribute | `''`        | 内部に描画する単純テキストラベル                                     |
| `labelledBy`  | property             | `undefined` | 外部ラベル要素 IDREF。空白区切りで複数 ID を指定できる               |
| `describedBy` | property             | `undefined` | 外部説明要素 IDREF。空白区切りで複数 ID を指定できる                 |
| `aria-label`  | host attribute        | なし        | `label` も `labelledBy` も指定しない場合のアクセシブル名             |

### 入力契約

- `checked` は二値のみを取ります。三値や indeterminate は扱いません。
- `checked`、`disabled`、`readonly` の attribute は boolean attribute として扱います。attribute が存在するとき `true`、存在しないとき `false` です。
- property と attribute の反映結果は意味的に一致しなければなりません（MUST）。
- `disabled` と `readonly` は同時に `true` にしてはなりません（MUST NOT）。
- `label` は **単純テキスト** のみを受け付けます。HTML、slot、アイコン、リンク、ボタンなどの複合内容は公開契約に含めません。
- アクセシブル名の入力は、`label`、`labelledBy`、`aria-label` のうち **いずれか 1 系統のみ** を使います。
- `label` を使う場合、`labelledBy` と `aria-label` は併用しません。
- `labelledBy` を使う場合、`label` と `aria-label` は併用しません。
- `label` も `labelledBy` も指定しない場合、host に `aria-label` を与えなければなりません（MUST）。
- `labelledBy` および `describedBy` が参照する ID は、文書内で解決可能でなければなりません（MUST）。

### フォーム非依存契約

`ui-switch` は form-associated custom element ではありません。したがって、次は公開入力に含めません。

- `name`
- `value`
- `required`
- `form`
- FormData への自動出力
- reset 参加

フォーム参加が必要な場合は、`ui-form-switch` 相当の別コンポーネントで扱います。

---

## 公開イベント

### 正式イベント

`ui-switch` の正式な公開イベントは **`checked-change`** です。

| 名前             | 発火条件                           | detail                 | 契約                               |
| ---------------- | ---------------------------------- | ---------------------- | ---------------------------------- |
| `checked-change` | ユーザー操作により値が変化したとき | `{ checked: boolean }` | `bubbles: true` / `composed: true` |

### イベント契約

- `checked-change` は **ユーザー操作で状態が変化したときのみ** 発火します。
- 発火前に `checked` は更新済みでなければなりません（MUST）。
- プログラムから `checked` を変更した場合、自動では発火しません。
- `readonly` および `disabled` では発火しません。
- 利用者は `checked-change` を唯一の意味論イベントとして扱います。

### 非推奨イベント

`change` および `input` は、長期的な正式契約には含めません。必要なら互換イベントとして残せますが、新規利用者は依存しません。

この方針により、イベント意味論を一意にし、`input` と `change` の責務衝突を避けます。

---

## 公開メソッド

| 名前              | 契約                                |
| ----------------- | ----------------------------------- |
| `focus(options?)` | 内部 control にフォーカスを委譲する |
| `blur()`          | 内部 control からフォーカスを外す   |

公開メソッドはこれに限定します。Shadow DOM の内部要素探索は公開契約に含めません。

---

## 状態モデル

`ui-switch` は次の状態を持ちます。

### OFF

- `checked = false`
- `aria-checked="false"`
- 視覚上は OFF の thumb 位置とトラック差分を持つ

### ON

- `checked = true`
- `aria-checked="true"`
- 視覚上は ON の thumb 位置とトラック差分を持つ

### Disabled

- `disabled = true`
- 値は保持する
- ポインター・キーボード操作を受け付けない
- Tab 移動対象から外れる
- `aria-disabled="true"`

### Readonly

- `readonly = true`
- 値は保持する
- フォーカス可能である
- ポインター・キーボード操作では値を変更しない
- 状態は読めるが変更できないことが視覚的に判別できる

### Focused

- control にフォーカスがある
- `:focus-visible` で視覚提示する
- ホスト要素自体の `:focus` は公開契約に含めない

---

## Accessibility 契約

### 対話主体

対話主体は `role="switch"` を持つ単一の内部 control 要素です。host 自体は対話主体ではありません。

### アクセシブル名の決定規則

アクセシブル名は次のいずれか 1 系統で決定します。

1. `label`
2. `labelledBy`
3. host の `aria-label`

複数系統を同時に与えて名前解決を競合させてはなりません（MUST NOT）。

### アクセシブル説明

補助説明が必要な場合は `describedBy` を用います。`describedBy` は `aria-describedby` に対応し、空白区切りで複数 IDREF を指定できます。説明文の描画自体は上位レイヤの責務です。

### ARIA 契約

内部 control は少なくとも次を満たします。

- `role="switch"`
- `aria-checked`
- `tabindex="0"`（`disabled` でない場合）
- `aria-disabled="true"`（disabled 時）
- `aria-readonly="true"`（readonly 時）
- `aria-labelledby` または `aria-label`
- `aria-describedby`（`describedBy` 指定時）

### ラベル構造契約

- `label` を使う場合、内部ラベル文字列は control のアクセシブル名に正しく反映されなければなりません（MUST）。
- `role="switch"` を持つ対話主体の内部に、別の interactive 要素や意味を持つ子孫要素を公開契約として要求してはなりません（MUST NOT）。
- 内部ラベルを視覚上表示する場合、構造は公開契約に含めません。ただし、アクセシブル名の決定と起動面の同等性は保証しなければなりません（MUST）。
- 外部ラベルを使う場合、ラベルの描画責務は `ui-switch` にありません。関連付けは `labelledBy` で行います。

### 起動面の同等性

- control 本体の pointer 操作で toggle できます。
- 内部ラベルを視覚上表示する場合、そのラベル領域も control と同等の起動面として扱わなければなりません（MUST）。
- ただし、この同等性は DOM 構造ではなく、観測可能な挙動として保証します。

---

## キーボード / ポインター契約

### ポインター

次の場合に値を反転します。

- control 本体の click / tap
- 内部 `label` の click / tap

### キーボード

キーボードで値を反転するのは **Space のみ** です。

- Space: toggle する
- Enter: toggle しない
- `e.repeat === true` の連続発火は無視する
- IME 変換中の入力は無視する

この契約により、checkbox / switch 系 control の期待に寄せ、Enter による不必要な挙動差を排除します。

### Disabled / Readonly

- `disabled`: ポインター・キーボードとも起動しない
- `readonly`: フォーカスは受けるが起動しない

---

## DOM / 構造契約

内部構造は次の概念要素から成ります。

- `control`: switch 本体
- `thumb`: 可動表示要素
- `label`: 任意の内部ラベル

具体的な class 名や補助 wrapper は内部詳細であり、公開契約ではありません。

したがって、利用者は次に依存してはなりません（MUST NOT）。

- 内部 class 名
- wrapper の有無
- transform 値
- 疑似要素の構成
- Shadow DOM の細部

### 関連付けの安定性

`label`、`labelledBy`、`describedBy` に関わる内部関連付けに ID を用いる場合、その生成規則は **deterministic** でなければなりません（MUST）。

ここでいう deterministic とは、同一入力・同一構成に対して、SSR / hydration / 再描画 / テスト実行のいずれでも意味的に安定した関連付け結果が得られることを指します。

利用者は内部 ID の具体値に依存してはなりません（MUST NOT）。公開契約として重要なのは ID 文字列そのものではなく、次が安定して成立することです。

- アクセシブル名の関連付け
- アクセシブル説明の関連付け
- スナップショットおよび E2E テストでの再現性
- SSR / hydration 時の不整合回避

---

## Visual Contract

`ui-switch` の視覚契約は、**低ノイズで判別可能な二値差分** にあります。

### 情報順位

- ON / OFF は、色のみに依存せず判別可能でなければなりません（MUST）。
- disabled / readonly / focused は、ON / OFF とは別の状態差として判別可能でなければなりません（MUST）。
- focus-visible は、通常表示および forced-colors 環境の双方で視認可能でなければなりません（MUST）。
- 状態理解に不要な装飾や過剰アニメーションで、本文や見出しより視覚的優先度を上げてはなりません（MUST NOT）。

### レイアウト

- control 自体の判別性を最優先します。
- 内部 `label` は単一行・短文を基本とします。
- 長文や複数行説明は `ui-switch` ではなく上位レイヤで扱います。

### 状態差分

- OFF では、thumb 位置と track 表現の双方で OFF と判別できます。
- ON では、thumb 位置と track 表現の双方で ON と判別できます。
- Disabled では、非参加状態であることが読めます。
- Readonly では、非参加ではなく変更不能であることが読めます。
- Focused では、明確な focus-visible ring または同等の視覚提示を持ちます。

### モーション

- 通常環境では短い補助モーションを許可します。
- `prefers-reduced-motion: reduce` では、状態理解に不要な transition / animation を極小化または無効化しなければなりません（MUST）。
- モーションは状態理解の補助であり、モーションがなくても ON / OFF を判別できなければなりません（MUST）。

### 強制色モード

- forced-colors 環境でも、ON / OFF / Focused の差分が判別可能でなければなりません（MUST）。
- ON / OFF の判別を背景色だけに依存してはなりません（MUST NOT）。

---

## スタイル拡張契約

### CSS Parts

公開する part は次に限定します。

| part 名   | 役割         |
| --------- | ------------ |
| `control` | switch 本体  |
| `thumb`   | 可動表示要素 |
| `label`   | 内部ラベル   |

`track`、wrapper、補助要素などの内部構成は part として公開しません。

### CSS Custom Properties

公開トークンは最小限にとどめます。長期的に公開してよいのは、概ね次のカテゴリです。

- control 幅
- control 高さ
- thumb サイズ
- label gap
- focus ring 幅 / 色 / offset
- motion duration
- motion easing

色トークンや transform 位置まで細かく public surface に含めることは推奨しません。意味の薄い微細トークンは内部実装詳細として扱います。

### 非公開面

利用者は次に依存してはなりません。

- thumb の正確な移動距離
- wrapper の align-items
- 内部 box-shadow の有無
- 最小タッチ領域を実現する疑似要素

---

## 境界条件

### ラベルなし

`label` も `labelledBy` も指定しない場合、`aria-label` は必須です。

### 外部ラベルあり

設定行などで外部の見出しを名前源にしたい場合は `labelledBy` を使います。`label` は併用しません。

### 説明文あり

補助説明が必要な場合は `describedBy` を使います。説明文の描画は別コンポーネントの責務です。

### 長文テキスト

長文は `ui-switch` 内部に持ち込みません。長文タイトルや複数行説明は上位レイヤへ移します。

### Readonly

`readonly` は disabled の代替ではありません。Tab で到達でき、値を読めますが変更できません。

### フォーム内配置

フォーム内に配置されても、Enter キーで toggle しません。フォーム参加も行いません。

### プログラム更新

スクリプトから `checked` を変更しても、`checked-change` は自動発火しません。

---

## 開発時適合性

`ui-switch` は、公開契約に反する入力構成を **開発時警告** として検出してよいです。これは公開 API の追加ではなく、契約違反の早期発見を目的とした適合性支援です。

### 警告対象

少なくとも次は開発時警告の対象としてよいです。

- `label`、`labelledBy`、`aria-label` のいずれもなく、アクセシブル名が解決できない
- `label` と `labelledBy` を併用している
- `labelledBy` と `aria-label` を併用している
- `disabled` と `readonly` を併用している
- `labelledBy` または `describedBy` が解決不能な IDREF を参照している
- 空文字ラベルを意図せず与えている

### 警告契約

- 警告は開発時に限定してよく、本番利用時の正常系挙動を阻害してはなりません（MUST NOT）。
- 警告は実行時例外ではなく、非破壊の diagnostics として扱います。
- 警告の文言や出力方法そのものは公開契約に含めません。

---

## Storybook 契約

各 Story は見本ではなく、契約確認点として扱います。長期的には少なくとも次を固定します。

| Story                      | 固定する契約                                     |
| -------------------------- | ------------------------------------------------ |
| `Default`                  | 既定値が OFF であること                          |
| `On`                       | ON 状態が成立すること                            |
| `Disabled`                 | disabled で非操作・Tab 除外であること            |
| `Readonly`                 | readonly でフォーカス可能かつ非変更であること    |
| `InternalLabel`            | `label` による内部ラベルが成立すること           |
| `ExternalLabelledBy`       | `labelledBy` による外部ラベル連携が成立すること  |
| `DescribedBy`              | `describedBy` により説明文関連付けが成立すること |
| `NoLabelNeedsAriaLabel`    | ラベルなしでは `aria-label` が必要であること     |
| `PointerToggle`            | control click で `checked-change` が発火すること |
| `InternalLabelClickToggle` | 内部ラベル click で toggle すること              |
| `KeyboardSpaceToggle`      | Space でのみ toggle すること                     |
| `KeyboardEnterNoToggle`    | Enter では toggle しないこと                     |
| `RepeatKeyIgnored`         | キーリピートで連続 toggle しないこと             |
| `ReducedMotion`            | reduced motion で transition が極小化されること  |
| `ForcedColors`             | forced-colors 環境で状態差分が視認できること     |
| `InvalidLabelConfigWarning`  | ラベル指定の競合が開発時警告として検出できること         |
| `DisabledReadonlyWarning`    | `disabled` と `readonly` の併用が開発時警告として検出できること |

`SettingsPanel` のような複合 UI は `ui-switch` 単体の Story ではなく、上位コンポーネントの Story で担保します。

---

## 参考: 現行実装との差分（非規範）

本節は、現行の `switch.ts` および `switch.stories.ts` と、本書が定義する目標契約との差分を整理するための **非規範メモ** です。本節は公開契約の一部ではなく、利用者が依存してよい保証を定義するものではありません。

### 1. イベント意味論

現行実装は `change` と `input` を発火しますが、目標契約では `checked-change` を正式イベントとします。

### 2. Enter キー

現行実装は Enter でも toggle しますが、目標契約では Space のみを起動キーとします。

### 3. Readonly

現行実装には `readonly` がありません。目標契約では `disabled` と分離します。

### 4. 外部ラベル / 外部説明

現行実装は `labelledBy` / `describedBy` を持ちません。目標契約では設定行との結合を想定し、両者を公開入力に含めます。

### 5. SettingsPanel Story の責務境界

現行 Story には `SettingsPanel` がありますが、目標契約では複合 UI の責務を `ui-switch` から切り離します。

### 6. 内部ラベルの扱い

現行実装は `label` を内部ラベルとして描画します。これは維持できますが、長文や複数行説明まで受け持つ契約には昇格させません。

### 7. 公開 parts

現行実装は `track` / `thumb` / `label` を part として公開しています。目標契約では `control` / `thumb` / `label` に整理し、内部構造への結び付きを弱めます。

### 8. 公開トークン面

現行実装は細かな位置・色・境界トークンを多く露出しています。目標契約では公開トークンを寸法・focus・motion などの高水準カテゴリへ縮小します。

### 9. ラベルなし時の実行時強制

現行実装は `aria-label` 欠落時でも描画します。目標契約では、少なくとも開発時警告を出すことを推奨します。

### 10. ID 生成

現行実装のランダム ID は SSR / hydration の観点で望ましくありません。目標契約では deterministic な関連付け方式へ寄せるべきです。

### 11. 実装内説明と実際の状態所有権の不整合

現行の実装コメントおよび Storybook 説明には「状態管理は親で行います」という記述がありますが、実行時の挙動は self-updating です。つまり、説明上は外部管理を示唆しつつ、実装上はユーザー操作で `checked` を内部反転しています。

この不整合は、利用者に controlled component 的な期待を生じさせるため、現行の未整理事項として明示しておく必要があります。目標契約では、状態所有権をコンポーネント自身にあるものとして固定し、説明文側もそれに合わせて改めるべきです。

### 12. キー入力の細則

現行実装は `Space` と `Enter` の双方で toggle しますが、キーリピート (`e.repeat`) の抑止、および IME 変換中 (`isComposing`) の無視は行っていません。目標契約では、起動キーを Space のみに限定し、連続 keydown や変換中入力による意図しない状態変化を防ぐ方向へ寄せるべきです。

### 13. 契約違反の開発時検出

現行実装には、契約違反を開発時に検出する仕組みがありません。したがって、次のような不正構成も警告なしに描画されます。

- `label`、`labelledBy`、`aria-label` のいずれもない
- `label` と `labelledBy` の併用
- `disabled` と `readonly` の併用（将来導入時）

目標契約では、少なくとも開発時 warning により違反を検出できるようにすることを推奨します。

---

## 補足

本書の狙いは、`ui-switch` を「なんでも入る小さな設定行」ではなく、**責務の狭い、安定した二値 control** として固定することです。

この方針を採ると、将来の拡張は次のように整理できます。

- 説明文やエラー文が必要になったら `ui-setting-row` 側で扱う
- フォーム参加が必要になったら `ui-form-switch` を別途設ける
- トグル以外の複雑な状態が必要になったら switch ではなく別 control を検討する

結果として、`ui-switch` 自体は小さく、予測可能で、保守しやすいまま維持できます。
