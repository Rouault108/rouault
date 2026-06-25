# Search Page Static Choice Menu

## Status

Accepted.

## IDs

- Request ID: `R-SEARCH-DROPDOWN-UNIFY-001`
- Decision ID: `D-SEARCH-DROPDOWN-UNIFY-001`
- R段階: `R3`
- Aレベル: `A0`
- Gate ID: `G-SEARCH-CHOICE-BREAKING-001`

## Decision

Search pageの`tagMode` / `sort`用native `<select>`を削除し、`details` / `summary` / panel / `button type="button"` item / hidden inputによるstatic choice menuへ移行する。

`FormData`の`name="tagMode"` / `name="sort"`、URL parameter、検索状態、初期URL復元、browser back / forward復元の意味はhidden inputとcontroller同期で維持する。

## Delete / Breaking Change Gate

`tagMode` / `sort`用`<select>`はfinal HTML / SSR HTMLのDOM surfaceから削除されるため、Breaking Change Gateが必要である。

Gateは許可する。理由は次の通り。

- 旧`ui-select` custom elementは復活させない。
- `role="listbox"` / `role="option"`によるcustom select意味論も復活させない。
- `FormData`の`tagMode` / `sort`契約はdisabledではないhidden inputで維持する。
- URL parameter名は変更しない。
- 検索状態、検索結果、初期URL復元、browser back / forward復元の意味は維持する。
- no-JS時にitem buttonがhidden inputを更新できない劣化は、search pageが既に検索・フィルタ機能にJavaScriptを要求しているため許容する。

## Scope

この判断はsearch pageの`tagMode` / `sort`に限定する。ヘッダー controllerの抽出、ヘッダー DOM変更、ヘッダー menuとの相互排他、pointer modality tracking、typeahead navigation、検索runtime本体、Pagefind / ranking変更は含めない。

## 正本

現行契約は`docs/contracts/static-choice-menu.md`と`docs/contracts/search.md`を参照する。supersededされたnative select契約は`docs/contracts/static-select.md`に履歴として残す。
