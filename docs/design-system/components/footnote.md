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

* `primary`: その論理脚注への最初の参照
* `secondary`: 2 回目以降の参照

### 末尾脚注一覧

脚注一覧は、少なくとも次の意味論を満たさなければなりません。

```html
<section class="footnotes" role="doc-endnotes">
  <ol>
    <li id="fn-3">
      <p>脚注本文… <a href="#fn-3-ref-1" data-footnote-backref="true">↩</a></p>
    </li>
  </ol>
</section>
```

許容される実装差分は次の範囲に限ります。

* `class` 名
* 補助的な `data-*` 属性
* `li` 内部の細かなラップ要素

一方、次は変えてはなりません。

* `section[role="doc-endnotes"]` が存在すること
* 各脚注項目が `id="{data-footnote-id}"` で解決可能であること
* 本文 trigger が `href="#..."` で endnotes 項目へ到達できること

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

* trigger クリック時の Popover 開閉
* active trigger の一時管理
* endnotes 本文の複製による補助表示生成
* Escape / outside click による dismissal
* 補助 UI 内の「脚注一覧で見る」導線の提示

逆に、次は所有してはなりません。

* 脚注本文の正本管理
* 脚注 ID の採番
* 本文参照と endnotes の意味的整合の最終判断
* JS 無効時の基本導線

---

## アクセシビリティ契約

### 必須

* trigger はネイティブリンクでなければなりません
* trigger は `role="doc-noteref"` を持たなければなりません
* endnotes ルートは `role="doc-endnotes"` を持たなければなりません
* trigger テキストは視覚上 `sup` でよいですが、アクセシブルネームは脚注番号を含む説明を持つことが望まれます

### JS 無効時

JS 無効時または Popover API 非対応環境でも、trigger の通常操作で endnotes へ遷移できなければなりません。

### Popover 有効時

補助表示はリンク遷移を置き換えるものではなく、**通常導線に上乗せされる progressive enhancement** として振る舞わなければなりません。

---

## CSS 契約

note 本文の脚注スタイルは、`ui-footnote` selector ではなく、少なくとも次の static selector を正本として記述します。

* `a[data-footnote-ref]`
* `a[data-footnote-ref] > sup`
* `a[data-footnote-ref].is-active-trigger`
* `[data-footnote-popover]`
* `section[role="doc-endnotes"]`

component 側 document style に依存して note 本文を成立させてはなりません。

---

## テストで固定すること

### build / projection

* note 最終 DOM に `ui-footnote` が出現しないこと
* `a[data-footnote-ref][role="doc-noteref"]` が出力されること
* `section[role="doc-endnotes"]` が存在すること
* primary / secondary が `data-footnote-role` で識別できること

### browser / hydration

* enhancer 適用後も trigger がリンクであり続けること
* Popover 本文が endnotes 由来であること
* Escape で閉じること
* outside click で閉じること
* JS 無効でも endnotes へ到達できること

---

## 実装メモ

現行実装では `build/rehype/rouault-components.ts` が本文参照を static link へ正規化し、`src/client/post-hydrate/footnote-popover-enhancer.ts` が Popover を付与します。この構成は本書の契約と整合します。

今後 `ui-footnote` を残す場合でも、その用途は Storybook・互換検証・non-note 面に限定して整理するのが妥当です。note 本文の契約書としては、本書の static-first モデルを正本とします。