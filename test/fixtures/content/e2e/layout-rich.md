---
title: 'Layout Rich'
description: 'front matter、TOC、code block、table、hash navigation を検証する e2e 専用 fixture'
date: 2026-04-16
kind: 'reader'
e2eFixtureId: 'note.layout-rich'
genre:
  - testing
  - e2e
---

このノートは e2e 専用 fixture です。公開用の意味論を持たず、note shell / front matter / TOC / hash navigation / code block / table の契約だけを確認します。

## 1. 導入

本文の初期表示、front matter、breadcrumb、TOC present を検証するための見出しです。

### 1.1 目的

狭幅でも本文列が潰れず、SSR 時点で主要 host が出力されることを確認します。

```ts
const values = [1, 2, 3];
const doubled = values.map((value) => value * 2);
console.log(doubled);
```

### 1.2 一覧

| 分類 | 内容 |
| --- | --- |
| note shell | 本文と TOC の外形契約 |
| article header | heading と breadcrumbs の SSR 出力 |
| toc | headings-json と active state 同期 |

## 2. 状態同期

スクロールとハッシュ遷移で current heading が同期することを確認します。

### 2.1 スクロール

この節では、viewport 上端の閾値を跨いだときに TOC の current が更新されることを確認します。

### 2.2 ハッシュ遷移

この節では、hash 付き直アクセスと reload 後も target が維持されることを確認します。

## 3. まとめ

この fixture は小さく保ち、実コンテンツの変更と e2e 契約を切り分けます。