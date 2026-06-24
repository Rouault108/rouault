# Static Choice Menu Contract

## 位置づけ

Static choice menu は、search page の `tagMode` / `sort` を所有する単一選択 UI primitive である。native `<select>`、旧 `ui-select`、`role="listbox"` / `role="option"` による custom select は使わない。

## DOM 契約

- 各 menu は `details` / `summary` / panel / `button type="button"` item / `input type="hidden"` で構成する。
- hidden input は `form[data-search-page-form]` の内側に出力し、既存の `new FormData(form)` で `name="tagMode"` / `name="sort"` を読める位置に置く。
- hidden input は disabled にしない。runtime unavailable / disabled state でも `name` と `value` を保持する。
- summary は `aria-expanded` を持ち、controller が `details.open` と同期する。
- summary のアクセシブル名は表示ラベル ID と current label ID を参照する `aria-labelledby` で所有する。`aria-label` と二重指定しない。
- panel は `role="group"` に留め、custom select の listbox / option 意味論を持たせない。
- 各 menu は単一選択であり、常に exactly one item だけが `data-selected="true"` / `aria-pressed="true"` を持つ。

## Interaction 契約

- static choice menu の open / close は search page controller が所有する。
- summary click / Enter / Space は controller 経由で開閉し、`details.open` と `aria-expanded` を同期する。
- `ArrowDown` / `ArrowUp` は menu を開き、item focus を移動する。
- `Escape` は menu を閉じ、trigger へ focus restore する。
- `Tab` は自然なフォーカス移動を許容し、開いている menu を閉じる。
- item activation 後は hidden input、trigger label、selected item state を同期し、URL 更新と検索を実行し、menu を閉じて trigger へ focus restore する。
- 同一検索ページ内の `tagMode` / `sort` menu は同時に複数開かない。ヘッダーの corpus / theme menu との相互排他はこの契約に含めない。
- menu 外を pointer 操作した場合、開いている search choice menu は閉じる。
- typeahead navigation と pointer modality tracking はこの契約に含めない。

## State 復元

初期 SSR、runtime state 同期、browser back / forward 復元では、次を一致させる。

- hidden input value
- trigger current label
- selected item の `data-selected` / `aria-pressed`
- summary `aria-expanded="false"`（復元時）

## No-JS

no-JS 時、button item は hidden input を更新できない。ただし search page は検索・フィルタ機能に JavaScript を要求しているため、この劣化は許容する。
