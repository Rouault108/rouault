# Translation / TOC Static-First 移行メモ

## 概要

本書は、translation / toc の static-first 再設計に伴う breaking change の移行メモです。authoring grammar と build-time 契約の差分だけを短くまとめます。正本は既存の SoT 文書を参照してください。

---

## 1. Translation の移行

### 1.1 `::translation`

旧:

```markdown
::translation{lang="fr" target-lang="ja" render-mode="drawer" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
::
```

新:

```markdown
::translation{lang="fr" target-lang="ja" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
::
```

意味:

- `::translation` は static translation の正規形です
- `render-mode` と `open` は削除されました
- 出力は `ui-translation` ではなく `div.translation-static` です

### 1.2 overlay が必要な場合

新設:

```markdown
::translation-overlay{lang="fr" target-lang="ja" surface="drawer" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
::
```

規則:

- `surface` は `popover | drawer`
- overlay だけが hydration 対象です

### 1.3 本文 2 段落入力

次の形は引き続き有効です。

```markdown
::translation{lang="fr" target-lang="ja"}
Je pense, donc je suis.

我思う、ゆえに我あり。
::
```

---

## 2. TOC の移行

### 2.1 authoring 側

通常の note authoring に追加変更はありません。`tabs` を含む本文から、build-time で TOC 用の `scopeSelections` と `data-toc-scope` が補完されます。

### 2.2 runtime / component 側

- `ui-toc` は静的 view です
- active tracking は `layout-toc` 側の controller が担当します
- `layout-toc` は `capabilities-json` を受け取ります
- `ui-tabs` の `ui-tab-change.detail` に `scopeId` が追加されました

---

## 3. 参照先

- authoring: `docs/markdown/markdown-authoring-specification.md`
- output: `docs/markdown/markdown-output-contract.md`
- safety / tests: `docs/markdown/markdown-safety-and-test-policy.md`
- component 契約: `docs/design-system/components/translation.md`
- component 契約: `docs/design-system/components/toc.md`
