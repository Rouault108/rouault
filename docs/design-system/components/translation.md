# Translation コンポーネント契約書

## 1. 概要

本書は、`ui-translation`と`TranslationOverlayOrchestrator`の公開契約を定義します。

Rouaultのtranslationはstatic-firstです。常時読める対訳はMarkdown出力の`.translation-static`が担い、`ui-translation`は必要時に開くoverlay専用コンポーネントとして扱います。

## static-first 境界

`ui-translation`はstateful allowlist componentとして維持します。開閉状態、focus return、overlay positioning、keyboard操作はcomponent / orchestrationが所有し、global CSSは`.translation-static`とpre-hydration fallbackの本文内配置だけを扱います。

note SSRではhostと公開Light DOM fallbackを保持し、hydration registryからcomponentを起動します。hostと公開Light DOM子孫はnote static output検査対象ですが、内部状態とlifecycleは`note-static-surface-enhancer`へ移しません。

---

## 2. 適用範囲

対象:

- `ui-translation`の公開入力
- 開閉API
- `translation-toggle`イベント
- overlayのアクセシビリティ契約
- document単位のorchestration

非対象:

- static translationの本文CSS詳細
- 翻訳生成品質
- 旧`render-mode` / intent mode / study mode契約

---

## 3. 公開契約

### 3.1 入力

| 名前         | 種別                                 | 必須   | 契約                                                              |
| ------------ | ------------------------------------ | ------ | ----------------------------------------------------------------- |
| `original`   | property / attribute                 | いいえ | triggerラベル。空の場合は`翻訳を表示`にフォールバック             |
| `translated` | property / attribute                 | いいえ | content本文。空の場合はtriggerをdisabledにし、contentを描画しない |
| `lang`       | property / attribute                 | いいえ | 原文言語。未指定でも描画は継続する                                |
| `targetLang` | property / attribute (`target-lang`) | いいえ | 訳文言語。空文字は`ja`に正規化する                                |
| `surface`    | property / attribute                 | いいえ | `popover` / `drawer`。不正値は`popover`にフォールバック           |
| `open`       | property / attribute                 | いいえ | 開閉状態                                                          |

### 3.1.1 入力意味論

- `ui-translation`が受け取る`original` / `translated`はplain-text文字列です。
- `ui-translation`はMarkdown AST・HTML fragment・structured bilingual contentを受け取りません。
- 強調・脚注・リンク・ルビ等を含む構造化対訳は、このcomponentの責務ではありません。
- そのような内容は`translation` familyへ流し込まず、別directive / 別出力契約で扱います。
- hostの`open`属性はcomponent API / Storybook / direct HTML compatibilityのためだけに維持します。Markdown `translation-overlay` のauthoring syntaxではありません。

### 3.2 公開メソッド

- `openTranslation()`
- `closeTranslation()`
- `toggleTranslation()`
- `getTriggerElement()`
- `getContentElement()`

状態変化がない場合はno-opとします。

### 3.3 公開イベント

| 名前                 | detail                                              | 契約                                             |
| -------------------- | --------------------------------------------------- | ------------------------------------------------ |
| `translation-toggle` | `{ open: boolean; surface: 'popover' \| 'drawer' }` | 開閉時に`bubbles: true` / `composed: true`で発火 |

旧`translation-mode-change`と`translation-request-mode-toggle`は公開契約に含めません。

---

## 4. 状態モデル

- `translated`が空ならdisabled triggerとし、openできません。
- `surface='popover'`はtrigger近傍のoverlayです。
- `surface='drawer'`は画面右側の固定panelです。
- `Escape`はopen時だけ受理し、close後にtriggerへfocusを返します。
- 開閉はclickとAPIのみで行います。hover / focus auto-openは行いません。

---

## 5. DOM / Accessibility

`ui-translation`はLight DOMを使います。

SSR / pre-hydrationでは、host直下にnative disclosure fallbackを出します。

```html
<ui-translation
  lang="fr"
  target-lang="ja"
  original="Je pense, donc je suis."
  translated="我思う、ゆえに我あり。"
  surface="drawer"
  data-hydration-capability="interactive"
  data-hydration-trigger="visible"
>
  <details class="translation-overlay-fallback" data-translation-fallback>
    <summary
      class="translation-overlay-fallback__summary"
      data-translation-fallback-trigger
      lang="fr"
    >
      Je pense, donc je suis.
    </summary>
    <p class="translation-overlay-fallback__content" data-translation-fallback-content lang="ja">
      我思う、ゆえに我あり。
    </p>
  </details>
</ui-translation>
```

fallback契約:

- fallbackは`details/summary`であり、JS無効でもsummaryから訳文へ到達できる
- fallbackの原文と訳文は`original` / `translated`と同じplain-text 2片である
- fallbackはhydrated UI用の`data-part="trigger"` / `data-part="content"`を使わない
- fallbackのsurface差分が必要な場合はhostの`surface`属性から選択する

hydration後はfallbackをLight DOM内のbutton/dialog構造へ置き換えます。

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

- triggerは常に`button`
- overlay contentは`role="dialog"` / `aria-modal="false"`
- `aria-expanded`はopenと同期
- `aria-controls`と`aria-details`はcontent idを参照
- fallback `details[open]`またはhost`[open]`から継承したopen状態は初回更新後に`translation-toggle`でorchestratorへ通知する
- fallback summaryがhydration時にfocusを持つ場合は、hydrated triggerへfocusを引き継ぐ

---

## 6. Orchestration

`TranslationOverlayOrchestrator`はdocument単位でopenな`ui-translation`を管理します。

契約:

- 同時にopenなoverlay translationは1件まで
- open stateは`translation-toggle`の`open: true`を契機に調停する
- SSR fallback由来で複数要素がopenの場合も、hydration reconciliation後は最大1件だけopenにする

旧localStorage永続化、global keyboard mode toggle、MutationObserverによる集合管理は行いません。

---

## 7. 関連契約

- static translationは`::translation`から`div.translation-static[data-translation-kind="static"]`を出力する
- interactive overlayは`::translation-overlay`から`ui-translation[surface]`を出力する
- `::translation-overlay`のSSR / pre-hydration出力は`details/summary` fallbackをhost直下に持つ
- いずれも`original` / `translated`のplain-text 2片のみを契約対象とする
- note本文ではoverlayだけが`data-hydration-trigger="visible"`を持つ
- rich bilingual contentは`ui-translation`の責務ではなく、別directive / 別grammarの責務とする

---

## 8. テスト固定範囲

- clickでopen / closeできること
- `Escape`でcloseし、triggerにfocusを戻すこと
- `translation-toggle.detail.surface`が正しいこと
- 2つ目のoverlayを開くと1つ目が閉じること
- fallback closed / openのhydration handoff
- JS無効時にsummaryから訳文を読めること
