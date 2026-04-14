# Toc コンポーネント契約書

## 1. 概要

本書は、`ui-toc`、`layout-toc`、`TocActiveTracker`、`TocMobileSummaryController` の責務分担を定義します。

static-first 再設計後の `ui-toc` は純粋な view です。見出し抽出、tab scope 推論、現在地追跡、mobile condensed UI は別レイヤで扱います。

---

## 2. 責務分担

### 2.1 `ui-toc`

- `headers` と `activeId` を受けて anchor list を描画する
- click 時に `ui-toc-active-change` を通知する
- truncation 計測と tooltip 有効化を局所的に行う

`ui-toc` 自身は次を行いません。

- DOM からの見出し抽出
- `IntersectionObserver` による現在地追跡
- `MutationObserver` による本文監視
- tab DOM からの scope 推論

### 2.2 `layout-toc`

- `headings-json` / `capabilities-json` を decode する
- desktop TOC と mobile summary shell を描画する
- tracker / controller を接続する

### 2.3 `TocActiveTracker`

- `IntersectionObserver`
- `hashchange`
- `ui-tab-change`
- precomputed `scopeSelections` による visible heading subset 決定

### 2.4 `TocMobileSummaryController`

- mobile condensed bar の表示制御
- mobile summary 用 scroll 監視

---

## 3. データ契約

### 3.1 `Heading`

| 名前              | 型                                     | 必須   | 内容           |
| ----------------- | -------------------------------------- | ------ | -------------- |
| `id`              | `string`                               | はい   | 見出し ID      |
| `text`            | `string`                               | はい   | 表示ラベル     |
| `level`           | `number`                               | はい   | 見出しレベル   |
| `scopeSelections` | `{ scopeId: string; value: string }[]` | いいえ | tab scope 条件 |

### 3.2 `TocCapabilities`

| 名前             | 型        | 内容                        |
| ---------------- | --------- | --------------------------- |
| `activeTracking` | `boolean` | 現在地追跡を有効化するか    |
| `dynamicScopes`  | `boolean` | tab scope 連動が必要か      |
| `mobileSummary`  | `boolean` | mobile summary bar を出すか |

build-time で決定し、`layout-toc[capabilities-json]` へ渡します。

---

## 4. `ui-toc` 公開契約

### 4.1 入力

| 名前       | 種別                               | 契約                         |
| ---------- | ---------------------------------- | ---------------------------- |
| `headers`  | property                           | 描画対象見出し。唯一のソース |
| `activeId` | property / attribute (`active-id`) | 現在アクティブな見出し ID    |

### 4.2 イベント

| 名前                   | detail                  | 契約                     |
| ---------------------- | ----------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `ui-toc-active-change` | `{ id, source: 'scroll' | 'click', index, total }` | `ui-toc` からの現在地通知。現実装で `ui-toc` 自身が発火するのは click 起因のみ |

### 4.3 DOM / Accessibility

- ルートは `nav`
- 各項目はネイティブ `<a>`
- アクティブ項目のみ `aria-current="location"`
- 見出しが空なら何も描画しない

---

## 5. `layout-toc` と hydration

契約:

- TOC presence は note page projection の `tocPresence` で決まり、`headings.length === 0` のときは `absent` とする
- `tocPresence='absent'` の note page では TOC DOM、TOC JSON script、`data-hydration-scope="note-toc"` を出力しない
- `layout-toc` は `capabilities-json` を持つ
- `activeTracking` / `dynamicScopes` / `mobileSummary` のいずれかが true の場合だけ hydration directive を持つ
- static-only TOC は SSR 出力だけで成立させる

presence と hydration は分離する。

- `absent`: headings 0 件。TOC host 自体を出さない
- `present-static`: headings 1 件以上かつ interactive capability なし。SSR のみで成立
- `present-interactive`: headings 1 件以上かつ interactive capability あり。SSR 後に hydrate する

---

## 6. tabs 連動

build-time で `ui-tabs[data-toc-scope]` を注釈し、見出し側へ `scopeSelections` を持たせます。

runtime 契約:

- `ui-tabs` は `ui-tab-change.detail.scopeId` を発火する
- tracker は tabs の内部 DOM 構造ではなく `scopeId` と scope snapshot helper を使う
- hidden tab 内の hash 対象見出しに遷移するときは、対応する tab を先に選択してから TOC を同期する

---

## 7. テスト固定範囲

- `ui-toc` が `activeId` だけで表示を更新すること
- scoped heading が build-time で抽出されること
- `layout-toc` が capability ありのときだけ hydrate すること
- `tocPresence='absent'` では TOC DOM と hydration scope が出ないこと
- mobile summary controller が `mobileSummary=true` のときだけ動くこと
