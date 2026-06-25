# Content Config Guide

この文書は`_config.json`の書き方を説明するGuideである。入力仕様の正本は`docs/contracts/content-config.md`とする。

## 基本形

```json
{
  "label": "Testing",
  "order": ["index", "browser", "ssr"],
  "sidebar": {
    "scope": "section",
    "icon": "folder"
  }
}
```

## よく使う設定

- `label`: sidebar branchとbreadcrumb directory crumbに使うdirectory labelの入力。
- `order`: 同じdirectory内の表示順を固定する。
- `sidebar.scope`: sidebarをその階層へ閉じる場合に使う。
- `sidebar.icon`: sidebar表示のicon hintとして使う。

## 注意

- `label`はpage titleではない。
- `order`は子孫へ継承しない。
- 未定義keyは書かない。
- corpus labelとして使う場合も、URL契約は`docs/contracts/corpus.md`に従う。
