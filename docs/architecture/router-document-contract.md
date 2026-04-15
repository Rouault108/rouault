# Router Document Contract

Rouault の router は document-first を前提にします。ここでいう文書契約は、SSR 初期表示と client navigation が同じ本文境界を共有するための最低条件です。

## 必須契約

- 遷移対象文書は `main#main-content` を持たなければなりません。
- `app-router` は light DOM で動作し、本文更新先は常に `#main-content` です。
- `app-router` は `data-app-router-announcement` を持つ announcement region を 1 つだけ持たなければなりません。
- `app-router:content-rendered` は本文差し替え完了後に発火し、`detail.contentRoot` に現在の本文 root を含めます。
- `getContentRoot()` は現在の `main#main-content` を返します。

## Shell の扱い

- `layout-header` は shell 抽出対象になり得ますが、本文 root ではありません。
- shell 抽出結果は本文契約より弱い契約として扱い、`layout-header` が存在しない場合は `null` を許容します。

## 実装上の意味

- `BaseLayout` は `app-router > [data-app-router-announcement]` と `app-router > main#main-content` を SSR で出力します。
- `AppRouter` は SSR 初期本文と遷移後本文の双方を同じ `main#main-content` に反映します。
- fetch 経由では router artifact の `NavigationEnvelope` を取得し、build 側で固定された本文契約をそのまま commit します。
