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

| 項目 | 主な所在 | 区分 | 判断 |
| --- | --- | --- | --- |
| legacy router history path key の strip-only 互換 | `src/router/location-adapter.ts`、`test/node/location-adapter.test.ts`、`test/browser/router.browser.test.ts`、`test/e2e/router.spec.ts` | `将来削除` | stale history entry を再訪したときだけ吸収し、新規書込みは行わない。次の履歴 state schema 改訂時に除去候補とする |
| `ui-icon[icon]` 属性 | `src/components/ui/icon/icon.ts`、`docs/design-system/components/icon.md` | `deprecated 維持` | 現行の正規入力は `name`。`icon` は既存 markup 吸収のため残すが、新規利用は禁止する |
| `ui-kbd[keys]` 属性 | `src/components/ui/kbd/kbd.ts`、`docs/design-system/components/kbd.md` | `deprecated 維持` | 現行の正規入力は `tokens`。`keys` は文字列入力互換としてのみ維持する |
| `ui-kbd` のホストテキスト入力 | `src/components/ui/kbd/kbd.ts`、`docs/design-system/components/kbd.md` | `deprecated 維持` | light DOM 文字列の吸収は維持するが、正規 authoring / 実装経路には含めない |
| `ui-article-header` の `.status` class | `src/components/ui/article-header/article-header.ts`、`docs/design-system/components/article-header.md` | `即時削除` | 旧 `play()` テスト互換の残骸であり、現行 repo では依存箇所がないため削除する |
| `defer-hydration` 記述 | `docs/hydration-contract.md` | `即時削除` | 実装上の active path が存在せず、移行メモだけが残っているため正本契約から除去する |

## 項目別メモ

### 1. legacy router history path key

- 現行 router の履歴正本は `__routerUrl` です。
- 旧 path key は新規に書き込まず、古い session history から来た値を破棄するためだけに残しています。
- よってこれは public API ではなく、**移行安全性のための read-path 互換**です。

出口条件:

- router history state schema を次回明示更新するとき
- stale な旧 path key を吸収する必要がないと判断できるとき

### 2. `ui-icon[icon]`

- `name` が正規入力です。
- `icon` は既存 markup の吸収経路としてのみ残します。
- 新規実装、Storybook、新規 docs 例では `name` を使います。

出口条件:

- repo 内利用と外部利用想定を監査し、`icon` 属性利用を解消したとき
- design-system の breaking change を許容できるタイミング

### 3. `ui-kbd[keys]` / ホストテキスト

- `tokens` が唯一の正規入力です。
- `keys` とホストテキストは、正規入力へ寄せるための互換レイヤです。
- 新規 authoring と component 利用では `tokens` を優先します。

出口条件:

- repo 内 examples / stories / call sites が `tokens` 主体へ揃ったとき
- 文字列入力を維持する理由がなくなったとき

### 4. `.status` class

- `status-badge` が現行の意味的 class です。
- `.status` は旧テスト互換の残骸であり、現行 repo 内の依存を持ちません。
- 本フェーズで削除します。

### 5. `defer-hydration`

- 現行の hydration 契約は scheduler / registry 主導で固定済みです。
- 実装上に `defer-hydration` の active path はありません。
- したがって、正本文書に移行措置として残し続ける理由はありません。

## compatibility API ではない現行契約

次の項目は棚卸し対象として確認したが、deprecated / compatibility API には分類しません。

| 項目 | 理由 |
| --- | --- |
| `ui-breadcrumbs[items-json]` | SSR / declarative markup から配列入力を渡すための現行公開入力。`items` property と用途が異なる |
| `ui-article-header[breadcrumbs-json]` | article header の公開入力であり、deprecated alias ではない |
| `layout-toc[source-id]` | TOC source script と runtime 解決を結ぶ現行入力であり、sidebar の旧 `source-id` とは別契約 |

## 運用ルール

- 新しい互換経路を追加する場合は、本書へ理由と出口条件を追記します。
- `deprecated 維持` に分類した項目を新規コード例へ採用してはいけません。
- `将来削除` に分類した項目は、read-path / migration safety の範囲を超えて広げてはいけません。
