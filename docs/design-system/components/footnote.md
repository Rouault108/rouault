# Footnote

## 概要

本書は、`ui-footnote` の**長期的な正規契約**を定義するものです。現行実装の挙動を単に記述するのではなく、脚注参照コンポーネントとして設計をきれいに保ち、将来の保守性を高めるための基準を固定します。

`ui-footnote` は、本文中の脚注参照を **その場で軽く確認する経路** と、末尾の脚注一覧へ **確実に到達する経路** を両立するコンポーネントです。Popover は補助経路であり、脚注一覧は正規経路です。したがって、本契約は次を中核に据えます。

- Trigger は常にリンクとして成立します
- Popover は補助表示であり、正本ではありません
- 脚注本文の正本は 1 つに固定します
- 同一脚注への複数参照は明示的な論理モデルで扱います
- No-JS / 非対応環境でも読書経路は失われません

---

## 適用範囲

本書は、`ui-footnote` の次の事項を対象とします。

- 論理モデル
- 公開契約
- 更新契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 現行実装との差分

一方で、本書は次の事項を扱いません。

- Markdown から脚注参照・脚注一覧・backlink 群をどう生成するかという上位変換規則全体
- 採番アルゴリズムそのもの
- 脚注本文の執筆規約、編集規約、文体規約
- Popover の配置アルゴリズム詳細
- ルーティング、履歴管理、スクロール復元などの上位アプリケーション制御
- `脚注 {n}`、`脚注一覧で見る` などの固定文言をどの程度差し替え可能にするかという文言カスタマイズ戦略
- 長文脚注に対して要約表示モードや抜粋表示モードを導入するかどうかという読書体験上の派生表示戦略
- 複数参照に対する backlink 群の生成補助・表示補助・ラベル整形補助など、endnotes 生成側または上位 footnote model 側で扱うべき補助機能
- `open()`、`close()`、`focusTrigger()` などの外部制御 API を公開するかどうかという制御面の拡張方針

これらは上位レイヤ、関連コンポーネント、または将来要件が明確になった段階で別途定義すべき事項です。本書では、`ui-footnote` を**脚注参照の意味コンポーネント**として保つため、条件付き機能や補助機能の拡張方針を正規契約へ含めません。

---

## 論理モデル

`ui-footnote` は、単独の番号リンクではなく、**1 つの論理脚注**を構成する参照要素です。本契約では、論理脚注を次の 4 要素から構成されるものとして定義します。

- **endnote item**: 末尾脚注一覧側の本文と識別子
- **owner reference**: Popover 表示に必要な本文断片を保持できる主要参照
- **reference**: 同一脚注を追加で指す追従参照
- **backlinks**: endnote item から本文中の各参照位置へ戻るリンク群

### 識別子の役割分担

本契約では、識別子の役割を次のように固定します。

| 項目          | 役割                 | 契約                                 |
| ------------- | -------------------- | ------------------------------------ |
| `refId`       | 論理脚注の安定識別子 | 同一脚注を一意に表す主識別子です     |
| `index`       | 表示番号             | 提示専用です。識別子として扱いません |
| `refInstance` | 参照位置番号         | 同一脚注への複数参照を区別します     |

したがって、**識別は \*\***\`\`\***\* を主軸**とし、`index` は表示専用値として扱います。`index` から論理同一性を推定する設計には依存しません。

### 本文の正本

脚注本文の正本は **endnote item または上位 footnote data model** に属します。`ui-footnote` が局所的に保持する本文断片や SSR 済み Popover DOM は、正本ではなく**派生表示**です。

したがって、`ui-footnote` ごとに異なる本文を独自保持し、その整合を利用側へ委ねる設計には依存しません。Popover 本文と endnotes 本文は、同じ論理脚注データから導出されなければなりません（MUST）。

### 役割モデル

長期契約としての役割は、**primary reference** と **secondary reference** の 2 種です。

- **primary reference** は、同一 `refId` に対する正規の代表参照です
- **secondary reference** は、同一脚注を追加で指す追従参照です
- secondary reference は本文所有権を持ちません
- primary / secondary の区別は、表示実体の数ではなく、論理脚注に対する役割で決まります

現行公開入力に `shared` がありますが、これは役割モデルを暫定的に表現するフラグにすぎません。

- `shared=false` は primary reference を意味します
- `shared=true` は secondary reference を意味します

長期契約としては、boolean 1 つで役割・本文所有権・共有解決の意味を同時に背負う設計には依存しません。公開 API は、将来的に **役割が明示された表現** へ寄せることを前提とします。

したがって、本書で固定する意味論は `shared` そのものではなく、**primary reference / secondary reference という役割モデル**です。`shared` は現行互換のための暫定表現であり、長期的な正規表現ではありません。

---

## 公開契約

`ui-footnote` は、本文中に置かれる**脚注参照コンポーネント**です。公開入力は `refId`、`index`、`refInstance`、`shared`、および owner reference に対する本文断片です。

`ui-footnote` は、**Trigger を常にネイティブな \*\***\`\`\***\* として維持**しなければなりません（MUST）。Popover の有無や利用可否にかかわらず、脚注一覧へのリンク経路自体は失われません。

### 入力契約

| 名前          | 種別                                  | 必須   | 内容                               | 契約                                                                 |
| ------------- | ------------------------------------- | ------ | ---------------------------------- | -------------------------------------------------------------------- |
| `refId`       | property / attribute (`ref-id`)       | はい   | 論理脚注の安定識別子               | 同一 footnote scope 内で一意でなければなりません                     |
| `index`       | property / attribute                  | はい   | 表示番号                           | 提示専用です。識別子としては使いません                               |
| `refInstance` | property / attribute (`ref-instance`) | はい   | 同一脚注への参照位置番号           | 同一 `refId` 配下で一意でなければなりません                          |
| `shared`      | property / attribute                  | いいえ | 役割モデルの暫定表現               | `false` は primary reference、`true` は secondary reference を意味します |

`refId` の自動補完や `index` からの代用生成には、長期契約として依存しません。入力不足を黙って補完するよりも、上位生成系で明示的に値を与える方を正規とします。

また、長期契約として正規に固定するのは `shared` ではなく、**primary reference / secondary reference の役割意味**です。したがって、将来的な公開 API は `role` などの**意味が直接読める表現**へ置き換わってよく、その場合も本書の役割契約が優先されます。

`ui-footnote` が明示的な role API へ移行した場合、`shared` は互換目的の暫定入力または廃止候補として扱います。本書は boolean の継続採用を要件としません。

### 役割契約

長期契約としての役割は、**primary reference** と **secondary reference** の 2 種です。

- **primary reference** は、同一 `refId` に対する正規の代表参照です
- **secondary reference** は、同一 `refId` を追加で指す追従参照です
- secondary reference は本文所有権を持ちません
- secondary reference は、同一 scope 内に primary reference または同等の上位脚注データが存在する場合にのみ成立します

現行公開入力の `shared=false` は primary reference、`shared=true` は secondary reference を表す**暫定表現**とします。

### primary reference 一意性契約

同一 footnote scope・同一 `refId` に対して、**意味上の primary reference は 1 つだけ** 定義されなければなりません（MUST）。

ただし、この一意性は **DOM 上に必ず 1 個の owner 実体が存在すること** までを強制しません。

長期契約として一意でなければならないのは、次のどちらかです。

1. 同一 scope 内に primary reference が 1 つ存在すること
2. 同一 scope 内に、primary reference と等価な上位 footnote data model が存在すること

したがって、shared popover、部分 Hydration、断片再利用、SSR 再接続などの都合で、表示実体の持ち方が将来変わっても、**論理上の primary reference 一意性**が守られていれば契約違反とはしません。

### 本文入力契約

`ui-footnote` 自体が受け取る本文入力は、**primary reference に対する局所表示断片**に限ります。secondary reference は本文入力を受け取りません。

ただし、長期契約として、脚注本文の**正本**は `ui-footnote` に属しません。正本は **endnote item または上位 footnote data model** に属します。

したがって、`ui-footnote` に与えられる本文断片は、常に次の性質を満たさなければなりません（MUST）。

- 正本から導出された派生表示であること
- endnotes 本文と意味的に一致すること
- `ui-footnote` ごとに独自編集される前提を持たないこと

長期契約として、次の運用には依存しません。

- primary reference ごとに別本文を手で持たせる運用
- endnotes 本文と Popover 本文を別々に管理する運用
- secondary reference へ本文を与える運用

脚注本文の正規入力は、テキスト、インライン要素、段落、リスト、本文内リンクなどの**読書用コンテンツ**です。フォーム要素、複雑な対話 UI、ネストした Popover / Dialog、独自ショートカットを持つ複合 widget などの高い相互作用を持つ要素はサポート対象としません（SHOULD NOT）。

### 配置契約

`ui-footnote` は、本文フロー中の非対話要素内で使用します。次の文脈では使用しません。

- `<a>` の子孫
- `<button>` の子孫
- フォーム操作要素の子孫
- ほかの footnote Popover 本文内での再帰使用
- 脚注一覧側の backlink 本文内での再帰使用

すなわち、`ui-footnote` は**本文用の補助参照要素**であり、別の interactive widget の内部要素としては扱いません。

### 予約構造契約

次の `data-part`・class・slot 名は内部予約語です。利用者は公開入力として直接記述しません。

- `data-part="trigger"`
- `data-part="content"`
- `data-part="popover-host"`
- `.footnote-body`
- `.footnote-popover-footer`
- `.footnote-list-link`
- owner/reference の内部結線に必要な ID 群

これらは SSR / Hydration で上位レンダラが生成し得ますが、公開利用者が手で書いてよい契約には含めません。

### 出力契約

`ui-footnote` は、次の公開出力を持ちます。

- 本文中の脚注参照 trigger
- owner reference の場合に限る関連 Popover
- Popover 内の「脚注一覧で見る」リンク

Trigger は常に `href="#${refId}"` を持つアンカーです。Popover が使える環境でも、リンク先そのものは保持します。

### ID 契約

長期契約では、ID 群は `refId` を主軸として生成します。

| 用途            | 生成規則                    |
| --------------- | --------------------------- |
| endnote item ID | `{refId}`                   |
| trigger ID      | `{refId}-ref-{refInstance}` |
| popover ID      | `{refId}-popover`           |
| popover host ID | `{refId}-popover-host`      |
| label ID        | `{refId}-label`             |

ここで重要なのは、**trigger ID を \*\***\`\`\***\* から生成しない**ことです。表示番号の変更が識別子の変更へ波及しないよう、ID は安定識別子 `refId` に基づかなければなりません（MUST）。

### 正規化契約

`index` と `refInstance` は正の整数でなければなりません。`refId` は空文字列・空白文字列・重複値であってはなりません。

長期契約としては、黙って補完・補正するよりも、**開発時診断で不正入力を表面化**する方を優先します。したがって、無効値の自動救済に依存しません。

### 診断契約

本コンポーネントは、少なくとも開発時に次を診断対象とします。

- `refId` 未指定
- 同一 footnote scope 内での `refId` 重複
- owner reference 不在の secondary reference
- 同一 `refId` 配下での `refInstance` 重複
- secondary reference への本文入力
- interactive ancestor 内での使用
- endnotes 不在
- backlink 不整合
- scope をまたいだ owner/reference 接続
- scope をまたいだ `refId` 解決への依存

本番では読書経路を壊さない範囲で degrade しても構いませんが、開発時は不整合を黙殺しません。

長期契約として、診断は補助機能ではなく、**役割モデル・scope 解決・endnotes 整合を破る入力を早期に表面化するための正規機能**です。利用者機能を増やすことよりも、契約違反を静かに通さないことを優先します。

### 責務範囲

責務範囲には、脚注参照 trigger の生成、Popover 本文の構成、owner/reference の接続、脚注一覧へのリンク保持、必要なアクセシビリティ属性の付与、および最低限の診断を含みます。

一方で、脚注本文の生成元データ管理、採番アルゴリズム、Markdown 変換、URL 同期、履歴管理、スクロール復元は責務に含めません。

---

## 更新契約

`ui-footnote` は、**宣言的入力**と**本文データ**を分けて扱います。

- `refId` / `index` / `refInstance` / 役割の更新は再描画対象です
- 本文の正本更新は上位 footnote data model または endnote item 側の責務です
- DOM 子要素の書き換えは公開更新手段ではありません

したがって、接続後に `ui-footnote` の子ノードを書き換えることで本文更新を行う設計には依存しません。本文更新が必要な場合は、上位データ更新から再構成するか、将来別途定義する専用 API を介します。

この契約により、**属性は宣言的に更新可能**、**本文は正本から再導出**という整理を維持します。

---

## 状態モデル

`ui-footnote` の主要状態は、**owner/reference**、**Popover 可否**、**リンク遷移のみか補助表示も提供できるか**、**フォーカス復帰の文脈**によって読み分けます。

### 1. owner reference 状態

owner reference は、次を持ちます。

- trigger
- 自前の popover host
- 本文断片
- footer link

owner reference は、同一 `refId` に対して 1 つだけ存在します。

### 2. reference 状態

reference は trigger のみを持ちます。自前の Popover 本体を持たず、同一 footnote scope 内の owner reference に接続されます。

### 3. 通常クリック状態

通常クリックとは、主ボタン、修飾キーなし、既に `defaultPrevented` されていない click を指します。

- Popover 利用可能環境では、通常クリックは補助表示として Popover を開けます
- ただし Trigger のリンク性そのものは失いません
- 修飾キー付きクリックや中クリックはリンクとしてのネイティブ動作を維持します

### 4. 非対応環境フォールバック状態

Popover を利用できない環境では、`ui-footnote` はリンクとしてのみ振る舞います。通常クリックでもネイティブリンクを維持し、脚注一覧へ到達できなければなりません（MUST）。

### 5. Footer Link 遷移状態

Popover 内の footer link は、脚注一覧へ移動する明示経路です。footer link による close は、**一覧へ進む close** として扱い、trigger へのフォーカス復帰を要求しません。

### 6. フォーカス状態

Popover が開いている間、active trigger には `aria-expanded="true"` が反映されます。close 後のフォーカス先は、close 理由に応じて次のように固定します。

| close 理由                    | フォーカス先       |
| ----------------------------- | ------------------ |
| `Escape`                      | その trigger       |
| dismiss / outside interaction | その trigger       |
| footer link による遷移        | trigger へ戻さない |

### 7. キーボード遷移契約

`ui-footnote` の trigger は常にネイティブな `<a>` であるため、キーボード契約も**リンクとしての操作モデル**を優先します。

`ui-footnote` は、少なくとも次を保証します。

- `Enter` による trigger 活性化
- `Escape` による Popover close
- footer link 上の `Tab` による読書フロー継続
- 修飾キー付き操作を含むネイティブリンク操作の保持

`Space` については、ネイティブリンクの既定操作を上書きする独自活性化を**必須契約としません**。したがって、長期契約としては `Space` による一律 open / navigate を要求しません。

Popover 利用可能環境における補助表示は、`Enter` または click により成立すれば足ります。リンクとしての意味を崩してまで、ボタン同等の活性化モデルへ寄せることには依存しません。

キーボードモデルは `ui-popover` の一般契約に従属するのではなく、**脚注参照リンクとしての自然さ**と**読書フローの継続性**を優先して固定します。

### 8. Hydration 状態

SSR 済み DOM を再利用する場合でも、Hydration は**内部予約構造の再接続**としてのみ扱います。公開利用者が内部構造を手書きすることを前提にしません。

---

## DOM / Accessibility

`ui-footnote` は Shadow DOM を使用せず、Light DOM に描画します。したがって、文書全体の脚注構造との接続を DOM 上で直接扱えます。

### footnote scope 契約

脚注の primary reference、secondary reference、endnotes、backlinks の解決単位は、**document 全体ではなく footnote scope 単位**です。

footnote scope は、次の条件を満たす **最も近い上位要素 1 つ** によって定義されます。

1. `data-footnote-scope` 属性を持つ要素
2. 上記が存在しない場合、`article`
3. 上記も存在しない場合、`[role="article"]`
4. いずれも存在しない場合、`ui-footnote` を含む最小の note root 相当要素
5. それも存在しない場合に限り、`document` を scope とみなします

長期契約として、scope は**黙示的に推定できるだけでなく、必要な場合は明示的に境界化できること**を前提とします。したがって、`data-footnote-scope` のような明示 scope 境界は正規に採用可能な構成手段です。

同一 scope 内で、次を解決しなければなりません（MUST）。

- primary reference と secondary reference の対応付け
- `refId` 重複の検査
- `refInstance` 重複の検査
- endnote item の解決
- backlink 群の完全性検査

別 scope に属する要素同士は、同じ `refId` を持っていても**相互に接続してはなりません**（MUST NOT）。

同一 `ui-footnote` に対して複数の scope 候補が成立する場合は、**DOM 上で最も近い上位要素**を優先します。これにより、同一 document に複数記事、複数 preview、複数 note root が共存しても、脚注解決は局所に閉じます。

`document` 全体を前提としたグローバル解決は、明示的な scope が構成できない場合の最終フォールバックに限ります。

### owner reference の DOM 契約

```text
<ui-footnote ref-id="fn-11" index="11" ref-instance="1">
  <ui-popover id="fn-11-popover-host" data-part="popover-host" placement="bottom-start">
    <a
      id="fn-11-ref-1"
      data-part="trigger"
      slot="trigger"
      href="#fn-11"
      role="doc-noteref"
      aria-controls="fn-11-popover"
      aria-expanded="false|true"
      aria-details="fn-11-popover"
    >
      <sup>[11]</sup>
    </a>

    <div
      id="fn-11-popover"
      data-part="content"
      slot="content"
      role="note"
      aria-labelledby="fn-11-label"
    >
      <span id="fn-11-label" class="sr-only">脚注 11</span>
      <div class="footnote-body">…本文断片…</div>
      <footer class="footnote-popover-footer">
        <a href="#fn-11" class="footnote-list-link">脚注一覧で見る →</a>
      </footer>
    </div>
  </ui-popover>
</ui-footnote>
```

### reference の DOM 契約

```text
<ui-footnote ref-id="fn-11" index="11" ref-instance="2" shared>
  <a
    id="fn-11-ref-2"
    data-part="trigger"
    href="#fn-11"
    role="doc-noteref"
    aria-controls="fn-11-popover"
    aria-expanded="false|true"
    aria-details="fn-11-popover"
  >
    <sup>[11]</sup>
  </a>
</ui-footnote>
```

### endnotes / backlinks の DOM 契約

末尾脚注一覧は `section.footnotes[role="doc-endnotes"]` とし、各脚注項目は `id="{refId}"` を持ちます。

同一脚注が複数箇所から参照される場合、endnote item は **各 \*\***\`\`\***\* ごとの backlink 群** を持つことを正規とします。代表 1 個の backlink だけに縮約する設計には依存しません。

### Accessibility 契約

- trigger は常にネイティブな `<a>` です
- trigger は `role="doc-noteref"` を持ちます
- Popover 本文は `role="note"` を持ちます
- Popover 本文は `aria-labelledby` によりラベルと結び付きます
- Trigger は `aria-controls` と `aria-details` により関連 Popover を指します
- active 状態は `aria-expanded` で表現します
- 末尾脚注一覧は Hydration 後も非表示化しません（MUST NOT）
- Popover は endnotes の代替ではなく補助経路です

---

## Visual Contract

`ui-footnote` の視覚契約は、本文を主役に保ったまま、脚注参照を **軽く、しかし見失わない強度** で示すことにあります。

### Trigger

Trigger は `inline-flex` で描画し、本文のベースラインに沿って小さく挿入します。文字色は控えめな `--fg-muted` を既定とし、hover / focus-visible 時のみ `--primary` と下線で反応します。

脚注番号の `sup` は親 trigger と同じフォントサイズを継承し、上付きとして表示します。フォントサイズは `max(var(--text-xs), 12px)` で下限を持ち、小さすぎる本文文脈でも参照番号が読めなくならないようにします。

### Popover

Popover は `bottom-start` 配置を既定とし、最大幅は `min(90vw, 400px)`、最大高さは `60vh` を基準とします。本文領域は `overflow-y: auto` とし、長文脚注でも本文面全体を押し流さずに読めることを契約とします。

### 末尾脚注一覧

`section.footnotes` は本文終端の補助情報帯として扱います。上余白、上境界線、`ol` と `li` の整形を持ちます。`li:target` はハイライトを持ち、本文中の参照から移動した後に現在対象が識別できることを契約とします。

### フォーカス表示

Trigger の `:focus-visible` は `outline` と `outline-offset` により描画します。hover と focus-visible はともに色変化と下線を持ちます。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途                       | トークン                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Trigger 既定文字色         | `--fg-muted`                                                                              |
| Hover / Focus 色           | `--primary`                                                                               |
| 本文文字色                 | `--fg-default`                                                                            |
| 末尾脚注境界線             | `--border-default`                                                                        |
| 補助境界線                 | `--border-ghost`                                                                          |
| target 背景                | `--bg-active`                                                                             |
| Popover 背景・前景・境界線 | `ui-popover` 側トークン                                                                   |
| 角丸                       | `--radius-sm`                                                                             |
| 余白                       | `--space-*`                                                                               |
| フォーカスリング           | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| モーション                 | `--duration-fast` / `--duration-instant` / `--ease-out`                                   |
| 文字サイズ                 | `--text-xs` / `--text-sm`                                                                 |
| 行高                       | `--line-height-none` / `--line-height-relaxed`                                            |

---

## 環境別の振る舞い

### Popover 利用可能環境

Popover を利用できる環境では、通常クリックは補助表示として Popover を開けます。ただし Trigger のリンク性そのものは失いません。

### Popover 非対応環境

Popover を利用できない環境では、脚注参照はリンクとしてのネイティブ動作を維持します。通常クリックでも `preventDefault()` を前提にしません。

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、trigger の transition 時間を `--duration-instant` 相当へ落とします。過剰なアニメーションには依存しません。

### Forced Colors

`forced-colors: active` 環境では、trigger 色は `LinkText`、脚注一覧の境界線は `CanvasText` を使用します。独自色だけに依存しません。

### Print

印刷時、trigger は `currentColor` と下線で表現します。脚注一覧は印刷対象として残します。`section.footnotes` を印刷時に非表示にしてはなりません（MUST NOT）。

### SSR / Hydration

Hydration は内部予約構造の再接続です。SSR 由来 DOM を再利用する場合でも、内部制御要素が本文断片に混入してはなりません。

---

## 関連契約

### `ui-popover` 依存境界契約

`ui-footnote` は Popover の表示手段として `ui-popover` を利用できますが、意味契約の主体は `ui-footnote` 側にあります。したがって、`ui-footnote` は**Popover の薄いラッパー**としてではなく、**脚注参照の意味コンポーネント**として扱います。

`ui-popover` に委譲するのは、開閉、位置決め、dismiss、一般的な focus handling などの表示制御です。脚注参照としての意味、backlink 整合、role モデル、scope 整合は `ui-footnote` 側契約です。

### 末尾脚注一覧契約

`ui-footnote` が成立するためには、同一 footnote scope 内に `section.footnotes[role="doc-endnotes"]` が存在し、その内部に `id="{refId}"` を持つ脚注項目が存在しなければなりません（MUST）。

### backlink 完全性契約

同一 `refId` に対して `refInstance` が複数存在する場合、endnote item は各 `refInstance` に対応する backlink 群を持たなければなりません（MUST）。代表 1 個だけの backlink に縮約する場合は、その縮約規則を上位仕様で明示しない限り採用しません。

### scope 解決契約

owner/reference の接続、ID 衝突検査、endnotes 解決は、同一 footnote scope 内で完結します。`document` 全体でのグローバル解決には依存しません。

### 外部制御契約

長期契約として、`ui-footnote` は外部制御 API を前提としません。外部から `open()` / `close()` / `focusTrigger()` を呼ぶ設計には依存しません。必要になった場合は、別途明示的な公開 API として追加します。

### イベント契約

`ui-footnote` 自体は独自公開イベントを必須としません。開閉観測が必要な場合は `ui-popover` 側イベントを利用できますが、意味的な契約は DOM 変化ではなく公開入力とアクセシビリティ属性で解釈します。

---

## 境界条件

### 1. `refId` 未指定

長期契約としては不正入力です。開発時診断対象とします。

### 2. `refId` 重複

不正入力です。owner/reference 解決と endnotes 解決が不安定になるため、文書内で一意でなければなりません（MUST）。

### 3. owner reference 不在の reference

不正入力です。reference 単独では成立しません。

### 4. `refInstance` 重複

同一 `refId` 配下での `refInstance` 重複は不正入力です。backlink 群が曖昧になるためです。

### 5. reference への本文入力

不正入力です。reference は本文所有権を持ちません。

### 6. 接続後の本文差し替え

DOM 子要素を書き換えることによる本文更新には依存しません。本文更新は正本側から再導出します。

### 7. interactive ancestor 内での使用

不正入力です。リンクの入れ子や操作競合を招くためです。

### 8. 長文脚注

長文脚注は Popover 内でスクロールします。本文面全体を押し流す設計には依存しません。

### 9. SSR 済み内部構造の手書き入力

公開入力としては不正です。内部予約構造は上位レンダラ専用です。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、少なくとも次の観点を固定します。

| Story                      | 固定する契約                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `Default`                  | Trigger / Popover / Footer Link / endnotes の基本整合が成立すること                              |
| `VariantStateMatrix`       | owner/reference の役割分担、同一脚注に対する Popover 一意性、active trigger 切替が成立すること   |
| `DualAccessContract`       | 通常クリックは補助表示、修飾キー付きクリック・中クリックはネイティブリンクを維持すること         |
| `KeyboardAndFocusContract` | `Escape`、`Tab`、dismiss に対する close とフォーカス復帰契約が成立すること                       |
| `SsrHydrationContract`     | SSR 由来内部構造の再接続、内部制御要素の本文混入防止、公開入力と内部入力の境界維持が成立すること |
| `BoundaryConditions`       | 不正入力診断、ID 一意性、長文スクロール、interactive ancestor 禁止、更新モデルが成立すること     |
| `VisualModeContracts`      | Reduced Motion / Forced Colors / Print / トークン参照が維持されること                            |

---

## 補足

`ui-footnote` の要点は、単に小さな番号リンクを出すことではありません。**本文中の参照をリンクとして失わず**、**その場確認のための補助表示を持ち**、**最終的な正規参照先として末尾脚注一覧を維持すること**にあります。

したがって、今後の変更でも次の 5 点は崩しません。

1. Trigger は常にネイティブな `<a href="#...">` であること。
2. 脚注本文の正本は 1 つであること。
3. Popover は脚注一覧の代替ではなく補助経路であること。
4. owner/reference の役割は分離されること。
5. 識別子は `refId` を主軸に安定していること。

---

## 現行実装との差分

本節は、現行の `footnote.ts` / `footnote.stories.ts` と、本書で定義した長期契約との差分を整理するものです。

### 1. `refId` の必須性

現行実装は `refId` 未指定時に `index` から代替 ID を生成できます。本契約では `refId` を明示必須として扱います。

### 2. trigger ID の生成規則

現行実装は trigger ID を `index` と `refInstance` から生成します。本契約では `refId` と `refInstance` を主軸に生成します。

### 3. 本文の正本

現行実装では owner reference の子要素や SSR 済み `[data-part="content"]` が実質的な入力ソースになります。本契約では本文正本を endnote item / 上位 footnote data model に固定します。

### 4. `shared` の表現力

現行実装は boolean の `shared` で owner/reference を表現します。本契約では boolean を暫定表現とみなし、意味上は owner/reference の役割モデルを正式契約とします。

### 5. 共有参照の解決スコープ

現行実装は `document.getElementById()` に依存し、解決スコープが document 全体です。本契約では footnote scope 単位での解決を正規とします。

### 6. backlink 完全性

現行 Story では同一脚注への複数参照があっても backlink が代表 1 個に見えるケースがあります。本契約では各 `refInstance` ごとの backlink 群を正規とします。

### 7. 更新モデル

現行実装は接続後に子要素を書き換えても本文再収集しません。本契約でも DOM 子要素差し替えを公開更新手段とはしませんが、本文正本を上位モデルへ寄せる点が異なります。

### 8. 診断

現行実装は `refId` 重複、owner 不在、interactive ancestor などを強制検出しません。本契約では少なくとも開発時診断対象に含めます。

### 9. 内部予約構造

現行 Story は SSR/Hydration 検証のために内部予約構造を入力として与えます。本契約では、それを公開入力ではなく上位レンダラ専用の内部入力と位置付けます。

### 10. 外部制御 API

現行実装も本契約も、外部制御 API は公開していません。ただし本契約では、これを「未整理」ではなく「長期的に非公開」として明示します。

---

## 現行実装を踏まえて契約や機能で未対応のもの

本節は、現行実装を前提にしたとき、**本書の長期契約に対して未対応の事項**、および **追加検討価値はあるが未実装の機能** を分離して整理するものです。ここでは、すでに本文で正規契約として固定した内容のうち、実装がまだ追いついていないもの、または運用・上位生成系の前提に委ねられているものだけを扱います。

### 契約面で未対応のもの

#### 1. `refId` 必須化

本契約では `refId` を必須としますが、現行実装は未指定時に `index` から代替 ID を生成できます。したがって、`refId` 未指定を開発時診断対象とし、暗黙補完へ依存しない状態には未到達です。

#### 2. `refId` 主軸の ID 生成

本契約では trigger ID を `{refId}-ref-{refInstance}` とする前提ですが、現行実装は `index` と `refInstance` から trigger ID を生成します。表示番号変更と識別子変更を分離する設計には未移行です。

#### 3. footnote scope 単位の解決

本契約では owner/reference/endnotes/backlinks の解決を footnote scope 単位で扱いますが、現行実装は `document.getElementById()` に依存し、解決スコープが document 全体です。scope 境界の明示と scope 内限定解決は未対応です。

#### 4. owner/reference 役割 API の明示化

本契約では owner/reference の役割モデルを正式契約としますが、現行実装の公開入力は boolean の `shared` に留まっています。意味が明示された role API への移行は未対応です。

#### 5. 本文正本の一元化

本契約では脚注本文の正本を endnote item または上位 footnote data model に固定しますが、現行実装では owner reference の子要素や SSR 済み `[data-part="content"]` が実質的な入力ソースになります。本文正本を一元管理する構造には未移行です。

#### 6. 各 `refInstance` ごとの backlink 完全性

本契約では複数参照時に各 `refInstance` ごとの backlink 群を正規としますが、現行 Story では代表 1 個の backlink に見える構成が残っています。複数参照と backlink 群の完全対応は未固定です。

#### 7. 開発時診断の実装

本契約では `refId` 重複、owner 不在、`refInstance` 重複、reference への本文入力、interactive ancestor 内使用、endnotes 不整合などを開発時診断対象としますが、現行実装では強制検出していません。診断機構は未対応です。

#### 8. 内部予約構造と公開入力の明確な分離

本契約では `data-part` 付き内部構造を公開入力とみなしませんが、現行 Story では SSR/Hydration 検証のために内部予約構造を入力として与えています。上位レンダラ専用入力としての境界を、実装・文書・Story で完全分離した状態には未到達です。

#### 9. interactive ancestor 禁止の実装保護

本契約では `<a>` や `<button>` などの interactive ancestor 内使用を禁止しますが、現行実装ではその配置を検出して警告・失敗させる仕組みを持ちません。禁止契約はあるものの、実装保護は未対応です。

#### 10. 文言差し替え前提を持たない固定文言契約の整理

現行実装は `脚注 {n}` や `脚注一覧で見る` を固定文言として持ちます。本契約では差し替え機能を追加候補としていますが、現状は固定文言のままであり、文言方針を公開 API 上で整理した状態には未到達です。

#### 11. `index` / `refInstance` の厳格検証

本契約では `index` と `refInstance` を正の整数として扱い、長期的には診断で不正値を表面化する前提ですが、現行実装は `Math.trunc()` と `1` へのフォールバックで黙って救済します。数値入力を厳格に扱う契約には未移行です。

#### 12. `refId` の黙示正規化方針の整理

現行実装は `refId` の前後空白を除去し、内部空白を `-` へ置換します。本契約では `refId` を安定識別子として厳格に扱うため、どこまでを許容し、どこからを診断対象にするかの方針整理が未完了です。

#### 13. Space キー活性化契約

本契約では `Enter` / `Space` / click による trigger 活性化を保証対象として書いていますが、現行実装で `Space` に対する独自ハンドリングは持っていません。owner 側は `ui-popover` とネイティブリンク挙動に依存し、reference 側も click ハンドラ中心です。したがって、Space キー活性化は現時点で明示保証できる状態には未到達です。

#### 14. owner 側デュアルアクセス契約の自立性

reference 側の通常クリック制御は `ui-footnote` 自身が持ちますが、owner 側の通常クリックとリンク fallback の成立は `ui-popover` の trigger スロット処理と `keep-link-fallback` に依存します。本契約では `ui-footnote` を意味主体としていますが、owner 側デュアルアクセス契約を `ui-footnote` 単独で自立的に保証する構造には未到達です。

#### 15. document style のライフサイクル整理

現行実装は `ui-footnote-document-styles` を document head に一度だけ注入し、自動除去しません。これは実装としては成立していますが、scope 単位での共存や style の寿命管理という観点では、グローバル副作用のライフサイクルが整理された状態には未到達です。

### 機能面で未対応のもの

#### 1. footnote scope を明示する機能

追加検討価値が最も高い機能ですが、現行実装は未対応です。scope-id、上位 footnote root 明示、scope 内限定解決、scope 単位衝突検査などは未実装です。

#### 2. `shared` を置き換える明示的な役割 API

`role="owner|reference"`、`variant="owner|reference"`、またはコンポーネント分割のような役割明示 API は未実装です。

#### 3. 開発時診断機能

契約違反を早期に表面化する warning / error 機構は未実装です。

#### 4. 文言差し替え機能

ラベル文言、footer link 文言、formatter などの差し替え口は未実装です。

#### 5. 長文脚注の要約表示モード

`preview-mode="full|excerpt"`、`preview-lines`、要約表示導線などは未実装です。現行は Popover 内スクロールのみです。

#### 6. backlink 群の表示補助

複数参照に対する backlink 一覧生成補助や `refInstance` ごとのラベル整形補助は未実装です。

#### 7. 外部制御 API

`open()`、`close()`、`focusTrigger()` などの外部制御面は未実装です。本契約上も前提とはしませんが、要件が明確になった場合の追加候補としては残ります。

#### 8. scope 単位の style 管理

scope 単位の footnote 解決を長期契約に据えるなら、style も document 全体の単一注入ではなく、少なくとも寿命と影響範囲を整理できる形が望まれます。現行実装は document-level の単一 style 注入のみであり、scope 単位の style 管理は未実装です。

### 未対応事項の優先順位

現行実装を本契約へ寄せる観点での優先順位は次のとおりです。

1. footnote scope 単位の解決
2. `shared` を置き換える役割 API
3. 開発時診断の実装
4. `refId` 主軸の ID 生成への移行
5. 本文正本の一元化
6. backlink 完全性の固定
7. `index` / `refInstance` の厳格検証と `refId` 正規化方針の確定
8. owner 側デュアルアクセス契約の自立化
9. 内部予約構造と公開入力の分離
10. document style / scope style のライフサイクル整理
11. 文言差し替え機能
12. 長文脚注の要約表示モード
13. 外部制御 API

### 備考

この節の目的は、現行実装を否定することではありません。むしろ、**どこまでがすでに契約として整理済みで、どこから先が未対応のまま残っているか** を最下部で明確に分離することにあります。これにより、今後 `footnote.ts` を修正する際に、本文の正規契約を再解釈せず、未対応項目の解消へ直接着手できます。
