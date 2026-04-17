# Compatibility Inventory

## 位置づけ

本書は、Rouault に残る deprecated / compatibility API と、その扱いを固定するための棚卸し文書です。

- 実装事実の正本は `src/` / `build/` / `shared/` / `test/` にあります。
- 本書は、それらに残る互換経路の意図、削除可否、出口条件を明文化します。
- ここに載っていない current contract は、原則として互換レイヤではなく現行契約です。

## 判定基準

本書では各項目を次の 3 区分で扱います。

- `即時削除`: 現行契約に不要で、削除してよい互換残骸
- `deprecated 維持`: 当面は維持するが、新規利用を認めない互換経路
- `将来削除`: 外部互換または移行安全性のため残すが、出口条件を満たしたら削除する項目

## 棚卸し結果

| 項目                                              | 主な所在                                                                                                                                 | 区分              | 判断                                                                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| 該当なし                                          | -                                                                                                                                        | -                 | 2026-04-17 時点で棚卸し対象の互換経路は repo から除去済み                                                        |

## 項目別メモ

現時点で active な compatibility API はありません。新たな互換経路を導入する場合のみ、本節へ項目を追加してください。

## 完了済みの削除項目

次の項目は本計画の cleanup 対象だったが、すでに repo から除去済みです。

| 項目                                   | 状態                                      |
| -------------------------------------- | ----------------------------------------- |
| legacy router history path key         | `__routerUrl` 正本へ収束し、`__routerPath` 特例を除去済み |
| `ui-icon[icon]` 属性                   | `name` 正規入力へ収束し、deprecated alias を除去済み |
| `ui-kbd[keys]` 属性                    | `tokens` 正規入力へ収束し、互換文字列入力を除去済み |
| `ui-kbd` のホストテキスト入力          | 単体キー補助 slot のみに整理し、文字列再解釈経路を除去済み |
| 未分類リンクフェイルセーフ             | `.card` / `.callout` / `.sidebar` 向け legacy 吸収を除去済み |
| `ui-skip-link[href]` 属性              | `targetId` 正規入力へ収束し、互換入力を除去済み |
| `ui-article-header` の `.status` class | `status-badge` / `status-*` 系へ収束済み  |
| `defer-hydration` 記述                 | `docs/hydration-contract.md` から除去済み |

### 1. legacy router history path key

- 現行 router の履歴正本は `__routerUrl` です。
- `__routerPath` 向けの特例処理は削除済みです。
- browser / node / e2e の履歴検証も `__routerUrl` 契約へ揃えています。

### 2. `ui-icon[icon]`

- `name` が唯一の公開入力です。
- `icon` deprecated alias は削除済みです。
- build 生成経路、Storybook、runtime self-consumption も `name` へ揃えています。

### 3. `ui-kbd[keys]` / ホストテキスト

- `tokens` が唯一の正規入力です。
- `keys` と host text の文字列再解釈経路は削除済みです。
- docs / Storybook / browser test も `tokens` と単体キー補助 slot 契約へ揃えています。

### 4. 未分類リンクフェイルセーフ

- `.card` / `.callout` / `.sidebar` 配下の未分類リンク吸収は削除済みです。
- patterns / CSS / Storybook 例は明示的な `link-text` または `link-control` 契約へ揃えています。

### 5. `ui-skip-link[href]`

- `targetId` が正規入力です。
- `href` 互換入力は削除済みです。
- Storybook / browser test / app shell の利用箇所も `targetId` 主体へ揃えています。

### 6. `.status` class

- `status-badge` が現行の意味的 class です。
- `.status` は旧テスト互換の残骸であり、現行 repo 内の依存を持ちません。
- 本フェーズで削除済みです。

### 7. `defer-hydration`

- 現行の hydration 契約は scheduler / registry 主導で固定済みです。
- 実装上に `defer-hydration` の active path はありません。
- したがって、正本文書に移行措置として残し続ける理由はなく、すでに除去済みです。

## compatibility API ではない現行契約

次の項目は棚卸し対象として確認したが、deprecated / compatibility API には分類しません。

| 項目                                  | 理由                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `ui-breadcrumbs[items-json]`          | SSR / declarative markup から配列入力を渡すための現行公開入力。`items` property と用途が異なる |
| `ui-article-header[breadcrumbs-json]` | article header の公開入力であり、deprecated alias ではない                                     |
| `layout-toc[source-id]`               | TOC source script と runtime 解決を結ぶ現行入力であり、sidebar の旧 `source-id` とは別契約     |

## 運用ルール

- 新しい互換経路を追加する場合は、本書へ理由と出口条件を追記します。
- `deprecated 維持` に分類した項目を新規コード例へ採用してはいけません。
- `将来削除` に分類した項目は、read-path / migration safety の範囲を超えて広げてはいけません。
