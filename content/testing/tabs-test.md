---
title: 'タブテスト'
description: 'これはタブテストです。'
date: 2026-03-15
updated: 2026-03-15
genre:
  - testing
  - test
status: 'wip'
---

## タブ用のテストページです。

::tabs{url-sync="true" default-selected-value="javascript" orientation="horizontal"}
::tab{value="javascript"}
JavaScript
::
::panel

### JavaScriptのHello, World!

JavaScriptではこのように書きます。

```js
console.log('Hello, World!');
```

::
::tab{value="rust"}
Rust
::
::panel

### RustのHello, World!

Rustではこのように書きます。

```rust
fn main() {
    println!("Hello, World!");
}
```

::
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
