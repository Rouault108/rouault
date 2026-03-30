# Translation コンポーネント契約書

## 1. 概要

本書は、`ui-translation` と `TranslationOverlayOrchestrator` の公開契約を定義します。

Rouault の translation は static-first です。常時読める対訳は Markdown 出力の `.translation-static` が担い、`ui-translation` は必要時に開く overlay 専用コンポーネントとして扱います。

---

## 2. 適用範囲

対象:

- `ui-translation` の公開入力
- 開閉 API
- `translation-toggle` イベント
- overlay のアクセシビリティ契約
- document 単位の orchestration

非対象:

- static translation の本文 CSS 詳細
- 翻訳生成品質
- 旧 `render-mode` / intent mode / study mode 契約

---

## 3. 公開契約

### 3.1 入力

| 名前         | 種別                                 | 必須   | 契約                                                                    |
| ------------ | ------------------------------------ | ------ | ----------------------------------------------------------------------- | -------------------------------------------- |
| `original`   | property / attribute                 | いいえ | trigger ラベル。空の場合は `翻訳を表示` にフォールバック                |
| `translated` | property / attribute                 | いいえ | content 本文。空の場合は trigger を disabled にし、content を描画しない |
| `lang`       | property / attribute                 | いいえ | 原文言語。未指定でも描画は継続する                                      |
| `targetLang` | property / attribute (`target-lang`) | いいえ | 訳文言語。空文字は `ja` に正規化する                                    |
| `surface`    | property / attribute                 | いいえ | `popover                                                                | drawer`。不正値は `popover` にフォールバック |
| `open`       | property / attribute                 | いいえ | 開閉状態                                                                |

### 3.1.1 入力意味論

- `ui-translation` が受け取る `original` / `translated` は plain-text 文字列です。
- `ui-translation` は Markdown AST・HTML fragment・structured bilingual content を受け取りません。
- 強調・脚注・リンク・ルビ等を含む構造化対訳は、この component の責務ではありません。
- そのような内容は `translation` family へ流し込まず、別 directive / 別出力契約で扱います。

### 3.2 公開メソッド

- `openTranslation()`
- `closeTranslation()`
- `toggleTranslation()`
- `getTriggerElement()`
- `getContentElement()`

状態変化がない場合は no-op とします。

### 3.3 公開イベント

| 名前                 | detail                               | 契約        |
| -------------------- | ------------------------------------ | ----------- | -------------------------------------------------- |
| `translation-toggle` | `{ open: boolean; surface: 'popover' | 'drawer' }` | 開閉時に `bubbles: true` / `composed: true` で発火 |

旧 `translation-mode-change` と `translation-request-mode-toggle` は公開契約に含めません。

---

## 4. 状態モデル

- `translated` が空なら disabled trigger とし、open できません。
- `surface='popover'` は trigger 近傍の overlay です。
- `surface='drawer'` は画面右側の固定 panel です。
- `Escape` は open 時だけ受理し、close 後に trigger へ focus を返します。
- 開閉は click と API のみで行います。hover / focus auto-open は行いません。

---

## 5. DOM / Accessibility

`ui-translation` は Light DOM を使います。

```html
<ui-translation>
  <span data-part="root">
    <button
      type="button"
      data-part="trigger"
      aria-haspopup="dialog"
      aria-expanded="false"
      aria-controls="translation-uid-1"
      aria-details="translation-uid-1"
    >
      Je pense, donc je suis.
    </button>
    <div
      id="translation-uid-1"
      data-part="content"
      data-surface="popover"
      role="dialog"
      aria-modal="false"
      hidden
    >
      我思う、ゆえに我あり。
    </div>
  </span>
</ui-translation>
```

契約:

- trigger は常に `button`
- overlay content は `role="dialog"` / `aria-modal="false"`
- `aria-expanded` は open と同期
- `aria-controls` と `aria-details` は content id を参照

---

## 6. Orchestration

`TranslationOverlayOrchestrator` は document 単位で open な `ui-translation` を管理します。

契約:

- 同時に open な overlay translation は 1 件まで
- open な要素が 1 件以上あり、その中に `surface='popover'` があるときだけ共有 `scroll` / `resize` listener を購読
- 再配置対象は open な popover のみ
- drawer は再配置しない

旧 localStorage 永続化、global keyboard mode toggle、MutationObserver による集合管理は行いません。

---

## 7. 関連契約

- static translation は `::translation` から `div.translation-static[data-translation-kind="static"]` を出力する
- interactive overlay は `::translation-overlay` から `ui-translation[surface]` を出力する
- いずれも `original` / `translated` の plain-text 2 片のみを契約対象とする
- note 本文では overlay だけが `data-hydration-trigger="visible"` を持つ
- rich bilingual content は `ui-translation` の責務ではなく、別 directive / 別 grammar の責務とする

---

## 8. テスト固定範囲

- click で open / close できること
- `Escape` で close し、trigger に focus を戻すこと
- `translation-toggle.detail.surface` が正しいこと
- 2 つ目の overlay を開くと 1 つ目が閉じること
