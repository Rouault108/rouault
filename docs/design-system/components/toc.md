# Toc

## 1. 概要

本書は、`ui-toc` の公開契約、状態モデル、アクセシビリティ、視覚契約、および現行実装との差分を整理するものです。

`ui-toc` は、記事内の見出し構造を可視化し、読者が現在地を把握しながら本文を移動するためのコンポーネントです。単に見出し一覧を列挙するのではなく、**現在地をどのように認識させるか**、**見出し階層をどのように正規化して表示するか**、**スクロール起因とクリック起因の状態遷移をどのように扱うか**を公開契約として固定します。

また、`ui-toc` は操作パネルではなく、**周辺視野で現在地を感じさせる計器**として振る舞います。したがって、背景面や常時強い装飾を避けつつ、アクティブ項目、階層差、フォーカス、長文省略、モーション抑制、高コントラスト対応を、**状態契約とトークン契約**によって成立させます。

Rouault における toc は、ナビゲーション要素であると同時に、**本文の没入を壊さずに読みの進行を支えること**を求めます。したがって、本コンポーネントの契約は、移動可能性の明示と、**「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 2. 適用範囲

本書は、`ui-toc` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 正式に固定する設計方針
- 新規で追加を検討する価値がある機能
- 現行実装で未対応または未固定の事項

一方で、本書は次の事項を扱いません。

- 記事本文から見出しを抽出する処理そのもの
- どのレベルの見出しを toc に含めるかという文書生成側の設計
- 本文レイアウト全体と toc 配置のレスポンシブ設計
- 見出し ID の生成規則
- ページ遷移やルーティング全体の設計
- tooltip コンポーネント自体の仕様

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 3. 公開契約

`ui-toc` は、`headers` と `activeId` を公開入力として扱います。出力として、`ui-toc-active-change` カスタムイベントを公開します。内部実装は `nav > ul > li > a` 構造、`IntersectionObserver`、tooltip、および平滑スクロール処理を用いますが、利用者は `ui-toc` を契約単位として扱います。

`headers` は描画の唯一の入力であり、`ui-toc` 自身はクライアント DOM を走査して見出し一覧を生成しません。見出しデータは外部で生成し、`Heading[]` として渡さなければなりません（MUST）。

`activeId` は現在地を示す見出し ID であり、**外部が所有する唯一の真実**として扱います。`ui-toc` 自身は `activeId` を自律的に確定しません。スクロール観測やリンククリックによって次の現在地候補を検出した場合は、`ui-toc-active-change` により**外部へ通知**し、最終的な状態反映は利用者が `activeId` を更新することで行います。

`headers` の各要素は、少なくとも `id`、`text`、`level` を持たなければなりません（MUST）。`id` は本文内の見出し要素の `id` と一致していなければなりません（MUST）。一致しない場合、その見出しはリンクとしては描画されても、監視対象としては機能しません。

### 3.1 入力契約

| 名前       | 種別                 | 必須   | 内容                   | 契約                                                                    |
| ---------- | -------------------- | ------ | ---------------------- | ----------------------------------------------------------------------- |
| `headers`  | property             | はい   | 見出しデータ配列       | `Heading[]`。描画の唯一のソースであり、immutable input として扱います。 |
| `activeId` | property / attribute | いいえ | 現在アクティブな見出し | `string`。属性名は `active-id`、既定値は空文字列です。                  |

### 3.2 `Heading` 契約

| 名前    | 型       | 必須 | 内容                         |
| ------- | -------- | ---- | ---------------------------- |
| `id`    | `string` | はい | 見出し要素の一意識別子       |
| `text`  | `string` | はい | toc 上に表示する見出し文字列 |
| `level` | `number` | はい | 見出しレベル。通常は 1〜6    |

`Heading` は見出し一覧の公開データモデルであり、利用者は次を満たさなければなりません（MUST）。

- `id` は空文字列であってはなりません。
- `id` は `headers` 内で重複してはなりません。
- `id` は本文 DOM 内の見出し要素の `id` と 1 対 1 で対応しなければなりません。
- `id` は HTML `id` および URL fragment としてそのまま使用可能な文字列でなければなりません。
- `text` は表示用ラベルであり、空文字列を正規入力として扱いません。
- `level` は整数値であり、通常入力は 1〜6 を想定します。
- `headers` の順序は本文内の見出し順と一致しなければなりません。

`level` は表示階層の算出に使用します。表示上は `headers` 内の最小レベルを基準に相対正規化します。たとえば H2 と H3 を含む配列では、H2 を 0、H3 を 1 として扱います。

契約上、`ui-toc` は不正な `Heading` をそのまま受理してはなりません。長期運用では、**不正項目を描画対象から除外し、開発時には warning により検出可能にする**方針を採ります。本番時に全体描画を停止することは契約に含めません。

### 3.3 出力イベント契約

`ui-toc` は、**次にアクティブとみなすべき見出し候補**を検出したときに `ui-toc-active-change` を発火します。これは内部状態の確定通知ではなく、外部へ渡す**現在地変更要求 / 提案通知**です。

| 名前                   | 種別        | detail 型                 | 契約                                             |
| ---------------------- | ----------- | ------------------------- | ------------------------------------------------ |
| `ui-toc-active-change` | CustomEvent | `UiTocActiveChangeDetail` | `bubbles: true`、`composed: true` で発火します。 |

`detail` の内容は次のとおりです。

| 名前     | 型                    | 内容                                                       |
| -------- | --------------------- | ---------------------------------------------------------- |
| `id`     | `string`              | 次にアクティブとすべき見出し ID                            |
| `source` | `'scroll' \| 'click'` | 提案の原因。意味上の原因であり、視覚効果名ではありません。 |
| `index`  | `number`              | `headers` 配列中のインデックス                             |
| `total`  | `number`              | `headers` の総件数                                         |

`index` は `id` が `headers` に一致しない場合、`-1` になり得ます。利用者は `index >= 0` を前提にしてはなりません（MUST NOT）。

本イベントは **「現在地候補の通知」** であり、`headers` 構造変化通知ではありません。したがって、次の条件では発火しません。

- 外部から `activeId` を再代入した場合
- `headers` のみが変化し、現在地候補の再提案が発生していない場合
- 省略表示状態や tooltip 有効状態だけが変化した場合

利用者は、`index` と `total` を提案時点のスナップショットとして扱わなければなりません（MUST）。

### 3.4 `activeId` の所有権と副作用契約

`activeId` は外部が所有する controlled property です。`ui-toc` は `activeId` を観測して表示を更新しますが、自律的にその値を確定しません。

外部から `activeId` を設定した場合、次を契約として固定します。

- `ui-toc` はその値に従って表示だけを更新します。
- 本文スクロールは発生しません。
- URL ハッシュは更新しません。
- 外部設定それ自体を理由に `ui-toc-active-change` は発火しません。
- toc 内部のアクティブ項目可視化同期は行います。

したがって、外部からの `activeId` 更新は、**確定済み現在地の反映**であり、**移動要求や副作用実行**ではありません。

### 3.5 属性反映契約

| property   | attribute   | reflect | 備考                              |
| ---------- | ----------- | ------- | --------------------------------- |
| `activeId` | `active-id` | あり    | 空文字列を許容します。            |
| `headers`  | なし        | なし    | property 経由でのみ受け取ります。 |

`headers` は配列入力であり、HTML 属性文字列からの構築は契約に含みません。利用者は property で渡します。

### 3.6 スロット契約

`ui-toc` は公開スロットを持ちません。見出しラベル、インジケーター、tooltip などの描画要素はすべて内部で構成します。

### 3.7 公開メソッド

現時点で、`ui-toc` は追加の公開メソッドを持ちません。スクロール制御や現在地同期は内部で完結します。利用者は Shadow DOM 内部を探索して直接操作してはなりません（MUST NOT）。

### 3.8 責務範囲

責務範囲には、見出し一覧の描画、相対階層の正規化、現在地の視覚表示、クリックによるアンカー移動、現在地変更イベントの通知、長文省略時の tooltip 有効化、Reduced Motion / Forced Colors への適応を含みます。

一方で、見出しデータの抽出、記事本文側の `scroll-margin-top` 設計、ルーターとの同期、ページ全体のレイアウト確定、tooltip 文言の多言語化は責務に含めません。

---

## 4. 状態モデル

`ui-toc` の主要状態は、**有効な見出し集合を持つか**、**外部から確定済みの **``** が与えられているか**、**各項目が省略表示されているか**、**現在地候補を外部へ提案すべき状況か**によって読み分けます。

### 4.1 基本状態

最小状態は、`headers` に 1 件以上の見出しを持ち、`activeId` が空または未一致である状態です。この状態では、すべてのリンクは非アクティブとして表示されます。

### 4.2 空状態

`headers` が空配列の場合、`ui-toc` は何も描画しません。`nav` 要素も生成しません。空の枠やプレースホルダは契約に含みません。

### 4.3 アクティブ状態

`activeId` が `headers` 中のいずれかの `id` と一致する場合、そのリンクのみをアクティブとして扱います。アクティブ項目には `aria-current="location"` を付与し、テキスト色を変更し、インジケーターを表示します。

複数のアクティブ項目は許容しません。利用者は単一現在地モデルを前提に扱います。

### 4.4 現在地候補提案状態

本文のスクロール観測または有効なリンククリックにより、次の現在地候補が決まった場合、`ui-toc` は `ui-toc-active-change` を発火します。この時点では、`activeId` が外部から更新されるまでは表示上の確定状態は変わりません。

### 4.5 省略表示状態

長文見出しは、**正規化後レベル**に応じて省略表示へ切り替わります。

| 条件                        | 表示契約                                  |
| --------------------------- | ----------------------------------------- |
| 正規化後レベル 0 の項目     | 最大 2 行まで表示し、超過分を省略します。 |
| 正規化後レベル 1 以上の項目 | 1 行 ellipsis で省略します。              |
| アクティブ項目              | 省略規則を変えません。                    |

### 4.6 tooltip 有効状態

見出しラベルが省略表示されている場合にのみ tooltip を有効にします。アクティブ / 非アクティブによって tooltip の可否は変えません。

ただし、省略判定と tooltip 有効化は初回描画と完全同期ではありません。これらはレイアウト計測後に収束する状態であり、表示直後や hidden container からの表示切り替え直後には 1〜2 フレーム遅れて確定し得ます。利用者は tooltip の有効 / 無効を初回同期描画のみで断定してはなりません（MUST NOT）。

### 4.7 自動追従状態

アクティブ項目が toc 自身のスクロール可視範囲から外れた場合のみ、最小移動で再表示位置へ戻します。可視範囲内にある場合は自動スクロールしません。

---

## 5. DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に `nav` を持ち、その中に `ul > li > a` 構造を形成します。各リンクは内部的に tooltip ホストでラップされます。

```text
<ui-toc>
  #shadow-root
    <nav aria-label="Table of Contents">
      <ul>
        <li style="--level: ...">
          <ui-tooltip class="toc-tooltip">
            <a class="toc-link ..." href="#id" aria-current="location?">
              <span class="toc-link-label">...</span>
            </a>
          </ui-tooltip>
        </li>
      </ul>
    </nav>
</ui-toc>
```

### 5.1 Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- ランドマークは `nav` です。
- `nav` の `aria-label` は `Table of Contents` です。
- 各項目はネイティブ `<a>` により構成します。
- アクティブ項目にのみ `aria-current="location"` を付与します。
- 非アクティブ項目には `aria-current` を出力しません。
- キーボード移動はネイティブリンクの Tab 順に従います。
- roving tabindex は採用しません。
- フォーカス可視表示は `:focus-visible` を用います。

本コンポーネントで重要なのは、**toc を独自の role ベース部品にせず、意味論上は nav 内のリンク一覧として維持すること**です。`div[role="link"]` や独自キーボード制御には依存しません。

### 5.2 アクティブ項目の意味契約

`aria-current` は `page` ではなく `location` を使用します。これはページ遷移先ではなく、同一文書内の現在位置を表現するためです。利用者はこの値を前提にアクセシビリティテストを組めます。

### 5.3 タッチターゲット契約

各リンクは、coarse pointer 環境で **44px 以上の実効タッチターゲット** を持たなければなりません（MUST）。fine pointer 環境では視覚密度を保つために見た目上より小さく見えてもかまいませんが、キーボードフォーカス可能域とポインター到達域を含めた実効ターゲットは 44px を下回らない方針を正式契約とします。

---

## 6. Visual Contract

`ui-toc` の視覚契約は、現在地と階層差を**静かな文字色差、インデント、アクティブインジケーター**として表現することにあります。

### 6.1 情報順位

- アクティブ項目は `--primary` を用いて現在地として見せます。
- 非アクティブ項目は `--fg-muted` を用いて背景化します。
- hover 時のみ `--fg-default` へ寄せ、移動可能性を示します。
- インデントはレベル差を示しますが、インジケーター自体の基準線は固定します。

本文近傍に置かれる toc は、本文や見出しより強く主張してはなりません。したがって、背景面、常時境界線、広い塗り面、持続的アニメーションには依存しません。

### 6.2 レイアウト

ルートは block です。リンクは `display: flex` で、左側にインジケーター列、右側にラベル列を持ちます。階層によるインデントはラベル側で表現し、アクティブ時でもインジケーターの X 座標は変えません。

この契約により、H2 と H4 が同じ現在地列を共有し、階層差があっても現在地視認の基準がぶれません。

### 6.3 階層正規化

表示上の階層は `headers` 内の最小 `level` を基準に相対値へ正規化します。したがって、H3 のみの配列でも全項目は `level: 0` として表示されます。一方で、H1・H3・H5 のような歯抜け入力は圧縮せず、その差分をそのまま反映します。

つまり、正規化は**最小値起点の平行移動**であり、**連続レベルへの再マッピング**ではありません。

### 6.4 省略表示

長文見出しは、表示上の一貫性を優先し、**正規化後レベル**に基づいて処理します。

- 正規化後レベル 0: 2 行 clamp
- 正規化後レベル 1 以上: 1 行 ellipsis
- アクティブ項目でも省略規則は変えません

この契約により、本文読書中にアクティブ項目の切り替えで toc 全体の高さが大きく揺れないことを優先します。

### 6.5 tooltip 表示

tooltip は、**省略が起きている項目**にのみ出します。アクティブ項目も省略されている場合は tooltip を利用可能とします。これは、レイアウト安定性を維持しつつ全文参照手段を失わないためです。

### 6.6 フォーカス表示

フォーカスリングは `outline` と `outline-offset` により描画します。box-shadow 依存のフォーカス表示にはしません。読書文脈での過度な主張を避けつつ、キーボード操作時の可視性を確保します。

### 6.7 アクティブインジケーター

アクティブインジケーターは `::before` により描画します。通常フローに参加する細い pill 形状であり、絶対配置に依存しません。scroll 起因では即時反映、click 起因では短いフェードインを行います。

### 6.8 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途                         | トークン                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| 非アクティブ文字色           | `--fg-muted`                                                                                |
| hover 文字色                 | `--fg-default`                                                                              |
| アクティブ文字色             | `--primary`                                                                                 |
| フォントサイズ               | `--text-base`                                                                               |
| 垂直余白                     | `--space-1`                                                                                 |
| 階層インデント単位           | `--space-2`                                                                                 |
| 左側基準余白                 | `--space-3`                                                                                 |
| インジケーター幅             | `--border-width-thick`                                                                      |
| インジケーター角丸           | `--radius-full`                                                                             |
| リンク角丸                   | `--radius-sm`                                                                               |
| クリック起因フェード時間     | `--duration-fast`                                                                           |
| スクロールアニメーション上限 | `--duration-slower`                                                                         |
| イージング                   | `--ease-out`                                                                                |
| フォーカスリング             | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--focus-ring-radius` |
| フォーカスアニメーション     | `--animation-focus`                                                                         |
| スクロールオフセット補正     | `--header-height`                                                                           |

---

## 7. 環境別の振る舞い

### 7.1 Reduced Motion

`prefers-reduced-motion: reduce` 環境では、hover transition と click 起因フェードインを実質瞬時化します。スクロール先移動もアニメーションせず即時移動します。

### 7.2 Forced Colors

`forced-colors: active` 環境では、文字色を `GrayText` / `CanvasText` / `Highlight` へマッピングします。アクティブインジケーターは背景塗りではなく `border` に切り替え、システム高コントラスト下でも現在地を維持します。

### 7.3 Coarse Pointer

`hover: none` かつ `pointer: coarse` では、隣接項目間に最小限の縦余白を追加し、誤タップ耐性を高めます。これは viewport 幅ではなく入力方式で判定します。

### 7.4 Dark Mode

ダークモード専用の分岐スタイルは現行実装に含みません。色差はトークン差し替えで吸収する前提です。したがって、ダークモード適応はテーマトークン契約に依存します。

### 7.5 Print

印刷専用スタイルは現行実装に含みません。印刷時に toc を表示するか非表示にするかは、上位レイアウト側で制御します。

---

## 8. 関連契約

### 8.1 本文見出しとの関連付け契約

`ui-toc` は、`headers[].id` に対応する要素を `document.getElementById()` で参照します。したがって、本文側の見出し要素は文書全体で一意の `id` を持たなければなりません（MUST）。

同一 `id` が複数存在する構成、または `headers` にのみ存在して本文に存在しない `id` はサポート対象外です。

### 8.2 現在地更新契約

現在地更新は `IntersectionObserver` に依存します。現在地候補は、**観測オフセットに最も近い直前見出し**を優先して決定します。すなわち、観測オフセットより上側で最も近い見出しを第一候補とし、該当がない場合に限って観測領域内で最も近い後続見出しを候補とします。

したがって、現在地判定は単なる `headers` 配列先頭一致ではなく、**読者が現在読んでいる文脈に最も近い見出し**を基準にします。利用者は本文実体の順序と `headers` の順序を一致させなければなりません（MUST）。

また、現在地判定に用いる観測オフセットは、クリック移動時の着地オフセットと意味上一貫していなければなりません。利用者が `--header-height` を調整する場合、**現在地判定だけ**または**クリック着地だけ**を別基準にする設計は想定しません。可視見出しが一時的に 0 件であっても、現在地はこの規則に従って直前見出しへ解決します。

### 8.3 クリック移動契約

リンククリック時、`ui-toc` はネイティブアンカージャンプをそのまま使わず、次の契約で動作します。

- デフォルトのアンカー遷移はキャンセルします。
- 対象見出し要素が存在する場合に限り、`ui-toc-active-change` を `source='click'` で発火します。
- 対象見出し要素が存在する場合に限り、URL ハッシュを更新します。
- URL 更新は同一 hash への重複 `push` を行いません。
- `--header-height` と固定余白を加味して平滑スクロールします。
- クリック中は Observer を一時停止します。

対象見出し要素が存在しない場合、`ui-toc` は state change、URL 更新、イベント発火のいずれも行いません。scroll 起因の現在地更新と、外部からの `activeId` 更新も URL を変更しません。利用者は、**URL 更新は有効なクリック移動時の副作用**であり、**現在地同期全般の副作用ではない**ものとして扱わなければなりません（MUST）。

また、利用者はこの動作を前提に、本文見出し側で追加のスクロール補正を二重に行わない方がよいです。

### 8.4 自動追従契約

アクティブ項目が toc 内のスクロールコンテナ外に出た場合のみ、`scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' })` 相当で最小スクロールを行います。常時センタリングや強制追従は行いません。

スクロールコンテナは、toc ルートから合成木親方向へたどり、最初に見つかった実スクロール可能祖先を採用します。複数のスクロール祖先が存在する場合でも、すべてを同時制御することは契約に含みません。可視判定には実装上の微小許容差を持ち得るため、境界ぎりぎりで即時に追従しない場合がありますが、これは最小移動優先の範囲内です。

### 8.5 tooltip 連携契約

tooltip は `ui-tooltip` に依存しますが、`ui-toc` が公開するのは「省略時のみ有効化する」という契約までです。tooltip の表示遅延、ポータル戦略、衝突回避などは tooltip 側責務です。

ただし、`ui-toc` は次の最小依存を前提にします。

- `ui-tooltip` は text ベースの内容表示に対応すること
- `disabled` の動的切り替えに対応すること
- tooltip が表示不能でもリンクナビゲーション自体は成立すること

また、省略判定はレイアウト計測後に確定するため、tooltip の有効 / 無効も描画直後に遅延確定し得ます。

### 8.6 スタイル拡張契約

`ui-toc` は `::part(...)` を公開しません。外部から調整可能な拡張面は CSS Custom Properties のみです。利用者は内部 class 名、Shadow DOM 構造、`ui-tooltip` 内部構造に依存してはなりません（MUST NOT）。

---

## 9. 境界条件

### 9.1 `headers` が空

何も描画しません。`nav` も生成しません。

### 9.2 見出しが 1 件

1 件のみでも正常に描画し、正規化レベルは 0 になります。`activeId` が一致すればその 1 件がアクティブです。

### 9.3 `activeId` が未一致

`headers` に存在しない `activeId` を与えた場合、どのリンクもアクティブになりません。コンポーネント自体は正常に描画を継続します。`ui-toc-active-change` の `index` は `-1` になり得ます。

### 9.4 H3 のみ

最小レベルが 3 であっても、それを基準に相対階層 0 として表示します。H2 の存在は前提にしません。

### 9.5 歯抜けレベル

H1・H3・H5 のような歯抜け入力では、相対階層は 0・2・4 となります。レベル差を圧縮しません。したがって、インデント差が大きくなり得ます。

### 9.6 長い見出しテキスト

省略規則は正規化後レベルに従います。省略が生じた場合のみ tooltip を有効化します。アクティブ項目であっても全文展開は行わず、レイアウト安定を優先します。

### 9.7 本文見出し要素が存在しない

`headers` に記載された `id` の本文要素が見つからない場合、その項目は Observer による現在地判定対象になりません。クリック時も移動、URL 更新、イベント発火は成立しません。

### 9.8 `activeId` の外部変更

外部から `activeId` を直接変更した場合、`ui-toc` はその値に従って表示だけを更新します。追加のイベント発火、本文スクロール、URL 更新は行いません。

### 9.9 toc 自体がスクロールコンテナ外

内部アクティブ追従は、親要素のうち実際に縦スクロール可能なコンテナが見つかった場合にのみ働きます。スクロールコンテナが存在しない場合、自動追従は行いません。

### 9.10 `headers` が不正入力

重複 `id`、空の `text`、整数でない `level`、本文順と一致しない配列順はサポート対象外です。現行実装はこれらを実行時に補正しません。

---

## 10. Storybook 契約

各 Story は見本ではなく、**公開契約を壊していないことを検証するための固定観点**として扱います。したがって、Story 名は表示バリエーションではなく、**何の契約を守るための確認点か**が明確になるように構成します。

### 10.1 Storybook 構成方針

Storybook は次の 4 群で構成します。

1. **公開 API 契約**: `headers` / `activeId` / `ui-toc-active-change` の意味を固定する
2. **表示契約**: 階層正規化、省略規則、レイアウト安定、色差、フォーカスを固定する
3. **副作用契約**: クリック、URL、scroll、auto-scroll の境界を固定する
4. **境界条件 / 異常系契約**: 空入力、不一致 ID、欠落ターゲット、不正入力の扱いを固定する

### 10.2 必須 Story 一覧

| Story                                     | 固定する契約                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `DefaultStructure`                        | `nav[aria-label="Table of Contents"]` と `ul > li > a` の構造を持ち、公開スロットや独自 role を持たないこと。                          |
| `ControlledActiveId`                      | `activeId` は外部入力でのみ確定し、与えた値に一致する単一項目にのみ `aria-current="location"` が付与されること。                       |
| `ExternalActiveIdNoSideEffect`            | 外部から `activeId` を変更しても `ui-toc-active-change`、本文スクロール、URL 更新が発生しないこと。                                    |
| `ProposalEventFromClick`                  | 有効なリンククリックで `ui-toc-active-change` が `source='click'` で発火し、親が `activeId` を更新したときにのみ表示が切り替わること。 |
| `ProposalEventFromScroll`                 | スクロール観測により現在地候補が変わると `ui-toc-active-change` が `source='scroll'` で発火すること。                                  |
| `ProposalEventPayload`                    | `detail.id` / `detail.source` / `detail.index` / `detail.total` が契約どおりの意味を持ち、構造変化通知ではないこと。                   |
| `NoEventOnExternalReassign`               | 同じ `activeId` の再代入や外部からの反映自体では提案イベントが発火しないこと。                                                         |
| `NearestPreviousResolution`               | 現在地候補が「観測オフセット直前の見出し優先」で決まること。                                                                           |
| `NoVisibleHeadingFallsBackToPrevious`     | 可視見出しが一時的に 0 件でも、現在地候補が直前見出しへ解決されること。                                                                |
| `ValidClickOnly`                          | ターゲット見出し要素が存在する場合に限り、クリック由来の提案イベントと副作用が成立すること。                                           |
| `MissingTargetIsNoOp`                     | ターゲット不在クリックでは、表示・イベント・URL のいずれも変化しないこと。                                                             |
| `NoDuplicateHashPush`                     | 有効クリック時でも同一 hash への重複 `push` を行わないこと。                                                                           |
| `EmptyHeaders`                            | `headers=[]` では何も描画しないこと。                                                                                                  |
| `SingleItem`                              | 1 件のみでも正常に描画できること。                                                                                                     |
| `ActiveIdNotFound`                        | 未一致 `activeId` でも壊れず、アクティブ項目 0 件として表示できること。                                                                |
| `NormalizedLevels`                        | 最小レベル基準の相対正規化が成立し、H3 のみでも level 0 として扱われること。                                                           |
| `SparseLevels`                            | 歯抜けレベルを圧縮せず、差分をそのまま表示に反映すること。                                                                             |
| `IndicatorBaselineStability`              | 深い階層でもアクティブインジケーターの基準線がぶれないこと。                                                                           |
| `LongTextNormalizedClamp`                 | 正規化後レベル 0 は 2 行 clamp、レベル 1 以上は 1 行 ellipsis となること。                                                             |
| `ActiveLayoutStability`                   | アクティブ項目が切り替わっても全文展開せず、toc 全体の高さが大きく揺れないこと。                                                       |
| `TooltipOnTruncation`                     | 省略が生じた項目にのみ tooltip が有効化されること。                                                                                    |
| `TooltipAlsoAvailableForActiveTruncation` | アクティブ項目でも省略中であれば tooltip が利用可能であること。                                                                        |
| `AccessibilityStructure`                  | `aria-current="location"`、ネイティブリンク、`nav` ランドマーク、`focus-visible` が維持されること。                                    |
| `KeyboardAndTouchTarget`                  | roving tabindex を使わず、coarse pointer で 44px 以上の実効タッチターゲットを満たすこと。                                              |
| `ReducedMotionAndForcedColors`            | Reduced Motion / Forced Colors 下でも状態表現が破綻しないこと。                                                                        |
| `DarkModeTokens`                          | テーマ差し替え環境でアクティブ / 非アクティブの色差が保たれること。                                                                    |
| `AutoScrollOnlyWhenOutOfView`             | アクティブ項目が可視範囲内にある限り、自動追従スクロールしないこと。                                                                   |
| `AutoScrollWithNearest`                   | 可視範囲外でのみ `nearest` による最小スクロールを行うこと。                                                                            |
| `InvalidHeadingFiltering`                 | 不正な `Heading` を除外し、少なくとも描画全体を壊さないこと。                                                                          |
| `ImmutableHeadersContract`                | 同一参照の破壊的更新ではなく、再代入によって契約上の更新を行うこと。                                                                   |

### 10.3 Storybook 実装方針

Story は単なる静的見本ではなく、可能なものは `play` 関数で検証します。とくに次の論点は visual diff だけでは不十分であり、DOM・イベント・副作用の確認を必須とします。

- `ui-toc-active-change` の payload
- 外部 `activeId` 更新時の非発火
- ターゲット不在クリックの no-op
- 同一 hash 重複 push 防止
- 44px 実効タッチターゲット
- 省略判定後の tooltip 有効化

### 10.4 `toc.stories.ts` の具体的な再編案

現行の `toc.stories.ts` は、**公開 API の確認**、**表示契約の確認**、**副作用の検証**、**境界条件テスト**が 1 ファイルに混在しています。長期保守を考えると、次のファイル群へ分割した方がよいです。

```text
components/toc/
├─ toc.ts
├─ toc.story-data.ts
├─ toc.story-helpers.ts
├─ toc.api.stories.ts
├─ toc.visual.stories.ts
├─ toc.effects.stories.ts
├─ toc.boundaries.stories.ts
└─ toc.a11y.stories.ts
```

#### 10.4.1 `toc.story-data.ts`

Story 共通で使う固定データだけを置きます。

```ts
export const flatH2Headers: Heading[] = [...];
export const nestedHeaders: Heading[] = [...];
export const deepNestedHeaders: Heading[] = [...];
export const sparseHeaders: Heading[] = [...];
export const longTextHeaders: Heading[] = [...];
export const invalidHeaders: Heading[] = [...];
```

ここには Story を書かず、**Story の前提データのみ**を管理します。

#### 10.4.2 `toc.story-helpers.ts`

Storybook 専用 helper をここへ隔離します。現行ファイルの helper 群は、このファイルへ移すのがよいです。

- `nextFrame`
- `createStoryRect`
- `setStoryRect`
- `setStoryDimension`
- `getTooltipPanel`
- `getShadowStylesText`

加えて、今後は次の helper を追加した方がよいです。

```ts
export function getToc(canvasElement: HTMLElement, id = 'toc'): Toc;
export function getLinks(toc: Toc): HTMLAnchorElement[];
export function getActiveLink(toc: Toc): HTMLAnchorElement | null;
export async function waitForTruncationSettlement(): Promise<void>;
export function installHeadingRects(map: Record<string, StoryRectInit>): void;
export function spyOnHashPush(): { calls: string[]; restore: () => void };
```

helper を分離する目的は、**Story ごとに同じ低レベル DOM 操作を書かないこと**です。

#### 10.4.3 `toc.api.stories.ts`

公開 API 契約と controlled / proposal モデルの確認だけを置きます。推奨 export は次のとおりです。

```ts
export const DefaultStructure;
export const ControlledActiveId;
export const ExternalActiveIdNoSideEffect;
export const ProposalEventFromClick;
export const ProposalEventFromScroll;
export const ProposalEventPayload;
export const NoEventOnExternalReassign;
export const ImmutableHeadersContract;
```

このファイルでは、**視覚差の確認よりもイベントと state ownership の確認**を優先します。各 Story の `play` では、次を重点検証します。

- `aria-current="location"` の付与対象
- `ui-toc-active-change` の発火 / 非発火
- `detail.id` / `detail.source` / `detail.index` / `detail.total`
- 外部 `activeId` 更新時に副作用が走らないこと
- `headers` 再代入でのみ契約上の更新が起きること

#### 10.4.4 `toc.visual.stories.ts`

表示契約と視覚安定性だけを置きます。推奨 export は次のとおりです。

```ts
export const NormalizedLevels;
export const SparseLevels;
export const IndicatorBaselineStability;
export const LongTextNormalizedClamp;
export const ActiveLayoutStability;
export const TooltipOnTruncation;
export const TooltipAlsoAvailableForActiveTruncation;
export const DarkModeTokens;
```

このファイルでは、**状態意味ではなく見た目の固定**を行います。`play` では、次を重点検証します。

- `li` の `--level` 値
- padding / indicator 列の安定
- clamp / ellipsis の適用
- active 切り替えで高さが大きく変化しないこと
- tooltip の `disabled` 切り替え
- ダークテーマでの色差

#### 10.4.5 `toc.effects.stories.ts`

本文移動・URL・auto-scroll などの副作用境界だけを置きます。推奨 export は次のとおりです。

```ts
export const NearestPreviousResolution;
export const NoVisibleHeadingFallsBackToPrevious;
export const ValidClickOnly;
export const MissingTargetIsNoOp;
export const NoDuplicateHashPush;
export const AutoScrollOnlyWhenOutOfView;
export const AutoScrollWithNearest;
```

ここでは、**クリックとスクロールの副作用境界**を固定します。`play` では、次を重点検証します。

- 有効クリック時だけ proposal event が出ること
- ターゲット不在クリックで no-op になること
- hash 更新の発火条件
- 同一 hash への重複 `push` が抑止されること
- 可視範囲内では auto-scroll しないこと
- 可視範囲外で `nearest` 相当の最小追従になること

#### 10.4.6 `toc.boundaries.stories.ts`

空入力・単一入力・不正入力など、構造上の境界条件だけを置きます。推奨 export は次のとおりです。

```ts
export const EmptyHeaders;
export const SingleItem;
export const ActiveIdNotFound;
export const InvalidHeadingFiltering;
```

境界条件は、表示 Story や API Story に混ぜず、**壊れないことだけを確認する Story**として分離した方が見通しがよいです。

#### 10.4.7 `toc.a11y.stories.ts`

アクセシビリティと環境適応だけを置きます。推奨 export は次のとおりです。

```ts
export const AccessibilityStructure;
export const KeyboardAndTouchTarget;
export const ReducedMotionAndForcedColors;
```

このファイルでは、意味論、フォーカス、touch target、環境別適応を固定します。

### 10.5 `Meta` の置き場所

`Meta` は 1 か所に集約した方がよいため、`toc.api.stories.ts` に canonical な `meta` を置き、他ファイルは同じ `title` を共有する構成にします。各ファイルで docs 説明文を重複させず、**コンポーネント説明は 1 か所、各 Story の説明は各ファイルで最小限**にとどめます。

### 10.6 旧 Story から新 Story への移行表

現行 `toc.stories.ts` にある Story は、原則として次のように移します。

| 現行 Story                    | 新 Story                                                                                      | 扱い                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `Default`                     | `DefaultStructure`                                                                            | 改名して `toc.api.stories.ts` へ移動        |
| `WithActiveItem`              | `ControlledActiveId`                                                                          | 改名して `toc.api.stories.ts` へ移動        |
| `Nested`                      | `NormalizedLevels`                                                                            | 改名して `toc.visual.stories.ts` へ移動     |
| `DeepNesting`                 | `IndicatorBaselineStability`                                                                  | 分解し、深い階層確認は visual へ移動        |
| `ActiveFirst`                 | `ControlledActiveId` に統合                                                                   | 単独 Story ではなく args 差し替え候補       |
| `ActiveLast`                  | `ControlledActiveId` に統合                                                                   | 単独 Story ではなく args 差し替え候補       |
| `SingleItem`                  | `SingleItem`                                                                                  | そのまま `toc.boundaries.stories.ts` へ移動 |
| `EmptyHeaders`                | `EmptyHeaders`                                                                                | そのまま `toc.boundaries.stories.ts` へ移動 |
| `OnlySubheadings`             | `NormalizedLevels` に統合                                                                     | H3 only を同 Story の派生 args とする       |
| `SparseLevels`                | `SparseLevels`                                                                                | そのまま `toc.visual.stories.ts` へ移動     |
| `LongText`                    | `LongTextNormalizedClamp` + `TooltipOnTruncation` + `TooltipAlsoAvailableForActiveTruncation` | 3 Story へ分割                              |
| `ClickToActivate`             | `ProposalEventFromClick` + `ValidClickOnly`                                                   | API と effects に分割                       |
| `ActiveIdNotFound`            | `ActiveIdNotFound`                                                                            | そのまま `toc.boundaries.stories.ts` へ移動 |
| `AccessibilityStructure`      | `AccessibilityStructure`                                                                      | そのまま `toc.a11y.stories.ts` へ移動       |
| `KeyboardAndTouchTarget`      | `KeyboardAndTouchTarget`                                                                      | そのまま `toc.a11y.stories.ts` へ移動       |
| `DarkMode`                    | `DarkModeTokens`                                                                              | 改名して `toc.visual.stories.ts` へ移動     |
| `VisualAccessibility`         | `ReducedMotionAndForcedColors`                                                                | a11y 専用に絞って改名                       |
| `AllStates`                   | 廃止                                                                                          | 役割が広すぎるため分割して置換              |
| `AutoScrollOnlyWhenOutOfView` | `AutoScrollOnlyWhenOutOfView`                                                                 | そのまま `toc.effects.stories.ts` へ移動    |
| `AutoScrollWithNearest`       | `AutoScrollWithNearest`                                                                       | そのまま `toc.effects.stories.ts` へ移動    |

### 10.7 1 ファイルに残す場合の最低限の再編順

複数ファイル化をまだ行わない場合でも、`toc.stories.ts` の export 順は少なくとも次の順へ並べ替えた方がよいです。

```ts
// 1. meta / shared args / render helpers
// 2. API contract stories
// 3. visual contract stories
// 4. side-effect stories
// 5. boundary stories
// 6. accessibility stories
```

このとき、Story 間に次のセクションコメントを置くと読みやすくなります。

```ts
// ──────────────────────────────────────────────
// API Contract
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Visual Contract
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Side Effects Contract
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Boundary Conditions
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Accessibility & Environment
// ──────────────────────────────────────────────
```

### 10.8 各 Story に持たせる `play` の責務

`play` が肥大化しないように、Story ごとの責務は次の粒度に固定した方がよいです。

- **1 Story = 1 主要契約** を原則とする
- 1 つの `play` で DOM・イベント・URL・tooltip をすべて確認しない
- 同じ helper を 3 回以上書くなら `toc.story-helpers.ts` へ昇格する
- 見た目確認と副作用確認を同一 Story に混ぜない

### 10.9 実装順序

Story の再編は次の順で進めると壊れにくいです。

1. `toc.story-data.ts` と `toc.story-helpers.ts` を先に抽出する
2. `Default` / `WithActiveItem` を `toc.api.stories.ts` へ移す
3. `Nested` / `DeepNesting` / `LongText` を `toc.visual.stories.ts` へ分解する
4. クリック / スクロール / hash の Story を `toc.effects.stories.ts` へ分離する
5. `SingleItem` / `EmptyHeaders` / `ActiveIdNotFound` を `toc.boundaries.stories.ts` へ集約する
6. a11y 系を `toc.a11y.stories.ts` へ移す
7. 最後に `AllStates` のような総覧 Story を削除または docs 専用へ降格する

### 10.10 旧 Story からの置き換え方針

従来の `WithActiveItem`、`ClickToActivate`、`LongText` のような名前は残してもよいですが、契約確認の粒度が粗い場合は上記の Story 名へ分解した方がよいです。特に controlled `activeId` 契約と提案イベント契約は、1 つの Story にまとめず、**確定状態**と**提案状態**を分離して固定します。

---

## 11. 補足

`ui-toc` の要点は、見出し数や階層数を多く扱えることにあるのではありません。**現在地の把握を本文の没入を壊さない強度で成立させること**にあります。

したがって、今後の変更でも次の 4 点は崩さない方がよいです。

1. 実体は常に `nav` 内のネイティブリンク一覧であること。
2. `headers` を唯一の描画ソースとし、クライアント DOM 解析責務を持ち込まないこと。
3. 現在地表現は `aria-current="location"` と視覚インジケーターの両面で維持すること。
4. 階層差と現在地差を、背景塗りではなく静かな差分で見せること。

---

## 12. 正式に固定する設計方針

本書では、長期的な設計のきれいさと保守性を優先し、次の方針を正式契約として固定します。

1. ``** は controlled property とする。** `ui-toc` は現在地候補を通知するが、自律的に確定しない。
2. ``** は現在地候補通知とする。** これは内部状態確定通知ではなく、親への提案イベントである。
3. **現在地は観測オフセット直前の見出しを優先する。** 単なる `headers` 先頭可視一致は採らない。
4. **有効なクリックのみ副作用を伴う。** ターゲット不在クリックでは、表示・URL・イベントのいずれも変えない。
5. ``** は immutable input とする。** 破壊的更新に依存しない。
6. **不正入力は除外し、開発時 warning を許容する。** 本番で全体描画を止めない。
7. **省略規則は正規化後レベル基準とし、アクティブ時もレイアウト安定を優先する。**
8. **省略されたアクティブ項目でも tooltip を許容する。** 全文参照手段を別経路で維持する。
9. **coarse pointer では 44px の実効タッチターゲットを正式契約とする。**
10. **URL / History 更新は有効なクリック移動時のみ行い、同一 hash の重複 push は行わない。**
11. ``** は document / window 前提の読書用コンポーネントとして扱う。** 汎用スクロール root 対応は現時点の公開契約に含めない。
12. **公開トークンの source of truth は文書・Storybook・実装で一致させる。**

本節に列挙した方針は、前節までの各公開契約へすでに反映済みです。したがって、以後は「曖昧な候補」ではなく、**変更時に守るべき正式方針**として扱います。

---

## 13. 新規で追加を検討する価値がある機能

本節は、現行の公開契約に含まれないが、**読書の没入を壊さずに位置理解・移動性・保守性を補強する**という観点から、追加を検討する価値がある機能を整理するものです。

追加候補は、toc を多機能な操作パネルへ拡張するためではなく、**計器としての静かさを維持したまま、責務境界と再現性を高めるか**で評価します。したがって、ここで価値が高いと判断するのは、検索や折りたたみのような機能追加ではなく、**アクセシビリティの外部化、オフセット責務の明示化、再同期性、スクロール環境の明示化**に近い拡張です。

### 13.1 優先度が高い機能

#### 13.1.1 `label` / `ariaLabel` の外部化

現行の `nav` ラベルは `Table of Contents` 固定です。多言語環境や埋め込み文脈では、アクセシブル名だけを外部指定できる拡張に価値があります。

この機能を追加する場合、次を満たします。

- 可視ラベル追加ではなく、アクセシブル名のみを外部化します。
- 既定値は現行互換のまま維持します。
- 多言語化や文脈依存名称変更を可能にします。
- `nav` の意味論は維持し、構造や role は変えません。

この拡張は、見た目をほとんど変えずにアクセシビリティ適用範囲を広げられるため、費用対効果が高いです。

#### 13.1.2 `offsetTop` の明示入力化

現行では、現在地判定とクリック着地が `--header-height` と固定余白に依存します。振る舞いに効く値を CSS トークンだけで暗黙共有するより、property として明示できる方が責務境界は明快です。

この機能を追加する場合、次を満たします。

- 例として `offsetTop?: number` のような API を採ります。
- 現在地判定オフセットとクリック着地オフセットに同じ値を使います。
- 見た目のトークンと、振る舞いの入力を分離します。
- 既定値は現行と整合する値にします。

これは UI 機能というより、**振る舞い契約の明示化**として価値があります。

#### 13.1.3 `refresh()` / `recompute()` の公開

本コンポーネントは、現在地判定、省略判定、tooltip 有効化がレイアウト確定に依存します。tab、dialog、hidden container、遅延表示レイアウトでは、明示的再同期 API がある方が保守しやすいです。

この機能を追加する場合、次を満たします。

- 見出し抽出責務は持ち込まず、**再観測・再計測**だけを行います。
- `headers` の再生成は上位責務のまま維持します。
- 副作用は最小限にとどめ、必要な再同期のみ実施します。
- controlled `activeId` 契約は崩しません。

これは遅延レンダリングに対する耐性を高める拡張として、有意義です。

### 13.2 条件付きで価値が高い機能

#### 13.2.1 `observeRoot` / `scrollTarget` の外部指定

将来、Rouault が文書全体スクロールだけでなく、パネル内読書や埋め込み読書を扱うなら、本文監視 root やスクロール対象を外部指定できる拡張に価値があります。

この機能を追加する場合、次を満たします。

- 例として `observeRoot?: Element | null`、`scrollTarget?: Window | Element` のような API を採ります。
- `headers` と `activeId` の公開契約は維持します。
- document 前提と container 前提で意味論が分裂しないようにします。
- デフォルトは現行の document / window 前提と互換にします。

ただし、責務が膨らみやすいため、Rouault が本当に複数スクロール文脈を扱う段階になるまで優先度は上げなくてよいです。

#### 13.2.2 レベル圧縮モード

現行は歯抜けレベルをそのまま反映します。文書生成系の事情で H2→H4→H6 のような入力が現実的に多い場合、見た目だけを圧縮するモードに価値があります。

この機能を追加する場合、次を満たします。

- 例として `levelMode?: 'preserve' | 'compress'` を採ります。
- 既定値は現行互換の `preserve` とします。
- 圧縮は表示上のレベルにのみ作用し、`Heading.level` の意味自体は壊しません。
- アクティブインジケーター列の基準線固定契約は維持します。

入力品質が荒い環境では有効ですが、正規入力が保たれるなら必須ではありません。

#### 13.2.3 現在地判定戦略の選択

現行契約では、現在地は観測オフセット直前の見出し優先で決めます。長い節、大きなメディア、注釈の多い文書では、別戦略を選びたい場合があります。

この機能を追加する場合、次を満たします。

- 例として `activeStrategy?: 'nearest-previous' | 'topmost-visible'` を採ります。
- 既定値は現行契約と一致する `nearest-previous` とします。
- `ui-toc-active-change` の意味は変えず、候補選定だけを差し替えます。
- click / scroll の副作用契約は維持します。

汎用性は上がりますが、まずは 1 戦略で十分かを運用で見極めた後に採用判断する方がよいです。

### 13.3 条件付きで検討余地がある機能

#### 13.3.1 弱い進捗表示

たとえば「全 12 項目中 5 番目」のような、控えめな現在地進捗表示です。読書補助として一定の価値はありますが、数字やバーを前面に出すと toc がダッシュボード化しやすいです。

この機能を追加する場合、次を満たします。

- 常時強く見せないこと
- 主に支援技術向け情報や補助的文脈にとどめること
- 主機能を現在地リンク一覧から逸脱させないこと

視覚面へ強く出すのではなく、補助情報として扱う場合に限って検討余地があります。

#### 13.3.2 印刷モードへの明示対応

印刷時に toc を表示するか非表示にするか、あるいは簡略化するかを制御したい場合があります。ただし、これは読書中の UI 改善ではなく、出力レイアウト側の都合です。

この機能を追加する場合、次を満たします。

- できるだけ上位レイアウト責務へ寄せます。
- `@media print` の表示制御にとどめます。
- toc 自体に印刷専用ロジックを大量に持ち込みません。

Rouault の中核価値に直結する機能ではないため、優先度は低いです。

### 13.4 採用しない方がよい機能

次の方向は、読書の没入を壊しやすく、toc の責務も汚しやすいため採りません。

- 本文 DOM を自動走査して見出しを収集すること
- toc 内に折りたたみ、検索、フィルタなど操作パネル責務を持ち込むこと
- 現在地以外の複数選択状態を標準化すること
- 常時強い進捗バーや広い塗り面を追加すること
- ダッシュボード的な統計表示を常設すること

### 13.5 優先順位

実際に追加を検討する場合、優先順位は次のとおりです。

1. `label` / `ariaLabel` の外部化
2. `offsetTop` の明示入力化
3. `refresh()` / `recompute()` の公開
4. `observeRoot` / `scrollTarget` の外部指定
5. レベル圧縮モード
6. 現在地判定戦略の選択
7. 弱い進捗表示
8. 印刷モード対応

### 13.6 本節の位置付け

本節に記載した機能は、現時点の公開契約ではありません。採用する場合は、**公開 API、状態モデル、Storybook 契約、現行実装との差分整理**を同時に更新します。とくに、見た目を増やす機能よりも、**責務境界と再同期性を明確にする機能**を優先するのが、本コンポーネントの設計思想に整合します。

---

## 14. 現行実装で未対応または未固定の事項

本節は、現行の `toc.ts` および `toc.stories.ts` を基準として、**本契約書で正式に固定したが、現時点の実装・Storybook・補助文書がまだ追随していない事項**を整理するものです。

### 14.1 `activeId` の完全 controlled 化

現行実装は `IntersectionObserver` やクリック処理の内部で `activeId` を更新します。本契約書では controlled property として固定したため、実装は提案イベント中心へ再設計する必要があります。

### 14.2 `ui-toc-active-change` の意味変更

現行実装のイベントは内部状態変化通知として使われていますが、本契約書では現在地候補提案イベントとして固定しました。イベント発火条件と payload の意味整理が未対応です。

### 14.3 現在地判定アルゴリズム

現行実装は `headers` 配列順で最初に可視な見出しを選びます。本契約書では観測オフセット直前見出し優先へ固定したため、判定ロジックの変更が必要です。

### 14.4 可視見出し 0 件時の直前見出しフォールバック

本契約書では、可視見出しが一時的に 0 件であっても、現在地は観測オフセット直前の見出しへ解決する方針を正式契約にしています。しかし現行実装は、`_visibleIds` が空のときに新たな現在地解決を行わず、結果として**最後にアクティブだった見出しを保持する挙動**に近くなります。したがって、`NearestPreviousResolution` と対になるフォールバック規則が未実装です。

### 14.5 ターゲット不在クリックの no-op 化

現行実装では表示上のアクティブ状態が先に変わり得ます。本契約書では no-op を正式契約としたため、クリック処理の順序変更が必要です。

### 14.6 `headers` の不正入力に対する除外 / warning

現行実装は、重複 `id`、空 `text`、不正 `level`、および HTML `id` / URL fragment として不適切な `id` を実行時に検証しません。本契約書では不正項目除外と開発時 warning を採用したため、防御実装が未対応です。

### 14.7 省略規則の基準軸

現行実装は生の heading level を基準に clamp / ellipsis を切り替えます。本契約書では正規化後レベル基準に固定したため、スタイルと判定属性の再整理が必要です。

### 14.8 アクティブ項目の全文展開停止

現行実装はアクティブ項目で全文表示へ切り替わります。本契約書ではレイアウト安定優先へ固定したため、スタイル契約が未追随です。

### 14.9 アクティブかつ省略中の項目に対する tooltip 維持

本契約書では、アクティブ項目であっても省略が残る場合は tooltip を利用可能とする方針を正式契約にしています。しかし現行実装は、`headingId === activeId` の条件で active 項目の tooltip を常に無効化します。したがって、**レイアウト安定を優先しつつ全文参照手段を残す**という契約に未追随です。

### 14.10 coarse pointer における 44px 実効タッチターゲット

現行実装が CSS で常時保証している最小値は 24px です。本契約書では 44px を正式契約としたため、実装と Storybook の双方で再検証が必要です。

### 14.11 同一 hash の重複 push 防止

現行実装では有効クリック時の URL 更新はありますが、同一 hash への重複 push 防止が契約どおりかは未固定です。

### 14.12 `toc.ts` の JSDoc / 実装コメントの旧契約

`toc.ts` の冒頭 JSDoc と一部実装コメントは、なお旧前提に依存しています。少なくとも次の点は本契約書と不一致です。

- `activeId` を Observer により自動更新する内部状態として説明していること
- `@cssprop` が `--text-sm` を公開トークンとして記述していること
- 省略規則を生の heading level 基準で説明していること
- アクティブ時の全文展開を前提にした説明が残っていること

これらはコードそのものではなく**補助文書の不整合**ですが、公開契約の source of truth を崩すため、未対応事項として管理すべきです。

### 14.13 `toc.stories.ts` の docs / play の旧契約

現行の `toc.stories.ts` は、契約書で正式に固定した方針へまだ追随していません。少なくとも次の点が不一致です。

- docs 説明が `active-id` の内部自動更新を前提にしていること
- `WithActiveItem` が外部 `activeId` 設定を click 起因表示として扱っていること
- `LongText` が active 時の全文展開と active tooltip 無効化を前提にしていること
- タッチターゲット説明が「モバイル 44px / デスクトップ 24px」の旧記述のままであること
- `ClickToActivate` が controlled / proposal モデルではなく、内部状態即時更新モデルを前提にしていること

これは Storybook 再固定の一部ではありますが、**docs 文面と play の期待値が旧契約のまま残っている**点を明示しておく必要があります。

### 14.14 優先度が高い新規候補機能の未実装

本契約書の「新規で追加を検討する価値がある機能」で優先度を高く置いた項目は、いずれも現行実装にはまだ存在しません。少なくとも次は未実装です。

- `label` / `ariaLabel` の外部化
- `offsetTop` の明示入力化
- `refresh()` / `recompute()` の公開

これらは未採用の将来候補ではありますが、**契約上の拡張方向として正式に整理済みであり、現行実装がまだ対応していない機能群**として追跡対象に含めた方が管理しやすいです。

### 14.15 実行環境前提の未明文化

現行実装は `IntersectionObserver`、`ResizeObserver`、`requestAnimationFrame`、`window.scrollTo`、`document.getElementById()` を前提とする client-side 実装です。しかし、本契約書ではこの**実行環境前提**をまだ独立した公開契約として固定し切れていません。したがって、少なくとも次を今後どこかで明文化する必要があります。

- 本コンポーネントが client-only であること
- 必須ブラウザ API の一覧
- 非対応環境で polyfill または graceful degradation が必要であること

### 14.16 Storybook による再固定

少なくとも次の論点は、新しい Storybook 契約一覧に基づいて再構成する必要があります。

- controlled `activeId` 契約
- 提案イベントとしての `ui-toc-active-change`
- 観測オフセット直前見出し優先の現在地判定
- 可視見出し 0 件時の直前見出しフォールバック
- ターゲット不在クリックの no-op
- 同一 hash の重複 `push` 防止
- 正規化後レベル基準の省略規則
- アクティブ時レイアウト安定
- アクティブ省略項目での tooltip
- 44px 実効タッチターゲット
- 不正 `Heading` の除外
- immutable input としての `headers` 更新

### 14.17 本節の扱い

本節に記載した事項は、正式契約としては確定済みです。したがって、今後は「採用するかどうか」を再議論するのではなく、**実装・Storybook・補助文書をどの順で追随させるか**を管理対象とします。
