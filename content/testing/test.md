---
title: "テストファイル"
description: "これはテストファイルです。"
date: 2026-03-15
updated: 2026-03-15
genre:
    - testing
    - test
sidebarIcon: "lucide:test-tube-diagonal"
cover: "https://images.unsplash.com/photo-1772289934600-cb4ddd71dbd8?q=80&w=2232&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
license: "https://example.com/original"
licenseNote: "ライセンス"
source: "https://example.com/original"
status: "wip"
---

## テスト Level2
### テスト Level3
#### テスト Level4
##### テスト Level5
###### テスト Level6

**太字**  
*イタリック*  
`inline code`  
[リンク（Google.com）](https://www.google.com/)  
![画像1](https://images.unsplash.com/photo-1772289934600-cb4ddd71dbd8?q=80&w=2232&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)
![画像2](https://images.unsplash.com/photo-1772289934600-cb4ddd71dbd8?q=80&w=2232&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D "キャプション"){zoomable="false" loading="eager" width="1200" height="800"}

- 箇条書き
- 箇条書き

1. 番号付き
2. 番号付き

> 引用文
> 2 行目
>
> 4 行目
> - 引用文内リスト
> ### 引用文内ヘッダー
> **引用文内太字**
>> ネスト 1行目
>> ネスト 2行目

### コード関係

```ts
// TypeScriptのコード
let i: string = "Hello World!";
```

```ts filename="foo.ts"
// ファイル名付きTypeScriptのコード
let i: string = "Hello World!";
```

::code-group{aria-label="実装比較"}
```ts label="正しい例"
const value = 1;
```
```ts label="誤り例"
const value = "1";
```
::

::code-group{aria-label="実装比較"}
```ts filename="valid.ts" label="正しい例"
const value = 1;
```
```ts filename="invalid.ts" label="誤り例"
const value = "1";
```
::

::code-preview{label="ボタン例" controls="theme surface viewport" preview-theme="light" preview-surface="surface" preview-viewport="tablet" preview-padding="compact" preview-align="center"}
::preview
ここにプレビュー内容を書く
::
```md
ここにプレビュー内容を書く
```
::

::code-preview{label="ボタン例" controls="viewport"}
::preview-sandbox{title="ボタンの sandbox" allow-js="true" height="160"}
```preview-html filename="button.html"
<button class="demo-button">押す</button>
```
```preview-css filename="button.css"
.demo-button { padding: 0.75rem 1rem; }
```
```preview-js filename="button.js"
document.querySelector('.demo-button')?.addEventListener('click', () => {
  document.querySelector('.demo-button')?.toggleAttribute('data-active');
});
```
::
::

### その他独自記法

::details{aria-label="補足を開閉" summary="補足情報" open="true" variant="bordered"}
ここに詳細を書く
::

::info-box{heading="作品情報" icon="book" heading-level="3" landmark="true" variant="filled"}
ここに説明を書く
::

::tabs{selected-index="0" orientation="horizontal"}
::tab{value="overview"}
概要
::
::panel
概要の内容
::
::tab{value="details"}
詳細
::
::panel
詳細の内容
::
::

::translation{lang="fr" target-lang="ja" render-mode="drawer" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
::

::translation{lang="fr" target-lang="ja"}
Je pense, donc je suis.

我思う、ゆえに我あり。
::

==重要==  
:highlight[検索ヒット]{origin="search" current="true"}

:emoji[😀]{aria-label="笑顔"}
:smile:
:thinking:
:sparkles:

H~2~O  
x^2^

x:subscript[2]  
x:superscript[2]
