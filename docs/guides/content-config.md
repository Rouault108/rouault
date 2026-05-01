# Content Config Guide

この文書は `_config.json` の書き方を説明する Guide である。入力仕様の正本は `docs/contracts/content-config.md` とする。

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

- `label`: sidebar branch と breadcrumb directory crumb に使う directory label の入力。
- `order`: 同じ directory 内の表示順を固定する。
- `sidebar.scope`: sidebar をその階層へ閉じる場合に使う。
- `sidebar.icon`: sidebar 表示の icon hint として使う。

## 注意

- `label` は page title ではない。
- `order` は子孫へ継承しない。
- 未定義 key は書かない。
- corpus label として使う場合も、URL 契約は `docs/contracts/corpus.md` に従う。
