# Tooltip コンポーネント契約書

## 1. 文書の目的

本書は、`ui-tooltip` の公開契約、状態モデル、アクセシビリティ、視覚契約、および Storybook 上の検証方針を定義するものです。

`ui-tooltip` は、**本文や UI 要素の意味を補足するための非インタラクティブな短文ヒント**を提示するコンポーネントです。単に小さな浮遊レイヤを描画するのではなく、**どの要素を trigger として扱うか**、**いつ開閉するか**、**どのタイミングで説明関係を付与するか**、**表示レイヤをどの座標系に置くか**を公開契約として固定します。

Rouault における tooltip は読書の主役ではありません。本文やラベルを読み進める流れを壊さず、**必要なときだけ静かに補足し、不要になれば速やかに退くこと**が求められます。したがって、本コンポーネントの契約は、説明補助と、**「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 2. 適用範囲

本書は、`ui-tooltip` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 実装修正方針
- 将来機能の検討方針
- 現行実装で未対応の事項

一方、本書は次の事項を扱いません。

- HTML やリッチコンテンツを含む説明ポップアップ
- ボタン、リンク、入力欄などを含むインタラクティブな overlay
- click で固定表示される help popup や popover
- 長文ヘルプ、操作手順、チュートリアル表示
- 画面単位でのヘルプ戦略や文言設計全体
- trigger 側コンポーネントの truncate 判定や説明文生成

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 3. 設計原則

`ui-tooltip` の設計は、次の原則に従います。

1. **tooltip は非インタラクティブな短文補足に限定すること。**
2. **開閉は hover / focus 起点の内部状態として扱うこと。**
3. ``** の付与と除去を trigger に対して正しく反映すること。**
4. **表示レイヤを trigger から分離しつつ、位置追従と可読性を維持すること。**
5. **外部制御や過剰な自由度を安易に持ち込まず、責務を狭く保つこと。**

---

## 4. 公開契約

`ui-tooltip` は、`text`、`variant`、`placement`、`offset`、`openDelay`、`closeDelay`、`disabled` を公開入力として扱います。スロットは既定スロットのみを持ち、**最初に割り当てられた単一の **``** を trigger** として扱います。

tooltip 内容は `text` による**プレーンテキスト入力**のみを受け付けます。HTML は解釈せず、内部的にも `textContent` として扱います。したがって、強調、リンク、任意マークアップを tooltip 内容の公開契約には含めません。

`text` は **plain prose** として扱います。先頭末尾空白は空判定にのみ用い、表示時の改行や連続空白は通常の折り返し規則に従って視覚的に正規化されます。tooltip は短文補足を対象とし、長文説明の収容を目的としません。

`variant` の既定値は `default`、`placement` の既定値は `top`、`offset` の既定値は `8`、`openDelay` と `closeDelay` の既定値はいずれも `0`、`disabled` の既定値は `false` です。

`ui-tooltip` の開閉は公開 property では制御しません。**hover または focus を起点とした内部状態**としてのみ開閉します。したがって、利用者は `open` のような外部制御面を期待してはなりません（MUST NOT）。

### 4.1 入力契約

| 名前         | 種別                                 | 必須   | 内容                          | 契約                                                                                                                                                    |
| ------------ | ------------------------------------ | ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`       | property / attribute                 | いいえ | tooltip 文言                  | 空白のみを含む場合は tooltip を表示しません                                                                                                             |
| `variant`    | property / attribute                 | いいえ | 視覚バリアント                | `default` / `subtle` / `inverse`                                                                                                                        |
| `placement`  | property / attribute                 | いいえ | 基本配置                      | `top` / `top-start` / `top-end` / `bottom` / `bottom-start` / `bottom-end` / `left` / `left-start` / `left-end` / `right` / `right-start` / `right-end` |
| `offset`     | property / attribute                 | いいえ | trigger と tooltip の基本距離 | 既定値は `8`。0 以上の有限数を受理します                                                                                                                |
| `openDelay`  | property / attribute (`open-delay`)  | いいえ | 表示遅延                      | ミリ秒単位。非負の有限数として扱います                                                                                                                  |
| `closeDelay` | property / attribute (`close-delay`) | いいえ | 非表示遅延                    | ミリ秒単位。非負の有限数として扱います                                                                                                                  |
| `disabled`   | property / attribute                 | いいえ | tooltip 抑止                  | `true` の場合は開きません                                                                                                                               |

### 4.2 スロット契約

| 名前         | 種別 | 位置づけ | 内容                                          |
| ------------ | ---- | -------- | --------------------------------------------- |
| 既定スロット | slot | 正規入力 | tooltip を紐づける trigger 要素を受け取ります |

既定スロットは trigger 要素を受け取ります。`ui-tooltip` は、`slot.assignedElements({ flatten: true })[0]` を優先し、存在しない場合のみ `firstElementChild` を fallback として扱います。したがって、**正規入力は 1 個の **`` です。

trigger は hover と focus の双方を受け取る要素であることを前提とします。`disabled` なネイティブ form control のように、focus や pointer interaction を安定して受け取れない要素を直接 trigger とする構成は、公開契約としてサポートしません。必要な場合は、その外側の wrapper 要素を trigger とします。

複数要素を与えた場合でも、契約上 trigger として扱うのは最初の要素のみです。2 個目以降の要素に hover / focus リスナーが付与されることは保証しません。

また、trigger として採用された先頭要素の**子孫要素上で発生した pointer / focus interaction も、trigger interaction の一部**として扱います。したがって、trigger 内に icon や text span などの内部要素が存在しても、契約上の interaction 領域は trigger 要素全体です。

### 4.3 公開メソッド

`ui-tooltip` は開閉や再配置に関する公開メソッドを持ちません。利用者は hover / focus を通じて利用します。

### 4.4 公開イベント

`ui-tooltip` は独自の公開カスタムイベントを契約として持ちません。tooltip の表示可否は内部状態であり、利用者は独自の `open` / `close` イベントや detail payload に依存してはなりません（MUST NOT）。

### 4.5 属性反映契約

| property     | attribute     | reflect | 備考                                                                                  |
| ------------ | ------------- | ------- | ------------------------------------------------------------------------------------- |
| `text`       | `text`        | なし    | HTML 属性からは与えられますが、property 変更が attribute に反映される保証はありません |
| `variant`    | `variant`     | あり    | 列挙外値は `default` に正規化します                                                   |
| `placement`  | `placement`   | あり    | 列挙外値は `top` に正規化します                                                       |
| `offset`     | `offset`      | あり    | 非有限値は `8` に正規化します                                                         |
| `openDelay`  | `open-delay`  | あり    | 非有限値または負値は `0` に正規化します                                               |
| `closeDelay` | `close-delay` | あり    | 非有限値または負値は `0` に正規化します                                               |
| `disabled`   | `disabled`    | あり    | boolean attribute として扱います                                                      |

### 4.6 無効値の扱い

`variant` と `placement` は列挙値を公開契約とします。列挙外値はそれぞれ `default`、`top` に正規化します。

`offset` は 0 以上の有限数を受理し、非有限値は `8` に正規化します。負の有限値は `0` に clamp します。

`offset` は **希望 gap** を表します。collision 回避や viewport 保護が優先されるため、最終表示位置で厳密に同一 gap となることまでは保証しません。

`openDelay` と `closeDelay` は、非有限値または負値を `0` に正規化します。

### 4.7 責務範囲

責務範囲には、trigger への hover / focus 監視、tooltip レイヤの生成と破棄、`aria-describedby` の動的付与と除去、viewport 内に収めるための再配置、hover 維持のための hit area 生成、および環境別スタイルの適用を含みます。

一方で、tooltip 文言の生成、長さ判定や省略判定、タッチ専用 UX、リッチコンテンツ表示、永続表示、開閉状態の外部制御は責務に含めません。

---

## 5. 状態モデル

`ui-tooltip` の主要状態は、見た目の種別ではなく、**説明文が利用可能か、trigger が存在するか、開状態を支える interaction source が存在するか、遅延中か、表示抑止状態か**によって定義します。

開状態は、`trigger-hover`、`tooltip-hover`、`trigger-focus` の 3 種の source 集合で定義します。**source 集合が非空であれば open、空であれば close** です。delay はこの状態遷移に付随する scheduler として扱います。

### 5.1 基本状態

最小状態は、`text` に空でない文言を持ち、`variant="default"`、`placement="top"`、`offset=8`、`openDelay=0`、`closeDelay=0`、`disabled=false` の状態です。この状態では trigger への hover または focus により tooltip を表示できます。

### 5.2 開状態

tooltip は、trigger 上で `mouseenter` または `focusin` が発生し、source 集合が非空になったときに開きます。開いた tooltip は `ownerDocument.body` 配下に生成され、表示中は trigger に `aria-describedby` を付与します。

### 5.3 閉状態

tooltip は、trigger と tooltip の双方から pointer が外れ、かつ trigger 内 focus も失われたときに閉じます。閉じると tooltip panel は**非表示のまま残るのではなく破棄**され、`aria-describedby` から自身の id も除去されます。

### 5.4 Hover 維持状態

tooltip は、trigger から tooltip 自体へ pointer を移した場合も表示を維持します。これは tooltip 本体に加えて trigger 側へ向けた hit area を持つことで成立します。したがって、**trigger と tooltip のあいだをまたぐ pointer 移動**は即時 close の条件ではありません。

### 5.5 遅延状態

`openDelay` が正値の場合、tooltip は hover / focus 直後には表示されず、指定時間の経過後に開きます。`closeDelay` が正値の場合、close 条件成立後も指定時間は表示を維持し、その後に閉じます。

開待ち中に close 条件へ移った場合は open timer を取り消します。逆に、close 待ち中に再び hover / focus 条件へ戻った場合は close timer を取り消します。

なお、timer 待機中に `openDelay` または `closeDelay` が変更されても、**既に開始済みの timer へは遡及適用しません**。変更後の値は、次に新しく schedule される open / close から適用します。

### 5.6 抑止状態

次のいずれかに該当する場合、tooltip は表示されません。

- `disabled=true`
- `text.trim()` が空文字
- trigger 要素が存在しない

これらの条件が表示中に成立した場合、tooltip は閉じて破棄されます。

### 5.7 Escape による閉状態

tooltip 表示中に **trigger subtree に focus が存在する状態で** `Escape` キー入力が到達した場合、tooltip は閉じます。この close は source 集合を空にし、待機中 timer も破棄します。hover のみで開いている状態に対する `Escape` close は保証対象に含めません。

### 5.8 配置調整状態

tooltip の開位置は `placement` を起点としますが、実際の表示位置は viewport からのはみ出しを避けるために補正されます。したがって、指定した `placement` は**希望配置**であり、最終表示位置は `flip` と `shift` により変化し得ます。

`placement` の `start` / `end` を含む指定は、希望する整列方向を表しますが、collision 回避後の最終座標そのものは公開契約に含めません。

---

## 6. DOM / Accessibility

ルートは `:host` です。Shadow DOM 内には slot だけを持ち、可視 panel は open 時に **host と同じ **``** の body** 直下へ動的生成します。

```text
<ui-tooltip data-tooltip-id="...">
  #shadow-root
    <slot></slot>
</ui-tooltip>

<body>
  <div
    id="ui-tooltip-..."
    role="tooltip"
    aria-hidden="false|true"
    data-ui-tooltip-content
    data-open
    data-side
    data-variant
  >
    <div data-ui-tooltip-hit-area aria-hidden="true"></div>
    <div data-ui-tooltip-surface>...</div>
  </div>
</body>
```

### 6.1 Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- tooltip panel 自体は `role="tooltip"` を持ちます。
- tooltip panel は `aria-hidden` により開状態を反映します。生成直後は `"true"`、表示中は `"false"` です。ただし close 後は非表示のまま保持されるのではなく、panel 自体が破棄されます。
- 表示中のみ、trigger に `aria-describedby` を動的付与します。
- trigger が既に `aria-describedby` を持つ場合も、その値と順序を保持したまま tooltip id を末尾へ追加します。
- close、suppress、disconnect、trigger replacement のいずれでも、既存 token を壊さずに tooltip 自身の id のみを除去します。
- tooltip 内容はプレーンテキストであり、対話要素を含みません。
- tooltip panel 自体に focus を受ける契約はありません。
- キーボード利用時に tooltip を発見可能にするには、trigger 側が focus 可能でなければなりません（MUST）。

本コンポーネントで重要なのは、**tooltip が独立した対話面ではなく、trigger を説明する補助面であること**です。したがって、dialog や menu のような focus 管理、roving tabindex、内部アクション群は持ち込みません。

また、tooltip は **accessible name の代替ではなく、補助的な description** です。icon-only trigger など、単体では意味が確定しない trigger は、tooltip の有無に依存せず、`aria-label` などにより**trigger 自身が可読な名前を持つ必要があります**（MUST）。

---

## 7. Visual Contract

`ui-tooltip` の視覚契約は、**本文や trigger より一段控えめな補足情報を、可読性を保ったまま短時間提示すること**にあります。

### 7.1 情報順位

- `default` は標準的な補足提示です。
- `subtle` はさらに控えめな背景と影で、補足性を強めます。
- `inverse` は暗い面と明るい文字で、暗背景や高コントラスト文脈でも区別しやすくします。

tooltip は情報の主役ではありません。本文、見出し、リスト、注釈の読書順序を奪わない強度に保ちます。常時表示、強い発光、派手な移動アニメーション、過大な面積拡張には依存しません。

### 7.2 レイアウト

ルートの `:host` は `inline-flex` です。tooltip panel 自体は `position: fixed` で document 座標系に置かれます。最大幅は可読な短文補足を保てる範囲に制限し、狭い viewport でも左右に余白を残します。

tooltip surface は小さな余白、角丸、境界線、影を持ちます。文字は `text-xs` 相当のサイズ、`font-medium` 相当の太さで表示します。`white-space: normal` と `overflow-wrap: anywhere` を用い、長い語でも折り返します。

### 7.3 視覚仕様

- panel は open 時のみ可視になり、opacity と translateY による短い遷移を行います。
- panel は `z-popover` 層に載り、通常の本文や card より上に表示されます。
- pointer を維持するため、panel には `pointer-events: auto` を持たせます。
- trigger 側へ向かう透明な hit area を持ち、視覚 gap を hover gap にしません。
- 矢印は持ちません。
- 実際の side は内部状態に反映され、hit area の向きもそれに従います。
- 後から開いた tooltip は、同じ `z-popover` 層内で先に開いた tooltip より前面に表示されます。

### 7.4 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途         | トークン                                 |
| ------------ | ---------------------------------------- |
| 最大幅余白   | `--space-4`                              |
| 内側余白     | `--space-1` / `--space-2`                |
| 境界線幅     | `--border-width`                         |
| 既定背景     | `--bg-surface-2`                         |
| 控えめ背景   | `--bg-fill-muted`                        |
| 既定文字色   | `--fg-default`                           |
| 控えめ文字色 | `--fg-muted`                             |
| 既定境界線   | `--border-default`                       |
| 控えめ境界線 | `--border-ghost`                         |
| 角丸         | `--radius-sm`                            |
| 影           | `--elevation-md` / `--elevation-lg`      |
| 文字サイズ   | `--text-xs`                              |
| 太字         | `--font-medium`                          |
| 字間         | `--tracking-wide`                        |
| 行高         | `--line-height-normal`                   |
| 遷移時間     | `--duration-fast` / `--duration-instant` |
| イージング   | `--ease-out`                             |
| 重なり順     | `--z-popover`                            |

### 7.5 トークン到達性

tooltip panel は host の Shadow DOM 内ではなく document body 配下に生成されます。したがって、テーマトークンは **body / document まで到達するスコープ**で定義されていなければなりません（MUST）。host ローカルだけで定義した CSS custom properties に依存する設計はサポートしません。

---

## 8. 環境別の振る舞い

### 8.1 Reduced Motion

`prefers-reduced-motion: reduce` 環境では、tooltip の transition 時間を実質 0 にします。開閉は成立させつつ、視覚移動の強調を避けます。

### 8.2 Forced Colors

`forced-colors: active` 環境では、system color を優先し、box-shadow を除去します。tooltip は独自色による識別ではなく、システムの可視性規則に従います。

### 8.3 Print

`@media print` では tooltip panel を非表示にします。印刷対象として意味を持つのは trigger や本文であり、一時的 overlay である tooltip 内容は印刷に含めません。

### 8.4 Resize / Scroll / Transform Zoom

tooltip は `autoUpdate` により、resize、scroll、layout change、transform zoom に追従します。したがって、表示中に trigger 位置が変化しても、tooltip は再計算され、**基本 gap を維持しつつ追従**します。

---

## 9. 関連契約

### 9.1 Trigger 契約

`ui-tooltip` は trigger 自体を生成しません。trigger は利用側が既定スロットへ与えます。

- keyboard で利用する場合、trigger は focus 可能でなければなりません。
- tooltip は trigger の hover / focus を監視します。
- click は tooltip の正規起動契約に含みません。
- trigger identity が差し替わった場合、それは close 条件です。旧 trigger との説明関係を解除したうえで一旦閉じ、再 hover / refocus によってのみ新 trigger で再 open します。

### 9.2 位置決め契約

tooltip の位置決めは `floating-ui` による `computePosition(..., { strategy: 'fixed' })` を基準とし、次の middleware を用います。

- `offset(offset)`
- `flip({ padding: 8 })`
- `shift({ padding: 8 })`

これにより、tooltip は希望配置を基準にしつつ、viewport 端で裏返りや寄せを行います。利用者は絶対的な side 固定ではなく、**読みやすさ優先の適応配置**として扱います。

### 9.3 スタイル注入契約

tooltip 用の document CSS は `ui-tooltip-document-styles` という id を持つ `<style>` として、**host と同じ **``** の head** に 1 回だけ注入されます。複数 instance があっても重複注入しません。

### 9.4 多重表示契約

`ui-tooltip` は instance ごとに独立して開閉します。**ある tooltip が開いたことを理由に、他の tooltip を自動的に閉じる global singleton 契約は持ちません。** したがって、画面上の複数 tooltip が条件を満たした場合、同時に複数の panel が存在し得ます。

### 9.5 ライフサイクル cleanup 契約

component が DOM から切り離される際は、待機中 timer、位置追従処理、trigger listener、tooltip panel、`aria-describedby` への追加分を**すべて解放または除去**しなければなりません。これは実装上の最適化ではなく、再接続安全性とメモリ安全性のための契約です。

### 9.6 スタイル拡張契約

`ui-tooltip` は `::part(...)` を公開しません。panel は Shadow DOM 外に生成されるため、内部 class や `data-ui-*` 属性への依存を公開拡張面として扱いません。利用者は、**CSS Custom Properties によるトークン差し替え**を基本とし、内部セレクタ構造への依存はしてはなりません（MUST NOT）。

また、`data-tooltip-id`、`data-ui-tooltip-content`、`data-ui-tooltip-surface`、`data-ui-tooltip-hit-area` などの内部属性や、body 直下の DOM 構造は**公開契約ではありません**。これらは内部実装および Storybook 検査の都合で存在し得ますが、利用側の拡張点として依存してはなりません（MUST NOT）。

### 9.7 統合契約

`ui-tooltip` は、trigger 側コンポーネントが必要に応じて `disabled` を切り替えることで、truncate 時のみ補助説明を出す用途にも利用できます。tooltip 自体は truncate 判定を持たず、表示要否の判断は上位コンポーネント側の責務です。

---

## 10. 境界条件

### 10.1 空文字または空白のみの `text`

`text.trim()` が空の場合、tooltip panel を生成してはなりません。hover / focus が発生しても開きません。

### 10.2 Trigger 不在

既定スロットに HTMLElement が存在しない場合、tooltip は開きません。

### 10.3 複数 trigger 候補

複数要素が slot に割り当てられていても、契約上 trigger として扱うのは先頭要素のみです。後続要素は非対応です。

### 10.4 `disabled=true`

`disabled` の tooltip は panel を生成してはなりません。既に開いている場合も閉じて破棄されます。

### 10.5 無効属性値

- 無効な `variant` は `default` に正規化します。
- 無効な `placement` は `top` に正規化します。
- 非有限の `offset` は `8` に正規化し、負の有限値は `0` に clamp します。
- 負値または非有限の `openDelay` / `closeDelay` は `0` に正規化します。

### 10.6 Trigger から panel への pointer 移動

trigger から panel へ pointer を移しても close してはなりません。hover 維持が必要です。

### 10.7 Panel から外部への pointer 離脱

panel から外部へ pointer が離れた場合、close 条件を満たせば panel は破棄される必要があります。

### 10.8 Escape

tooltip 表示中に trigger subtree に focus が存在する状態で `Escape` が到達した場合、panel は破棄され、`aria-describedby` から自身の id が除去される必要があります。hover のみで開いている状態に対する `Escape` close は保証対象に含めません。

### 10.9 再接続

component が DOM から取り外される際は、待機中 timer、位置追従処理、trigger listener、tooltip panel、`aria-describedby` への追加分が正しく cleanup される必要があります。再び接続された後も、tooltip は再度開ける必要があります。listener と内部状態は再接続後に再同期されなければなりません。

### 10.10 表示中のプロパティ変更

tooltip 表示中に `text`、`variant`、`placement`、`offset` が変更された場合、panel 内容または位置は新しい値へ追従する必要があります。

### 10.11 Trigger 差し替え

open 中に trigger identity が変化した場合、tooltip は一旦閉じる必要があります。旧 trigger への `aria-describedby` 追加分は除去され、新 trigger では新しい hover / focus が成立した場合にのみ再 open します。

### 10.12 Document 境界

tooltip panel と document style は、host と同じ `ownerDocument` の `body` / `head` に対して生成・注入される必要があります。top-level `document` 固定の実装詳細に利用者は依存してはなりません。

### 10.13 複数 instance の同時表示

別々の trigger に紐づく複数の `ui-tooltip` が同時に開条件を満たした場合でも、他 instance を自動 close しないことを前提とします。少なくとも、global singleton 化を前提とする利用契約は採用しません。

---

## 11. Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                                 | 固定する契約                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DefaultInfoIcon`                     | 初期状態で panel を生成しないこと、hover / focus で開くこと、表示中のみ `aria-describedby` を付与すること、trigger が単体で名前を持つこと、focus 起因の Escape で閉じること                                                                      |
| `VariantStateMatrix`                  | `default` / `subtle` / `inverse` の 3 variant が存在すること、`disabled` では開かないこと、無効 variant が `default` に正規化されること、複数 instance が互いを自動 close しないこと、後から開いた panel が前面に来ること                        |
| `TransformZoomContract`               | transform zoom 後も trigger と tooltip の gap が実質維持されること                                                                                                                                                                               |
| `BoundaryConditions`                  | 空 text では開かないこと、無効 `variant` / `placement` / `offset` / `openDelay` / `closeDelay` が正規化されること、負の `offset` が `0` に clamp されること、trigger 不在でも破綻しないこと、切断時 cleanup が成立すること、再接続後も開けること |
| `AriaDescribedByPreservationContract` | 既存 `aria-describedby` token の順序を保持したまま tooltip id を末尾追加すること、close / suppress / trigger replacement 時に tooltip id のみを除去すること                                                                                      |
| `LiveSuppressionContract`             | open 中に `disabled=true` または `text.trim()===''` になった場合、panel が破棄され、`aria-describedby` 追加分も除去されること                                                                                                                    |
| `DelayReschedulingBoundary`           | `openDelay` / `closeDelay` の変更が、既に開始済み timer へ遡及適用されず、次回 schedule からのみ有効になること                                                                                                                                   |
| `TriggerReplacementContract`          | open 中に trigger identity が差し替わった場合、一旦 close し、旧 trigger から説明関係が除去されること                                                                                                                                            |
| `FirstTriggerOnlyBoundary`            | 複数 slotted 要素が存在する場合、先頭要素のみが trigger として扱われること                                                                                                                                                                       |
| `DescendantInteractionContract`       | trigger の子孫要素上の hover / focus でも open すること                                                                                                                                                                                          |
| `FocusScopedEscapeContract`           | trigger subtree に focus がある場合の `Escape` close を保証し、hover-only 状態に対する `Escape` close を保証対象に含めないこと                                                                                                                   |
| `OwnerDocumentContract`               | panel と document style が host と同じ `ownerDocument` に対して生成・注入されること                                                                                                                                                              |
| `PlainProseNormalizationContract`     | `text` が HTML として解釈されず、plain prose として表示されること                                                                                                                                                                                |
| `AccessibleNameRequiredBoundary`      | icon-only trigger が tooltip に依存せず、自前で可読な名前を持つこと                                                                                                                                                                              |
| `DarkModeContract`                    | dark 背景上でも `default` と `inverse` が視覚的に区別でき、`z-popover` と shadow が維持されること                                                                                                                                                |
| `VisualModeContracts`                 | document style が注入されること、Reduced Motion / Forced Colors / Print の定義を含むこと、初期状態で panel を生成しないこと                                                                                                                      |
| `TreeItemIntegrationContract`         | 上位コンポーネントが `disabled` を切り替えることで、長いラベル時のみ tooltip を有効化できること                                                                                                                                                  |

### 11.1 運用方針

Story 名は、単なる視覚バリエーションではなく、**破壊的変更を検出したい契約単位**に合わせて命名します。複数の論点を 1 つの Story に過密に詰め込むのではなく、A11y、state、boundary、integration を分離して固定します。

また、play 関数では公開契約の確認を優先し、内部 DOM 構造や `data-ui-*` 属性への依存は必要最小限に留めます。内部属性を参照する場合も、それは公開拡張面ではなく、**Storybook 上の検査補助**としてのみ扱います。

---

## 12. `tooltip.ts` / `tooltip.stories.ts` の修正方針

本節は、確定した契約に現行実装と Storybook を追随させるための修正方針を固定するものです。現時点では、**契約に対して Story が不足している箇所**と、**契約に対して実装自体が未追随の箇所**が混在しています。

### 12.1 実装修正が必要な事項

| 対象                             | 現状                                                                                                                  | 修正方針                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `tooltip.ts` の `offset` 正規化  | 非有限値は `8` に正規化しているが、負の有限値を clamp していない                                                      | `willUpdate()` と `_resolvedOffset` の双方で `toNonNegativeFiniteNumber(this.offset, DEFAULT_OFFSET)` を用い、負値を `0` に clamp する |
| `tooltip.ts` の document 参照    | style 注入と panel 生成が top-level `document.head` / `document.body` 前提になっている                                | `this.ownerDocument` を基準に style 注入と panel 生成を行い、`ownerDocument` 単位で完結させる                                          |
| `tooltip.ts` の trigger 差し替え | trigger が `null` になった場合は close するが、open 中の trigger identity 変化を明示的 close 条件としては扱っていない | `_syncTriggerElement()` で旧 trigger と新 trigger が異なる場合、open 中なら説明関係を解除したうえで一旦 close する                     |

### 12.2 Story 追加・修正が必要な事項

| 対象                 | 現状                                                                    | 修正方針                                                                                                 |
| -------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `BoundaryConditions` | `offset="NaN"` は見ているが、負の `offset` clamp は未検証               | 負の `offset` 例を追加し、`host.offset === 0` を確認する                                                 |
| `BoundaryConditions` | reconnect は見ているが、trigger 差し替えは未検証                        | `TriggerReplacementContract` を追加し、open 中に trigger を差し替えたら close することを確認する         |
| `DefaultInfoIcon`    | `aria-describedby` の追加 / 除去は見るが、既存 token の順序保持は未検証 | `AriaDescribedByPreservationContract` を追加し、既存 token が壊れないことを確認する                      |
| delay 系 Story       | invalid 値正規化は見るが、pending timer 中の prop 変更は未検証          | `DelayReschedulingBoundary` を追加し、既存 timer へ遡及しないことを確認する                              |
| suppress 系 Story    | 初期 suppress は見るが、open 中 suppress は未検証                       | `LiveSuppressionContract` を追加し、open 中 `disabled` / 空 text 化で close することを確認する           |
| trigger 境界         | 複数 slotted 要素や子孫 interaction を未検証                            | `FirstTriggerOnlyBoundary` と `DescendantInteractionContract` を追加する                                 |
| Escape 境界          | focus 起因の Escape close は見るが、hover-only 非保証は未検証           | `FocusScopedEscapeContract` を追加する                                                                   |
| ownerDocument        | `document.getElementById(...)` を直接見ている                           | `host.ownerDocument.getElementById(...)` を使うように Story を修正し、`OwnerDocumentContract` を追加する |
| prose 契約           | plain prose の非 HTML 解釈を未検証                                      | `PlainProseNormalizationContract` を追加する                                                             |
| accessible name      | 正例はあるが、境界 Story がない                                         | `AccessibleNameRequiredBoundary` を追加する                                                              |

### 12.3 修正優先順位

1. **契約と実装の不整合を解消する修正**\
   `offset` clamp、`ownerDocument` 対応
2. **A11y と状態遷移の破壊を防ぐ Story 追加**\
   `AriaDescribedByPreservationContract`、`LiveSuppressionContract`、`TriggerReplacementContract`、`DelayReschedulingBoundary`
3. **境界契約の明確化**\
   `FirstTriggerOnlyBoundary`、`DescendantInteractionContract`、`FocusScopedEscapeContract`、`PlainProseNormalizationContract`、`AccessibleNameRequiredBoundary`

### 12.4 運用上の注意

`tooltip.stories.ts` の play 関数は、実装内部を過度に白箱化してはなりません。`data-ui-*` や body 直下構造を参照する場合でも、それは tooltip の公開 API ではなく、**検査補助のための最小限の観測点**として扱います。

逆に、`ownerDocument`、`aria-describedby`、open / close、disabled suppress、reconnect のような契約は、将来の内部実装が変わっても維持されるべきであり、Story 側で継続的に固定します。

---

## 13. 新規で追加を検討する価値がある機能

本節は、`ui-tooltip` の責務を維持したまま、将来追加を検討する価値がある機能を整理するものです。ここでいう「価値がある」とは、単に表現力を増やすことではなく、**説明補助としての精度、運用性、一貫性を高められること**を意味します。

一方で、tooltip を popover や help dialog に近づける方向の拡張は、本コンポーネントの責務を曖昧化しやすいため、原則として採用しません。

### 13.1 グローバルな delay 協調

最も追加価値が高い候補は、複数 tooltip 間で open delay を協調させる機能です。初回 hover では既定の `openDelay` を適用しつつ、同一画面内で連続して別 tooltip を探索する際には、後続 tooltip を短い delay、または delay なしで開けるようにします。

この機能は、ツールバー、アイコン群、密集したリスト項目などで tooltip を連続的に読む場合の体験を大きく改善します。しかも、tooltip を非インタラクティブな短文補足のまま保てるため、責務の逸脱がありません。

導入する場合は、個別 instance の `openDelay` を壊さず、`delayGroup` のような opt-in の共有遅延文脈として設計するのが望ましいです。

### 13.2 Overflow / Truncate 連携の補助機構

長いラベルが省略表示された場合にのみ tooltip を有効化する用途は、実運用で非常に多いです。現行契約でも `disabled` を上位が切り替えることで実現できますが、その都度 overflow 判定と状態連携を書くのは冗長です。

ただし、この機能は **tooltip 本体へ直接入れるべきではありません。** tooltip 自体が truncate 判定や layout measurement の責務を負うと、再利用性と責務分離が悪化します。

追加するなら、`useTooltipWhenOverflowed(...)` のような補助 hook、あるいは別ユーティリティとして設計し、tooltip 本体は `disabled` 制御を受けるだけに留めるのが適切です。

### 13.3 `size` による最大幅等級

tooltip の最大幅を、自由な数値ではなく、`sm` / `md` / `lg` のような列挙で選べるようにする機能には検討価値があります。短いラベル補助と、やや長い補足文では、読みやすい幅が異なるためです。

ただし、`maxWidth` のような任意値 API は避けた方がよいです。tooltip は設計トークンの支配下に置くべきであり、自由度を上げすぎると視覚的一貫性を損ねます。導入する場合は、**可読性の等級**として `size` を設け、具体値は内部設計値に留めます。

### 13.4 限定的な interaction mode 切り替え

一部の文脈では、`hover + focus` の既定起動ではなく、`focus-only` または `hover-only` の挙動を選びたい場合があります。このため、`interactionMode="hover-focus|focus-only|hover-only"` のような限定的 API には、条件付きで検討価値があります。

ただし、ここで click 起動や toggle 起動まで許可すると tooltip の状態機械が急速に複雑化し、別コンポーネントとの責務境界が崩れます。したがって、導入する場合でも mode は最小限の列挙に制限します。

### 13.5 `aria-describedby` 連携の拡張

現行契約では、既存 `aria-describedby` を保持したまま tooltip id を末尾追加します。これは安全な既定方針ですが、将来的には既存 description との関係を調整したいケースもあり得ます。

ただし、この種の A11y 拡張は設計・検証コストが高く、誤用時の悪影響も大きいです。したがって、`describedByMode` のような切り替え面を導入する価値は理論上ありますが、優先度は高くありません。採用する場合は、`append` を既定とし、それ以外は強い制約付きの opt-in に限定するのが妥当です。

### 13.6 追加を推奨しない機能

次の機能は、一見便利でも tooltip の責務を曖昧化しやすいため、本コンポーネントへの追加は推奨しません。

- `open` property や `show()` / `hide()` などの外部制御 API
- HTML、リンク、ボタン、フォーム要素を含むリッチコンテンツ
- long press や tap-to-toggle などのタッチ専用起動
- arrow 表示
- collision policy の細かな外部制御

これらは tooltip を状態管理コンポーネント、または interactive overlay に近づけます。必要な場合は、tooltip を拡張するのではなく、popover、help popup、coachmark など別責務のコンポーネントとして設計すべきです。

### 13.7 推奨順位

長期的な価値、責務の明確さ、保守性を総合すると、追加を検討する優先順位は次のとおりです。

1. **グローバルな delay 協調**
2. **Overflow / Truncate 連携の補助機構**
3. ``** による最大幅等級**
4. **限定的な interaction mode 切り替え**
5. ``** 連携の拡張**

この順序は、tooltip の本質である「短時間の説明補助」を保ちながら、利用体験を改善できる度合いに基づきます。

---

## 14. 補足

`ui-tooltip` の要点は、浮遊要素を描画すること自体ではありません。**trigger の意味を補足する説明関係を、必要な瞬間だけ成立させ、読書の流れを止めずに退くこと**にあります。

したがって、今後の変更でも次の 4 点は崩さない方がよいです。

1. tooltip は非インタラクティブな短文補足に限定すること。
2. 開閉は hover / focus 起点の内部状態として維持すること。
3. `aria-describedby` の付与と除去を trigger へ正しく反映すること。
4. 表示レイヤを body 配下へ出したうえで、viewport と transform 変化に追従させること。

---

## 15. 現行実装で未対応の事項

本節は、現行の `tooltip.ts` および `tooltip.stories.ts` を基準として、**将来拡張としては考え得るが、現時点では公開契約に含めない事項**と、**本書で確定した契約に対する既知差分**を整理するものです。

### 15.1 開閉の外部制御

現行実装には `open` property、`show()`、`hide()` のような imperative API はありません。tooltip の表示可否は hover / focus に固定されています。

### 15.2 リッチコンテンツ / インタラクティブコンテンツ

tooltip 内容は `text` によるプレーンテキストのみです。slot による HTML、リンク、ボタン、フォーム要素の埋め込みには未対応です。

### 15.3 タッチ専用起動契約

現行実装は hover / focus / Escape を前提としており、long press、tap-to-toggle、モバイル専用 dismiss gesture などのタッチ特化契約は持ちません。

### 15.4 矢印表示

tooltip arrow は現行契約に含みません。placement は panel 本体の side と offset で表現し、矢印の有無や形状は未対応です。

### 15.5 外部スタイルの詳細制御

panel は body 配下に生成され、`::part(...)` も公開していません。そのため、surface 形状や hit area の詳細を component API として外部制御する契約は未対応です。

### 15.6 現行契約に未追随の実装差分

次の事項は、将来拡張の未対応という意味ではなく、**本書で確定した契約に対して現行 **``** がまだ追随していない差分**です。

- `offset` は契約上「非有限値は `8`、負の有限値は `0` に clamp」としていますが、現行実装は非有限値しか正規化しておらず、負の有限値を clamp していません。
- panel 生成と document style 注入は契約上 `ownerDocument` 基準としていますが、現行実装は top-level `document.head` / `document.body` を直接参照しています。
- trigger identity が non-null の別要素へ差し替わった場合、契約上は一旦 close し、旧 trigger から `aria-describedby` 追加分を除去する必要がありますが、現行実装はその close と cleanup を明示的には行っていません。

したがって、これら 3 点は**契約書上の理想像ではなく、実装修正の対象として追跡すべき既知差分**です。実装と Storybook を契約へ一致させる際は、本節ではなく前掲の「`tooltip.ts` / `tooltip.stories.ts` の修正方針」を正とします。

### 15.7 現行 Storybook が未固定の契約差分

現行 `tooltip.stories.ts` は、hover / focus open、`aria-describedby` の付与・除去、variant 差分、disabled、transform zoom、reconnect、dark mode、media / style 契約、tree-item 統合までは確認しています。

一方で、次の契約は**Story 名としてはまだ存在せず、現行 Storybook では未固定**です。

- 負の `offset` clamp
- 既存 `aria-describedby` token の順序保持
- open 中 suppress
- pending timer 中の delay 変更非遡及
- trigger replacement close
- 先頭 trigger のみ有効であること
- trigger 子孫要素 interaction
- hover-only 状態に対する `Escape` 非保証
- `ownerDocument` 契約
- plain prose 正規化
- accessible name 必須境界
- 後から開いた tooltip の前面表示

これらは「機能が存在しない」のではなく、**契約として Storybook 上でまだ固定し切れていない**項目です。したがって、将来の回帰を防ぐには、前掲の Storybook 契約表に対応する Story を追加する必要があります。

### 15.8 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、実装、Storybook、契約書の 3 点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。
