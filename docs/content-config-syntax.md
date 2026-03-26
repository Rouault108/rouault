# `_config.json` の記述方法ガイド（著者向け / 2026-03-14）

## この文書の位置づけ

この文書は、`content` 配下の各ディレクトリに置く `_config.json` の書き方をまとめた実用ガイドである。実装上の SoT は [`src/data/notes.ts`](/Users/ruo/Desktop/Programing/Rouault/src/data/notes.ts) と [`lib/content/ordering.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/content/ordering.ts) にあるが、ここでは著者が安全に設定を書くための要点に絞る。

## まず押さえる方針

1. `_config.json` は `content` 配下の任意のディレクトリに置ける
2. 現在使えるキーは `order` と `sidebar` だけである
3. JSON なのでコメントは書けない
4. 文字列は必ずダブルクォート `"` で囲む

## 基本形

最小構成は空オブジェクトではなく、必要なキーだけを書く。

```json
{
  "order": ["classical", "jazz"],
  "sidebar": {
    "scope": "self",
    "icon": "folder"
  }
}
```

## 書ける項目

| 項目            | 必須 | 内容                                                 |
| --------------- | ---- | ---------------------------------------------------- |
| `order`         | 任意 | ディレクトリ直下の並び順を先頭から明示する文字列配列 |
| `sidebar.scope` | 任意 | サイドバーの表示範囲を切り替える                     |
| `sidebar.icon`  | 任意 | ディレクトリと配下ノートに使う既定アイコンを指定する |

## `order` の書き方

`order` は、そのディレクトリ直下の子要素だけに効く。親ディレクトリの `order` は子へ継承されない。

```json
{
  "order": ["tchaikovsky", "beethoven"]
}
```

この例では、同じディレクトリ直下にある `tchaikovsky` と `beethoven` をその順で先頭に配置する。`order` に書かれていない残りの項目は、その後ろに `ja` ロケールのアルファベット順で並ぶ。

### `order` の対象名

- 子ディレクトリを指定するときはディレクトリ名を書く
- Markdown ファイルを指定するときはファイル名を `.md` 付きで書く

例:

```json
{
  "order": ["the-nutcracker.md"]
}
```

注意:

- `the-nutcracker` のように拡張子を省くと、その Markdown ファイルには一致しない
- 存在しない名前を書いてもエラーにはならないが、並び替えには効かない
- 同じ名前を重複して書かない

## `sidebar` の書き方

`sidebar` では、サイドバーの表示範囲とアイコン既定値を設定できる。

```json
{
  "sidebar": {
    "scope": "self",
    "icon": "folder-open"
  }
}
```

### `sidebar.scope`

有効な値は `global` と `self` の 2 つだけである。

| 値       | 内容                                     |
| -------- | ---------------------------------------- |
| `global` | サイドバーをグローバルな全体ツリーに戻す |
| `self`   | そのディレクトリをサイドバーの起点にする |

例:

```json
{
  "sidebar": {
    "scope": "self"
  }
}
```

この設定があるディレクトリ以下のノートでは、そのディレクトリ配下だけがサイドバーに表示される。

補足:

- `scope` は階層をたどって評価され、下位ディレクトリの設定で上書きされる
- 途中で `global` を置くと、それ以前の `self` による限定を解除できる

### `sidebar.icon`

`sidebar.icon` は、そのディレクトリ自身と配下のディレクトリで使う既定アイコンとして使われる。下位ディレクトリで別の `icon` を書くと、その地点から上書きされる。ノート自体は frontmatter で `sidebarIcon` を指定しない限り、既定で `none` として扱われる。

```json
{
  "sidebar": {
    "icon": "music"
  }
}
```

有効な値:

| 値                                  | 内容                                              |
| ----------------------------------- | ------------------------------------------------- |
| `music` など任意のアイコン名 | その名前のアイコンを使う                          |
| `folder`                            | ディレクトリ用既定アイコン `folder` を使う |
| `none`                              | ディレクトリ既定アイコンを消す                    |

補足:

- ノート個別の frontmatter に `sidebarIcon` がある場合は、そちらが優先される
- ノート個別で `sidebarIcon` を省略した場合は `none` 扱いとなり、ディレクトリ側のアイコンは引き継がれない
- ノート側では `sidebarIcon: file` を使うと `file-text` になる
- ディレクトリ側の `icon` で `file` は特別扱いされない

## 実例

### ディレクトリ順を固定する

`content/music/_config.json`

```json
{
  "order": ["classical", "jazz"]
}
```

### サイドバーをその階層に閉じる

`content/computer-science/algorithms/_config.json`

```json
{
  "sidebar": {
    "scope": "self"
  }
}
```

### ディレクトリ内のノート順を固定する

`content/music/classical/tchaikovsky/_config.json`

```json
{
  "order": ["the-nutcracker.md"]
}
```

## 書かない項目

現状の実装では、以下のようなキーは読まれない。

- `title`
- `description`
- `slug`
- `sidebar.title`
- `sidebar.order`

未定義キーを書いても通常は無視されるが、設定ファイルの意味が曖昧になるので追加しない。

## 注意

- ファイル名は必ず `_config.json` にする
- 配置場所は設定したい `content` 配下ディレクトリそのものにする
- JSON なので末尾カンマは付けない
- 文字列配列の各要素は空文字にしない
- 迷ったらキーを増やすのではなく、既存キーで表現できるかを先に確認する
