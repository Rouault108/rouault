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

Search page の `tagMode` / `sort` 用 native `<select>` を削除し、`details` / `summary` / panel / `button type="button"` item / hidden input による static choice menu へ移行する。

`FormData` の `name="tagMode"` / `name="sort"`、URL parameter、検索状態、初期 URL 復元、browser back / forward 復元の意味は hidden input と controller 同期で維持する。

## Delete / Breaking Change Gate

`tagMode` / `sort` 用 `<select>` は final HTML / SSR HTML の DOM surface から削除されるため、Breaking Change Gate が必要である。

Gate は許可する。理由は次の通り。

- 旧 `ui-select` custom element は復活させない。
- `role="listbox"` / `role="option"` による custom select 意味論も復活させない。
- `FormData` の `tagMode` / `sort` 契約は disabled ではない hidden input で維持する。
- URL parameter 名は変更しない。
- 検索状態、検索結果、初期 URL 復元、browser back / forward 復元の意味は維持する。
- no-JS 時に item button が hidden input を更新できない劣化は、search page が既に検索・フィルタ機能に JavaScript を要求しているため許容する。

## Scope

この判断は search page の `tagMode` / `sort` に限定する。ヘッダー controller の抽出、ヘッダー DOM 変更、ヘッダー menu との相互排他、pointer modality tracking、typeahead navigation、検索 runtime 本体、Pagefind / ranking 変更は含めない。

## 正本

現行契約は `docs/contracts/static-choice-menu.md` と `docs/contracts/search.md` を参照する。superseded された native select 契約は `docs/contracts/static-select.md` に履歴として残す。
