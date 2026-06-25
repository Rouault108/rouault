# Tooltip

## 1. 文書の目的

本書は、`ui-tooltip`の公開契約、状態モデル、アクセシビリティ、視覚契約、およびStorybook上の検証方針を定義するものです。

`ui-tooltip`は、**本文やUI要素の意味を補足するための非インタラクティブな短文ヒント**を提示するコンポーネントです。単に小さな浮遊レイヤを描画するのではなく、**どの要素をtriggerとして扱うか**、**いつ開閉するか**、**どのタイミングで説明関係を付与するか**、**表示レイヤをどの座標系に置くか**を公開契約として固定します。

Rouaultにおけるtooltipは読書の主役ではありません。本文やラベルを読み進める流れを壊さず、**必要なときだけ静かに補足し、不要になれば速やかに退くこと**が求められます。したがって、本コンポーネントの契約は、説明補助と、**「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 2. 適用範囲

本書は、`ui-tooltip`の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook契約
- 実装修正方針
- 現行実装で未対応の事項

一方、本書は次の事項を扱いません。

- HTMLやリッチコンテンツを含む説明ポップアップ
- ボタン、リンク、入力欄などを含むインタラクティブなoverlay
- clickで固定表示されるhelp popupやpopover
- 長文ヘルプ、操作手順、チュートリアル表示
- 画面単位でのヘルプ戦略や文言設計全体
- trigger側コンポーネントのtruncate判定や説明文生成
- trigger側要素のoverflow measurementと、それに基づく自動的な`disabled`切り替え
- `hover + focus`以外の起動モードを切り替えるための公開API
- `aria-describedby`の結合方式を切り替えるための公開API
- `open` propertyや`show()` / `hide()`などの外部制御API
- long pressやtap-to-toggleなどのタッチ専用起動
- arrow表示
- collision policyの細かな外部制御

truncate時のみtooltipを有効化したい場合は、上位レイヤまたは別utilityがoverflow判定と`disabled`制御を担います。`ui-tooltip`本体はその判定責務を持たず、与えられたtriggerと文言を説明補助として提示することに限定します。

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 3. 設計原則

`ui-tooltip`の設計は、次の原則に従います。

1. **tooltipは非インタラクティブな短文補足に限定すること。**
2. **開閉はhover / focus起点の内部状態として扱うこと。**
3. **`aria-describedby`の付与と除去をtriggerに対して正しく反映すること。**
4. **表示レイヤをtriggerから分離しつつ、位置追従と可読性を維持すること。**
5. **外部制御や過剰な自由度を安易に持ち込まず、責務を狭く保つこと。**

---

## 4. 公開契約

`ui-tooltip`は、`text`、`variant`、`size`、`placement`、`offset`、`openDelay`、`closeDelay`、`disabled`を公開入力として扱います。スロットは既定スロットのみを持ち、**最初に割り当てられた単一の`HTMLElement`をtrigger** として扱います。

tooltip内容は`text`による**プレーンテキスト入力**のみを受け付けます。HTMLは解釈せず、内部的にも`textContent`として扱います。したがって、強調、リンク、任意マークアップをtooltip内容の公開契約には含めません。

`text`は **plain prose** として扱います。先頭末尾空白は空判定にのみ用い、表示時の改行や連続空白は通常の折り返し規則に従って視覚的に正規化されます。tooltipは短文補足を対象とし、長文説明の収容を目的としません。

`variant`の既定値は`default`、`size`の既定値は`md`、`placement`の既定値は`top`、`offset`の既定値は`8`、`openDelay`と`closeDelay`の既定値はいずれも`0`、`disabled`の既定値は`false`です。

`ui-tooltip`の開閉は公開propertyでは制御しません。**hoverまたはfocusを起点とした内部状態**としてのみ開閉します。したがって、利用者は`open`のような外部制御面を期待してはなりません（MUST NOT）。

### 4.1 入力契約

| 名前         | 種別                                 | 必須   | 内容                          | 契約                                                                                                                                                    |
| ------------ | ------------------------------------ | ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`       | property / attribute                 | いいえ | tooltip文言                  | 空白のみを含む場合はtooltipを表示しません                                                                                                             |
| `variant`    | property / attribute                 | いいえ | 視覚バリアント                | `default` / `subtle` / `inverse`                                                                                                                        |
| `size`       | property / attribute                 | いいえ | 可読幅の等級                  | `sm` / `md` / `lg`。既定値は`md`とし、具体的な最大幅値は内部設計値で管理します                                                                        |
| `placement`  | property / attribute                 | いいえ | 基本配置                      | `top` / `top-start` / `top-end` / `bottom` / `bottom-start` / `bottom-end` / `left` / `left-start` / `left-end` / `right` / `right-start` / `right-end` |
| `offset`     | property / attribute                 | いいえ | triggerとtooltipの基本距離 | 既定値は`8`。0以上の有限数を受理します                                                                                                                |
| `openDelay`  | property / attribute (`open-delay`)  | いいえ | 表示遅延                      | ミリ秒単位。非負の有限数として扱います                                                                                                                  |
| `closeDelay` | property / attribute (`close-delay`) | いいえ | 非表示遅延                    | ミリ秒単位。非負の有限数として扱います                                                                                                                  |
| `disabled`   | property / attribute                 | いいえ | tooltip抑止                  | `true`の場合は開きません                                                                                                                               |

### 4.2 スロット契約

| 名前         | 種別 | 位置づけ | 内容                                          |
| ------------ | ---- | -------- | --------------------------------------------- |
| 既定スロット | slot | 正規入力 | tooltipを紐づけるtrigger要素を受け取ります |

既定スロットはtrigger要素を受け取ります。`ui-tooltip`は、`slot.assignedElements({ flatten: true })[0]`を優先し、存在しない場合のみ`firstElementChild`をfallbackとして扱います。したがって、**正規入力は1個の`HTMLElement`** です。

triggerはhoverとfocusの双方を受け取る要素であることを前提とします。`disabled`なネイティブform controlのように、focusやpointer interactionを安定して受け取れない要素を直接triggerとする構成は、公開契約としてサポートしません。必要な場合は、その外側のwrapper要素をtriggerとします。

複数要素を与えた場合でも、契約上triggerとして扱うのは最初の要素のみです。2個目以降の要素にhover / focusリスナーが付与されることは保証しません。

また、triggerとして採用された先頭要素の**子孫要素上で発生したpointer / focus interactionも、trigger interactionの一部**として扱います。したがって、trigger内にiconやtext spanなどの内部要素が存在しても、契約上のinteraction領域はtrigger要素全体です。

### 4.3 公開メソッド

`ui-tooltip`は開閉や再配置に関する公開メソッドを持ちません。利用者はhover / focusを通じて利用します。

### 4.4 公開イベント

`ui-tooltip`は独自の公開カスタムイベントを契約として持ちません。tooltipの表示可否は内部状態であり、利用者は独自の`open` / `close`イベントやdetail payloadに依存してはなりません（MUST NOT）。

### 4.5 属性反映契約

| property     | attribute     | reflect | 備考                                                                                  |
| ------------ | ------------- | ------- | ------------------------------------------------------------------------------------- |
| `text`       | `text`        | なし    | HTML属性からは与えられますが、property変更がattributeに反映される保証はありません |
| `variant`    | `variant`     | あり    | 列挙外値は`default`に正規化します                                                   |
| `size`       | `size`        | あり    | 列挙外値は`md`に正規化します                                                        |
| `placement`  | `placement`   | あり    | 列挙外値は`top`に正規化します                                                       |
| `offset`     | `offset`      | あり    | 非有限値は`8`に正規化します                                                         |
| `openDelay`  | `open-delay`  | あり    | 非有限値または負値は`0`に正規化します                                               |
| `closeDelay` | `close-delay` | あり    | 非有限値または負値は`0`に正規化します                                               |
| `disabled`   | `disabled`    | あり    | boolean attributeとして扱います                                                      |

### 4.6 無効値の扱い

`variant`、`size`、`placement`は列挙値を公開契約とします。列挙外値はそれぞれ`default`、`md`、`top`に正規化します。

`offset`は0以上の有限数を受理し、非有限値は`8`に正規化します。負の有限値は`0`にclampします。

`offset`は **希望gap** を表します。collision回避やviewport保護が優先されるため、最終表示位置で厳密に同一gapとなることまでは保証しません。

`openDelay`と`closeDelay`は、非有限値または負値を`0`に正規化します。

### 4.7 責務範囲

責務範囲には、triggerへのhover / focus監視、tooltipレイヤの生成と破棄、`aria-describedby`の動的付与と除去、viewport内に収めるための再配置、hover維持のためのhit area生成、および環境別スタイルの適用を含みます。

一方で、tooltip文言の生成、長さ判定や省略判定、タッチ専用UX、リッチコンテンツ表示、永続表示、開閉状態の外部制御は責務に含めません。

---

## 5. 状態モデル

`ui-tooltip`の主要状態は、見た目の種別ではなく、**説明文が利用可能か、triggerが存在するか、開状態を支えるinteraction sourceが存在するか、遅延中か、表示抑止状態か**によって定義します。

開状態は、`trigger-hover`、`tooltip-hover`、`trigger-focus`の3種のsource集合で定義します。**source集合が非空であればopen、空であればclose** です。delayはこの状態遷移に付随するschedulerとして扱います。

### 5.1 基本状態

最小状態は、`text`に空でない文言を持ち、`variant="default"`、`size="md"`、`placement="top"`、`offset=8`、`openDelay=0`、`closeDelay=0`、`disabled=false`の状態です。この状態ではtriggerへのhoverまたはfocusによりtooltipを表示できます。

### 5.2 開状態

tooltipは、trigger上で`mouseenter`または`focusin`が発生し、source集合が非空になったときに開きます。開いたtooltipは`ownerDocument.body`配下に生成され、表示中はtriggerに`aria-describedby`を付与します。

### 5.3 閉状態

tooltipは、triggerとtooltipの双方からpointerが外れ、かつtrigger内focusも失われたときに閉じます。閉じるとtooltip panelは**非表示のまま残るのではなく破棄**され、`aria-describedby`から自身のidも除去されます。

### 5.4 Hover 維持状態

tooltipは、triggerからtooltip自体へpointerを移した場合も表示を維持します。これはtooltip本体に加えてtrigger側へ向けたhit areaを持つことで成立します。したがって、**triggerとtooltipのあいだをまたぐpointer移動**は即時closeの条件ではありません。

### 5.5 遅延状態

`openDelay`が正値の場合、tooltipはhover / focus直後には表示されず、指定時間の経過後に開きます。`closeDelay`が正値の場合、close条件成立後も指定時間は表示を維持し、その後に閉じます。

開待ち中にclose条件へ移った場合はopen timerを取り消します。逆に、close待ち中に再びhover / focus条件へ戻った場合はclose timerを取り消します。

なお、timer待機中に`openDelay`または`closeDelay`が変更されても、**既に開始済みのtimerへは遡及適用しません**。変更後の値は、次に新しくscheduleされるopen / closeから適用します。

また、複数tooltipを連続的に探索する文脈では、**個別instanceの`openDelay`を壊さないopt-inの共有遅延文脈**を導入しても構いません。この協調は、初回openでは各instanceの既定delayを尊重しつつ、同一文脈内で後続tooltipのopenを短いdelay、またはdelayなしにできる範囲に限定します。

この共有遅延文脈はtooltipの説明補助という責務を拡張せず、複数tooltip間の探索体験だけを改善するための補助契約として扱います。

### 5.6 抑止状態

次のいずれかに該当する場合、tooltipは表示されません。

- `disabled=true`
- `text.trim()`が空文字
- trigger要素が存在しない

これらの条件が表示中に成立した場合、tooltipは閉じて破棄されます。

### 5.7 Escape による閉状態

tooltip表示中に **trigger subtreeにfocusが存在する状態で** `Escape`キー入力が到達した場合、tooltipは閉じます。このcloseはsource集合を空にし、待機中timerも破棄します。hoverのみで開いている状態に対する`Escape` closeは保証対象に含めません。

### 5.8 配置調整状態

tooltipの開位置は`placement`を起点としますが、実際の表示位置はviewportからのはみ出しを避けるために補正されます。したがって、指定した`placement`は**希望配置**であり、最終表示位置は`flip`と`shift`により変化し得ます。

`placement`の`start` / `end`を含む指定は、希望する整列方向を表しますが、collision回避後の最終座標そのものは公開契約に含めません。

---

## 6. DOM / Accessibility

ルートは`:host`です。Shadow DOM内にはslotだけを持ち、可視panelはopen時に **hostと同じ`ownerDocument`のbody** 直下へ動的生成します。

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

- tooltip panel自体は`role="tooltip"`を持ちます。
- tooltip panelは`aria-hidden`により開状態を反映します。生成直後は`"true"`、表示中は`"false"`です。ただしclose後は非表示のまま保持されるのではなく、panel自体が破棄されます。
- 表示中のみ、triggerに`aria-describedby`を動的付与します。
- triggerが既に`aria-describedby`を持つ場合も、その値と順序を保持したままtooltip idを末尾へ追加します。
- close、suppress、disconnect、trigger replacementのいずれでも、既存tokenを壊さずにtooltip自身のidのみを除去します。
- tooltip内容はプレーンテキストであり、対話要素を含みません。
- tooltip panel自体にfocusを受ける契約はありません。
- キーボード利用時にtooltipを発見可能にするには、trigger側がfocus可能でなければなりません（MUST）。

本コンポーネントで重要なのは、**tooltipが独立した対話面ではなく、triggerを説明する補助面であること**です。したがって、dialogやmenuのようなfocus管理、roving tabindex、内部アクション群は持ち込みません。

また、tooltipは **accessible nameの代替ではなく、補助的なdescription** です。icon-only triggerなど、単体では意味が確定しないtriggerは、tooltipの有無に依存せず、`aria-label`などにより**trigger自身が可読な名前を持つ必要があります**（MUST）。

---

## 7. Visual Contract

`ui-tooltip`の視覚契約は、**本文やtriggerより一段控えめな補足情報を、可読性を保ったまま短時間提示すること**にあります。

### 7.1 情報順位

- `default`は標準的な補足提示です。
- `subtle`はさらに控えめな背景と影で、補足性を強めます。
- `inverse`は暗い面と明るい文字で、暗背景や高コントラスト文脈でも区別しやすくします。

tooltipは情報の主役ではありません。本文、見出し、リスト、注釈の読書順序を奪わない強度に保ちます。常時表示、強い発光、派手な移動アニメーション、過大な面積拡張には依存しません。

### 7.2 レイアウト

ルートの`:host`は`inline-flex`です。tooltip panel自体は`position: fixed`でdocument座標系に置かれます。最大幅は可読な短文補足を保てる範囲に制限し、狭いviewportでも左右に余白を残します。

tooltipの可読幅は`size`により`sm` / `md` / `lg`の等級で選択できます。`size`は任意のピクセル値ではなく、**短文補足の可読性を段階的に調整するための列挙値**です。具体的な最大幅は設計トークンまたは内部設計値で管理し、利用者が任意値を直接注入する契約は持ちません。

tooltip surfaceは小さな余白、角丸、境界線、影を持ちます。文字は`text-xs`相当のサイズ、`font-medium`相当の太さで表示します。`white-space: normal`と`overflow-wrap: anywhere`を用い、長い語でも折り返します。

### 7.3 視覚仕様

- panelはopen時のみ可視になり、opacityとtranslateYによる短い遷移を行います。
- panelは`z-popover`層に載り、通常の本文やcardより上に表示されます。
- pointerを維持するため、panelには`pointer-events: auto`を持たせます。
- trigger側へ向かう透明なhit areaを持ち、視覚gapをhover gapにしません。
- 矢印は持ちません。
- 実際のsideは内部状態に反映され、hit areaの向きもそれに従います。
- 後から開いたtooltipは、同じ`z-popover`層内で先に開いたtooltipより前面に表示されます。

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

tooltip panelはhostのShadow DOM内ではなくdocument body配下に生成されます。したがって、テーマトークンは **body / documentまで到達するスコープ**で定義されていることが推奨されます。hostローカルだけで定義したCSS custom propertiesに依存する設計では、tooltip panelに値が届かない可能性があります。

---

## 8. 環境別の振る舞い

### 8.1 Reduced Motion

`prefers-reduced-motion: reduce`環境では、tooltipのtransition時間を実質0にします。開閉は成立させつつ、視覚移動の強調を避けます。

### 8.2 Forced Colors

`forced-colors: active`環境では、system colorを優先し、box-shadowを除去します。tooltipは独自色による識別ではなく、システムの可視性規則に従います。

### 8.3 Print

`@media print`ではtooltip panelを非表示にします。印刷対象として意味を持つのはtriggerや本文であり、一時的overlayであるtooltip内容は印刷に含めません。

### 8.4 Resize / Scroll / Transform Zoom

tooltipは`autoUpdate`により、resize、scroll、layout change、transform zoomに追従します。したがって、表示中にtrigger位置が変化しても、tooltipは再計算され、**基本gapを維持しつつ追従**します。

---

## 9. 関連契約

### 9.1 Trigger 契約

`ui-tooltip`はtrigger自体を生成しません。triggerは利用側が既定スロットへ与えます。

- keyboardで利用する場合、triggerはfocus可能でなければなりません。
- tooltipはtriggerのhover / focusを監視します。
- clickはtooltipの正規起動契約に含みません。
- trigger identityが差し替わった場合、それはclose条件です。旧triggerとの説明関係を解除したうえで一旦閉じ、再hover / refocusによってのみ新triggerで再openします。

### 9.2 位置決め契約

tooltipの位置決めは`floating-ui`による`computePosition(..., { strategy: 'fixed' })`を基準とし、次のmiddlewareを用います。

- `offset(offset)`
- `flip({ padding: 8 })`
- `shift({ padding: 8 })`

これにより、tooltipは希望配置を基準にしつつ、viewport端で裏返りや寄せを行います。利用者は絶対的なside固定ではなく、**読みやすさ優先の適応配置**として扱います。

### 9.3 スタイル注入契約

tooltip用のdocument CSSは`ui-tooltip-document-styles`というidを持つ`<style>`として、**hostと同じ`ownerDocument`のhead** に1回だけ注入されます。複数instanceがあっても重複注入しません。

### 9.4 多重表示契約

`ui-tooltip`はinstanceごとに独立して開閉します。**あるtooltipが開いたことを理由に、他のtooltipを自動的に閉じるglobal singleton契約は持ちません。** したがって、画面上の複数tooltipが条件を満たした場合、同時に複数のpanelが存在し得ます。

### 9.5 ライフサイクル cleanup 契約

componentがDOMから切り離される際は、待機中timer、位置追従処理、trigger listener、tooltip panel、`aria-describedby`への追加分を**すべて解放または除去**しなければなりません。これは実装上の最適化ではなく、再接続安全性とメモリ安全性のための契約です。

### 9.6 スタイル拡張契約

`ui-tooltip`は`::part(...)`を公開しません。panelはShadow DOM外に生成されるため、内部classや`data-ui-*`属性は公開拡張面として扱いません。利用者向けの拡張面は、**CSS Custom Propertiesによるトークン差し替え**を基本とします。内部セレクタ構造への依存は将来変更に弱いため、推奨しません。

また、`data-tooltip-id`、`data-ui-tooltip-content`、`data-ui-tooltip-surface`、`data-ui-tooltip-hit-area`などの内部属性や、body直下のDOM構造は**公開契約ではありません**。これらは内部実装およびStorybook検査の都合で存在し得ますが、利用側の拡張点としては扱わないでください。

### 9.7 統合契約

`ui-tooltip`は、trigger側コンポーネントが必要に応じて`disabled`を切り替えることで、truncate時のみ補助説明を出す用途にも利用できます。tooltip自体はtruncate判定を持たず、表示要否の判断は上位コンポーネント側の責務です。

overflow measurementやtruncate判定を簡略化する補助hook / utilityを別に設計することはできますが、それは`ui-tooltip`本体の公開契約には含めません。`ui-tooltip`自体は、与えられたtrigger、文言、delay、配置、可読幅等級を用いて説明補助を提示することに限定します。

---

## 10. 境界条件

### 10.1 空文字または空白のみの `text`

`text.trim()`が空の場合、tooltip panelを生成してはなりません。hover / focusが発生しても開きません。

### 10.2 Trigger 不在

既定スロットにHTMLElementが存在しない場合、tooltipは開きません。

### 10.3 複数 trigger 候補

複数要素がslotに割り当てられていても、契約上triggerとして扱うのは先頭要素のみです。後続要素は非対応です。

### 10.4 `disabled=true`

`disabled`のtooltipはpanelを生成してはなりません。既に開いている場合も閉じて破棄されます。

### 10.5 無効属性値

- 無効な`variant`は`default`に正規化します。
- 無効な`placement`は`top`に正規化します。
- 非有限の`offset`は`8`に正規化し、負の有限値は`0`にclampします。
- 負値または非有限の`openDelay` / `closeDelay`は`0`に正規化します。

### 10.6 Trigger から panel への pointer 移動

triggerからpanelへpointerを移してもcloseしてはなりません。hover維持が必要です。

### 10.7 Panel から外部への pointer 離脱

panelから外部へpointerが離れた場合、close条件を満たせばpanelは破棄される必要があります。

### 10.8 Escape

tooltip表示中にtrigger subtreeにfocusが存在する状態で`Escape`が到達した場合、panelは破棄され、`aria-describedby`から自身のidが除去される必要があります。hoverのみで開いている状態に対する`Escape` closeは保証対象に含めません。

### 10.9 再接続

componentがDOMから取り外される際は、待機中timer、位置追従処理、trigger listener、tooltip panel、`aria-describedby`への追加分が正しくcleanupされる必要があります。再び接続された後も、tooltipは再度開ける必要があります。listenerと内部状態は再接続後に再同期されなければなりません。

### 10.10 表示中のプロパティ変更

tooltip表示中に`text`、`variant`、`placement`、`offset`が変更された場合、panel内容または位置は新しい値へ追従する必要があります。

### 10.11 Trigger 差し替え

open中にtrigger identityが変化した場合、tooltipは一旦閉じる必要があります。旧triggerへの`aria-describedby`追加分は除去され、新triggerでは新しいhover / focusが成立した場合にのみ再openします。

### 10.12 Document 境界

tooltip panelとdocument styleは、hostと同じ`ownerDocument`の`body` / `head`に対して生成・注入される必要があります。top-level `document`固定の実装詳細に利用者は依存してはなりません。

### 10.13 複数 instance の同時表示

別々のtriggerに紐づく複数の`ui-tooltip`が同時に開条件を満たした場合でも、他instanceを自動closeしないことを前提とします。少なくとも、global singleton化を前提とする利用契約は採用しません。

---

## 11. Storybook 契約

各Storyは契約確認のための**現行の検査実装**として扱います。ここで固定したいのはStory名そのものではなく、各Storyが担う契約確認点です。したがって、Storyの分割・統合・改名は許容しますが、下表の確認論点は同等以上の粒度で維持しなければなりません。

| Story                                 | 固定する契約                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DefaultInfoIcon`                     | 初期状態でpanelを生成しないこと、hover / focusで開くこと、表示中のみ`aria-describedby`を付与すること、triggerが単体で名前を持つこと、focus起因のEscapeで閉じること                                                                      |
| `VariantStateMatrix`                  | `default` / `subtle` / `inverse`の3 variantが存在すること、`disabled`では開かないこと、無効variantが`default`に正規化されること、複数instanceが互いを自動closeしないこと、後から開いたpanelが前面に来ること                        |
| `TransformZoomContract`               | transform zoom後もtriggerとtooltipのgapが実質維持されること                                                                                                                                                                               |
| `BoundaryConditions`                  | 空textでは開かないこと、無効`variant` / `placement` / `offset` / `openDelay` / `closeDelay`が正規化されること、負の`offset`が`0`にclampされること、trigger不在でも破綻しないこと、切断時cleanupが成立すること、再接続後も開けること |
| `AriaDescribedByPreservationContract` | 既存`aria-describedby` tokenの順序を保持したままtooltip idを末尾追加すること、close / suppress / trigger replacement時にtooltip idのみを除去すること                                                                                      |
| `LiveSuppressionContract`             | open中に`disabled=true`または`text.trim()===''`になった場合、panelが破棄され、`aria-describedby`追加分も除去されること                                                                                                                    |
| `DelayReschedulingBoundary`           | `openDelay` / `closeDelay`の変更が、既に開始済みtimerへ遡及適用されず、次回scheduleからのみ有効になること                                                                                                                                   |
| `TriggerReplacementContract`          | open中にtrigger identityが差し替わった場合、一旦closeし、旧triggerから説明関係が除去されること                                                                                                                                            |
| `FirstTriggerOnlyBoundary`            | 複数slotted要素が存在する場合、先頭要素のみがtriggerとして扱われること                                                                                                                                                                       |
| `DescendantInteractionContract`       | triggerの子孫要素上のhover / focusでもopenすること                                                                                                                                                                                          |
| `FocusScopedEscapeContract`           | trigger subtreeにfocusがある場合の`Escape` closeを保証し、hover-only状態に対する`Escape` closeを保証対象に含めないこと                                                                                                                   |
| `OwnerDocumentContract`               | panelとdocument styleがhostと同じ`ownerDocument`に対して生成・注入されること                                                                                                                                                              |
| `PlainProseNormalizationContract`     | `text`がHTMLとして解釈されず、plain proseとして表示されること                                                                                                                                                                                |
| `AccessibleNameRequiredBoundary`      | icon-only triggerがtooltipに依存せず、自前で可読な名前を持つこと                                                                                                                                                                              |
| `DarkModeContract`                    | dark背景上でも`default`と`inverse`が視覚的に区別でき、`z-popover`とshadowが維持されること                                                                                                                                                |
| `VisualModeContracts`                 | document styleが注入されること、Reduced Motion / Forced Colors / Printの定義を含むこと、初期状態でpanelを生成しないこと                                                                                                                      |
| `TreeItemIntegrationContract`         | 上位コンポーネントが`disabled`を切り替えることで、長いラベル時のみtooltipを有効化できること                                                                                                                                                  |

### 11.1 運用方針

Story名は現時点の便宜的な識別子です。将来の再編成で変更して構いませんが、A11y、state、boundary、integrationの確認論点が失われないことを優先します。複数の論点を1つのStoryに過密に詰め込むのではなく、契約確認点の独立性が保てる粒度で維持します。

また、play関数では公開契約の確認を優先し、内部DOM構造や`data-ui-*`属性への依存は必要最小限に留めます。内部属性を参照する場合も、それは公開拡張面ではなく、**Storybook上の検査補助**としてのみ扱います。

---

## 12. `tooltip.ts` / `tooltip.stories.ts` の修正方針

本節は、確定した契約に現行実装とStorybookを追随させるための修正方針を固定するものです。現時点では、**契約に対してStoryが不足している箇所**と、**契約に対して実装自体が未追随の箇所**が混在しています。

### 12.1 実装修正が必要な事項

| 対象                             | 現状                                                                                                                  | 修正方針                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `tooltip.ts`の`offset`正規化  | 非有限値は`8`に正規化しているが、負の有限値をclampしていない                                                      | `willUpdate()`と`_resolvedOffset`の双方で`toNonNegativeFiniteNumber(this.offset, DEFAULT_OFFSET)`を用い、負値を`0`にclampする |
| `tooltip.ts`のdocument参照    | style注入とpanel生成がtop-level `document.head` / `document.body`前提になっている                                | `this.ownerDocument`を基準にstyle注入とpanel生成を行い、`ownerDocument`単位で完結させる                                          |
| `tooltip.ts`のtrigger差し替え | triggerが`null`になった場合はcloseするが、open中のtrigger identity変化を明示的close条件としては扱っていない | `_syncTriggerElement()`で旧triggerと新triggerが異なる場合、open中なら説明関係を解除したうえで一旦closeする                     |

### 12.2 Story 追加・修正が必要な事項

| 対象                 | 現状                                                                    | 修正方針                                                                                                 |
| -------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `BoundaryConditions` | `offset="NaN"`は見ているが、負の`offset` clampは未検証               | 負の`offset`例を追加し、`host.offset === 0`を確認する                                                 |
| `BoundaryConditions` | reconnectは見ているが、trigger差し替えは未検証                        | `TriggerReplacementContract`を追加し、open中にtriggerを差し替えたらcloseすることを確認する         |
| `DefaultInfoIcon`    | `aria-describedby`の追加 / 除去は見るが、既存tokenの順序保持は未検証 | `AriaDescribedByPreservationContract`を追加し、既存tokenが壊れないことを確認する                      |
| delay系Story       | invalid値正規化は見るが、pending timer中のprop変更は未検証          | `DelayReschedulingBoundary`を追加し、既存timerへ遡及しないことを確認する                              |
| suppress系Story    | 初期suppressは見るが、open中suppressは未検証                       | `LiveSuppressionContract`を追加し、open中`disabled` / 空text化でcloseすることを確認する           |
| trigger境界         | 複数slotted要素や子孫interactionを未検証                            | `FirstTriggerOnlyBoundary`と`DescendantInteractionContract`を追加する                                 |
| Escape境界          | focus起因のEscape closeは見るが、hover-only非保証は未検証           | `FocusScopedEscapeContract`を追加する                                                                   |
| ownerDocument        | `document.getElementById(...)`を直接見ている                           | `host.ownerDocument.getElementById(...)`を使うようにStoryを修正し、`OwnerDocumentContract`を追加する |
| prose契約           | plain proseの非HTML解釈を未検証                                      | `PlainProseNormalizationContract`を追加する                                                             |
| accessible name      | 正例はあるが、境界Storyがない                                         | `AccessibleNameRequiredBoundary`を追加する                                                              |

### 12.3 修正優先順位

1. **契約と実装の不整合を解消する修正**\
   `offset` clamp、`ownerDocument`対応
2. **A11yと状態遷移の破壊を防ぐStory追加**\
   `AriaDescribedByPreservationContract`、`LiveSuppressionContract`、`TriggerReplacementContract`、`DelayReschedulingBoundary`
3. **境界契約の明確化**\
   `FirstTriggerOnlyBoundary`、`DescendantInteractionContract`、`FocusScopedEscapeContract`、`PlainProseNormalizationContract`、`AccessibleNameRequiredBoundary`

### 12.4 運用上の注意

`tooltip.stories.ts`のplay関数は、実装内部を過度に白箱化してはなりません。`data-ui-*`やbody直下構造を参照する場合でも、それはtooltipの公開APIではなく、**検査補助のための最小限の観測点**として扱います。

逆に、`ownerDocument`、`aria-describedby`、open / close、disabled suppress、reconnectのような契約は、将来の内部実装が変わっても維持されるべきであり、Story側で継続的に固定します。

---

## 13. 補足

`ui-tooltip`の要点は、浮遊要素を描画すること自体ではありません。**triggerの意味を補足する説明関係を、必要な瞬間だけ成立させ、読書の流れを止めずに退くこと**にあります。

したがって、今後の変更でも次の4点は崩さない方がよいです。

1. tooltipは非インタラクティブな短文補足に限定すること。
2. 開閉はhover / focus起点の内部状態として維持すること。
3. `aria-describedby`の付与と除去をtriggerへ正しく反映すること。
4. 表示レイヤをbody配下へ出したうえで、viewportとtransform変化に追従させること。

---

## 14. 現行実装で未対応の事項

本節は、現行の`tooltip.ts`および`tooltip.stories.ts`を基準とした**非規範的な実装スナップショット**です。公開契約そのものは4〜11章を正とし、本節は未対応事項、既知差分、移行上の注意の整理にのみ用います。将来拡張候補の採否や公開契約の確定は、本節ではなく本文側で扱います。

### 14.1 開閉の外部制御

現行実装には`open` property、`show()`、`hide()`のようなimperative APIはありません。tooltipの表示可否はhover / focusに固定されています。

### 14.2 リッチコンテンツ / インタラクティブコンテンツ

tooltip内容は`text`によるプレーンテキストのみです。slotによるHTML、リンク、ボタン、フォーム要素の埋め込みには未対応です。

### 14.3 タッチ専用起動契約

現行実装はhover / focus / Escapeを前提としており、long press、tap-to-toggle、モバイル専用dismiss gestureなどのタッチ特化契約は持ちません。

### 14.4 矢印表示

tooltip arrowは現行契約に含みません。placementはpanel本体のsideとoffsetで表現し、矢印の有無や形状は未対応です。

### 14.5 外部スタイルの詳細制御

panelはbody配下に生成され、`::part(...)`も公開していません。そのため、surface形状やhit areaの詳細をcomponent APIとして外部制御する契約は未対応です。

### 14.6 現行契約に未追随の実装差分

次の事項は、将来拡張の未対応という意味ではなく、**本書で確定した契約に対して現行`tooltip.ts`がまだ追随していない差分**です。

- `offset`は契約上「非有限値は`8`、負の有限値は`0`にclamp」としていますが、現行実装は非有限値しか正規化しておらず、負の有限値をclampしていません。
- panel生成とdocument style注入は契約上`ownerDocument`基準としていますが、現行実装はtop-level `document.head` / `document.body`を直接参照しています。
- trigger identityがnon-nullの別要素へ差し替わった場合、契約上は一旦closeし、旧triggerから`aria-describedby`追加分を除去する必要がありますが、現行実装はそのcloseとcleanupを明示的には行っていません。

したがって、これら3点は**契約書上の理想像ではなく、実装修正の対象として追跡すべき既知差分**です。実装とStorybookを契約へ一致させる際は、本節ではなく前掲の「`tooltip.ts` / `tooltip.stories.ts`の修正方針」を正とします。

### 14.7 現行 Storybook が未固定の契約差分

現行`tooltip.stories.ts`は、hover / focus open、`aria-describedby`の付与・除去、variant差分、disabled、transform zoom、reconnect、dark mode、media / style契約、tree-item統合までは確認しています。

一方で、次の契約は**Story名としてはまだ存在せず、現行Storybookでは未固定**です。

- 負の`offset` clamp
- 既存`aria-describedby` tokenの順序保持
- open中suppress
- pending timer中のdelay変更非遡及
- trigger replacement close
- 先頭triggerのみ有効であること
- trigger子孫要素interaction
- hover-only状態に対する`Escape`非保証
- `ownerDocument`契約
- plain prose正規化
- accessible name必須境界
- 後から開いたtooltipの前面表示

これらは「機能が存在しない」のではなく、**契約としてStorybook上でまだ固定し切れていない**項目です。したがって、将来の回帰を防ぐには、前掲のStorybook契約表に対応するStoryを追加する必要があります。

### 14.8 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、実装、Storybook、契約書の3点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。
