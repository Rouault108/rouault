# Tabs

## 概要

本書は、`ui-tabs`の公開契約、状態モデル、アクセシビリティ、および視覚契約を整理するものです。

`ui-tabs`は、同一コンテキスト内で相互排他的なビュー（パネル）を切り替えるコンポーネントです。単に見た目のタブ列を描画するのではなく、**どの値を選択状態として解決するか**、**フォーカス移動と選択確定をどのように分離するか**、**URL・見出し・履歴とどのように同期するか**を公開契約として固定します。

また、本コンポーネントはWAI-ARIA Tabsパターンに準拠するため、`role="tablist"`、`role="tab"`、`role="tabpanel"`、Roving Tabindex、`aria-controls` / `aria-labelledby`の対応関係を、実装詳細ではなく**継続的に維持される契約面**として扱います。

Rouaultにおけるtabsは、複数の情報面を高密度に並置するための装置ではなく、**読書の流れを保ったまま関心の切り替えを行うための静かな切替面**であることを求めます。したがって、本コンポーネントの契約は、切替可能性の明示と、**「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

## static-first 境界

`ui-tabs`はstateful allowlist componentとして維持します。選択状態、Roving Tabindex、ARIA同期、keyboard操作、indicator、内部Shadow DOM CSSはcomponentが所有し、static component CSSや`note-static-surface-enhancer`へ移しません。

note SSRではhostと公開Light DOMのtab / panel fallbackを保持します。hostと公開Light DOM子孫はnote static output検査対象ですが、内部Shadow DOMとdeclarative shadowroot templateはnon-allowlisted Custom Element検査から除外します。

---

## 適用範囲

本書は、`ui-tabs`の次の事項を対象とします。

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

- タブ内コンテンツそのものの生成
- 各パネルで何を表示するかという画面設計
- 見出しジャンプ対象の生成規則
- ルーティング全体の設計
- 複数タブ系統のURL名前空間設計
- パネル内の非同期取得戦略やキャッシュ戦略
- 個別タブの無効化ポリシー
- `panel-presence`のようなパネルpresence戦略の選択
- `activation="delayed"`など、Manual / Automatic以外のactivation戦略
- 左右スクロールボタンや端フェードなどのオーバーフロー補助UI
- `reason`など、`ui-tab-change.detail`の追加分類
- `indicator-placement`のようなインジケーター位置API
- `selectNext()` / `selectPrevious()`のような順序移動API
- タブ内コンテンツ取得・キャッシュ・バリデーション・送信の内蔵
- `fullWidth`や画面全体分割など、tabs自身が負うレイアウト責務
- 強い装飾アニメーションによる選択表現

これらは上位レイヤ、スタイル拡張面、または別コンポーネントの責務です。

---

## 契約固定方針

本書では、現行実装の挙動をそのまま追認するのではなく、`ui-tabs`の**長期的に維持すべき正規契約**を先に定めます。現行実装が未追随である場合は、本書末尾の「現行実装で未対応の事項」に明示します。

固定する設計判断は次のとおりです。

1. `selectedValue`は **コンポーネント所有の正規選択状態**です。外部からの代入は同期要求として扱いますが、React的な厳密controlled component契約は採りません。
2. `defaultSelectedValue`は **初期種別**であり、`selectedValue`が与えられている場合の競合解決には参加しません。
3. `slot="tab"`の正規入力は **ネイティブ`<button>`要素**です。リンクや入れ子interactive構造は正規入力に含めません。
4. `value`は表示文言ではなく、**安定・一意・不変の論理識別子**です。
5. 動的再構成時の選択保持は **indexではなくvalue基準**で行います。
6. イベントは **事前要求** と **事後通知** を分離します。
7. `urlSync`はtabs本体の付加機能ですが、**単一主系統・単一クエリ名・ホスト配下解決**に限定します。
8. パネルは **mountを維持したまま可視状態のみ切り替える**ことを正規契約とします。
9. `orientation`は主として **interaction semantics** を規定します。視覚配置は既定スタイルとして提供しますが、意味論上の本質ではありません。
10. 個別タブのdisabledは **基底契約に含めません**。

## 公開契約

`ui-tabs`は、`selectedValue`、`defaultSelectedValue`、`orientation`、`automaticActivation`、`urlSync`を公開入力として扱います。スロットは`tab`と`panel`を持ちます。内部実装はShadow DOMとスロットで構成されますが、利用者は`ui-tabs`を契約単位として扱います。

`orientation`の既定値は`horizontal`です。`automaticActivation`の既定値は`false`です。`urlSync`の既定値は`false`です。

`selectedValue`は、`ui-tabs`が外部へ公開する現在選択値です。外部からの代入は、その値への選択同期要求として扱います。一方で、`ui-tabs`自身もユーザー操作やURL解決に応じて現在選択値を更新し、その結果を`selected-value`属性へ反映します。したがって、本コンポーネントはReact的な厳密controlled component契約は採りません。利用者は、`selectedValue`を外部状態の唯一の真実源として扱うのではなく、`ui-tab-change`を購読して必要な同期を行う前提で扱います。

`defaultSelectedValue`は、`selectedValue`が選択解決に参加しない場合に限って参照される初期候補です。評価されるのは、初回初期化時と、スロット再構成に伴う再初期化時だけです。通常更新のたびに再適用される入力ではありません。したがって、利用者は`defaultSelectedValue`を継続制御用の入力として扱ってはなりません（MUST NOT）。

`urlSync`を有効化する場合、主タブ状態を`?tab=`と同期します。URLクエリ名は固定であり名前空間化されません。そのため、同一ページ上の独立した複数タブ系統で`url-sync`を同時使用してはなりません（MUST NOT）。`url-sync`は、ページの主タブ1系統に限定して使用します。

### 入力契約

| 名前                   | 種別                                            | 必須   | 内容             | 契約                                                                                                            |
| ---------------------- | ----------------------------------------------- | ------ | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `selectedValue`        | property / attribute (`selected-value`)         | いいえ | 現在選択値       | `slot="tab"`要素の`value`属性と一致する値を選択します。`ui-tabs`自身が保持する正規選択状態です              |
| `defaultSelectedValue` | property / attribute (`default-selected-value`) | いいえ | 初期選択値       | `selectedValue`が未指定のときに限り、初回解決時または再初期化時の初期種別として評価します                      |
| `orientation`          | property / attribute                            | いいえ | 操作方向         | `horizontal` / `vertical`。主としてキーボード意味論と`aria-orientation`を規定します                           |
| `automaticActivation`  | property / attribute (`automatic-activation`)   | いいえ | 自動選択         | `true`の場合、矢印キーによるフォーカス移動と同時に選択を更新します。低コストなパネル切替面に限定して使用します |
| `urlSync`              | property / attribute (`url-sync`)               | いいえ | URL同期         | `true`の場合、主タブ状態を`?tab=`と同期します。単一主系統でのみ使用します                                    |
| `aria-label`           | attribute                                       | いいえ | タブリスト名     | 内部`tablist`のaccessible nameとして転写します                                                              |
| `aria-labelledby`      | attribute                                       | いいえ | タブリスト名参照 | 内部`tablist`のaccessible nameとして転写します                                                              |

### スロット契約

| 名前    | 種別       | 位置づけ | 内容                                     |
| ------- | ---------- | -------- | ---------------------------------------- |
| `tab`   | named slot | 正規入力 | タブ見出し要素を受け取ります             |
| `panel` | named slot | 正規入力 | 各タブに対応するパネル要素を受け取ります |

`slot="tab"`と`slot="panel"`は**先頭から順序対応**します。関連付けはDOM上の近接ではなく、各スロット内の順序で決定します。利用者は、タブ数とパネル数を一致させなければなりません（MUST）。

この順序対応は、破損したDOMや動的再構成に対する防御的回復の説明であって、Markdown authoringにおける許容入力を意味しません。authoring側のbuild-time validationでは、タブ数とパネル数の不一致は拒否されます。

`slot="tab"`の正規入力は、ネイティブの`<button>`要素です。`slot="panel"`要素は`HTMLElement`でなければなりません。

`slot="tab"`要素は`value`属性を持つことを前提とします。`value`が欠落しても描画自体は継続し得ますが、`selectedValue`、`defaultSelectedValue`、`select(value)`、`urlSync`の契約が成立しません。したがって、**すべてのタブに安定した`value`** を与えなければなりません（MUST）。

`value`は表示文言ではなく、**安定・一意・不変の論理識別子**です。同一の`value`を複数タブで重複させる構成はサポート対象外です。利用者は重複や表示文言依存に基づく運用をしてはなりません（MUST NOT）。

`urlSync=true`の場合、`value`はURLに埋め込まれても意味が崩れない安定値でなければなりません（SHOULD）。表示名、翻訳文字列、動的生成ラベルをそのまま`value`として使ってはなりません（SHOULD NOT）。

`slot="tab"`の主要操作対象は、**スロットに割り当てられた`<button>`要素自身**です。内部に別の主要フォーカス対象をネストし、その内側要素を実質的なタブ本体として運用する構成はサポートしません。`a[href]`などの遷移要素をタブ本体として用いる構成も正規入力に含めません。

`slot="panel"`は対応するタブにより表示・非表示が制御される受け皿です。利用者は、`slot="panel"`自身を独立した可視状態コンポーネントとして扱ってはなりません（MUST NOT）。

### 公開メソッド

`ui-tabs`は、プログラムから選択状態またはフォーカス状態を変更するため、次の公開メソッドを持ちます。

| 名前                      | 種別   | 契約                                                                                                                          |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `select(value, options?)` | method | 一致する`value`を持つタブを選択します。一致しない場合は開発時警告のみを出し、選択状態・フォーカス状態・URLを変更しません。 |
| `focus(value)`            | method | 一致する`value`を持つタブへroving focusを移します。一致しない場合は開発時警告のみを出し、選択状態・URLを変更しません。   |
| `focusNext()`             | method | 現在のroving focusから次タブへフォーカスを移します。末尾では先頭へ循環します。選択状態は変更しません。                      |
| `focusPrevious()`         | method | 現在のroving focusから前タブへフォーカスを移します。先頭では末尾へ循環します。選択状態は変更しません。                      |
| `focusFirst()`            | method | 先頭タブへフォーカスを移します。選択状態は変更しません。                                                                      |
| `focusLast()`             | method | 末尾タブへフォーカスを移します。選択状態は変更しません。                                                                      |

`select(value, options?)`の引数契約は次のとおりです。

| 名前                  | 型        | 必須   | 既定値     | 契約                                                                 |
| --------------------- | --------- | ------ | ---------- | -------------------------------------------------------------------- | -------- | ----------------------------------------- |
| `value`               | `string`  | はい   | なし       | 選択対象の論理識別子です。`slot="tab"`の`value`と一致させます。   |
| `options.historyMode` | `'auto'   | 'push' | 'replace'` | いいえ                                                               | `'auto'` | `urlSync=true`の場合の履歴更新方法です。 |
| `options.emitEvent`   | `boolean` | いいえ | `true`     | `ui-tab-request-change` / `ui-tab-change`を発火させるかを表します。 |

`options.historyMode='auto'`の場合、`select(value)`はAPI起点の変更として扱い、既定では`replace`を用います。`urlSync=false`の場合、`historyMode`は無視されます。

`select(value, options?)`は、原則として`ui-tab-request-change`と`ui-tab-change`の二相契約に従います。`emitEvent=false`は、公開操作ではなく、再初期化やURL正規化などの内部整合化に限って用います。利用者は通常の選択変更で`emitEvent=false`に依存してはなりません（SHOULD NOT）。

`focus(value)`、`focusNext()`、`focusPrevious()`、`focusFirst()`、`focusLast()`は、**常にフォーカス状態のみを変更するAPI** です。`automaticActivation=true`であっても、これらの公開フォーカスAPIは選択状態やURLを変更しません。選択確定が必要な場合は`select(value, options?)`を用います。

### 公開イベント

`ui-tabs`は、選択変更について**事前要求**と**事後通知**を分離します。

| 名前                    | 種別        | detail                                         | 契約                                                                                                       |
| ----------------------- | ----------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `ui-tab-request-change` | CustomEvent | `{ index, value, prevIndex, source, scopeId }` | 選択確定前に発火します。`cancelable=true`であり、利用者は`preventDefault()`により選択変更を拒否できます |
| `ui-tab-change`         | CustomEvent | `{ index, value, prevIndex, source, scopeId }` | 選択が実際に変化した場合にのみ、確定後に発火します。同じタブの再選択では発火しません                       |

`source`は少なくとも`click`、`keyboard`、`api`、`url`、`reconcile`を識別できなければなりません（MUST）。
`scopeId`は`data-toc-scope`を持つ`ui-tabs`でのみ意味を持ち、TOC側がtab scopeを識別するための補助情報です。未設定時は`null`を許容します。

`ui-tab-request-change`は`bubbles: true`、`composed: true`、`cancelable: true`で発火します。`ui-tab-change`は`bubbles: true`、`composed: true`、`cancelable: false`で発火します。

`ui-tab-change`は、**内部状態更新、DOM反映、`selected-value`属性更新**、および必要なURL同期の後\*\*に発火します。したがって、イベントハンドラ内で観測される`selectedValue`、ARIA状態、パネル可視状態、URLは、原則として新しい選択状態です。

### 属性反映契約

公開入力のうち、`selectedValue`、`orientation`、`automaticActivation`、`urlSync`はreflectします。`defaultSelectedValue`はreflectしません。

| property               | attribute                | reflect | 備考                             |
| ---------------------- | ------------------------ | ------- | -------------------------------- |
| `selectedValue`        | `selected-value`         | あり    | 内部操作でも更新されます         |
| `defaultSelectedValue` | `default-selected-value` | なし    | 初期候補としてのみ評価します     |
| `orientation`          | `orientation`            | あり    | `horizontal` / `vertical`        |
| `automaticActivation`  | `automatic-activation`   | あり    | boolean attributeとして扱います |
| `urlSync`              | `url-sync`               | あり    | boolean attributeとして扱います |

### 選択解決契約

選択値の解決順序は、`urlSync`の有無で異なります。

`urlSync=false`の場合、解決順序は次のとおりです。

1. `selectedValue`が有効ならそれを選択します。
2. 初期化前または再初期化時に限り、`defaultSelectedValue`が有効ならそれを選択します。
3. それ以外で、現在保持している選択値が新しいタブ集合でも有効なら、その値を維持します。
4. どれも成立しない場合は、先頭タブへフォールバックします。

`urlSync=true`の場合、URL駆動値が有効ならそれを優先します。解決順序は次のとおりです。

1. ハッシュから解決できるタブ値
2. `?tab=`から解決できるタブ値
3. `selectedValue`
4. 初期化前または再初期化時に限る`defaultSelectedValue`
5. 現在保持している選択値
6. 先頭タブへのフォールバック

無効な`selectedValue`は`defaultSelectedValue`へ回復しません。これは、継続制御入力が無効である事実を曖昧にしないためです。`selectedValue`が与えられていても一致する`value`が存在しない場合は、開発時警告を出した上で先頭タブへフォールバックします。

再初期化時には、まず既存の選択値をvalue基準で保持できるかを評価し、保持できない場合に限って`selectedValue`、`defaultSelectedValue`、先頭タブの順で再解決します。したがって、`defaultSelectedValue`は「初回だけ」ではなく、「再初期化時の初期候補」としても作用します。

### 責務範囲

責務範囲には、スロット内容の読取り、選択解決、ARIA属性付与、Roving Tabindex、キーボードナビゲーション、パネル表示切替、アクティブタブのスクロール追従、インジケーター配置、URL同期、および履歴更新を含みます。

加えて、`ui-tabs`は`slot="tab"` / `slot="panel"`に対して、対話成立に必要な属性を書き込みます。具体的には、`role`、`id`、`aria-controls`、`aria-labelledby`、`aria-selected`、`tabindex`、`hidden`、`aria-hidden`、`data-panel-active`は`ui-tabs`側の所有状態として扱います。

一方で、各タブラベルの描画規則、個別タブのdisabled状態、パネル内のデータ取得、ハッシュ対象見出しの生成、ページ全体のルーティング設計は責務に含めません。

---

## 状態モデル

`ui-tabs`の主要状態は、見た目の差ではなく、**どのタブが選択されているか**、**どのタブがフォーカス対象か**、**URLと同期しているか**、**ユーザー操作がManualかAutomaticか**によって読み分けます。

### 1. 基本状態

最小状態は、`orientation="horizontal"`、`automaticActivation=false`、`urlSync=false`、かつ`tab` / `panel`が1:1で与えられた状態です。この状態では、先頭タブが自動選択されます。

### 2. 選択状態

`activeIndex`が現在選択中のタブとパネルを表します。選択タブは`aria-selected="true"`を持ち、対応パネルは表示状態になります。

選択状態の更新は、クリック、`Enter` / `Space`、`select(value)`、外部からの`selectedValue`更新、URL変化のいずれかによって起こります。

### 3. フォーカス状態

`focusedIndex`は現在のRoving Tabindex対象を表します。Manual Activationでは`focusedIndex`と`activeIndex`が一時的に分離し得ます。Automatic Activationでは、**キーボード移動に限って**フォーカス移動と同時に選択も更新されるため、両者は原則として一致します。

一方で、公開フォーカスAPI（`focus(value)`、`focusNext()`、`focusPrevious()`、`focusFirst()`、`focusLast()`）は、`automaticActivation`の値にかかわらず、**フォーカス状態のみを変更する公開面**です。これらは`activeIndex`、`selectedValue`、URLを直接は変更しません。

選択保持とフォーカス保持は、動的再構成時にも **value基準** で評価します。既存の`activeValue`または`focusedValue`が新しい集合にも存在する場合はそれを保持し、存在しない場合にのみフォールバック規則へ移行します。

### 4. Manual Activation 状態

既定ではManual Activationです。矢印キー、`Home`、`End`による移動はフォーカスのみを変え、選択は`Enter`または`Space`で確定します。

このモードは、パネル切替コストが高い場合や、読者が内容を確定前に走査したい場合の既定挙動として適しています。

### 5. Automatic Activation 状態

`automaticActivation=true`の場合、**タブリスト上のキーボード移動**と同時に選択を更新します。矢印キー移動に伴ってパネルも切り替わります。

ただし、この結合はキーボード操作に対するinteraction semanticsであり、公開フォーカスAPIにまで拡張しません。`focus(value)`などの公開APIは、`automaticActivation=true`でもフォーカス状態のみを変更します。

Automatic Activationは、切替対象が**即時・同期的・低コスト**に切り替わる場合にのみ正規入力です。非同期読み込み、重い再描画、大きなレイアウト再計算を伴う面では使ってはなりません（SHOULD NOT）。読書面での予期せぬ内容変化を抑えるため、既定値はManual Activationのままとします。

### 6. URL 同期状態

`urlSync=true`の場合、選択値はURLと同期します。`?tab=`が存在すればそれを解決候補に含めます。ハッシュがホスト配下の見出し等に解決できる場合は、その見出しを含むタブを優先します。

URL同期時の履歴更新は次のとおりです。

- クリック選択: `push`
- Manual Activationでの`Enter` / `Space`: `push`
- Automatic Activationの矢印移動: `replace`
- `select(value)`の既定: `replace`

### 7. スロット不一致状態

`tab`数と`panel`数が一致しない場合、実効件数は`min(tab 数, panel 数)`です。先頭からこの件数のみを有効タブとして扱います。余剰タブは選択対象にならず、余剰パネルは有効な関連付けを持ちません。

これは回復的挙動であり、正規入力ではありません。利用者は不一致構成に依存してはなりません（MUST NOT）。Markdown authoringでは、この状態に到達する前にbuild-timeで拒否されます。

### 8. 再初期化状態

スロット内容が変化した場合、コンポーネントは再初期化します。このとき`initialized=false`に戻し、スナップショットを読み直して選択解決をやり直します。したがって、`defaultSelectedValue`はこの再初期化局面で再評価され得ます。

再初期化は、主として**内部整合性の再確立**を目的とする処理です。選択保持は **value基準** で行い、旧`activeValue`が新しいタブ集合にも存在する場合はそれを保持します。存在しない場合にのみ、`selectedValue`、`defaultSelectedValue`、先頭タブの順でフォールバックします。

`slotchange`に伴う再初期化は、利用者から見た明示操作ではなく、内部整合化です。したがって、再初期化のみを理由に公開イベントを必ず発火する契約は採りません。

---

## DOM / Accessibility

ルートは`:host`です。Shadow DOM内部にタブリストコンテナ、インジケーター、パネルスロット領域を持ちます。

```text
<ui-tabs>
  #shadow-root
    <div class="root">
      <div class="tablist-container">
        <div role="tablist" part="tablist" aria-orientation="horizontal | vertical">
          <slot name="tab"></slot>
        </div>
        <div class="indicator" part="indicator" aria-hidden="true"></div>
      </div>

      <div class="panels" part="panels">
        <slot name="panel"></slot>
      </div>
    </div>
</ui-tabs>
```

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- タブリストには`role="tablist"`を付与します。
- タブには`role="tab"`を付与します。
- パネルには`role="tabpanel"`を付与します。
- 実効件数内のタブには`aria-controls`を付与します。
- 実効件数内のパネルには`aria-labelledby`を付与します。
- 選択タブには`aria-selected="true"`、非選択タブには`aria-selected="false"`を付与します。
- Roving Tabindexにより、フォーカス対象のみ`tabindex="0"`、それ以外は`-1`を持ちます。
- パネルに`aria-busy`が未定義なら`false`を補います。
- パネルに`aria-live`が未定義なら`off`を補います。
- 非表示パネルは`hidden`を持ちます。
- 切替直後の旧パネルはアニメーション完了まで一時的に残り得ますが、`aria-hidden="true"`を持ちます。

`id`を持たないタブとパネルには、自動的に`ui-tabs-{uid}-tab-{i}`および`ui-tabs-{uid}-panel-{i}`形式のIDを補います。

`tablist`にはaccessible nameが必要です。利用者は`aria-label`または`aria-labelledby`のいずれかを与えるべきです（SHOULD）。同一画面に複数のtabsが共存する場合は、少なくともどちらか一方を与えなければなりません（MUST）。

### Light DOM 属性所有権契約

`ui-tabs`は、Light DOM上の`slot="tab"` / `slot="panel"`要素に対して、対話成立に必要な属性を書き込みます。このとき、次の属性は`ui-tabs`が所有する属性として扱います。

- `slot="tab"`側: `role`、`id`、`aria-controls`、`aria-selected`、`tabindex`
- `slot="panel"`側: `role`、`id`、`aria-labelledby`、`hidden`、`aria-hidden`、`data-panel-active`

利用者は、これらの属性を業務状態や独自制御の格納先として扱ってはなりません（MUST NOT）。

一方で、`aria-busy`と`aria-live`は利用者が意味を持って与えることのできる属性です。`ui-tabs`は未指定時にのみ既定値を補完し、利用者が明示した値を上書きしません。

`id`については、利用者が安定した値を与えることを妨げません。未指定時のみ`ui-tabs`が補完します。

### キーボード契約

水平タブでは`ArrowLeft` / `ArrowRight`を、垂直タブでは`ArrowUp` / `ArrowDown`を使用します。`Home`は先頭、`End`は末尾へ移動します。`Enter`と`Space`は現在フォーカス中のタブを選択します。

水平方向の前後判定は、物理キー固定ではなく**論理方向**で扱います。LTRでは`ArrowLeft`が前、`ArrowRight`が次です。RTLではこの対応を反転します。

| キー              | 水平                   | 垂直                   |
| ----------------- | ---------------------- | ---------------------- |
| `ArrowLeft`       | LTRでは前、RTLでは次 | 無効                   |
| `ArrowRight`      | LTRでは次、RTLでは前 | 無効                   |
| `ArrowUp`         | 無効                   | 前タブへフォーカス     |
| `ArrowDown`       | 無効                   | 次タブへフォーカス     |
| `Home`            | 先頭へフォーカス       | 先頭へフォーカス       |
| `End`             | 末尾へフォーカス       | 末尾へフォーカス       |
| `Enter` / `Space` | フォーカス中タブを選択 | フォーカス中タブを選択 |

フォーカス移動は循環します。先頭から前へ移動すると末尾へ、末尾から次へ移動すると先頭へ戻ります。

### パネル表示契約

パネルは1枚のみがアクティブとして扱われます。新しいアクティブパネルには`data-panel-active`を付与し、非アクティブパネルは`hidden`にします。フェードアウト中の旧パネルはフォールバックタイマーによって遅延非表示化されます。

利用者は、`hidden`と`data-panel-active`の具体的な切替タイミングに依存してはなりません（MUST NOT）。依存してよいのは、**選択パネルが可視であり、非選択パネルが最終的に不可視になる**ことです。

`hidden`、`aria-hidden`、`data-panel-active`は、`ui-tabs`による**パネル可視状態の単一所有面**です。利用者は、これらをアプリケーション固有の可視状態管理へ流用してはなりません（MUST NOT）。旧パネルがアニメーション中に短時間DOM上へ残る場合でも、意味上は非選択状態として扱います。

---

## Visual Contract

`ui-tabs`の視覚契約は、選択状態を**強い塗りではなく、静かな境界線と位置の変化**で示すことにあります。

### 情報順位

- タブラベルは本文を上回る視覚ノイズを持ちません。
- 選択状態は主として文字色とインジケーターで示します。
- 非選択状態は控えめな前景色で表します。
- ホバーと押下は、最小限の色変化とスケール変化で示します。

Rouaultの読書文脈では、タブは本文の競合見出しであってはなりません。したがって、常時強い塗り背景や過剰なアニメーションには依存しません。

### レイアウト

`orientation`は主として操作方向と`aria-orientation`を規定します。既定スタイルでは、水平時はタブリストが上部・パネル群が下部、垂直時はタブリストが左側・パネル群が右側に配置されます。

したがって、視覚配置を調整する場合でも、キーボード意味論とARIAの一貫性を壊してはなりません（MUST NOT）。

タブリストはオーバーフロー時にスクロール可能です。アクティブタブまたはフォーカス対象タブは、見切れた場合に自動的にスクロール範囲内へ移動します。

### 選択表示

未hydration状態では、選択タブ自身の下線または右線で選択状態を示します。hydration後は、JS制御の`.indicator`が選択ラベル位置へ移動し、タブ自身の境界線はフォールバック表示から外れます。

この契約により、初期描画時にも選択状態が失われず、hydration後はより滑らかな移動表示へ移行できます。

### インジケーター

水平時のインジケーターは、タブ全体幅ではなくラベル内側余白を考慮した幅で配置します。垂直時は右側に縦インジケーターを配置します。

Forced Colors環境ではJS制御インジケーターを非表示とし、タブ自身の境界線へ回帰します。

### パネル表示

パネルはグリッド重ね配置の上で切り替えます。アクティブパネルは不透明度1、非アクティブパネルは不透明度0を基調とした遷移を持ちます。

### フォーカス表示

`slot="tab"`要素の`:focus-visible`に対してアウトラインを描画します。フォーカスリングはタブリスト周辺の余白計算に織り込まれており、表示時にレイアウトが破綻しないよう調整されます。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途             | トークン                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- |
| 選択色           | `--primary`                                                                               |
| 通常文字色       | `--fg-subtle` / `--fg-default`                                                            |
| 境界線           | `--border-default` / `--border-width` / `--border-width-thick`                            |
| 余白             | `--space-*`                                                                               |
| 高さ             | `--control-height-md`                                                                     |
| 角丸             | `--radius-sm`                                                                             |
| フォーカスリング | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| 遷移時間         | `--duration-fast` / `--duration-normal` / `--duration-slow`                               |
| イージング       | `--ease-out`                                                                              |
| 押下スケール     | `--scale-pressed`                                                                         |
| スクロールバー   | `--scrollbar-width` / `--scrollbar-thumb`                                                 |
| パネル間隔       | `--ui-tabs-panel-gap`                                                                     |
| インラインにじみ | `--ui-tabs-inline-bleed`                                                                  |

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce`環境では、インジケーター、パネル、タブのtransition-durationを`0.01ms`に短縮します。完全無効化ではなく、状態変化の認知を損なわない最小時間へ収束させます。

### Forced Colors

`forced-colors: active`環境では、JS制御のインジケーターを非表示にし、タブ自体の境界線で選択状態を示します。選択タブは`Highlight`に寄せ、非選択タブは`CanvasText`ベースの境界線へ回帰します。

### Dark Surface

本コンポーネント自身は`prefers-color-scheme`を直接分岐しません。暗色面対応は、前景色・境界線・主色トークンの差し替えによって成立させます。したがって、ダークモード対応は**トークン契約の一部**として扱います。

---

## 関連契約

### URL 同期契約

`urlSync=true`の場合、`?tab=`が主タブ状態の公開URL面になります。加えて、ハッシュが当該`ui-tabs`の有効パネル内targetに解決できる場合は、そのtargetを含むタブを`?tab=`より優先して選択します。

ここでいうハッシュ解決の対象は、`snapshot.panels[0..interactiveCount)`の各パネル自身、またはその子孫要素に限ります。ページ全体の任意アンカー、interactiveCount範囲外のパネル、対応tab valueを持たないパネル、別`ui-tabs`配下のtargetを見て選択を変更する契約ではありません。nested / 別`ui-tabs`配下hashは、target側の`closest('ui-tabs')`が当該hostと一致する場合だけhost-owned hashとして扱います。

`urlSync`はtabs本体の付加機能であり、ルータ全体の状態管理やフレームワーク固有の`history.state`形式までは所有しません。扱うのは`?tab=`とホスト配下ハッシュ解決までです。URL更新時に履歴stateを再生成せず、既存の`history.state`はopaqueに再利用します。

ハッシュ由来でタブが解決された場合、コンポーネントはhashを維持したまま`?tab=`を現在アクティブ値へ`replaceState`で正規化します。クエリ由来で解決された場合も、`strategy.readValue(currentUrl)`が現在アクティブ値と異なる場合に限って`replaceState`で正規化します。空または空白のみの`?tab=`はURL駆動値なしとして扱い、source=nullの通常初期表示では`?tab=`を新規生成しません。

`urlSync`はURLを共有状態として扱う契約であるため、複数タブ系統や入れ子tabsでの同時利用には向きません。ページの主タブ1系統に限定して用います。

### Hydration ownership

noteページでの`ui-tabs`はhydration registry / planner / schedulerが所有します。build-timeでは`data-hydration-capability="interactive"`と`data-hydration-trigger="initial"`を正規契約とし、client bootstrapでdirect importによるeager registrationは行いません。

`visible`を正規契約にするのは、非hydration状態でもselected panel、ARIA、hiddenの静的契約が成立するoutput contractを別途確立した後です。現行のtabs契約では、その前提が未成立であるため採用しません。

### 履歴更新契約

`urlSync=true`かつ選択が変化した場合、履歴更新は操作種別に応じて`push`または`replace`を使い分けます。利用者はこの違いを前提に、ブラウザ戻る操作が「ユーザーが明示選択したタブ遷移」を再現する設計を採るべきです。

### イベント契約

`ui-tab-request-change`と`ui-tab-change`は、それぞれ**事前要求**と**事後通知**の役割を持ちます。利用者は前者を検証・拒否・補助同期に、後者を状態同期・分析計測・補助UI更新に用います。

`ui-tab-request-change`が`preventDefault()`されなかった場合にのみ、選択確定と`ui-tab-change`が成立します。

`ui-tab-change`が発火し得るのは、クリック、`Enter` / `Space`による選択確定、Automatic Activationによる実選択更新、`select(value)`、およびURL変化による再選択など、**選択が実際に変化した場合**です。

一方で、初期解決、property再評価に伴う内部整合化、`slotchange`に伴う再初期化、同一タブの再選択、URL正規化だけの処理について、常にイベントが飛ぶことには依存してはなりません（MUST NOT）。

### パネルライフサイクル契約

`ui-tabs`はパネルをmount / unmountしません。可視状態のみを制御し、非選択パネルもDOM上には残します。したがって、パネル内state、フォーム状態、observer、custom elementの接続状態は保持されます。

将来lazy mountやinactive panelの破棄を導入する場合は、別契約・別入力として明示し、既定のpersistent mount契約を破壊してはなりません（MUST NOT）。

### スタイル拡張契約

`ui-tabs`は外部スタイル拡張面として`::part(...)`とCSS Custom Propertiesを公開します。

| part名     | 役割               |
| ----------- | ------------------ |
| `tablist`   | タブリスト要素     |
| `indicator` | 選択インジケーター |
| `panels`    | パネルコンテナ     |

利用者は`::part(tablist)`、`::part(indicator)`、`::part(panels)`に対して装飾調整を行えます。ただし、スロット順序やARIA関係を破壊するような構造変更を意図した利用はサポートしません。

内部class名、`hydrated`属性、`data-panel-active`の具体的利用、内部コントローラ構成は公開契約に含みません。利用者はこれらへ依存してはなりません（MUST NOT）。

### 契約違反入力の扱い

契約違反入力は、次の3類型に分けて扱います。

- **recoverable input**: 無効な`?tab=`、存在しないハッシュ。決定的フォールバックを行います。
- **configuration error**: `value`重複、`tab` / `panel`数不一致、`slot="tab"`への不適格要素投入。開発時に警告し、正規契約としては不成立です。
- **programming error**: `select(value)`に未知値を渡すなど、呼び出し側の契約違反です。開発時に警告します。

### 開発時警告契約

次の事項は、開発時に限って警告し得ます。

- `tab`数と`panel`数の不一致
- 無効な`?tab=`
- 無効な`selectedValue`
- 無効な`defaultSelectedValue`
- `select(value)`で一致するタブが存在しない

これらの警告は開発時補助であり、実行時例外契約ではありません。本番時は描画を継続し得ます。

---

## 境界条件

### 1. タブが 1 つだけの場合

1タブ構成でも成立します。矢印キーによる循環移動は自身へ戻ります。エラーとして扱いません。

### 2. `selectedValue` が有効な場合

一致する`value`を持つタブが存在すれば、そのタブを選択します。

### 3. `defaultSelectedValue` が有効な場合

初期化前または再初期化時に限り、一致する`value`を持つタブを初期選択します。

### 4. `selectedValue` と `defaultSelectedValue` の競合

両方が与えられた場合、`selectedValue`を優先します。

### 5. `selectedValue` が無効な場合

一致する`value`が存在しない場合、`defaultSelectedValue`には回復せず、先頭タブへフォールバックします。これは制御値の無効を優先的に警告するための契約です。

### 6. `defaultSelectedValue` が無効な場合

初期選択候補として採用できないため、先頭タブへフォールバックします。

### 7. `?tab=` が無効な場合

クエリ値が無効であっても描画は継続します。警告を出しつつ、`selectedValue`、`defaultSelectedValue`、現在値、先頭タブの順で解決を継続します。

### 8. ハッシュとクエリの競合

ハッシュから有効なタブが解決できる場合、クエリよりハッシュを優先します。その後、`?tab=`は現在アクティブ値に正規化されます。

### 9. `tab` 数と `panel` 数が不一致の場合

先頭から`min(tab 数, panel 数)`件のみを有効化します。余剰タブは選択対象ではなく、余剰パネルは正規の対応関係を持ちません。

### 10. `value` 重複

現行実装は先頭一致で動作しますが、これは回復的挙動にすぎません。重複値構成は契約違反です。

### 11. `urlSync` を複数インスタンスで使う場合

同じ`?tab=`を共有するため、複数独立系統での同時使用はサポートしません。どのタブ系統がURLの主語であるかが曖昧になるためです。入れ子tabsに対する`urlSync`も同様に正規契約に含めません。

### 12. 個別タブの disabled を使いたい場合

基底契約では、個別タブのdisabledをサポートしません。利用者は、利用不能な選択肢をtabsに含めるのではなく、構成自体から除外するか、パネル内部で理由を説明する別UIを用いるべきです。

### 13. 実効件数が 0 の場合

`tab`または`panel`が存在しないため、選択処理・イベント・URL同期は成立しません。描画自体は継続し得ますが、対話コンポーネントとしては未成立です。

---

## Storybook 契約

各Storyは見本ではなく、**現行実装に対する契約確認点**として扱います。本節では、現行Storybookのexport一覧と一致するStoryのみを列挙します。未実装または未検証の契約は、本節ではなく「現行実装で未対応の事項」で管理します。

| Story                          | 固定する契約                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `VisualAccessibility`          | 基本的なrole / aria / フォーカス可視性が破綻しないこと                                       |
| `Default`                      | 先頭タブ自動選択、role / aria / Roving Tabindexが成立すること                                |
| `InitialIndex`                 | 初期選択入力により先頭以外から開始できること                                                  |
| `Vertical`                     | `orientation="vertical"`で`aria-orientation="vertical"`になること                          |
| `AutomaticActivation`          | 矢印移動だけで選択が更新されること                                                            |
| `WithIcons`                    | アイコンとラベルの組み合わせを受け入れられること                                              |
| `ManyTabs`                     | オーバーフロー時にスクロールし、選択タブを可視範囲へ追従できること                            |
| `SelectedByValue`              | 選択値指定により任意タブを選択できること                                                      |
| `KeyboardNavigation`           | Manual Activationにおける矢印移動、`Enter` / `Space`、`Home` / `End`、循環移動が成立すること |
| `KeyboardNavigationVertical`   | 垂直時に`ArrowUp` / `ArrowDown`が有効であること                                             |
| `TabChangeEvent`               | `ui-tab-change`のdetailと、同値再選択時の非発火が成立すること                              |
| `EdgeCase_InvalidIndex`        | 無効な初期index指定が回復的に処理されること                                                 |
| `EdgeCase_ValueOverridesIndex` | value系の選択入力がindex系入力より優先されること                                           |
| `EdgeCase_SingleTab`           | 1タブ構成でも循環ナビゲーションが破綻しないこと                                              |
| `EdgeCase_UnmatchedValue`      | 無効な選択値指定が回復的に処理されること                                                      |
| `EdgeCase_MismatchedSlots`     | 不一致時に余剰タブまたは余剰パネルが正規対応関係を持たないこと                                |
| `ReducedMotion`                | reduced motion時に遷移時間が極小化されること                                                 |
| `ForcedColorsMode`             | forced-colors時にインジケーター非表示と境界線回帰が成立すること                              |
| `DarkMode`                     | 暗色面でも選択状態の可読性を保てること                                                        |
| `AsyncPanel`                   | パネル側`aria-busy`運用パターンとloading UI共存が成立すること                             |
| `IntegrationExample`           | ノートUI文脈で自然に使用できること                                                          |

`ui-tab-request-change`、RTL論理方向、accessible name、URLクエリからの初期選択、ハッシュ優先、初期化時非発火、再初期化時非発火など、現行Storyと一致しない契約確認点は、本節には列挙しません。これらはStoryが実在するようになった時点で本節へ昇格させます。

---

## 補足

`ui-tabs`の要点は、タブを切り替えられること自体ではありません。**順序対応する複数の面を、URL・キーボード・ARIA・視覚の各レイヤで破綻なく切り替えられること**にあります。

したがって、今後の変更でも次の5点は崩さない方がよいです。

1. `tab`と`panel`の順序対応を公開契約として維持すること。
2. Roving Tabindexと`aria-controls` / `aria-labelledby`の関係を崩さないこと。
3. `selectedValue`の解決順位を不用意に変更しないこと。
4. `urlSync`の優先順位と履歴更新方針を維持すること。
5. 選択表示を本文を侵食しない静かな強度に保つこと。

---

## 現行実装で未対応の事項

本節は、現行の`tabs.ts`、関連コントローラ、および`tabs.stories.ts`を基準として、**本書で正規契約として固定したが、現時点では未実装、未強制、または未検証である事項**を整理するものです。

### 1. `slot="tab"` の要素種別固定

本書では`slot="tab"`の正規入力をネイティブ`button`に固定しましたが、現行実装は任意の`HTMLElement`を広く受け入れます。したがって、**要素種別の厳密化は未実装**です。

### 2. `value` の一意性検証

本書では`value`を安定・一意・不変の論理識別子として固定しましたが、現行実装は先頭一致で解決するのみで、重複`value`に対する十分な実行時警告や例外はありません。したがって、**一意性は公開契約上の要求であって、実装上の強制ではありません**。

### 3. `selectedValue` の契約明文化

本書では`selectedValue`をコンポーネント所有の正規選択状態として固定しましたが、現行実装にはその意味論を利用者へ強く伝える専用APIや補助イベントがありません。したがって、**契約思想は固定済みでも、API面での自己説明性は未整備**です。

### 4. `ui-tab-request-change` の二相イベント

本書では`ui-tab-request-change`と`ui-tab-change`による二相イベント契約を固定しましたが、現行実装は事後通知の`ui-tab-change`のみを前提としています。したがって、**事前要求・取消し可能なイベント面は未実装**です。

### 5. `ui-tab-change.detail.source` の不足

本書ではイベントdetailが少なくとも`source`を持ち、`click`、`keyboard`、`api`、`url`、`reconcile`を識別できる契約を固定しました。しかし現行実装の`UiTabChangeDetail`は`index`、`value`、`prevIndex`のみであり、`source`を保持しません。したがって、**事後通知イベントの由来識別面も未実装**です。

### 6. `ui-tab-change.detail.scopeId`

現行実装では、TOC連動のために`UiTabChangeDetail.scopeId`を追加しています。`data-toc-scope`を持つ`ui-tabs`は、その値をevent detailに転写します。これはtab hostの内部DOM構造をTOC側へ漏らさずにscopeを識別するための契約です。

### 6. URL クエリ名の名前空間化

現行`urlSync`は固定で`?tab=`を使用します。複数独立タブ系統をURLで並立管理する契約は未対応です。

### 7. 動的再構成時の value 基準保持

本書では動的再構成時の選択保持をvalue基準に固定しましたが、現行実装は再初期化と再解決を行うものの、保持規則を強い公開契約として保証していません。特に、`activeValue`だけでなく`focusedValue`についてもvalue基準保持を保証する実装にはなっていません。したがって、**value基準保持は設計方針として固定済みでも、実装保証は未十分**です。

### 8. accessible name の転写

本書では`aria-label` / `aria-labelledby`を内部`tablist`のaccessible nameとして扱う契約を固定しましたが、現行実装はこの公開面を明示的には整備していません。したがって、**アクセシブル名の転写契約は未実装**です。

### 9. `orientation` の値検証と正規化

本書では`orientation`を`horizontal` / `vertical`のみからなる入力として扱います。しかし現行実装は`String` propertyとして受け取り、値検証や既定値への正規化を行いません。`resolveKeyNavigation()`も`horizontal`以外を事実上`vertical`として扱います。したがって、**不正な`orientation`値**に対する入力検証・正規化は未実装\*\*です。

### 10. RTL 論理方向ナビゲーション

本書では水平方向のキー解釈を論理方向で固定しましたが、現行実装はRTLでの反転規則を十分には固定していません。したがって、**RTL論理方向契約は未実装または未検証**です。

### 11. 開発時警告の本番保証

不一致スロット、無効な`selectedValue`、無効な`defaultSelectedValue`、無効な`?tab=`は、主としてプログラム的操作やhydration driftに対する開発時警告として扱います。描画停止や例外送出は行いません。

ただし、Markdown authoring由来の不一致は別途build-timeで拒否されます。したがって、この節は **authoring契約の緩和** ではなく、runtimeの防御層について述べています。

### 12. Storybook による未確認領域

現行Storybookは主要契約を広くカバーしていますが、`value`重複、`ui-tab-request-change`、`ui-tab-change.detail.source`、RTLキーボード、accessible name、複数`urlSync`インスタンス競合、スロット動的並べ替えに関するStoryは存在しません。また、契約書上で固定した一部のStory名や検証観点は、現行Storybookのexport一覧とまだ一致していません。したがって、**主契約に対する検証面はまだ不足しています**。

### 13. 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、実装、Storybook、契約書の3点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。
