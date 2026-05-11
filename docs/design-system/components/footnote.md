# Footnote

## 文書の位置付け

本書は、Rouault の **note 本文における脚注の長期契約**を定義します。

現在の note 本文では、脚注の正本は `ui-footnote` ではありません。正本は次の 2 つです。

- 本文中の参照リンク `a[data-footnote-ref][role="doc-noteref"]`
- 末尾脚注一覧 `section[role="doc-endnotes"]`

Popover は補助表示であり、正本ではありません。Hydration 後の対話機能も `footnote-popover-enhancer` が担い、脚注の意味論や到達性を所有してはなりません。

> 重要: `ui-footnote` は note 本文の最終 DOM 契約ではありません。互換性確認や non-note 面の検討材料として残り得ますが、note 本文の出力契約・CSS 契約・テスト契約は static-first 前提で記述します。

---

## 適用範囲

本書は次を対象とします。

- note 本文での脚注参照 trigger の静的 DOM 契約
- endnotes の静的 DOM 契約
- `primary` / `secondary` の役割モデル
- `footnote-popover-enhancer` の ownership
- JS 無効時を含む到達性契約
- アクセシビリティ契約
- テストで固定すべき観測面

本書は次を対象外とします。

- Markdown 側の採番アルゴリズムそのもの
- エディタ入力 UI
- 脚注本文の執筆支援や編集 UI
- URL 同期、履歴管理、スクロール復元の一般解
- `ui-footnote` Web Component 自体の長期 API 保証

---

## 基本原則

### 原則 1: trigger は常に plain link

脚注参照 trigger は、常に `href="#..."` を持つネイティブなリンクとして存在しなければなりません。

### 原則 2: endnotes が正本

脚注本文の正本は endnotes 側にあり、Popover 本文は endnotes から派生させます。Popover 側が唯一の本文保持面になってはなりません。

### 原則 3: runtime は補助のみ

`footnote-popover-enhancer` は、その場確認のための補助 UI を提供してよいですが、JS 無効時の基本動作を壊してはなりません。

### 原則 4: 役割意味を先に固定

長期契約として固定するのは `shared` のような過渡的 boolean ではなく、**primary reference / secondary reference** の役割意味です。

---

## note 本文の正本 DOM 契約

### 本文参照

note 本文の脚注参照は、次の要素へ正規化します。

```html
<a
  id="fn-3-ref-1"
  href="#fn-3"
  role="doc-noteref"
  data-footnote-ref="true"
  data-footnote-id="fn-3"
  data-footnote-index="3"
  data-footnote-ref-instance="1"
  data-footnote-role="primary"
  data-hydration-key="footnote-popover-enhancer"
  data-hydration-capability="progressive"
  data-hydration-trigger="post-commit"
  aria-label="脚注 3 を開く"
>
  <sup>3</sup>
</a>
```

`data-footnote-role` は少なくとも次を取ります。

- `primary`: その論理脚注への最初の参照
- `secondary`: 2 回目以降の参照

### 末尾脚注一覧

脚注一覧は、少なくとも次の意味論を満たさなければなりません。

```html
<section class="footnotes" role="doc-endnotes">
  <h2 id="footnote-label">脚注</h2>
  <ol>
    <li id="fn-3">
      <p>脚注本文… <a href="#fn-3-ref-1" data-footnote-backref="true">↩</a></p>
    </li>
  </ol>
</section>
```

`section[role="doc-endnotes"]` の見出しテキストは、生成系では `脚注` に正規化します。
この見出しは本文末尾でも可視の `h2#footnote-label` として保持し、TOC では `脚注` として表示されます。
heading permalink は一般見出し契約に従って付与され、`href="#footnote-label"` を向きます。

許容される実装差分は次の範囲に限ります。

- `class` 名
- 補助的な `data-*` 属性
- `li` 内部の細かなラップ要素

一方、次は変えてはなりません。

- `section[role="doc-endnotes"]` が存在すること
- 各脚注項目が `id="{data-footnote-id}"` で解決可能であること
- 本文 trigger が `href="#..."` で endnotes 項目へ到達できること

---

## 役割モデル

### primary reference

`primary reference` は、その論理脚注への最初の参照です。Popover enhancer は primary / secondary を問わず適用してよいですが、長期契約として本文断片の所有者になってはなりません。

### secondary reference

`secondary reference` は、同一脚注への 2 回目以降の参照です。secondary であることは UI 表示差分の根拠になり得ますが、意味論上は常に同一 endnote item を指します。

### `shared` との関係

旧実装や互換レイヤで `shared` が残る場合でも、長期契約は `data-footnote-role="primary|secondary"` で読みます。新規設計・新規テスト・新規文書は `shared` を正規 API として扱いません。

---

## enhancer の ownership

`footnote-popover-enhancer` が所有してよい責務は次に限ります。

- trigger クリック時の Popover 開閉
- active trigger の一時管理
- endnotes 本文の複製による補助表示生成
- Escape / outside click による dismissal
- 補助 UI 内の「脚注一覧で見る」導線の提示

逆に、次は所有してはなりません。

- 脚注本文の正本管理
- 脚注 ID の採番
- 本文参照と endnotes の意味的整合の最終判断
- JS 無効時の基本導線

---

## アクセシビリティ契約

### 必須

- trigger はネイティブリンクでなければなりません
- trigger は `role="doc-noteref"` を持たなければなりません
- endnotes ルートは `role="doc-endnotes"` を持たなければなりません
- trigger テキストは視覚上 `sup` でよいですが、アクセシブルネームは脚注番号を含む説明を持つことが望まれます

### JS 無効時

JS 無効時または Popover API 非対応環境でも、trigger の通常操作で endnotes へ遷移できなければなりません。

### Popover 有効時

補助表示はリンク遷移を置き換えるものではなく、**通常導線に上乗せされる progressive enhancement** として振る舞わなければなりません。

---

## CSS 契約

note 本文の脚注スタイルは、`ui-footnote` selector ではなく、少なくとも次の static selector を正本として記述します。

- `a[data-footnote-ref]`
- `a[data-footnote-ref] > sup`
- `a[data-footnote-ref].is-active-trigger`
- `[data-footnote-popover]`
- `section[role="doc-endnotes"]`

component 側 document style に依存して note 本文を成立させてはなりません。

note 本文の本番正本 CSS は `src/assets/css/main.css` です。`src/components/ui/footnote/footnote.ts` の `DOCUMENT_CSS` は、互換レイヤおよび document CSS 契約の維持のために追随させるものであり、本番面を成立させる主担当として扱ってはなりません。

## endnotes レイアウト契約

endnotes のレイアウト主語は `section[role="doc-endnotes"]` とします。`section.footnotes` は互換 selector として残り得ますが、新規実装・新規文書・新規テストは `section[role="doc-endnotes"]` を正本として扱います。

- 脚注番号は本文左側の marker として扱わなければなりません
- 脚注本文は番号の右側から開始しなければなりません
- 折り返し後の行頭は本文開始位置にそろわなければなりません
- 番号だけが独立行に落ちる見え方を採ってはなりません
- 1 桁番号だけでなく 2 桁番号でも hanging indent が破綻してはなりません

`ol` のレイアウトは `list-style-position: outside` を前提とし、本文開始位置の安定化のため `padding-inline-start` を明示します。`li` 直下ブロックの先頭・末尾余白は、marker と本文の対応関係を崩さないように制御します。

---

## テストで固定すること

### build / projection

- note 最終 DOM に `ui-footnote` が出現しないこと
- `a[data-footnote-ref][role="doc-noteref"]` が出力されること
- `section[role="doc-endnotes"]` が存在すること
- primary / secondary が `data-footnote-role` で識別できること

### browser / hydration

- enhancer 適用後も trigger がリンクであり続けること
- Popover 本文が endnotes 由来であること
- Escape で閉じること
- outside click で閉じること
- JS 無効でも endnotes へ到達できること
- endnotes レイアウト E2E は Chromium に加えて WebKit でも実測されること

---

## 実装メモ

現行実装では `build/rehype/rouault-components.ts` が本文参照を static link へ正規化し、`src/client/post-hydrate/footnote-popover-enhancer.ts` が Popover を付与します。この構成は本書の契約と整合します。

今後 `ui-footnote` を残す場合でも、その用途は Storybook・互換検証・non-note 面に限定して整理するのが妥当です。note 本文の契約書としては、本書の static-first モデルを正本とします。

---

## 脚注構造リンクと本文リンクの分離契約

note 本文では、通常本文リンクと脚注構造リンクを別種のリンクとして扱います。

- 通常本文リンクと脚注本文中の通常 URL は本文テキストリンクであり、通常時から underline を持ちます。
- Popover 本文中の通常 URL も underline と `overflow-wrap: anywhere` を持ちます。
- 脚注参照 `a[data-footnote-ref="true"][role="doc-noteref"]`、脚注 backref `a[data-footnote-backref="true"][role="doc-backlink"]`、runtime Popover / `ui-footnote` 互換 DOM 内の脚注一覧導線は、通常時 underline なし、hover / focus-visible 時 underline ありとします。
- `.footnote-list-link` 単独は note 最終 static HTML に残してはなりません。脚注一覧導線として扱うのは `[data-footnote-popover] .footnote-list-link` と `ui-footnote .footnote-list-link` に限定します。
- `.link-text` は通常リンク utility であり、脚注構造リンクに付けてはなりません。
- 脚注構造リンクは `data-link-kind`、`data-link-surface`、`data-external` を持ってはなりません。

最終 note HTML の footnote marker は canonical 値に固定します。

- `data-footnote-ref` と `data-footnote-backref` の最終値は文字列 `"true"` だけです。
- `.data-footnote-ref` / `.data-footnote-backref` は入力互換 marker であり、最終 HTML には残しません。
- false 相当値は通常リンク扱いにする場合も最終 HTML から削除します。
- 非 canonical truthy 値を入力互換として受け付ける場合も、最終 HTML では `"true"` へ正規化します。

## 脚注 ID と endnotes 構造契約

- `data-footnote-id` は `fn-*` 形式を正本とします。`*` は数値に限定しません。
- `fn-*-ref-*` 形状は footnote definition ID として使ってはなりません。
- `user-content-fn-*` は入力互換として `fn-*` へ正規化します。
- `user-content-fnref-*` は canonical ref id ではなく legacy backref として除去し、実際の ref instance 集合から canonical backref を再生成します。
- footnote ID canonicalizer は `shared/footnotes/footnote-id.ts` の browser-safe helper を正本にします。TypeScript import は `.js` 拡張子付きに統一します。
- canonical footnote ref は `aria-label="脚注 ${data-footnote-index} を開く"`、`a > sup > text`、hydration exact value を持ちます。
- endnotes 内の `h2#footnote-label` は表示される構造見出しであり、permalink / TOC 対象にしません。
- TOC 正本は `tocHeadings` に統一します。
- `prepareTocHtml()` 後、post-normalize 後、`injectNoteContentProfiles()` 後の HTML も `validateNoteContentContracts()` の対象です。
- orphan backref、endnotes-only、参照 0 件の footnote definition は build error です。
