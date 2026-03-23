# router 実装計画（廃止）

この文書は **旧 router 実装計画の退避メモ** です。現行契約として扱ってはいけません。

## 現行の正規契約

- router の唯一の契約文書は [../router-specification.md](../router-specification.md) です。
- 実装・テスト・レビューは必ず上記仕様書を基準にしてください。

## この文書を規範として使ってはいけない理由

- constructor 即時起動
- `navigate(): Promise<void>`
- `onContentUpdate`
- `skipAriaLiveRegion`
- `addRoute()`
- `getParams()` / `getQuery()` / `getHistory()`
- `before:navigate` / `loading:start` / `loading:end` / `route:change`
- shell 同期や後処理を router core の必須責務として扱う記述

上記はいずれも現行仕様とは一致しません。

## 退避目的

- 過去の設計経緯を参照したい場合の最低限の入口だけを残します。
- 詳細な差分比較が必要な場合でも、この文書を再び拡張せず、必要箇所は git history で追ってください。
