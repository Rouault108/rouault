---
title: 'テストファイル'
description: 'これはテストファイルです。'
date: 2026-03-15
updated: 2026-03-15
genre:
  - testing
  - test
sidebarIcon: 'lucide:test-tube-diagonal'
cover: 'https://images.unsplash.com/photo-1772289934600-cb4ddd71dbd8?q=80&w=2232&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
license: 'https://example.com/original'
licenseNote: 'ライセンス'
source: 'https://example.com/original'
status: 'wip'
---

## テスト Level2

### テスト Level3

#### テスト Level4

##### テスト Level5

###### テスト Level6

**太字**  
_イタリック_  
`inline code`  
[リンク（Google.com）](https://www.google.com/)  
![画像1](https://images.unsplash.com/photo-1772289934600-cb4ddd71dbd8?q=80&w=2232&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)
![画像2](https://images.unsplash.com/photo-1772289934600-cb4ddd71dbd8?q=80&w=2232&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D 'キャプション'){zoomable="false" loading="eager" width="1200" height="800"}

- 箇条書き
- 箇条書き

1. 番号付き
2. 番号付き

> 引用文
> 2 行目
>
> 4 行目
>
> - 引用文内リスト
>
> ### 引用文内ヘッダー
>
> **引用文内太字**
>
> > ネスト 1行目
> > ネスト 2行目

### コード関係

```ts
// TypeScriptのコード
let i: string = 'Hello World!';
```

```ts filename="foo.ts"
// ファイル名付きTypeScriptのコード
let i: string = 'Hello World!';
```

::code-group{aria-label="実装比較"}

```ts group-key="valid-simple" tab-label="正しい例"
const value = 1;
```

```ts group-key="invalid-simple" tab-label="誤り例"
const value = '1';
```

::

::code-group{aria-label="実装比較"}

```ts filename="valid.ts" group-key="valid" tab-label="正しい例"
const value = 1;
```

```ts filename="invalid.ts" group-key="invalid" tab-label="誤り例"
const value = '1';
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
function random(number) {
  return Math.floor(Math.random() * (number + 1));
}

function bgChange(e) {
  const rndCol = `rgb(${random(255)} ${random(255)} ${random(255)})`;
  e.target.style.backgroundColor = rndCol;
}

document.querySelector('.demo-button').addEventListener('click', bgChange);
```

::
::

### カード関係

https://note.com/info/n/nea1b96233fbf

::link-card{url="https://note.com/info/n/nea1b96233fbf" title="任意タイトル" description="任意説明" image="https://images.unsplash.com/photo-1772289934600-cb4ddd71dbd8"}

### その他独自記法

::details{summary="補足情報" open="true" variant="bordered"}
ここに詳細を書く
::

::info-box{heading="作品情報" icon="book" heading-level="3" landmark="true" variant="filled"}
ここに説明を書く
::

::tabs{default-selected-value="overview" orientation="horizontal"}
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

::translation{lang="fr" target-lang="ja" render-mode="interlinear" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
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

### サンプルテキスト

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

吾輩は猫である。名前はまだ無い。  
　どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。吾輩はここで始めて人間というものを見た。しかもあとで聞くとそれは書生という人間中で一番獰悪な種族であったそうだ。この書生というのは時々我々を捕えて煮て食うという話である。しかしその当時は何という考もなかったから別段恐しいとも思わなかった。ただ彼の掌に載せられてスーと持ち上げられた時何だかフワフワした感じがあったばかりである。掌の上で少し落ちついて書生の顔を見たのがいわゆる人間というものの見始であろう。この時妙なものだと思った感じが今でも残っている。第一毛をもって装飾されべきはずの顔がつるつるしてまるで薬缶だ。その後猫にもだいぶ逢ったがこんな片輪には一度も出会わした事がない。のみならず顔の真中があまりに突起している。そうしてその穴の中から時々ぷうぷうと煙を吹く。どうも咽せぽくて実に弱った。これが人間の飲む煙草というものである事はようやくこの頃知った。  
　この書生の掌の裏でしばらくはよい心持に坐っておったが、しばらくすると非常な速力で運転し始めた。書生が動くのか自分だけが動くのか分らないが無暗に眼が廻る。胸が悪くなる。到底助からないと思っていると、どさりと音がして眼から火が出た。それまでは記憶しているがあとは何の事やらいくら考え出そうとしても分らない。
